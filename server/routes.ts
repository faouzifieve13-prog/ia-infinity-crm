import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import {
  insertAccountSchema, insertContactSchema, insertDealSchema, insertActivitySchema,
  insertProjectSchema, insertTaskSchema, insertInvoiceSchema, insertInvoiceLineItemSchema,
  insertVendorSchema, insertMissionSchema, insertDocumentSchema, insertWorkflowRunSchema,
  insertOrganizationSchema, insertUserSchema, insertMembershipSchema, insertContractSchema,
  insertInvitationSchema,
  type DealStage, type TaskStatus, type ProjectStatus, type ContractType, type ContractStatus,
  type UserRole, type Space, type InvitationStatus
} from "@shared/schema";
import { sendInvitationEmail, sendClientWelcomeEmail, testGmailConnection } from "./gmail";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await ensureDefaultOrg();

  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const stats = await storage.getDashboardStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/accounts", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const accounts = await storage.getAccounts(orgId);
      res.json(accounts);
    } catch (error) {
      console.error("Get accounts error:", error);
      res.status(500).json({ error: "Failed to get accounts" });
    }
  });

  app.get("/api/accounts/:id", async (req: Request, res: Response) => {
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

  app.post("/api/accounts", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertAccountSchema.parse({ ...req.body, orgId });
      const account = await storage.createAccount(data);
      
      // Send welcome email with portal access if contact email is provided
      if (data.contactEmail) {
        try {
          // Create an invitation for client portal access
          const token = generateToken();
          const tokenHash = hashToken(token);
          const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 6 months
          
          await storage.createInvitation({
            orgId,
            email: data.contactEmail,
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
          const clientName = data.contactName || data.contactEmail.split('@')[0].replace(/[._]/g, ' ');
          
          // Send welcome email asynchronously (don't block account creation)
          sendClientWelcomeEmail({
            to: data.contactEmail,
            clientName: clientName.charAt(0).toUpperCase() + clientName.slice(1),
            companyName: account.name,
            portalLink,
            organizationName: 'IA Infinity',
          }).catch(err => {
            console.error('Failed to send welcome email:', err);
          });
        } catch (emailError) {
          // Log error but don't fail account creation
          console.error('Failed to setup client portal access:', emailError);
        }
      }
      
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create account error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.patch("/api/accounts/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/accounts/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteAccount(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Generate CR (Compte Rendu) using ChatGPT for a client
  app.post("/api/accounts/:id/generate-cr", async (req: Request, res: Response) => {
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
  app.post("/api/accounts/:id/send-cr", async (req: Request, res: Response) => {
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

  app.get("/api/contacts", async (req: Request, res: Response) => {
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

  app.get("/api/contacts/:id", async (req: Request, res: Response) => {
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

  app.post("/api/contacts", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertContactSchema.parse({ ...req.body, orgId });
      const contact = await storage.createContact(data);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create contact error:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/contacts/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteContact(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.get("/api/deals", async (req: Request, res: Response) => {
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

  app.get("/api/deals/:id", async (req: Request, res: Response) => {
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

  app.post("/api/deals", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertDealSchema.parse({ ...req.body, orgId });
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

  app.patch("/api/deals/:id", async (req: Request, res: Response) => {
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

  app.patch("/api/deals/:id/stage", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const { stage, position } = req.body;
      const deal = await storage.updateDealStage(req.params.id, orgId, stage, position || 0);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      res.json(deal);
    } catch (error) {
      console.error("Update deal stage error:", error);
      res.status(500).json({ error: "Failed to update deal stage" });
    }
  });

  app.delete("/api/deals/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteDeal(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete deal error:", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });

  app.get("/api/activities", async (req: Request, res: Response) => {
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

  app.post("/api/activities", async (req: Request, res: Response) => {
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

  app.get("/api/projects", async (req: Request, res: Response) => {
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

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
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

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertProjectSchema.parse({ ...req.body, orgId });
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create project error:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const updateSchema = insertProjectSchema.partial().omit({ orgId: true });
      const validatedData = updateSchema.parse(req.body);
      const project = await storage.updateProject(req.params.id, orgId, validatedData);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
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

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteProject(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.get("/api/tasks", async (req: Request, res: Response) => {
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

  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
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

  app.post("/api/tasks", async (req: Request, res: Response) => {
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

  app.patch("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const task = await storage.updateTask(req.params.id, orgId, req.body);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteTask(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.get("/api/invoices", async (req: Request, res: Response) => {
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

  app.get("/api/invoices/:id", async (req: Request, res: Response) => {
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

  app.post("/api/invoices", async (req: Request, res: Response) => {
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

  app.patch("/api/invoices/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/invoices/:id", async (req: Request, res: Response) => {
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

  app.get("/api/vendors", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const vendors = await storage.getVendors(orgId);
      res.json(vendors);
    } catch (error) {
      console.error("Get vendors error:", error);
      res.status(500).json({ error: "Failed to get vendors" });
    }
  });

  app.get("/api/vendors/:id", async (req: Request, res: Response) => {
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

  app.post("/api/vendors", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const data = insertVendorSchema.parse({ ...req.body, orgId });
      const vendor = await storage.createVendor(data);
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create vendor error:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/vendors/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteVendor(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete vendor error:", error);
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  app.get("/api/missions", async (req: Request, res: Response) => {
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

  app.get("/api/missions/:id", async (req: Request, res: Response) => {
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

  app.post("/api/missions", async (req: Request, res: Response) => {
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

  app.patch("/api/missions/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/missions/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteMission(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete mission error:", error);
      res.status(500).json({ error: "Failed to delete mission" });
    }
  });

  app.get("/api/documents", async (req: Request, res: Response) => {
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

  app.get("/api/documents/:id", async (req: Request, res: Response) => {
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

  app.post("/api/documents", async (req: Request, res: Response) => {
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

  app.delete("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteDocument(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.get("/api/workflows", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const workflows = await storage.getWorkflowRuns(orgId);
      res.json(workflows);
    } catch (error) {
      console.error("Get workflows error:", error);
      res.status(500).json({ error: "Failed to get workflows" });
    }
  });

  app.get("/api/workflows/:id", async (req: Request, res: Response) => {
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

  app.post("/api/workflows", async (req: Request, res: Response) => {
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

  app.patch("/api/workflows/:id", async (req: Request, res: Response) => {
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

  app.get("/api/contracts", async (req: Request, res: Response) => {
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

  app.get("/api/contracts/:id", async (req: Request, res: Response) => {
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

  app.post("/api/contracts", async (req: Request, res: Response) => {
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

  app.patch("/api/contracts/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/contracts/:id", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      await storage.deleteContract(req.params.id, orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete contract error:", error);
      res.status(500).json({ error: "Failed to delete contract" });
    }
  });

  app.get("/api/contracts/by-deal/:dealId", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contracts = await storage.getContractsByDeal(req.params.dealId, orgId);
      res.json(contracts);
    } catch (error) {
      console.error("Get contracts by deal error:", error);
      res.status(500).json({ error: "Failed to get contracts" });
    }
  });

  app.get("/api/contracts/by-account/:accountId", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const contracts = await storage.getContractsByAccount(req.params.accountId, orgId);
      res.json(contracts);
    } catch (error) {
      console.error("Get contracts by account error:", error);
      res.status(500).json({ error: "Failed to get contracts" });
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
  app.post("/api/quotes/:id/send", async (req: Request, res: Response) => {
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
      if (!account?.contactEmail) {
        return res.status(400).json({ error: "Le client n'a pas d'email de contact" });
      }

      if (!quote.quoteUrl) {
        return res.status(400).json({ error: "Le devis n'a pas de lien Qonto valide" });
      }

      // Send the email
      const { sendGenericEmail } = await import("./gmail");
      const subject = `Devis ${quote.number} - Capsule IA`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Bonjour ${account.contactName || account.name},</h2>
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
        to: account.contactEmail,
        subject,
        htmlBody: htmlContent,
      });

      // Update quote status to sent
      await storage.updateQuote(quote.id, orgId, { 
        status: 'sent',
        sentAt: new Date()
      });

      res.json({ success: true, message: `Email envoyé à ${account.contactEmail}` });
    } catch (error: any) {
      console.error("Send quote error:", error);
      res.status(500).json({ error: error.message || "Failed to send quote" });
    }
  });

  app.post("/api/contracts/generate", async (req: Request, res: Response) => {
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
  app.post("/api/contracts/:id/personalize", async (req: Request, res: Response) => {
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
  app.post("/api/contracts/:id/apply-suggestions", async (req: Request, res: Response) => {
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
  app.get("/api/contracts/:id/download-pdf", async (req: Request, res: Response) => {
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

  app.post("/api/contracts/:id/send", async (req: Request, res: Response) => {
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

  app.get("/api/contracts/:id/pdf", async (req: Request, res: Response) => {
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
  
  app.get("/api/contracts/templates/:type", async (req: Request, res: Response) => {
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
  
  app.get("/api/contracts/:id/docx", async (req: Request, res: Response) => {
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
  
  app.post("/api/contracts/:id/generate-docx-drive", async (req: Request, res: Response) => {
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
  app.post("/api/contracts/:id/convert-to-pdf", async (req: Request, res: Response) => {
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
  app.get("/api/contracts/:id/download-pdf", async (req: Request, res: Response) => {
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
  
  app.post("/api/contracts/create-from-deal", async (req: Request, res: Response) => {
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
        clientName: customData?.clientName || contact?.name || account?.contactName || '',
        clientEmail: customData?.clientEmail || contact?.email || account?.contactEmail || '',
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

  app.post("/api/contracts/generate-scope", async (req: Request, res: Response) => {
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

  app.get("/api/notion/databases", async (req: Request, res: Response) => {
    try {
      const { listNotionDatabases } = await import("./notion");
      const databases = await listNotionDatabases();
      res.json(databases);
    } catch (error) {
      console.error("List Notion databases error:", error);
      res.status(500).json({ error: "Failed to list Notion databases" });
    }
  });

  app.get("/api/notion/databases/:id/schema", async (req: Request, res: Response) => {
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

  app.post("/api/notion/sync/accounts", async (req: Request, res: Response) => {
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
  app.post("/api/notion/sync/prospects", async (req: Request, res: Response) => {
    await syncAccountsWithPlan(req, res, 'prospect', 'prospects');
  });

  // Sync audit clients from Notion
  app.post("/api/notion/sync/audit-clients", async (req: Request, res: Response) => {
    await syncAccountsWithPlan(req, res, 'audit', 'audit-clients');
  });

  // Sync automation clients from Notion
  app.post("/api/notion/sync/automation-clients", async (req: Request, res: Response) => {
    await syncAccountsWithPlan(req, res, 'automation', 'automation-clients');
  });

  app.post("/api/notion/sync/expenses", async (req: Request, res: Response) => {
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

  app.post("/api/notion/sync/contacts", async (req: Request, res: Response) => {
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

  app.post("/api/notion/sync/deals", async (req: Request, res: Response) => {
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

  app.post("/api/notion/sync/projects", async (req: Request, res: Response) => {
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

  app.post("/api/notion/sync/tasks", async (req: Request, res: Response) => {
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

  app.post("/api/notion/sync/invoices", async (req: Request, res: Response) => {
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

  app.post("/api/notion/sync/vendors", async (req: Request, res: Response) => {
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

  app.get("/api/expenses", async (req: Request, res: Response) => {
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

  app.post("/api/expenses", async (req: Request, res: Response) => {
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

  app.patch("/api/expenses/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/expenses/:id", async (req: Request, res: Response) => {
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

  app.get("/api/invitations", async (req: Request, res: Response) => {
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

  app.get("/api/invitations/:id", async (req: Request, res: Response) => {
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
    sendEmail: z.boolean().default(false),
  });

  app.post("/api/invitations", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const parsed = createInvitationSchema.parse(req.body);
      
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
        vendorId: parsed.vendorId || null,
      });
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const inviteLink = `${baseUrl}/auth/accept-invite?token=${token}`;
      
      let emailSent = false;
      if (parsed.sendEmail) {
        const org = await storage.getOrganization(orgId);
        emailSent = await sendInvitationEmail({
          to: parsed.email,
          inviteLink,
          role: parsed.role,
          space: parsed.space,
          expiresAt,
          organizationName: org?.name || 'IA Infinity',
        });
      }
      
      const { tokenHash: _, ...safeInvitation } = invitation;
      res.status(201).json({
        ...safeInvitation,
        inviteLink,
        emailSent,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create invitation error:", error);
      res.status(500).json({ error: "Failed to create invitation" });
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

  app.post("/api/invitations/:id/revoke", async (req: Request, res: Response) => {
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

  app.delete("/api/invitations/:id", async (req: Request, res: Response) => {
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
  app.get("/api/gmail/status", async (req: Request, res: Response) => {
    try {
      const status = await testGmailConnection();
      res.json(status);
    } catch (error) {
      console.error("Gmail status error:", error);
      res.status(500).json({ connected: false, error: "Failed to check Gmail status" });
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

  app.post("/api/gmail/send", async (req: Request, res: Response) => {
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

  app.post("/api/gmail/sync", async (req: Request, res: Response) => {
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

  app.get("/api/calendar/status", async (req: Request, res: Response) => {
    try {
      const { testCalendarConnection } = await import("./calendar");
      const status = await testCalendarConnection();
      res.json(status);
    } catch (error) {
      console.error("Calendar status error:", error);
      res.status(500).json({ connected: false, error: "Failed to check Calendar status" });
    }
  });

  app.get("/api/calendar/events", async (req: Request, res: Response) => {
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

  app.get("/api/calendar/calendars", async (req: Request, res: Response) => {
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

  app.post("/api/calendar/events", async (req: Request, res: Response) => {
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

  app.patch("/api/calendar/events/:id", async (req: Request, res: Response) => {
    try {
      const { updateCalendarEvent } = await import("./calendar");
      const event = await updateCalendarEvent(req.params.id, req.body);
      res.json(event);
    } catch (error) {
      console.error("Update calendar event error:", error);
      res.status(500).json({ error: "Failed to update calendar event" });
    }
  });

  app.delete("/api/calendar/events/:id", async (req: Request, res: Response) => {
    try {
      const { deleteCalendarEvent } = await import("./calendar");
      await deleteCalendarEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete calendar event error:", error);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });

  // ============================================
  // Google Drive Routes
  // ============================================

  app.get("/api/drive/status", async (req: Request, res: Response) => {
    try {
      const { testDriveConnection } = await import("./drive");
      const status = await testDriveConnection();
      res.json(status);
    } catch (error) {
      console.error("Drive status error:", error);
      res.status(500).json({ connected: false, error: "Failed to check Drive status" });
    }
  });

  app.get("/api/drive/quotes", async (req: Request, res: Response) => {
    try {
      const { listQuotes } = await import("./drive");
      const quotes = await listQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("List quotes error:", error);
      res.status(500).json({ error: "Failed to list quotes" });
    }
  });

  app.post("/api/drive/quotes", async (req: Request, res: Response) => {
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

  app.get("/api/drive/quotes/:id/download", async (req: Request, res: Response) => {
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

  app.delete("/api/drive/quotes/:id", async (req: Request, res: Response) => {
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

  app.get("/api/qonto/status", async (req: Request, res: Response) => {
    try {
      const { testQontoConnection } = await import("./qonto");
      const status = await testQontoConnection();
      res.json(status);
    } catch (error) {
      console.error("Qonto status error:", error);
      res.status(500).json({ connected: false, error: "Failed to check Qonto status" });
    }
  });

  app.get("/api/qonto/clients", async (req: Request, res: Response) => {
    try {
      const { getQontoClients } = await import("./qonto");
      const clients = await getQontoClients();
      res.json(clients);
    } catch (error) {
      console.error("Get Qonto clients error:", error);
      res.status(500).json({ error: "Failed to get Qonto clients" });
    }
  });

  app.get("/api/qonto/quotes", async (req: Request, res: Response) => {
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

  app.post("/api/qonto/quotes", async (req: Request, res: Response) => {
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

  app.get("/api/qonto/quotes/:id", async (req: Request, res: Response) => {
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

  app.post("/api/qonto/quotes/send-email", async (req: Request, res: Response) => {
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

  return httpServer;
}
