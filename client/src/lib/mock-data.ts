import type { User, Account, Deal, Project, Task, Activity, Workflow, Invoice, Vendor, Mission, Contact } from './types';

// todo: remove mock functionality
export const mockUsers: User[] = [
  { id: '1', name: 'Alice Martin', email: 'alice@iainfinity.com', role: 'admin' },
  { id: '2', name: 'Bob Chen', email: 'bob@iainfinity.com', role: 'sales' },
  { id: '3', name: 'Claire Dubois', email: 'claire@iainfinity.com', role: 'delivery' },
  { id: '4', name: 'David Kim', email: 'david@iainfinity.com', role: 'finance' },
];

// todo: remove mock functionality
export const mockAccounts: Account[] = [
  { id: '1', name: 'TechCorp Solutions', domain: 'techcorp.com', plan: 'Enterprise', status: 'active', contactName: 'Jean Dupont', contactEmail: 'jean@techcorp.com' },
  { id: '2', name: 'DataFlow Inc', domain: 'dataflow.io', plan: 'Pro', status: 'active', contactName: 'Marie Laurent', contactEmail: 'marie@dataflow.io' },
  { id: '3', name: 'CloudNine Systems', domain: 'cloudnine.tech', plan: 'Starter', status: 'active', contactName: 'Pierre Martin', contactEmail: 'pierre@cloudnine.tech' },
];

// todo: remove mock functionality
export const mockContacts: Contact[] = [
  { id: '1', accountId: '1', name: 'Jean Dupont', email: 'jean@techcorp.com', role: 'CEO', phone: '+33 6 12 34 56 78' },
  { id: '2', accountId: '1', name: 'Sophie Bernard', email: 'sophie@techcorp.com', role: 'CTO' },
  { id: '3', accountId: '2', name: 'Marie Laurent', email: 'marie@dataflow.io', role: 'Product Manager' },
];

// todo: remove mock functionality
export const mockDeals: Deal[] = [
  { id: '1', accountId: '1', accountName: 'TechCorp Solutions', contactName: 'Jean Dupont', amount: 45000, probability: 80, stage: 'proposal', nextAction: 'Follow up on proposal', nextActionDate: '2024-01-15', owner: mockUsers[1], daysInStage: 5 },
  { id: '2', accountId: '2', accountName: 'DataFlow Inc', contactName: 'Marie Laurent', amount: 28000, probability: 60, stage: 'meeting', nextAction: 'Schedule demo', nextActionDate: '2024-01-12', owner: mockUsers[1], daysInStage: 3 },
  { id: '3', accountId: '3', accountName: 'CloudNine Systems', contactName: 'Pierre Martin', amount: 15000, probability: 40, stage: 'prospect', nextAction: 'Initial call', nextActionDate: '2024-01-10', owner: mockUsers[1], daysInStage: 2 },
  { id: '4', accountId: '4', accountName: 'InnovateTech', contactName: 'Luc Bernard', amount: 62000, probability: 90, stage: 'audit', nextAction: 'Deliver audit report', nextActionDate: '2024-01-18', owner: mockUsers[1], daysInStage: 7 },
  { id: '5', accountId: '5', accountName: 'SmartData Corp', contactName: 'Anne Moreau', amount: 38000, probability: 75, stage: 'negotiation', nextAction: 'Final pricing discussion', nextActionDate: '2024-01-14', owner: mockUsers[1], daysInStage: 4 },
  { id: '6', accountId: '6', accountName: 'DigiSoft', contactName: 'Marc Leroy', amount: 52000, probability: 100, stage: 'won', nextAction: 'Onboarding', nextActionDate: '2024-01-20', owner: mockUsers[1], daysInStage: 1 },
];

// todo: remove mock functionality
export const mockProjects: Project[] = [
  { id: '1', accountId: '1', accountName: 'TechCorp Solutions', name: 'CRM Automation', status: 'active', startDate: '2024-01-01', progress: 65, tasksCompleted: 13, totalTasks: 20 },
  { id: '2', accountId: '2', accountName: 'DataFlow Inc', name: 'Data Pipeline Setup', status: 'active', startDate: '2024-01-05', progress: 40, tasksCompleted: 8, totalTasks: 20 },
  { id: '3', accountId: '6', accountName: 'DigiSoft', name: 'Invoice Integration', status: 'active', startDate: '2024-01-08', progress: 20, tasksCompleted: 4, totalTasks: 20 },
];

