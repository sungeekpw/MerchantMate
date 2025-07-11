#!/usr/bin/env node

/**
 * Database Environment Management Utilities
 * Usage: node scripts/database-utils.js [command]
 * 
 * Commands:
 *   switch-to-test     - Switch to test database environment
 *   switch-to-dev      - Switch to development database environment
 *   switch-to-prod     - Switch to production database environment
 *   create-test-db     - Create a new test database
 *   status             - Show current database environment status
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = '.env';

function getCurrentDatabaseUrl() {
  if (fs.existsSync(ENV_FILE)) {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    return match ? match[1] : null;
  }
  return null;
}

function updateEnvFile(key, value) {
  let envContent = '';
  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}=${value}`;

  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, newLine);
  } else {
    envContent += `\n${newLine}`;
  }

  fs.writeFileSync(ENV_FILE, envContent.trim() + '\n');
}

function showStatus() {
  console.log('\n📊 Database Environment Status');
  console.log('=====================================');
  
  const currentUrl = getCurrentDatabaseUrl();
  if (currentUrl) {
    // Mask the URL for security
    const maskedUrl = currentUrl.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2');
    console.log(`Current DATABASE_URL: ${maskedUrl}`);
    
    // Determine environment based on URL patterns
    if (currentUrl.includes('test') || currentUrl.includes('staging')) {
      console.log('Environment: 🧪 TEST/STAGING');
    } else if (currentUrl.includes('dev') || currentUrl.includes('development')) {
      console.log('Environment: 🔧 DEVELOPMENT');
    } else {
      console.log('Environment: 🚀 PRODUCTION');
    }
  } else {
    console.log('No DATABASE_URL found in .env file');
  }

  console.log(`Node Environment: ${process.env.NODE_ENV || 'not set'}`);
  console.log('=====================================\n');
}

function switchEnvironment(env, url) {
  if (!url) {
    console.error(`❌ ${env.toUpperCase()}_DATABASE_URL not provided`);
    console.log('Please set the database URL first:');
    console.log(`export ${env.toUpperCase()}_DATABASE_URL="your_database_url_here"`);
    process.exit(1);
  }

  updateEnvFile('DATABASE_URL', url);
  updateEnvFile('NODE_ENV', env);
  
  console.log(`✅ Switched to ${env} database environment`);
  showStatus();
}

function createTestDatabase() {
  console.log('\n🧪 Creating Test Database');
  console.log('=====================================');
  console.log('To create a separate test database:');
  console.log('');
  console.log('1. For Neon (PostgreSQL):');
  console.log('   - Go to https://console.neon.tech/');
  console.log('   - Create a new project or database');
  console.log('   - Copy the connection string');
  console.log('   - Set: export TEST_DATABASE_URL="your_test_db_url"');
  console.log('');
  console.log('2. For local PostgreSQL:');
  console.log('   - createdb corecrm_test');
  console.log('   - Set: export TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/corecrm_test"');
  console.log('');
  console.log('3. Then run: node scripts/database-utils.js switch-to-test');
  console.log('=====================================\n');
}

function showHelp() {
  console.log('\n🗃️  Database Environment Management');
  console.log('=====================================');
  console.log('Usage: node scripts/database-utils.js [command]');
  console.log('');
  console.log('Commands:');
  console.log('  switch-to-test     Switch to test database');
  console.log('  switch-to-dev      Switch to development database'); 
  console.log('  switch-to-prod     Switch to production database');
  console.log('  create-test-db     Show instructions for creating test database');
  console.log('  status             Show current database status');
  console.log('  help               Show this help message');
  console.log('');
  console.log('Environment Variables:');
  console.log('  DATABASE_URL       Current active database');
  console.log('  TEST_DATABASE_URL  Test environment database');
  console.log('  DEV_DATABASE_URL   Development environment database');
  console.log('=====================================\n');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'switch-to-test':
      switchEnvironment('test', process.env.TEST_DATABASE_URL);
      break;
    
    case 'switch-to-dev':
      switchEnvironment('development', process.env.DEV_DATABASE_URL);
      break;
    
    case 'switch-to-prod':
      switchEnvironment('production', process.env.PROD_DATABASE_URL || process.env.DATABASE_URL);
      break;
    
    case 'create-test-db':
      createTestDatabase();
      break;
    
    case 'status':
      showStatus();
      break;
    
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    
    default:
      if (command) {
        console.error(`❌ Unknown command: ${command}`);
      }
      showHelp();
      break;
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});