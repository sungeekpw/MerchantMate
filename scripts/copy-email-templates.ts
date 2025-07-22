import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function copyEmailTemplates() {
  const prodPool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const devPool = new Pool({ connectionString: process.env.DEV_DATABASE_URL! });
  const testPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
  
  try {
    // Get email templates from production
    const prodTemplates = await prodPool.query(`
      SELECT name, description, subject, html_content, text_content, variables, category, is_active 
      FROM email_templates 
      ORDER BY id
    `);
    
    console.log(`Found ${prodTemplates.rows.length} email templates in production`);
    
    if (prodTemplates.rows.length === 0) {
      console.log('No email templates found in production database');
      return;
    }

    // Copy to development database
    for (const template of prodTemplates.rows) {
      try {
        // Handle JSON variables properly
        let variables = template.variables;
        if (typeof variables === 'string') {
          try {
            variables = JSON.parse(variables);
          } catch {
            variables = null;
          }
        }

        await devPool.query(`
          INSERT INTO email_templates (name, description, subject, html_content, text_content, variables, category, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW(), NOW())
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            subject = EXCLUDED.subject,
            html_content = EXCLUDED.html_content,
            text_content = EXCLUDED.text_content,
            variables = EXCLUDED.variables,
            category = EXCLUDED.category,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        `, [
          template.name, 
          template.description,
          template.subject, 
          template.html_content, 
          template.text_content,
          JSON.stringify(variables),
          template.category,
          template.is_active
        ]);
        console.log(`✅ Copied template: ${template.name} to development`);
      } catch (error) {
        console.error(`❌ Error copying ${template.name} to development:`, error);
      }
    }

    // Copy to test database
    for (const template of prodTemplates.rows) {
      try {
        // Handle JSON variables properly
        let variables = template.variables;
        if (typeof variables === 'string') {
          try {
            variables = JSON.parse(variables);
          } catch {
            variables = null;
          }
        }

        await testPool.query(`
          INSERT INTO email_templates (name, description, subject, html_content, text_content, variables, category, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW(), NOW())
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            subject = EXCLUDED.subject,
            html_content = EXCLUDED.html_content,
            text_content = EXCLUDED.text_content,
            variables = EXCLUDED.variables,
            category = EXCLUDED.category,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        `, [
          template.name, 
          template.description,
          template.subject, 
          template.html_content, 
          template.text_content,
          JSON.stringify(variables),
          template.category,
          template.is_active
        ]);
        console.log(`✅ Copied template: ${template.name} to test`);
      } catch (error) {
        console.error(`❌ Error copying ${template.name} to test:`, error);
      }
    }
    
    console.log(`\n✅ Successfully copied ${prodTemplates.rows.length} email templates to dev and test databases`);
    
  } catch (error) {
    console.error('❌ Error copying email templates:', error);
  } finally {
    await prodPool.end();
    await devPool.end();
    await testPool.end();
  }
}

copyEmailTemplates().catch(console.error);