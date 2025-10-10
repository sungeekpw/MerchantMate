#!/usr/bin/env tsx
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

interface ColumnInfo {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: string;
  columnDefault: string | null;
  position: number;
}

async function getSchema(connectionString: string): Promise<Map<string, ColumnInfo[]>> {
  const pool = new Pool({ connectionString });
  
  try {
    const result = await pool.query(`
      SELECT 
        table_name as "tableName",
        column_name as "columnName",
        data_type as "dataType",
        is_nullable as "isNullable",
        column_default as "columnDefault",
        ordinal_position as "position"
      FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name NOT IN ('drizzle_migrations', 'drizzle__migrations', 'schema_migrations')
      ORDER BY table_name, ordinal_position
    `);

    const schemaMap = new Map<string, ColumnInfo[]>();
    
    for (const row of result.rows) {
      if (!schemaMap.has(row.tableName)) {
        schemaMap.set(row.tableName, []);
      }
      schemaMap.get(row.tableName)!.push(row);
    }

    return schemaMap;
  } finally {
    await pool.end();
  }
}

function generateSyncSQL(dev: Map<string, ColumnInfo[]>, test: Map<string, ColumnInfo[]>): string[] {
  const sqlStatements: string[] = [];

  // Add missing columns (in Dev but not in Test)
  for (const [tableName, devColumns] of dev.entries()) {
    const testColumns = test.get(tableName);
    
    if (!testColumns) {
      console.log(`⚠️  Table ${tableName} exists in Dev but not in Test - manual intervention needed`);
      continue;
    }

    const testColumnNames = new Set(testColumns.map(c => c.columnName));
    
    for (const devCol of devColumns) {
      if (!testColumnNames.has(devCol.columnName)) {
        const nullable = devCol.isNullable === 'YES' ? '' : ' NOT NULL';
        const defaultVal = devCol.columnDefault ? ` DEFAULT ${devCol.columnDefault}` : '';
        
        sqlStatements.push(
          `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${devCol.columnName} ${devCol.dataType.toUpperCase()}${nullable}${defaultVal};`
        );
      }
    }
  }

  // Remove extra columns (in Test but not in Dev)
  for (const [tableName, testColumns] of test.entries()) {
    const devColumns = dev.get(tableName);
    
    if (!devColumns) {
      console.log(`⚠️  Table ${tableName} exists in Test but not in Dev - manual intervention needed`);
      continue;
    }

    const devColumnNames = new Set(devColumns.map(c => c.columnName));
    
    for (const testCol of testColumns) {
      if (!devColumnNames.has(testCol.columnName)) {
        sqlStatements.push(
          `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${testCol.columnName};`
        );
      }
    }
  }

  return sqlStatements;
}

async function main() {
  const devUrl = process.env.DEV_DATABASE_URL;
  const testUrl = process.env.TEST_DATABASE_URL;

  if (!devUrl || !testUrl) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  console.log('🔍 Analyzing schema differences...\n');

  const devSchema = await getSchema(devUrl);
  const testSchema = await getSchema(testUrl);
  
  const syncSQL = generateSyncSQL(devSchema, testSchema);

  if (syncSQL.length === 0) {
    console.log('✅ No synchronization needed - schemas match!\n');
    return;
  }

  console.log(`📝 Generated ${syncSQL.length} SQL statements to sync Test with Development\n`);

  // Create migrations directory if it doesn't exist
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `schema-sync-${timestamp}.sql`;
  const filepath = join(process.cwd(), 'migrations', filename);

  // Write to file
  const sqlContent = [
    `-- Schema Synchronization: Development → Test`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total statements: ${syncSQL.length}`,
    ``,
    `BEGIN;`,
    ``,
    ...syncSQL,
    ``,
    `COMMIT;`,
    ``,
    `-- Verification query:`,
    `-- SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position;`,
  ].join('\n');

  try {
    writeFileSync(filepath, sqlContent);
    console.log(`✅ Sync SQL written to: ${filepath}\n`);
  } catch (error) {
    console.log('📋 Sync SQL statements:\n');
    console.log(sqlContent);
  }

  console.log('💡 TO APPLY THIS SYNC:');
  console.log('─'.repeat(80));
  console.log(`1. Review the SQL file: ${filename}`);
  console.log(`2. Apply to Test: psql "$TEST_DATABASE_URL" < migrations/${filename}`);
  console.log(`3. Verify: tsx scripts/schema-drift-simple.ts\n`);
}

main().catch(console.error);
