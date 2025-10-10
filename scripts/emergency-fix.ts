#!/usr/bin/env tsx
/**
 * Emergency Database Fix
 * Completely resets and rebuilds the database schema
 */

import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

async function emergencyFix(env: 'development' | 'test') {
  console.log(`\n🚨 Emergency Database Fix for ${env.toUpperCase()}\n`);
  console.log('=' .repeat(60));
  
  const envVar = env === 'development' ? 'DEV_DATABASE_URL' : 'TEST_DATABASE_URL';
  const dbUrl = process.env[envVar];
  
  if (!dbUrl) {
    console.error(`❌ ${envVar} not configured`);
    process.exit(1);
  }
  
  console.log(`\n⚠️  This will:`);
  console.log(`   1. Drop and recreate all schema tables`);
  console.log(`   2. Use Drizzle to rebuild from schema.ts`);
  console.log(`   3. Result: Clean, working database\n`);
  
  try {
    // Step 1: Use Drizzle push with force
    console.log('📋 Step 1: Rebuilding schema with Drizzle...\n');
    execSync(`DATABASE_URL="${dbUrl}" npm run db:push -- --force`, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl }
    });
    
    console.log('\n✅ Schema rebuilt successfully');
    console.log('\n📊 Step 2: Verify tables created...\n');
    
    execSync(`DATABASE_URL="${dbUrl}" psql -c "\\dt" | head -30`, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl }
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log(`\n✅ ${env.toUpperCase()} database fixed!\n`);
    console.log('Next steps:');
    console.log('  1. The schema is now correct and clean');
    console.log('  2. You can add seed data manually or via UI');
    console.log('  3. For production: Run this on production after testing\n');
    
  } catch (error) {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  }
}

const env = process.argv[2] as 'development' | 'test';

if (!env || !['development', 'test'].includes(env)) {
  console.log('\nEmergency Database Fix');
  console.log('======================\n');
  console.log('Usage: tsx scripts/emergency-fix.ts <environment>\n');
  console.log('Examples:');
  console.log('  tsx scripts/emergency-fix.ts development');
  console.log('  tsx scripts/emergency-fix.ts test\n');
  process.exit(1);
}

emergencyFix(env);
