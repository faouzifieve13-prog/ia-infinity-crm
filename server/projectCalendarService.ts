/**
 * Project Calendar Service
 * Gestion du calendrier projet avec filtrage ACL par rôle
 */

import { db } from "./db";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import {
  projectCalendarEvents,
  deliveryMilestones,
  deadlineAlerts,
  projects,
  vendors,
  users,
  notifications,
  type MilestoneStage,
  type ProjectEventType,
  type ProjectEventColor,
  type UserRole,
} from "../shared/schema";

// ============================================================
// TYPES
// ============================================================

interface CalendarEventFilters {
  projectId: string;
  startDate: Date;
  endDate: Date;
  userRole: UserRole;
  vendorId?: string;
  accountId?: string;
  userId?: string;
}

interface MilestoneConfig {
  daysToAudit: number;
  daysToV1: number;
  daysToV2: number;
  daysToImplementation: number;
  daysToClientFeedback: number;
  daysToFinalVersion: number;
}

interface CalendarEventResponse {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  eventType: ProjectEventType;
  color: ProjectEventColor;
  isCompleted: boolean;
  completedAt: Date | null;
  displayTitle: string;
}

// Configuration par défaut des jalons (en jours)
const DEFAULT_MILESTONE_CONFIG: MilestoneConfig = {
  daysToAudit: 3,           // Audit client après 3 jours
  daysToV1: 10,             // Production V1 après 10 jours
  daysToV2: 17,             // Production V2 après 17 jours
  daysToImplementation: 21, // Implémentation client après 21 jours
  daysToClientFeedback: 25, // Retour client après 25 jours
  daysToFinalVersion: 30,   // Version finale après 30 jours
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Mapper un rôle utilisateur vers l'identifiant de visibilité
 */
function mapRoleToVisibility(role: UserRole): string {
  const mapping: Record<string, string> = {
    admin: "admin",
    delivery: "admin",
    sales: "admin",
    finance: "admin",
    client_admin: "client",
    client_member: "client",
    vendor: "vendor",
  };
  return mapping[role] || "admin";
}

/**
 * Formater le titre selon le rôle (masquer certains détails si nécessaire)
 */
function formatTitleForRole(title: string, role: UserRole): string {
  // Pour les clients, on peut simplifier certains titres
  if (role === "client_admin" || role === "client_member") {
    if (title.includes("V1 Interne") || title.includes("V2 Correction")) {
      return title.replace("Interne", "").replace("Correction", "").trim();
    }
  }
  return title;
}

/**
 * Ajouter des jours à une date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Soustraire des jours à une date
 */
function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

// ============================================================
// MAIN FUNCTIONS
// ============================================================

/**
 * Récupère les événements calendrier filtrés par rôle utilisateur
 */
export async function getFilteredCalendarEvents(
  filters: CalendarEventFilters
): Promise<CalendarEventResponse[]> {
  const { projectId, startDate, endDate, userRole, vendorId } = filters;

  // Mapper le rôle vers la visibilité
  const visibilityRole = mapRoleToVisibility(userRole);

  // Requête de base
  const events = await db
    .select({
      id: projectCalendarEvents.id,
      title: projectCalendarEvents.title,
      description: projectCalendarEvents.description,
      start: projectCalendarEvents.start,
      end: projectCalendarEvents.end,
      allDay: projectCalendarEvents.allDay,
      eventType: projectCalendarEvents.eventType,
      color: projectCalendarEvents.color,
      isCompleted: projectCalendarEvents.isCompleted,
      completedAt: projectCalendarEvents.completedAt,
      visibleToRoles: projectCalendarEvents.visibleToRoles,
      assignedToVendorId: projectCalendarEvents.assignedToVendorId,
    })
    .from(projectCalendarEvents)
    .where(
      and(
        eq(projectCalendarEvents.projectId, projectId),
        gte(projectCalendarEvents.start, startDate),
        lte(projectCalendarEvents.end, endDate)
      )
    )
    .orderBy(projectCalendarEvents.start);

  // Filtrer par visibilité ACL
  const filteredEvents = events.filter((event) => {
    const roles = event.visibleToRoles || ["admin"];
    return roles.includes(visibilityRole);
  });

  // Filtrage additionnel pour les vendors (uniquement leurs événements assignés)
  let finalEvents = filteredEvents;
  if (userRole === "vendor" && vendorId) {
    finalEvents = filteredEvents.filter((event) => {
      // Le vendor voit les événements qui lui sont assignés ou les événements globaux
      return !event.assignedToVendorId || event.assignedToVendorId === vendorId;
    });
  }

  // Transformer pour le frontend
  return finalEvents.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    eventType: event.eventType,
    color: event.isCompleted ? "green" : event.color,
    isCompleted: event.isCompleted,
    completedAt: event.completedAt,
    displayTitle: formatTitleForRole(event.title, userRole),
  }));
}

