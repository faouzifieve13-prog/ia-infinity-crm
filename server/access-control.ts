import { storage } from "./storage";
import type { Request } from "express";
import type { Project, Account, Task, Mission } from "@shared/schema";

const DEFAULT_ORG_ID = "default-org";

export interface AccessContext {
  userId: string;
  role: string;
  space: string;
  accountId: string | null;
  vendorContactId: string | null;
  orgId: string;
}

/**
 * Extrait le contexte d'accès depuis la session de la requête
 */
export function getAccessContext(req: Request): AccessContext {
  return {
    userId: req.session.userId!,
    role: req.session.role!,
    space: req.session.space!,
    accountId: req.session.accountId || null,
    vendorContactId: req.session.vendorContactId || null,
    orgId: req.session.orgId || DEFAULT_ORG_ID,
  };
}

/**
 * Récupère les IDs de projets assignés à un vendor
 * Optimized: Uses direct vendorId lookup instead of N+1 queries via contacts
 */
export async function getVendorProjectIds(
  orgId: string,
  vendorContactId: string
): Promise<string[]> {
  try {
    // Get vendor contact to find vendorId
    const contact = await storage.getContact(vendorContactId, orgId);
    if (!contact || !contact.vendorId) {
      return [];
    }

    const projects = await storage.getProjects(orgId);

    // Filter projects:
    // 1. Projects specifically assigned to this vendorContactId (priority)
    // 2. Projects assigned to the vendor company (vendorId) but without specific vendorContactId (fallback)
    const vendorProjects = projects.filter(p =>
      p.vendorContactId === vendorContactId ||
      (!p.vendorContactId && p.vendorId === contact.vendorId)
    );

    const legacyProjectIds = vendorProjects.map(p => p.id);

    // 3. Projects assigned via projectVendors junction table (new many-to-many system)
    const junctionProjectIds = await storage.getVendorAssignedProjectIds(contact.vendorId, orgId);

    // Combine and deduplicate
    const combined = legacyProjectIds.concat(junctionProjectIds);
    return Array.from(new Set(combined));
  } catch (error) {
    console.error("Error getting vendor project IDs:", error);
    return [];
  }
}

/**
 * Récupère les IDs de comptes liés aux projets d'un vendor
 */
async function getVendorAccountIds(
  orgId: string,
  vendorContactId: string
): Promise<string[]> {
  try {
    const projectIds = await getVendorProjectIds(orgId, vendorContactId);
    const projects = await storage.getProjects(orgId);
    const vendorProjects = projects.filter(p => projectIds.includes(p.id));
    return [...new Set(
      vendorProjects
        .map(p => p.accountId)
        .filter((id): id is string => id !== null)
    )];
  } catch (error) {
    console.error("Error getting vendor account IDs:", error);
    return [];
  }
}

/**
 * Récupère les IDs de projets d'un client
 */
async function getClientProjectIds(
  orgId: string,
  accountId: string
): Promise<string[]> {
  try {
    const projects = await storage.getProjects(orgId, accountId);
    return projects.map(p => p.id);
  } catch (error) {
    console.error("Error getting client project IDs:", error);
    return [];
  }
}

/**
 * Filtre les projets selon le contexte d'accès de l'utilisateur
 */
export async function filterProjectsByAccess(
  projects: Project[],
  context: AccessContext
): Promise<Project[]> {
  // Admin/internal users voient tous les projets
  if (['admin', 'sales', 'delivery', 'finance'].includes(context.role)) {
    return projects;
  }

  // Client users voient seulement les projets de leur compte
  if (context.role === 'client_admin' || context.role === 'client_member') {
    if (!context.accountId) return [];
    return projects.filter(p => p.accountId === context.accountId);
  }

  // Vendor users voient seulement les projets assignés
  if (context.role === 'vendor') {
    if (!context.vendorContactId) return [];

    const vendorProjectIds = await getVendorProjectIds(
      context.orgId,
      context.vendorContactId
    );
    return projects.filter(p => vendorProjectIds.includes(p.id));
  }

  return [];
}

