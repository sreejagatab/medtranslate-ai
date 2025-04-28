/**
 * Test script for MedTranslate AI Edge Application
 * 
 * This script tests the edge application by sending translation requests
 * and checking the responses.
 */

const axios = require('axios');
const WebSocket = require('ws');

// Configuration
const EDGE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

// Test translation request
const translationRequest = {
  text: 'Hello, I have a headache and fever. Can you help me?',
  sourceLanguage: 'en',
  targetLanguage: 'es',
  context: 'general'
};

// Test functions
async function testHealthEndpoint() {
  console.log('\n--- Testing Health Endpoint ---');
  try {
    const response = await axios.get(`${EDGE_URL}/health`);
    console.log('Health Status:', response.data);
    return true;
  } catch (error) {
    console.error('Health endpoint error:', error.message);
    return false;
  }
}

async function testLanguagesEndpoint() {
  console.log('\n--- Testing Languages Endpoint ---');
  try {
    const response = await axios.get(`${EDGE_URL}/languages`);
    console.log('Supported Languages:', response.data);
    return true;
  } catch (error) {
    console.error('Languages endpoint error:', error.message);
    return false;
  }
}

async function testTranslationEndpoint() {
  console.log('\n--- Testing Translation Endpoint ---');
  try {
    const response = await axios.post(`${EDGE_URL}/translate`, translationRequest);
    console.log('Translation Result:', response.data);
    return true;
  } catch (error) {
    console.error('Translation endpoint error:', error.message);
    return false;
  }
}

async function testWebSocketConnection() {
  console.log('\n--- Testing WebSocket Connection ---');
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.on('open', () => {
        console.log('WebSocket connection established');
        
        // Send translation request
        ws.send(JSON.stringify({
          type: 'translate',
          requestId: 'test-request-1',
          ...translationRequest
        }));
      });
      
      ws.on('message', (data) => {
        const response = JSON.parse(data);
        console.log('WebSocket response:', response);
        ws.close();
        resolve(true);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        resolve(false);
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          console.error('WebSocket timeout');
          resolve(false);
        }
      }, 5000);
    } catch (error) {
      console.error('WebSocket connection error:', error.message);
      resolve(false);
    }
  });
}

async function testSyncStatusEndpoint() {
  console.log('\n--- Testing Sync Status Endpoint ---');
  try {
    const response = await axios.get(`${EDGE_URL}/sync/status`);
    console.log('Sync Status:', response.data);
    return true;
  } catch (error) {
    console.error('Sync status endpoint error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== MedTranslate AI Edge Application Tests ===');
  
  // Wait for server to start
  console.log('Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run tests
  const healthResult = await testHealthEndpoint();
  const languagesResult = await testLanguagesEndpoint();
  const translationResult = await testTranslationEndpoint();
  const webSocketResult = await testWebSocketConnection();
  const syncStatusResult = await testSyncStatusEndpoint();
  
  // Print summary
  console.log('\n=== Test Results ===');
  console.log('Health Endpoint:', healthResult ? 'PASS' : 'FAIL');
  console.log('Languages Endpoint:', languagesResult ? 'PASS' : 'FAIL');
  console.log('Translation Endpoint:', translationResult ? 'PASS' : 'FAIL');
  console.log('WebSocket Connection:', webSocketResult ? 'PASS' : 'FAIL');
  console.log('Sync Status Endpoint:', syncStatusResult ? 'PASS' : 'FAIL');
  
  const overallResult = healthResult && languagesResult && translationResult && webSocketResult && syncStatusResult;
  console.log('\nOverall Result:', overallResult ? 'PASS' : 'FAIL');
  
  process.exit(overallResult ? 0 : 1);
}

// Run tests
runTests();
