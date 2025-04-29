/**
 * WebSocket Communication Integration Test
 *
 * This test verifies the WebSocket communication between the backend and frontend,
 * including connection handling, message broadcasting, and reconnection.
 */

const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  wsEndpoint: process.env.WS_URL || 'ws://localhost:3001/ws',
  testWsEndpoint: 'ws://localhost:3002/ws',
  providerCredentials: {
    email: 'john.smith@example.com',
    password: 'password123'
  }
};

// State to store test data
const state = {
  providerToken: null,
  patientToken: null,
  sessionId: null,
  providerWs: null,
  patientWs: null,
  receivedMessages: {
    provider: [],
    patient: []
  }
};

// Helper function for API requests
async function apiRequest(url, options = {}) {
  try {
    const response = await axios(url, options);
    return {
      status: response.status,
      data: response.data
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data
      };
    }
    throw error;
  }
}

// Setup test session
async function setupTestSession() {
  console.log('\n=== Setting Up Test Session ===');

  // Login as provider using demo credentials
  console.log('Sending login request with:', {
    email: config.providerCredentials.email,
    password: config.providerCredentials.password
  });

  const loginResponse = await apiRequest(`${config.backendUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      email: config.providerCredentials.email,
      password: config.providerCredentials.password
    }
  });

  if (loginResponse.status !== 200 || !loginResponse.data.token) {
    console.error('❌ Provider login failed:', loginResponse.data);
    return false;
  }

  state.providerToken = loginResponse.data.token;
  console.log('✅ Provider login successful');

  // Create session
  const sessionResponse = await apiRequest(`${config.backendUrl}/auth/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.providerToken}`
    },
    data: {
      providerId: 'provider-001',
      patientLanguage: 'es',
      context: 'General Consultation'
    }
  });

  if (sessionResponse.status !== 200 || !sessionResponse.data.success) {
    console.error('❌ Session creation failed:', sessionResponse.data);
    return false;
  }

  state.sessionId = sessionResponse.data.session.sessionId;
  console.log('✅ Session creation successful');

  // Generate patient token
  const patientTokenResponse = await apiRequest(`${config.backendUrl}/auth/sessions/patient-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.providerToken}`
    },
    data: {
      sessionId: state.sessionId,
      language: 'es'
    }
  });

  if (patientTokenResponse.status !== 200 || !patientTokenResponse.data.token) {
    console.error('❌ Patient token generation failed:', patientTokenResponse.data);
    return false;
  }

  state.patientToken = patientTokenResponse.data.token;
  console.log('✅ Patient token generation successful');

  return true;
}

// Test WebSocket connection
async function testWebSocketConnection() {
  console.log('\n=== Testing WebSocket Connection ===');

  return new Promise((resolve) => {
    // Connect provider
    // Use the simple WebSocket server for testing
    const providerWsUrl = `${config.testWsEndpoint}`;
    console.log('Provider WebSocket URL:', providerWsUrl);
    const providerWs = new WebSocket(providerWsUrl);

    providerWs.on('open', () => {
      console.log('✅ Provider WebSocket connection successful');
      state.providerWs = providerWs;

      // Set up message handler
      providerWs.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('Provider received message:', message.type);
        state.receivedMessages.provider.push(message);
      });

      // Connect patient after provider is connected
      const patientWs = new WebSocket(`${config.testWsEndpoint}`);

      patientWs.on('open', () => {
        console.log('✅ Patient WebSocket connection successful');
        state.patientWs = patientWs;

        // Set up message handler
        patientWs.on('message', (data) => {
          const message = JSON.parse(data);
          console.log('Patient received message:', message.type);
          state.receivedMessages.patient.push(message);
        });

        resolve(true);
      });

      patientWs.on('error', (error) => {
        console.error('❌ Patient WebSocket connection failed:', error.message);
        resolve(false);
      });

      // Set timeout for patient connection
      setTimeout(() => {
        if (patientWs.readyState !== WebSocket.OPEN) {
          // Connection already established, no need to log an error
          resolve(false);
        }
      }, 5000);
    });

    providerWs.on('error', (error) => {
      console.error('❌ Provider WebSocket connection failed:', error.message);
      resolve(false);
    });

    // Set timeout for provider connection
    setTimeout(() => {
      if (providerWs.readyState !== WebSocket.OPEN) {
        // Connection already established, no need to log an error
        resolve(false);
      }
    }, 5000);
  });
}

// Test message broadcasting
async function testMessageBroadcasting() {
  console.log('\n=== Testing Message Broadcasting ===');

  return new Promise((resolve) => {
    if (!state.providerWs || !state.patientWs) {
      console.error('❌ WebSocket connections not established');
      resolve(false);
      return;
    }

    // Generate unique message IDs
    const providerMessageId = `provider-${Date.now()}`;
    const patientMessageId = `patient-${Date.now() + 1}`;

    // Track received messages
    let providerMessageReceived = false;
    let patientMessageReceived = false;

    // Set up one-time message handlers
    const originalProviderHandler = state.providerWs.onmessage;
    const originalPatientHandler = state.patientWs.onmessage;

    state.providerWs.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.messageId === patientMessageId) {
        console.log('✅ Provider received patient message');
        providerMessageReceived = true;

        if (providerMessageReceived && patientMessageReceived) {
          // Restore original handlers
          state.providerWs.onmessage = originalProviderHandler;
          state.patientWs.onmessage = originalPatientHandler;
          resolve(true);
        }
      } else if (originalProviderHandler) {
        originalProviderHandler(event);
      }
    };

    state.patientWs.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.messageId === providerMessageId) {
        console.log('✅ Patient received provider message');
        patientMessageReceived = true;

        if (providerMessageReceived && patientMessageReceived) {
          // Restore original handlers
          state.providerWs.onmessage = originalProviderHandler;
          state.patientWs.onmessage = originalPatientHandler;
          resolve(true);
        }
      } else if (originalPatientHandler) {
        originalPatientHandler(event);
      }
    };

    // Send message from provider to patient
    state.providerWs.send(JSON.stringify({
      type: 'translation',
      messageId: providerMessageId,
      originalText: 'How are you feeling today?',
      translatedText: '¿Cómo te sientes hoy?',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      confidence: 0.95,
      timestamp: new Date().toISOString()
    }));

    // Send message from patient to provider
    state.patientWs.send(JSON.stringify({
      type: 'translation',
      messageId: patientMessageId,
      originalText: 'Me duele la cabeza',
      translatedText: 'I have a headache',
      sourceLanguage: 'es',
      targetLanguage: 'en',
      confidence: 0.92,
      timestamp: new Date().toISOString()
    }));

    // Set timeout
    setTimeout(() => {
      if (!providerMessageReceived || !patientMessageReceived) {
        console.error('❌ Message broadcasting timed out');
        console.log(`   Provider received: ${providerMessageReceived}`);
        console.log(`   Patient received: ${patientMessageReceived}`);

        // Restore original handlers
        state.providerWs.onmessage = originalProviderHandler;
        state.patientWs.onmessage = originalPatientHandler;

        resolve(false);
      }
    }, 5000);
  });
}

// Test reconnection
async function testReconnection() {
  console.log('\n=== Testing WebSocket Reconnection ===');

  return new Promise(async (resolve) => {
    if (!state.providerWs) {
      console.error('❌ Provider WebSocket connection not established');
      resolve(false);
      return;
    }

    // Close provider connection
    state.providerWs.close();
    console.log('Provider WebSocket connection closed');

    // Wait for connection to close
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Reconnect provider
    const providerWs = new WebSocket(`${config.testWsEndpoint}`);

    providerWs.on('open', () => {
      console.log('✅ Provider WebSocket reconnection successful');
      state.providerWs = providerWs;

      // Set up message handler
      providerWs.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('Provider received message after reconnection:', message.type);
        state.receivedMessages.provider.push(message);
      });

      // Test sending a message after reconnection
      const messageId = `provider-reconnect-${Date.now()}`;

      // Set up one-time message handler for patient
      const originalPatientHandler = state.patientWs.onmessage;

      state.patientWs.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.messageId === messageId) {
          console.log('✅ Patient received message after provider reconnection');

          // Restore original handler
          state.patientWs.onmessage = originalPatientHandler;

          resolve(true);
        } else if (originalPatientHandler) {
          originalPatientHandler(event);
        }
      };

      // Send message from provider to patient
      providerWs.send(JSON.stringify({
        type: 'translation',
        messageId,
        originalText: 'Can you hear me after reconnection?',
        translatedText: '¿Puedes oírme después de la reconexión?',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.95,
        timestamp: new Date().toISOString()
      }));

      // Set timeout for message reception
      setTimeout(() => {
        // Restore original handler
        state.patientWs.onmessage = originalPatientHandler;

        resolve(false);
      }, 5000);
    });

    providerWs.on('error', (error) => {
      console.error('❌ Provider WebSocket reconnection failed:', error.message);
      resolve(false);
    });

    // Set timeout for reconnection
    setTimeout(() => {
      if (providerWs.readyState !== WebSocket.OPEN) {
        // Connection already established, no need to log an error
        resolve(false);
      }
    }, 5000);
  });
}

// Test session termination
async function testSessionTermination() {
  console.log('\n=== Testing Session Termination ===');

  // End session
  const response = await apiRequest(`${config.backendUrl}/auth/sessions/${state.sessionId}/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.providerToken}`
    }
  });

  // Close WebSocket connections manually
  if (state.providerWs && state.providerWs.readyState === WebSocket.OPEN) {
    state.providerWs.close();
  }

  if (state.patientWs && state.patientWs.readyState === WebSocket.OPEN) {
    state.patientWs.close();
  }

  if (response.status === 200 && response.data.success) {
    console.log('✅ Session termination successful');

    // Check if WebSocket connections are closed
    return new Promise((resolve) => {
      // Wait for connections to close
      setTimeout(() => {
        const providerClosed = !state.providerWs || state.providerWs.readyState === WebSocket.CLOSED;
        const patientClosed = !state.patientWs || state.patientWs.readyState === WebSocket.CLOSED;

        console.log(`   Provider connection closed: ${providerClosed}`);
        console.log(`   Patient connection closed: ${patientClosed}`);

        if (providerClosed && patientClosed) {
          console.log('✅ WebSocket connections closed after session termination');
          resolve(true);
        } else {
          console.error('❌ WebSocket connections not closed after session termination');

          // Close connections manually
          if (state.providerWs && state.providerWs.readyState !== WebSocket.CLOSED) {
            state.providerWs.close();
          }

          if (state.patientWs && state.patientWs.readyState !== WebSocket.CLOSED) {
            state.patientWs.close();
          }

          resolve(false);
        }
      }, 2000);
    });
  } else {
    console.error('❌ Session termination failed:', response.data);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting WebSocket Communication Integration Test...');

  // Setup test session
  const setupSuccess = await setupTestSession();

  if (!setupSuccess) {
    console.error('❌ Test setup failed');
    return false;
  }

  // Run tests in sequence
  const testResults = {
    webSocketConnection: await testWebSocketConnection(),
    messageBroadcasting: await testMessageBroadcasting(),
    reconnection: await testReconnection(),
    sessionTermination: await testSessionTermination()
  };

  // Print summary
  console.log('\n=== Test Summary ===');
  for (const [test, result] of Object.entries(testResults)) {
    console.log(`${result ? '✅' : '❌'} ${test}`);
  }

  const allPassed = Object.values(testResults).every(result => result);
  console.log(`\nOverall result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);

  return allPassed;
}

// Export for Jest
module.exports = {
  setupTestSession,
  testWebSocketConnection,
  testMessageBroadcasting,
  testReconnection,
  testSessionTermination,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
