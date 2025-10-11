import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { actionTemplates } from '@shared/schema';

async function checkDatabase() {
  console.log('🔍 Checking Database Connection...\n');
  
  try {
    // Get database info
    const [dbInfo] = await db.execute(sql`SELECT current_database() as db_name`);
    console.log('Connected to database:', dbInfo);
    
    // Count all action_templates
    const [count] = await db.execute(sql`SELECT COUNT(*) as total FROM action_templates`);
    console.log('\nTotal action_templates in database:', count);
    
    // List all action_templates
    const allTemplates = await db.execute(sql`
      SELECT id, name, action_type, category 
      FROM action_templates 
      ORDER BY id 
      LIMIT 20
    `);
    console.log('\nDirect SQL query results:');
    console.log(allTemplates);
    
    // Now try Drizzle ORM query
    console.log('\n\n🔧 Now trying Drizzle ORM query...');
    const drizzleTemplates = await db.select().from(actionTemplates);
    console.log(`Drizzle returned ${drizzleTemplates.length} templates`);
    console.log('First 3 from Drizzle:');
    drizzleTemplates.slice(0, 3).forEach(t => {
      console.log(`  ID: ${t.id}, Name: ${t.name}, Type: ${t.actionType}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkDatabase();
