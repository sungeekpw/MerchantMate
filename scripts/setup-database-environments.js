#!/usr/bin/env node

/**
 * Database Environment Setup Script
 * Creates separate database environments for production, development, and testing
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

async function checkCurrentEnvironment() {
  log('\n🔍 Checking Current Database Environment', 'blue');
  log('=' + '='.repeat(50), 'blue');
  
  const currentUrl = process.env.DATABASE_URL;
  if (currentUrl) {
    const host = currentUrl.split('@')[1]?.split('/')[0];
    log(`Current Database: ${host}`, 'green');
    log(`Environment: Production (shared)`, 'yellow');
  } else {
    log('No DATABASE_URL found', 'red');
  }
}

async function createEnvironmentFiles() {
  log('\n📝 Creating Environment Configuration Files', 'blue');
  log('=' + '='.repeat(50), 'blue');

  const envExample = `# Database Environment Configuration
# Copy this file to .env.local and configure your database URLs

# Production Database (default)
DATABASE_URL="postgresql://user:password@prod-host/corecrm_prod"

# Development Database
DEV_DATABASE_URL="postgresql://user:password@dev-host/corecrm_dev"

# Testing Database
TEST_DATABASE_URL="postgresql://user:password@test-host/corecrm_test"

# Session Configuration
SESSION_SECRET="your-session-secret-here"

# Email Configuration
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@yourdomain.com"

# Environment Mode (development, testing, production)
NODE_ENV="development"
`;

  fs.writeFileSync('.env.example', envExample);
  log('✅ Created .env.example with database environment template', 'green');

  const envLocal = `# Local Development Configuration
# This file is ignored by git for security

# Use current production database for now (CHANGE THIS)
DATABASE_URL="${process.env.DATABASE_URL || 'postgresql://localhost/corecrm_dev'}"

# Future separate environments (configure when ready)
# DEV_DATABASE_URL="postgresql://localhost/corecrm_dev"
# TEST_DATABASE_URL="postgresql://localhost/corecrm_test"

SESSION_SECRET="${process.env.SESSION_SECRET || 'dev-session-secret-change-in-production'}"
SENDGRID_API_KEY="${process.env.SENDGRID_API_KEY || ''}"
SENDGRID_FROM_EMAIL="${process.env.SENDGRID_FROM_EMAIL || 'noreply@localhost'}"
NODE_ENV="development"
`;

  if (!fs.existsSync('.env.local')) {
    fs.writeFileSync('.env.local', envLocal);
    log('✅ Created .env.local with current configuration', 'green');
  } else {
    log('⚠️  .env.local already exists, not overwriting', 'yellow');
  }
}

async function updateDatabaseConfiguration() {
  log('\n🔧 Updating Database Configuration', 'blue');
  log('=' + '='.repeat(50), 'blue');

  // Update server/db.ts to support environment switching
  const dbConfig = `import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Environment-based database URL selection
function getDatabaseUrl(environment?: string): string {
  switch (environment) {
    case 'test':
      return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL!;
    case 'development':
      return process.env.DEV_DATABASE_URL || process.env.DATABASE_URL!;
    case 'production':
    default:
      return process.env.DATABASE_URL!;
  }
}

// Get database URL based on environment
const environment = process.env.NODE_ENV || 'development';
const databaseUrl = getDatabaseUrl(environment);

if (!databaseUrl) {
  throw new Error(
    \`DATABASE_URL must be set for environment: \${environment}. \` +
    \`Available environments: production (DATABASE_URL), development (DEV_DATABASE_URL), test (TEST_DATABASE_URL)\`
  );
}

console.log(\`\${environment.charAt(0).toUpperCase() + environment.slice(1)} database for \${environment} environment\`);

export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle({ client: pool, schema });

// Environment switching for testing utilities
const connectionPools = new Map<string, Pool>();

export function getDynamicDatabase(environment: string = 'production') {
  if (!connectionPools.has(environment)) {
    const url = getDatabaseUrl(environment);
    const dynamicPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    connectionPools.set(environment, dynamicPool);
  }
  
  const dynamicPool = connectionPools.get(environment)!;
  return drizzle({ client: dynamicPool, schema });
}

// Cleanup function for graceful shutdown
export function closeAllConnections() {
  pool.end().catch(console.error);
  connectionPools.forEach((pool) => {
    pool.end().catch(console.error);
  });
  connectionPools.clear();
}

process.on('SIGTERM', closeAllConnections);
process.on('SIGINT', closeAllConnections);
`;

  fs.writeFileSync('server/db.ts', dbConfig);
  log('✅ Updated server/db.ts with environment support', 'green');
}

async function createDatabaseManagementScript() {
  log('\n🛠️  Creating Database Management Script', 'blue');
  log('=' + '='.repeat(50), 'blue');

  const managementScript = `#!/usr/bin/env node

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
  console.log('\\n📊 Database Environment Status');
  console.log('=' + '='.repeat(40));
  
  const envs = [
    { name: 'Production', url: process.env.DATABASE_URL, key: 'DATABASE_URL' },
    { name: 'Development', url: process.env.DEV_DATABASE_URL, key: 'DEV_DATABASE_URL' },
    { name: 'Testing', url: process.env.TEST_DATABASE_URL, key: 'TEST_DATABASE_URL' }
  ];
  
  envs.forEach(env => {
    const status = env.url ? '✅ Configured' : '❌ Not Set';
    const host = env.url ? env.url.split('@')[1]?.split('/')[0] || 'Unknown' : 'N/A';
    console.log(\`\${env.name.padEnd(12)}: \${status} (\${env.key})\`);
    if (env.url) console.log(\`\${' '.repeat(14)}Host: \${host}\`);
  });
}

async function testConnections() {
  console.log('\\n🔌 Testing Database Connections');
  console.log('=' + '='.repeat(40));
  
  const environments = ['production', 'development', 'test'];
  
  for (const env of environments) {
    try {
      const db = getDynamicDatabase(env);
      // Simple connection test
      await db.execute('SELECT 1 as test');
      console.log(\`✅ \${env}: Connected successfully\`);
    } catch (error) {
      console.log(\`❌ \${env}: Connection failed - \${error.message}\`);
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
  
  console.log(\`🔄 Switching to \${env} environment\`);
  process.env.NODE_ENV = env;
  console.log(\`✅ Environment set to: \${env}\`);
  console.log('Note: Restart your application to use the new environment');
}

async function showHelp() {
  console.log('\\n🚀 Database Management Utility');
  console.log('=' + '='.repeat(40));
  console.log('Available commands:');
  console.log('  check-envs      - Show environment configuration status');
  console.log('  test-connections - Test database connections');
  console.log('  switch-env <env> - Switch to specific environment');
  console.log('  help            - Show this help message');
  console.log('\\nExamples:');
  console.log('  npm run db-manage check-envs');
  console.log('  npm run db-manage test-connections');
  console.log('  npm run db-manage switch-env development');
}

const command = process.argv[2];
if (commands[command]) {
  commands[command]().catch(console.error);
} else {
  console.log(\`❌ Unknown command: \${command}\`);
  showHelp();
}
`;

  fs.writeFileSync('scripts/database-management.js', managementScript);
  log('✅ Created database management script', 'green');
}

async function updatePackageJson() {
  log('\n📦 Adding Database Management Scripts to package.json', 'blue');
  log('=' + '='.repeat(50), 'blue');

  try {
    const packagePath = 'package.json';
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    packageContent.scripts = {
      ...packageContent.scripts,
      "db-manage": "node scripts/database-management.js",
      "db-setup": "node scripts/setup-database-environments.js",
      "db-check": "node scripts/database-management.js check-envs"
    };
    
    fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
    log('✅ Added database management scripts to package.json', 'green');
  } catch (error) {
    log(`❌ Failed to update package.json: ${error.message}`, 'red');
  }
}

async function showSummary() {
  log('\n🎉 Database Environment Setup Complete!', 'green');
  log('=' + '='.repeat(50), 'green');
  
  log('\nWhat was created:', 'bold');
  log('✅ .env.example - Template for database configuration');
  log('✅ .env.local - Local development configuration');
  log('✅ server/db.ts - Enhanced with environment switching');
  log('✅ scripts/database-management.js - Database utilities');
  log('✅ package.json - Added management scripts');
  
  log('\nNext Steps:', 'bold');
  log('1. Configure separate database URLs in .env.local');
  log('2. Run: npm run db-check (to verify configuration)');
  log('3. Run: npm run db-manage test-connections');
  log('4. Use ?db=test or ?db=dev in URLs for environment switching');
  
  log('\nAvailable Commands:', 'bold');
  log('npm run db-manage check-envs     - Check environment status');
  log('npm run db-manage test-connections - Test all connections');
  log('npm run db-setup                 - Re-run this setup');
  
  log('\n⚠️  Current Status:', 'yellow');
  log('You are still using ONE database for all environments.');
  log('Configure DEV_DATABASE_URL and TEST_DATABASE_URL in .env.local');
  log('when you want separate databases for better isolation.');
}

async function main() {
  log('🚀 Setting Up Database Environments for Core CRM', 'bold');
  
  try {
    await checkCurrentEnvironment();
    await createEnvironmentFiles();
    await updateDatabaseConfiguration();
    await createDatabaseManagementScript();
    await updatePackageJson();
    await showSummary();
  } catch (error) {
    log(`❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();