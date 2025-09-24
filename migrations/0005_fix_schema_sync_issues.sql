-- Fix schema synchronization issues
-- Migration: 0005_fix_schema_sync_issues
-- Generated: 2025-09-24

BEGIN;

-- Fix phone column type in users table if needed
-- This handles the phone column prompt by ensuring proper type
DO $$
BEGIN
    -- Check if phone column needs updating
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'phone' 
        AND data_type = 'character varying'
    ) THEN
        -- Update the column to match schema expectations
        ALTER TABLE users ALTER COLUMN phone TYPE text;
        
        -- Ensure NOT NULL constraint
        UPDATE users SET phone = COALESCE(phone, '') WHERE phone IS NULL;
        ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
    END IF;
END $$;

-- Handle email_templates unique constraint issue
-- Add constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'email_templates' 
        AND constraint_name = 'email_templates_name_unique'
    ) THEN
        -- First, ensure no duplicate names exist
        WITH duplicates AS (
            SELECT name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as rn
            FROM email_templates
        )
        DELETE FROM email_templates 
        WHERE id IN (
            SELECT et.id FROM email_templates et
            JOIN duplicates d ON et.name = d.name AND d.rn > 1
        );
        
        -- Now add the unique constraint
        ALTER TABLE email_templates ADD CONSTRAINT email_templates_name_unique UNIQUE (name);
    END IF;
END $$;

COMMIT;