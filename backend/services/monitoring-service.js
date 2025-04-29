/**
 * Monitoring Service for MedTranslate AI
 * 
 * This service provides system monitoring, health checks, and alerting
 * for the MedTranslate AI platform.
 */

const AWS = require('aws-sdk');
const os = require('os');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const analyticsService = require('./analytics-service');

// Initialize AWS services
const cloudWatch = new AWS.CloudWatch();
const sns = new AWS.SNS();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Table names
const HEALTH_CHECKS_TABLE = process.env.HEALTH_CHECKS_TABLE || 'MedTranslateHealthChecks';
const ALERTS_TABLE = process.env.ALERTS_TABLE || 'MedTranslateAlerts';

// SNS topic for alerts
const ALERTS_TOPIC = process.env.ALERTS_TOPIC_ARN || '';

// System components to monitor
const SYSTEM_COMPONENTS = {
  API: 'api',
  DATABASE: 'database',
  TRANSLATION_SERVICE: 'translation_service',
  AUTHENTICATION_SERVICE: 'authentication_service',
  WEBSOCKET_SERVICE: 'websocket_service',
  EDGE_SERVICE: 'edge_service',
  NOTIFICATION_SERVICE: 'notification_service',
  STORAGE_SERVICE: 'storage_service'
};

// Alert severity levels
const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Perform a health check on a system component
 * 
 * @param {string} component - Component to check
 * @returns {Promise<Object>} - Health check result
 */
async function checkComponentHealth(component) {
  try {
    // Skip actual checks in development mode
    if (process.env.NODE_ENV === 'development') {
      return mockHealthCheck(component);
    }
    
    let status = 'healthy';
    let details = {};
    let responseTime = 0;
    
    const startTime = Date.now();
    
    switch (component) {
      case SYSTEM_COMPONENTS.API:
        // Check API health
        details = await checkApiHealth();
        break;
        
      case SYSTEM_COMPONENTS.DATABASE:
        // Check database health
        details = await checkDatabaseHealth();
        break;
        
      case SYSTEM_COMPONENTS.TRANSLATION_SERVICE:
        // Check translation service health
        details = await checkTranslationServiceHealth();
        break;
        
      case SYSTEM_COMPONENTS.AUTHENTICATION_SERVICE:
        // Check authentication service health
        details = await checkAuthServiceHealth();
        break;
        
      case SYSTEM_COMPONENTS.WEBSOCKET_SERVICE:
        // Check WebSocket service health
        details = await checkWebSocketServiceHealth();
        break;
        
      case SYSTEM_COMPONENTS.EDGE_SERVICE:
        // Check edge service health
        details = await checkEdgeServiceHealth();
        break;
        
      case SYSTEM_COMPONENTS.NOTIFICATION_SERVICE:
        // Check notification service health
        details = await checkNotificationServiceHealth();
        break;
        
      case SYSTEM_COMPONENTS.STORAGE_SERVICE:
        // Check storage service health
        details = await checkStorageServiceHealth();
        break;
        
      default:
        throw new Error(`Unknown component: ${component}`);
    }
    
    responseTime = Date.now() - startTime;
    
    // Determine overall status
    if (details.error) {
      status = 'unhealthy';
    } else if (details.warnings && details.warnings.length > 0) {
      status = 'degraded';
    }
    
    // Create health check record
    const healthCheck = {
      checkId: uuidv4(),
      component,
      status,
      timestamp: new Date().toISOString(),
      responseTime,
      details
    };
    
    // Store health check in DynamoDB
    await storeHealthCheck(healthCheck);
    
    // Publish metric to CloudWatch
    await publishHealthMetric(component, status, responseTime);
    
    // Create alert if unhealthy
    if (status === 'unhealthy') {
      await createAlert(
        component,
        `${component} is unhealthy: ${details.error || 'Unknown error'}`,
        ALERT_SEVERITY.ERROR,
        healthCheck
      );
    } else if (status === 'degraded') {
      await createAlert(
        component,
        `${component} is degraded: ${details.warnings.join(', ')}`,
        ALERT_SEVERITY.WARNING,
        healthCheck
      );
    }
    
    return healthCheck;
  } catch (error) {
    console.error(`Error checking ${component} health:`, error);
    
    // Create error record
    const healthCheck = {
      checkId: uuidv4(),
      component,
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: 0,
      details: {
        error: error.message,
        stack: error.stack
      }
    };
    
    // Store health check
    await storeHealthCheck(healthCheck);
    
    // Create alert
    await createAlert(
      component,
      `Error checking ${component} health: ${error.message}`,
      ALERT_SEVERITY.ERROR,
      healthCheck
    );
    
    return healthCheck;
  }
}

