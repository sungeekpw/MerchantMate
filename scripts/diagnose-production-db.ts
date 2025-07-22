#!/usr/bin/env tsx
/**
 * Production Database Diagnosis Script
 * Diagnoses what database the production deployment is actually using
 */

async function diagnoseProduction() {
  console.log('🔍 Diagnosing Production Database Connection...');
  
  try {
    // Test 1: Check if production can see our seeded data
    console.log('\n1. Testing if production sees our admin users...');
    const loginTest = await fetch('https://crm.charrg.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const loginResult = await loginTest.text();
    console.log('Login response:', loginResult);
    
    // Test 2: Try to access a data endpoint that would show if it's connected
    console.log('\n2. Testing anonymous data access...');
    const dataTest = await fetch('https://crm.charrg.com/api/pdf-forms');
    const dataResult = await dataTest.text();
    console.log('Data endpoint response:', dataResult.substring(0, 200));
    
    // Test 3: Check if it's using the right environment
    console.log('\n3. Testing database environment detection...');
    const envTest = await fetch('https://crm.charrg.com/api/admin/db-environment');
    const envResult = await envTest.text();
    console.log('Environment endpoint response:', envResult);
    
    // Analysis
    console.log('\n📊 Analysis:');
    if (loginResult.includes('Invalid login data')) {
      console.log('❌ Production deployment cannot find admin user we created');
      console.log('   → This confirms production is using a different database');
    }
    
    if (dataResult.includes('[]') || dataResult.includes('Unauthorized')) {
      console.log('✅ API endpoints working correctly');
    } else if (dataResult.includes('<html>')) {
      console.log('❌ API endpoints returning HTML - routing problem');
    }
    
    console.log('\n🎯 Recommended Solution:');
    console.log('1. Your production deployment needs to be configured with the correct DATABASE_URL');
    console.log('2. Or we need to seed the database that production is actually using');
    console.log('3. Check your Replit deployment environment variables');
    
  } catch (error) {
    console.error('Error during diagnosis:', error.message);
  }
}

diagnoseProduction();