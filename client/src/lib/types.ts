export type UserRole = 'admin' | 'sales' | 'delivery' | 'finance' | 'client_admin' | 'client_member' | 'vendor';
export type Space = 'internal' | 'client' | 'vendor';
export type DealStage = 'prospect' | 'meeting' | 'proposal' | 'audit' | 'negotiation' | 'won' | 'lost';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
}

export interface Account {
  id: string;
  name: string;
  domain?: string;
  plan: string;
  status: 'active' | 'inactive' | 'churned';
  contactName: string;
  contactEmail: string;
}

export interface Contact {
  id: string;
  accountId: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  linkedIn?: string;
}

export interface Deal {
  id: string;
  accountId: string;
  accountName: string;
  contactName: string;
  amount: number;
  probability: number;
  stage: DealStage;
  nextAction: string;
  nextActionDate: string;
  owner: User;
  daysInStage: number;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  description: string;
  createdAt: string;
  user: User;
  dealId?: string;
  projectId?: string;
}

export interface Project {
  id: string;
  accountId: string;
  accountName: string;
  name: string;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  progress: number;
  tasksCompleted: number;
  totalTasks: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: User;
  dueDate?: string;
  timeSpent: number;
}

export interface Workflow {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'error';
  lastRun?: string;
  nextRun?: string;
  successRate: number;
}

export interface Invoice {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  issuedDate: string;
}

export interface Vendor {
  id: string;
  name: string;
  company: string;
  email: string;
  dailyRate: number;
  skills: string[];
  availability: 'available' | 'busy' | 'unavailable';
  performance: number;
}

export interface Mission {
  id: string;
  projectId: string;
  projectName: string;
  vendorId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed';
  deliverables: string[];
}
