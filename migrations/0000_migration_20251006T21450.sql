CREATE TABLE "acquirer_application_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"acquirer_id" integer NOT NULL,
	"template_name" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"field_configuration" jsonb NOT NULL,
	"pdf_mapping_configuration" jsonb,
	"required_fields" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"conditional_fields" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "acquirer_application_templates_acquirer_id_template_name_version_unique" UNIQUE("acquirer_id","template_name","version")
);
--> statement-breakpoint
CREATE TABLE "acquirers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "acquirers_name_unique" UNIQUE("name"),
	CONSTRAINT "acquirers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "action_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger_action_id" integer,
	"trigger_id" integer,
	"action_template_id" integer,
	"action_type" varchar(50) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"recipient_name" varchar(255),
	"status" varchar(20) NOT NULL,
	"status_message" text,
	"trigger_source" varchar(100),
	"triggered_by" varchar(255),
	"context_data" jsonb,
	"response_data" jsonb,
	"executed_at" timestamp DEFAULT now(),
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"retry_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "action_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"action_type" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"config" jsonb NOT NULL,
	"variables" jsonb,
	"is_active" boolean DEFAULT true,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"location_id" integer,
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
CREATE TABLE "agent_merchants" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"merchant_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" text
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"company_id" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"territory" text,
	"commission_rate" numeric(5, 2) DEFAULT '5.00',
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "agents_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key_id" text NOT NULL,
	"key_secret" text NOT NULL,
	"organization_name" text,
	"contact_email" text NOT NULL,
	"permissions" jsonb DEFAULT '[]' NOT NULL,
	"rate_limit" integer DEFAULT 1000,
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_id_unique" UNIQUE("key_id")
);
--> statement-breakpoint
CREATE TABLE "api_request_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_time" integer,
	"user_agent" text,
	"ip_address" text,
	"request_size" integer,
	"response_size" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
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
	CONSTRAINT "business_ownership_signature_token_unique" UNIQUE("signature_token")
);
--> statement-breakpoint
CREATE TABLE "campaign_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"prospect_id" integer,
	"application_id" integer,
	"assigned_by" varchar,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
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
	CONSTRAINT "campaign_equipment_campaign_id_equipment_item_id_unique" UNIQUE("campaign_id","equipment_item_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_fee_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"fee_item_id" integer NOT NULL,
	"fee_group_fee_item_id" integer,
	"value" text NOT NULL,
	"value_type" text DEFAULT 'percentage' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_fee_values_campaign_id_fee_item_id_unique" UNIQUE("campaign_id","fee_item_id")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"pricing_type_id" integer,
	"acquirer_id" integer NOT NULL,
	"acquirer" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"equipment" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"business_type" text,
	"email" text,
	"phone" text,
	"website" text,
	"tax_id" varchar,
	"address" jsonb,
	"industry" text,
	"description" text,
	"logo_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "company_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"address_id" integer NOT NULL,
	"type" text DEFAULT 'primary' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_company_address_type" UNIQUE("company_id","address_id","type")
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
	CONSTRAINT "email_templates_name_unique" UNIQUE("name")
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
	CONSTRAINT "email_triggers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "equipment_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"image_data" text,
	"category" text,
	"manufacturer" text,
	"model_number" text,
	"specifications" jsonb DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_group_fee_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"fee_group_id" integer NOT NULL,
	"fee_item_id" integer NOT NULL,
	"fee_item_group_id" integer,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fee_group_fee_items_fee_group_id_fee_item_id_unique" UNIQUE("fee_group_id","fee_item_id")
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
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	CONSTRAINT "fee_item_groups_fee_group_id_name_unique" UNIQUE("fee_group_id","name")
);
--> statement-breakpoint
CREATE TABLE "fee_items" (
	"id" serial PRIMARY KEY NOT NULL,
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
	CONSTRAINT "fee_items_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer,
	"company_id" integer,
	"mid" varchar(50),
	"name" text NOT NULL,
	"type" text DEFAULT 'store' NOT NULL,
	"phone" text,
	"email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"operating_hours" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "locations_mid_unique" UNIQUE("mid")
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
CREATE TABLE "merchant_prospects" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"agent_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"validation_token" text,
	"validated_at" timestamp,
	"application_started_at" timestamp,
	"form_data" text,
	"current_step" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_prospects_email_unique" UNIQUE("email"),
	CONSTRAINT "merchant_prospects_validation_token_unique" UNIQUE("validation_token")
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"company_id" integer NOT NULL,
	"agent_id" integer,
	"processing_fee" numeric(5, 2) DEFAULT '2.50' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"monthly_volume" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "pdf_form_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"field_name" text NOT NULL,
	"field_type" text NOT NULL,
	"field_label" text NOT NULL,
	"is_required" boolean DEFAULT false,
	"options" text[],
	"default_value" text,
	"validation" text,
	"position" integer NOT NULL,
	"section" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf_form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"submitted_by" text,
	"submission_token" text NOT NULL,
	"applicant_email" text,
	"data" text NOT NULL,
	"status" text DEFAULT 'draft',
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pdf_form_submissions_submission_token_unique" UNIQUE("submission_token")
);
--> statement-breakpoint
CREATE TABLE "pdf_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"status" text DEFAULT 'active',
	"uploaded_by" text NOT NULL,
	"show_in_navigation" boolean DEFAULT false,
	"navigation_title" text,
	"allowed_roles" text[] DEFAULT '{"admin"}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_type_fee_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"pricing_type_id" integer NOT NULL,
	"fee_item_id" integer NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_type_fee_items_pricing_type_id_fee_item_id_unique" UNIQUE("pricing_type_id","fee_item_id")
);
--> statement-breakpoint
CREATE TABLE "pricing_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"author" text DEFAULT 'System' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "prospect_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"acquirer_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"template_version" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"application_data" jsonb DEFAULT '{}' NOT NULL,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"generated_pdf_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prospect_applications_prospect_id_acquirer_id_unique" UNIQUE("prospect_id","acquirer_id")
);
--> statement-breakpoint
CREATE TABLE "prospect_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"ownership_percentage" numeric(5, 2) NOT NULL,
	"signature_token" text,
	"email_sent" boolean DEFAULT false,
	"email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
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
	CONSTRAINT "prospect_signatures_signature_token_unique" UNIQUE("signature_token")
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
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"merchant_id" integer NOT NULL,
	"mid" varchar(50),
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"status" text NOT NULL,
	"processing_fee" numeric(12, 2),
	"net_amount" numeric(12, 2),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "transactions_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "trigger_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger_id" integer NOT NULL,
	"action_template_id" integer NOT NULL,
	"sequence_order" integer DEFAULT 1,
	"conditions" jsonb,
	"requires_email_preference" boolean DEFAULT false,
	"requires_sms_preference" boolean DEFAULT false,
	"delay_seconds" integer DEFAULT 0,
	"retry_on_failure" boolean DEFAULT true,
	"max_retries" integer DEFAULT 3,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trigger_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger_key" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"context_schema" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "trigger_catalog_trigger_key_unique" UNIQUE("trigger_key")
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
CREATE TABLE "user_company_associations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"company_id" integer NOT NULL,
	"company_role" text NOT NULL,
	"permissions" jsonb DEFAULT '{}',
	"title" text,
	"department" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_company" UNIQUE("user_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "user_dashboard_preferences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_dashboard_preferences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"widget_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"size" text DEFAULT 'medium' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"username" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"phone" varchar NOT NULL,
	"profile_image_url" varchar,
	"communication_preference" text DEFAULT 'email' NOT NULL,
	"roles" text[] DEFAULT ARRAY['merchant'] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"permissions" jsonb DEFAULT '{}',
	"last_login_at" timestamp,
	"last_login_ip" varchar,
	"timezone" varchar DEFAULT 'UTC',
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" varchar,
	"password_reset_token" varchar,
	"password_reset_expires" timestamp,
	"email_verified" boolean DEFAULT false,
	"email_verification_token" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "acquirer_application_templates" ADD CONSTRAINT "acquirer_application_templates_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_activity" ADD CONSTRAINT "action_activity_trigger_action_id_trigger_actions_id_fk" FOREIGN KEY ("trigger_action_id") REFERENCES "public"."trigger_actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_activity" ADD CONSTRAINT "action_activity_trigger_id_trigger_catalog_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."trigger_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_activity" ADD CONSTRAINT "action_activity_action_template_id_action_templates_id_fk" FOREIGN KEY ("action_template_id") REFERENCES "public"."action_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_ownership" ADD CONSTRAINT "business_ownership_form_submission_id_pdf_form_submissions_id_fk" FOREIGN KEY ("form_submission_id") REFERENCES "public"."pdf_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_ownership" ADD CONSTRAINT "business_ownership_prospect_id_merchant_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_prospect_id_merchant_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_equipment" ADD CONSTRAINT "campaign_equipment_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_equipment" ADD CONSTRAINT "campaign_equipment_equipment_item_id_equipment_items_id_fk" FOREIGN KEY ("equipment_item_id") REFERENCES "public"."equipment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_fee_values" ADD CONSTRAINT "campaign_fee_values_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_fee_values" ADD CONSTRAINT "campaign_fee_values_fee_item_id_fee_items_id_fk" FOREIGN KEY ("fee_item_id") REFERENCES "public"."fee_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_fee_values" ADD CONSTRAINT "campaign_fee_values_fee_group_fee_item_id_fee_group_fee_items_id_fk" FOREIGN KEY ("fee_group_fee_item_id") REFERENCES "public"."fee_group_fee_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_pricing_type_id_pricing_types_id_fk" FOREIGN KEY ("pricing_type_id") REFERENCES "public"."pricing_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_audit_log_id_audit_logs_id_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_activity" ADD CONSTRAINT "email_activity_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_triggers" ADD CONSTRAINT "email_triggers_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_group_fee_items" ADD CONSTRAINT "fee_group_fee_items_fee_group_id_fee_groups_id_fk" FOREIGN KEY ("fee_group_id") REFERENCES "public"."fee_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_group_fee_items" ADD CONSTRAINT "fee_group_fee_items_fee_item_id_fee_items_id_fk" FOREIGN KEY ("fee_item_id") REFERENCES "public"."fee_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_group_fee_items" ADD CONSTRAINT "fee_group_fee_items_fee_item_group_id_fee_item_groups_id_fk" FOREIGN KEY ("fee_item_group_id") REFERENCES "public"."fee_item_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_item_groups" ADD CONSTRAINT "fee_item_groups_fee_group_id_fee_groups_id_fk" FOREIGN KEY ("fee_group_id") REFERENCES "public"."fee_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_prospects" ADD CONSTRAINT "merchant_prospects_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_form_fields" ADD CONSTRAINT "pdf_form_fields_form_id_pdf_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."pdf_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_form_submissions" ADD CONSTRAINT "pdf_form_submissions_form_id_pdf_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."pdf_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_form_submissions" ADD CONSTRAINT "pdf_form_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_forms" ADD CONSTRAINT "pdf_forms_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_type_fee_items" ADD CONSTRAINT "pricing_type_fee_items_pricing_type_id_pricing_types_id_fk" FOREIGN KEY ("pricing_type_id") REFERENCES "public"."pricing_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_type_fee_items" ADD CONSTRAINT "pricing_type_fee_items_fee_item_id_fee_items_id_fk" FOREIGN KEY ("fee_item_id") REFERENCES "public"."fee_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_prospect_id_merchant_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_template_id_acquirer_application_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."acquirer_application_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_owners" ADD CONSTRAINT "prospect_owners_prospect_id_merchant_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_signatures" ADD CONSTRAINT "prospect_signatures_prospect_id_merchant_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_signatures" ADD CONSTRAINT "prospect_signatures_owner_id_prospect_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."prospect_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_audit_log_id_audit_logs_id_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trigger_actions" ADD CONSTRAINT "trigger_actions_trigger_id_trigger_catalog_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."trigger_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trigger_actions" ADD CONSTRAINT "trigger_actions_action_template_id_action_templates_id_fk" FOREIGN KEY ("action_template_id") REFERENCES "public"."action_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_codes" ADD CONSTRAINT "two_factor_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company_associations" ADD CONSTRAINT "user_company_associations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company_associations" ADD CONSTRAINT "user_company_associations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_activity_trigger_action_id_idx" ON "action_activity" USING btree ("trigger_action_id");--> statement-breakpoint
