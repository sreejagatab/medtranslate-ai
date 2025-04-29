/**
 * Backend-Frontend Authentication Integration Test
 * 
 * This test verifies the authentication flow between the backend and frontend.
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const API_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

// Test data
const testProvider = {
  email: 'test-provider@example.com',
  password: 'testpassword123'
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

describe('Backend-Frontend Authentication Integration', () => {
  let providerToken;
  let sessionId;
  
  test('Provider can login and receive a valid token', async () => {
    const response = await apiRequest(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: testProvider
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('token');
    
    providerToken = response.data.token;
    
    // Verify token structure (without verifying signature)
    const tokenParts = providerToken.split('.');
    expect(tokenParts.length).toBe(3);
    
    // Decode token payload
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    expect(payload).toHaveProperty('sub');
    expect(payload).toHaveProperty('type', 'provider');
  });
  
  test('Provider can verify token', async () => {
    // Skip if login failed
    if (!providerToken) {
      console.warn('Skipping test: Provider token not available');
      return;
    }
    
    const response = await apiRequest(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        token: providerToken
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('valid', true);
    expect(response.data).toHaveProperty('user');
    expect(response.data.user).toHaveProperty('type', 'provider');
  });
  
  test('Provider can create a session with valid token', async () => {
    // Skip if login failed
    if (!providerToken) {
      console.warn('Skipping test: Provider token not available');
      return;
    }
    
    const response = await apiRequest(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      data: {
        medicalContext: 'General Consultation',
        patientLanguage: 'es'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success', true);
    expect(response.data).toHaveProperty('sessionId');
    
    sessionId = response.data.sessionId;
  });
  
  test('Provider can generate a patient token', async () => {
    // Skip if session creation failed
    if (!sessionId || !providerToken) {
      console.warn('Skipping test: Session ID or provider token not available');
      return;
    }
    
    const response = await apiRequest(`${API_URL}/sessions/patient-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      data: {
        sessionId,
        language: 'es'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('token');
    expect(response.data).toHaveProperty('sessionCode');
    
    const patientToken = response.data.token;
    
    // Verify token structure (without verifying signature)
    const tokenParts = patientToken.split('.');
    expect(tokenParts.length).toBe(3);
    
    // Decode token payload
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    expect(payload).toHaveProperty('sessionId', sessionId);
    expect(payload).toHaveProperty('type', 'patient');
  });
  
  test('Patient can join session with session code', async () => {
    // Skip if session creation failed
    if (!sessionId) {
      console.warn('Skipping test: Session ID not available');
      return;
    }
    
    // First, get the session code
    const tokenResponse = await apiRequest(`${API_URL}/sessions/patient-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      data: {
        sessionId,
        language: 'es'
      }
    });
    
    const sessionCode = tokenResponse.data.sessionCode;
    
    // Now try to join with the session code
    const joinResponse = await apiRequest(`${API_URL}/sessions/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        sessionCode
      }
    });
    
    expect(joinResponse.status).toBe(200);
    expect(joinResponse.data).toHaveProperty('success', true);
    expect(joinResponse.data).toHaveProperty('token');
    expect(joinResponse.data).toHaveProperty('sessionId', sessionId);
  });
  
  test('Invalid token is rejected', async () => {
    const response = await apiRequest(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      data: {
        medicalContext: 'General Consultation',
        patientLanguage: 'es'
      }
    });
    
    expect(response.status).toBe(401);
    expect(response.data).toHaveProperty('success', false);
    expect(response.data).toHaveProperty('error', 'Unauthorized');
  });
  
  test('Provider can end a session', async () => {
    // Skip if session creation failed
    if (!sessionId || !providerToken) {
      console.warn('Skipping test: Session ID or provider token not available');
      return;
    }
    
    const response = await apiRequest(`${API_URL}/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success', true);
  });
});
