import { merchants, agents, transactions, type Merchant, type Agent, type Transaction, type InsertMerchant, type InsertAgent, type InsertTransaction, type MerchantWithAgent, type TransactionWithMerchant } from "@shared/schema";

export interface IStorage {
  // Merchant operations
  getMerchant(id: number): Promise<Merchant | undefined>;
  getMerchantByEmail(email: string): Promise<Merchant | undefined>;
  getAllMerchants(): Promise<MerchantWithAgent[]>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: number, merchant: Partial<InsertMerchant>): Promise<Merchant | undefined>;
  deleteMerchant(id: number): Promise<boolean>;
  searchMerchants(query: string): Promise<MerchantWithAgent[]>;

  // Agent operations
  getAgent(id: number): Promise<Agent | undefined>;
  getAgentByEmail(email: string): Promise<Agent | undefined>;
  getAllAgents(): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: number): Promise<boolean>;
  searchAgents(query: string): Promise<Agent[]>;

  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionByTransactionId(transactionId: string): Promise<Transaction | undefined>;
  getAllTransactions(): Promise<TransactionWithMerchant[]>;
  getTransactionsByMerchant(merchantId: number): Promise<TransactionWithMerchant[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  searchTransactions(query: string): Promise<TransactionWithMerchant[]>;

  // Analytics
  getDashboardMetrics(): Promise<{
    totalRevenue: string;
    activeMerchants: number;
    transactionsToday: number;
    activeAgents: number;
  }>;
  getTopMerchants(): Promise<(Merchant & { transactionCount: number; totalVolume: string })[]>;
  getRecentTransactions(limit?: number): Promise<TransactionWithMerchant[]>;
}

export class MemStorage implements IStorage {
  private merchants: Map<number, Merchant>;
  private agents: Map<number, Agent>;
  private transactions: Map<number, Transaction>;
  private currentMerchantId: number;
  private currentAgentId: number;
  private currentTransactionId: number;

  constructor() {
    this.merchants = new Map();
    this.agents = new Map();
    this.transactions = new Map();
    this.currentMerchantId = 1;
    this.currentAgentId = 1;
    this.currentTransactionId = 1;

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample agents
    const sampleAgents: InsertAgent[] = [
      {
        firstName: "Sarah",
        lastName: "Wilson",
        email: "sarah.wilson@paycrm.com",
        phone: "+1-555-0101",
        territory: "North Region",
        commissionRate: "5.00",
        status: "active"
      },
      {
        firstName: "Mike",
        lastName: "Chen",
        email: "mike.chen@paycrm.com",
        phone: "+1-555-0102",
        territory: "South Region",
        commissionRate: "4.50",
        status: "active"
      },
      {
        firstName: "Lisa",
        lastName: "Rodriguez",
        email: "lisa.rodriguez@paycrm.com",
        phone: "+1-555-0103",
        territory: "West Region",
        commissionRate: "5.50",
        status: "active"
      }
    ];

    sampleAgents.forEach(agent => {
      this.createAgent(agent);
    });

    // Sample merchants
    const sampleMerchants: InsertMerchant[] = [
      {
        businessName: "TechMart Solutions",
        businessType: "Electronics",
        email: "contact@techmart.com",
        phone: "+1-555-1001",
        address: "123 Tech Street, Silicon Valley, CA 94025",
        agentId: 1,
        processingFee: "2.25",
        status: "active",
        monthlyVolume: "125000.00"
      },
      {
        businessName: "Fashion Boutique",
        businessType: "Retail",
        email: "info@fashionboutique.com",
        phone: "+1-555-1002",
        address: "456 Style Ave, New York, NY 10001",
        agentId: 2,
        processingFee: "2.50",
        status: "pending",
        monthlyVolume: "89500.00"
      },
      {
        businessName: "Coffee Corner",
        businessType: "Food & Beverage",
        email: "hello@coffeecorner.com",
        phone: "+1-555-1003",
        address: "789 Bean Blvd, Seattle, WA 98101",
        agentId: 3,
        processingFee: "2.75",
        status: "active",
        monthlyVolume: "45200.00"
      }
    ];

    sampleMerchants.forEach(merchant => {
      this.createMerchant(merchant);
    });

    // Sample transactions
    const sampleTransactions: InsertTransaction[] = [
      {
        transactionId: "TXN-001847",
        merchantId: 3,
        amount: "84.50",
        paymentMethod: "visa",
        status: "completed",
        processingFee: "2.32",
        netAmount: "82.18"
      },
      {
        transactionId: "TXN-001846",
        merchantId: 1,
        amount: "1250.00",
        paymentMethod: "mastercard",
        status: "pending",
        processingFee: "28.13",
        netAmount: "1221.87"
      },
      {
        transactionId: "TXN-001845",
        merchantId: 2,
        amount: "342.75",
        paymentMethod: "apple_pay",
        status: "completed",
        processingFee: "8.57",
        netAmount: "334.18"
      },
      {
        transactionId: "TXN-001844",
        merchantId: 3,
        amount: "67.25",
        paymentMethod: "visa",
        status: "failed",
        processingFee: "0.00",
        netAmount: "0.00"
      }
    ];

    sampleTransactions.forEach(transaction => {
      this.createTransaction(transaction);
    });
  }

