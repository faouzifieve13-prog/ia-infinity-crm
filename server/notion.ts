// Notion Integration for IA Infinity
// Uses Replit's Notion connector for authentication

import { Client } from '@notionhq/client';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=notion',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Notion not connected');
  }
  return accessToken;
}

export async function getNotionClient(): Promise<Client> {
  const accessToken = await getAccessToken();
  return new Client({ auth: accessToken });
}

export async function listNotionDatabases(): Promise<Array<{ id: string; title: string }>> {
  const notion = await getNotionClient();
  const response = await notion.search({
    filter: { property: 'object', value: 'database' }
  });
  
  return response.results
    .filter((result): result is any => result.object === 'database')
    .map(db => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled Database'
    }));
}

export async function getDatabaseSchema(databaseId: string): Promise<any> {
  const notion = await getNotionClient();
  const database = await notion.databases.retrieve({ database_id: databaseId });
  return database;
}

export async function queryDatabase(databaseId: string, startCursor?: string): Promise<{
  results: any[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const notion = await getNotionClient();
  const response = await notion.databases.query({
    database_id: databaseId,
    start_cursor: startCursor,
    page_size: 100
  });
  
  return {
    results: response.results,
    nextCursor: response.next_cursor,
    hasMore: response.has_more
  };
}

// Helper to extract property value from Notion page
export function getPropertyValue(page: any, propertyName: string): any {
  const property = page.properties[propertyName];
  if (!property) return null;
  
  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || null;
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || null;
    case 'number':
      return property.number;
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select?.map((s: any) => s.name) || [];
    case 'date':
      return property.date?.start || null;
    case 'email':
      return property.email || null;
    case 'phone_number':
      return property.phone_number || null;
    case 'url':
      return property.url || null;
    case 'checkbox':
      return property.checkbox;
    case 'people':
      return property.people?.map((p: any) => p.name || p.id) || [];
    case 'relation':
      return property.relation?.map((r: any) => r.id) || [];
    case 'formula':
      return property.formula?.string || property.formula?.number || null;
    case 'rollup':
      return property.rollup?.number || property.rollup?.array || null;
    case 'status':
      return property.status?.name || null;
    default:
      return null;
  }
}

// Find the most likely property name for a field
export function findPropertyByPossibleNames(properties: any, possibleNames: string[]): string | null {
  const propertyKeys = Object.keys(properties);
  for (const name of possibleNames) {
    const found = propertyKeys.find(key => 
      key.toLowerCase() === name.toLowerCase() ||
      key.toLowerCase().includes(name.toLowerCase())
    );
    if (found) return found;
  }
  return null;
}

// Get property by any of possible names
function getPropertyByNames(page: any, possibleNames: string[]): any {
  const propName = findPropertyByPossibleNames(page.properties, possibleNames);
  return propName ? getPropertyValue(page, propName) : null;
}

// ====== ENTITY FIELD MAPPINGS ======

// Mapping for Accounts (Clients)
export const accountFieldMappings = {
  name: ['name', 'nom', 'client', 'company', 'entreprise', 'société'],
  contactName: ['contact', 'contact_name', 'responsable', 'nom_contact', 'person'],
  contactEmail: ['email', 'e-mail', 'courriel', 'mail', 'contact_email'],
  domain: ['domain', 'website', 'site', 'site_web', 'url'],
  status: ['status', 'statut', 'état', 'state'],
  plan: ['plan', 'offre', 'type', 'forfait']
};

// Mapping for Contacts
export const contactFieldMappings = {
  name: ['name', 'nom', 'contact', 'full_name', 'nom_complet'],
  email: ['email', 'e-mail', 'courriel', 'mail'],
  role: ['role', 'rôle', 'poste', 'position', 'titre', 'function', 'fonction'],
  phone: ['phone', 'téléphone', 'tel', 'mobile', 'phone_number'],
  linkedIn: ['linkedin', 'linked_in', 'profil_linkedin'],
  account: ['account', 'client', 'company', 'entreprise', 'société']
};

