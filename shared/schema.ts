import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, jsonb, index, unique, real, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const merchants = pgTable("merchants", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  agentId: integer("agent_id"),
  processingFee: decimal("processing_fee", { precision: 5, scale: 2 }).default("2.50").notNull(),
  status: text("status").notNull().default("active"), // active, pending, suspended
  monthlyVolume: decimal("monthly_volume", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  mid: varchar("mid", { length: 50 }).unique(), // Merchant ID for tracking transactions to locations
  name: text("name").notNull(),
  type: text("type").notNull().default("store"), // store, warehouse, office, headquarters
  phone: text("phone"),
  email: text("email"),
  status: text("status").notNull().default("active"), // active, inactive, temporarily_closed
  operatingHours: jsonb("operating_hours"), // Store days/hours as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("primary"), // primary, billing, shipping, mailing
  street1: text("street1").notNull(),
  street2: text("street2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull().default("US"),
  // Geolocation fields for mapping
  latitude: real("latitude"), // GPS coordinates
  longitude: real("longitude"), // GPS coordinates
  geoAccuracy: real("geo_accuracy"), // Accuracy in meters
  geocodedAt: timestamp("geocoded_at"), // When geolocation was last updated
  timezone: text("timezone"), // e.g., "America/New_York"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  territory: text("territory"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("5.00"),
  status: text("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
});

export const merchantProspects = pgTable("merchant_prospects", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  agentId: integer("agent_id").notNull().references(() => agents.id),
  status: text("status").notNull().default("pending"), // pending, contacted, in_progress, applied, approved, rejected
  validationToken: text("validation_token").unique(), // Token for email validation
  validatedAt: timestamp("validated_at"),
  applicationStartedAt: timestamp("application_started_at"),
  formData: text("form_data"), // JSON string of form data for resuming applications
  currentStep: integer("current_step").default(0), // Current step in the application form
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  merchantId: integer("merchant_id").notNull(),
  mid: varchar("mid", { length: 50 }), // Merchant location ID for tracking transactions to specific locations
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // visa, mastercard, amex, apple_pay, google_pay
  status: text("status").notNull(), // completed, pending, failed, refunded
  processingFee: decimal("processing_fee", { precision: 12, scale: 2 }),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for agent-merchant associations
export const agentMerchants = pgTable("agent_merchants", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  merchantId: integer("merchant_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: text("assigned_by"), // user ID who made the assignment
});

export const insertMerchantSchema = createInsertSchema(merchants).omit({
  id: true,
  createdAt: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertAgentMerchantSchema = createInsertSchema(agentMerchants).omit({
  id: true,
  assignedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
  geocodedAt: true,
});

export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect;

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertAgentMerchant = z.infer<typeof insertAgentMerchantSchema>;
export type AgentMerchant = typeof agentMerchants.$inferSelect;

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;

// Extended types for API responses
export type MerchantWithAgent = Merchant & {
  agent?: Agent;
};

export type TransactionWithMerchant = Transaction & {
  merchant?: Merchant;
};

export type LocationWithAddresses = Location & {
  addresses: Address[];
};

export type MerchantWithLocations = Merchant & {
  locations?: LocationWithAddresses[];
  agent?: Agent;
};

// User management tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  username: varchar("username").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("merchant"), // merchant, agent, admin, corporate, super_admin
  status: text("status").notNull().default("active"), // active, suspended, inactive
  permissions: jsonb("permissions").default("{}"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: varchar("last_login_ip"),
  timezone: varchar("timezone").default("UTC"), // User's preferred timezone e.g., "America/New_York"
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Login attempts table for security tracking
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  username: varchar("username"),
  email: varchar("email"),
  ipAddress: varchar("ip_address").notNull(),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  failureReason: varchar("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Two-factor authentication codes table
export const twoFactorCodes = pgTable("two_factor_codes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 6 }).notNull(),
  type: varchar("type").notNull(), // 'login', 'ip_change', 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Schema for user registration
export const registerUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  role: z.string().default("merchant"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Schema for user login
export const loginUserSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email required"),
  password: z.string().min(1, "Password required"),
  twoFactorCode: z.string().optional(),
  timezone: z.string().optional(), // User's detected timezone
});

// Schema for password reset request
export const passwordResetRequestSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email required"),
});

// Schema for password reset
export const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Schema for 2FA verification
export const twoFactorVerifySchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
  type: z.enum(["login", "ip_change", "password_reset"]),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;
export type TwoFactorVerify = z.infer<typeof twoFactorVerifySchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type TwoFactorCode = typeof twoFactorCodes.$inferSelect;

// Widget preferences table
export const userDashboardPreferences = pgTable("user_dashboard_preferences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull(),
  widgetId: text("widget_id").notNull(),
  position: integer("position").notNull().default(0),
  size: text("size").notNull().default("medium"), // small, medium, large
  isVisible: boolean("is_visible").notNull().default(true),
  configuration: jsonb("configuration").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserDashboardPreferenceSchema = createInsertSchema(userDashboardPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserDashboardPreference = z.infer<typeof insertUserDashboardPreferenceSchema>;
export type UserDashboardPreference = typeof userDashboardPreferences.$inferSelect;

// Prospect owners table for business ownership information
export const prospectOwners = pgTable("prospect_owners", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").notNull().references(() => merchantProspects.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
  signatureToken: text("signature_token"),
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prospect signatures table for storing digital signatures
export const prospectSignatures = pgTable("prospect_signatures", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").notNull().references(() => merchantProspects.id, { onDelete: 'cascade' }),
  ownerId: integer("owner_id").notNull().references(() => prospectOwners.id, { onDelete: 'cascade' }),
  signatureToken: text("signature_token").notNull().unique(),
  signature: text("signature").notNull(),
  signatureType: text("signature_type").notNull(), // 'draw' or 'type'
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const insertProspectOwnerSchema = createInsertSchema(prospectOwners);

export const insertProspectSignatureSchema = createInsertSchema(prospectSignatures);

export type InsertProspectOwner = z.infer<typeof insertProspectOwnerSchema>;
export type ProspectOwner = typeof prospectOwners.$inferSelect;
export type InsertProspectSignature = z.infer<typeof insertProspectSignatureSchema>;
export type ProspectSignature = typeof prospectSignatures.$inferSelect;

// PDF Form schemas
export const pdfForms = pgTable("pdf_forms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  status: text("status").default("active"), // active, inactive
  uploadedBy: text("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Navigation configuration
  showInNavigation: boolean("show_in_navigation").default(false),
  navigationTitle: text("navigation_title"), // Custom title for navigation
  allowedRoles: text("allowed_roles").array().default(['admin']), // Roles that can access this form
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const pdfFormFields = pgTable("pdf_form_fields", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => pdfForms.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  fieldType: text("field_type").notNull(), // text, number, date, select, checkbox, textarea
  fieldLabel: text("field_label").notNull(),
  isRequired: boolean("is_required").default(false),
  options: text("options").array(), // for select/radio fields
  defaultValue: text("default_value"),
  validation: text("validation"), // JSON string for validation rules
  position: integer("position").notNull(), // field order
  section: text("section"), // section grouping for fields
  createdAt: timestamp("created_at").defaultNow()
});

export const pdfFormSubmissions = pgTable("pdf_form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => pdfForms.id, { onDelete: "cascade" }),
  submittedBy: text("submitted_by").references(() => users.id, { onDelete: "cascade" }), // Make nullable for public submissions
  submissionToken: text("submission_token").notNull().unique(), // Unique token for public access
  applicantEmail: text("applicant_email"), // Email of the applicant for public submissions
  data: text("data").notNull(), // JSON string of form data
  status: text("status").default("draft"), // draft, submitted, under_review, approved, rejected
  isPublic: boolean("is_public").default(false), // Whether this is a public submission
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Drizzle schemas for PDF forms
export const insertPdfFormSchema = createInsertSchema(pdfForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPdfFormFieldSchema = createInsertSchema(pdfFormFields).omit({
  id: true,
  createdAt: true
});

export const insertPdfFormSubmissionSchema = createInsertSchema(pdfFormSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types for PDF forms
export type PdfForm = typeof pdfForms.$inferSelect;
export type InsertPdfForm = z.infer<typeof insertPdfFormSchema>;
export type PdfFormField = typeof pdfFormFields.$inferSelect;
export type InsertPdfFormField = z.infer<typeof insertPdfFormFieldSchema>;
export type PdfFormSubmission = typeof pdfFormSubmissions.$inferSelect;
export type InsertPdfFormSubmission = z.infer<typeof insertPdfFormSubmissionSchema>;

export type PdfFormWithFields = PdfForm & {
  fields: PdfFormField[];
};

// Merchant Prospect schemas
export const insertMerchantProspectSchema = createInsertSchema(merchantProspects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  validationToken: true,
  validatedAt: true,
  applicationStartedAt: true,
  formData: true,
  currentStep: true,
});

// Merchant Prospect types
export type MerchantProspect = typeof merchantProspects.$inferSelect;
export type InsertMerchantProspect = z.infer<typeof insertMerchantProspectSchema>;

// Business Ownership table for tracking ownership percentages and signatures
export const businessOwnership = pgTable("business_ownership", {
  id: serial("id").primaryKey(),
  formSubmissionId: integer("form_submission_id").references(() => pdfFormSubmissions.id, { onDelete: "cascade" }),
  prospectId: integer("prospect_id").references(() => merchantProspects.id, { onDelete: "cascade" }),
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
  requiresSignature: boolean("requires_signature").notNull().default(false), // true if > 25%
  signatureImagePath: text("signature_image_path"), // path to uploaded signature file
  digitalSignature: text("digital_signature"), // base64 encoded digital signature
  signatureType: text("signature_type"), // 'upload' or 'digital'
  signedAt: timestamp("signed_at"),
  signatureToken: text("signature_token").unique(), // token for email signature requests
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBusinessOwnershipSchema = createInsertSchema(businessOwnership).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BusinessOwnership = typeof businessOwnership.$inferSelect;
export type InsertBusinessOwnership = z.infer<typeof insertBusinessOwnershipSchema>;

// Extended types for prospect responses
export type MerchantProspectWithAgent = MerchantProspect & {
  agent?: Agent;
};
