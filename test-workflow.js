/**
 * End-to-End Workflow Test for MedTranslate AI
 *
 * This script tests the complete workflow from login to translation.
 */

const fetch = require('node-fetch');
const WebSocket = require('ws');

// Configuration
const API_URL = 'http://localhost:3001';
const PROVIDER_CREDENTIALS = {
  username: 'demo',
  password: 'demo123'
};
const PATIENT_LANGUAGE = 'es';

// Test workflow
async function testWorkflow() {
  console.log('Starting End-to-End Workflow Test');
  console.log('----------------------------------');

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

    // Step 4: Test Translation
    console.log('\nStep 4: Test Translation');
    const translationResponse = await fetch(`${API_URL}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        text: 'Hello, how are you feeling today?',
        sourceLanguage: 'en',
        targetLanguage: PATIENT_LANGUAGE,
        sessionId
      })
    });

    const translationData = await translationResponse.json();
    if (!translationResponse.ok) {
      throw new Error('Translation failed: ' + (translationData.error || 'Unknown error'));
    }

    console.log('✅ Translation successful');
    console.log(`Original Text: ${translationData.originalText}`);
    console.log(`Translated Text: ${translationData.translatedText}`);

    // Step 5: Test WebSocket Connection
    console.log('\nStep 5: Test WebSocket Connection');

    // Provider WebSocket
    const providerWs = new WebSocket(`ws://localhost:3001/ws/${sessionId}?token=${providerToken}`);

    providerWs.on('open', () => {
      console.log('✅ Provider WebSocket connected');

      // Send a message
      const message = {
        type: 'message',
        text: 'Hello from provider',
        sourceLanguage: 'en',
        targetLanguage: PATIENT_LANGUAGE
      };

      providerWs.send(JSON.stringify(message));
      console.log('Provider message sent');
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

      // Send a message
      const message = {
        type: 'message',
        text: 'Hola desde el paciente',
        sourceLanguage: PATIENT_LANGUAGE,
        targetLanguage: 'en'
      };

      setTimeout(() => {
        patientWs.send(JSON.stringify(message));
        console.log('Patient message sent');
      }, 1000);
    });

    patientWs.on('message', (data) => {
      const message = JSON.parse(data);
      console.log(`Patient received: ${JSON.stringify(message)}`);
    });

    patientWs.on('error', (error) => {
      console.error('Patient WebSocket error:', error);
    });

    // Wait for WebSocket messages
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Close WebSockets
    providerWs.close();
    patientWs.close();

    // Step 6: End Session
    console.log('\nStep 6: End Session');
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

    console.log('\n✅ All tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testWorkflow();
