/**
 * Emergency fix script for accidental production database modification
 * 
 * This script:
 * 1. Inserts trigger configuration into DEVELOPMENT database
 * 2. Removes trigger configuration from PRODUCTION database
 * 
 * Usage: tsx scripts/fix-trigger-production-leak.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DEV_DATABASE_URL = process.env.DEV_DATABASE_URL;
const PROD_DATABASE_URL = process.env.DATABASE_URL;

if (!DEV_DATABASE_URL || !PROD_DATABASE_URL) {
  console.error('❌ Missing database URLs in environment');
  process.exit(1);
}

async function fixTriggerLeak() {
  const devPool = new Pool({ connectionString: DEV_DATABASE_URL });
  const prodPool = new Pool({ connectionString: PROD_DATABASE_URL });

  try {
    console.log('🔧 Starting trigger configuration fix...\n');

    // Step 1: Insert into DEVELOPMENT database
    console.log('📥 Inserting trigger configuration into DEVELOPMENT...');
    
    const devClient = await devPool.connect();
    try {
      await devClient.query('BEGIN');

      // Insert trigger_catalog
      const triggerResult = await devClient.query(`
        INSERT INTO trigger_catalog (trigger_key, name, description, category, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (trigger_key) DO NOTHING
        RETURNING id
      `, ['agent_registered', 'Agent Registered', 'Triggered when a new agent is registered in the system', 'agent', true]);

      const triggerId = triggerResult.rows[0]?.id;
      console.log(`  ✅ trigger_catalog: ID=${triggerId || 'already exists'}`);

      // Check if action_templates already exists
      const existingAction = await devClient.query(
        'SELECT id FROM action_templates WHERE name = $1',
        ['Welcome Agent Email']
      );

      let actualActionId: number;
      if (existingAction.rows.length > 0) {
        actualActionId = existingAction.rows[0].id;
        console.log(`  ✅ action_templates: ID=${actualActionId} (already exists)`);
      } else {
        // Insert action_templates
        const actionResult = await devClient.query(`
          INSERT INTO action_templates (name, description, action_type, category, config, variables, is_active, version)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          'Welcome Agent Email',
          'Send a welcome email to newly registered agents',
          'email',
          'agent',
          JSON.stringify({
            "from": "noreply@corecrm.com",
            "subject": "Welcome to Core CRM, {{agentName}}!",
            "body": "Dear {{firstName}} {{lastName}},\\n\\nWelcome to Core CRM! Your agent account has been successfully created.\\n\\n{{#if hasUserAccount}}Username: {{username}}\\nYou can now log in to the system using your credentials.{{/if}}\\n\\nCompany: {{companyName}}\\nTerritory: {{territory}}\\n\\nWe're excited to have you on our team!\\n\\nBest regards,\\nCore CRM Team"
          }),
          JSON.stringify({
            "email": "string",
            "lastName": "string",
            "username": "string",
            "agentName": "string",
            "firstName": "string",
            "territory": "string",
            "companyName": "string",
            "hasUserAccount": "boolean"
          }),
          true,
          1
        ]);
        actualActionId = actionResult.rows[0].id;
        console.log(`  ✅ action_templates: ID=${actualActionId}`);
      }

      // Get trigger ID
      const actualTriggerId = triggerId || (await devClient.query(
        'SELECT id FROM trigger_catalog WHERE trigger_key = $1',
        ['agent_registered']
      )).rows[0]?.id;

      // Insert trigger_actions
      if (actualTriggerId && actualActionId) {
        const existingLink = await devClient.query(
          'SELECT id FROM trigger_actions WHERE trigger_id = $1 AND action_template_id = $2',
          [actualTriggerId, actualActionId]
        );
        
        if (existingLink.rows.length === 0) {
          await devClient.query(`
            INSERT INTO trigger_actions (trigger_id, action_template_id, sequence_order, requires_email_preference, is_active)
            VALUES ($1, $2, $3, $4, $5)
          `, [actualTriggerId, actualActionId, 1, true, true]);
          console.log(`  ✅ trigger_actions: linked trigger→action`);
        } else {
          console.log(`  ✅ trigger_actions: already linked`);
        }
      }

      await devClient.query('COMMIT');
      console.log('\n✅ DEVELOPMENT database updated successfully\n');
    } catch (error) {
      await devClient.query('ROLLBACK');
      throw error;
    } finally {
      devClient.release();
    }

    // Step 2: Remove from PRODUCTION database
    console.log('🗑️  Removing trigger configuration from PRODUCTION...');
    
    const prodClient = await prodPool.connect();
    try {
      await prodClient.query('BEGIN');

      // Delete in correct order (respecting foreign keys)
      const deleteActions = await prodClient.query(`
        DELETE FROM trigger_actions 
        WHERE trigger_id = (SELECT id FROM trigger_catalog WHERE trigger_key = 'agent_registered')
      `);
      console.log(`  ✅ Deleted ${deleteActions.rowCount} trigger_actions`);

      const deleteTemplates = await prodClient.query(`
        DELETE FROM action_templates 
        WHERE name = 'Welcome Agent Email'
      `);
      console.log(`  ✅ Deleted ${deleteTemplates.rowCount} action_templates`);

      const deleteTriggers = await prodClient.query(`
        DELETE FROM trigger_catalog 
        WHERE trigger_key = 'agent_registered'
      `);
      console.log(`  ✅ Deleted ${deleteTriggers.rowCount} trigger_catalog`);

      await prodClient.query('COMMIT');
      console.log('\n✅ PRODUCTION database cleaned successfully\n');
    } catch (error) {
      await prodClient.query('ROLLBACK');
      throw error;
    } finally {
      prodClient.release();
    }

    // Step 3: Verify
    console.log('🔍 Verifying fix...');
    
    const devCount = await devPool.query(`
      SELECT COUNT(*) FROM trigger_catalog WHERE trigger_key = 'agent_registered'
    `);
    const prodCount = await prodPool.query(`
      SELECT COUNT(*) FROM trigger_catalog WHERE trigger_key = 'agent_registered'
    `);

    console.log(`  Development: ${devCount.rows[0].count} records ✅`);
    console.log(`  Production: ${prodCount.rows[0].count} records ✅`);

    if (devCount.rows[0].count === '1' && prodCount.rows[0].count === '0') {
      console.log('\n🎉 SUCCESS! Databases are now properly synchronized.\n');
    } else {
      console.error('\n⚠️  WARNING: Unexpected record counts. Please verify manually.\n');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    await devPool.end();
    await prodPool.end();
  }
}

// Run the fix
fixTriggerLeak().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