/**
 * Récupère tous les événements calendrier pour tous les projets d'un utilisateur
 */
export async function getAllProjectsCalendarEvents(
  orgId: string,
  userRole: UserRole,
  startDate: Date,
  endDate: Date,
  options?: {
    vendorId?: string;
    accountId?: string;
    userId?: string;
  }
): Promise<(CalendarEventResponse & { projectId: string; projectName: string })[]> {
  const visibilityRole = mapRoleToVisibility(userRole);

  // Requête avec jointure sur les projets
  let query = db
    .select({
      id: projectCalendarEvents.id,
      title: projectCalendarEvents.title,
      description: projectCalendarEvents.description,
      start: projectCalendarEvents.start,
      end: projectCalendarEvents.end,
      allDay: projectCalendarEvents.allDay,
      eventType: projectCalendarEvents.eventType,
      color: projectCalendarEvents.color,
      isCompleted: projectCalendarEvents.isCompleted,
      completedAt: projectCalendarEvents.completedAt,
      visibleToRoles: projectCalendarEvents.visibleToRoles,
      assignedToVendorId: projectCalendarEvents.assignedToVendorId,
      projectId: projectCalendarEvents.projectId,
      projectName: projects.name,
    })
    .from(projectCalendarEvents)
    .innerJoin(projects, eq(projectCalendarEvents.projectId, projects.id))
    .where(
      and(
        eq(projectCalendarEvents.orgId, orgId),
        gte(projectCalendarEvents.start, startDate),
        lte(projectCalendarEvents.end, endDate)
      )
    )
    .orderBy(projectCalendarEvents.start);

  const events = await query;

  // Filtrer par visibilité ACL et vendor si applicable
  return events
    .filter((event) => {
      const roles = event.visibleToRoles || ["admin"];
      if (!roles.includes(visibilityRole)) return false;

      // Filtrage vendor
      if (userRole === "vendor" && options?.vendorId) {
        return !event.assignedToVendorId || event.assignedToVendorId === options.vendorId;
      }

      return true;
    })
    .map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      eventType: event.eventType,
      color: event.isCompleted ? "green" : event.color,
      isCompleted: event.isCompleted,
      completedAt: event.completedAt,
      displayTitle: formatTitleForRole(event.title, userRole),
      projectId: event.projectId,
      projectName: event.projectName,
    }));
}

/**
 * Génère les jalons et événements calendrier pour un nouveau projet
 */
