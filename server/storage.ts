import { merchants, agents, transactions, users, loginAttempts, twoFactorCodes, userDashboardPreferences, agentMerchants, locations, addresses, type Merchant, type Agent, type Transaction, type User, type InsertMerchant, type InsertAgent, type InsertTransaction, type UpsertUser, type MerchantWithAgent, type TransactionWithMerchant, type LoginAttempt, type TwoFactorCode, type UserDashboardPreference, type InsertUserDashboardPreference, type AgentMerchant, type InsertAgentMerchant, type Location, type InsertLocation, type Address, type InsertAddress, type LocationWithAddresses, type MerchantWithLocations } from "@shared/schema";
import { db } from "./db";
import { eq, or, and, gte, sql } from "drizzle-orm";

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
  getTransactionsByMID(mid: string): Promise<TransactionWithMerchant[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  searchTransactions(query: string): Promise<TransactionWithMerchant[]>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameOrEmail(username: string, email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: Partial<UpsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updateUserStatus(id: string, status: string): Promise<User | undefined>;
  updateUserPermissions(id: string, permissions: Record<string, boolean>): Promise<User | undefined>;

  // Authentication operations
  createLoginAttempt(attempt: {
    username?: string | null;
    email?: string | null;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    failureReason?: string;
  }): Promise<void>;
  getRecentLoginAttempts(usernameOrEmail: string, ip: string, timeWindow: number): Promise<any[]>;
  create2FACode(code: {
    userId: string;
    code: string;
    type: string;
    expiresAt: Date;
  }): Promise<void>;
  verify2FACode(userId: string, code: string): Promise<boolean>;

  // Analytics
  getDashboardMetrics(): Promise<{
    totalRevenue: string;
    activeMerchants: number;
    transactionsToday: number;
    activeAgents: number;
  }>;
  getTopMerchants(): Promise<(Merchant & { transactionCount: number; totalVolume: string })[]>;
  getRecentTransactions(limit?: number): Promise<TransactionWithMerchant[]>;

  // Agent-Merchant associations
  getAgentMerchants(agentId: number): Promise<Merchant[]>;
  getMerchantAgents(merchantId: number): Promise<Agent[]>;
  assignAgentToMerchant(agentId: number, merchantId: number, assignedBy: string): Promise<AgentMerchant>;
  unassignAgentFromMerchant(agentId: number, merchantId: number): Promise<boolean>;
  getMerchantsForUser(userId: string): Promise<MerchantWithAgent[]>;
  getTransactionsForUser(userId: string): Promise<TransactionWithMerchant[]>;

  // Location operations
  getLocation(id: number): Promise<Location | undefined>;
  getLocationsByMerchant(merchantId: number): Promise<LocationWithAddresses[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, updates: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;

  // Address operations
  getAddress(id: number): Promise<Address | undefined>;
  getAddressesByLocation(locationId: number): Promise<Address[]>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: number, updates: Partial<InsertAddress>): Promise<Address | undefined>;
  deleteAddress(id: number): Promise<boolean>;

  // Widget preferences
  getUserWidgetPreferences(userId: string): Promise<UserDashboardPreference[]>;
  createWidgetPreference(preference: InsertUserDashboardPreference): Promise<UserDashboardPreference>;
  updateWidgetPreference(id: number, updates: Partial<InsertUserDashboardPreference>): Promise<UserDashboardPreference | undefined>;
  deleteWidgetPreference(id: number): Promise<boolean>;

  // Location revenue metrics
  getLocationRevenue(locationId: number): Promise<{
    totalRevenue: string;
    last24Hours: string;
    monthToDate: string;
    yearToDate: string;
  }>;

  // Dashboard analytics methods
  getDashboardRevenue(timeRange: string): Promise<{
    current: string;
    daily: string;
    weekly: string;
    monthly: string;
    change?: number;
  }>;
  getTopLocations(limit: number, sortBy: string): Promise<any[]>;
  getRecentActivity(): Promise<any[]>;
  getAssignedMerchants(limit: number): Promise<any[]>;
  getSystemOverview(): Promise<{
    uptime: string;
    activeUsers: number;
    alerts?: any[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getMerchant(id: number): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id));
    return merchant || undefined;
  }

  async getMerchantByEmail(email: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.email, email));
    return merchant || undefined;
  }

  async getAllMerchants(): Promise<MerchantWithAgent[]> {
    const result = await db
      .select({
        merchant: merchants,
        agent: agents,
      })
      .from(merchants)
      .leftJoin(agents, eq(merchants.agentId, agents.id));

    return result.map(row => ({
      ...row.merchant,
      agent: row.agent || undefined,
    }));
  }

  async createMerchant(insertMerchant: InsertMerchant): Promise<Merchant> {
    const [merchant] = await db
      .insert(merchants)
      .values(insertMerchant)
      .returning();
    return merchant;
  }

  async updateMerchant(id: number, updates: Partial<InsertMerchant>): Promise<Merchant | undefined> {
    const [merchant] = await db
      .update(merchants)
      .set(updates)
      .where(eq(merchants.id, id))
      .returning();
    return merchant || undefined;
  }

  async deleteMerchant(id: number): Promise<boolean> {
    const result = await db.delete(merchants).where(eq(merchants.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchMerchants(query: string): Promise<MerchantWithAgent[]> {
    const result = await db
      .select({
        merchant: merchants,
        agent: agents,
      })
      .from(merchants)
      .leftJoin(agents, eq(merchants.agentId, agents.id));

    // Filter results in memory for now - can be optimized with SQL LIKE
    return result
      .map(row => ({
        ...row.merchant,
        agent: row.agent || undefined,
      }))
      .filter(merchant => 
        merchant.businessName.toLowerCase().includes(query.toLowerCase()) ||
        merchant.email.toLowerCase().includes(query.toLowerCase()) ||
        merchant.businessType.toLowerCase().includes(query.toLowerCase())
      );
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async getAgentByEmail(email: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.email, email));
    return agent || undefined;
  }

  async getAllAgents(): Promise<Agent[]> {
    return await db.select().from(agents);
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const [agent] = await db
      .insert(agents)
      .values(insertAgent)
      .returning();
    return agent;
  }

  async updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent | undefined> {
    const [agent] = await db
      .update(agents)
      .set(updates)
      .where(eq(agents.id, id))
      .returning();
    return agent || undefined;
  }

  async deleteAgent(id: number): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchAgents(query: string): Promise<Agent[]> {
    const allAgents = await db.select().from(agents);
    
    // Filter results in memory for now
    return allAgents.filter(agent =>
      `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
      agent.email.toLowerCase().includes(query.toLowerCase()) ||
      (agent.territory && agent.territory.toLowerCase().includes(query.toLowerCase()))
    );
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionByTransactionId(transactionId: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.transactionId, transactionId));
    return transaction || undefined;
  }

  async getAllTransactions(): Promise<TransactionWithMerchant[]> {
    const result = await db
      .select({
        transaction: transactions,
        merchant: merchants,
      })
      .from(transactions)
      .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
      .orderBy(transactions.createdAt);

    return result.map(row => ({
      ...row.transaction,
      merchant: row.merchant || undefined,
    }));
  }

  async getTransactionsByMerchant(merchantId: number): Promise<TransactionWithMerchant[]> {
    const result = await db
      .select({
        transaction: transactions,
        merchant: merchants,
      })
      .from(transactions)
      .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
      .where(eq(transactions.merchantId, merchantId));

    return result.map(row => ({
      ...row.transaction,
      merchant: row.merchant || undefined,
    }));
  }

  async getTransactionsByMID(mid: string): Promise<TransactionWithMerchant[]> {
    const result = await db
      .select({
        transaction: transactions,
        merchant: merchants,
      })
      .from(transactions)
      .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
      .where(eq(transactions.mid, mid));

    return result.map(row => ({
      ...row.transaction,
      merchant: row.merchant || undefined,
    }));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async searchTransactions(query: string): Promise<TransactionWithMerchant[]> {
    const result = await db
      .select({
        transaction: transactions,
        merchant: merchants,
      })
      .from(transactions)
      .leftJoin(merchants, eq(transactions.merchantId, merchants.id));

    // Filter results in memory for now
    return result
      .map(row => ({
        ...row.transaction,
        merchant: row.merchant || undefined,
      }))
      .filter(transaction =>
        transaction.transactionId.toLowerCase().includes(query.toLowerCase()) ||
        (transaction.merchant?.businessName && transaction.merchant.businessName.toLowerCase().includes(query.toLowerCase())) ||
        transaction.paymentMethod.toLowerCase().includes(query.toLowerCase())
      );
  }

  async getDashboardMetrics(): Promise<{
    totalRevenue: string;
    activeMerchants: number;
    transactionsToday: number;
    activeAgents: number;
  }> {
    const allTransactions = await db.select().from(transactions);
    const completedTransactions = allTransactions.filter(t => t.status === 'completed');
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const allMerchants = await db.select().from(merchants);
    const activeMerchants = allMerchants.filter(m => m.status === 'active').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const transactionsToday = allTransactions.filter(t => 
      new Date(t.createdAt!).getTime() >= today.getTime()
    ).length;
    
    const allAgents = await db.select().from(agents);
    const activeAgents = allAgents.filter(a => a.status === 'active').length;

    return {
      totalRevenue: totalRevenue.toFixed(2),
      activeMerchants,
      transactionsToday,
      activeAgents
    };
  }

  async getTopMerchants(): Promise<(Merchant & { transactionCount: number; totalVolume: string })[]> {
    const allMerchants = await db.select().from(merchants);
    const allTransactions = await db.select().from(transactions);
    
    return allMerchants.map(merchant => {
      const merchantTransactions = allTransactions.filter(t => t.merchantId === merchant.id && t.status === 'completed');
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
    const result = await db
      .select({
        transaction: transactions,
        merchant: merchants,
      })
      .from(transactions)
      .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
      .orderBy(transactions.createdAt)
      .limit(limit);

    return result.map(row => ({
      ...row.transaction,
      merchant: row.merchant || undefined,
    }));
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByUsernameOrEmail(username: string, email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(eq(users.username, username), eq(users.email, email))
    );
    return user || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async createUser(userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData as UpsertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserStatus(id: string, status: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserPermissions(id: string, permissions: Record<string, boolean>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ permissions, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Authentication operations
  async createLoginAttempt(attempt: {
    username?: string | null;
    email?: string | null;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    failureReason?: string;
  }): Promise<void> {
    await db.insert(loginAttempts).values({
      username: attempt.username,
      email: attempt.email,
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent,
      success: attempt.success,
      failureReason: attempt.failureReason,
    });
  }

  async getRecentLoginAttempts(usernameOrEmail: string, ip: string, timeWindow: number): Promise<LoginAttempt[]> {
    const timeThreshold = new Date(Date.now() - timeWindow);
    return await db.select().from(loginAttempts).where(
      and(
        or(
          eq(loginAttempts.username, usernameOrEmail),
          eq(loginAttempts.email, usernameOrEmail)
        ),
        eq(loginAttempts.ipAddress, ip),
        gte(loginAttempts.createdAt, timeThreshold),
        eq(loginAttempts.success, false)
      )
    );
  }

  async create2FACode(code: {
    userId: string;
    code: string;
    type: string;
    expiresAt: Date;
  }): Promise<void> {
    await db.insert(twoFactorCodes).values({
      userId: code.userId,
      code: code.code,
      type: code.type,
      expiresAt: code.expiresAt,
    });
  }

  async verify2FACode(userId: string, code: string): Promise<boolean> {
    const [validCode] = await db.select().from(twoFactorCodes).where(
      and(
        eq(twoFactorCodes.userId, userId),
        eq(twoFactorCodes.code, code),
        eq(twoFactorCodes.used, false),
        gte(twoFactorCodes.expiresAt, new Date())
      )
    );

    if (validCode) {
      // Mark code as used
      await db.update(twoFactorCodes)
        .set({ used: true })
        .where(eq(twoFactorCodes.id, validCode.id));
      return true;
    }

    return false;
  }

  // Widget preferences methods
  async getUserWidgetPreferences(userId: string): Promise<UserDashboardPreference[]> {
    return await db
      .select()
      .from(userDashboardPreferences)
      .where(eq(userDashboardPreferences.userId, userId))
      .orderBy(userDashboardPreferences.position);
  }

  async createWidgetPreference(preference: InsertUserDashboardPreference): Promise<UserDashboardPreference> {
    const [created] = await db
      .insert(userDashboardPreferences)
      .values(preference)
      .returning();
    return created;
  }

  async updateWidgetPreference(id: number, updates: Partial<InsertUserDashboardPreference>): Promise<UserDashboardPreference | undefined> {
    const [updated] = await db
      .update(userDashboardPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userDashboardPreferences.id, id))
      .returning();
    return updated;
  }

  async deleteWidgetPreference(id: number): Promise<boolean> {
    const result = await db
      .delete(userDashboardPreferences)
      .where(eq(userDashboardPreferences.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Agent-Merchant associations implementation
  async getAgentMerchants(agentId: number): Promise<Merchant[]> {
    const result = await db
      .select({
        id: merchants.id,
        businessName: merchants.businessName,
        businessType: merchants.businessType,
        email: merchants.email,
        phone: merchants.phone,
        agentId: merchants.agentId,
        processingFee: merchants.processingFee,
        status: merchants.status,
        monthlyVolume: merchants.monthlyVolume,
        createdAt: merchants.createdAt,
      })
      .from(merchants)
      .innerJoin(agentMerchants, eq(merchants.id, agentMerchants.merchantId))
      .where(eq(agentMerchants.agentId, agentId));
    
    return result;
  }

  async getMerchantAgents(merchantId: number): Promise<Agent[]> {
    const result = await db
      .select({
        id: agents.id,
        firstName: agents.firstName,
        lastName: agents.lastName,
        email: agents.email,
        phone: agents.phone,
        territory: agents.territory,
        commissionRate: agents.commissionRate,
        status: agents.status,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .innerJoin(agentMerchants, eq(agents.id, agentMerchants.agentId))
      .where(eq(agentMerchants.merchantId, merchantId));
    
    return result;
  }

  async assignAgentToMerchant(agentId: number, merchantId: number, assignedBy: string): Promise<AgentMerchant> {
    const [result] = await db
      .insert(agentMerchants)
      .values({
        agentId,
        merchantId,
        assignedBy
      })
      .returning();
    
    return result;
  }

  async unassignAgentFromMerchant(agentId: number, merchantId: number): Promise<boolean> {
    const result = await db
      .delete(agentMerchants)
      .where(and(
        eq(agentMerchants.agentId, agentId),
        eq(agentMerchants.merchantId, merchantId)
      ));
    
    return (result.rowCount || 0) > 0;
  }

  // Location operations
  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location || undefined;
  }

  async getLocationsByMerchant(merchantId: number): Promise<LocationWithAddresses[]> {
    const result = await db
      .select({
        location: locations,
        address: addresses
      })
      .from(locations)
      .leftJoin(addresses, eq(locations.id, addresses.locationId))
      .where(eq(locations.merchantId, merchantId));

    const locationMap = new Map<number, LocationWithAddresses>();
    
    result.forEach(row => {
      if (!locationMap.has(row.location.id)) {
        locationMap.set(row.location.id, {
          ...row.location,
          addresses: []
        });
      }
      
      if (row.address) {
        locationMap.get(row.location.id)!.addresses.push(row.address);
      }
    });

    return Array.from(locationMap.values());
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const [location] = await db
      .insert(locations)
      .values(insertLocation)
      .returning();
    return location;
  }

  async updateLocation(id: number, updates: Partial<InsertLocation>): Promise<Location | undefined> {
    const [updated] = await db
      .update(locations)
      .set(updates)
      .where(eq(locations.id, id))
      .returning();
    return updated;
  }

  async deleteLocation(id: number): Promise<boolean> {
    const result = await db
      .delete(locations)
      .where(eq(locations.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Address operations
  async getAddress(id: number): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address || undefined;
  }

  async getAddressesByLocation(locationId: number): Promise<Address[]> {
    return await db.select().from(addresses).where(eq(addresses.locationId, locationId));
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const [address] = await db
      .insert(addresses)
      .values(insertAddress)
      .returning();
    return address;
  }

  async updateAddress(id: number, updates: Partial<InsertAddress>): Promise<Address | undefined> {
    const [updated] = await db
      .update(addresses)
      .set(updates)
      .where(eq(addresses.id, id))
      .returning();
    return updated;
  }

  async deleteAddress(id: number): Promise<boolean> {
    const result = await db
      .delete(addresses)
      .where(eq(addresses.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getMerchantsForUser(userId: string): Promise<MerchantWithAgent[]> {
    // Get user to check their role
    const user = await this.getUser(userId);
    if (!user) return [];

    // If user is admin/corporate/super_admin, return all merchants
    if (['admin', 'corporate', 'super_admin'].includes(user.role)) {
      return this.getAllMerchants();
    }

    // If user is agent, return only assigned merchants
    if (user.role === 'agent') {
      // Find agent by user email
      const agent = await this.getAgentByEmail(user.email);
      if (!agent) return [];
      
      return this.getAgentMerchants(agent.id).then(merchants => 
        merchants.map(merchant => ({ ...merchant, agent }))
      );
    }

    // If user is merchant, return only their own merchant profile
    if (user.role === 'merchant') {
      const merchant = await this.getMerchantByEmail(user.email);
      return merchant ? [merchant] : [];
    }

    return [];
  }

  async getTransactionsForUser(userId: string): Promise<TransactionWithMerchant[]> {
    // Get user to check their role
    const user = await this.getUser(userId);
    if (!user) return [];

    // If user is admin/corporate/super_admin, return all transactions
    if (['admin', 'corporate', 'super_admin'].includes(user.role)) {
      return this.getAllTransactions();
    }

    // If user is agent, return transactions for assigned merchants only
    if (user.role === 'agent') {
      const agent = await this.getAgentByEmail(user.email);
      if (!agent) return [];
      
      const assignedMerchants = await this.getAgentMerchants(agent.id);
      const merchantIds = assignedMerchants.map(m => m.id);
      
      if (merchantIds.length === 0) return [];

      const result = await db
        .select({
          id: transactions.id,
          transactionId: transactions.transactionId,
          merchantId: transactions.merchantId,
          amount: transactions.amount,
          paymentMethod: transactions.paymentMethod,
          status: transactions.status,
          processingFee: transactions.processingFee,
          netAmount: transactions.netAmount,
          createdAt: transactions.createdAt,
          merchant: {
            id: merchants.id,
            businessName: merchants.businessName,
            businessType: merchants.businessType,
            email: merchants.email,
            phone: merchants.phone,
            agentId: merchants.agentId,
            processingFee: merchants.processingFee,
            status: merchants.status,
            monthlyVolume: merchants.monthlyVolume,
            createdAt: merchants.createdAt,
          }
        })
        .from(transactions)
        .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
        .where(eq(transactions.merchantId, merchantIds[0])); // Start with first merchant

      return result.map(row => ({
        ...row,
        merchant: row.merchant || undefined
      }));
    }

    // If user is merchant, return only their transactions
    if (user.role === 'merchant') {
      const merchant = await this.getMerchantByEmail(user.email);
      if (!merchant) return [];
      
      return this.getTransactionsByMerchant(merchant.id);
    }

    return [];
  }

  async getLocationRevenue(locationId: number): Promise<{
    totalRevenue: string;
    last24Hours: string;
    monthToDate: string;
    yearToDate: string;
  }> {
    // Get location to find its MID
    const location = await this.getLocation(locationId);
    if (!location || !location.mid) {
      return {
        totalRevenue: "0.00",
        last24Hours: "0.00",
        monthToDate: "0.00",
        yearToDate: "0.00"
      };
    }

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Get all completed transactions for this location's MID
    const allTransactions = await db
      .select({
        amount: transactions.amount,
        createdAt: transactions.createdAt
      })
      .from(transactions)
      .where(and(
        eq(transactions.mid, location.mid),
        eq(transactions.status, 'completed')
      ));

    // Calculate revenue metrics
    let totalRevenue = 0;
    let last24Hours = 0;
    let monthToDate = 0;
    let yearToDate = 0;

    allTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount);
      totalRevenue += amount;

      if (tx.createdAt && tx.createdAt >= yesterday) {
        last24Hours += amount;
      }

      if (tx.createdAt && tx.createdAt >= monthStart) {
        monthToDate += amount;
      }

      if (tx.createdAt && tx.createdAt >= yearStart) {
        yearToDate += amount;
      }
    });

    return {
      totalRevenue: totalRevenue.toFixed(2),
      last24Hours: last24Hours.toFixed(2),
      monthToDate: monthToDate.toFixed(2),
      yearToDate: yearToDate.toFixed(2)
    };
  }
}

export const storage = new DatabaseStorage();