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
import { sendInvitationEmail, testGmailConnection } from "./gmail";

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
      const deal = await storage.updateDeal(req.params.id, orgId, req.body);
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

  return httpServer;
}
