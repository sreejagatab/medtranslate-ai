/**
 * CloudWatch Service for MedTranslate AI
 * 
 * This service provides functions for sending metrics and logs to AWS CloudWatch.
 * It integrates with CloudWatch to provide monitoring and alerting capabilities.
 */

// Import AWS SDK
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

// Import config
const config = require('../config');

// Initialize AWS SDK
const region = process.env.AWS_REGION || config.aws?.region || 'us-east-1';
const environment = process.env.NODE_ENV || 'development';

// CloudWatch client
let cloudWatch;
let cloudWatchLogs;

// Namespace for CloudWatch metrics
const METRIC_NAMESPACE = `MedTranslateAI/${environment}`;

// Log group for CloudWatch logs
const LOG_GROUP = `/medtranslate-ai/${environment}`;

// Log stream for CloudWatch logs
const LOG_STREAM = `backend-${os.hostname()}-${uuidv4()}`;

// Initialize CloudWatch clients
function initializeCloudWatch() {
  // Check if CloudWatch is already initialized
  if (cloudWatch && cloudWatchLogs) {
    return;
  }
  
  // Configure AWS SDK
  AWS.config.update({
    region,
    ...(process.env.NODE_ENV === 'development' && {
      // Use local credentials for development
      credentials: new AWS.SharedIniFileCredentials({ profile: 'medtranslate-ai' })
    })
  });
  
  // Create CloudWatch client
  cloudWatch = new AWS.CloudWatch();
  
  // Create CloudWatch Logs client
  cloudWatchLogs = new AWS.CloudWatchLogs();
  
  // Create log group and stream if they don't exist
  if (process.env.NODE_ENV !== 'development') {
    createLogGroupAndStream();
  }
}

/**
 * Create log group and stream if they don't exist
 */
async function createLogGroupAndStream() {
  try {
    // Create log group if it doesn't exist
    try {
      await cloudWatchLogs.createLogGroup({
        logGroupName: LOG_GROUP
      }).promise();
      
      console.log(`Created CloudWatch log group: ${LOG_GROUP}`);
    } catch (error) {
      // Ignore if log group already exists
      if (error.code !== 'ResourceAlreadyExistsException') {
        console.error('Error creating CloudWatch log group:', error);
      }
    }
    
    // Create log stream if it doesn't exist
    try {
      await cloudWatchLogs.createLogStream({
        logGroupName: LOG_GROUP,
        logStreamName: LOG_STREAM
      }).promise();
      
      console.log(`Created CloudWatch log stream: ${LOG_STREAM}`);
    } catch (error) {
      // Ignore if log stream already exists
      if (error.code !== 'ResourceAlreadyExistsException') {
        console.error('Error creating CloudWatch log stream:', error);
      }
    }
  } catch (error) {
    console.error('Error creating CloudWatch log group and stream:', error);
  }
}

/**
 * Send metrics to CloudWatch
 * 
 * @param {Array} metrics - Array of metric data
 * @returns {Promise<Object>} - CloudWatch response
 */
async function sendMetrics(metrics) {
  try {
    // Initialize CloudWatch if needed
    initializeCloudWatch();
    
    // Skip in development mode unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_CLOUDWATCH) {
      console.log('CloudWatch metrics disabled in development mode');
      console.log('Metrics:', metrics);
      return;
    }
    
    // Format metrics for CloudWatch
    const metricData = metrics.map(metric => ({
      MetricName: metric.name,
      Dimensions: Object.entries(metric.dimensions || {}).map(([name, value]) => ({
        Name: name,
        Value: String(value)
      })),
      Unit: metric.unit || 'None',
      Value: metric.value,
      Timestamp: metric.timestamp || new Date()
    }));
    
    // Send metrics to CloudWatch
    const response = await cloudWatch.putMetricData({
      Namespace: METRIC_NAMESPACE,
      MetricData: metricData
    }).promise();
    
    console.log(`Sent ${metrics.length} metrics to CloudWatch`);
    
    return response;
  } catch (error) {
    console.error('Error sending metrics to CloudWatch:', error);
    
    // Log metrics that failed to send
    console.log('Failed metrics:', metrics);
  }
}

/**
 * Send system health metrics to CloudWatch
 * 
 * @param {Object} systemHealth - System health data
 * @returns {Promise<Object>} - CloudWatch response
 */
