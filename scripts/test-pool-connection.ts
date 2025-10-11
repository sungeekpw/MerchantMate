import { pool } from '../server/db';

async function testPool() {
  const client = await pool.connect();
  
  try {
    // Check which database we're connected to
    const dbInfo = await client.query('SELECT current_database(), version()');
    console.log('Database:', dbInfo.rows[0]);
    
    // Check the connection string (redacted)
    console.log('\nPool connectionString:', pool.options.connectionString?.substring(0, 80) + '...');
    
    // Count templates
    const count = await client.query("SELECT COUNT(*) FROM action_templates WHERE action_type = 'email'");
    console.log('\nEmail templates count:', count.rows[0].count);
    
    // List templates
    const templates = await client.query("SELECT id, name FROM action_templates WHERE action_type = 'email' ORDER BY id");
    console.log('\nEmail templates:');
    templates.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.name}`);
    });
    
  } finally {
    client.release();
  }
  
  process.exit(0);
}

testPool();
