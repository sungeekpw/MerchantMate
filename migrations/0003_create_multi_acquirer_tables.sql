-- Bulletproof Migration: Create Multi-Acquirer Tables for Test Environment
-- This migration creates all missing multi-acquirer tables in the test database

-- 1. Create companies table (foundational table)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public') THEN
        CREATE TABLE "public"."companies" (
            "id" SERIAL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "business_type" TEXT,
            "email" TEXT,
            "phone" TEXT,
            "website" TEXT,
            "tax_id" VARCHAR,
            "address" JSONB,
            "industry" TEXT,
            "description" TEXT,
            "logo_url" TEXT,
            "status" TEXT NOT NULL DEFAULT 'active',
            "settings" JSONB DEFAULT '{}',
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT "companies_status_check" CHECK (status IN ('active', 'inactive', 'suspended')),
            CONSTRAINT "companies_business_type_check" CHECK (business_type IN ('corporation', 'llc', 'partnership', 'sole_proprietorship', 'nonprofit'))
        );
        RAISE NOTICE 'Created companies table';
    ELSE
        RAISE NOTICE 'Companies table already exists';
    END IF;
END $$;

-- 2. Create acquirers table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acquirers' AND table_schema = 'public') THEN
        CREATE TABLE "public"."acquirers" (
            "id" SERIAL PRIMARY KEY,
            "name" TEXT NOT NULL UNIQUE,
            "display_name" TEXT NOT NULL,
            "code" TEXT NOT NULL UNIQUE,
            "description" TEXT,
            "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT "acquirers_code_check" CHECK (LENGTH(code) >= 2 AND LENGTH(code) <= 10),
            CONSTRAINT "acquirers_name_check" CHECK (LENGTH(name) >= 2)
        );
        RAISE NOTICE 'Created acquirers table';
    ELSE
        RAISE NOTICE 'Acquirers table already exists';
    END IF;
END $$;

-- 3. Create acquirer_application_templates table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acquirer_application_templates' AND table_schema = 'public') THEN
        CREATE TABLE "public"."acquirer_application_templates" (
            "id" SERIAL PRIMARY KEY,
            "acquirer_id" INTEGER NOT NULL,
            "template_name" TEXT NOT NULL,
            "version" TEXT NOT NULL DEFAULT '1.0',
            "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
            "field_configuration" JSONB NOT NULL,
            "pdf_mapping_configuration" JSONB,
            "required_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            "conditional_fields" JSONB,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT "acquirer_application_templates_version_check" CHECK (version ~ '^[0-9]+\.[0-9]+$'),
            CONSTRAINT "acquirer_application_templates_template_name_check" CHECK (LENGTH(template_name) >= 3)
        );
        RAISE NOTICE 'Created acquirer_application_templates table';
    ELSE
        RAISE NOTICE 'Acquirer_application_templates table already exists';
    END IF;
END $$;

-- 4. Create prospect_applications table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prospect_applications' AND table_schema = 'public') THEN
        CREATE TABLE "public"."prospect_applications" (
            "id" SERIAL PRIMARY KEY,
            "prospect_id" INTEGER NOT NULL,
            "acquirer_id" INTEGER NOT NULL,
            "template_id" INTEGER NOT NULL,
            "template_version" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'draft',
            "application_data" JSONB NOT NULL DEFAULT '{}',
            "submitted_at" TIMESTAMP,
            "approved_at" TIMESTAMP,
            "rejected_at" TIMESTAMP,
            "rejection_reason" TEXT,
            "generated_pdf_path" TEXT,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT "prospect_applications_status_check" CHECK (status IN ('draft', 'in_progress', 'submitted', 'approved', 'rejected', 'withdrawn'))
        );
        RAISE NOTICE 'Created prospect_applications table';
    ELSE
        RAISE NOTICE 'Prospect_applications table already exists';
    END IF;
END $$;

