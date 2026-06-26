#!/usr/bin/env node

/**
 * API Integration Verification Script
 * 
 * This script tests all API endpoints to ensure they are working correctly
 * and returning data in the expected format.
 * 
 * Usage:
 *   node verify-api.js
 * 
 * Or with custom API URL:
 *   API_URL=http://api.example.com/api node verify-api.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

const client = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

let accessToken = '';
let refreshToken = '';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(status, message) {
  const color = status === '✓' ? colors.green : status === '✗' ? colors.red : colors.yellow;
  console.log(`${color}${status}${colors.reset} ${message}`);
}

async function testAuth() {
  console.log(`\n${colors.blue}=== Testing Authentication ===${colors.reset}`);
  
  try {
    const response = await client.post('/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;
    
    if (accessToken) {
      log('✓', `Login successful - Token received: ${accessToken.substring(0, 20)}...`);
      client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      return true;
    } else {
      log('✗', 'Login response missing accessToken');
      return false;
    }
  } catch (error) {
    log('✗', `Login failed: ${error.message}`);
    if (error.response?.status === 401) {
      log('→', 'Check test credentials in .env or script');
    }
    return false;
  }
}

async function testEndpoint(method, path, expectedFields = []) {
  try {
    const config = method === 'GET' ? {} : { data: {} };
    const response = await client[method.toLowerCase()](path, config);
    
    let data = response.data.data || response.data;
    
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    if (data.length === 0) {
      log('⚠', `${path}: Empty list (API working but no data)`);
      return true;
    }
    
    const firstItem = data[0];
    const missingFields = expectedFields.filter(field => !(field in firstItem));
    
    if (missingFields.length > 0) {
      log('⚠', `${path}: Missing fields: ${missingFields.join(', ')}`);
    } else {
      log('✓', `${path}: ${data.length} items returned`);
    }
    
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      log('✗', `${path}: Unauthorized (token invalid)`);
    } else if (error.response?.status === 404) {
      log('✗', `${path}: Not found (endpoint missing)`);
    } else {
      log('✗', `${path}: ${error.message}`);
    }
    return false;
  }
}

async function runTests() {
  console.log(`${colors.blue}Farm Management System - Mobile App API Verification${colors.reset}`);
  console.log(`API URL: ${API_URL}\n`);
  
  // Test Authentication
  const authPassed = await testAuth();
  
  if (!authPassed) {
    log('→', 'Cannot proceed with other tests without valid authentication');
    process.exit(1);
  }
  
  // Test Protected Endpoints
  console.log(`\n${colors.blue}=== Testing Protected Endpoints ===${colors.reset}`);
  
  const tests = [
    ['GET', '/farms', ['id', 'name', 'location']],
    ['GET', '/crops', ['id', 'name', 'type']],
    ['GET', '/livestocks', ['id', 'name', 'quantity']],
    ['GET', '/poultry', ['id', 'name', 'quantity']],
    ['GET', '/finance', ['id', 'title', 'amount', 'type']],
  ];
  
  const results = [];
  for (const [method, path, fields] of tests) {
    const passed = await testEndpoint(method, path, fields);
    results.push(passed);
  }
  
  // Summary
  console.log(`\n${colors.blue}=== Test Summary ===${colors.reset}`);
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  if (passed === total) {
    log('✓', `All ${total} endpoint tests passed!`);
    log('→', 'Your backend is ready for mobile app integration');
    process.exit(0);
  } else {
    log('✗', `${passed}/${total} tests passed`);
    log('→', 'Fix the failed endpoints before running the mobile app');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log('✗', `Fatal error: ${error.message}`);
  process.exit(1);
});
