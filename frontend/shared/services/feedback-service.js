/**
 * Feedback Service for MedTranslate AI
 *
 * This service handles the collection and submission of user feedback
 * during usability testing and for translation quality feedback.
 *
 * Translation quality feedback is used to improve the adaptive confidence
 * thresholds and translation quality.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, apiRequest } from '../config/api';

// Storage keys
const STORAGE_KEYS = {
  PENDING_FEEDBACK: 'medtranslate_pending_feedback',
  FEEDBACK_SETTINGS: 'medtranslate_feedback_settings',
  PENDING_TRANSLATION_FEEDBACK: 'medtranslate_pending_translation_feedback'
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
 * Submit translation feedback
 *
 * @param {Object} feedback - Translation feedback data
 * @param {string} feedback.translationId - Translation ID
 * @param {number} feedback.rating - Rating (1-5)
 * @param {Array<string>} feedback.issues - Issue types
 * @param {string} feedback.comment - Additional comments
 * @returns {Promise<Object>} - API response
 */
export const submitTranslationFeedback = async (feedback) => {
  try {
    // Add device info and timestamp
    const enhancedFeedback = {
      ...feedback,
      deviceInfo: await getDeviceInfo(),
      timestamp: new Date().toISOString()
    };

    // Try to submit feedback to server
    try {
      const response = await apiRequest(API_ENDPOINTS.FEEDBACK.TRANSLATION, {
        method: 'POST',
        body: JSON.stringify(enhancedFeedback)
      });

      // Log successful submission
      console.log('Translation feedback submitted successfully:', response);

      return response;
    } catch (error) {
      // If submission fails, store feedback locally for later submission
      console.warn('Failed to submit translation feedback, storing locally:', error);
      await storePendingTranslationFeedback(enhancedFeedback);

      // Rethrow error
      throw error;
    }
  } catch (error) {
    console.error('Error in submitTranslationFeedback:', error);
    throw error;
  }
};

/**
 * Store pending translation feedback locally
 *
 * @param {Object} feedback - Translation feedback data
 * @returns {Promise<void>}
 */
export const storePendingTranslationFeedback = async (feedback) => {
  try {
    // Get existing pending feedback
    const existingFeedback = await getPendingTranslationFeedback();

    // Add new feedback
    const updatedFeedback = [...existingFeedback, feedback];

    // Store updated feedback
    await AsyncStorage.setItem(
      STORAGE_KEYS.PENDING_TRANSLATION_FEEDBACK,
      JSON.stringify(updatedFeedback)
    );
  } catch (error) {
    console.error('Error storing pending translation feedback:', error);
    throw error;
  }
};

/**
 * Get pending translation feedback
 *
 * @returns {Promise<Array<Object>>} - Pending translation feedback
 */
export const getPendingTranslationFeedback = async () => {
  try {
    const pendingFeedback = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_TRANSLATION_FEEDBACK);
    return pendingFeedback ? JSON.parse(pendingFeedback) : [];
  } catch (error) {
    console.error('Error getting pending translation feedback:', error);
    return [];
  }
};

/**
 * Submit pending translation feedback
 *
 * @returns {Promise<Object>} - Result with success count and failure count
 */
export const submitPendingTranslationFeedback = async () => {
  try {
    // Get pending feedback
    const pendingFeedback = await getPendingTranslationFeedback();

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
        await apiRequest(API_ENDPOINTS.FEEDBACK.TRANSLATION, {
          method: 'POST',
          body: JSON.stringify(feedback)
        });

        successCount++;
      } catch (error) {
        console.warn('Failed to submit pending translation feedback:', error);
        failureCount++;
        stillPending.push(feedback);
      }
    }

    // Update pending feedback
    await AsyncStorage.setItem(
      STORAGE_KEYS.PENDING_TRANSLATION_FEEDBACK,
      JSON.stringify(stillPending)
    );

    return {
      success: failureCount === 0,
      successCount,
      failureCount,
      remaining: stillPending.length
    };
  } catch (error) {
    console.error('Error submitting pending translation feedback:', error);
    throw error;
  }
};

/**
 * Get translation feedback statistics
 *
 * @param {Object} options - Query options
 * @param {string} options.sessionId - Optional session ID filter
 * @param {string} options.startDate - Optional start date filter
 * @param {string} options.endDate - Optional end date filter
 * @returns {Promise<Object>} - Feedback statistics
 */
export const getTranslationFeedbackStats = async (options = {}) => {
  try {
    // Build query string
    const queryParams = new URLSearchParams();

    if (options.sessionId) {
      queryParams.append('sessionId', options.sessionId);
    }

    if (options.startDate) {
      queryParams.append('startDate', options.startDate);
    }

    if (options.endDate) {
      queryParams.append('endDate', options.endDate);
    }

    const queryString = queryParams.toString();
    const url = `${API_ENDPOINTS.FEEDBACK.TRANSLATION_STATS}${queryString ? `?${queryString}` : ''}`;

    const response = await apiRequest(url, {
      method: 'GET'
    });

    return response;
  } catch (error) {
    console.error('Error getting translation feedback stats:', error);
    throw error;
  }
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
