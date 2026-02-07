/**
 * Deadline Alerts Job
 * Service de traitement des alertes de deadlines
 * Peut être exécuté comme CRON job toutes les heures
 */

import { db } from "./db";
import { eq, and, lte, isNull, gte } from "drizzle-orm";
import {
  deadlineAlerts,
  projectCalendarEvents,
  deliveryMilestones,
  projects,
  notifications,
  users,
} from "../shared/schema";

// ============================================================
// TYPES
// ============================================================

interface AlertResult {
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}

interface OverdueResult {
  detected: number;
  updated: number;
}

// ============================================================
// MAIN FUNCTIONS
// ============================================================

/**
 * Traite les alertes planifiées qui n'ont pas encore été envoyées
 */
export async function processScheduledAlerts(): Promise<AlertResult> {
  const now = new Date();
  const result: AlertResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Récupérer les alertes planifiées non envoyées
    const pendingAlerts = await db
      .select()
      .from(deadlineAlerts)
      .where(
        and(
          lte(deadlineAlerts.scheduledFor, now),
          isNull(deadlineAlerts.sentAt),
          isNull(deadlineAlerts.failedAt)
        )
      )
      .limit(100); // Traiter par batch de 100

    result.processed = pendingAlerts.length;

    for (const alert of pendingAlerts) {
      try {
        // Envoyer selon le canal configuré
        if (alert.channel === "email" || alert.channel === "both") {
          if (alert.recipientEmail) {
            // Fetch project and user info for the email
            const [alertProject] = await db
              .select()
              .from(projects)
              .where(eq(projects.id, alert.projectId));

            const [alertUser] = alert.recipientUserId
              ? await db.select().from(users).where(eq(users.id, alert.recipientUserId))
              : [null];

            const milestoneName = alert.subject
              .replace(/^Rappel J-\d+: /, '')
              .replace(/^RETARD: /, '');

            // Calculate days remaining
            let daysRemaining = 0;
            if (alert.milestoneId) {
              const [milestone] = await db
                .select()
                .from(deliveryMilestones)
                .where(eq(deliveryMilestones.id, alert.milestoneId));
              if (milestone) {
                const nowMs = new Date().setHours(0, 0, 0, 0);
                const targetMs = new Date(milestone.plannedDate).setHours(0, 0, 0, 0);
                daysRemaining = Math.ceil((targetMs - nowMs) / 86400000);
              }
            }

            try {
              const { sendDeadlineReminderEmail } = await import("./gmail");
              await sendDeadlineReminderEmail({
                to: alert.recipientEmail,
                vendorName: alertUser?.name || alertUser?.email || "Sous-traitant",
                projectName: alertProject?.name || "Projet",
                milestoneName,
                plannedDate: alert.milestoneId
                  ? new Date(alert.scheduledFor.getTime() + (alert.alertType === "reminder_j2" ? 2 : 1) * 86400000).toLocaleDateString("fr-FR")
                  : new Date().toLocaleDateString("fr-FR"),
                daysRemaining,
                isOverdue: alert.alertType === "overdue",
              });
              console.log(`[ALERT] Email sent to ${alert.recipientEmail}: ${alert.subject}`);
            } catch (emailError) {
              console.error(`[ALERT] Failed to send email to ${alert.recipientEmail}:`, emailError);
            }
          }
        }

        if (alert.channel === "in_app" || alert.channel === "both") {
          // Créer une notification in-app
          await db.insert(notifications).values({
            orgId: alert.orgId,
            userId: alert.recipientUserId,
            title: alert.subject,
            description: alert.body,
            type: alert.alertType === "overdue" ? "warning" : "info",
            link: `/projects/${alert.projectId}`,
            relatedEntityType: "deadline",
            relatedEntityId: alert.milestoneId || alert.eventId,
          });
        }

        // Marquer comme envoyée
        await db
          .update(deadlineAlerts)
          .set({ sentAt: now })
          .where(eq(deadlineAlerts.id, alert.id));

        result.sent++;
      } catch (error) {
        // Logger l'échec
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        await db
          .update(deadlineAlerts)
          .set({
            failedAt: now,
            failureReason: errorMessage,
          })
          .where(eq(deadlineAlerts.id, alert.id));

        result.failed++;
        result.errors.push(`Alert ${alert.id}: ${errorMessage}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Global error: ${errorMessage}`);
  }

  return result;
}

/**
 * Détecte les deadlines dépassées et met à jour leur statut
 */
export async function detectOverdueDeadlines(): Promise<OverdueResult> {
  const now = new Date();
  const result: OverdueResult = {
    detected: 0,
    updated: 0,
  };

  try {
    // Trouver les jalons en cours dont la date est passée
    const overdueMilestones = await db
      .select({
        milestone: deliveryMilestones,
        project: projects,
      })
      .from(deliveryMilestones)
      .innerJoin(projects, eq(deliveryMilestones.projectId, projects.id))
      .where(
        and(
          lte(deliveryMilestones.plannedDate, now),
          eq(deliveryMilestones.status, "pending")
        )
      );

    result.detected = overdueMilestones.length;

    for (const { milestone, project } of overdueMilestones) {
      // Mettre à jour le statut du jalon
      await db
        .update(deliveryMilestones)
        .set({ status: "overdue", updatedAt: now })
        .where(eq(deliveryMilestones.id, milestone.id));

      // Mettre à jour la couleur de l'événement calendrier
      await db
        .update(projectCalendarEvents)
        .set({ color: "red", updatedAt: now })
        .where(eq(projectCalendarEvents.milestoneId, milestone.id));

      // Créer une alerte de retard si elle n'existe pas déjà
      const existingOverdueAlert = await db
        .select()
        .from(deadlineAlerts)
        .where(
          and(
            eq(deadlineAlerts.milestoneId, milestone.id),
            eq(deadlineAlerts.alertType, "overdue")
          )
        )
        .limit(1);

      if (existingOverdueAlert.length === 0 && milestone.assignedToUserId) {
        // Récupérer l'utilisateur assigné
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, milestone.assignedToUserId));

        if (user) {
          // Créer l'alerte de retard
          await db.insert(deadlineAlerts).values({
            orgId: milestone.orgId,
            projectId: milestone.projectId,
            milestoneId: milestone.id,
            recipientUserId: user.id,
            recipientEmail: user.email,
            alertType: "overdue",
            channel: "both",
            scheduledFor: now, // Immédiat
            subject: `RETARD: ${milestone.title}`,
            body: `La deadline "${milestone.title}" pour le projet "${project.name}" est dépassée. Veuillez soumettre le livrable dès que possible.`,
          });

          // Créer aussi une notification immédiate
          await db.insert(notifications).values({
            orgId: milestone.orgId,
            userId: user.id,
            title: `Deadline dépassée: ${milestone.title}`,
            description: `Le jalon "${milestone.title}" du projet "${project.name}" est en retard.`,
            type: "warning",
            link: `/projects/${milestone.projectId}`,
            relatedEntityType: "milestone",
            relatedEntityId: milestone.id,
          });
        }
      }

      result.updated++;
    }
  } catch (error) {
    console.error("Error detecting overdue deadlines:", error);
  }

  return result;
}