// Mapping for Deals (Opportunités/Pipeline)
export const dealFieldMappings = {
  name: ['name', 'nom', 'deal', 'opportunité', 'titre', 'title'],
  amount: ['amount', 'montant', 'valeur', 'value', 'prix', 'price'],
  probability: ['probability', 'probabilité', 'chance', 'likelihood'],
  stage: ['stage', 'étape', 'phase', 'status', 'statut', 'état'],
  nextAction: ['next_action', 'prochaine_action', 'action', 'to_do', 'next_step'],
  nextActionDate: ['next_action_date', 'date_action', 'due_date', 'date_échéance'],
  account: ['account', 'client', 'company', 'entreprise', 'société'],
  contact: ['contact', 'contact_principal', 'main_contact']
};

// Mapping for Projects
export const projectFieldMappings = {
  name: ['name', 'nom', 'project', 'projet', 'titre', 'title'],
  description: ['description', 'détails', 'notes', 'summary', 'résumé'],
  status: ['status', 'statut', 'état', 'state', 'phase'],
  startDate: ['start_date', 'date_début', 'début', 'start', 'date_démarrage'],
  endDate: ['end_date', 'date_fin', 'fin', 'end', 'deadline', 'échéance'],
  progress: ['progress', 'avancement', 'progression', 'percentage', 'completion'],
  account: ['account', 'client', 'company', 'entreprise', 'société'],
  deal: ['deal', 'opportunité', 'opportunity']
};

// Mapping for Tasks
export const taskFieldMappings = {
  title: ['title', 'titre', 'name', 'nom', 'task', 'tâche'],
  description: ['description', 'détails', 'notes', 'content', 'contenu'],
  status: ['status', 'statut', 'état', 'state'],
  priority: ['priority', 'priorité', 'urgence', 'importance'],
  dueDate: ['due_date', 'date_échéance', 'deadline', 'échéance', 'date'],
  project: ['project', 'projet'],
  assignee: ['assignee', 'assigné', 'responsable', 'owner', 'person']
};

// Mapping for Invoices (Factures)
export const invoiceFieldMappings = {
  invoiceNumber: ['invoice_number', 'numéro', 'number', 'num', 'référence', 'ref'],
  amount: ['amount', 'montant', 'total', 'value', 'valeur'],
  status: ['status', 'statut', 'état', 'state', 'payment_status'],
  dueDate: ['due_date', 'date_échéance', 'échéance', 'deadline'],
  issuedDate: ['issued_date', 'date_émission', 'issue_date', 'date_facture', 'date'],
  paidDate: ['paid_date', 'date_paiement', 'payment_date', 'payé_le'],
  customerEmail: ['customer_email', 'email_client', 'email', 'mail'],
  account: ['account', 'client', 'company', 'entreprise', 'société'],
  project: ['project', 'projet']
};

// Mapping for Vendors (Prestataires)
export const vendorFieldMappings = {
  name: ['name', 'nom', 'vendor', 'prestataire', 'freelance'],
  company: ['company', 'entreprise', 'société', 'organization'],
  email: ['email', 'e-mail', 'courriel', 'mail'],
  dailyRate: ['daily_rate', 'tjm', 'taux_journalier', 'day_rate', 'rate', 'tarif'],
  skills: ['skills', 'compétences', 'expertise', 'technologies', 'tech'],
  availability: ['availability', 'disponibilité', 'status', 'statut', 'état']
};

// Mapping for Missions
export const missionFieldMappings = {
  title: ['title', 'titre', 'name', 'nom', 'mission'],
  description: ['description', 'détails', 'notes', 'content'],
  status: ['status', 'statut', 'état', 'state'],
  startDate: ['start_date', 'date_début', 'début', 'start'],
  endDate: ['end_date', 'date_fin', 'fin', 'end', 'deadline'],
  deliverables: ['deliverables', 'livrables', 'deliverables', 'output'],
  project: ['project', 'projet'],
  vendor: ['vendor', 'prestataire', 'freelance', 'contractor']
};

// Mapping for Expenses (Charges)
export const expenseFieldMappings = {
  title: ['title', 'titre', 'name', 'nom', 'expense', 'charge', 'description', 'label', 'libellé'],
  amount: ['amount', 'montant', 'total', 'value', 'valeur', 'prix', 'cost', 'coût'],
  category: ['category', 'catégorie', 'type', 'nature'],
  status: ['status', 'statut', 'état', 'state', 'payment_status', 'paiement'],
  date: ['date', 'expense_date', 'date_charge', 'date_dépense'],
  description: ['description', 'notes', 'détails', 'commentaire', 'comments']
};

