-- Fixed Migration: Only ALTER TABLE statements for existing schema
-- Removed CREATE TABLE statements for tables that already exist in test/production

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