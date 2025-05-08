/**
 * API Configuration for MedTranslate AI Admin Dashboard
 */

// Base API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    VERIFY: `${API_BASE_URL}/auth/verify`
  },

  // User endpoints
  USERS: {
    LIST: `${API_BASE_URL}/users`,
    DETAILS: (userId) => `${API_BASE_URL}/users/${userId}`,
    CREATE: `${API_BASE_URL}/users`,
    UPDATE: (userId) => `${API_BASE_URL}/users/${userId}`,
    DELETE: (userId) => `${API_BASE_URL}/users/${userId}`
  },

  // Session endpoints
  SESSIONS: {
    LIST: `${API_BASE_URL}/sessions`,
    DETAILS: (sessionId) => `${API_BASE_URL}/sessions/${sessionId}`,
    CREATE: `${API_BASE_URL}/sessions`,
    END: (sessionId) => `${API_BASE_URL}/sessions/${sessionId}/end`
  },

  // Storage endpoints
  STORAGE: {
    TRANSCRIPT: `${API_BASE_URL}/storage/transcript`,
    SESSION_DATA: (sessionId) => `${API_BASE_URL}/storage/sessions/${sessionId}`
  },

  // Monitoring endpoints
  MONITORING: {
    HEALTH: `${API_BASE_URL}/monitoring/health`,
    PERFORMANCE: `${API_BASE_URL}/monitoring/performance`,
    RESOURCES: `${API_BASE_URL}/monitoring/resources`,
    ALERTS: `${API_BASE_URL}/monitoring/alerts`,
    UPDATE_ALERT: (alertId) => `${API_BASE_URL}/monitoring/alerts/${alertId}`,
    TRANSLATION_QUALITY: `${API_BASE_URL}/monitoring/translation-quality`,
    OFFLINE_METRICS: `${API_BASE_URL}/monitoring/offline-metrics`,
    ML_PERFORMANCE: `${API_BASE_URL}/monitoring/ml-performance`,
    USAGE_ANALYTICS: `${API_BASE_URL}/monitoring/usage-analytics`
  },

  // System endpoints
  SYSTEM: {
    HEALTH: `${API_BASE_URL}/health`
  },

  // Sync analytics endpoints
  SYNC_ANALYTICS: {
    STATUS: `${API_BASE_URL}/api/sync-analytics/status`,
    METRICS: `${API_BASE_URL}/api/sync-analytics/metrics`,
    QUALITY: `${API_BASE_URL}/api/sync-analytics/quality`,
    TRENDS: `${API_BASE_URL}/api/sync-analytics/trends`,
    ANOMALIES: `${API_BASE_URL}/api/sync-analytics/anomalies`,
    MANUAL_SYNC: `${API_BASE_URL}/api/sync-analytics/manual-sync`
  }
};

// API request helper
export const apiRequest = async (url, options = {}) => {
  try {
    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth token if available
    const token = localStorage.getItem('medtranslate_admin_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Make request
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Parse response
    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API request failed: ${url}`, error);
    throw error;
  }
};
