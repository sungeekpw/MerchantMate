import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes } from "./authRoutes";
import { insertMerchantSchema, insertAgentSchema, insertTransactionSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, requireRole, requirePermission } from "./replitAuth";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import cookieParser from "cookie-parser";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());

  // Session setup for authentication
  const SessionStore = MemoryStore(session);
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'corecrm-session-secret-key',
    store: new SessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    },
    name: 'corecrm-session'
  }));

  // Setup authentication routes
  setupAuthRoutes(app);

  // Development auth route for testing
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/auth/dev-login', async (req, res) => {
      const { userId } = req.body;
      try {
        const user = await storage.getUser(userId);
        if (user) {
          // Use simple token approach for development
          const token = Buffer.from(userId).toString('base64');
          res.cookie('dev-auth-token', token, {
            httpOnly: false,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
          });

          res.json({ success: true, user, token });
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ message: "Login failed" });
      }
    });

    app.get('/api/auth/user', async (req: any, res) => {
      try {
        // Check for dev token in cookies
        const token = req.cookies['dev-auth-token'];
        
        if (!token) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        
        const userId = Buffer.from(token, 'base64').toString();
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });

    app.post('/api/auth/logout', (req, res) => {
      res.clearCookie('dev-auth-token');
      res.json({ success: true });
    });
  } else {
    // Production auth setup
    await setupAuth(app);

    app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });
  }

  // Development authentication middleware
  const devAuth = async (req: any, res: any, next: any) => {
    if (process.env.NODE_ENV === 'development') {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      req.user = { claims: { sub: userId } };
      req.dbUser = user;
      return next();
    }
    return isAuthenticated(req, res, next);
  };

  const devRequireRole = (allowedRoles: string[]) => async (req: any, res: any, next: any) => {
    if (process.env.NODE_ENV === 'development') {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      req.user = { claims: { sub: userId } };
      req.dbUser = user;
      return next();
    }
    return requireRole(allowedRoles)(req, res, next);
  };

  // User management routes (admin and super admin only)
  app.get("/api/users", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", devRequireRole(['super_admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['merchant', 'agent', 'admin', 'corporate', 'super_admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/users/:id/status", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['active', 'suspended', 'inactive'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const user = await storage.updateUserStatus(id, status);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Merchant routes with role-based access
  app.get("/api/merchants", devAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { search } = req.query;

      // Use role-based filtering from storage layer
      const merchants = await storage.getMerchantsForUser(userId);

      if (search) {
        const filteredMerchants = merchants.filter(merchant =>
          merchant.businessName.toLowerCase().includes(search.toLowerCase()) ||
          merchant.email.toLowerCase().includes(search.toLowerCase())
        );
        res.json(filteredMerchants);
      } else {
        res.json(merchants);
      }
    } catch (error) {
      console.error("Error fetching merchants:", error);
      res.status(500).json({ message: "Failed to fetch merchants" });
    }
  });

  // Transaction routes with role-based access
  app.get("/api/transactions", devAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { search } = req.query;

      // Use role-based filtering from storage layer
      const transactions = await storage.getTransactionsForUser(userId);

      if (search) {
        const filteredTransactions = transactions.filter(transaction =>
          transaction.transactionId.toLowerCase().includes(search.toLowerCase()) ||
          transaction.merchant?.businessName?.toLowerCase().includes(search.toLowerCase())
        );
        res.json(filteredTransactions);
      } else {
        res.json(transactions);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Agent-merchant assignment routes (admin only)
  app.post("/api/agents/:agentId/merchants/:merchantId", devRequireRole(['admin', 'corporate', 'super_admin']), async (req: any, res) => {
    try {
      const { agentId, merchantId } = req.params;
      const userId = req.user.claims.sub;

      const assignment = await storage.assignAgentToMerchant(
        parseInt(agentId),
        parseInt(merchantId),
        userId
      );

      res.json(assignment);
    } catch (error) {
      console.error("Error assigning agent to merchant:", error);
      res.status(500).json({ message: "Failed to assign agent to merchant" });
    }
  });

  app.delete("/api/agents/:agentId/merchants/:merchantId", devRequireRole(['admin', 'corporate', 'super_admin']), async (req: any, res) => {
    try {
      const { agentId, merchantId } = req.params;

      const success = await storage.unassignAgentFromMerchant(
        parseInt(agentId),
        parseInt(merchantId)
      );

      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Assignment not found" });
      }
    } catch (error) {
      console.error("Error unassigning agent from merchant:", error);
      res.status(500).json({ message: "Failed to unassign agent from merchant" });
    }
  });

  // Get merchants assigned to an agent
  app.get("/api/agents/:agentId/merchants", devAuth, async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);

      // Only allow access if user is admin or is the agent themselves
      if (!['admin', 'corporate', 'super_admin'].includes(currentUser?.role || '')) {
        const agent = await storage.getAgentByEmail(currentUser?.email || '');
        if (!agent || agent.id !== parseInt(agentId)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const merchants = await storage.getAgentMerchants(parseInt(agentId));
      res.json(merchants);
    } catch (error) {
      console.error("Error fetching agent merchants:", error);
      res.status(500).json({ message: "Failed to fetch agent merchants" });
    }
  });

  // Get agents assigned to a merchant
  app.get("/api/merchants/:merchantId/agents", devAuth, async (req: any, res) => {
    try {
      const { merchantId } = req.params;
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);

      // Only allow access if user is admin or is the merchant themselves
      if (!['admin', 'corporate', 'super_admin'].includes(currentUser?.role || '')) {
        const merchant = await storage.getMerchantByEmail(currentUser?.email || '');
        if (!merchant || merchant.id !== parseInt(merchantId)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const agents = await storage.getMerchantAgents(parseInt(merchantId));
      res.json(agents);
    } catch (error) {
      console.error("Error fetching merchant agents:", error);
      res.status(500).json({ message: "Failed to fetch merchant agents" });
    }
  });

  // Keep existing merchant routes for admin access
  app.get("/api/merchants/all", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const { search } = req.query;
      
      if (search) {
        const merchants = await storage.searchMerchants(search as string);
        res.json(merchants);
      } else {
        const merchants = await storage.getAllMerchants();
        res.json(merchants);
      }
    } catch (error) {
      console.error("Error fetching all merchants:", error);
      res.status(500).json({ message: "Failed to fetch all merchants" });
    }
  });

  // Update merchant creation to be admin-only
  app.post("/api/merchants", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const result = insertMerchantSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid merchant data", errors: result.error.errors });
      }

      const merchant = await storage.createMerchant(result.data);
      res.status(201).json(merchant);
    } catch (error) {
      console.error("Error creating merchant:", error);
      res.status(500).json({ message: "Failed to create merchant" });
    }
  });

  // Update remaining merchant routes to be admin-only for modifications
  app.patch("/api/merchants/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      const updates = req.body;

      const merchant = await storage.updateMerchant(merchantId, updates);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant not found" });
      }

      res.json(merchant);
    } catch (error) {
      console.error("Error updating merchant:", error);
      res.status(500).json({ message: "Failed to update merchant" });
    }
  });

  app.delete("/api/merchants/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      const success = await storage.deleteMerchant(merchantId);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Merchant not found" });
      }
    } catch (error) {
      console.error("Error deleting merchant:", error);
      res.status(500).json({ message: "Failed to delete merchant" });
    }
  });

  // Agent routes - continue with original implementation
  app.get("/api/agents", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const { search } = req.query;
      
      if (search) {
        const agents = await storage.searchAgents(search as string);
        res.json(agents);
      } else {
        const agents = await storage.getAllAgents();
        res.json(agents);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.post("/api/agents", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const result = insertAgentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid agent data", errors: result.error.errors });
      }

      const agent = await storage.createAgent(result.data);
      res.status(201).json(agent);
    } catch (error) {
      console.error("Error creating agent:", error);
      res.status(500).json({ message: "Failed to create agent" });
    }
  });

  app.get("/api/agents/:id", devAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agent = await storage.getAgent(id);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json(agent);
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.patch("/api/agents/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const agent = await storage.updateAgent(id, updates);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json(agent);
    } catch (error) {
      console.error("Error updating agent:", error);
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  app.delete("/api/agents/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAgent(id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Agent not found" });
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });

  // Transaction routes (admin only for all operations)
  app.get("/api/transactions/all", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const { search } = req.query;
      
      if (search) {
        const transactions = await storage.searchTransactions(search as string);
        res.json(transactions);
      } else {
        const transactions = await storage.getAllTransactions();
        res.json(transactions);
      }
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      res.status(500).json({ message: "Failed to fetch all transactions" });
    }
  });

  app.post("/api/transactions", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const result = insertTransactionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid transaction data", errors: result.error.errors });
      }

      const transaction = await storage.createTransaction(result.data);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.get("/api/transactions/:id", devAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  app.patch("/api/transactions/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const transaction = await storage.updateTransaction(id, updates);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      res.json(transaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/dashboard", devAuth, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/analytics/top-merchants", devAuth, async (req, res) => {
    try {
      const topMerchants = await storage.getTopMerchants();
      res.json(topMerchants);
    } catch (error) {
      console.error("Error fetching top merchants:", error);
      res.status(500).json({ message: "Failed to fetch top merchants" });
    }
  });

  app.get("/api/analytics/recent-transactions", devAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const recentTransactions = await storage.getRecentTransactions(limit);
      res.json(recentTransactions);
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      res.status(500).json({ message: "Failed to fetch recent transactions" });
    }
  });

  // Widget preferences routes
  app.get("/api/user/widgets", devAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserWidgetPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching widget preferences:", error);
      res.status(500).json({ message: "Failed to fetch widget preferences" });
    }
  });

  app.post("/api/user/widgets", devAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const widgetData = { ...req.body, userId };
      
      const preference = await storage.createWidgetPreference(widgetData);
      res.status(201).json(preference);
    } catch (error) {
      console.error("Error creating widget preference:", error);
      res.status(500).json({ message: "Failed to create widget preference" });
    }
  });

  app.patch("/api/user/widgets/:id", devAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const preference = await storage.updateWidgetPreference(id, updates);
      if (!preference) {
        return res.status(404).json({ message: "Widget preference not found" });
      }

      res.json(preference);
    } catch (error) {
      console.error("Error updating widget preference:", error);
      res.status(500).json({ message: "Failed to update widget preference" });
    }
  });

  app.delete("/api/user/widgets/:id", devAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWidgetPreference(id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Widget preference not found" });
      }
    } catch (error) {
      console.error("Error deleting widget preference:", error);
      res.status(500).json({ message: "Failed to delete widget preference" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
      
      res.json(merchant);
    } catch (error) {
      console.error("Error fetching merchant:", error);
      res.status(500).json({ message: "Failed to fetch merchant" });
    }
  });

  app.post("/api/merchants", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const validatedData = insertMerchantSchema.parse(req.body);
      
      // Check if email already exists
      const existingMerchant = await storage.getMerchantByEmail(validatedData.email);
      if (existingMerchant) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const merchant = await storage.createMerchant(validatedData);
      res.status(201).json(merchant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create merchant" });
    }
  });

  app.put("/api/merchants/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMerchantSchema.partial().parse(req.body);
      
      const merchant = await storage.updateMerchant(id, validatedData);
      
      if (!merchant) {
        return res.status(404).json({ message: "Merchant not found" });
      }
      
      res.json(merchant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update merchant" });
    }
  });

  app.delete("/api/merchants/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMerchant(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Merchant not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete merchant" });
    }
  });

  // Agent routes with role-based access
  app.get("/api/agents", devAuth, async (req: any, res) => {
    try {
      const currentUser = req.dbUser;
      const { search } = req.query;
      let agents: any[] = [];

      // Role-based data filtering
      if (currentUser.role === 'agent') {
        // Agents can only see their own data
        const agent = await storage.getAgentByEmail(currentUser.email);
        agents = agent ? [agent] : [];
      } else if (currentUser.role === 'merchant') {
        // Merchants cannot see agents
        agents = [];
      } else {
        // Admins, corporate, and super admins can see all agents
        if (search && typeof search === 'string') {
          agents = await storage.searchAgents(search);
        } else {
          agents = await storage.getAllAgents();
        }
      }

      // Apply search filter for role-based results
      if (search && typeof search === 'string' && (currentUser.role === 'agent' || currentUser.role === 'merchant')) {
        const searchLower = search.toLowerCase();
        agents = agents.filter(a => 
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchLower) ||
          a.email.toLowerCase().includes(searchLower) ||
          (a.territory && a.territory.toLowerCase().includes(searchLower))
        );
      }
      
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", devAuth, async (req: any, res) => {
    try {
      const currentUser = req.dbUser;
      const id = parseInt(req.params.id);
      const agent = await storage.getAgent(id);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Role-based access control
      if (currentUser.role === 'agent') {
        const userAgent = await storage.getAgentByEmail(currentUser.email);
        if (!userAgent || userAgent.id !== id) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (currentUser.role === 'merchant') {
        // Merchants cannot access agent details
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(agent);
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.post("/api/agents", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const validatedData = insertAgentSchema.parse(req.body);
      
      // Check if email already exists
      const existingAgent = await storage.getAgentByEmail(validatedData.email);
      if (existingAgent) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const agent = await storage.createAgent(validatedData);
      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create agent" });
    }
  });

  app.put("/api/agents/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAgentSchema.partial().parse(req.body);
      
      const agent = await storage.updateAgent(id, validatedData);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      res.json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  app.delete("/api/agents/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAgent(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });

  // Transaction routes with role-based access
  app.get("/api/transactions", devAuth, async (req: any, res) => {
    try {
      const currentUser = req.dbUser;
      const { search, merchantId } = req.query;
      let transactions: any[] = [];

      // Role-based data filtering
      if (currentUser.role === 'merchant') {
        // Merchants can only see their own transactions
        const merchant = await storage.getMerchantByEmail(currentUser.email);
        if (merchant) {
          transactions = await storage.getTransactionsByMerchant(merchant.id);
        }
      } else if (currentUser.role === 'agent') {
        // Agents can see transactions from their assigned merchants
        const agent = await storage.getAgentByEmail(currentUser.email);
        if (agent) {
          const allMerchants = await storage.getAllMerchants();
          const agentMerchants = allMerchants.filter(m => m.agentId === agent.id);
          const allTransactions = await storage.getAllTransactions();
          transactions = allTransactions.filter(t => 
            agentMerchants.some(m => m.id === t.merchantId)
          );
        }
      } else {
        // Admins, corporate, and super admins can see all transactions
        if (search && typeof search === 'string') {
          transactions = await storage.searchTransactions(search);
        } else if (merchantId && typeof merchantId === 'string') {
          transactions = await storage.getTransactionsByMerchant(parseInt(merchantId));
        } else {
          transactions = await storage.getAllTransactions();
        }
      }

      // Apply search filter for role-based results
      if (search && typeof search === 'string' && (currentUser.role === 'merchant' || currentUser.role === 'agent')) {
        const searchLower = search.toLowerCase();
        transactions = transactions.filter(t => 
          t.transactionId.toLowerCase().includes(searchLower) ||
          (t.merchant?.businessName && t.merchant.businessName.toLowerCase().includes(searchLower)) ||
          t.paymentMethod.toLowerCase().includes(searchLower)
        );
      }
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", devAuth, async (req: any, res) => {
    try {
      const currentUser = req.dbUser;
      const id = parseInt(req.params.id);
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Role-based access control
      if (currentUser.role === 'merchant') {
        const merchant = await storage.getMerchantByEmail(currentUser.email);
        if (!merchant || transaction.merchantId !== merchant.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (currentUser.role === 'agent') {
        const agent = await storage.getAgentByEmail(currentUser.email);
        if (agent) {
          const merchant = await storage.getMerchant(transaction.merchantId);
          if (!merchant || merchant.agentId !== agent.id) {
            return res.status(403).json({ message: "Access denied" });
          }
        } else {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  app.post("/api/transactions", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      
      // Check if transaction ID already exists
      const existingTransaction = await storage.getTransactionByTransactionId(validatedData.transactionId);
      if (existingTransaction) {
        return res.status(400).json({ message: "Transaction ID already exists" });
      }
      
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put("/api/transactions/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      
      const transaction = await storage.updateTransaction(id, validatedData);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  // Analytics routes with role-based access
  app.get("/api/analytics/dashboard", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/analytics/top-merchants", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const topMerchants = await storage.getTopMerchants();
      res.json(topMerchants);
    } catch (error) {
      console.error("Error fetching top merchants:", error);
      res.status(500).json({ message: "Failed to fetch top merchants" });
    }
  });

  app.get("/api/analytics/recent-transactions", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const recentTransactions = await storage.getRecentTransactions(limit);
      res.json(recentTransactions);
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      res.status(500).json({ message: "Failed to fetch recent transactions" });
    }
  });

  // Widget preferences endpoints
  app.get("/api/widgets/preferences", devAuth, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const preferences = await storage.getUserWidgetPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Failed to get widget preferences:", error);
      res.status(500).json({ message: "Failed to get widget preferences" });
    }
  });

  app.post("/api/widgets/preferences", devAuth, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const preference = await storage.createWidgetPreference({
        ...req.body,
        userId
      });
      res.json(preference);
    } catch (error) {
      console.error("Failed to create widget preference:", error);
      res.status(500).json({ message: "Failed to create widget preference" });
    }
  });

  app.patch("/api/widgets/preferences/:id", devAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const preference = await storage.updateWidgetPreference(id, req.body);
      
      if (!preference) {
        return res.status(404).json({ message: "Widget preference not found" });
      }
      
      res.json(preference);
    } catch (error) {
      console.error("Failed to update widget preference:", error);
      res.status(500).json({ message: "Failed to update widget preference" });
    }
  });

  app.delete("/api/widgets/preferences/:id", devAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWidgetPreference(id);
      
      if (!success) {
        return res.status(404).json({ message: "Widget preference not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete widget preference:", error);
      res.status(500).json({ message: "Failed to delete widget preference" });
    }
  });

  // Merchant profile endpoint for widgets
  app.get("/api/merchants/profile", devAuth, async (req: any, res) => {
    try {
      const user = req.dbUser;
      if (user.role !== 'merchant') {
        return res.status(403).json({ message: "Access denied" });
      }

      const merchant = await storage.getMerchantByEmail(user.email);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant profile not found" });
      }

      res.json(merchant);
    } catch (error) {
      console.error("Failed to get merchant profile:", error);
      res.status(500).json({ message: "Failed to get merchant profile" });
    }
  });

  // Dashboard metrics endpoint
  app.get("/api/analytics/dashboard-metrics", devAuth, async (req: any, res) => {
    try {
      const user = req.dbUser;
      
      if (user.role === 'merchant') {
        // For merchants, return limited metrics
        const merchant = await storage.getMerchantByEmail(user.email);
        if (!merchant) {
          return res.json({
            totalRevenue: "0",
            activeMerchants: 0,
            transactionsToday: 0,
            activeAgents: 0
          });
        }
        
        const transactions = await storage.getTransactionsByMerchant(merchant.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayTransactions = transactions.filter(t => 
          new Date(t.createdAt || '') >= today
        );
        
        const totalRevenue = transactions
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        res.json({
          totalRevenue: totalRevenue.toFixed(2),
          activeMerchants: 1,
          transactionsToday: todayTransactions.length,
          activeAgents: 0
        });
      } else {
        // For admins and agents, return full metrics
        const metrics = await storage.getDashboardMetrics();
        res.json(metrics);
      }
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Recent transactions endpoint for widgets
  app.get("/api/transactions/recent", devAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const user = req.dbUser;
      
      if (user.role === 'merchant') {
        const merchant = await storage.getMerchantByEmail(user.email);
        if (!merchant) {
          return res.json([]);
        }
        const transactions = await storage.getTransactionsByMerchant(merchant.id);
        res.json(transactions.slice(0, limit));
      } else {
        const transactions = await storage.getRecentTransactions(limit);
        res.json(transactions);
      }
    } catch (error) {
      console.error("Failed to get recent transactions:", error);
      res.status(500).json({ message: "Failed to get recent transactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
