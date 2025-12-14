import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum('user_role', ['admin', 'sales', 'delivery', 'finance', 'client_admin', 'client_member', 'vendor']);
export const spaceEnum = pgEnum('space', ['internal', 'client', 'vendor']);
export const dealStageEnum = pgEnum('deal_stage', ['prospect', 'meeting', 'proposal', 'audit', 'negotiation', 'won', 'lost']);
export const projectStatusEnum = pgEnum('project_status', ['active', 'on_hold', 'completed', 'cancelled']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'review', 'completed']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue', 'cancelled']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'inactive', 'churned']);
export const vendorAvailabilityEnum = pgEnum('vendor_availability', ['available', 'busy', 'unavailable']);
export const missionStatusEnum = pgEnum('mission_status', ['pending', 'in_progress', 'review', 'completed']);
export const activityTypeEnum = pgEnum('activity_type', ['call', 'email', 'meeting', 'note']);
export const workflowStatusEnum = pgEnum('workflow_status', ['active', 'paused', 'error', 'success', 'failed']);
export const storageProviderEnum = pgEnum('storage_provider', ['drive', 'local']);
export const contractTypeEnum = pgEnum('contract_type', ['audit', 'prestation', 'formation', 'suivi', 'sous_traitance']);
export const contractStatusEnum = pgEnum('contract_status', ['draft', 'sent', 'signed', 'active', 'completed', 'cancelled']);
export const expenseStatusEnum = pgEnum('expense_status', ['pending', 'paid', 'cancelled']);
export const expenseCategoryEnum = pgEnum('expense_category', ['tools', 'software', 'services', 'travel', 'marketing', 'office', 'salaries', 'taxes', 'other']);
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'expired', 'revoked']);
export const contactTypeEnum = pgEnum('contact_type', ['client', 'vendor', 'partner', 'prospect']);

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: userRoleEnum("role").notNull().default('sales'),
  space: spaceEnum("space").notNull().default('internal'),
  accountId: varchar("account_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("memberships_org_user_idx").on(table.orgId, table.userId),
]);

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  domain: text("domain"),
  plan: text("plan").notNull().default('audit'),
  status: accountStatusEnum("status").notNull().default('active'),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  notionPageId: text("notion_page_id"),
  notionLastEditedAt: timestamp("notion_last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("accounts_org_idx").on(table.orgId),
  index("accounts_status_idx").on(table.orgId, table.status),
  index("accounts_notion_idx").on(table.notionPageId),
]);

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  accountId: varchar("account_id").references(() => accounts.id),
  vendorId: varchar("vendor_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  contactType: contactTypeEnum("contact_type").notNull().default('client'),
  phone: text("phone"),
  linkedIn: text("linkedin"),
  notionPageId: text("notion_page_id"),
  notionLastEditedAt: timestamp("notion_last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("contacts_org_idx").on(table.orgId),
  index("contacts_account_idx").on(table.orgId, table.accountId),
  index("contacts_type_idx").on(table.orgId, table.contactType),
  index("contacts_notion_idx").on(table.notionPageId),
]);

