/**
 * Storage Controller for MedTranslate AI
 * 
 * This controller handles storage-related operations, including
 * getting storage information and optimizing storage.
 */

// Import edge service client
const edgeServiceClient = require('../services/edge-service-client');

/**
 * Get storage information
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getStorageInfo = async (req, res) => {
  try {
    // Get storage information from edge service
    const storageInfo = await edgeServiceClient.getStorageInfo();
    
    // Return storage information
    res.json(storageInfo);
  } catch (error) {
    console.error('Error getting storage information:', error);
    res.status(500).json({ error: 'Failed to get storage information' });
  }
};

/**
 * Optimize storage
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.optimizeStorage = async (req, res) => {
  try {
    // Get optimization options from request body
    const options = req.body;
    
    // Optimize storage through edge service
    const result = await edgeServiceClient.optimizeStorage(options);
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error optimizing storage:', error);
    res.status(500).json({ error: 'Failed to optimize storage' });
  }
};
