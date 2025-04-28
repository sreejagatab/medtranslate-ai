/**
 * API Configuration for MedTranslate AI Patient Application
 * 
 * This file contains API endpoints and configuration for the application.
 */

// Base API URL - Change this to point to your local or production API
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Edge API URL - Change this to point to your local or production edge service
export const EDGE_API_URL = process.env.REACT_APP_EDGE_URL || 'http://localhost:3002';

// API Endpoints
export const API_ENDPOINTS = {
  // Session endpoints
  SESSIONS: {
    JOIN: `${API_BASE_URL}/sessions/join`,
    END: (sessionId) => `${API_BASE_URL}/sessions/${sessionId}/end`,
  },
  
  // Translation endpoints
  TRANSLATE: {
    TEXT: `${API_BASE_URL}/translate/text`,
    AUDIO: `${API_BASE_URL}/translate/audio`,
  },
  
  // WebSocket endpoint
  WEBSOCKET: (sessionId, token) => 
    `ws://${API_BASE_URL.replace('http://', '')}/ws/${sessionId}?token=${token}`,
};

// Default request headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// API request helper function
export const apiRequest = async (url, options = {}) => {
  const { headers, ...restOptions } = options;
  
  // Set default headers
  const requestHeaders = {
    ...DEFAULT_HEADERS,
    ...headers,
  };
  
  // Set timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Parse response
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
};
