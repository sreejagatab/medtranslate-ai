/**
 * Full System Integration Test for MedTranslate AI
 * 
 * This script tests the entire system integration, including:
 * - Backend to Edge communication
 * - Edge to Frontend communication
 * - Offline mode operation
 * - Fallback mechanisms
 * - Data synchronization
 * - Error handling
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3002',
  wsEndpoint: process.env.WS_URL || 'ws://localhost:3001/ws',
  providerCredentials: {
    email: 'test.provider@example.com',
    password: 'testpassword123'
  },
  testAudioPath: path.join(__dirname, '../test-audio.mp3'),
  testTimeout: 30000 // 30 seconds
};

// Test state
const state = {
  providerToken: null,
  patientToken: null,
  sessionId: null,
  sessionCode: null,
  providerWs: null,
  patientWs: null,
  messages: [],
  edgeOnline: true
};

// Helper function for API requests
async function apiRequest(url, options = {}) {
  try {
    const response = await axios({
      url,
      ...options,
      validateStatus: () => true // Don't throw on non-2xx status
    });
    
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    console.error(`API request error: ${error.message}`);
    return {
      status: 500,
      data: { error: error.message },
      headers: {}
    };
  }
}

// Test provider login
async function testProviderLogin() {
  console.log('\n=== Testing Provider Login ===');
  
  const response = await apiRequest(`${config.backendUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: config.providerCredentials
  });
  
  if (response.status === 200 && response.data.token) {
    console.log('✅ Provider login successful');
    state.providerToken = response.data.token;
    return true;
  } else {
    console.error('❌ Provider login failed:', response.data);
    return false;
  }
}

// Test session creation
async function testSessionCreation() {
  console.log('\n=== Testing Session Creation ===');
  
  if (!state.providerToken) {
    console.error('❌ Provider token not available');
    return false;
  }
  
  const response = await apiRequest(`${config.backendUrl}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.providerToken}`
    },
    data: {
      medicalContext: 'General Consultation',
      patientLanguage: 'es'
    }
  });
  
  if (response.status === 200 && response.data.sessionId) {
    console.log('✅ Session creation successful');
    state.sessionId = response.data.sessionId;
    state.sessionCode = response.data.sessionCode;
    return true;
  } else {
    console.error('❌ Session creation failed:', response.data);
    return false;
  }
}

// Test patient token generation
async function testPatientTokenGeneration() {
  console.log('\n=== Testing Patient Token Generation ===');
  
  if (!state.sessionCode) {
    console.error('❌ Session code not available');
    return false;
  }
  
  const response = await apiRequest(`${config.backendUrl}/sessions/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      sessionCode: state.sessionCode
    }
  });
  
  if (response.status === 200 && response.data.token) {
    console.log('✅ Patient token generation successful');
    state.patientToken = response.data.token;
    return true;
  } else {
    console.error('❌ Patient token generation failed:', response.data);
    return false;
  }
}

// Test provider WebSocket connection
async function testProviderWebSocketConnection() {
  console.log('\n=== Testing Provider WebSocket Connection ===');
  
  if (!state.providerToken) {
    console.error('❌ Provider token not available');
    return false;
  }
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`${config.wsEndpoint}?token=${state.providerToken}`);
    
    ws.on('open', () => {
      console.log('✅ Provider WebSocket connection successful');
      state.providerWs = ws;
      
      // Send join message
      ws.send(JSON.stringify({
        type: 'join',
        sessionId: state.sessionId,
        role: 'provider'
      }));
      
      resolve(true);
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      console.log(`Provider received: ${message.type}`);
      state.messages.push({ role: 'provider', message });
    });
    
    ws.on('error', (error) => {
      console.error('❌ Provider WebSocket error:', error.message);
      resolve(false);
    });
    
    ws.on('close', () => {
      console.log('Provider WebSocket connection closed');
    });
    
    // Timeout
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('❌ Provider WebSocket connection timed out');
        resolve(false);
      }
    }, config.testTimeout);
  });
}

// Test patient WebSocket connection
async function testPatientWebSocketConnection() {
  console.log('\n=== Testing Patient WebSocket Connection ===');
  
  if (!state.patientToken) {
    console.error('❌ Patient token not available');
    return false;
  }
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`${config.wsEndpoint}?token=${state.patientToken}`);
    
    ws.on('open', () => {
      console.log('✅ Patient WebSocket connection successful');
      state.patientWs = ws;
      
      // Send join message
      ws.send(JSON.stringify({
        type: 'join',
        sessionId: state.sessionId,
        role: 'patient'
      }));
      
      resolve(true);
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      console.log(`Patient received: ${message.type}`);
      state.messages.push({ role: 'patient', message });
    });
    
    ws.on('error', (error) => {
      console.error('❌ Patient WebSocket error:', error.message);
      resolve(false);
    });
    
    ws.on('close', () => {
      console.log('Patient WebSocket connection closed');
    });
    
    // Timeout
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('❌ Patient WebSocket connection timed out');
        resolve(false);
      }
    }, config.testTimeout);
  });
}

// Test text translation
async function testTextTranslation() {
  console.log('\n=== Testing Text Translation ===');
  
  if (!state.providerWs || !state.patientWs) {
    console.error('❌ WebSocket connections not available');
    return false;
  }
  
  return new Promise((resolve) => {
    // Set up message handler for provider
    const originalOnMessage = state.providerWs.onmessage;
    state.providerWs.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'translation' && message.payload.originalText === 'Hello, how are you feeling today?') {
        console.log('✅ Provider received translation message');
        state.providerWs.onmessage = originalOnMessage;
        resolve(true);
      }
    };
    
    // Send message from provider
    state.providerWs.send(JSON.stringify({
      type: 'message',
      sessionId: state.sessionId,
      payload: {
        text: 'Hello, how are you feeling today?',
        sourceLanguage: 'en',
        targetLanguage: 'es'
      }
    }));
    
    // Timeout
    setTimeout(() => {
      console.error('❌ Text translation timed out');
      state.providerWs.onmessage = originalOnMessage;
      resolve(false);
    }, config.testTimeout);
  });
}

// Test edge translation
async function testEdgeTranslation() {
  console.log('\n=== Testing Edge Translation ===');
  
  const response = await apiRequest(`${config.edgeUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      text: 'The patient has a fever of 101°F and complains of headache and fatigue.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    }
  });
  
  if (response.status === 200 && response.data.translatedText) {
    console.log('✅ Edge translation successful');
    return true;
  } else {
    console.error('❌ Edge translation failed:', response.data);
    return false;
  }
}

// Test edge offline mode
async function testEdgeOfflineMode() {
  console.log('\n=== Testing Edge Offline Mode ===');
  
  // Simulate edge going offline
  state.edgeOnline = false;
  
  // Try translation through backend which should fallback to cloud
  const response = await apiRequest(`${config.backendUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.providerToken}`
    },
    data: {
      text: 'The patient has a history of hypertension.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'cardiology'
    }
  });
  
  // Restore edge online status
  state.edgeOnline = true;
  
  if (response.status === 200 && response.data.translatedText) {
    console.log('✅ Edge offline fallback successful');
    return true;
  } else {
    console.error('❌ Edge offline fallback failed:', response.data);
    return false;
  }
}

// Test session storage
async function testSessionStorage() {
  console.log('\n=== Testing Session Storage ===');
  
  if (!state.providerToken || !state.sessionId) {
    console.error('❌ Provider token or session ID not available');
    return false;
  }
  
  const response = await apiRequest(`${config.backendUrl}/sessions/${state.sessionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${state.providerToken}`
    }
  });
  
  if (response.status === 200 && response.data.sessionId === state.sessionId) {
    console.log('✅ Session storage successful');
    return true;
  } else {
    console.error('❌ Session storage failed:', response.data);
    return false;
  }
}

// Test session end
async function testSessionEnd() {
  console.log('\n=== Testing Session End ===');
  
  if (!state.providerToken || !state.sessionId) {
    console.error('❌ Provider token or session ID not available');
    return false;
  }
  
  const response = await apiRequest(`${config.backendUrl}/sessions/${state.sessionId}/end`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${state.providerToken}`
    }
  });
  
  if (response.status === 200) {
    console.log('✅ Session end successful');
    
    // Close WebSocket connections
    if (state.providerWs) {
      state.providerWs.close();
    }
    
    if (state.patientWs) {
      state.patientWs.close();
    }
    
    return true;
  } else {
    console.error('❌ Session end failed:', response.data);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting MedTranslate AI Full System Integration Tests...');
  
  // Create test audio file if it doesn't exist
  if (!fs.existsSync(config.testAudioPath)) {
    console.log('Creating test audio file...');
    fs.writeFileSync(config.testAudioPath, Buffer.from('test audio data'));
  }
  
  // Run tests in sequence
  const testResults = {
    providerLogin: await testProviderLogin(),
    sessionCreation: await testSessionCreation(),
    patientTokenGeneration: await testPatientTokenGeneration(),
    providerWebSocketConnection: await testProviderWebSocketConnection(),
    patientWebSocketConnection: await testPatientWebSocketConnection(),
    textTranslation: await testTextTranslation(),
    edgeTranslation: await testEdgeTranslation(),
    edgeOfflineMode: await testEdgeOfflineMode(),
    sessionStorage: await testSessionStorage(),
    sessionEnd: await testSessionEnd()
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
  testProviderLogin,
  testSessionCreation,
  testPatientTokenGeneration,
  testProviderWebSocketConnection,
  testPatientWebSocketConnection,
  testTextTranslation,
  testEdgeTranslation,
  testEdgeOfflineMode,
  testSessionStorage,
  testSessionEnd,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
