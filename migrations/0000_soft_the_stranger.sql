-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"merchant_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"status" text NOT NULL,
	"processing_fee" numeric(12, 2),
	"net_amount" numeric(12, 2),
	"created_at" timestamp DEFAULT now(),
	"mid" varchar(50),
	CONSTRAINT "transactions_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_merchants" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"merchant_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" text,
	CONSTRAINT "agent_merchants_agent_id_merchant_id_key" UNIQUE("agent_id","merchant_id")
);
--> statement-breakpoint
CREATE TABLE "pdf_form_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"field_name" varchar(255) NOT NULL,
	"field_type" varchar(50) NOT NULL,
	"field_label" varchar(255) NOT NULL,
	"is_required" boolean DEFAULT false,
	"options" text[],
	"default_value" text,
	"validation" varchar(255),
	"position" integer NOT NULL,
	"section" varchar(255),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "pdf_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_by" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"show_in_navigation" boolean DEFAULT false,
	"navigation_title" text,
	"allowed_roles" text[] DEFAULT '{"RAY['admin'::tex"}'
);
--> statement-breakpoint
CREATE TABLE "prospect_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"owner_id" integer NOT NULL,
	"signature_token" text NOT NULL,
	"signature" text NOT NULL,
	"signature_type" text NOT NULL,
	"submitted_at" timestamp DEFAULT now(),
	CONSTRAINT "prospect_signatures_signature_token_key" UNIQUE("signature_token")
);
--> statement-breakpoint
CREATE TABLE "fee_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"author" text DEFAULT 'System' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fee_groups_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "fee_item_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"fee_group_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"author" text DEFAULT 'System' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fee_item_groups_fee_group_id_name_key" UNIQUE("fee_group_id","name")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"acquirer" varchar(50) NOT NULL,
	"pricing_type_id" integer,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"currency" varchar(3) DEFAULT 'USD',
	"equipment" text
);
--> statement-breakpoint
CREATE TABLE "fee_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"fee_group_id" integer NOT NULL,
	"fee_item_group_id" integer,
	"name" text NOT NULL,
	"description" text,
	"value_type" text NOT NULL,
	"default_value" text,
	"additional_info" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"author" text DEFAULT 'System' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fee_items_fee_group_id_name_key" UNIQUE("fee_group_id","name"),
	CONSTRAINT "fee_items_value_type_check" CHECK (value_type = ANY (ARRAY['amount'::text, 'percentage'::text, 'placeholder'::text]))
);
--> statement-breakpoint
CREATE TABLE "pricing_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"author" varchar(255) DEFAULT 'System',
	CONSTRAINT "pricing_types_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "equipment_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"image_url" text,
	"image_data" text,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"manufacturer" text,
	"model_number" text,
	"specifications" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"key_id" varchar(255) NOT NULL,
	"key_secret" varchar(255) NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0,
	CONSTRAINT "api_keys_name_key" UNIQUE("name"),
	CONSTRAINT "api_keys_key_id_key" UNIQUE("key_id")
);
--> statement-breakpoint
CREATE TABLE "prospect_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"ownership_percentage" text NOT NULL,
	"signature_token" text,
	"email_sent" boolean DEFAULT false,
	"email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"html_content" text NOT NULL,
	"text_content" text,
	"variables" jsonb,
	"category" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_templates_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "email_triggers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"template_id" integer,
	"trigger_event" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true,
	"conditions" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_triggers_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "campaign_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"prospect_id" integer,
	"application_id" integer,
	"assigned_by" varchar,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"equipment_item_id" integer NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_equipment_campaign_id_equipment_item_id_key" UNIQUE("campaign_id","equipment_item_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_fee_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer,
	"fee_item_id" integer,
	"value" varchar(50) NOT NULL,
	"value_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_type_fee_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"pricing_type_id" integer,
	"fee_item_id" integer,
	"is_required" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_ownership" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_submission_id" integer,
	"prospect_id" integer,
	"owner_name" text NOT NULL,
	"owner_email" text NOT NULL,
	"ownership_percentage" numeric(5, 2) NOT NULL,
	"requires_signature" boolean DEFAULT false NOT NULL,
	"signature_image_path" text,
	"digital_signature" text,
	"signature_type" text,
	"signed_at" timestamp,
	"signature_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_ownership_signature_token_key" UNIQUE("signature_token")
);
--> statement-breakpoint
CREATE TABLE "pdf_form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"submitted_by" varchar(255) NOT NULL,
	"data" text NOT NULL,
	"status" varchar(50) DEFAULT 'draft',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"submission_token" text,
	"applicant_email" text,
	"is_public" boolean DEFAULT false,
	CONSTRAINT "unique_submission_token" UNIQUE("submission_token")
);
--> statement-breakpoint
CREATE TABLE "merchant_prospects" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"agent_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"validation_token" varchar(255),
	"validated_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"application_started_at" timestamp,
	"form_data" text,
	"current_step" integer DEFAULT 0,
	CONSTRAINT "merchant_prospects_email_key" UNIQUE("email"),
	CONSTRAINT "merchant_prospects_validation_token_key" UNIQUE("validation_token")
);
--> statement-breakpoint
CREATE TABLE "email_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"template_name" varchar(100) NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"recipient_name" varchar(255),
	"subject" text NOT NULL,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"trigger_source" varchar(100),
	"triggered_by" varchar(255),
	"metadata" jsonb,
	"sent_at" timestamp DEFAULT now(),
	"opened_at" timestamp,
	"clicked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "data_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_log_id" integer,
	"user_id" varchar(255) NOT NULL,
	"data_type" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text,
	"field_accessed" text,
	"access_type" text NOT NULL,
	"access_reason" text,
	"data_volume" integer,
	"lawful_basis" text,
	"retention_period" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_log_id" integer,
	"event_type" text NOT NULL,
	"severity" text NOT NULL,
	"alert_status" text DEFAULT 'new',
	"detection_method" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"detected_by" text,
	"assigned_to" varchar(255),
	"investigation_notes" text,
	"resolution" text,
	"resolved_at" timestamp,
	"resolved_by" varchar(255),
	"affected_users" jsonb,
	"affected_resources" jsonb,
	"mitigation_actions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255),
	"user_email" text,
	"session_id" text,
	"ip_address" text NOT NULL,
	"user_agent" text,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"method" text,
	"endpoint" text,
	"request_params" jsonb,
	"request_body" jsonb,
	"status_code" integer,
	"response_time" integer,
	"old_values" jsonb,
	"new_values" jsonb,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"compliance_flags" jsonb,
	"data_classification" text,
	"environment" text DEFAULT 'production',
	"application_version" text,
	"tags" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar,
	"email" varchar,
	"ip_address" varchar NOT NULL,
	"user_agent" text,
	"success" boolean NOT NULL,
	"failure_reason" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "two_factor_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"code" varchar(6) NOT NULL,
	"type" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_dashboard_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"widget_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"size" text DEFAULT 'medium' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_dashboard_preferences_user_id_widget_id_key" UNIQUE("user_id","widget_id")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'store' NOT NULL,
	"phone" text,
	"email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"operating_hours" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"mid" varchar(50),
	CONSTRAINT "locations_mid_key" UNIQUE("mid")
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"location_id" integer NOT NULL,
	"type" text DEFAULT 'primary' NOT NULL,
	"street1" text NOT NULL,
	"street2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"latitude" real,
	"longitude" real,
	"geo_accuracy" real,
	"geocoded_at" timestamp,
	"timezone" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"business_type" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"agent_id" integer,
	"processing_fee" numeric(5, 2) DEFAULT '2.50' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"monthly_volume" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"territory" text,
	"commission_rate" numeric(5, 2) DEFAULT '5.00',
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "agents_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" text DEFAULT 'merchant' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"username" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"last_login_at" timestamp,
	"last_login_ip" varchar,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" varchar,
	"password_reset_token" varchar,
	"password_reset_expires" timestamp,
	"email_verified" boolean DEFAULT false,
	"email_verification_token" varchar,
	"timezone" varchar(50),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_key" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "pdf_form_fields" ADD CONSTRAINT "pdf_form_fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."pdf_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_item_groups" ADD CONSTRAINT "fee_item_groups_fee_group_id_fkey" FOREIGN KEY ("fee_group_id") REFERENCES "public"."fee_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_pricing_type_id_fkey" FOREIGN KEY ("pricing_type_id") REFERENCES "public"."pricing_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_fee_group_id_fkey" FOREIGN KEY ("fee_group_id") REFERENCES "public"."fee_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_fee_item_group_id_fkey" FOREIGN KEY ("fee_item_group_id") REFERENCES "public"."fee_item_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_triggers" ADD CONSTRAINT "email_triggers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_equipment" ADD CONSTRAINT "campaign_equipment_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_equipment" ADD CONSTRAINT "campaign_equipment_equipment_item_id_fkey" FOREIGN KEY ("equipment_item_id") REFERENCES "public"."equipment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_fee_values" ADD CONSTRAINT "campaign_fee_values_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_fee_values" ADD CONSTRAINT "campaign_fee_values_fee_item_id_fkey" FOREIGN KEY ("fee_item_id") REFERENCES "public"."fee_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_type_fee_items" ADD CONSTRAINT "pricing_type_fee_items_pricing_type_id_fkey" FOREIGN KEY ("pricing_type_id") REFERENCES "public"."pricing_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_type_fee_items" ADD CONSTRAINT "pricing_type_fee_items_fee_item_id_fkey" FOREIGN KEY ("fee_item_id") REFERENCES "public"."fee_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_ownership" ADD CONSTRAINT "business_ownership_form_submission_id_fkey" FOREIGN KEY ("form_submission_id") REFERENCES "public"."pdf_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_ownership" ADD CONSTRAINT "business_ownership_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_form_submissions" ADD CONSTRAINT "pdf_form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."pdf_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_prospects" ADD CONSTRAINT "merchant_prospects_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_activity" ADD CONSTRAINT "email_activity_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_audit_log_id_fkey" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_audit_log_id_fkey" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_codes" ADD CONSTRAINT "two_factor_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire" timestamp_ops);--> statement-breakpoint
