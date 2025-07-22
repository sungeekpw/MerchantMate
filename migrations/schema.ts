import { pgTable, unique, serial, text, integer, numeric, timestamp, varchar, index, jsonb, foreignKey, boolean, check, real } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const transactions = pgTable("transactions", {
	id: serial().primaryKey().notNull(),
	transactionId: text("transaction_id").notNull(),
	merchantId: integer("merchant_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	paymentMethod: text("payment_method").notNull(),
	status: text().notNull(),
	processingFee: numeric("processing_fee", { precision: 12, scale:  2 }),
	netAmount: numeric("net_amount", { precision: 12, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	mid: varchar({ length: 50 }),
}, (table) => [
	unique("transactions_transaction_id_unique").on(table.transactionId),
]);

export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const agentMerchants = pgTable("agent_merchants", {
	id: serial().primaryKey().notNull(),
	agentId: integer("agent_id").notNull(),
	merchantId: integer("merchant_id").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	assignedBy: text("assigned_by"),
}, (table) => [
	unique("agent_merchants_agent_id_merchant_id_key").on(table.agentId, table.merchantId),
]);

export const pdfFormFields = pgTable("pdf_form_fields", {
	id: serial().primaryKey().notNull(),
	formId: integer("form_id").notNull(),
	fieldName: varchar("field_name", { length: 255 }).notNull(),
	fieldType: varchar("field_type", { length: 50 }).notNull(),
	fieldLabel: varchar("field_label", { length: 255 }).notNull(),
	isRequired: boolean("is_required").default(false),
	options: text().array(),
	defaultValue: text("default_value"),
	validation: varchar({ length: 255 }),
	position: integer().notNull(),
	section: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.formId],
			foreignColumns: [pdfForms.id],
			name: "pdf_form_fields_form_id_fkey"
		}).onDelete("cascade"),
]);

export const pdfForms = pgTable("pdf_forms", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileSize: integer("file_size").notNull(),
	uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(),
	status: varchar({ length: 50 }).default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	showInNavigation: boolean("show_in_navigation").default(false),
	navigationTitle: text("navigation_title"),
	allowedRoles: text("allowed_roles").array().default(["RAY['admin'::tex"]),
});

export const prospectSignatures = pgTable("prospect_signatures", {
	id: serial().primaryKey().notNull(),
	prospectId: integer("prospect_id").notNull(),
	ownerId: integer("owner_id").notNull(),
	signatureToken: text("signature_token").notNull(),
	signature: text().notNull(),
	signatureType: text("signature_type").notNull(),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("prospect_signatures_signature_token_key").on(table.signatureToken),
]);

export const feeGroups = pgTable("fee_groups", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	displayOrder: integer("display_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	author: text().default('System').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("fee_groups_name_key").on(table.name),
]);

export const feeItemGroups = pgTable("fee_item_groups", {
	id: serial().primaryKey().notNull(),
	feeGroupId: integer("fee_group_id").notNull(),
	name: text().notNull(),
	description: text(),
	displayOrder: integer("display_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	author: text().default('System').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.feeGroupId],
			foreignColumns: [feeGroups.id],
			name: "fee_item_groups_fee_group_id_fkey"
		}).onDelete("cascade"),
	unique("fee_item_groups_fee_group_id_name_key").on(table.feeGroupId, table.name),
]);

export const campaigns = pgTable("campaigns", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	acquirer: varchar({ length: 50 }).notNull(),
	pricingTypeId: integer("pricing_type_id"),
	isActive: boolean("is_active").default(true),
	isDefault: boolean("is_default").default(false),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	currency: varchar({ length: 3 }).default('USD'),
	equipment: text(),
}, (table) => [
	foreignKey({
			columns: [table.pricingTypeId],
			foreignColumns: [pricingTypes.id],
			name: "campaigns_pricing_type_id_fkey"
		}),
]);

