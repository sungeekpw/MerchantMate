import { db } from '../server/db';
import { actionTemplates } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testQuery() {
  console.log('🔍 Testing Drizzle query for action_templates...\n');
  
  try {
    const templates = await db.select().from(actionTemplates).where(eq(actionTemplates.actionType, 'email'));
    
    console.log(`✅ Query returned ${templates.length} templates\n`);
    
    console.log('First 3 templates:');
    templates.slice(0, 3).forEach((t, i) => {
      console.log(`\n${i + 1}. ID: ${t.id}, Name: ${t.name}`);
      console.log(`   Action Type: ${t.actionType}`);
      console.log(`   Category: ${t.category}`);
    });
    
    // Check for action_type field vs actionType
    console.log('\n\n🔍 Checking field names on first template:');
    const first = templates[0];
    console.log('Object keys:', Object.keys(first));
    console.log('Has actionType?', 'actionType' in first);
    console.log('Has action_type?', 'action_type' in first);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testQuery();
