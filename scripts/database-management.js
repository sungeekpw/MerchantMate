#!/usr/bin/env node

/**
 * Database Management Utility
 * Helps manage different database environments
 */

import { getDynamicDatabase } from '../server/db.js';

const commands = {
  'check-envs': checkEnvironments,
  'test-connections': testConnections,
  'switch-env': switchEnvironment,
  'help': showHelp
};

async function checkEnvironments() {
  console.log('\n📊 Database Environment Status');
  console.log('=' + '='.repeat(40));
  
  const envs = [
    { name: 'Production', url: process.env.DATABASE_URL, key: 'DATABASE_URL' },
    { name: 'Development', url: process.env.DEV_DATABASE_URL, key: 'DEV_DATABASE_URL' },
    { name: 'Testing', url: process.env.TEST_DATABASE_URL, key: 'TEST_DATABASE_URL' }
  ];
  
  envs.forEach(env => {
    const status = env.url ? '✅ Configured' : '❌ Not Set';
    const host = env.url ? env.url.split('@')[1]?.split('/')[0] || 'Unknown' : 'N/A';
    console.log(`${env.name.padEnd(12)}: ${status} (${env.key})`);
    if (env.url) console.log(`${' '.repeat(14)}Host: ${host}`);
  });
}

async function testConnections() {
  console.log('\n🔌 Testing Database Connections');
  console.log('=' + '='.repeat(40));
  
  const environments = ['production', 'development', 'test'];
  
  for (const env of environments) {
    try {
      const db = getDynamicDatabase(env);
      // Simple connection test
      await db.execute('SELECT 1 as test');
      console.log(`✅ ${env}: Connected successfully`);
    } catch (error) {
      console.log(`❌ ${env}: Connection failed - ${error.message}`);
    }
  }
}

async function switchEnvironment() {
  const env = process.argv[3];
  if (!env || !['production', 'development', 'test'].includes(env)) {
    console.log('❌ Please specify environment: production, development, or test');
    console.log('Example: npm run db-manage switch-env development');
    return;
  }
  
  console.log(`🔄 Switching to ${env} environment`);
  process.env.NODE_ENV = env;
  console.log(`✅ Environment set to: ${env}`);
  console.log('Note: Restart your application to use the new environment');
}

async function showHelp() {
  console.log('\n🚀 Database Management Utility');
  console.log('=' + '='.repeat(40));
  console.log('Available commands:');
  console.log('  check-envs      - Show environment configuration status');
  console.log('  test-connections - Test database connections');
  console.log('  switch-env <env> - Switch to specific environment');
  console.log('  help            - Show this help message');
  console.log('\nExamples:');
  console.log('  npm run db-manage check-envs');
  console.log('  npm run db-manage test-connections');
  console.log('  npm run db-manage switch-env development');
}

const command = process.argv[2];
if (commands[command]) {
  commands[command]().catch(console.error);
} else {
  console.log(`❌ Unknown command: ${command}`);
  showHelp();
}
