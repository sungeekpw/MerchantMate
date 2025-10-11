import { db } from '../server/db';
import { actionTemplates } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function debugQuery() {
  console.log('🔍 Debugging Drizzle SQL Generation...\n');
  
  try {
    // Build the query
    const query = db
      .select()
      .from(actionTemplates)
      .where(eq(actionTemplates.actionType, 'email'));
    
    // Get the SQL
    const sql = query.toSQL();
    console.log('Generated SQL:');
    console.log('Query:', sql.sql);
    console.log('Params:', sql.params);
    console.log('\n');
    
    // Execute it
    const result = await query;
    console.log(`Result count: ${result.length}`);
    console.log('\nFirst result:');
    console.log(JSON.stringify(result[0], null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

debugQuery();
