import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage, db } from "./storage";
import { createHash, randomBytes } from "crypto";
import { eq, and, sql } from "drizzle-orm";
import { users, contacts, memberships, invitations } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: string;
    email: string;
    role: string;
    space: string;
    accountId?: string | null;
    vendorContactId?: string | null;
    orgId: string;
  }
}

const DEFAULT_ORG_ID = "default-org";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// In-memory token store for auth tokens (alternative to cookies)
const authTokens = new Map<string, {
  userId: string;
  email: string;
  role: string;
  space: string;
  accountId: string | null;
  vendorContactId: string | null;
  orgId: string;
  expiresAt: Date;
}>();

function generateAuthToken(): string {
  return randomBytes(32).toString("hex");
}

function cleanExpiredTokens() {
  const now = new Date();
  const tokensToDelete: string[] = [];
  authTokens.forEach((data, token) => {
    if (data.expiresAt < now) {
      tokensToDelete.push(token);
    }
  });
  tokensToDelete.forEach(token => authTokens.delete(token));
}

// Clean expired tokens every hour
setInterval(cleanExpiredTokens, 60 * 60 * 1000);

export function setupPasswordAuth(app: Express) {
  const PgStore = pgSession(session);
  
  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "ia-infinity-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: "lax",
        ...(process.env.NODE_ENV === "production" ? { domain: ".ia-infinity.app" } : {}),
      },
    })
  );
}

