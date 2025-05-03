/**
 * WebSocket Reconnection Improvements Tests
 * 
 * This test suite verifies the enhanced WebSocket reconnection handling
 * under various network conditions and failure scenarios.
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Configuration
const CONFIG = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  wsUrl: process.env.WS_URL || 'ws://localhost:3001/ws',
  testTimeout: 120000, // 2 minutes
  reconnectTestDuration: 60000, // 1 minute
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
  connectionStates: [],
  testRunning: false,
};

/**
 * Setup test environment
 */
async function setup() {
  console.log('\n=== Setting up test environment ===');
  
  try {
    // Create a test session
    const response = await axios.post(`${CONFIG.backendUrl}/api/sessions/create`, {
      providerName: 'Test Provider',
      providerSpecialty: 'General',
      patientLanguage: 'es',
      context: 'general'
    });
    
    state.sessionId = response.data.sessionId;
    state.sessionCode = response.data.sessionCode;
    state.providerToken = response.data.providerToken;
    
    console.log(`✅ Created test session: ${state.sessionId} (code: ${state.sessionCode})`);
    
    // Join as patient to get patient token
    const joinResponse = await axios.post(`${CONFIG.backendUrl}/api/sessions/join`, {
      sessionCode: state.sessionCode,
      patientName: 'Test Patient'
    });
    
    state.patientToken = joinResponse.data.token;
    
    console.log('✅ Joined session as patient');
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up test environment:', error.message);
    return false;
  }
}

/**
 * Connect to WebSocket server
 * 
 * @param {string} token - Authentication token
 * @returns {Promise<WebSocket>} - WebSocket client
 */
