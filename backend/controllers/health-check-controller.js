/**
 * Health Check Controller for MedTranslate AI
 *
 * This controller handles health check operations, including
 * getting system health status, component health status, and
 * performing health checks on various components.
 */

// Import required modules
const axios = require('axios');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Import edge service client
const edgeServiceClient = require('../services/edge-service-client');

// Import CloudWatch service
const cloudWatchService = require('../services/cloudwatch-service');

// Import alerting service
const alertingService = require('../services/alerting-service');

// Import config
const config = require('../config');

// Component health check functions
const componentChecks = {
  /**
   * Check database health
   *
   * @returns {Promise<Object>} Health check result
   */
  async database() {
    try {
      // In a real implementation, this would check the database connection
      // For now, we'll simulate a database check
      const startTime = Date.now();

      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, 50));

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          connections: 5,
          maxConnections: 20
        }
      };
    } catch (error) {
      console.error('Database health check failed:', error);

      return {
        status: 'error',
        responseTime: 0,
        details: {
          error: error.message
        }
      };
    }
  },

  /**
   * Check translation service health
   *
   * @returns {Promise<Object>} Health check result
   */
  async translation_service() {
    try {
      // In a real implementation, this would check the translation service
      // For now, we'll simulate a translation service check
      const startTime = Date.now();

      // Simulate translation service check
      await new Promise(resolve => setTimeout(resolve, 100));

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          models: 5,
          activeRequests: 2
        }
      };
    } catch (error) {
      console.error('Translation service health check failed:', error);

      return {
        status: 'error',
        responseTime: 0,
        details: {
          error: error.message
        }
      };
    }
  },

  /**
   * Check edge device health
   *
   * @returns {Promise<Object>} Health check result
   */
  async edge_device() {
    try {
      // Check edge device health through edge service client
      const startTime = Date.now();

      // Get device performance metrics
      const devicePerformance = await edgeServiceClient.getDevicePerformance();

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Determine status based on device performance
      let status = 'healthy';
      const warnings = [];

      if (devicePerformance.cpuUsage > 0.8) {
        status = 'degraded';
        warnings.push('High CPU usage');
      }

      if (devicePerformance.memoryUsage > 0.8) {
        status = 'degraded';
        warnings.push('High memory usage');
      }

      if (devicePerformance.network && devicePerformance.network.connectionStability < 0.5) {
        status = 'degraded';
        warnings.push('Poor network connection');
      }

      return {
        status,
        responseTime,
        details: {
          warnings,
          devicePerformance
        }
      };
    } catch (error) {
      console.error('Edge device health check failed:', error);

      return {
        status: 'error',
        responseTime: 0,
        details: {
          error: error.message
        }
      };
    }
  },

  /**
   * Check authentication service health
   *
   * @returns {Promise<Object>} Health check result
   */
  async auth_service() {
    try {
      // In a real implementation, this would check the authentication service
      // For now, we'll simulate an authentication service check
      const startTime = Date.now();

      // Simulate authentication service check
      await new Promise(resolve => setTimeout(resolve, 75));

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          activeSessions: 10,
          tokenValidations: 50
        }
      };
    } catch (error) {
      console.error('Authentication service health check failed:', error);

      return {
        status: 'error',
        responseTime: 0,
        details: {
          error: error.message
        }
      };
    }
  },

  /**
   * Check storage service health
   *
   * @returns {Promise<Object>} Health check result
   */
  async storage_service() {
    try {
      // Check storage service health through edge service client
      const startTime = Date.now();

      // Get storage information
      const storageInfo = await edgeServiceClient.getStorageInfo();

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Determine status based on storage information
      let status = 'healthy';
      const warnings = [];

      if (storageInfo.usagePercentage > 90) {
        status = 'degraded';
        warnings.push('Storage almost full');
      } else if (storageInfo.usagePercentage > 80) {
        status = 'degraded';
        warnings.push('High storage usage');
      }

      return {
        status,
        responseTime,
        details: {
          warnings,
          storageInfo
        }
      };
    } catch (error) {
      console.error('Storage service health check failed:', error);

      return {
        status: 'error',
        responseTime: 0,
        details: {
          error: error.message
        }
      };
    }
  }
};