/**
 * Store a health check record in DynamoDB
 * 
 * @param {Object} healthCheck - Health check record
 * @returns {Promise<Object>} - DynamoDB response
 */
async function storeHealthCheck(healthCheck) {
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Storing health check:`, healthCheck);
      return { success: true };
    }
    
    await dynamoDB.put({
      TableName: HEALTH_CHECKS_TABLE,
      Item: healthCheck
    }).promise();
    
    return { success: true };
  } catch (error) {
    console.error('Error storing health check:', error);
    return { error: error.message };
  }
}

/**
 * Publish a health metric to CloudWatch
 * 
 * @param {string} component - Component name
 * @param {string} status - Health status
 * @param {number} responseTime - Response time in ms
 * @returns {Promise<Object>} - CloudWatch response
 */
async function publishHealthMetric(component, status, responseTime) {
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Publishing health metric: ${component} ${status} ${responseTime}ms`);
      return { success: true };
    }
    
    // Convert status to numeric value
    const statusValue = status === 'healthy' ? 1 : (status === 'degraded' ? 0.5 : 0);
    
    // Publish status metric
    await cloudWatch.putMetricData({
      MetricData: [
        {
          MetricName: 'ComponentHealth',
          Dimensions: [
            {
              Name: 'Component',
              Value: component
            }
          ],
          Unit: 'None',
          Value: statusValue,
          Timestamp: new Date()
        }
      ],
      Namespace: 'MedTranslateAI/Monitoring'
    }).promise();
    
    // Publish response time metric
    await cloudWatch.putMetricData({
      MetricData: [
        {
          MetricName: 'ResponseTime',
          Dimensions: [
            {
              Name: 'Component',
              Value: component
            }
          ],
          Unit: 'Milliseconds',
          Value: responseTime,
          Timestamp: new Date()
        }
      ],
      Namespace: 'MedTranslateAI/Monitoring'
    }).promise();
    
    return { success: true };
  } catch (error) {
    console.error('Error publishing health metric:', error);
    return { error: error.message };
  }
}

/**
 * Create an alert
 * 
 * @param {string} component - Component name
 * @param {string} message - Alert message
 * @param {string} severity - Alert severity
 * @param {Object} details - Alert details
 * @returns {Promise<Object>} - Alert record
 */
async function createAlert(component, message, severity = ALERT_SEVERITY.ERROR, details = {}) {
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Creating alert: ${severity} - ${component} - ${message}`);
      return { alertId: 'dev-alert-id' };
    }
    
    // Create alert record
    const alert = {
      alertId: uuidv4(),
      component,
      message,
      severity,
      timestamp: new Date().toISOString(),
      details,
      status: 'active'
    };
    
    // Store alert in DynamoDB
    await dynamoDB.put({
      TableName: ALERTS_TABLE,
      Item: alert
    }).promise();
    
    // Send SNS notification for critical and error alerts
    if (severity === ALERT_SEVERITY.CRITICAL || severity === ALERT_SEVERITY.ERROR) {
      if (ALERTS_TOPIC) {
        await sns.publish({
          TopicArn: ALERTS_TOPIC,
          Subject: `[${severity.toUpperCase()}] MedTranslate AI Alert: ${component}`,
          Message: `
Alert ID: ${alert.alertId}
Component: ${component}
Severity: ${severity}
Timestamp: ${alert.timestamp}
Message: ${message}
Details: ${JSON.stringify(details, null, 2)}
          `
        }).promise();
      }
    }
    
    // Track alert in analytics
    await analyticsService.trackEvent('alert_created', {
      alertId: alert.alertId,
      component,
      severity,
      message
    });
    
    return alert;
  } catch (error) {
    console.error('Error creating alert:', error);
    return { error: error.message };
  }
}

/**
 * Resolve an alert
 * 
 * @param {string} alertId - Alert ID
 * @param {string} resolution - Resolution message
 * @returns {Promise<Object>} - Updated alert
 */
async function resolveAlert(alertId, resolution) {
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Resolving alert: ${alertId} - ${resolution}`);
      return { success: true };
    }
    
    // Update alert in DynamoDB
    const result = await dynamoDB.update({
      TableName: ALERTS_TABLE,
      Key: { alertId },
      UpdateExpression: 'SET #status = :status, resolution = :resolution, resolvedAt = :resolvedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'resolved',
        ':resolution': resolution,
        ':resolvedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();
    
    // Track alert resolution in analytics
    await analyticsService.trackEvent('alert_resolved', {
      alertId,
      resolution
    });
    
    return result.Attributes;
  } catch (error) {
    console.error('Error resolving alert:', error);
    return { error: error.message };
  }
}

