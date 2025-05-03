/**
 * WebSocket Reconnection Tests for MedTranslate AI
 * 
 * This test suite verifies the WebSocket reconnection handling
 * under various network conditions.
 */

const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const CONFIG = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  wsUrl: process.env.WS_URL || 'ws://localhost:3001',
  testTimeout: 60000, // 60 seconds
  reconnectTestDuration: 30000, // 30 seconds
};

// Test state
const state = {
  providerToken: null,
  patientToken: null,
  sessionId: null,
  sessionCode: null,
  wsClient: null,
  messageLog: [],
  reconnections: 0,
};

/**
 * Helper function for API requests
 * 
 * @param {string} url - API URL
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Response
 */
async function apiRequest(url, options = {}) {
  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      data: options.data || undefined,
      timeout: options.timeout || 5000,
    });
    
    return {
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    return {
      status: error.response ? error.response.status : 500,
      data: error.response ? error.response.data : { error: error.message },
    };
  }
}

/**
 * Create a test session
 * 
 * @returns {Promise<boolean>} - Success
 */
async function createTestSession() {
  console.log('\n=== Creating Test Session ===');
  
  // Get provider token
  const loginResponse = await apiRequest(`${CONFIG.backendUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      email: 'test-provider@medtranslate.ai',
      password: 'Test123!',
    },
  });
  
  if (loginResponse.status !== 200 || !loginResponse.data.token) {
    console.error('❌ Provider login failed:', loginResponse.data);
    return false;
  }
  
  state.providerToken = loginResponse.data.token;
  console.log('✅ Provider login successful');
  
  // Create session
  const sessionResponse = await apiRequest(`${CONFIG.backendUrl}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.providerToken}`,
    },
    data: {
      medicalContext: 'General Consultation',
      patientLanguage: 'es',
    },
  });
  
  if (sessionResponse.status !== 200 || !sessionResponse.data.sessionId) {
    console.error('❌ Session creation failed:', sessionResponse.data);
    return false;
  }
  
  state.sessionId = sessionResponse.data.sessionId;
  state.sessionCode = sessionResponse.data.sessionCode;
  console.log('✅ Session creation successful');
  
  // Get patient token
  const patientTokenResponse = await apiRequest(`${CONFIG.backendUrl}/sessions/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      sessionCode: state.sessionCode,
    },
  });
  
  if (patientTokenResponse.status !== 200 || !patientTokenResponse.data.token) {
    console.error('❌ Patient token generation failed:', patientTokenResponse.data);
    return false;
  }
  
  state.patientToken = patientTokenResponse.data.token;
  console.log('✅ Patient token generation successful');
  
  return true;
}

/**
 * Connect to WebSocket server
 * 
 * @param {string} token - Authentication token
 * @returns {Promise<WebSocket>} - WebSocket client
 */
function connectWebSocket(token) {
  return new Promise((resolve, reject) => {
    const wsUrl = `${CONFIG.wsUrl}/sessions/${state.sessionId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    
    // Set up event handlers
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      resolve(ws);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
    
    // Set connection timeout
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, 5000);
    
    // Clear timeout on open
    ws.on('open', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Test basic WebSocket connection
 * 
 * @returns {Promise<boolean>} - Success
 */
async function testBasicConnection() {
  console.log('\n=== Testing Basic WebSocket Connection ===');
  
  try {
    // Connect as provider
    state.wsClient = await connectWebSocket(state.providerToken);
    
    // Set up message handler
    state.wsClient.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        state.messageLog.push({
          timestamp: Date.now(),
          message,
        });
        console.log(`📩 Received message: ${message.type}`);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    // Send test message
    const testMessage = {
      type: 'test',
      id: uuidv4(),
      content: 'Test message',
      timestamp: Date.now(),
    };
    
    state.wsClient.send(JSON.stringify(testMessage));
    console.log('📤 Sent test message');
    
    // Wait for a moment to receive any responses
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error('❌ Basic connection test failed:', error.message);
    return false;
  }
}

/**
 * Test WebSocket reconnection
 * 
 * @returns {Promise<boolean>} - Success
 */
async function testReconnection() {
  console.log('\n=== Testing WebSocket Reconnection ===');
  
  // Set up reconnection tracking
  state.reconnections = 0;
  
  // Create a new WebSocket client with reconnection logic
  const createReconnectingClient = () => {
    const wsUrl = `${CONFIG.wsUrl}/sessions/${state.sessionId}?token=${state.providerToken}`;
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected/reconnected');
      
      // Send a message to confirm connection
      const message = {
        type: 'test',
        id: uuidv4(),
        content: `Reconnection test message ${state.reconnections}`,
        timestamp: Date.now(),
      };
      
      ws.send(JSON.stringify(message));
    });
    
    ws.on('close', () => {
      console.log('❌ WebSocket disconnected, attempting to reconnect...');
      state.reconnections++;
      
      // Reconnect after a delay
      setTimeout(() => {
        if (state.testRunning) {
          state.wsClient = createReconnectingClient();
        }
      }, 1000);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        state.messageLog.push({
          timestamp: Date.now(),
          message,
        });
        console.log(`📩 Received message: ${message.type}`);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    return ws;
  };
  
  try {
    // Start the test
    state.testRunning = true;
    state.wsClient = createReconnectingClient();
    
    // Simulate network interruptions
    for (let i = 0; i < 3; i++) {
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Force disconnect
      console.log(`🔌 Forcing disconnect #${i + 1}...`);
      if (state.wsClient.readyState === WebSocket.OPEN) {
        state.wsClient.terminate();
      }
    }
    
    // Let the test run for a while to observe reconnection behavior
    await new Promise(resolve => setTimeout(resolve, CONFIG.reconnectTestDuration));
    
    // End the test
    state.testRunning = false;
    
    // Check results
    console.log(`\n=== Reconnection Test Results ===`);
    console.log(`Total reconnections: ${state.reconnections}`);
    console.log(`Total messages received: ${state.messageLog.length}`);
    
    return state.reconnections > 0;
  } catch (error) {
    console.error('❌ Reconnection test failed:', error.message);
    state.testRunning = false;
    return false;
  }
}

