import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DatabaseStorage } from '../storage';
import type { NewMerchantProspect, NewAgent, NewMerchant } from '../../shared/schema';

// Mock the database connection
jest.mock('@neondatabase/serverless', () => ({
  neon: jest.fn(() => jest.fn()),
}));

jest.mock('drizzle-orm/neon-http', () => ({
  drizzle: jest.fn(() => ({
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  })),
}));

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Prospect Management', () => {
    it('should create a new prospect', async () => {
      const newProspect: NewMerchantProspect = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        companyName: 'Test Company',
        status: 'pending',
        validationToken: 'test-token-123',
        agentId: 1,
        campaignId: 1,
      };

      const result = await storage.createProspect(newProspect);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should get prospect by id', async () => {
      const prospectId = 1;
      const result = await storage.getProspectById(prospectId);
      expect(result).toBeDefined();
    });

    it('should get all prospects', async () => {
      const result = await storage.getProspects();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should update prospect status', async () => {
      const prospectId = 1;
      const newStatus = 'contacted';
      const result = await storage.updateProspectStatus(prospectId, newStatus);
      expect(result).toBeDefined();
    });
  });

  describe('Agent Management', () => {
    it('should create a new agent', async () => {
      const newAgent: NewAgent = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@corecrm.com',
        phone: '555-987-6543',
        userId: 'user-123',
      };

      const result = await storage.createAgent(newAgent);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should get all agents', async () => {
      const result = await storage.getAgents();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get agent by id', async () => {
      const agentId = 1;
      const result = await storage.getAgentById(agentId);
      expect(result).toBeDefined();
    });
  });

  describe('Merchant Management', () => {
    it('should create a new merchant', async () => {
      const newMerchant: NewMerchant = {
        businessName: 'Test Business',
        contactEmail: 'contact@testbusiness.com',
        contactPhone: '555-111-2222',
        status: 'active',
        agentId: 1,
      };

      const result = await storage.createMerchant(newMerchant);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should get all merchants', async () => {
      const result = await storage.getMerchants();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      const mockDb = {
        insert: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      
      // Override the db property for this test
      (storage as any).db = mockDb;

      const newProspect: NewMerchantProspect = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        status: 'pending',
        validationToken: 'token',
      };

      await expect(storage.createProspect(newProspect)).rejects.toThrow('Database connection failed');
    });
  });
});