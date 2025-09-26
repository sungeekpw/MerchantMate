-- Bulletproof Migration: Works for any database state
-- This migration adds ONLY what's missing, ignoring what already exists

-- Helper function to safely add columns
CREATE OR REPLACE FUNCTION safe_add_column(table_name text, column_name text, column_definition text)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = safe_add_column.table_name 
        AND column_name = safe_add_column.column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', table_name, column_name, column_definition);
        RAISE NOTICE 'Added column %.%', table_name, column_name;
    ELSE
        RAISE NOTICE 'Column %.% already exists, skipping', table_name, column_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function to safely add constraints
CREATE OR REPLACE FUNCTION safe_add_constraint(table_name text, constraint_name text, constraint_definition text)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = safe_add_constraint.table_name 
        AND constraint_name = safe_add_constraint.constraint_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', table_name, constraint_name, constraint_definition);
        RAISE NOTICE 'Added constraint %', constraint_name;
    ELSE
        RAISE NOTICE 'Constraint % already exists, skipping', constraint_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function to safely create indexes
CREATE OR REPLACE FUNCTION safe_create_index(index_name text, table_name text, index_definition text)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = safe_create_index.table_name 
        AND indexname = safe_create_index.index_name
    ) THEN
        EXECUTE format('CREATE INDEX %I ON %I %s', index_name, table_name, index_definition);
        RAISE NOTICE 'Created index %', index_name;
    ELSE
        RAISE NOTICE 'Index % already exists, skipping', index_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply changes safely

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

-- 3. Add missing columns (will be skipped if they exist)
SELECT safe_add_column('agents', 'company_id', 'integer');
SELECT safe_add_column('campaigns', 'acquirer_id', 'integer NOT NULL');
SELECT safe_add_column('merchants', 'company_id', 'integer');

-- 4. Add missing foreign key constraints
SELECT safe_add_constraint('acquirer_application_templates', 'acquirer_application_templates_acquirer_id_acquirers_id_fk', 'FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE cascade ON UPDATE no action');
SELECT safe_add_constraint('prospect_applications', 'prospect_applications_prospect_id_merchant_prospects_id_fk', 'FOREIGN KEY ("prospect_id") REFERENCES "public"."merchant_prospects"("id") ON DELETE cascade ON UPDATE no action');
SELECT safe_add_constraint('prospect_applications', 'prospect_applications_acquirer_id_acquirers_id_fk', 'FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE no action ON UPDATE no action');
SELECT safe_add_constraint('prospect_applications', 'prospect_applications_template_id_acquirer_application_templates_id_fk', 'FOREIGN KEY ("template_id") REFERENCES "public"."acquirer_application_templates"("id") ON DELETE no action ON UPDATE no action');
SELECT safe_add_constraint('user_company_associations', 'user_company_associations_user_id_users_id_fk', 'FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action');
SELECT safe_add_constraint('user_company_associations', 'user_company_associations_company_id_companies_id_fk', 'FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action');
SELECT safe_add_constraint('agents', 'agents_company_id_companies_id_fk', 'FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action');
SELECT safe_add_constraint('campaigns', 'campaigns_acquirer_id_acquirers_id_fk', 'FOREIGN KEY ("acquirer_id") REFERENCES "public"."acquirers"("id") ON DELETE no action ON UPDATE no action');
SELECT safe_add_constraint('merchants', 'merchants_company_id_companies_id_fk', 'FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action');

-- 5. Add missing indexes
SELECT safe_create_index('user_company_user_idx', 'user_company_associations', 'USING btree ("user_id")');
SELECT safe_create_index('user_company_company_idx', 'user_company_associations', 'USING btree ("company_id")');

-- Clean up helper functions
DROP FUNCTION IF EXISTS safe_add_column(text, text, text);
DROP FUNCTION IF EXISTS safe_add_constraint(text, text, text);
DROP FUNCTION IF EXISTS safe_create_index(text, text, text);