-- 5. Create user_company_associations table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_company_associations' AND table_schema = 'public') THEN
        CREATE TABLE "public"."user_company_associations" (
            "id" SERIAL PRIMARY KEY,
            "user_id" VARCHAR NOT NULL,
            "company_id" INTEGER NOT NULL,
            "company_role" TEXT NOT NULL,
            "permissions" JSONB DEFAULT '{}',
            "title" TEXT,
            "department" TEXT,
            "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
            "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
            "start_date" TIMESTAMP,
            "end_date" TIMESTAMP,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT "user_company_associations_role_check" CHECK (company_role IN ('owner', 'admin', 'manager', 'employee', 'contractor', 'consultant'))
        );
        RAISE NOTICE 'Created user_company_associations table';
    ELSE
        RAISE NOTICE 'User_company_associations table already exists';
    END IF;
END $$;

-- 6. Add Foreign Key Constraints (only if tables exist and constraints don't exist)
DO $$
BEGIN
    -- Foreign key: acquirer_application_templates.acquirer_id -> acquirers.id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acquirer_application_templates' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acquirers' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'acquirer_application_templates_acquirer_id_acquirers_id_fk' 
                      AND table_name = 'acquirer_application_templates' AND table_schema = 'public') THEN
        ALTER TABLE "acquirer_application_templates" 
        ADD CONSTRAINT "acquirer_application_templates_acquirer_id_acquirers_id_fk" 
        FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        RAISE NOTICE 'Added FK: acquirer_application_templates.acquirer_id -> acquirers.id';
    END IF;

    -- Foreign key: prospect_applications.prospect_id -> merchant_prospects.id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prospect_applications' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchant_prospects' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'prospect_applications_prospect_id_merchant_prospects_id_fk' 
                      AND table_name = 'prospect_applications' AND table_schema = 'public') THEN
        ALTER TABLE "prospect_applications" 
        ADD CONSTRAINT "prospect_applications_prospect_id_merchant_prospects_id_fk" 
        FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        RAISE NOTICE 'Added FK: prospect_applications.prospect_id -> merchant_prospects.id';
    END IF;

    -- Foreign key: prospect_applications.acquirer_id -> acquirers.id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prospect_applications' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acquirers' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'prospect_applications_acquirer_id_acquirers_id_fk' 
                      AND table_name = 'prospect_applications' AND table_schema = 'public') THEN
        ALTER TABLE "prospect_applications" 
        ADD CONSTRAINT "prospect_applications_acquirer_id_acquirers_id_fk" 
        FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        RAISE NOTICE 'Added FK: prospect_applications.acquirer_id -> acquirers.id';
    END IF;

    -- Foreign key: prospect_applications.template_id -> acquirer_application_templates.id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prospect_applications' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acquirer_application_templates' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'prospect_applications_template_id_acquirer_application_templates_id_fk' 
                      AND table_name = 'prospect_applications' AND table_schema = 'public') THEN
        ALTER TABLE "prospect_applications" 
        ADD CONSTRAINT "prospect_applications_template_id_acquirer_application_templates_id_fk" 
        FOREIGN KEY ("template_id") REFERENCES "public"."acquirer_application_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        RAISE NOTICE 'Added FK: prospect_applications.template_id -> acquirer_application_templates.id';
    END IF;

    -- Foreign key: user_company_associations.company_id -> companies.id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_company_associations' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'user_company_associations_company_id_companies_id_fk' 
                      AND table_name = 'user_company_associations' AND table_schema = 'public') THEN
        ALTER TABLE "user_company_associations" 
        ADD CONSTRAINT "user_company_associations_company_id_companies_id_fk" 
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        RAISE NOTICE 'Added FK: user_company_associations.company_id -> companies.id';
    END IF;

    -- Foreign key: user_company_associations.user_id -> users.id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_company_associations' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'user_company_associations_user_id_users_id_fk' 
                      AND table_name = 'user_company_associations' AND table_schema = 'public') THEN
        ALTER TABLE "user_company_associations" 
        ADD CONSTRAINT "user_company_associations_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        RAISE NOTICE 'Added FK: user_company_associations.user_id -> users.id';
    END IF;
