#!/usr/bin/env tsx

/**
 * Production Schema Deployment Tool
 * 
 * Safely deploys schema changes from test to production by:
 * 1. Comparing test and production schemas
 * 2. Generating ALTER TABLE statements for differences
 * 3. Optionally applying changes with safety checks
 * 
 * Usage:
 *   tsx scripts/deploy-schema-to-production.ts compare    # Compare schemas only
 *   tsx scripts/deploy-schema-to-production.ts generate   # Generate SQL file
 *   tsx scripts/deploy-schema-to-production.ts apply      # Apply to production (with confirmation)
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

neonConfig.webSocketConstructor = ws;

interface ColumnDifference {
  table: string;
  column: string;
  dataType: string;
  isNullable: string;
  columnDefault: string | null;
}

class ProductionDeployer {
  private deploymentsDir = path.join(process.cwd(), 'deployments');

  constructor() {
    if (!fs.existsSync(this.deploymentsDir)) {
      fs.mkdirSync(this.deploymentsDir, { recursive: true });
    }
  }

  private async getSchemaColumns(environment: 'test' | 'production') {
    const url = environment === 'test' 
      ? process.env.TEST_DATABASE_URL 
      : process.env.DATABASE_URL;

    if (!url) {
      throw new Error(`${environment.toUpperCase()}_DATABASE_URL not configured`);
    }

    const pool = new Pool({ connectionString: url });

    try {
      const result = await pool.query(`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        ORDER BY table_name, ordinal_position
      `);

      return result.rows;
    } finally {
      await pool.end();
    }
  }

  private findMissingColumns(testCols: any[], prodCols: any[]): ColumnDifference[] {
    const missing: ColumnDifference[] = [];

    for (const testCol of testCols) {
      const prodCol = prodCols.find(p => 
        p.table_name === testCol.table_name && 
        p.column_name === testCol.column_name
      );

      if (!prodCol) {
        missing.push({
          table: testCol.table_name,
          column: testCol.column_name,
          dataType: testCol.data_type,
          isNullable: testCol.is_nullable,
          columnDefault: testCol.column_default
        });
      }
    }

    return missing;
  }

  private generateAlterTableSQL(differences: ColumnDifference[]): string {
    const sqlByTable = new Map<string, string[]>();

    for (const diff of differences) {
      if (!sqlByTable.has(diff.table)) {
        sqlByTable.set(diff.table, []);
      }

      let columnDef = `ADD COLUMN IF NOT EXISTS ${diff.column} ${diff.dataType}`;
      
      if (diff.isNullable === 'NO') {
        columnDef += ' NOT NULL';
      }
      
      if (diff.columnDefault) {
        columnDef += ` DEFAULT ${diff.columnDefault}`;
      }

      sqlByTable.get(diff.table)!.push(columnDef);
    }

    const sqlStatements: string[] = [];

    for (const [table, columns] of sqlByTable) {
      sqlStatements.push(
        `-- Add missing columns to ${table}\nALTER TABLE ${table}\n  ${columns.join(',\n  ')};`
      );
    }

    return sqlStatements.join('\n\n');
  }

  async compareSchemas(): Promise<void> {
    console.log('🔍 Comparing Test and Production Schemas\n');
    console.log('=' .repeat(60));

    const testCols = await this.getSchemaColumns('test');
    const prodCols = await this.getSchemaColumns('production');

    const missingInProd = this.findMissingColumns(testCols, prodCols);
    const extraInProd = this.findMissingColumns(prodCols, testCols);

    console.log(`\nTest columns: ${testCols.length}`);
    console.log(`Production columns: ${prodCols.length}`);
    console.log(`Missing in production: ${missingInProd.length}`);
    console.log(`Extra in production: ${extraInProd.length}\n`);

    if (missingInProd.length > 0) {
      console.log('❌ Columns in Test but NOT in Production:');
      const byTable = new Map<string, number>();
      for (const diff of missingInProd) {
        byTable.set(diff.table, (byTable.get(diff.table) || 0) + 1);
      }
      for (const [table, count] of byTable) {
        console.log(`  - ${table}: ${count} missing columns`);
      }
    }

    if (extraInProd.length > 0) {
      console.log('\n⚠️  Columns in Production but NOT in Test:');
      const byTable = new Map<string, number>();
      for (const diff of extraInProd) {
        byTable.set(diff.table, (byTable.get(diff.table) || 0) + 1);
      }
      for (const [table, count] of byTable) {
        console.log(`  - ${table}: ${count} extra columns`);
      }
    }

    if (missingInProd.length === 0 && extraInProd.length === 0) {
      console.log('✅ Test and Production schemas are synchronized!');
    } else {
      console.log('\n💡 Run "generate" command to create deployment SQL');
    }
  }

  async generateDeploymentSQL(): Promise<string> {
    console.log('📝 Generating Deployment SQL\n');

    const testCols = await this.getSchemaColumns('test');
    const prodCols = await this.getSchemaColumns('production');

    const missingInProd = this.findMissingColumns(testCols, prodCols);

    if (missingInProd.length === 0) {
      console.log('✅ No schema differences found. Production is up to date!');
      return '';
    }

    const sql = this.generateAlterTableSQL(missingInProd);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `deploy-to-production-${timestamp}.sql`;
    const filepath = path.join(this.deploymentsDir, filename);

    const header = `-- Production Deployment SQL
-- Generated: ${new Date().toISOString()}
-- Source: Test Database
-- Target: Production Database
-- Total Changes: ${missingInProd.length} columns across ${new Set(missingInProd.map(d => d.table)).size} tables
--
-- REVIEW THIS FILE CAREFULLY BEFORE APPLYING TO PRODUCTION
-- ============================================================

`;

    fs.writeFileSync(filepath, header + sql);

    console.log(`✅ Deployment SQL generated: ${filename}`);
    console.log(`   Location: ${filepath}`);
    console.log(`   Changes: ${missingInProd.length} columns`);
    console.log(`\nNext steps:`);
    console.log(`  1. Review the SQL file: cat ${filepath}`);
    console.log(`  2. Apply to production: tsx scripts/deploy-schema-to-production.ts apply`);

    return filepath;
  }

  async applyToProduction(): Promise<void> {
    console.log('🚀 Deploying Schema Changes to Production\n');

    // Find most recent deployment file
    const files = fs.readdirSync(this.deploymentsDir)
      .filter(f => f.startsWith('deploy-to-production-') && f.endsWith('.sql'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log('❌ No deployment SQL file found. Run "generate" command first.');
      return;
    }

    const deploymentFile = files[0];
    const filepath = path.join(this.deploymentsDir, deploymentFile);
    const sql = fs.readFileSync(filepath, 'utf8');

    // Show preview
    console.log('📋 Deployment Preview:');
    console.log('=' .repeat(60));
    console.log(sql.split('\n').slice(0, 20).join('\n'));
    if (sql.split('\n').length > 20) {
      console.log('... (truncated)');
    }
    console.log('=' .repeat(60));

    // Extract just the SQL (remove comments)
    const cleanSQL = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');

    console.log('\n⚠️  PRODUCTION DEPLOYMENT');
    console.log('This will modify the PRODUCTION database.');
    console.log(`File: ${deploymentFile}\n`);

    // Execute using the safe wrapper
    try {
      const command = `tsx scripts/execute-sql.ts --env production --force-production --sql "${cleanSQL.replace(/"/g, '\\"')}"`;
      
      console.log('🔄 Executing via safe wrapper...\n');
      execSync(command, { stdio: 'inherit' });
      
      console.log('\n✅ Production deployment completed successfully!');
      console.log('\n📊 Verify deployment:');
      console.log('   tsx scripts/deploy-schema-to-production.ts compare');
      
    } catch (error) {
      console.error('\n❌ Deployment failed:', error);
      throw error;
    }
  }
}

async function main() {
  const command = process.argv[2] || 'compare';
  const deployer = new ProductionDeployer();

  try {
    switch (command) {
      case 'compare':
        await deployer.compareSchemas();
        break;

      case 'generate':
        await deployer.generateDeploymentSQL();
        break;

      case 'apply':
        await deployer.applyToProduction();
        break;

      default:
        console.log('Production Schema Deployment Tool');
        console.log('=' .repeat(60));
        console.log('\nCommands:');
        console.log('  compare  - Compare test and production schemas');
        console.log('  generate - Generate deployment SQL file');
        console.log('  apply    - Apply generated SQL to production');
        console.log('\nWorkflow:');
        console.log('  1. tsx scripts/deploy-schema-to-production.ts compare');
        console.log('  2. tsx scripts/deploy-schema-to-production.ts generate');
        console.log('  3. Review the generated SQL file');
        console.log('  4. tsx scripts/deploy-schema-to-production.ts apply');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ProductionDeployer };