// Mapping for Documents
export const documentFieldMappings = {
  name: ['name', 'nom', 'title', 'titre', 'document', 'file', 'fichier'],
  url: ['url', 'link', 'lien', 'file_url', 'download'],
  mimeType: ['type', 'mime_type', 'format', 'extension'],
  account: ['account', 'client', 'company', 'entreprise'],
  project: ['project', 'projet']
};

// ====== MAPPERS FOR EACH ENTITY ======

export function mapNotionPageToAccount(page: any) {
  const props = page.properties;
  return {
    notionPageId: page.id,
    notionLastEditedAt: new Date(page.last_edited_time),
    name: getPropertyByNames(page, accountFieldMappings.name) || 'Sans nom',
    contactName: getPropertyByNames(page, accountFieldMappings.contactName) || 'Contact',
    contactEmail: getPropertyByNames(page, accountFieldMappings.contactEmail) || '',
    domain: getPropertyByNames(page, accountFieldMappings.domain),
    status: mapAccountStatus(getPropertyByNames(page, accountFieldMappings.status)),
    plan: getPropertyByNames(page, accountFieldMappings.plan) || 'standard'
  };
}

export function mapNotionPageToContact(page: any, accountIdMap: Map<string, string>) {
  const accountRelation = getPropertyByNames(page, contactFieldMappings.account);
  const accountNotionId = Array.isArray(accountRelation) ? accountRelation[0] : null;
  
  return {
    notionPageId: page.id,
    notionLastEditedAt: new Date(page.last_edited_time),
    name: getPropertyByNames(page, contactFieldMappings.name) || 'Sans nom',
    email: getPropertyByNames(page, contactFieldMappings.email) || '',
    role: getPropertyByNames(page, contactFieldMappings.role) || 'Contact',
    phone: getPropertyByNames(page, contactFieldMappings.phone),
    linkedIn: getPropertyByNames(page, contactFieldMappings.linkedIn),
    accountId: accountNotionId ? accountIdMap.get(accountNotionId) : undefined
  };
}

export function mapNotionPageToDeal(page: any, accountIdMap: Map<string, string>, contactIdMap: Map<string, string>) {
  const accountRelation = getPropertyByNames(page, dealFieldMappings.account);
  const contactRelation = getPropertyByNames(page, dealFieldMappings.contact);
  const accountNotionId = Array.isArray(accountRelation) ? accountRelation[0] : null;
  const contactNotionId = Array.isArray(contactRelation) ? contactRelation[0] : null;
  
  const rawAmount = getPropertyByNames(page, dealFieldMappings.amount);
  const rawProbability = getPropertyByNames(page, dealFieldMappings.probability);
  
  return {
    notionPageId: page.id,
    notionLastEditedAt: new Date(page.last_edited_time),
    name: getPropertyByNames(page, dealFieldMappings.name) || 'Nouvelle opportunité',
    amount: rawAmount ? String(rawAmount) : '0',
    probability: typeof rawProbability === 'number' ? rawProbability : 0,
    stage: mapDealStage(getPropertyByNames(page, dealFieldMappings.stage)),
    nextAction: getPropertyByNames(page, dealFieldMappings.nextAction),
    nextActionDate: parseDate(getPropertyByNames(page, dealFieldMappings.nextActionDate)),
    accountId: accountNotionId ? accountIdMap.get(accountNotionId) : undefined,
    contactId: contactNotionId ? contactIdMap.get(contactNotionId) : undefined
  };
}

export function mapNotionPageToProject(page: any, accountIdMap: Map<string, string>, dealIdMap: Map<string, string>) {
  const accountRelation = getPropertyByNames(page, projectFieldMappings.account);
  const dealRelation = getPropertyByNames(page, projectFieldMappings.deal);
  const accountNotionId = Array.isArray(accountRelation) ? accountRelation[0] : null;
  const dealNotionId = Array.isArray(dealRelation) ? dealRelation[0] : null;
  
  const rawProgress = getPropertyByNames(page, projectFieldMappings.progress);
  
  return {
    notionPageId: page.id,
    notionLastEditedAt: new Date(page.last_edited_time),
    name: getPropertyByNames(page, projectFieldMappings.name) || 'Nouveau projet',
    description: getPropertyByNames(page, projectFieldMappings.description),
    status: mapProjectStatus(getPropertyByNames(page, projectFieldMappings.status)),
    startDate: parseDate(getPropertyByNames(page, projectFieldMappings.startDate)),
    endDate: parseDate(getPropertyByNames(page, projectFieldMappings.endDate)),
    progress: typeof rawProgress === 'number' ? rawProgress : 0,
    accountId: accountNotionId ? accountIdMap.get(accountNotionId) : undefined,
    dealId: dealNotionId ? dealIdMap.get(dealNotionId) : undefined
  };
}

