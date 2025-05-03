/**
 * Feedback Service for MedTranslate AI Admin Dashboard
 * 
 * This service handles API calls related to feedback analysis.
 */

import { API_ENDPOINTS } from '../config/api';
import { getAuthToken } from './auth-service';

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
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error getting feedback stats: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting translation feedback statistics:', error);
    throw error;
  }
};

/**
 * Get confidence threshold adjustments history
 * 
 * @param {Object} options - Query options
 * @param {string} options.context - Optional medical context filter
 * @param {string} options.startDate - Optional start date filter
 * @param {string} options.endDate - Optional end date filter
 * @returns {Promise<Array>} - Threshold adjustment history
 */
export const getConfidenceThresholdHistory = async (options = {}) => {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    
    if (options.context) {
      queryParams.append('context', options.context);
    }
    
    if (options.startDate) {
      queryParams.append('startDate', options.startDate);
    }
    
    if (options.endDate) {
      queryParams.append('endDate', options.endDate);
    }
    
    const queryString = queryParams.toString();
    const url = `${API_ENDPOINTS.FEEDBACK.THRESHOLD_HISTORY}${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error getting threshold history: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting confidence threshold history:', error);
    throw error;
  }
};

/**
 * Get current confidence thresholds
 * 
 * @returns {Promise<Object>} - Current confidence thresholds
 */
export const getCurrentConfidenceThresholds = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.FEEDBACK.CURRENT_THRESHOLDS, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error getting current thresholds: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting current confidence thresholds:', error);
    throw error;
  }
};

/**
 * Reset confidence thresholds to defaults
 * 
 * @param {string} context - Optional context to reset (if not provided, resets all)
 * @returns {Promise<Object>} - Result
 */
export const resetConfidenceThresholds = async (context = null) => {
  try {
    const url = context 
      ? `${API_ENDPOINTS.FEEDBACK.RESET_THRESHOLDS}?context=${context}`
      : API_ENDPOINTS.FEEDBACK.RESET_THRESHOLDS;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error resetting thresholds: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error resetting confidence thresholds:', error);
    throw error;
  }
};
