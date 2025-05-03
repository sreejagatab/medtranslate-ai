/**
 * CloudWatch Logger Utility for MedTranslate AI
 * 
 * This module provides a standardized way to log to CloudWatch Logs
 * with proper AWS region configuration.
 */

const { createCloudWatchLogsClient } = require('./aws-config');

// Configuration
const LOG_GROUP = process.env.LOG_GROUP || '/medtranslate-ai';
const LOG_STREAM_PREFIX = process.env.LOG_STREAM_PREFIX || 'app-';
const IS_OFFLINE = process.env.IS_OFFLINE === 'true';

// Create CloudWatch Logs client
const cloudWatchLogs = createCloudWatchLogsClient();

// Cache for sequence tokens
const sequenceTokens = {};

/**
 * Initialize log stream
 * 
 * @param {string} streamName - Log stream name
 * @returns {Promise<void>}
 */
async function initLogStream(streamName) {
  try {
    // Check if log group exists
    try {
      await cloudWatchLogs.describeLogGroups({
        logGroupNamePrefix: LOG_GROUP
      }).promise();
    } catch (error) {
      // Create log group if it doesn't exist
      if (error.code === 'ResourceNotFoundException') {
        await cloudWatchLogs.createLogGroup({
          logGroupName: LOG_GROUP
        }).promise();
      } else {
        throw error;
      }
    }
    
    // Check if log stream exists
    try {
      await cloudWatchLogs.describeLogStreams({
        logGroupName: LOG_GROUP,
        logStreamNamePrefix: streamName
      }).promise();
    } catch (error) {
      // Create log stream if it doesn't exist
      if (error.code === 'ResourceNotFoundException') {
        await cloudWatchLogs.createLogStream({
          logGroupName: LOG_GROUP,
          logStreamName: streamName
        }).promise();
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error initializing log stream:', error);
    // Don't throw - logging should not block main functionality
  }
}

/**
 * Log message to CloudWatch Logs
 * 
 * @param {string} level - Log level (INFO, WARN, ERROR)
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @param {string} component - Component name
 * @returns {Promise<void>}
 */
async function log(level, message, data = {}, component = 'app') {
  try {
    if (IS_OFFLINE) {
      // Log to console in offline mode
      console.log(`[${level}] [${component}] ${message}`, data);
      return;
    }
    
    // Create log stream name
    const streamName = `${LOG_STREAM_PREFIX}${component}-${new Date().toISOString().substring(0, 10)}`;
    
    // Initialize log stream if needed
    if (!sequenceTokens[streamName]) {
      await initLogStream(streamName);
      
      // Get sequence token
      try {
        const streams = await cloudWatchLogs.describeLogStreams({
          logGroupName: LOG_GROUP,
          logStreamNamePrefix: streamName
        }).promise();
        
        const stream = streams.logStreams.find(s => s.logStreamName === streamName);
        
        if (stream && stream.uploadSequenceToken) {
          sequenceTokens[streamName] = stream.uploadSequenceToken;
        }
      } catch (error) {
        console.error('Error getting sequence token:', error);
      }
    }
    
    // Create log event
    const logEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
        message,
        component,
        ...data
      })
    };
    
    // Log parameters
    const params = {
      logGroupName: LOG_GROUP,
      logStreamName: streamName,
      logEvents: [logEvent]
    };
    
    // Add sequence token if available
    if (sequenceTokens[streamName]) {
      params.sequenceToken = sequenceTokens[streamName];
    }
    
    // Put log events
    const result = await cloudWatchLogs.putLogEvents(params).promise();
    
    // Update sequence token
    if (result.nextSequenceToken) {
      sequenceTokens[streamName] = result.nextSequenceToken;
    }
  } catch (error) {
    // If invalid sequence token, retry with the correct token
    if (error.code === 'InvalidSequenceTokenException') {
      sequenceTokens[streamName] = error.message.split(': ')[1];
      await log(level, message, data, component);
    } else {
      console.error('Error logging to CloudWatch:', error);
      // Don't throw - logging should not block main functionality
    }
  }
}

/**
 * Log info message
 * 
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @param {string} component - Component name
 * @returns {Promise<void>}
 */
function info(message, data = {}, component = 'app') {
  return log('INFO', message, data, component);
}

/**
 * Log warning message
 * 
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @param {string} component - Component name
 * @returns {Promise<void>}
 */
function warn(message, data = {}, component = 'app') {
  return log('WARN', message, data, component);
}

/**
 * Log error message
 * 
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @param {string} component - Component name
 * @returns {Promise<void>}
 */
function error(message, data = {}, component = 'app') {
  return log('ERROR', message, data, component);
}

module.exports = {
  info,
  warn,
  error
};
