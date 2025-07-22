import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { v4 as uuidv4 } from "uuid";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // Use a default secret if not provided
  const sessionSecret = process.env.SESSION_SECRET || 'fallback-secret-key-for-development';
  
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for development
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      console.log("Auth verify callback triggered");
      const user = {};
      updateUserSession(user, tokens);
      const claims = tokens.claims();
      console.log("User claims:", claims);
      await upsertUser(claims);
      console.log("User upserted successfully");
      verified(null, user);
    } catch (error) {
      console.error("Error in auth verify:", error);
      verified(error, null);
    }
  };

  // Register strategy for each domain
  const domains = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(",") : [];
  
  // Add localhost for development
  if (process.env.NODE_ENV === 'development') {
    domains.push('localhost:5000');
  }

  for (const domain of domains) {
    const isLocalhost = domain.includes('localhost');
    const protocol = isLocalhost ? 'http' : 'https';
    
    const strategy = new Strategy(
      {
        name: `replitauth:${domain.split(':')[0]}`, // Use just the hostname part
        config,
        scope: "openid email profile offline_access",
        callbackURL: `${protocol}://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("Callback route hit");
    passport.authenticate(`replitauth:${req.hostname}`, {
      successRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Development mode: use session-based auth
  if (process.env.NODE_ENV === 'development') {
    console.log('DevAuth - Session:', req.session);
    console.log('DevAuth - Session ID:', req.sessionID);
    let userId = (req.session as any)?.userId;
    
    // Development fallback: auto-authenticate as super admin user if no session
    if (!userId) {
      console.log('DevAuth - No userId in session, using dev auth fallback');
      userId = 'admin-prod-001'; // Default super admin user for development
      (req.session as any).userId = userId;
      (req.session as any).sessionId = uuidv4();
    }
    
    console.log('DevAuth - UserId from session:', userId);
    
    try {
      console.log('DevAuth - Looking up user with ID:', userId);
      const dbUser = await storage.getUser(userId);
      console.log('DevAuth - Found user:', dbUser ? `${dbUser.username} (${dbUser.role})` : 'NULL');
      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Set up user object similar to production  
      req.user = { 
        id: userId,
        email: dbUser.email,
        claims: { sub: userId } 
      };
      (req as any).currentUser = dbUser;
      return next();
    } catch (error) {
      console.error("Error fetching user data:", error);
      return res.status(401).json({ message: "Authentication error" });
    }
  }

  // Production mode: use Passport authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  if (!user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Attach user data to request
    try {
      if (user.claims?.sub) {
        const dbUser = await storage.getUser(user.claims.sub);
        (req as any).currentUser = dbUser;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    
    // Attach user data to request after refresh
    if (user.claims?.sub) {
      const dbUser = await storage.getUser(user.claims.sub);
      (req as any).currentUser = dbUser;
    }
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Role-based access control middleware
export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return async (req, res, next) => {
    // Development mode: use session-based auth
    if (process.env.NODE_ENV === 'development') {
      let userId = (req.session as any)?.userId;
      
      // Development fallback: auto-authenticate as admin user if no session
      if (!userId) {
        userId = 'admin-demo-123'; // Default admin user for development
        (req.session as any).userId = userId;
        (req.session as any).sessionId = uuidv4();
      }
      
      try {
        const dbUser = await storage.getUser(userId);
        if (!dbUser) {
          return res.status(401).json({ message: "User not found" });
        }

        if (dbUser.status !== 'active') {
          return res.status(403).json({ message: "Account suspended" });
        }

        if (!allowedRoles.includes(dbUser.role)) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        // Attach user info to request for use in route handlers
        (req as any).currentUser = dbUser;
        req.user = { 
          id: userId,
          email: dbUser.email,
          claims: { sub: userId } 
        };
        return next();
      } catch (error) {
        console.error("Error checking user role:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }

    // Production mode: use Passport authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.user as any;
    if (!user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const dbUser = await storage.getUser(user.claims.sub);
      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (dbUser.status !== 'active') {
        return res.status(403).json({ message: "Account suspended" });
      }

      if (!allowedRoles.includes(dbUser.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Attach user info to request for use in route handlers
      (req as any).currentUser = dbUser;
      next();
    } catch (error) {
      console.error("Error checking user role:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Permission-based access control
export const requirePermission = (permission: string): RequestHandler => {
  return async (req, res, next) => {
    const user = req.user as any;
    
    if (!req.isAuthenticated() || !user.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const dbUser = await storage.getUser(user.claims.sub);
      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (dbUser.status !== 'active') {
        return res.status(403).json({ message: "Account suspended" });
      }

      const permissions = dbUser.permissions as Record<string, boolean> || {};
      
      // Super admin has all permissions
      if (dbUser.role === 'super_admin') {
        (req as any).currentUser = dbUser;
        return next();
      }

      if (!permissions[permission]) {
        return res.status(403).json({ message: `Permission '${permission}' required` });
      }

      (req as any).currentUser = dbUser;
      next();
    } catch (error) {
      console.error("Error checking user permission:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};