export function mapNotionPageToTask(page: any, projectIdMap: Map<string, string>) {
  const projectRelation = getPropertyByNames(page, taskFieldMappings.project);
  const projectNotionId = Array.isArray(projectRelation) ? projectRelation[0] : null;
  
  return {
    notionPageId: page.id,
    notionLastEditedAt: new Date(page.last_edited_time),
    title: getPropertyByNames(page, taskFieldMappings.title) || 'Nouvelle tâche',
    description: getPropertyByNames(page, taskFieldMappings.description),
    status: mapTaskStatus(getPropertyByNames(page, taskFieldMappings.status)),
    priority: mapTaskPriority(getPropertyByNames(page, taskFieldMappings.priority)),
    dueDate: parseDate(getPropertyByNames(page, taskFieldMappings.dueDate)),
    projectId: projectNotionId ? projectIdMap.get(projectNotionId) : undefined
  };
}

export function mapNotionPageToInvoice(page: any, accountIdMap: Map<string, string>, projectIdMap: Map<string, string>) {
  const accountRelation = getPropertyByNames(page, invoiceFieldMappings.account);
  const projectRelation = getPropertyByNames(page, invoiceFieldMappings.project);
  const accountNotionId = Array.isArray(accountRelation) ? accountRelation[0] : null;
  const projectNotionId = Array.isArray(projectRelation) ? projectRelation[0] : null;
  
  const rawAmount = getPropertyByNames(page, invoiceFieldMappings.amount);
  
  return {
    notionPageId: page.id,
    notionLastEditedAt: new Date(page.last_edited_time),
    invoiceNumber: getPropertyByNames(page, invoiceFieldMappings.invoiceNumber) || `FAC-${Date.now()}`,
    amount: rawAmount ? String(rawAmount) : '0',
    status: mapInvoiceStatus(getPropertyByNames(page, invoiceFieldMappings.status)),
    dueDate: parseDate(getPropertyByNames(page, invoiceFieldMappings.dueDate)),
    issuedDate: parseDate(getPropertyByNames(page, invoiceFieldMappings.issuedDate)),
    paidDate: parseDate(getPropertyByNames(page, invoiceFieldMappings.paidDate)),
    customerEmail: getPropertyByNames(page, invoiceFieldMappings.customerEmail),
    accountId: accountNotionId ? accountIdMap.get(accountNotionId) : undefined,
    projectId: projectNotionId ? projectIdMap.get(projectNotionId) : undefined
  };
}

export function mapNotionPageToVendor(page: any) {
  const rawRate = getPropertyByNames(page, vendorFieldMappings.dailyRate);
  const skills = getPropertyByNames(page, vendorFieldMappings.skills);
  
  return {
    notionPageId: page.id,
    notionLastEditedAt: new Date(page.last_edited_time),
    name: getPropertyByNames(page, vendorFieldMappings.name) || 'Prestataire',
    company: getPropertyByNames(page, vendorFieldMappings.company),
    email: getPropertyByNames(page, vendorFieldMappings.email) || '',
    dailyRate: rawRate ? String(rawRate) : '0',
    skills: Array.isArray(skills) ? skills : [],
    availability: mapVendorAvailability(getPropertyByNames(page, vendorFieldMappings.availability))
  };
}

export function mapNotionPageToMission(page: any, projectIdMap: Map<string, string>, vendorIdMap: Map<string, string>) {
  const projectRelation = getPropertyByNames(page, missionFieldMappings.project);
  const vendorRelation = getPropertyByNames(page, missionFieldMappings.vendor);
  const projectNotionId = Array.isArray(projectRelation) ? projectRelation[0] : null;
  const vendorNotionId = Array.isArray(vendorRelation) ? vendorRelation[0] : null;
  
  const deliverables = getPropertyByNames(page, missionFieldMappings.deliverables);
  
  return {
    notionPageId: page.id,
    notionLastEditedAt: new Date(page.last_edited_time),
    title: getPropertyByNames(page, missionFieldMappings.title) || 'Nouvelle mission',
    description: getPropertyByNames(page, missionFieldMappings.description),
    status: mapMissionStatus(getPropertyByNames(page, missionFieldMappings.status)),
    startDate: parseDate(getPropertyByNames(page, missionFieldMappings.startDate)),
    endDate: parseDate(getPropertyByNames(page, missionFieldMappings.endDate)),
    deliverables: Array.isArray(deliverables) ? deliverables : [],
    projectId: projectNotionId ? projectIdMap.get(projectNotionId) : undefined,
    vendorId: vendorNotionId ? vendorIdMap.get(vendorNotionId) : undefined
  };
}