export function registerPasswordAuthRoutes(app: Express) {
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const acceptInviteSchema = z.object({
    token: z.string(),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    name: z.string().optional(),
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const normalizedEmail = email.toLowerCase();
      
      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      if (!user.password) {
        return res.status(401).json({ error: "Compte non activé. Utilisez votre lien d'invitation." });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      // Get ALL memberships for this user
      const allMemberships = await storage.getMembershipsByUser(user.id, DEFAULT_ORG_ID);
      if (!allMemberships || allMemberships.length === 0) {
        return res.status(403).json({ error: "Aucun accès à cette organisation" });
      }

      // Filter out vendor memberships whose vendorContactId points to a deleted vendor
      const validMemberships: typeof allMemberships = [];
      for (const m of allMemberships) {
        if (m.role === 'vendor' && m.vendorContactId) {
          const contact = await storage.getContact(m.vendorContactId, DEFAULT_ORG_ID);
          if (!contact) {
            // Contact no longer exists - skip this membership
            continue;
          }
          if (contact.vendorId) {
            const vendor = await storage.getVendor(contact.vendorId, DEFAULT_ORG_ID);
            if (!vendor) {
              // Vendor no longer exists - skip this membership
              continue;
            }
          }
        }
        validMemberships.push(m);
      }

      const memberships = validMemberships;
      if (memberships.length === 0) {
        return res.status(403).json({ error: "Aucun accès actif à cette organisation" });
      }

      // If multiple memberships, return them for user to choose
      if (memberships.length > 1) {
        return res.json({
          requiresSpaceSelection: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
          },
          availableSpaces: memberships.map(m => ({
            membershipId: m.id,
            role: m.role,
            space: m.space,
            accountId: m.accountId,
            vendorContactId: m.vendorContactId,
          })),
        });
      }

      // Single membership - log in directly
      const membership = memberships[0];

      // Generate auth token for API access
      const authToken = generateAuthToken();
      authTokens.set(authToken, {
        userId: user.id,
        email: user.email,
        role: membership.role,
        space: membership.space,
        accountId: membership.accountId,
        vendorContactId: membership.vendorContactId,
        orgId: DEFAULT_ORG_ID,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          // Continue anyway with token auth
        }

        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.role = membership.role;
        req.session.space = membership.space;
        req.session.accountId = membership.accountId;
        req.session.vendorContactId = membership.vendorContactId;
        req.session.orgId = DEFAULT_ORG_ID;

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            // Continue anyway with token auth
          }

          res.json({
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
            },
            role: membership.role,
            space: membership.space,
            accountId: membership.accountId,
            vendorContactId: membership.vendorContactId,
            authToken, // Include token for fallback auth
          });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Erreur de connexion" });
    }
  });

  app.post("/api/auth/select-space", async (req: Request, res: Response) => {
    try {
      const { membershipId, userId } = req.body;

      if (!membershipId || !userId) {
        return res.status(400).json({ error: "membershipId and userId required" });
      }

      // Get the specific membership
      const memberships = await storage.getMembershipsByUser(userId, DEFAULT_ORG_ID);
      const membership = memberships.find(m => m.id === membershipId);

      if (!membership) {
        return res.status(404).json({ error: "Membership not found" });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate auth token
      const authToken = generateAuthToken();
      authTokens.set(authToken, {
        userId: user.id,
        email: user.email,
        role: membership.role,
        space: membership.space,
        accountId: membership.accountId,
        vendorContactId: membership.vendorContactId,
        orgId: DEFAULT_ORG_ID,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Erreur de session" });
        }

        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.role = membership.role;
        req.session.space = membership.space;
        req.session.accountId = membership.accountId;
        req.session.vendorContactId = membership.vendorContactId;
        req.session.orgId = DEFAULT_ORG_ID;

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ error: "Erreur de session" });
          }

          res.json({
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
            },
            role: membership.role,
            space: membership.space,
            accountId: membership.accountId,
            vendorContactId: membership.vendorContactId,
            authToken,
          });
        });
      });
    } catch (error) {
      console.error("Select space error:", error);
      res.status(500).json({ error: "Erreur lors de la sélection de l'espace" });
    }
  });

  app.post("/api/auth/switch-space", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { membershipId } = req.body;

      if (!membershipId) {
        return res.status(400).json({ error: "membershipId required" });
      }

      // Get all memberships for this user
      const memberships = await storage.getMembershipsByUser(userId, DEFAULT_ORG_ID);
      const membership = memberships.find(m => m.id === membershipId);

      if (!membership) {
        return res.status(404).json({ error: "Membership not found" });
      }

      // Update session
      req.session.role = membership.role;
      req.session.space = membership.space;
      req.session.accountId = membership.accountId;
      req.session.vendorContactId = membership.vendorContactId;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.status(500).json({ error: "Erreur de session" });
        }

        res.json({
          success: true,
          role: membership.role,
          space: membership.space,
          accountId: membership.accountId,
          vendorContactId: membership.vendorContactId,
        });
      });
    } catch (error) {
      console.error("Switch space error:", error);
      res.status(500).json({ error: "Erreur lors du changement d'espace" });
    }
  });

  app.get("/api/auth/available-spaces", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const memberships = await storage.getMembershipsByUser(userId, DEFAULT_ORG_ID);

      res.json({
        currentSpace: req.session.space,
        currentRole: req.session.role,
        availableSpaces: memberships.map(m => ({
          membershipId: m.id,
          role: m.role,
          space: m.space,
          accountId: m.accountId,
          vendorContactId: m.vendorContactId,
          isCurrent: m.role === req.session.role && m.space === req.session.space,
        })),
      });
    } catch (error) {
      console.error("Get available spaces error:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des espaces" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Erreur de déconnexion" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/session", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.json({ authenticated: false });
    }

    // Fetch full user data from database
    const user = await storage.getUser(req.session.userId);

    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        email: req.session.email,
        name: user?.name || null,
        avatar: user?.avatar || null,
      },
      role: req.session.role,
      space: req.session.space,
      accountId: req.session.accountId,
      vendorContactId: req.session.vendorContactId,
    });
  });

  app.get("/api/auth/invitation/:token", async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const tokenHash = hashToken(token);
      
      const invitation = await storage.getInvitationByToken(tokenHash);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation invalide ou expirée" });
      }
      
      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Cette invitation a déjà été utilisée" });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Cette invitation a expiré" });
      }
      
      res.json({
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        space: invitation.space,
      });
    } catch (error) {
      console.error("Get invitation error:", error);
      res.status(500).json({ error: "Erreur lors de la récupération de l'invitation" });
    }
  });

  app.post("/api/auth/accept-invitation", async (req: Request, res: Response) => {
    try {
      const { token, password, name } = acceptInviteSchema.parse(req.body);
      const tokenHash = hashToken(token);

      const invitation = await storage.getInvitationByToken(tokenHash);

      if (!invitation) {
        return res.status(404).json({ error: "Invitation invalide ou expirée" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Cette invitation a déjà été utilisée" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ error: "Cette invitation a expiré" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // ATOMIC TRANSACTION: Ensures User + Contact + Membership are created together or rolled back
      const result = await db.transaction(async (tx) => {
        // 1. Create or update User
        let user = await tx.query.users.findFirst({
          where: (users, { sql }) => sql`LOWER(${users.email}) = ${invitation.email.toLowerCase()}`
        });

        if (user) {
          [user] = await tx.update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, user.id))
            .returning();
        } else {
          [user] = await tx.insert(users)
            .values({
              email: invitation.email.toLowerCase(),
              name: name || invitation.name || invitation.email.split("@")[0],
              password: hashedPassword,
            })
            .returning();
        }

        // 2. For vendor invitations: create Contact BEFORE Membership
        let vendorContactId: string | null = null;
        if (invitation.role === 'vendor' && invitation.vendorId) {
          const existingContact = await tx.query.contacts.findFirst({
            where: (contacts, { and, eq, sql }) => and(
              sql`LOWER(${contacts.email}) = ${user.email.toLowerCase()}`,
              eq(contacts.vendorId, invitation.vendorId!)
            )
          });

          if (existingContact) {
            vendorContactId = existingContact.id;
            console.log(`Using existing vendor contact: ${vendorContactId}`);
          } else {
            const [newContact] = await tx.insert(contacts)
              .values({
                orgId: invitation.orgId,
                vendorId: invitation.vendorId,
                accountId: null,
                authUserId: user.id,
                name: user.name,
                email: user.email,
                contactType: 'vendor',
              })
              .returning();

            vendorContactId = newContact.id;
            console.log(`Created vendor contact: ${vendorContactId}`);
          }
        }

        // 3. Create Membership with guaranteed vendorContactId for vendors
        const [membership] = await tx.insert(memberships)
          .values({
            userId: user.id,
            orgId: invitation.orgId,
            role: invitation.role,
            space: invitation.space,
            accountId: invitation.accountId,
            vendorContactId: vendorContactId, // Guaranteed non-null for vendors
          })
          .returning();

        console.log(`Created membership: role=${invitation.role}, space=${invitation.space}, vendorContactId=${vendorContactId}`);

        // 4. Mark invitation as accepted within the same transaction
        await tx.update(invitations)
          .set({ status: "accepted", usedAt: new Date() })
          .where(eq(invitations.id, invitation.id));

        return { user, membership };
      });

      // 5. Regenerate session after successful transaction
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) return reject(err);

          req.session.userId = result.user.id;
          req.session.email = result.user.email;
          req.session.role = result.membership.role;
          req.session.space = result.membership.space;
          req.session.accountId = result.membership.accountId;
          req.session.vendorContactId = result.membership.vendorContactId;
          req.session.orgId = result.membership.orgId;

          req.session.save((err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      });

      res.json({
        user: result.user,
        membership: result.membership,
        redirectUrl: `/${result.membership.space}`
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Accept invitation error:", error);
      res.status(500).json({ error: "Erreur lors de l'acceptation de l'invitation" });
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check session first
  if (req.session.userId) {
    return next();
  }
  
  // Fallback to token auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const tokenData = authTokens.get(token);
    
    if (tokenData && tokenData.expiresAt > new Date()) {
      // Populate session from token
      req.session.userId = tokenData.userId;
      req.session.email = tokenData.email;
      req.session.role = tokenData.role;
      req.session.space = tokenData.space;
      req.session.accountId = tokenData.accountId;
      req.session.vendorContactId = tokenData.vendorContactId;
      req.session.orgId = tokenData.orgId;
      return next();
    }
  }
  
  return res.status(401).json({ error: "Non authentifié" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  
  const restrictedRoles = ["client_admin", "client_member", "vendor"];
  if (restrictedRoles.includes(req.session.role || "")) {
    return res.status(403).json({ error: "Accès refusé: privilèges administrateur requis" });
  }
  
  next();
}

export function requireClient(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  
  const clientRoles = ["client_admin", "client_member"];
  if (!clientRoles.includes(req.session.role || "")) {
    return res.status(403).json({ error: "Accès refusé: espace client uniquement" });
  }
  
  next();
}

export function requireVendor(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  
  if (req.session.role !== "vendor") {
    return res.status(403).json({ error: "Accès refusé: espace prestataire uniquement" });
  }
  
  next();
}

export async function requireClientAccountAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  
  const restrictedRoles = ["client_admin", "client_member"];
  if (!restrictedRoles.includes(req.session.role || "")) {
    return next();
  }
  
  const targetAccountId = req.params.accountId || req.query.accountId || req.body?.accountId;
  
  if (targetAccountId && targetAccountId !== req.session.accountId) {
    return res.status(403).json({ error: "Accès refusé: vous ne pouvez accéder qu'à votre propre dossier" });
  }
  
  next();
}

export async function requireVendorProjectAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  if (req.session.role !== "vendor") {
    return next();
  }

  const projectId = req.params.projectId || req.params.id;
  if (!projectId) {
    return next();
  }

  const orgId = req.session.orgId || DEFAULT_ORG_ID;
  const vendorContactId = req.session.vendorContactId;

  if (!vendorContactId) {
    return res.status(403).json({ error: "Accès refusé: profil prestataire non lié" });
  }

  const project = await storage.getProject(projectId, orgId);
  if (!project) {
    return res.status(404).json({ error: "Projet non trouvé" });
  }

  // Get vendor contact to check vendorId
  const contact = await storage.getContact(vendorContactId, orgId);
  if (!contact) {
    return res.status(403).json({ error: "Accès refusé: contact vendor non trouvé" });
  }

  // STRICT ISOLATION: Check if vendor contact is assigned to this project
  // Priority 1: Specific vendorContactId assignment
  if (project.vendorContactId === vendorContactId) {
    return next();
  }

  // Priority 2: If project has no specific vendorContactId, check vendorId (company level)
  if (!project.vendorContactId && project.vendorId && project.vendorId === contact.vendorId) {
    return next();
  }

  // Priority 3: Check projectVendors junction table (new many-to-many system)
  if (contact.vendorId) {
    const isAssigned = await storage.isVendorAssignedToProject(contact.vendorId, projectId, orgId);
    if (isAssigned) {
      return next();
    }
  }

  return res.status(403).json({ error: "Accès refusé: vous n'êtes pas assigné à ce projet" });
}

export function requireClientAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  if (req.session.role !== "client_admin") {
    return res.status(403).json({
      error: "Accès refusé: privilèges administrateur client requis"
    });
  }

  next();
}

export function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  // Client members ne peuvent que lire
  if (req.session.role === "client_member") {
    return res.status(403).json({
      error: "Accès refusé: vous n'avez que des droits de lecture"
    });
  }

  next();
}

export async function requireChannelAccess(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const channelId = req.params.channelId;
    const orgId = req.session.orgId || DEFAULT_ORG_ID;
    const role = req.session.role;

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID requis" });
    }

    // Get the channel
    const channel = await storage.getChannel(channelId, orgId);
    if (!channel) {
      return res.status(404).json({ error: "Channel non trouvé" });
    }

    // Admin/internal users always have access
    if (['admin', 'sales', 'delivery', 'finance'].includes(role || '')) {
      return next();
    }

    // Client access
    if (role === 'client_admin' || role === 'client_member') {
      if (channel.type !== 'client') {
        return res.status(403).json({ error: "Accès refusé à ce canal" });
      }

      // For project-scoped channels, verify client has access to the project
      if (channel.scope === 'project' && channel.projectId) {
        const project = await storage.getProject(channel.projectId, orgId);
        if (!project?.accountId || project.accountId !== req.session.accountId) {
          return res.status(403).json({ error: "Accès refusé à ce projet" });
        }
      }

      return next();
    }

    // Vendor access
    if (role === 'vendor') {
      if (channel.type !== 'vendor') {
        return res.status(403).json({ error: "Accès refusé à ce canal" });
      }

      // For project-scoped channels, verify vendor has access to the project
      if (channel.scope === 'project' && channel.projectId) {
        const { validateVendorProjectAccess } = await import("./access-control");
        const hasAccess = await validateVendorProjectAccess(
          orgId,
          req.session.vendorContactId!,
          channel.projectId
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Accès refusé à ce projet" });
        }
      }

      return next();
    }

    res.status(403).json({ error: "Accès refusé" });
  } catch (error) {
    console.error("Channel access check error:", error);
    res.status(500).json({ error: "Erreur de vérification d'accès" });
  }
}

