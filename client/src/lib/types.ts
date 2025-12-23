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
export type ContractType = 'audit' | 'prestation' | 'formation' | 'suivi' | 'sous_traitance';
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'active' | 'completed' | 'cancelled';
export type ContactType = 'client' | 'vendor' | 'partner' | 'prospect';
export type ProspectStatus = 'active' | 'draft' | 'follow_up' | 'abandoned';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt?: string;
}

export interface Account {
  id: string;
  orgId: string;
  name: string;
  domain?: string | null;
  plan: string;
  status: AccountStatus;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  loomVideoUrl?: string | null;
  followUpSteps?: string | null;
  notionPageId?: string | null;
  notionLastEditedAt?: string | null;
  createdAt?: string;
}

export interface Contact {
  id: string;
  orgId: string;
  accountId: string;
  vendorId?: string | null;
  name: string;
  email: string;
  role: string;
  contactType: ContactType;
  phone?: string | null;
  linkedIn?: string | null;
  notionPageId?: string | null;
  notionLastEditedAt?: string | null;
  createdAt?: string;
}

export interface Deal {
  id: string;
  orgId: string;
  accountId: string;
  contactId?: string | null;
  ownerId: string;
  name: string;
  amount: string;
  probability: number;
  stage: DealStage;
  missionTypes?: string[] | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  daysInStage: number;
  position: number;
  notes?: string | null;
  loomVideoUrl?: string | null;
  contactPhone?: string | null;
  notionPageId?: string | null;
  notionLastEditedAt?: string | null;
  prospectStatus?: ProspectStatus | null;
  prospectStatusUpdatedAt?: string | null;
  followUpDate?: string | null;
  followUpNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  accountName?: string | null;
  contactName?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  account?: Account;
  contact?: Contact;
  owner?: User;
}

export interface Activity {
  id: string;
  orgId: string;
  userId: string;
  type: ActivityType;
  description: string;
  dealId?: string | null;
  projectId?: string | null;
  createdAt: string;
  user?: User;
}

export interface Project {
  id: string;
  orgId: string;
  accountId: string;
  dealId?: string | null;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  progress: number;
  deliverySteps?: string | null;
  clientValidationNotes?: string | null;
  clientApprovalSignature?: string | null;
  clientApprovalDate?: string | null;
  clientApprovedBy?: string | null;
  notionPageId?: string | null;
  notionLastEditedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  account?: Account;
}

export interface Task {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  timeSpent: number;
  notionPageId?: string | null;
  notionLastEditedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: Project;
  assignee?: User;
}

export interface Invoice {
  id: string;
  orgId: string;
  accountId: string;
  projectId?: string | null;
  invoiceNumber: string;
  amount: string;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  issuedDate: string;
  paidDate?: string | null;
  customerEmail: string;
  stripePaymentIntentId?: string | null;
  stripeInvoiceId?: string | null;
  notionPageId?: string | null;
  notionLastEditedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  account?: Account;
  lineItems?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface Vendor {
  id: string;
  orgId: string;
  userId?: string | null;
  name: string;
  company: string;
  email: string;
  dailyRate: string;
  skills: string[];
  availability: VendorAvailability;
  performance: number;
  notionPageId?: string | null;
  notionLastEditedAt?: string | null;
  createdAt?: string;
}

export interface Mission {
  id: string;
  orgId: string;
  projectId: string;
  vendorId: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status: MissionStatus;
  deliverables: string[];
  notionPageId?: string | null;
  notionLastEditedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: Project;
  vendor?: Vendor;
}

export interface Document {
  id: string;
  orgId: string;
  accountId?: string | null;
  projectId?: string | null;
  dealId?: string | null;
  name: string;
  url: string;
  mimeType?: string | null;
  size?: number | null;
  storageProvider: 'drive' | 'local';
  uploadedById?: string | null;
  createdAt?: string;
}

export interface WorkflowRun {
  id: string;
  orgId: string;
  workflowName: string;
  workflowType: string;
  status: WorkflowStatus;
  startedAt: string;
  finishedAt?: string | null;
  durationMs?: number | null;
  successRate: number;
  lastError?: string | null;
}

export interface DashboardStats {
  totalDeals: number;
  totalPipeline: number;
  wonDeals: number;
  wonValue: number;
  activeProjects: number;
  pendingTasks: number;
  pendingInvoices: number;
  pendingInvoicesValue: number;
}

export interface DealWithRelations extends Deal {
  accountName?: string;
  contactName?: string;
}

export interface Contract {
  id: string;
  orgId: string;
  accountId?: string | null;
  vendorId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
  contractNumber: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  clientName: string;
  clientEmail: string;
  clientCompany?: string | null;
  clientAddress?: string | null;
  clientSiret?: string | null;
  amount: string;
  currency: string;
  description?: string | null;
  scope?: string | null;
  deliverables?: string[] | null;
  startDate?: string | null;
  endDate?: string | null;
  paymentTerms?: string | null;
  signedAt?: string | null;
  signedByClient?: string | null;
  signatureData?: string | null;
  clientSignatureData?: string | null;
  documentUrl?: string | null;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseStatus = 'pending' | 'paid' | 'cancelled';
export type ExpenseCategory = 'tools' | 'software' | 'services' | 'travel' | 'marketing' | 'office' | 'salaries' | 'taxes' | 'other';

export interface Expense {
  id: string;
  orgId: string;
  vendorId?: string | null;
  title: string;
  description?: string | null;
  amount: string;
  currency: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  date?: string | null;
  paidDate?: string | null;
  receiptUrl?: string | null;
  notionPageId?: string | null;
  notionLastEditedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type EmailDirection = 'inbound' | 'outbound';

export interface Email {
  id: string;
  orgId: string;
  accountId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  gmailMessageId: string;
  gmailThreadId?: string | null;
  subject?: string | null;
  snippet?: string | null;
  fromEmail: string;
  fromName?: string | null;
  toEmails?: string[] | null;
  direction: EmailDirection;
  receivedAt: string;
  isRead?: boolean;
  hasAttachment?: boolean;
  labels?: string[] | null;
  createdAt?: string;
}
