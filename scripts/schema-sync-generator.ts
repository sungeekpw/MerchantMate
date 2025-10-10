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

function generateSyncSQL(
  source: Map<string, ColumnInfo[]>, 
  target: Map<string, ColumnInfo[]>,
  sourceEnv: string,
  targetEnv: string
): string[] {
  const sqlStatements: string[] = [];

  // Add missing columns and tables (in Source but not in Target)
  for (const [tableName, sourceColumns] of source.entries()) {
    const targetColumns = target.get(tableName);
    
    if (!targetColumns) {
      // Table exists in source but not in target - need to create it
      console.log(`⚠️  Table ${tableName} exists in ${sourceEnv} but not in ${targetEnv} - creating table`);
      
      // First, create any sequences needed for serial columns
      for (const col of sourceColumns) {
        if (col.columnDefault?.includes('nextval')) {
          const seqMatch = col.columnDefault.match(/'([^']+)'/);
          if (seqMatch) {
            const seqName = seqMatch[1];
            sqlStatements.push(`CREATE SEQUENCE IF NOT EXISTS ${seqName};`);
          }
        }
      }
      
      // Generate CREATE TABLE statement
      const columnDefs = sourceColumns.map(col => {
        const nullable = col.isNullable === 'YES' ? '' : ' NOT NULL';
        const defaultVal = col.columnDefault ? ` DEFAULT ${col.columnDefault}` : '';
        return `  ${col.columnName} ${col.dataType.toUpperCase()}${nullable}${defaultVal}`;
      }).join(',\n');
      
      sqlStatements.push(`CREATE TABLE IF NOT EXISTS ${tableName} (\n${columnDefs}\n);`);
      continue;
    }

    const targetColumnNames = new Set(targetColumns.map(c => c.columnName));
    
    for (const sourceCol of sourceColumns) {
      if (!targetColumnNames.has(sourceCol.columnName)) {
        const nullable = sourceCol.isNullable === 'YES' ? '' : ' NOT NULL';
        const defaultVal = sourceCol.columnDefault ? ` DEFAULT ${sourceCol.columnDefault}` : '';
        
        sqlStatements.push(
          `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${sourceCol.columnName} ${sourceCol.dataType.toUpperCase()}${nullable}${defaultVal};`
        );
      }
    }
  }

  // Remove extra columns (in Target but not in Source)
  for (const [tableName, targetColumns] of target.entries()) {
    const sourceColumns = source.get(tableName);
    
    if (!sourceColumns) {
      console.log(`⚠️  Table ${tableName} exists in ${targetEnv} but not in ${sourceEnv} - will be dropped`);
      sqlStatements.push(`DROP TABLE IF EXISTS ${tableName};`);
      continue;
    }

    const sourceColumnNames = new Set(sourceColumns.map(c => c.columnName));
    
    for (const targetCol of targetColumns) {
      if (!sourceColumnNames.has(targetCol.columnName)) {
        sqlStatements.push(
          `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${targetCol.columnName};`
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
  
  const syncSQL = generateSyncSQL(sourceSchema, targetSchema, sourceEnv, targetEnv);

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
