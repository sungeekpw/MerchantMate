import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMerchantSchema, insertAgentSchema, insertTransactionSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, requireRole, requirePermission } from "./replitAuth";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";

export async function registerRoutes(app: Express): Promise<Server> {
  // Development session setup
  if (process.env.NODE_ENV === 'development') {
    const SessionStore = MemoryStore(session);
    
    app.use(session({
      secret: 'dev-session-secret',
      store: new SessionStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: true, // Changed to true for development
      cookie: {
        httpOnly: false, // Allow JavaScript access for development
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      },
      name: 'corecrm.session' // Custom session name
    }));
  }

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
          console.log("Dev token set for user:", userId);
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
        console.log("Auth check - cookies:", req.headers.cookie);
        
        // Check for dev token in cookies
        const token = req.cookies['dev-auth-token'];
        console.log("Dev token found:", token);
        
        if (!token) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        
        const userId = Buffer.from(token, 'base64').toString();
        console.log("Decoded userId:", userId);
        
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
      const currentUser = req.dbUser;
      const { search } = req.query;
      let merchants: any[] = [];

      // Role-based data filtering
      if (currentUser.role === 'merchant') {
        // Merchants can only see their own data
        const merchant = await storage.getMerchantByEmail(currentUser.email);
        merchants = merchant ? [{ ...merchant, agent: undefined }] : [];
      } else if (currentUser.role === 'agent') {
        // Agents can only see merchants assigned to them
        const agent = await storage.getAgentByEmail(currentUser.email);
        if (agent) {
          const allMerchants = await storage.getAllMerchants();
          merchants = allMerchants.filter(m => m.agentId === agent.id);
        } else {
          merchants = [];
        }
      } else {
        // Admins, corporate, and super admins can see all merchants
        if (search && typeof search === 'string') {
          merchants = await storage.searchMerchants(search);
        } else {
          merchants = await storage.getAllMerchants();
        }
      }

      // Apply search filter if needed for role-based results
      if (search && typeof search === 'string' && (currentUser.role === 'merchant' || currentUser.role === 'agent')) {
        const searchLower = search.toLowerCase();
        merchants = merchants.filter(m => 
          m.businessName.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower) ||
          m.businessType.toLowerCase().includes(searchLower)
        );
      }
      
      res.json(merchants);
    } catch (error) {
      console.error("Error fetching merchants:", error);
      res.status(500).json({ message: "Failed to fetch merchants" });
    }
  });

  app.get("/api/merchants/:id", devAuth, async (req: any, res) => {
    try {
      const currentUser = req.dbUser;
      const id = parseInt(req.params.id);
      const merchant = await storage.getMerchant(id);
      
      if (!merchant) {
        return res.status(404).json({ message: "Merchant not found" });
      }

      // Role-based access control
      if (currentUser.role === 'merchant') {
        const userMerchant = await storage.getMerchantByEmail(currentUser.email);
        if (!userMerchant || userMerchant.id !== id) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (currentUser.role === 'agent') {
        const agent = await storage.getAgentByEmail(currentUser.email);
        if (!agent || merchant.agentId !== agent.id) {
          return res.status(403).json({ message: "Access denied" });
        }
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
        // Merchants can see their assigned agent
        const merchant = await storage.getMerchantByEmail(currentUser.email);
        if (merchant && merchant.agentId) {
          const agent = await storage.getAgent(merchant.agentId);
          agents = agent ? [agent] : [];
        }
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
        const merchant = await storage.getMerchantByEmail(currentUser.email);
        if (!merchant || merchant.agentId !== id) {
          return res.status(403).json({ message: "Access denied" });
        }
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

  const httpServer = createServer(app);
  return httpServer;
}