export function getSessionData(req: Request) {
  return {
    userId: req.session.userId,
    email: req.session.email,
    role: req.session.role,
    space: req.session.space,
    accountId: req.session.accountId,
    vendorContactId: req.session.vendorContactId,
    orgId: req.session.orgId || DEFAULT_ORG_ID,
  };
}

export function registerAdminInitRoute(app: Express) {
  const initAdminSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    name: z.string().optional(),
  });

  app.post("/api/auth/init-admin", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = initAdminSchema.parse(req.body);
      const normalizedEmail = email.toLowerCase();
      
      const existingAdmins = await storage.getUsers();
      const hasAdminWithPassword = existingAdmins.some(u => u.password !== null);
      
      if (hasAdminWithPassword) {
        return res.status(403).json({ error: "Un administrateur existe déjà. Utilisez la page de connexion." });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      let user = await storage.getUserByEmail(normalizedEmail);
      if (user) {
        await storage.updateUser(user.id, { 
          password: hashedPassword,
          name: name || user.name 
        });
      } else {
        user = await storage.createUser({
          email: normalizedEmail,
          name: name || normalizedEmail.split("@")[0],
          password: hashedPassword,
        });
      }
      
      let membership = await storage.getMembershipByUserAndOrg(user.id, DEFAULT_ORG_ID);
      if (!membership) {
        membership = await storage.createMembership({
          userId: user.id,
          orgId: DEFAULT_ORG_ID,
          role: "admin",
          space: "internal",
          accountId: null,
          vendorContactId: null,
        });
      }
      
      // Generate auth token for API access
      const authToken = generateAuthToken();
      authTokens.set(authToken, {
        userId: user.id,
        email: user.email,
        role: membership.role,
        space: membership.space,
        accountId: membership.accountId,
        vendorContactId: membership.vendorContactId,
        orgId: DEFAULT_ORG_ID,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
      
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          // Continue anyway with token auth
        }
        
        req.session.userId = user!.id;
        req.session.email = user!.email;
        req.session.role = membership!.role;
        req.session.space = membership!.space;
        req.session.accountId = membership!.accountId;
        req.session.vendorContactId = membership!.vendorContactId;
        req.session.orgId = DEFAULT_ORG_ID;
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            // Continue anyway with token auth
          }
          
          res.json({
            success: true,
            user: {
              id: user!.id,
              email: user!.email,
              name: user!.name,
            },
            role: membership!.role,
            authToken, // Include token for fallback auth
          });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Init admin error:", error);
      res.status(500).json({ error: "Erreur lors de l'initialisation de l'administrateur" });
    }
  });
  
  app.get("/api/auth/needs-init", async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      const hasAdminWithPassword = users.some(u => u.password !== null);
      res.json({ needsInit: !hasAdminWithPassword });
    } catch (error) {
      console.error("Check init error:", error);
      res.status(500).json({ error: "Erreur de vérification" });
    }
  });
}