/**
 * Get active alerts
 * 
 * @param {Object} filters - Filters to apply
 * @returns {Promise<Array>} - Active alerts
 */
async function getActiveAlerts(filters = {}) {
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      return mockActiveAlerts(filters);
    }
    
    // Query parameters
    const params = {
      TableName: ALERTS_TABLE,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'active'
      }
    };
    
    // Add component filter
    if (filters.component) {
      params.FilterExpression += ' AND component = :component';
      params.ExpressionAttributeValues[':component'] = filters.component;
    }
    
    // Add severity filter
    if (filters.severity) {
      params.FilterExpression += ' AND severity = :severity';
      params.ExpressionAttributeValues[':severity'] = filters.severity;
    }
    
    // Query DynamoDB
    const result = await dynamoDB.scan(params).promise();
    
    return result.Items || [];
  } catch (error) {
    console.error('Error getting active alerts:', error);
    throw error;
  }
}

/**
 * Get system health status
 * 
 * @returns {Promise<Object>} - System health status
 */
async function getSystemHealth() {
  try {
    // Check all components
    const components = Object.values(SYSTEM_COMPONENTS);
    const healthChecks = await Promise.all(
      components.map(component => checkComponentHealth(component))
    );
    
    // Determine overall system health
    const unhealthyComponents = healthChecks.filter(check => check.status === 'unhealthy');
    const degradedComponents = healthChecks.filter(check => check.status === 'degraded');
    
    let systemStatus = 'healthy';
    if (unhealthyComponents.length > 0) {
      systemStatus = 'unhealthy';
    } else if (degradedComponents.length > 0) {
      systemStatus = 'degraded';
    }
    
    // Get active alerts
    const activeAlerts = await getActiveAlerts();
    
    // Get system metrics
    const systemMetrics = await getSystemMetrics();
    
    return {
      status: systemStatus,
      timestamp: new Date().toISOString(),
      components: healthChecks.reduce((acc, check) => {
        acc[check.component] = {
          status: check.status,
          responseTime: check.responseTime,
          details: check.details
        };
        return acc;
      }, {}),
      activeAlerts: activeAlerts.length,
      metrics: systemMetrics
    };
  } catch (error) {
    console.error('Error getting system health:', error);
    throw error;
  }
}

/**
 * Get system metrics
 * 
 * @returns {Promise<Object>} - System metrics
 */
async function getSystemMetrics() {
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      return mockSystemMetrics();
    }
    
    // Get system metrics
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = (totalMemory - freeMemory) / totalMemory;
    
    // Get disk usage
    const diskUsage = await getDiskUsage();
    
    // Get process metrics
    const processMemoryUsage = process.memoryUsage();
    
    return {
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        usage: memoryUsage
      },
      disk: diskUsage,
      process: {
        uptime: process.uptime(),
        memory: {
          rss: processMemoryUsage.rss,
          heapTotal: processMemoryUsage.heapTotal,
          heapUsed: processMemoryUsage.heapUsed,
          external: processMemoryUsage.external
        }
      },
      system: {
        platform: os.platform(),
        release: os.release(),
        uptime: os.uptime()
      }
    };
  } catch (error) {
    console.error('Error getting system metrics:', error);
    return {
      error: error.message
    };
  }
}

/**
 * Get disk usage
 * 
 * @returns {Promise<Object>} - Disk usage
 */
