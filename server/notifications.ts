import { storage } from './storage';

/**
 * Notify relevant users when a comment is added to a project
 */
export async function notifyProjectComment(params: {
  orgId: string;
  projectId: string;
  commentId: string;
  authorId: string;
  authorName: string;
  content: string;
  isFromClient: boolean;
}) {
  const { orgId, projectId, authorId, authorName, content, isFromClient } = params;

  try {
    const project = await storage.getProject(projectId, orgId);
    if (!project) {
      console.error(`Project ${projectId} not found for notification`);
      return;
    }

    const usersToNotify: string[] = [];

    // Notify the vendor if comment is from client or admin
    if (isFromClient && project.vendorId) {
      const vendor = await storage.getVendor(project.vendorId, orgId);
      if (vendor?.userId) {
        usersToNotify.push(vendor.userId);
      }
    }

    // Notify the client if comment is from vendor or admin
    if (!isFromClient && project.accountId) {
      const memberships = await storage.getMembershipsByOrg(orgId);
      const clientMembers = memberships.filter(m =>
        m.accountId === project.accountId &&
        (m.role === 'client_admin' || m.role === 'client_member')
      );
      usersToNotify.push(...clientMembers.map(m => m.userId));
    }

    // Notify internal team (admin, delivery, sales) except the author
    const memberships = await storage.getMembershipsByOrg(orgId);
    const internalMembers = memberships.filter(m =>
      ['admin', 'delivery', 'sales'].includes(m.role) &&
      m.userId !== authorId
    );
    usersToNotify.push(...internalMembers.map(m => m.userId));

    // Create notification preview
    const contentPreview = content.length > 100 ? content.substring(0, 100) + '...' : content;

    // Create notifications for all users (deduplicated)
    const uniqueUsers = [...new Set(usersToNotify)];
    for (const userId of uniqueUsers) {
      if (userId === authorId) continue; // Don't notify the author

      await storage.createNotification({
        orgId,
        userId,
        title: `Nouveau commentaire sur ${project.name}`,
        description: `${authorName} : ${contentPreview}`,
        type: 'info',
        isRead: false,
        link: `/projects/${projectId}`,
        relatedEntityType: 'project',
        relatedEntityId: projectId,
      });
    }

    console.log(`Created notifications for ${uniqueUsers.length} users on project ${project.name}`);
  } catch (error) {
    console.error('Error creating project comment notification:', error);
  }
}

/**
 * Notify user when they are assigned to a task
 */
export async function notifyTaskAssigned(params: {
  orgId: string;
  taskId: string;
  taskTitle: string;
  assignedTo: string;
  assignedBy: string;
  projectId?: string;
}) {
  const { orgId, taskId, taskTitle, assignedTo, assignedBy, projectId } = params;

  try {
    if (assignedTo === assignedBy) {
      // Don't notify if user assigned task to themselves
      return;
    }

    await storage.createNotification({
      orgId,
      userId: assignedTo,
      title: 'Nouvelle tâche assignée',
      description: `Vous avez été assigné à la tâche : ${taskTitle}`,
      type: 'info',
      isRead: false,
      link: `/tasks/${taskId}`,
      relatedEntityType: 'task',
      relatedEntityId: taskId,
    });

    console.log(`Notified user ${assignedTo} of task assignment`);
  } catch (error) {
    console.error('Error creating task assignment notification:', error);
  }
}

/**
 * Notify when task status changes
 */
export async function notifyTaskStatusChange(params: {
  orgId: string;
  taskId: string;
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  projectId?: string;
}) {
  const { orgId, taskId, taskTitle, oldStatus, newStatus, changedBy, projectId } = params;

  try {
    const usersToNotify: string[] = [];

    // Notify project stakeholders if task is part of a project
    if (projectId) {
      const project = await storage.getProject(projectId, orgId);
      if (project) {
        // Notify client
        if (project.accountId) {
          const memberships = await storage.getMembershipsByOrg(orgId);
          const clientMembers = memberships.filter(m =>
            m.accountId === project.accountId &&
            m.role === 'client_admin'
          );
          usersToNotify.push(...clientMembers.map(m => m.userId));
        }

        // Notify internal team
        const memberships = await storage.getMembershipsByOrg(orgId);
        const internalMembers = memberships.filter(m =>
          ['admin', 'delivery'].includes(m.role) &&
          m.userId !== changedBy
        );
        usersToNotify.push(...internalMembers.map(m => m.userId));
      }
    }

    const uniqueUsers = [...new Set(usersToNotify)];
    for (const userId of uniqueUsers) {
      await storage.createNotification({
        orgId,
        userId,
        title: `Tâche mise à jour : ${taskTitle}`,
        description: `Statut changé de "${oldStatus}" à "${newStatus}"`,
        type: 'info',
        isRead: false,
        link: `/tasks/${taskId}`,
        relatedEntityType: 'task',
        relatedEntityId: taskId,
      });
    }

    console.log(`Notified ${uniqueUsers.length} users of task status change`);
  } catch (error) {
    console.error('Error creating task status notification:', error);
  }
}

