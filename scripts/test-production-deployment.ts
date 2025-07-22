#!/usr/bin/env tsx
/**
 * Production Deployment Test Script
 * Tests the production deployment functionality and authentication
 */

import { execSync } from 'child_process';

const PRODUCTION_URL = 'https://crm.charrg.com';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${result.test}: ${result.message}`);
  if (result.details) {
    console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
  }
}

async function testEndpoint(endpoint: string, options: RequestInit = {}): Promise<any> {
  try {
    const response = await fetch(`${PRODUCTION_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    return { status: response.status, data, headers: response.headers };
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Testing Production Deployment at', PRODUCTION_URL);
  console.log('=' .repeat(60));

  // Test 1: Basic connectivity
  try {
    const result = await testEndpoint('/');
    if (result.status === 200) {
      logResult({
        test: 'Basic Connectivity',
        status: 'PASS',
        message: 'Production deployment is accessible'
      });
    } else {
      logResult({
        test: 'Basic Connectivity',
        status: 'FAIL',
        message: `Unexpected status: ${result.status}`,
        details: result.data
      });
    }
  } catch (error) {
    logResult({
      test: 'Basic Connectivity',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test 2: API endpoint accessibility
  try {
    const result = await testEndpoint('/api/auth/user');
    if (result.status === 401) {
      logResult({
        test: 'API Routing',
        status: 'PASS',
        message: 'API endpoints are properly routed (expected 401 for unauthenticated request)'
      });
    } else if (typeof result.data === 'string' && result.data.includes('<html>')) {
      logResult({
        test: 'API Routing',
        status: 'FAIL',
        message: 'API returning HTML instead of JSON - routing issue detected'
      });
    } else {
      logResult({
        test: 'API Routing',
        status: 'WARN',
        message: `Unexpected response: ${result.status}`,
        details: result.data
      });
    }
  } catch (error) {
    logResult({
      test: 'API Routing',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test 3: Authentication system
  try {
    const result = await testEndpoint('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (result.status === 200 && result.data.success) {
      logResult({
        test: 'Authentication',
        status: 'PASS',
        message: 'Login successful with admin credentials'
      });
    } else if (typeof result.data === 'string' && result.data.includes('<html>')) {
      logResult({
        test: 'Authentication',
        status: 'FAIL',
        message: 'Login endpoint returning HTML instead of JSON'
      });
    } else {
      logResult({
        test: 'Authentication',
        status: 'FAIL',
        message: 'Login failed',
        details: result.data
      });
    }
  } catch (error) {
    logResult({
      test: 'Authentication',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test 4: Database connectivity (if authentication works)
  const loginResult = await testEndpoint('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'testadmin', password: 'admin123' })
  }).catch(() => null);

  if (loginResult?.data?.success) {
    const cookies = loginResult.headers.get('set-cookie') || '';
    try {
      const result = await testEndpoint('/api/email-templates', {
        headers: { Cookie: cookies }
      });
      
      if (result.status === 200 && Array.isArray(result.data)) {
        logResult({
          test: 'Database Connectivity',
          status: 'PASS',
          message: `Database connected - found ${result.data.length} email templates`
        });
      } else {
        logResult({
          test: 'Database Connectivity',
          status: 'FAIL',
          message: 'Database query failed',
          details: result.data
        });
      }
    } catch (error) {
      logResult({
        test: 'Database Connectivity',
        status: 'FAIL',
        message: error.message
      });
    }
  } else {
    logResult({
      test: 'Database Connectivity',
      status: 'WARN',
      message: 'Skipped - authentication required'
    });
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  
  console.log(`📊 Test Summary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
  
  if (failCount === 0) {
    console.log('🎉 Production deployment is working correctly!');
  } else {
    console.log('🔧 Production deployment needs attention.');
    console.log('\nRecommended actions:');
    if (results.some(r => r.message.includes('HTML instead of JSON'))) {
      console.log('• Check build configuration and API routing');
      console.log('• Ensure production build serves API endpoints correctly');
    }
    if (results.some(r => r.test === 'Authentication' && r.status === 'FAIL')) {
      console.log('• Verify DATABASE_URL environment variable in production');
      console.log('• Check if admin user exists in production database');
    }
  }
}

runTests().catch(console.error);