export async function generateProjectMilestones(
  orgId: string,
  projectId: string,
  startDate: Date,
  vendorId?: string,
  config: MilestoneConfig = DEFAULT_MILESTONE_CONFIG
): Promise<void> {
  // Définition des jalons avec leur configuration de visibilité
  const milestoneDefinitions: Array<{
    stage: MilestoneStage;
    title: string;
    description: string;
    daysOffset: number | null;
    triggeredBy?: MilestoneStage;
    daysAfterTrigger?: number;
    eventType: ProjectEventType;
    color: ProjectEventColor;
    visibleToRoles: string[];
    visibleToClient: boolean;
    visibleToVendor: boolean;
  }> = [
    {
      stage: "audit_client",
      title: "Audit Client",
      description: "Audit et analyse des besoins client",
      daysOffset: config.daysToAudit,
      eventType: "meeting",
      color: "blue",
      visibleToRoles: ["admin", "client", "vendor"],
      visibleToClient: true,
      visibleToVendor: true,
    },
    {
      stage: "production_v1",
      title: "Production V1",
      description: "Deadline de production de la première version",
      daysOffset: config.daysToV1,
      eventType: "deadline_internal",
      color: "yellow",
      visibleToRoles: ["admin", "vendor"],
      visibleToClient: false,
      visibleToVendor: true,
    },
    {
      stage: "production_v2",
      title: "Production V2",
      description: "Deadline de production de la deuxième version avec corrections",
      daysOffset: config.daysToV2,
      eventType: "deadline_internal",
      color: "yellow",
      visibleToRoles: ["admin", "vendor"],
      visibleToClient: false,
      visibleToVendor: true,
    },
    {
      stage: "implementation_client",
      title: "Implémentation Client",
      description: "Déploiement et implémentation chez le client",
      daysOffset: config.daysToImplementation,
      eventType: "deadline_client",
      color: "red",
      visibleToRoles: ["admin", "client", "vendor"],
      visibleToClient: true,
      visibleToVendor: true,
    },
    {
      stage: "client_feedback",
      title: "Retour Client",
      description: "Collecte des retours et feedbacks du client",
      daysOffset: config.daysToClientFeedback,
      eventType: "meeting",
      color: "blue",
      visibleToRoles: ["admin", "client"],
      visibleToClient: true,
      visibleToVendor: false,
    },
    {
      stage: "final_version",
      title: "Version Finale",
      description: "Livraison de la version finale validée",
      daysOffset: config.daysToFinalVersion,
      eventType: "deadline_client",
      color: "green",
      visibleToRoles: ["admin", "client", "vendor"],
      visibleToClient: true,
      visibleToVendor: true,
    },
  ];

  // Créer en transaction
  await db.transaction(async (tx) => {
    const createdMilestones: Map<MilestoneStage, string> = new Map();

    for (const def of milestoneDefinitions) {
      // Calculer la date planifiée
      let plannedDate: Date;
      if (def.daysOffset !== null) {
        plannedDate = addDays(startDate, def.daysOffset);
      } else if (def.triggeredBy && def.daysAfterTrigger) {
        // Pour les jalons déclenchés, on utilise une date placeholder
        // Elle sera mise à jour quand le jalon déclencheur sera complété
        plannedDate = addDays(startDate, config.daysToClientFeedback + def.daysAfterTrigger);
      } else {
        plannedDate = startDate;
      }

      // Créer le jalon
      const [milestone] = await tx
        .insert(deliveryMilestones)
        .values({
          orgId,
          projectId,
          stage: def.stage,
          title: def.title,
          description: def.description,
          plannedDate,
          assignedToVendorId: vendorId,
          visibleToClient: def.visibleToClient,
          visibleToVendor: def.visibleToVendor,
          status: "pending",
        })
        .returning();

      createdMilestones.set(def.stage, milestone.id);

      // Créer l'événement calendrier associé
      await tx.insert(projectCalendarEvents).values({
        orgId,
        projectId,
        milestoneId: milestone.id,
        title: def.title,
        description: def.description,
        start: plannedDate,
        end: plannedDate,
        allDay: true,
        eventType: def.eventType,
        color: def.color,
        visibleToRoles: def.visibleToRoles,
        assignedToVendorId: vendorId,
      });

      // Créer les alertes J-2 pour chaque jalon
      if (def.daysOffset !== null) {
        // On créera les alertes après avoir récupéré les utilisateurs concernés
        await scheduleAlertForMilestone(tx, orgId, projectId, milestone.id, plannedDate, def);
      }
    }

    // Mettre à jour les références de déclenchement
    for (const def of milestoneDefinitions) {
      if (def.triggeredBy) {
        const triggerId = createdMilestones.get(def.triggeredBy);
        const milestoneId = createdMilestones.get(def.stage);
        if (triggerId && milestoneId) {
          await tx
            .update(deliveryMilestones)
            .set({
              triggersNextMilestoneId: triggerId,
              daysAfterTrigger: def.daysAfterTrigger,
            })
            .where(eq(deliveryMilestones.id, milestoneId));
        }
      }
    }
  });
}

/**
 * Planifier une alerte pour un jalon
 */
