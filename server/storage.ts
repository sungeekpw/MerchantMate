import { merchants, agents, transactions, users, loginAttempts, twoFactorCodes, userDashboardPreferences, agentMerchants, locations, addresses, pdfForms, pdfFormFields, pdfFormSubmissions, merchantProspects, prospectOwners, prospectSignatures, feeGroups, feeItemGroups, feeItems, pricingTypes, pricingTypeFeeItems, campaigns, campaignFeeValues, campaignAssignments, equipmentItems, campaignEquipment, apiKeys, apiRequestLogs, type Merchant, type Agent, type Transaction, type User, type InsertMerchant, type InsertAgent, type InsertTransaction, type UpsertUser, type MerchantWithAgent, type TransactionWithMerchant, type LoginAttempt, type TwoFactorCode, type UserDashboardPreference, type InsertUserDashboardPreference, type AgentMerchant, type InsertAgentMerchant, type Location, type InsertLocation, type Address, type InsertAddress, type LocationWithAddresses, type MerchantWithLocations, type PdfForm, type InsertPdfForm, type PdfFormField, type InsertPdfFormField, type PdfFormSubmission, type InsertPdfFormSubmission, type PdfFormWithFields, type MerchantProspect, type InsertMerchantProspect, type MerchantProspectWithAgent, type ProspectOwner, type InsertProspectOwner, type ProspectSignature, type InsertProspectSignature, type FeeGroup, type InsertFeeGroup, type FeeItemGroup, type InsertFeeItemGroup, type FeeItem, type InsertFeeItem, type PricingType, type InsertPricingType, type PricingTypeFeeItem, type InsertPricingTypeFeeItem, type Campaign, type InsertCampaign, type CampaignFeeValue, type InsertCampaignFeeValue, type CampaignAssignment, type InsertCampaignAssignment, type EquipmentItem, type InsertEquipmentItem, type CampaignEquipment, type InsertCampaignEquipment, type FeeGroupWithItems, type FeeItemGroupWithItems, type FeeGroupWithItemGroups, type PricingTypeWithFeeItems, type CampaignWithDetails, type ApiKey, type InsertApiKey, type ApiRequestLog, type InsertApiRequestLog } from "@shared/schema";
import { db } from "./db";
import { eq, or, and, gte, sql, desc, inArray, like, ilike } from "drizzle-orm";

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

  // Merchant Prospect operations
  getMerchantProspect(id: number): Promise<MerchantProspect | undefined>;
  getMerchantProspectByEmail(email: string): Promise<MerchantProspect | undefined>;
  getMerchantProspectByToken(token: string): Promise<MerchantProspect | undefined>;
  getAllMerchantProspects(): Promise<MerchantProspectWithAgent[]>;
  getProspectsByAgent(agentId: number): Promise<MerchantProspectWithAgent[]>;
  createMerchantProspect(prospect: InsertMerchantProspect): Promise<MerchantProspect>;
  updateMerchantProspect(id: number, updates: Partial<MerchantProspect>): Promise<MerchantProspect | undefined>;
  deleteMerchantProspect(id: number): Promise<boolean>;
  searchMerchantProspects(query: string): Promise<MerchantProspectWithAgent[]>;

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

  // PDF Form operations
  getPdfForm(id: number): Promise<PdfForm | undefined>;
  getPdfFormWithFields(id: number): Promise<PdfFormWithFields | undefined>;
  getAllPdfForms(userId?: string): Promise<PdfForm[]>;
  createPdfForm(form: InsertPdfForm): Promise<PdfForm>;
  updatePdfForm(id: number, updates: Partial<InsertPdfForm>): Promise<PdfForm | undefined>;
  deletePdfForm(id: number): Promise<boolean>;
  
  // PDF Form Field operations
  createPdfFormField(field: InsertPdfFormField): Promise<PdfFormField>;
  updatePdfFormField(id: number, updates: Partial<InsertPdfFormField>): Promise<PdfFormField | undefined>;
  deletePdfFormField(id: number): Promise<boolean>;
  getPdfFormFields(formId: number): Promise<PdfFormField[]>;
  
  // PDF Form Submission operations
  createPdfFormSubmission(submission: InsertPdfFormSubmission): Promise<PdfFormSubmission>;
  getPdfFormSubmissions(formId: number): Promise<PdfFormSubmission[]>;
  getPdfFormSubmission(id: number): Promise<PdfFormSubmission | undefined>;

  // Prospect Owner operations
  createProspectOwner(owner: InsertProspectOwner): Promise<ProspectOwner>;
  getProspectOwners(prospectId: number): Promise<ProspectOwner[]>;
  getProspectOwnerByToken(token: string): Promise<ProspectOwner | undefined>;
  updateProspectOwner(id: number, updates: Partial<ProspectOwner>): Promise<ProspectOwner | undefined>;
  deleteProspectOwners(prospectId: number): Promise<boolean>;

  // Prospect Signature operations
  createProspectSignature(signature: InsertProspectSignature): Promise<ProspectSignature>;
  getProspectSignature(token: string): Promise<ProspectSignature | undefined>;
  getProspectSignaturesByOwnerEmail(email: string): Promise<ProspectSignature[]>;
  getProspectSignaturesByProspect(prospectId: number): Promise<ProspectSignature[]>;
  getProspectOwnerBySignatureToken(token: string): Promise<ProspectOwner | undefined>;
  getProspectOwnerByEmailAndProspectId(email: string, prospectId: number): Promise<ProspectOwner | undefined>;

  // Admin operations
  clearAllProspectData(): Promise<void>;

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
  
  // Bulk location revenue for multiple locations
  getMultipleLocationRevenue(locationIds: number[]): Promise<Record<number, {
    totalRevenue: string;
    last24Hours: string;
    monthToDate: string;
    yearToDate: string;
  }>>;

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

  // Merchant Prospect operations
  getMerchantProspect(id: number): Promise<MerchantProspect | undefined>;
  getMerchantProspectByEmail(email: string): Promise<MerchantProspect | undefined>;
  getMerchantProspectByToken(token: string): Promise<MerchantProspect | undefined>;
  getAllMerchantProspects(): Promise<MerchantProspectWithAgent[]>;
  getProspectsByAgent(agentId: number): Promise<MerchantProspectWithAgent[]>;
  createMerchantProspect(prospect: InsertMerchantProspect): Promise<MerchantProspect>;
  updateMerchantProspect(id: number, updates: Partial<MerchantProspect>): Promise<MerchantProspect | undefined>;
  deleteMerchantProspect(id: number): Promise<boolean>;
  searchMerchantProspects(query: string): Promise<MerchantProspectWithAgent[]>;

  // Campaign Management operations
  // Fee Groups
  getAllFeeGroups(): Promise<FeeGroupWithItems[]>;
  getFeeGroup(id: number): Promise<FeeGroup | undefined>;
  getFeeGroupWithItemGroups(id: number): Promise<FeeGroupWithItemGroups | undefined>;
  createFeeGroup(feeGroup: InsertFeeGroup): Promise<FeeGroup>;
  updateFeeGroup(id: number, updates: Partial<InsertFeeGroup>): Promise<FeeGroup | undefined>;
  
  // Fee Item Groups
  getAllFeeItemGroups(): Promise<FeeItemGroup[]>;
  getFeeItemGroup(id: number): Promise<FeeItemGroup | undefined>;
  getFeeItemGroupsByFeeGroup(feeGroupId: number): Promise<FeeItemGroup[]>;
  getFeeItemGroupWithItems(id: number): Promise<FeeItemGroupWithItems | undefined>;
  createFeeItemGroup(feeItemGroup: InsertFeeItemGroup): Promise<FeeItemGroup>;
  updateFeeItemGroup(id: number, updates: Partial<InsertFeeItemGroup>): Promise<FeeItemGroup | undefined>;
  deleteFeeItemGroup(id: number): Promise<boolean>;
  
  // Fee Items
  getAllFeeItems(): Promise<FeeItem[]>;
  getFeeItem(id: number): Promise<FeeItem | undefined>;
  getFeeItemsByGroup(feeGroupId: number): Promise<FeeItem[]>;
  createFeeItem(feeItem: InsertFeeItem): Promise<FeeItem>;
  updateFeeItem(id: number, updates: Partial<InsertFeeItem>): Promise<FeeItem | undefined>;
  searchFeeItems(query: string): Promise<FeeItem[]>;
  
  // Pricing Types
  getAllPricingTypes(): Promise<PricingType[]>;
  getPricingType(id: number): Promise<PricingType | undefined>;
  getPricingTypeWithFeeItems(id: number): Promise<PricingTypeWithFeeItems | undefined>;
  createPricingType(pricingType: InsertPricingType): Promise<PricingType>;
  updatePricingType(id: number, updates: Partial<InsertPricingType>): Promise<PricingType | undefined>;
  addFeeItemToPricingType(pricingTypeId: number, feeItemId: number, isRequired?: boolean): Promise<PricingTypeFeeItem>;
  removeFeeItemFromPricingType(pricingTypeId: number, feeItemId: number): Promise<boolean>;
  searchPricingTypes(query: string): Promise<PricingType[]>;
  
  // Campaigns
  getAllCampaigns(): Promise<CampaignWithDetails[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  getCampaignWithDetails(id: number): Promise<CampaignWithDetails | undefined>;
  getCampaignsByAcquirer(acquirer: string): Promise<CampaignWithDetails[]>;
  createCampaign(campaign: InsertCampaign, feeValues?: InsertCampaignFeeValue[], equipmentIds?: number[]): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<InsertCampaign>, feeValues?: InsertCampaignFeeValue[], equipmentIds?: number[]): Promise<Campaign | undefined>;
  deactivateCampaign(id: number): Promise<boolean>;
  searchCampaigns(query: string): Promise<CampaignWithDetails[]>;
  
  // Campaign Fee Values
  setCampaignFeeValue(campaignId: number, feeItemId: number, value: string): Promise<CampaignFeeValue>;
  getCampaignFeeValues(campaignId: number): Promise<CampaignFeeValue[]>;
  updateCampaignFeeValue(id: number, value: string): Promise<CampaignFeeValue | undefined>;
  
  // Campaign Assignments
  assignCampaignToProspect(campaignId: number, prospectId: number, assignedBy: string): Promise<CampaignAssignment>;
  getCampaignAssignments(campaignId: number): Promise<CampaignAssignment[]>;
  getProspectCampaignAssignment(prospectId: number): Promise<CampaignAssignment | undefined>;

  // Equipment Items
  getAllEquipmentItems(): Promise<EquipmentItem[]>;
  getEquipmentItem(id: number): Promise<EquipmentItem | undefined>;
  createEquipmentItem(equipmentItem: InsertEquipmentItem): Promise<EquipmentItem>;
  updateEquipmentItem(id: number, updates: Partial<InsertEquipmentItem>): Promise<EquipmentItem | undefined>;
  deleteEquipmentItem(id: number): Promise<boolean>;

  // Campaign Equipment
  getCampaignEquipment(campaignId: number): Promise<(CampaignEquipment & { equipmentItem: EquipmentItem })[]>;
  addEquipmentToCampaign(campaignId: number, equipmentItemId: number, isRequired?: boolean, displayOrder?: number): Promise<CampaignEquipment>;
  removeEquipmentFromCampaign(campaignId: number, equipmentItemId: number): Promise<boolean>;
  updateCampaignEquipment(campaignId: number, equipmentItemId: number, updates: Partial<InsertCampaignEquipment>): Promise<CampaignEquipment | undefined>;

  // API Key operations
  getAllApiKeys(): Promise<ApiKey[]>;
  getApiKey(id: number): Promise<ApiKey | undefined>;
  getApiKeyByKeyId(keyId: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: number, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  updateApiKeyLastUsed(id: number): Promise<void>;
  deleteApiKey(id: number): Promise<boolean>;
  
  // API Request Log operations
  createApiRequestLog(log: InsertApiRequestLog): Promise<ApiRequestLog>;
  getApiRequestLogs(apiKeyId?: number, limit?: number): Promise<ApiRequestLog[]>;
  getApiUsageStats(apiKeyId: number, timeRange: string): Promise<{
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    averageResponseTime: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Fee Groups implementation
  async getAllFeeGroups(): Promise<FeeGroupWithItems[]> {
    const groups = await db.select().from(feeGroups).orderBy(feeGroups.displayOrder);
    const result: FeeGroupWithItems[] = [];
    
    for (const group of groups) {
      const groupItems = await db.select().from(feeItems)
        .where(eq(feeItems.feeGroupId, group.id))
        .orderBy(feeItems.displayOrder);
      
      result.push({
        ...group,
        feeItems: groupItems
      });
    }
    
    return result;
  }

  async getFeeGroup(id: number): Promise<FeeGroup | undefined> {
    const [feeGroup] = await db.select().from(feeGroups).where(eq(feeGroups.id, id));
    return feeGroup || undefined;
  }

  async getFeeGroupWithItemGroups(id: number): Promise<FeeGroupWithItemGroups | undefined> {
    const [feeGroup] = await db.select().from(feeGroups).where(eq(feeGroups.id, id));
    if (!feeGroup) return undefined;

    const itemGroups = await db.select().from(feeItemGroups)
      .where(eq(feeItemGroups.feeGroupId, id))
      .orderBy(feeItemGroups.displayOrder);

    const feeItemGroupsWithItems: FeeItemGroupWithItems[] = [];
    for (const itemGroup of itemGroups) {
      const items = await db.select().from(feeItems)
        .where(eq(feeItems.feeItemGroupId, itemGroup.id))
        .orderBy(feeItems.displayOrder);
      
      feeItemGroupsWithItems.push({
        ...itemGroup,
        feeItems: items
      });
    }

    const directItems = await db.select().from(feeItems)
      .where(and(eq(feeItems.feeGroupId, id), eq(feeItems.feeItemGroupId, null)))
      .orderBy(feeItems.displayOrder);

    return {
      ...feeGroup,
      feeItemGroups: feeItemGroupsWithItems,
      feeItems: directItems
    };
  }

  async createFeeGroup(feeGroup: InsertFeeGroup): Promise<FeeGroup> {
    const [created] = await db.insert(feeGroups).values(feeGroup).returning();
    return created;
  }

  async updateFeeGroup(id: number, updates: Partial<InsertFeeGroup>): Promise<FeeGroup | undefined> {
    const [updated] = await db.update(feeGroups).set(updates).where(eq(feeGroups.id, id)).returning();
    return updated || undefined;
  }

  // Fee Item Groups implementation
  async getAllFeeItemGroups(): Promise<FeeItemGroup[]> {
    return await db.select().from(feeItemGroups).orderBy(feeItemGroups.displayOrder);
  }

  async getFeeItemGroup(id: number): Promise<FeeItemGroup | undefined> {
    const [feeItemGroup] = await db.select().from(feeItemGroups).where(eq(feeItemGroups.id, id));
    return feeItemGroup || undefined;
  }

  async getFeeItemGroupsByFeeGroup(feeGroupId: number): Promise<FeeItemGroup[]> {
    return await db.select().from(feeItemGroups)
      .where(eq(feeItemGroups.feeGroupId, feeGroupId))
      .orderBy(feeItemGroups.displayOrder);
  }

  async getFeeItemGroupWithItems(id: number): Promise<FeeItemGroupWithItems | undefined> {
    const [feeItemGroup] = await db.select().from(feeItemGroups).where(eq(feeItemGroups.id, id));
    if (!feeItemGroup) return undefined;

    const items = await db.select().from(feeItems)
      .where(eq(feeItems.feeItemGroupId, id))
      .orderBy(feeItems.displayOrder);

    return {
      ...feeItemGroup,
      feeItems: items
    };
  }

  async createFeeItemGroup(feeItemGroup: InsertFeeItemGroup): Promise<FeeItemGroup> {
    const [created] = await db.insert(feeItemGroups).values(feeItemGroup).returning();
    return created;
  }

  async updateFeeItemGroup(id: number, updates: Partial<InsertFeeItemGroup>): Promise<FeeItemGroup | undefined> {
    const [updated] = await db.update(feeItemGroups).set(updates).where(eq(feeItemGroups.id, id)).returning();
    return updated || undefined;
  }

  async deleteFeeItemGroup(id: number): Promise<boolean> {
    const result = await db.delete(feeItemGroups).where(eq(feeItemGroups.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Fee Items implementation
  async getAllFeeItems(): Promise<FeeItem[]> {
    return await db.select().from(feeItems).orderBy(feeItems.displayOrder);
  }

  async getFeeItem(id: number): Promise<FeeItem | undefined> {
    const [feeItem] = await db.select().from(feeItems).where(eq(feeItems.id, id));
    return feeItem || undefined;
  }

  async getFeeItemsByGroup(feeGroupId: number): Promise<FeeItem[]> {
    return await db.select().from(feeItems).where(eq(feeItems.feeGroupId, feeGroupId)).orderBy(feeItems.displayOrder);
  }

  async createFeeItem(feeItem: InsertFeeItem): Promise<FeeItem> {
    const [created] = await db.insert(feeItems).values(feeItem).returning();
    return created;
  }

  async updateFeeItem(id: number, updates: Partial<InsertFeeItem>): Promise<FeeItem | undefined> {
    const [updated] = await db.update(feeItems).set(updates).where(eq(feeItems.id, id)).returning();
    return updated || undefined;
  }

  async searchFeeItems(query: string): Promise<FeeItem[]> {
    return await db.select().from(feeItems).where(
      or(
        ilike(feeItems.name, `%${query}%`),
        ilike(feeItems.description, `%${query}%`)
      )
    ).orderBy(feeItems.displayOrder);
  }

  // Pricing Types implementation
  async getAllPricingTypes(): Promise<PricingType[]> {
    return await db.select().from(pricingTypes).orderBy(pricingTypes.name);
  }

  async getPricingType(id: number): Promise<PricingType | undefined> {
    const [pricingType] = await db.select().from(pricingTypes).where(eq(pricingTypes.id, id));
    return pricingType || undefined;
  }

  async getPricingTypeWithFeeItems(id: number): Promise<PricingTypeWithFeeItems | undefined> {
    const result = await db
      .select({
        pricingType: pricingTypes,
        pricingTypeFeeItem: pricingTypeFeeItems,
        feeItem: feeItems,
        feeGroup: feeGroups,
      })
      .from(pricingTypes)
      .leftJoin(pricingTypeFeeItems, eq(pricingTypes.id, pricingTypeFeeItems.pricingTypeId))
      .leftJoin(feeItems, eq(pricingTypeFeeItems.feeItemId, feeItems.id))
      .leftJoin(feeGroups, eq(feeItems.feeGroupId, feeGroups.id))
      .where(eq(pricingTypes.id, id));

    if (result.length === 0) return undefined;

    const pricingType = result[0].pricingType;
    const feeItems = result
      .filter(row => row.feeItem)
      .map(row => ({
        ...row.pricingTypeFeeItem!,
        feeItem: {
          ...row.feeItem!,
          feeGroup: row.feeGroup!,
        },
      }));

    return {
      ...pricingType,
      feeItems,
    };
  }

  async createPricingType(pricingType: InsertPricingType): Promise<PricingType> {
    const [created] = await db.insert(pricingTypes).values(pricingType).returning();
    return created;
  }

  async updatePricingType(id: number, updates: Partial<InsertPricingType>): Promise<PricingType | undefined> {
    const [updated] = await db.update(pricingTypes).set(updates).where(eq(pricingTypes.id, id)).returning();
    return updated || undefined;
  }

  async addFeeItemToPricingType(pricingTypeId: number, feeItemId: number, isRequired: boolean = false): Promise<PricingTypeFeeItem> {
    const [created] = await db.insert(pricingTypeFeeItems).values({
      pricingTypeId,
      feeItemId,
      isRequired,
      displayOrder: 1,
    }).returning();
    return created;
  }

  async removeFeeItemFromPricingType(pricingTypeId: number, feeItemId: number): Promise<boolean> {
    const result = await db.delete(pricingTypeFeeItems)
      .where(and(
        eq(pricingTypeFeeItems.pricingTypeId, pricingTypeId),
        eq(pricingTypeFeeItems.feeItemId, feeItemId)
      ));
    return result.rowCount > 0;
  }

  async searchPricingTypes(query: string): Promise<PricingType[]> {
    return await db.select().from(pricingTypes).where(
      or(
        ilike(pricingTypes.name, `%${query}%`),
        ilike(pricingTypes.description, `%${query}%`)
      )
    ).orderBy(pricingTypes.name);
  }

  // Campaigns implementation (removed duplicate - using the simpler one above)

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getCampaignWithDetails(id: number): Promise<CampaignWithDetails | undefined> {
    const result = await db
      .select({
        campaign: campaigns,
        pricingType: pricingTypes,
      })
      .from(campaigns)
      .leftJoin(pricingTypes, eq(campaigns.pricingTypeId, pricingTypes.id))
      .where(eq(campaigns.id, id));

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      ...row.campaign,
      pricingType: row.pricingType || undefined,
      createdByUser: undefined,
    };
  }

  async getCampaignsByAcquirer(acquirer: string): Promise<CampaignWithDetails[]> {
    const result = await db
      .select({
        campaign: campaigns,
        pricingType: pricingTypes,
        createdByUser: users,
      })
      .from(campaigns)
      .leftJoin(pricingTypes, eq(campaigns.pricingTypeId, pricingTypes.id))
      .leftJoin(users, eq(campaigns.createdBy, users.id))
      .where(eq(campaigns.acquirer, acquirer))
      .orderBy(desc(campaigns.createdAt));

    return result.map(row => ({
      ...row.campaign,
      pricingType: row.pricingType!,
      createdByUser: row.createdByUser || undefined,
    }));
  }





  async deactivateCampaign(id: number): Promise<boolean> {
    const result = await db.update(campaigns).set({ isActive: false }).where(eq(campaigns.id, id));
    return result.rowCount > 0;
  }

  async searchCampaigns(query: string): Promise<CampaignWithDetails[]> {
    const result = await db
      .select({
        campaign: campaigns,
        pricingType: pricingTypes,
        createdByUser: users,
      })
      .from(campaigns)
      .leftJoin(pricingTypes, eq(campaigns.pricingTypeId, pricingTypes.id))
      .leftJoin(users, eq(campaigns.createdBy, users.id))
      .where(
        or(
          ilike(campaigns.name, `%${query}%`),
          ilike(campaigns.description, `%${query}%`)
        )
      )
      .orderBy(desc(campaigns.createdAt));

    return result.map(row => ({
      ...row.campaign,
      pricingType: row.pricingType!,
      createdByUser: row.createdByUser || undefined,
    }));
  }

  // Campaign Fee Values implementation
  async setCampaignFeeValue(campaignId: number, feeItemId: number, value: string): Promise<CampaignFeeValue> {
    const [existing] = await db.select().from(campaignFeeValues)
      .where(and(
        eq(campaignFeeValues.campaignId, campaignId),
        eq(campaignFeeValues.feeItemId, feeItemId)
      ));

    if (existing) {
      const [updated] = await db.update(campaignFeeValues)
        .set({ value, updatedAt: new Date() })
        .where(eq(campaignFeeValues.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(campaignFeeValues).values({
        campaignId,
        feeItemId,
        value,
        valueType: 'percentage',
      }).returning();
      return created;
    }
  }

  async getCampaignFeeValues(campaignId: number): Promise<CampaignFeeValue[]> {
    const result = await db
      .select({
        feeValue: campaignFeeValues,
        feeItem: feeItems,
        feeGroup: feeGroups,
      })
      .from(campaignFeeValues)
      .leftJoin(feeItems, eq(campaignFeeValues.feeItemId, feeItems.id))
      .leftJoin(feeGroups, eq(feeItems.feeGroupId, feeGroups.id))
      .where(eq(campaignFeeValues.campaignId, campaignId));

    return result.map(row => ({
      ...row.feeValue,
      feeItem: row.feeItem ? {
        ...row.feeItem,
        feeGroup: row.feeGroup || undefined,
      } : undefined,
    }));
  }

  async updateCampaignFeeValue(id: number, value: string): Promise<CampaignFeeValue | undefined> {
    const [updated] = await db.update(campaignFeeValues)
      .set({ value, updatedAt: new Date() })
      .where(eq(campaignFeeValues.id, id))
      .returning();
    return updated || undefined;
  }

  // Campaign Assignments implementation
  async assignCampaignToProspect(campaignId: number, prospectId: number, assignedBy: string): Promise<CampaignAssignment> {
    const [created] = await db.insert(campaignAssignments).values({
      campaignId,
      prospectId,
      assignedBy,
    }).returning();
    return created;
  }

  async getCampaignAssignments(campaignId: number): Promise<CampaignAssignment[]> {
    return await db.select().from(campaignAssignments).where(eq(campaignAssignments.campaignId, campaignId));
  }

  async getProspectCampaignAssignment(prospectId: number): Promise<CampaignAssignment | undefined> {
    const [assignment] = await db.select().from(campaignAssignments).where(eq(campaignAssignments.prospectId, prospectId));
    return assignment || undefined;
  }

  // Equipment Items implementation
  async getAllEquipmentItems(): Promise<EquipmentItem[]> {
    return await db.select().from(equipmentItems).where(eq(equipmentItems.isActive, true)).orderBy(equipmentItems.name);
  }

  async getEquipmentItem(id: number): Promise<EquipmentItem | undefined> {
    const [item] = await db.select().from(equipmentItems).where(eq(equipmentItems.id, id));
    return item || undefined;
  }

  async createEquipmentItem(equipmentItem: InsertEquipmentItem): Promise<EquipmentItem> {
    const [created] = await db.insert(equipmentItems).values(equipmentItem).returning();
    return created;
  }

  async updateEquipmentItem(id: number, updates: Partial<InsertEquipmentItem>): Promise<EquipmentItem | undefined> {
    const [updated] = await db.update(equipmentItems).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(equipmentItems.id, id)).returning();
    return updated || undefined;
  }

  async deleteEquipmentItem(id: number): Promise<boolean> {
    const result = await db.update(equipmentItems).set({ isActive: false }).where(eq(equipmentItems.id, id));
    return result.rowCount > 0;
  }

  // Campaign Equipment implementation
  async getCampaignEquipment(campaignId: number): Promise<(CampaignEquipment & { equipmentItem: EquipmentItem })[]> {
    const result = await db
      .select({
        campaignEquipment: campaignEquipment,
        equipmentItem: equipmentItems,
      })
      .from(campaignEquipment)
      .innerJoin(equipmentItems, eq(campaignEquipment.equipmentItemId, equipmentItems.id))
      .where(eq(campaignEquipment.campaignId, campaignId))
      .orderBy(campaignEquipment.displayOrder);

    return result.map(row => ({
      ...row.campaignEquipment,
      equipmentItem: row.equipmentItem,
    }));
  }

  async addEquipmentToCampaign(campaignId: number, equipmentItemId: number, isRequired: boolean = false, displayOrder: number = 0): Promise<CampaignEquipment> {
    const [created] = await db.insert(campaignEquipment).values({
      campaignId,
      equipmentItemId,
      isRequired,
      displayOrder,
    }).returning();
    return created;
  }

  async removeEquipmentFromCampaign(campaignId: number, equipmentItemId: number): Promise<boolean> {
    const result = await db.delete(campaignEquipment)
      .where(and(
        eq(campaignEquipment.campaignId, campaignId),
        eq(campaignEquipment.equipmentItemId, equipmentItemId)
      ));
    return result.rowCount > 0;
  }

  async updateCampaignEquipment(campaignId: number, equipmentItemId: number, updates: Partial<InsertCampaignEquipment>): Promise<CampaignEquipment | undefined> {
    const [updated] = await db.update(campaignEquipment)
      .set(updates)
      .where(and(
        eq(campaignEquipment.campaignId, campaignId),
        eq(campaignEquipment.equipmentItemId, equipmentItemId)
      ))
      .returning();
    return updated || undefined;
  }
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
        id: transactions.id,
        transactionId: transactions.transactionId,
        merchantId: transactions.merchantId,
        mid: transactions.mid,
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
      .orderBy(transactions.createdAt);

    return result.map(row => ({
      ...row,
      merchant: row.merchant?.id ? row.merchant : undefined,
    }));
  }

  async getTransactionsByMerchant(merchantId: number): Promise<TransactionWithMerchant[]> {
    const result = await db
      .select({
        id: transactions.id,
        transactionId: transactions.transactionId,
        merchantId: transactions.merchantId,
        mid: transactions.mid,
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
      .where(eq(transactions.merchantId, merchantId));

    return result.map(row => ({
      ...row,
      merchant: row.merchant?.id ? row.merchant : undefined,
    }));
  }

  async getTransactionsByMID(mid: string): Promise<TransactionWithMerchant[]> {
    const result = await db
      .select({
        id: transactions.id,
        transactionId: transactions.transactionId,
        merchantId: transactions.merchantId,
        mid: transactions.mid,
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
      .where(eq(transactions.mid, mid));

    return result.map(row => ({
      ...row,
      merchant: row.merchant?.id ? row.merchant : undefined,
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
          mid: transactions.mid,
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
        .where(inArray(transactions.merchantId, merchantIds))
        .orderBy(desc(transactions.createdAt));

      return result.map(row => ({
        ...row,
        merchant: row.merchant || undefined
      }));
    }

    // If user is merchant, return only transactions for their location MIDs
    if (user.role === 'merchant') {
      const merchant = await this.getMerchantByEmail(user.email);
      if (!merchant) {
        return [];
      }
      
      // Get all locations for this merchant to find their MIDs
      const locations = await this.getLocationsByMerchant(merchant.id);
      const mids = locations.map(loc => loc.mid).filter(mid => mid !== null);
      
      if (mids.length === 0) {
        return [];
      }
      
      // Get transactions for these specific MIDs
      const result = await db
        .select({
          id: transactions.id,
          transactionId: transactions.transactionId,
          merchantId: transactions.merchantId,
          mid: transactions.mid,
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
        .where(inArray(transactions.mid, mids))
        .orderBy(desc(transactions.createdAt));

      return result.map(row => ({
        ...row,
        merchant: row.merchant || undefined
      }));
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

  async getMultipleLocationRevenue(locationIds: number[]): Promise<Record<number, {
    totalRevenue: string;
    last24Hours: string;
    monthToDate: string;
    yearToDate: string;
  }>> {
    if (locationIds.length === 0) return {};

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Get all locations with their MIDs
    const locationsWithMids = await db
      .select({
        id: locations.id,
        mid: locations.mid
      })
      .from(locations)
      .where(sql`${locations.id} = ANY(${locationIds})`);

    // Get all transactions for these MIDs
    const mids = locationsWithMids.map(loc => loc.mid).filter(mid => mid !== null);
    
    const allTransactions = await db
      .select({
        amount: transactions.amount,
        createdAt: transactions.createdAt,
        mid: transactions.mid
      })
      .from(transactions)
      .where(and(
        sql`${transactions.mid} = ANY(${mids})`,
        eq(transactions.status, 'completed')
      ));

    // Create MID to location ID mapping
    const midToLocationId = new Map<string, number>();
    locationsWithMids.forEach(loc => {
      if (loc.mid) {
        midToLocationId.set(loc.mid, loc.id);
      }
    });

    // Group transactions by location ID
    const locationTransactions: Record<number, Array<{ amount: string; createdAt: Date | null }>> = {};
    
    allTransactions.forEach(transaction => {
      if (transaction.mid) {
        const locationId = midToLocationId.get(transaction.mid);
        if (locationId) {
          if (!locationTransactions[locationId]) {
            locationTransactions[locationId] = [];
          }
          locationTransactions[locationId].push({
            amount: transaction.amount,
            createdAt: transaction.createdAt
          });
        }
      }
    });

    // Calculate revenue for each location
    const result: Record<number, {
      totalRevenue: string;
      last24Hours: string;
      monthToDate: string;
      yearToDate: string;
    }> = {};

    locationIds.forEach(locationId => {
      const transactions = locationTransactions[locationId] || [];
      
      let totalRevenue = 0;
      let last24Hours = 0;
      let monthToDate = 0;
      let yearToDate = 0;

      transactions.forEach(tx => {
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

      result[locationId] = {
        totalRevenue: totalRevenue.toFixed(2),
        last24Hours: last24Hours.toFixed(2),
        monthToDate: monthToDate.toFixed(2),
        yearToDate: yearToDate.toFixed(2)
      };
    });

    return result;
  }

  async getDashboardRevenue(timeRange: string): Promise<{
    current: string;
    daily: string;
    weekly: string;
    monthly: string;
    change?: number;
  }> {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const currentPeriodTransactions = await db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(and(
        gte(transactions.createdAt, startDate),
        eq(transactions.status, 'completed')
      ));

    const currentRevenue = currentPeriodTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    
    return {
      current: currentRevenue.toFixed(2),
      daily: (currentRevenue / 30).toFixed(2),
      weekly: (currentRevenue / 4).toFixed(2),
      monthly: currentRevenue.toFixed(2),
      change: Math.random() > 0.5 ? Math.floor(Math.random() * 20) : -Math.floor(Math.random() * 10)
    };
  }

  async getTopLocations(limit: number, sortBy: string): Promise<any[]> {
    const locationsWithRevenue = await db
      .select({
        id: locations.id,
        name: locations.name,
        mid: locations.mid
      })
      .from(locations)
      .limit(limit);

    const results = [];
    for (const location of locationsWithRevenue) {
      if (location.mid) {
        const locationTransactions = await db
          .select({ amount: transactions.amount })
          .from(transactions)
          .where(and(
            eq(transactions.mid, location.mid),
            eq(transactions.status, 'completed')
          ));

        const revenue = locationTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        
        results.push({
          id: location.id,
          name: location.name,
          revenue: revenue.toFixed(2),
          trend: Math.random() > 0.5 ? Math.floor(Math.random() * 15) : -Math.floor(Math.random() * 5)
        });
      }
    }

    return results.sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue));
  }

  async getRecentActivity(): Promise<any[]> {
    const recentTransactions = await db
      .select({
        transactionId: transactions.transactionId,
        amount: transactions.amount,
        paymentMethod: transactions.paymentMethod,
        createdAt: transactions.createdAt
      })
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    return recentTransactions.map(tx => ({
      description: `Payment of $${tx.amount} via ${tx.paymentMethod}`,
      time: tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'Unknown'
    }));
  }

  async getAssignedMerchants(limit: number): Promise<any[]> {
    return await db
      .select({
        id: merchants.id,
        businessName: merchants.businessName,
        businessType: merchants.businessType,
        status: merchants.status
      })
      .from(merchants)
      .where(eq(merchants.status, 'active'))
      .limit(limit);
  }

  async getSystemOverview(): Promise<{
    uptime: string;
    activeUsers: number;
    alerts?: any[];
  }> {
    const activeUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.status, 'active'));

    return {
      uptime: "99.9%",
      activeUsers: activeUsers[0]?.count || 0,
      alerts: [
        { message: "System performance normal", severity: "low" },
        { message: "Database optimization recommended", severity: "medium" }
      ]
    };
  }

  // PDF Form operations
  async getPdfForm(id: number): Promise<PdfForm | undefined> {
    const [form] = await db.select().from(pdfForms).where(eq(pdfForms.id, id));
    return form || undefined;
  }

  async getPdfFormWithFields(id: number): Promise<PdfFormWithFields | undefined> {
    const form = await this.getPdfForm(id);
    if (!form) return undefined;

    const fields = await this.getPdfFormFields(id);
    return { ...form, fields };
  }

  async getAllPdfForms(userId?: string): Promise<PdfForm[]> {
    if (userId) {
      return await db.select().from(pdfForms).where(eq(pdfForms.uploadedBy, userId));
    }
    return await db.select().from(pdfForms);
  }

  async createPdfForm(insertForm: InsertPdfForm): Promise<PdfForm> {
    const [form] = await db.insert(pdfForms).values(insertForm).returning();
    return form;
  }

  async updatePdfForm(id: number, updates: Partial<InsertPdfForm>): Promise<PdfForm | undefined> {
    const [form] = await db
      .update(pdfForms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pdfForms.id, id))
      .returning();
    return form || undefined;
  }

  async deletePdfForm(id: number): Promise<boolean> {
    const result = await db.delete(pdfForms).where(eq(pdfForms.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // PDF Form Field operations
  async createPdfFormField(insertField: InsertPdfFormField): Promise<PdfFormField> {
    const [field] = await db.insert(pdfFormFields).values(insertField).returning();
    return field;
  }

  async updatePdfFormField(id: number, updates: Partial<InsertPdfFormField>): Promise<PdfFormField | undefined> {
    const [field] = await db
      .update(pdfFormFields)
      .set(updates)
      .where(eq(pdfFormFields.id, id))
      .returning();
    return field || undefined;
  }

  async deletePdfFormField(id: number): Promise<boolean> {
    const result = await db.delete(pdfFormFields).where(eq(pdfFormFields.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getPdfFormFields(formId: number): Promise<PdfFormField[]> {
    return await db
      .select()
      .from(pdfFormFields)
      .where(eq(pdfFormFields.formId, formId))
      .orderBy(pdfFormFields.position);
  }

  // Helper to generate unique submission token
  generateSubmissionToken(): string {
    return 'sub_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // PDF Form Submission operations
  async createPdfFormSubmission(insertSubmission: InsertPdfFormSubmission): Promise<PdfFormSubmission> {
    // Generate unique token if not provided
    if (!insertSubmission.submissionToken) {
      insertSubmission.submissionToken = this.generateSubmissionToken();
    }
    
    const [submission] = await db.insert(pdfFormSubmissions).values(insertSubmission).returning();
    return submission;
  }

  async getPdfFormSubmissionByToken(token: string): Promise<PdfFormSubmission | undefined> {
    const [submission] = await db.select().from(pdfFormSubmissions).where(eq(pdfFormSubmissions.submissionToken, token));
    return submission || undefined;
  }

  async updatePdfFormSubmissionByToken(token: string, updateData: any): Promise<PdfFormSubmission | undefined> {
    const [submission] = await db
      .update(pdfFormSubmissions)
      .set(updateData)
      .where(eq(pdfFormSubmissions.submissionToken, token))
      .returning();
    return submission || undefined;
  }

  async getPdfFormSubmissions(formId: number): Promise<PdfFormSubmission[]> {
    return await db
      .select()
      .from(pdfFormSubmissions)
      .where(eq(pdfFormSubmissions.formId, formId))
      .orderBy(desc(pdfFormSubmissions.createdAt));
  }

  async getPdfFormSubmission(id: number): Promise<PdfFormSubmission | undefined> {
    const [submission] = await db.select().from(pdfFormSubmissions).where(eq(pdfFormSubmissions.id, id));
    return submission || undefined;
  }

  // Merchant Prospect operations
  async getMerchantProspect(id: number): Promise<MerchantProspect | undefined> {
    const [prospect] = await db.select().from(merchantProspects).where(eq(merchantProspects.id, id));
    return prospect || undefined;
  }

  async getMerchantProspectByEmail(email: string): Promise<MerchantProspect | undefined> {
    const [prospect] = await db.select().from(merchantProspects).where(eq(merchantProspects.email, email));
    return prospect || undefined;
  }

  async getMerchantProspectByToken(token: string): Promise<MerchantProspect | undefined> {
    const [prospect] = await db.select().from(merchantProspects).where(eq(merchantProspects.validationToken, token));
    return prospect || undefined;
  }

  async getAllMerchantProspects(): Promise<MerchantProspectWithAgent[]> {
    const result = await db
      .select({
        prospect: merchantProspects,
        agent: agents,
      })
      .from(merchantProspects)
      .leftJoin(agents, eq(merchantProspects.agentId, agents.id))
      .orderBy(desc(merchantProspects.createdAt));

    return result.map(row => ({
      ...row.prospect,
      agent: row.agent || undefined,
    }));
  }

  async getProspectsByAgent(agentId: number): Promise<MerchantProspectWithAgent[]> {
    const result = await db
      .select({
        prospect: merchantProspects,
        agent: agents,
      })
      .from(merchantProspects)
      .leftJoin(agents, eq(merchantProspects.agentId, agents.id))
      .where(eq(merchantProspects.agentId, agentId))
      .orderBy(desc(merchantProspects.createdAt));

    return result.map(row => ({
      ...row.prospect,
      agent: row.agent || undefined,
    }));
  }

  async createMerchantProspect(prospect: InsertMerchantProspect): Promise<MerchantProspect> {
    // Generate validation token
    const validationToken = 'prospect_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const [newProspect] = await db
      .insert(merchantProspects)
      .values({
        ...prospect,
        validationToken,
        updatedAt: new Date(),
      })
      .returning();
    
    return newProspect;
  }

  async updateMerchantProspect(id: number, updates: Partial<MerchantProspect>): Promise<MerchantProspect | undefined> {
    const [prospect] = await db
      .update(merchantProspects)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(merchantProspects.id, id))
      .returning();
    
    return prospect || undefined;
  }

  async deleteMerchantProspect(id: number): Promise<boolean> {
    const result = await db.delete(merchantProspects).where(eq(merchantProspects.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchMerchantProspects(query: string): Promise<MerchantProspectWithAgent[]> {
    const result = await db
      .select({
        prospect: merchantProspects,
        agent: agents,
      })
      .from(merchantProspects)
      .leftJoin(agents, eq(merchantProspects.agentId, agents.id));

    // Filter results in memory for now - can be optimized with SQL LIKE
    return result
      .map(row => ({
        ...row.prospect,
        agent: row.agent || undefined,
      }))
      .filter(prospect => 
        prospect.firstName.toLowerCase().includes(query.toLowerCase()) ||
        prospect.lastName.toLowerCase().includes(query.toLowerCase()) ||
        prospect.email.toLowerCase().includes(query.toLowerCase()) ||
        prospect.status.toLowerCase().includes(query.toLowerCase())
      );
  }

  async getMerchantProspectsByAgent(agentId: number): Promise<MerchantProspectWithAgent[]> {
    const result = await db
      .select({
        prospect: merchantProspects,
        agent: agents,
      })
      .from(merchantProspects)
      .leftJoin(agents, eq(merchantProspects.agentId, agents.id))
      .where(eq(merchantProspects.agentId, agentId))
      .orderBy(desc(merchantProspects.createdAt));

    return result.map(({ prospect, agent }) => ({
      ...prospect,
      agent: agent || undefined,
    }));
  }

  async searchMerchantProspectsByAgent(agentId: number, query: string): Promise<MerchantProspectWithAgent[]> {
    const result = await db
      .select({
        prospect: merchantProspects,
        agent: agents,
      })
      .from(merchantProspects)
      .leftJoin(agents, eq(merchantProspects.agentId, agents.id))
      .where(
        and(
          eq(merchantProspects.agentId, agentId),
          or(
            like(merchantProspects.firstName, `%${query}%`),
            like(merchantProspects.lastName, `%${query}%`),
            like(merchantProspects.email, `%${query}%`)
          )
        )
      )
      .orderBy(desc(merchantProspects.createdAt));

    return result.map(({ prospect, agent }) => ({
      ...prospect,
      agent: agent || undefined,
    }));
  }

  async getAgentByUserId(userId: string): Promise<Agent | undefined> {
    // First get the user to find their email
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Then find the agent by email
    return this.getAgentByEmail(user.email);
  }

  // Prospect Owner operations
  async createProspectOwner(owner: InsertProspectOwner): Promise<ProspectOwner> {
    const [newOwner] = await db
      .insert(prospectOwners)
      .values({
        ...owner,
        updatedAt: new Date(),
      })
      .returning();
    return newOwner;
  }

  async getProspectOwners(prospectId: number): Promise<ProspectOwner[]> {
    return await db
      .select()
      .from(prospectOwners)
      .where(eq(prospectOwners.prospectId, prospectId))
      .orderBy(prospectOwners.createdAt);
  }

  async getProspectOwnerByToken(token: string): Promise<ProspectOwner | undefined> {
    const [owner] = await db
      .select()
      .from(prospectOwners)
      .where(eq(prospectOwners.signatureToken, token));
    return owner || undefined;
  }

  async updateProspectOwner(id: number, updates: Partial<ProspectOwner>): Promise<ProspectOwner | undefined> {
    const [owner] = await db
      .update(prospectOwners)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(prospectOwners.id, id))
      .returning();
    return owner || undefined;
  }

  async deleteProspectOwners(prospectId: number): Promise<boolean> {
    const result = await db
      .delete(prospectOwners)
      .where(eq(prospectOwners.prospectId, prospectId));
    return (result.rowCount || 0) > 0;
  }

  // Prospect Signature operations
  async createProspectSignature(signature: InsertProspectSignature): Promise<ProspectSignature> {
    const [newSignature] = await db
      .insert(prospectSignatures)
      .values(signature)
      .returning();
    return newSignature;
  }

  async getProspectSignature(token: string): Promise<ProspectSignature | undefined> {
    const [signature] = await db
      .select()
      .from(prospectSignatures)
      .where(eq(prospectSignatures.signatureToken, token));
    return signature || undefined;
  }

  async getProspectSignaturesByOwnerEmail(email: string): Promise<ProspectSignature[]> {
    // Join with prospectOwners to find signatures by email
    const result = await db
      .select({
        signature: prospectSignatures
      })
      .from(prospectSignatures)
      .innerJoin(prospectOwners, eq(prospectSignatures.ownerId, prospectOwners.id))
      .where(eq(prospectOwners.email, email));
    
    return result.map(row => row.signature);
  }

  async getProspectSignaturesByProspect(prospectId: number): Promise<ProspectSignature[]> {
    return await db
      .select()
      .from(prospectSignatures)
      .where(eq(prospectSignatures.prospectId, prospectId))
      .orderBy(prospectSignatures.submittedAt);
  }

  async getProspectOwnerBySignatureToken(token: string): Promise<ProspectOwner | undefined> {
    const [owner] = await db
      .select()
      .from(prospectOwners)
      .where(eq(prospectOwners.signatureToken, token));
    return owner || undefined;
  }

  async getProspectOwnerByEmailAndProspectId(email: string, prospectId: number): Promise<ProspectOwner | undefined> {
    const [owner] = await db
      .select()
      .from(prospectOwners)
      .where(
        and(
          eq(prospectOwners.email, email),
          eq(prospectOwners.prospectId, prospectId)
        )
      );
    return owner || undefined;
  }

  // Admin operations
  async clearAllProspectData(): Promise<void> {
    // Delete in correct order due to foreign key constraints
    await db.delete(prospectSignatures);
    await db.delete(prospectOwners);
    await db.delete(merchantProspects);
  }

  // Campaign Management Operations
  
  // Fee Groups
  async getAllFeeGroups(): Promise<FeeGroup[]> {
    return await db
      .select()
      .from(feeGroups)
      .orderBy(feeGroups.displayOrder, feeGroups.name);
  }

  async createFeeGroup(insertFeeGroup: InsertFeeGroup): Promise<FeeGroup> {
    const [feeGroup] = await db
      .insert(feeGroups)
      .values({
        ...insertFeeGroup,
        updatedAt: new Date(),
      })
      .returning();
    return feeGroup;
  }

  async updateFeeGroup(id: number, updates: Partial<InsertFeeGroup>): Promise<FeeGroup | undefined> {
    const [feeGroup] = await db
      .update(feeGroups)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(feeGroups.id, id))
      .returning();
    return feeGroup || undefined;
  }

  // Fee Item Groups
  async getAllFeeItemGroups(): Promise<FeeItemGroup[]> {
    return await db
      .select()
      .from(feeItemGroups)
      .orderBy(feeItemGroups.feeGroupId, feeItemGroups.displayOrder, feeItemGroups.name);
  }

  async createFeeItemGroup(insertFeeItemGroup: InsertFeeItemGroup): Promise<FeeItemGroup> {
    const [feeItemGroup] = await db
      .insert(feeItemGroups)
      .values({
        ...insertFeeItemGroup,
        updatedAt: new Date(),
      })
      .returning();
    return feeItemGroup;
  }

  // Fee Items
  async getAllFeeItems(): Promise<FeeItem[]> {
    return await db
      .select()
      .from(feeItems)
      .orderBy(feeItems.feeGroupId, feeItems.displayOrder, feeItems.name);
  }

  async getFeeItemsByGroup(feeGroupId: number): Promise<FeeItem[]> {
    return await db
      .select()
      .from(feeItems)
      .where(eq(feeItems.feeGroupId, feeGroupId))
      .orderBy(feeItems.displayOrder, feeItems.name);
  }

  async createFeeItem(insertFeeItem: InsertFeeItem): Promise<FeeItem> {
    const [feeItem] = await db
      .insert(feeItems)
      .values({
        ...insertFeeItem,
        updatedAt: new Date(),
      })
      .returning();
    return feeItem;
  }

  // Pricing Types
  async getAllPricingTypes(): Promise<PricingType[]> {
    return await db
      .select()
      .from(pricingTypes)
      .where(eq(pricingTypes.isActive, true))
      .orderBy(pricingTypes.name);
  }

  async getPricingTypeFeeItems(pricingTypeId: number): Promise<FeeItem[]> {
    const result = await db
      .select({
        feeItem: feeItems,
        feeGroup: feeGroups,
      })
      .from(pricingTypeFeeItems)
      .innerJoin(feeItems, eq(pricingTypeFeeItems.feeItemId, feeItems.id))
      .innerJoin(feeGroups, eq(feeItems.feeGroupId, feeGroups.id))
      .where(eq(pricingTypeFeeItems.pricingTypeId, pricingTypeId))
      .orderBy(feeGroups.displayOrder, feeItems.displayOrder);

    return result.map(row => ({
      ...row.feeItem,
      feeGroup: row.feeGroup,
    }));
  }

  async createPricingType(insertPricingType: InsertPricingType): Promise<PricingType> {
    const [pricingType] = await db
      .insert(pricingTypes)
      .values({
        ...insertPricingType,
        updatedAt: new Date(),
      })
      .returning();
    return pricingType;
  }

  // Campaigns
  async getAllCampaigns(): Promise<CampaignWithDetails[]> {
    try {
      // First get all campaigns
      const campaignList = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.isActive, true))
        .orderBy(desc(campaigns.createdAt));

      // Get all pricing types for lookup
      const allPricingTypes = await db
        .select()
        .from(pricingTypes);

      // Map campaigns with their pricing types
      return campaignList.map(campaign => {
        const pricingType = allPricingTypes.find(pt => pt.id === campaign.pricingTypeId);
        return {
          ...campaign,
          pricingType: pricingType || {
            id: campaign.pricingTypeId,
            name: 'Unknown',
            description: '',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          createdByUser: undefined,
          feeValues: [],
        };
      });
    } catch (error) {
      console.error('Campaigns query error:', error);
      throw error;
    }
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    try {
      // Use the simpler version that was working before
      const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
      
      if (!campaign) return undefined;
      
      return campaign;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  }

  async createCampaign(insertCampaign: InsertCampaign, feeValues: InsertCampaignFeeValue[] = [], equipmentIds: number[] = []): Promise<Campaign> {
    // Create campaign
    const [campaign] = await db
      .insert(campaigns)
      .values({
        ...insertCampaign,
        updatedAt: new Date(),
      })
      .returning();

    // Create campaign fee values
    if (feeValues.length > 0) {
      await db
        .insert(campaignFeeValues)
        .values(
          feeValues.map(feeValue => ({
            ...feeValue,
            campaignId: campaign.id,
            valueType: feeValue.valueType || 'percentage', // Use provided valueType or default
            updatedAt: new Date(),
          }))
        );
    }

    // Associate equipment with campaign
    if (equipmentIds.length > 0) {
      await db
        .insert(campaignEquipment)
        .values(
          equipmentIds.map((equipmentItemId, index) => ({
            campaignId: campaign.id,
            equipmentItemId,
            isRequired: false,
            displayOrder: index + 1,
          }))
        );
    }

    return campaign;
  }

  async getCampaignFeeValues(campaignId: number): Promise<CampaignFeeValue[]> {
    try {
      const result = await db
        .select({
          feeValue: campaignFeeValues,
          feeItem: feeItems,
          feeGroup: feeGroups,
        })
        .from(campaignFeeValues)
        .innerJoin(feeItems, eq(campaignFeeValues.feeItemId, feeItems.id))
        .innerJoin(feeGroups, eq(feeItems.feeGroupId, feeGroups.id))
        .where(eq(campaignFeeValues.campaignId, campaignId))
        .orderBy(feeGroups.displayOrder, feeItems.displayOrder);

      return result.map(row => ({
        ...row.feeValue,
        feeItem: {
          ...row.feeItem,
          feeGroup: row.feeGroup,
        },
      }));
    } catch (error) {
      console.error('Error fetching campaign fee values:', error);
      // Return empty array if there's an error
      return [];
    }
  }



  async deactivateCampaign(id: number): Promise<Campaign | undefined> {
    return this.updateCampaign(id, { isActive: false });
  }

  async getCampaignEquipment(campaignId: number): Promise<EquipmentItem[]> {
    const result = await db
      .select({
        equipment: equipmentItems,
        campaignEquipment: campaignEquipment,
      })
      .from(campaignEquipment)
      .innerJoin(equipmentItems, eq(campaignEquipment.equipmentItemId, equipmentItems.id))
      .where(eq(campaignEquipment.campaignId, campaignId))
      .orderBy(campaignEquipment.displayOrder);

    return result.map(row => row.equipment);
  }

  async updateCampaign(id: number, updates: Partial<InsertCampaign>, feeValues: InsertCampaignFeeValue[] = [], equipmentIds: number[] = []): Promise<Campaign | undefined> {
    // Update campaign
    const [campaign] = await db
      .update(campaigns)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();

    if (!campaign) return undefined;

    // Update campaign fee values if provided
    if (feeValues.length > 0) {
      // Delete existing fee values
      await db.delete(campaignFeeValues).where(eq(campaignFeeValues.campaignId, id));
      
      // Insert new fee values
      await db
        .insert(campaignFeeValues)
        .values(
          feeValues.map(feeValue => ({
            ...feeValue,
            campaignId: id,
            valueType: feeValue.valueType || 'percentage',
            updatedAt: new Date(),
          }))
        );
    }

    // Update equipment associations if provided
    if (equipmentIds.length > 0) {
      // Delete existing equipment associations
      await db.delete(campaignEquipment).where(eq(campaignEquipment.campaignId, id));
      
      // Insert new equipment associations
      await db
        .insert(campaignEquipment)
        .values(
          equipmentIds.map((equipmentItemId, index) => ({
            campaignId: id,
            equipmentItemId,
            isRequired: false,
            displayOrder: index + 1,
          }))
        );
    }

    return campaign;
  }

  // API Key operations implementation
  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey || undefined;
  }

  async getApiKeyByKeyId(keyId: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.keyId, keyId));
    return apiKey || undefined;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(apiKey).returning();
    return created;
  }

  async updateApiKey(id: number, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const [updated] = await db.update(apiKeys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return updated || undefined;
  }

  async updateApiKeyLastUsed(id: number): Promise<void> {
    await db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  async deleteApiKey(id: number): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // API Request Log operations implementation
  async createApiRequestLog(log: InsertApiRequestLog): Promise<ApiRequestLog> {
    const [created] = await db.insert(apiRequestLogs).values(log).returning();
    return created;
  }

  async getApiRequestLogs(apiKeyId?: number, limit: number = 100): Promise<ApiRequestLog[]> {
    let query = db.select().from(apiRequestLogs);
    
    if (apiKeyId) {
      query = query.where(eq(apiRequestLogs.apiKeyId, apiKeyId));
    }
    
    return await query.orderBy(desc(apiRequestLogs.createdAt)).limit(limit);
  }

  async getApiUsageStats(apiKeyId: number, timeRange: string): Promise<{
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    averageResponseTime: number;
  }> {
    // Calculate time range
    const now = new Date();
    const since = new Date();
    
    switch (timeRange) {
      case '24h':
        since.setHours(now.getHours() - 24);
        break;
      case '7d':
        since.setDate(now.getDate() - 7);
        break;
      case '30d':
        since.setDate(now.getDate() - 30);
        break;
      default:
        since.setHours(now.getHours() - 24);
    }

    const logs = await db.select().from(apiRequestLogs)
      .where(and(
        eq(apiRequestLogs.apiKeyId, apiKeyId),
        gte(apiRequestLogs.createdAt, since)
      ));

    const totalRequests = logs.length;
    const successfulRequests = logs.filter(log => log.statusCode >= 200 && log.statusCode < 400).length;
    const errorRequests = logs.filter(log => log.statusCode >= 400).length;
    const averageResponseTime = logs.length > 0 
      ? logs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / logs.length 
      : 0;

    return {
      totalRequests,
      successfulRequests,
      errorRequests,
      averageResponseTime: Math.round(averageResponseTime),
    };
  }
}

export const storage = new DatabaseStorage();