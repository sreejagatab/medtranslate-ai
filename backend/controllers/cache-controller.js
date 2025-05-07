/**
 * Cache Controller for MedTranslate AI
 * 
 * This controller handles cache-related operations, including
 * getting cache stats, clearing the cache, and refreshing the cache.
 */

// Import edge service client
const edgeServiceClient = require('../services/edge-service-client');

/**
 * Get cache statistics
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCacheStats = async (req, res) => {
  try {
    // Get cache stats from edge service
    const cacheStats = await edgeServiceClient.getCacheStats();
    
    // Return cache stats
    res.json(cacheStats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
};

/**
 * Clear cache
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.clearCache = async (req, res) => {
  try {
    // Clear cache through edge service
    const result = await edgeServiceClient.clearCache();
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
};

/**
 * Refresh cache
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.refreshCache = async (req, res) => {
  try {
    // Refresh cache through edge service
    const result = await edgeServiceClient.refreshCache();
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
};
