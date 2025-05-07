/**
 * Edge Service Client for MedTranslate AI
 * 
 * This service client communicates with the edge device to get
 * system status information and perform system control operations.
 */

const axios = require('axios');
const config = require('../config');

// Edge API base URL
const EDGE_API_BASE_URL = process.env.EDGE_API_BASE_URL || config.edgeApiBaseUrl || 'http://localhost:3001/api';

// Create axios instance for edge API
const edgeApiClient = axios.create({
  baseURL: EDGE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Get cache statistics
 * 
 * @returns {Promise<Object>} Cache statistics
 */
exports.getCacheStats = async () => {
  try {
    const response = await edgeApiClient.get('/cache/stats');
    return response.data;
  } catch (error) {
    console.error('Error getting cache stats from edge device:', error);
    throw error;
  }
};

/**
 * Clear cache
 * 
 * @returns {Promise<Object>} Clear result
 */
exports.clearCache = async () => {
  try {
    const response = await edgeApiClient.post('/cache/clear');
    return response.data;
  } catch (error) {
    console.error('Error clearing cache on edge device:', error);
    throw error;
  }
};

/**
 * Refresh cache
 * 
 * @returns {Promise<Object>} Refresh result
 */
exports.refreshCache = async () => {
  try {
    const response = await edgeApiClient.post('/cache/refresh');
    return response.data;
  } catch (error) {
    console.error('Error refreshing cache on edge device:', error);
    throw error;
  }
};

/**
 * Get ML performance metrics
 * 
 * @returns {Promise<Object>} ML performance metrics
 */
exports.getMLPerformance = async () => {
  try {
    const response = await edgeApiClient.get('/ml/performance');
    return response.data;
  } catch (error) {
    console.error('Error getting ML performance metrics from edge device:', error);
    throw error;
  }
};

/**
 * Get ML performance history
 * 
 * @returns {Promise<Array>} ML performance history
 */
exports.getMLPerformanceHistory = async () => {
  try {
    const response = await edgeApiClient.get('/ml/performance/history');
    return response.data;
  } catch (error) {
    console.error('Error getting ML performance history from edge device:', error);
    throw error;
  }
};

/**
 * Train ML models
 * 
 * @returns {Promise<Object>} Training result
 */
exports.trainModels = async () => {
  try {
    const response = await edgeApiClient.post('/ml/train');
    return response.data;
  } catch (error) {
    console.error('Error training ML models on edge device:', error);
    throw error;
  }
};

/**
 * Configure ML models
 * 
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Configuration result
 */
exports.configureModels = async (options) => {
  try {
    const response = await edgeApiClient.post('/ml/configure', options);
    return response.data;
  } catch (error) {
    console.error('Error configuring ML models on edge device:', error);
    throw error;
  }
};

/**
 * Get storage information
 * 
 * @returns {Promise<Object>} Storage information
 */
exports.getStorageInfo = async () => {
  try {
    const response = await edgeApiClient.get('/storage/info');
    return response.data;
  } catch (error) {
    console.error('Error getting storage information from edge device:', error);
    throw error;
  }
};

/**
 * Optimize storage
 * 
 * @param {Object} options - Optimization options
 * @returns {Promise<Object>} Optimization result
 */
exports.optimizeStorage = async (options) => {
  try {
    const response = await edgeApiClient.post('/storage/optimize', options);
    return response.data;
  } catch (error) {
    console.error('Error optimizing storage on edge device:', error);
    throw error;
  }
};

/**
 * Get sync status
 * 
 * @returns {Promise<Object>} Sync status
 */
exports.getSyncStatus = async () => {
  try {
    const response = await edgeApiClient.get('/sync/status');
    return response.data;
  } catch (error) {
    console.error('Error getting sync status from edge device:', error);
    throw error;
  }
};

/**
 * Get sync history
 * 
 * @returns {Promise<Array>} Sync history
 */
exports.getSyncHistory = async () => {
  try {
    const response = await edgeApiClient.get('/sync/history');
    return response.data;
  } catch (error) {
    console.error('Error getting sync history from edge device:', error);
    throw error;
  }
};

/**
 * Perform manual sync
 * 
 * @returns {Promise<Object>} Sync result
 */
exports.manualSync = async () => {
  try {
    const response = await edgeApiClient.post('/sync/manual');
    return response.data;
  } catch (error) {
    console.error('Error performing manual sync on edge device:', error);
    throw error;
  }
};

/**
 * Toggle auto-sync
 * 
 * @param {boolean} enabled - Whether auto-sync is enabled
 * @returns {Promise<Object>} Toggle result
 */
exports.toggleAutoSync = async (enabled) => {
  try {
    const response = await edgeApiClient.post('/sync/toggle', { enabled });
    return response.data;
  } catch (error) {
    console.error('Error toggling auto-sync on edge device:', error);
    throw error;
  }
};

/**
 * Prepare for offline mode
 * 
 * @returns {Promise<Object>} Preparation result
 */
exports.prepareForOffline = async () => {
  try {
    const response = await edgeApiClient.post('/offline/prepare');
    return response.data;
  } catch (error) {
    console.error('Error preparing for offline mode on edge device:', error);
    throw error;
  }
};

/**
 * Get device performance metrics
 * 
 * @returns {Promise<Object>} Device performance metrics
 */
exports.getDevicePerformance = async () => {
  try {
    const response = await edgeApiClient.get('/device/performance');
    return response.data;
  } catch (error) {
    console.error('Error getting device performance metrics from edge device:', error);
    throw error;
  }
};