/**
 * Test message delivery during reconnection
 * 
 * @returns {Promise<boolean>} - Success
 */
async function testMessageDeliveryDuringReconnection() {
  console.log('\n=== Testing Message Delivery During Reconnection ===');
  
  // Set up message tracking
  const sentMessages = [];
  const receivedMessageIds = new Set();
  
  // Create a new WebSocket client with reconnection logic
  const createReconnectingClient = () => {
    const wsUrl = `${CONFIG.wsUrl}/sessions/${state.sessionId}?token=${state.providerToken}`;
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected/reconnected');
    });
    
    ws.on('close', () => {
      console.log('❌ WebSocket disconnected, attempting to reconnect...');
      
      // Reconnect after a delay
      setTimeout(() => {
        if (state.testRunning) {
          state.wsClient = createReconnectingClient();
        }
      }, 1000);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        // Track received message IDs
        if (message.id && message.type === 'echo_response') {
          receivedMessageIds.add(message.originalId);
          console.log(`📩 Received echo response for message: ${message.originalId}`);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    return ws;
  };
  
  try {
    // Start the test
    state.testRunning = true;
    state.wsClient = createReconnectingClient();
    
    // Wait for initial connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send messages continuously, even during disconnections
    const sendInterval = setInterval(() => {
      if (state.testRunning) {
        const messageId = uuidv4();
        const message = {
          type: 'echo',
          id: messageId,
          content: `Message delivery test ${sentMessages.length + 1}`,
          timestamp: Date.now(),
        };
        
        sentMessages.push(messageId);
        
        // Try to send if connected
        if (state.wsClient && state.wsClient.readyState === WebSocket.OPEN) {
          state.wsClient.send(JSON.stringify(message));
          console.log(`📤 Sent message: ${messageId}`);
        } else {
          console.log(`📝 Queued message (not connected): ${messageId}`);
        }
      }
    }, 1000);
    
    // Simulate network interruptions
    for (let i = 0; i < 3; i++) {
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Force disconnect
      console.log(`🔌 Forcing disconnect #${i + 1}...`);
      if (state.wsClient.readyState === WebSocket.OPEN) {
        state.wsClient.terminate();
      }
      
      // Wait during disconnection
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Let the test run for a while to observe message delivery
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // End the test
    state.testRunning = false;
    clearInterval(sendInterval);
    
    // Close the WebSocket
    if (state.wsClient && state.wsClient.readyState === WebSocket.OPEN) {
      state.wsClient.close();
    }
    
    // Check results
    console.log(`\n=== Message Delivery Test Results ===`);
    console.log(`Total messages sent: ${sentMessages.length}`);
    console.log(`Total messages received: ${receivedMessageIds.size}`);
    
    const deliveryRate = (receivedMessageIds.size / sentMessages.length) * 100;
    console.log(`Message delivery rate: ${deliveryRate.toFixed(2)}%`);
    
    return deliveryRate > 50; // At least 50% of messages should be delivered
  } catch (error) {
    console.error('❌ Message delivery test failed:', error.message);
    state.testRunning = false;
    return false;
  }
}

/**
 * Clean up test resources
 */
async function cleanup() {
  console.log('\n=== Cleaning Up ===');
  
  // Close WebSocket connection
  if (state.wsClient) {
    state.wsClient.close();
  }
  
  // End session
  if (state.sessionId && state.providerToken) {
    const response = await apiRequest(`${CONFIG.backendUrl}/sessions/${state.sessionId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.providerToken}`,
      },
    });
    
    if (response.status === 200) {
      console.log('✅ Session ended successfully');
    } else {
      console.error('❌ Failed to end session:', response.data);
    }
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== WebSocket Reconnection Tests ===');
  console.log(`Backend URL: ${CONFIG.backendUrl}`);
  console.log(`WebSocket URL: ${CONFIG.wsUrl}`);
  console.log('Starting tests...\n');
  
  try {
    // Set up test timeout
    const testTimeout = setTimeout(() => {
      console.error('❌ Tests timed out');
      process.exit(1);
    }, CONFIG.testTimeout);
    
    // Create test session
    const sessionCreated = await createTestSession();
    if (!sessionCreated) {
      console.error('❌ Failed to create test session');
      process.exit(1);
    }
    
    // Run tests
    const basicConnectionSuccess = await testBasicConnection();
    const reconnectionSuccess = await testReconnection();
    const messageDeliverySuccess = await testMessageDeliveryDuringReconnection();
    
    // Clean up
    await cleanup();
    
    // Print results
    console.log('\n=== Test Results ===');
    console.log(`Basic Connection: ${basicConnectionSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Reconnection: ${reconnectionSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Message Delivery: ${messageDeliverySuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    // Overall result
    const overallSuccess = basicConnectionSuccess && reconnectionSuccess && messageDeliverySuccess;
    console.log(`\nOverall Result: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    // Clear timeout
    clearTimeout(testTimeout);
    
    // Exit with appropriate code
    process.exit(overallSuccess ? 0 : 1);
  } catch (error) {
    console.error('❌ Unhandled error:', error);
    await cleanup();
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testBasicConnection,
  testReconnection,
  testMessageDeliveryDuringReconnection,
};
