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
  // Get source and target environments from command line args
  const sourceEnv = process.argv[2] || 'development';
  const targetEnv = process.argv[3] || 'test';
  
  // Map environment names to database URL environment variables
  const envUrlMap: Record<string, string> = {
    'development': process.env.DEV_DATABASE_URL || '',
    'test': process.env.TEST_DATABASE_URL || '',
    'production': process.env.DATABASE_URL || ''
  };

  const sourceUrl = envUrlMap[sourceEnv];
  const targetUrl = envUrlMap[targetEnv];

  if (!sourceUrl || !targetUrl) {
    console.error(`❌ Missing environment variables for ${sourceEnv} or ${targetEnv}`);
    process.exit(1);
  }

  console.log(`🔍 Analyzing schema differences: ${sourceEnv} → ${targetEnv}\n`);

  const sourceSchema = await getSchema(sourceUrl);
  const targetSchema = await getSchema(targetUrl);
  
  const syncSQL = generateSyncSQL(sourceSchema, targetSchema);

  if (syncSQL.length === 0) {
    console.log('✅ No synchronization needed - schemas match!\n');
    return;
  }

  console.log(`📝 Generated ${syncSQL.length} SQL statements to sync ${targetEnv} with ${sourceEnv}\n`);

  // Create migrations directory if it doesn't exist
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `schema-fix-${sourceEnv}-to-${targetEnv}-${timestamp}.sql`;
  const filepath = join(process.cwd(), 'migrations', filename);

  // Write to file
  const sqlContent = [
    `-- Schema Synchronization: ${sourceEnv} → ${targetEnv}`,
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
    console.log(`✅ Sync SQL written to: ${filepath}`);
    console.log(`Generated migration file: ${filepath}\n`);
  } catch (error) {
    console.log('📋 Sync SQL statements:\n');
    console.log(sqlContent);
  }

  console.log('💡 TO APPLY THIS SYNC:');
  console.log('─'.repeat(80));
  console.log(`1. Review the SQL file: ${filename}`);
  console.log(`2. Apply to ${targetEnv}: psql "$${targetEnv.toUpperCase()}_DATABASE_URL" < migrations/${filename}`);
  console.log(`3. Verify: tsx scripts/schema-drift-simple.ts ${sourceEnv} ${targetEnv}\n`);
}

main().catch(console.error);
