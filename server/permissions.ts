import type { Request, Response, NextFunction } from "express";

// Permission Types
type ResourceType = 'project' | 'task' | 'document' | 'comment' | 'channel_message' | 'deliverable' | 'invoice' | 'contract' | 'account' | 'vendor' | 'deal' | 'quote';
type Action = 'view' | 'create' | 'update' | 'delete' | 'comment' | 'upload' | 'download' | 'assign';
type UserRole = 'admin' | 'sales' | 'delivery' | 'finance' | 'client_admin' | 'client_member' | 'vendor';

// Granular Permissions Matrix
// Defines what each role can do with each resource type
const PERMISSIONS_MATRIX: Record<UserRole, Partial<Record<ResourceType, Partial<Record<Action, boolean>>>>> = {
  // ADMIN: Full access to everything
  admin: {
    project:         { view: true, create: true, update: true, delete: true, comment: true },
    task:            { view: true, create: true, update: true, delete: true, assign: true },
    document:        { view: true, create: true, update: true, delete: true, upload: true, download: true },
    comment:         { view: true, create: true, update: true, delete: true },
    channel_message: { view: true, create: true, update: true, delete: true },
    deliverable:     { view: true, create: true, update: true, delete: true, upload: true, download: true },
    invoice:         { view: true, create: true, update: true, delete: true },
    contract:        { view: true, create: true, update: true, delete: true },
    account:         { view: true, create: true, update: true, delete: true },
    vendor:          { view: true, create: true, update: true, delete: true },
    deal:            { view: true, create: true, update: true, delete: true },
    quote:           { view: true, create: true, update: true, delete: true },
  },

  // SALES: Full CRM access, limited project management
  sales: {
    project:         { view: true, create: true, update: true, delete: false, comment: true },
    task:            { view: true, create: true, update: true, delete: false, assign: true },
    document:        { view: true, create: true, update: true, delete: false, upload: true, download: true },
    comment:         { view: true, create: true, update: true, delete: true },
    channel_message: { view: true, create: true, update: true, delete: true },
    deliverable:     { view: true, create: false, update: false, delete: false, upload: false, download: true },
    invoice:         { view: true, create: false, update: false, delete: false },
    contract:        { view: true, create: true, update: true, delete: false },
    account:         { view: true, create: true, update: true, delete: false },
    vendor:          { view: true, create: true, update: true, delete: false },
    deal:            { view: true, create: true, update: true, delete: true },
    quote:           { view: true, create: true, update: true, delete: true },
  },

  // DELIVERY: Project and task management focus
  delivery: {
    project:         { view: true, create: true, update: true, delete: false, comment: true },
    task:            { view: true, create: true, update: true, delete: true, assign: true },
    document:        { view: true, create: true, update: true, delete: true, upload: true, download: true },
    comment:         { view: true, create: true, update: true, delete: true },
    channel_message: { view: true, create: true, update: true, delete: true },
    deliverable:     { view: true, create: true, update: true, delete: true, upload: true, download: true },
    invoice:         { view: true, create: false, update: false, delete: false },
    contract:        { view: true, create: false, update: false, delete: false },
    account:         { view: true, create: false, update: false, delete: false },
    vendor:          { view: true, create: false, update: false, delete: false },
    deal:            { view: true, create: false, update: false, delete: false },
    quote:           { view: true, create: false, update: false, delete: false },
  },

  // FINANCE: Financial focus with limited project access
  finance: {
    project:         { view: true, create: false, update: false, delete: false, comment: true },
    task:            { view: true, create: false, update: false, delete: false, assign: false },
    document:        { view: true, create: false, update: false, delete: false, upload: false, download: true },
    comment:         { view: true, create: true, update: true, delete: false },
    channel_message: { view: true, create: true, update: true, delete: false },
    deliverable:     { view: true, create: false, update: false, delete: false, upload: false, download: true },
    invoice:         { view: true, create: true, update: true, delete: true },
    contract:        { view: true, create: true, update: true, delete: false },
    account:         { view: true, create: false, update: false, delete: false },
    vendor:          { view: true, create: false, update: false, delete: false },
    deal:            { view: true, create: false, update: false, delete: false },
    quote:           { view: true, create: false, update: false, delete: false },
  },

  // CLIENT_ADMIN: Can manage their projects and team
  client_admin: {
    project:         { view: true, create: false, update: false, delete: false, comment: true },
    task:            { view: true, create: true, update: true, delete: true, assign: false },
    document:        { view: true, create: true, update: true, delete: true, upload: true, download: true },
    comment:         { view: true, create: true, update: true, delete: true },
    channel_message: { view: true, create: true, update: true, delete: true },
    deliverable:     { view: true, create: false, update: false, delete: false, upload: false, download: true },
    invoice:         { view: true, create: false, update: false, delete: false },
    contract:        { view: true, create: false, update: false, delete: false },
    account:         { view: true, create: false, update: false, delete: false },
    vendor:          { view: false, create: false, update: false, delete: false },
    deal:            { view: false, create: false, update: false, delete: false },
    quote:           { view: true, create: false, update: false, delete: false },
  },

  // CLIENT_MEMBER: Limited to viewing and commenting
  client_member: {
    project:         { view: true, create: false, update: false, delete: false, comment: true },
    task:            { view: true, create: false, update: false, delete: false, assign: false },
    document:        { view: true, create: false, update: false, delete: false, upload: false, download: true },
    comment:         { view: true, create: true, update: false, delete: false },
    channel_message: { view: true, create: true, update: false, delete: false },
    deliverable:     { view: true, create: false, update: false, delete: false, upload: false, download: true },
    invoice:         { view: true, create: false, update: false, delete: false },
    contract:        { view: true, create: false, update: false, delete: false },
    account:         { view: true, create: false, update: false, delete: false },
    vendor:          { view: false, create: false, update: false, delete: false },
    deal:            { view: false, create: false, update: false, delete: false },
    quote:           { view: true, create: false, update: false, delete: false },
  },

  // VENDOR: Can manage tasks, upload deliverables, create invoices
  vendor: {
    project:         { view: true, create: false, update: false, delete: false, comment: true },
    task:            { view: true, create: false, update: true, delete: false, assign: false }, // Can update task status
    document:        { view: true, create: false, update: false, delete: false, upload: false, download: true },
    comment:         { view: true, create: true, update: true, delete: true },
    channel_message: { view: true, create: true, update: true, delete: true },
    deliverable:     { view: true, create: true, update: true, delete: false, upload: true, download: true }, // Can upload deliverables
    invoice:         { view: true, create: true, update: true, delete: false }, // Can create invoices
    contract:        { view: true, create: false, update: false, delete: false },
    account:         { view: false, create: false, update: false, delete: false },
    vendor:          { view: false, create: false, update: false, delete: false },
    deal:            { view: false, create: false, update: false, delete: false },
    quote:           { view: false, create: false, update: false, delete: false },
  },
};

/**
 * Check if a role has permission to perform an action on a resource
 */
export function hasPermission(role: UserRole, resource: ResourceType, action: Action): boolean {
  return PERMISSIONS_MATRIX[role]?.[resource]?.[action] || false;
}

/**
 * Middleware to require a specific permission
 * Usage: app.post("/api/tasks", requireAuth, requirePermission('task', 'create'), handler)
 */
export function requirePermission(resource: ResourceType, action: Action) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const role = req.session.role as UserRole;

    if (!hasPermission(role, resource, action)) {
      return res.status(403).json({
        error: "Permission refusée",
        message: `Vous n'avez pas la permission de ${action} sur ${resource}`,
        required: { resource, action },
        userRole: role,
      });
    }

    next();
  };
}

/**
 * Helper function to get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Partial<Record<ResourceType, Partial<Record<Action, boolean>>>> {
  return PERMISSIONS_MATRIX[role] || {};
}

/**
 * Check if a role can perform ANY action on a resource
 */
export function canAccessResource(role: UserRole, resource: ResourceType): boolean {
  const permissions = PERMISSIONS_MATRIX[role]?.[resource];
  if (!permissions) return false;
  return Object.values(permissions).some(allowed => allowed === true);
}
