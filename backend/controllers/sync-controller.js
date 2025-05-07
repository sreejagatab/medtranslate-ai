/**
 * Sync Controller for MedTranslate AI
 * 
 * This controller handles sync-related operations, including
 * getting sync status, getting sync history, performing manual sync,
 * toggling auto-sync, and preparing for offline mode.
 */

// Import edge service client
const edgeServiceClient = require('../services/edge-service-client');

/**
 * Get sync status
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSyncStatus = async (req, res) => {
  try {
    // Get sync status from edge service
    const syncStatus = await edgeServiceClient.getSyncStatus();
    
    // Return sync status
    res.json(syncStatus);
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
};

/**
 * Get sync history
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSyncHistory = async (req, res) => {
  try {
    // Get sync history from edge service
    const syncHistory = await edgeServiceClient.getSyncHistory();
    
    // Return sync history
    res.json(syncHistory);
  } catch (error) {
    console.error('Error getting sync history:', error);
    res.status(500).json({ error: 'Failed to get sync history' });
  }
};

/**
 * Perform manual sync
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.manualSync = async (req, res) => {
  try {
    // Perform manual sync through edge service
    const result = await edgeServiceClient.manualSync();
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error performing manual sync:', error);
    res.status(500).json({ error: 'Failed to perform manual sync' });
  }
};

/**
 * Toggle auto-sync
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.toggleAutoSync = async (req, res) => {
  try {
    // Get enabled flag from request body
    const { enabled } = req.body;
    
    // Toggle auto-sync through edge service
    const result = await edgeServiceClient.toggleAutoSync(enabled);
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error toggling auto-sync:', error);
    res.status(500).json({ error: 'Failed to toggle auto-sync' });
  }
};

/**
 * Prepare for offline mode
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.prepareForOffline = async (req, res) => {
  try {
    // Prepare for offline mode through edge service
    const result = await edgeServiceClient.prepareForOffline();
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error preparing for offline mode:', error);
    res.status(500).json({ error: 'Failed to prepare for offline mode' });
  }
};