async function scheduleAlertForMilestone(
  tx: any,
  orgId: string,
  projectId: string,
  milestoneId: string,
  plannedDate: Date,
  def: any
): Promise<void> {
  // Récupérer le projet pour avoir les infos
  const [project] = await tx
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) return;

  // Récupérer le vendor assigné s'il existe
  if (project.vendorId) {
    const [vendor] = await tx
      .select()
      .from(vendors)
      .where(eq(vendors.id, project.vendorId));

    if (vendor && vendor.userId) {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, vendor.userId));

      if (user) {
        // Alerte J-2
        const alertDateJ2 = subtractDays(plannedDate, 2);
        if (alertDateJ2 > new Date()) {
          await tx.insert(deadlineAlerts).values({
            orgId,
            projectId,
            milestoneId,
            recipientUserId: user.id,
            recipientEmail: user.email,
            alertType: "reminder_j2",
            channel: "both",
            scheduledFor: alertDateJ2,
            subject: `Rappel J-2: ${def.title}`,
            body: `La deadline "${def.title}" pour le projet "${project.name}" est dans 2 jours (${plannedDate.toLocaleDateString("fr-FR")}).`,
          });
        }

        // Alerte J-1
        const alertDateJ1 = subtractDays(plannedDate, 1);
        if (alertDateJ1 > new Date()) {
          await tx.insert(deadlineAlerts).values({
            orgId,
            projectId,
            milestoneId,
            recipientUserId: user.id,
            recipientEmail: user.email,
            alertType: "reminder_j1",
            channel: "both",
            scheduledFor: alertDateJ1,
            subject: `Rappel J-1: ${def.title}`,
            body: `La deadline "${def.title}" pour le projet "${project.name}" est demain (${plannedDate.toLocaleDateString("fr-FR")}).`,
          });
        }
      }
    }
  }
}

/**
 * Marquer un jalon comme terminé et déclencher le workflow
 */
