#!/usr/bin/env tsx
/**
 * Seed All Database Environments
 * Seeds data across all available database environments
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import bcrypt from 'bcrypt';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const environments = {
  production: process.env.DATABASE_URL,
  development: process.env.DEV_DATABASE_URL,
  test: process.env.TEST_DATABASE_URL
};

async function seedEnvironment(name: string, url: string) {
  if (!url) {
    console.log(`⚠️  ${name}: No URL configured, skipping`);
    return;
  }

  console.log(`🌱 Seeding ${name} database...`);
  
  try {
    const pool = new Pool({ connectionString: url });
    const db = drizzle({ client: pool, schema });

    // Create admin users
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    
    await db.insert(schema.users).values([
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

    // Create email templates
    const emailTemplates = [
      { name: 'Welcome Email', subject: 'Welcome to Core CRM', content: 'Welcome to our merchant processing platform!', type: 'welcome' },
      { name: 'Application Received', subject: 'Application Received', content: 'Your application has been received and is being processed.', type: 'application' },
      { name: 'Approval Notification', subject: 'Application Approved', content: 'Congratulations! Your application has been approved.', type: 'approval' },
      { name: 'Document Request', subject: 'Additional Documents Required', content: 'Please provide the following additional documents...', type: 'document_request' },
      { name: 'Payment Reminder', subject: 'Payment Reminder', content: 'This is a reminder about your upcoming payment.', type: 'payment' },
      { name: 'Account Suspension', subject: 'Account Status Update', content: 'Your account has been temporarily suspended.', type: 'suspension' },
      { name: 'Signature Request', subject: 'Signature Required', content: 'Please complete your digital signature for the application.', type: 'signature' },
      { name: 'Transaction Alert', subject: 'Transaction Notification', content: 'A new transaction has been processed on your account.', type: 'transaction' },
      { name: 'Monthly Statement', subject: 'Monthly Processing Statement', content: 'Your monthly processing statement is ready for review.', type: 'statement' },
      { name: 'Support Response', subject: 'Support Team Response', content: 'Thank you for contacting our support team. Here is the information you requested...', type: 'support' }
    ];

    for (const template of emailTemplates) {
      await db.insert(schema.emailTemplates).values({
        id: `template-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: template.name,
        subject: template.subject,
        content: template.content,
        type: template.type,
        created_at: new Date(),
        updated_at: new Date()
      }).onConflictDoNothing();
    }

    // Create security events
    const securityEvents = [
      { event_type: 'login_success', description: 'Successful admin login', severity: 'info', user_id: 'admin-prod-001' },
      { event_type: 'login_failure', description: 'Failed login attempt from unknown IP', severity: 'warning', user_id: null },
      { event_type: 'data_access', description: 'Admin accessed user management section', severity: 'info', user_id: 'admin-prod-001' },
      { event_type: 'password_change', description: 'Admin password changed', severity: 'info', user_id: 'admin-prod-001' },
      { event_type: 'user_creation', description: 'New user account created', severity: 'info', user_id: 'admin-prod-001' }
    ];

    for (const event of securityEvents) {
      await db.insert(schema.securityEvents).values({
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        event_type: event.event_type,
        description: event.description,
        severity: event.severity,
        user_id: event.user_id,
        created_at: new Date()
      }).onConflictDoNothing();
    }

    // Create audit logs
    const auditActions = ['user.create', 'user.update', 'user.login', 'email.send', 'template.create', 'security.alert', 'data.access', 'system.backup'];
    
    for (let i = 0; i < 25; i++) {
      const action = auditActions[Math.floor(Math.random() * auditActions.length)];
      await db.insert(schema.auditLogs).values({
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
    const [userCount] = await db.select().from(schema.users);
    const [templateCount] = await db.select().from(schema.emailTemplates);
    const [eventCount] = await db.select().from(schema.securityEvents);
    const [auditCount] = await db.select().from(schema.auditLogs);

    console.log(`✅ ${name} seeded: ${userCount ? 'Users' : '0'}, ${templateCount ? 'Templates' : '0'}, ${eventCount ? 'Events' : '0'}, ${auditCount ? 'Audits' : '0'}`);
    
    await pool.end();
    
  } catch (error) {
    console.error(`❌ ${name} seeding failed:`, error.message);
  }
}

async function seedAllEnvironments() {
  console.log('🌱 Seeding All Database Environments...');
  
  for (const [name, url] of Object.entries(environments)) {
    if (url) {
      await seedEnvironment(name, url);
    }
  }
  
  console.log('\n✅ All environments seeded!');
  console.log('🔑 Login credentials: admin/admin123 or testadmin/admin123');
}

seedAllEnvironments().catch(console.error);