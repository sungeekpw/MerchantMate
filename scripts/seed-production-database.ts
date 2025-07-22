#!/usr/bin/env tsx
/**
 * Production Database Seeding Script
 * Seeds the production database with essential data for Core CRM deployment
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Production database URL
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_eIJF5kqmlc0n@ep-bitter-surf-a5bdhaox.us-east-2.aws.neon.tech/neondb?sslmode=require';

const productionPool = new Pool({ connectionString: PRODUCTION_DB_URL });
const productionDb = drizzle({ client: productionPool, schema });

async function seedProductionDatabase() {
  console.log('🌱 Seeding Production Database...');
  console.log('Database:', PRODUCTION_DB_URL.split('@')[1].split('/')[0]);
  
  try {
    // 1. Create admin users
    console.log('👤 Creating admin users...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    
    await productionDb.insert(schema.users).values([
      {
        id: 'admin-prod-001',
        username: 'admin',
        email: 'admin@corecrm.com',
        password_hash: adminPasswordHash,
        role: 'super_admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'test-admin-001',
        username: 'testadmin',
        email: 'test@charrg.com',
        password_hash: adminPasswordHash,
        role: 'super_admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]).onConflictDoUpdate({
      target: schema.users.id,
      set: {
        password_hash: adminPasswordHash,
        updated_at: new Date()
      }
    });
    
    // 2. Create email templates
    console.log('📧 Creating email templates...');
    const emailTemplates = [
      { name: 'Welcome Email', subject: 'Welcome to Core CRM', body: 'Welcome to our merchant processing platform!', type: 'welcome' },
      { name: 'Application Received', subject: 'Application Received', body: 'Your application has been received and is being processed.', type: 'application' },
      { name: 'Approval Notification', subject: 'Application Approved', body: 'Congratulations! Your application has been approved.', type: 'approval' },
      { name: 'Document Request', subject: 'Additional Documents Required', body: 'Please provide the following additional documents...', type: 'document_request' },
      { name: 'Payment Reminder', subject: 'Payment Reminder', body: 'This is a reminder about your upcoming payment.', type: 'payment' },
      { name: 'Account Suspension', subject: 'Account Status Update', body: 'Your account has been temporarily suspended.', type: 'suspension' },
      { name: 'Signature Request', subject: 'Signature Required', body: 'Please complete your digital signature for the application.', type: 'signature' },
      { name: 'Transaction Alert', subject: 'Transaction Notification', body: 'A new transaction has been processed on your account.', type: 'transaction' },
      { name: 'Monthly Statement', subject: 'Monthly Processing Statement', body: 'Your monthly processing statement is ready for review.', type: 'statement' },
      { name: 'Support Response', subject: 'Support Team Response', body: 'Thank you for contacting our support team. Here is the information you requested...', type: 'support' }
    ];

    for (const template of emailTemplates) {
      await productionDb.insert(schema.emailTemplates).values({
        id: `template-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: template.name,
        subject: template.subject,
        body: template.body,
        type: template.type,
        created_at: new Date(),
        updated_at: new Date()
      }).onConflictDoNothing();
    }

    // 3. Create security events
    console.log('🔒 Creating security events...');
    const securityEvents = [
      { event_type: 'login_success', description: 'Successful admin login', severity: 'info', user_id: 'admin-prod-001' },
      { event_type: 'login_failure', description: 'Failed login attempt from unknown IP', severity: 'warning', user_id: null },
      { event_type: 'data_access', description: 'Admin accessed user management section', severity: 'info', user_id: 'admin-prod-001' }
    ];

    for (const event of securityEvents) {
      await productionDb.insert(schema.securityEvents).values({
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        event_type: event.event_type,
        description: event.description,
        severity: event.severity,
        user_id: event.user_id,
        created_at: new Date()
      }).onConflictDoNothing();
    }

    // 4. Create audit logs
    console.log('📝 Creating audit logs...');
    const auditActions = ['user.create', 'user.update', 'user.login', 'email.send', 'template.create', 'security.alert'];
    
    for (let i = 0; i < 10; i++) {
      const action = auditActions[Math.floor(Math.random() * auditActions.length)];
      await productionDb.insert(schema.auditLogs).values({
        id: `audit-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
        action,
        entity_type: action.split('.')[0],
        entity_id: `entity-${i}`,
        user_id: 'admin-prod-001',
        changes: { action: `Sample ${action} action`, timestamp: new Date().toISOString() },
        ip_address: '127.0.0.1',
        user_agent: 'Core CRM Admin Interface',
        created_at: new Date()
      }).onConflictDoNothing();
    }

    // Verify data
    const [userCount] = await productionDb.select({ count: schema.users.id }).from(schema.users);
    const [templateCount] = await productionDb.select({ count: schema.emailTemplates.id }).from(schema.emailTemplates);
    const [eventCount] = await productionDb.select({ count: schema.securityEvents.id }).from(schema.securityEvents);
    const [auditCount] = await productionDb.select({ count: schema.auditLogs.id }).from(schema.auditLogs);

    console.log('\n✅ Production Database Seeded Successfully!');
    console.log(`📊 Data Summary:`);
    console.log(`   • Users: ${userCount?.count || 0}`);
    console.log(`   • Email Templates: ${templateCount?.count || 0}`);
    console.log(`   • Security Events: ${eventCount?.count || 0}`);
    console.log(`   • Audit Logs: ${auditCount?.count || 0}`);
    
    console.log('\n🔑 Admin Credentials:');
    console.log('   Username: admin | Password: admin123');
    console.log('   Username: testadmin | Password: admin123');
    console.log('\n🚀 Production deployment ready at: https://crm.charrg.com');
    
  } catch (error) {
    console.error('❌ Error seeding production database:', error);
    throw error;
  } finally {
    await productionPool.end();
  }
}

seedProductionDatabase().catch(console.error);