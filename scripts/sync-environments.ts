#!/usr/bin/env tsx

/**
 * Environment Synchronization Tool
 * 
 * Simple command-line tool for non-technical users to safely sync environments.
 * Always follows the Dev → Test → Production pipeline.
 * 
 * Usage:
 *   tsx scripts/sync-environments.ts dev-to-test    # Sync Development to Test
 *   tsx scripts/sync-environments.ts test-to-prod   # Sync Test to Production
 *   tsx scripts/sync-environments.ts status         # Check sync status
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

interface SyncStep {
  name: string;
  command: string;
  description: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

class EnvironmentSync {
  async showStatus() {
    console.log('\n📊 Checking Environment Sync Status...\n');
    
    try {
      // Check migration status
      console.log('=== Schema Migration Status ===\n');
      const { stdout: migrationStatus } = await execAsync('tsx scripts/migration-manager.ts status');
      console.log(migrationStatus);
      
      console.log('\n=== Lookup Data Status ===\n');
      const { stdout: dataStatus } = await execAsync('tsx scripts/data-sync-manager.ts status');
      console.log(dataStatus);
      
    } catch (error: any) {
      console.error('❌ Error checking status:', error.message);
    }
  }

  async syncDevToTest() {
    console.log('\n🔄 SYNC: Development → Test\n');
    console.log('This will:');
    console.log('  1. Backup Test database schema');
    console.log('  2. Apply schema migrations from Dev to Test');
    console.log('  3. Export lookup data from Dev');
    console.log('  4. Import lookup data into Test');
    console.log('\n⚠️  WARNING: This will overwrite Test data with Dev data!\n');
    
    const confirm = await ask('Do you want to continue? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Sync cancelled.');
      return;
    }
    
    const steps: SyncStep[] = [
      {
        name: 'Apply Schema Migrations to Test',
        command: 'tsx scripts/migration-manager.ts apply test',
        description: 'Updating Test database schema...'
      },
      {
        name: 'Export Lookup Data from Dev',
        command: 'tsx scripts/data-sync-manager.ts export development',
        description: 'Exporting lookup data from Development...'
      },
      {
        name: 'Import Lookup Data to Test',
        command: 'tsx scripts/data-sync-manager.ts import test',
        description: 'Importing lookup data into Test...'
      }
    ];
    
    await this.executeSteps(steps);
    
    console.log('\n✅ Development → Test sync complete!\n');
  }

  async syncTestToProd() {
    console.log('\n🔄 SYNC: Test → Production\n');
    console.log('This will:');
    console.log('  1. Backup Production database schema');
    console.log('  2. Apply schema migrations from Test to Production');
    console.log('  3. Export lookup data from Test');
    console.log('  4. Import lookup data into Production');
    console.log('\n🚨 CRITICAL WARNING: This affects PRODUCTION data!\n');
    
    const confirm1 = await ask('Are you ABSOLUTELY SURE you want to sync to Production? (yes/no): ');
    
    if (confirm1.toLowerCase() !== 'yes') {
      console.log('❌ Sync cancelled.');
      return;
    }
    
    const confirm2 = await ask('Type "SYNC TO PRODUCTION" to confirm: ');
    
    if (confirm2 !== 'SYNC TO PRODUCTION') {
      console.log('❌ Sync cancelled. Confirmation text did not match.');
      return;
    }
    
    const steps: SyncStep[] = [
      {
        name: 'Apply Schema Migrations to Production',
        command: 'tsx scripts/migration-manager.ts apply prod',
        description: 'Updating Production database schema...'
      },
      {
        name: 'Export Lookup Data from Test',
        command: 'tsx scripts/data-sync-manager.ts export test',
        description: 'Exporting lookup data from Test...'
      },
      {
        name: 'Import Lookup Data to Production',
        command: 'tsx scripts/data-sync-manager.ts import production',
        description: 'Importing lookup data into Production...'
      }
    ];
    
    await this.executeSteps(steps);
    
    console.log('\n✅ Test → Production sync complete!\n');
    console.log('⚠️  Remember to verify Production application immediately!\n');
  }

  private async executeSteps(steps: SyncStep[]) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`\n[${i + 1}/${steps.length}] ${step.description}`);
      
      try {
        const { stdout, stderr } = await execAsync(step.command);
        
        if (stdout) {
          console.log(stdout);
        }
        
        if (stderr && !stderr.includes('warn')) {
          console.error('⚠️  Warnings:', stderr);
        }
        
        console.log(`✅ ${step.name} completed`);
        
      } catch (error: any) {
        console.error(`\n❌ Error in step: ${step.name}`);
        console.error(error.message);
        
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
        
        const continueAnyway = await ask('\nContinue with remaining steps? (yes/no): ');
        
        if (continueAnyway.toLowerCase() !== 'yes') {
          console.log('❌ Sync aborted.');
          throw error;
        }
      }
    }
  }
}

async function main() {
  const command = process.argv[2];
  const sync = new EnvironmentSync();
  
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Environment Synchronization Tool          ║');
  console.log('║   Dev → Test → Production Pipeline          ║');
  console.log('╚══════════════════════════════════════════════╝');
  
  try {
    switch (command) {
      case 'dev-to-test':
        await sync.syncDevToTest();
        break;
        
      case 'test-to-prod':
        await sync.syncTestToProd();
        break;
        
      case 'status':
        await sync.showStatus();
        break;
        
      default:
        console.log('\n📖 Usage:');
        console.log('  tsx scripts/sync-environments.ts dev-to-test    # Sync Dev → Test');
        console.log('  tsx scripts/sync-environments.ts test-to-prod   # Sync Test → Prod');
        console.log('  tsx scripts/sync-environments.ts status         # Check status');
        console.log('\n💡 Always follow the pipeline: Dev → Test → Production\n');
    }
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