async function sendSystemHealthMetrics(systemHealth) {
  try {
    // Create metrics array
    const metrics = [];
    
    // Add overall system status metric
    metrics.push({
      name: 'SystemStatus',
      dimensions: {
        Environment: environment
      },
      unit: 'None',
      value: systemHealth.status === 'healthy' ? 1 : 
             systemHealth.status === 'degraded' ? 0.5 : 0
    });
    
    // Add component status metrics
    for (const component in systemHealth.components) {
      metrics.push({
        name: 'ComponentStatus',
        dimensions: {
          Environment: environment,
          Component: component
        },
        unit: 'None',
        value: systemHealth.components[component].status === 'healthy' ? 1 : 
               systemHealth.components[component].status === 'degraded' ? 0.5 : 0
      });
      
      // Add component response time metric
      if (systemHealth.components[component].responseTime) {
        metrics.push({
          name: 'ComponentResponseTime',
          dimensions: {
            Environment: environment,
            Component: component
          },
          unit: 'Milliseconds',
          value: systemHealth.components[component].responseTime
        });
      }
    }
    
    // Add system metrics
    metrics.push({
      name: 'SystemUptime',
      dimensions: {
        Environment: environment
      },
      unit: 'Seconds',
      value: systemHealth.system.uptime
    });
    
    metrics.push({
      name: 'SystemLoad',
      dimensions: {
        Environment: environment
      },
      unit: 'None',
      value: systemHealth.system.loadAvg[0]
    });
    
    metrics.push({
      name: 'MemoryUsage',
      dimensions: {
        Environment: environment
      },
      unit: 'Percent',
      value: (1 - (systemHealth.system.memory.free / systemHealth.system.memory.total)) * 100
    });
    
    // Send metrics to CloudWatch
    return await sendMetrics(metrics);
  } catch (error) {
    console.error('Error sending system health metrics to CloudWatch:', error);
  }
}

/**
 * Send log to CloudWatch
 * 
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @param {string} level - Log level (info, warn, error)
 * @returns {Promise<Object>} - CloudWatch response
 */
async function sendLog(message, data = {}, level = 'info') {
  try {
    // Initialize CloudWatch if needed
    initializeCloudWatch();
    
    // Skip in development mode unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_CLOUDWATCH) {
      console.log(`[${level.toUpperCase()}] ${message}`, data);
      return;
    }
    
    // Format log event
    const logEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        level,
        message,
        data,
        hostname: os.hostname(),
        pid: process.pid
      })
    };
    
    // Send log to CloudWatch
    const response = await cloudWatchLogs.putLogEvents({
      logGroupName: LOG_GROUP,
      logStreamName: LOG_STREAM,
      logEvents: [logEvent]
    }).promise();
    
    return response;
  } catch (error) {
    console.error('Error sending log to CloudWatch:', error);
    
    // Log message that failed to send
    console.log(`[${level.toUpperCase()}] ${message}`, data);
  }
}

/**
 * Create CloudWatch alarm
 * 
 * @param {Object} options - Alarm options
 * @returns {Promise<Object>} - CloudWatch response
 */
async function createAlarm(options) {
  try {
    // Initialize CloudWatch if needed
    initializeCloudWatch();
    
    // Skip in development mode unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_CLOUDWATCH) {
      console.log('CloudWatch alarms disabled in development mode');
      console.log('Alarm options:', options);
      return;
    }
    
    // Create alarm
    const response = await cloudWatch.putMetricAlarm({
      AlarmName: options.name,
      AlarmDescription: options.description,
      ActionsEnabled: true,
      OKActions: options.okActions || [],
      AlarmActions: options.alarmActions || [],
      InsufficientDataActions: options.insufficientDataActions || [],
      MetricName: options.metricName,
      Namespace: METRIC_NAMESPACE,
      Statistic: options.statistic || 'Average',
      Dimensions: Object.entries(options.dimensions || {}).map(([name, value]) => ({
        Name: name,
        Value: String(value)
      })),
      Period: options.period || 60,
      EvaluationPeriods: options.evaluationPeriods || 1,
      DatapointsToAlarm: options.datapointsToAlarm || 1,
      Threshold: options.threshold,
      ComparisonOperator: options.comparisonOperator || 'GreaterThanOrEqualToThreshold',
      TreatMissingData: options.treatMissingData || 'missing'
    }).promise();
    
    console.log(`Created CloudWatch alarm: ${options.name}`);
    
    return response;
  } catch (error) {
    console.error('Error creating CloudWatch alarm:', error);
    
    // Log alarm options that failed to create
    console.log('Failed alarm options:', options);
  }
}

// Export functions
module.exports = {
  sendMetrics,
  sendSystemHealthMetrics,
  sendLog,
  createAlarm
};
