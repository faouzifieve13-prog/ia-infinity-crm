import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  organizations, users, memberships, accounts, contacts, deals, activities,
  projects, tasks, invoices, invoiceLineItems, vendors, missions, documents,
  workflowRuns, importJobs, contracts,
  type Organization, type InsertOrganization,
  type User, type InsertUser,
  type Membership, type InsertMembership,
  type Account, type InsertAccount,
  type Contact, type InsertContact,
  type Deal, type InsertDeal,
  type Activity, type InsertActivity,
  type Project, type InsertProject,
  type Task, type InsertTask,
  type Invoice, type InsertInvoice,
  type InvoiceLineItem, type InsertInvoiceLineItem,
  type Vendor, type InsertVendor,
  type Mission, type InsertMission,
  type Document, type InsertDocument,
  type WorkflowRun, type InsertWorkflowRun,
  type ImportJob, type InsertImportJob,
  type Contract, type InsertContract,
  type DealStage, type TaskStatus, type ProjectStatus, type ContractType, type ContractStatus
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  
  createOrganization(org: InsertOrganization): Promise<Organization>;
  createOrganizationWithId(id: string, org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  
  createMembership(membership: InsertMembership): Promise<Membership>;
  getMembershipByUserAndOrg(userId: string, orgId: string): Promise<Membership | undefined>;
  getMembershipsByOrg(orgId: string): Promise<Membership[]>;
  
  getAccounts(orgId: string): Promise<Account[]>;
  getAccount(id: string, orgId: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, orgId: string, data: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: string, orgId: string): Promise<boolean>;
  
  getContacts(orgId: string, accountId?: string): Promise<Contact[]>;
  getContact(id: string, orgId: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, orgId: string, data: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: string, orgId: string): Promise<boolean>;
  
  getDeals(orgId: string, stage?: DealStage): Promise<Deal[]>;
  getDeal(id: string, orgId: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, orgId: string, data: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: string, orgId: string): Promise<boolean>;
  updateDealStage(id: string, orgId: string, stage: DealStage, position: number): Promise<Deal | undefined>;
  
  getActivities(orgId: string, dealId?: string, projectId?: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  getProjects(orgId: string, accountId?: string, status?: ProjectStatus): Promise<Project[]>;
  getProject(id: string, orgId: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, orgId: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string, orgId: string): Promise<boolean>;
  
  getTasks(orgId: string, projectId?: string, status?: TaskStatus): Promise<Task[]>;
  getTask(id: string, orgId: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, orgId: string, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string, orgId: string): Promise<boolean>;
  
  getInvoices(orgId: string, accountId?: string): Promise<Invoice[]>;
  getInvoice(id: string, orgId: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, orgId: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string, orgId: string): Promise<boolean>;
  
  getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]>;
  createInvoiceLineItem(item: InsertInvoiceLineItem): Promise<InvoiceLineItem>;
  deleteInvoiceLineItems(invoiceId: string): Promise<boolean>;
  
  getVendors(orgId: string): Promise<Vendor[]>;
  getVendor(id: string, orgId: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, orgId: string, data: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string, orgId: string): Promise<boolean>;
  
  getMissions(orgId: string, projectId?: string, vendorId?: string): Promise<Mission[]>;
  getMission(id: string, orgId: string): Promise<Mission | undefined>;
  createMission(mission: InsertMission): Promise<Mission>;
  updateMission(id: string, orgId: string, data: Partial<InsertMission>): Promise<Mission | undefined>;
  deleteMission(id: string, orgId: string): Promise<boolean>;
  
  getDocuments(orgId: string, projectId?: string, accountId?: string): Promise<Document[]>;
  getDocument(id: string, orgId: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string, orgId: string): Promise<boolean>;
  
  getWorkflowRuns(orgId: string): Promise<WorkflowRun[]>;
  getWorkflowRun(id: string, orgId: string): Promise<WorkflowRun | undefined>;
  createWorkflowRun(run: InsertWorkflowRun): Promise<WorkflowRun>;
  updateWorkflowRun(id: string, orgId: string, data: Partial<InsertWorkflowRun>): Promise<WorkflowRun | undefined>;
  
  createImportJob(job: InsertImportJob): Promise<ImportJob>;
  getImportJob(id: string, orgId: string): Promise<ImportJob | undefined>;
  updateImportJob(id: string, orgId: string, data: Partial<InsertImportJob>): Promise<ImportJob | undefined>;
  getImportJobs(orgId: string): Promise<ImportJob[]>;
  
  getContracts(orgId: string, type?: ContractType, status?: ContractStatus): Promise<Contract[]>;
  getContract(id: string, orgId: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, orgId: string, data: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: string, orgId: string): Promise<boolean>;
  getContractsByDeal(dealId: string, orgId: string): Promise<Contract[]>;
  getContractsByAccount(accountId: string, orgId: string): Promise<Contract[]>;
  generateContractNumber(orgId: string, type: ContractType): Promise<string>;
  
  getDashboardStats(orgId: string): Promise<{
    totalDeals: number;
    totalPipeline: number;
    wonDeals: number;
    wonValue: number;
    activeProjects: number;
    pendingTasks: number;
    pendingInvoices: number;
    pendingInvoicesValue: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async createOrganizationWithId(id: string, org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values({ ...org, id }).returning();
    return created;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createMembership(membership: InsertMembership): Promise<Membership> {
    const [created] = await db.insert(memberships).values(membership).returning();
    return created;
  }

  async getMembershipByUserAndOrg(userId: string, orgId: string): Promise<Membership | undefined> {
    const [membership] = await db.select().from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)));
    return membership;
  }

  async getMembershipsByOrg(orgId: string): Promise<Membership[]> {
    return db.select().from(memberships).where(eq(memberships.orgId, orgId));
  }

  async getAccounts(orgId: string): Promise<Account[]> {
    return db.select().from(accounts).where(eq(accounts.orgId, orgId)).orderBy(desc(accounts.createdAt));
  }

  async getAccount(id: string, orgId: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.orgId, orgId)));
    return account;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [created] = await db.insert(accounts).values(account).returning();
    return created;
  }

  async updateAccount(id: string, orgId: string, data: Partial<InsertAccount>): Promise<Account | undefined> {
    const [updated] = await db.update(accounts).set(data)
      .where(and(eq(accounts.id, id), eq(accounts.orgId, orgId))).returning();
    return updated;
  }

  async deleteAccount(id: string, orgId: string): Promise<boolean> {
    const result = await db.delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.orgId, orgId)));
    return true;
  }

  async getContacts(orgId: string, accountId?: string): Promise<Contact[]> {
    if (accountId) {
      return db.select().from(contacts)
        .where(and(eq(contacts.orgId, orgId), eq(contacts.accountId, accountId)))
        .orderBy(desc(contacts.createdAt));
    }
    return db.select().from(contacts).where(eq(contacts.orgId, orgId)).orderBy(desc(contacts.createdAt));
  }

  async getContact(id: string, orgId: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)));
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [created] = await db.insert(contacts).values(contact).returning();
    return created;
  }

  async updateContact(id: string, orgId: string, data: Partial<InsertContact>): Promise<Contact | undefined> {
    const [updated] = await db.update(contacts).set(data)
      .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId))).returning();
    return updated;
  }

  async deleteContact(id: string, orgId: string): Promise<boolean> {
    await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)));
    return true;
  }

  async getDeals(orgId: string, stage?: DealStage): Promise<Deal[]> {
    const baseQuery = db.select({
      id: deals.id,
      orgId: deals.orgId,
      accountId: deals.accountId,
      contactId: deals.contactId,
      ownerId: deals.ownerId,
      amount: deals.amount,
      probability: deals.probability,
      stage: deals.stage,
      nextAction: deals.nextAction,
      nextActionDate: deals.nextActionDate,
      daysInStage: deals.daysInStage,
      position: deals.position,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      accountName: accounts.name,
      contactName: contacts.name,
      ownerName: users.name,
      ownerEmail: users.email,
    }).from(deals)
      .leftJoin(accounts, eq(deals.accountId, accounts.id))
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(users, eq(deals.ownerId, users.id));

    if (stage) {
      return baseQuery
        .where(and(eq(deals.orgId, orgId), eq(deals.stage, stage)))
        .orderBy(asc(deals.position), desc(deals.createdAt));
    }
    return baseQuery.where(eq(deals.orgId, orgId)).orderBy(asc(deals.position), desc(deals.createdAt));
  }

  async getDeal(id: string, orgId: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals)
      .where(and(eq(deals.id, id), eq(deals.orgId, orgId)));
    return deal;
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [created] = await db.insert(deals).values(deal).returning();
    return created;
  }

  async updateDeal(id: string, orgId: string, data: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [updated] = await db.update(deals).set({ ...data, updatedAt: new Date() })
      .where(and(eq(deals.id, id), eq(deals.orgId, orgId))).returning();
    return updated;
  }

  async deleteDeal(id: string, orgId: string): Promise<boolean> {
    await db.delete(deals).where(and(eq(deals.id, id), eq(deals.orgId, orgId)));
    return true;
  }

  async updateDealStage(id: string, orgId: string, stage: DealStage, position: number): Promise<Deal | undefined> {
    const [updated] = await db.update(deals)
      .set({ stage, position, daysInStage: 0, updatedAt: new Date() })
      .where(and(eq(deals.id, id), eq(deals.orgId, orgId))).returning();
    return updated;
  }

  async getActivities(orgId: string, dealId?: string, projectId?: string): Promise<Activity[]> {
    if (dealId) {
      return db.select().from(activities)
        .where(and(eq(activities.orgId, orgId), eq(activities.dealId, dealId)))
        .orderBy(desc(activities.createdAt));
    }
    if (projectId) {
      return db.select().from(activities)
        .where(and(eq(activities.orgId, orgId), eq(activities.projectId, projectId)))
        .orderBy(desc(activities.createdAt));
    }
    return db.select().from(activities).where(eq(activities.orgId, orgId)).orderBy(desc(activities.createdAt)).limit(50);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [created] = await db.insert(activities).values(activity).returning();
    return created;
  }

  async getProjects(orgId: string, accountId?: string, status?: ProjectStatus): Promise<Project[]> {
    if (accountId && status) {
      return db.select().from(projects)
        .where(and(eq(projects.orgId, orgId), eq(projects.accountId, accountId), eq(projects.status, status)))
        .orderBy(desc(projects.createdAt));
    }
    if (accountId) {
      return db.select().from(projects)
        .where(and(eq(projects.orgId, orgId), eq(projects.accountId, accountId)))
        .orderBy(desc(projects.createdAt));
    }
    if (status) {
      return db.select().from(projects)
        .where(and(eq(projects.orgId, orgId), eq(projects.status, status)))
        .orderBy(desc(projects.createdAt));
    }
    return db.select().from(projects).where(eq(projects.orgId, orgId)).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string, orgId: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, id), eq(projects.orgId, orgId)));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, orgId: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.orgId, orgId))).returning();
    return updated;
  }

  async deleteProject(id: string, orgId: string): Promise<boolean> {
    await db.delete(projects).where(and(eq(projects.id, id), eq(projects.orgId, orgId)));
    return true;
  }

  async getTasks(orgId: string, projectId?: string, status?: TaskStatus): Promise<Task[]> {
    if (projectId && status) {
      return db.select().from(tasks)
        .where(and(eq(tasks.orgId, orgId), eq(tasks.projectId, projectId), eq(tasks.status, status)))
        .orderBy(desc(tasks.createdAt));
    }
    if (projectId) {
      return db.select().from(tasks)
        .where(and(eq(tasks.orgId, orgId), eq(tasks.projectId, projectId)))
        .orderBy(desc(tasks.createdAt));
    }
    if (status) {
      return db.select().from(tasks)
        .where(and(eq(tasks.orgId, orgId), eq(tasks.status, status)))
        .orderBy(desc(tasks.createdAt));
    }
    return db.select().from(tasks).where(eq(tasks.orgId, orgId)).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string, orgId: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, orgId: string, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId))).returning();
    return updated;
  }

  async deleteTask(id: string, orgId: string): Promise<boolean> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));
    return true;
  }

  async getInvoices(orgId: string, accountId?: string): Promise<Invoice[]> {
    if (accountId) {
      return db.select().from(invoices)
        .where(and(eq(invoices.orgId, orgId), eq(invoices.accountId, accountId)))
        .orderBy(desc(invoices.createdAt));
    }
    return db.select().from(invoices).where(eq(invoices.orgId, orgId)).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string, orgId: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async updateInvoice(id: string, orgId: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set({ ...data, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId))).returning();
    return updated;
  }

  async deleteInvoice(id: string, orgId: string): Promise<boolean> {
    await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)));
    return true;
  }

  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    return db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
  }

  async createInvoiceLineItem(item: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const [created] = await db.insert(invoiceLineItems).values(item).returning();
    return created;
  }

  async deleteInvoiceLineItems(invoiceId: string): Promise<boolean> {
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
    return true;
  }

  async getVendors(orgId: string): Promise<Vendor[]> {
    return db.select().from(vendors).where(eq(vendors.orgId, orgId)).orderBy(desc(vendors.createdAt));
  }

  async getVendor(id: string, orgId: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors)
      .where(and(eq(vendors.id, id), eq(vendors.orgId, orgId)));
    return vendor;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [created] = await db.insert(vendors).values(vendor).returning();
    return created;
  }

  async updateVendor(id: string, orgId: string, data: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [updated] = await db.update(vendors).set(data)
      .where(and(eq(vendors.id, id), eq(vendors.orgId, orgId))).returning();
    return updated;
  }

  async deleteVendor(id: string, orgId: string): Promise<boolean> {
    await db.delete(vendors).where(and(eq(vendors.id, id), eq(vendors.orgId, orgId)));
    return true;
  }

  async getMissions(orgId: string, projectId?: string, vendorId?: string): Promise<Mission[]> {
    if (projectId) {
      return db.select().from(missions)
        .where(and(eq(missions.orgId, orgId), eq(missions.projectId, projectId)))
        .orderBy(desc(missions.createdAt));
    }
    if (vendorId) {
      return db.select().from(missions)
        .where(and(eq(missions.orgId, orgId), eq(missions.vendorId, vendorId)))
        .orderBy(desc(missions.createdAt));
    }
    return db.select().from(missions).where(eq(missions.orgId, orgId)).orderBy(desc(missions.createdAt));
  }

  async getMission(id: string, orgId: string): Promise<Mission | undefined> {
    const [mission] = await db.select().from(missions)
      .where(and(eq(missions.id, id), eq(missions.orgId, orgId)));
    return mission;
  }

  async createMission(mission: InsertMission): Promise<Mission> {
    const [created] = await db.insert(missions).values(mission).returning();
    return created;
  }

  async updateMission(id: string, orgId: string, data: Partial<InsertMission>): Promise<Mission | undefined> {
    const [updated] = await db.update(missions).set({ ...data, updatedAt: new Date() })
      .where(and(eq(missions.id, id), eq(missions.orgId, orgId))).returning();
    return updated;
  }

  async deleteMission(id: string, orgId: string): Promise<boolean> {
    await db.delete(missions).where(and(eq(missions.id, id), eq(missions.orgId, orgId)));
    return true;
  }

  async getDocuments(orgId: string, projectId?: string, accountId?: string): Promise<Document[]> {
    if (projectId) {
      return db.select().from(documents)
        .where(and(eq(documents.orgId, orgId), eq(documents.projectId, projectId)))
        .orderBy(desc(documents.createdAt));
    }
    if (accountId) {
      return db.select().from(documents)
        .where(and(eq(documents.orgId, orgId), eq(documents.accountId, accountId)))
        .orderBy(desc(documents.createdAt));
    }
    return db.select().from(documents).where(eq(documents.orgId, orgId)).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string, orgId: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents)
      .where(and(eq(documents.id, id), eq(documents.orgId, orgId)));
    return document;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }

  async deleteDocument(id: string, orgId: string): Promise<boolean> {
    await db.delete(documents).where(and(eq(documents.id, id), eq(documents.orgId, orgId)));
    return true;
  }

  async getWorkflowRuns(orgId: string): Promise<WorkflowRun[]> {
    return db.select().from(workflowRuns).where(eq(workflowRuns.orgId, orgId)).orderBy(desc(workflowRuns.startedAt));
  }

  async getWorkflowRun(id: string, orgId: string): Promise<WorkflowRun | undefined> {
    const [run] = await db.select().from(workflowRuns)
      .where(and(eq(workflowRuns.id, id), eq(workflowRuns.orgId, orgId)));
    return run;
  }

  async createWorkflowRun(run: InsertWorkflowRun): Promise<WorkflowRun> {
    const [created] = await db.insert(workflowRuns).values(run).returning();
    return created;
  }

  async updateWorkflowRun(id: string, orgId: string, data: Partial<InsertWorkflowRun>): Promise<WorkflowRun | undefined> {
    const [updated] = await db.update(workflowRuns).set(data)
      .where(and(eq(workflowRuns.id, id), eq(workflowRuns.orgId, orgId))).returning();
    return updated;
  }

  async createImportJob(job: InsertImportJob): Promise<ImportJob> {
    const [created] = await db.insert(importJobs).values(job).returning();
    return created;
  }

  async getImportJob(id: string, orgId: string): Promise<ImportJob | undefined> {
    const [job] = await db.select().from(importJobs)
      .where(and(eq(importJobs.id, id), eq(importJobs.orgId, orgId)));
    return job;
  }

  async updateImportJob(id: string, orgId: string, data: Partial<InsertImportJob>): Promise<ImportJob | undefined> {
    const [updated] = await db.update(importJobs).set(data)
      .where(and(eq(importJobs.id, id), eq(importJobs.orgId, orgId))).returning();
    return updated;
  }

  async getImportJobs(orgId: string): Promise<ImportJob[]> {
    return db.select().from(importJobs).where(eq(importJobs.orgId, orgId)).orderBy(desc(importJobs.startedAt));
  }

  async getDashboardStats(orgId: string): Promise<{
    totalDeals: number;
    totalPipeline: number;
    wonDeals: number;
    wonValue: number;
    activeProjects: number;
    pendingTasks: number;
    pendingInvoices: number;
    pendingInvoicesValue: number;
  }> {
    const allDeals = await db.select().from(deals).where(eq(deals.orgId, orgId));
    const wonDeals = allDeals.filter(d => d.stage === 'won');
    const activeProjects = await db.select().from(projects)
      .where(and(eq(projects.orgId, orgId), eq(projects.status, 'active')));
    const pendingTasks = await db.select().from(tasks)
      .where(and(eq(tasks.orgId, orgId), eq(tasks.status, 'pending')));
    const pendingInvoices = await db.select().from(invoices)
      .where(and(eq(invoices.orgId, orgId), eq(invoices.status, 'sent')));

    return {
      totalDeals: allDeals.length,
      totalPipeline: allDeals.reduce((sum, d) => sum + Number(d.amount), 0),
      wonDeals: wonDeals.length,
      wonValue: wonDeals.reduce((sum, d) => sum + Number(d.amount), 0),
      activeProjects: activeProjects.length,
      pendingTasks: pendingTasks.length,
      pendingInvoices: pendingInvoices.length,
      pendingInvoicesValue: pendingInvoices.reduce((sum, i) => sum + Number(i.amount), 0),
    };
  }

  async getContracts(orgId: string, type?: ContractType, status?: ContractStatus): Promise<Contract[]> {
    if (type && status) {
      return db.select().from(contracts)
        .where(and(eq(contracts.orgId, orgId), eq(contracts.type, type), eq(contracts.status, status)))
        .orderBy(desc(contracts.createdAt));
    }
    if (type) {
      return db.select().from(contracts)
        .where(and(eq(contracts.orgId, orgId), eq(contracts.type, type)))
        .orderBy(desc(contracts.createdAt));
    }
    if (status) {
      return db.select().from(contracts)
        .where(and(eq(contracts.orgId, orgId), eq(contracts.status, status)))
        .orderBy(desc(contracts.createdAt));
    }
    return db.select().from(contracts).where(eq(contracts.orgId, orgId)).orderBy(desc(contracts.createdAt));
  }

  async getContract(id: string, orgId: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.orgId, orgId)));
    return contract;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [created] = await db.insert(contracts).values(contract).returning();
    return created;
  }

  async updateContract(id: string, orgId: string, data: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updated] = await db.update(contracts).set({ ...data, updatedAt: new Date() })
      .where(and(eq(contracts.id, id), eq(contracts.orgId, orgId))).returning();
    return updated;
  }

  async deleteContract(id: string, orgId: string): Promise<boolean> {
    await db.delete(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, orgId)));
    return true;
  }

  async getContractsByDeal(dealId: string, orgId: string): Promise<Contract[]> {
    return db.select().from(contracts)
      .where(and(eq(contracts.orgId, orgId), eq(contracts.dealId, dealId)))
      .orderBy(desc(contracts.createdAt));
  }

  async getContractsByAccount(accountId: string, orgId: string): Promise<Contract[]> {
    return db.select().from(contracts)
      .where(and(eq(contracts.orgId, orgId), eq(contracts.accountId, accountId)))
      .orderBy(desc(contracts.createdAt));
  }

  async generateContractNumber(orgId: string, type: ContractType): Promise<string> {
    const year = new Date().getFullYear();
    const typePrefix = type === 'audit' ? 'AUD' : type === 'prestation' ? 'PRE' : type === 'formation' ? 'FOR' : 'SUI';
    const existingContracts = await db.select().from(contracts)
      .where(and(eq(contracts.orgId, orgId), eq(contracts.type, type)));
    const nextNumber = String(existingContracts.length + 1).padStart(4, '0');
    return `${typePrefix}-${year}-${nextNumber}`;
  }
}

export const storage = new DatabaseStorage();
