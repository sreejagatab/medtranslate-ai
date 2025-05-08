/**
 * Offline Service for MedTranslate AI
 *
 * This service provides functionality for offline operations, including:
 * - Offline readiness information
 * - Manual sync operations
 * - Preparing for offline mode
 * - Storage optimization
 * - Auto-sync configuration
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';

// API endpoints
const ENDPOINTS = {
  OFFLINE_READINESS: '/api/edge/offline-readiness',
  MANUAL_SYNC: '/api/edge/sync',
  PREPARE_OFFLINE: '/api/edge/prepare-offline',
  STORAGE_INFO: '/api/edge/storage-info',
  OPTIMIZE_STORAGE: '/api/edge/optimize-storage',
  AUTO_SYNC: '/api/edge/auto-sync'
};

/**
 * Get offline readiness information
 *
 * @returns {Promise<Object>} - Offline readiness information
 */
const getOfflineReadiness = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}${ENDPOINTS.OFFLINE_READINESS}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching offline readiness:', error);
    // Return default values on error
    return {
      readinessPercentage: 0,
      offlineRisk: 0,
      predictedDurationHours: 0,
      lastUpdated: Date.now()
    };
  }
};

/**
 * Perform manual sync
 *
 * @returns {Promise<Object>} - Sync result
 */
const manualSync = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.MANUAL_SYNC}`);
    return response.data;
  } catch (error) {
    console.error('Error performing manual sync:', error);
    throw error;
  }
};

/**
 * Prepare for offline mode
 *
 * @param {Object} options - Preparation options
 * @param {boolean} options.forcePrepare - Force preparation even if not needed
 * @param {boolean} options.highPriority - High priority preparation
 * @param {Function} options.progressCallback - Callback for progress updates (progress, stage)
 * @returns {Promise<Object>} - Preparation result
 */
const prepareForOffline = async (options = {}) => {
  try {
    // Extract the progress callback
    const { progressCallback, ...requestOptions } = options;

    // If we have a progress callback, simulate progress updates
    // In a real implementation, this would use server-sent events or WebSocket
    if (typeof progressCallback === 'function') {
      // Initial progress
      progressCallback(0, 'Initializing');

      // Make the actual request
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.PREPARE_OFFLINE}`, requestOptions);

      // Simulate progress updates while waiting for the server
      // In a real implementation, the server would send progress updates
      const simulateProgress = async () => {
        // Stages of preparation
        const stages = [
          { progress: 20, stage: 'Checking requirements' },
          { progress: 40, stage: 'Caching medical data' },
          { progress: 60, stage: 'Optimizing storage' },
          { progress: 80, stage: 'Preparing translation models' },
          { progress: 100, stage: 'Finalizing offline readiness' }
        ];

        // Simulate progress through each stage
        for (const stage of stages) {
          // Wait a bit before updating to the next stage
          await new Promise(resolve => setTimeout(resolve, 1000));
          progressCallback(stage.progress, stage.stage);
        }
      };

      // Start progress simulation
      await simulateProgress();

      return response.data;
    } else {
      // If no progress callback, just make the request
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.PREPARE_OFFLINE}`, options);
      return response.data;
    }
  } catch (error) {
    console.error('Error preparing for offline:', error);
    throw error;
  }
};

/**
 * Get storage information
 *
 * @returns {Promise<Object>} - Storage information
 */
const getStorageInfo = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}${ENDPOINTS.STORAGE_INFO}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching storage info:', error);
    // Return default values on error
    return {
      usagePercentage: 0,
      currentUsageMB: 0,
      quotaMB: 0,
      reservedForOfflineMB: 0,
      lastOptimizationTime: null
    };
  }
};

/**
 * Optimize storage
 *
 * @param {Object} options - Optimization options
 * @param {boolean} options.force - Force optimization even if not needed
 * @returns {Promise<Object>} - Optimization result
 */
const optimizeStorage = async (options = {}) => {
  try {
    const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.OPTIMIZE_STORAGE}`, options);
    return response.data;
  } catch (error) {
    console.error('Error optimizing storage:', error);
    throw error;
  }
};

/**
 * Set auto-sync configuration
 *
 * @param {boolean} enabled - Whether auto-sync is enabled
 * @returns {Promise<Object>} - Configuration result
 */
const setAutoSync = async (enabled) => {
  try {
    const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.AUTO_SYNC}`, { enabled });
    return response.data;
  } catch (error) {
    console.error('Error setting auto-sync:', error);
    throw error;
  }
};

// Export the service
export default {
  getOfflineReadiness,
  manualSync,
  prepareForOffline,
  getStorageInfo,
  optimizeStorage,
  setAutoSync
};
