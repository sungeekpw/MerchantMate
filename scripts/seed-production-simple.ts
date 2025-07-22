#!/usr/bin/env tsx
/**
 * Simple Production Database Seeding Script
 * Seeds production database with essential data for Core CRM
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function seedProduction() {
  console.log('🌱 Seeding Production Database...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // 1. Create admin users
    console.log('👤 Creating admin users...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    
    await pool.query(`
      INSERT INTO users (id, username, email, password_hash, role, status, created_at, updated_at)
      VALUES 
        ('admin-prod-001', 'admin', 'admin@corecrm.com', $1, 'super_admin', 'active', NOW(), NOW()),
        ('test-admin-001', 'testadmin', 'test@charrg.com', $1, 'super_admin', 'active', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
    `, [adminPasswordHash]);

    // 2. Create sample agents
    console.log('👥 Creating sample agents...');
    await pool.query(`
      INSERT INTO agents (id, first_name, last_name, email, phone, territory, status)
      VALUES 
        (1, 'Mike', 'Chen', 'mike.chen@corecrm.com', '555-0201', 'West Coast', 'active'),
        (2, 'Sarah', 'Johnson', 'sarah.johnson@corecrm.com', '555-0202', 'East Coast', 'active'),
        (3, 'David', 'Wilson', 'david.wilson@corecrm.com', '555-0203', 'Midwest', 'active')
      ON CONFLICT (id) DO UPDATE SET 
        status = EXCLUDED.status
    `);

    // 3. Create sample merchants
    console.log('🏪 Creating sample merchants...');
    await pool.query(`
      INSERT INTO merchants (id, business_name, business_type, email, phone, agent_id, status, processing_fee, monthly_volume)
      VALUES 
        (1, 'Tech Solutions Inc', 'Technology', 'contact@techsolutions.com', '555-0101', 1, 'active', 2.9, 50000.00),
        (2, 'Downtown Cafe', 'Restaurant', 'orders@downtowncafe.com', '555-0102', 2, 'active', 2.5, 25000.00),
        (3, 'Fashion Boutique', 'Retail', 'info@fashionboutique.com', '555-0103', 3, 'active', 2.7, 35000.00)
      ON CONFLICT (id) DO UPDATE SET 
        status = EXCLUDED.status
    `);

    // 4. Create sample transactions
    console.log('💳 Creating sample transactions...');
    await pool.query(`
      INSERT INTO transactions (id, transaction_id, merchant_id, mid, amount, payment_method, status, processing_fee, net_amount)
      VALUES 
        (1, 'TXN001', 1, 'MID001', '150.00', 'credit_card', 'completed', '4.35', '145.65'),
        (2, 'TXN002', 2, 'MID002', '89.99', 'debit_card', 'completed', '2.25', '87.74'),
        (3, 'TXN003', 3, 'MID003', '299.99', 'credit_card', 'completed', '8.10', '291.89'),
        (4, 'TXN004', 1, 'MID001', '75.50', 'credit_card', 'pending', '2.19', '73.31')
      ON CONFLICT (id) DO UPDATE SET 
        status = EXCLUDED.status
    `);

    // 5. Create pricing types first
    console.log('💰 Creating pricing types...');
    await pool.query(`
      INSERT INTO pricing_types (id, name, description, is_active, author)
      VALUES 
        (1, 'Standard', 'Standard merchant pricing', true, 'admin-prod-001'),
        (2, 'Premium', 'Premium merchant pricing', true, 'admin-prod-001'),
        (3, 'Enterprise', 'Enterprise merchant pricing', true, 'admin-prod-001'),
        (4, 'Interchange Plus', 'Interchange plus pricing model', true, 'admin-prod-001'),
        (5, 'Dual', 'Dual pricing model', true, 'admin-prod-001')
      ON CONFLICT (id) DO UPDATE SET 
        is_active = EXCLUDED.is_active
    `);

    // 6. Create sample campaigns
    console.log('📋 Creating sample campaigns...');
    await pool.query(`
      INSERT INTO campaigns (id, name, acquirer, pricing_type_id, is_active)
      VALUES 
        (1, 'Standard Processing Campaign', 'Esquire', 1, true),
        (2, 'E-commerce Campaign', 'Wells Fargo', 2, true),
        (3, 'Retail Campaign', 'Merrick', 3, true)
      ON CONFLICT (id) DO UPDATE SET 
        is_active = EXCLUDED.is_active
    `);

    // 7. Create fee groups
    console.log('📊 Creating fee groups...');
    await pool.query(`
      INSERT INTO fee_groups (id, name, description, is_active, author)
      VALUES 
        (1, 'Discount Rates', 'Standard discount rate categories', true, 'admin-prod-001'),
        (2, 'Transaction Fees', 'Per-transaction fee structure', true, 'admin-prod-001'),
        (3, 'Monthly Fees', 'Monthly service fees', true, 'admin-prod-001')
      ON CONFLICT (id) DO UPDATE SET 
        is_active = EXCLUDED.is_active
    `);

    // 8. Create equipment items
    console.log('🏪 Creating equipment items...');
    await pool.query(`
      INSERT INTO equipment_items (id, name, description, manufacturer, model_number, specifications, image_data, is_active)
      VALUES 
        (1, 'Clover Flex', 'Portable payment terminal', 'Clover', 'Flex', '{"connectivity": "Wi-Fi, Bluetooth", "display": "5-inch touchscreen"}', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', true),
        (2, 'Square Reader', 'Mobile card reader', 'Square', 'Reader', '{"connectivity": "Bluetooth", "compatibility": "iOS, Android"}', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', true),
        (3, 'Verifone P400', 'Countertop payment terminal', 'Verifone', 'P400', '{"connectivity": "Ethernet, Wi-Fi", "display": "4.3-inch color"}', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', true)
      ON CONFLICT (id) DO UPDATE SET 
        is_active = EXCLUDED.is_active
    `);

    // 9. Create audit logs and security data
    console.log('🔍 Creating audit logs and security data...');
    
    // Create sample audit logs
    const auditActions = ['user.login', 'user.logout', 'merchant.create', 'transaction.process', 'data.access', 'security.alert'];
    const auditResources = ['users', 'merchants', 'transactions', 'campaigns', 'agents', 'security'];
    for (let i = 0; i < 25; i++) {
      const action = auditActions[Math.floor(Math.random() * auditActions.length)];
      const resource = auditResources[Math.floor(Math.random() * auditResources.length)];
      await pool.query(`
        INSERT INTO audit_logs (action, resource, resource_id, user_id, ip_address, user_agent, risk_level, old_values, new_values, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT DO NOTHING
      `, [
        action,
        resource,
        `${resource}-${i}`,
        'admin-prod-001',
        '127.0.0.1',
        'Core CRM Admin Interface',
        i % 10 === 0 ? 'high' : 'low',
        JSON.stringify({ old_value: `Previous ${action}` }),
        JSON.stringify({ new_value: `Updated ${action}`, timestamp: new Date().toISOString() })
      ]);
    }

    // Create sample security events
    await pool.query(`
      INSERT INTO security_events (event_type, severity, detection_method, investigation_notes, affected_users, created_at)
      VALUES 
        ('failed_login', 'medium', 'automated_detection', 'Multiple failed login attempts detected from IP 192.168.1.100', '["admin-prod-001"]', NOW()),
        ('suspicious_activity', 'high', 'behavioral_analysis', 'Unusual access pattern detected from Bot/1.0 user agent', '["admin-prod-001"]', NOW()),
        ('password_change', 'low', 'user_action', 'User password changed successfully via Chrome browser', '["admin-prod-001"]', NOW())
      ON CONFLICT DO NOTHING
    `);

    // Create sample login attempts
    for (let i = 0; i < 15; i++) {
      await pool.query(`
        INSERT INTO login_attempts (username, email, ip_address, user_agent, success, failure_reason, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${i} hours')
        ON CONFLICT DO NOTHING
      `, [
        'admin',
        'admin@corecrm.com',
        `192.168.1.${100 + i}`,
        'Core CRM Interface',
        i % 4 !== 0, // true for success, false for failed
        i % 4 === 0 ? 'invalid_password' : null
      ]);
    }

    // Check data counts
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const merchantCount = await pool.query('SELECT COUNT(*) as count FROM merchants');
    const agentCount = await pool.query('SELECT COUNT(*) as count FROM agents');
    const transactionCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const campaignCount = await pool.query('SELECT COUNT(*) as count FROM campaigns');
    const auditCount = await pool.query('SELECT COUNT(*) as count FROM audit_logs');
    const securityCount = await pool.query('SELECT COUNT(*) as count FROM security_events');

    console.log('\n✅ Production Database Seeded Successfully!');
    console.log('📊 Data Summary:');
    console.log(`   • Users: ${userCount.rows[0].count}`);
    console.log(`   • Merchants: ${merchantCount.rows[0].count}`);
    console.log(`   • Agents: ${agentCount.rows[0].count}`);
    console.log(`   • Transactions: ${transactionCount.rows[0].count}`);
    console.log(`   • Campaigns: ${campaignCount.rows[0].count}`);
    console.log(`   • Audit Logs: ${auditCount.rows[0].count}`);
    console.log(`   • Security Events: ${securityCount.rows[0].count}`);
    
    console.log('\n🔑 Admin Credentials:');
    console.log('   Username: admin | Password: admin123');
    console.log('   Username: testadmin | Password: admin123');
    
  } catch (error) {
    console.error('❌ Error seeding production database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seeding function
seedProduction().catch(console.error);