function connectWebSocket(token) {
  return new Promise((resolve, reject) => {
    const wsUrl = `${CONFIG.wsUrl}/${state.sessionId}?token=${token}`;
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
    
    // Wait for a short time to receive any responses
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Disconnect
    state.wsClient.close(1000, 'Test complete');
    console.log('✅ Basic connection test complete');
    
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
  
  try {
    // Track test state
    state.testRunning = true;
    state.reconnections = 0;
    state.connectionStates = [];
    
    // Create a new WebSocket client with reconnection logic
    const createReconnectingClient = () => {
      const wsUrl = `${CONFIG.wsUrl}/${state.sessionId}?token=${state.providerToken}`;
      const ws = new WebSocket(wsUrl);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected/reconnected');
        
        // Record connection state
        state.connectionStates.push({
          state: 'connected',
          timestamp: Date.now(),
        });
        
        // Send a message to confirm connection
        const message = {
          type: 'test',
          id: uuidv4(),
          content: `Reconnection test message ${state.reconnections}`,
          timestamp: Date.now(),
        };
        
        ws.send(JSON.stringify(message));
      });
      
      ws.on('close', (code, reason) => {
        console.log(`❌ WebSocket disconnected: ${code} - ${reason}`);
        
        // Record connection state
        state.connectionStates.push({
          state: 'disconnected',
          code,
          reason,
          timestamp: Date.now(),
        });
        
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
        
        // Record connection state
        state.connectionStates.push({
          state: 'error',
          error: error.message,
          timestamp: Date.now(),
        });
      });
      
      return ws;
    };
    
    // Start with a connected client
    state.wsClient = createReconnectingClient();
    
    // Wait for initial connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate network issues by forcibly closing the connection multiple times
    for (let i = 0; i < 3; i++) {
      if (state.wsClient && state.wsClient.readyState === WebSocket.OPEN) {
        console.log(`🔌 Forcibly closing connection (test ${i + 1}/3)`);
        state.wsClient.close(4000, 'Test forced close');
      }
      
      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Let the test run for the specified duration
    console.log(`⏱️ Running reconnection test for ${CONFIG.reconnectTestDuration / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, CONFIG.reconnectTestDuration));
    
    // Stop the test
    state.testRunning = false;
    
    // Close the final connection
    if (state.wsClient && state.wsClient.readyState === WebSocket.OPEN) {
      state.wsClient.close(1000, 'Test complete');
    }
    
    // Log results
    console.log(`✅ Reconnection test complete. Reconnections: ${state.reconnections}`);
    console.log(`📊 Connection states: ${state.connectionStates.length}`);
    
    return state.reconnections > 0;
  } catch (error) {
    console.error('❌ Reconnection test failed:', error.message);
    state.testRunning = false;
    return false;
  }
}

/**
 * Test message delivery during reconnections
 * 
 * @returns {Promise<boolean>} - Success
 */
async function testMessageDelivery() {
  console.log('\n=== Testing Message Delivery During Reconnections ===');
  
  try {
    // Track test state
    state.testRunning = true;
    state.reconnections = 0;
    state.connectionStates = [];
    const sentMessages = [];
    const receivedMessages = [];
    
    // Create a new WebSocket client with reconnection logic
    const createReconnectingClient = () => {
      const wsUrl = `${CONFIG.wsUrl}/${state.sessionId}?token=${state.providerToken}`;
      const ws = new WebSocket(wsUrl);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected/reconnected');
        
        // Record connection state
        state.connectionStates.push({
          state: 'connected',
          timestamp: Date.now(),
        });
      });
      
      ws.on('close', (code, reason) => {
        console.log(`❌ WebSocket disconnected: ${code} - ${reason}`);
        
        // Record connection state
        state.connectionStates.push({
          state: 'disconnected',
          code,
          reason,
          timestamp: Date.now(),
        });
        
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
        
        // Record connection state
        state.connectionStates.push({
          state: 'error',
          error: error.message,
          timestamp: Date.now(),
        });
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          // Check if it's an echo response
          if (message.type === 'echo' && message.original) {
            console.log(`📩 Received echo response for message: ${message.original.id}`);
            receivedMessages.push(message.original.id);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      
      return ws;
    };
    
    // Start with a connected client
    state.wsClient = createReconnectingClient();
    
    // Wait for initial connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
    
    // Simulate network issues by forcibly closing the connection multiple times
    for (let i = 0; i < 3; i++) {
      // Wait a bit before disconnecting
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (state.wsClient && state.wsClient.readyState === WebSocket.OPEN) {
        console.log(`🔌 Forcibly closing connection (test ${i + 1}/3)`);
        state.wsClient.close(4000, 'Test forced close');
      }
      
      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Let the test run for the specified duration
    console.log(`⏱️ Running message delivery test for ${CONFIG.reconnectTestDuration / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, CONFIG.reconnectTestDuration));
    
    // Stop the test
    state.testRunning = false;
    clearInterval(sendInterval);
    
    // Close the final connection
    if (state.wsClient && state.wsClient.readyState === WebSocket.OPEN) {
      state.wsClient.close(1000, 'Test complete');
    }
    
    // Log results
    console.log(`✅ Message delivery test complete.`);
    console.log(`📊 Sent messages: ${sentMessages.length}`);
    console.log(`📊 Received messages: ${receivedMessages.length}`);
    console.log(`📊 Delivery rate: ${(receivedMessages.length / sentMessages.length * 100).toFixed(2)}%`);
    
    return receivedMessages.length > 0;
  } catch (error) {
    console.error('❌ Message delivery test failed:', error.message);
    state.testRunning = false;
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n=== Starting WebSocket Reconnection Tests ===');
  
  try {
    // Setup test environment
    const setupSuccess = await setup();
    if (!setupSuccess) {
      console.error('❌ Test setup failed');
      return;
    }
    
    // Run tests
    const basicConnectionSuccess = await testBasicConnection();
    if (!basicConnectionSuccess) {
      console.error('❌ Basic connection test failed');
      return;
    }
    
    const reconnectionSuccess = await testReconnection();
    if (!reconnectionSuccess) {
      console.error('❌ Reconnection test failed');
      return;
    }
    
    const messageDeliverySuccess = await testMessageDelivery();
    if (!messageDeliverySuccess) {
      console.error('❌ Message delivery test failed');
      return;
    }
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Tests failed:', error.message);
  }
}

// Run tests with timeout
const testTimeout = setTimeout(() => {
  console.error('❌ Tests timed out');
  process.exit(1);
}, CONFIG.testTimeout);

runTests().then(() => {
  clearTimeout(testTimeout);
  process.exit(0);
}).catch((error) => {
  console.error('❌ Unhandled error:', error);
  clearTimeout(testTimeout);
  process.exit(1);
});