export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  accountId: varchar("account_id").references(() => accounts.id),
  contactId: varchar("contact_id").references(() => contacts.id),
  ownerId: varchar("owner_id").references(() => users.id),
  name: text("name").notNull().default('Nouvelle opportunité'),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  probability: integer("probability").notNull().default(0),
  stage: dealStageEnum("stage").notNull().default('prospect'),
  nextAction: text("next_action"),
  nextActionDate: timestamp("next_action_date"),
  daysInStage: integer("days_in_stage").notNull().default(0),
  position: integer("position").notNull().default(0),
  notes: text("notes"),
  loomVideoUrl: text("loom_video_url"),
  contactPhone: text("contact_phone"),
  notionPageId: text("notion_page_id"),
  notionLastEditedAt: timestamp("notion_last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("deals_org_idx").on(table.orgId),
  index("deals_stage_idx").on(table.orgId, table.stage),
  index("deals_owner_idx").on(table.orgId, table.ownerId),
  index("deals_notion_idx").on(table.notionPageId),
]);

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: activityTypeEnum("type").notNull(),
  description: text("description").notNull(),
  dealId: varchar("deal_id").references(() => deals.id),
  projectId: varchar("project_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("activities_org_idx").on(table.orgId),
  index("activities_deal_idx").on(table.dealId),
]);

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  accountId: varchar("account_id").references(() => accounts.id),
  dealId: varchar("deal_id").references(() => deals.id),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default('active'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  progress: integer("progress").notNull().default(0),
  deliverySteps: text("delivery_steps"),
  clientValidationNotes: text("client_validation_notes"),
  clientApprovalSignature: text("client_approval_signature"),
  clientApprovalDate: timestamp("client_approval_date"),
  clientApprovedBy: text("client_approved_by"),
  notionPageId: text("notion_page_id"),
  notionLastEditedAt: timestamp("notion_last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("projects_org_idx").on(table.orgId),
  index("projects_account_idx").on(table.orgId, table.accountId),
  index("projects_status_idx").on(table.orgId, table.status),
  index("projects_notion_idx").on(table.notionPageId),
]);

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  projectId: varchar("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default('pending'),
  priority: taskPriorityEnum("priority").notNull().default('medium'),
  assigneeId: varchar("assignee_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  timeSpent: integer("time_spent").notNull().default(0),
  notionPageId: text("notion_page_id"),
  notionLastEditedAt: timestamp("notion_last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("tasks_org_idx").on(table.orgId),
  index("tasks_project_idx").on(table.orgId, table.projectId),
  index("tasks_status_idx").on(table.orgId, table.status),
  index("tasks_assignee_idx").on(table.assigneeId),
  index("tasks_notion_idx").on(table.notionPageId),
]);

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  accountId: varchar("account_id").references(() => accounts.id),
  projectId: varchar("project_id").references(() => projects.id),
  invoiceNumber: text("invoice_number").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default('EUR'),
  status: invoiceStatusEnum("status").notNull().default('draft'),
  dueDate: timestamp("due_date"),
  issuedDate: timestamp("issued_date"),
  paidDate: timestamp("paid_date"),
  customerEmail: text("customer_email"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  notionPageId: text("notion_page_id"),
  notionLastEditedAt: timestamp("notion_last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("invoices_org_idx").on(table.orgId),
  index("invoices_account_idx").on(table.orgId, table.accountId),
  index("invoices_status_idx").on(table.orgId, table.status),
  index("invoices_notion_idx").on(table.notionPageId),
]);

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
}, (table) => [
  index("line_items_invoice_idx").on(table.invoiceId),
]);

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email").notNull(),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  skills: text("skills").array().notNull().default(sql`ARRAY[]::text[]`),
  availability: vendorAvailabilityEnum("availability").notNull().default('available'),
  performance: integer("performance").notNull().default(100),
  notionPageId: text("notion_page_id"),
  notionLastEditedAt: timestamp("notion_last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("vendors_org_idx").on(table.orgId),
  index("vendors_availability_idx").on(table.orgId, table.availability),
  index("vendors_notion_idx").on(table.notionPageId),
]);

export const missions = pgTable("missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  projectId: varchar("project_id").references(() => projects.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: missionStatusEnum("status").notNull().default('pending'),
  deliverables: text("deliverables").array().notNull().default(sql`ARRAY[]::text[]`),
  notionPageId: text("notion_page_id"),
  notionLastEditedAt: timestamp("notion_last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("missions_org_idx").on(table.orgId),
  index("missions_project_idx").on(table.orgId, table.projectId),
  index("missions_vendor_idx").on(table.orgId, table.vendorId),
  index("missions_notion_idx").on(table.notionPageId),
]);

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  accountId: varchar("account_id").references(() => accounts.id),
  projectId: varchar("project_id").references(() => projects.id),
  dealId: varchar("deal_id").references(() => deals.id),
  name: text("name").notNull(),
  url: text("url"),
  mimeType: text("mime_type"),
  size: integer("size"),
  storageProvider: storageProviderEnum("storage_provider").notNull().default('local'),
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  notionPageId: text("notion_page_id"),
  notionLastEditedAt: timestamp("notion_last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("documents_org_idx").on(table.orgId),
  index("documents_project_idx").on(table.projectId),
  index("documents_notion_idx").on(table.notionPageId),
]);