export const feeItems = pgTable("fee_items", {
	id: serial().primaryKey().notNull(),
	feeGroupId: integer("fee_group_id").notNull(),
	feeItemGroupId: integer("fee_item_group_id"),
	name: text().notNull(),
	description: text(),
	valueType: text("value_type").notNull(),
	defaultValue: text("default_value"),
	additionalInfo: text("additional_info"),
	displayOrder: integer("display_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	author: text().default('System').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.feeGroupId],
			foreignColumns: [feeGroups.id],
			name: "fee_items_fee_group_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.feeItemGroupId],
			foreignColumns: [feeItemGroups.id],
			name: "fee_items_fee_item_group_id_fkey"
		}).onDelete("cascade"),
	unique("fee_items_fee_group_id_name_key").on(table.feeGroupId, table.name),
	check("fee_items_value_type_check", sql`value_type = ANY (ARRAY['amount'::text, 'percentage'::text, 'placeholder'::text])`),
]);

export const pricingTypes = pgTable("pricing_types", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	author: varchar({ length: 255 }).default('System'),
}, (table) => [
	unique("pricing_types_name_key").on(table.name),
]);

export const equipmentItems = pgTable("equipment_items", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	imageUrl: text("image_url"),
	imageData: text("image_data"),
	category: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	manufacturer: text(),
	modelNumber: text("model_number"),
	specifications: jsonb().default({}),
});

export const apiKeys = pgTable("api_keys", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	keyId: varchar("key_id", { length: 255 }).notNull(),
	keySecret: varchar("key_secret", { length: 255 }).notNull(),
	permissions: jsonb().default([]),
	isActive: boolean("is_active").default(true),
	createdBy: varchar("created_by", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	usageCount: integer("usage_count").default(0),
}, (table) => [
	unique("api_keys_name_key").on(table.name),
	unique("api_keys_key_id_key").on(table.keyId),
]);

export const prospectOwners = pgTable("prospect_owners", {
	id: serial().primaryKey().notNull(),
	prospectId: integer("prospect_id").notNull(),
	name: text().notNull(),
	email: text().notNull(),
	ownershipPercentage: text("ownership_percentage").notNull(),
	signatureToken: text("signature_token"),
	emailSent: boolean("email_sent").default(false),
	emailSentAt: timestamp("email_sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	subject: text().notNull(),
	htmlContent: text("html_content").notNull(),
	textContent: text("text_content"),
	variables: jsonb(),
	category: varchar({ length: 50 }).notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("email_templates_name_key").on(table.name),
]);

export const emailTriggers = pgTable("email_triggers", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	templateId: integer("template_id"),
	triggerEvent: varchar("trigger_event", { length: 100 }).notNull(),
	isActive: boolean("is_active").default(true),
	conditions: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [emailTemplates.id],
			name: "email_triggers_template_id_fkey"
		}),
	unique("email_triggers_name_key").on(table.name),
]);

export const campaignAssignments = pgTable("campaign_assignments", {
	id: serial().primaryKey().notNull(),
	campaignId: integer("campaign_id").notNull(),
	prospectId: integer("prospect_id"),
	applicationId: integer("application_id"),
	assignedBy: varchar("assigned_by"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaigns.id],
			name: "campaign_assignments_campaign_id_fkey"
		}),
	foreignKey({
			columns: [table.prospectId],
			foreignColumns: [merchantProspects.id],
			name: "campaign_assignments_prospect_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "campaign_assignments_assigned_by_fkey"
		}),
]);

export const campaignEquipment = pgTable("campaign_equipment", {
	id: serial().primaryKey().notNull(),
	campaignId: integer("campaign_id").notNull(),
	equipmentItemId: integer("equipment_item_id").notNull(),
	isRequired: boolean("is_required").default(false).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaigns.id],
			name: "campaign_equipment_campaign_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.equipmentItemId],
			foreignColumns: [equipmentItems.id],
			name: "campaign_equipment_equipment_item_id_fkey"
		}).onDelete("cascade"),
	unique("campaign_equipment_campaign_id_equipment_item_id_key").on(table.campaignId, table.equipmentItemId),
]);

export const campaignFeeValues = pgTable("campaign_fee_values", {
	id: serial().primaryKey().notNull(),
	campaignId: integer("campaign_id"),
	feeItemId: integer("fee_item_id"),
	value: varchar({ length: 50 }).notNull(),
	valueType: varchar("value_type", { length: 20 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaigns.id],
			name: "campaign_fee_values_campaign_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.feeItemId],
			foreignColumns: [feeItems.id],
			name: "campaign_fee_values_fee_item_id_fkey"
		}),
]);

