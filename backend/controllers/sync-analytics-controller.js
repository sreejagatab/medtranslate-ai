/**
 * Sync Analytics Controller for MedTranslate AI
 *
 * This controller provides endpoints for retrieving analytics data from the auto-sync-manager
 * to be displayed in the UI.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const EDGE_API_URL = process.env.EDGE_API_URL || 'http://localhost:3002';

/**
 * Get sync status from all connected edge devices
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function getSyncStatus(req, res) {
  try {
    // In a production environment, this would query a database of registered edge devices
    // For now, we'll use a hardcoded list of edge devices
    const edgeDevices = [
      { id: 'edge-device-1', name: 'Hospital Wing A', url: `${EDGE_API_URL}/sync/status` },
      { id: 'edge-device-2', name: 'Hospital Wing B', url: `${EDGE_API_URL}/sync/status` }
    ];

    // Query each edge device for its sync status
    const statusPromises = edgeDevices.map(async (device) => {
      try {
        const response = await axios.get(device.url, {
          timeout: 5000,
          headers: {
            'X-Request-ID': uuidv4()
          }
        });

        return {
          deviceId: device.id,
          deviceName: device.name,
          status: response.data,
          online: true,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Error getting sync status from device ${device.id}:`, error.message);
        
        return {
          deviceId: device.id,
          deviceName: device.name,
          status: null,
          online: false,
          error: error.message,
          lastUpdated: new Date().toISOString()
        };
      }
    });

    const statuses = await Promise.all(statusPromises);

    res.json({
      success: true,
      devices: statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get detailed sync metrics from all connected edge devices
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function getSyncMetrics(req, res) {
  try {
    // In a production environment, this would query a database of registered edge devices
    // For now, we'll use a hardcoded list of edge devices
    const edgeDevices = [
      { id: 'edge-device-1', name: 'Hospital Wing A', url: `${EDGE_API_URL}/sync/metrics` },
      { id: 'edge-device-2', name: 'Hospital Wing B', url: `${EDGE_API_URL}/sync/metrics` }
    ];

    // Query each edge device for its sync metrics
    const metricsPromises = edgeDevices.map(async (device) => {
      try {
        const response = await axios.get(device.url, {
          timeout: 5000,
          headers: {
            'X-Request-ID': uuidv4()
          }
        });

        return {
          deviceId: device.id,
          deviceName: device.name,
          metrics: response.data,
          online: true,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Error getting sync metrics from device ${device.id}:`, error.message);
        
        return {
          deviceId: device.id,
          deviceName: device.name,
          metrics: null,
          online: false,
          error: error.message,
          lastUpdated: new Date().toISOString()
        };
      }
    });

    const metrics = await Promise.all(metricsPromises);

    res.json({
      success: true,
      devices: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting sync metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get quality metrics from all connected edge devices
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function getQualityMetrics(req, res) {
  try {
    // In a production environment, this would query a database of registered edge devices
    // For now, we'll use a hardcoded list of edge devices
    const edgeDevices = [
      { id: 'edge-device-1', name: 'Hospital Wing A', url: `${EDGE_API_URL}/sync/quality` },
      { id: 'edge-device-2', name: 'Hospital Wing B', url: `${EDGE_API_URL}/sync/quality` }
    ];

    // Query each edge device for its quality metrics
    const qualityPromises = edgeDevices.map(async (device) => {
      try {
        const response = await axios.get(device.url, {
          timeout: 5000,
          headers: {
            'X-Request-ID': uuidv4()
          }
        });

        return {
          deviceId: device.id,
          deviceName: device.name,
          quality: response.data,
          online: true,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Error getting quality metrics from device ${device.id}:`, error.message);
        
        return {
          deviceId: device.id,
          deviceName: device.name,
          quality: null,
          online: false,
          error: error.message,
          lastUpdated: new Date().toISOString()
        };
      }
    });

    const qualities = await Promise.all(qualityPromises);

    res.json({
      success: true,
      devices: qualities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting quality metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get trend analysis from all connected edge devices
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function getTrendAnalysis(req, res) {
  try {
    // In a production environment, this would query a database of registered edge devices
    // For now, we'll use a hardcoded list of edge devices
    const edgeDevices = [
      { id: 'edge-device-1', name: 'Hospital Wing A', url: `${EDGE_API_URL}/sync/trends` },
      { id: 'edge-device-2', name: 'Hospital Wing B', url: `${EDGE_API_URL}/sync/trends` }
    ];

    // Query each edge device for its trend analysis
    const trendPromises = edgeDevices.map(async (device) => {
      try {
        const response = await axios.get(device.url, {
          timeout: 5000,
          headers: {
            'X-Request-ID': uuidv4()
          }
        });

        return {
          deviceId: device.id,
          deviceName: device.name,
          trends: response.data,
          online: true,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Error getting trend analysis from device ${device.id}:`, error.message);
        
        return {
          deviceId: device.id,
          deviceName: device.name,
          trends: null,
          online: false,
          error: error.message,
          lastUpdated: new Date().toISOString()
        };
      }
    });

    const trends = await Promise.all(trendPromises);

    res.json({
      success: true,
      devices: trends,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting trend analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get anomaly detection from all connected edge devices
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function getAnomalyDetection(req, res) {
  try {
    // In a production environment, this would query a database of registered edge devices
    // For now, we'll use a hardcoded list of edge devices
    const edgeDevices = [
      { id: 'edge-device-1', name: 'Hospital Wing A', url: `${EDGE_API_URL}/sync/anomalies` },
      { id: 'edge-device-2', name: 'Hospital Wing B', url: `${EDGE_API_URL}/sync/anomalies` }
    ];

    // Query each edge device for its anomaly detection
    const anomalyPromises = edgeDevices.map(async (device) => {
      try {
        const response = await axios.get(device.url, {
          timeout: 5000,
          headers: {
            'X-Request-ID': uuidv4()
          }
        });

        return {
          deviceId: device.id,
          deviceName: device.name,
          anomalies: response.data,
          online: true,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Error getting anomaly detection from device ${device.id}:`, error.message);
        
        return {
          deviceId: device.id,
          deviceName: device.name,
          anomalies: null,
          online: false,
          error: error.message,
          lastUpdated: new Date().toISOString()
        };
      }
    });

    const anomalies = await Promise.all(anomalyPromises);

    res.json({
      success: true,
      devices: anomalies,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting anomaly detection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Trigger a manual sync on a specific edge device
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function triggerManualSync(req, res) {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Device ID is required'
      });
    }

    // In a production environment, this would look up the device URL from a database
    // For now, we'll use a hardcoded URL
    const deviceUrl = `${EDGE_API_URL}/sync/manual`;

    try {
      const response = await axios.post(deviceUrl, {
        deviceId
      }, {
        timeout: 30000, // Longer timeout for sync operations
        headers: {
          'X-Request-ID': uuidv4(),
          'Content-Type': 'application/json'
        }
      });

      res.json({
        success: true,
        result: response.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error triggering manual sync on device ${deviceId}:`, error.message);
      
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getSyncStatus,
  getSyncMetrics,
  getQualityMetrics,
  getTrendAnalysis,
  getAnomalyDetection,
  triggerManualSync
};
