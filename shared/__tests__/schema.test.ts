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
          agentId: 1,
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
        businessType: 'Corporation',
        email: 'business@example.com',
        phone: '555-123-4567',
        agentId: 1,
        processingFee: '2.50',
        status: 'active' as const,
        monthlyVolume: '10000.00',
      };

      expect(() => insertMerchantSchema.parse(validData)).not.toThrow();
    });

    it('validates merchant status enum', () => {
      const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
      
      validStatuses.forEach(status => {
        const data = {
          businessName: 'Test Business',
          businessType: 'Corporation',
          email: 'business@test.com',
          phone: '555-123-4567',
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
        id: 'user-123',
        username: 'testuser',
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
          id: 'user-123',
          username: 'testuser',
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
        transactionId: 'txn_123456789',
        merchantId: 1,
        amount: '100.50',
        paymentMethod: 'visa',
        status: 'completed' as const,
        processingFee: '2.50',
        netAmount: '98.00',
      };

      expect(() => insertTransactionSchema.parse(validData)).not.toThrow();
    });

    it('validates transaction type enum', () => {
      const validPaymentMethods = ['visa', 'mastercard', 'amex', 'apple_pay', 'google_pay'];
      
      validPaymentMethods.forEach(paymentMethod => {
        const data = {
          transactionId: 'txn_123456789',
          merchantId: 1,
          amount: '100.00',
          paymentMethod: paymentMethod as any,
          status: 'completed' as const,
        };
        
        expect(() => insertTransactionSchema.parse(data)).not.toThrow();
      });
    });

    it('validates transaction status enum', () => {
      const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
      
      validStatuses.forEach(status => {
        const data = {
          transactionId: 'txn_123456789',
          merchantId: 1,
          amount: '100.00',
          paymentMethod: 'visa',
          status: status as any,
        };
        
        expect(() => insertTransactionSchema.parse(data)).not.toThrow();
      });
    });

    it('accepts various transaction amounts', () => {
      const validAmounts = ['100.50', '0.01', '1000.00'];
      
      validAmounts.forEach(amount => {
        const data = {
          transactionId: `txn_${Math.random()}`,
          merchantId: 1,
          amount: amount,
          paymentMethod: 'visa',
          status: 'completed' as any,
        };
        
        expect(() => insertTransactionSchema.parse(data)).not.toThrow();
      });
    });
  });
});