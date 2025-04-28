/**
 * WebSocket Communication Test for MedTranslate AI
 * 
 * This script tests real-time communication between provider and patient.
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3001';
const PROVIDER_CREDENTIALS = {
  username: 'demo',
  password: 'demo123'
};
const PATIENT_LANGUAGE = 'es';

// Test WebSocket communication
async function testWebSocketCommunication() {
  console.log('Starting WebSocket Communication Test');
  console.log('-------------------------------------');
  
  try {
    // Step 1: Provider Login
    console.log('\nStep 1: Provider Login');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(PROVIDER_CREDENTIALS)
    });
    
    const loginData = await loginResponse.json();
    if (!loginResponse.ok || !loginData.success) {
      throw new Error('Login failed: ' + (loginData.error || 'Unknown error'));
    }
    
    console.log('✅ Login successful');
    console.log(`Provider: ${loginData.provider.name}`);
    console.log(`Token: ${loginData.token.substring(0, 20)}...`);
    
    const providerToken = loginData.token;
    const providerId = loginData.provider.providerId;
    
    // Step 2: Create Session
    console.log('\nStep 2: Create Session');
    const createSessionResponse = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        providerId,
        patientLanguage: PATIENT_LANGUAGE
      })
    });
    
    const sessionData = await createSessionResponse.json();
    if (!createSessionResponse.ok || !sessionData.success) {
      throw new Error('Create session failed: ' + (sessionData.error || 'Unknown error'));
    }
    
    console.log('✅ Session created successfully');
    console.log(`Session ID: ${sessionData.sessionId}`);
    console.log(`Session Code: ${sessionData.sessionCode}`);
    
    const sessionId = sessionData.sessionId;
    const sessionCode = sessionData.sessionCode;
    
    // Step 3: Patient Join Session
    console.log('\nStep 3: Patient Join Session');
    const joinSessionResponse = await fetch(`${API_URL}/sessions/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionCode,
        language: PATIENT_LANGUAGE
      })
    });
    
    const joinData = await joinSessionResponse.json();
    if (!joinSessionResponse.ok || !joinData.success) {
      throw new Error('Join session failed: ' + (joinData.error || 'Unknown error'));
    }
    
    console.log('✅ Patient joined session successfully');
    console.log(`Patient Token: ${joinData.token.substring(0, 20)}...`);
    
    const patientToken = joinData.token;
    
    // Step 4: Connect WebSockets
    console.log('\nStep 4: Connect WebSockets');
    
    // Provider WebSocket
    const providerWs = new WebSocket(`ws://localhost:3001/ws/${sessionId}?token=${providerToken}`);
    
    providerWs.on('open', () => {
      console.log('✅ Provider WebSocket connected');
    });
    
    providerWs.on('message', (data) => {
      const message = JSON.parse(data);
      console.log(`Provider received: ${JSON.stringify(message)}`);
    });
    
    providerWs.on('error', (error) => {
      console.error('Provider WebSocket error:', error);
    });
    
    // Patient WebSocket
    const patientWs = new WebSocket(`ws://localhost:3001/ws/${sessionId}?token=${patientToken}`);
    
    patientWs.on('open', () => {
      console.log('✅ Patient WebSocket connected');
    });
    
    patientWs.on('message', (data) => {
      const message = JSON.parse(data);
      console.log(`Patient received: ${JSON.stringify(message)}`);
    });
    
    patientWs.on('error', (error) => {
      console.error('Patient WebSocket error:', error);
    });
    
    // Wait for connections to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 5: Send Provider Message
    console.log('\nStep 5: Send Provider Message');
    const providerMessage = {
      type: 'message',
      text: 'Hello, how are you feeling today?',
      sourceLanguage: 'en',
      targetLanguage: PATIENT_LANGUAGE
    };
    
    providerWs.send(JSON.stringify(providerMessage));
    console.log('Provider message sent');
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Send Patient Message
    console.log('\nStep 6: Send Patient Message');
    const patientMessage = {
      type: 'message',
      text: 'Me duele la cabeza y tengo fiebre',
      sourceLanguage: PATIENT_LANGUAGE,
      targetLanguage: 'en'
    };
    
    patientWs.send(JSON.stringify(patientMessage));
    console.log('Patient message sent');
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 7: Close WebSockets
    console.log('\nStep 7: Close WebSockets');
    providerWs.close();
    patientWs.close();
    console.log('WebSockets closed');
    
    // Step 8: End Session
    console.log('\nStep 8: End Session');
    const endSessionResponse = await fetch(`${API_URL}/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        sessionId
      })
    });
    
    const endSessionData = await endSessionResponse.json();
    if (!endSessionResponse.ok || !endSessionData.success) {
      throw new Error('End session failed: ' + (endSessionData.error || 'Unknown error'));
    }
    
    console.log('✅ Session ended successfully');
    
    console.log('\n✅ WebSocket communication test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testWebSocketCommunication();
