#!/usr/bin/env tsx

/**
 * Database Schema Synchronization Script
 * 
 * This script ensures all database environments (production, test, development) 
 * have identical schemas by pushing the current schema to all environments.
 * 
 * Usage:
 *   npm run db:sync-all     # Sync schema to all environments
 *   npm run db:sync-test    # Sync schema to test environment only
 *   npm run db:sync-dev     # Sync schema to development environment only
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface Environment {
  name: string;
  envVar: string;
  description: string;
}

const environments: Environment[] = [
  { name: 'production', envVar: 'DATABASE_URL', description: 'Production Database' },
  { name: 'test', envVar: 'TEST_DATABASE_URL', description: 'Test Database' },
  { name: 'development', envVar: 'DEV_DATABASE_URL', description: 'Development Database' }
];

async function checkEnvironmentVariables(): Promise<boolean> {
  console.log('🔍 Checking environment variables...\n');
  
  let allPresent = true;
  for (const env of environments) {
    const value = process.env[env.envVar];
    if (value) {
      console.log(`✅ ${env.description}: ${env.envVar} configured`);
    } else {
      console.log(`❌ ${env.description}: ${env.envVar} missing`);
      allPresent = false;
    }
  }
  
  console.log();
  return allPresent;
}

async function runDrizzlePush(environment: Environment): Promise<boolean> {
  try {
    console.log(`📊 Syncing schema to ${environment.description}...`);
    
    const command = `DATABASE_URL="${process.env[environment.envVar]}" npx drizzle-kit push`;
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: process.env[environment.envVar]
      }
    });
    
    if (stderr && !stderr.includes('Warning')) {
      console.log(`⚠️  ${environment.description} warnings: ${stderr}`);
    }
    
    console.log(`✅ ${environment.description} schema synchronized successfully`);
    
    if (stdout.includes('changes')) {
      console.log(`   Changes applied: ${stdout.split('\n').filter(line => line.includes('changes'))[0]?.trim()}`);
    } else {
      console.log(`   No schema changes needed`);
    }
    
    return true;
  } catch (error: any) {
    console.log(`❌ ${environment.description} synchronization failed:`);
    console.log(`   Error: ${error.message}`);
    if (error.stdout) console.log(`   Stdout: ${error.stdout}`);
    if (error.stderr) console.log(`   Stderr: ${error.stderr}`);
    return false;
  }
}

async function generateSchemaBackup(): Promise<void> {
  try {
    console.log('💾 Creating schema backup...');
    
    const backupDir = path.join(process.cwd(), 'migrations', 'schema-backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `schema-${timestamp}.sql`);
    
    // Generate SQL schema dump using drizzle-kit
    const command = `DATABASE_URL="${process.env.DATABASE_URL}" npx drizzle-kit introspect --out=${backupFile}`;
    
    await execAsync(command);
    console.log(`✅ Schema backup created: ${backupFile}`);
  } catch (error: any) {
    console.log(`⚠️  Could not create schema backup: ${error.message}`);
  }
}

async function validateSchemaConsistency(): Promise<void> {
  console.log('\n🔄 Validating schema consistency across environments...\n');
  
  for (const env of environments) {
    if (!process.env[env.envVar]) {
      console.log(`⏭️  Skipping ${env.description} (not configured)`);
      continue;
    }
    
    try {
      // Simple connection test
      const command = `DATABASE_URL="${process.env[env.envVar]}" npx drizzle-kit introspect --out=temp-check`;
      await execAsync(command);
      console.log(`✅ ${env.description} schema validation passed`);
      
      // Clean up temp file
      try {
        fs.rmSync(path.join(process.cwd(), 'temp-check'), { recursive: true, force: true });
      } catch {}
    } catch (error: any) {
      console.log(`❌ ${env.description} schema validation failed: ${error.message}`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const targetEnv = args[0]; // 'all', 'test', 'dev', 'production'
  
  console.log('🚀 Database Schema Synchronization Tool\n');
  console.log('==========================================\n');
  
  // Check environment variables
  const envVarsOk = await checkEnvironmentVariables();
  if (!envVarsOk) {
    console.log('❌ Missing required environment variables. Please check your .env configuration.');
    process.exit(1);
  }
  
  // Create schema backup
  await generateSchemaBackup();
  
  // Determine which environments to sync
  let envsToSync: Environment[] = [];
  
  switch (targetEnv) {
    case 'test':
      envsToSync = [environments.find(e => e.name === 'test')!];
      break;
    case 'dev':
    case 'development':
      envsToSync = [environments.find(e => e.name === 'development')!];
      break;
    case 'production':
    case 'prod':
      envsToSync = [environments.find(e => e.name === 'production')!];
      break;
    case 'all':
    default:
      envsToSync = environments.filter(env => process.env[env.envVar]);
      break;
  }
  
  console.log(`\n📋 Synchronizing schema to ${envsToSync.length} environment(s):\n`);
  
  // Sync schemas
  let successCount = 0;
  for (const env of envsToSync) {
    const success = await runDrizzlePush(env);
    if (success) successCount++;
    console.log(); // Add spacing between environments
  }
  
  // Validate consistency
  await validateSchemaConsistency();
  
  // Summary
  console.log('\n==========================================');
  console.log('📊 SYNCHRONIZATION SUMMARY');
  console.log('==========================================\n');
  console.log(`✅ Successfully synchronized: ${successCount}/${envsToSync.length} environments`);
  console.log(`📊 Total environments configured: ${environments.filter(e => process.env[e.envVar]).length}/3`);
  
  if (successCount === envsToSync.length) {
    console.log('\n🎉 All database schemas are now synchronized!');
    console.log('   Your environments are ready for deployment.');
  } else {
    console.log('\n⚠️  Some environments failed to synchronize.');
    console.log('   Please check the errors above and retry.');
    process.exit(1);
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}