/**
 * Filtre les comptes selon le contexte d'accès de l'utilisateur
 */
export async function filterAccountsByAccess(
  accounts: Account[],
  context: AccessContext
): Promise<Account[]> {
  // Admin/internal users voient tous les comptes
  if (['admin', 'sales', 'delivery', 'finance'].includes(context.role)) {
    return accounts;
  }

  // Client users voient seulement leur propre compte
  if (context.role === 'client_admin' || context.role === 'client_member') {
    if (!context.accountId) return [];
    return accounts.filter(a => a.id === context.accountId);
  }

  // Vendor users voient les comptes des projets assignés
  if (context.role === 'vendor') {
    if (!context.vendorContactId) return [];

    const vendorAccountIds = await getVendorAccountIds(
      context.orgId,
      context.vendorContactId
    );
    return accounts.filter(a => vendorAccountIds.includes(a.id));
  }

  return [];
}

/**
 * Filtre les tâches selon le contexte d'accès de l'utilisateur
 */
export async function filterTasksByAccess(
  tasks: Task[],
  context: AccessContext
): Promise<Task[]> {
  // Admin/internal users voient toutes les tâches
  if (['admin', 'sales', 'delivery', 'finance'].includes(context.role)) {
    return tasks;
  }

  // Client users voient les tâches de leurs projets
  if (context.role === 'client_admin' || context.role === 'client_member') {
    if (!context.accountId) return [];

    const clientProjectIds = await getClientProjectIds(
      context.orgId,
      context.accountId
    );
    return tasks.filter(t => t.projectId && clientProjectIds.includes(t.projectId));
  }

  // Vendor users voient les tâches de leurs projets assignés
  if (context.role === 'vendor') {
    if (!context.vendorContactId) return [];

    const vendorProjectIds = await getVendorProjectIds(
      context.orgId,
      context.vendorContactId
    );
    return tasks.filter(t => t.projectId && vendorProjectIds.includes(t.projectId));
  }

  return [];
}

/**
 * Valide qu'un client a accès à un compte spécifique
 */
export async function validateClientAccountAccess(
  orgId: string,
  accountId: string,
  userAccountId: string | null
): Promise<boolean> {
  if (!userAccountId) return false;
  return accountId === userAccountId;
}

/**
 * Valide qu'un vendor a accès à un projet spécifique
 */
export async function validateVendorProjectAccess(
  orgId: string,
  vendorContactId: string,
  projectId: string
): Promise<boolean> {
  try {
    const vendorProjectIds = await getVendorProjectIds(orgId, vendorContactId);
    return vendorProjectIds.includes(projectId);
  } catch (error) {
    console.error("Error validating vendor project access:", error);
    return false;
  }
}

/**
 * Valide qu'un vendor a accès à une ressource spécifique (projet, tâche, document, facture, contrat)
 */
export async function validateVendorAccess(
  orgId: string,
  vendorContactId: string,
  resourceType: 'project' | 'task' | 'document' | 'invoice' | 'contract',
  resourceId: string
): Promise<boolean> {
  try {
    // Récupérer les IDs de projets assignés au vendor
    const vendorProjectIds = await getVendorProjectIds(orgId, vendorContactId);

    switch (resourceType) {
      case 'project':
        return vendorProjectIds.includes(resourceId);

      case 'task': {
        const task = await storage.getTask(resourceId, orgId);
        return task?.projectId ? vendorProjectIds.includes(task.projectId) : false;
      }

      case 'document': {
        const doc = await storage.getDocument(resourceId, orgId);
        return doc?.projectId ? vendorProjectIds.includes(doc.projectId) : false;
      }

      case 'invoice': {
        const invoice = await storage.getInvoice(resourceId, orgId);
        return invoice?.projectId ? vendorProjectIds.includes(invoice.projectId) : false;
      }

      case 'contract': {
        const contract = await storage.getContract(resourceId, orgId);
        return contract?.projectId ? vendorProjectIds.includes(contract.projectId) : false;
      }

      default:
        return false;
    }
  } catch (error) {
    console.error(`Error validating vendor ${resourceType} access:`, error);
    return false;
  }
}