export const pricingTypeFeeItems = pgTable("pricing_type_fee_items", {
	id: serial().primaryKey().notNull(),
	pricingTypeId: integer("pricing_type_id"),
	feeItemId: integer("fee_item_id"),
	isRequired: boolean("is_required").default(false),
	displayOrder: integer("display_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.pricingTypeId],
			foreignColumns: [pricingTypes.id],
			name: "pricing_type_fee_items_pricing_type_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.feeItemId],
			foreignColumns: [feeItems.id],
			name: "pricing_type_fee_items_fee_item_id_fkey"
		}),
]);

export const businessOwnership = pgTable("business_ownership", {
	id: serial().primaryKey().notNull(),
	formSubmissionId: integer("form_submission_id"),
	prospectId: integer("prospect_id"),
	ownerName: text("owner_name").notNull(),
	ownerEmail: text("owner_email").notNull(),
	ownershipPercentage: numeric("ownership_percentage", { precision: 5, scale:  2 }).notNull(),
	requiresSignature: boolean("requires_signature").default(false).notNull(),
	signatureImagePath: text("signature_image_path"),
	digitalSignature: text("digital_signature"),
	signatureType: text("signature_type"),
	signedAt: timestamp("signed_at", { mode: 'string' }),
	signatureToken: text("signature_token"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.formSubmissionId],
			foreignColumns: [pdfFormSubmissions.id],
			name: "business_ownership_form_submission_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.prospectId],
			foreignColumns: [merchantProspects.id],
			name: "business_ownership_prospect_id_fkey"
		}).onDelete("cascade"),
	unique("business_ownership_signature_token_key").on(table.signatureToken),
]);

