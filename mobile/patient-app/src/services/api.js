/**
 * API Service for MedTranslate AI Mobile App
 * 
 * This module provides functions for interacting with the MedTranslate AI API.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../utils/config';
import { getSessionToken } from '../utils/secureStore';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // Get token from secure storage
      const token = await getSessionToken();
      
      // If token exists, add it to the request headers
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
      // In a real app, you would redirect to login here
    }
    
    return Promise.reject(error);
  }
);

/**
 * Joins a translation session
 * 
 * @param {string} sessionCode - The 6-digit session code
 * @returns {Promise<object>} - The session information
 */
export const joinSession = async (sessionCode) => {
  try {
    // In a real app, this would call the API
    // For demo purposes, we'll simulate a successful response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if session code is valid (for demo purposes)
    if (sessionCode === '123456') {
      const sessionId = 'session-123';
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiJzZXNzaW9uLTEyMyIsImxhbmd1YWdlIjoiZXMiLCJpYXQiOjE2MTk3MjYxMjMsImV4cCI6MTYxOTgxMjUyM30.abcdefghijklmnopqrstuvwxyz';
      
      // Store session info for offline use
      await AsyncStorage.setItem(`session_${sessionCode}`, sessionId);
      
      return {
        success: true,
        token,
        sessionId
      };
    } else {
      return {
        success: false,
        error: 'Invalid session code'
      };
    }
  } catch (error) {
    console.error('Error joining session:', error);
    return {
      success: false,
      error: error.message || 'Failed to join session'
    };
  }
};

/**
 * Validates a session token
 * 
 * @param {string} token - The session token
 * @returns {Promise<object>} - The validation result
 */
export const validateSession = async (token) => {
  try {
    // In a real app, this would call the API
    // For demo purposes, we'll simulate a successful response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if token is valid (for demo purposes)
    if (token && token.startsWith('eyJ')) {
      return {
        success: true,
        sessionId: 'session-123',
        language: 'es'
      };
    } else {
      return {
        success: false,
        error: 'Invalid token'
      };
    }
  } catch (error) {
    console.error('Error validating session:', error);
    return {
      success: false,
      error: error.message || 'Failed to validate session'
    };
  }
};

/**
 * Translates text
 * 
 * @param {string} text - The text to translate
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} sessionId - The session ID
 * @returns {Promise<object>} - The translation result
 */
export const translateText = async (text, sourceLanguage, targetLanguage, sessionId) => {
  try {
    // In a real app, this would call the API
    // For demo purposes, we'll simulate a successful response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simple mock translations for demo purposes
    const mockTranslations = {
      'en-es-hello': 'hola',
      'en-es-goodbye': 'adiós',
      'en-es-how are you': 'cómo estás',
      'en-es-thank you': 'gracias',
      'en-es-yes': 'sí',
      'en-es-no': 'no',
      'en-es-please': 'por favor',
      'en-es-sorry': 'lo siento',
      'en-es-excuse me': 'disculpe',
      'en-es-help': 'ayuda',
      'en-es-doctor': 'médico',
      'en-es-hospital': 'hospital',
      'en-es-pain': 'dolor',
      'en-es-medicine': 'medicina',
      'en-es-allergy': 'alergia'
    };
    
    const key = `${sourceLanguage}-${targetLanguage}-${text.toLowerCase()}`;
    const translation = mockTranslations[key] || `[Translation of "${text}"]`;
    
    return {
      success: true,
      translation,
      sourceLanguage,
      targetLanguage,
      confidence: 0.92
    };
  } catch (error) {
    console.error('Error translating text:', error);
    return {
      success: false,
      error: error.message || 'Failed to translate text'
    };
  }
};

/**
 * Sends feedback for a translation
 * 
 * @param {string} translationId - The translation ID
 * @param {number} rating - The rating (1-5)
 * @param {string} comment - The feedback comment
 * @param {string} sessionId - The session ID
 * @returns {Promise<object>} - The feedback result
 */
export const sendFeedback = async (translationId, rating, comment, sessionId) => {
  try {
    // In a real app, this would call the API
    // For demo purposes, we'll simulate a successful response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      feedbackId: `feedback-${Date.now()}`
    };
  } catch (error) {
    console.error('Error sending feedback:', error);
    return {
      success: false,
      error: error.message || 'Failed to send feedback'
    };
  }
};

/**
 * Registers a push notification token
 * 
 * @param {string} token - The push notification token
 * @returns {Promise<object>} - The registration result
 */
export const registerPushToken = async (token) => {
  try {
    // In a real app, this would call the API
    // For demo purposes, we'll simulate a successful response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error registering push token:', error);
    return {
      success: false,
      error: error.message || 'Failed to register push token'
    };
  }
};

/**
 * Gets notifications
 * 
 * @returns {Promise<object>} - The notifications
 */
export const getNotifications = async () => {
  try {
    // In a real app, this would call the API
    // For demo purposes, we'll simulate a successful response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      notifications: [
        {
          id: '1',
          title: 'New Session',
          body: 'Dr. Smith has started a new translation session',
          data: {
            type: 'session',
            sessionId: 'session-123',
            sessionCode: '123456'
          },
          read: false,
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          title: 'System Update',
          body: 'MedTranslate AI has been updated to version 1.2.0',
          data: {
            type: 'system',
            version: '1.2.0'
          },
          read: true,
          timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        }
      ]
    };
  } catch (error) {
    console.error('Error getting notifications:', error);
    return {
      success: false,
      error: error.message || 'Failed to get notifications'
    };
  }
};

/**
 * Syncs the offline queue
 * 
 * @returns {Promise<object>} - The sync result
 */
export const syncOfflineQueue = async () => {
  try {
    // In a real app, this would call the API
    // For demo purposes, we'll simulate a successful response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      syncedItems: 5,
      failedItems: 0
    };
  } catch (error) {
    console.error('Error syncing offline queue:', error);
    return {
      success: false,
      error: error.message || 'Failed to sync offline queue'
    };
  }
};

/**
 * Gets edge devices
 * 
 * @returns {Promise<object>} - The edge devices
 */
export const getEdgeDevices = async () => {
  try {
    // In a real app, this would call the API
    // For demo purposes, we'll simulate a successful response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      devices: [
        {
          id: 'edge-1',
          name: 'Edge Device 1',
          ipAddress: '192.168.1.100',
          status: 'online',
          batteryLevel: 0.85,
          lastSyncTime: new Date().toISOString(),
          modelVersions: {
            translation: '1.2.0',
            speech: '1.1.0'
          }
        },
        {
          id: 'edge-2',
          name: 'Edge Device 2',
          ipAddress: '192.168.1.101',
          status: 'offline',
          batteryLevel: 0.45,
          lastSyncTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          modelVersions: {
            translation: '1.1.0',
            speech: '1.0.0'
          }
        }
      ]
    };
  } catch (error) {
    console.error('Error getting edge devices:', error);
    return {
      success: false,
      error: error.message || 'Failed to get edge devices'
    };
  }
};

export default api;
