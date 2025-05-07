/**
 * Sync Analytics WebSocket Events for MedTranslate AI
 *
 * This module provides WebSocket event handlers for sync analytics events.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const EDGE_API_URL = process.env.EDGE_API_URL || 'http://localhost:3002';

/**
 * Register sync analytics event handlers
 *
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {Map} sessions - Sessions map
 * @returns {void}
 */
function registerSyncAnalyticsEvents(wss, sessions) {
  // Set up interval to broadcast sync status updates
  const SYNC_STATUS_INTERVAL = 30000; // 30 seconds

  // Function to broadcast sync status
  const broadcastSyncStatus = async () => {
    try {
      // Get sync status from edge devices
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

      // Broadcast sync status to all admin dashboard sessions
      broadcastToAdminDashboard(wss, sessions, {
        type: 'sync_status_update',
        devices: statuses,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error broadcasting sync status:', error);
    }
  };

  // Set up interval to broadcast sync status
  const syncStatusInterval = setInterval(broadcastSyncStatus, SYNC_STATUS_INTERVAL);

  // Set up interval to broadcast quality metrics updates
  const QUALITY_METRICS_INTERVAL = 60000; // 1 minute

  // Function to broadcast quality metrics
  const broadcastQualityMetrics = async () => {
    try {
      // Get quality metrics from edge devices
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

      // Broadcast quality metrics to all admin dashboard sessions
      broadcastToAdminDashboard(wss, sessions, {
        type: 'quality_metrics_update',
        devices: qualities,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error broadcasting quality metrics:', error);
    }
  };

  // Set up interval to broadcast quality metrics
  const qualityMetricsInterval = setInterval(broadcastQualityMetrics, QUALITY_METRICS_INTERVAL);

  // Set up interval to broadcast anomaly detection updates
  const ANOMALY_DETECTION_INTERVAL = 300000; // 5 minutes

  // Function to broadcast anomaly detection
  const broadcastAnomalyDetection = async () => {
    try {
      // Get anomaly detection from edge devices
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

      // Broadcast anomaly detection to all admin dashboard sessions
      broadcastToAdminDashboard(wss, sessions, {
        type: 'anomaly_detection_update',
        devices: anomalies,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error broadcasting anomaly detection:', error);
    }
  };

  // Set up interval to broadcast anomaly detection
  const anomalyDetectionInterval = setInterval(broadcastAnomalyDetection, ANOMALY_DETECTION_INTERVAL);
}

/**
 * Broadcast message to all admin dashboard sessions
 *
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {Map} sessions - Sessions map
 * @param {Object} message - Message to broadcast
 * @returns {void}
 */
function broadcastToAdminDashboard(wss, sessions, message) {
  // Convert message to string
  const messageStr = JSON.stringify(message);

  // Broadcast to all admin dashboard sessions
  wss.clients.forEach((client) => {
    // Check if client is an admin dashboard
    if (client.userType === 'admin' && client.readyState === 1) {
      client.send(messageStr);
    }
  });
}

module.exports = {
  registerSyncAnalyticsEvents,

  // Export for testing
  _testExports: {
    broadcastToAdminDashboard
  }
};
