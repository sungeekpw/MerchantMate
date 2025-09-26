-- Final Migration: Only the changes that haven't been applied yet
-- Based on current test database state analysis

-- Only add acquirer_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'acquirer_id') THEN
        ALTER TABLE "campaigns" ADD COLUMN "acquirer_id" integer NOT NULL;
    END IF;
END $$;

-- Only modify acquirer column if it's still NOT NULL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'acquirer' AND is_nullable = 'NO') THEN
        ALTER TABLE "campaigns" ALTER COLUMN "acquirer" DROP NOT NULL;
    END IF;
END $$;

-- Only modify users default if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'roles' AND column_default LIKE '%merchant%') THEN
        ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['merchant'];
    END IF;
END $$;

-- Add foreign key constraints (these will be skipped if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'acquirer_application_templates' AND constraint_name = 'acquirer_application_templates_acquirer_id_acquirers_id_fk') THEN
        ALTER TABLE "acquirer_application_templates" ADD CONSTRAINT "acquirer_application_templates_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'prospect_applications' AND constraint_name = 'prospect_applications_prospect_id_merchant_prospects_id_fk') THEN
        ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_prospect_id_merchant_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'prospect_applications' AND constraint_name = 'prospect_applications_acquirer_id_acquirers_id_fk') THEN
        ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'prospect_applications' AND constraint_name = 'prospect_applications_template_id_acquirer_application_templates_id_fk') THEN
        ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_template_id_acquirer_application_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."acquirer_application_templates"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'user_company_associations' AND constraint_name = 'user_company_associations_user_id_users_id_fk') THEN
        ALTER TABLE "user_company_associations" ADD CONSTRAINT "user_company_associations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'user_company_associations' AND constraint_name = 'user_company_associations_company_id_companies_id_fk') THEN
        ALTER TABLE "user_company_associations" ADD CONSTRAINT "user_company_associations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'agents' AND constraint_name = 'agents_company_id_companies_id_fk') THEN
        ALTER TABLE "agents" ADD CONSTRAINT "agents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'campaigns' AND constraint_name = 'campaigns_acquirer_id_acquirers_id_fk') THEN
        ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'merchants' AND constraint_name = 'merchants_company_id_companies_id_fk') THEN
        ALTER TABLE "merchants" ADD CONSTRAINT "merchants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- Add indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_company_associations' AND indexname = 'user_company_user_idx') THEN
        CREATE INDEX "user_company_user_idx" ON "user_company_associations" USING btree ("user_id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_company_associations' AND indexname = 'user_company_company_idx') THEN
        CREATE INDEX "user_company_company_idx" ON "user_company_associations" USING btree ("company_id");
    END IF;
END $$;