/**
 * Get system health status
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSystemHealth = async (req, res) => {
  try {
    // Get components to check from query parameters or use all components
    const componentsToCheck = req.query.components ?
      req.query.components.split(',') :
      Object.keys(componentChecks);

    // Perform health checks for each component
    const componentResults = {};

    for (const component of componentsToCheck) {
      if (componentChecks[component]) {
        componentResults[component] = await componentChecks[component]();
      }
    }

    // Determine overall system health status
    let overallStatus = 'healthy';

    for (const component in componentResults) {
      if (componentResults[component].status === 'error') {
        overallStatus = 'error';
        break;
      } else if (componentResults[component].status === 'degraded' && overallStatus !== 'error') {
        overallStatus = 'degraded';
      }
    }

    // Create system health response
    const systemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      components: componentResults,
      system: {
        uptime: os.uptime(),
        loadAvg: os.loadavg(),
        memory: {
          total: os.totalmem(),
          free: os.freemem()
        },
        cpus: os.cpus().length
      }
    };

    // Send CloudWatch metrics
    await sendCloudWatchMetrics(systemHealth);

    // Send alerts for unhealthy components
    for (const component in componentResults) {
      if (componentResults[component].status === 'error' || componentResults[component].status === 'degraded') {
        await alertingService.sendComponentErrorAlert(
          component,
          componentResults[component].status,
          componentResults[component].details
        );
      }
    }

    // Return system health status
    res.json(systemHealth);
  } catch (error) {
    console.error('Error getting system health status:', error);
    res.status(500).json({ error: 'Failed to get system health status' });
  }
};

/**
 * Perform health check on a specific component
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkComponent = async (req, res) => {
  try {
    // Get component from request parameters
    const { component } = req.params;

    // Check if component exists
    if (!componentChecks[component]) {
      return res.status(404).json({ error: `Component '${component}' not found` });
    }

    // Perform health check for the component
    const result = await componentChecks[component]();

    // Return component health status
    res.json({
      component,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error checking component '${req.params.component}':`, error);
    res.status(500).json({ error: `Failed to check component '${req.params.component}'` });
  }
};

/**
 * Send CloudWatch metrics
 *
 * @param {Object} systemHealth - System health data
 */
async function sendCloudWatchMetrics(systemHealth) {
  try {
    // Send system health metrics to CloudWatch
    await cloudWatchService.sendSystemHealthMetrics(systemHealth);

    // Log system health status
    await cloudWatchService.sendLog(
      'System health check completed',
      {
        status: systemHealth.status,
        components: Object.keys(systemHealth.components).map(component => ({
          component,
          status: systemHealth.components[component].status,
          responseTime: systemHealth.components[component].responseTime
        }))
      },
      systemHealth.status === 'healthy' ? 'info' :
      systemHealth.status === 'degraded' ? 'warn' : 'error'
    );

    // Create alarms for unhealthy components
    for (const component in systemHealth.components) {
      if (systemHealth.components[component].status === 'error') {
        // Create alarm for component error
        await cloudWatchService.createAlarm({
          name: `MedTranslateAI-${component}-Error`,
          description: `Alarm for ${component} error`,
          metricName: 'ComponentStatus',
          dimensions: {
            Environment: process.env.NODE_ENV || 'development',
            Component: component
          },
          threshold: 0.1,
          comparisonOperator: 'LessThanThreshold',
          evaluationPeriods: 1,
          datapointsToAlarm: 1,
          period: 60,
          statistic: 'Minimum'
        });
      }
    }
  } catch (error) {
    console.error('Error sending CloudWatch metrics:', error);
  }
}

/**
 * Get health check history
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getHealthCheckHistory = async (req, res) => {
  try {
    // In a production environment, this would retrieve health check history from a database
    // For now, we'll return a simulated history
    const history = [];

    // Generate simulated history for the past 24 hours
    const now = Date.now();

    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now - (i * 60 * 60 * 1000)).toISOString();

      // Simulate different statuses
      const status = Math.random() > 0.9 ? 'degraded' : 'healthy';

      history.push({
        timestamp,
        status,
        components: {
          database: {
            status: Math.random() > 0.95 ? 'degraded' : 'healthy',
            responseTime: Math.floor(Math.random() * 100) + 20
          },
          translation_service: {
            status: Math.random() > 0.9 ? 'degraded' : 'healthy',
            responseTime: Math.floor(Math.random() * 150) + 50
          },
          edge_device: {
            status: Math.random() > 0.85 ? 'degraded' : 'healthy',
            responseTime: Math.floor(Math.random() * 200) + 30
          },
          auth_service: {
            status: Math.random() > 0.98 ? 'degraded' : 'healthy',
            responseTime: Math.floor(Math.random() * 80) + 30
          },
          storage_service: {
            status: Math.random() > 0.9 ? 'degraded' : 'healthy',
            responseTime: Math.floor(Math.random() * 120) + 40
          }
        }
      });
    }

    // Return health check history
    res.json(history);
  } catch (error) {
    console.error('Error getting health check history:', error);
    res.status(500).json({ error: 'Failed to get health check history' });
  }
};
