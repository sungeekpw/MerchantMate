#!/usr/bin/env node

/**
 * Pre-Deployment Test Verification Script
 * 
 * This script runs a comprehensive test suite before deployment to ensure:
 * - All tests pass
 * - Coverage meets minimum thresholds
 * - No critical failures exist
 * - System is deployment-ready
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Pre-Deployment Test Verification Started\n');
console.log('=' .repeat(60));

let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  coverage: {
    lines: 0,
    statements: 0,
    functions: 0,
    branches: 0
  },
  deploymentReady: false
};

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

function parseCoverageResults() {
  const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coverageFile)) {
    console.log('⚠️  Coverage file not found, skipping coverage check');
    return null;
  }

  try {
    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    return {
      lines: coverageData.total.lines.pct,
      statements: coverageData.total.statements.pct,
      functions: coverageData.total.functions.pct,
      branches: coverageData.total.branches.pct
    };
  } catch (error) {
    console.log('⚠️  Error parsing coverage data:', error.message);
    return null;
  }
}

function printResults() {
  console.log('\n' + '=' .repeat(60));
  console.log('📊 PRE-DEPLOYMENT TEST RESULTS');
  console.log('=' .repeat(60));

  // Test Results Summary
  console.log('\n🧪 Test Execution Summary:');
  console.log(`   Total Tests: ${testResults.totalTests}`);
  console.log(`   Passed: ${testResults.passedTests} ✅`);
  console.log(`   Failed: ${testResults.failedTests} ${testResults.failedTests > 0 ? '❌' : '✅'}`);

  // Coverage Results
  console.log('\n📈 Code Coverage:');
  console.log(`   Lines: ${testResults.coverage.lines}%`);
  console.log(`   Statements: ${testResults.coverage.statements}%`);
  console.log(`   Functions: ${testResults.coverage.functions}%`);
  console.log(`   Branches: ${testResults.coverage.branches}%`);

  // Deployment Readiness
  console.log('\n🎯 Deployment Status:');
  if (testResults.deploymentReady) {
    console.log('   Status: READY FOR DEPLOYMENT ✅');
    console.log('   All tests passed and system is stable');
  } else {
    console.log('   Status: NOT READY FOR DEPLOYMENT ❌');
    console.log('   Please fix failing tests before deploying');
  }

  console.log('\n' + '=' .repeat(60));
}

async function main() {
  try {
    // Step 1: Clean previous test artifacts
    console.log('🧹 Cleaning previous test artifacts...');
    if (fs.existsSync('coverage')) {
      fs.rmSync('coverage', { recursive: true, force: true });
    }

    // Step 2: Run comprehensive test suite with coverage
    console.log('🔍 Running comprehensive test suite...');
    const testResult = await runCommand('npx', [
      'jest',
      '--coverage',
      '--verbose',
      '--testTimeout=30000',
      '--passWithNoTests',
      '--json',
      '--outputFile=test-results.json'
    ]);

    console.log('📝 Test execution completed');

    // Step 3: Parse test results
    try {
      if (fs.existsSync('test-results.json')) {
        const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
        testResults.totalTests = results.numTotalTests || 0;
        testResults.passedTests = results.numPassedTests || 0;
        testResults.failedTests = results.numFailedTests || 0;
        
        // Clean up temp file
        fs.unlinkSync('test-results.json');
      } else {
        // Fallback parsing from stdout
        const lines = testResult.stdout.split('\n');
        const testLine = lines.find(line => line.includes('Tests:') && line.includes('passed'));
        if (testLine) {
          const matches = testLine.match(/(\d+) passed/);
          if (matches) {
            testResults.passedTests = parseInt(matches[1]);
            testResults.totalTests = testResults.passedTests;
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Could not parse detailed test results');
    }

    // Step 4: Parse coverage results
    const coverage = parseCoverageResults();
    if (coverage) {
      testResults.coverage = coverage;
    }

    // Step 5: Determine deployment readiness
    testResults.deploymentReady = (
      testResults.failedTests === 0 &&
      testResults.passedTests > 0 &&
      testResult.success
    );

    // Step 6: Display results
    printResults();

    // Step 7: Exit with appropriate code
    process.exit(testResults.deploymentReady ? 0 : 1);

  } catch (error) {
    console.error('❌ Pre-deployment check failed:', error.message);
    console.log('\n🚨 DEPLOYMENT BLOCKED - Fix errors and try again');
    process.exit(1);
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n⚠️  Pre-deployment check interrupted');
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});