export const workflowRuns = pgTable("workflow_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  workflowName: text("workflow_name").notNull(),
  workflowType: text("workflow_type").notNull(),
  status: workflowStatusEnum("status").notNull().default('active'),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  durationMs: integer("duration_ms"),
  successRate: integer("success_rate").notNull().default(100),
  lastError: text("last_error"),
}, (table) => [
  index("workflows_org_idx").on(table.orgId),
  index("workflows_status_idx").on(table.orgId, table.status),
]);

export const importJobs = pgTable("import_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  source: text("source").notNull(),
  status: text("status").notNull().default('pending'),
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  errorCount: integer("error_count").default(0),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  errors: text("errors"),
}, (table) => [
  index("import_jobs_org_idx").on(table.orgId),
]);

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  accountId: varchar("account_id").references(() => accounts.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  dealId: varchar("deal_id").references(() => deals.id),
  projectId: varchar("project_id").references(() => projects.id),
  contractNumber: text("contract_number").notNull(),
  title: text("title").notNull(),
  type: contractTypeEnum("type").notNull().default('audit'),
  status: contractStatusEnum("status").notNull().default('draft'),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientCompany: text("client_company"),
  clientAddress: text("client_address"),
  clientSiret: text("client_siret"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default('EUR'),
  description: text("description"),
  scope: text("scope"),
  deliverables: text("deliverables").array().default(sql`ARRAY[]::text[]`),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  paymentTerms: text("payment_terms"),
  signedAt: timestamp("signed_at"),
  signedByClient: text("signed_by_client"),
  signatureData: text("signature_data"),
  clientSignatureData: text("client_signature_data"),
  documentUrl: text("document_url"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("contracts_org_idx").on(table.orgId),
  index("contracts_account_idx").on(table.orgId, table.accountId),
  index("contracts_deal_idx").on(table.dealId),
  index("contracts_status_idx").on(table.orgId, table.status),
  index("contracts_type_idx").on(table.orgId, table.type),
]);

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  accountId: varchar("account_id").references(() => accounts.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  projectId: varchar("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default('EUR'),
  category: expenseCategoryEnum("category").notNull().default('other'),
  status: expenseStatusEnum("status").notNull().default('pending'),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  notionPageId: text("notion_page_id"),
  notionLastEditedAt: timestamp("notion_last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("expenses_org_idx").on(table.orgId),
  index("expenses_account_idx").on(table.accountId),
  index("expenses_vendor_idx").on(table.vendorId),
  index("expenses_project_idx").on(table.projectId),
  index("expenses_notion_idx").on(table.notionPageId),
  index("expenses_category_idx").on(table.orgId, table.category),
  index("expenses_status_idx").on(table.orgId, table.status),
]);

export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  tokenHash: text("token_hash").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  role: userRoleEnum("role").notNull(),
  space: spaceEnum("space").notNull(),
  accountId: varchar("account_id").references(() => accounts.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  status: invitationStatusEnum("status").notNull().default('pending'),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("invitations_org_idx").on(table.orgId),
  index("invitations_token_hash_idx").on(table.tokenHash),
  index("invitations_email_idx").on(table.orgId, table.email),
  index("invitations_status_idx").on(table.status),
]);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  accounts: many(accounts),
  deals: many(deals),
  projects: many(projects),
  tasks: many(tasks),
  invoices: many(invoices),
  vendors: many(vendors),
  missions: many(missions),
  documents: many(documents),
  workflowRuns: many(workflowRuns),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  ownedDeals: many(deals),
  activities: many(activities),
  assignedTasks: many(tasks),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [accounts.orgId],
    references: [organizations.id],
  }),
  contacts: many(contacts),
  deals: many(deals),
  projects: many(projects),
  invoices: many(invoices),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  account: one(accounts, {
    fields: [contacts.accountId],
    references: [accounts.id],
  }),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deals.orgId],
    references: [organizations.id],
  }),
  account: one(accounts, {
    fields: [deals.accountId],
    references: [accounts.id],
  }),
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  owner: one(users, {
    fields: [deals.ownerId],
    references: [users.id],
  }),
  activities: many(activities),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  account: one(accounts, {
    fields: [projects.accountId],
    references: [accounts.id],
  }),
  tasks: many(tasks),
  missions: many(missions),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.orgId],
    references: [organizations.id],
  }),
  account: one(accounts, {
    fields: [invoices.accountId],
    references: [accounts.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [vendors.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  missions: many(missions),
}));

export const missionsRelations = relations(missions, ({ one }) => ({
  organization: one(organizations, {
    fields: [missions.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [missions.projectId],
    references: [projects.id],
  }),
  vendor: one(vendors, {
    fields: [missions.vendorId],
    references: [vendors.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  organization: one(organizations, {
    fields: [contracts.orgId],
    references: [organizations.id],
  }),
  account: one(accounts, {
    fields: [contracts.accountId],
    references: [accounts.id],
  }),
  vendor: one(vendors, {
    fields: [contracts.vendorId],
    references: [vendors.id],
  }),
  deal: one(deals, {
    fields: [contracts.dealId],
    references: [deals.id],
  }),
  project: one(projects, {
    fields: [contracts.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [contracts.createdById],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  organization: one(organizations, {
    fields: [expenses.orgId],
    references: [organizations.id],
  }),
  account: one(accounts, {
    fields: [expenses.accountId],
    references: [accounts.id],
  }),
  vendor: one(vendors, {
    fields: [expenses.vendorId],
    references: [vendors.id],
  }),
  project: one(projects, {
    fields: [expenses.projectId],
    references: [projects.id],
  }),
}));

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMembershipSchema = createInsertSchema(memberships).omit({ id: true, createdAt: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true });
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({ id: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true });
export const insertMissionSchema = createInsertSchema(missions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertWorkflowRunSchema = createInsertSchema(workflowRuns).omit({ id: true });
export const insertImportJobSchema = createInsertSchema(importJobs).omit({ id: true, startedAt: true });
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  signedAt: z.coerce.date().optional().nullable(),
});
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  date: z.coerce.date(),
  notionLastEditedAt: z.coerce.date().optional().nullable(),
});
export const insertInvitationSchema = createInsertSchema(invitations).omit({ id: true, createdAt: true }).extend({
  expiresAt: z.coerce.date(),
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InsertMission = z.infer<typeof insertMissionSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertWorkflowRun = z.infer<typeof insertWorkflowRunSchema>;
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type Mission = typeof missions.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type ImportJob = typeof importJobs.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;

export type UserRole = 'admin' | 'sales' | 'delivery' | 'finance' | 'client_admin' | 'client_member' | 'vendor';
export type Space = 'internal' | 'client' | 'vendor';
export type DealStage = 'prospect' | 'meeting' | 'proposal' | 'audit' | 'negotiation' | 'won' | 'lost';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type AccountStatus = 'active' | 'inactive' | 'churned';
export type VendorAvailability = 'available' | 'busy' | 'unavailable';
export type MissionStatus = 'pending' | 'in_progress' | 'review' | 'completed';
export type ActivityType = 'call' | 'email' | 'meeting' | 'note';
export type WorkflowStatus = 'active' | 'paused' | 'error' | 'success' | 'failed';
export type ContractType = 'audit' | 'prestation' | 'formation' | 'suivi';
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'active' | 'completed' | 'cancelled';
export type ExpenseStatus = 'pending' | 'paid' | 'cancelled';
export type ExpenseCategory = 'tools' | 'software' | 'services' | 'travel' | 'marketing' | 'office' | 'salaries' | 'taxes' | 'other';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
