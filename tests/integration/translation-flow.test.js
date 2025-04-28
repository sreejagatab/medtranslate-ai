/**
 * End-to-End Test for MedTranslate AI Translation Flow
 * 
 * This test verifies the complete translation flow from provider to patient
 * using the WebSocket API for real-time communication.
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const WS_URL = process.env.WS_URL || 'ws://localhost:3001';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test data
const providerCredentials = {
  username: 'test-provider',
  password: 'test-password'
};

const testPatient = {
  language: 'es'
};

const testMessages = [
  {
    text: 'Hello, how are you feeling today?',
    sourceLanguage: 'en',
    targetLanguage: 'es'
  },
  {
    text: 'Do you have any allergies?',
    sourceLanguage: 'en',
    targetLanguage: 'es'
  },
  {
    text: 'Me duele la cabeza',
    sourceLanguage: 'es',
    targetLanguage: 'en'
  }
];

// Test suite
describe('Translation Flow End-to-End Test', () => {
  let providerToken;
  let patientToken;
  let sessionId;
  let sessionCode;
  let providerWs;
  let patientWs;
  let receivedMessages = [];

  // Set timeout for all tests
  jest.setTimeout(TEST_TIMEOUT);

  // Helper function to wait for a specific message type
  const waitForMessage = (ws, messageType, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${messageType}`));
      }, timeout);

      const messageHandler = (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === messageType) {
            clearTimeout(timer);
            ws.removeEventListener('message', messageHandler);
            resolve(data);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };

      ws.addEventListener('message', messageHandler);
    });
  };

  // Before all tests
  beforeAll(async () => {
    // Step 1: Provider login
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(providerCredentials)
    });

    if (!loginResponse.ok) {
      throw new Error(`Provider login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    providerToken = loginData.token;

    // Step 2: Create a new session
    const sessionResponse = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        medicalContext: 'general'
      })
    });

    if (!sessionResponse.ok) {
      throw new Error(`Session creation failed: ${sessionResponse.status}`);
    }

    const sessionData = await sessionResponse.json();
    sessionId = sessionData.sessionId;

    // Step 3: Generate patient token
    const patientTokenResponse = await fetch(`${API_URL}/sessions/patient-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        sessionId,
        language: testPatient.language
      })
    });

    if (!patientTokenResponse.ok) {
      throw new Error(`Patient token generation failed: ${patientTokenResponse.status}`);
    }

    const patientTokenData = await patientTokenResponse.json();
    patientToken = patientTokenData.token;
    sessionCode = patientTokenData.sessionCode;

    console.log(`Created test session: ${sessionId} with code: ${sessionCode}`);
  });

  // After all tests
  afterAll(async () => {
    // Close WebSocket connections
    if (providerWs && providerWs.readyState === WebSocket.OPEN) {
      providerWs.close();
    }

    if (patientWs && patientWs.readyState === WebSocket.OPEN) {
      patientWs.close();
    }

    // End the session
    try {
      await fetch(`${API_URL}/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${providerToken}`
        }
      });
    } catch (error) {
      console.error('Error ending session:', error);
    }
  });

  // Test WebSocket connections
  test('Provider and patient can connect to WebSocket', async () => {
    // Connect provider
    return new Promise((resolve) => {
      providerWs = new WebSocket(`${WS_URL}/sessions/${sessionId}/ws?token=${providerToken}`);

      providerWs.on('open', () => {
        expect(providerWs.readyState).toBe(WebSocket.OPEN);

        // Connect patient after provider is connected
        patientWs = new WebSocket(`${WS_URL}/sessions/${sessionId}/ws?token=${patientToken}`);

        patientWs.on('open', () => {
          expect(patientWs.readyState).toBe(WebSocket.OPEN);
          resolve();
        });

        patientWs.on('message', (message) => {
          const data = JSON.parse(message);
          receivedMessages.push(data);
        });
      });

      providerWs.on('message', (message) => {
        const data = JSON.parse(message);
        receivedMessages.push(data);
      });
    });
  });

  // Test sending messages
  test('Provider can send messages that are translated for patient', async () => {
    // Send test messages from provider
    const message = testMessages[0];
    const messageId = uuidv4();

    providerWs.send(JSON.stringify({
      type: 'translation',
      messageId,
      originalText: message.text,
      sourceLanguage: message.sourceLanguage,
      targetLanguage: message.targetLanguage,
      timestamp: new Date().toISOString()
    }));

    // Wait for translation message
    const translationMessage = await waitForMessage(patientWs, 'translation');

    expect(translationMessage).toBeDefined();
    expect(translationMessage.originalText).toBe(message.text);
    expect(translationMessage.sourceLanguage).toBe(message.sourceLanguage);
    expect(translationMessage.targetLanguage).toBe(message.targetLanguage);
    expect(translationMessage.translatedText).toBeDefined();
  });

  // Test patient sending messages
  test('Patient can send messages that are translated for provider', async () => {
    // Send test message from patient
    const message = testMessages[2];
    const messageId = uuidv4();

    patientWs.send(JSON.stringify({
      type: 'translation',
      messageId,
      originalText: message.text,
      sourceLanguage: message.sourceLanguage,
      targetLanguage: message.targetLanguage,
      timestamp: new Date().toISOString()
    }));

    // Wait for translation message
    const translationMessage = await waitForMessage(providerWs, 'translation');

    expect(translationMessage).toBeDefined();
    expect(translationMessage.originalText).toBe(message.text);
    expect(translationMessage.sourceLanguage).toBe(message.sourceLanguage);
    expect(translationMessage.targetLanguage).toBe(message.targetLanguage);
    expect(translationMessage.translatedText).toBeDefined();
  });

  // Test session closing
  test('Provider can end the session', async () => {
    // End the session
    const response = await fetch(`${API_URL}/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      }
    });

    expect(response.ok).toBe(true);

    // Wait for session_closed message
    const providerCloseMessage = await waitForMessage(providerWs, 'session_closed');
    const patientCloseMessage = await waitForMessage(patientWs, 'session_closed');

    expect(providerCloseMessage).toBeDefined();
    expect(patientCloseMessage).toBeDefined();
  });
});