export function mapNotionPageToExpense(page: any) {
  const rawAmount = getPropertyByNames(page, expenseFieldMappings.amount);
  
  return {
    notionPageId: page.id,
    notionLastEditedAt: new Date(page.last_edited_time),
    title: getPropertyByNames(page, expenseFieldMappings.title) || 'Charge',
    amount: rawAmount ? String(rawAmount) : '0',
    category: mapExpenseCategory(getPropertyByNames(page, expenseFieldMappings.category)),
    status: mapExpenseStatus(getPropertyByNames(page, expenseFieldMappings.status)),
    date: parseDate(getPropertyByNames(page, expenseFieldMappings.date)) || new Date(),
    description: getPropertyByNames(page, expenseFieldMappings.description)
  };
}

export function mapNotionPageToDocument(page: any, accountIdMap: Map<string, string>, projectIdMap: Map<string, string>) {
  const accountRelation = getPropertyByNames(page, documentFieldMappings.account);
  const projectRelation = getPropertyByNames(page, documentFieldMappings.project);
  const accountNotionId = Array.isArray(accountRelation) ? accountRelation[0] : null;
  const projectNotionId = Array.isArray(projectRelation) ? projectRelation[0] : null;
  
  return {
    notionPageId: page.id,
    notionLastEditedAt: new Date(page.last_edited_time),
    name: getPropertyByNames(page, documentFieldMappings.name) || 'Document',
    url: getPropertyByNames(page, documentFieldMappings.url),
    mimeType: getPropertyByNames(page, documentFieldMappings.mimeType),
    accountId: accountNotionId ? accountIdMap.get(accountNotionId) : undefined,
    projectId: projectNotionId ? projectIdMap.get(projectNotionId) : undefined
  };
}

// ====== STATUS MAPPERS ======

function mapAccountStatus(status: string | null): 'active' | 'inactive' | 'prospect' {
  if (!status) return 'prospect';
  const normalized = status.toLowerCase();
  if (normalized.includes('actif') || normalized.includes('active') || normalized.includes('client')) return 'active';
  if (normalized.includes('inactif') || normalized.includes('inactive') || normalized.includes('fermé') || normalized.includes('closed')) return 'inactive';
  return 'prospect';
}

function mapDealStage(stage: string | null): 'prospect' | 'meeting' | 'proposal' | 'audit' | 'closing' | 'won' | 'lost' {
  if (!stage) return 'prospect';
  const normalized = stage.toLowerCase();
  if (normalized.includes('gagn') || normalized.includes('won') || normalized.includes('signé')) return 'won';
  if (normalized.includes('perdu') || normalized.includes('lost') || normalized.includes('fermé')) return 'lost';
  if (normalized.includes('closing') || normalized.includes('négociation') || normalized.includes('final')) return 'closing';
  if (normalized.includes('audit') || normalized.includes('analyse')) return 'audit';
  if (normalized.includes('proposal') || normalized.includes('proposition') || normalized.includes('devis')) return 'proposal';
  if (normalized.includes('meeting') || normalized.includes('rdv') || normalized.includes('rendez')) return 'meeting';
  return 'prospect';
}

function mapProjectStatus(status: string | null): 'active' | 'completed' | 'on_hold' | 'cancelled' {
  if (!status) return 'active';
  const normalized = status.toLowerCase();
  if (normalized.includes('termin') || normalized.includes('complet') || normalized.includes('done') || normalized.includes('fini')) return 'completed';
  if (normalized.includes('pause') || normalized.includes('hold') || normalized.includes('attente')) return 'on_hold';
  if (normalized.includes('annul') || normalized.includes('cancel')) return 'cancelled';
  return 'active';
}