CREATE INDEX "email_activity_recipient_email_idx" ON "email_activity" USING btree ("recipient_email" text_ops);--> statement-breakpoint
CREATE INDEX "email_activity_sent_at_idx" ON "email_activity" USING btree ("sent_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "email_activity_status_idx" ON "email_activity" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "email_activity_template_id_idx" ON "email_activity" USING btree ("template_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_email_activity_recipient" ON "email_activity" USING btree ("recipient_email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_email_activity_status" ON "email_activity" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_email_activity_template_id" ON "email_activity" USING btree ("template_id" int4_ops);--> statement-breakpoint
CREATE INDEX "data_access_logs_access_type_idx" ON "data_access_logs" USING btree ("access_type" text_ops);--> statement-breakpoint
CREATE INDEX "data_access_logs_created_at_idx" ON "data_access_logs" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "data_access_logs_data_type_idx" ON "data_access_logs" USING btree ("data_type" text_ops);--> statement-breakpoint
CREATE INDEX "data_access_logs_table_name_idx" ON "data_access_logs" USING btree ("table_name" text_ops);--> statement-breakpoint
CREATE INDEX "data_access_logs_user_id_idx" ON "data_access_logs" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "security_events_alert_status_idx" ON "security_events" USING btree ("alert_status" text_ops);--> statement-breakpoint
CREATE INDEX "security_events_detected_at_idx" ON "security_events" USING btree ("detected_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "security_events_event_type_idx" ON "security_events" USING btree ("event_type" text_ops);--> statement-breakpoint
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_environment_idx" ON "audit_logs" USING btree ("environment" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_ip_address_idx" ON "audit_logs" USING btree ("ip_address" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_risk_level_idx" ON "audit_logs" USING btree ("risk_level" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id" text_ops);
*/