// todo: remove mock functionality
export const mockTasks: Task[] = [
  { id: '1', projectId: '1', title: 'Configure n8n workflows', status: 'in_progress', priority: 'high', assignee: mockUsers[2], dueDate: '2024-01-15', timeSpent: 8 },
  { id: '2', projectId: '1', title: 'Setup Stripe integration', status: 'pending', priority: 'medium', assignee: mockUsers[2], dueDate: '2024-01-18', timeSpent: 0 },
  { id: '3', projectId: '1', title: 'Client training session', status: 'pending', priority: 'low', dueDate: '2024-01-25', timeSpent: 0 },
  { id: '4', projectId: '2', title: 'Database schema design', status: 'completed', priority: 'high', assignee: mockUsers[2], dueDate: '2024-01-10', timeSpent: 12 },
];

// todo: remove mock functionality
export const mockActivities: Activity[] = [
  { id: '1', type: 'call', description: 'Discovery call with Jean - discussed automation needs', createdAt: '2024-01-08T14:30:00', user: mockUsers[1], dealId: '1' },
  { id: '2', type: 'email', description: 'Sent proposal document to TechCorp', createdAt: '2024-01-09T10:15:00', user: mockUsers[1], dealId: '1' },
  { id: '3', type: 'meeting', description: 'Demo presentation - positive feedback', createdAt: '2024-01-10T15:00:00', user: mockUsers[1], dealId: '2' },
  { id: '4', type: 'note', description: 'Client requested additional security features', createdAt: '2024-01-11T09:00:00', user: mockUsers[2], projectId: '1' },
];

// todo: remove mock functionality
export const mockWorkflows: Workflow[] = [
  { id: '1', name: 'Lead Capture from JotForm', type: 'trigger', status: 'active', lastRun: '2024-01-11T08:30:00', successRate: 98 },
  { id: '2', name: 'Proposal Generation', type: 'action', status: 'active', lastRun: '2024-01-10T16:45:00', successRate: 95 },
  { id: '3', name: 'Invoice Reminder', type: 'scheduled', status: 'active', nextRun: '2024-01-12T09:00:00', successRate: 100 },
  { id: '4', name: 'Slack Notifications', type: 'trigger', status: 'paused', lastRun: '2024-01-09T12:00:00', successRate: 92 },
  { id: '5', name: 'Data Sync to Notion', type: 'scheduled', status: 'error', lastRun: '2024-01-11T06:00:00', successRate: 85 },
];

// todo: remove mock functionality
export const mockInvoices: Invoice[] = [
  { id: '1', accountId: '1', accountName: 'TechCorp Solutions', amount: 15000, status: 'paid', dueDate: '2024-01-05', issuedDate: '2023-12-20' },
  { id: '2', accountId: '1', accountName: 'TechCorp Solutions', amount: 15000, status: 'sent', dueDate: '2024-02-05', issuedDate: '2024-01-20' },
  { id: '3', accountId: '2', accountName: 'DataFlow Inc', amount: 9500, status: 'overdue', dueDate: '2024-01-01', issuedDate: '2023-12-15' },
  { id: '4', accountId: '6', accountName: 'DigiSoft', amount: 26000, status: 'draft', dueDate: '2024-02-01', issuedDate: '2024-01-15' },
];

// todo: remove mock functionality
export const mockVendors: Vendor[] = [
  { id: '1', name: 'Thomas Petit', company: 'DevStudio', email: 'thomas@devstudio.fr', dailyRate: 650, skills: ['n8n', 'Node.js', 'API'], availability: 'available', performance: 95 },
  { id: '2', name: 'Emma Richard', company: 'DataExperts', email: 'emma@dataexperts.com', dailyRate: 700, skills: ['Python', 'Data', 'ML'], availability: 'busy', performance: 92 },
  { id: '3', name: 'Lucas Moreau', company: 'Freelance', email: 'lucas.moreau@gmail.com', dailyRate: 550, skills: ['React', 'TypeScript', 'UI/UX'], availability: 'available', performance: 88 },
];

// todo: remove mock functionality
export const mockMissions: Mission[] = [
  { id: '1', projectId: '1', projectName: 'CRM Automation', vendorId: '1', title: 'n8n Workflow Development', description: 'Build automation workflows for lead processing', startDate: '2024-01-08', endDate: '2024-01-22', status: 'in_progress', deliverables: ['Lead capture workflow', 'Email notification workflow', 'CRM sync workflow'] },
  { id: '2', projectId: '2', projectName: 'Data Pipeline Setup', vendorId: '2', title: 'ETL Pipeline Design', description: 'Design and implement data transformation pipelines', startDate: '2024-01-10', endDate: '2024-01-30', status: 'pending', deliverables: ['Schema design', 'Pipeline implementation', 'Documentation'] },
];

// todo: remove mock functionality
export const kpiData = {
  mrr: 85000,
  mrrGrowth: 12.5,
  arr: 1020000,
  pipelineValue: 245000,
  winRate: 42,
  avgDealCycle: 28,
  activeProjects: 12,
  slaCompliance: 96,
  workflowSuccessRate: 94,
  vendorCosts: 28500,
};
