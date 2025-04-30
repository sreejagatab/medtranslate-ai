/**
 * Analytics Service for MedTranslate AI
 * 
 * This service handles tracking user interactions and events
 * for usability testing and analytics.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, apiRequest } from '../config/api';

// Storage keys
const STORAGE_KEYS = {
  ANALYTICS_ENABLED: 'medtranslate_analytics_enabled',
  PENDING_EVENTS: 'medtranslate_pending_events',
  SESSION_ID: 'medtranslate_session_id'
};

// Event types
export const EVENT_TYPES = {
  SCREEN_VIEW: 'screen_view',
  BUTTON_CLICK: 'button_click',
  COMPONENT_INTERACTION: 'component_interaction',
  FEATURE_USAGE: 'feature_usage',
  ERROR: 'error',
  PERFORMANCE: 'performance'
};

// Initialize analytics
let isEnabled = true;
let sessionId = null;

/**
 * Initialize analytics service
 * 
 * @returns {Promise<void>}
 */
export const initialize = async () => {
  try {
    // Check if analytics is enabled
    const enabled = await AsyncStorage.getItem(STORAGE_KEYS.ANALYTICS_ENABLED);
    isEnabled = enabled !== 'false';
    
    // Generate or retrieve session ID
    sessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      sessionId = generateSessionId();
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    }
    
    // Submit pending events
    await submitPendingEvents();
    
    // Track initialization event
    trackEvent(EVENT_TYPES.FEATURE_USAGE, 'analytics', 'initialize');
  } catch (error) {
    console.error('Error initializing analytics:', error);
  }
};

/**
 * Set analytics enabled state
 * 
 * @param {boolean} enabled - Whether analytics is enabled
 * @returns {Promise<void>}
 */
export const setEnabled = async (enabled) => {
  try {
    isEnabled = enabled;
    await AsyncStorage.setItem(STORAGE_KEYS.ANALYTICS_ENABLED, enabled ? 'true' : 'false');
    
    // Track enabled state change
    if (enabled) {
      trackEvent(EVENT_TYPES.FEATURE_USAGE, 'analytics', 'enabled');
    }
  } catch (error) {
    console.error('Error setting analytics enabled state:', error);
  }
};

/**
 * Track screen view
 * 
 * @param {string} screenName - Screen name
 * @param {Object} params - Additional parameters
 * @returns {Promise<void>}
 */
export const trackScreenView = async (screenName, params = {}) => {
  return trackEvent(EVENT_TYPES.SCREEN_VIEW, screenName, 'view', params);
};

/**
 * Track button click
 * 
 * @param {string} buttonName - Button name
 * @param {string} screenName - Screen name
 * @param {Object} params - Additional parameters
 * @returns {Promise<void>}
 */
export const trackButtonClick = async (buttonName, screenName, params = {}) => {
  return trackEvent(EVENT_TYPES.BUTTON_CLICK, buttonName, screenName, params);
};

/**
 * Track component interaction
 * 
 * @param {string} componentName - Component name
 * @param {string} interactionType - Interaction type
 * @param {Object} params - Additional parameters
 * @returns {Promise<void>}
 */
export const trackComponentInteraction = async (componentName, interactionType, params = {}) => {
  return trackEvent(EVENT_TYPES.COMPONENT_INTERACTION, componentName, interactionType, params);
};

/**
 * Track feature usage
 * 
 * @param {string} featureName - Feature name
 * @param {string} action - Action
 * @param {Object} params - Additional parameters
 * @returns {Promise<void>}
 */
export const trackFeatureUsage = async (featureName, action, params = {}) => {
  return trackEvent(EVENT_TYPES.FEATURE_USAGE, featureName, action, params);
};

/**
 * Track error
 * 
 * @param {string} errorType - Error type
 * @param {string} errorMessage - Error message
 * @param {Object} params - Additional parameters
 * @returns {Promise<void>}
 */
export const trackError = async (errorType, errorMessage, params = {}) => {
  return trackEvent(EVENT_TYPES.ERROR, errorType, errorMessage, params);
};