END $$;

-- 7. Add Unique Constraints (only if they don't exist)
DO $$
BEGIN
    -- Unique constraint: acquirer_application_templates (acquirer_id, template_name, version)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acquirer_application_templates' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'acquirer_application_templates_acquirer_id_template_name_version_unique' 
                      AND table_name = 'acquirer_application_templates' AND table_schema = 'public') THEN
        ALTER TABLE "acquirer_application_templates" 
        ADD CONSTRAINT "acquirer_application_templates_acquirer_id_template_name_version_unique" 
        UNIQUE ("acquirer_id", "template_name", "version");
        RAISE NOTICE 'Added unique constraint: acquirer_application_templates (acquirer_id, template_name, version)';
    END IF;

    -- Unique constraint: prospect_applications (prospect_id, acquirer_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prospect_applications' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'prospect_applications_prospect_id_acquirer_id_unique' 
                      AND table_name = 'prospect_applications' AND table_schema = 'public') THEN
        ALTER TABLE "prospect_applications" 
        ADD CONSTRAINT "prospect_applications_prospect_id_acquirer_id_unique" 
        UNIQUE ("prospect_id", "acquirer_id");
        RAISE NOTICE 'Added unique constraint: prospect_applications (prospect_id, acquirer_id)';
    END IF;

    -- Unique constraint: user_company_associations (user_id, company_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_company_associations' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'user_company_associations_user_id_company_id_unique' 
                      AND table_name = 'user_company_associations' AND table_schema = 'public') THEN
        ALTER TABLE "user_company_associations" 
        ADD CONSTRAINT "user_company_associations_user_id_company_id_unique" 
        UNIQUE ("user_id", "company_id");
        RAISE NOTICE 'Added unique constraint: user_company_associations (user_id, company_id)';
    END IF;
END $$;

-- 8. Update merchants table to add companyId reference (if not exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchants' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'merchants' AND column_name = 'company_id' AND table_schema = 'public') THEN
        ALTER TABLE "merchants" ADD COLUMN "company_id" INTEGER;
        RAISE NOTICE 'Added company_id column to merchants table';
    END IF;

    -- Add foreign key constraint for merchants.company_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'company_id' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'merchants_company_id_companies_id_fk' 
                      AND table_name = 'merchants' AND table_schema = 'public') THEN
        ALTER TABLE "merchants" 
        ADD CONSTRAINT "merchants_company_id_companies_id_fk" 
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        RAISE NOTICE 'Added FK: merchants.company_id -> companies.id';
    END IF;
END $$;

-- 9. Update agents table to add companyId reference (if not exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'agents' AND column_name = 'company_id' AND table_schema = 'public') THEN
        ALTER TABLE "agents" ADD COLUMN "company_id" INTEGER;
        RAISE NOTICE 'Added company_id column to agents table';
    END IF;

    -- Add foreign key constraint for agents.company_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'company_id' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'agents_company_id_companies_id_fk' 
                      AND table_name = 'agents' AND table_schema = 'public') THEN
        ALTER TABLE "agents" 
        ADD CONSTRAINT "agents_company_id_companies_id_fk" 
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        RAISE NOTICE 'Added FK: agents.company_id -> companies.id';
    END IF;
END $$;

-- 10. Update campaigns table to allow NULL acquirer (if not already done)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'campaigns' AND column_name = 'acquirer' AND is_nullable = 'NO' AND table_schema = 'public') THEN
        ALTER TABLE "campaigns" ALTER COLUMN "acquirer" DROP NOT NULL;
        RAISE NOTICE 'Modified campaigns.acquirer to allow NULL';
    END IF;
END $$;

RAISE NOTICE 'Multi-acquirer tables migration completed successfully!';