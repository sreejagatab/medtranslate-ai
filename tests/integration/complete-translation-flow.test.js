/**
 * Complete Translation Flow Integration Test
 * 
 * This test verifies the complete translation flow from provider login to
 * translation and WebSocket communication.
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
    email: 'test-provider@example.com',
    password: 'testpassword123'
  },
  testAudioPath: path.join(__dirname, '../test-audio.mp3')
};

// State to store test data
const state = {
  providerToken: null,
  patientToken: null,
  sessionId: null,
  sessionCode: null,
  providerWs: null,
  patientWs: null,
  messages: []
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
  
  if (!state.sessionId || !state.providerToken) {
    console.error('❌ Session ID or provider token not available');
    return false;
  }
  
  const response = await apiRequest(`${config.backendUrl}/sessions/patient-token`, {
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
  
  if (response.status === 200 && response.data.token) {
    console.log('✅ Patient token generation successful');
    state.patientToken = response.data.token;
    return true;
  } else {
    console.error('❌ Patient token generation failed:', response.data);
    return false;
  }
}

// Test WebSocket connection for provider
function testProviderWebSocketConnection() {
  return new Promise((resolve) => {
    console.log('\n=== Testing Provider WebSocket Connection ===');
    
    if (!state.sessionId || !state.providerToken) {
      console.error('❌ Session ID or provider token not available');
      resolve(false);
      return;
    }
    
    const ws = new WebSocket(`${config.wsEndpoint}/${state.sessionId}?token=${state.providerToken}`);
    
    ws.on('open', () => {
      console.log('✅ Provider WebSocket connection successful');
      state.providerWs = ws;
      
      // Set up message handler
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('Provider received message:', message.type);
        state.messages.push({
          source: 'provider',
          message
        });
      });
      
      resolve(true);
    });
    
    ws.on('error', (error) => {
      console.error('❌ Provider WebSocket connection failed:', error.message);
      resolve(false);
    });
    
    // Set timeout
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('❌ Provider WebSocket connection timed out');
        resolve(false);
      }
    }, 5000);
  });
}

// Test WebSocket connection for patient
function testPatientWebSocketConnection() {
  return new Promise((resolve) => {
    console.log('\n=== Testing Patient WebSocket Connection ===');
    
    if (!state.sessionId || !state.patientToken) {
      console.error('❌ Session ID or patient token not available');
      resolve(false);
      return;
    }
    
    const ws = new WebSocket(`${config.wsEndpoint}/${state.sessionId}?token=${state.patientToken}`);
    
    ws.on('open', () => {
      console.log('✅ Patient WebSocket connection successful');
      state.patientWs = ws;
      
      // Set up message handler
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('Patient received message:', message.type);
        state.messages.push({
          source: 'patient',
          message
        });
      });
      
      resolve(true);
    });
    
    ws.on('error', (error) => {
      console.error('❌ Patient WebSocket connection failed:', error.message);
      resolve(false);
    });
    
    // Set timeout
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('❌ Patient WebSocket connection timed out');
        resolve(false);
      }
    }, 5000);
  });
}

// Test text translation
async function testTextTranslation() {
  console.log('\n=== Testing Text Translation ===');
  
  if (!state.sessionId || !state.providerToken) {
    console.error('❌ Session ID or provider token not available');
    return false;
  }
  
  // Test provider to patient translation (English to Spanish)
  const providerText = "How are you feeling today?";
  
  const response = await apiRequest(`${config.backendUrl}/translate/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.providerToken}`
    },
    data: {
      sessionId: state.sessionId,
      text: providerText,
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'General Consultation'
    }
  });
  
  if (response.status === 200 && response.data.translatedText) {
    console.log('✅ Text translation successful');
    console.log(`   Original: "${providerText}"`);
    console.log(`   Translated: "${response.data.translatedText}"`);
    
    // Send translation via WebSocket
    if (state.providerWs && state.providerWs.readyState === WebSocket.OPEN) {
      state.providerWs.send(JSON.stringify({
        type: 'translation',
        messageId: `provider-${Date.now()}`,
        originalText: providerText,
        translatedText: response.data.translatedText,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: response.data.confidence,
        timestamp: new Date().toISOString()
      }));
      
      console.log('✅ Translation message sent via WebSocket');
    }
    
    return true;
  } else {
    console.error('❌ Text translation failed:', response.data);
    return false;
  }
}

// Test edge translation
async function testEdgeTranslation() {
  console.log('\n=== Testing Edge Translation ===');
  
  // Test patient to provider translation (Spanish to English)
  const patientText = "Me duele la cabeza";
  
  const response = await apiRequest(`${config.edgeUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      text: patientText,
      sourceLanguage: 'es',
      targetLanguage: 'en',
      context: 'General Consultation'
    }
  });
  
  if (response.status === 200 && response.data.translatedText) {
    console.log('✅ Edge translation successful');
    console.log(`   Original: "${patientText}"`);
    console.log(`   Translated: "${response.data.translatedText}"`);
    
    // Send translation via WebSocket
    if (state.patientWs && state.patientWs.readyState === WebSocket.OPEN) {
      state.patientWs.send(JSON.stringify({
        type: 'translation',
        messageId: `patient-${Date.now()}`,
        originalText: patientText,
        translatedText: response.data.translatedText,
        sourceLanguage: 'es',
        targetLanguage: 'en',
        confidence: response.data.confidence,
        timestamp: new Date().toISOString()
      }));
      
      console.log('✅ Translation message sent via WebSocket');
    }
    
    return true;
  } else {
    console.error('❌ Edge translation failed:', response.data);
    return false;
  }
}

// Test session storage
async function testSessionStorage() {
  console.log('\n=== Testing Session Storage ===');
  
  if (!state.sessionId || !state.providerToken) {
    console.error('❌ Session ID or provider token not available');
    return false;
  }
  
  const response = await apiRequest(`${config.backendUrl}/storage/transcript`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.providerToken}`
    },
    data: {
      sessionId: state.sessionId,
      transcript: {
        messages: state.messages.map(m => m.message),
        metadata: {
          provider: 'Test Provider',
          patient: 'Test Patient',
          context: 'General Consultation',
          timestamp: new Date().toISOString()
        }
      }
    }
  });
  
  if (response.status === 200 && response.data.success) {
    console.log('✅ Session storage successful');
    return true;
  } else {
    console.error('❌ Session storage failed:', response.data);
    return false;
  }
}

// Test session retrieval
async function testSessionRetrieval() {
  console.log('\n=== Testing Session Retrieval ===');
  
  if (!state.sessionId || !state.providerToken) {
    console.error('❌ Session ID or provider token not available');
    return false;
  }
  
  const response = await apiRequest(`${config.backendUrl}/storage/sessions/${state.sessionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${state.providerToken}`
    }
  });
  
  if (response.status === 200 && response.data.success) {
    console.log('✅ Session retrieval successful');
    console.log(`   Retrieved ${response.data.sessionData.messages.length} messages`);
    return true;
  } else {
    console.error('❌ Session retrieval failed:', response.data);
    return false;
  }
}

// Test session end
async function testSessionEnd() {
  console.log('\n=== Testing Session End ===');
  
  if (!state.sessionId || !state.providerToken) {
    console.error('❌ Session ID or provider token not available');
    return false;
  }
  
  const response = await apiRequest(`${config.backendUrl}/sessions/${state.sessionId}/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.providerToken}`
    }
  });
  
  if (response.status === 200 && response.data.success) {
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
  console.log('Starting MedTranslate AI Complete Translation Flow Test...');
  
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
    patientWebSocketConnection: await testPatientWebSocketConnection()
  };
  
  // Wait for WebSocket connections to stabilize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Continue with more tests
  testResults.textTranslation = await testTextTranslation();
  
  // Wait for WebSocket messages to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  testResults.edgeTranslation = await testEdgeTranslation();
  
  // Wait for WebSocket messages to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  testResults.sessionStorage = await testSessionStorage();
  testResults.sessionRetrieval = await testSessionRetrieval();
  testResults.sessionEnd = await testSessionEnd();
  
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
  testSessionStorage,
  testSessionRetrieval,
  testSessionEnd,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