export const pdfFormSubmissions = pgTable("pdf_form_submissions", {
	id: serial().primaryKey().notNull(),
	formId: integer("form_id").notNull(),
	submittedBy: varchar("submitted_by", { length: 255 }).notNull(),
	data: text().notNull(),
	status: varchar({ length: 50 }).default('draft'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	submissionToken: text("submission_token"),
	applicantEmail: text("applicant_email"),
	isPublic: boolean("is_public").default(false),
}, (table) => [
	foreignKey({
			columns: [table.formId],
			foreignColumns: [pdfForms.id],
			name: "pdf_form_submissions_form_id_fkey"
		}).onDelete("cascade"),
	unique("unique_submission_token").on(table.submissionToken),
]);

export const merchantProspects = pgTable("merchant_prospects", {
	id: serial().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 255 }).notNull(),
	lastName: varchar("last_name", { length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	agentId: integer("agent_id").notNull(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	notes: text(),
	validationToken: varchar("validation_token", { length: 255 }),
	validatedAt: timestamp("validated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	applicationStartedAt: timestamp("application_started_at", { mode: 'string' }),
	formData: text("form_data"),
	currentStep: integer("current_step").default(0),
}, (table) => [
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "merchant_prospects_agent_id_fkey"
		}).onDelete("cascade"),
	unique("merchant_prospects_email_key").on(table.email),
	unique("merchant_prospects_validation_token_key").on(table.validationToken),
]);

export const emailActivity = pgTable("email_activity", {
	id: serial().primaryKey().notNull(),
	templateId: integer("template_id"),
	templateName: varchar("template_name", { length: 100 }).notNull(),
	recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
	recipientName: varchar("recipient_name", { length: 255 }),
	subject: text().notNull(),
	status: varchar({ length: 20 }).notNull(),
	errorMessage: text("error_message"),
	triggerSource: varchar("trigger_source", { length: 100 }),
	triggeredBy: varchar("triggered_by", { length: 255 }),
	metadata: jsonb(),
	sentAt: timestamp("sent_at", { mode: 'string' }).defaultNow(),
	openedAt: timestamp("opened_at", { mode: 'string' }),
	clickedAt: timestamp("clicked_at", { mode: 'string' }),
}, (table) => [
	index("email_activity_recipient_email_idx").using("btree", table.recipientEmail.asc().nullsLast().op("text_ops")),
	index("email_activity_sent_at_idx").using("btree", table.sentAt.asc().nullsLast().op("timestamp_ops")),
	index("email_activity_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("email_activity_template_id_idx").using("btree", table.templateId.asc().nullsLast().op("int4_ops")),
	index("idx_email_activity_recipient").using("btree", table.recipientEmail.asc().nullsLast().op("text_ops")),
	index("idx_email_activity_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_email_activity_template_id").using("btree", table.templateId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [emailTemplates.id],
			name: "email_activity_template_id_fkey"
		}),
]);

export const dataAccessLogs = pgTable("data_access_logs", {
	id: serial().primaryKey().notNull(),
	auditLogId: integer("audit_log_id"),
	userId: varchar("user_id", { length: 255 }).notNull(),
	dataType: text("data_type").notNull(),
	tableName: text("table_name").notNull(),
	recordId: text("record_id"),
	fieldAccessed: text("field_accessed"),
	accessType: text("access_type").notNull(),
	accessReason: text("access_reason"),
	dataVolume: integer("data_volume"),
	lawfulBasis: text("lawful_basis"),
	retentionPeriod: integer("retention_period"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("data_access_logs_access_type_idx").using("btree", table.accessType.asc().nullsLast().op("text_ops")),
	index("data_access_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("data_access_logs_data_type_idx").using("btree", table.dataType.asc().nullsLast().op("text_ops")),
	index("data_access_logs_table_name_idx").using("btree", table.tableName.asc().nullsLast().op("text_ops")),
	index("data_access_logs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.auditLogId],
			foreignColumns: [auditLogs.id],
			name: "data_access_logs_audit_log_id_fkey"
		}),
]);

export const securityEvents = pgTable("security_events", {
	id: serial().primaryKey().notNull(),
	auditLogId: integer("audit_log_id"),
	eventType: text("event_type").notNull(),
	severity: text().notNull(),
	alertStatus: text("alert_status").default('new'),
	detectionMethod: text("detection_method"),
	detectedAt: timestamp("detected_at", { mode: 'string' }).defaultNow().notNull(),
	detectedBy: text("detected_by"),
	assignedTo: varchar("assigned_to", { length: 255 }),
	investigationNotes: text("investigation_notes"),
	resolution: text(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolvedBy: varchar("resolved_by", { length: 255 }),
	affectedUsers: jsonb("affected_users"),
	affectedResources: jsonb("affected_resources"),
	mitigationActions: jsonb("mitigation_actions"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("security_events_alert_status_idx").using("btree", table.alertStatus.asc().nullsLast().op("text_ops")),
	index("security_events_detected_at_idx").using("btree", table.detectedAt.asc().nullsLast().op("timestamp_ops")),
	index("security_events_event_type_idx").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("security_events_severity_idx").using("btree", table.severity.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.auditLogId],
			foreignColumns: [auditLogs.id],
			name: "security_events_audit_log_id_fkey"
		}),
]);

export const auditLogs = pgTable("audit_logs", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }),
	userEmail: text("user_email"),
	sessionId: text("session_id"),
	ipAddress: text("ip_address").notNull(),
	userAgent: text("user_agent"),
	action: text().notNull(),
	resource: text().notNull(),
	resourceId: text("resource_id"),
	method: text(),
	endpoint: text(),
	requestParams: jsonb("request_params"),
	requestBody: jsonb("request_body"),
	statusCode: integer("status_code"),
	responseTime: integer("response_time"),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	riskLevel: text("risk_level").default('low').notNull(),
	complianceFlags: jsonb("compliance_flags"),
	dataClassification: text("data_classification"),
	environment: text().default('production'),
	applicationVersion: text("application_version"),
	tags: jsonb(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("audit_logs_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("audit_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("audit_logs_environment_idx").using("btree", table.environment.asc().nullsLast().op("text_ops")),
	index("audit_logs_ip_address_idx").using("btree", table.ipAddress.asc().nullsLast().op("text_ops")),
	index("audit_logs_resource_idx").using("btree", table.resource.asc().nullsLast().op("text_ops")),
	index("audit_logs_risk_level_idx").using("btree", table.riskLevel.asc().nullsLast().op("text_ops")),
	index("audit_logs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const loginAttempts = pgTable("login_attempts", {
	id: serial().primaryKey().notNull(),
	username: varchar(),
	email: varchar(),
	ipAddress: varchar("ip_address").notNull(),
	userAgent: text("user_agent"),
	success: boolean().notNull(),
	failureReason: varchar("failure_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const twoFactorCodes = pgTable("two_factor_codes", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	code: varchar({ length: 6 }).notNull(),
	type: varchar().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "two_factor_codes_user_id_fkey"
		}).onDelete("cascade"),
]);

export const userDashboardPreferences = pgTable("user_dashboard_preferences", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	widgetId: text("widget_id").notNull(),
	position: integer().default(0).notNull(),
	size: text().default('medium').notNull(),
	isVisible: boolean("is_visible").default(true).notNull(),
	configuration: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("user_dashboard_preferences_user_id_widget_id_key").on(table.userId, table.widgetId),
]);