async function getDiskUsage() {
  // This is a simplified implementation
  // In a production environment, you would use a more robust solution
  
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      return {
        total: 1000000000000,
        free: 500000000000,
        usage: 0.5
      };
    }
    
    // On Linux, read from /proc/mounts and df
    if (os.platform() === 'linux') {
      // Implementation omitted for brevity
      return {
        total: 1000000000000,
        free: 500000000000,
        usage: 0.5
      };
    }
    
    // Default mock values
    return {
      total: 1000000000000,
      free: 500000000000,
      usage: 0.5
    };
  } catch (error) {
    console.error('Error getting disk usage:', error);
    return {
      error: error.message
    };
  }
}

// Health check implementations for each component
// These would be replaced with actual health checks in production

async function checkApiHealth() {
  // In production, this would make an actual API request
  return { status: 'ok' };
}

async function checkDatabaseHealth() {
  try {
    // In production, this would check database connectivity
    await dynamoDB.scan({ TableName: HEALTH_CHECKS_TABLE, Limit: 1 }).promise();
    return { status: 'ok' };
  } catch (error) {
    return { error: error.message };
  }
}

async function checkTranslationServiceHealth() {
  // In production, this would check translation service
  return { status: 'ok' };
}

async function checkAuthServiceHealth() {
  // In production, this would check auth service
  return { status: 'ok' };
}

async function checkWebSocketServiceHealth() {
  // In production, this would check WebSocket service
  return { status: 'ok' };
}

async function checkEdgeServiceHealth() {
  // In production, this would check edge service
  return { status: 'ok' };
}

async function checkNotificationServiceHealth() {
  // In production, this would check notification service
  return { status: 'ok' };
}

async function checkStorageServiceHealth() {
  // In production, this would check storage service
  return { status: 'ok' };
}

// Mock implementations for development

function mockHealthCheck(component) {
  // Generate random health status
  const random = Math.random();
  let status, details;
  
  if (random > 0.9) {
    // 10% chance of unhealthy
    status = 'unhealthy';
    details = { error: `Mock error for ${component}` };
  } else if (random > 0.7) {
    // 20% chance of degraded
    status = 'degraded';
    details = { warnings: [`Mock warning for ${component}`] };
  } else {
    // 70% chance of healthy
    status = 'healthy';
    details = { status: 'ok' };
  }
  
  return {
    checkId: `mock-check-${Date.now()}`,
    component,
    status,
    timestamp: new Date().toISOString(),
    responseTime: Math.floor(Math.random() * 500),
    details
  };
}

function mockActiveAlerts(filters = {}) {
  // Generate mock alerts
  const alerts = [];
  const components = Object.values(SYSTEM_COMPONENTS);
  const severities = Object.values(ALERT_SEVERITY);
  
  // Generate 0-5 random alerts
  const alertCount = Math.floor(Math.random() * 6);
  
  for (let i = 0; i < alertCount; i++) {
    const component = components[Math.floor(Math.random() * components.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    // Apply filters
    if (filters.component && filters.component !== component) {
      continue;
    }
    
    if (filters.severity && filters.severity !== severity) {
      continue;
    }
    
    alerts.push({
      alertId: `mock-alert-${i}`,
      component,
      message: `Mock alert for ${component}`,
      severity,
      timestamp: new Date().toISOString(),
      details: {},
      status: 'active'
    });
  }
  
  return alerts;
}

function mockSystemMetrics() {
  return {
    cpu: {
      usage: Math.random() * 0.8,
      cores: 8
    },
    memory: {
      total: 16000000000,
      free: 8000000000,
      usage: Math.random() * 0.8
    },
    disk: {
      total: 1000000000000,
      free: 500000000000,
      usage: Math.random() * 0.8
    },
    process: {
      uptime: Math.floor(Math.random() * 86400),
      memory: {
        rss: Math.floor(Math.random() * 1000000000),
        heapTotal: Math.floor(Math.random() * 500000000),
        heapUsed: Math.floor(Math.random() * 400000000),
        external: Math.floor(Math.random() * 100000000)
      }
    },
    system: {
      platform: os.platform(),
      release: os.release(),
      uptime: Math.floor(Math.random() * 2592000)
    }
  };
}

module.exports = {
  checkComponentHealth,
  getSystemHealth,
  getActiveAlerts,
  createAlert,
  resolveAlert,
  getSystemMetrics,
  SYSTEM_COMPONENTS,
  ALERT_SEVERITY
};
