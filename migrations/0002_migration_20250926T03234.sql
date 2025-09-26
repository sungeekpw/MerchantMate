-- Bulletproof Migration: Fixed syntax version
-- This migration adds ONLY what's missing, ignoring what already exists

-- 1. Modify campaigns.acquirer to allow NULL (if currently NOT NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'acquirer' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "campaigns" ALTER COLUMN "acquirer" DROP NOT NULL;
        RAISE NOTICE 'Made campaigns.acquirer nullable';
    ELSE
        RAISE NOTICE 'campaigns.acquirer already nullable or does not exist';
    END IF;
END $$;

-- 2. Set users.roles default (if not already set)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'roles' 
        AND column_default LIKE '%merchant%'
    ) THEN
        ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['merchant'];
        RAISE NOTICE 'Set users.roles default';
    ELSE
        RAISE NOTICE 'users.roles default already set';
    END IF;
END $$;

-- 3. Add missing columns safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE "agents" ADD COLUMN "company_id" integer;
        RAISE NOTICE 'Added agents.company_id';
    ELSE
        RAISE NOTICE 'agents.company_id already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'acquirer_id'
    ) THEN
        ALTER TABLE "campaigns" ADD COLUMN "acquirer_id" integer NOT NULL;
        RAISE NOTICE 'Added campaigns.acquirer_id';
    ELSE
        RAISE NOTICE 'campaigns.acquirer_id already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'merchants' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE "merchants" ADD COLUMN "company_id" integer;
        RAISE NOTICE 'Added merchants.company_id';
    ELSE
        RAISE NOTICE 'merchants.company_id already exists';
    END IF;
END $$;

-- 4. Add missing foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'acquirer_application_templates' 
        AND constraint_name = 'acquirer_application_templates_acquirer_id_acquirers_id_fk'
    ) THEN
        ALTER TABLE "acquirer_application_templates" ADD CONSTRAINT "acquirer_application_templates_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE cascade ON UPDATE no action;
        RAISE NOTICE 'Added FK: acquirer_application_templates_acquirer_id_acquirers_id_fk';
    ELSE
        RAISE NOTICE 'FK acquirer_application_templates_acquirer_id_acquirers_id_fk already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'prospect_applications' 
        AND constraint_name = 'prospect_applications_prospect_id_merchant_prospects_id_fk'
    ) THEN
        ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_prospect_id_merchant_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action;
        RAISE NOTICE 'Added FK: prospect_applications_prospect_id_merchant_prospects_id_fk';
    ELSE
        RAISE NOTICE 'FK prospect_applications_prospect_id_merchant_prospects_id_fk already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'prospect_applications' 
        AND constraint_name = 'prospect_applications_acquirer_id_acquirers_id_fk'
    ) THEN
        ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE no action ON UPDATE no action;
        RAISE NOTICE 'Added FK: prospect_applications_acquirer_id_acquirers_id_fk';
    ELSE
        RAISE NOTICE 'FK prospect_applications_acquirer_id_acquirers_id_fk already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'prospect_applications' 
        AND constraint_name = 'prospect_applications_template_id_acquirer_application_templates_id_fk'
    ) THEN
        ALTER TABLE "prospect_applications" ADD CONSTRAINT "prospect_applications_template_id_acquirer_application_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."acquirer_application_templates"("id") ON DELETE no action ON UPDATE no action;
        RAISE NOTICE 'Added FK: prospect_applications_template_id_acquirer_application_templates_id_fk';
    ELSE
        RAISE NOTICE 'FK prospect_applications_template_id_acquirer_application_templates_id_fk already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'user_company_associations' 
        AND constraint_name = 'user_company_associations_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "user_company_associations" ADD CONSTRAINT "user_company_associations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
        RAISE NOTICE 'Added FK: user_company_associations_user_id_users_id_fk';
    ELSE
        RAISE NOTICE 'FK user_company_associations_user_id_users_id_fk already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'user_company_associations' 
        AND constraint_name = 'user_company_associations_company_id_companies_id_fk'
    ) THEN
        ALTER TABLE "user_company_associations" ADD CONSTRAINT "user_company_associations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
        RAISE NOTICE 'Added FK: user_company_associations_company_id_companies_id_fk';
    ELSE
        RAISE NOTICE 'FK user_company_associations_company_id_companies_id_fk already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND constraint_name = 'agents_company_id_companies_id_fk'
    ) THEN
        ALTER TABLE "agents" ADD CONSTRAINT "agents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
        RAISE NOTICE 'Added FK: agents_company_id_companies_id_fk';
    ELSE
        RAISE NOTICE 'FK agents_company_id_companies_id_fk already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND constraint_name = 'campaigns_acquirer_id_acquirers_id_fk'
    ) THEN
        ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_acquirer_id_acquirers_id_fk" FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE no action ON UPDATE no action;
        RAISE NOTICE 'Added FK: campaigns_acquirer_id_acquirers_id_fk';
    ELSE
        RAISE NOTICE 'FK campaigns_acquirer_id_acquirers_id_fk already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'merchants' 
        AND constraint_name = 'merchants_company_id_companies_id_fk'
    ) THEN
        ALTER TABLE "merchants" ADD CONSTRAINT "merchants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
        RAISE NOTICE 'Added FK: merchants_company_id_companies_id_fk';
    ELSE
        RAISE NOTICE 'FK merchants_company_id_companies_id_fk already exists';
    END IF;
END $$;

-- 5. Add missing indexes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'user_company_associations' 
        AND indexname = 'user_company_user_idx'
    ) THEN
        CREATE INDEX "user_company_user_idx" ON "user_company_associations" USING btree ("user_id");
        RAISE NOTICE 'Created index: user_company_user_idx';
    ELSE
        RAISE NOTICE 'Index user_company_user_idx already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'user_company_associations' 
        AND indexname = 'user_company_company_idx'
    ) THEN
        CREATE INDEX "user_company_company_idx" ON "user_company_associations" USING btree ("company_id");
        RAISE NOTICE 'Created index: user_company_company_idx';
    ELSE
        RAISE NOTICE 'Index user_company_company_idx already exists';
    END IF;
END $$;