#!/usr/bin/env node

/**
 * Testing Utilities CLI
 * Usage: node testing-utilities.js [command] [options]
 * 
 * Commands:
 *   reset-all              - Clear all prospects, owners, and signatures
 *   reset-signatures       - Clear only signatures, keep prospects
 *   reset-form-data        - Reset form data to pending status
 *   reset-campaigns        - Clear campaign assignments
 *   reset-equipment        - Clear equipment assignments
 *   custom                 - Custom reset with specific options
 */

const args = process.argv.slice(2);
const command = args[0];

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-app.replit.app' 
  : 'http://localhost:5000';

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=your-session-id', // You'd need to get this from browser
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${data.message || response.statusText}`);
    }
    
    return data;
  } catch (error) {
    console.error('Request failed:', error.message);
    process.exit(1);
  }
}

async function resetTestingData(options) {
  console.log('🧪 Resetting testing data...');
  console.log('Options:', JSON.stringify(options, null, 2));
  
  const result = await makeRequest('/api/admin/reset-testing-data', {
    method: 'POST',
    body: JSON.stringify(options)
  });
  
  console.log('\n✅ Reset completed successfully!');
  console.log('Cleared:', result.cleared.join(', '));
  console.log('Counts:', JSON.stringify(result.counts, null, 2));
}

async function clearAllProspects() {
  console.log('🗑️  Clearing all prospect data...');
  
  const result = await makeRequest('/api/admin/clear-prospects', {
    method: 'DELETE'
  });
  
  console.log('\n✅ Clear completed successfully!');
  console.log('Message:', result.message);
  console.log('Deleted prospects:', result.deleted?.prospects || 0);
}

function showHelp() {
  console.log(`
🧪 Testing Utilities CLI

Usage: node testing-utilities.js [command]

Commands:
  reset-all              Clear all prospects, owners, and signatures
  reset-signatures       Clear only signatures, keep prospects
  reset-form-data        Reset form data to pending status
  reset-campaigns        Clear campaign assignments
  reset-equipment        Clear equipment assignments
  clear-prospects        Use legacy clear all prospects method
  help                   Show this help message

Examples:
  node testing-utilities.js reset-all
  node testing-utilities.js reset-signatures
  node testing-utilities.js reset-form-data

Note: This requires super_admin permissions and a valid session.
For web interface, visit: /testing-utilities
`);
}

async function main() {
  switch (command) {
    case 'reset-all':
      await resetTestingData({
        prospects: true,
        signatures: true,
        formData: true
      });
      break;
      
    case 'reset-signatures':
      await resetTestingData({
        signatures: true
      });
      break;
      
    case 'reset-form-data':
      await resetTestingData({
        formData: true
      });
      break;
      
    case 'reset-campaigns':
      await resetTestingData({
        campaigns: true
      });
      break;
      
    case 'reset-equipment':
      await resetTestingData({
        equipment: true
      });
      break;
      
    case 'clear-prospects':
      await clearAllProspects();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.log('❌ Unknown command:', command);
      console.log('Run "node testing-utilities.js help" for usage information.');
      process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { resetTestingData, clearAllProspects };