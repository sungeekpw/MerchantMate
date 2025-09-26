-- Fix Remaining Schema Differences
-- This migration resolves the specific differences shown in schema comparison UI

-- 1. Create user_company_associations table (for development environment)
CREATE TABLE IF NOT EXISTS "public"."user_company_associations" (
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

-- 2. Add companies.settings column (for both development and test environments)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'companies' AND column_name = 'settings' AND table_schema = 'public') THEN
        ALTER TABLE "companies" ADD COLUMN "settings" JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. Add Foreign Key Constraints for user_company_associations (only if they don't exist)
DO $$
BEGIN
    -- Foreign key: user_company_associations.company_id -> companies.id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_company_associations' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'user_company_associations_company_id_companies_id_fk' 
                      AND table_name = 'user_company_associations' AND table_schema = 'public') THEN
        ALTER TABLE "user_company_associations" 
        ADD CONSTRAINT "user_company_associations_company_id_companies_id_fk" 
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
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
    END IF;
END $$;

-- 4. Add Unique Constraint (only if it doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_company_associations' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'user_company_associations_user_id_company_id_unique' 
                      AND table_name = 'user_company_associations' AND table_schema = 'public') THEN
        ALTER TABLE "user_company_associations" 
        ADD CONSTRAINT "user_company_associations_user_id_company_id_unique" 
        UNIQUE ("user_id", "company_id");
    END IF;
END $$;