function mapTaskStatus(status: string | null): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
  if (!status) return 'pending';
  const normalized = status.toLowerCase();
  if (normalized.includes('termin') || normalized.includes('complet') || normalized.includes('done') || normalized.includes('fait')) return 'completed';
  if (normalized.includes('cours') || normalized.includes('progress') || normalized.includes('doing')) return 'in_progress';
  if (normalized.includes('annul') || normalized.includes('cancel')) return 'cancelled';
  return 'pending';
}

function mapTaskPriority(priority: string | null): 'low' | 'medium' | 'high' | 'urgent' {
  if (!priority) return 'medium';
  const normalized = priority.toLowerCase();
  if (normalized.includes('urgent') || normalized.includes('critique') || normalized.includes('critical')) return 'urgent';
  if (normalized.includes('high') || normalized.includes('haut') || normalized.includes('élevé') || normalized.includes('important')) return 'high';
  if (normalized.includes('low') || normalized.includes('bas') || normalized.includes('faible')) return 'low';
  return 'medium';
}

function mapInvoiceStatus(status: string | null): 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' {
  if (!status) return 'draft';
  const normalized = status.toLowerCase();
  if (normalized.includes('pay') || normalized.includes('réglé') || normalized.includes('encaissé')) return 'paid';
  if (normalized.includes('envoy') || normalized.includes('sent') || normalized.includes('émis')) return 'sent';
  if (normalized.includes('retard') || normalized.includes('overdue') || normalized.includes('impayé')) return 'overdue';
  if (normalized.includes('annul') || normalized.includes('cancel')) return 'cancelled';
  return 'draft';
}

function mapVendorAvailability(availability: string | null): 'available' | 'partially_available' | 'unavailable' {
  if (!availability) return 'available';
  const normalized = availability.toLowerCase();
  if (normalized.includes('indisponible') || normalized.includes('unavailable') || normalized.includes('occupé')) return 'unavailable';
  if (normalized.includes('partiel') || normalized.includes('partial') || normalized.includes('limité')) return 'partially_available';
  return 'available';
}

function mapMissionStatus(status: string | null): 'pending' | 'active' | 'completed' | 'cancelled' {
  if (!status) return 'pending';
  const normalized = status.toLowerCase();
  if (normalized.includes('termin') || normalized.includes('complet') || normalized.includes('done') || normalized.includes('livré')) return 'completed';
  if (normalized.includes('cours') || normalized.includes('active') || normalized.includes('doing')) return 'active';
  if (normalized.includes('annul') || normalized.includes('cancel')) return 'cancelled';
  return 'pending';
}

function mapExpenseCategory(category: string | null): 'tools' | 'software' | 'services' | 'travel' | 'marketing' | 'office' | 'salaries' | 'taxes' | 'other' {
  if (!category) return 'other';
  const normalized = category.toLowerCase();
  if (normalized.includes('outil') || normalized.includes('tool') || normalized.includes('équipement')) return 'tools';
  if (normalized.includes('logiciel') || normalized.includes('software') || normalized.includes('saas') || normalized.includes('abonnement')) return 'software';
  if (normalized.includes('service') || normalized.includes('prestation')) return 'services';
  if (normalized.includes('voyage') || normalized.includes('travel') || normalized.includes('déplacement') || normalized.includes('transport')) return 'travel';
  if (normalized.includes('marketing') || normalized.includes('pub') || normalized.includes('communication')) return 'marketing';
  if (normalized.includes('bureau') || normalized.includes('office') || normalized.includes('local')) return 'office';
  if (normalized.includes('salaire') || normalized.includes('salary') || normalized.includes('rémunération')) return 'salaries';
  if (normalized.includes('taxe') || normalized.includes('tax') || normalized.includes('impôt') || normalized.includes('tva')) return 'taxes';
  return 'other';
}

function mapExpenseStatus(status: string | null): 'pending' | 'paid' | 'cancelled' {
  if (!status) return 'pending';
  const normalized = status.toLowerCase();
  if (normalized.includes('pay') || normalized.includes('réglé') || normalized.includes('payé')) return 'paid';
  if (normalized.includes('annul') || normalized.includes('cancel')) return 'cancelled';
  return 'pending';
}

// ====== HELPER FUNCTIONS ======

function parseDate(dateStr: string | null): Date | undefined {
  if (!dateStr) return undefined;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}
