import { db } from "./db";
import { eq, and, desc, asc, sql, isNotNull } from "drizzle-orm";
import {
  organizations, users, memberships, accounts, contacts, deals, quotes, activities,
  projects, tasks, invoices, invoiceLineItems, vendors, missions, documents,
  workflowRuns, importJobs, contracts, expenses, invitations, emails,
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
  type Expense, type InsertExpense,
  type Invitation, type InsertInvitation,
  type Email, type InsertEmail,
  type Quote, type InsertQuote,
  type DealStage, type TaskStatus, type ProjectStatus, type ContractType, type ContractStatus,
  type ExpenseStatus, type ExpenseCategory, type InvitationStatus
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
  
  getQuotesByDeal(dealId: string, orgId: string): Promise<Quote[]>;
  getQuote(id: string, orgId: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, orgId: string, data: Partial<InsertQuote>): Promise<Quote | undefined>;
  
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
  getContractByIdOnly(id: string): Promise<Contract | undefined>; // For public token-validated access
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, orgId: string, data: Partial<InsertContract>): Promise<Contract | undefined>;
  updateContractByIdOnly(id: string, data: Partial<InsertContract>): Promise<Contract | undefined>; // For public token-validated updates
  deleteContract(id: string, orgId: string): Promise<boolean>;
  getContractsByDeal(dealId: string, orgId: string): Promise<Contract[]>;
  getContractsByAccount(accountId: string, orgId: string): Promise<Contract[]>;
  generateContractNumber(orgId: string, type: ContractType): Promise<string>;
  
  getExpenses(orgId: string, category?: ExpenseCategory, status?: ExpenseStatus): Promise<Expense[]>;
  getExpense(id: string, orgId: string): Promise<Expense | undefined>;
  getExpenseByNotionPageId(notionPageId: string, orgId: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, orgId: string, data: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string, orgId: string): Promise<boolean>;
  upsertExpenseByNotionId(notionPageId: string, orgId: string, data: InsertExpense): Promise<Expense>;
  
  getAccountByNotionPageId(notionPageId: string, orgId: string): Promise<Account | undefined>;
  upsertAccountByNotionId(notionPageId: string, orgId: string, data: InsertAccount): Promise<Account>;
  
  getContactByNotionPageId(notionPageId: string, orgId: string): Promise<Contact | undefined>;
  upsertContactByNotionId(notionPageId: string, orgId: string, data: InsertContact): Promise<Contact>;
  
  getDealByNotionPageId(notionPageId: string, orgId: string): Promise<Deal | undefined>;
  upsertDealByNotionId(notionPageId: string, orgId: string, data: InsertDeal): Promise<Deal>;
  
  getProjectByNotionPageId(notionPageId: string, orgId: string): Promise<Project | undefined>;
  upsertProjectByNotionId(notionPageId: string, orgId: string, data: InsertProject): Promise<Project>;
  
  getTaskByNotionPageId(notionPageId: string, orgId: string): Promise<Task | undefined>;
  upsertTaskByNotionId(notionPageId: string, orgId: string, data: InsertTask): Promise<Task>;
  
  getInvoiceByNotionPageId(notionPageId: string, orgId: string): Promise<Invoice | undefined>;
  upsertInvoiceByNotionId(notionPageId: string, orgId: string, data: InsertInvoice): Promise<Invoice>;
  
  getVendorByNotionPageId(notionPageId: string, orgId: string): Promise<Vendor | undefined>;
  upsertVendorByNotionId(notionPageId: string, orgId: string, data: InsertVendor): Promise<Vendor>;
  
  getMissionByNotionPageId(notionPageId: string, orgId: string): Promise<Mission | undefined>;
  upsertMissionByNotionId(notionPageId: string, orgId: string, data: InsertMission): Promise<Mission>;
  
  getDocumentByNotionPageId(notionPageId: string, orgId: string): Promise<Document | undefined>;
  upsertDocumentByNotionId(notionPageId: string, orgId: string, data: InsertDocument): Promise<Document>;
  
  getAllAccountNotionIdMap(orgId: string): Promise<Map<string, string>>;
  getAllContactNotionIdMap(orgId: string): Promise<Map<string, string>>;
  getAllDealNotionIdMap(orgId: string): Promise<Map<string, string>>;
  getAllProjectNotionIdMap(orgId: string): Promise<Map<string, string>>;
  getAllVendorNotionIdMap(orgId: string): Promise<Map<string, string>>;
  
  getInvitations(orgId: string, status?: InvitationStatus): Promise<Invitation[]>;
  getInvitation(id: string, orgId: string): Promise<Invitation | undefined>;
  getInvitationByToken(tokenHash: string): Promise<Invitation | undefined>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  updateInvitation(id: string, orgId: string, data: Partial<InsertInvitation>): Promise<Invitation | undefined>;
  deleteInvitation(id: string, orgId: string): Promise<boolean>;
  acceptInvitation(id: string): Promise<Invitation | undefined>;
  revokeInvitation(id: string, orgId: string): Promise<Invitation | undefined>;
  
  getEmails(orgId: string, accountId?: string, dealId?: string): Promise<Email[]>;
  getEmail(id: string, orgId: string): Promise<Email | undefined>;
  getEmailByGmailId(gmailMessageId: string, orgId: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: string, orgId: string, data: Partial<InsertEmail>): Promise<Email | undefined>;
  deleteEmail(id: string, orgId: string): Promise<boolean>;
  
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
    // First delete related deals
    await db.delete(deals).where(eq(deals.accountId, id));
    // Then delete related contacts
    await db.delete(contacts).where(eq(contacts.accountId, id));
    // Then delete the account
    await db.delete(accounts)
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
      name: deals.name,
      orgId: deals.orgId,
      accountId: deals.accountId,
      contactId: deals.contactId,
      ownerId: deals.ownerId,
      amount: deals.amount,
      probability: deals.probability,
      stage: deals.stage,
      missionTypes: deals.missionTypes,
      nextAction: deals.nextAction,
      nextActionDate: deals.nextActionDate,
      daysInStage: deals.daysInStage,
      position: deals.position,
      notionPageId: deals.notionPageId,
      notionLastEditedAt: deals.notionLastEditedAt,
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
        .orderBy(asc(deals.position), desc(deals.createdAt)) as unknown as Promise<Deal[]>;
    }
    return baseQuery.where(eq(deals.orgId, orgId)).orderBy(asc(deals.position), desc(deals.createdAt)) as unknown as Promise<Deal[]>;
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

  async getQuotesByDeal(dealId: string, orgId: string): Promise<Quote[]> {
    return db.select().from(quotes)
      .where(and(eq(quotes.dealId, dealId), eq(quotes.orgId, orgId)))
      .orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: string, orgId: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)));
    return quote;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [created] = await db.insert(quotes).values(quote).returning();
    return created;
  }

  async updateQuote(id: string, orgId: string, data: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [updated] = await db.update(quotes)
      .set(data)
      .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId))).returning();
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

  async getContractByIdOnly(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts)
      .where(eq(contracts.id, id));
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

  async updateContractByIdOnly(id: string, data: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updated] = await db.update(contracts).set({ ...data, updatedAt: new Date() })
      .where(eq(contracts.id, id)).returning();
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
    const typePrefix = type === 'audit' ? 'AUD' 
      : type === 'prestation' ? 'PRE' 
      : type === 'formation' ? 'FOR' 
      : type === 'sous_traitance' ? 'STR'
      : 'SUI';
    const existingContracts = await db.select().from(contracts)
      .where(and(eq(contracts.orgId, orgId), eq(contracts.type, type)));
    const nextNumber = String(existingContracts.length + 1).padStart(4, '0');
    return `${typePrefix}-${year}-${nextNumber}`;
  }

  async getExpenses(orgId: string, category?: ExpenseCategory, status?: ExpenseStatus): Promise<Expense[]> {
    if (category && status) {
      return db.select().from(expenses)
        .where(and(eq(expenses.orgId, orgId), eq(expenses.category, category), eq(expenses.status, status)))
        .orderBy(desc(expenses.date));
    }
    if (category) {
      return db.select().from(expenses)
        .where(and(eq(expenses.orgId, orgId), eq(expenses.category, category)))
        .orderBy(desc(expenses.date));
    }
    if (status) {
      return db.select().from(expenses)
        .where(and(eq(expenses.orgId, orgId), eq(expenses.status, status)))
        .orderBy(desc(expenses.date));
    }
    return db.select().from(expenses).where(eq(expenses.orgId, orgId)).orderBy(desc(expenses.date));
  }

  async getExpense(id: string, orgId: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.orgId, orgId)));
    return expense;
  }

  async getExpenseByNotionPageId(notionPageId: string, orgId: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses)
      .where(and(eq(expenses.notionPageId, notionPageId), eq(expenses.orgId, orgId)));
    return expense;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async updateExpense(id: string, orgId: string, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses).set({ ...data, updatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.orgId, orgId))).returning();
    return updated;
  }

  async deleteExpense(id: string, orgId: string): Promise<boolean> {
    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.orgId, orgId)));
    return true;
  }

  async upsertExpenseByNotionId(notionPageId: string, orgId: string, data: InsertExpense): Promise<Expense> {
    const existing = await this.getExpenseByNotionPageId(notionPageId, orgId);
    if (existing) {
      const updated = await this.updateExpense(existing.id, orgId, data);
      return updated!;
    }
    return this.createExpense({ ...data, notionPageId });
  }

  async getAccountByNotionPageId(notionPageId: string, orgId: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.notionPageId, notionPageId), eq(accounts.orgId, orgId)));
    return account;
  }

  async upsertAccountByNotionId(notionPageId: string, orgId: string, data: InsertAccount): Promise<Account> {
    const existing = await this.getAccountByNotionPageId(notionPageId, orgId);
    if (existing) {
      const updated = await this.updateAccount(existing.id, orgId, data);
      return updated!;
    }
    return this.createAccount({ ...data, notionPageId });
  }

  async getContactByNotionPageId(notionPageId: string, orgId: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts)
      .where(and(eq(contacts.notionPageId, notionPageId), eq(contacts.orgId, orgId)));
    return contact;
  }

  async upsertContactByNotionId(notionPageId: string, orgId: string, data: InsertContact): Promise<Contact> {
    const existing = await this.getContactByNotionPageId(notionPageId, orgId);
    if (existing) {
      const updated = await this.updateContact(existing.id, orgId, data);
      return updated!;
    }
    return this.createContact({ ...data, notionPageId });
  }

  async getDealByNotionPageId(notionPageId: string, orgId: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals)
      .where(and(eq(deals.notionPageId, notionPageId), eq(deals.orgId, orgId)));
    return deal;
  }

  async upsertDealByNotionId(notionPageId: string, orgId: string, data: InsertDeal): Promise<Deal> {
    const existing = await this.getDealByNotionPageId(notionPageId, orgId);
    if (existing) {
      const updated = await this.updateDeal(existing.id, orgId, data);
      return updated!;
    }
    return this.createDeal({ ...data, notionPageId });
  }

  async getProjectByNotionPageId(notionPageId: string, orgId: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.notionPageId, notionPageId), eq(projects.orgId, orgId)));
    return project;
  }

  async upsertProjectByNotionId(notionPageId: string, orgId: string, data: InsertProject): Promise<Project> {
    const existing = await this.getProjectByNotionPageId(notionPageId, orgId);
    if (existing) {
      const updated = await this.updateProject(existing.id, orgId, data);
      return updated!;
    }
    return this.createProject({ ...data, notionPageId });
  }

  async getTaskByNotionPageId(notionPageId: string, orgId: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks)
      .where(and(eq(tasks.notionPageId, notionPageId), eq(tasks.orgId, orgId)));
    return task;
  }

  async upsertTaskByNotionId(notionPageId: string, orgId: string, data: InsertTask): Promise<Task> {
    const existing = await this.getTaskByNotionPageId(notionPageId, orgId);
    if (existing) {
      const updated = await this.updateTask(existing.id, orgId, data);
      return updated!;
    }
    return this.createTask({ ...data, notionPageId });
  }

  async getInvoiceByNotionPageId(notionPageId: string, orgId: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(and(eq(invoices.notionPageId, notionPageId), eq(invoices.orgId, orgId)));
    return invoice;
  }

  async upsertInvoiceByNotionId(notionPageId: string, orgId: string, data: InsertInvoice): Promise<Invoice> {
    const existing = await this.getInvoiceByNotionPageId(notionPageId, orgId);
    if (existing) {
      const updated = await this.updateInvoice(existing.id, orgId, data);
      return updated!;
    }
    return this.createInvoice({ ...data, notionPageId });
  }

  async getVendorByNotionPageId(notionPageId: string, orgId: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors)
      .where(and(eq(vendors.notionPageId, notionPageId), eq(vendors.orgId, orgId)));
    return vendor;
  }

  async upsertVendorByNotionId(notionPageId: string, orgId: string, data: InsertVendor): Promise<Vendor> {
    const existing = await this.getVendorByNotionPageId(notionPageId, orgId);
    if (existing) {
      const updated = await this.updateVendor(existing.id, orgId, data);
      return updated!;
    }
    return this.createVendor({ ...data, notionPageId });
  }

  async getMissionByNotionPageId(notionPageId: string, orgId: string): Promise<Mission | undefined> {
    const [mission] = await db.select().from(missions)
      .where(and(eq(missions.notionPageId, notionPageId), eq(missions.orgId, orgId)));
    return mission;
  }

  async upsertMissionByNotionId(notionPageId: string, orgId: string, data: InsertMission): Promise<Mission> {
    const existing = await this.getMissionByNotionPageId(notionPageId, orgId);
    if (existing) {
      const updated = await this.updateMission(existing.id, orgId, data);
      return updated!;
    }
    return this.createMission({ ...data, notionPageId });
  }

  async getDocumentByNotionPageId(notionPageId: string, orgId: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents)
      .where(and(eq(documents.notionPageId, notionPageId), eq(documents.orgId, orgId)));
    return document;
  }

  async upsertDocumentByNotionId(notionPageId: string, orgId: string, data: InsertDocument): Promise<Document> {
    const existing = await this.getDocumentByNotionPageId(notionPageId, orgId);
    if (existing) {
      await db.delete(documents).where(and(eq(documents.id, existing.id), eq(documents.orgId, orgId)));
    }
    return this.createDocument({ ...data, notionPageId });
  }

  async getAllAccountNotionIdMap(orgId: string): Promise<Map<string, string>> {
    const accs = await db.select({ id: accounts.id, notionPageId: accounts.notionPageId })
      .from(accounts)
      .where(and(eq(accounts.orgId, orgId), isNotNull(accounts.notionPageId)));
    const map = new Map<string, string>();
    for (const acc of accs) {
      if (acc.notionPageId) map.set(acc.notionPageId, acc.id);
    }
    return map;
  }

  async getAllContactNotionIdMap(orgId: string): Promise<Map<string, string>> {
    const cons = await db.select({ id: contacts.id, notionPageId: contacts.notionPageId })
      .from(contacts)
      .where(and(eq(contacts.orgId, orgId), isNotNull(contacts.notionPageId)));
    const map = new Map<string, string>();
    for (const con of cons) {
      if (con.notionPageId) map.set(con.notionPageId, con.id);
    }
    return map;
  }

  async getAllDealNotionIdMap(orgId: string): Promise<Map<string, string>> {
    const dls = await db.select({ id: deals.id, notionPageId: deals.notionPageId })
      .from(deals)
      .where(and(eq(deals.orgId, orgId), isNotNull(deals.notionPageId)));
    const map = new Map<string, string>();
    for (const dl of dls) {
      if (dl.notionPageId) map.set(dl.notionPageId, dl.id);
    }
    return map;
  }

  async getAllProjectNotionIdMap(orgId: string): Promise<Map<string, string>> {
    const prjs = await db.select({ id: projects.id, notionPageId: projects.notionPageId })
      .from(projects)
      .where(and(eq(projects.orgId, orgId), isNotNull(projects.notionPageId)));
    const map = new Map<string, string>();
    for (const prj of prjs) {
      if (prj.notionPageId) map.set(prj.notionPageId, prj.id);
    }
    return map;
  }

  async getAllVendorNotionIdMap(orgId: string): Promise<Map<string, string>> {
    const vndrs = await db.select({ id: vendors.id, notionPageId: vendors.notionPageId })
      .from(vendors)
      .where(and(eq(vendors.orgId, orgId), isNotNull(vendors.notionPageId)));
    const map = new Map<string, string>();
    for (const vndr of vndrs) {
      if (vndr.notionPageId) map.set(vndr.notionPageId, vndr.id);
    }
    return map;
  }

  async getInvitations(orgId: string, status?: InvitationStatus): Promise<Invitation[]> {
    if (status) {
      return db.select().from(invitations)
        .where(and(eq(invitations.orgId, orgId), eq(invitations.status, status)))
        .orderBy(desc(invitations.createdAt));
    }
    return db.select().from(invitations)
      .where(eq(invitations.orgId, orgId))
      .orderBy(desc(invitations.createdAt));
  }

  async getInvitation(id: string, orgId: string): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.orgId, orgId)));
    return invitation;
  }

  async getInvitationByToken(tokenHash: string): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations)
      .where(eq(invitations.tokenHash, tokenHash));
    return invitation;
  }

  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [created] = await db.insert(invitations).values(invitation).returning();
    return created;
  }

  async updateInvitation(id: string, orgId: string, data: Partial<InsertInvitation>): Promise<Invitation | undefined> {
    const [updated] = await db.update(invitations).set(data)
      .where(and(eq(invitations.id, id), eq(invitations.orgId, orgId)))
      .returning();
    return updated;
  }

  async deleteInvitation(id: string, orgId: string): Promise<boolean> {
    const result = await db.delete(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.orgId, orgId)));
    return true;
  }

  async acceptInvitation(id: string): Promise<Invitation | undefined> {
    const [updated] = await db.update(invitations)
      .set({ status: 'accepted', usedAt: new Date() })
      .where(eq(invitations.id, id))
      .returning();
    return updated;
  }

  async revokeInvitation(id: string, orgId: string): Promise<Invitation | undefined> {
    const [updated] = await db.update(invitations)
      .set({ status: 'revoked' })
      .where(and(eq(invitations.id, id), eq(invitations.orgId, orgId)))
      .returning();
    return updated;
  }

  async getEmails(orgId: string, accountId?: string, dealId?: string): Promise<Email[]> {
    if (accountId) {
      return db.select().from(emails)
        .where(and(eq(emails.orgId, orgId), eq(emails.accountId, accountId)))
        .orderBy(desc(emails.receivedAt));
    }
    if (dealId) {
      return db.select().from(emails)
        .where(and(eq(emails.orgId, orgId), eq(emails.dealId, dealId)))
        .orderBy(desc(emails.receivedAt));
    }
    return db.select().from(emails)
      .where(eq(emails.orgId, orgId))
      .orderBy(desc(emails.receivedAt));
  }

  async getEmail(id: string, orgId: string): Promise<Email | undefined> {
    const [email] = await db.select().from(emails)
      .where(and(eq(emails.id, id), eq(emails.orgId, orgId)));
    return email;
  }

  async getEmailByGmailId(gmailMessageId: string, orgId: string): Promise<Email | undefined> {
    const [email] = await db.select().from(emails)
      .where(and(eq(emails.gmailMessageId, gmailMessageId), eq(emails.orgId, orgId)));
    return email;
  }

  async createEmail(email: InsertEmail): Promise<Email> {
    const [created] = await db.insert(emails).values(email).returning();
    return created;
  }

  async updateEmail(id: string, orgId: string, data: Partial<InsertEmail>): Promise<Email | undefined> {
    const [updated] = await db.update(emails).set(data)
      .where(and(eq(emails.id, id), eq(emails.orgId, orgId)))
      .returning();
    return updated;
  }

  async deleteEmail(id: string, orgId: string): Promise<boolean> {
    await db.delete(emails).where(and(eq(emails.id, id), eq(emails.orgId, orgId)));
    return true;
  }
}

export const storage = new DatabaseStorage();
