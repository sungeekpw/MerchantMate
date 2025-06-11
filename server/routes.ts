import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes } from "./authRoutes";
import { insertMerchantSchema, insertAgentSchema, insertTransactionSchema, insertLocationSchema, insertAddressSchema, insertPdfFormSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, requireRole, requirePermission } from "./replitAuth";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import multer from "multer";
import { pdfFormParser } from "./pdfParser";

// Helper function to get default widgets for a user role
function getDefaultWidgetsForRole(role: string) {
  const baseWidgets = [
    { id: "quick_stats", size: "medium", position: 0, configuration: {} },
    { id: "recent_activity", size: "large", position: 1, configuration: {} }
  ];

  switch (role) {
    case "super_admin":
    case "admin":
      return [
        ...baseWidgets,
        { id: "system_overview", size: "large", position: 2, configuration: {} },
        { id: "user_management", size: "medium", position: 3, configuration: {} },
        { id: "financial_summary", size: "medium", position: 4, configuration: {} }
      ];
    case "corporate":
      return [
        ...baseWidgets,
        { id: "revenue_overview", size: "large", position: 2, configuration: {} },
        { id: "performance_metrics", size: "medium", position: 3, configuration: {} }
      ];
    case "agent":
      return [
        ...baseWidgets,
        { id: "assigned_merchants", size: "medium", position: 2, configuration: {} },
        { id: "pipeline_overview", size: "medium", position: 3, configuration: {} }
      ];
    case "merchant":
      return [
        ...baseWidgets,
        { id: "revenue_overview", size: "large", position: 2, configuration: {} },
        { id: "location_performance", size: "medium", position: 3, configuration: {} }
      ];
    default:
      return baseWidgets;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Multer configuration for PDF uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  });

  // Session setup for authentication using PostgreSQL store
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 7 * 24 * 60 * 60, // 1 week in seconds
    tableName: "sessions",
  });
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'corecrm-session-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: 'lax'
    },
    name: 'connect.sid'
  }));

  // Location revenue metrics endpoint (placed early to avoid auth middleware)
  app.get("/api/locations/:locationId/revenue", async (req: any, res) => {
    try {
      const { locationId } = req.params;
      console.log('Revenue endpoint - fetching revenue for location:', locationId);
      const revenue = await storage.getLocationRevenue(parseInt(locationId));
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching location revenue:", error);
      res.status(500).json({ message: "Failed to fetch location revenue" });
    }
  });

  // Merchant MTD revenue endpoint (placed early to avoid auth middleware)
  app.get("/api/merchants/:merchantId/mtd-revenue", async (req: any, res) => {
    try {
      const { merchantId } = req.params;
      console.log('MTD Revenue endpoint - fetching MTD revenue for merchant:', merchantId);
      
      // Get all locations for this merchant
      const locations = await storage.getLocationsByMerchant(parseInt(merchantId));
      
      // Calculate total MTD revenue across all locations
      let totalMTD = 0;
      for (const location of locations) {
        const revenue = await storage.getLocationRevenue(location.id);
        totalMTD += parseFloat(revenue.monthToDate || '0');
      }
      
      res.json({ mtdRevenue: totalMTD.toFixed(2) });
    } catch (error) {
      console.error("Error fetching merchant MTD revenue:", error);
      res.status(500).json({ message: "Failed to fetch merchant MTD revenue" });
    }
  });

  // Dashboard API endpoints (placed early to avoid auth middleware for development)
  app.get("/api/dashboard/metrics", async (req: any, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/dashboard/revenue", async (req: any, res) => {
    try {
      const timeRange = req.query.timeRange as string || "30d";
      const revenue = await storage.getDashboardRevenue(timeRange);
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching dashboard revenue:", error);
      res.status(500).json({ message: "Failed to fetch dashboard revenue" });
    }
  });

  app.get("/api/dashboard/top-locations", async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const sortBy = req.query.sortBy as string || "revenue";
      const locations = await storage.getTopLocations(limit, sortBy);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching top locations:", error);
      res.status(500).json({ message: "Failed to fetch top locations" });
    }
  });

  app.get("/api/dashboard/recent-activity", async (req: any, res) => {
    try {
      const activities = await storage.getRecentActivity();
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  app.get("/api/dashboard/assigned-merchants", async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const merchants = await storage.getAssignedMerchants(limit);
      res.json(merchants);
    } catch (error) {
      console.error("Error fetching assigned merchants:", error);
      res.status(500).json({ message: "Failed to fetch assigned merchants" });
    }
  });

  app.get("/api/dashboard/system-overview", async (req: any, res) => {
    try {
      const systemData = await storage.getSystemOverview();
      res.json(systemData);
    } catch (error) {
      console.error("Error fetching system overview:", error);
      res.status(500).json({ message: "Failed to fetch system overview" });
    }
  });

  // Widget preference endpoints (before auth middleware for development)
  app.get("/api/user/:userId/widgets", async (req: any, res) => {
    try {
      const { userId } = req.params;
      const widgets = await storage.getUserWidgetPreferences(userId);
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching user widgets:", error);
      res.status(500).json({ message: "Failed to fetch user widgets" });
    }
  });

  app.post("/api/user/:userId/widgets", async (req: any, res) => {
    try {
      const { userId } = req.params;
      const widgetData = {
        ...req.body,
        userId
      };
      const widget = await storage.createWidgetPreference(widgetData);
      res.json(widget);
    } catch (error) {
      console.error("Error creating widget preference:", error);
      res.status(500).json({ message: "Failed to create widget preference" });
    }
  });

  app.put("/api/widgets/:widgetId", async (req: any, res) => {
    try {
      const { widgetId } = req.params;
      const widget = await storage.updateWidgetPreference(parseInt(widgetId), req.body);
      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }
      res.json(widget);
    } catch (error) {
      console.error("Error updating widget preference:", error);
      res.status(500).json({ message: "Failed to update widget preference" });
    }
  });

  app.delete("/api/widgets/:widgetId", async (req: any, res) => {
    try {
      const { widgetId } = req.params;
      const success = await storage.deleteWidgetPreference(parseInt(widgetId));
      if (!success) {
        return res.status(404).json({ message: "Widget not found" });
      }
      res.json({ message: "Widget deleted successfully" });
    } catch (error) {
      console.error("Error deleting widget preference:", error);
      res.status(500).json({ message: "Failed to delete widget preference" });
    }
  });

  // Users API endpoint - requires authentication
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      console.log('Users endpoint - Session ID:', req.sessionID);
      console.log('Users endpoint - User from session:', req.user);
      const users = await storage.getAllUsers();
      console.log('Users endpoint - Fetched users count:', users.length);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Setup authentication routes AFTER session middleware
  setupAuthRoutes(app);

  // Development login bypass for testing
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/auth/dev-login-bypass', async (req, res) => {
      try {
        const { userId } = req.body;
        const user = await storage.getUser(userId || 'admin-demo-123');
        if (user) {
          (req.session as any).userId = user.id;
          res.json({ success: true, user });
        } else {
          res.status(401).json({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error during dev login:", error);
        res.status(500).json({ message: "Login failed" });
      }
    });
  }

  // Use production auth setup for all environments
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

  // Development authentication middleware
  const devAuth = async (req: any, res: any, next: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('DevAuth - Session:', req.session);
      console.log('DevAuth - Session ID:', req.sessionID);
      const userId = (req.session as any)?.userId;
      console.log('DevAuth - UserId from session:', userId);
      if (!userId) {
        console.log('DevAuth - No userId in session, returning unauthorized');
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('DevAuth - User not found in database:', userId);
        return res.status(401).json({ message: "User not found" });
      }
      req.user = { claims: { sub: userId } };
      req.dbUser = user;
      console.log('DevAuth - Authentication successful for user:', userId);
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
        return res.status(403).json({ message: "Access denied" });
      }
      req.user = { claims: { sub: userId } };
      req.dbUser = user;
      return next();
    }
    return requireRole(allowedRoles)(req, res, next);
  };

  // User management routes (admin and super admin only)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get current user and check role
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !['admin', 'corporate', 'super_admin'].includes(currentUser.role)) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }
      
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

  // Location routes with role-based access
  app.get("/api/merchants/:merchantId/locations", devAuth, async (req: any, res) => {
    try {
      const { merchantId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // For merchant users, only allow access to their own merchant data
      if (user?.role === 'merchant') {
        // For now, we'll allow merchant users to access merchant ID 1
        // TODO: Implement proper merchant-user association
        if (parseInt(merchantId) !== 1) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const locations = await storage.getLocationsByMerchant(parseInt(merchantId));
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.post("/api/merchants/:merchantId/locations", devAuth, async (req: any, res) => {
    try {
      const { merchantId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // For merchant users, only allow access to their own merchant data
      if (user?.role === 'merchant') {
        if (parseInt(merchantId) !== 1) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const validatedData = insertLocationSchema.parse({
        ...req.body,
        merchantId: parseInt(merchantId)
      });
      
      const location = await storage.createLocation(validatedData);
      res.json(location);
    } catch (error) {
      console.error("Error creating location:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });



  app.put("/api/locations/:locationId", devAuth, async (req: any, res) => {
    try {
      const { locationId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get location to check merchant ownership
      const location = await storage.getLocation(parseInt(locationId));
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Check if user has access to this merchant
      if (user?.role === 'merchant' && location.merchantId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertLocationSchema.partial().parse(req.body);
      const updatedLocation = await storage.updateLocation(parseInt(locationId), validatedData);
      
      if (!updatedLocation) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json(updatedLocation);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.delete("/api/locations/:locationId", devAuth, async (req: any, res) => {
    try {
      const { locationId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get location to check merchant ownership
      const location = await storage.getLocation(parseInt(locationId));
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Check if user has access to this merchant
      if (user?.role === 'merchant' && location.merchantId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const success = await storage.deleteLocation(parseInt(locationId));
      if (!success) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Address routes with role-based access and geolocation support
  app.get("/api/locations/:locationId/addresses", devAuth, async (req: any, res) => {
    try {
      const { locationId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get location to check merchant ownership
      const location = await storage.getLocation(parseInt(locationId));
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Check if user has access to this merchant
      if (user?.role === 'merchant' && location.merchantId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const addresses = await storage.getAddressesByLocation(parseInt(locationId));
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      res.status(500).json({ message: "Failed to fetch addresses" });
    }
  });

  app.post("/api/locations/:locationId/addresses", devAuth, async (req: any, res) => {
    try {
      const { locationId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get location to check merchant ownership
      const location = await storage.getLocation(parseInt(locationId));
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Check if user has access to this merchant
      if (user?.role === 'merchant' && location.merchantId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertAddressSchema.parse({
        ...req.body,
        locationId: parseInt(locationId)
      });
      
      const address = await storage.createAddress(validatedData);
      res.json(address);
    } catch (error) {
      console.error("Error creating address:", error);
      res.status(500).json({ message: "Failed to create address" });
    }
  });

  app.put("/api/addresses/:addressId", devAuth, async (req: any, res) => {
    try {
      const { addressId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get address and location to check merchant ownership
      const address = await storage.getAddress(parseInt(addressId));
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      const location = await storage.getLocation(address.locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Check if user has access to this merchant
      if (user?.role === 'merchant' && location.merchantId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertAddressSchema.partial().parse(req.body);
      const updatedAddress = await storage.updateAddress(parseInt(addressId), validatedData);
      
      if (!updatedAddress) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      res.json(updatedAddress);
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(500).json({ message: "Failed to update address" });
    }
  });

  app.delete("/api/addresses/:addressId", devAuth, async (req: any, res) => {
    try {
      const { addressId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get address and location to check merchant ownership
      const address = await storage.getAddress(parseInt(addressId));
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      const location = await storage.getLocation(address.locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Check if user has access to this merchant
      if (user?.role === 'merchant' && location.merchantId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const success = await storage.deleteAddress(parseInt(addressId));
      if (!success) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(500).json({ message: "Failed to delete address" });
    }
  });

  // Transaction routes with role-based access
  app.get("/api/transactions", devAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { search } = req.query;

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // For agents, only show transactions for their assigned merchants
      if (user.role === 'agent') {
        const transactions = await storage.getTransactionsForUser(userId);
        
        if (search) {
          const filteredTransactions = transactions.filter(t => 
            t.transactionId.toLowerCase().includes(search.toString().toLowerCase()) ||
            t.merchant?.businessName?.toLowerCase().includes(search.toString().toLowerCase()) ||
            t.amount.toString().includes(search.toString()) ||
            t.paymentMethod.toLowerCase().includes(search.toString().toLowerCase())
          );
          return res.json(filteredTransactions);
        }
        
        return res.json(transactions);
      }

      // For merchants, only show their own transactions
      if (user.role === 'merchant') {
        const transactions = await storage.getTransactionsForUser(userId);
        
        if (search) {
          const filteredTransactions = transactions.filter(t => 
            t.transactionId.toLowerCase().includes(search.toString().toLowerCase()) ||
            t.amount.toString().includes(search.toString()) ||
            t.paymentMethod.toLowerCase().includes(search.toString().toLowerCase())
          );
          return res.json(filteredTransactions);
        }
        
        return res.json(transactions);
      }

      // For admin/corporate/super_admin, show all transactions
      if (['admin', 'corporate', 'super_admin'].includes(user.role)) {
        if (search) {
          const transactions = await storage.searchTransactions(search as string);
          return res.json(transactions);
        } else {
          const transactions = await storage.getAllTransactions();
          return res.json(transactions);
        }
      }

      // Default fallback - use role-based filtering from storage layer
      const transactions = await storage.getTransactionsForUser(userId);

      if (search) {
        const filteredTransactions = transactions.filter(transaction =>
          transaction.transactionId.toLowerCase().includes(search.toString().toLowerCase()) ||
          transaction.merchant?.businessName?.toLowerCase().includes(search.toString().toLowerCase()) ||
          transaction.amount.toString().includes(search.toString()) ||
          transaction.paymentMethod.toLowerCase().includes(search.toString().toLowerCase())
        );
        return res.json(filteredTransactions);
      }

      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get transactions by MID (location-specific transactions)
  app.get("/api/transactions/mid/:mid", devAuth, async (req: any, res) => {
    try {
      const { mid } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get location by MID to check access permissions
      const locations = await storage.getLocationsByMerchant(0); // Get all locations first
      const location = locations.find(loc => loc.mid === mid);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Check if user has access to this merchant
      if (user?.role === 'merchant' && location.merchantId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const transactions = await storage.getTransactionsByMID(mid);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions by MID:", error);
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

  // Admin-only routes for merchants
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

  // Agent routes (admin only)
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

  // Dashboard widget endpoints
  app.get('/api/dashboard/widgets', devAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const widgets = await storage.getUserWidgetPreferences(userId);
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching dashboard widgets:", error);
      res.status(500).json({ message: "Failed to fetch dashboard widgets" });
    }
  });

  app.post('/api/dashboard/widgets', devAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const widgetData = { ...req.body, userId };
      const widget = await storage.createWidgetPreference(widgetData);
      res.json(widget);
    } catch (error) {
      console.error("Error creating dashboard widget:", error);
      res.status(500).json({ message: "Failed to create dashboard widget" });
    }
  });

  app.put('/api/dashboard/widgets/:id', devAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const widget = await storage.updateWidgetPreference(id, req.body);
      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }
      res.json(widget);
    } catch (error) {
      console.error("Error updating dashboard widget:", error);
      res.status(500).json({ message: "Failed to update dashboard widget" });
    }
  });

  app.delete('/api/dashboard/widgets/:id', devAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWidgetPreference(id);
      if (!success) {
        return res.status(404).json({ message: "Widget not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting dashboard widget:", error);
      res.status(500).json({ message: "Failed to delete dashboard widget" });
    }
  });

  app.post('/api/dashboard/initialize', devAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create default widgets based on user role
      const defaultWidgets = getDefaultWidgetsForRole(user.role);
      
      for (const widget of defaultWidgets) {
        await storage.createWidgetPreference({
          userId,
          widgetId: widget.id,
          size: widget.size,
          position: widget.position,
          isVisible: true,
          configuration: widget.configuration || {}
        });
      }

      res.json({ success: true, message: "Dashboard initialized with default widgets" });
    } catch (error) {
      console.error("Error initializing dashboard:", error);
      res.status(500).json({ message: "Failed to initialize dashboard" });
    }
  });

  // Dashboard analytics endpoints
  app.get('/api/dashboard/metrics', devAuth, async (req: any, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get('/api/dashboard/revenue', devAuth, async (req: any, res) => {
    try {
      const timeRange = req.query.timeRange as string || 'daily';
      const revenue = await storage.getDashboardRevenue(timeRange);
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching dashboard revenue:", error);
      res.status(500).json({ message: "Failed to fetch dashboard revenue" });
    }
  });

  app.get('/api/dashboard/top-locations', devAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const sortBy = req.query.sortBy as string || 'revenue';
      const locations = await storage.getTopLocations(limit, sortBy);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching top locations:", error);
      res.status(500).json({ message: "Failed to fetch top locations" });
    }
  });

  app.get('/api/dashboard/recent-activity', devAuth, async (req: any, res) => {
    try {
      const activity = await storage.getRecentActivity();
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  app.get('/api/dashboard/assigned-merchants', devAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const merchants = await storage.getAssignedMerchants(limit);
      res.json(merchants);
    } catch (error) {
      console.error("Error fetching assigned merchants:", error);
      res.status(500).json({ message: "Failed to fetch assigned merchants" });
    }
  });

  app.get('/api/dashboard/system-overview', devAuth, async (req: any, res) => {
    try {
      const overview = await storage.getSystemOverview();
      res.json(overview);
    } catch (error) {
      console.error("Error fetching system overview:", error);
      res.status(500).json({ message: "Failed to fetch system overview" });
    }
  });

  // Security endpoints - admin only
  app.get("/api/security/login-attempts", isAuthenticated, requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const { db } = await import("./db");
      const { loginAttempts } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      
      const attempts = await db.select().from(loginAttempts)
        .orderBy(desc(loginAttempts.createdAt))
        .limit(100);
      
      res.json(attempts);
    } catch (error) {
      console.error("Failed to fetch login attempts:", error);
      res.status(500).json({ message: "Failed to fetch login attempts" });
    }
  });

  app.get("/api/security/metrics", isAuthenticated, requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const { db } = await import("./db");
      const { loginAttempts } = await import("@shared/schema");
      const { count, gte, and, eq } = await import("drizzle-orm");
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get total attempts in last 30 days
      const totalAttempts = await db.select({ count: count() })
        .from(loginAttempts)
        .where(gte(loginAttempts.createdAt, thirtyDaysAgo));

      // Get successful logins in last 30 days
      const successfulLogins = await db.select({ count: count() })
        .from(loginAttempts)
        .where(and(
          gte(loginAttempts.createdAt, thirtyDaysAgo),
          eq(loginAttempts.success, true)
        ));

      // Get failed logins in last 30 days
      const failedLogins = await db.select({ count: count() })
        .from(loginAttempts)
        .where(and(
          gte(loginAttempts.createdAt, thirtyDaysAgo),
          eq(loginAttempts.success, false)
        ));

      // Get unique IPs in last 30 days
      const uniqueIPs = await db.selectDistinct({ ipAddress: loginAttempts.ipAddress })
        .from(loginAttempts)
        .where(gte(loginAttempts.createdAt, thirtyDaysAgo));

      // Get recent failed attempts (last 24 hours)
      const recentFailedAttempts = await db.select({ count: count() })
        .from(loginAttempts)
        .where(and(
          gte(loginAttempts.createdAt, twentyFourHoursAgo),
          eq(loginAttempts.success, false)
        ));

      res.json({
        totalLoginAttempts: totalAttempts[0]?.count || 0,
        successfulLogins: successfulLogins[0]?.count || 0,
        failedLogins: failedLogins[0]?.count || 0,
        uniqueIPs: uniqueIPs.length || 0,
        recentFailedAttempts: recentFailedAttempts[0]?.count || 0
      });
    } catch (error) {
      console.error("Failed to fetch security metrics:", error);
      res.status(500).json({ message: "Failed to fetch security metrics" });
    }
  });

  // PDF Form Upload and Processing Routes
  app.post("/api/pdf-forms/upload", isAuthenticated, upload.single('pdf'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      const { originalname } = req.file;
      const buffer = req.file.buffer;
      
      // Parse the PDF to extract form structure
      const parseResult = await pdfFormParser.parsePDF(buffer);
      
      // Create the PDF form record
      const formData = {
        name: originalname.replace('.pdf', ''),
        fileName: originalname,
        fileSize: buffer.length,
        uploadedBy: req.user.id,
        description: `Merchant Application Form - ${originalname}`
      };

      const pdfForm = await storage.createPdfForm(formData);
      
      // Create form fields from parsed data
      const fieldData = pdfFormParser.convertToDbFields(parseResult.sections, pdfForm.id);
      
      for (const field of fieldData) {
        await storage.createPdfFormField(field);
      }
      
      // Return the complete form with fields
      const formWithFields = await storage.getPdfFormWithFields(pdfForm.id);
      
      res.status(201).json({
        form: formWithFields,
        sections: parseResult.sections,
        totalFields: parseResult.totalFields
      });
    } catch (error: any) {
      console.error("Error uploading PDF form:", error);
      res.status(500).json({ message: "Failed to process PDF form", error: error?.message || 'Unknown error' });
    }
  });

  // Get all PDF forms
  app.get("/api/pdf-forms", devAuth, async (req: any, res) => {
    try {
      const forms = await storage.getAllPdfForms();
      res.json(forms);
    } catch (error) {
      console.error("Error fetching PDF forms:", error);
      res.status(500).json({ message: "Failed to fetch PDF forms" });
    }
  });

  // Get specific PDF form with fields
  app.get("/api/pdf-forms/:id", devAuth, async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const form = await storage.getPdfFormWithFields(formId);
      
      if (!form) {
        return res.status(404).json({ message: "PDF form not found" });
      }
      
      res.json(form);
    } catch (error) {
      console.error("Error fetching PDF form:", error);
      res.status(500).json({ message: "Failed to fetch PDF form" });
    }
  });

  // Get specific PDF form with fields (wizard endpoint)
  app.get("/api/pdf-forms/:id/with-fields", devAuth, async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const form = await storage.getPdfFormWithFields(formId);
      
      if (!form) {
        return res.status(404).json({ message: "PDF form not found" });
      }
      
      res.json(form);
    } catch (error) {
      console.error("Error fetching PDF form with fields:", error);
      res.status(500).json({ message: "Failed to fetch PDF form with fields" });
    }
  });

  // Update PDF form metadata (admin only)
  app.patch("/api/pdf-forms/:id", devAuth, requireRole(['admin', 'super_admin']), async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const { name, description, showInNavigation, navigationTitle, allowedRoles } = req.body;
      
      if (!name && !description && showInNavigation === undefined && navigationTitle === undefined && !allowedRoles) {
        return res.status(400).json({ message: "No update data provided" });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (showInNavigation !== undefined) updateData.showInNavigation = showInNavigation;
      if (navigationTitle !== undefined) updateData.navigationTitle = navigationTitle;
      if (allowedRoles !== undefined) updateData.allowedRoles = allowedRoles;
      
      const updatedForm = await storage.updatePdfForm(formId, updateData);
      
      if (!updatedForm) {
        return res.status(404).json({ message: "PDF form not found" });
      }
      
      res.json(updatedForm);
    } catch (error) {
      console.error("Error updating PDF form:", error);
      res.status(500).json({ message: "Failed to update PDF form" });
    }
  });

  // Handle form submissions (auto-save and final submit)
  app.post("/api/pdf-forms/:id/submissions", isAuthenticated, async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const { data, status = 'draft' } = req.body;
      
      const submissionData = {
        formId,
        submittedBy: req.user.id,
        data: typeof data === 'string' ? data : JSON.stringify(data),
        status
      };
      
      const submission = await storage.createPdfFormSubmission(submissionData);
      res.status(201).json(submission);
    } catch (error) {
      console.error("Error creating form submission:", error);
      res.status(500).json({ message: "Failed to save form submission" });
    }
  });

  // Submit PDF form data (auto-save functionality)
  app.post("/api/pdf-forms/:id/submit", isAuthenticated, async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const { formData } = req.body;
      
      const submissionData = {
        formId,
        submittedBy: req.user.id,
        data: JSON.stringify(formData)
      };
      
      const submission = await storage.createPdfFormSubmission(submissionData);
      res.status(201).json(submission);
    } catch (error) {
      console.error("Error submitting PDF form:", error);
      res.status(500).json({ message: "Failed to submit PDF form" });
    }
  });

  // Get form submissions
  app.get("/api/pdf-forms/:id/submissions", isAuthenticated, async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const submissions = await storage.getPdfFormSubmissions(formId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching form submissions:", error);
      res.status(500).json({ message: "Failed to fetch form submissions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}