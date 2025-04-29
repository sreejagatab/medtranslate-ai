/**
 * WebSocket Communication Test for MedTranslate AI
 *
 * This script tests the WebSocket communication between provider and patient applications.
 * It simulates both a provider and a patient connecting to a session and exchanging messages.
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  wsEndpoint: 'ws://localhost:3001/ws',
  jwtSecret: 'medtranslate-dev-secret-key',
  sessionId: uuidv4(),
  providerName: 'Dr. Test Provider',
  patientLanguage: 'es',
  medicalContext: 'General Consultation'
};

// Create JWT tokens
function createProviderToken() {
  return jwt.sign(
    {
      sub: 'provider-' + uuidv4(),
      name: config.providerName,
      type: 'provider'
    },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

function createPatientToken() {
  return jwt.sign(
    {
      sub: 'patient-' + uuidv4(),
      type: 'patient',
      language: config.patientLanguage,
      sessionId: config.sessionId
    },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

// Connect provider to WebSocket
function connectProvider() {
  const token = createProviderToken();
  const ws = new WebSocket(`${config.wsEndpoint}/${config.sessionId}?token=${token}`);

  ws.on('open', () => {
    console.log('Provider connected to session:', config.sessionId);
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Provider received message:', message);

    // Respond to patient messages
    if (message.type === 'translation' && message.sender && message.sender.type === 'patient') {
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'translation',
          messageId: 'provider-' + Date.now(),
          originalText: 'How are you feeling today?',
          translatedText: '¿Cómo se siente hoy?',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          confidence: 0.95,
          timestamp: new Date().toISOString()
        }));
      }, 2000);
    }
  });

  ws.on('close', (code, reason) => {
    console.log('Provider disconnected:', code, reason);
  });

  ws.on('error', (error) => {
    console.error('Provider WebSocket error:', error);
  });

  return ws;
}

// Connect patient to WebSocket
function connectPatient() {
  const token = createPatientToken();
  const ws = new WebSocket(`${config.wsEndpoint}/${config.sessionId}?token=${token}`);

  ws.on('open', () => {
    console.log('Patient connected to session:', config.sessionId);

    // Send a message after connecting
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'translation',
        messageId: 'patient-' + Date.now(),
        originalText: 'Me duele la cabeza',
        translatedText: 'I have a headache',
        sourceLanguage: 'es',
        targetLanguage: 'en',
        confidence: 0.92,
        timestamp: new Date().toISOString()
      }));
    }, 3000);
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Patient received message:', message);
  });

  ws.on('close', (code, reason) => {
    console.log('Patient disconnected:', code, reason);
  });

  ws.on('error', (error) => {
    console.error('Patient WebSocket error:', error);
  });

  return ws;
}

// Run the test
async function runTest() {
  console.log('Starting WebSocket communication test...');
  console.log('Session ID:', config.sessionId);

  // Connect provider first
  const providerWs = connectProvider();

  // Wait a bit before connecting patient
  setTimeout(() => {
    const patientWs = connectPatient();

    // Close connections after test
    setTimeout(() => {
      console.log('Test completed, closing connections...');
      providerWs.close();
      patientWs.close();
    }, 15000);
  }, 2000);
}

// Run the test
runTest();
