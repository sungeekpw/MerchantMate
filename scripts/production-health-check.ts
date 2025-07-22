#!/usr/bin/env tsx
/**
 * Production Health Check Script
 * Comprehensive health check for production deployment
 */

async function healthCheck() {
  console.log('🏥 Production Health Check for https://crm.charrg.com');
  console.log('='.repeat(60));
  
  const tests = [];

  // Test 1: Frontend accessibility
  try {
    const response = await fetch('https://crm.charrg.com');
    const text = await response.text();
    tests.push({
      name: 'Frontend Loading',
      status: response.status === 200 && text.includes('<html>') ? 'PASS' : 'FAIL',
      details: `Status: ${response.status}, Contains HTML: ${text.includes('<html>')}`
    });
  } catch (error) {
    tests.push({
      name: 'Frontend Loading',
      status: 'FAIL',
      details: error.message
    });
  }

  // Test 2: API Health endpoint (if exists)
  try {
    const response = await fetch('https://crm.charrg.com/api/health');
    const result = await response.text();
    tests.push({
      name: 'API Health Endpoint',
      status: response.status === 200 ? 'PASS' : 'INFO',
      details: `Status: ${response.status}, Response: ${result.substring(0, 50)}`
    });
  } catch (error) {
    tests.push({
      name: 'API Health Endpoint',
      status: 'INFO',
      details: 'No health endpoint (normal)'
    });
  }

  // Test 3: Static asset serving
  try {
    const response = await fetch('https://crm.charrg.com/favicon.ico');
    tests.push({
      name: 'Static Assets',
      status: response.status === 200 || response.status === 404 ? 'PASS' : 'WARN',
      details: `Favicon status: ${response.status}`
    });
  } catch (error) {
    tests.push({
      name: 'Static Assets',
      status: 'WARN',
      details: error.message
    });
  }

  // Test 4: API routing structure
  const apiTests = [
    '/api/auth/user',
    '/api/email-templates',
    '/api/admin/db-environment'
  ];

  for (const endpoint of apiTests) {
    try {
      const response = await fetch(`https://crm.charrg.com${endpoint}`);
      const result = await response.text();
      
      const isJsonResponse = result.startsWith('{') || result.startsWith('[');
      const isAuthError = response.status === 401 && isJsonResponse;
      const isHtmlResponse = result.includes('<html>');
      
      tests.push({
        name: `API ${endpoint}`,
        status: isAuthError || (response.status === 200 && isJsonResponse) ? 'PASS' : isHtmlResponse ? 'FAIL' : 'WARN',
        details: `Status: ${response.status}, Format: ${isJsonResponse ? 'JSON' : isHtmlResponse ? 'HTML' : 'Other'}`
      });
    } catch (error) {
      tests.push({
        name: `API ${endpoint}`,
        status: 'FAIL',
        details: error.message
      });
    }
  }

  // Test 5: Authentication system
  try {
    const response = await fetch('https://crm.charrg.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const result = await response.text();
    
    const isJson = result.startsWith('{');
    const data = isJson ? JSON.parse(result) : null;
    
    tests.push({
      name: 'Authentication System',
      status: isJson && data ? (data.success ? 'PASS' : 'WARN') : 'FAIL',
      details: `Format: ${isJson ? 'JSON' : 'HTML'}, Message: ${data?.message || 'No message'}`
    });
  } catch (error) {
    tests.push({
      name: 'Authentication System',
      status: 'FAIL',
      details: error.message
    });
  }

  // Display results
  console.log('\n📊 Health Check Results:');
  tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${test.name}: ${test.status}`);
    console.log(`   ${test.details}`);
  });

  // Summary
  const passCount = tests.filter(t => t.status === 'PASS').length;
  const failCount = tests.filter(t => t.status === 'FAIL').length;
  const warnCount = tests.filter(t => t.status === 'WARN').length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`📈 Summary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
  
  if (failCount === 0) {
    console.log('🎉 Production deployment is healthy!');
  } else {
    console.log('🔧 Production deployment needs attention.');
  }

  // Specific recommendations
  const authTest = tests.find(t => t.name === 'Authentication System');
  if (authTest?.status === 'WARN') {
    console.log('\n💡 Authentication Issue Detected:');
    console.log('• The API is working (returning JSON) but login credentials are not being accepted');
    console.log('• This usually means the production database differs from the seeded database');
    console.log('• Try logging in through the web interface to see if there are existing users');
  }
}

healthCheck().catch(console.error);