  // Merchant operations
  async getMerchant(id: number): Promise<Merchant | undefined> {
    return this.merchants.get(id);
  }

  async getMerchantByEmail(email: string): Promise<Merchant | undefined> {
    return Array.from(this.merchants.values()).find(merchant => merchant.email === email);
  }

  async getAllMerchants(): Promise<MerchantWithAgent[]> {
    const merchants = Array.from(this.merchants.values());
    return merchants.map(merchant => ({
      ...merchant,
      agent: merchant.agentId ? this.agents.get(merchant.agentId) : undefined
    }));
  }

  async createMerchant(insertMerchant: InsertMerchant): Promise<Merchant> {
    const id = this.currentMerchantId++;
    const merchant: Merchant = {
      id,
      businessName: insertMerchant.businessName,
      businessType: insertMerchant.businessType,
      email: insertMerchant.email,
      phone: insertMerchant.phone,
      address: insertMerchant.address || null,
      agentId: insertMerchant.agentId || null,
      processingFee: insertMerchant.processingFee || "2.50",
      status: insertMerchant.status || "active",
      monthlyVolume: insertMerchant.monthlyVolume || "0",
      createdAt: new Date()
    };
    this.merchants.set(id, merchant);
    return merchant;
  }

  async updateMerchant(id: number, updates: Partial<InsertMerchant>): Promise<Merchant | undefined> {
    const merchant = this.merchants.get(id);
    if (!merchant) return undefined;

    const updatedMerchant = { ...merchant, ...updates };
    this.merchants.set(id, updatedMerchant);
    return updatedMerchant;
  }

  async deleteMerchant(id: number): Promise<boolean> {
    return this.merchants.delete(id);
  }