/**
 * Crée des alertes de confirmation quand un livrable est soumis
 */
export async function createDeliveryConfirmationAlert(
  orgId: string,
  projectId: string,
  milestoneId: string,
  deliverableTitle: string,
  submittedByUserId: string
): Promise<void> {
  try {
    // Récupérer le projet et les infos du sous-traitant
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) return;

    const [submitter] = await db
      .select()
      .from(users)
      .where(eq(users.id, submittedByUserId));

    if (!submitter) return;

    // Créer une notification de confirmation
    await db.insert(notifications).values({
      orgId,
      userId: submittedByUserId,
      title: "Livrable soumis avec succès",
      description: `Votre livrable "${deliverableTitle}" a été soumis pour le projet "${project.name}".`,
      type: "success",
      link: `/projects/${projectId}`,
      relatedEntityType: "deliverable",
      relatedEntityId: milestoneId,
    });

    // Notifier les admins
    // TODO: Récupérer les admins de l'organisation et les notifier

  } catch (error) {
    console.error("Error creating delivery confirmation alert:", error);
  }
}

/**
 * Exécute le job complet de traitement des alertes
 * À appeler périodiquement (toutes les heures par exemple)
 */
export async function runDeadlineAlertsJob(): Promise<{
  alerts: AlertResult;
  overdue: OverdueResult;
  executedAt: Date;
}> {
  console.log("[DeadlineAlertsJob] Starting job execution...");
  const startTime = Date.now();

  // 1. Traiter les alertes planifiées
  const alertsResult = await processScheduledAlerts();
  console.log(`[DeadlineAlertsJob] Processed ${alertsResult.processed} alerts, sent ${alertsResult.sent}, failed ${alertsResult.failed}`);

  // 2. Détecter les deadlines dépassées
  const overdueResult = await detectOverdueDeadlines();
  console.log(`[DeadlineAlertsJob] Detected ${overdueResult.detected} overdue milestones, updated ${overdueResult.updated}`);

  const executionTime = Date.now() - startTime;
  console.log(`[DeadlineAlertsJob] Job completed in ${executionTime}ms`);

  return {
    alerts: alertsResult,
    overdue: overdueResult,
    executedAt: new Date(),
  };
}

/**
 * Démarre un intervalle pour exécuter le job périodiquement
 */
export function startDeadlineAlertsScheduler(intervalMs: number = 3600000): NodeJS.Timer {
  console.log(`[DeadlineAlertsJob] Starting scheduler with interval of ${intervalMs}ms`);

  // Exécuter immédiatement au démarrage
  runDeadlineAlertsJob().catch((err) => {
    console.error("[DeadlineAlertsJob] Error on initial run:", err);
  });

  // Puis périodiquement
  return setInterval(() => {
    runDeadlineAlertsJob().catch((err) => {
      console.error("[DeadlineAlertsJob] Error on scheduled run:", err);
    });
  }, intervalMs);
}
