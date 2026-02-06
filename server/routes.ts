import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import {
  insertAccountSchema, insertContactSchema, insertDealSchema, insertActivitySchema,
  insertProjectSchema, insertTaskSchema, insertInvoiceSchema, insertInvoiceLineItemSchema,
  insertVendorSchema, insertMissionSchema, insertDocumentSchema, insertWorkflowRunSchema,
  insertOrganizationSchema, insertUserSchema, insertMembershipSchema, insertContractSchema,
  insertInvitationSchema,
  users,
  deadlineAlerts,
  type DealStage, type TaskStatus, type ProjectStatus, type ContractType, type ContractStatus,
  type UserRole, type Space, type InvitationStatus
} from "@shared/schema";
import { sendInvitationEmail, sendClientWelcomeEmail, sendVendorWelcomeEmail, testGmailConnection, getInboxEmails } from "./gmail";
import { uploadFileToDrive } from "./drive";
import { requireAuth, requireAdmin, requireClient, requireVendor, requireClientAdmin, requireWriteAccess, requireChannelAccess, requireVendorProjectAccess, getSessionData } from "./auth";
import {
  getAccessContext,
  filterProjectsByAccess,
  filterAccountsByAccess,
  filterTasksByAccess,
  validateVendorProjectAccess,
  getVendorProjectIds,
} from "./access-control";
import {
  notifyProjectComment,
  notifyTaskAssigned,
  notifyTaskStatusChange,
  notifyDeliverableUploaded,
  notifyInvoiceCreated,
  notifyProjectStatusChange,
} from "./notifications";
import { calculateDealScore } from "./utils/scoring";
import {
  getFilteredCalendarEvents,
  getAllProjectsCalendarEvents,
  generateProjectMilestones,
  completeMilestone,
  updateMilestone,
  createProjectCalendarEvent,
  updateProjectCalendarEvent,
  deleteProjectCalendarEvent,
  getProjectMilestones,
  getMilestoneStats,
} from "./projectCalendarService";
import { runDeadlineAlertsJob } from "./deadlineAlertsJob";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const DEFAULT_ORG_ID = "default-org";

async function ensureDefaultOrg() {
  let org = await storage.getOrganization(DEFAULT_ORG_ID);
  if (!org) {
    await storage.createOrganizationWithId(DEFAULT_ORG_ID, { name: "IA Infinity" });
  }
}

function getOrgId(req: Request): string {
  return DEFAULT_ORG_ID;
}