  async searchMerchants(query: string): Promise<MerchantWithAgent[]> {
    const merchants = await this.getAllMerchants();
    const lowercaseQuery = query.toLowerCase();
    return merchants.filter(merchant =>
      merchant.businessName.toLowerCase().includes(lowercaseQuery) ||
      merchant.email.toLowerCase().includes(lowercaseQuery) ||
      merchant.businessType.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Agent operations
  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async getAgentByEmail(email: string): Promise<Agent | undefined> {
    return Array.from(this.agents.values()).find(agent => agent.email === email);
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = this.currentAgentId++;
    const agent: Agent = {
      id,
      firstName: insertAgent.firstName,
      lastName: insertAgent.lastName,
      email: insertAgent.email,
      phone: insertAgent.phone,
      territory: insertAgent.territory || null,
      commissionRate: insertAgent.commissionRate || "5.00",
      status: insertAgent.status || "active",
      createdAt: new Date()
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    const updatedAgent = { ...agent, ...updates };
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  async deleteAgent(id: number): Promise<boolean> {
    return this.agents.delete(id);
  }

  async searchAgents(query: string): Promise<Agent[]> {
    const agents = Array.from(this.agents.values());
    const lowercaseQuery = query.toLowerCase();
    return agents.filter(agent =>
      `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(lowercaseQuery) ||
      agent.email.toLowerCase().includes(lowercaseQuery) ||
      (agent.territory && agent.territory.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionByTransactionId(transactionId: string): Promise<Transaction | undefined> {
    return Array.from(this.transactions.values()).find(transaction => transaction.transactionId === transactionId);
  }

  async getAllTransactions(): Promise<TransactionWithMerchant[]> {
    const transactions = Array.from(this.transactions.values());
    return transactions.map(transaction => ({
      ...transaction,
      merchant: this.merchants.get(transaction.merchantId)
    })).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getTransactionsByMerchant(merchantId: number): Promise<TransactionWithMerchant[]> {
    const transactions = Array.from(this.transactions.values()).filter(t => t.merchantId === merchantId);
    return transactions.map(transaction => ({
      ...transaction,
      merchant: this.merchants.get(transaction.merchantId)
    }));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const transaction: Transaction = {
      id,
      transactionId: insertTransaction.transactionId,
      merchantId: insertTransaction.merchantId,
      amount: insertTransaction.amount,
      paymentMethod: insertTransaction.paymentMethod,
      status: insertTransaction.status,
      processingFee: insertTransaction.processingFee || null,
      netAmount: insertTransaction.netAmount || null,
      createdAt: new Date()
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    const updatedTransaction = { ...transaction, ...updates };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async searchTransactions(query: string): Promise<TransactionWithMerchant[]> {
    const transactions = await this.getAllTransactions();
    const lowercaseQuery = query.toLowerCase();
    return transactions.filter(transaction =>
      transaction.transactionId.toLowerCase().includes(lowercaseQuery) ||
      transaction.merchant?.businessName.toLowerCase().includes(lowercaseQuery) ||
      transaction.paymentMethod.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Analytics
  async getDashboardMetrics(): Promise<{
    totalRevenue: string;
    activeMerchants: number;
    transactionsToday: number;
    activeAgents: number;
  }> {
    const completedTransactions = Array.from(this.transactions.values()).filter(t => t.status === 'completed');
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const activeMerchants = Array.from(this.merchants.values()).filter(m => m.status === 'active').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const transactionsToday = Array.from(this.transactions.values()).filter(t => 
      new Date(t.createdAt!).getTime() >= today.getTime()
    ).length;
    
    const activeAgents = Array.from(this.agents.values()).filter(a => a.status === 'active').length;

    return {
      totalRevenue: totalRevenue.toFixed(2),
      activeMerchants,
      transactionsToday,
      activeAgents
    };
  }

  async getTopMerchants(): Promise<(Merchant & { transactionCount: number; totalVolume: string })[]> {
    const merchants = Array.from(this.merchants.values());
    const transactions = Array.from(this.transactions.values());
    
    return merchants.map(merchant => {
      const merchantTransactions = transactions.filter(t => t.merchantId === merchant.id && t.status === 'completed');
      const transactionCount = merchantTransactions.length;
      const totalVolume = merchantTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      return {
        ...merchant,
        transactionCount,
        totalVolume: totalVolume.toFixed(2)
      };
    }).sort((a, b) => parseFloat(b.totalVolume) - parseFloat(a.totalVolume)).slice(0, 5);
  }

  async getRecentTransactions(limit: number = 10): Promise<TransactionWithMerchant[]> {
    const transactions = await this.getAllTransactions();
    return transactions.slice(0, limit);
  }
}

export const storage = new MemStorage();
