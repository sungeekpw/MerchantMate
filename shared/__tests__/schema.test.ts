import { describe, it, expect } from '@jest/globals';
import { 
  insertMerchantProspectSchema,
  insertAgentSchema,
  insertMerchantSchema,
  insertUserSchema,
  insertTransactionSchema
} from '../schema';
import { z } from 'zod';

describe('Schema Validation', () => {
  describe('Merchant Prospect Schema', () => {
    it('validates valid prospect data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        companyName: 'Test Company',
        status: 'pending' as const,
        validationToken: 'test-token-123',
        agentId: 1,
        campaignId: 1,
      };

      expect(() => insertMerchantProspectSchema.parse(validData)).not.toThrow();
    });

    it('rejects invalid email format', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        status: 'pending' as const,
        validationToken: 'test-token-123',
      };

      expect(() => insertMerchantProspectSchema.parse(invalidData)).toThrow();
    });

    it('rejects empty required fields', () => {
      const invalidData = {
        firstName: '',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        status: 'pending' as const,
        validationToken: 'test-token-123',
      };

      expect(() => insertMerchantProspectSchema.parse(invalidData)).toThrow();
    });

    it('validates status enum values', () => {
      const validStatuses = ['pending', 'contacted', 'validated', 'started', 'submitted', 'applied', 'approved', 'rejected'];
      
      validStatuses.forEach(status => {
        const data = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          status: status as any,
          validationToken: 'test-token-123',
        };
        
        expect(() => insertMerchantProspectSchema.parse(data)).not.toThrow();
      });
    });

    it('rejects invalid status values', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        status: 'invalid-status',
        validationToken: 'test-token-123',
      };

      expect(() => insertMerchantProspectSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Agent Schema', () => {
    it('validates valid agent data', () => {
      const validData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@corecrm.com',
        phone: '555-987-6543',
        userId: 'user-123',
      };

      expect(() => insertAgentSchema.parse(validData)).not.toThrow();
    });

    it('rejects invalid agent email format', () => {
      const invalidData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'invalid-email',
        userId: 'user-123',
      };

      expect(() => insertAgentSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Merchant Schema', () => {
    it('validates valid merchant data', () => {
      const validData = {
        businessName: 'Test Business LLC',
        contactEmail: 'contact@testbusiness.com',
        contactPhone: '555-111-2222',
        status: 'active' as const,
        agentId: 1,
      };

      expect(() => insertMerchantSchema.parse(validData)).not.toThrow();
    });

    it('validates merchant status enum', () => {
      const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
      
      validStatuses.forEach(status => {
        const data = {
          businessName: 'Test Business',
          contactEmail: 'contact@test.com',
          status: status as any,
          agentId: 1,
        };
        
        expect(() => insertMerchantSchema.parse(data)).not.toThrow();
      });
    });
  });

  describe('User Schema', () => {
    it('validates valid user data', () => {
      const validData = {
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'agent' as const,
        passwordHash: 'hashed-password-123',
      };

      expect(() => insertUserSchema.parse(validData)).not.toThrow();
    });

    it('validates user role enum', () => {
      const validRoles = ['merchant', 'agent', 'admin', 'corporate', 'super_admin'];
      
      validRoles.forEach(role => {
        const data = {
          email: 'user@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: role as any,
          passwordHash: 'hashed-password-123',
        };
        
        expect(() => insertUserSchema.parse(data)).not.toThrow();
      });
    });
  });

  describe('Transaction Schema', () => {
    it('validates valid transaction data', () => {
      const validData = {
        merchantId: 1,
        amount: 100.50,
        type: 'sale' as const,
        status: 'completed' as const,
        locationId: 1,
        commission: 2.50,
      };

      expect(() => insertTransactionSchema.parse(validData)).not.toThrow();
    });

    it('validates transaction type enum', () => {
      const validTypes = ['sale', 'refund', 'chargeback', 'adjustment'];
      
      validTypes.forEach(type => {
        const data = {
          merchantId: 1,
          amount: 100.00,
          type: type as any,
          status: 'completed' as const,
          locationId: 1,
        };
        
        expect(() => insertTransactionSchema.parse(data)).not.toThrow();
      });
    });

    it('validates transaction status enum', () => {
      const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
      
      validStatuses.forEach(status => {
        const data = {
          merchantId: 1,
          amount: 100.00,
          type: 'sale' as const,
          status: status as any,
          locationId: 1,
        };
        
        expect(() => insertTransactionSchema.parse(data)).not.toThrow();
      });
    });

    it('rejects negative amounts', () => {
      const invalidData = {
        merchantId: 1,
        amount: -50.00,
        type: 'sale' as const,
        status: 'completed' as const,
        locationId: 1,
      };

      expect(() => insertTransactionSchema.parse(invalidData)).toThrow();
    });
  });
});