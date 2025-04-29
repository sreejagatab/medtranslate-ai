/**
 * Translation Error Handling Integration Test
 * 
 * This test verifies that the translation service handles errors gracefully.
 */

const axios = require('axios');
const testDataManager = require('../utils/test-data-manager');

// Configuration
const API_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const EDGE_URL = process.env.EDGE_URL || 'http://localhost:3002';

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
    return {
      status: 500,
      data: { error: error.message }
    };
  }
}

describe('Translation Error Handling Integration', () => {
  let provider;
  let sessionId;
  
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
  });
  
  // Clean up after tests
  afterAll(async () => {
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
  
  test('Handles missing text parameter', async () => {
    const response = await apiRequest(`${API_URL}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.token}`
      },
      data: {
        // Missing text parameter
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      }
    });
    
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('success', false);
    expect(response.data).toHaveProperty('error');
    expect(response.data.error).toContain('text');
  });
  
  test('Handles missing language parameters', async () => {
    const response = await apiRequest(`${API_URL}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.token}`
      },
      data: {
        text: 'Hello, how are you?',
        // Missing sourceLanguage and targetLanguage
        context: 'general'
      }
    });
    
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('success', false);
    expect(response.data).toHaveProperty('error');
    expect(response.data.error).toContain('language');
  });
  
  test('Handles unsupported language pair', async () => {
    const response = await apiRequest(`${API_URL}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.token}`
      },
      data: {
        text: 'Hello, how are you?',
        sourceLanguage: 'en',
        targetLanguage: 'unsupported-language',
        context: 'general'
      }
    });
    
    // The service should either return an error or fall back to a supported language
    if (response.status === 400) {
      expect(response.data).toHaveProperty('success', false);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('language');
    } else {
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('originalText', 'Hello, how are you?');
      expect(response.data).toHaveProperty('translatedText');
      expect(response.data).toHaveProperty('fallbackUsed', true);
    }
  });
  
  test('Handles unauthorized access', async () => {
    const response = await apiRequest(`${API_URL}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      data: {
        text: 'Hello, how are you?',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      }
    });
    
    expect(response.status).toBe(401);
    expect(response.data).toHaveProperty('success', false);
    expect(response.data).toHaveProperty('error', 'Unauthorized');
  });
  
  test('Handles extremely long text', async () => {
    // Create a very long text (100KB)
    const longText = 'a'.repeat(100 * 1024);
    
    const response = await apiRequest(`${API_URL}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.token}`
      },
      data: {
        text: longText,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      }
    });
    
    // The service should either handle it or return an appropriate error
    if (response.status === 413) {
      // Payload too large
      expect(response.data).toHaveProperty('success', false);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('too large');
    } else if (response.status === 400) {
      // Bad request
      expect(response.data).toHaveProperty('success', false);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('too long');
    } else {
      // Successfully handled
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('originalText');
      expect(response.data).toHaveProperty('translatedText');
    }
  });
  
  test('Handles edge service unavailability', async () => {
    // Try to translate using the edge service directly
    const edgeResponse = await apiRequest(`${EDGE_URL}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        text: 'Hello, how are you?',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      }
    });
    
    // If edge service is available, skip this test
    if (edgeResponse.status === 200) {
      console.log('Edge service is available, skipping test');
      return;
    }
    
    // If edge service is unavailable, the backend should fall back to cloud translation
    const response = await apiRequest(`${API_URL}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.token}`
      },
      data: {
        text: 'Hello, how are you?',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('originalText', 'Hello, how are you?');
    expect(response.data).toHaveProperty('translatedText');
    expect(response.data).toHaveProperty('source', 'cloud');
  });
  
  test('Handles malformed JSON', async () => {
    try {
      const response = await axios({
        method: 'POST',
        url: `${API_URL}/translate/text`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.token}`
        },
        data: '{malformed json',
        validateStatus: () => true
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('success', false);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('JSON');
    } catch (error) {
      // If axios throws an error, that's also acceptable
      expect(error.message).toContain('JSON');
    }
  });
});
