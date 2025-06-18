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
import { emailService } from "./emailService";
import { v4 as uuidv4 } from "uuid";

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

  // Address autocomplete endpoint using Google Places API
  app.post('/api/address-autocomplete', async (req, res) => {
    try {
      const { input } = req.body;
      
      if (!input || typeof input !== 'string' || input.length < 4) {
        return res.json({ suggestions: [] });
      }
      
      const googleApiKey = process.env.GOOGLE_API_KEY;
      if (!googleApiKey) {
        return res.status(500).json({ error: 'Google API key not configured' });
      }
      
      // Call Google Places Autocomplete API with US bias
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:us&key=${googleApiKey}`;
      
      const response = await fetch(autocompleteUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        res.json({
          suggestions: data.predictions.map((prediction: any) => ({
            description: prediction.description,
            place_id: prediction.place_id,
            structured_formatting: prediction.structured_formatting
          }))
        });
      } else {
        res.json({ suggestions: [] });
      }
    } catch (error) {
      console.error('Address autocomplete error:', error);
      res.json({ suggestions: [] });
    }
  });

  // Address validation endpoint using Google Maps API
  app.post('/api/validate-address', async (req, res) => {
    try {
      const { address, placeId } = req.body;
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Address is required' });
      }
      
      const googleApiKey = process.env.GOOGLE_API_KEY;
      if (!googleApiKey) {
        return res.status(500).json({ error: 'Google API key not configured' });
      }
      
      let geocodeUrl;
      
      // If we have a place_id, use it for more accurate results
      if (placeId) {
        geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${googleApiKey}`;
      } else {
        // Fallback to address geocoding
        geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`;
      }
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components;
        
        // Extract address components
        let city = '';
        let state = '';
        let zipCode = '';
        let streetNumber = '';
        let streetName = '';
        
        components.forEach((component: any) => {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          } else if (types.includes('route')) {
            streetName = component.long_name;
          } else if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          } else if (types.includes('postal_code')) {
            zipCode = component.long_name;
          }
        });
        
        // Construct street address (number + street name only)
        const streetAddress = [streetNumber, streetName].filter(Boolean).join(' ');
        
        res.json({
          isValid: true,
          formattedAddress: result.formatted_address,
          streetAddress: streetAddress || result.formatted_address.split(',')[0].trim(), // fallback to first part
          city,
          state,
          zipCode,
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng
        });
      } else {
        res.json({
          isValid: false,
          error: data.status === 'ZERO_RESULTS' ? 'Address not found' : 'Invalid address'
        });
      }
    } catch (error) {
      console.error('Address validation error:', error);
      res.status(500).json({ error: 'Address validation failed' });
    }
  });

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

  // Agent dashboard endpoints
  app.get("/api/agent/dashboard/stats", async (req: any, res) => {
    try {
      console.log('Agent Dashboard Stats - Session ID:', req.sessionID);
      console.log('Agent Dashboard Stats - Session data:', req.session);
      
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get agent by user email
      const agent = await storage.getAgentByEmail(user.email);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      console.log('Found agent:', agent.id, agent.firstName, agent.lastName);

      // Get all prospects assigned to this agent
      const prospects = await storage.getProspectsByAgent(agent.id);
      console.log('Found prospects:', prospects.length);
      
      // Calculate statistics
      const totalApplications = prospects.length;
      const pendingApplications = prospects.filter(p => p.status === 'pending').length;
      const contactedApplications = prospects.filter(p => p.status === 'contacted').length;
      const inProgressApplications = prospects.filter(p => p.status === 'in_progress').length;
      const appliedApplications = prospects.filter(p => p.status === 'applied').length;
      const approvedApplications = prospects.filter(p => p.status === 'approved').length;
      const rejectedApplications = prospects.filter(p => p.status === 'rejected').length;
      
      const completedApplications = appliedApplications + approvedApplications + rejectedApplications;
      const conversionRate = totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0;

      res.json({
        totalApplications,
        pendingApplications,
        contactedApplications,
        inProgressApplications,
        appliedApplications,
        approvedApplications,
        rejectedApplications,
        completedApplications,
        conversionRate,
        averageProcessingTime: 7 // days - can be calculated from actual data
      });
    } catch (error) {
      console.error("Error fetching agent dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  app.get("/api/agent/applications", async (req: any, res) => {
    try {
      console.log('Agent Applications - Session ID:', req.sessionID);
      console.log('Agent Applications - Session data:', req.session);
      
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get agent by user email
      const agent = await storage.getAgentByEmail(user.email);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Get all prospects assigned to this agent with application details
      const prospects = await storage.getProspectsByAgent(agent.id);
      
      // Transform prospects to application format
      const applications = prospects.map(prospect => {
        // Calculate completion percentage based on status
        let completionPercentage = 0;
        switch (prospect.status) {
          case 'pending': completionPercentage = 10; break;
          case 'contacted': completionPercentage = 25; break;
          case 'in_progress': completionPercentage = 60; break;
          case 'applied': completionPercentage = 90; break;
          case 'approved': 
          case 'rejected': completionPercentage = 100; break;
        }

        return {
          id: prospect.id,
          prospectName: `${prospect.firstName} ${prospect.lastName}`,
          companyName: 'Not specified', // Will be added to schema later
          email: prospect.email,
          phone: 'Not provided', // Will be added to schema later
          status: prospect.status,
          createdAt: prospect.createdAt,
          lastUpdated: prospect.updatedAt || prospect.createdAt,
          completionPercentage,
          assignedAgent: prospect.agent?.firstName ? `${prospect.agent.firstName} ${prospect.agent.lastName}` : 'Unassigned'
        };
      });

      // Sort by most recent first
      applications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(applications);
    } catch (error) {
      console.error("Error fetching agent applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
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

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Development mode: always return Mike Chen (agent) user
      if (process.env.NODE_ENV === 'development') {
        const devUser = {
          id: "user_agent_1",
          email: "mike.chen@corecrm.com",
          firstName: "Mike",
          lastName: "Chen",
          role: "agent",
          status: "active"
        };
        return res.json(devUser);
      }

      // Production mode: use normal authentication
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

  // Get merchants for a specific agent
  app.get("/api/agents/:agentId/merchants", devRequireRole(['admin', 'corporate', 'super_admin']), async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const merchants = await storage.getAgentMerchants(parseInt(agentId));
      res.json(merchants);
    } catch (error) {
      console.error("Error fetching agent merchants:", error);
      res.status(500).json({ message: "Failed to fetch agent merchants" });
    }
  });

  // Merchant Prospect routes
  app.get("/api/prospects", isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      let prospects;
      
      if (user.role === 'agent') {
        // Agents can only see their assigned prospects
        const agent = await storage.getAgentByUserId(userId);
        if (!agent) {
          return res.status(403).json({ message: "Agent not found" });
        }
        
        if (search) {
          prospects = await storage.searchMerchantProspectsByAgent(agent.id, search as string);
        } else {
          prospects = await storage.getMerchantProspectsByAgent(agent.id);
        }
      } else if (['admin', 'corporate', 'super_admin'].includes(user.role)) {
        // Admins can see all prospects
        if (search) {
          prospects = await storage.searchMerchantProspects(search as string);
        } else {
          prospects = await storage.getAllMerchantProspects();
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(prospects);
    } catch (error) {
      console.error("Error fetching prospects:", error);
      res.status(500).json({ message: "Failed to fetch prospects" });
    }
  });

  app.post("/api/prospects", devRequireRole(['agent', 'admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const { insertMerchantProspectSchema } = await import("@shared/schema");
      const { emailService } = await import("./emailService");
      
      const result = insertMerchantProspectSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid prospect data", errors: result.error.errors });
      }

      const prospect = await storage.createMerchantProspect(result.data);
      
      // Fetch agent information for email
      const agent = await storage.getAgent(prospect.agentId);
      
      // Send validation email if agent information is available
      if (agent && prospect.validationToken) {
        const emailSent = await emailService.sendProspectValidationEmail({
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          email: prospect.email,
          validationToken: prospect.validationToken,
          agentName: `${agent.firstName} ${agent.lastName}`,
        });
        
        if (emailSent) {
          console.log(`Validation email sent to prospect: ${prospect.email}`);
        } else {
          console.warn(`Failed to send validation email to prospect: ${prospect.email}`);
        }
      }
      
      res.status(201).json(prospect);
    } catch (error) {
      console.error("Error creating prospect:", error);
      res.status(500).json({ message: "Failed to create prospect" });
    }
  });

  app.put("/api/prospects/:id", devRequireRole(['agent', 'admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const prospect = await storage.updateMerchantProspect(parseInt(id), req.body);
      
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      res.json(prospect);
    } catch (error) {
      console.error("Error updating prospect:", error);
      res.status(500).json({ message: "Failed to update prospect" });
    }
  });

  app.post("/api/prospects/:id/resend-invitation", devRequireRole(['agent', 'admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { emailService } = await import("./emailService");
      
      // Get prospect details
      const prospect = await storage.getMerchantProspect(parseInt(id));
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }

      // Get agent information
      const agent = await storage.getAgent(prospect.agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Send validation email
      if (prospect.validationToken) {
        const emailSent = await emailService.sendProspectValidationEmail({
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          email: prospect.email,
          validationToken: prospect.validationToken,
          agentName: `${agent.firstName} ${agent.lastName}`,
        });
        
        if (emailSent) {
          console.log(`Validation email resent to prospect: ${prospect.email}`);
          res.json({ success: true, message: "Invitation email sent successfully" });
        } else {
          res.status(500).json({ message: "Failed to send invitation email" });
        }
      } else {
        res.status(400).json({ message: "No validation token found for this prospect" });
      }
    } catch (error) {
      console.error("Error resending invitation:", error);
      res.status(500).json({ message: "Failed to resend invitation" });
    }
  });

  app.delete("/api/prospects/:id", devRequireRole(['admin', 'corporate', 'super_admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteMerchantProspect(parseInt(id));
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Prospect not found" });
      }
    } catch (error) {
      console.error("Error deleting prospect:", error);
      res.status(500).json({ message: "Failed to delete prospect" });
    }
  });

  // Prospect validation route (public, no auth required)
  app.post("/api/prospects/validate", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const prospect = await storage.getMerchantProspectByEmail(email);
      
      if (!prospect) {
        return res.status(404).json({ message: "No invitation found for this email address. Please check that you entered the correct email address that received the invitation." });
      }

      // Verify the prospect has a validation token (was actually invited)
      if (!prospect.validationToken) {
        return res.status(400).json({ message: "This prospect was not properly invited. Please contact your agent." });
      }

      // Check if already validated
      if (prospect.validatedAt) {
        // Allow re-access if already validated
        return res.json({
          success: true,
          prospect: {
            id: prospect.id,
            firstName: prospect.firstName,
            lastName: prospect.lastName,
            email: prospect.email,
            agentId: prospect.agentId,
            validationToken: prospect.validationToken
          }
        });
      }

      // Update validation timestamp for first-time validation
      await storage.updateMerchantProspect(prospect.id, {
        validatedAt: new Date(),
        status: 'contacted'
      });

      res.json({
        success: true,
        prospect: {
          id: prospect.id,
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          email: prospect.email,
          agentId: prospect.agentId,
          validationToken: prospect.validationToken
        }
      });
    } catch (error) {
      console.error("Error validating prospect:", error);
      res.status(500).json({ message: "Failed to validate prospect" });
    }
  });

  // Validate prospect by token (public, no auth required)
  app.post("/api/prospects/validate-token", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const prospect = await storage.getMerchantProspectByToken(token);
      
      if (!prospect) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }

      // Update validation timestamp if not already validated
      if (!prospect.validatedAt) {
        await storage.updateMerchantProspect(prospect.id, {
          validatedAt: new Date(),
          status: 'contacted'
        });
      }

      res.json({
        success: true,
        prospect: {
          id: prospect.id,
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          email: prospect.email,
          agentId: prospect.agentId,
          validationToken: prospect.validationToken
        }
      });
    } catch (error) {
      console.error("Error validating prospect by token:", error);
      res.status(500).json({ message: "Failed to validate prospect" });
    }
  });

  // Get prospect by token (for starting application)
  app.get("/api/prospects/token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const prospect = await storage.getMerchantProspectByToken(token);
      
      if (!prospect) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }

      // Get agent information
      const agent = await storage.getAgent(prospect.agentId);

      res.json({
        prospect,
        agent
      });
    } catch (error) {
      console.error("Error fetching prospect by token:", error);
      res.status(500).json({ message: "Failed to fetch prospect" });
    }
  });

  // Update prospect status to "in progress" when they start filling out the form
  app.post("/api/prospects/:id/start-application", async (req, res) => {
    try {
      const { id } = req.params;
      const prospectId = parseInt(id);
      
      const prospect = await storage.getMerchantProspect(prospectId);
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }

      // Only update if status is 'contacted' (validated email)
      if (prospect.status === 'contacted') {
        const updatedProspect = await storage.updateMerchantProspect(prospectId, {
          status: 'in_progress',
          applicationStartedAt: new Date(),
        });
        res.json(updatedProspect);
      } else {
        res.json(prospect); // Return existing prospect if already in progress or further along
      }
    } catch (error) {
      console.error("Error updating prospect status:", error);
      res.status(500).json({ message: "Failed to update prospect status" });
    }
  });

  // Clear address data from cached form data
  app.post("/api/prospects/:id/clear-address-data", async (req, res) => {
    try {
      const prospectId = parseInt(req.params.id);
      const prospect = await storage.getMerchantProspect(prospectId);
      
      if (!prospect || !prospect.formData) {
        return res.json({ success: true, message: "No cached data to clear" });
      }

      // Parse existing form data and remove address fields
      const existingFormData = typeof prospect.formData === 'string' 
        ? JSON.parse(prospect.formData) 
        : prospect.formData;
      
      // Remove address-related fields
      delete existingFormData.address;
      delete existingFormData.city;
      delete existingFormData.state;
      delete existingFormData.zipCode;
      
      // Save cleaned form data back
      await storage.updateMerchantProspect(prospectId, {
        formData: JSON.stringify(existingFormData)
      });

      res.json({ success: true, message: "Address data cleared" });
    } catch (error) {
      console.error("Error clearing address data:", error);
      res.status(500).json({ message: "Failed to clear address data" });
    }
  });

  // Save form data for prospects
  app.post("/api/prospects/:id/save-form-data", async (req, res) => {
    try {
      const { id } = req.params;
      const { formData, currentStep } = req.body;
      const prospectId = parseInt(id);

      const prospect = await storage.getMerchantProspect(prospectId);
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }

      // Save the form data and current step
      await storage.updateMerchantProspect(prospectId, {
        formData: JSON.stringify(formData),
        currentStep: currentStep
      });

      console.log(`Form data saved for prospect ${prospectId}, step ${currentStep}`);
      res.json({ success: true, message: "Form data saved successfully" });
    } catch (error) {
      console.error("Error saving prospect form data:", error);
      res.status(500).json({ message: "Failed to save form data" });
    }
  });

  // Download application PDF for prospects
  app.get("/api/prospects/:id/download-pdf", async (req, res) => {
    try {
      const { id } = req.params;
      const prospectId = parseInt(id);

      const prospect = await storage.getMerchantProspect(prospectId);
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }

      // Check if prospect has submitted application
      if (prospect.status !== 'submitted' && prospect.status !== 'applied') {
        return res.status(400).json({ message: "PDF only available for submitted applications" });
      }

      // Parse form data
      let formData: any = {};
      if (prospect.formData) {
        try {
          formData = JSON.parse(prospect.formData);
        } catch (error) {
          console.error('Error parsing form data:', error);
          return res.status(400).json({ message: "Invalid form data" });
        }
      }

      // Generate PDF document
      try {
        const { pdfGenerator } = await import('./pdfGenerator');
        const pdfBuffer = await pdfGenerator.generateApplicationPDF(prospect, formData);
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${prospect.firstName}_${prospect.lastName}_Application_${new Date().toLocaleDateString().replace(/\//g, '_')}.pdf"`);
        res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    } catch (error) {
      console.error("Error downloading prospect PDF:", error);
      res.status(500).json({ message: "Failed to download PDF" });
    }
  });

  // Submit complete application for prospects
  app.post("/api/prospects/:id/submit-application", async (req, res) => {
    try {
      const { id } = req.params;
      const { formData, status } = req.body;
      const prospectId = parseInt(id);

      const prospect = await storage.getMerchantProspect(prospectId);
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }

      // Get agent information
      const agent = await storage.getAgent(prospect.agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Update prospect with final form data and status
      const updatedProspect = await storage.updateMerchantProspect(prospectId, {
        formData: JSON.stringify(formData),
        status: 'submitted'
      });

      // Generate PDF document
      let pdfBuffer: Buffer | undefined;
      try {
        const { pdfGenerator } = await import('./pdfGenerator');
        pdfBuffer = await pdfGenerator.generateApplicationPDF(updatedProspect, formData);
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        // Continue without PDF - don't fail the submission
      }

      // Send notification emails
      try {
        const submissionDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        await emailService.sendApplicationSubmissionNotification({
          companyName: formData.companyName || 'Unknown Company',
          applicantName: `${prospect.firstName} ${prospect.lastName}`,
          applicantEmail: prospect.email,
          agentName: `${agent.firstName} ${agent.lastName}`,
          agentEmail: agent.email,
          submissionDate,
          applicationToken: prospect.validationToken || 'unknown'
        }, pdfBuffer);
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Continue without email - don't fail the submission
      }

      console.log(`Application submitted for prospect ${prospectId}`);
      res.json({ 
        success: true, 
        message: "Application submitted successfully",
        prospect: updatedProspect,
        statusUrl: `/application-status/${prospect.validationToken}`
      });
    } catch (error) {
      console.error("Error submitting prospect application:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Application status lookup
  app.get("/api/application-status/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const prospect = await storage.getMerchantProspectByToken(token);
      if (!prospect) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Get agent information
      const agent = await storage.getAgent(prospect.agentId);
      
      const response = {
        ...prospect,
        agent: agent ? {
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email
        } : null
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching application status:", error);
      res.status(500).json({ message: "Failed to fetch application status" });
    }
  });

  // Send signature request email
  app.post("/api/signature-request", async (req, res) => {
    try {
      const { 
        ownerName, 
        ownerEmail, 
        companyName, 
        ownershipPercentage, 
        requesterName, 
        agentName,
        prospectId
      } = req.body;

      if (!ownerName || !ownerEmail || !companyName || !ownershipPercentage || !prospectId) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields" 
        });
      }

      // Generate unique signature token
      const signatureToken = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create or update prospect owner in database
      const existingOwners = await storage.getProspectOwners(prospectId);
      const existingOwner = existingOwners.find(owner => owner.email === ownerEmail);

      if (existingOwner) {
        // Update existing owner with signature token
        await storage.updateProspectOwner(existingOwner.id, {
          signatureToken,
          emailSent: true,
          emailSentAt: new Date()
        });
      } else {
        // Create new prospect owner
        await storage.createProspectOwner({
          prospectId,
          name: ownerName,
          email: ownerEmail,
          ownershipPercentage: ownershipPercentage.toString(),
          signatureToken,
          emailSent: true,
          emailSentAt: new Date()
        });
      }

      const success = await emailService.sendSignatureRequestEmail({
        ownerName,
        ownerEmail,
        companyName,
        ownershipPercentage,
        signatureToken,
        requesterName,
        agentName
      });

      if (success) {
        res.json({ 
          success: true, 
          message: `Signature request sent to ${ownerEmail}`,
          signatureToken 
        });
      } else {
        console.log(`Signature request email failed for ${ownerEmail}, but continuing workflow`);
        res.json({ 
          success: true, 
          message: `Signature request prepared for ${ownerEmail} (email delivery pending)`,
          signatureToken,
          emailFailed: true
        });
      }
    } catch (error) {
      console.error("Error sending signature request:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process signature request" 
      });
    }
  });

  // Submit signature (public endpoint)
  app.post("/api/signature-submit", async (req, res) => {
    try {
      const { signatureToken, signature, signatureType } = req.body;

      if (!signatureToken || !signature) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing signature token or signature data" 
        });
      }

      // Find the prospect owner by signature token
      const owner = await storage.getProspectOwnerBySignatureToken(signatureToken);
      if (!owner) {
        return res.status(404).json({ 
          success: false, 
          message: "Invalid signature token" 
        });
      }

      // Create the signature record in database
      await storage.createProspectSignature({
        prospectId: owner.prospectId,
        ownerId: owner.id,
        signatureToken,
        signature,
        signatureType: signatureType || 'type'
      });
      
      console.log(`Signature submitted for token: ${signatureToken}`);
      console.log(`Signature type: ${signatureType}`);
      console.log(`Owner email: ${owner.email}`);

      res.json({ 
        success: true, 
        message: "Signature submitted successfully" 
      });
    } catch (error) {
      console.error("Error submitting signature:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to submit signature" 
      });
    }
  });

  // Get signature by token (for retrieving submitted signatures)
  app.get("/api/signature/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const signature = await storage.getProspectSignature(token);
      
      if (!signature) {
        return res.status(404).json({ 
          success: false, 
          message: "Signature not found" 
        });
      }
      
      res.json({ 
        success: true, 
        signature: {
          signature: signature.signature,
          signatureType: signature.signatureType,
          submittedAt: signature.submittedAt,
          token: signature.signatureToken
        }
      });
    } catch (error) {
      console.error("Error retrieving signature:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve signature" 
      });
    }
  });

  // Get prospect owners with their signatures
  app.get("/api/prospects/:prospectId/owners-with-signatures", async (req, res) => {
    try {
      const { prospectId } = req.params;
      const owners = await storage.getProspectOwners(parseInt(prospectId));
      const signatures = await storage.getProspectSignaturesByProspect(parseInt(prospectId));
      
      // Merge owners with their signatures
      const ownersWithSignatures = owners.map(owner => {
        const signature = signatures.find(sig => sig.ownerId === owner.id);
        return {
          name: owner.name,
          email: owner.email,
          percentage: owner.ownershipPercentage.replace('%', ''), // Remove % sign for form input
          signature: signature?.signature || null,
          signatureType: signature?.signatureType || null,
          submittedAt: signature?.submittedAt || null,
          signatureToken: owner.signatureToken,
          emailSent: owner.emailSent,
          emailSentAt: owner.emailSentAt
        };
      });
      
      res.json({ success: true, owners: ownersWithSignatures });
    } catch (error) {
      console.error("Error fetching owners with signatures:", error);
      res.status(500).json({ success: false, message: "Failed to fetch owners with signatures" });
    }
  });

  // Search signatures by email (database-backed)
  app.get("/api/signatures/by-email/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      
      const signatures = await storage.getProspectSignaturesByOwnerEmail(email);
      
      if (signatures.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "No signatures found for this email" 
        });
      }
      
      // Return the most recent signature
      const latestSignature = signatures[signatures.length - 1];

      res.json({ 
        success: true, 
        signature: {
          signature: latestSignature.signature,
          signatureType: latestSignature.signatureType,
          submittedAt: latestSignature.submittedAt,
          token: latestSignature.signatureToken
        }
      });
    } catch (error) {
      console.error("Error searching signatures by email:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to search signature" 
      });
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

  // Current agent info (for logged-in agents)
  app.get("/api/current-agent", devAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Current Agent API - UserId:", userId);
      
      const agent = await storage.getAgentByUserId(userId);
      if (!agent) {
        console.log("Agent not found for userId:", userId);
        return res.status(404).json({ message: "Agent not found" });
      }

      console.log("Found agent:", agent.id, agent.firstName, agent.lastName);
      res.json(agent);
    } catch (error) {
      console.error("Error fetching current agent:", error);
      res.status(500).json({ message: "Failed to fetch current agent" });
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

  // PDF Form Upload and Processing Routes (admin only)
  app.post("/api/pdf-forms/upload", devAuth, requireRole(['admin', 'super_admin']), upload.single('pdf'), async (req: any, res) => {
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

  // Get all PDF forms (admin only)
  app.get("/api/pdf-forms", devAuth, requireRole(['admin', 'super_admin']), async (req: any, res) => {
    try {
      const forms = await storage.getAllPdfForms();
      res.json(forms);
    } catch (error) {
      console.error("Error fetching PDF forms:", error);
      res.status(500).json({ message: "Failed to fetch PDF forms" });
    }
  });

  // Get specific PDF form with fields (admin only)
  app.get("/api/pdf-forms/:id", devAuth, requireRole(['admin', 'super_admin']), async (req: any, res) => {
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
        submittedBy: req.user?.id || null,
        data: typeof data === 'string' ? data : JSON.stringify(data),
        status,
        submissionToken: storage.generateSubmissionToken(),
        isPublic: false
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
        submittedBy: req.user?.id || null,
        data: JSON.stringify(formData),
        submissionToken: storage.generateSubmissionToken(),
        status: 'submitted',
        isPublic: false
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

  // Create a new public form submission and return the unique token
  app.post("/api/pdf-forms/:id/create-submission", async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const { applicantEmail } = req.body;
      
      // Create a new submission with unique token for public access
      const submissionData = {
        formId,
        submittedBy: null, // Public submission, no authenticated user
        applicantEmail,
        data: JSON.stringify({}), // Empty initial data
        status: 'draft',
        isPublic: true,
        submissionToken: storage.generateSubmissionToken()
      };
      
      const submission = await storage.createPdfFormSubmission(submissionData);
      res.status(201).json({ 
        submissionToken: submission.submissionToken,
        submissionId: submission.id 
      });
    } catch (error) {
      console.error("Error creating public form submission:", error);
      res.status(500).json({ message: "Failed to create form submission" });
    }
  });

  // Get public form submission by token (no authentication required)
  app.get("/api/submissions/:token", async (req: any, res) => {
    try {
      const { token } = req.params;
      const submission = await storage.getPdfFormSubmissionByToken(token);
      
      if (!submission) {
        return res.status(404).json({ message: "Form submission not found" });
      }
      
      // Also get the form details
      const form = await storage.getPdfForm(submission.formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      res.json({
        submission,
        form
      });
    } catch (error) {
      console.error("Error fetching public form submission:", error);
      res.status(500).json({ message: "Failed to fetch form submission" });
    }
  });

  // Update public form submission by token (no authentication required)
  app.put("/api/submissions/:token", async (req: any, res) => {
    try {
      const { token } = req.params;
      const { data, status = 'draft' } = req.body;
      
      const updateData = {
        data: typeof data === 'string' ? data : JSON.stringify(data),
        status,
        updatedAt: new Date()
      };
      
      const submission = await storage.updatePdfFormSubmissionByToken(token, updateData);
      
      if (!submission) {
        return res.status(404).json({ message: "Form submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Error updating public form submission:", error);
      res.status(500).json({ message: "Failed to update form submission" });
    }
  });

  // Send email with submission link
  app.post("/api/pdf-forms/:id/send-submission-link", isAuthenticated, async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const { applicantEmail } = req.body;
      
      if (!applicantEmail) {
        return res.status(400).json({ message: "Applicant email is required" });
      }
      
      // Get form details
      const form = await storage.getPdfForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      // Create new submission
      const submissionData = {
        formId,
        submittedBy: null,
        applicantEmail,
        data: JSON.stringify({}),
        status: 'draft',
        isPublic: true,
        submissionToken: storage.generateSubmissionToken()
      };
      
      const submission = await storage.createPdfFormSubmission(submissionData);
      
      // Generate the submission URL
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://${process.env.REPLIT_DOMAIN || 'localhost:5000'}` 
        : 'http://localhost:5000';
      const submissionUrl = `${baseUrl}/form/${submission.submissionToken}`;
      
      // Send email (using placeholder for now - will implement with SendGrid)
      console.log(`Email would be sent to: ${applicantEmail}`);
      console.log(`Subject: Complete your ${form.name}`);
      console.log(`Link: ${submissionUrl}`);
      
      res.json({ 
        success: true, 
        submissionToken: submission.submissionToken,
        submissionUrl,
        message: `Submission link created for ${applicantEmail}` 
      });
    } catch (error) {
      console.error("Error sending submission link:", error);
      res.status(500).json({ message: "Failed to send submission link" });
    }
  });

  // Development authentication bypass for testing
  if (process.env.NODE_ENV === 'development') {
    app.get("/api/auth/test-agent", async (req, res) => {
      try {
        const user = await storage.getUserByUsernameOrEmail("", "mike.chen@corecrm.com");
        if (user) {
          (req.session as any).userId = user.id;
          (req.session as any).sessionId = uuidv4();
          res.redirect('/agent-dashboard');
        } else {
          res.status(404).json({ message: "Agent not found" });
        }
      } catch (error) {
        console.error("Test agent login error:", error);
        res.status(500).json({ message: "Failed to set test session" });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}