CREATE INDEX "action_activity_action_type_idx" ON "action_activity" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "action_activity_recipient_idx" ON "action_activity" USING btree ("recipient");--> statement-breakpoint
CREATE INDEX "action_activity_status_idx" ON "action_activity" USING btree ("status");--> statement-breakpoint
CREATE INDEX "action_activity_executed_at_idx" ON "action_activity" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "action_templates_action_type_idx" ON "action_templates" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "action_templates_category_idx" ON "action_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "action_templates_name_idx" ON "action_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "api_key_id_idx" ON "api_request_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "api_request_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "audit_logs_ip_address_idx" ON "audit_logs" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_risk_level_idx" ON "audit_logs" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "audit_logs_environment_idx" ON "audit_logs" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "company_addresses_company_idx" ON "company_addresses" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_addresses_address_idx" ON "company_addresses" USING btree ("address_id");--> statement-breakpoint
CREATE INDEX "data_access_logs_user_id_idx" ON "data_access_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_access_logs_data_type_idx" ON "data_access_logs" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX "data_access_logs_table_name_idx" ON "data_access_logs" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "data_access_logs_access_type_idx" ON "data_access_logs" USING btree ("access_type");--> statement-breakpoint
CREATE INDEX "data_access_logs_created_at_idx" ON "data_access_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_activity_template_id_idx" ON "email_activity" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "email_activity_recipient_email_idx" ON "email_activity" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "email_activity_status_idx" ON "email_activity" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_activity_sent_at_idx" ON "email_activity" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "security_events_event_type_idx" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_events_alert_status_idx" ON "security_events" USING btree ("alert_status");--> statement-breakpoint
CREATE INDEX "security_events_detected_at_idx" ON "security_events" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "trigger_actions_trigger_id_idx" ON "trigger_actions" USING btree ("trigger_id");--> statement-breakpoint
CREATE INDEX "trigger_actions_action_template_id_idx" ON "trigger_actions" USING btree ("action_template_id");--> statement-breakpoint
CREATE INDEX "trigger_actions_sequence_order_idx" ON "trigger_actions" USING btree ("sequence_order");--> statement-breakpoint
CREATE UNIQUE INDEX "trigger_actions_trigger_sequence_idx" ON "trigger_actions" USING btree ("trigger_id","sequence_order") WHERE is_active = true;--> statement-breakpoint
CREATE INDEX "user_company_user_idx" ON "user_company_associations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_company_company_idx" ON "user_company_associations" USING btree ("company_id");