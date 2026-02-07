import { db } from "./db";

export { db };
import { eq, and, desc, asc, sql, isNotNull, isNull, gte, lte } from "drizzle-orm";
import {
  organizations, users, memberships, accounts, contacts, deals, quotes, quoteLineItems, activities,
  projects, projectVendors, tasks, invoices, invoiceLineItems, vendors, missions, documents,
  workflowRuns, importJobs, contracts, expenses, invitations, emails, calendarEvents, followUpHistory, projectComments,
  channels, channelMessages, channelAttachments, accountLoomVideos, accountUpdates, projectUpdates, projectDeliverables,
  deliverableComplianceSteps, complianceWorkflowTemplates,
  vendorAvailabilities,
  notifications, vendorProjectEvents, directConversations, directMessages, emailTemplates,
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
  type CalendarEvent, type InsertCalendarEvent,
  type Quote, type InsertQuote,
  type QuoteLineItem, type InsertQuoteLineItem,
  type FollowUpHistory, type InsertFollowUpHistory,
  type ProjectComment, type InsertProjectComment,
  type Channel, type InsertChannel,
  type ChannelMessage, type InsertChannelMessage,
  type ChannelAttachment, type InsertChannelAttachment,
  type AccountLoomVideo, type InsertAccountLoomVideo,
  type AccountUpdate, type InsertAccountUpdate,
  type ProjectUpdate, type InsertProjectUpdate,
  type ProjectDeliverable, type InsertProjectDeliverable,
  type ComplianceStep, type InsertComplianceStep, type ComplianceStepStatus, type ComplianceStepType,
  type ComplianceTemplate, type InsertComplianceTemplate,
  type Notification, type InsertNotification,
  type VendorProjectEvent, type InsertVendorProjectEvent,
  type DirectConversation, type InsertDirectConversation,
  type DirectMessage, type InsertDirectMessage,
  type EmailTemplate, type InsertEmailTemplate,
  type VendorAvailabilityRecord, type InsertVendorAvailability,
  type ProjectVendor, type InsertProjectVendor, type ProjectVendorRole,
  type DealStage, type TaskStatus, type ProjectStatus, type ContractType, type ContractStatus,
  type ExpenseStatus, type ExpenseCategory, type InvitationStatus, type FollowUpType,
  type ChannelType, type ChannelScope, type VendorProjectEventType, type DirectMessageStatus
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
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
  
  getQuotes(orgId: string): Promise<Quote[]>;
  getQuotesByDeal(dealId: string, orgId: string): Promise<Quote[]>;
  getQuote(id: string, orgId: string): Promise<Quote | undefined>;
  getQuoteByIdOnly(id: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, orgId: string, data: Partial<InsertQuote>): Promise<Quote | undefined>;
  updateQuoteByIdOnly(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined>;

  getQuoteLineItems(quoteId: string): Promise<QuoteLineItem[]>;
  createQuoteLineItem(item: InsertQuoteLineItem): Promise<QuoteLineItem>;
  deleteQuoteLineItems(quoteId: string): Promise<boolean>;
  
  getActivities(orgId: string, dealId?: string, projectId?: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  getProjects(orgId: string, accountId?: string, status?: ProjectStatus): Promise<Project[]>;
  getProjectsByVendor(vendorId: string, orgId: string): Promise<Project[]>;
  getVendorAssignedProjectIds(vendorId: string, orgId: string): Promise<string[]>;
  isVendorAssignedToProject(vendorId: string, projectId: string, orgId: string): Promise<boolean>;
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
  
  getFollowUpHistory(dealId: string, orgId: string): Promise<FollowUpHistory[]>;
  createFollowUpHistory(followUp: InsertFollowUpHistory): Promise<FollowUpHistory>;
  updateFollowUpHistory(id: string, orgId: string, data: Partial<InsertFollowUpHistory>): Promise<FollowUpHistory | undefined>;
  
  getProjectComments(projectId: string, orgId: string): Promise<ProjectComment[]>;
  createProjectComment(comment: InsertProjectComment): Promise<ProjectComment>;
  
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

  // Vendor Availabilities
  getVendorAvailabilities(vendorId: string, orgId: string): Promise<VendorAvailabilityRecord[]>;
  getVendorAvailabilitiesByDateRange(orgId: string, start: Date, end: Date): Promise<VendorAvailabilityRecord[]>;
  getVendorAvailability(id: string, orgId: string): Promise<VendorAvailabilityRecord | undefined>;
  createVendorAvailability(data: InsertVendorAvailability): Promise<VendorAvailabilityRecord>;
  updateVendorAvailability(id: string, orgId: string, data: Partial<InsertVendorAvailability>): Promise<VendorAvailabilityRecord | undefined>;
  deleteVendorAvailability(id: string, orgId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Case-insensitive email lookup
    const normalizedEmail = email.toLowerCase();
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = ${normalizedEmail}`);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
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

  async getMembershipsByUser(userId: string, orgId: string): Promise<Membership[]> {
    return db.select().from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)));
  }

  async getMembershipsByOrg(orgId: string): Promise<Membership[]> {
    return db.select().from(memberships).where(eq(memberships.orgId, orgId));
  }

  async updateMembership(id: string, orgId: string, updates: Partial<InsertMembership>): Promise<Membership | undefined> {
    const [updated] = await db.update(memberships)
      .set(updates)
      .where(and(eq(memberships.id, id), eq(memberships.orgId, orgId)))
      .returning();
    return updated;
  }

  async deleteMembership(id: string, orgId: string): Promise<void> {
    await db.delete(memberships)
      .where(and(eq(memberships.id, id), eq(memberships.orgId, orgId)));
  }

  async deactivateUser(userId: string): Promise<void> {
    await db.update(users)
      .set({
        isActive: false,
        deactivatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async reactivateUser(userId: string): Promise<void> {
    await db.update(users)
      .set({
        isActive: true,
        deactivatedAt: null
      })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users)
      .where(eq(users.id, userId));
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
    console.log(`[deleteAccount] Deleting account ${id} (CASCADE will handle all linked entities)...`);

    // Thanks to CASCADE constraints at the DB level, a single query is sufficient
    // This will automatically delete: projects, contacts, deals, memberships, invitations,
    // channels, and all their child entities (tasks, invoices, documents, etc.)
    await db.delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.orgId, orgId)));

    console.log(`[deleteAccount] Account deleted successfully with all linked entities via CASCADE`);
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
      auditAmount: deals.auditAmount,
      developmentAmount: deals.developmentAmount,
      recurringAmount: deals.recurringAmount,
      probability: deals.probability,
      stage: deals.stage,
      missionTypes: deals.missionTypes,
      nextAction: deals.nextAction,
      nextActionDate: deals.nextActionDate,
      daysInStage: deals.daysInStage,
      position: deals.position,
      notes: deals.notes,
      prospectStatus: deals.prospectStatus,
      followUpDate: deals.followUpDate,
      followUpNotes: deals.followUpNotes,
      score: deals.score,
      contactPhone: deals.contactPhone,
      contactEmail: deals.contactEmail,
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
    // Delete follow-up history referencing this deal (required FK)
    await db.execute(sql`DELETE FROM follow_up_history WHERE deal_id = ${id}`);
    // Delete quote line items first, then quotes (required FK)
    await db.execute(sql`DELETE FROM quote_line_items WHERE quote_id IN (SELECT id FROM quotes WHERE deal_id = ${id})`);
    await db.execute(sql`DELETE FROM quotes WHERE deal_id = ${id}`);
    // Delete activities referencing this deal (nullable FK)
    await db.execute(sql`DELETE FROM activities WHERE deal_id = ${id}`);
    // Delete documents referencing this deal (nullable FK)
    await db.execute(sql`DELETE FROM documents WHERE deal_id = ${id}`);
    // Delete emails referencing this deal (nullable FK)
    await db.execute(sql`DELETE FROM emails WHERE deal_id = ${id}`);
    // Set dealId to null on calendar_events, contracts, projects (nullable FKs)
    await db.execute(sql`UPDATE calendar_events SET deal_id = NULL WHERE deal_id = ${id}`);
    await db.execute(sql`UPDATE contracts SET deal_id = NULL WHERE deal_id = ${id}`);
    await db.execute(sql`UPDATE projects SET deal_id = NULL WHERE deal_id = ${id}`);
    // Finally delete the deal
    await db.delete(deals).where(and(eq(deals.id, id), eq(deals.orgId, orgId)));
    return true;
  }

  async updateDealStage(id: string, orgId: string, stage: DealStage, position: number): Promise<Deal | undefined> {
    const [updated] = await db.update(deals)
      .set({ stage, position, daysInStage: 0, updatedAt: new Date() })
      .where(and(eq(deals.id, id), eq(deals.orgId, orgId))).returning();
    return updated;
  }

  async getQuotes(orgId: string): Promise<Quote[]> {
    return db.select().from(quotes)
      .where(eq(quotes.orgId, orgId))
      .orderBy(desc(quotes.createdAt));
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

  async getQuoteByIdOnly(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes)
      .where(eq(quotes.id, id));
    return quote;
  }

  async updateQuoteByIdOnly(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [updated] = await db.update(quotes)
      .set(data)
      .where(eq(quotes.id, id)).returning();
    return updated;
  }

  async getQuoteLineItems(quoteId: string): Promise<QuoteLineItem[]> {
    return db.select().from(quoteLineItems)
      .where(eq(quoteLineItems.quoteId, quoteId))
      .orderBy(asc(quoteLineItems.sortOrder));
  }

  async createQuoteLineItem(item: InsertQuoteLineItem): Promise<QuoteLineItem> {
    const [created] = await db.insert(quoteLineItems).values(item).returning();
    return created;
  }

  async deleteQuoteLineItems(quoteId: string): Promise<boolean> {
    await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId));
    return true;
  }

  async deleteQuote(id: string, orgId: string): Promise<boolean> {
    await db.delete(quotes).where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)));
    return true;
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

  async getProjectsByVendor(vendorId: string, orgId: string): Promise<Project[]> {
    // Projects with vendorId direct reference (post-migration data)
    const projectsWithVendorId = await db.select().from(projects)
      .where(and(
        eq(projects.orgId, orgId),
        eq(projects.vendorId, vendorId)
      ))
      .orderBy(desc(projects.createdAt));

    // Fallback for non-migrated projects (via vendorContactId)
    // Get all contacts for this vendor
    const vendorContacts = await db.select().from(contacts)
      .where(and(
        eq(contacts.orgId, orgId),
        eq(contacts.vendorId, vendorId)
      ));

    const contactIds = vendorContacts.map(c => c.id);

    if (contactIds.length === 0) {
      return projectsWithVendorId;
    }

    // Get projects that reference these contacts but don't have vendorId set yet
    const projectsWithContactId = await db.select().from(projects)
      .where(and(
        eq(projects.orgId, orgId),
        sql`${projects.vendorContactId} = ANY(${contactIds})`,
        isNull(projects.vendorId)
      ))
      .orderBy(desc(projects.createdAt));

    // Also get projects assigned via projectVendors junction table
    const junctionProjectIds = await this.getVendorAssignedProjectIds(vendorId, orgId);
    const junctionProjects = junctionProjectIds.length > 0
      ? await db.select().from(projects)
          .where(and(
            eq(projects.orgId, orgId),
            sql`${projects.id} = ANY(${junctionProjectIds})`
          ))
          .orderBy(desc(projects.createdAt))
      : [];

    // Combine all result sets (deduplicate by project ID)
    const allProjects = [...projectsWithVendorId, ...projectsWithContactId, ...junctionProjects];
    const uniqueProjects = Array.from(
      new Map(allProjects.map(p => [p.id, p])).values()
    );

    return uniqueProjects;
  }

  async getVendorAssignedProjectIds(vendorId: string, orgId: string): Promise<string[]> {
    const results = await db.select({ projectId: projectVendors.projectId })
      .from(projectVendors)
      .innerJoin(projects, eq(projectVendors.projectId, projects.id))
      .where(and(
        eq(projectVendors.vendorId, vendorId),
        eq(projectVendors.isActive, true),
        eq(projects.orgId, orgId)
      ));
    return results.map(r => r.projectId);
  }

  async isVendorAssignedToProject(vendorId: string, projectId: string, orgId: string): Promise<boolean> {
    const project = await this.getProject(projectId, orgId);
    if (!project) return false;

    const [assignment] = await db.select().from(projectVendors)
      .where(and(
        eq(projectVendors.projectId, projectId),
        eq(projectVendors.vendorId, vendorId),
        eq(projectVendors.isActive, true)
      ));
    return !!assignment;
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

  async getCalendarEvents(orgId: string): Promise<CalendarEvent[]> {
    return db.select().from(calendarEvents)
      .where(eq(calendarEvents.orgId, orgId))
      .orderBy(desc(calendarEvents.start));
  }

  async getCalendarEvent(id: string, orgId: string): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, orgId)));
    return event;
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [created] = await db.insert(calendarEvents).values(event).returning();
    return created;
  }

  async updateCalendarEvent(id: string, orgId: string, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    const [updated] = await db.update(calendarEvents).set(data)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, orgId)))
      .returning();
    return updated;
  }

  async deleteCalendarEvent(id: string, orgId: string): Promise<boolean> {
    await db.delete(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, orgId)));
    return true;
  }

  async getFollowUpHistory(dealId: string, orgId: string): Promise<FollowUpHistory[]> {
    return db.select().from(followUpHistory)
      .where(and(eq(followUpHistory.dealId, dealId), eq(followUpHistory.orgId, orgId)))
      .orderBy(desc(followUpHistory.sentAt));
  }

  async createFollowUpHistory(followUp: InsertFollowUpHistory): Promise<FollowUpHistory> {
    const [created] = await db.insert(followUpHistory).values(followUp).returning();
    return created;
  }

  async updateFollowUpHistory(id: string, orgId: string, data: Partial<InsertFollowUpHistory>): Promise<FollowUpHistory | undefined> {
    const [updated] = await db.update(followUpHistory).set(data)
      .where(and(eq(followUpHistory.id, id), eq(followUpHistory.orgId, orgId)))
      .returning();
    return updated;
  }

  async getProjectComments(projectId: string, orgId: string): Promise<ProjectComment[]> {
    return db.select().from(projectComments)
      .where(and(eq(projectComments.projectId, projectId), eq(projectComments.orgId, orgId)))
      .orderBy(asc(projectComments.createdAt));
  }

  async createProjectComment(comment: InsertProjectComment): Promise<ProjectComment> {
    const [created] = await db.insert(projectComments).values(comment).returning();
    return created;
  }

  // Channel methods
  async getChannels(orgId: string, type?: ChannelType, scope?: ChannelScope): Promise<Channel[]> {
    let query = db.select().from(channels).where(eq(channels.orgId, orgId));
    if (type) {
      query = db.select().from(channels).where(and(eq(channels.orgId, orgId), eq(channels.type, type)));
    }
    if (scope) {
      query = db.select().from(channels).where(and(eq(channels.orgId, orgId), eq(channels.scope, scope)));
    }
    if (type && scope) {
      query = db.select().from(channels).where(and(eq(channels.orgId, orgId), eq(channels.type, type), eq(channels.scope, scope)));
    }
    return query.orderBy(desc(channels.createdAt));
  }

  async getChannel(id: string, orgId: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels)
      .where(and(eq(channels.id, id), eq(channels.orgId, orgId)));
    return channel;
  }

  async getChannelsByProject(projectId: string, orgId: string): Promise<Channel[]> {
    return db.select().from(channels)
      .where(and(eq(channels.projectId, projectId), eq(channels.orgId, orgId)))
      .orderBy(desc(channels.createdAt));
  }

  async getChannelsByAccount(accountId: string, orgId: string): Promise<Channel[]> {
    return db.select().from(channels)
      .where(and(eq(channels.accountId, accountId), eq(channels.orgId, orgId)))
      .orderBy(desc(channels.createdAt));
  }

  async getGlobalChannels(orgId: string, type?: ChannelType): Promise<Channel[]> {
    if (type) {
      return db.select().from(channels)
        .where(and(eq(channels.orgId, orgId), eq(channels.scope, 'global'), eq(channels.type, type)))
        .orderBy(desc(channels.createdAt));
    }
    return db.select().from(channels)
      .where(and(eq(channels.orgId, orgId), eq(channels.scope, 'global')))
      .orderBy(desc(channels.createdAt));
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [created] = await db.insert(channels).values(channel).returning();
    return created;
  }

  async updateChannel(id: string, orgId: string, data: Partial<InsertChannel>): Promise<Channel | undefined> {
    const [updated] = await db.update(channels)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(channels.id, id), eq(channels.orgId, orgId)))
      .returning();
    return updated;
  }

  async deleteChannel(id: string, orgId: string): Promise<boolean> {
    await db.delete(channels).where(and(eq(channels.id, id), eq(channels.orgId, orgId)));
    return true;
  }

  // Channel Messages
  async getChannelMessages(channelId: string, limit: number = 50, offset: number = 0): Promise<ChannelMessage[]> {
    return db.select().from(channelMessages)
      .where(eq(channelMessages.channelId, channelId))
      .orderBy(desc(channelMessages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getChannelMessage(id: string): Promise<ChannelMessage | undefined> {
    const [message] = await db.select().from(channelMessages)
      .where(eq(channelMessages.id, id));
    return message;
  }

  async createChannelMessage(message: InsertChannelMessage): Promise<ChannelMessage> {
    const [created] = await db.insert(channelMessages).values(message).returning();
    return created;
  }

  async updateChannelMessage(id: string, data: Partial<InsertChannelMessage>): Promise<ChannelMessage | undefined> {
    const [updated] = await db.update(channelMessages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(channelMessages.id, id))
      .returning();
    return updated;
  }

  async deleteChannelMessage(id: string): Promise<boolean> {
    await db.delete(channelMessages).where(eq(channelMessages.id, id));
    return true;
  }

  async getPinnedMessages(channelId: string): Promise<ChannelMessage[]> {
    return db.select().from(channelMessages)
      .where(and(eq(channelMessages.channelId, channelId), eq(channelMessages.isPinned, true)))
      .orderBy(desc(channelMessages.createdAt));
  }

  // Channel Attachments
  async getMessageAttachments(messageId: string): Promise<ChannelAttachment[]> {
    return db.select().from(channelAttachments)
      .where(eq(channelAttachments.messageId, messageId));
  }

  async createChannelAttachment(attachment: InsertChannelAttachment): Promise<ChannelAttachment> {
    const [created] = await db.insert(channelAttachments).values(attachment).returning();
    return created;
  }

  async deleteChannelAttachment(id: string): Promise<boolean> {
    await db.delete(channelAttachments).where(eq(channelAttachments.id, id));
    return true;
  }

  // Account Loom Videos
  async getAccountLoomVideos(accountId: string, orgId: string): Promise<AccountLoomVideo[]> {
    return db.select().from(accountLoomVideos)
      .where(and(eq(accountLoomVideos.accountId, accountId), eq(accountLoomVideos.orgId, orgId)))
      .orderBy(desc(accountLoomVideos.createdAt));
  }

  async createAccountLoomVideo(video: InsertAccountLoomVideo): Promise<AccountLoomVideo> {
    const [created] = await db.insert(accountLoomVideos).values(video).returning();
    return created;
  }

  async deleteAccountLoomVideo(id: string, orgId: string): Promise<boolean> {
    await db.delete(accountLoomVideos).where(and(eq(accountLoomVideos.id, id), eq(accountLoomVideos.orgId, orgId)));
    return true;
  }

  // Account Updates (CR History)
  async getAccountUpdates(accountId: string, orgId: string): Promise<AccountUpdate[]> {
    return db.select().from(accountUpdates)
      .where(and(eq(accountUpdates.accountId, accountId), eq(accountUpdates.orgId, orgId)))
      .orderBy(desc(accountUpdates.updateDate));
  }

  async createAccountUpdate(update: InsertAccountUpdate): Promise<AccountUpdate> {
    const [created] = await db.insert(accountUpdates).values(update).returning();
    return created;
  }

  async updateAccountUpdate(id: string, orgId: string, data: Partial<InsertAccountUpdate>): Promise<AccountUpdate | undefined> {
    const [updated] = await db.update(accountUpdates)
      .set(data)
      .where(and(eq(accountUpdates.id, id), eq(accountUpdates.orgId, orgId)))
      .returning();
    return updated;
  }

  async deleteAccountUpdate(id: string, orgId: string): Promise<boolean> {
    await db.delete(accountUpdates).where(and(eq(accountUpdates.id, id), eq(accountUpdates.orgId, orgId)));
    return true;
  }

  // Project Updates (CR de suivi projet)
  async getProjectUpdates(projectId: string, orgId: string): Promise<ProjectUpdate[]> {
    return db.select().from(projectUpdates)
      .where(and(eq(projectUpdates.projectId, projectId), eq(projectUpdates.orgId, orgId)))
      .orderBy(desc(projectUpdates.updateDate));
  }

  async getProjectUpdate(id: string, orgId: string): Promise<ProjectUpdate | undefined> {
    return db.query.projectUpdates.findFirst({
      where: (updates, { and, eq }) => and(
        eq(updates.id, id),
        eq(updates.orgId, orgId)
      )
    });
  }

  async createProjectUpdate(update: InsertProjectUpdate): Promise<ProjectUpdate> {
    const [created] = await db.insert(projectUpdates).values(update).returning();
    return created;
  }

  async updateProjectUpdate(id: string, orgId: string, data: Partial<InsertProjectUpdate>): Promise<ProjectUpdate | undefined> {
    const [updated] = await db.update(projectUpdates)
      .set(data)
      .where(and(eq(projectUpdates.id, id), eq(projectUpdates.orgId, orgId)))
      .returning();
    return updated;
  }

  async deleteProjectUpdate(id: string, orgId: string): Promise<boolean> {
    await db.delete(projectUpdates).where(and(eq(projectUpdates.id, id), eq(projectUpdates.orgId, orgId)));
    return true;
  }

  // Project Deliverables (fichiers livrables)
  async getProjectDeliverables(projectId: string, orgId: string): Promise<ProjectDeliverable[]> {
    return db.select().from(projectDeliverables)
      .where(and(eq(projectDeliverables.projectId, projectId), eq(projectDeliverables.orgId, orgId)))
      .orderBy(desc(projectDeliverables.createdAt));
  }

  async createProjectDeliverable(deliverable: InsertProjectDeliverable): Promise<ProjectDeliverable> {
    const [created] = await db.insert(projectDeliverables).values(deliverable).returning();
    return created;
  }

  async deleteProjectDeliverable(id: string, orgId: string): Promise<boolean> {
    await db.delete(projectDeliverables).where(and(eq(projectDeliverables.id, id), eq(projectDeliverables.orgId, orgId)));
    return true;
  }

  async updateProjectDeliverable(id: string, orgId: string, updates: Partial<{
    title: string;
    description: string | null;
    type: string;
    url: string | null;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
    fileData: string | null;
    version: string;
    status: string;
    clientComment: string | null;
  }>): Promise<ProjectDeliverable | null> {
    const [updated] = await db.update(projectDeliverables)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(projectDeliverables.id, id), eq(projectDeliverables.orgId, orgId)))
      .returning();
    return updated || null;
  }

  async getProjectDeliverableById(id: string, orgId: string): Promise<ProjectDeliverable | null> {
    const [deliverable] = await db.select().from(projectDeliverables)
      .where(and(eq(projectDeliverables.id, id), eq(projectDeliverables.orgId, orgId)));
    return deliverable || null;
  }

  // ============== COMPLIANCE STEPS ==============

  async getComplianceSteps(deliverableId: string): Promise<ComplianceStep[]> {
    return db.select().from(deliverableComplianceSteps)
      .where(eq(deliverableComplianceSteps.deliverableId, deliverableId))
      .orderBy(asc(deliverableComplianceSteps.stepNumber));
  }

  async getComplianceStep(id: string): Promise<ComplianceStep | null> {
    const [step] = await db.select().from(deliverableComplianceSteps)
      .where(eq(deliverableComplianceSteps.id, id));
    return step || null;
  }

  async createComplianceStep(step: InsertComplianceStep): Promise<ComplianceStep> {
    const [created] = await db.insert(deliverableComplianceSteps).values(step).returning();
    return created;
  }

  async updateComplianceStep(
    id: string,
    updates: Partial<Omit<ComplianceStep, 'id' | 'deliverableId' | 'createdAt'>>
  ): Promise<ComplianceStep | null> {
    const [updated] = await db.update(deliverableComplianceSteps)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deliverableComplianceSteps.id, id))
      .returning();
    return updated || null;
  }

  async deleteComplianceStep(id: string): Promise<boolean> {
    await db.delete(deliverableComplianceSteps)
      .where(eq(deliverableComplianceSteps.id, id));
    return true;
  }

  // Save step progress (auto-save / draft mode)
  async saveComplianceStepDraft(
    id: string,
    formData: unknown,
    checklistItems?: unknown,
    dynamicListData?: unknown
  ): Promise<ComplianceStep | null> {
    const [updated] = await db.update(deliverableComplianceSteps)
      .set({
        formData: formData as any,
        checklistItems: checklistItems as any,
        dynamicListData: dynamicListData as any,
        status: 'draft',
        lastSavedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deliverableComplianceSteps.id, id))
      .returning();
    return updated || null;
  }

  // Submit step for review/completion
  async submitComplianceStep(id: string): Promise<ComplianceStep | null> {
    const step = await this.getComplianceStep(id);
    if (!step) return null;

    const newStatus: ComplianceStepStatus = step.requiresAdminApproval ? 'submitted' : 'completed';

    const [updated] = await db.update(deliverableComplianceSteps)
      .set({
        status: newStatus,
        progress: 100,
        submittedAt: new Date(),
        completedAt: newStatus === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(deliverableComplianceSteps.id, id))
      .returning();

    // If auto-unlock is enabled and step is completed, unlock next step
    if (updated && updated.autoUnlockNext && newStatus === 'completed') {
      await this.unlockNextComplianceStep(updated.deliverableId, updated.stepNumber);
    }

    return updated || null;
  }

  // Admin approves a step
  async approveComplianceStep(id: string, adminId: string, comment?: string): Promise<ComplianceStep | null> {
    const step = await this.getComplianceStep(id);
    if (!step) return null;

    const [updated] = await db.update(deliverableComplianceSteps)
      .set({
        status: 'approved',
        progress: 100,
        adminComment: comment || null,
        approvedById: adminId,
        approvedAt: new Date(),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deliverableComplianceSteps.id, id))
      .returning();

    // If auto-unlock is enabled, unlock next step
    if (updated && updated.autoUnlockNext) {
      await this.unlockNextComplianceStep(updated.deliverableId, updated.stepNumber);
    }

    return updated || null;
  }

  // Admin rejects a step
  async rejectComplianceStep(id: string, adminId: string, reason: string): Promise<ComplianceStep | null> {
    const [updated] = await db.update(deliverableComplianceSteps)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        approvedById: adminId,
        updatedAt: new Date(),
      })
      .where(eq(deliverableComplianceSteps.id, id))
      .returning();
    return updated || null;
  }

  // Unlock the next step in sequence
  async unlockNextComplianceStep(deliverableId: string, currentStepNumber: number): Promise<ComplianceStep | null> {
    const [nextStep] = await db.select().from(deliverableComplianceSteps)
      .where(and(
        eq(deliverableComplianceSteps.deliverableId, deliverableId),
        eq(deliverableComplianceSteps.stepNumber, currentStepNumber + 1)
      ));

    if (!nextStep || nextStep.status !== 'locked') return null;

    const [updated] = await db.update(deliverableComplianceSteps)
      .set({
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(deliverableComplianceSteps.id, nextStep.id))
      .returning();

    return updated || null;
  }

  // Calculate and update deliverable progress based on steps
  async updateDeliverableProgress(deliverableId: string, orgId: string): Promise<ProjectDeliverable | null> {
    const steps = await this.getComplianceSteps(deliverableId);
    if (steps.length === 0) return null;

    const requiredSteps = steps.filter(s => s.isRequired);
    const completedSteps = requiredSteps.filter(s =>
      s.status === 'completed' || s.status === 'approved'
    );

    const progress = Math.round((completedSteps.length / requiredSteps.length) * 100);
    const isUploadUnlocked = progress === 100;

    const [updated] = await db.update(projectDeliverables)
      .set({
        complianceProgress: progress,
        isUploadUnlocked,
        updatedAt: new Date(),
      })
      .where(and(eq(projectDeliverables.id, deliverableId), eq(projectDeliverables.orgId, orgId)))
      .returning();

    return updated || null;
  }

  // Initialize compliance steps for a deliverable from a template
  async initializeComplianceStepsFromTemplate(
    deliverableId: string,
    templateId: string
  ): Promise<ComplianceStep[]> {
    const template = await this.getComplianceTemplate(templateId);
    if (!template || !template.stepsDefinition) return [];

    const stepsDefinition = template.stepsDefinition as Array<{
      stepNumber: number;
      type: ComplianceStepType;
      title: string;
      description?: string;
      isRequired?: boolean;
      requiresAdminApproval?: boolean;
      autoUnlockNext?: boolean;
      formSchema?: unknown;
      checklistItems?: unknown;
    }>;

    const createdSteps: ComplianceStep[] = [];

    for (const stepDef of stepsDefinition) {
      const step = await this.createComplianceStep({
        deliverableId,
        stepNumber: stepDef.stepNumber,
        type: stepDef.type,
        title: stepDef.title,
        description: stepDef.description || null,
        isRequired: stepDef.isRequired ?? true,
        requiresAdminApproval: stepDef.requiresAdminApproval ?? false,
        autoUnlockNext: stepDef.autoUnlockNext ?? true,
        formSchema: stepDef.formSchema as any || null,
        checklistItems: stepDef.checklistItems as any || null,
        status: stepDef.stepNumber === 1 ? 'pending' : 'locked',
        progress: 0,
      });
      createdSteps.push(step);
    }

    return createdSteps;
  }

  // ============== COMPLIANCE TEMPLATES ==============

  async getComplianceTemplates(orgId: string): Promise<ComplianceTemplate[]> {
    return db.select().from(complianceWorkflowTemplates)
      .where(and(
        eq(complianceWorkflowTemplates.orgId, orgId),
        eq(complianceWorkflowTemplates.isActive, true)
      ))
      .orderBy(desc(complianceWorkflowTemplates.createdAt));
  }

  async getComplianceTemplate(id: string): Promise<ComplianceTemplate | null> {
    const [template] = await db.select().from(complianceWorkflowTemplates)
      .where(eq(complianceWorkflowTemplates.id, id));
    return template || null;
  }

  async getDefaultComplianceTemplate(orgId: string, deliverableType?: string): Promise<ComplianceTemplate | null> {
    // First try to find a template for the specific deliverable type
    if (deliverableType) {
      const [typeTemplate] = await db.select().from(complianceWorkflowTemplates)
        .where(and(
          eq(complianceWorkflowTemplates.orgId, orgId),
          eq(complianceWorkflowTemplates.deliverableType, deliverableType),
          eq(complianceWorkflowTemplates.isDefault, true),
          eq(complianceWorkflowTemplates.isActive, true)
        ));
      if (typeTemplate) return typeTemplate;
    }

    // Fall back to generic default template
    const [defaultTemplate] = await db.select().from(complianceWorkflowTemplates)
      .where(and(
        eq(complianceWorkflowTemplates.orgId, orgId),
        eq(complianceWorkflowTemplates.isDefault, true),
        eq(complianceWorkflowTemplates.isActive, true),
        isNull(complianceWorkflowTemplates.deliverableType)
      ));
    return defaultTemplate || null;
  }

  async createComplianceTemplate(template: InsertComplianceTemplate): Promise<ComplianceTemplate> {
    const [created] = await db.insert(complianceWorkflowTemplates).values(template).returning();
    return created;
  }

  async updateComplianceTemplate(
    id: string,
    orgId: string,
    updates: Partial<Omit<ComplianceTemplate, 'id' | 'orgId' | 'createdAt'>>
  ): Promise<ComplianceTemplate | null> {
    const [updated] = await db.update(complianceWorkflowTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(complianceWorkflowTemplates.id, id),
        eq(complianceWorkflowTemplates.orgId, orgId)
      ))
      .returning();
    return updated || null;
  }

  async deleteComplianceTemplate(id: string, orgId: string): Promise<boolean> {
    // Soft delete by setting isActive to false
    await db.update(complianceWorkflowTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(complianceWorkflowTemplates.id, id),
        eq(complianceWorkflowTemplates.orgId, orgId)
      ));
    return true;
  }

  // Notifications
  async getNotifications(userId: string, orgId: string, limit: number = 20): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.orgId, orgId)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotifications(userId: string, orgId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.orgId, orgId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string, orgId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.orgId, orgId), eq(notifications.isRead, false)));
    return Number(result[0]?.count || 0);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: string, orgId: string): Promise<boolean> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.orgId, orgId)));
    return true;
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    return true;
  }

  async deleteOldNotifications(userId: string, orgId: string, daysOld: number = 30): Promise<boolean> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    await db.delete(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.orgId, orgId),
        sql`${notifications.createdAt} < ${cutoffDate}`
      ));
    return true;
  }

  // Vendor Project Events
  async getVendorProjectEvents(projectId: string, orgId: string): Promise<VendorProjectEvent[]> {
    return db.select().from(vendorProjectEvents)
      .where(and(eq(vendorProjectEvents.projectId, projectId), eq(vendorProjectEvents.orgId, orgId)))
      .orderBy(asc(vendorProjectEvents.start));
  }

  async getVendorProjectEventsByDateRange(projectId: string, orgId: string, startDate: Date, endDate: Date): Promise<VendorProjectEvent[]> {
    return db.select().from(vendorProjectEvents)
      .where(and(
        eq(vendorProjectEvents.projectId, projectId),
        eq(vendorProjectEvents.orgId, orgId),
        sql`${vendorProjectEvents.start} >= ${startDate}`,
        sql`${vendorProjectEvents.end} <= ${endDate}`
      ))
      .orderBy(asc(vendorProjectEvents.start));
  }

  async createVendorProjectEvent(event: InsertVendorProjectEvent): Promise<VendorProjectEvent> {
    const [created] = await db.insert(vendorProjectEvents).values(event).returning();
    return created;
  }

  async updateVendorProjectEvent(id: string, projectId: string, orgId: string, updates: Partial<InsertVendorProjectEvent>): Promise<VendorProjectEvent | undefined> {
    const [updated] = await db.update(vendorProjectEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(vendorProjectEvents.id, id),
        eq(vendorProjectEvents.projectId, projectId),
        eq(vendorProjectEvents.orgId, orgId)
      ))
      .returning();
    return updated;
  }

  async deleteVendorProjectEvent(id: string, projectId: string, orgId: string): Promise<boolean> {
    await db.delete(vendorProjectEvents)
      .where(and(
        eq(vendorProjectEvents.id, id),
        eq(vendorProjectEvents.projectId, projectId),
        eq(vendorProjectEvents.orgId, orgId)
      ));
    return true;
  }

  async getVendorProjectEvent(id: string, orgId: string): Promise<VendorProjectEvent | undefined> {
    const [event] = await db.select().from(vendorProjectEvents)
      .where(and(eq(vendorProjectEvents.id, id), eq(vendorProjectEvents.orgId, orgId)));
    return event;
  }

  // Direct Messaging
  async getOrCreateDirectConversation(orgId: string, userId1: string, userId2: string): Promise<DirectConversation> {
    // Normalize participant order to avoid duplicates
    const [participant1Id, participant2Id] = [userId1, userId2].sort();

    // Check if conversation exists
    const [existing] = await db.select().from(directConversations)
      .where(and(
        eq(directConversations.orgId, orgId),
        eq(directConversations.participant1Id, participant1Id),
        eq(directConversations.participant2Id, participant2Id)
      ));

    if (existing) {
      return existing;
    }

    // Create new conversation
    const [created] = await db.insert(directConversations).values({
      orgId,
      participant1Id,
      participant2Id,
    }).returning();

    return created;
  }

  async getUserConversations(userId: string, orgId: string): Promise<(DirectConversation & {
    otherParticipant: { id: string; name: string; email: string; role?: string };
    unreadCount: number;
  })[]> {
    // Get all conversations where the user is a participant
    const conversations = await db.select().from(directConversations)
      .where(and(
        eq(directConversations.orgId, orgId),
        sql`(${directConversations.participant1Id} = ${userId} OR ${directConversations.participant2Id} = ${userId})`
      ))
      .orderBy(desc(directConversations.lastMessageAt));

    // For each conversation, get the other participant and unread count
    const result = await Promise.all(conversations.map(async (conv) => {
      const otherParticipantId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;

      // Get other participant info
      const [otherUser] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
      }).from(users).where(eq(users.id, otherParticipantId));

      // Get user's role
      const [membership] = await db.select({
        role: memberships.role
      }).from(memberships).where(and(
        eq(memberships.userId, otherParticipantId),
        eq(memberships.orgId, orgId)
      ));

      // Get unread count
      const [unreadResult] = await db.select({
        count: sql<number>`count(*)::int`
      }).from(directMessages)
        .where(and(
          eq(directMessages.conversationId, conv.id),
          eq(directMessages.recipientId, userId),
          eq(directMessages.status, 'sent')
        ));

      return {
        ...conv,
        otherParticipant: {
          ...otherUser,
          role: membership?.role,
        },
        unreadCount: unreadResult?.count || 0,
      };
    }));

    return result;
  }

  async getConversationMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<DirectMessage[]> {
    return db.select().from(directMessages)
      .where(eq(directMessages.conversationId, conversationId))
      .orderBy(desc(directMessages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async sendDirectMessage(message: InsertDirectMessage): Promise<DirectMessage> {
    const [created] = await db.insert(directMessages).values(message).returning();

    // Update conversation with last message info
    await db.update(directConversations)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: message.content.substring(0, 100),
        updatedAt: new Date(),
      })
      .where(eq(directConversations.id, message.conversationId));

    return created;
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db.update(directMessages)
      .set({
        status: 'read',
        readAt: new Date(),
      })
      .where(and(
        eq(directMessages.conversationId, conversationId),
        eq(directMessages.recipientId, userId),
        eq(directMessages.status, 'sent')
      ));
  }

  async getUnreadMessageCount(userId: string, orgId: string): Promise<number> {
    // Get all conversations for user
    const conversations = await db.select({ id: directConversations.id })
      .from(directConversations)
      .where(and(
        eq(directConversations.orgId, orgId),
        sql`(${directConversations.participant1Id} = ${userId} OR ${directConversations.participant2Id} = ${userId})`
      ));

    if (conversations.length === 0) return 0;

    const conversationIds = conversations.map(c => c.id);

    const [result] = await db.select({
      count: sql<number>`count(*)::int`
    }).from(directMessages)
      .where(and(
        sql`${directMessages.conversationId} IN (${sql.join(conversationIds.map(id => sql`${id}`), sql`, `)})`,
        eq(directMessages.recipientId, userId),
        eq(directMessages.status, 'sent')
      ));

    return result?.count || 0;
  }

  async getAvailableMessageRecipients(userId: string, orgId: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: string;
    type: 'admin' | 'vendor' | 'client';
  }[]> {
    // Get all users in the organization who can receive messages
    const allMembers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: memberships.role,
    }).from(users)
      .innerJoin(memberships, eq(users.id, memberships.userId))
      .where(and(
        eq(memberships.orgId, orgId),
        sql`${users.id} != ${userId}`
      ));

    return allMembers.map(member => ({
      ...member,
      role: member.role || 'member',
      type: (['admin', 'sales', 'delivery', 'finance'].includes(member.role || '')) ? 'admin' as const :
            (member.role === 'vendor') ? 'vendor' as const : 'client' as const,
    }));
  }

  async getDirectConversation(conversationId: string, orgId: string): Promise<DirectConversation | undefined> {
    const [conv] = await db.select().from(directConversations)
      .where(and(
        eq(directConversations.id, conversationId),
        eq(directConversations.orgId, orgId)
      ));
    return conv;
  }

  async getEmailTemplateByStage(stage: string, orgId?: string): Promise<EmailTemplate | undefined> {
    // First try to find org-specific template
    if (orgId) {
      const [orgTemplate] = await db.select().from(emailTemplates)
        .where(and(
          eq(emailTemplates.stage, stage),
          eq(emailTemplates.orgId, orgId)
        ));
      if (orgTemplate) return orgTemplate;
    }

    // Fall back to global template (orgId is null)
    const [globalTemplate] = await db.select().from(emailTemplates)
      .where(and(
        eq(emailTemplates.stage, stage),
        isNull(emailTemplates.orgId)
      ));
    return globalTemplate;
  }

  // Project Vendors (many-to-many relationship)
  async getProjectVendors(projectId: string, orgId: string): Promise<(ProjectVendor & { vendor: Vendor })[]> {
    // First verify the project belongs to this org
    const project = await this.getProject(projectId, orgId);
    if (!project) return [];

    const results = await db.select({
      projectVendor: projectVendors,
      vendor: vendors,
    })
      .from(projectVendors)
      .innerJoin(vendors, eq(projectVendors.vendorId, vendors.id))
      .where(and(
        eq(projectVendors.projectId, projectId),
        eq(projectVendors.isActive, true)
      ))
      .orderBy(desc(projectVendors.assignedAt));

    return results.map(r => ({
      ...r.projectVendor,
      vendor: r.vendor,
    }));
  }

  async addVendorToProject(
    projectId: string,
    vendorId: string,
    orgId: string,
    data: { role?: ProjectVendorRole; notes?: string; assignedById?: string; dailyRate?: string; estimatedDays?: number; fixedPrice?: string }
  ): Promise<ProjectVendor> {
    // Verify project exists and belongs to org
    const project = await this.getProject(projectId, orgId);
    if (!project) throw new Error('Project not found');

    // Verify vendor exists and belongs to org
    const vendor = await this.getVendor(vendorId, orgId);
    if (!vendor) throw new Error('Vendor not found');

    // Check if vendor is already assigned (and active)
    const [existing] = await db.select().from(projectVendors)
      .where(and(
        eq(projectVendors.projectId, projectId),
        eq(projectVendors.vendorId, vendorId),
        eq(projectVendors.isActive, true)
      ));

    if (existing) {
      // Update existing assignment
      const [updated] = await db.update(projectVendors)
        .set({
          role: data.role || existing.role,
          notes: data.notes ?? existing.notes,
          assignedById: data.assignedById || existing.assignedById,
          dailyRate: data.dailyRate ?? existing.dailyRate,
          estimatedDays: data.estimatedDays ?? existing.estimatedDays,
          fixedPrice: data.fixedPrice ?? existing.fixedPrice,
          assignedAt: new Date(),
        })
        .where(eq(projectVendors.id, existing.id))
        .returning();
      return updated;
    }

    // Create new assignment
    const [created] = await db.insert(projectVendors).values({
      projectId,
      vendorId,
      role: data.role || 'contributor',
      notes: data.notes,
      assignedById: data.assignedById,
      dailyRate: data.dailyRate || '0',
      estimatedDays: data.estimatedDays || 0,
      fixedPrice: data.fixedPrice || '0',
      isActive: true,
    }).returning();

    return created;
  }

  async removeVendorFromProject(projectId: string, vendorId: string, orgId: string): Promise<boolean> {
    // Verify project exists and belongs to org
    const project = await this.getProject(projectId, orgId);
    if (!project) return false;

    // Soft delete by setting isActive to false
    await db.update(projectVendors)
      .set({ isActive: false })
      .where(and(
        eq(projectVendors.projectId, projectId),
        eq(projectVendors.vendorId, vendorId)
      ));

    return true;
  }

  async updateProjectVendor(
    id: string,
    orgId: string,
    data: { role?: ProjectVendorRole; notes?: string; dailyRate?: string; estimatedDays?: number; fixedPrice?: string }
  ): Promise<ProjectVendor | undefined> {
    // Get the assignment and verify via project
    const [assignment] = await db.select().from(projectVendors)
      .where(eq(projectVendors.id, id));

    if (!assignment) return undefined;

    // Verify project belongs to org
    const project = await this.getProject(assignment.projectId, orgId);
    if (!project) return undefined;

    const [updated] = await db.update(projectVendors)
      .set(data)
      .where(eq(projectVendors.id, id))
      .returning();

    return updated;
  }

  async getProjectVendor(id: string, orgId: string): Promise<ProjectVendor | undefined> {
    const [assignment] = await db.select().from(projectVendors)
      .where(eq(projectVendors.id, id));

    if (!assignment) return undefined;

    // Verify project belongs to org
    const project = await this.getProject(assignment.projectId, orgId);
    if (!project) return undefined;

    return assignment;
  }

  // Vendor Availabilities
  async getVendorAvailabilities(vendorId: string, orgId: string): Promise<VendorAvailabilityRecord[]> {
    return db.select().from(vendorAvailabilities)
      .where(and(
        eq(vendorAvailabilities.vendorId, vendorId),
        eq(vendorAvailabilities.orgId, orgId)
      ))
      .orderBy(asc(vendorAvailabilities.startDate));
  }

  async getVendorAvailabilitiesByDateRange(orgId: string, start: Date, end: Date): Promise<VendorAvailabilityRecord[]> {
    return db.select().from(vendorAvailabilities)
      .where(and(
        eq(vendorAvailabilities.orgId, orgId),
        lte(vendorAvailabilities.startDate, end),
        gte(vendorAvailabilities.endDate, start)
      ))
      .orderBy(asc(vendorAvailabilities.startDate));
  }

  async getVendorAvailability(id: string, orgId: string): Promise<VendorAvailabilityRecord | undefined> {
    const [record] = await db.select().from(vendorAvailabilities)
      .where(and(
        eq(vendorAvailabilities.id, id),
        eq(vendorAvailabilities.orgId, orgId)
      ));
    return record;
  }

  async createVendorAvailability(data: InsertVendorAvailability): Promise<VendorAvailabilityRecord> {
    const [created] = await db.insert(vendorAvailabilities).values(data).returning();
    return created;
  }

  async updateVendorAvailability(id: string, orgId: string, data: Partial<InsertVendorAvailability>): Promise<VendorAvailabilityRecord | undefined> {
    const [updated] = await db.update(vendorAvailabilities)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(vendorAvailabilities.id, id),
        eq(vendorAvailabilities.orgId, orgId)
      ))
      .returning();
    return updated;
  }

  async deleteVendorAvailability(id: string, orgId: string): Promise<boolean> {
    await db.delete(vendorAvailabilities)
      .where(and(
        eq(vendorAvailabilities.id, id),
        eq(vendorAvailabilities.orgId, orgId)
      ));
    return true;
  }
}

export const storage = new DatabaseStorage();