export async function completeMilestone(
  milestoneId: string,
  completionDate: Date = new Date()
): Promise<{ success: boolean; triggeredMilestones: string[] }> {
  const triggeredMilestones: string[] = [];

  await db.transaction(async (tx) => {
    // Récupérer le jalon
    const [milestone] = await tx
      .select()
      .from(deliveryMilestones)
      .where(eq(deliveryMilestones.id, milestoneId));

    if (!milestone) {
      throw new Error("Milestone not found");
    }

    // Mettre à jour le statut du jalon
    await tx
      .update(deliveryMilestones)
      .set({
        status: "completed",
        actualDate: completionDate,
        updatedAt: new Date(),
      })
      .where(eq(deliveryMilestones.id, milestoneId));

    // Mettre à jour l'événement calendrier
    await tx
      .update(projectCalendarEvents)
      .set({
        isCompleted: true,
        completedAt: completionDate,
        color: "green",
        updatedAt: new Date(),
      })
      .where(eq(projectCalendarEvents.milestoneId, milestoneId));

    // Trouver les jalons qui dépendent de celui-ci
    const dependentMilestones = await tx
      .select()
      .from(deliveryMilestones)
      .where(eq(deliveryMilestones.triggersNextMilestoneId, milestoneId));

    // Mettre à jour les dates des jalons dépendants
    for (const dependent of dependentMilestones) {
      const newPlannedDate = addDays(completionDate, dependent.daysAfterTrigger || 0);

      await tx
        .update(deliveryMilestones)
        .set({
          plannedDate: newPlannedDate,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(deliveryMilestones.id, dependent.id));

      // Mettre à jour l'événement calendrier associé
      await tx
        .update(projectCalendarEvents)
        .set({
          start: newPlannedDate,
          end: newPlannedDate,
          updatedAt: new Date(),
        })
        .where(eq(projectCalendarEvents.milestoneId, dependent.id));

      triggeredMilestones.push(dependent.id);

      // Créer les alertes pour le nouveau jalon
      const [project] = await tx
        .select()
        .from(projects)
        .where(eq(projects.id, dependent.projectId));

      if (project && project.vendorId) {
        const [vendor] = await tx
          .select()
          .from(vendors)
          .where(eq(vendors.id, project.vendorId));

        if (vendor && vendor.userId) {
          const [user] = await tx
            .select()
            .from(users)
            .where(eq(users.id, vendor.userId));

          if (user) {
            // Alerte J-2
            const alertDateJ2 = subtractDays(newPlannedDate, 2);
            if (alertDateJ2 > new Date()) {
              await tx.insert(deadlineAlerts).values({
                orgId: dependent.orgId,
                projectId: dependent.projectId,
                milestoneId: dependent.id,
                recipientUserId: user.id,
                recipientEmail: user.email,
                alertType: "reminder_j2",
                channel: "both",
                scheduledFor: alertDateJ2,
                subject: `Rappel J-2: ${dependent.title}`,
                body: `La deadline "${dependent.title}" pour le projet "${project.name}" est dans 2 jours.`,
              });
            }
          }
        }
      }
    }

    // Créer une notification de confirmation
    const [project] = await tx
      .select()
      .from(projects)
      .where(eq(projects.id, milestone.projectId));

    if (project && milestone.assignedToVendorId) {
      const [vendor] = await tx
        .select()
        .from(vendors)
        .where(eq(vendors.id, milestone.assignedToVendorId));

      if (vendor && vendor.userId) {
        await tx.insert(notifications).values({
          orgId: milestone.orgId,
          userId: vendor.userId,
          title: "Jalon validé",
          description: `Le jalon "${milestone.title}" a été marqué comme terminé.`,
          type: "success",
          link: `/projects/${milestone.projectId}`,
          relatedEntityType: "milestone",
          relatedEntityId: milestone.id,
        });
      }
    }
  });

  return { success: true, triggeredMilestones };
}

/**
 * Créer un événement calendrier personnalisé pour un projet
 */
export async function createProjectCalendarEvent(
  orgId: string,
  projectId: string,
  data: {
    title: string;
    description?: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    eventType: ProjectEventType;
    color: ProjectEventColor;
    visibleToRoles: string[];
    assignedToVendorId?: string;
    assignedToUserId?: string;
    createdById?: string;
  }
): Promise<string> {
  const [event] = await db
    .insert(projectCalendarEvents)
    .values({
      orgId,
      projectId,
      title: data.title,
      description: data.description,
      start: data.start,
      end: data.end,
      allDay: data.allDay ?? true,
      eventType: data.eventType,
      color: data.color,
      visibleToRoles: data.visibleToRoles,
      assignedToVendorId: data.assignedToVendorId,
      assignedToUserId: data.assignedToUserId,
      createdById: data.createdById,
    })
    .returning();

  return event.id;
}

/**
 * Mettre à jour un événement calendrier
 */
export async function updateProjectCalendarEvent(
  eventId: string,
  data: Partial<{
    title: string;
    description: string;
    start: Date;
    end: Date;
    allDay: boolean;
    color: ProjectEventColor;
    isCompleted: boolean;
  }>
): Promise<void> {
  await db
    .update(projectCalendarEvents)
    .set({
      ...data,
      updatedAt: new Date(),
      completedAt: data.isCompleted ? new Date() : undefined,
    })
    .where(eq(projectCalendarEvents.id, eventId));
}

/**
 * Supprimer un événement calendrier
 */
export async function deleteProjectCalendarEvent(eventId: string): Promise<void> {
  await db.delete(projectCalendarEvents).where(eq(projectCalendarEvents.id, eventId));
}

/**
 * Mettre à jour un jalon (principalement la date planifiée)
 */
export async function updateMilestone(
  milestoneId: string,
  data: Partial<{
    plannedDate: Date;
    status: string;
    notes: string;
  }>
): Promise<void> {
  await db.transaction(async (tx) => {
    // Mettre à jour le milestone
    await tx
      .update(deliveryMilestones)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(deliveryMilestones.id, milestoneId));

    // Si la date planifiée a changé, mettre à jour l'événement calendrier associé
    if (data.plannedDate) {
      await tx
        .update(projectCalendarEvents)
        .set({
          start: data.plannedDate,
          end: data.plannedDate,
          updatedAt: new Date(),
        })
        .where(eq(projectCalendarEvents.milestoneId, milestoneId));
    }
  });
}

/**
 * Récupérer les jalons d'un projet
 */
export async function getProjectMilestones(projectId: string) {
  return db
    .select()
    .from(deliveryMilestones)
    .where(eq(deliveryMilestones.projectId, projectId))
    .orderBy(deliveryMilestones.plannedDate);
}

/**
 * Récupérer les statistiques des jalons pour un projet
 */
export async function getMilestoneStats(projectId: string) {
  const milestones = await getProjectMilestones(projectId);

  return {
    total: milestones.length,
    completed: milestones.filter((m) => m.status === "completed").length,
    pending: milestones.filter((m) => m.status === "pending").length,
    inProgress: milestones.filter((m) => m.status === "in_progress").length,
    overdue: milestones.filter((m) => m.status === "overdue").length,
    progress: milestones.length > 0
      ? Math.round(
          (milestones.filter((m) => m.status === "completed").length / milestones.length) * 100
        )
      : 0,
  };
}
