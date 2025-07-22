#!/usr/bin/env tsx

/**
 * Deployment Readiness Check Script
 * 
 * This script performs comprehensive checks to ensure the application
 * is ready for deployment, including database schema synchronization,
 * environment configuration, and application health.
 * 
 * Usage:
 *   npm run deploy:check
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string[];
}

class DeploymentChecker {
  private results: CheckResult[] = [];
  
  private addResult(name: string, passed: boolean, message: string, details?: string[]): void {
    this.results.push({ name, passed, message, details });
    
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}: ${message}`);
    
    if (details && details.length > 0) {
      details.forEach(detail => console.log(`   ${detail}`));
    }
    console.log();
  }
  
  async checkEnvironmentVariables(): Promise<void> {
    console.log('🔧 Checking Environment Configuration...\n');
    
    const requiredVars = [
      { name: 'DATABASE_URL', description: 'Production database connection' },
      { name: 'TEST_DATABASE_URL', description: 'Test database connection' },
      { name: 'DEV_DATABASE_URL', description: 'Development database connection' },
      { name: 'SENDGRID_API_KEY', description: 'Email service API key' },
      { name: 'SENDGRID_FROM_EMAIL', description: 'Default sender email' }
    ];
    
    const missing: string[] = [];
    const present: string[] = [];
    
    for (const envVar of requiredVars) {
      if (process.env[envVar.name]) {
        present.push(`${envVar.name}: ${envVar.description}`);
      } else {
        missing.push(`${envVar.name}: ${envVar.description}`);
      }
    }
    
    const allPresent = missing.length === 0;
    this.addResult(
      'Environment Variables',
      allPresent,
      allPresent ? 'All required environment variables configured' : `${missing.length} missing environment variables`,
      allPresent ? present : [`Missing: ${missing.join(', ')}`]
    );
  }
  
  async checkDatabaseConnections(): Promise<void> {
    console.log('🗄️  Checking Database Connections...\n');
    
    const databases = [
      { name: 'Production', envVar: 'DATABASE_URL' },
      { name: 'Test', envVar: 'TEST_DATABASE_URL' },
      { name: 'Development', envVar: 'DEV_DATABASE_URL' }
    ];
    
    const connectionResults: string[] = [];
    let allConnected = true;
    
    for (const db of databases) {
      if (!process.env[db.envVar]) {
        connectionResults.push(`${db.name}: Not configured`);
        continue;
      }
      
      try {
        // Test connection using drizzle-kit introspect
        const command = `DATABASE_URL="${process.env[db.envVar]}" timeout 10s npx drizzle-kit introspect --out=temp-connection-test`;
        await execAsync(command);
        connectionResults.push(`${db.name}: Connected successfully`);
        
        // Clean up temp files
        try {
          fs.rmSync(path.join(process.cwd(), 'temp-connection-test'), { recursive: true, force: true });
        } catch {}
      } catch (error: any) {
        allConnected = false;
        connectionResults.push(`${db.name}: Connection failed - ${error.message}`);
      }
    }
    
    this.addResult(
      'Database Connections',
      allConnected,
      allConnected ? 'All databases connected successfully' : 'Some database connections failed',
      connectionResults
    );
  }
  
  async checkSchemaConsistency(): Promise<void> {
    console.log('📊 Checking Schema Consistency...\n');
    
    try {
      // Run our schema sync script in check mode
      const { stdout, stderr } = await execAsync('tsx scripts/sync-database-schemas.ts check', {
        cwd: process.cwd()
      });
      
      const consistent = !stderr.includes('failed') && !stdout.includes('ERROR');
      
      this.addResult(
        'Schema Consistency',
        consistent,
        consistent ? 'All database schemas are synchronized' : 'Schema inconsistencies detected',
        consistent ? ['All environments have matching schemas'] : ['Run npm run db:sync-all to fix']
      );
    } catch (error: any) {
      this.addResult(
        'Schema Consistency',
        false,
        'Could not verify schema consistency',
        [`Error: ${error.message}`, 'Run npm run db:sync-all manually']
      );
    }
  }
  
  async checkApplicationBuild(): Promise<void> {
    console.log('🏗️  Checking Application Build...\n');
    
    try {
      // Check if we can build the application
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: process.cwd(),
        timeout: 60000 // 1 minute timeout
      });
      
      const buildSuccess = !stderr.includes('error') && !stderr.includes('Error');
      
      this.addResult(
        'Application Build',
        buildSuccess,
        buildSuccess ? 'Application builds successfully' : 'Build errors detected',
        buildSuccess ? ['Frontend and backend compiled without errors'] : ['Check build logs for details']
      );
    } catch (error: any) {
      this.addResult(
        'Application Build',
        false,
        'Build process failed',
        [`Error: ${error.message}`, 'Fix build errors before deployment']
      );
    }
  }
  
  async checkTestSuite(): Promise<void> {
    console.log('🧪 Running Test Suite...\n');
    
    try {
      const { stdout, stderr } = await execAsync('npm test -- --passWithNoTests', {
        cwd: process.cwd(),
        timeout: 120000 // 2 minute timeout
      });
      
      const testsPass = stdout.includes('Tests:') && !stdout.includes('failed');
      const testCount = stdout.match(/(\d+) passing/)?.[1] || '0';
      
      this.addResult(
        'Test Suite',
        testsPass,
        testsPass ? `All tests passing (${testCount} tests)` : 'Some tests failing',
        testsPass ? [`${testCount} tests executed successfully`] : ['Fix failing tests before deployment']
      );
    } catch (error: any) {
      this.addResult(
        'Test Suite',
        false,
        'Test execution failed',
        [`Error: ${error.message}`, 'Ensure all tests pass before deployment']
      );
    }
  }
  
  async checkSecurityConfiguration(): Promise<void> {
    console.log('🔒 Checking Security Configuration...\n');
    
    const securityChecks: string[] = [];
    let allSecure = true;
    
    // Check for secure session configuration
    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
      securityChecks.push('Session secret: Properly configured');
    } else {
      allSecure = false;
      securityChecks.push('Session secret: Missing or too short (min 32 chars)');
    }
    
    // Check email configuration
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      securityChecks.push('Email service: Configured with SendGrid');
    } else {
      allSecure = false;
      securityChecks.push('Email service: Missing SendGrid configuration');
    }
    
    // Check database URLs for SSL
    const dbUrls = [process.env.DATABASE_URL, process.env.TEST_DATABASE_URL, process.env.DEV_DATABASE_URL]
      .filter(Boolean);
    
    const sslConfigured = dbUrls.every(url => url?.includes('sslmode=require') || url?.includes('ssl=true'));
    if (sslConfigured) {
      securityChecks.push('Database SSL: Enabled for all connections');
    } else {
      securityChecks.push('Database SSL: Consider enabling SSL for production');
    }
    
    this.addResult(
      'Security Configuration',
      allSecure,
      allSecure ? 'Security configuration complete' : 'Security configuration needs attention',
      securityChecks
    );
  }
  
  generateReport(): void {
    console.log('\n==========================================');
    console.log('📋 DEPLOYMENT READINESS REPORT');
    console.log('==========================================\n');
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`✅ Passed: ${passed}/${total} checks (${percentage}%)`);
    console.log(`❌ Failed: ${total - passed}/${total} checks\n`);
    
    if (passed === total) {
      console.log('🎉 APPLICATION IS READY FOR DEPLOYMENT!');
      console.log('   All checks passed. You can safely deploy to production.');
    } else {
      console.log('⚠️  APPLICATION NOT READY FOR DEPLOYMENT');
      console.log('   Please address the failed checks before deploying.');
      
      console.log('\n📝 Failed Checks:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   • ${result.name}: ${result.message}`);
      });
    }
    
    console.log('\n==========================================');
    console.log('🚀 Next Steps:');
    console.log('==========================================\n');
    
    if (passed === total) {
      console.log('1. Run: npm run build');
      console.log('2. Deploy to Replit Deployments');
      console.log('3. Monitor application logs after deployment');
    } else {
      console.log('1. Fix the failed checks listed above');
      console.log('2. Run: npm run db:sync-all (if schema issues)');
      console.log('3. Re-run: npm run deploy:check');
      console.log('4. Deploy when all checks pass');
    }
  }
  
  async runAllChecks(): Promise<boolean> {
    console.log('🚀 Starting Deployment Readiness Check...\n');
    console.log('==========================================\n');
    
    await this.checkEnvironmentVariables();
    await this.checkDatabaseConnections();
    await this.checkSchemaConsistency();
    await this.checkApplicationBuild();
    await this.checkTestSuite();
    await this.checkSecurityConfiguration();
    
    this.generateReport();
    
    return this.results.every(r => r.passed);
  }
}

async function main(): Promise<void> {
  const checker = new DeploymentChecker();
  const ready = await checker.runAllChecks();
  
  process.exit(ready ? 0 : 1);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}