#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Verifies production deployment is ready with minimal seed data
 */

import { pool } from '../server/db.js';

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkDatabaseConnection() {
  log('🔌 Testing Database Connection', 'blue');
  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    log(`✅ Connected to: ${result.rows[0].db_name}`, 'green');
    log(`✅ Server time: ${result.rows[0].current_time}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function verifyAdminUser() {
  log('\n👤 Verifying Admin User', 'blue');
  try {
    const result = await pool.query(`
      SELECT username, email, role, status, email_verified 
      FROM users 
      WHERE role = 'super_admin'
    `);
    
    if (result.rows.length === 0) {
      log('❌ No super admin user found', 'red');
      return false;
    }
    
    const admin = result.rows[0];
    log(`✅ Super Admin: ${admin.username} (${admin.email})`, 'green');
    log(`✅ Status: ${admin.status}`, 'green');
    log(`✅ Email verified: ${admin.email_verified}`, 'green');
    return true;
    
  } catch (error) {
    log(`❌ Error checking admin user: ${error.message}`, 'red');
    return false;
  }
}

async function checkTableStructure() {
  log('\n📊 Checking Database Structure', 'blue');
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    log(`✅ Found ${tables.length} tables`, 'green');
    
    // Check for essential tables
    const essentialTables = [
      'users', 'agents', 'merchants', 'campaigns', 
      'transactions', 'pdf_forms', 'merchant_prospects'
    ];
    
    let allEssentialPresent = true;
    for (const table of essentialTables) {
      if (tables.includes(table)) {
        log(`✅ ${table} table exists`, 'green');
      } else {
        log(`❌ ${table} table missing`, 'red');
        allEssentialPresent = false;
      }
    }
    
    return allEssentialPresent;
    
  } catch (error) {
    log(`❌ Error checking table structure: ${error.message}`, 'red');
    return false;
  }
}

async function checkDataCounts() {
  log('\n📈 Checking Data Counts', 'blue');
  try {
    const tables = ['users', 'agents', 'merchants', 'campaigns', 'transactions'];
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        totalRecords += count;
        
        if (table === 'users' && count < 1) {
          log(`❌ ${table}: ${count} (should have at least 1 admin user)`, 'red');
        } else {
          log(`✅ ${table}: ${count} records`, 'green');
        }
      } catch (error) {
        log(`⚠️  ${table}: Unable to check (${error.message.split('\n')[0]})`, 'yellow');
      }
    }
    
    log(`✅ Total records across core tables: ${totalRecords}`, 'green');
    return true;
    
  } catch (error) {
    log(`❌ Error checking data counts: ${error.message}`, 'red');
    return false;
  }
}

async function showDeploymentStatus(allChecksPass) {
  log('\n🚀 Deployment Status', 'bold');
  log('=' + '='.repeat(50), 'bold');
  
  if (allChecksPass) {
    log('✅ DEPLOYMENT READY', 'green');
    log('', 'reset');
    log('Your Core CRM is ready for production with:', 'green');
    log('• Database connection verified', 'green');
    log('• Super admin user configured', 'green');
    log('• All essential tables present', 'green');
    log('• Clean data structure', 'green');
    log('', 'reset');
    log('🔑 Login with: admin / admin123!', 'blue');
    log('🌐 Ready for deployment!', 'green');
  } else {
    log('❌ DEPLOYMENT NOT READY', 'red');
    log('', 'reset');
    log('Issues found that need attention:', 'yellow');
    log('• Run: npm run seed-production to fix data issues', 'yellow');
    log('• Run: npm run db:push to create missing tables', 'yellow');
    log('• Check database connection settings', 'yellow');
  }
}

async function main() {
  log('🔍 Verifying Production Deployment Readiness', 'bold');
  log('Checking database, users, and system structure', 'blue');
  
  let allChecksPass = true;
  
  try {
    allChecksPass &= await checkDatabaseConnection();
    allChecksPass &= await verifyAdminUser();
    allChecksPass &= await checkTableStructure();
    allChecksPass &= await checkDataCounts();
    
    await showDeploymentStatus(allChecksPass);
    
    process.exit(allChecksPass ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ Verification failed: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();