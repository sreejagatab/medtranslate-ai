/**
 * ML Controller for MedTranslate AI
 * 
 * This controller handles ML-related operations, including
 * getting ML performance metrics, training models, and configuring models.
 */

// Import edge service client
const edgeServiceClient = require('../services/edge-service-client');

/**
 * Get ML performance metrics
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getMLPerformance = async (req, res) => {
  try {
    // Get ML performance metrics from edge service
    const mlPerformance = await edgeServiceClient.getMLPerformance();
    
    // Return ML performance metrics
    res.json(mlPerformance);
  } catch (error) {
    console.error('Error getting ML performance metrics:', error);
    res.status(500).json({ error: 'Failed to get ML performance metrics' });
  }
};

/**
 * Get ML performance history
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getMLPerformanceHistory = async (req, res) => {
  try {
    // Get ML performance history from edge service
    const mlPerformanceHistory = await edgeServiceClient.getMLPerformanceHistory();
    
    // Return ML performance history
    res.json(mlPerformanceHistory);
  } catch (error) {
    console.error('Error getting ML performance history:', error);
    res.status(500).json({ error: 'Failed to get ML performance history' });
  }
};

/**
 * Train ML models
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.trainModels = async (req, res) => {
  try {
    // Train ML models through edge service
    const result = await edgeServiceClient.trainModels();
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error training ML models:', error);
    res.status(500).json({ error: 'Failed to train ML models' });
  }
};

/**
 * Configure ML models
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.configureModels = async (req, res) => {
  try {
    // Get configuration options from request body
    const options = req.body;
    
    // Configure ML models through edge service
    const result = await edgeServiceClient.configureModels(options);
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error configuring ML models:', error);
    res.status(500).json({ error: 'Failed to configure ML models' });
  }
};