/**
 * Notify when a deliverable is uploaded
 */
export async function notifyDeliverableUploaded(params: {
  orgId: string;
  projectId: string;
  projectName: string;
  deliverableTitle: string;
  uploadedBy: string;
}) {
  const { orgId, projectId, projectName, deliverableTitle, uploadedBy } = params;

  try {
    const project = await storage.getProject(projectId, orgId);
    if (!project || !project.accountId) {
      console.error(`Project ${projectId} not found or has no account`);
      return;
    }

    const memberships = await storage.getMembershipsByOrg(orgId);

    const usersToNotify: string[] = [];

    // Notify client admin
    const clientAdmins = memberships.filter(m =>
      m.accountId === project.accountId &&
      m.role === 'client_admin'
    );
    usersToNotify.push(...clientAdmins.map(m => m.userId));

    // Notify internal team (admin, delivery)
    const internalMembers = memberships.filter(m =>
      ['admin', 'delivery'].includes(m.role) &&
      m.userId !== uploadedBy
    );
    usersToNotify.push(...internalMembers.map(m => m.userId));

    const uniqueUsers = [...new Set(usersToNotify)];
    for (const userId of uniqueUsers) {
      await storage.createNotification({
        orgId,
        userId,
        title: `Nouveau livrable sur ${projectName}`,
        description: deliverableTitle,
        type: 'success',
        isRead: false,
        link: `/projects/${projectId}`,
        relatedEntityType: 'project',
        relatedEntityId: projectId,
      });
    }

    console.log(`Notified ${uniqueUsers.length} users of deliverable upload`);
  } catch (error) {
    console.error('Error creating deliverable upload notification:', error);
  }
}

/**
 * Notify when a new invoice is created
 */
export async function notifyInvoiceCreated(params: {
  orgId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  projectId?: string;
  accountId?: string;
}) {
  const { orgId, invoiceId, invoiceNumber, amount, projectId, accountId } = params;

  try {
    const usersToNotify: string[] = [];

    // Notify client if invoice is for a specific account/project
    if (accountId) {
      const memberships = await storage.getMembershipsByOrg(orgId);
      const clientAdmins = memberships.filter(m =>
        m.accountId === accountId &&
        m.role === 'client_admin'
      );
      usersToNotify.push(...clientAdmins.map(m => m.userId));
    }

    // Notify finance team
    const memberships = await storage.getMembershipsByOrg(orgId);
    const financeMembers = memberships.filter(m =>
      ['admin', 'finance'].includes(m.role)
    );
    usersToNotify.push(...financeMembers.map(m => m.userId));

    const uniqueUsers = [...new Set(usersToNotify)];
    for (const userId of uniqueUsers) {
      await storage.createNotification({
        orgId,
        userId,
        title: `Nouvelle facture : ${invoiceNumber}`,
        description: `Montant : ${amount}€`,
        type: 'info',
        isRead: false,
        link: `/invoices/${invoiceId}`,
        relatedEntityType: 'invoice',
        relatedEntityId: invoiceId,
      });
    }

    console.log(`Notified ${uniqueUsers.length} users of invoice creation`);
  } catch (error) {
    console.error('Error creating invoice notification:', error);
  }
}

/**
 * Notify when a project status changes
 */
export async function notifyProjectStatusChange(params: {
  orgId: string;
  projectId: string;
  projectName: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}) {
  const { orgId, projectId, projectName, oldStatus, newStatus, changedBy } = params;

  try {
    const project = await storage.getProject(projectId, orgId);
    if (!project) return;

    const usersToNotify: string[] = [];

    // Notify client
    if (project.accountId) {
      const memberships = await storage.getMembershipsByOrg(orgId);
      const clientMembers = memberships.filter(m =>
        m.accountId === project.accountId &&
        (m.role === 'client_admin' || m.role === 'client_member')
      );
      usersToNotify.push(...clientMembers.map(m => m.userId));
    }

    // Notify vendor
    if (project.vendorId) {
      const vendor = await storage.getVendor(project.vendorId, orgId);
      if (vendor?.userId) {
        usersToNotify.push(vendor.userId);
      }
    }

    // Notify internal team
    const memberships = await storage.getMembershipsByOrg(orgId);
    const internalMembers = memberships.filter(m =>
      ['admin', 'delivery', 'sales'].includes(m.role) &&
      m.userId !== changedBy
    );
    usersToNotify.push(...internalMembers.map(m => m.userId));

    const uniqueUsers = [...new Set(usersToNotify)];
    for (const userId of uniqueUsers) {
      await storage.createNotification({
        orgId,
        userId,
        title: `Projet mis à jour : ${projectName}`,
        description: `Statut changé de "${oldStatus}" à "${newStatus}"`,
        type: 'info',
        isRead: false,
        link: `/projects/${projectId}`,
        relatedEntityType: 'project',
        relatedEntityId: projectId,
      });
    }

    console.log(`Notified ${uniqueUsers.length} users of project status change`);
  } catch (error) {
    console.error('Error creating project status notification:', error);
  }
}