/**
 * Track performance
 * 
 * @param {string} metricName - Metric name
 * @param {number} value - Metric value
 * @param {Object} params - Additional parameters
 * @returns {Promise<void>}
 */
export const trackPerformance = async (metricName, value, params = {}) => {
  return trackEvent(EVENT_TYPES.PERFORMANCE, metricName, value.toString(), params);
};

/**
 * Track event
 * 
 * @param {string} eventType - Event type
 * @param {string} category - Event category
 * @param {string} action - Event action
 * @param {Object} params - Additional parameters
 * @returns {Promise<void>}
 */
export const trackEvent = async (eventType, category, action, params = {}) => {
  try {
    if (!isEnabled) return;
    
    // Create event object
    const event = {
      eventType,
      category,
      action,
      params,
      timestamp: new Date().toISOString(),
      sessionId: sessionId || generateSessionId()
    };
    
    // Try to submit event
    try {
      await submitEvent(event);
    } catch (error) {
      // If submission fails, store event locally
      await storeEvent(event);
    }
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

/**
 * Submit event to server
 * 
 * @param {Object} event - Event data
 * @returns {Promise<Object>} - API response
 */
const submitEvent = async (event) => {
  try {
    const response = await apiRequest(API_ENDPOINTS.ANALYTICS.TRACK, {
      method: 'POST',
      body: JSON.stringify(event)
    });
    
    return response;
  } catch (error) {
    console.warn('Failed to submit event:', error);
    throw error;
  }
};

/**
 * Store event locally
 * 
 * @param {Object} event - Event data
 * @returns {Promise<void>}
 */
const storeEvent = async (event) => {
  try {
    // Get existing events
    const existingEvents = await getPendingEvents();
    
    // Add new event
    const updatedEvents = [...existingEvents, event];
    
    // Store updated events
    await AsyncStorage.setItem(
      STORAGE_KEYS.PENDING_EVENTS,
      JSON.stringify(updatedEvents)
    );
  } catch (error) {
    console.error('Error storing event:', error);
  }
};

/**
 * Get pending events
 * 
 * @returns {Promise<Array<Object>>} - Pending events
 */
const getPendingEvents = async () => {
  try {
    const pendingEvents = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_EVENTS);
    return pendingEvents ? JSON.parse(pendingEvents) : [];
  } catch (error) {
    console.error('Error getting pending events:', error);
    return [];
  }
};

/**
 * Submit pending events
 * 
 * @returns {Promise<Object>} - Result with success count and failure count
 */
export const submitPendingEvents = async () => {
  try {
    if (!isEnabled) return { success: true, count: 0 };
    
    // Get pending events
    const pendingEvents = await getPendingEvents();
    
    if (pendingEvents.length === 0) {
      return { success: true, count: 0 };
    }
    
    // Submit events in batches
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < pendingEvents.length; i += batchSize) {
      batches.push(pendingEvents.slice(i, i + batchSize));
    }
    
    // Track success and failure
    let successCount = 0;
    let failureCount = 0;
    const stillPending = [];
    
    // Submit each batch
    for (const batch of batches) {
      try {
        await apiRequest(API_ENDPOINTS.ANALYTICS.BATCH, {
          method: 'POST',
          body: JSON.stringify({ events: batch })
        });
        
        successCount += batch.length;
      } catch (error) {
        console.warn('Failed to submit event batch:', error);
        failureCount += batch.length;
        stillPending.push(...batch);
      }
    }
    
    // Update pending events
    await AsyncStorage.setItem(
      STORAGE_KEYS.PENDING_EVENTS,
      JSON.stringify(stillPending)
    );
    
    return {
      success: failureCount === 0,
      successCount,
      failureCount,
      remaining: stillPending.length
    };
  } catch (error) {
    console.error('Error submitting pending events:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate session ID
 * 
 * @returns {string} - Session ID
 */
const generateSessionId = () => {
  return 'session_' + Math.random().toString(36).substring(2, 15);
};
