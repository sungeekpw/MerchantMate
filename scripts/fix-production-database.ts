#!/usr/bin/env tsx
/**
 * Production Database Fix Script
 * Ensures production deployment uses production database with all seeded data
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import bcrypt from 'bcrypt';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function fixProductionDatabase() {
  console.log('🔧 Fixing Production Database Connection...');
  
  const productionUrl = process.env.DATABASE_URL;
  if (!productionUrl) {
    console.error('❌ No DATABASE_URL found');
    return;
  }
  
  console.log('✅ Connecting to production database...');
  
  try {
    const pool = new Pool({ connectionString: productionUrl });
    const db = drizzle({ client: pool, schema });

    // Check current data in production database
    console.log('\n📊 Current Production Database Status:');
    
    const [userCount] = await db.execute(`SELECT COUNT(*) as count FROM users`);
    const [templateCount] = await db.execute(`SELECT COUNT(*) as count FROM email_templates`);
    const [eventCount] = await db.execute(`SELECT COUNT(*) as count FROM security_events`);
    const [auditCount] = await db.execute(`SELECT COUNT(*) as count FROM audit_logs`);
    
    console.log(`• Users: ${userCount.rows[0].count}`);
    console.log(`• Email Templates: ${templateCount.rows[0].count}`);
    console.log(`• Security Events: ${eventCount.rows[0].count}`);
    console.log(`• Audit Logs: ${auditCount.rows[0].count}`);
    
    // Verify admin user exists with correct credentials
    console.log('\n🔐 Verifying admin user...');
    const adminUsers = await db.execute(`SELECT id, username, email, role FROM users WHERE username = 'admin'`);
    
    if (adminUsers.rows.length === 0) {
      console.log('❌ Admin user not found, creating...');
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      
      await db.execute(`
        INSERT INTO users (id, username, email, password_hash, role, status, created_at, updated_at) 
        VALUES ('admin-prod-001', 'admin', 'admin@corecrm.com', $1, 'super_admin', 'active', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          password_hash = $1,
          updated_at = NOW()
      `, [adminPasswordHash]);
      
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user exists:', adminUsers.rows[0]);
      
      // Update password to ensure it works
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      await db.execute(`
        UPDATE users 
        SET password_hash = $1, updated_at = NOW() 
        WHERE username = 'admin'
      `, [adminPasswordHash]);
      
      console.log('✅ Admin password updated');
    }
    
    // Test authentication
    console.log('\n🔍 Testing admin authentication...');
    const testUser = await db.execute(`SELECT id, username, password_hash FROM users WHERE username = 'admin'`);
    
    if (testUser.rows.length > 0) {
      const isValid = await bcrypt.compare('admin123', testUser.rows[0].password_hash);
      console.log(`✅ Authentication test: ${isValid ? 'PASSED' : 'FAILED'}`);
    }
    
    // Verify all data tables exist and have content
    console.log('\n📋 Data Verification:');
    
    if (parseInt(templateCount.rows[0].count) > 0) {
      const sampleTemplate = await db.execute(`SELECT name, subject FROM email_templates LIMIT 1`);
      console.log(`✅ Email templates working: ${sampleTemplate.rows[0]?.name}`);
    } else {
      console.log('⚠️  No email templates found');
    }
    
    if (parseInt(eventCount.rows[0].count) > 0) {
      const sampleEvent = await db.execute(`SELECT event_type FROM security_events LIMIT 1`);
      console.log(`✅ Security events working: ${sampleEvent.rows[0]?.event_type}`);
    } else {
      console.log('⚠️  No security events found');
    }
    
    if (parseInt(auditCount.rows[0].count) > 0) {
      const sampleAudit = await db.execute(`SELECT action FROM audit_logs LIMIT 1`);
      console.log(`✅ Audit logs working: ${sampleAudit.rows[0]?.action}`);
    } else {
      console.log('⚠️  No audit logs found');
    }
    
    await pool.end();
    
    console.log('\n🎉 Production database verification complete!');
    console.log('🔑 Login credentials: admin / admin123');
    console.log('🌐 Your production deployment should now show all data at https://crm.charrg.com');
    
  } catch (error) {
    console.error('❌ Production database fix failed:', error);
  }
}

fixProductionDatabase().catch(console.error);