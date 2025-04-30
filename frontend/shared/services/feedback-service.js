/**
 * Feedback Service for MedTranslate AI
 * 
 * This service handles the collection and submission of user feedback
 * during usability testing.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, apiRequest } from '../config/api';

// Storage keys
const STORAGE_KEYS = {
  PENDING_FEEDBACK: 'medtranslate_pending_feedback',
  FEEDBACK_SETTINGS: 'medtranslate_feedback_settings'
};

/**
 * Submit feedback to the server
 * 
 * @param {Object} feedback - Feedback data
 * @returns {Promise<Object>} - API response
 */
export const submitFeedback = async (feedback) => {
  try {
    // Add device info
    const enhancedFeedback = {
      ...feedback,
      deviceInfo: await getDeviceInfo()
    };
    
    // Try to submit feedback to server
    try {
      const response = await apiRequest(API_ENDPOINTS.FEEDBACK.SUBMIT, {
        method: 'POST',
        body: JSON.stringify(enhancedFeedback)
      });
      
      // Log successful submission
      console.log('Feedback submitted successfully:', response);
      
      return response;
    } catch (error) {
      // If submission fails, store feedback locally for later submission
      console.warn('Failed to submit feedback, storing locally:', error);
      await storePendingFeedback(enhancedFeedback);
      
      // Rethrow error
      throw error;
    }
  } catch (error) {
    console.error('Error in submitFeedback:', error);
    throw error;
  }
};

/**
 * Store pending feedback locally
 * 
 * @param {Object} feedback - Feedback data
 * @returns {Promise<void>}
 */
export const storePendingFeedback = async (feedback) => {
  try {
    // Get existing pending feedback
    const existingFeedback = await getPendingFeedback();
    
    // Add new feedback
    const updatedFeedback = [...existingFeedback, feedback];
    
    // Store updated feedback
    await AsyncStorage.setItem(
      STORAGE_KEYS.PENDING_FEEDBACK,
      JSON.stringify(updatedFeedback)
    );
  } catch (error) {
    console.error('Error storing pending feedback:', error);
    throw error;
  }
};

/**
 * Get pending feedback
 * 
 * @returns {Promise<Array<Object>>} - Pending feedback
 */
export const getPendingFeedback = async () => {
  try {
    const pendingFeedback = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_FEEDBACK);
    return pendingFeedback ? JSON.parse(pendingFeedback) : [];
  } catch (error) {
    console.error('Error getting pending feedback:', error);
    return [];
  }
};

/**
 * Submit pending feedback
 * 
 * @returns {Promise<Object>} - Result with success count and failure count
 */
export const submitPendingFeedback = async () => {
  try {
    // Get pending feedback
    const pendingFeedback = await getPendingFeedback();
    
    if (pendingFeedback.length === 0) {
      return { success: true, successCount: 0, failureCount: 0 };
    }
    
    // Track success and failure
    let successCount = 0;
    let failureCount = 0;
    const stillPending = [];
    
    // Submit each feedback
    for (const feedback of pendingFeedback) {
      try {
        await apiRequest(API_ENDPOINTS.FEEDBACK.SUBMIT, {
          method: 'POST',
          body: JSON.stringify(feedback)
        });
        
        successCount++;
      } catch (error) {
        console.warn('Failed to submit pending feedback:', error);
        failureCount++;
        stillPending.push(feedback);
      }
    }
    
    // Update pending feedback
    await AsyncStorage.setItem(
      STORAGE_KEYS.PENDING_FEEDBACK,
      JSON.stringify(stillPending)
    );
    
    return {
      success: failureCount === 0,
      successCount,
      failureCount,
      remaining: stillPending.length
    };
  } catch (error) {
    console.error('Error submitting pending feedback:', error);
    throw error;
  }
};

/**
 * Get feedback settings
 * 
 * @returns {Promise<Object>} - Feedback settings
 */
export const getFeedbackSettings = async () => {
  try {
    const settings = await AsyncStorage.getItem(STORAGE_KEYS.FEEDBACK_SETTINGS);
    return settings ? JSON.parse(settings) : getDefaultFeedbackSettings();
  } catch (error) {
    console.error('Error getting feedback settings:', error);
    return getDefaultFeedbackSettings();
  }
};

/**
 * Update feedback settings
 * 
 * @param {Object} settings - New settings
 * @returns {Promise<void>}
 */
export const updateFeedbackSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.FEEDBACK_SETTINGS,
      JSON.stringify(settings)
    );
  } catch (error) {
    console.error('Error updating feedback settings:', error);
    throw error;
  }
};

/**
 * Get default feedback settings
 * 
 * @returns {Object} - Default settings
 */
const getDefaultFeedbackSettings = () => {
  return {
    enabled: true,
    promptFrequency: 'medium', // low, medium, high
    lastPrompt: null,
    sessionCount: 0,
    promptThreshold: 3 // Show prompt every N sessions
  };
};

/**
 * Get device info
 * 
 * @returns {Promise<Object>} - Device info
 */
const getDeviceInfo = async () => {
  try {
    // In a real app, use a library like react-native-device-info
    // For this example, we'll return basic info
    return {
      platform: 'web', // or 'ios', 'android'
      appVersion: '1.0.0',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return {};
  }
};
