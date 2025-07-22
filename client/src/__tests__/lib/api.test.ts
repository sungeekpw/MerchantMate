import { merchantsApi, agentsApi, transactionsApi } from '../../lib/api';
import * as queryClient from '../../lib/queryClient';

// Mock the queryClient module
jest.mock('../../lib/queryClient', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = queryClient.apiRequest as jest.MockedFunction<typeof queryClient.apiRequest>;

describe('API Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('merchantsApi', () => {
    const mockMerchant = {
      id: 1,
      businessName: 'Test Business',
      contactEmail: 'test@example.com',
      agentId: 1,
      status: 'active' as const,
      processingFee: 2.9,
      monthlyVolume: 50000,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01'
    };

    it('should fetch all merchants without search', async () => {
      const mockResponse = { json: () => Promise.resolve([mockMerchant]) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await merchantsApi.getAll();
      
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/merchants');
      expect(result).toEqual([mockMerchant]);
    });

    it('should fetch all merchants with search parameter', async () => {
      const searchTerm = 'test business';
      const mockResponse = { json: () => Promise.resolve([mockMerchant]) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await merchantsApi.getAll(searchTerm);
      
      expect(mockApiRequest).toHaveBeenCalledWith('GET', `/api/merchants?search=${encodeURIComponent(searchTerm)}`);
      expect(result).toEqual([mockMerchant]);
    });

    it('should fetch merchant by ID', async () => {
      const mockResponse = { json: () => Promise.resolve(mockMerchant) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await merchantsApi.getById(1);
      
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/merchants/1');
      expect(result).toEqual(mockMerchant);
    });

    it('should create a new merchant', async () => {
      const newMerchant = {
        businessName: 'New Business',
        contactEmail: 'new@example.com',
        agentId: 1
      };
      const mockResponse = { json: () => Promise.resolve({ ...newMerchant, id: 2 }) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await merchantsApi.create(newMerchant);
      
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/merchants', newMerchant);
      expect(result).toEqual({ ...newMerchant, id: 2 });
    });

    it('should update a merchant', async () => {
      const updateData = { businessName: 'Updated Business' };
      const mockResponse = { json: () => Promise.resolve({ ...mockMerchant, ...updateData }) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await merchantsApi.update(1, updateData);
      
      expect(mockApiRequest).toHaveBeenCalledWith('PUT', '/api/merchants/1', updateData);
      expect(result).toEqual({ ...mockMerchant, ...updateData });
    });

    it('should delete a merchant', async () => {
      mockApiRequest.mockResolvedValue(undefined as any);

      await merchantsApi.delete(1);
      
      expect(mockApiRequest).toHaveBeenCalledWith('DELETE', '/api/merchants/1');
    });
  });

  describe('agentsApi', () => {
    const mockAgent = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01'
    };

    it('should fetch all agents without search', async () => {
      const mockResponse = { json: () => Promise.resolve([mockAgent]) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await agentsApi.getAll();
      
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/agents');
      expect(result).toEqual([mockAgent]);
    });

    it('should fetch all agents with search parameter', async () => {
      const searchTerm = 'john';
      const mockResponse = { json: () => Promise.resolve([mockAgent]) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await agentsApi.getAll(searchTerm);
      
      expect(mockApiRequest).toHaveBeenCalledWith('GET', `/api/agents?search=${encodeURIComponent(searchTerm)}`);
      expect(result).toEqual([mockAgent]);
    });

    it('should create a new agent', async () => {
      const newAgent = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '098-765-4321'
      };
      const mockResponse = { json: () => Promise.resolve({ ...newAgent, id: 2 }) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await agentsApi.create(newAgent);
      
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/agents', newAgent);
      expect(result).toEqual({ ...newAgent, id: 2 });
    });
  });

  describe('transactionsApi', () => {
    const mockTransaction = {
      id: 1,
      merchantId: 1,
      amount: '100.00',
      status: 'completed' as const,
      transactionId: 'TXN001',
      paymentMethod: 'credit_card' as const,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01'
    };

    it('should fetch all transactions without parameters', async () => {
      const mockResponse = { json: () => Promise.resolve([mockTransaction]) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await transactionsApi.getAll();
      
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/transactions');
      expect(result).toEqual([mockTransaction]);
    });

    it('should fetch transactions with search and merchantId parameters', async () => {
      const searchTerm = 'TXN001';
      const merchantId = 1;
      const mockResponse = { json: () => Promise.resolve([mockTransaction]) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await transactionsApi.getAll(searchTerm, merchantId);
      
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/transactions?search=TXN001&merchantId=1');
      expect(result).toEqual([mockTransaction]);
    });

    it('should fetch transaction by ID', async () => {
      const mockResponse = { json: () => Promise.resolve(mockTransaction) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await transactionsApi.getById(1);
      
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/transactions/1');
      expect(result).toEqual(mockTransaction);
    });

    it('should create a new transaction', async () => {
      const newTransaction = {
        merchantId: 1,
        amount: '200.00',
        transactionId: 'TXN002',
        paymentMethod: 'debit_card' as const
      };
      const mockResponse = { json: () => Promise.resolve({ ...newTransaction, id: 2 }) };
      mockApiRequest.mockResolvedValue(mockResponse as any);

      const result = await transactionsApi.create(newTransaction);
      
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/transactions', newTransaction);
      expect(result).toEqual({ ...newTransaction, id: 2 });
    });
  });
});