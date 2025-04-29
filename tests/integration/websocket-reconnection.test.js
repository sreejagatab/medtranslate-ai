/**
 * WebSocket Reconnection Integration Test
 * 
 * This test verifies that the WebSocket connection can recover from network interruptions.
 */

const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const testDataManager = require('../utils/test-data-manager');

// Configuration
const API_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const WS_URL = process.env.WS_URL || 'ws://localhost:3001/ws';

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

describe('WebSocket Reconnection Integration', () => {
  let provider;
  let sessionId;
  let patientToken;
  let providerWs;
  let patientWs;
  let receivedMessages = [];
  
  // Setup test data
  beforeAll(async () => {
    // Create test provider
    provider = await testDataManager.createTestProvider();
    
    // Create test session
    const sessionResponse = await testDataManager.createTestSession(
      provider.token,
      'General Consultation',
      'es'
    );
    sessionId = sessionResponse.sessionId;
    
    // Generate patient token
    const tokenResponse = await testDataManager.generatePatientToken(
      sessionId,
      provider.token,
      'es'
    );
    patientToken = tokenResponse.token;
  });
  
  // Clean up after tests
  afterAll(async () => {
    // Close WebSocket connections
    if (providerWs && providerWs.readyState === WebSocket.OPEN) {
      providerWs.close();
    }
    
    if (patientWs && patientWs.readyState === WebSocket.OPEN) {
      patientWs.close();
    }
    
    // End session
    await apiRequest(`${API_URL}/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.token}`
      }
    });
    
    // Clean up test data
    await testDataManager.cleanupTestData();
  });
  
  test('Provider and patient can connect to WebSocket', async () => {
    // Connect provider
    return new Promise((resolve) => {
      providerWs = new WebSocket(`${WS_URL}/${sessionId}?token=${provider.token}`);
      
      providerWs.on('open', () => {
        expect(providerWs.readyState).toBe(WebSocket.OPEN);
        
        // Set up message handler
        providerWs.on('message', (data) => {
          const message = JSON.parse(data);
          receivedMessages.push({
            recipient: 'provider',
            message
          });
        });
        
        // Connect patient after provider is connected
        patientWs = new WebSocket(`${WS_URL}/${sessionId}?token=${patientToken}`);
        
        patientWs.on('open', () => {
          expect(patientWs.readyState).toBe(WebSocket.OPEN);
          
          // Set up message handler
          patientWs.on('message', (data) => {
            const message = JSON.parse(data);
            receivedMessages.push({
              recipient: 'patient',
              message
            });
          });
          
          resolve();
        });
        
        patientWs.on('error', (error) => {
          console.error('Patient WebSocket error:', error.message);
        });
      });
      
      providerWs.on('error', (error) => {
        console.error('Provider WebSocket error:', error.message);
      });
    });
  });
  
  test('Messages can be sent and received', async () => {
    // Skip if connection failed
    if (!providerWs || !patientWs) {
      console.warn('Skipping test: WebSocket connections not established');
      return;
    }
    
    return new Promise((resolve) => {
      const messageId = uuidv4();
      
      // Set up one-time message handler for patient
      const originalHandler = patientWs.onmessage;
      
      patientWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.messageId === messageId) {
          expect(message.type).toBe('translation');
          expect(message.originalText).toBe('Hello, how are you feeling today?');
          
          // Restore original handler
          patientWs.onmessage = originalHandler;
          
          resolve();
        } else if (originalHandler) {
          originalHandler(event);
        }
      };
      
      // Send message from provider to patient
      providerWs.send(JSON.stringify({
        type: 'translation',
        messageId,
        originalText: 'Hello, how are you feeling today?',
        translatedText: '¿Hola, cómo te sientes hoy?',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        timestamp: new Date().toISOString()
      }));
    });
  });
  
  test('Provider can reconnect after disconnection', async () => {
    // Skip if connection failed
    if (!providerWs || !patientWs) {
      console.warn('Skipping test: WebSocket connections not established');
      return;
    }
    
    return new Promise(async (resolve) => {
      // Close provider connection
      providerWs.close();
      
      // Wait for connection to close
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reconnect provider
      providerWs = new WebSocket(`${WS_URL}/${sessionId}?token=${provider.token}`);
      
      providerWs.on('open', () => {
        expect(providerWs.readyState).toBe(WebSocket.OPEN);
        
        // Set up message handler
        providerWs.on('message', (data) => {
          const message = JSON.parse(data);
          receivedMessages.push({
            recipient: 'provider',
            message
          });
        });
        
        // Test sending a message after reconnection
        const messageId = uuidv4();
        
        // Set up one-time message handler for patient
        const originalHandler = patientWs.onmessage;
        
        patientWs.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
          if (message.messageId === messageId) {
            expect(message.type).toBe('translation');
            expect(message.originalText).toBe('Can you hear me after reconnection?');
            
            // Restore original handler
            patientWs.onmessage = originalHandler;
            
            resolve();
          } else if (originalHandler) {
            originalHandler(event);
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
          timestamp: new Date().toISOString()
        }));
      });
      
      providerWs.on('error', (error) => {
        console.error('Provider WebSocket reconnection error:', error.message);
      });
    });
  });
  
  test('Patient can reconnect after disconnection', async () => {
    // Skip if connection failed
    if (!providerWs || !patientWs) {
      console.warn('Skipping test: WebSocket connections not established');
      return;
    }
    
    return new Promise(async (resolve) => {
      // Close patient connection
      patientWs.close();
      
      // Wait for connection to close
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reconnect patient
      patientWs = new WebSocket(`${WS_URL}/${sessionId}?token=${patientToken}`);
      
      patientWs.on('open', () => {
        expect(patientWs.readyState).toBe(WebSocket.OPEN);
        
        // Set up message handler
        patientWs.on('message', (data) => {
          const message = JSON.parse(data);
          receivedMessages.push({
            recipient: 'patient',
            message
          });
        });
        
        // Test sending a message after reconnection
        const messageId = uuidv4();
        
        // Set up one-time message handler for provider
        const originalHandler = providerWs.onmessage;
        
        providerWs.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
          if (message.messageId === messageId) {
            expect(message.type).toBe('translation');
            expect(message.originalText).toBe('I can hear you after reconnection');
            
            // Restore original handler
            providerWs.onmessage = originalHandler;
            
            resolve();
          } else if (originalHandler) {
            originalHandler(event);
          }
        };
        
        // Send message from patient to provider
        patientWs.send(JSON.stringify({
          type: 'translation',
          messageId,
          originalText: 'I can hear you after reconnection',
          translatedText: 'Puedo oírte después de la reconexión',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          timestamp: new Date().toISOString()
        }));
      });
      
      patientWs.on('error', (error) => {
        console.error('Patient WebSocket reconnection error:', error.message);
      });
    });
  });
  
  test('Both connections can recover from simultaneous disconnection', async () => {
    // Skip if connection failed
    if (!providerWs || !patientWs) {
      console.warn('Skipping test: WebSocket connections not established');
      return;
    }
    
    return new Promise(async (resolve) => {
      // Close both connections
      providerWs.close();
      patientWs.close();
      
      // Wait for connections to close
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reconnect provider
      providerWs = new WebSocket(`${WS_URL}/${sessionId}?token=${provider.token}`);
      
      providerWs.on('open', () => {
        expect(providerWs.readyState).toBe(WebSocket.OPEN);
        
        // Set up message handler
        providerWs.on('message', (data) => {
          const message = JSON.parse(data);
          receivedMessages.push({
            recipient: 'provider',
            message
          });
        });
        
        // Reconnect patient
        patientWs = new WebSocket(`${WS_URL}/${sessionId}?token=${patientToken}`);
        
        patientWs.on('open', () => {
          expect(patientWs.readyState).toBe(WebSocket.OPEN);
          
          // Set up message handler
          patientWs.on('message', (data) => {
            const message = JSON.parse(data);
            receivedMessages.push({
              recipient: 'patient',
              message
            });
          });
          
          // Test sending a message after reconnection
          const messageId = uuidv4();
          
          // Set up one-time message handler for patient
          const originalHandler = patientWs.onmessage;
          
          patientWs.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            if (message.messageId === messageId) {
              expect(message.type).toBe('translation');
              expect(message.originalText).toBe('Both connections are restored');
              
              // Restore original handler
              patientWs.onmessage = originalHandler;
              
              resolve();
            } else if (originalHandler) {
              originalHandler(event);
            }
          };
          
          // Send message from provider to patient
          providerWs.send(JSON.stringify({
            type: 'translation',
            messageId,
            originalText: 'Both connections are restored',
            translatedText: 'Ambas conexiones están restauradas',
            sourceLanguage: 'en',
            targetLanguage: 'es',
            timestamp: new Date().toISOString()
          }));
        });
        
        patientWs.on('error', (error) => {
          console.error('Patient WebSocket reconnection error:', error.message);
        });
      });
      
      providerWs.on('error', (error) => {
        console.error('Provider WebSocket reconnection error:', error.message);
      });
    });
  });
});
