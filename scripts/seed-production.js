#!/usr/bin/env node

/**
 * Production Database Seeding Script
 * Seeds production with minimal essential data:
 * - 1 Super Admin user for system administration
 * - Essential system tables structure
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import bcrypt from 'bcrypt';
import * as schema from '../shared/schema.js';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });
const { users } = schema;

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

async function clearExistingData() {
  log('\n🧹 Clearing Existing Production Data', 'yellow');
  log('=' + '='.repeat(50), 'yellow');
  
  try {
    // Clear data in correct order to respect foreign key constraints
    const tables = [
      'campaign_assignments', 'campaign_equipment', 'campaign_fee_values',
      'pricing_type_fee_items', 'prospect_signatures', 'prospect_owners',
      'business_ownership', 'pdf_form_submissions', 'merchant_prospects',
      'agent_merchants', 'email_activity', 'data_access_logs',
      'security_events', 'audit_logs', 'login_attempts', 'two_factor_codes',
      'user_dashboard_preferences', 'transactions', 'locations', 'addresses',
      'merchants', 'agents', 'users'
    ];
    
    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table}`);
        log(`✅ Cleared ${table}`, 'green');
      } catch (error) {
        // Table might not exist or have dependencies, continue
        log(`⚠️  Skipped ${table}: ${error.message.split('\n')[0]}`, 'yellow');
      }
    }
    
    log('✅ Database cleared successfully', 'green');
  } catch (error) {
    log(`❌ Error clearing database: ${error.message}`, 'red');
    throw error;
  }
}

async function createSuperAdmin() {
  log('\n👤 Creating Super Admin User', 'blue');
  log('=' + '='.repeat(50), 'blue');
  
  try {
    const hashedPassword = await bcrypt.hash('admin123!', 10);
    
    const adminUser = {
      id: 'admin-prod-001',
      username: 'admin',
      email: 'admin@corecrm.com',
      password_hash: hashedPassword,
      role: 'super_admin',
      status: 'active',
      first_name: 'System',
      last_name: 'Administrator',
      permissions: {},
      created_at: new Date(),
      updated_at: new Date(),
      email_verified: true
    };
    
    await db.insert(users).values(adminUser);
    
    log('✅ Super Admin user created:', 'green');
    log(`   Username: admin`, 'green');
    log(`   Email: admin@corecrm.com`, 'green');
    log(`   Password: admin123!`, 'green');
    log(`   Role: super_admin`, 'green');
    
  } catch (error) {
    log(`❌ Error creating super admin: ${error.message}`, 'red');
    throw error;
  }
}

async function createEssentialTables() {
  log('\n📊 Ensuring Essential Tables Exist', 'blue');
  log('=' + '='.repeat(50), 'blue');
  
  try {
    // Check if all required tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const existingTables = result.rows.map(row => row.table_name);
    log(`✅ Found ${existingTables.length} existing tables`, 'green');
    
    const requiredTables = [
      'users', 'agents', 'merchants', 'campaigns', 'transactions',
      'pdf_forms', 'merchant_prospects', 'audit_logs'
    ];
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      log(`⚠️  Missing tables: ${missingTables.join(', ')}`, 'yellow');
      log('Run: npm run db:push to create missing tables', 'yellow');
    } else {
      log('✅ All essential tables present', 'green');
    }
    
  } catch (error) {
    log(`❌ Error checking tables: ${error.message}`, 'red');
    throw error;
  }
}

async function verifyProduction() {
  log('\n✅ Verifying Production Setup', 'green');
  log('=' + '='.repeat(50), 'green');
  
  try {
    // Count users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    log(`Users: ${userCount.rows[0].count}`, 'green');
    
    // Verify admin user
    const adminUser = await pool.query('SELECT username, email, role FROM users WHERE role = $1', ['super_admin']);
    if (adminUser.rows.length > 0) {
      log(`Super Admin: ${adminUser.rows[0].username} (${adminUser.rows[0].email})`, 'green');
    }
    
    // Check table counts
    const tables = ['agents', 'merchants', 'campaigns', 'transactions', 'merchant_prospects'];
    for (const table of tables) {
      try {
        const count = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        log(`${table}: ${count.rows[0].count} records`, 'green');
      } catch (error) {
        log(`${table}: Table not found`, 'yellow');
      }
    }
    
  } catch (error) {
    log(`❌ Error verifying setup: ${error.message}`, 'red');
    throw error;
  }
}

async function showLoginInstructions() {
  log('\n🔐 Production Login Instructions', 'bold');
  log('=' + '='.repeat(50), 'bold');
  
  log('Your production system is ready with:', 'green');
  log('', 'reset');
  log('🔑 Login Credentials:', 'blue');
  log('   URL: https://your-app.replit.app', 'green');
  log('   Username: admin', 'green');
  log('   Password: admin123!', 'green');
  log('   Role: Super Admin', 'green');
  log('', 'reset');
  log('📝 Next Steps:', 'blue');
  log('1. Log in with the credentials above', 'green');
  log('2. Create additional users through the application UI', 'green');
  log('3. Add agents, merchants, and campaigns as needed', 'green');
  log('4. All data will be managed through the web interface', 'green');
  log('', 'reset');
  log('⚠️  Important:', 'yellow');
  log('- Change the admin password after first login', 'yellow');
  log('- This is your only administrative account', 'yellow');
  log('- All other setup happens through the application', 'yellow');
}

async function main() {
  log('🚀 Production Database Seeding', 'bold');
  log('Creating minimal production setup with 1 super admin user', 'blue');
  
  try {
    await clearExistingData();
    await createSuperAdmin();
    await createEssentialTables();
    await verifyProduction();
    await showLoginInstructions();
    
    log('\n✅ Production seeding completed successfully!', 'green');
    
  } catch (error) {
    log(`\n❌ Production seeding failed: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();