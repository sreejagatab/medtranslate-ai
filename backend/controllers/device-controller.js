/**
 * Device Controller for MedTranslate AI
 * 
 * This controller handles device-related operations, including
 * getting device performance metrics.
 */

// Import edge service client
const edgeServiceClient = require('../services/edge-service-client');

/**
 * Get device performance metrics
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDevicePerformance = async (req, res) => {
  try {
    // Get device performance metrics from edge service
    const devicePerformance = await edgeServiceClient.getDevicePerformance();
    
    // Return device performance metrics
    res.json(devicePerformance);
  } catch (error) {
    console.error('Error getting device performance metrics:', error);
    res.status(500).json({ error: 'Failed to get device performance metrics' });
  }
};
