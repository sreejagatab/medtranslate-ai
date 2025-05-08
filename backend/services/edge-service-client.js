/**
 * Edge Service Client for MedTranslate AI
 *
 * This service client communicates with the edge device to get
 * system status information and perform system control operations.
 * It also handles secure model deployment with encryption.
 */

const axios = require('axios');
const config = require('../config');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const zlib = require('zlib');

// Promisify zlib functions
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

// Edge API base URL
const EDGE_API_BASE_URL = process.env.EDGE_API_BASE_URL || config.edgeApiBaseUrl || 'http://localhost:3001/api';

// Encryption configuration
const ENCRYPTION_CONFIG = {
  enabled: process.env.MODEL_ENCRYPTION_ENABLED !== 'false', // Enable by default
  algorithm: process.env.MODEL_ENCRYPTION_ALGORITHM || 'aes-256-gcm',
  keySize: 32, // 256 bits
  ivSize: 16 // 128 bits
};

// Create axios instance for edge API
const edgeApiClient = axios.create({
  baseURL: EDGE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.EDGE_API_KEY || 'dev-api-key'
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

/**
 * Encrypt a model for secure deployment
 *
 * @param {Buffer} modelData - Model data to encrypt
 * @returns {Promise<Object>} - Encryption result with encryptedData, iv, and authTag
 */
exports.encryptModel = async (modelData) => {
  try {
    if (!ENCRYPTION_CONFIG.enabled) {
      console.warn('Model encryption is disabled. Returning unencrypted data.');
      return { encryptedData: modelData };
    }

    // Generate encryption key
    // In production, this would be stored in a secure key management service
    const key = process.env.MODEL_ENCRYPTION_KEY ||
      crypto.randomBytes(ENCRYPTION_CONFIG.keySize).toString('hex');

    // Convert key to Buffer if it's a string
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');

    // Generate random IV
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivSize);

    // Create cipher
    const cipher = crypto.createCipheriv(
      ENCRYPTION_CONFIG.algorithm,
      keyBuffer,
      iv
    );

    // Encrypt data
    const encryptedData = Buffer.concat([
      cipher.update(modelData),
      cipher.final()
    ]);

    // Get auth tag (for GCM mode)
    const authTag = cipher.getAuthTag();

    return {
      encryptedData,
      iv,
      authTag
    };
  } catch (error) {
    console.error('Error encrypting model:', error);
    throw error;
  }
};

/**
 * Decrypt a model
 *
 * @param {Object} options - Decryption options
 * @param {Buffer} options.encryptedData - Encrypted model data
 * @param {Buffer|string} options.iv - Initialization vector
 * @param {Buffer|string} options.authTag - Authentication tag (for GCM mode)
 * @returns {Promise<Buffer>} - Decrypted model data
 */
exports.decryptModel = async (options) => {
  try {
    const { encryptedData, iv, authTag } = options;

    if (!ENCRYPTION_CONFIG.enabled) {
      console.warn('Model encryption is disabled. Returning data as-is.');
      return encryptedData;
    }

    // Get encryption key
    const key = process.env.MODEL_ENCRYPTION_KEY ||
      crypto.randomBytes(ENCRYPTION_CONFIG.keySize).toString('hex');

    // Convert key to Buffer if it's a string
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');

    // Convert IV and authTag to Buffer if they're strings
    const ivBuffer = Buffer.isBuffer(iv) ? iv : Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.isBuffer(authTag) ? authTag : Buffer.from(authTag, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      keyBuffer,
      ivBuffer
    );

    // Set auth tag (for GCM mode)
    decipher.setAuthTag(authTagBuffer);

    // Decrypt data
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    return decryptedData;
  } catch (error) {
    console.error('Error decrypting model:', error);
    throw error;
  }
};

/**
 * Verify model integrity
 *
 * @param {Object} options - Verification options
 * @param {Buffer} options.modelData - Model data
 * @param {string} options.checksum - Expected checksum
 * @returns {boolean} - Whether the model is valid
 */
exports.verifyModelIntegrity = (options) => {
  try {
    const { modelData, checksum } = options;

    // Calculate checksum
    const calculatedChecksum = crypto.createHash('sha256').update(modelData).digest('hex');

    // Compare checksums
    return calculatedChecksum === checksum;
  } catch (error) {
    console.error('Error verifying model integrity:', error);
    return false;
  }
};

/**
 * Deploy a model to an edge device
 *
 * @param {Object} options - Deployment options
 * @param {string} options.deviceId - Edge device ID
 * @param {string} options.modelPath - Path to model file
 * @param {string} options.modelType - Type of model (translation, prediction, etc.)
 * @param {Object} options.metadata - Model metadata
 * @returns {Promise<Object>} - Deployment result
 */
exports.deployModel = async (options) => {
  try {
    const { deviceId, modelPath, modelType, metadata } = options;

    // Read model file
    const modelBuffer = fs.readFileSync(modelPath);

    // Compress model
    const compressedModel = await gzipAsync(modelBuffer);

    // Encrypt model if enabled
    let modelData;
    let encryptionMetadata = {};

    if (ENCRYPTION_CONFIG.enabled) {
      const encryptionResult = await exports.encryptModel(compressedModel);
      modelData = encryptionResult.encryptedData;
      encryptionMetadata = {
        iv: encryptionResult.iv.toString('hex'),
        authTag: encryptionResult.authTag.toString('hex'),
        algorithm: ENCRYPTION_CONFIG.algorithm
      };
    } else {
      modelData = compressedModel;
    }

    // Calculate checksum for integrity verification
    const checksum = crypto.createHash('sha256').update(modelBuffer).digest('hex');

    // Create deployment payload
    const payload = {
      deviceId,
      modelType,
      modelData: modelData.toString('base64'),
      metadata: {
        ...metadata,
        encryption: encryptionMetadata,
        checksum,
        originalSize: modelBuffer.length,
        compressedSize: compressedModel.length,
        encryptedSize: modelData.length,
        timestamp: new Date().toISOString()
      }
    };

    // Send deployment request
    const response = await edgeApiClient.post('/models/deploy', payload);

    return response.data;
  } catch (error) {
    console.error('Error deploying model:', error);
    throw error;
  }
};

/**
 * Get deployed models for a device
 *
 * @param {string} deviceId - Edge device ID
 * @returns {Promise<Array>} - Deployed models
 */
exports.getDeployedModels = async (deviceId) => {
  try {
    const response = await edgeApiClient.get(`/devices/${deviceId}/models`);
    return response.data;
  } catch (error) {
    console.error('Error getting deployed models:', error);
    throw error;
  }
};