// Helper function to check if user has access to a project
// Access is granted if:
// 1. User is a client AND project.accountId matches their accountId
// 2. OR User is a vendor AND project.vendorContactId matches their vendorContactId
async function hasProjectAccess(
  project: { accountId?: string | null; vendorContactId?: string | null } | null,
  req: Request
): Promise<boolean> {
  if (!project) return false;
  
  const accountId = req.session.accountId;
  const vendorContactId = req.session.vendorContactId;
  const role = req.session.role;
  
  // Client access: project belongs to their account
  if (accountId && project.accountId === accountId) {
    return true;
  }
  
  // Vendor access: project is assigned to them
  if (vendorContactId && project.vendorContactId === vendorContactId) {
    return true;
  }
  
  // Admin access (in case this is called from admin context)
  if (role === 'admin') {
    return true;
  }
  
  return false;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await ensureDefaultOrg();

  app.get("/api/dashboard/stats", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const stats = await storage.getDashboardStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/accounts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accounts = await storage.getAccounts(orgId);
      res.json(accounts);
    } catch (error) {
      console.error("Get accounts error:", error);
      res.status(500).json({ error: "Failed to get accounts" });
    }
  });

  app.get("/api/accounts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const account = await storage.getAccount(req.params.id, orgId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error("Get account error:", error);
      res.status(500).json({ error: "Failed to get account" });
    }
  });

  app.post("/api/accounts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertAccountSchema.parse({ ...req.body, orgId });
      const account = await storage.createAccount(data);

      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create account error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.patch("/api/accounts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const account = await storage.updateAccount(req.params.id, orgId, req.body);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error("Update account error:", error);
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  // Diagnostic pour vérifier pourquoi un account ne peut pas être supprimé
  app.get("/api/accounts/:id/deletion-check", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.params.id;

      // Check all entities linked to this account
      const allProjects = await storage.getProjects(orgId);
      const allContacts = await storage.getContacts(orgId);
      const allDeals = await storage.getDeals(orgId);
      const allMemberships = await storage.getMemberships(orgId);

      const linkedProjects = allProjects.filter(p => p.accountId === accountId);
      const linkedContacts = allContacts.filter(c => c.accountId === accountId);
      const linkedDeals = allDeals.filter(d => d.accountId === accountId);
      const linkedMemberships = allMemberships.filter(m => m.accountId === accountId);

      const canDelete = linkedProjects.length === 0 &&
                       linkedContacts.length === 0 &&
                       linkedDeals.length === 0 &&
                       linkedMemberships.length === 0;

      res.json({
        canDelete,
        blockers: {
          projects: linkedProjects.length,
          contacts: linkedContacts.length,
          deals: linkedDeals.length,
          memberships: linkedMemberships.length,
        },
        details: {
          projects: linkedProjects.map(p => ({ id: p.id, name: p.name })),
          contacts: linkedContacts.map(c => ({ id: c.id, name: c.name, email: c.email })),
          deals: linkedDeals.map(d => ({ id: d.id, name: d.name })),
          memberships: linkedMemberships.map(m => ({ id: m.id, userId: m.userId, role: m.role })),
        },
        recommendation: canDelete
          ? "Can be safely deleted"
          : "Delete or reassign linked entities first, or use cascade delete",
      });
    } catch (error) {
      console.error("Account deletion check error:", error);
      res.status(500).json({ error: "Failed to check account deletion" });
    }
  });

  // Simplified account deletion route - CASCADE constraints handle all child entity deletion
  app.delete("/api/accounts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.params.id;

      console.log(`Deleting account ${accountId} (CASCADE will handle all linked entities)...`);

      // Thanks to CASCADE constraints at the DB level, a single query is sufficient
      // This will automatically delete: projects, contacts, deals, memberships, invitations,
      // channels, and all their child entities (tasks, invoices, documents, etc.)
      await storage.deleteAccount(accountId, orgId);

      console.log(`Account deleted successfully with all linked entities via CASCADE`);
      res.status(204).send();
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({
        error: "Failed to delete account",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Send invitation to client for portal access
  app.post("/api/accounts/:id/send-invitation", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const account = await storage.getAccount(req.params.id, orgId);

      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      if (!account.contactEmail) {
        return res.status(400).json({ error: "No contact email for this client" });
      }

      // Create an invitation for client portal access
      const token = generateToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 6 months

      await storage.createInvitation({
        orgId,
        email: account.contactEmail,
        role: 'client_admin' as UserRole,
        space: 'client' as Space,
        tokenHash,
        expiresAt,
        status: 'pending',
        accountId: account.id,
        vendorId: null,
      });

      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const portalLink = `${baseUrl}/auth/accept-invite?token=${token}`;

      // Use contact name if available, otherwise extract from email
      const clientName = account.contactName || account.contactEmail.split('@')[0].replace(/[._]/g, ' ');

      // Send welcome email
      try {
        await sendClientWelcomeEmail({
          to: account.contactEmail,
          clientName: clientName.charAt(0).toUpperCase() + clientName.slice(1),
          companyName: account.name,
          portalLink,
          organizationName: 'IA Infinity',
        });

        res.json({
          success: true,
          message: "Invitation sent successfully",
          emailSent: true
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        res.json({
          success: true,
          message: "Invitation created but email could not be sent",
          emailSent: false
        });
      }
    } catch (error) {
      console.error("Send invitation error:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  // Generate CR (Compte Rendu) using ChatGPT for a client
  app.post("/api/accounts/:id/generate-cr", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const account = await storage.getAccount(req.params.id, orgId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Get related data for context
      const deals = (await storage.getDeals(orgId)).filter(d => d.accountId === account.id);
      const projects = (await storage.getProjects(orgId)).filter(p => p.accountId === account.id);
      const contracts = (await storage.getContracts(orgId)).filter(c => c.accountId === account.id);

      // Import OpenAI
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const contextData = {
        client: {
          name: account.name,
          contactName: account.contactName,
          plan: account.plan,
          status: account.status,
          notes: account.notes,
        },
        deals: deals.map(d => ({ name: d.name, stage: d.stage, value: d.value })),
        projects: projects.map(p => ({ name: p.name, status: p.status, progress: p.progress, description: p.description })),
        contracts: contracts.map(c => ({ title: c.title, type: c.type, status: c.status, amount: c.amount })),
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Tu es un assistant professionnel qui rédige des comptes rendus de suivi client pour IA Infinity, une entreprise spécialisée dans l'intelligence artificielle et l'automatisation. 
            
Rédige un compte rendu de suivi clair, professionnel et structuré en français. Le CR doit inclure:
- Un résumé de la situation actuelle du client
- L'état des projets en cours
- Les opportunités commerciales
- Les prochaines étapes recommandées
- Les points d'attention

Utilise un ton professionnel mais accessible. Formate le texte avec des titres et des listes à puces pour une lecture facile.`,
          },
          {
            role: "user",
            content: `Génère un compte rendu de suivi pour le client suivant:\n\n${JSON.stringify(contextData, null, 2)}`,
          },
        ],
        max_completion_tokens: 2000,
      });

      const generatedCR = response.choices[0]?.message?.content || "";

      // Optionally save to notes
      if (req.body.saveToNotes) {
        await storage.updateAccount(req.params.id, orgId, { notes: generatedCR });
      }

      res.json({ cr: generatedCR });
    } catch (error) {
      console.error("Generate CR error:", error);
      res.status(500).json({ error: "Failed to generate CR" });
    }
  });

  // Send CR by email to client
  app.post("/api/accounts/:id/send-cr", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const account = await storage.getAccount(req.params.id, orgId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      if (!account.contactEmail) {
        return res.status(400).json({ error: "No contact email for this client" });
      }

      const { cr } = req.body;
      if (!cr) {
        return res.status(400).json({ error: "CR content is required" });
      }

      const { sendGenericEmail } = await import("./gmail");
      
      const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                IA Infinity
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Compte Rendu de Suivi
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600;">
                Bonjour ${account.contactName || account.name},
              </h2>
              <div style="color: #52525b; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">
${cr.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} IA Infinity. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      const result = await sendGenericEmail({
        to: account.contactEmail,
        subject: `Compte Rendu de Suivi - ${account.name} | IA Infinity`,
        htmlBody,
      });

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ error: result.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Send CR error:", error);
      res.status(500).json({ error: "Failed to send CR" });
    }
  });

  // Account Loom Videos
  app.get("/api/accounts/:accountId/loom-videos", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const videos = await storage.getAccountLoomVideos(req.params.accountId, orgId);
      res.json(videos);
    } catch (error) {
      console.error("Get loom videos error:", error);
      res.status(500).json({ error: "Failed to get loom videos" });
    }
  });

  app.post("/api/accounts/:accountId/loom-videos", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId;
      const video = await storage.createAccountLoomVideo({
        ...req.body,
        orgId,
        accountId: req.params.accountId,
        createdById: userId,
      });
      res.status(201).json(video);
    } catch (error) {
      console.error("Create loom video error:", error);
      res.status(500).json({ error: "Failed to create loom video" });
    }
  });

  app.delete("/api/accounts/:accountId/loom-videos/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteAccountLoomVideo(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete loom video error:", error);
      res.status(500).json({ error: "Failed to delete loom video" });
    }
  });

  // Account Updates (CR History)
  app.get("/api/accounts/:accountId/updates", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const updates = await storage.getAccountUpdates(req.params.accountId, orgId);
      res.json(updates);
    } catch (error) {
      console.error("Get account updates error:", error);
      res.status(500).json({ error: "Failed to get account updates" });
    }
  });

  app.post("/api/accounts/:accountId/updates", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId;

      // Validate that updateDate is provided
      if (!req.body.updateDate) {
        return res.status(400).json({ error: "La date est obligatoire" });
      }

      const update = await storage.createAccountUpdate({
        ...req.body,
        orgId,
        accountId: req.params.accountId,
        createdById: userId,
        updateDate: new Date(req.body.updateDate),
      });
      res.status(201).json(update);
    } catch (error) {
      console.error("Create account update error:", error);
      res.status(500).json({ error: "Failed to create account update" });
    }
  });

  app.patch("/api/accounts/:accountId/updates/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const update = await storage.updateAccountUpdate(req.params.id, orgId, {
        ...req.body,
        updateDate: req.body.updateDate ? new Date(req.body.updateDate) : undefined,
      });
      if (!update) {
        return res.status(404).json({ error: "Update not found" });
      }
      res.json(update);
    } catch (error) {
      console.error("Update account update error:", error);
      res.status(500).json({ error: "Failed to update account update" });
    }
  });

  app.delete("/api/accounts/:accountId/updates/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteAccountUpdate(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete account update error:", error);
      res.status(500).json({ error: "Failed to delete account update" });
    }
  });

  // Project Updates (CR de suivi projet)
  app.get("/api/projects/:projectId/updates", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const updates = await storage.getProjectUpdates(req.params.projectId, orgId);
      res.json(updates);
    } catch (error) {
      console.error("Get project updates error:", error);
      res.status(500).json({ error: "Failed to get project updates" });
    }
  });

  app.post("/api/projects/:projectId/updates", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = (req as any).user?.id;
      const update = await storage.createProjectUpdate({
        ...req.body,
        orgId,
        projectId: req.params.projectId,
        createdById: userId,
        updateDate: req.body.updateDate ? new Date(req.body.updateDate) : new Date(),
      });
      res.status(201).json(update);
    } catch (error) {
      console.error("Create project update error:", error);
      res.status(500).json({ error: "Failed to create project update" });
    }
  });

  app.patch("/api/projects/:projectId/updates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const update = await storage.updateProjectUpdate(req.params.id, orgId, {
        ...req.body,
        updateDate: req.body.updateDate ? new Date(req.body.updateDate) : undefined,
      });
      if (!update) {
        return res.status(404).json({ error: "Update not found" });
      }
      res.json(update);
    } catch (error) {
      console.error("Update project update error:", error);
      res.status(500).json({ error: "Failed to update project update" });
    }
  });

  app.delete("/api/projects/:projectId/updates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteProjectUpdate(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete project update error:", error);
      res.status(500).json({ error: "Failed to delete project update" });
    }
  });

  // Project Deliverables (fichiers livrables: JSON, PDF, Loom)
  app.get("/api/projects/:projectId/deliverables", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const deliverables = await storage.getProjectDeliverables(req.params.projectId, orgId);
      res.json(deliverables);
    } catch (error) {
      console.error("Get project deliverables error:", error);
      res.status(500).json({ error: "Failed to get project deliverables" });
    }
  });

  app.post("/api/projects/:projectId/deliverables", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = (req as any).user?.id;
      const deliverable = await storage.createProjectDeliverable({
        ...req.body,
        orgId,
        projectId: req.params.projectId,
        createdById: userId,
      });
      res.status(201).json(deliverable);
    } catch (error) {
      console.error("Create project deliverable error:", error);
      res.status(500).json({ error: "Failed to create project deliverable" });
    }
  });

  app.delete("/api/projects/:projectId/deliverables/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteProjectDeliverable(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete project deliverable error:", error);
      res.status(500).json({ error: "Failed to delete project deliverable" });
    }
  });

  // ============================================================
  // DELIVERABLE COMPLIANCE WORKFLOW ROUTES
  // ============================================================

  // Get compliance steps for a deliverable
  app.get("/api/deliverables/:deliverableId/compliance-steps", requireAuth, async (req: Request, res: Response) => {
    try {
      const { deliverableId } = req.params;
      const steps = await storage.getComplianceSteps(deliverableId);
      res.json(steps);
    } catch (error) {
      console.error("Get compliance steps error:", error);
      res.status(500).json({ error: "Failed to get compliance steps" });
    }
  });

  // Get single compliance step
  app.get("/api/compliance-steps/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const step = await storage.getComplianceStep(req.params.id);
      if (!step) {
        return res.status(404).json({ error: "Compliance step not found" });
      }
      res.json(step);
    } catch (error) {
      console.error("Get compliance step error:", error);
      res.status(500).json({ error: "Failed to get compliance step" });
    }
  });

  // Create compliance step (Admin only)
  app.post("/api/deliverables/:deliverableId/compliance-steps", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { deliverableId } = req.params;
      const step = await storage.createComplianceStep({
        ...req.body,
        deliverableId,
      });
      res.status(201).json(step);
    } catch (error) {
      console.error("Create compliance step error:", error);
      res.status(500).json({ error: "Failed to create compliance step" });
    }
  });

  // Update compliance step (Admin only)
  app.patch("/api/compliance-steps/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const step = await storage.updateComplianceStep(req.params.id, req.body);
      if (!step) {
        return res.status(404).json({ error: "Compliance step not found" });
      }
      res.json(step);
    } catch (error) {
      console.error("Update compliance step error:", error);
      res.status(500).json({ error: "Failed to update compliance step" });
    }
  });

  // Delete compliance step (Admin only)
  app.delete("/api/compliance-steps/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteComplianceStep(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete compliance step error:", error);
      res.status(500).json({ error: "Failed to delete compliance step" });
    }
  });

  // Save draft (auto-save) - Vendor can use
  app.post("/api/compliance-steps/:id/save-draft", requireAuth, async (req: Request, res: Response) => {
    try {
      const { formData, checklistItems, dynamicListData } = req.body;
      const step = await storage.saveComplianceStepDraft(
        req.params.id,
        formData,
        checklistItems,
        dynamicListData
      );
      if (!step) {
        return res.status(404).json({ error: "Compliance step not found" });
      }
      res.json(step);
    } catch (error) {
      console.error("Save draft error:", error);
      res.status(500).json({ error: "Failed to save draft" });
    }
  });

  // Submit step for completion/review
  app.post("/api/compliance-steps/:id/submit", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const step = await storage.submitComplianceStep(req.params.id);
      if (!step) {
        return res.status(404).json({ error: "Compliance step not found" });
      }

      // Update deliverable progress
      const deliverable = await storage.getProjectDeliverableById(step.deliverableId, orgId);
      if (deliverable) {
        await storage.updateDeliverableProgress(step.deliverableId, orgId);
      }

      res.json(step);
    } catch (error) {
      console.error("Submit compliance step error:", error);
      res.status(500).json({ error: "Failed to submit compliance step" });
    }
  });

  // Admin approves a step
  app.post("/api/compliance-steps/:id/approve", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;
      const { comment } = req.body;

      const step = await storage.approveComplianceStep(req.params.id, userId, comment);
      if (!step) {
        return res.status(404).json({ error: "Compliance step not found" });
      }

      // Update deliverable progress
      const deliverable = await storage.getProjectDeliverableById(step.deliverableId, orgId);
      if (deliverable) {
        await storage.updateDeliverableProgress(step.deliverableId, orgId);
      }

      res.json(step);
    } catch (error) {
      console.error("Approve compliance step error:", error);
      res.status(500).json({ error: "Failed to approve compliance step" });
    }
  });

  // Admin rejects a step
  app.post("/api/compliance-steps/:id/reject", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      const step = await storage.rejectComplianceStep(req.params.id, userId, reason);
      if (!step) {
        return res.status(404).json({ error: "Compliance step not found" });
      }

      // Update deliverable progress (might decrease)
      const deliverable = await storage.getProjectDeliverableById(step.deliverableId, orgId);
      if (deliverable) {
        await storage.updateDeliverableProgress(step.deliverableId, orgId);
      }

      res.json(step);
    } catch (error) {
      console.error("Reject compliance step error:", error);
      res.status(500).json({ error: "Failed to reject compliance step" });
    }
  });

  // Initialize compliance steps from template
  app.post("/api/deliverables/:deliverableId/initialize-compliance", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { deliverableId } = req.params;
      const { templateId } = req.body;

      // Get the deliverable to check version
      const deliverable = await storage.getProjectDeliverableById(deliverableId, orgId);
      if (!deliverable) {
        return res.status(404).json({ error: "Deliverable not found" });
      }

      let template;
      if (templateId) {
        template = await storage.getComplianceTemplate(templateId);
      } else {
        // Use default template based on version
        template = await storage.getDefaultComplianceTemplate(orgId, deliverable.version);
      }

      if (!template) {
        return res.status(404).json({ error: "No compliance template found" });
      }

      const steps = await storage.initializeComplianceStepsFromTemplate(deliverableId, template.id);

      // Update deliverable with template reference
      await storage.updateProjectDeliverable(deliverableId, orgId, {
        status: 'pending',
      });

      res.status(201).json({ steps, template });
    } catch (error) {
      console.error("Initialize compliance error:", error);
      res.status(500).json({ error: "Failed to initialize compliance steps" });
    }
  });

  // ============================================================
  // COMPLIANCE TEMPLATES ROUTES
  // ============================================================

  // Get all templates for org
  app.get("/api/compliance-templates", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const templates = await storage.getComplianceTemplates(orgId);
      res.json(templates);
    } catch (error) {
      console.error("Get compliance templates error:", error);
      res.status(500).json({ error: "Failed to get compliance templates" });
    }
  });

  // Get single template
  app.get("/api/compliance-templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const template = await storage.getComplianceTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Get compliance template error:", error);
      res.status(500).json({ error: "Failed to get compliance template" });
    }
  });

  // Create template (Admin only)
  app.post("/api/compliance-templates", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;
      const template = await storage.createComplianceTemplate({
        ...req.body,
        orgId,
        createdById: userId,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Create compliance template error:", error);
      res.status(500).json({ error: "Failed to create compliance template" });
    }
  });

  // Update template (Admin only)
  app.patch("/api/compliance-templates/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const template = await storage.updateComplianceTemplate(req.params.id, orgId, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Update compliance template error:", error);
      res.status(500).json({ error: "Failed to update compliance template" });
    }
  });

  // Delete template (Admin only)
  app.delete("/api/compliance-templates/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteComplianceTemplate(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete compliance template error:", error);
      res.status(500).json({ error: "Failed to delete compliance template" });
    }
  });

  // ============================================================
  // PROJECT CALENDAR & MILESTONES ROUTES
  // ============================================================

  // Get calendar events for a specific project (filtered by user role)
  app.get("/api/projects/:projectId/calendar", requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { start, end } = req.query;
      const context = getAccessContext(req);

      if (!start || !end) {
        return res.status(400).json({ error: "start and end query parameters are required" });
      }

      const events = await getFilteredCalendarEvents({
        projectId,
        startDate: new Date(start as string),
        endDate: new Date(end as string),
        userRole: context.role as UserRole,
        vendorId: context.vendorId || undefined,
        accountId: context.accountId || undefined,
        userId: context.userId,
      });

      res.json(events);
    } catch (error) {
      console.error("Get project calendar error:", error);
      res.status(500).json({ error: "Failed to get project calendar events" });
    }
  });

  // Get calendar events for all projects (dashboard view)
  app.get("/api/calendar/projects", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { start, end } = req.query;
      const context = getAccessContext(req);

      if (!start || !end) {
        return res.status(400).json({ error: "start and end query parameters are required" });
      }

      const events = await getAllProjectsCalendarEvents(
        orgId,
        context.role as UserRole,
        new Date(start as string),
        new Date(end as string),
        {
          vendorId: context.vendorId || undefined,
          accountId: context.accountId || undefined,
          userId: context.userId,
        }
      );

      res.json(events);
    } catch (error) {
      console.error("Get all projects calendar error:", error);
      res.status(500).json({ error: "Failed to get calendar events" });
    }
  });

  // Get milestones for a project
  app.get("/api/projects/:projectId/milestones", requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const milestones = await getProjectMilestones(projectId);
      res.json(milestones);
    } catch (error) {
      console.error("Get project milestones error:", error);
      res.status(500).json({ error: "Failed to get project milestones" });
    }
  });

  // Get milestone statistics for a project
  app.get("/api/projects/:projectId/milestones/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const stats = await getMilestoneStats(projectId);
      res.json(stats);
    } catch (error) {
      console.error("Get milestone stats error:", error);
      res.status(500).json({ error: "Failed to get milestone statistics" });
    }
  });

  // Generate milestones for a project (Admin only)
  app.post("/api/projects/:projectId/milestones/generate", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { projectId } = req.params;
      const { startDate, vendorId, config } = req.body;

      // Check if project exists
      const project = await storage.getProject(projectId, orgId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      await generateProjectMilestones(
        orgId,
        projectId,
        new Date(startDate || project.startDate || new Date()),
        vendorId || project.vendorId,
        config
      );

      res.status(201).json({ success: true, message: "Milestones generated successfully" });
    } catch (error) {
      console.error("Generate milestones error:", error);
      res.status(500).json({ error: "Failed to generate milestones" });
    }
  });

  // Complete a milestone (triggers workflow)
  app.post("/api/milestones/:milestoneId/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      const { milestoneId } = req.params;
      const { completionDate } = req.body;

      const result = await completeMilestone(
        milestoneId,
        completionDate ? new Date(completionDate) : new Date()
      );

      res.json(result);
    } catch (error) {
      console.error("Complete milestone error:", error);
      res.status(500).json({ error: "Failed to complete milestone" });
    }
  });

  // Update a milestone (e.g., change planned date)
  app.patch("/api/milestones/:milestoneId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { milestoneId } = req.params;
      const { plannedDate, status, notes } = req.body;

      await updateMilestone(milestoneId, {
        plannedDate: plannedDate ? new Date(plannedDate) : undefined,
        status,
        notes,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Update milestone error:", error);
      res.status(500).json({ error: "Failed to update milestone" });
    }
  });

  // Create a custom calendar event for a project
  app.post("/api/projects/:projectId/calendar", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { projectId } = req.params;
      const userId = (req as any).user?.id;

      const eventId = await createProjectCalendarEvent(orgId, projectId, {
        ...req.body,
        createdById: userId,
      });

      res.status(201).json({ id: eventId });
    } catch (error) {
      console.error("Create calendar event error:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  // Update a calendar event
  app.patch("/api/calendar/events/:eventId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      await updateProjectCalendarEvent(eventId, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Update calendar event error:", error);
      res.status(500).json({ error: "Failed to update calendar event" });
    }
  });

  // Delete a calendar event
  app.delete("/api/calendar/events/:eventId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      await deleteProjectCalendarEvent(eventId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete calendar event error:", error);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });

  // ============================================================
  // DEADLINE ALERTS ROUTES
  // ============================================================

  // Manually trigger deadline alerts job (Admin only)
  app.post("/api/alerts/process", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = await runDeadlineAlertsJob();
      res.json(result);
    } catch (error) {
      console.error("Process alerts error:", error);
      res.status(500).json({ error: "Failed to process alerts" });
    }
  });

  // Get pending alerts for a project
  app.get("/api/projects/:projectId/alerts", requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const alerts = await db
        .select()
        .from(deadlineAlerts)
        .where(eq(deadlineAlerts.projectId, projectId))
        .orderBy(deadlineAlerts.scheduledFor);
      res.json(alerts);
    } catch (error) {
      console.error("Get project alerts error:", error);
      res.status(500).json({ error: "Failed to get project alerts" });
    }
  });

  app.get("/api/contacts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.query.accountId as string | undefined;
      const contacts = await storage.getContacts(orgId, accountId);
      res.json(contacts);
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  app.get("/api/contacts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contact = await storage.getContact(req.params.id, orgId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Get contact error:", error);
      res.status(500).json({ error: "Failed to get contact" });
    }
  });

  app.post("/api/contacts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertContactSchema.parse({ ...req.body, orgId });
      const contact = await storage.createContact(data);
      
      // Send welcome email with invitation if creating a vendor contact
      if (data.contactType === 'vendor' && contact.email) {
        try {
          // First create a vendor record for this contact
          const newVendor = await storage.createVendor({
            orgId,
            name: contact.name,
            email: contact.email,
            company: contact.company || null,
            dailyRate: '0',
            skills: [],
            availability: 'available',
            performance: 100,
          });

          // Link the contact to the vendor
          await storage.updateContact(contact.id, orgId, { vendorId: newVendor.id });

          // Create invitation for vendor portal access
          const token = generateToken();
          const tokenHash = hashToken(token);
          const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 6 months

          await storage.createInvitation({
            orgId,
            email: contact.email,
            role: 'vendor' as UserRole,
            space: 'vendor' as Space,
            tokenHash,
            expiresAt,
            status: 'pending',
            accountId: null,
            vendorId: newVendor.id,
          });

          const baseUrl = process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : 'http://localhost:5000';
          const portalLink = `${baseUrl}/setup-password?token=${token}`;

          await sendVendorWelcomeEmail({
            to: contact.email,
            vendorName: contact.name,
            portalLink,
            organizationName: 'IA Infinity'
          });
          console.log(`Vendor welcome email sent to ${contact.email}`);
        } catch (emailError) {
          console.error("Failed to send vendor welcome email:", emailError);
          // Continue even if email fails - contact was created successfully
        }
      }
      
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create contact error:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contact = await storage.updateContact(req.params.id, orgId, req.body);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Update contact error:", error);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteContact(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.get("/api/deals", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const stage = req.query.stage as DealStage | undefined;
      const deals = await storage.getDeals(orgId, stage);
      res.json(deals);
    } catch (error) {
      console.error("Get deals error:", error);
      res.status(500).json({ error: "Failed to get deals" });
    }
  });

  // Pipeline velocity metrics
  app.get("/api/deals/metrics", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const allDeals = await storage.getDeals(orgId);

      const now = new Date();
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setDate(now.getDate() - now.getDay());
      startOfThisWeek.setHours(0, 0, 0, 0);

      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setMilliseconds(-1);

      // Deals created this week vs last week
      const thisWeekDeals = allDeals.filter(d => new Date(d.createdAt) >= startOfThisWeek);
      const lastWeekDeals = allDeals.filter(d => {
        const created = new Date(d.createdAt);
        return created >= startOfLastWeek && created < startOfThisWeek;
      });

      const thisWeek = thisWeekDeals.length;
      const lastWeek = lastWeekDeals.length;
      const weekVariation = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100).toFixed(1) : "0";

      // Average days per stage
      const stageCount: Record<string, { total: number; count: number }> = {};
      allDeals.forEach(deal => {
        if (!stageCount[deal.stage]) {
          stageCount[deal.stage] = { total: 0, count: 0 };
        }
        stageCount[deal.stage].total += deal.daysInStage || 0;
        stageCount[deal.stage].count += 1;
      });

      const avgDaysPerStage: Record<string, number> = {};
      Object.entries(stageCount).forEach(([stage, data]) => {
        avgDaysPerStage[stage] = data.count > 0 ? Math.round(data.total / data.count) : 0;
      });

      // Stagnant deals (not updated in 15+ days)
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const stagnantDeals = allDeals.filter(d =>
        new Date(d.updatedAt) < fifteenDaysAgo &&
        d.stage !== 'won' &&
        d.stage !== 'lost'
      );

      // Conversion rates
      const prospectCount = allDeals.filter(d => d.stage === 'prospect').length;
      const meetingCount = allDeals.filter(d => d.stage === 'meeting').length;
      const wonCount = allDeals.filter(d => d.stage === 'won').length;
      const totalActive = allDeals.filter(d => d.stage !== 'lost').length;

      const conversionRate = {
        prospect_to_meeting: prospectCount > 0 ? ((meetingCount / prospectCount) * 100).toFixed(1) : "0",
        meeting_to_won: meetingCount > 0 ? ((wonCount / meetingCount) * 100).toFixed(1) : "0",
        overall: totalActive > 0 ? ((wonCount / totalActive) * 100).toFixed(1) : "0",
      };

      // Total pipeline value
      const pipelineValue = allDeals
        .filter(d => d.stage !== 'won' && d.stage !== 'lost')
        .reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);

      res.json({
        thisWeek,
        lastWeek,
        weekVariation,
        avgDaysPerStage,
        stagnantDeals: stagnantDeals.map(d => ({
          id: d.id,
          name: d.name,
          stage: d.stage,
          daysStagnant: Math.floor((now.getTime() - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
        })),
        stagnantCount: stagnantDeals.length,
        conversionRate,
        pipelineValue,
        totalDeals: allDeals.length,
        wonDeals: wonCount,
        lostDeals: allDeals.filter(d => d.stage === 'lost').length,
      });
    } catch (error) {
      console.error("Get deals metrics error:", error);
      res.status(500).json({ error: "Failed to get deals metrics" });
    }
  });

  // Email templates by pipeline stage
  app.get("/api/email-templates", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const stage = req.query.stage as string;

      if (!stage) {
        return res.status(400).json({ error: "Stage parameter is required" });
      }

      const template = await storage.getEmailTemplateByStage(stage, orgId);

      if (!template) {
        return res.status(404).json({ error: "No template found for this stage" });
      }

      res.json(template);
    } catch (error) {
      console.error("Get email template error:", error);
      res.status(500).json({ error: "Failed to get email template" });
    }
  });

  app.get("/api/deals/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const deal = await storage.getDeal(req.params.id, orgId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      res.json(deal);
    } catch (error) {
      console.error("Get deal error:", error);
      res.status(500).json({ error: "Failed to get deal" });
    }
  });

  app.post("/api/deals", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      // Calculate score based on amount and accountId
      const score = calculateDealScore({ amount: req.body.amount, accountId: req.body.accountId });
      const data = insertDealSchema.parse({ ...req.body, orgId, score });
      const deal = await storage.createDeal(data);
      res.status(201).json(deal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create deal error:", error);
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  app.patch("/api/deals/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const updateData = { ...req.body };
      if (updateData.prospectStatusUpdatedAt && typeof updateData.prospectStatusUpdatedAt === 'string') {
        updateData.prospectStatusUpdatedAt = new Date(updateData.prospectStatusUpdatedAt);
      }
      if (updateData.followUpDate && typeof updateData.followUpDate === 'string') {
        updateData.followUpDate = new Date(updateData.followUpDate);
      }
      if (updateData.nextActionDate && typeof updateData.nextActionDate === 'string') {
        updateData.nextActionDate = new Date(updateData.nextActionDate);
      }
      // Recalculate score if amount or accountId changed
      if (updateData.amount !== undefined || updateData.accountId !== undefined) {
        const existingDeal = await storage.getDeal(req.params.id, orgId);
        if (existingDeal) {
          const newAmount = updateData.amount ?? existingDeal.amount;
          const newAccountId = updateData.accountId ?? existingDeal.accountId;
          updateData.score = calculateDealScore({ amount: newAmount, accountId: newAccountId });
        }
      }
      const deal = await storage.updateDeal(req.params.id, orgId, updateData);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      res.json(deal);
    } catch (error) {
      console.error("Update deal error:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  // AI-powered notes enhancement for deals
  app.post("/api/deals/:id/enhance-notes", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { notes, action, context } = req.body;

      if (!notes || typeof notes !== 'string') {
        return res.status(400).json({ error: "Notes are required" });
      }

      const validActions = ['structure', 'summarize', 'actions', 'improve'];
      if (!action || !validActions.includes(action)) {
        return res.status(400).json({ error: "Invalid action. Must be one of: structure, summarize, actions, improve" });
      }

      const deal = await storage.getDeal(req.params.id, orgId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const { enhanceNotes } = await import("./ai-scope-generator");
      const result = await enhanceNotes(notes, action, context);

      res.json(result);
    } catch (error: any) {
      console.error("Enhance notes error:", error);
      res.status(500).json({ error: error.message || "Failed to enhance notes" });
    }
  });

  app.patch("/api/deals/:id/stage", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { stage, position, lostReason, lostReasonDetails } = req.body;

      // Get the current deal to check previous stage
      const existingDeal = await storage.getDeal(req.params.id, orgId);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const previousStage = existingDeal.stage;

      // Update the deal stage
      const deal = await storage.updateDealStage(req.params.id, orgId, stage, position || 0);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // If stage is 'lost' and lost reason is provided, update those fields
      if (stage === 'lost' && lostReason) {
        const updatedDeal = await storage.updateDeal(req.params.id, orgId, {
          lostReason,
          lostReasonDetails: lostReasonDetails || null,
        });
        return res.json(updatedDeal);
      }

      // If stage changed to 'won' and wasn't 'won' before, create account (if needed) and project
      if (stage === 'won' && previousStage !== 'won') {
        try {
          let accountId = existingDeal.accountId;

          // Si pas d'account, créer le compte client depuis les infos du prospect
          if (!accountId && existingDeal.notes) {
            try {
              const prospectInfo = JSON.parse(existingDeal.notes);
              if (prospectInfo.companyName) {
                const newAccount = await storage.createAccount({
                  orgId,
                  name: prospectInfo.companyName,
                  contactName: prospectInfo.contactName || 'Contact principal',
                  contactEmail: prospectInfo.contactEmail || '',
                  contactPhone: existingDeal.contactPhone || '',
                  plan: 'audit',
                  status: 'active',
                });
                accountId = newAccount.id;

                // Mettre à jour le deal avec le nouvel accountId
                await storage.updateDeal(req.params.id, orgId, { accountId });
              }
            } catch (parseError) {
              console.error("Failed to parse prospect notes:", parseError);
            }
          }

          const project = await storage.createProject({
            orgId,
            name: existingDeal.name || 'Nouveau projet',
            accountId: accountId,
            dealId: existingDeal.id,
            status: 'active',
            startDate: new Date(),
          });

          return res.json({
            ...deal,
            accountId,
            projectId: project.id,
            message: accountId && !existingDeal.accountId
              ? `Client et projet "${project.name}" créés automatiquement`
              : `Projet "${project.name}" créé automatiquement`,
          });
        } catch (projectError) {
          console.error("Failed to create project for won deal:", projectError);
          // Return the deal even if project creation fails
          return res.json(deal);
        }
      }

      res.json(deal);
    } catch (error) {
      console.error("Update deal stage error:", error);
      res.status(500).json({ error: "Failed to update deal stage" });
    }
  });

  app.delete("/api/deals/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteDeal(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete deal error:", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });

  app.get("/api/activities", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const dealId = req.query.dealId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      const activities = await storage.getActivities(orgId, dealId, projectId);
      res.json(activities);
    } catch (error) {
      console.error("Get activities error:", error);
      res.status(500).json({ error: "Failed to get activities" });
    }
  });

  app.post("/api/activities", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertActivitySchema.parse({ ...req.body, orgId });
      const activity = await storage.createActivity(data);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create activity error:", error);
      res.status(500).json({ error: "Failed to create activity" });
    }
  });

  app.get("/api/projects", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.query.accountId as string | undefined;
      const status = req.query.status as ProjectStatus | undefined;
      const projects = await storage.getProjects(orgId, accountId, status);
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  app.get("/api/projects/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const project = await storage.getProject(req.params.id, orgId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ error: "Failed to get project" });
    }
  });

  app.post("/api/projects", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertProjectSchema.parse({ ...req.body, orgId });
      const project = await storage.createProject(data);
      
      // Send email to vendor if assigned and create vendor channel
      if (data.vendorContactId) {
        try {
          const vendorContact = await storage.getContact(data.vendorContactId, orgId);
          const account = data.accountId ? await storage.getAccount(data.accountId, orgId) : null;

          if (vendorContact?.email) {
            const { sendVendorProjectAssignmentEmail } = await import("./gmail");
            await sendVendorProjectAssignmentEmail({
              to: vendorContact.email,
              vendorName: vendorContact.name,
              projectName: project.name,
              projectDescription: project.description,
              clientName: account?.name || 'Client non spécifié',
              startDate: project.startDate?.toISOString() || null,
              endDate: project.endDate?.toISOString() || null,
              pricingTier: project.pricingTier || null,
            });
          }
        } catch (emailError) {
          console.error("Failed to send vendor assignment email:", emailError);
        }

        // Create vendor project channel
        try {
          await ensureVendorProjectChannel(project.id, orgId);
        } catch (channelError) {
          console.error("Failed to create vendor channel:", channelError);
        }
      }

      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create project error:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const updateSchema = insertProjectSchema.partial().omit({ orgId: true });
      const validatedData = updateSchema.parse(req.body);
      
      // Get existing project to check if vendor changed
      const existingProject = await storage.getProject(req.params.id, orgId);
      const vendorChanged = validatedData.vendorContactId && 
        validatedData.vendorContactId !== existingProject?.vendorContactId;
      
      const project = await storage.updateProject(req.params.id, orgId, validatedData);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Notify if project status changed
      if (validatedData.status && existingProject && validatedData.status !== existingProject.status) {
        await notifyProjectStatusChange({
          orgId,
          projectId: project.id,
          projectName: project.name,
          oldStatus: existingProject.status,
          newStatus: validatedData.status,
          changedBy: req.session.userId!,
        });
      }

      // Send email to new vendor if vendor changed and create vendor channel
      if (vendorChanged && validatedData.vendorContactId) {
        try {
          const vendorContact = await storage.getContact(validatedData.vendorContactId, orgId);
          const account = project.accountId ? await storage.getAccount(project.accountId, orgId) : null;

          if (vendorContact?.email) {
            const { sendVendorProjectAssignmentEmail } = await import("./gmail");
            await sendVendorProjectAssignmentEmail({
              to: vendorContact.email,
              vendorName: vendorContact.name,
              projectName: project.name,
              projectDescription: project.description,
              clientName: account?.name || 'Client non spécifié',
              startDate: project.startDate?.toISOString() || null,
              endDate: project.endDate?.toISOString() || null,
              pricingTier: project.pricingTier || null,
            });
          }
        } catch (emailError) {
          console.error("Failed to send vendor assignment email:", emailError);
        }

        // Create vendor project channel
        try {
          await ensureVendorProjectChannel(project.id, orgId);
        } catch (channelError) {
          console.error("Failed to create vendor channel:", channelError);
        }
      }

      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update project error:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteProject(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Project Vendors endpoints (many-to-many relationship)
  app.get("/api/projects/:id/vendors", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectVendors = await storage.getProjectVendors(req.params.id, orgId);
      res.json(projectVendors);
    } catch (error) {
      console.error("Get project vendors error:", error);
      res.status(500).json({ error: "Failed to get project vendors" });
    }
  });

  app.post("/api/projects/:id/vendors", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;
      const { vendorId, role, notes } = req.body;

      if (!vendorId) {
        return res.status(400).json({ error: "vendorId is required" });
      }

      const projectVendor = await storage.addVendorToProject(
        req.params.id,
        vendorId,
        orgId,
        { role, notes, assignedById: userId }
      );

      // Send email to vendor when assigned to project
      try {
        const vendor = await storage.getVendor(vendorId, orgId);
        const project = await storage.getProject(req.params.id, orgId);
        const account = project?.accountId ? await storage.getAccount(project.accountId, orgId) : null;

        if (vendor?.email && project) {
          const { sendVendorProjectAssignmentEmail } = await import("./gmail");
          await sendVendorProjectAssignmentEmail({
            to: vendor.email,
            vendorName: vendor.name,
            projectName: project.name,
            projectDescription: project.description,
            clientName: account?.name,
            startDate: project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : undefined,
            endDate: project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : undefined,
          });
          console.log(`Vendor assignment email sent to ${vendor.email} for project ${project.name}`);
        }
      } catch (emailError) {
        console.error("Failed to send vendor assignment email:", emailError);
      }

      // Create vendor project channel if needed
      try {
        const existingChannels = await storage.getChannelsByProject(req.params.id, orgId);
        const vendorChannel = existingChannels.find(c => c.type === 'vendor' && c.scope === 'project');

        if (!vendorChannel) {
          const project = await storage.getProject(req.params.id, orgId);
          if (project) {
            await storage.createChannel({
              orgId,
              name: `Projet: ${project.name}`,
              description: `Canal de communication pour le projet ${project.name}`,
              type: 'vendor',
              scope: 'project',
              projectId: req.params.id,
              isActive: true,
            });
            console.log(`Created vendor channel for project ${req.params.id}`);
          }
        }
      } catch (channelError) {
        console.error("Failed to create vendor channel:", channelError);
      }

      res.status(201).json(projectVendor);
    } catch (error) {
      console.error("Add vendor to project error:", error);
      res.status(500).json({ error: "Failed to add vendor to project" });
    }
  });

  app.delete("/api/projects/:projectId/vendors/:vendorId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { projectId, vendorId } = req.params;

      await storage.removeVendorFromProject(projectId, vendorId, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Remove vendor from project error:", error);
      res.status(500).json({ error: "Failed to remove vendor from project" });
    }
  });

  app.patch("/api/project-vendors/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { role, notes } = req.body;

      const updated = await storage.updateProjectVendor(req.params.id, orgId, { role, notes });
      if (!updated) {
        return res.status(404).json({ error: "Project vendor assignment not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update project vendor error:", error);
      res.status(500).json({ error: "Failed to update project vendor" });
    }
  });

  app.get("/api/tasks", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.query.projectId as string | undefined;
      const status = req.query.status as TaskStatus | undefined;
      const tasks = await storage.getTasks(orgId, projectId, status);
      res.json(tasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  app.get("/api/tasks/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const task = await storage.getTask(req.params.id, orgId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Get task error:", error);
      res.status(500).json({ error: "Failed to get task" });
    }
  });

  app.post("/api/tasks", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertTaskSchema.parse({ ...req.body, orgId });
      const task = await storage.createTask(data);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;

      // Get the old task to compare changes
      const oldTask = await storage.getTask(req.params.id, orgId);
      if (!oldTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      const task = await storage.updateTask(req.params.id, orgId, req.body);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Notify if task was assigned to someone
      if (req.body.assigneeId && req.body.assigneeId !== oldTask.assigneeId) {
        await notifyTaskAssigned({
          orgId,
          taskId: task.id,
          taskTitle: task.title,
          assignedTo: req.body.assigneeId,
          assignedBy: userId,
          projectId: task.projectId || undefined,
        });
      }

      // Notify if task status changed
      if (req.body.status && req.body.status !== oldTask.status) {
        await notifyTaskStatusChange({
          orgId,
          taskId: task.id,
          taskTitle: task.title,
          oldStatus: oldTask.status,
          newStatus: req.body.status,
          changedBy: userId,
          projectId: task.projectId || undefined,
        });
      }

      res.json(task);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteTask(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.get("/api/invoices", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.query.accountId as string | undefined;
      const invoices = await storage.getInvoices(orgId, accountId);
      res.json(invoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ error: "Failed to get invoices" });
    }
  });

  app.get("/api/invoices/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const invoice = await storage.getInvoice(req.params.id, orgId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      const lineItems = await storage.getInvoiceLineItems(req.params.id);
      res.json({ ...invoice, lineItems });
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({ error: "Failed to get invoice" });
    }
  });

  app.post("/api/invoices", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { lineItems, ...invoiceData } = req.body;
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const data = insertInvoiceSchema.parse({ ...invoiceData, orgId, invoiceNumber });
      const invoice = await storage.createInvoice(data);
      
      if (lineItems && Array.isArray(lineItems)) {
        for (const item of lineItems) {
          await storage.createInvoiceLineItem({ ...item, invoiceId: invoice.id });
        }
      }
      
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create invoice error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { lineItems, ...invoiceData } = req.body;
      const invoice = await storage.updateInvoice(req.params.id, orgId, invoiceData);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      if (lineItems && Array.isArray(lineItems)) {
        await storage.deleteInvoiceLineItems(req.params.id);
        for (const item of lineItems) {
          await storage.createInvoiceLineItem({ ...item, invoiceId: invoice.id });
        }
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Update invoice error:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteInvoiceLineItems(req.params.id);
      await storage.deleteInvoice(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete invoice error:", error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  app.get("/api/vendors", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendors = await storage.getVendors(orgId);
      res.json(vendors);
    } catch (error) {
      console.error("Get vendors error:", error);
      res.status(500).json({ error: "Failed to get vendors" });
    }
  });

  app.get("/api/vendors/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendor = await storage.getVendor(req.params.id, orgId);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Get vendor error:", error);
      res.status(500).json({ error: "Failed to get vendor" });
    }
  });

  app.post("/api/vendors", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertVendorSchema.parse({ ...req.body, orgId });
      const vendor = await storage.createVendor(data);

      let emailSent = false;
      let inviteLink: string | null = null;

      // Send welcome email with portal access if email is provided
      if (data.email) {
        try {
          // Create an invitation for vendor portal access
          const token = generateToken();
          const tokenHash = hashToken(token);
          const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 6 months

          await storage.createInvitation({
            orgId,
            email: data.email,
            role: 'vendor' as UserRole,
            space: 'vendor' as Space,
            tokenHash,
            expiresAt,
            status: 'pending',
            accountId: null,
            vendorId: vendor.id,
          });

          const baseUrl = process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : 'http://localhost:5000';
          const portalLink = `${baseUrl}/setup-password?token=${token}`;
          inviteLink = portalLink;

          // Send welcome email
          emailSent = await sendVendorWelcomeEmail({
            to: data.email,
            vendorName: data.name,
            portalLink,
            organizationName: 'IA Infinity',
          });

          if (emailSent) {
            console.log(`Vendor welcome email sent to ${data.email}`);
          }
        } catch (emailError) {
          console.error("Failed to send vendor welcome email:", emailError);
          // Don't fail the vendor creation if email fails
        }
      }

      res.status(201).json({
        ...vendor,
        emailSent,
        inviteLink: emailSent ? null : inviteLink,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create vendor error:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendor = await storage.updateVendor(req.params.id, orgId, req.body);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Update vendor error:", error);
      res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteVendor(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete vendor error:", error);
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  app.get("/api/missions", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.query.projectId as string | undefined;
      const vendorId = req.query.vendorId as string | undefined;
      const missions = await storage.getMissions(orgId, projectId, vendorId);
      res.json(missions);
    } catch (error) {
      console.error("Get missions error:", error);
      res.status(500).json({ error: "Failed to get missions" });
    }
  });

  app.get("/api/missions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const mission = await storage.getMission(req.params.id, orgId);
      if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
      }
      res.json(mission);
    } catch (error) {
      console.error("Get mission error:", error);
      res.status(500).json({ error: "Failed to get mission" });
    }
  });

  app.post("/api/missions", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertMissionSchema.parse({ ...req.body, orgId });
      const mission = await storage.createMission(data);
      res.status(201).json(mission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create mission error:", error);
      res.status(500).json({ error: "Failed to create mission" });
    }
  });

  app.patch("/api/missions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const mission = await storage.updateMission(req.params.id, orgId, req.body);
      if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
      }
      res.json(mission);
    } catch (error) {
      console.error("Update mission error:", error);
      res.status(500).json({ error: "Failed to update mission" });
    }
  });

  app.delete("/api/missions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteMission(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete mission error:", error);
      res.status(500).json({ error: "Failed to delete mission" });
    }
  });

  app.get("/api/documents", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.query.projectId as string | undefined;
      const accountId = req.query.accountId as string | undefined;
      const documents = await storage.getDocuments(orgId, projectId, accountId);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  app.get("/api/documents/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const document = await storage.getDocument(req.params.id, orgId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({ error: "Failed to get document" });
    }
  });

  app.post("/api/documents", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertDocumentSchema.parse({ ...req.body, orgId });
      const document = await storage.createDocument(data);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create document error:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.delete("/api/documents/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteDocument(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.get("/api/workflows", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const workflows = await storage.getWorkflowRuns(orgId);
      res.json(workflows);
    } catch (error) {
      console.error("Get workflows error:", error);
      res.status(500).json({ error: "Failed to get workflows" });
    }
  });

  app.get("/api/workflows/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const workflow = await storage.getWorkflowRun(req.params.id, orgId);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Get workflow error:", error);
      res.status(500).json({ error: "Failed to get workflow" });
    }
  });

  app.post("/api/workflows", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertWorkflowRunSchema.parse({ ...req.body, orgId });
      const workflow = await storage.createWorkflowRun(data);
      res.status(201).json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create workflow error:", error);
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  app.patch("/api/workflows/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const workflow = await storage.updateWorkflowRun(req.params.id, orgId, req.body);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Update workflow error:", error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  app.get("/api/import-jobs", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const jobs = await storage.getImportJobs(orgId);
      res.json(jobs);
    } catch (error) {
      console.error("Get import jobs error:", error);
      res.status(500).json({ error: "Failed to get import jobs" });
    }
  });

  app.get("/api/import-jobs/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const job = await storage.getImportJob(req.params.id, orgId);
      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Get import job error:", error);
      res.status(500).json({ error: "Failed to get import job" });
    }
  });

  app.get("/api/contracts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const type = req.query.type as ContractType | undefined;
      const status = req.query.status as ContractStatus | undefined;
      const contracts = await storage.getContracts(orgId, type, status);
      res.json(contracts);
    } catch (error) {
      console.error("Get contracts error:", error);
      res.status(500).json({ error: "Failed to get contracts" });
    }
  });

  app.get("/api/contracts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contract = await storage.getContract(req.params.id, orgId);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Get contract error:", error);
      res.status(500).json({ error: "Failed to get contract" });
    }
  });

  app.post("/api/contracts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contractNumber = await storage.generateContractNumber(orgId, req.body.type || 'audit');
      const data = insertContractSchema.parse({ ...req.body, orgId, contractNumber });
      const contract = await storage.createContract(data);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create contract error:", error);
      res.status(500).json({ error: "Failed to create contract" });
    }
  });

  app.patch("/api/contracts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const updateSchema = insertContractSchema.partial().omit({ orgId: true, contractNumber: true });
      const validatedData = updateSchema.parse(req.body);
      const contract = await storage.updateContract(req.params.id, orgId, validatedData);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update contract error:", error);
      res.status(500).json({ error: "Failed to update contract" });
    }
  });

  app.delete("/api/contracts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteContract(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete contract error:", error);
      res.status(500).json({ error: "Failed to delete contract" });
    }
  });

  app.get("/api/contracts/by-deal/:dealId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contracts = await storage.getContractsByDeal(req.params.dealId, orgId);
      res.json(contracts);
    } catch (error) {
      console.error("Get contracts by deal error:", error);
      res.status(500).json({ error: "Failed to get contracts" });
    }
  });

  app.get("/api/contracts/by-account/:accountId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contracts = await storage.getContractsByAccount(req.params.accountId, orgId);
      res.json(contracts);
    } catch (error) {
      console.error("Get contracts by account error:", error);
      res.status(500).json({ error: "Failed to get contracts" });
    }
  });

  // Quotes API - get all quotes
  app.get("/api/quotes/all", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const quotes = await storage.getQuotes(orgId);
      res.json(quotes);
    } catch (error) {
      console.error("Get all quotes error:", error);
      res.status(500).json({ error: "Failed to get quotes" });
    }
  });

  // Quotes API - get quotes for a deal
  app.get("/api/deals/:dealId/quotes", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const quotes = await storage.getQuotesByDeal(req.params.dealId, orgId);
      res.json(quotes);
    } catch (error) {
      console.error("Get quotes by deal error:", error);
      res.status(500).json({ error: "Failed to get quotes" });
    }
  });

  // Create a quote record (after Qonto creation)
  app.post("/api/deals/:dealId/quotes", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { qontoQuoteId, number, title, amount, quoteUrl, status } = req.body;
      
      const quote = await storage.createQuote({
        orgId,
        dealId: req.params.dealId,
        qontoQuoteId,
        number,
        title,
        amount,
        quoteUrl,
        status: status || 'draft',
      });
      
      res.status(201).json(quote);
    } catch (error) {
      console.error("Create quote error:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  // Send a quote to the client
  app.post("/api/quotes/:id/send", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const quote = await storage.getQuote(req.params.id, orgId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Get the deal and account info
      const deal = await storage.getDeal(quote.dealId, orgId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const accounts = await storage.getAccounts(orgId);
      const account = accounts.find(a => a.id === deal.accountId);
      
      // Priority: 1) deal.contactEmail, 2) account.contactEmail
      const clientEmail = deal.contactEmail || account?.contactEmail;
      if (!clientEmail) {
        return res.status(400).json({ error: "Le client n'a pas d'email de contact. Veuillez ajouter un email dans les informations du prospect." });
      }

      // Get client name from deal notes or account
      let clientName = account?.contactName || account?.name || 'Client';
      try {
        const prospectInfo = deal.notes ? JSON.parse(deal.notes) : {};
        if (prospectInfo.contactName) {
          clientName = prospectInfo.contactName;
        }
      } catch (e) { /* ignore parse errors */ }

      if (!quote.quoteUrl) {
        return res.status(400).json({ error: "Le devis n'a pas de lien Qonto valide" });
      }

      // Send the email
      const { sendGenericEmail } = await import("./gmail");
      const subject = `Devis ${quote.number} - Capsule IA`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Bonjour ${clientName},</h2>
          <p>Nous avons le plaisir de vous transmettre notre devis <strong>${quote.number}</strong>.</p>
          <p><strong>${quote.title}</strong></p>
          <p>Montant: <strong>${parseFloat(quote.amount).toLocaleString('fr-FR')} € HT</strong></p>
          <p>Vous pouvez consulter et signer votre devis en cliquant sur le bouton ci-dessous :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${quote.quoteUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Voir et signer le devis
            </a>
          </div>
          <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
          <p>Cordialement,<br>L'équipe Capsule IA</p>
        </div>
      `;

      await sendGenericEmail({
        to: clientEmail,
        subject,
        htmlBody: htmlContent,
      });

      // Update quote status to sent
      await storage.updateQuote(quote.id, orgId, {
        status: 'sent',
        sentAt: new Date()
      });

      // Create notification for client users linked to this account (if account exists)
      if (account) {
        try {
          const memberships = await storage.getMembershipsByOrg(orgId);
          const clientMemberships = memberships.filter(m =>
            m.accountId === account.id &&
            (m.role === 'client_admin' || m.role === 'client_member')
          );

          for (const membership of clientMemberships) {
            await storage.createNotification({
              orgId,
              userId: membership.userId,
              title: 'Nouveau devis à signer',
              description: `Le devis ${quote.number || quote.title} (${parseFloat(quote.amount || '0').toLocaleString('fr-FR')} € HT) est en attente de votre signature`,
              type: 'warning',
              link: `/client/quotes`,
              relatedEntityType: 'quote',
              relatedEntityId: quote.id,
            });
          }
          console.log(`Created ${clientMemberships.length} notifications for quote ${quote.id}`);
        } catch (notifError) {
          console.error("Error creating client notifications:", notifError);
          // Don't fail the request if notification fails
        }
      }

      res.json({ success: true, message: `Email envoyé à ${clientEmail}` });
    } catch (error: any) {
      console.error("Send quote error:", error);
      res.status(500).json({ error: error.message || "Failed to send quote" });
    }
  });

  // Admin sign a quote
  app.post("/api/quotes/:id/sign-admin", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const user = req.user as any;
      const { signature } = req.body;
      
      if (!signature) {
        return res.status(400).json({ error: "Signature requise" });
      }
      
      const quote = await storage.getQuote(req.params.id, orgId);
      if (!quote) {
        return res.status(404).json({ error: "Devis non trouvé" });
      }
      
      const adminSignedAt = new Date();
      const adminSignedBy = user?.claims?.email || user?.claims?.name || 'Admin';
      const updatedQuote = await storage.updateQuote(quote.id, orgId, {
        adminSignature: signature,
        adminSignedAt: adminSignedAt,
        adminSignedBy: adminSignedBy
      });
      
      // Check if both signatures are present to update status and generate PDF
      if (updatedQuote?.clientSignature && updatedQuote?.adminSignature) {
        await storage.updateQuote(quote.id, orgId, { status: 'signed' });
        
        // Generate signed PDF and upload to Google Drive
        try {
          const { generateSignedQuotePDF } = await import("./pdf");
          const { uploadFileToDrive } = await import("./drive");
          
          // Get account info for the PDF
          const account = quote.accountId ? await storage.getAccount(quote.accountId, orgId) : null;
          
          const pdfBuffer = await generateSignedQuotePDF({
            quoteNumber: quote.number || `DEVIS-${quote.id.slice(0, 8)}`,
            title: quote.title,
            amount: quote.amount,
            accountName: account?.name || 'Client',
            contactEmail: account?.contactEmail || '',
            adminSignature: signature,
            adminSignedBy: adminSignedBy,
            adminSignedAt: adminSignedAt.toISOString(),
            clientSignature: updatedQuote.clientSignature,
            clientSignedBy: updatedQuote.clientSignedBy || 'Client',
            clientSignedAt: updatedQuote.clientSignedAt?.toISOString() || new Date().toISOString()
          });
          
          const filename = `Devis_Signe_${quote.number || quote.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
          const driveFile = await uploadFileToDrive(pdfBuffer, filename, 'application/pdf', 'IA Infinity - Devis Signés');
          
          // Update quote with signed PDF URL
          const finalQuote = await storage.updateQuote(quote.id, orgId, {
            signedPdfUrl: driveFile.webViewLink || driveFile.webContentLink
          });
          
          console.log(`Signed quote PDF uploaded to Google Drive: ${driveFile.webViewLink}`);
          res.json({ success: true, quote: finalQuote });
          return;
        } catch (pdfError) {
          console.error("Error generating signed PDF:", pdfError);
          // Continue with response even if PDF generation fails
        }
      }
      
      res.json({ success: true, quote: updatedQuote });
    } catch (error: any) {
      console.error("Admin sign quote error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de la signature" });
    }
  });

  // Client sign a quote (via token)
  app.post("/api/quotes/:id/sign-client", async (req: Request, res: Response) => {
    try {
      const { signature, clientName, token } = req.body;

      if (!signature || !clientName) {
        return res.status(400).json({ error: "Signature et nom requis" });
      }

      // Find quote by ID only (public route)
      const quote = await storage.getQuoteByIdOnly(req.params.id);

      if (!quote) {
        return res.status(404).json({ error: "Devis non trouvé" });
      }

      const orgId = quote.orgId;

      // Verify token - required if quote has a token set
      if (quote.signatureToken) {
        if (!token) {
          return res.status(403).json({ error: "Token de signature requis" });
        }
        const hashedToken = hashToken(token);
        if (hashedToken !== quote.signatureToken) {
          return res.status(403).json({ error: "Token de signature invalide" });
        }
        if (quote.signatureTokenExpiresAt && new Date() > quote.signatureTokenExpiresAt) {
          return res.status(403).json({ error: "Token de signature expiré" });
        }
      }

      const clientSignedAt = new Date();
      const updatedQuote = await storage.updateQuoteByIdOnly(quote.id, {
        clientSignature: signature,
        clientSignedAt: clientSignedAt,
        clientSignedBy: clientName
      });
      
      // Create notification for admin that client signed
      try {
        // Get all admin users to notify
        const memberships = await storage.getMembershipsByOrg(orgId);
        const adminMemberships = memberships.filter(m => m.role === 'admin');

        for (const membership of adminMemberships) {
          await storage.createNotification({
            orgId,
            userId: membership.userId,
            title: 'Devis signé par le client',
            description: `${clientName} a signé le devis ${quote.number || quote.title}`,
            type: 'success',
            link: `/quotes`,
            relatedEntityType: 'quote',
            relatedEntityId: quote.id,
          });
        }
      } catch (notifError) {
        console.error("Error creating signature notification:", notifError);
      }

      // Check if both signatures are present to update status and generate PDF
      if (updatedQuote?.clientSignature && updatedQuote?.adminSignature) {
        await storage.updateQuoteByIdOnly(quote.id, { status: 'signed' });

        // Generate signed PDF and upload to Google Drive
        try {
          const { generateSignedQuotePDF } = await import("./pdf");
          const { uploadFileToDrive, getOrCreateFolder } = await import("./drive");

          // Get account info for the PDF
          const account = quote.accountId ? await storage.getAccount(quote.accountId, orgId) : null;

          const pdfBuffer = await generateSignedQuotePDF({
            quoteNumber: quote.number || `DEVIS-${quote.id.slice(0, 8)}`,
            title: quote.title,
            amount: quote.amount,
            accountName: account?.name || 'Client',
            contactEmail: account?.contactEmail || '',
            adminSignature: updatedQuote.adminSignature,
            adminSignedBy: updatedQuote.adminSignedBy || 'Admin',
            adminSignedAt: updatedQuote.adminSignedAt?.toISOString() || new Date().toISOString(),
            clientSignature: signature,
            clientSignedBy: clientName,
            clientSignedAt: clientSignedAt.toISOString()
          });

          // Get or create client folder for signed quotes
          const clientFolderName = account?.name || 'Client';
          let driveFile;
          try {
            const clientFolderId = await getOrCreateFolder(clientFolderName, 'Clients - Devis Signés');
            const filename = `Devis_Signe_${quote.number || quote.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
            driveFile = await uploadFileToDrive(pdfBuffer, filename, 'application/pdf', clientFolderName);
          } catch (folderError) {
            console.error("Error with client folder:", folderError);
            const filename = `Devis_Signe_${quote.number || quote.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
            driveFile = await uploadFileToDrive(pdfBuffer, filename, 'application/pdf', 'IA Infinity - Devis Signés');
          }

          // Update quote with signed PDF URL
          const signedPdfUrl = driveFile.webViewLink || driveFile.webContentLink;
          const finalQuote = await storage.updateQuoteByIdOnly(quote.id, {
            signedPdfUrl
          });

          // Create document record in client's document space
          if (quote.accountId && signedPdfUrl) {
            try {
              await storage.createDocument({
                orgId,
                accountId: quote.accountId,
                projectId: null,
                dealId: quote.dealId || null,
                name: `Devis ${quote.number || ''} - ${quote.title} (Signé)`,
                url: signedPdfUrl,
                mimeType: 'application/pdf',
                storageProvider: 'drive',
              });
              console.log(`Document record created for signed quote ${quote.id}`);
            } catch (docError) {
              console.error("Error creating document record for quote:", docError);
            }
          }

          console.log(`Signed quote PDF uploaded to Google Drive: ${driveFile.webViewLink}`);
          res.json({ success: true, quote: finalQuote });
          return;
        } catch (pdfError) {
          console.error("Error generating signed PDF:", pdfError);
          // Continue with response even if PDF generation fails
        }
      }

      res.json({ success: true, quote: updatedQuote });
    } catch (error: any) {
      console.error("Client sign quote error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de la signature" });
    }
  });

  // Generate signature token for client
  app.post("/api/quotes/:id/generate-signature-token", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const quote = await storage.getQuote(req.params.id, orgId);
      
      if (!quote) {
        return res.status(404).json({ error: "Devis non trouvé" });
      }
      
      const token = generateToken();
      const hashedToken = hashToken(token);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity
      
      await storage.updateQuote(quote.id, orgId, {
        signatureToken: hashedToken,
        signatureTokenExpiresAt: expiresAt
      });
      
      // Return the raw token (only time it's visible)
      const signatureUrl = `/sign-quote/${quote.id}?token=${token}`;
      
      res.json({ success: true, token, signatureUrl, expiresAt });
    } catch (error: any) {
      console.error("Generate signature token error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de la génération du token" });
    }
  });

  // Get quote for signing (public route with token)
  app.get("/api/quotes/:id/public", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      // Get quote by ID only (public route)
      const quote = await storage.getQuoteByIdOnly(req.params.id);

      if (!quote) {
        return res.status(404).json({ error: "Devis non trouvé" });
      }

      // Verify token
      if (quote.signatureToken && token) {
        const hashedToken = hashToken(token as string);
        if (hashedToken !== quote.signatureToken) {
          return res.status(403).json({ error: "Accès non autorisé" });
        }
        if (quote.signatureTokenExpiresAt && new Date() > quote.signatureTokenExpiresAt) {
          return res.status(403).json({ error: "Lien de signature expiré" });
        }
      } else if (!req.user) {
        // No token and not authenticated
        return res.status(403).json({ error: "Accès non autorisé" });
      }

      // Get deal and account info
      const deal = await storage.getDeal(quote.dealId, quote.orgId);
      const account = deal?.accountId ? await storage.getAccount(deal.accountId, quote.orgId) : null;

      // Get line items
      const lineItems = await storage.getQuoteLineItems(quote.id);

      // Return public quote info with details for inline display
      res.json({
        id: quote.id,
        number: quote.number,
        title: quote.title,
        description: quote.description,
        amount: quote.amount,
        vatRate: quote.vatRate,
        vatAmount: quote.vatAmount,
        totalWithVat: quote.totalWithVat,
        validityDays: quote.validityDays,
        expiresAt: quote.expiresAt,
        termsAndConditions: quote.termsAndConditions,
        paymentTerms: quote.paymentTerms,
        notes: quote.notes,
        status: quote.status,
        quoteUrl: quote.quoteUrl,
        pdfUrl: quote.pdfUrl,
        driveFileUrl: quote.driveFileUrl,
        adminSignature: quote.adminSignature ? true : false,
        adminSignedAt: quote.adminSignedAt,
        adminSignedBy: quote.adminSignedBy,
        clientSignature: quote.clientSignature ? true : false,
        clientSignedAt: quote.clientSignedAt,
        clientSignedBy: quote.clientSignedBy,
        accountName: account?.name,
        clientName: account?.contactName || account?.name,
        createdAt: quote.createdAt,
        lineItems: lineItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          totalHt: item.totalHt,
          sortOrder: item.sortOrder
        }))
      });
    } catch (error: any) {
      console.error("Get public quote error:", error);
      res.status(500).json({ error: error.message || "Erreur" });
    }
  });

  app.post("/api/contracts/generate", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { type, dealId, accountId, vendorId, clientName, clientEmail, clientCompany, clientAddress, clientSiret, amount, description, scope, deliverables, startDate, endDate, paymentTerms } = req.body;
      
      const contractNumber = await storage.generateContractNumber(orgId, type);
      
      const title = type === 'audit' 
        ? `Contrat d'Audit - ${clientCompany || clientName}`
        : type === 'prestation'
        ? `Contrat de Prestation - ${clientCompany || clientName}`
        : type === 'formation'
        ? `Contrat de Formation - ${clientCompany || clientName}`
        : type === 'sous_traitance'
        ? `Contrat de Sous-Traitance - ${clientCompany || clientName}`
        : `Contrat de Suivi - ${clientCompany || clientName}`;

      const defaultScope = type === 'audit'
        ? "Audit complet de votre structure pour identifier les opportunités d'intégration de l'IA dans vos processus métier."
        : type === 'prestation'
        ? "Développement et déploiement de solutions IA sur-mesure selon les besoins identifiés lors de l'audit."
        : type === 'formation'
        ? "Formation de vos équipes à l'utilisation des outils IA déployés."
        : type === 'sous_traitance'
        ? "Mission de sous-traitance pour la réalisation de prestations techniques et/ou de conseil."
        : "Suivi régulier et optimisation des solutions IA mises en place.";

      const defaultDeliverables = type === 'audit'
        ? ["Rapport d'audit complet", "Feuille de route IA", "Recommandations priorisées", "Estimation budgétaire"]
        : type === 'prestation'
        ? ["Solutions IA développées", "Documentation technique", "Formation utilisateur", "Support de démarrage"]
        : type === 'formation'
        ? ["Sessions de formation", "Supports pédagogiques", "Certification des participants", "Évaluation des compétences"]
        : type === 'sous_traitance'
        ? ["Livrables convenus", "Rapport de mission", "Documentation technique", "Transfert de compétences"]
        : ["Points mensuels", "Rapports de performance", "Optimisations continues", "Support technique"];

      const contract = await storage.createContract({
        orgId,
        dealId: dealId || null,
        accountId: accountId || null,
        vendorId: vendorId || null,
        contractNumber,
        title,
        type,
        status: 'draft',
        clientName,
        clientEmail,
        clientCompany: clientCompany || null,
        clientAddress: clientAddress || null,
        clientSiret: clientSiret || null,
        amount: amount || "0",
        currency: 'EUR',
        description: description || null,
        scope: scope || defaultScope,
        deliverables: deliverables || defaultDeliverables,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        paymentTerms: paymentTerms || "30 jours à réception de facture",
      });

      res.status(201).json(contract);
    } catch (error) {
      console.error("Generate contract error:", error);
      res.status(500).json({ error: "Failed to generate contract" });
    }
  });

  // AI-powered contract personalization endpoint using Word templates
  app.post("/api/contracts/:id/personalize", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contract = await storage.getContract(req.params.id, orgId);
      
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const { instructions } = req.body;
      
      // Import OpenAI
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const isAudit = contract.type === 'audit';
      
      const systemPrompt = `Tu es un assistant juridique et commercial expert en rédaction de contrats en français.
Tu dois personnaliser un contrat selon un modèle professionnel.

${isAudit ? `
MODÈLE: Contrat d'Audit Général
Ce contrat concerne une mission d'audit pour identifier les opportunités d'optimisation et d'intégration de l'IA.
L'audit porte sur: analyse des workflows, évaluation des outils, gestion CRM, processus de vente/marketing, communication.
Livrables typiques: Rapport d'audit complet, Feuille de route IA, Recommandations priorisées, Estimation budgétaire.
Paiement: 50% à la signature, 50% à la livraison du rapport.
` : `
MODÈLE: Contrat de Prestation d'Automatisation
Ce contrat fait suite à un audit et concerne la mise en œuvre de solutions d'automatisation.
Prestations: automatisation des processus de vente, séquences d'emails automatisées, intégration CRM, formation des équipes.
Livrables: Solutions d'automatisation opérationnelles, documentation technique, formation utilisateurs.
Paiement: 40% à la signature, 30% à mi-projet, 30% à la livraison finale.
Garantie: 30 jours après mise en production.
`}

Réponds en JSON avec ces champs:
- title: titre professionnel du contrat (ex: "Contrat d'Audit IA - [Nom Entreprise]")
- scope: objet et périmètre détaillé de la mission (paragraphe professionnel)
- deliverables: liste des livrables concrets (array de strings)
- paymentTerms: modalités de paiement détaillées (string)

Personnalise selon les informations client et les instructions fournies.`;

      const userPrompt = `Personnalise ce contrat pour:
- Client: ${contract.clientName}
- Société: ${contract.clientCompany || 'Non précisée'}
- Email: ${contract.clientEmail}
- Montant: ${contract.amount} € HT
- Date début prévue: ${contract.startDate ? new Date(contract.startDate).toLocaleDateString('fr-FR') : 'À définir'}
- Date fin prévue: ${contract.endDate ? new Date(contract.endDate).toLocaleDateString('fr-FR') : 'À définir'}

Contenu actuel:
- Périmètre: ${contract.scope || 'Non défini'}
- Livrables: ${(contract.deliverables || []).join(', ') || 'Non définis'}
- Conditions paiement: ${contract.paymentTerms || 'Non définies'}

Instructions supplémentaires: ${instructions || 'Personnaliser de manière professionnelle selon le profil client'}

Génère un contrat complet et professionnel adapté à ce client.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from AI" });
      }

      const suggestions = JSON.parse(content);
      res.json({ 
        success: true, 
        suggestions,
        contract 
      });
    } catch (error) {
      console.error("Contract personalization error:", error);
      res.status(500).json({ error: "Failed to personalize contract" });
    }
  });

  // Apply AI suggestions to a contract
  app.post("/api/contracts/:id/apply-suggestions", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { title, scope, deliverables, paymentTerms, description } = req.body;
      
      const updateData: any = {};
      if (title) updateData.title = title;
      if (scope) updateData.scope = scope;
      if (deliverables) updateData.deliverables = deliverables;
      if (paymentTerms) updateData.paymentTerms = paymentTerms;
      if (description !== undefined) updateData.description = description;
      
      const contract = await storage.updateContract(req.params.id, orgId, updateData);
      
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      res.json({ success: true, contract });
    } catch (error) {
      console.error("Apply suggestions error:", error);
      res.status(500).json({ error: "Failed to apply suggestions" });
    }
  });

  // Download contract as PDF
  app.get("/api/contracts/:id/download-pdf", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contract = await storage.getContract(req.params.id, orgId);
      
      if (!contract) {
        return res.status(404).json({ error: "Contrat non trouvé" });
      }
      
      const { generateContractPDF } = await import("./pdf");
      
      const pdfBuffer = await generateContractPDF({ 
        contract,
        organizationName: 'IA Infinity' 
      });
      
      const filename = `${contract.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Download PDF error:", error);
      res.status(500).json({ error: "Échec de la génération du PDF" });
    }
  });

  app.post("/api/contracts/:id/send", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contract = await storage.getContract(req.params.id, orgId);
      
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      if (!contract.clientEmail) {
        return res.status(400).json({ error: "Client email is required to send contract" });
      }
      
      // Generate secure token for signing
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Update contract with token hash
      await storage.updateContract(req.params.id, orgId, {
        signatureTokenHash: tokenHash,
        signatureTokenExpiresAt: expiresAt,
      });
      
      const { sendContractEmail } = await import("./gmail");
      
      // Use REPLIT_DEV_DOMAIN for consistent URLs across environments
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : req.headers.host?.includes('localhost') 
          ? `http://${req.headers.host}`
          : `https://${req.headers.host}`;
      const signatureLink = `${baseUrl}/contracts/${contract.id}/sign?token=${token}`;
      
      const org = await storage.getOrganization(orgId);
      
      const emailSent = await sendContractEmail({
        to: contract.clientEmail,
        contractNumber: contract.contractNumber,
        contractTitle: contract.title,
        contractType: contract.type,
        clientName: contract.clientName,
        amount: contract.amount,
        currency: contract.currency,
        startDate: contract.startDate?.toISOString() || null,
        endDate: contract.endDate?.toISOString() || null,
        scope: contract.scope,
        deliverables: contract.deliverables || [],
        paymentTerms: contract.paymentTerms,
        signatureLink,
        organizationName: org?.name || 'IA Infinity',
      });
      
      if (emailSent) {
        const updatedContract = await storage.updateContract(req.params.id, orgId, { status: 'sent' });
        res.json({ success: true, contract: updatedContract });
      } else {
        res.status(500).json({ error: "Failed to send email" });
      }
    } catch (error) {
      console.error("Send contract error:", error);
      res.status(500).json({ error: "Failed to send contract" });
    }
  });

  // Helper function to validate signature token
  async function validateSignatureToken(contractId: string, token: string): Promise<{ valid: boolean; contract?: any; error?: string }> {
    const crypto = await import("crypto");
    
    // Fetch single contract by ID (no org scoping for public access)
    const contract = await storage.getContractByIdOnly(contractId);
    
    if (!contract) {
      return { valid: false, error: "Contrat non trouvé" };
    }
    
    // Check if token hash exists
    const storedHash = (contract as any).signatureTokenHash;
    if (!storedHash) {
      return { valid: false, error: "Lien de signature invalide ou expiré" };
    }
    
    // Validate token
    const providedHash = crypto.createHash('sha256').update(token).digest('hex');
    if (providedHash !== storedHash) {
      return { valid: false, error: "Lien de signature invalide" };
    }
    
    // Check expiration
    const expiresAt = (contract as any).signatureTokenExpiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return { valid: false, error: "Ce lien de signature a expiré" };
    }
    
    return { valid: true, contract };
  }

  // Public endpoint to get contract details for signing (token required)
  app.get("/api/contracts/public/:id", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(401).json({ error: "Token de signature manquant" });
      }
      
      const validation = await validateSignatureToken(req.params.id, token);
      
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }
      
      const contract = validation.contract;
      
      // Only allow access to contracts that have been sent or are awaiting signature
      if (contract.status === 'draft' || contract.status === 'cancelled') {
        return res.status(403).json({ error: "Ce contrat n'est pas disponible pour signature" });
      }
      
      // Return only necessary fields for signing (not sensitive data)
      res.json({
        id: contract.id,
        title: contract.title,
        contractNumber: contract.contractNumber,
        type: contract.type,
        status: contract.status,
        clientName: contract.clientName,
        clientCompany: contract.clientCompany,
        amount: contract.amount,
        currency: contract.currency,
        scope: contract.scope,
        deliverables: contract.deliverables,
        paymentTerms: contract.paymentTerms,
        startDate: contract.startDate,
        endDate: contract.endDate,
        clientSignatureData: contract.clientSignatureData,
        signedAt: contract.signedAt,
        signedByClient: contract.signedByClient,
        driveWebViewLink: (contract as any).driveWebViewLink,
      });
    } catch (error) {
      console.error("Get public contract error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Public endpoint to sign a contract (token required)
  app.post("/api/contracts/public/:id/sign", async (req: Request, res: Response) => {
    try {
      const { signatureData, token } = req.body;
      
      if (!token) {
        return res.status(401).json({ error: "Token de signature manquant" });
      }
      
      if (!signatureData) {
        return res.status(400).json({ error: "Signature requise" });
      }
      
      const validation = await validateSignatureToken(req.params.id, token);
      
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }
      
      const contract = validation.contract;
      
      // Only allow signing contracts that are in 'sent' status
      if (contract.status !== 'sent') {
        return res.status(403).json({ error: "Ce contrat ne peut plus être signé" });
      }
      
      const signedAt = new Date();
      
      // Update the contract with signature and clear the token (single use)
      const updatedContract = await storage.updateContractByIdOnly(req.params.id, {
        clientSignatureData: signatureData,
        signedByClient: contract.clientName,
        signedAt,
        status: 'signed',
        signatureTokenHash: null,
        signatureTokenExpiresAt: null,
      });
      
      // Create document record in client's documents space
      try {
        if (contract.accountId) {
          const account = await storage.getAccount(contract.accountId, contract.orgId);
          if (account) {
            await storage.createDocument({
              orgId: contract.orgId,
              accountId: contract.accountId,
              projectId: contract.projectId || null,
              dealId: contract.dealId || null,
              name: `${contract.contractNumber} - ${contract.title} (Signé)`,
              url: (contract as any).driveWebViewLink || null,
              mimeType: 'application/pdf',
              storageProvider: 'drive',
            });
          }
        }
      } catch (docError) {
        console.error("Failed to create document record:", docError);
      }

      // Create notification for admin that client signed the contract
      try {
        const memberships = await storage.getMembershipsByOrg(contract.orgId);
        const adminMemberships = memberships.filter(m => m.role === 'admin');

        for (const membership of adminMemberships) {
          await storage.createNotification({
            orgId: contract.orgId,
            userId: membership.userId,
            title: 'Contrat signé par le client',
            description: `${contract.clientName} a signé le contrat ${contract.contractNumber || contract.title}`,
            type: 'success',
            link: `/contracts`,
            relatedEntityType: 'contract',
            relatedEntityId: contract.id,
          });
        }
      } catch (notifError) {
        console.error("Error creating contract signature notification:", notifError);
      }

      // Try to save signed PDF to Drive (async, don't block response)
      try {
        if (contract.driveFileId) {
          const { downloadFileFromDrive, uploadFileToDrive, getOrCreateFolder } = await import("./drive");
          const { convertDocxToPdf } = await import("./docx-to-pdf");
          const { embedSignatureInPdf } = await import("./pdf");
          
          // Download DOCX, convert to PDF
          const docxBuffer = await downloadFileFromDrive(contract.driveFileId);
          let pdfBuffer = await convertDocxToPdf(docxBuffer);
          
          // Embed signature in PDF if possible
          try {
            pdfBuffer = await embedSignatureInPdf(pdfBuffer, signatureData, contract.clientName);
          } catch (embedError) {
            console.warn("Could not embed signature in PDF:", embedError);
          }
          
          // Get or create client folder
          const clientFolderName = contract.clientCompany || contract.clientName;
          const clientFolderId = await getOrCreateFolder(clientFolderName, 'Clients - Contrats signés');
          
          // Upload signed PDF
          const filename = `${contract.contractNumber}_SIGNE_${contract.clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          await uploadFileToDrive(pdfBuffer, filename, 'application/pdf', clientFolderName);
        }
      } catch (driveError) {
        console.error("Failed to save signed PDF to Drive:", driveError);
      }
      
      // Return the updated contract data for frontend
      res.json({ 
        success: true, 
        contract: {
          id: updatedContract?.id || contract.id,
          title: contract.title,
          contractNumber: contract.contractNumber,
          type: contract.type,
          status: 'signed',
          clientName: contract.clientName,
          clientCompany: contract.clientCompany,
          amount: contract.amount,
          currency: contract.currency,
          scope: contract.scope,
          deliverables: contract.deliverables,
          paymentTerms: contract.paymentTerms,
          startDate: contract.startDate,
          endDate: contract.endDate,
          clientSignatureData: signatureData,
          signedAt,
          signedByClient: contract.clientName,
        }
      });
    } catch (error) {
      console.error("Sign contract error:", error);
      res.status(500).json({ error: "Erreur lors de la signature" });
    }
  });

  // Public PDF download endpoint (token required)
  app.get("/api/contracts/:id/public-pdf", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(401).json({ error: "Token de signature manquant" });
      }
      
      const validation = await validateSignatureToken(req.params.id, token);
      
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }
      
      const contract = validation.contract;
      
      // If there's a DOCX on Drive, convert it to PDF
      if (contract.driveFileId) {
        const { downloadFileFromDrive } = await import("./drive");
        const { convertDocxToPdf } = await import("./docx-to-pdf");
        
        const docxBuffer = await downloadFileFromDrive(contract.driveFileId);
        const pdfBuffer = await convertDocxToPdf(docxBuffer);
        
        const filename = `${contract.contractNumber}_${contract.clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
      }
      
      // Fallback: generate PDF from contract data
      const { generateContractPDF } = await import("./pdf");
      const pdfBuffer = await generateContractPDF({
        contract,
        organizationName: 'IA Infinity',
      });
      
      const sanitizedFilename = contract.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Public PDF download error:", error);
      res.status(500).json({ error: error.message || "Échec du téléchargement PDF" });
    }
  });

  app.get("/api/contracts/:id/pdf", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contract = await storage.getContract(req.params.id, orgId);
      
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      const { generateContractPDF } = await import("./pdf");
      const org = await storage.getOrganization(orgId);
      
      const pdfBuffer = await generateContractPDF({
        contract,
        organizationName: org?.name || 'IA Infinity',
      });
      
      const sanitizedFilename = contract.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Generate contract PDF error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  app.get("/api/deals/:id/quote-pdf", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const deal = await storage.getDeal(req.params.id, orgId);
      
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      const account = deal.accountId ? await storage.getAccount(deal.accountId, orgId) : null;
      
      const { generateQuotePDF } = await import("./pdf");
      const org = await storage.getOrganization(orgId);
      
      const pdfBuffer = await generateQuotePDF({
        dealName: deal.name,
        accountName: account?.name || 'Client',
        contactEmail: account?.contactEmail || '',
        amount: deal.amount,
        probability: deal.probability,
        missionTypes: deal.missionTypes || [],
        nextAction: deal.nextAction,
        organizationName: org?.name || 'IA Infinity',
      });
      
      const sanitizedDealId = deal.id.substring(0, 8).replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="devis-${sanitizedDealId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Generate quote PDF error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // ============================================
  // Contract Template Routes (DOCX Generation)
  // ============================================
  
  app.get("/api/contracts/templates/:type", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const contractType = req.params.type as 'audit' | 'prestation';
      if (!['audit', 'prestation'].includes(contractType)) {
        return res.status(400).json({ error: "Invalid contract type. Must be 'audit' or 'prestation'" });
      }
      
      const { getContractTemplateInfo } = await import("./docx-generator");
      const templateInfo = await getContractTemplateInfo(contractType);
      res.json(templateInfo);
    } catch (error) {
      console.error("Get contract template info error:", error);
      res.status(500).json({ error: "Failed to get template info" });
    }
  });
  
  app.get("/api/contracts/:id/docx", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contract = await storage.getContract(req.params.id, orgId);
      
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      const { generateContractDocx, prepareContractData } = await import("./docx-generator");
      const contractType = (contract.type === 'audit' ? 'audit' : 'prestation') as 'audit' | 'prestation';
      
      const templateData = prepareContractData(contractType, {
        clientName: contract.clientName,
        clientCompany: contract.clientCompany || '',
        clientAddress: contract.clientAddress || '',
        clientEmail: contract.clientEmail,
        amount: contract.amount,
        dateDebut: contract.startDate?.toISOString() || '',
        dateFin: contract.endDate?.toISOString() || '',
      });
      
      const docxBuffer = await generateContractDocx(contractType, templateData);
      
      const sanitizedFilename = contract.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}.docx"`);
      res.send(docxBuffer);
    } catch (error) {
      console.error("Generate contract DOCX error:", error);
      res.status(500).json({ error: "Failed to generate DOCX" });
    }
  });
  
  const contractPersonalizationSchema = z.object({
    clientName: z.string().optional(),
    clientCompany: z.string().optional(),
    clientAddress: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPhone: z.string().optional(),
    clientSiret: z.string().optional(),
    objectScope: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    dateDebut: z.string().optional(),
    dateFin: z.string().optional(),
    dateRapportAudit: z.string().optional(),
    outilPlateforme: z.string().optional(),
    nombreSemaines: z.string().optional(),
    nomPhase: z.string().optional(),
    lieu: z.string().optional(),
  });
  
  app.post("/api/contracts/:id/generate-docx-drive", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contract = await storage.getContract(req.params.id, orgId);
      
      if (!contract) {
        return res.status(404).json({ error: "Contrat introuvable" });
      }
      
      // Validate request body
      const parsed = contractPersonalizationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Données de personnalisation invalides", details: parsed.error.errors });
      }
      const customData = parsed.data;
      
      // Check Drive connection before proceeding
      const { uploadFileToDrive, getDriveStatus } = await import("./drive");
      let driveStatus;
      try {
        driveStatus = await getDriveStatus();
      } catch (driveError) {
        console.error("Drive connection check failed:", driveError);
        return res.status(503).json({ error: "Impossible de vérifier la connexion Google Drive. Veuillez reconnecter votre compte." });
      }
      
      if (!driveStatus.connected) {
        return res.status(400).json({ error: "Google Drive n'est pas connecté. Veuillez le connecter dans les paramètres." });
      }
      
      const { generateContractDocx, prepareContractData } = await import("./docx-generator");
      
      const contractType = (contract.type === 'audit' ? 'audit' : 'prestation') as 'audit' | 'prestation';
      
      const templateData = prepareContractData(contractType, {
        clientName: customData.clientName || contract.clientName,
        clientCompany: customData.clientCompany || contract.clientCompany || '',
        clientAddress: customData.clientAddress || contract.clientAddress || '',
        clientEmail: customData.clientEmail || contract.clientEmail,
        clientPhone: customData.clientPhone || contract.clientPhone || '',
        clientSiret: customData.clientSiret || contract.clientSiret || '',
        objectScope: customData.objectScope || contract.objectScope || '',
        amount: customData.amount || contract.amount,
        dateDebut: customData.dateDebut || contract.startDate?.toISOString() || '',
        dateFin: customData.dateFin || contract.endDate?.toISOString() || '',
        dateRapportAudit: customData.dateRapportAudit,
        outilPlateforme: customData.outilPlateforme,
        nombreSemaines: customData.nombreSemaines,
        nomPhase: customData.nomPhase,
        lieu: customData.lieu,
      });
      
      const docxBuffer = await generateContractDocx(contractType, templateData);
      
      const filename = `${contract.contractNumber}_${contract.clientName.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      const driveResult = await uploadFileToDrive(
        docxBuffer,
        filename,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'IA Infinity - Contrats'
      );
      
      // Update contract with Drive file info and personalization data
      const updatedContract = await storage.updateContract(req.params.id, orgId, {
        driveFileId: driveResult.id,
        driveWebViewLink: driveResult.webViewLink,
        driveWebContentLink: driveResult.webContentLink,
        templateType: contractType,
        // Save personalization data
        clientName: customData.clientName || contract.clientName,
        clientCompany: customData.clientCompany || contract.clientCompany,
        clientAddress: customData.clientAddress || contract.clientAddress,
        clientEmail: customData.clientEmail || contract.clientEmail,
        clientPhone: customData.clientPhone || contract.clientPhone,
        clientSiret: customData.clientSiret || contract.clientSiret,
        objectScope: customData.objectScope || contract.objectScope,
        amount: customData.amount?.toString() || contract.amount,
        startDate: customData.dateDebut ? new Date(customData.dateDebut) : contract.startDate,
        endDate: customData.dateFin ? new Date(customData.dateFin) : contract.endDate,
        lieu: customData.lieu || contract.lieu,
        outilPlateforme: customData.outilPlateforme || contract.outilPlateforme,
        nombreSemaines: customData.nombreSemaines || contract.nombreSemaines,
        nomPhase: customData.nomPhase || contract.nomPhase,
        dateRapportAudit: customData.dateRapportAudit ? new Date(customData.dateRapportAudit) : contract.dateRapportAudit,
      });
      
      res.json({
        success: true,
        contract: updatedContract,
        driveFile: driveResult,
      });
    } catch (error: any) {
      console.error("Generate and upload contract DOCX error:", error);
      const errorMessage = error.message?.includes('Drive') || error.message?.includes('Google')
        ? "Erreur de connexion à Google Drive. Veuillez vérifier votre connexion."
        : "Échec de la génération du document. Veuillez réessayer.";
      res.status(500).json({ error: errorMessage });
    }
  });
  
  // Convert DOCX from Drive to PDF and upload
  app.post("/api/contracts/:id/convert-to-pdf", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contract = await storage.getContract(req.params.id, orgId);
      
      if (!contract) {
        return res.status(404).json({ error: "Contrat introuvable" });
      }
      
      if (!contract.driveFileId) {
        return res.status(400).json({ error: "Aucun fichier Word sauvegardé sur Drive pour ce contrat" });
      }
      
      const { downloadFileFromDrive, uploadFileToDrive } = await import("./drive");
      const { convertDocxToPdf } = await import("./docx-to-pdf");
      
      // Download DOCX from Drive
      const docxBuffer = await downloadFileFromDrive(contract.driveFileId);
      
      // Convert to PDF
      const pdfBuffer = await convertDocxToPdf(docxBuffer);
      
      // Upload PDF to Drive
      const pdfFilename = `${contract.contractNumber}_${contract.clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const pdfResult = await uploadFileToDrive(
        pdfBuffer,
        pdfFilename,
        'application/pdf',
        'IA Infinity - Contrats'
      );
      
      res.json({
        success: true,
        pdfFile: pdfResult,
        message: 'Contrat converti en PDF et sauvegardé sur Drive'
      });
    } catch (error: any) {
      console.error("Convert to PDF error:", error);
      res.status(500).json({ error: error.message || "Échec de la conversion en PDF" });
    }
  });
  
  // Download PDF directly
  app.get("/api/contracts/:id/download-pdf", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contract = await storage.getContract(req.params.id, orgId);
      
      if (!contract) {
        return res.status(404).json({ error: "Contrat introuvable" });
      }
      
      if (!contract.driveFileId) {
        return res.status(400).json({ error: "Aucun fichier Word sauvegardé sur Drive pour ce contrat" });
      }
      
      const { downloadFileFromDrive } = await import("./drive");
      const { convertDocxToPdf } = await import("./docx-to-pdf");
      
      // Download DOCX from Drive
      const docxBuffer = await downloadFileFromDrive(contract.driveFileId);
      
      // Convert to PDF
      const pdfBuffer = await convertDocxToPdf(docxBuffer);
      
      const filename = `${contract.contractNumber}_${contract.clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Download PDF error:", error);
      res.status(500).json({ error: error.message || "Échec du téléchargement PDF" });
    }
  });
  
  app.post("/api/contracts/create-from-deal", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const createFromDealSchema = z.object({
        dealId: z.string(),
        type: z.enum(['audit', 'prestation']),
        customData: contractPersonalizationSchema.optional(),
      });
      
      const parsed = createFromDealSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { dealId, type, customData } = parsed.data;
      const deal = await storage.getDeal(dealId, orgId);
      
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      const account = deal.accountId ? await storage.getAccount(deal.accountId, orgId) : null;
      const contact = deal.contactId ? await storage.getContact(deal.contactId, orgId) : null;

      // Extraire les infos depuis les notes (pour les prospects créés avant la migration)
      let prospectInfo: { companyName?: string; contactName?: string; contactEmail?: string } = {};
      if (deal.notes) {
        try {
          prospectInfo = JSON.parse(deal.notes);
        } catch (e) {
          // Notes n'est pas un JSON valide, ignorer
        }
      }

      // Priorité pour les informations client:
      // 1. customData (si fourni par l'utilisateur)
      // 2. contactEmail du deal directement
      // 3. contactEmail depuis les notes (prospects anciens)
      // 4. contact lié au deal
      // 5. account lié au deal
      const clientEmail = customData?.clientEmail || deal.contactEmail || prospectInfo.contactEmail || contact?.email || account?.contactEmail;
      const clientName = customData?.clientName || contact?.name || prospectInfo.contactName || account?.contactName || account?.name;

      if (!clientEmail) {
        return res.status(400).json({
          error: "Aucun email client n'est défini. Veuillez ajouter un email de contact dans l'opportunité ou le compte client."
        });
      }

      // Generate contract number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const contractNumber = `CTR-${year}${month}-${random}`;

      // Create contract in draft status
      const contractData = {
        orgId,
        dealId,
        accountId: deal.accountId || undefined,
        contractNumber,
        title: `${type === 'audit' ? 'Audit Général' : 'Prestation d\'Automatisation'} - ${account?.name || deal.name}`,
        type: type as ContractType,
        status: 'draft' as ContractStatus,
        clientName: clientName || '',
        clientEmail: clientEmail,
        clientCompany: customData?.clientCompany || account?.name || '',
        clientAddress: customData?.clientAddress || '',
        amount: customData?.amount?.toString() || deal.amount || '0',
        startDate: customData?.dateDebut ? new Date(customData.dateDebut) : null,
        endDate: customData?.dateFin ? new Date(customData.dateFin) : null,
        templateType: type,
      };
      
      const contract = await storage.createContract(contractData);
      
      res.status(201).json(contract);
    } catch (error) {
      console.error("Create contract from deal error:", error);
      res.status(500).json({ error: "Failed to create contract from deal" });
    }
  });

  // ============================================
  // SIREN Lookup Routes
  // ============================================

  app.get("/api/siren/lookup/:siren", async (req: Request, res: Response) => {
    try {
      const { lookupBySiren } = await import("./siren-lookup");
      const companyInfo = await lookupBySiren(req.params.siren);
      
      if (!companyInfo) {
        return res.status(404).json({ error: "Entreprise non trouvée pour ce SIREN" });
      }
      
      res.json(companyInfo);
    } catch (error: any) {
      console.error("SIREN lookup error:", error);
      res.status(400).json({ error: error.message || "Erreur lors de la recherche SIREN" });
    }
  });

  app.get("/api/siren/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ error: "Requête trop courte" });
      }
      
      const { searchCompanies } = await import("./siren-lookup");
      const companies = await searchCompanies(query);
      res.json(companies);
    } catch (error: any) {
      console.error("Company search error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de la recherche" });
    }
  });

  // ============================================
  // AI Contract Scope Generation Routes
  // ============================================

  app.post("/api/contracts/generate-scope", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const generateScopeSchema = z.object({
        dealId: z.string().optional(),
        accountId: z.string().optional(),
        contractType: z.enum(['audit', 'prestation', 'formation', 'suivi', 'sous_traitance']),
        clientName: z.string(),
        clientCompany: z.string().optional(),
        existingScope: z.string().optional(),
      });
      
      const parsed = generateScopeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { dealId, accountId, contractType, clientName, clientCompany, existingScope } = parsed.data;
      
      // Get activities (meeting notes) for the deal or account
      const activities = await storage.getActivities(orgId);
      
      // Filter activities for this deal or account
      let relevantActivities = activities;
      if (dealId) {
        relevantActivities = activities.filter(a => a.dealId === dealId);
      }
      
      const { generateContractScope } = await import("./ai-scope-generator");
      const result = await generateContractScope(
        relevantActivities.map(a => ({
          type: a.type,
          description: a.description,
          createdAt: a.createdAt,
        })),
        contractType,
        clientName,
        clientCompany,
        existingScope
      );
      
      res.json(result);
    } catch (error: any) {
      console.error("Generate scope error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de la génération du scope" });
    }
  });

  // ============================================
  // Notion Integration Routes
  // ============================================

  app.get("/api/notion/databases", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { listNotionDatabases } = await import("./notion");
      const databases = await listNotionDatabases();
      res.json(databases);
    } catch (error) {
      console.error("List Notion databases error:", error);
      res.status(500).json({ error: "Failed to list Notion databases" });
    }
  });

  app.get("/api/notion/databases/:id/schema", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { getDatabaseSchema } = await import("./notion");
      const schema = await getDatabaseSchema(req.params.id);
      res.json(schema);
    } catch (error) {
      console.error("Get Notion database schema error:", error);
      res.status(500).json({ error: "Failed to get database schema" });
    }
  });

  const notionSyncSchema = z.object({
    databaseId: z.string().min(1, "databaseId is required"),
    fieldMapping: z.record(z.string()).optional(),
  });

  app.post("/api/notion/sync/accounts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId, fieldMapping } = parsed.data;

      const { queryDatabase, getPropertyValue, findPropertyByPossibleNames } = await import("./notion");
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:accounts:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor, hasMore } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const properties = page.properties || {};
            
            const mapping = fieldMapping || {
              name: findPropertyByPossibleNames(properties, ['Name', 'Nom', 'Company', 'Entreprise', 'Client', 'Société']) || 'Name',
              contactName: findPropertyByPossibleNames(properties, ['Contact', 'Contact Name', 'Nom du contact', 'Responsable']) || 'Contact',
              contactEmail: findPropertyByPossibleNames(properties, ['Email', 'E-mail', 'Mail']) || 'Email',
              domain: findPropertyByPossibleNames(properties, ['Domain', 'Website', 'Site', 'URL']) || 'Website',
              status: findPropertyByPossibleNames(properties, ['Status', 'Statut', 'État']) || 'Status',
              plan: findPropertyByPossibleNames(properties, ['Plan', 'Offre', 'Tier']) || 'Plan',
            };

            const name = getPropertyValue(page, mapping.name) || 'Unknown';
            const contactName = getPropertyValue(page, mapping.contactName) || name;
            const contactEmail = getPropertyValue(page, mapping.contactEmail) || `contact@${name.toLowerCase().replace(/\s+/g, '')}.com`;
            const domain = getPropertyValue(page, mapping.domain);
            const statusRaw = getPropertyValue(page, mapping.status);
            const plan = getPropertyValue(page, mapping.plan) || 'standard';
            
            let status: 'active' | 'inactive' | 'churned' = 'active';
            if (statusRaw) {
              const statusLower = String(statusRaw).toLowerCase();
              if (statusLower.includes('inactif') || statusLower.includes('inactive')) {
                status = 'inactive';
              } else if (statusLower.includes('churned') || statusLower.includes('perdu') || statusLower.includes('lost')) {
                status = 'churned';
              }
            }

            await storage.upsertAccountByNotionId(page.id, orgId, {
              orgId,
              name,
              domain: domain || null,
              plan,
              status,
              contactName,
              contactEmail,
              notionPageId: page.id,
              notionLastEditedAt: page.last_edited_time ? new Date(page.last_edited_time) : null,
            });
            
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Sync Notion accounts error:", error);
      res.status(500).json({ error: "Failed to sync accounts from Notion" });
    }
  });

  // Helper function to sync accounts with a specific plan type
  async function syncAccountsWithPlan(req: Request, res: Response, planType: string, sourceLabel: string) {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId, fieldMapping } = parsed.data;

      const { queryDatabase, getPropertyValue, findPropertyByPossibleNames } = await import("./notion");
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:${sourceLabel}:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor, hasMore } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const properties = page.properties || {};
            
            const mapping = fieldMapping || {
              name: findPropertyByPossibleNames(properties, ['Name', 'Nom', 'Company', 'Entreprise', 'Client', 'Société']) || 'Name',
              contactName: findPropertyByPossibleNames(properties, ['Contact', 'Contact Name', 'Nom du contact', 'Responsable']) || 'Contact',
              contactEmail: findPropertyByPossibleNames(properties, ['Email', 'E-mail', 'Mail']) || 'Email',
              domain: findPropertyByPossibleNames(properties, ['Domain', 'Website', 'Site', 'URL']) || 'Website',
              status: findPropertyByPossibleNames(properties, ['Status', 'Statut', 'État']) || 'Status',
            };

            const name = getPropertyValue(page, mapping.name) || 'Unknown';
            const contactName = getPropertyValue(page, mapping.contactName) || name;
            const contactEmail = getPropertyValue(page, mapping.contactEmail) || `contact@${name.toLowerCase().replace(/\s+/g, '')}.com`;
            const domain = getPropertyValue(page, mapping.domain);
            const statusRaw = getPropertyValue(page, mapping.status);
            
            let status: 'active' | 'inactive' | 'churned' = 'active';
            if (statusRaw) {
              const statusLower = String(statusRaw).toLowerCase();
              if (statusLower.includes('inactif') || statusLower.includes('inactive')) {
                status = 'inactive';
              } else if (statusLower.includes('churned') || statusLower.includes('perdu') || statusLower.includes('lost')) {
                status = 'churned';
              }
            }

            await storage.upsertAccountByNotionId(page.id, orgId, {
              orgId,
              name,
              domain: domain || null,
              plan: planType,
              status,
              contactName,
              contactEmail,
              notionPageId: page.id,
              notionLastEditedAt: page.last_edited_time ? new Date(page.last_edited_time) : null,
            });
            
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error(`Sync Notion ${sourceLabel} error:`, error);
      res.status(500).json({ error: `Failed to sync ${sourceLabel} from Notion` });
    }
  }

  // Sync prospects from Notion
  app.post("/api/notion/sync/prospects", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    await syncAccountsWithPlan(req, res, 'prospect', 'prospects');
  });

  // Sync audit clients from Notion
  app.post("/api/notion/sync/audit-clients", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    await syncAccountsWithPlan(req, res, 'audit', 'audit-clients');
  });

  // Sync automation clients from Notion
  app.post("/api/notion/sync/automation-clients", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    await syncAccountsWithPlan(req, res, 'automation', 'automation-clients');
  });

  app.post("/api/notion/sync/expenses", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId, fieldMapping } = parsed.data;

      const { queryDatabase, getPropertyValue, findPropertyByPossibleNames } = await import("./notion");
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:expenses:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const properties = page.properties || {};
            
            const mapping = fieldMapping || {
              title: findPropertyByPossibleNames(properties, ['Name', 'Nom', 'Title', 'Titre', 'Description', 'Libellé']) || 'Name',
              amount: findPropertyByPossibleNames(properties, ['Amount', 'Montant', 'Total', 'Prix', 'Cost', 'Coût']) || 'Amount',
              category: findPropertyByPossibleNames(properties, ['Category', 'Catégorie', 'Type']) || 'Category',
              status: findPropertyByPossibleNames(properties, ['Status', 'Statut', 'État', 'Paid', 'Payé']) || 'Status',
              date: findPropertyByPossibleNames(properties, ['Date', 'Date de paiement', 'Payment Date']) || 'Date',
              description: findPropertyByPossibleNames(properties, ['Description', 'Notes', 'Remarques', 'Details']) || 'Description',
            };

            const title = getPropertyValue(page, mapping.title) || 'Untitled Expense';
            const amount = getPropertyValue(page, mapping.amount) || 0;
            const categoryRaw = getPropertyValue(page, mapping.category);
            const statusRaw = getPropertyValue(page, mapping.status);
            const dateRaw = getPropertyValue(page, mapping.date);
            const description = getPropertyValue(page, mapping.description);
            
            let category: 'tools' | 'software' | 'services' | 'travel' | 'marketing' | 'office' | 'salaries' | 'taxes' | 'other' = 'other';
            if (categoryRaw) {
              const catLower = String(categoryRaw).toLowerCase();
              if (catLower.includes('tool') || catLower.includes('outil')) category = 'tools';
              else if (catLower.includes('software') || catLower.includes('logiciel') || catLower.includes('saas')) category = 'software';
              else if (catLower.includes('service') || catLower.includes('prestation')) category = 'services';
              else if (catLower.includes('travel') || catLower.includes('voyage') || catLower.includes('déplacement')) category = 'travel';
              else if (catLower.includes('marketing') || catLower.includes('pub') || catLower.includes('comm')) category = 'marketing';
              else if (catLower.includes('office') || catLower.includes('bureau')) category = 'office';
              else if (catLower.includes('salar') || catLower.includes('paie')) category = 'salaries';
              else if (catLower.includes('tax') || catLower.includes('impôt') || catLower.includes('cotisation')) category = 'taxes';
            }

            let status: 'pending' | 'paid' | 'cancelled' = 'pending';
            if (statusRaw) {
              const statusLower = String(statusRaw).toLowerCase();
              if (statusLower.includes('paid') || statusLower.includes('payé') || statusLower === 'true' || statusRaw === true) {
                status = 'paid';
              } else if (statusLower.includes('cancel') || statusLower.includes('annulé')) {
                status = 'cancelled';
              }
            }

            const date = dateRaw ? new Date(dateRaw) : new Date();

            await storage.upsertExpenseByNotionId(page.id, orgId, {
              orgId,
              title,
              description: description || null,
              amount: String(amount),
              currency: 'EUR',
              category,
              status,
              date,
              notionPageId: page.id,
              notionLastEditedAt: page.last_edited_time ? new Date(page.last_edited_time) : null,
            });
            
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Sync Notion expenses error:", error);
      res.status(500).json({ error: "Failed to sync expenses from Notion" });
    }
  });

  app.post("/api/notion/sync/contacts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId } = parsed.data;
      const { queryDatabase, mapNotionPageToContact } = await import("./notion");
      
      const accountIdMap = await storage.getAllAccountNotionIdMap(orgId);
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:contacts:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const mapped = mapNotionPageToContact(page, accountIdMap);
            await storage.upsertContactByNotionId(page.id, orgId, {
              orgId,
              ...mapped,
            });
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Sync Notion contacts error:", error);
      res.status(500).json({ error: "Failed to sync contacts from Notion" });
    }
  });

  app.post("/api/notion/sync/deals", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId } = parsed.data;
      const { queryDatabase, mapNotionPageToDeal } = await import("./notion");
      
      const accountIdMap = await storage.getAllAccountNotionIdMap(orgId);
      const contactIdMap = await storage.getAllContactNotionIdMap(orgId);
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:deals:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const mapped = mapNotionPageToDeal(page, accountIdMap, contactIdMap);
            await storage.upsertDealByNotionId(page.id, orgId, {
              orgId,
              ...mapped,
            });
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Sync Notion deals error:", error);
      res.status(500).json({ error: "Failed to sync deals from Notion" });
    }
  });

  app.post("/api/notion/sync/projects", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId } = parsed.data;
      const { queryDatabase, mapNotionPageToProject } = await import("./notion");
      
      const accountIdMap = await storage.getAllAccountNotionIdMap(orgId);
      const dealIdMap = await storage.getAllDealNotionIdMap(orgId);
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:projects:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const mapped = mapNotionPageToProject(page, accountIdMap, dealIdMap);
            await storage.upsertProjectByNotionId(page.id, orgId, {
              orgId,
              ...mapped,
            });
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Sync Notion projects error:", error);
      res.status(500).json({ error: "Failed to sync projects from Notion" });
    }
  });

  app.post("/api/notion/sync/tasks", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId } = parsed.data;
      const { queryDatabase, mapNotionPageToTask } = await import("./notion");
      
      const projectIdMap = await storage.getAllProjectNotionIdMap(orgId);
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:tasks:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const mapped = mapNotionPageToTask(page, projectIdMap);
            await storage.upsertTaskByNotionId(page.id, orgId, {
              orgId,
              ...mapped,
            });
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Sync Notion tasks error:", error);
      res.status(500).json({ error: "Failed to sync tasks from Notion" });
    }
  });

  app.post("/api/notion/sync/invoices", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId } = parsed.data;
      const { queryDatabase, mapNotionPageToInvoice } = await import("./notion");
      
      const accountIdMap = await storage.getAllAccountNotionIdMap(orgId);
      const projectIdMap = await storage.getAllProjectNotionIdMap(orgId);
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:invoices:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const mapped = mapNotionPageToInvoice(page, accountIdMap, projectIdMap);
            await storage.upsertInvoiceByNotionId(page.id, orgId, {
              orgId,
              ...mapped,
            });
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Sync Notion invoices error:", error);
      res.status(500).json({ error: "Failed to sync invoices from Notion" });
    }
  });

  app.post("/api/notion/sync/vendors", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId } = parsed.data;
      const { queryDatabase, mapNotionPageToVendor } = await import("./notion");
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:vendors:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const mapped = mapNotionPageToVendor(page);
            await storage.upsertVendorByNotionId(page.id, orgId, {
              orgId,
              ...mapped,
            });
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Sync Notion vendors error:", error);
      res.status(500).json({ error: "Failed to sync vendors from Notion" });
    }
  });

  app.post("/api/notion/sync/missions", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId } = parsed.data;
      const { queryDatabase, mapNotionPageToMission } = await import("./notion");
      
      const projectIdMap = await storage.getAllProjectNotionIdMap(orgId);
      const vendorIdMap = await storage.getAllVendorNotionIdMap(orgId);
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:missions:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const mapped = mapNotionPageToMission(page, projectIdMap, vendorIdMap);
            await storage.upsertMissionByNotionId(page.id, orgId, {
              orgId,
              ...mapped,
            });
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Sync Notion missions error:", error);
      res.status(500).json({ error: "Failed to sync missions from Notion" });
    }
  });

  app.post("/api/notion/sync/documents", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = notionSyncSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const { databaseId } = parsed.data;
      const { queryDatabase, mapNotionPageToDocument } = await import("./notion");
      
      const accountIdMap = await storage.getAllAccountNotionIdMap(orgId);
      const projectIdMap = await storage.getAllProjectNotionIdMap(orgId);
      
      const importJob = await storage.createImportJob({
        orgId,
        source: `notion:documents:${databaseId}`,
        status: 'running',
        totalRecords: 0,
        processedRecords: 0,
        errorCount: 0,
      });

      let nextCursor: string | null = null;
      let totalProcessed = 0;
      let errorCount = 0;
      const errors: string[] = [];

      do {
        const { results, nextCursor: cursor } = await queryDatabase(databaseId, nextCursor || undefined);
        
        for (const page of results) {
          try {
            const mapped = mapNotionPageToDocument(page, accountIdMap, projectIdMap);
            await storage.upsertDocumentByNotionId(page.id, orgId, {
              orgId,
              ...mapped,
            });
            totalProcessed++;
          } catch (err) {
            errorCount++;
            errors.push(`Page ${page.id}: ${err}`);
          }
        }

        nextCursor = cursor;
        if (!cursor) break;
      } while (true);

      await storage.updateImportJob(importJob.id, orgId, {
        status: 'completed',
        totalRecords: totalProcessed + errorCount,
        processedRecords: totalProcessed,
        errorCount,
        completedAt: new Date(),
        errors: errors.length > 0 ? errors.join('\n') : null,
      });

      res.json({
        success: true,
        importJobId: importJob.id,
        totalProcessed,
        errorCount,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Sync Notion documents error:", error);
      res.status(500).json({ error: "Failed to sync documents from Notion" });
    }
  });

  app.get("/api/notion/sync/jobs", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const jobs = await storage.getImportJobs(orgId);
      res.json(jobs);
    } catch (error) {
      console.error("Get import jobs error:", error);
      res.status(500).json({ error: "Failed to get import jobs" });
    }
  });

  // ============================================
  // Expenses Routes
  // ============================================

  app.get("/api/expenses", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const category = req.query.category as any | undefined;
      const status = req.query.status as any | undefined;
      const expenses = await storage.getExpenses(orgId, category, status);
      res.json(expenses);
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ error: "Failed to get expenses" });
    }
  });

  app.post("/api/expenses", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { insertExpenseSchema } = await import("@shared/schema");
      const data = insertExpenseSchema.parse({ ...req.body, orgId });
      const expense = await storage.createExpense(data);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create expense error:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const expense = await storage.updateExpense(req.params.id, orgId, req.body);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteExpense(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // ============================================
  // Invitations Routes
  // ============================================

  app.get("/api/invitations", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const status = req.query.status as InvitationStatus | undefined;
      const invitations = await storage.getInvitations(orgId, status);
      const safeInvitations = invitations.map(({ tokenHash, ...rest }) => rest);
      res.json(safeInvitations);
    } catch (error) {
      console.error("Get invitations error:", error);
      res.status(500).json({ error: "Failed to get invitations" });
    }
  });

  app.get("/api/invitations/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const invitation = await storage.getInvitation(req.params.id, orgId);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      const { tokenHash, ...safeInvitation } = invitation;
      res.json(safeInvitation);
    } catch (error) {
      console.error("Get invitation error:", error);
      res.status(500).json({ error: "Failed to get invitation" });
    }
  });

  const createInvitationSchema = z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'sales', 'delivery', 'finance', 'client_admin', 'client_member', 'vendor']),
    space: z.enum(['internal', 'client', 'vendor']),
    expiresInMinutes: z.number().min(5).max(525600).default(30), // Max 1 year
    accountId: z.string().uuid().optional(),
    vendorId: z.string().uuid().optional(),
    vendorContactId: z.string().uuid().optional(), // Contact of type 'vendor' to create vendor from
    // Fields for creating a new vendor on-the-fly
    vendorName: z.string().optional(),
    vendorCompany: z.string().optional(),
    vendorDailyRate: z.number().optional(),
    vendorSkills: z.array(z.string()).optional(),
    sendEmail: z.boolean().default(false),
  });

  app.post("/api/invitations", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      console.log("========================================");
      console.log("[POST /api/invitations] NOUVELLE REQUÊTE");
      console.log("========================================");
      console.log("[POST /api/invitations] Request body:", JSON.stringify(req.body, null, 2));
      console.log("[POST /api/invitations] vendorId reçu:", req.body.vendorId || "(vide)");
      console.log("[POST /api/invitations] vendorContactId reçu:", req.body.vendorContactId || "(vide)");

      const orgId = getOrgId(req);
      console.log("[POST /api/invitations] orgId:", orgId);

      const parsed = createInvitationSchema.parse(req.body);
      console.log("[POST /api/invitations] Parsed - vendorId:", parsed.vendorId || "(vide)");
      console.log("[POST /api/invitations] Parsed - vendorContactId:", parsed.vendorContactId || "(vide)");
      console.log("[POST /api/invitations] Parsed - role:", parsed.role);

      // STRICT VALIDATION: Ensure client invitations have accountId
      if ((parsed.role === 'client_admin' || parsed.role === 'client_member') && !parsed.accountId) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountId est obligatoire pour les invitations client'
        });
      }

      // For vendor invitations: either provide vendorId, vendorContactId, OR create a new vendor
      let finalVendorId = parsed.vendorId;

      if (parsed.role === 'vendor') {
        console.log("[POST /api/invitations] Role = vendor, processing...");

        if (parsed.vendorId) {
          // Use existing vendor
          finalVendorId = parsed.vendorId;
          console.log(`[POST /api/invitations] ✅ Using existing vendor ${finalVendorId}`);
        } else if (parsed.vendorContactId) {
          console.log(`[POST /api/invitations] ⚙️ Creating vendor from contact ${parsed.vendorContactId}`);
          // Create vendor from contact
          const contact = await storage.getContact(parsed.vendorContactId, orgId);
          console.log("[POST /api/invitations] Contact trouvé:", contact ? contact.name : "NULL");

          if (!contact) {
            console.log("[POST /api/invitations] ❌ Contact non trouvé!");
            return res.status(404).json({
              error: 'Contact Not Found',
              message: `Contact ${parsed.vendorContactId} n'existe pas`
            });
          }

          // Check if contact already has a linked vendor
          if (contact.vendorId) {
            finalVendorId = contact.vendorId;
            console.log(`[POST /api/invitations] Contact already linked to vendor ${finalVendorId}`);
          } else {
            // Create new vendor from contact data
            const newVendor = await storage.createVendor({
              orgId,
              name: contact.name,
              email: contact.email || parsed.email,
              company: null,
              dailyRate: '0',
              skills: [],
              availability: 'available',
              performance: 100,
            });
            finalVendorId = newVendor.id;

            // Link vendor to contact
            await storage.updateContact(contact.id, orgId, { vendorId: newVendor.id });
            console.log(`[POST /api/invitations] Created vendor ${newVendor.id} from contact ${contact.id}`);
          }
        } else {
          // Create a new vendor on-the-fly (no vendorId and no vendorContactId provided)
          console.log("[POST /api/invitations] ⚙️ Creating NEW vendor on-the-fly (no contact selected)");
          const vendorName = parsed.vendorName || parsed.email.split('@')[0];
          const newVendor = await storage.createVendor({
            orgId,
            name: vendorName,
            email: parsed.email,
            company: parsed.vendorCompany || null,
            dailyRate: parsed.vendorDailyRate?.toString() || '0',
            skills: parsed.vendorSkills || [],
            availability: 'available',
            performance: 100,
          });
          finalVendorId = newVendor.id;
          console.log(`[POST /api/invitations] Created new vendor ${newVendor.id} for invitation to ${parsed.email}`);
        }
      }

      // Verify that the account exists if accountId is provided
      if (parsed.accountId) {
        const account = await storage.getAccount(parsed.accountId, orgId);
        if (!account) {
          return res.status(404).json({
            error: 'Account Not Found',
            message: `Account ${parsed.accountId} n'existe pas`
          });
        }
      }

      // Verify that the vendor exists if vendorId is provided (existing vendor)
      if (parsed.vendorId) {
        const vendor = await storage.getVendor(parsed.vendorId, orgId);
        if (!vendor) {
          return res.status(404).json({
            error: 'Vendor Not Found',
            message: `Vendor ${parsed.vendorId} n'existe pas`
          });
        }
      }

      const token = generateToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + parsed.expiresInMinutes * 60 * 1000);

      const invitation = await storage.createInvitation({
        orgId,
        email: parsed.email,
        role: parsed.role as UserRole,
        space: parsed.space as Space,
        tokenHash,
        expiresAt,
        status: 'pending',
        accountId: parsed.accountId || null,
        vendorId: finalVendorId || null,
      });
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const inviteLink = `${baseUrl}/setup-password?token=${token}`;

      console.log("[POST /api/invitations] ========== ENVOI EMAIL ==========");
      console.log("[POST /api/invitations] parsed.sendEmail:", parsed.sendEmail);
      console.log("[POST /api/invitations] req.body.sendEmail:", req.body.sendEmail);
      console.log("[POST /api/invitations] typeof req.body.sendEmail:", typeof req.body.sendEmail);

      let emailSent = false;
      if (parsed.sendEmail) {
        console.log("[POST /api/invitations] ✅ Condition sendEmail = TRUE, envoi de l'email...");
        try {
          const org = await storage.getOrganization(orgId);
          console.log("[POST /api/invitations] Organisation:", org?.name);
          console.log("[POST /api/invitations] Destinataire:", parsed.email);
          console.log("[POST /api/invitations] Lien invitation:", inviteLink);
          console.log("[POST /api/invitations] Role:", parsed.role);

          // Use different email template for vendors
          if (parsed.role === 'vendor') {
            console.log("[POST /api/invitations] Envoi email spécifique VENDOR...");

            // Get vendor name from the vendor record or use the email prefix
            let vendorName = parsed.email.split('@')[0];
            if (finalVendorId) {
              const vendor = await storage.getVendor(finalVendorId, orgId);
              if (vendor?.name) {
                vendorName = vendor.name;
              }
            }

            emailSent = await sendVendorWelcomeEmail({
              to: parsed.email,
              vendorName,
              portalLink: inviteLink,
              organizationName: org?.name || 'IA Infinity',
            });
          } else {
            console.log("[POST /api/invitations] Envoi email invitation standard...");
            emailSent = await sendInvitationEmail({
              to: parsed.email,
              inviteLink,
              role: parsed.role,
              space: parsed.space,
              expiresAt,
              organizationName: org?.name || 'IA Infinity',
            });
          }

          console.log("[POST /api/invitations] Résultat envoi email:", emailSent ? "✅ SUCCÈS" : "❌ ÉCHEC");
        } catch (emailError) {
          console.error("[POST /api/invitations] ❌ ERREUR envoi email:", emailError);
        }
      } else {
        console.log("[POST /api/invitations] ⚠️ sendEmail = FALSE, AUCUN EMAIL ENVOYÉ!");
        console.log("[POST /api/invitations] Pour envoyer l'email, le frontend doit envoyer sendEmail: true");
      }
      console.log("[POST /api/invitations] ========== FIN SECTION EMAIL ==========");

      const { tokenHash: _, ...safeInvitation } = invitation;
      res.status(201).json({
        ...safeInvitation,
        inviteLink,
        emailSent,
      });
    } catch (error) {
      console.error("[POST /api/invitations] ❌ ERREUR COMPLÈTE:");
      console.error("[POST /api/invitations] Type:", typeof error);
      console.error("[POST /api/invitations] Error:", error);
      if (error instanceof Error) {
        console.error("[POST /api/invitations] Message:", error.message);
        console.error("[POST /api/invitations] Stack:", error.stack);
      }
      if (error instanceof z.ZodError) {
        console.error("[POST /api/invitations] Zod validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Validation Error", details: error.errors });
      }
      res.status(500).json({
        error: "Failed to create invitation",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/invitations/validate", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token is required", valid: false });
      }
      
      const tokenHash = hashToken(token);
      const invitation = await storage.getInvitationByToken(tokenHash);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found", valid: false });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ 
          error: `Invitation is ${invitation.status}`, 
          valid: false,
          status: invitation.status 
        });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        await storage.updateInvitation(invitation.id, invitation.orgId, { status: 'expired' });
        return res.status(400).json({ error: "Invitation has expired", valid: false });
      }
      
      res.json({
        valid: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          space: invitation.space,
          expiresAt: invitation.expiresAt,
        }
      });
    } catch (error) {
      console.error("Validate invitation error:", error);
      res.status(500).json({ error: "Failed to validate invitation", valid: false });
    }
  });

  app.post("/api/invitations/accept", async (req: Request, res: Response) => {
    try {
      const { token, name } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      
      const tokenHash = hashToken(token);
      const invitation = await storage.getInvitationByToken(tokenHash);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: `Invitation is ${invitation.status}` });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        await storage.updateInvitation(invitation.id, invitation.orgId, { status: 'expired' });
        return res.status(400).json({ error: "Invitation has expired" });
      }
      
      let user = await storage.getUserByEmail(invitation.email);
      if (!user) {
        user = await storage.createUser({
          email: invitation.email,
          name: name || invitation.email.split('@')[0],
          avatar: null,
        });
      }
      
      const existingMembership = await storage.getMembershipByUserAndOrg(user.id, invitation.orgId);
      if (!existingMembership) {
        await storage.createMembership({
          userId: user.id,
          orgId: invitation.orgId,
          role: invitation.role,
          space: invitation.space,
        });
      }
      
      await storage.acceptInvitation(invitation.id);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        role: invitation.role,
        space: invitation.space,
      });
    } catch (error) {
      console.error("Accept invitation error:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  app.post("/api/invitations/:id/revoke", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const invitation = await storage.revokeInvitation(req.params.id, orgId);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      res.json(invitation);
    } catch (error) {
      console.error("Revoke invitation error:", error);
      res.status(500).json({ error: "Failed to revoke invitation" });
    }
  });

  app.delete("/api/invitations/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteInvitation(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete invitation error:", error);
      res.status(500).json({ error: "Failed to delete invitation" });
    }
  });

  // Gmail connection status
  app.get("/api/gmail/status", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const status = await testGmailConnection();
      res.json(status);
    } catch (error) {
      console.error("Gmail status error:", error);
      res.status(500).json({ connected: false, error: "Failed to check Gmail status" });
    }
  });

  // Gmail test send - send a test email to verify Gmail is working
  app.post("/api/gmail/test-send", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: "Email requis" });
      }

      console.log("[GMAIL TEST] ========== TEST ENVOI EMAIL ==========");
      console.log("[GMAIL TEST] Destinataire:", email);

      // First check if Gmail is connected
      const status = await testGmailConnection();
      console.log("[GMAIL TEST] Status connexion Gmail:", status);

      if (!status.connected) {
        return res.json({
          success: false,
          step: 'connection',
          error: status.error || 'Gmail non connecté. Veuillez configurer le connecteur Gmail dans Replit.',
        });
      }

      // Try to send a test email
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';

      console.log("[GMAIL TEST] Tentative d'envoi...");
      const result = await sendVendorWelcomeEmail({
        to: email,
        vendorName: 'Test Utilisateur',
        portalLink: `${baseUrl}/test-link`,
        organizationName: 'IA Infinity (Test)',
      });

      console.log("[GMAIL TEST] Résultat:", result);
      console.log("[GMAIL TEST] ========== FIN TEST ==========");

      res.json({
        success: result,
        step: result ? 'sent' : 'send_failed',
        message: result
          ? `Email de test envoyé avec succès à ${email}`
          : `Échec de l'envoi. Vérifiez les logs du serveur pour plus de détails.`,
      });
    } catch (error: any) {
      console.error("[GMAIL TEST] Erreur:", error);
      res.json({
        success: false,
        step: 'error',
        error: error.message || 'Erreur inconnue',
      });
    }
  });

  // Gmail inbox - fetch emails from connected Gmail account
  app.get("/api/gmail/inbox", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const maxResults = parseInt(req.query.maxResults as string) || 20;
      const emails = await getInboxEmails(Math.min(maxResults, 50));
      res.json(emails);
    } catch (error: any) {
      console.error("Gmail inbox error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch inbox emails" });
    }
  });

  // ============================================
  // Email Routes
  // ============================================

  app.get("/api/emails", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.query.accountId as string | undefined;
      const dealId = req.query.dealId as string | undefined;
      const emails = await storage.getEmails(orgId, accountId, dealId);
      res.json(emails);
    } catch (error) {
      console.error("Get emails error:", error);
      res.status(500).json({ error: "Failed to get emails" });
    }
  });

  app.get("/api/emails/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const email = await storage.getEmail(req.params.id, orgId);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      res.json(email);
    } catch (error) {
      console.error("Get email error:", error);
      res.status(500).json({ error: "Failed to get email" });
    }
  });

  const sendEmailSchema = z.object({
    to: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
    accountId: z.string().optional(),
    dealId: z.string().optional(),
    contactId: z.string().optional(),
  });

  app.post("/api/gmail/send", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = sendEmailSchema.parse(req.body);
      
      const { sendGenericEmail } = await import("./gmail");
      const result = await sendGenericEmail({
        to: parsed.to,
        subject: parsed.subject,
        htmlBody: parsed.body,
      });
      
      if (result.success && result.messageId) {
        await storage.createEmail({
          orgId,
          accountId: parsed.accountId || null,
          dealId: parsed.dealId || null,
          contactId: parsed.contactId || null,
          gmailMessageId: result.messageId,
          gmailThreadId: result.threadId || null,
          subject: parsed.subject,
          snippet: parsed.body.substring(0, 200),
          fromEmail: result.fromEmail || 'me',
          fromName: 'IA Infinity',
          toEmails: [parsed.to],
          direction: 'outbound',
          receivedAt: new Date(),
          isRead: true,
          hasAttachment: false,
          labels: ['SENT'],
        });
      }
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Send email error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.post("/api/gmail/sync", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { syncGmailEmails } = await import("./gmail");
      const accountId = req.body.accountId as string | undefined;
      const result = await syncGmailEmails(orgId, accountId);
      res.json(result);
    } catch (error) {
      console.error("Gmail sync error:", error);
      res.status(500).json({ error: "Failed to sync Gmail emails" });
    }
  });

  // ============================================
  // Google Calendar Routes
  // ============================================

  app.get("/api/calendar/status", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { testCalendarConnection } = await import("./calendar");
      const status = await testCalendarConnection();
      res.json(status);
    } catch (error) {
      console.error("Calendar status error:", error);
      res.status(500).json({ connected: false, error: "Failed to check Calendar status" });
    }
  });

  app.get("/api/calendar/events", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { getCalendarEvents } = await import("./calendar");
      const timeMin = req.query.timeMin ? new Date(req.query.timeMin as string) : undefined;
      const timeMax = req.query.timeMax ? new Date(req.query.timeMax as string) : undefined;
      const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : 50;
      
      const events = await getCalendarEvents(timeMin, timeMax, maxResults);
      res.json(events);
    } catch (error) {
      console.error("Get calendar events error:", error);
      res.status(500).json({ error: "Failed to get calendar events" });
    }
  });

  app.get("/api/calendar/calendars", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { getCalendarList } = await import("./calendar");
      const calendars = await getCalendarList();
      res.json(calendars);
    } catch (error) {
      console.error("Get calendar list error:", error);
      res.status(500).json({ error: "Failed to get calendar list" });
    }
  });

  const createEventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    start: z.string().min(1, "Start time is required"),
    end: z.string().min(1, "End time is required"),
    location: z.string().optional(),
    attendees: z.array(z.string().email()).optional(),
  });

  app.post("/api/calendar/events", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = createEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }

      const { createCalendarEvent } = await import("./calendar");
      const event = await createCalendarEvent(parsed.data);
      res.status(201).json(event);
    } catch (error) {
      console.error("Create calendar event error:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  app.patch("/api/calendar/events/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { updateCalendarEvent } = await import("./calendar");
      const event = await updateCalendarEvent(req.params.id, req.body);
      res.json(event);
    } catch (error) {
      console.error("Update calendar event error:", error);
      res.status(500).json({ error: "Failed to update calendar event" });
    }
  });

  app.delete("/api/calendar/events/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { deleteCalendarEvent } = await import("./calendar");
      await deleteCalendarEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete calendar event error:", error);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });

  // Calendar DB Sync Routes
  app.post("/api/calendar/sync", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = DEFAULT_ORG_ID;
      const { daysAhead } = req.body;
      const { syncCalendarEventsToDb } = await import("./calendar");
      const result = await syncCalendarEventsToDb(orgId, daysAhead || 30);
      res.json(result);
    } catch (error) {
      console.error("Calendar sync error:", error);
      res.status(500).json({ error: "Failed to sync calendar" });
    }
  });

  app.get("/api/calendar/db/upcoming", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = DEFAULT_ORG_ID;
      const { days, accountId, contactId, limit } = req.query;
      const { getUpcomingDbEvents } = await import("./calendar");
      const events = await getUpcomingDbEvents(orgId, {
        days: days ? parseInt(days as string) : undefined,
        accountId: accountId as string,
        contactId: contactId as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(events);
    } catch (error) {
      console.error("Get upcoming db events error:", error);
      res.status(500).json({ error: "Failed to get upcoming events" });
    }
  });

  app.get("/api/calendar/db/past", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = DEFAULT_ORG_ID;
      const { days, limit } = req.query;
      const { getPastDbEvents } = await import("./calendar");
      const events = await getPastDbEvents(orgId, {
        days: days ? parseInt(days as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(events);
    } catch (error) {
      console.error("Get past db events error:", error);
      res.status(500).json({ error: "Failed to get past events" });
    }
  });

  app.get("/api/calendar/db/all", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = DEFAULT_ORG_ID;
      const { getAllDbCalendarEvents } = await import("./calendar");
      const events = await getAllDbCalendarEvents(orgId);
      res.json(events);
    } catch (error) {
      console.error("Get all db events error:", error);
      res.status(500).json({ error: "Failed to get all events" });
    }
  });

  app.get("/api/calendar/db/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = DEFAULT_ORG_ID;
      const { getDbCalendarEvent } = await import("./calendar");
      const event = await getDbCalendarEvent(req.params.id, orgId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Get db event error:", error);
      res.status(500).json({ error: "Failed to get event" });
    }
  });

  app.patch("/api/calendar/db/:id/links", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = DEFAULT_ORG_ID;
      const { accountId, contactId, dealId } = req.body;
      const { updateCalendarEventLinks } = await import("./calendar");
      const event = await updateCalendarEventLinks(req.params.id, orgId, {
        accountId,
        contactId,
        dealId,
      });
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Update event links error:", error);
      res.status(500).json({ error: "Failed to update event links" });
    }
  });

  app.patch("/api/calendar/db/:id/message-status", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = DEFAULT_ORG_ID;
      const { messageType, status } = req.body;
      if (!['preConfirmation', 'reminder', 'thankYou'].includes(messageType)) {
        return res.status(400).json({ error: "Invalid message type" });
      }
      if (!['pending', 'sent', 'skipped', 'failed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const { updateMessageStatus } = await import("./calendar");
      const event = await updateMessageStatus(req.params.id, orgId, messageType, status);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Update message status error:", error);
      res.status(500).json({ error: "Failed to update message status" });
    }
  });

  app.get("/api/calendar/db/needs-messages", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = DEFAULT_ORG_ID;
      const { getEventsNeedingMessages } = await import("./calendar");
      const events = await getEventsNeedingMessages(orgId);
      res.json(events);
    } catch (error) {
      console.error("Get events needing messages error:", error);
      res.status(500).json({ error: "Failed to get events needing messages" });
    }
  });

  // Send meeting message
  app.post("/api/calendar/db/:id/send-message", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = DEFAULT_ORG_ID;
      const { messageType, useAI = true } = req.body;
      
      if (!['preConfirmation', 'reminder', 'thankYou'].includes(messageType)) {
        return res.status(400).json({ error: "Invalid message type" });
      }
      
      const { getDbCalendarEvent, updateMessageStatus } = await import("./calendar");
      const event = await getDbCalendarEvent(req.params.id, orgId);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Get contact/account email
      let recipientEmail: string | null = null;
      let recipientName: string = 'Cher client';
      let companyName: string | undefined;
      
      if (event.contactId) {
        const contact = await storage.getContact(event.contactId, orgId);
        if (contact?.email) {
          recipientEmail = contact.email;
          recipientName = contact.name || 'Cher client';
        }
      }
      
      if (event.accountId) {
        const account = await storage.getAccount(event.accountId, orgId);
        if (account) {
          companyName = account.name;
          if (!recipientEmail && account.contactEmail) {
            recipientEmail = account.contactEmail;
          }
        }
      }
      
      // Fallback to attendees
      if (!recipientEmail && event.attendees && event.attendees.length > 0) {
        recipientEmail = event.attendees[0];
        recipientName = recipientEmail.split('@')[0];
      }
      
      if (!recipientEmail) {
        return res.status(400).json({ error: "No email address found for this event" });
      }
      
      const { sendMeetingEmail } = await import("./gmail");
      const success = await sendMeetingEmail({
        to: recipientEmail,
        recipientName,
        companyName,
        eventTitle: event.title,
        eventDate: new Date(event.start),
        eventTime: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.start)),
        eventLocation: event.location || undefined,
        meetLink: event.meetLink || undefined,
        messageType,
      }, useAI);
      
      if (success) {
        await updateMessageStatus(req.params.id, orgId, messageType, 'sent');
        res.json({ success: true, message: `${messageType} email sent successfully` });
      } else {
        await updateMessageStatus(req.params.id, orgId, messageType, 'failed');
        res.status(500).json({ error: "Failed to send email" });
      }
    } catch (error) {
      console.error("Send meeting message error:", error);
      res.status(500).json({ error: "Failed to send meeting message" });
    }
  });

  // ============================================
  // Google Drive Routes
  // ============================================

  app.get("/api/drive/status", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { testDriveConnection } = await import("./drive");
      const status = await testDriveConnection();
      res.json(status);
    } catch (error) {
      console.error("Drive status error:", error);
      res.status(500).json({ connected: false, error: "Failed to check Drive status" });
    }
  });

  app.get("/api/drive/quotes", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { listQuotes } = await import("./drive");
      const quotes = await listQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("List quotes error:", error);
      res.status(500).json({ error: "Failed to list quotes" });
    }
  });

  app.post("/api/drive/quotes", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { uploadQuoteToDrive } = await import("./drive");
      const { generateQuotePDF } = await import("./pdf");
      
      const { dealName, accountName, contactEmail, amount, probability, missionTypes, nextAction } = req.body;
      
      // Generate PDF
      const pdfBuffer = await generateQuotePDF({
        dealName: dealName || 'Nouveau devis',
        accountName: accountName || 'Client',
        contactEmail: contactEmail || '',
        amount: amount || '0',
        probability: probability || 0,
        missionTypes: missionTypes || ['automatisation'],
        nextAction: nextAction || null
      });
      
      // Sanitize filename
      const sanitizedName = (accountName || 'Client').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s-]/g, '').trim();
      const filename = `Devis_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Upload to Drive
      const driveFile = await uploadQuoteToDrive(pdfBuffer, filename, accountName);
      
      res.status(201).json(driveFile);
    } catch (error) {
      console.error("Upload quote to Drive error:", error);
      res.status(500).json({ error: "Failed to upload quote to Drive" });
    }
  });

  app.get("/api/drive/quotes/:id/download", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { downloadFile } = await import("./drive");
      const buffer = await downloadFile(req.params.id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment');
      res.send(buffer);
    } catch (error) {
      console.error("Download quote error:", error);
      res.status(500).json({ error: "Failed to download quote" });
    }
  });

  app.delete("/api/drive/quotes/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { deleteFile } = await import("./drive");
      await deleteFile(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete quote error:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // ============================================
  // Qonto API Routes (Quote Generation)
  // ============================================

  app.get("/api/qonto/status", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { testQontoConnection } = await import("./qonto");
      const status = await testQontoConnection();
      res.json(status);
    } catch (error) {
      console.error("Qonto status error:", error);
      res.status(500).json({ connected: false, error: "Failed to check Qonto status" });
    }
  });

  app.get("/api/qonto/clients", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { getQontoClients } = await import("./qonto");
      const clients = await getQontoClients();
      res.json(clients);
    } catch (error) {
      console.error("Get Qonto clients error:", error);
      res.status(500).json({ error: "Failed to get Qonto clients" });
    }
  });

  app.get("/api/qonto/quotes", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { getQontoQuotes } = await import("./qonto");
      const quotes = await getQontoQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("Get Qonto quotes error:", error);
      res.status(500).json({ error: "Failed to get Qonto quotes" });
    }
  });

  const createQontoQuoteSchema = z.object({
    clientName: z.string().min(1, "Le nom du client est requis"),
    clientEmail: z.string().email().optional(),
    issueDate: z.string().min(1, "La date d'émission est requise"),
    expiryDate: z.string().min(1, "La date d'expiration est requise"),
    quoteNumber: z.string().optional(),
    items: z.array(z.object({
      title: z.string().min(1, "Le titre est requis"),
      description: z.string().optional(),
      quantity: z.number().positive("La quantité doit être positive"),
      unit: z.string().optional(),
      unitPrice: z.number().min(0, "Le prix doit être positif"),
      vatRate: z.number().min(0).max(100, "Le taux de TVA doit être entre 0 et 100")
    })).min(1, "Au moins un élément est requis"),
    discount: z.object({
      type: z.enum(['percentage', 'absolute']),
      value: z.number().min(0)
    }).optional(),
    header: z.string().optional(),
    footer: z.string().optional(),
    termsAndConditions: z.string().optional()
  });

  app.post("/api/qonto/quotes", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = createQontoQuoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }

      const { createQontoQuote } = await import("./qonto");
      const quote = await createQontoQuote(parsed.data);
      res.status(201).json(quote);
    } catch (error: any) {
      console.error("Create Qonto quote error:", error);
      res.status(500).json({ error: error.message || "Failed to create Qonto quote" });
    }
  });

  app.get("/api/qonto/quotes/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { getQontoQuoteById } = await import("./qonto");
      const quote = await getQontoQuoteById(req.params.id);
      res.json(quote);
    } catch (error) {
      console.error("Get Qonto quote error:", error);
      res.status(500).json({ error: "Failed to get Qonto quote" });
    }
  });

  // Send Qonto quote email to client
  const sendQontoQuoteEmailSchema = z.object({
    clientEmail: z.string().email(),
    clientName: z.string(),
    quoteNumber: z.string(),
    quoteUrl: z.string().url(),
    companyName: z.string(),
  });

  app.post("/api/qonto/quotes/send-email", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = sendQontoQuoteEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }

      const { clientEmail, clientName, quoteNumber, quoteUrl, companyName } = parsed.data;
      
      const { sendGenericEmail } = await import("./gmail");
      
      const subject = `Devis ${quoteNumber} - Capsule IA`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Bonjour ${clientName},</h2>
          <p>Nous avons le plaisir de vous transmettre notre devis <strong>${quoteNumber}</strong> pour ${companyName}.</p>
          <p>Vous pouvez consulter et télécharger votre devis en cliquant sur le bouton ci-dessous :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${quoteUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Voir le devis
            </a>
          </div>
          <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
          <p>Cordialement,<br>L'équipe Capsule IA</p>
        </div>
      `;
      
      await sendGenericEmail({
        to: clientEmail,
        subject,
        htmlBody: htmlContent,
      });
      
      console.log(`Qonto quote email sent to ${clientEmail} for quote ${quoteNumber}`);
      res.json({ success: true, message: `Email envoyé à ${clientEmail}` });
    } catch (error: any) {
      console.error("Send Qonto quote email error:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  // Qonto Finance Overview (balance, income, expenses)
  app.get("/api/qonto/finance/overview", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { getQontoFinanceOverview } = await import("./qonto");
      const overview = await getQontoFinanceOverview();
      res.json(overview);
    } catch (error: any) {
      console.error("Get Qonto finance overview error:", error);
      res.status(500).json({ error: error.message || "Failed to get finance overview" });
    }
  });

  // Generate follow-up messages with AI
  app.post("/api/deals/:id/follow-up/generate", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const dealId = req.params.id;
      
      const deal = await storage.getDeal(dealId, orgId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      let account = null;
      if (deal.accountId) {
        account = await storage.getAccount(deal.accountId, orgId);
      }

      const followUpHistoryList = await storage.getFollowUpHistory(dealId, orgId);
      
      let historyContext = "";
      if (followUpHistoryList.length > 0) {
        historyContext = "\n\nHistorique des échanges précédents:\n";
        for (const entry of followUpHistoryList.slice(0, 10)) {
          const date = entry.sentAt ? new Date(entry.sentAt).toLocaleDateString('fr-FR') : 'Date inconnue';
          const typeLabel = {
            email: 'Email',
            whatsapp: 'WhatsApp',
            call: 'Appel',
            meeting: 'Réunion',
            visio: 'Visio',
            sms: 'SMS'
          }[entry.type] || entry.type;
          
          historyContext += `\n${date} - ${typeLabel}:\n${entry.content.substring(0, 300)}${entry.content.length > 300 ? '...' : ''}`;
          if (entry.response) {
            historyContext += `\n→ Réponse: ${entry.response.substring(0, 200)}${entry.response.length > 200 ? '...' : ''}`;
          }
        }
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const context = `
Informations sur le prospect:
- Nom de l'entreprise: ${deal.accountName || account?.name || 'Non spécifié'}
- Contact: ${deal.contactName || account?.contactName || 'Non spécifié'}
- Email: ${account?.contactEmail || 'Non spécifié'}
- Téléphone: ${deal.contactPhone || account?.contactPhone || 'Non spécifié'}
- Montant du deal: ${deal.amount}€
- Notes du deal: ${deal.notes || 'Aucune note'}
- Notes de relance: ${deal.followUpNotes || 'Aucune note de relance'}
- Types de mission: ${deal.missionTypes?.join(', ') || 'Non spécifié'}
- Dernière action: ${deal.nextAction || 'Aucune'}
${historyContext}`;

      const hasHistory = followUpHistoryList.length > 0;
      const emailPrompt = `Tu es un commercial expert en IA et automatisation. Rédige un email de relance professionnel et chaleureux en français pour ce prospect.

${context}

L'email doit:
- Être personnalisé avec le nom du contact
${hasHistory ? `- Faire référence à nos échanges précédents de manière naturelle (tu as l'historique ci-dessus)
- Montrer que tu as suivi le dossier et que tu te souviens des discussions passées` : `- Rappeler brièvement notre précédent échange (premier contact)`}
- Proposer de reprendre contact
- Être concis (max 150 mots)
- Avoir un ton professionnel mais amical
- Inclure une proposition de valeur liée à l'IA/automatisation
- Terminer avec cette signature exacte:

Cordialement,

Ismael Lepennec
IA Infinity
06 21 00 58 94
https://i-a-infinity.com

Réponds uniquement avec l'email complet incluant la signature.`;

      const whatsappPrompt = `Tu es un commercial expert en IA et automatisation. Rédige un message WhatsApp de relance en français pour ce prospect.

${context}

Le message doit:
- Commencer par une salutation personnalisée avec le prénom du contact
${hasHistory ? `- Faire un clin d'œil à nos échanges précédents pour montrer qu'on se souvient de lui` : `- Premier contact WhatsApp, être chaleureux`}
- Corps du message court et percutant (2-3 phrases max)
- Proposer un appel ou une rencontre
- Être amical mais professionnel
- Terminer avec cette signature exacte (sur des lignes séparées):

---
*Ismael Lepennec*
IA Infinity
06 21 00 58 94
i-a-infinity.com

Réponds uniquement avec le message WhatsApp complet incluant la signature.`;

      const [emailResponse, whatsappResponse] = await Promise.all([
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: emailPrompt }],
          max_completion_tokens: 500,
        }),
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: whatsappPrompt }],
          max_completion_tokens: 300,
        }),
      ]);

      const emailContent = emailResponse.choices[0]?.message?.content || "";
      const whatsappContent = whatsappResponse.choices[0]?.message?.content || "";

      const phone = deal.contactPhone || account?.contactPhone || "";
      const cleanPhone = phone.replace(/[^0-9+]/g, "");
      // Convert French numbers: 06... -> 336..., 07... -> 337...
      let whatsappPhone = cleanPhone.replace(/^\+/, "");
      if (whatsappPhone.startsWith("0") && whatsappPhone.length === 10) {
        whatsappPhone = "33" + whatsappPhone.substring(1);
      }
      const whatsappUrl = whatsappPhone 
        ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappContent)}`
        : null;

      res.json({
        email: {
          subject: `Relance - ${deal.accountName || account?.name || 'Votre projet IA'}`,
          body: emailContent,
          to: account?.contactEmail || "",
        },
        whatsapp: {
          message: whatsappContent,
          phone: whatsappPhone,
          url: whatsappUrl,
        },
        context: {
          accountName: deal.accountName || account?.name,
          contactName: deal.contactName || account?.contactName,
        },
      });
    } catch (error: any) {
      console.error("Generate follow-up error:", error);
      res.status(500).json({ error: error.message || "Failed to generate follow-up messages" });
    }
  });

  // Send follow-up email
  app.post("/api/deals/:id/follow-up/send-email", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const dealId = req.params.id;
      
      const schema = z.object({
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
      });
      
      const parsed = schema.parse(req.body);
      
      const deal = await storage.getDeal(dealId, orgId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const { sendGenericEmail } = await import("./gmail");
      
      // Clean markdown formatting from body (remove ** bold markers)
      let cleanBody = parsed.body
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold** markers
        .replace(/\*([^*]+)\*/g, '$1')      // Remove *italic* markers
        .replace(/_{2}([^_]+)_{2}/g, '$1')  // Remove __bold__ markers
        .replace(/_([^_]+)_/g, '$1');       // Remove _italic_ markers
      
      // Clean subject too
      const cleanSubject = parsed.subject
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1');
      
      // Check if body already contains a signature (to avoid duplicate)
      const hasSignature = cleanBody.toLowerCase().includes('cordialement') || 
                          cleanBody.toLowerCase().includes('ia infinity') ||
                          cleanBody.includes('i-a-infinity.com');
      
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          ${cleanBody.split('\n').map(line => line.trim() ? `<p style="margin: 0 0 10px 0;">${line}</p>` : '<br>').join('')}
          ${!hasSignature ? `
          <br>
          <p style="color: #666; font-size: 14px;">--<br>
          Ismaël Le Pennec<br>
          IA Infinity<br>
          <a href="https://i-a-infinity.com">i-a-infinity.com</a></p>
          ` : ''}
        </div>
      `;
      
      const result = await sendGenericEmail({
        to: parsed.to,
        subject: cleanSubject,
        htmlBody,
      });

      await storage.updateDeal(dealId, orgId, {
        followUpNotes: `Email de relance envoyé le ${new Date().toLocaleDateString('fr-FR')}`,
        prospectStatusUpdatedAt: new Date(),
      });

      await storage.createFollowUpHistory({
        orgId,
        dealId,
        type: 'email',
        subject: cleanSubject,
        content: cleanBody,
        recipientEmail: parsed.to,
        sentAt: new Date(),
      });

      console.log(`Follow-up email sent to ${parsed.to} for deal ${dealId}`);
      res.json({ success: true, messageId: result.messageId });
    } catch (error: any) {
      console.error("Send follow-up email error:", error);
      res.status(500).json({ error: error.message || "Failed to send follow-up email" });
    }
  });

  app.get("/api/deals/:id/follow-up/history", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const dealId = req.params.id;
      
      const history = await storage.getFollowUpHistory(dealId, orgId);
      res.json(history);
    } catch (error: any) {
      console.error("Get follow-up history error:", error);
      res.status(500).json({ error: error.message || "Failed to get follow-up history" });
    }
  });

  app.post("/api/deals/:id/follow-up/history", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const dealId = req.params.id;
      
      const schema = z.object({
        type: z.enum(['email', 'whatsapp', 'call', 'meeting', 'visio', 'sms']),
        subject: z.string().optional(),
        content: z.string(),
        recipientEmail: z.string().optional(),
        recipientPhone: z.string().optional(),
        notes: z.string().optional(),
      });
      
      const parsed = schema.parse(req.body);
      
      const deal = await storage.getDeal(dealId, orgId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const followUp = await storage.createFollowUpHistory({
        orgId,
        dealId,
        type: parsed.type,
        subject: parsed.subject,
        content: parsed.content,
        recipientEmail: parsed.recipientEmail,
        recipientPhone: parsed.recipientPhone,
        sentAt: new Date(),
        notes: parsed.notes,
      });

      res.json(followUp);
    } catch (error: any) {
      console.error("Create follow-up history error:", error);
      res.status(500).json({ error: error.message || "Failed to create follow-up history" });
    }
  });

  app.patch("/api/deals/:dealId/follow-up/history/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { dealId, id } = req.params;
      
      const schema = z.object({
        response: z.string().optional(),
        responseAt: z.coerce.date().optional(),
        notes: z.string().optional(),
      });
      
      const parsed = schema.parse(req.body);
      
      const updated = await storage.updateFollowUpHistory(id, orgId, parsed);
      if (!updated) {
        return res.status(404).json({ error: "Follow-up history not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Update follow-up history error:", error);
      res.status(500).json({ error: error.message || "Failed to update follow-up history" });
    }
  });

  // ==========================================
  // CLIENT PORTAL ROUTES (Secured with authentication)
  // ==========================================

  // Helper to get client info from session
  function getClientInfoFromSession(req: Request): { accountId: string | null } | null {
    if (!req.session.userId) return null;
    const clientRoles = ['client_admin', 'client_member'];
    if (!clientRoles.includes(req.session.role || '')) return null;
    return { accountId: req.session.accountId || null };
  }

  // Get current authenticated client's profile
  app.get("/api/client/me", requireClient, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: req.session.role,
        accountId: req.session.accountId,
      });
    } catch (error) {
      console.error("Get client profile error:", error);
      res.status(500).json({ error: "Failed to get client profile" });
    }
  });

  // Debug route to check client session
  app.get("/api/client/debug-session", requireClient, async (req: Request, res: Response) => {
    res.json({
      userId: req.session.userId,
      email: req.session.email,
      role: req.session.role,
      space: req.session.space,
      accountId: req.session.accountId,
      vendorContactId: req.session.vendorContactId,
      orgId: req.session.orgId,
    });
  });

  // Diagnostic route for a specific user (admin only)
  app.post("/api/admin/diagnostic-user", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }

      const orgId = getOrgId(req);
      const normalizedEmail = email.toLowerCase();

      // Get user
      const user = await storage.getUserByEmail(normalizedEmail);

      if (!user) {
        return res.json({
          found: false,
          email: normalizedEmail,
          message: "User not found in database"
        });
      }

      // Get ALL memberships
      const memberships = await storage.getMembershipsByUser(user.id, orgId);

      // Get all invitations for this email
      const allInvitations = await storage.getInvitations(orgId);
      const userInvitations = allInvitations.filter(inv =>
        inv.email.toLowerCase() === normalizedEmail
      );

      // Get detailed info for each membership
      const membershipDetails = await Promise.all(memberships.map(async (membership) => {
        const details: any = {
          id: membership.id,
          role: membership.role,
          space: membership.space,
          accountId: membership.accountId,
          vendorContactId: membership.vendorContactId,
        };

        // Get account if client
        if (membership.accountId) {
          const account = await storage.getAccount(membership.accountId, orgId);
          details.account = account ? {
            id: account.id,
            name: account.name,
            contactEmail: account.contactEmail,
          } : null;
        }

        // Get vendor/contact if vendor
        if (membership.vendorContactId) {
          const contact = await storage.getContact(membership.vendorContactId, orgId);
          details.vendorContact = contact ? {
            id: contact.id,
            name: contact.name,
            email: contact.email,
            vendorId: contact.vendorId,
          } : null;

          // Get assigned projects for this vendor
          const projectIds = await getVendorProjectIds(orgId, membership.vendorContactId);
          const allProjects = await storage.getProjects(orgId);
          const assignedProjects = allProjects.filter(p => projectIds.includes(p.id));

          details.assignedProjects = assignedProjects.map(p => ({
            id: p.id,
            name: p.name,
            vendorContactId: p.vendorContactId,
            accountId: p.accountId,
          }));
        }

        return details;
      }));

      return res.json({
        found: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          hasPassword: !!user.password,
        },
        memberships: membershipDetails,
        invitations: userInvitations.map(inv => ({
          id: inv.id,
          role: inv.role,
          space: inv.space,
          status: inv.status,
          accountId: inv.accountId,
          vendorId: inv.vendorId,
          createdAt: inv.createdAt,
          usedAt: inv.usedAt,
        })),
      });
    } catch (error) {
      console.error("Diagnostic user error:", error);
      res.status(500).json({ error: "Failed to diagnose user" });
    }
  });

  // Create additional membership for a user (admin only)
  app.post("/api/admin/create-membership", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, role, space, vendorContactId, accountId } = req.body;

      if (!userId || !role || !space) {
        return res.status(400).json({ error: "userId, role, and space are required" });
      }

      const orgId = getOrgId(req);

      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create the membership
      const membership = await storage.createMembership({
        userId,
        orgId,
        role,
        space,
        accountId: accountId || null,
        vendorContactId: vendorContactId || null,
      });

      console.log(`Created additional membership for ${user.email}: ${role} (${space})`);

      return res.json({
        success: true,
        message: `Membership created: ${role} (${space})`,
        membership: {
          id: membership.id,
          role: membership.role,
          space: membership.space,
          accountId: membership.accountId,
          vendorContactId: membership.vendorContactId,
        },
      });
    } catch (error) {
      console.error("Create membership error:", error);
      res.status(500).json({ error: "Failed to create membership" });
    }
  });

  // Delete membership and auto-close account if no more memberships (admin only)
  app.delete("/api/admin/memberships/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const orgId = getOrgId(req);

      // Get membership before deleting
      const allMemberships = await storage.getMemberships(orgId);
      const membership = allMemberships.find(m => m.id === id);

      if (!membership) {
        return res.status(404).json({ error: "Membership not found" });
      }

      const userId = membership.userId;

      // Delete the membership
      await storage.deleteMembership(id, orgId);
      console.log(`Deleted membership ${id} for user ${userId}`);

      // Check if user has other memberships
      const userMemberships = await storage.getMembershipsByUser(userId, orgId);

      if (userMemberships.length === 0) {
        // No more memberships - deactivate user
        await storage.deactivateUser(userId);
        console.log(`User ${userId} deactivated - no more memberships`);

        return res.json({
          success: true,
          message: "Membership deleted and user account closed (no more access)",
          userDeactivated: true,
        });
      }

      return res.json({
        success: true,
        message: "Membership deleted",
        userDeactivated: false,
        remainingMemberships: userMemberships.length,
      });
    } catch (error) {
      console.error("Delete membership error:", error);
      res.status(500).json({ error: "Failed to delete membership" });
    }
  });

  // Clean up orphaned user accounts (no memberships) (admin only)
  app.post("/api/admin/cleanup-orphaned-users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const allMemberships = await storage.getMemberships(orgId);
      const allUsers = await db.select().from(users);

      const usersWithMemberships = new Set(allMemberships.map(m => m.userId));
      const orphanedUsers = allUsers.filter(u => !usersWithMemberships.has(u.id) && u.isActive);

      let deactivated = 0;
      for (const user of orphanedUsers) {
        await storage.deactivateUser(user.id);
        deactivated++;
        console.log(`Deactivated orphaned user: ${user.email}`);
      }

      res.json({
        success: true,
        deactivated,
        orphanedUsers: orphanedUsers.map(u => ({ id: u.id, email: u.email, name: u.name })),
      });
    } catch (error) {
      console.error("Cleanup orphaned users error:", error);
      res.status(500).json({ error: "Failed to cleanup orphaned users" });
    }
  });

  // Fix user role/membership (admin only)
  app.post("/api/admin/fix-user-role", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email, role, space, vendorContactId, accountId } = req.body;

      if (!email || !role || !space) {
        return res.status(400).json({ error: "Email, role, and space are required" });
      }

      const orgId = getOrgId(req);
      const normalizedEmail = email.toLowerCase();

      // Get user
      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get existing membership
      const membership = await storage.getMembershipByUserAndOrg(user.id, orgId);
      if (!membership) {
        return res.status(404).json({ error: "No membership found for this user" });
      }

      // Update membership
      const updates: Partial<any> = {
        role,
        space,
        accountId: accountId || null,
        vendorContactId: vendorContactId || null,
      };

      await storage.updateMembership(membership.id, orgId, updates);

      console.log(`Updated membership for ${email}: role=${role}, space=${space}, accountId=${accountId}, vendorContactId=${vendorContactId}`);

      return res.json({
        success: true,
        message: `User ${email} updated to ${role} (${space})`,
        user: {
          email: user.email,
          name: user.name,
        },
        membership: {
          ...membership,
          ...updates,
        },
      });
    } catch (error) {
      console.error("Fix user role error:", error);
      res.status(500).json({ error: "Failed to fix user role" });
    }
  });

  // Diagnostic complet de l'architecture (admin only)
  app.post("/api/admin/diagnostic-architecture", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);

      // Get all data
      const allProjects = await storage.getProjects(orgId);
      const allAccounts = await storage.getAccounts(orgId);
      const allContacts = await storage.getContacts(orgId);
      const allVendors = await storage.getVendors(orgId);
      const allMemberships = await storage.getMemberships(orgId);

      // Analyze projects
      const projectsWithoutAccount = allProjects.filter(p => !p.accountId);
      const projectsWithAccount = allProjects.filter(p => p.accountId);
      const projectsWithVendor = allProjects.filter(p => p.vendorContactId);
      const projectsWithoutVendor = allProjects.filter(p => !p.vendorContactId);

      // Analyze contacts
      const clientContacts = allContacts.filter(c => c.accountId);
      const vendorContacts = allContacts.filter(c => c.vendorId);
      const vendorContactsWithoutVendorId = allContacts.filter(c => c.contactType === 'vendor' && !c.vendorId);

      // Analyze memberships
      const clientMemberships = allMemberships.filter(m => m.role === 'client_admin' || m.role === 'client_member');
      const vendorMemberships = allMemberships.filter(m => m.role === 'vendor');
      const clientMembershipsWithoutAccount = clientMemberships.filter(m => !m.accountId);
      const vendorMembershipsWithoutContact = vendorMemberships.filter(m => !m.vendorContactId);

      // Check broken relations
      const brokenProjectAccounts = [];
      for (const project of projectsWithAccount) {
        const account = allAccounts.find(a => a.id === project.accountId);
        if (!account) {
          brokenProjectAccounts.push({ projectId: project.id, projectName: project.name, accountId: project.accountId });
        }
      }

      const brokenProjectVendors = [];
      for (const project of projectsWithVendor) {
        const contact = allContacts.find(c => c.id === project.vendorContactId);
        if (!contact) {
          brokenProjectVendors.push({ projectId: project.id, projectName: project.name, vendorContactId: project.vendorContactId });
        } else if (!contact.vendorId) {
          brokenProjectVendors.push({
            projectId: project.id,
            projectName: project.name,
            vendorContactId: project.vendorContactId,
            contactName: contact.name,
            issue: 'Contact has no vendorId'
          });
        }
      }

      res.json({
        summary: {
          projects: {
            total: allProjects.length,
            withAccount: projectsWithAccount.length,
            withoutAccount: projectsWithoutAccount.length,
            withVendor: projectsWithVendor.length,
            withoutVendor: projectsWithoutVendor.length,
            brokenAccountLinks: brokenProjectAccounts.length,
            brokenVendorLinks: brokenProjectVendors.length,
          },
          accounts: {
            total: allAccounts.length,
          },
          contacts: {
            total: allContacts.length,
            client: clientContacts.length,
            vendor: vendorContacts.length,
            vendorWithoutVendorId: vendorContactsWithoutVendorId.length,
          },
          vendors: {
            total: allVendors.length,
          },
          memberships: {
            total: allMemberships.length,
            client: clientMemberships.length,
            vendor: vendorMemberships.length,
            clientWithoutAccount: clientMembershipsWithoutAccount.length,
            vendorWithoutContact: vendorMembershipsWithoutContact.length,
          },
        },
        issues: {
          projectsWithoutAccount: projectsWithoutAccount.map(p => ({ id: p.id, name: p.name })),
          brokenProjectAccounts,
          brokenProjectVendors,
          vendorContactsWithoutVendorId: vendorContactsWithoutVendorId.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email
          })),
          clientMembershipsWithoutAccount: clientMembershipsWithoutAccount.map(m => ({
            id: m.id,
            userId: m.userId,
            role: m.role
          })),
          vendorMembershipsWithoutContact: vendorMembershipsWithoutContact.map(m => ({
            id: m.id,
            userId: m.userId,
            role: m.role
          })),
        },
        details: {
          allProjects: allProjects.map(p => ({
            id: p.id,
            name: p.name,
            accountId: p.accountId,
            vendorContactId: p.vendorContactId,
            status: p.status,
          })),
          allAccounts: allAccounts.map(a => ({ id: a.id, name: a.name })),
          allVendors: allVendors.map(v => ({ id: v.id, name: v.name })),
          vendorContacts: vendorContacts.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            vendorId: c.vendorId
          })),
        },
      });
    } catch (error) {
      console.error("Diagnostic architecture error:", error);
      res.status(500).json({ error: "Failed to diagnose architecture" });
    }
  });

  // Auto-fix architecture issues (admin only)
  app.post("/api/admin/fix-architecture", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const fixes = {
        projectsLinked: 0,
        contactsFixed: 0,
        membershipsFixed: 0,
        errors: [] as string[],
      };

      // Get all data
      const allProjects = await storage.getProjects(orgId);
      const allAccounts = await storage.getAccounts(orgId);
      const allContacts = await storage.getContacts(orgId);
      const allVendors = await storage.getVendors(orgId);
      const allMemberships = await storage.getMemberships(orgId);

      // Fix 1: Link projects without accountId to a default account
      const projectsWithoutAccount = allProjects.filter(p => !p.accountId);
      if (projectsWithoutAccount.length > 0) {
        // Try to find a default account or create one
        let defaultAccount = allAccounts.find(a => a.name.toLowerCase().includes('default') || a.name.toLowerCase().includes('interne'));

        if (!defaultAccount && allAccounts.length > 0) {
          // Use first account as default
          defaultAccount = allAccounts[0];
        }

        if (defaultAccount) {
          for (const project of projectsWithoutAccount) {
            try {
              await storage.updateProject(project.id, orgId, { accountId: defaultAccount.id });
              fixes.projectsLinked++;
              console.log(`✓ Linked project "${project.name}" to account "${defaultAccount.name}"`);
            } catch (error) {
              fixes.errors.push(`Failed to link project ${project.name}: ${error}`);
            }
          }
        } else {
          fixes.errors.push(`No default account found to link ${projectsWithoutAccount.length} projects`);
        }
      }

      // Fix 2: Link vendor contacts without vendorId
      const vendorContacts = allContacts.filter(c => c.contactType === 'vendor');
      for (const contact of vendorContacts) {
        if (!contact.vendorId) {
          // Try to find a vendor by matching name or email
          const matchingVendor = allVendors.find(v =>
            contact.name?.toLowerCase().includes(v.name.toLowerCase()) ||
            v.name.toLowerCase().includes(contact.name?.toLowerCase() || '') ||
            contact.email?.toLowerCase().includes(v.name.toLowerCase())
          );

          if (matchingVendor) {
            try {
              await storage.updateContact(contact.id, orgId, { vendorId: matchingVendor.id });
              fixes.contactsFixed++;
              console.log(`✓ Linked contact "${contact.name}" to vendor "${matchingVendor.name}"`);
            } catch (error) {
              fixes.errors.push(`Failed to link contact ${contact.name}: ${error}`);
            }
          } else {
            // If no vendor found, try to create one from the contact info
            try {
              const newVendor = await storage.createVendor({
                orgId,
                name: contact.name,
                email: contact.email,
                phone: contact.phone || undefined,
                description: `Auto-created from contact ${contact.name}`,
              });
              await storage.updateContact(contact.id, orgId, { vendorId: newVendor.id });
              fixes.contactsFixed++;
              console.log(`✓ Created vendor and linked contact "${contact.name}"`);
            } catch (error) {
              fixes.errors.push(`Failed to create vendor for contact ${contact.name}: ${error}`);
            }
          }
        }
      }

      // Fix 3: Fix vendor memberships without vendorContactId
      const vendorMemberships = allMemberships.filter(m => m.role === 'vendor' && !m.vendorContactId);
      for (const membership of vendorMemberships) {
        // Try to find a contact for this user's email
        const user = await storage.getUser(membership.userId);
        if (user) {
          const matchingContact = allContacts.find(c =>
            c.email.toLowerCase() === user.email.toLowerCase() &&
            c.contactType === 'vendor'
          );

          if (matchingContact) {
            try {
              await storage.updateMembership(membership.id, orgId, { vendorContactId: matchingContact.id });
              fixes.membershipsFixed++;
              console.log(`✓ Linked membership for "${user.email}" to contact "${matchingContact.name}"`);
            } catch (error) {
              fixes.errors.push(`Failed to link membership for ${user.email}: ${error}`);
            }
          } else {
            fixes.errors.push(`No vendor contact found for user ${user.email}`);
          }
        }
      }

      // Fix 4: Fix client memberships without accountId
      const clientMemberships = allMemberships.filter(m =>
        (m.role === 'client_admin' || m.role === 'client_member') && !m.accountId
      );
      for (const membership of clientMemberships) {
        const user = await storage.getUser(membership.userId);
        if (user) {
          // Try to find a contact for this user
          const matchingContact = allContacts.find(c =>
            c.email.toLowerCase() === user.email.toLowerCase() &&
            c.accountId
          );

          if (matchingContact && matchingContact.accountId) {
            try {
              await storage.updateMembership(membership.id, orgId, { accountId: matchingContact.accountId });
              fixes.membershipsFixed++;
              console.log(`✓ Linked client membership for "${user.email}" to account`);
            } catch (error) {
              fixes.errors.push(`Failed to link client membership for ${user.email}: ${error}`);
            }
          } else {
            fixes.errors.push(`No account contact found for client user ${user.email}`);
          }
        }
      }

      res.json({
        success: true,
        fixes,
        message: `Fixed ${fixes.projectsLinked} projects, ${fixes.contactsFixed} contacts, ${fixes.membershipsFixed} memberships`,
      });
    } catch (error) {
      console.error("Fix architecture error:", error);
      res.status(500).json({ error: "Failed to fix architecture" });
    }
  });

  // Fix client memberships without accountId (admin only)
  app.post("/api/admin/fix-client-memberships", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);

      // Get all accounts
      const accounts = await storage.getAccounts(orgId);
      let fixed = 0;
      let errors = 0;

      for (const account of accounts) {
        if (!account.contactEmail) continue;

        // Find user by email
        const user = await storage.getUserByEmail(account.contactEmail.toLowerCase());
        if (!user) continue;

        // Check membership
        const membership = await storage.getMembershipByUserAndOrg(user.id, orgId);
        if (membership && !membership.accountId && (membership.role === 'client_admin' || membership.role === 'client_member')) {
          try {
            // Update membership with accountId
            await storage.updateMembership(membership.id, orgId, { accountId: account.id });
            console.log(`Fixed membership for ${user.email} - linked to account ${account.name}`);
            fixed++;
          } catch (error) {
            console.error(`Failed to fix membership for ${user.email}:`, error);
            errors++;
          }
        }
      }

      res.json({
        success: true,
        message: `Fixed ${fixed} client memberships`,
        fixed,
        errors,
      });
    } catch (error) {
      console.error("Fix client memberships error:", error);
      res.status(500).json({ error: "Failed to fix client memberships" });
    }
  });

  // Get client's account information
  app.get("/api/client/account", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        console.error("Client session missing accountId:", {
          userId: req.session.userId,
          email: req.session.email,
          role: req.session.role,
        });
        return res.status(403).json({
          error: "No account linked to your profile",
          debug: {
            userId: req.session.userId,
            role: req.session.role,
            email: req.session.email,
          }
        });
      }

      const account = await storage.getAccount(accountId, orgId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      res.json(account);
    } catch (error) {
      console.error("Get client account error:", error);
      res.status(500).json({ error: "Failed to get client account" });
    }
  });

  // Get projects for client's account only
  app.get("/api/client/projects", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;
      
      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }
      
      const allProjects = await storage.getProjects(orgId);
      const clientProjects = allProjects.filter(p => p.accountId === accountId);
      
      res.json(clientProjects);
    } catch (error) {
      console.error("Get client projects error:", error);
      res.status(500).json({ error: "Failed to get client projects" });
    }
  });

  // Get documents for client's account and projects only
  app.get("/api/client/documents", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;
      
      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }
      
      const allProjects = await storage.getProjects(orgId);
      const clientProjects = allProjects.filter(p => p.accountId === accountId);
      const clientProjectIds = clientProjects.map(p => p.id);
      
      const allDocuments = await storage.getDocuments(orgId);
      const clientDocuments = allDocuments.filter(d => 
        (d.accountId === accountId) ||
        (d.projectId && clientProjectIds.includes(d.projectId))
      );
      
      res.json(clientDocuments);
    } catch (error) {
      console.error("Get client documents error:", error);
      res.status(500).json({ error: "Failed to get client documents" });
    }
  });

  // Get quotes for client's account
  app.get("/api/client/quotes", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;
      
      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }
      
      const allQuotes = await storage.getQuotes(orgId);
      const clientQuotes = allQuotes.filter(q => q.accountId === accountId);
      
      res.json(clientQuotes);
    } catch (error) {
      console.error("Get client quotes error:", error);
      res.status(500).json({ error: "Failed to get client quotes" });
    }
  });

  // Get contracts for client's account (read-only)
  app.get("/api/client/contracts", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }

      const allContracts = await storage.getContracts(orgId);
      const clientContracts = allContracts.filter(c => c.accountId === accountId);

      res.json(clientContracts);
    } catch (error) {
      console.error("Get client contracts error:", error);
      res.status(500).json({ error: "Failed to get client contracts" });
    }
  });

  // Get invoices for client's account only (read-only)
  app.get("/api/client/invoices", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }

      const allInvoices = await storage.getInvoices(orgId);
      const clientInvoices = allInvoices.filter(i => i.accountId === accountId);

      res.json(clientInvoices);
    } catch (error) {
      console.error("Get client invoices error:", error);
      res.status(500).json({ error: "Failed to get client invoices" });
    }
  });

  // ==========================================
  // CLIENT TEAM MANAGEMENT ROUTES (Client Admin only)
  // ==========================================

  // Get team members for client account
  app.get("/api/client/team", requireClient, requireClientAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        return res.status(403).json({ error: "Aucun compte associé" });
      }

      // Get all memberships for this account
      const allMemberships = await storage.getMembershipsByOrg(orgId);
      const teamMemberships = allMemberships.filter(m => m.accountId === accountId);

      // Fetch user details for each membership
      const membersWithUsers = await Promise.all(
        teamMemberships.map(async (m) => {
          const user = await storage.getUser(m.userId);
          return {
            id: m.id,
            userId: m.userId,
            role: m.role,
            space: m.space,
            user: user ? {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
            } : null
          };
        })
      );

      res.json(membersWithUsers);
    } catch (error) {
      console.error("Get team error:", error);
      res.status(500).json({ error: "Échec de récupération de l'équipe" });
    }
  });

  // Get pending invitations for account
  app.get("/api/client/team/invitations", requireClient, requireClientAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        return res.status(403).json({ error: "Aucun compte associé" });
      }

      const allInvitations = await storage.getInvitations(orgId, "pending");
      const accountInvitations = allInvitations.filter(i => i.accountId === accountId);

      res.json(accountInvitations);
    } catch (error) {
      console.error("Get invitations error:", error);
      res.status(500).json({ error: "Échec de récupération des invitations" });
    }
  });

  // Invite new team member (client_member only)
  app.post("/api/client/team/invite", requireClient, requireClientAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        return res.status(403).json({ error: "Aucun compte associé" });
      }

      const { email, name } = req.body;

      // Validate email
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Email valide requis" });
      }

      const normalizedEmail = email.toLowerCase();

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        const membership = await storage.getMembershipByUserAndOrg(existingUser.id, orgId);
        if (membership && membership.accountId === accountId) {
          return res.status(400).json({ error: "Cet utilisateur fait déjà partie de l'équipe" });
        }
      }

      // Create invitation
      const token = generateToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const invitation = await storage.createInvitation({
        orgId,
        email: normalizedEmail,
        name: name || null,
        role: 'client_member',
        space: 'client',
        tokenHash,
        expiresAt,
        status: 'pending',
        accountId,
        vendorId: null,
        createdById: req.session.userId!,
      });

      // Send invitation email
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const inviteLink = `${baseUrl}/auth/accept-invite?token=${token}`;

      try {
        await sendInvitationEmail({
          to: normalizedEmail,
          inviteLink,
          role: 'client_member',
          space: 'client',
          expiresAt,
          organizationName: 'IA Infinity',
        });
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        // Continue anyway - invitation is created
      }

      res.status(201).json({ success: true, invitation });
    } catch (error) {
      console.error("Invite team member error:", error);
      res.status(500).json({ error: "Échec de l'invitation" });
    }
  });

  // Revoke team member invitation
  app.delete("/api/client/team/invitations/:id", requireClient, requireClientAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        return res.status(403).json({ error: "Aucun compte associé" });
      }

      // Verify invitation belongs to this account
      const allInvitations = await storage.getInvitations(orgId);
      const invitation = allInvitations.find(i => i.id === req.params.id);

      if (!invitation || !invitation.accountId || invitation.accountId !== accountId) {
        return res.status(403).json({ error: "Accès refusé" });
      }

      await storage.updateInvitation(req.params.id, orgId, { status: 'cancelled' });
      res.status(204).send();
    } catch (error) {
      console.error("Revoke invitation error:", error);
      res.status(500).json({ error: "Échec de révocation de l'invitation" });
    }
  });

  // ==========================================
  // CLIENT TASKS ROUTES
  // ==========================================

  // Get tasks for client's projects only
  app.get("/api/client/tasks", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }

      const allProjects = await storage.getProjects(orgId);
      const clientProjects = allProjects.filter(p => p.accountId === accountId);
      const clientProjectIds = clientProjects.map(p => p.id);

      const allTasks = await storage.getTasks(orgId);
      const clientTasks = allTasks.filter(t => t.projectId && clientProjectIds.includes(t.projectId));

      res.json(clientTasks);
    } catch (error) {
      console.error("Get client tasks error:", error);
      res.status(500).json({ error: "Failed to get client tasks" });
    }
  });

  // Create task for client's project
  app.post("/api/client/tasks", requireClient, requireWriteAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }

      const { projectId } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      // Verify user has access to this project (client or vendor)
      const project = await storage.getProject(projectId, orgId);
      if (!await hasProjectAccess(project, req)) {
        return res.status(403).json({ error: "Access denied to this project" });
      }

      const data = insertTaskSchema.parse({ ...req.body, orgId });
      const task = await storage.createTask(data);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create client task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Update task for client's project
  app.patch("/api/client/tasks/:id", requireClient, requireWriteAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }

      // Get the task and verify it belongs to a client project
      const existingTask = await storage.getTask(req.params.id, orgId);
      if (!existingTask || !existingTask.projectId) {
        return res.status(404).json({ error: "Task not found" });
      }

      const project = await storage.getProject(existingTask.projectId, orgId);
      if (!await hasProjectAccess(project, req)) {
        return res.status(403).json({ error: "Access denied to this task" });
      }

      const task = await storage.updateTask(req.params.id, orgId, req.body);
      res.json(task);
    } catch (error) {
      console.error("Update client task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Delete task for client's project
  app.delete("/api/client/tasks/:id", requireClient, requireWriteAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }

      // Get the task and verify it belongs to a client project
      const existingTask = await storage.getTask(req.params.id, orgId);
      if (!existingTask || !existingTask.projectId) {
        return res.status(404).json({ error: "Task not found" });
      }

      const project = await storage.getProject(existingTask.projectId, orgId);
      if (!await hasProjectAccess(project, req)) {
        return res.status(403).json({ error: "Access denied to this task" });
      }

      await storage.deleteTask(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete client task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Get dashboard stats for client
  app.get("/api/client/dashboard", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;
      
      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }
      
      const allProjects = await storage.getProjects(orgId);
      const clientProjects = allProjects.filter(p => p.accountId === accountId);
      
      const clientProjectIds = clientProjects.map(p => p.id);
      const allTasks = await storage.getTasks(orgId);
      const clientTasks = allTasks.filter(t => t.projectId && clientProjectIds.includes(t.projectId));
      
      const activeProjects = clientProjects.filter(p => p.status === 'active').length;
      const completedProjects = clientProjects.filter(p => p.status === 'completed').length;
      const completedTasks = clientTasks.filter(t => t.status === 'completed').length;
      const totalTasks = clientTasks.length;
      
      const projectsWithProgress = clientProjects.filter(p => typeof p.progress === 'number');
      const avgProgress = projectsWithProgress.length > 0 
        ? Math.round(projectsWithProgress.reduce((sum, p) => sum + (p.progress || 0), 0) / projectsWithProgress.length)
        : 0;
      
      res.json({
        projects: {
          total: clientProjects.length,
          active: activeProjects,
          completed: completedProjects,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
        averageProgress: avgProgress,
      });
    } catch (error) {
      console.error("Get client dashboard error:", error);
      res.status(500).json({ error: "Failed to get client dashboard" });
    }
  });

  // Get single project details for client
  app.get("/api/client/projects/:id", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;
      const projectId = req.params.id;
      
      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }
      
      const project = await storage.getProject(projectId, orgId);
      if (!await hasProjectAccess(project, req)) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get tasks for this project
      const allTasks = await storage.getTasks(orgId);
      const projectTasks = allTasks.filter(t => t.projectId === projectId);
      
      // Get missions for this project
      const allMissions = await storage.getMissions(orgId);
      const projectMissions = allMissions.filter(m => m.projectId === projectId);
      
      // Get documents for this project
      const allDocuments = await storage.getDocuments(orgId);
      const projectDocuments = allDocuments.filter(d => d.projectId === projectId);
      
      // Get comments for this project
      const comments = await storage.getProjectComments(projectId, orgId);

      // Get user info for comments
      const commentUsers = await Promise.all(
        comments.map(async (c) => {
          const user = await storage.getUser(c.userId);
          return { ...c, userName: user?.name || 'Utilisateur' };
        })
      );

      // Get all vendors for the organization
      const allVendors = await storage.getVendors(orgId);

      res.json({
        project,
        tasks: projectTasks,
        missions: projectMissions,
        documents: projectDocuments,
        comments: commentUsers,
        vendors: allVendors,
      });
    } catch (error) {
      console.error("Get client project detail error:", error);
      res.status(500).json({ error: "Failed to get project details" });
    }
  });

  // Add comment to project (client)
  app.post("/api/client/projects/:id/comments", requireClient, requireWriteAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;
      const userId = req.session.userId;
      const projectId = req.params.id;
      const { content } = req.body;
      
      if (!accountId || !userId) {
        return res.status(403).json({ error: "Not authenticated" });
      }
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }
      
      const project = await storage.getProject(projectId, orgId);
      if (!await hasProjectAccess(project, req)) {
        return res.status(404).json({ error: "Project not found" });
      }

      const comment = await storage.createProjectComment({
        orgId,
        projectId,
        userId,
        content: content.trim(),
        isFromClient: true,
      });

      const user = await storage.getUser(userId);

      // Send notification to stakeholders
      await notifyProjectComment({
        orgId,
        projectId,
        commentId: comment.id,
        authorId: userId,
        authorName: user?.name || 'Utilisateur',
        content: content.trim(),
        isFromClient: true,
      });

      res.status(201).json({ ...comment, userName: user?.name || 'Utilisateur' });
    } catch (error) {
      console.error("Create project comment error:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Get project updates (CR) for client - READ ONLY
  app.get("/api/client/projects/:id/updates", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;
      const projectId = req.params.id;

      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }

      const project = await storage.getProject(projectId, orgId);
      if (!await hasProjectAccess(project, req)) {
        return res.status(404).json({ error: "Project not found" });
      }

      const updates = await storage.getProjectUpdates(projectId, orgId);
      res.json(updates);
    } catch (error) {
      console.error("Get client project updates error:", error);
      res.status(500).json({ error: "Failed to get project updates" });
    }
  });

  // Get project deliverables for client - READ ONLY
  app.get("/api/client/projects/:id/deliverables", requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;
      const projectId = req.params.id;

      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }

      const project = await storage.getProject(projectId, orgId);
      if (!await hasProjectAccess(project, req)) {
        return res.status(404).json({ error: "Project not found" });
      }

      const deliverables = await storage.getProjectDeliverables(projectId, orgId);
      res.json(deliverables);
    } catch (error) {
      console.error("Get client project deliverables error:", error);
      res.status(500).json({ error: "Failed to get project deliverables" });
    }
  });

  // Client can request revision on a deliverable (update status and add comment)
  app.post("/api/client/projects/:id/deliverables/:deliverableId/request-revision", requireClient, requireWriteAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;
      const projectId = req.params.id;
      const deliverableId = req.params.deliverableId;
      const { comment } = req.body;

      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }

      if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
        return res.status(400).json({ error: "Comment is required for revision request" });
      }

      const project = await storage.getProject(projectId, orgId);
      if (!await hasProjectAccess(project, req)) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Update deliverable with revision request
      const updated = await storage.updateProjectDeliverable(deliverableId, orgId, {
        status: 'revision_requested',
        clientComment: comment.trim(),
      });

      res.json(updated);
    } catch (error) {
      console.error("Request revision error:", error);
      res.status(500).json({ error: "Failed to request revision" });
    }
  });

  // Client can approve a deliverable
  app.post("/api/client/projects/:id/deliverables/:deliverableId/approve", requireClient, requireWriteAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;
      const projectId = req.params.id;
      const deliverableId = req.params.deliverableId;

      if (!accountId) {
        return res.status(403).json({ error: "No account linked" });
      }

      const project = await storage.getProject(projectId, orgId);
      if (!await hasProjectAccess(project, req)) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Update deliverable status to approved
      const updated = await storage.updateProjectDeliverable(deliverableId, orgId, {
        status: 'approved',
      });

      res.json(updated);
    } catch (error) {
      console.error("Approve deliverable error:", error);
      res.status(500).json({ error: "Failed to approve deliverable" });
    }
  });

  // ==========================================
  // VENDOR PORTAL ROUTES (Secured with authentication)
  // ==========================================

  // Middleware to log all vendor API calls
  app.use("/api/vendor/*", (req: Request, res: Response, next: NextFunction) => {
    console.log(`🔵 VENDOR API: ${req.method} ${req.path}`, {
      session: {
        userId: req.session.userId,
        role: req.session.role,
        vendorContactId: req.session.vendorContactId,
      },
      params: req.params,
      query: req.query,
    });
    next();
  });

  // Helper function to check vendor project access
  async function checkVendorProjectAccess(
    vendorContactId: string,
    projectId: string,
    orgId: string
  ): Promise<{ hasAccess: boolean; project?: any; error?: string }> {
    const project = await storage.getProject(projectId, orgId);
    if (!project) {
      return { hasAccess: false, error: "Projet non trouvé" };
    }

    const contact = await storage.getContact(vendorContactId, orgId);
    if (!contact) {
      return { hasAccess: false, error: "Contact vendor non trouvé" };
    }

    // Check access: specific vendorContactId OR vendorId fallback
    const hasAccess = project.vendorContactId === vendorContactId ||
      (!project.vendorContactId && project.vendorId === contact.vendorId);

    return { hasAccess, project };
  }

  // Get projects assigned to authenticated vendor
  app.get("/api/vendor/projects", requireVendor, async (req: Request, res: Response) => {
    try {
      console.log("🔍 GET /api/vendor/projects called");
      console.log("🔍 Session:", {
        userId: req.session.userId,
        role: req.session.role,
        vendorContactId: req.session.vendorContactId,
      });

      const context = getAccessContext(req);
      console.log("🔍 Context:", context);

      const allProjects = await storage.getProjects(context.orgId);
      console.log("🔍 All projects:", allProjects.length);

      const vendorProjects = await filterProjectsByAccess(allProjects, context);
      console.log("🔍 Filtered projects:", vendorProjects.length);

      res.json(vendorProjects);
    } catch (error) {
      console.error("Get vendor projects error:", error);
      res.status(500).json({ error: "Failed to get vendor projects" });
    }
  });

  // Update project (vendor can only modify projects specifically assigned to them)
  app.patch("/api/vendor/projects/:projectId", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;

      // Get existing project for comparison
      const existingProject = await storage.getProject(projectId, orgId);
      if (!existingProject) {
        return res.status(404).json({ error: "Projet non trouvé" });
      }

      // Define which fields vendors are allowed to update
      const allowedFields = {
        status: req.body.status,
        progress: req.body.progress,
        description: req.body.description,
        deliverySteps: req.body.deliverySteps,
      };

      // Remove undefined fields
      const updateData = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "Aucun champ à mettre à jour" });
      }

      const updatedProject = await storage.updateProject(projectId, orgId, updateData);

      if (!updatedProject) {
        return res.status(404).json({ error: "Projet non trouvé" });
      }

      // Notify if project status changed
      if (updateData.status && updateData.status !== existingProject.status) {
        await notifyProjectStatusChange({
          orgId,
          projectId: updatedProject.id,
          projectName: updatedProject.name,
          oldStatus: existingProject.status,
          newStatus: updateData.status,
          changedBy: req.session.userId!,
        });
      }

      res.json(updatedProject);
    } catch (error) {
      console.error("Update vendor project error:", error);
      res.status(500).json({ error: "Échec de la mise à jour du projet" });
    }
  });

  // DIAGNOSTIC: Test all vendor routes
  app.get("/api/vendor/test-routes", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;

      const tests = {
        session: {
          userId: req.session.userId,
          role: req.session.role,
          vendorContactId: req.session.vendorContactId,
          email: req.session.email,
        },
        routes: {
          "/api/vendor/projects": "OK",
          "/api/vendor/tasks": "OK",
          "/api/vendor/documents": "OK",
          "/api/vendor/contracts": "OK",
          "/api/vendor/invoices": "OK",
          "/api/vendor/missions": "OK",
          "/api/vendor/accounts": "OK",
          "/api/vendor/channels": "OK",
          "/api/vendor/dashboard": "OK",
        },
        middleware: {
          requireVendor: "PASSED",
        }
      };

      res.json(tests);
    } catch (error) {
      console.error("Test routes error:", error);
      res.status(500).json({ error: "Test failed", details: error });
    }
  });

  // DIAGNOSTIC: Check vendor session and project assignments
  app.get("/api/vendor/debug", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;
      const userId = req.session.userId;

      // Get vendor contact info
      let vendorContact = null;
      if (vendorContactId) {
        vendorContact = await storage.getContact(vendorContactId, orgId);
      }

      // Get user memberships
      const memberships = await storage.getMembershipsByOrg(orgId);
      const userMembership = memberships.find(m => m.userId === userId);

      // Get all projects
      const allProjects = await storage.getProjects(orgId);

      res.json({
        session: {
          userId,
          vendorContactId,
          role: req.session.role,
          email: req.session.email,
        },
        vendorContact: vendorContact ? {
          id: vendorContact.id,
          name: vendorContact.name,
          email: vendorContact.email,
          vendorId: vendorContact.vendorId,
          authUserId: vendorContact.authUserId,
        } : null,
        membership: userMembership ? {
          id: userMembership.id,
          role: userMembership.role,
          vendorContactId: userMembership.vendorContactId,
        } : null,
        projects: allProjects.map(p => ({
          id: p.id,
          name: p.name,
          vendorContactId: p.vendorContactId,
          vendorId: p.vendorId,
          hasVendorContactId: !!p.vendorContactId,
          matchesSession: p.vendorContactId === vendorContactId,
        })),
      });
    } catch (error) {
      console.error("Vendor debug error:", error);
      res.status(500).json({ error: "Debug failed" });
    }
  });

  // Get accounts/clients for projects assigned to authenticated vendor
  app.get("/api/vendor/accounts", requireVendor, async (req: Request, res: Response) => {
    try {
      const context = getAccessContext(req);
      const allAccounts = await storage.getAccounts(context.orgId);
      const vendorAccounts = await filterAccountsByAccess(allAccounts, context);

      res.json(vendorAccounts);
    } catch (error) {
      console.error("Get vendor accounts error:", error);
      res.status(500).json({ error: "Failed to get vendor accounts" });
    }
  });

  // Get documents for projects assigned to authenticated vendor
  app.get("/api/vendor/documents", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "No vendor profile linked" });
      }

      // Use the corrected function to get vendor project IDs
      const vendorProjectIds = await getVendorProjectIds(orgId, vendorContactId);

      const allProjects = await storage.getProjects(orgId);
      const vendorProjects = allProjects.filter(p => vendorProjectIds.includes(p.id));

      const accountIdsList = vendorProjects.map(p => p.accountId).filter((id): id is string => id !== null);
      const uniqueAccountIds = Array.from(new Set(accountIdsList));

      const allDocuments = await storage.getDocuments(orgId);

      const vendorDocuments = allDocuments.filter(d =>
        (d.projectId && vendorProjectIds.includes(d.projectId)) ||
        (d.accountId && uniqueAccountIds.includes(d.accountId))
      );

      res.json(vendorDocuments);
    } catch (error) {
      console.error("Get vendor documents error:", error);
      res.status(500).json({ error: "Failed to get vendor documents" });
    }
  });

  // Get missions for projects assigned to authenticated vendor
  app.get("/api/vendor/missions", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "No vendor profile linked" });
      }

      // Use the corrected function to get vendor project IDs
      const vendorProjectIds = await getVendorProjectIds(orgId, vendorContactId);

      const allMissions = await storage.getMissions(orgId);
      const vendorMissions = allMissions.filter(m => m.projectId && vendorProjectIds.includes(m.projectId));

      res.json(vendorMissions);
    } catch (error) {
      console.error("Get vendor missions error:", error);
      res.status(500).json({ error: "Failed to get vendor missions" });
    }
  });

  // Get tasks for projects assigned to authenticated vendor
  app.get("/api/vendor/tasks", requireVendor, async (req: Request, res: Response) => {
    try {
      const context = getAccessContext(req);
      const allTasks = await storage.getTasks(context.orgId);
      const vendorTasks = await filterTasksByAccess(allTasks, context);

      res.json(vendorTasks);
    } catch (error) {
      console.error("Get vendor tasks error:", error);
      res.status(500).json({ error: "Failed to get vendor tasks" });
    }
  });

  // Get vendor portal summary/dashboard stats
  app.get("/api/vendor/dashboard", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "No vendor profile linked" });
      }

      // Use the corrected function to get vendor project IDs
      const vendorProjectIds = await getVendorProjectIds(orgId, vendorContactId);

      const allProjects = await storage.getProjects(orgId);
      const vendorProjects = allProjects.filter(p => vendorProjectIds.includes(p.id));

      const allMissions = await storage.getMissions(orgId);
      const vendorMissions = allMissions.filter(m => m.projectId && vendorProjectIds.includes(m.projectId));

      const allTasks = await storage.getTasks(orgId);
      const vendorTasks = allTasks.filter(t => t.projectId && vendorProjectIds.includes(t.projectId));

      const activeProjects = vendorProjects.filter(p => p.status === 'active').length;
      const completedProjects = vendorProjects.filter(p => p.status === 'completed').length;
      const activeMissions = vendorMissions.filter(m => m.status === 'in_progress').length;
      const pendingMissions = vendorMissions.filter(m => m.status === 'pending').length;
      const completedTasks = vendorTasks.filter(t => t.status === 'completed').length;
      const totalTasks = vendorTasks.length;

      res.json({
        projects: {
          total: vendorProjects.length,
          active: activeProjects,
          completed: completedProjects,
        },
        missions: {
          total: vendorMissions.length,
          active: activeMissions,
          pending: pendingMissions,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
      });
    } catch (error) {
      console.error("Get vendor dashboard error:", error);
      res.status(500).json({ error: "Failed to get vendor dashboard" });
    }
  });

  // Get current authenticated vendor's profile
  app.get("/api/vendor/me", requireVendor, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: req.session.role,
        vendorContactId: req.session.vendorContactId,
      });
    } catch (error) {
      console.error("Get vendor profile error:", error);
      res.status(500).json({ error: "Failed to get vendor profile" });
    }
  });

  // Get contracts for vendor's assigned projects (read-only)
  app.get("/api/vendor/contracts", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "No vendor profile linked" });
      }

      // Get the vendor ID from the contact
      const allContacts = await storage.getContacts(orgId);
      const contact = allContacts.find(c => c.id === vendorContactId);
      const actualVendorId = contact?.vendorId;

      // Use the corrected function to get vendor project IDs
      const vendorProjectIds = await getVendorProjectIds(orgId, vendorContactId);

      // Get contracts linked to these projects or to the vendor
      const allContracts = await storage.getContracts(orgId);
      const vendorContracts = allContracts.filter(c =>
        (c.projectId && vendorProjectIds.includes(c.projectId)) ||
        (actualVendorId && c.vendorId === actualVendorId)
      );

      res.json(vendorContracts);
    } catch (error) {
      console.error("Get vendor contracts error:", error);
      res.status(500).json({ error: "Failed to get vendor contracts" });
    }
  });

  // Get vendor's own invoices (invoices they submitted)
  app.get("/api/vendor/invoices", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "No vendor profile linked" });
      }

      // Get the actual vendor ID from the contact
      const allContacts = await storage.getContacts(orgId);
      const contact = allContacts.find(c => c.id === vendorContactId);
      const actualVendorId = contact?.vendorId;

      if (!actualVendorId) {
        return res.json([]); // No vendor ID, no invoices
      }

      // Get invoices submitted by this vendor
      const allInvoices = await storage.getInvoices(orgId);
      const vendorInvoices = allInvoices.filter(i => i.vendorId === actualVendorId);

      res.json(vendorInvoices);
    } catch (error) {
      console.error("Get vendor invoices error:", error);
      res.status(500).json({ error: "Failed to get vendor invoices" });
    }
  });

  // Upload invoice file (PDF or Image) to Google Drive
  app.post("/api/vendor/invoices/upload", requireVendor, async (req: Request, res: Response) => {
    try {
      const { fileData, fileName, mimeType } = req.body;

      // Validate file type
      if (!mimeType || (!mimeType.includes('pdf') && !mimeType.includes('image'))) {
        return res.status(400).json({ error: "Seuls les PDF et images sont acceptés" });
      }

      // Validate required fields
      if (!fileData || !fileName) {
        return res.status(400).json({ error: "Fichier et nom de fichier requis" });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(fileData, 'base64');

      // Upload to Google Drive
      const driveFile = await uploadFileToDrive(
        buffer,
        fileName,
        mimeType,
        'IA Infinity - Factures Vendors'
      );

      res.json({
        fileUrl: driveFile.webViewLink,
        fileId: driveFile.id
      });
    } catch (error) {
      console.error("Invoice upload error:", error);
      res.status(500).json({ error: "Échec de l'upload du fichier" });
    }
  });

  // Create a new vendor invoice (vendor submits their own invoice)
  app.post("/api/vendor/invoices", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "Aucun profil vendeur associé" });
      }

      // Get the actual vendor ID from the contact
      const allContacts = await storage.getContacts(orgId);
      const contact = allContacts.find(c => c.id === vendorContactId);
      const actualVendorId = contact?.vendorId;

      if (!actualVendorId) {
        return res.status(403).json({ error: "Profil vendeur incomplet" });
      }

      const {
        description,    // Objet/Description (obligatoire)
        amount,         // Montant (obligatoire)
        invoiceType,    // Nature: prestation/materiel/frais (obligatoire)
        accountId,      // Client à facturer (obligatoire)
        pdfUrl,         // URL du fichier uploadé (obligatoire)
        projectId       // Optionnel
      } = req.body;

      // Validation stricte de tous les champs obligatoires
      if (!description || !amount || !invoiceType || !accountId || !pdfUrl) {
        return res.status(400).json({
          error: "Tous les champs sont obligatoires (description, montant, nature, client, fichier)"
        });
      }

      // Vérifier que le vendor a accès à ce client
      const context = getAccessContext(req);
      const allAccounts = await storage.getAccounts(orgId);
      const vendorAccounts = await filterAccountsByAccess(allAccounts, context);

      if (!vendorAccounts.find(a => a.id === accountId)) {
        return res.status(403).json({
          error: "Vous n'avez pas accès à ce client"
        });
      }

      // Générer numéro de facture unique
      const invoiceNumber = `VND-${Date.now().toString(36).toUpperCase()}`;

      // Créer la facture avec le vrai vendorId
      const invoice = await storage.createInvoice({
        orgId,
        vendorId: actualVendorId,
        accountId,
        projectId: projectId || null,
        invoiceNumber,
        description,
        amount: amount.toString(),
        invoiceType,
        pdfUrl,
        issuedDate: new Date(),
        status: 'sent',
        currency: 'EUR'
      });

      res.status(201).json(invoice);
    } catch (error) {
      console.error("Create vendor invoice error:", error);
      res.status(500).json({ error: "Échec de création de la facture" });
    }
  });

  // Upload files to Google Drive for vendor projects (Loom videos, PDF, DOCX, images)
  app.post("/api/vendor/projects/:projectId/files", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;
      const projectId = req.params.projectId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "Aucun profil vendeur associé" });
      }

      // Verify vendor has access to this project
      const accessCheck = await checkVendorProjectAccess(vendorContactId, projectId, orgId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: accessCheck.error || "Accès refusé à ce projet" });
      }
      const project = accessCheck.project;

      const { fileData, fileName, mimeType, description } = req.body;

      if (!fileData || !fileName || !mimeType) {
        return res.status(400).json({ error: "Fichier, nom et type requis" });
      }

      // Validate file types (PDF, DOCX, images, videos)
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png', 'image/jpeg', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime'
      ];

      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Type de fichier non supporté" });
      }

      // Strip base64 header if present (e.g., "data:application/pdf;base64,")
      let base64Data = fileData;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }

      // Validate base64 data
      if (!base64Data || base64Data.length === 0) {
        return res.status(400).json({ error: "Données de fichier invalides" });
      }

      // File size limit (10MB)
      const maxSize = 10 * 1024 * 1024;
      const estimatedSize = (base64Data.length * 3) / 4;
      if (estimatedSize > maxSize) {
        return res.status(400).json({ error: "Fichier trop volumineux (max 10MB)" });
      }

      const buffer = Buffer.from(base64Data, 'base64');

      // Upload to Google Drive in project-specific folder
      const folderName = `IA Infinity - Projet ${project.name}`;
      const driveFile = await uploadFileToDrive(buffer, fileName, mimeType, folderName);

      // Create document record in database
      const document = await storage.createDocument({
        orgId,
        projectId,
        accountId: project.accountId || null,
        name: fileName,
        description: description || null,
        fileUrl: driveFile.webViewLink || '',
        fileType: mimeType,
        uploadedBy: req.session.userId || null,
      });

      res.status(201).json({
        document,
        driveFile: {
          id: driveFile.id,
          webViewLink: driveFile.webViewLink,
          webContentLink: driveFile.webContentLink,
        }
      });
    } catch (error) {
      console.error("Vendor file upload error:", error);
      res.status(500).json({ error: "Échec de l'upload du fichier" });
    }
  });

  // Get client info for a vendor's project
  app.get("/api/vendor/projects/:projectId/client", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;
      const projectId = req.params.projectId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "Aucun profil vendeur associé" });
      }

      // Verify vendor has access to this project
      const accessCheck = await checkVendorProjectAccess(vendorContactId, projectId, orgId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: accessCheck.error || "Accès refusé à ce projet" });
      }
      const project = accessCheck.project;

      if (!project.accountId) {
        return res.status(404).json({ error: "Aucun client associé à ce projet" });
      }

      // Get account info
      const account = await storage.getAccount(project.accountId, orgId);
      if (!account) {
        return res.status(404).json({ error: "Client non trouvé" });
      }

      // Get primary contact for this account
      const allContacts = await storage.getContacts(orgId);
      const primaryContact = allContacts.find(c => c.accountId === account.id && c.isPrimary);

      res.json({
        account: {
          id: account.id,
          name: account.name,
          industry: account.industry,
          website: account.website,
        },
        contact: primaryContact ? {
          id: primaryContact.id,
          name: primaryContact.name,
          email: primaryContact.email,
          phone: primaryContact.phone,
          title: primaryContact.title,
        } : null,
      });
    } catch (error) {
      console.error("Get vendor project client error:", error);
      res.status(500).json({ error: "Échec de récupération des infos client" });
    }
  });

  // Get workflow state for a vendor's project
  app.get("/api/vendor/projects/:projectId/workflow", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;
      const projectId = req.params.projectId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "Aucun profil vendeur associé" });
      }

      // Verify vendor has access to this project
      const accessCheck = await checkVendorProjectAccess(vendorContactId, projectId, orgId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: accessCheck.error || "Accès refusé à ce projet" });
      }
      const project = accessCheck.project;

      // Parse workflow state JSON
      let workflowState = null;
      if (project.workflowState) {
        try {
          workflowState = JSON.parse(project.workflowState);
        } catch (e) {
          workflowState = null;
        }
      }

      res.json({
        projectId: project.id,
        projectName: project.name,
        workflowState,
      });
    } catch (error) {
      console.error("Get vendor project workflow error:", error);
      res.status(500).json({ error: "Échec de récupération du workflow" });
    }
  });

  // Update workflow state for a vendor's project
  app.patch("/api/vendor/projects/:projectId/workflow", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;
      const projectId = req.params.projectId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "Aucun profil vendeur associé" });
      }

      // Verify vendor has access to this project
      const accessCheck = await checkVendorProjectAccess(vendorContactId, projectId, orgId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: accessCheck.error || "Accès refusé à ce projet" });
      }
      const project = accessCheck.project;

      const { workflowState } = req.body;

      if (workflowState === undefined) {
        return res.status(400).json({ error: "workflowState est requis" });
      }

      // Serialize workflow state to JSON
      const workflowStateJson = JSON.stringify(workflowState);

      // Update project
      const updatedProject = await storage.updateProject(projectId, orgId, {
        workflowState: workflowStateJson,
      });

      res.json({
        projectId: updatedProject?.id,
        projectName: updatedProject?.name,
        workflowState,
      });
    } catch (error) {
      console.error("Update vendor project workflow error:", error);
      res.status(500).json({ error: "Échec de mise à jour du workflow" });
    }
  });

  // Get single project details for vendor (with client info and workflow)
  app.get("/api/vendor/projects/:projectId/details", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;
      const projectId = req.params.projectId;

      if (!vendorContactId) {
        return res.status(403).json({ error: "Aucun profil vendeur associé" });
      }

      // Verify vendor has access to this project
      const accessCheck = await checkVendorProjectAccess(vendorContactId, projectId, orgId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: accessCheck.error || "Accès refusé à ce projet" });
      }
      const project = accessCheck.project;

      // Get client info
      let account = null;
      let primaryContact = null;
      if (project.accountId) {
        account = await storage.getAccount(project.accountId, orgId);
        if (account) {
          const allContacts = await storage.getContacts(orgId);
          primaryContact = allContacts.find(c => c.accountId === account!.id && c.isPrimary);
        }
      }

      // Parse workflow state
      let workflowState = null;
      if (project.workflowState) {
        try {
          workflowState = JSON.parse(project.workflowState);
        } catch (e) {
          workflowState = null;
        }
      }

      // Get tasks, missions, documents for this project
      const allTasks = await storage.getTasks(orgId);
      const projectTasks = allTasks.filter(t => t.projectId === projectId);

      const allMissions = await storage.getMissions(orgId);
      const projectMissions = allMissions.filter(m => m.projectId === projectId);

      const allDocuments = await storage.getDocuments(orgId);
      const projectDocuments = allDocuments.filter(d => d.projectId === projectId);

      res.json({
        project,
        client: account ? {
          id: account.id,
          name: account.name,
          industry: account.industry,
          website: account.website,
          contact: primaryContact ? {
            name: primaryContact.name,
            email: primaryContact.email,
            phone: primaryContact.phone,
            title: primaryContact.title,
          } : null,
        } : null,
        workflowState,
        tasks: projectTasks,
        missions: projectMissions,
        documents: projectDocuments,
      });
    } catch (error) {
      console.error("Get vendor project details error:", error);
      res.status(500).json({ error: "Échec de récupération des détails du projet" });
    }
  });

  // Get project updates (CR - Comptes Rendus) for vendor
  app.get("/api/vendor/projects/:projectId/updates", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;

      const updates = await storage.getProjectUpdates(projectId, orgId);
      res.json(updates);
    } catch (error) {
      console.error("Get vendor project updates error:", error);
      res.status(500).json({ error: "Échec de récupération des CR" });
    }
  });

  // Create project update (CR) for vendor
  app.post("/api/vendor/projects/:projectId/updates", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId;
      const projectId = req.params.projectId;

      const update = await storage.createProjectUpdate({
        ...req.body,
        orgId,
        projectId,
        createdById: userId,
        updateDate: req.body.updateDate ? new Date(req.body.updateDate) : new Date(),
      });

      res.status(201).json(update);
    } catch (error) {
      console.error("Create vendor project update error:", error);
      res.status(500).json({ error: "Échec de création du CR" });
    }
  });

  // Generate AI-powered project update (CR) for vendor
  app.post("/api/vendor/projects/:projectId/updates/generate-ai", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;
      const { instructions } = req.body;

      // Get project and related data
      const project = await storage.getProject(projectId, orgId);
      if (!project) {
        return res.status(404).json({ error: "Projet non trouvé" });
      }

      // Get client info
      let account = null;
      if (project.accountId) {
        account = await storage.getAccount(project.accountId, orgId);
      }

      // Get tasks and existing updates
      const allTasks = await storage.getTasks(orgId);
      const projectTasks = allTasks.filter(t => t.projectId === projectId);
      const existingUpdates = await storage.getProjectUpdates(projectId, orgId);

      // Import OpenAI
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const contextData = {
        projet: {
          nom: project.name,
          description: project.description,
          statut: project.status,
          progression: project.progress,
          dateDebut: project.startDate,
          dateFin: project.endDate,
        },
        client: account ? {
          nom: account.name,
          secteur: account.industry,
        } : null,
        taches: projectTasks.map(t => ({
          titre: t.title,
          statut: t.status,
          priorite: t.priority,
        })),
        derniersCR: existingUpdates.slice(-3).map(u => ({
          date: u.updateDate,
          titre: u.title,
          type: u.type,
        })),
      };

      const systemPrompt = `Tu es un consultant professionnel qui rédige des comptes rendus de suivi de projet pour des sous-traitants.

Rédige un compte rendu de suivi clair, professionnel et structuré en français. Le CR doit inclure:
- Un résumé de l'avancement du projet
- Les réalisations depuis le dernier CR
- Les tâches en cours
- Les points d'attention ou blocages éventuels
- Les prochaines étapes prévues

Adapte le ton et le contenu aux instructions fournies par le sous-traitant.`;

      const userPrompt = `${instructions ? `Instructions spécifiques: ${instructions}\n\n` : ''}Génère un compte rendu de suivi pour le projet suivant:\n\n${JSON.stringify(contextData, null, 2)}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_completion_tokens: 1500,
      });

      const generatedContent = response.choices[0]?.message?.content || "";

      res.json({
        content: generatedContent,
        project: {
          id: project.id,
          name: project.name,
        },
      });
    } catch (error) {
      console.error("Generate AI project update error:", error);
      res.status(500).json({ error: "Échec de génération du CR avec l'IA" });
    }
  });

  // Update project update (CR) for vendor
  app.patch("/api/vendor/projects/:projectId/updates/:id", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const updateId = req.params.id;
      const projectId = req.params.projectId;

      // Verify the update belongs to this project
      const existingUpdate = await storage.getProjectUpdate(updateId, orgId);
      if (!existingUpdate || existingUpdate.projectId !== projectId) {
        return res.status(404).json({ error: "CR non trouvé" });
      }

      const allowedFields = {
        title: req.body.title,
        content: req.body.content,
        type: req.body.type,
        updateDate: req.body.updateDate ? new Date(req.body.updateDate) : undefined,
      };

      const updateData = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "Aucun champ à mettre à jour" });
      }

      const updated = await storage.updateProjectUpdate(updateId, orgId, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Update vendor project update error:", error);
      res.status(500).json({ error: "Échec de mise à jour du CR" });
    }
  });

  // =====================
  // Vendor Project Events (Calendar)
  // =====================

  // Get all events for a project
  app.get("/api/vendor/projects/:projectId/events", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;
      const { start, end } = req.query;

      let events;
      if (start && end) {
        events = await storage.getVendorProjectEventsByDateRange(
          projectId,
          orgId,
          new Date(start as string),
          new Date(end as string)
        );
      } else {
        events = await storage.getVendorProjectEvents(projectId, orgId);
      }

      res.json(events);
    } catch (error) {
      console.error("Get vendor project events error:", error);
      res.status(500).json({ error: "Échec de récupération des événements" });
    }
  });

  // Create a new event
  app.post("/api/vendor/projects/:projectId/events", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId;
      const projectId = req.params.projectId;
      const { title, description, start, end, allDay, type, color } = req.body;

      if (!title || !start || !end) {
        return res.status(400).json({ error: "Le titre, la date de début et la date de fin sont requis" });
      }

      const event = await storage.createVendorProjectEvent({
        orgId,
        projectId,
        createdById: userId,
        title,
        description,
        start: new Date(start),
        end: new Date(end),
        allDay: allDay || false,
        type: type || 'personal',
        color,
      });

      res.status(201).json(event);
    } catch (error) {
      console.error("Create vendor project event error:", error);
      res.status(500).json({ error: "Échec de création de l'événement" });
    }
  });

  // Update an event
  app.patch("/api/vendor/projects/:projectId/events/:eventId", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;
      const eventId = req.params.eventId;
      const { title, description, start, end, allDay, type, color } = req.body;

      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (start !== undefined) updates.start = new Date(start);
      if (end !== undefined) updates.end = new Date(end);
      if (allDay !== undefined) updates.allDay = allDay;
      if (type !== undefined) updates.type = type;
      if (color !== undefined) updates.color = color;

      const event = await storage.updateVendorProjectEvent(eventId, projectId, orgId, updates);
      if (!event) {
        return res.status(404).json({ error: "Événement non trouvé" });
      }

      res.json(event);
    } catch (error) {
      console.error("Update vendor project event error:", error);
      res.status(500).json({ error: "Échec de mise à jour de l'événement" });
    }
  });

  // Delete an event
  app.delete("/api/vendor/projects/:projectId/events/:eventId", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;
      const eventId = req.params.eventId;

      await storage.deleteVendorProjectEvent(eventId, projectId, orgId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete vendor project event error:", error);
      res.status(500).json({ error: "Échec de suppression de l'événement" });
    }
  });

  // Sync event to Google Calendar
  app.post("/api/vendor/projects/:projectId/events/:eventId/sync-google", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;
      const eventId = req.params.eventId;

      // Get the event
      const event = await storage.getVendorProjectEvent(eventId, orgId);
      if (!event) {
        return res.status(404).json({ error: "Événement non trouvé" });
      }

      // TODO: Implement actual Google Calendar sync
      // For now, just mark it as synced
      const updated = await storage.updateVendorProjectEvent(eventId, projectId, orgId, {
        googleCalendarSynced: true,
      });

      res.json({
        success: true,
        message: "Synchronisation avec Google Calendar à implémenter",
        event: updated
      });
    } catch (error) {
      console.error("Sync to Google Calendar error:", error);
      res.status(500).json({ error: "Échec de synchronisation avec Google Calendar" });
    }
  });

  // =====================
  // Vendor Workflow Management
  // =====================

  // Update workflow step status
  app.patch("/api/vendor/projects/:projectId/workflow/steps/:stepId", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;
      const stepId = req.params.stepId;
      const { status, notes, completedAt } = req.body;

      // Get current project
      const project = await storage.getProject(projectId, orgId);
      if (!project) {
        return res.status(404).json({ error: "Projet non trouvé" });
      }

      // Parse current workflow state
      let workflowState: any = {};
      if (project.workflowState) {
        try {
          workflowState = JSON.parse(project.workflowState);
        } catch {
          workflowState = {};
        }
      }

      // Find and update the step
      if (!workflowState.steps) {
        workflowState.steps = [];
      }

      const stepIndex = workflowState.steps.findIndex((s: any) => s.id === stepId);
      if (stepIndex === -1) {
        return res.status(404).json({ error: "Étape non trouvée" });
      }

      // Update the step
      if (status !== undefined) workflowState.steps[stepIndex].status = status;
      if (notes !== undefined) workflowState.steps[stepIndex].notes = notes;
      if (completedAt !== undefined) workflowState.steps[stepIndex].completedAt = completedAt;
      if (status === 'completed' && !workflowState.steps[stepIndex].completedAt) {
        workflowState.steps[stepIndex].completedAt = new Date().toISOString();
      }

      // Calculate progress based on completed steps
      const completedSteps = workflowState.steps.filter((s: any) => s.status === 'completed').length;
      const totalSteps = workflowState.steps.length;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Update project with new workflow state and progress
      await storage.updateProject(projectId, orgId, {
        workflowState: JSON.stringify(workflowState),
        progress,
      });

      res.json({
        success: true,
        step: workflowState.steps[stepIndex],
        progress
      });
    } catch (error) {
      console.error("Update workflow step error:", error);
      res.status(500).json({ error: "Échec de mise à jour de l'étape" });
    }
  });

  // Add a new workflow step
  app.post("/api/vendor/projects/:projectId/workflow/steps", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;
      const { name, description, startDate, endDate } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Le nom de l'étape est requis" });
      }

      // Get current project
      const project = await storage.getProject(projectId, orgId);
      if (!project) {
        return res.status(404).json({ error: "Projet non trouvé" });
      }

      // Parse current workflow state
      let workflowState: any = {};
      if (project.workflowState) {
        try {
          workflowState = JSON.parse(project.workflowState);
        } catch {
          workflowState = {};
        }
      }

      if (!workflowState.steps) {
        workflowState.steps = [];
      }

      // Create new step
      const newStep = {
        id: `step-${Date.now()}`,
        name,
        description: description || '',
        status: 'pending',
        startDate: startDate || null,
        endDate: endDate || null,
        notes: '',
        createdAt: new Date().toISOString(),
      };

      workflowState.steps.push(newStep);

      // Update project
      await storage.updateProject(projectId, orgId, {
        workflowState: JSON.stringify(workflowState),
      });

      res.status(201).json(newStep);
    } catch (error) {
      console.error("Add workflow step error:", error);
      res.status(500).json({ error: "Échec d'ajout de l'étape" });
    }
  });

  // Delete a workflow step
  app.delete("/api/vendor/projects/:projectId/workflow/steps/:stepId", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;
      const stepId = req.params.stepId;

      // Get current project
      const project = await storage.getProject(projectId, orgId);
      if (!project) {
        return res.status(404).json({ error: "Projet non trouvé" });
      }

      // Parse current workflow state
      let workflowState: any = {};
      if (project.workflowState) {
        try {
          workflowState = JSON.parse(project.workflowState);
        } catch {
          workflowState = {};
        }
      }

      if (!workflowState.steps) {
        return res.status(404).json({ error: "Étape non trouvée" });
      }

      // Remove the step
      workflowState.steps = workflowState.steps.filter((s: any) => s.id !== stepId);

      // Recalculate progress
      const completedSteps = workflowState.steps.filter((s: any) => s.status === 'completed').length;
      const totalSteps = workflowState.steps.length;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Update project
      await storage.updateProject(projectId, orgId, {
        workflowState: JSON.stringify(workflowState),
        progress,
      });

      res.json({ success: true, progress });
    } catch (error) {
      console.error("Delete workflow step error:", error);
      res.status(500).json({ error: "Échec de suppression de l'étape" });
    }
  });

  // =====================
  // Vendor Deliverables Routes
  // =====================

  // Get deliverables for a project
  app.get("/api/vendor/projects/:projectId/deliverables", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;

      const deliverables = await storage.getProjectDeliverables(projectId, orgId);
      res.json(deliverables);
    } catch (error) {
      console.error("Get vendor deliverables error:", error);
      res.status(500).json({ error: "Échec de récupération des livrables" });
    }
  });

  // Create or update a deliverable (vendor can create V1, V2, V3 for each of 3 deliverables)
  app.post("/api/vendor/projects/:projectId/deliverables", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const projectId = req.params.projectId;
      const userId = req.session.userId;
      const { deliverableNumber, version, title, description, type, url } = req.body;

      if (!deliverableNumber || deliverableNumber < 1 || deliverableNumber > 3) {
        return res.status(400).json({ error: "Le numéro de livrable doit être entre 1 et 3" });
      }

      if (!version || !['v1', 'v2', 'v3'].includes(version)) {
        return res.status(400).json({ error: "La version doit être v1, v2 ou v3" });
      }

      if (!title || !type) {
        return res.status(400).json({ error: "Le titre et le type sont requis" });
      }

      const deliverable = await storage.createProjectDeliverable({
        orgId,
        projectId,
        deliverableNumber,
        version,
        title,
        description: description || null,
        type,
        url: url || null,
        status: 'submitted',
        createdById: userId || null,
      });

      res.status(201).json(deliverable);
    } catch (error) {
      console.error("Create vendor deliverable error:", error);
      res.status(500).json({ error: "Échec de création du livrable" });
    }
  });

  // Update a deliverable
  app.patch("/api/vendor/projects/:projectId/deliverables/:deliverableId", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const deliverableId = req.params.deliverableId;
      const { title, description, type, url, status } = req.body;

      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (type !== undefined) updates.type = type;
      if (url !== undefined) updates.url = url;
      if (status !== undefined) updates.status = status;

      const updated = await storage.updateProjectDeliverable(deliverableId, orgId, updates as any);
      if (!updated) {
        return res.status(404).json({ error: "Livrable non trouvé" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update vendor deliverable error:", error);
      res.status(500).json({ error: "Échec de mise à jour du livrable" });
    }
  });

  // Delete a deliverable
  app.delete("/api/vendor/projects/:projectId/deliverables/:deliverableId", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const deliverableId = req.params.deliverableId;

      await storage.deleteProjectDeliverable(deliverableId, orgId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete vendor deliverable error:", error);
      res.status(500).json({ error: "Échec de suppression du livrable" });
    }
  });

  // =====================
  // Vendor Compliance Steps Routes
  // =====================

  // Get compliance steps for a deliverable (vendor view)
  app.get("/api/vendor/projects/:projectId/deliverables/:deliverableId/compliance-steps", requireVendor, requireVendorProjectAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const deliverableId = req.params.deliverableId;

      const steps = await storage.getComplianceSteps(deliverableId, orgId);
      res.json(steps);
    } catch (error) {
      console.error("Get vendor compliance steps error:", error);
      res.status(500).json({ error: "Échec de récupération des étapes de conformité" });
    }
  });

  // Save draft for a compliance step (auto-save)
  app.post("/api/vendor/compliance-steps/:stepId/save-draft", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const stepId = req.params.stepId;
      const { formData, checklistItems, dynamicListData, fileUrl } = req.body;

      const updated = await storage.saveComplianceStepDraft(stepId, orgId, {
        formData,
        checklistItems,
        dynamicListData,
        fileUrl,
      });

      if (!updated) {
        return res.status(404).json({ error: "Étape non trouvée" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Save compliance step draft error:", error);
      res.status(500).json({ error: "Échec de sauvegarde du brouillon" });
    }
  });

  // Submit a compliance step (marks as submitted and unlocks next)
  app.post("/api/vendor/compliance-steps/:stepId/submit", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const stepId = req.params.stepId;
      const { formData, checklistItems, dynamicListData, fileUrl } = req.body;

      const updated = await storage.submitComplianceStep(stepId, orgId, {
        formData,
        checklistItems,
        dynamicListData,
        fileUrl,
      });

      if (!updated) {
        return res.status(404).json({ error: "Étape non trouvée ou verrouillée" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Submit compliance step error:", error);
      res.status(500).json({ error: "Échec de soumission de l'étape" });
    }
  });

  // Get single compliance step details
  app.get("/api/vendor/compliance-steps/:stepId", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const stepId = req.params.stepId;

      const step = await storage.getComplianceStep(stepId, orgId);
      if (!step) {
        return res.status(404).json({ error: "Étape non trouvée" });
      }

      res.json(step);
    } catch (error) {
      console.error("Get vendor compliance step error:", error);
      res.status(500).json({ error: "Échec de récupération de l'étape" });
    }
  });

  // =====================
  // Direct Messaging Routes
  // =====================

  // Get all conversations for the current user
  app.get("/api/messages/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;

      const conversations = await storage.getUserConversations(userId, orgId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Échec de récupération des conversations" });
    }
  });

  // Get unread message count
  app.get("/api/messages/unread-count", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;

      const count = await storage.getUnreadMessageCount(userId, orgId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Échec de récupération du compteur" });
    }
  });

  // Get available recipients for messaging
  app.get("/api/messages/recipients", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;

      const recipients = await storage.getAvailableMessageRecipients(userId, orgId);
      res.json(recipients);
    } catch (error) {
      console.error("Get recipients error:", error);
      res.status(500).json({ error: "Échec de récupération des destinataires" });
    }
  });

  // Start or get a conversation with another user
  app.post("/api/messages/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;
      const { recipientId } = req.body;

      if (!recipientId) {
        return res.status(400).json({ error: "recipientId est requis" });
      }

      // Check if recipient exists and is in the same org
      const recipients = await storage.getAvailableMessageRecipients(userId, orgId);
      const validRecipient = recipients.find(r => r.id === recipientId);
      if (!validRecipient) {
        return res.status(400).json({ error: "Destinataire invalide" });
      }

      const conversation = await storage.getOrCreateDirectConversation(orgId, userId, recipientId);
      res.json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ error: "Échec de création de la conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/messages/conversations/:conversationId/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Verify user is a participant in this conversation
      const conversation = await storage.getDirectConversation(conversationId, orgId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation non trouvée" });
      }
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ error: "Accès non autorisé à cette conversation" });
      }

      // Mark messages as read
      await storage.markMessagesAsRead(conversationId, userId);

      const messages = await storage.getConversationMessages(conversationId, limit, offset);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Échec de récupération des messages" });
    }
  });

  // Send a message
  app.post("/api/messages/conversations/:conversationId/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;
      const { conversationId } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Le contenu du message est requis" });
      }

      // Verify user is a participant in this conversation
      const conversation = await storage.getDirectConversation(conversationId, orgId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation non trouvée" });
      }
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ error: "Accès non autorisé à cette conversation" });
      }

      // Determine recipient
      const recipientId = conversation.participant1Id === userId
        ? conversation.participant2Id
        : conversation.participant1Id;

      const message = await storage.sendDirectMessage({
        conversationId,
        senderId: userId,
        recipientId,
        content: content.trim(),
        status: 'sent',
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Échec d'envoi du message" });
    }
  });

  // Mark conversation as read
  app.post("/api/messages/conversations/:conversationId/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const userId = req.session.userId!;
      const { conversationId } = req.params;

      // Verify user is a participant in this conversation
      const conversation = await storage.getDirectConversation(conversationId, orgId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation non trouvée" });
      }
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ error: "Accès non autorisé à cette conversation" });
      }

      await storage.markMessagesAsRead(conversationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json({ error: "Échec de marquage comme lu" });
    }
  });

  // =====================
  // Helper Functions for Channels
  // =====================

  /**
   * Ensures that a vendor project channel exists for a given project.
   * If the channel already exists, returns it. Otherwise, creates a new one.
   */
  async function ensureVendorProjectChannel(
    projectId: string,
    orgId: string
  ): Promise<any> {
    try {
      // Check if channel already exists for this project
      const existingChannels = await storage.getChannelsByProject(projectId, orgId);
      const vendorChannel = existingChannels.find(c => c.type === 'vendor' && c.scope === 'project');

      if (vendorChannel) {
        return vendorChannel;
      }

      // Get project info to create meaningful channel name
      const project = await storage.getProject(projectId, orgId);
      if (!project) {
        throw new Error("Project not found");
      }

      // Create vendor channel for this project
      const channel = await storage.createChannel({
        orgId,
        name: `Projet: ${project.name}`,
        description: `Canal de communication pour le projet ${project.name}`,
        type: 'vendor',
        scope: 'project',
        projectId,
        accountId: project.accountId || null,
        isActive: true,
      });

      console.log(`Created vendor channel for project ${projectId}: ${channel.id}`);
      return channel;
    } catch (error) {
      console.error(`Error ensuring vendor project channel for ${projectId}:`, error);
      throw error;
    }
  }

  // =====================
  // Channel Routes (Admin)
  // =====================

  // Get all channels (admin)
  app.get("/api/channels", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const type = req.query.type as 'client' | 'vendor' | undefined;
      const scope = req.query.scope as 'global' | 'project' | undefined;
      const channels = await storage.getChannels(orgId, type, scope);
      res.json(channels);
    } catch (error) {
      console.error("Get channels error:", error);
      res.status(500).json({ error: "Failed to get channels" });
    }
  });

  // Get global channels
  app.get("/api/channels/global", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const type = req.query.type as 'client' | 'vendor' | undefined;
      const channels = await storage.getGlobalChannels(orgId, type);
      res.json(channels);
    } catch (error) {
      console.error("Get global channels error:", error);
      res.status(500).json({ error: "Failed to get global channels" });
    }
  });

  // Get channel by ID
  app.get("/api/channels/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const channel = await storage.getChannel(req.params.id, orgId);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }
      res.json(channel);
    } catch (error) {
      console.error("Get channel error:", error);
      res.status(500).json({ error: "Failed to get channel" });
    }
  });

  // Get channels by project
  app.get("/api/projects/:projectId/channels", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const channels = await storage.getChannelsByProject(req.params.projectId, orgId);
      res.json(channels);
    } catch (error) {
      console.error("Get project channels error:", error);
      res.status(500).json({ error: "Failed to get project channels" });
    }
  });

  // Create channel (admin only)
  app.post("/api/channels", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const channel = await storage.createChannel({ ...req.body, orgId });
      res.status(201).json(channel);
    } catch (error) {
      console.error("Create channel error:", error);
      res.status(500).json({ error: "Failed to create channel" });
    }
  });

  // Update channel (admin only)
  app.patch("/api/channels/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const channel = await storage.updateChannel(req.params.id, orgId, req.body);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }
      res.json(channel);
    } catch (error) {
      console.error("Update channel error:", error);
      res.status(500).json({ error: "Failed to update channel" });
    }
  });

  // Delete channel (admin only)
  app.delete("/api/channels/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteChannel(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete channel error:", error);
      res.status(500).json({ error: "Failed to delete channel" });
    }
  });

  // =====================
  // Channel Messages Routes
  // =====================

  // Get channel messages
  app.get("/api/channels/:channelId/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const channel = await storage.getChannel(req.params.channelId, orgId);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const messages = await storage.getChannelMessages(req.params.channelId, limit, offset);

      // Get user info and attachments for each message
      const messagesWithDetails = await Promise.all(messages.map(async (msg) => {
        const user = await storage.getUser(msg.userId);
        const attachments = await storage.getMessageAttachments(msg.id);
        return {
          ...msg,
          user: user ? { id: user.id, name: user.name, email: user.email, avatar: user.avatar } : null,
          attachments
        };
      }));

      res.json(messagesWithDetails);
    } catch (error) {
      console.error("Get channel messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Get pinned messages
  app.get("/api/channels/:channelId/messages/pinned", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const channel = await storage.getChannel(req.params.channelId, orgId);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const messages = await storage.getPinnedMessages(req.params.channelId);
      res.json(messages);
    } catch (error) {
      console.error("Get pinned messages error:", error);
      res.status(500).json({ error: "Failed to get pinned messages" });
    }
  });

  // Create message in channel
  app.post("/api/channels/:channelId/messages", requireAuth, requireChannelAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const channel = await storage.getChannel(req.params.channelId, orgId);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Only admins can post announcements
      const isAdmin = !['client_admin', 'client_member', 'vendor'].includes(req.session.role || '');
      const isAnnouncement = req.body.isAnnouncement && isAdmin;

      const message = await storage.createChannelMessage({
        channelId: req.params.channelId,
        userId,
        content: req.body.content,
        isAnnouncement,
        isPinned: false
      });

      // Handle attachments if any
      if (req.body.attachments && Array.isArray(req.body.attachments)) {
        for (const att of req.body.attachments) {
          await storage.createChannelAttachment({
            messageId: message.id,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize,
            mimeType: att.mimeType
          });
        }
      }

      const user = await storage.getUser(userId);
      const attachments = await storage.getMessageAttachments(message.id);

      res.status(201).json({
        ...message,
        user: user ? { id: user.id, name: user.name, email: user.email, avatar: user.avatar } : null,
        attachments
      });
    } catch (error) {
      console.error("Create message error:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Update message (author or admin only)
  app.patch("/api/channels/:channelId/messages/:messageId", requireAuth, requireChannelAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const channel = await storage.getChannel(req.params.channelId, orgId);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const message = await storage.getChannelMessage(req.params.messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const userId = req.session.userId;
      const isAdmin = !['client_admin', 'client_member', 'vendor'].includes(req.session.role || '');

      // Only author or admin can edit
      if (message.userId !== userId && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to edit this message" });
      }

      const updated = await storage.updateChannelMessage(req.params.messageId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update message error:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  // Delete message (author or admin only)
  app.delete("/api/channels/:channelId/messages/:messageId", requireAuth, requireChannelAccess, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const channel = await storage.getChannel(req.params.channelId, orgId);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const message = await storage.getChannelMessage(req.params.messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const userId = req.session.userId;
      const isAdmin = !['client_admin', 'client_member', 'vendor'].includes(req.session.role || '');

      // Only author or admin can delete
      if (message.userId !== userId && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to delete this message" });
      }

      await storage.deleteChannelMessage(req.params.messageId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Pin/unpin message (admin only)
  app.post("/api/channels/:channelId/messages/:messageId/pin", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const message = await storage.getChannelMessage(req.params.messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const updated = await storage.updateChannelMessage(req.params.messageId, { isPinned: true });
      res.json(updated);
    } catch (error) {
      console.error("Pin message error:", error);
      res.status(500).json({ error: "Failed to pin message" });
    }
  });

  app.delete("/api/channels/:channelId/messages/:messageId/pin", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const message = await storage.getChannelMessage(req.params.messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const updated = await storage.updateChannelMessage(req.params.messageId, { isPinned: false });
      res.json(updated);
    } catch (error) {
      console.error("Unpin message error:", error);
      res.status(500).json({ error: "Failed to unpin message" });
    }
  });

  // =====================
  // Client Portal Channels
  // =====================

  app.get("/api/client/channels", requireAuth, requireClient, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accountId = req.session.accountId;

      // Get global client channel + project-specific channels for this client
      const globalChannels = await storage.getGlobalChannels(orgId, 'client');
      let projectChannels: any[] = [];

      if (accountId) {
        // Get projects for this account and their channels
        const projects = await storage.getProjects(orgId, accountId);
        for (const project of projects) {
          const channels = await storage.getChannelsByProject(project.id, orgId);
          const clientChannels = channels.filter(c => c.type === 'client');
          projectChannels = [...projectChannels, ...clientChannels];
        }
      }

      res.json([...globalChannels, ...projectChannels]);
    } catch (error) {
      console.error("Get client channels error:", error);
      res.status(500).json({ error: "Failed to get channels" });
    }
  });

  // =====================
  // Vendor Portal Channels
  // =====================

  app.get("/api/vendor/channels", requireVendor, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendorContactId = req.session.vendorContactId;

      // Get global vendor channel
      const globalChannels = await storage.getGlobalChannels(orgId, 'vendor');
      let projectChannels: any[] = [];

      if (vendorContactId) {
        // Use the corrected function to get vendor project IDs
        const vendorProjectIds = await getVendorProjectIds(orgId, vendorContactId);

        // Get projects assigned to this vendor and their channels
        const allProjects = await storage.getProjects(orgId);
        const vendorProjects = allProjects.filter(p => vendorProjectIds.includes(p.id));

        for (const project of vendorProjects) {
          const channels = await storage.getChannelsByProject(project.id, orgId);
          const vendorChannelsForProject = channels.filter(c => c.type === 'vendor');
          projectChannels = [...projectChannels, ...vendorChannelsForProject];
        }
      }

      res.json([...globalChannels, ...projectChannels]);
    } catch (error) {
      console.error("Get vendor channels error:", error);
      res.status(500).json({ error: "Failed to get channels" });
    }
  });

  // Initialize default global channels
  app.post("/api/channels/init-defaults", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);

      // Check if global channels already exist
      const existingGlobalChannels = await storage.getGlobalChannels(orgId);

      const created = [];

      // Create global client channel if not exists
      const hasGlobalClient = existingGlobalChannels.some(c => c.type === 'client');
      if (!hasGlobalClient) {
        const clientChannel = await storage.createChannel({
          orgId,
          name: 'Espace Clients',
          description: 'Canal de communication pour tous les clients',
          type: 'client',
          scope: 'global',
          isActive: true
        });
        created.push(clientChannel);
      }

      // Create global vendor channel if not exists
      const hasGlobalVendor = existingGlobalChannels.some(c => c.type === 'vendor');
      if (!hasGlobalVendor) {
        const vendorChannel = await storage.createChannel({
          orgId,
          name: 'Espace Sous-traitants',
          description: 'Canal de communication pour tous les sous-traitants',
          type: 'vendor',
          scope: 'global',
          isActive: true
        });
        created.push(vendorChannel);
      }

      res.json({ created, message: `${created.length} channel(s) created` });
    } catch (error) {
      console.error("Init default channels error:", error);
      res.status(500).json({ error: "Failed to initialize default channels" });
    }
  });

  // ==================== NOTIFICATIONS ====================

  // Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const session = getSessionData(req);
      if (!session) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const limit = parseInt(req.query.limit as string) || 20;
      const notifications = await storage.getNotifications(session.userId, orgId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  // Get unread notifications with count
  app.get("/api/notifications/unread", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const session = getSessionData(req);
      if (!session) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const notifications = await storage.getUnreadNotifications(session.userId, orgId);
      const count = await storage.getUnreadNotificationCount(session.userId, orgId);
      res.json({ notifications, count });
    } catch (error) {
      console.error("Get unread notifications error:", error);
      res.status(500).json({ error: "Failed to get unread notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const session = getSessionData(req);
      if (!session) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const count = await storage.getUnreadNotificationCount(session.userId, orgId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread notification count error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const session = getSessionData(req);
      if (!session) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const notification = await storage.markNotificationAsRead(req.params.id, session.userId);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const session = getSessionData(req);
      if (!session) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.markAllNotificationsAsRead(session.userId, orgId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const session = getSessionData(req);
      if (!session) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.deleteNotification(req.params.id, session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // ==================== USER PROFILE ====================

  // Get current user profile
  app.get("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const session = getSessionData(req);
      if (!session) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  // Update current user profile
  app.patch("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const session = getSessionData(req);
      if (!session) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { name, avatar } = req.body;
      const updateData: { name?: string; avatar?: string | null } = {};

      if (name && typeof name === 'string' && name.trim().length > 0) {
        updateData.name = name.trim();
      }
      if (avatar !== undefined) {
        updateData.avatar = avatar;
        console.log("Updating avatar, length:", avatar ? avatar.length : 'null');
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const user = await storage.updateUser(session.userId, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("User updated, avatar length:", user.avatar ? user.avatar.length : 'null');

      // Don't return password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // DEBUG: Check user avatar
  app.get("/api/debug/avatar", requireAuth, async (req: Request, res: Response) => {
    const session = getSessionData(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    const user = await storage.getUser(session.userId);
    res.json({
      userId: session.userId,
      hasAvatar: !!user?.avatar,
      avatarLength: user?.avatar?.length || 0,
      avatarPreview: user?.avatar?.substring(0, 100) || null
    });
  });

  // ============================================
  // SUPABASE INTEGRATION
  // ============================================

  app.get("/api/supabase/status", requireAuth, async (_req: Request, res: Response) => {
    try {
      const { testSupabaseConnection } = await import("./supabase");
      const result = await testSupabaseConnection();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ connected: false, error: error.message });
    }
  });

  app.get("/api/supabase/rls-policies", requireAuth, async (_req: Request, res: Response) => {
    try {
      const { getRlsPoliciesSQL } = await import("./supabase");
      const sql = getRlsPoliciesSQL();
      res.json({ sql });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
