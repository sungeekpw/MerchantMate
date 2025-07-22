import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.mock('../storage');
jest.mock('../auth');

const mockStorage = {
  getProspects: jest.fn(),
  getProspectById: jest.fn(),
  createProspect: jest.fn(),
  updateProspect: jest.fn(),
  deleteProspect: jest.fn(),
  getAgents: jest.fn(),
  getMerchants: jest.fn(),
  createMerchant: jest.fn(),
  getTransactions: jest.fn(),
  getCampaigns: jest.fn(),
  createCampaign: jest.fn()
};

const mockAuth = {
  isAuthenticated: jest.fn((req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'super_admin' };
    next();
  }),
  requireRole: jest.fn(() => (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'super_admin' };
    next();
  })
};

describe('API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock the storage and auth middleware
    jest.doMock('../storage', () => ({ DatabaseStorage: jest.fn(() => mockStorage) }));
    jest.doMock('../auth', () => mockAuth);
    
    // Import routes after mocking
    const routes = require('../routes');
    app.use('/api', routes.default);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Prospects API', () => {
    it('GET /api/prospects returns prospects list', async () => {
      const mockProspects = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          status: 'pending'
        }
      ];
      
      mockStorage.getProspects.mockResolvedValue(mockProspects);

      const response = await request(app)
        .get('/api/prospects')
        .expect(200);

      expect(response.body).toEqual(mockProspects);
      expect(mockStorage.getProspects).toHaveBeenCalled();
    });

    it('POST /api/prospects creates new prospect', async () => {
      const newProspect = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        status: 'pending',
        validationToken: 'test-token'
      };

      const createdProspect = { id: 1, ...newProspect };
      mockStorage.createProspect.mockResolvedValue(createdProspect);

      const response = await request(app)
        .post('/api/prospects')
        .send(newProspect)
        .expect(201);

      expect(response.body).toEqual(createdProspect);
      expect(mockStorage.createProspect).toHaveBeenCalledWith(newProspect);
    });

    it('GET /api/prospects/:id returns specific prospect', async () => {
      const prospect = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      mockStorage.getProspectById.mockResolvedValue(prospect);

      const response = await request(app)
        .get('/api/prospects/1')
        .expect(200);

      expect(response.body).toEqual(prospect);
      expect(mockStorage.getProspectById).toHaveBeenCalledWith(1);
    });

    it('DELETE /api/prospects/:id deletes prospect', async () => {
      mockStorage.deleteProspect.mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/prospects/1')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockStorage.deleteProspect).toHaveBeenCalledWith(1);
    });
  });

  describe('Agents API', () => {
    it('GET /api/agents returns agents list', async () => {
      const mockAgents = [
        {
          id: 1,
          firstName: 'Sarah',
          lastName: 'Wilson',
          email: 'sarah.wilson@corecrm.com'
        }
      ];

      mockStorage.getAgents.mockResolvedValue(mockAgents);

      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(response.body).toEqual(mockAgents);
      expect(mockStorage.getAgents).toHaveBeenCalled();
    });
  });

  describe('Merchants API', () => {
    it('GET /api/merchants returns merchants list', async () => {
      const mockMerchants = [
        {
          id: 1,
          businessName: 'Test Business',
          contactEmail: 'contact@test.com',
          status: 'active'
        }
      ];

      mockStorage.getMerchants.mockResolvedValue(mockMerchants);

      const response = await request(app)
        .get('/api/merchants')
        .expect(200);

      expect(response.body).toEqual(mockMerchants);
      expect(mockStorage.getMerchants).toHaveBeenCalled();
    });

    it('POST /api/merchants creates new merchant', async () => {
      const newMerchant = {
        businessName: 'New Business LLC',
        contactEmail: 'contact@newbiz.com',
        status: 'pending',
        agentId: 1
      };

      const createdMerchant = { id: 1, ...newMerchant };
      mockStorage.createMerchant.mockResolvedValue(createdMerchant);

      const response = await request(app)
        .post('/api/merchants')
        .send(newMerchant)
        .expect(201);

      expect(response.body).toEqual(createdMerchant);
      expect(mockStorage.createMerchant).toHaveBeenCalledWith(newMerchant);
    });
  });

  describe('Campaigns API', () => {
    it('GET /api/campaigns returns campaigns list for admin users', async () => {
      const mockCampaigns = [
        {
          id: 1,
          name: 'Test Campaign',
          acquirer: 'Esquire',
          status: 'active'
        }
      ];

      mockStorage.getCampaigns.mockResolvedValue(mockCampaigns);

      const response = await request(app)
        .get('/api/campaigns')
        .expect(200);

      expect(response.body).toEqual(mockCampaigns);
      expect(mockStorage.getCampaigns).toHaveBeenCalled();
    });

    it('POST /api/campaigns creates new campaign for admin users', async () => {
      const newCampaign = {
        name: 'New Campaign',
        acquirer: 'Wells Fargo',
        pricingType: 'Dual',
        status: 'active'
      };

      const createdCampaign = { id: 1, ...newCampaign };
      mockStorage.createCampaign.mockResolvedValue(createdCampaign);

      const response = await request(app)
        .post('/api/campaigns')
        .send(newCampaign)
        .expect(201);

      expect(response.body).toEqual(createdCampaign);
      expect(mockStorage.createCampaign).toHaveBeenCalledWith(newCampaign);
    });
  });

  describe('Error Handling', () => {
    it('handles storage errors gracefully', async () => {
      mockStorage.getProspects.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/prospects')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('validates required fields in POST requests', async () => {
      const invalidProspect = {
        firstName: '',  // Invalid empty name
        email: 'invalid-email'  // Invalid email format
      };

      const response = await request(app)
        .post('/api/prospects')
        .send(invalidProspect)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('returns 404 for non-existent resources', async () => {
      mockStorage.getProspectById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/prospects/999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication and Authorization', () => {
    it('requires authentication for protected routes', async () => {
      // Mock unauthenticated request
      mockAuth.isAuthenticated.mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      await request(app)
        .get('/api/prospects')
        .expect(401);
    });

    it('requires admin role for campaign management', async () => {
      // Mock non-admin user
      mockAuth.requireRole.mockImplementation(() => (req, res, next) => {
        res.status(403).json({ error: 'Insufficient permissions' });
      });

      await request(app)
        .get('/api/campaigns')
        .expect(403);
    });
  });
});