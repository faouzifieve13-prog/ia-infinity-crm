import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "./storage";
import { createHash, randomBytes } from "crypto";

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
      
      const membership = await storage.getMembershipByUserAndOrg(user.id, DEFAULT_ORG_ID);
      if (!membership) {
        return res.status(403).json({ error: "Aucun accès à cette organisation" });
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

  app.get("/api/auth/session", (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.json({ authenticated: false });
    }
    
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        email: req.session.email,
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
      
      if (new Date(invitation.expiresAt) < new Date()) {
        await storage.updateInvitation(invitation.id, invitation.orgId, { status: "expired" });
        return res.status(400).json({ error: "Cette invitation a expiré" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      let user = await storage.getUserByEmail(invitation.email.toLowerCase());
      if (user) {
        await storage.updateUser(user.id, { password: hashedPassword });
      } else {
        user = await storage.createUser({
          email: invitation.email.toLowerCase(),
          name: name || invitation.name || invitation.email.split("@")[0],
          password: hashedPassword,
        });
      }
      
      let membership = await storage.getMembershipByUserAndOrg(user.id, invitation.orgId);
      if (!membership) {
        membership = await storage.createMembership({
          userId: user.id,
          orgId: invitation.orgId,
          role: invitation.role,
          space: invitation.space,
          accountId: invitation.accountId,
          vendorContactId: invitation.vendorId,
        });
      }
      
      await storage.updateInvitation(invitation.id, invitation.orgId, {
        status: "accepted",
        usedAt: new Date(),
      });
      
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Erreur de session" });
        }
        
        req.session.userId = user!.id;
        req.session.email = user!.email;
        req.session.role = membership!.role;
        req.session.space = membership!.space;
        req.session.accountId = membership!.accountId;
        req.session.vendorContactId = membership!.vendorContactId;
        req.session.orgId = invitation.orgId;
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ error: "Erreur de session" });
          }
          
          res.json({
            success: true,
            user: {
              id: user!.id,
              email: user!.email,
              name: user!.name,
            },
            role: membership!.role,
            space: membership!.space,
          });
        });
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
  const project = await storage.getProject(projectId, orgId);
  if (!project) {
    return res.status(404).json({ error: "Projet non trouvé" });
  }
  
  const missions = await storage.getMissions(orgId, projectId);
  const vendorMission = missions.find(m => m.vendorId === req.session.vendorContactId);
  
  if (!vendorMission) {
    return res.status(403).json({ error: "Accès refusé: vous n'êtes pas assigné à ce projet" });
  }
  
  next();
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