export const locations = pgTable("locations", {
	id: serial().primaryKey().notNull(),
	merchantId: integer("merchant_id").notNull(),
	name: text().notNull(),
	type: text().default('store').notNull(),
	phone: text(),
	email: text(),
	status: text().default('active').notNull(),
	operatingHours: jsonb("operating_hours"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	mid: varchar({ length: 50 }),
}, (table) => [
	foreignKey({
			columns: [table.merchantId],
			foreignColumns: [merchants.id],
			name: "locations_merchant_id_fkey"
		}).onDelete("cascade"),
	unique("locations_mid_key").on(table.mid),
]);

export const addresses = pgTable("addresses", {
	id: serial().primaryKey().notNull(),
	locationId: integer("location_id").notNull(),
	type: text().default('primary').notNull(),
	street1: text().notNull(),
	street2: text(),
	city: text().notNull(),
	state: text().notNull(),
	postalCode: text("postal_code").notNull(),
	country: text().default('US').notNull(),
	latitude: real(),
	longitude: real(),
	geoAccuracy: real("geo_accuracy"),
	geocodedAt: timestamp("geocoded_at", { mode: 'string' }),
	timezone: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "addresses_location_id_fkey"
		}).onDelete("cascade"),
]);

export const merchants = pgTable("merchants", {
	id: serial().primaryKey().notNull(),
	businessName: text("business_name").notNull(),
	businessType: text("business_type").notNull(),
	email: text().notNull(),
	phone: text().notNull(),
	address: text(),
	agentId: integer("agent_id"),
	processingFee: numeric("processing_fee", { precision: 5, scale:  2 }).default('2.50').notNull(),
	status: text().default('active').notNull(),
	monthlyVolume: numeric("monthly_volume", { precision: 12, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("merchants_email_unique").on(table.email),
]);

export const agents = pgTable("agents", {
	id: serial().primaryKey().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	email: text().notNull(),
	phone: text().notNull(),
	territory: text(),
	commissionRate: numeric("commission_rate", { precision: 5, scale:  2 }).default('5.00'),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("agents_email_unique").on(table.email),
]);

export const users = pgTable("users", {
	id: varchar().primaryKey().notNull(),
	email: varchar().notNull(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	role: text().default('merchant').notNull(),
	status: text().default('active').notNull(),
	permissions: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	username: varchar().notNull(),
	passwordHash: varchar("password_hash").notNull(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	lastLoginIp: varchar("last_login_ip"),
	twoFactorEnabled: boolean("two_factor_enabled").default(false),
	twoFactorSecret: varchar("two_factor_secret"),
	passwordResetToken: varchar("password_reset_token"),
	passwordResetExpires: timestamp("password_reset_expires", { mode: 'string' }),
	emailVerified: boolean("email_verified").default(false),
	emailVerificationToken: varchar("email_verification_token"),
	timezone: varchar({ length: 50 }),
}, (table) => [
	unique("users_email_unique").on(table.email),
	unique("users_username_key").on(table.username),
]);
