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
	"updated_at" timestamp DEFAULT now() NOT NULL
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
ALTER TABLE "campaigns" ALTER COLUMN "acquirer" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['merchant'];--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "company_id" integer;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "acquirer_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "company_id" integer;--> statement-breakpoint
ALTER TABLE "acquirer_application_templates" ADD CONSTRAINT "acquirer_application_templates_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_prospect_id_merchant_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_template_id_acquirer_application_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."acquirer_application_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company_associations" ADD CONSTRAINT "user_company_associations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company_associations" ADD CONSTRAINT "user_company_associations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_company_user_idx" ON "user_company_associations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_company_company_idx" ON "user_company_associations" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;