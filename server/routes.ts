import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertAccountSchema, insertContactSchema, insertDealSchema, insertActivitySchema,
  insertProjectSchema, insertTaskSchema, insertInvoiceSchema, insertInvoiceLineItemSchema,
  insertVendorSchema, insertMissionSchema, insertDocumentSchema, insertWorkflowRunSchema,
  insertOrganizationSchema, insertUserSchema, insertMembershipSchema,
  type DealStage, type TaskStatus, type ProjectStatus
} from "@shared/schema";

const DEFAULT_ORG_ID = "default-org";

async function ensureDefaultOrg() {
  let org = await storage.getOrganization(DEFAULT_ORG_ID);
  if (!org) {
    await storage.createOrganization({ name: "IA Infinity" });
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
      const project = await storage.updateProject(req.params.id, orgId, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
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

  return httpServer;
}
