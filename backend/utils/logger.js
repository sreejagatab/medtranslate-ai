/**
 * Logger utility for MedTranslate AI
 * 
 * Provides standardized logging with different levels and formats
 * for development and production environments.
 */

const config = require('../config');

// Define log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Get configured log level
const configuredLevel = config.monitoring.loggingLevel || 'info';
const CURRENT_LOG_LEVEL = LOG_LEVELS[configuredLevel] || LOG_LEVELS.info;

/**
 * Format log message
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data to log
 * @returns {string} - Formatted log message
 */
function formatLogMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  const logObject = {
    timestamp,
    level,
    message
  };
  
  if (data) {
    if (data instanceof Error) {
      logObject.error = {
        name: data.name,
        message: data.message,
        stack: data.stack
      };
    } else {
      logObject.data = data;
    }
  }
  
  // In development, pretty print the log
  if (process.env.NODE_ENV !== 'production') {
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
  }
  
  // In production, return JSON for structured logging
  return JSON.stringify(logObject);
}

/**
 * Logger object with methods for different log levels
 */
const logger = {
  /**
   * Log error message
   * 
   * @param {string} message - Error message
   * @param {Error|Object} [error] - Error object or additional data
   */
  error(message, error) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.error) {
      console.error(formatLogMessage('error', message, error));
    }
  },
  
  /**
   * Log warning message
   * 
   * @param {string} message - Warning message
   * @param {Object} [data] - Additional data
   */
  warn(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.warn) {
      console.warn(formatLogMessage('warn', message, data));
    }
  },
  
  /**
   * Log info message
   * 
   * @param {string} message - Info message
   * @param {Object} [data] - Additional data
   */
  info(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.info) {
      console.info(formatLogMessage('info', message, data));
    }
  },
  
  /**
   * Log debug message
   * 
   * @param {string} message - Debug message
   * @param {Object} [data] - Additional data
   */
  debug(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.debug) {
      console.debug(formatLogMessage('debug', message, data));
    }
  }
};

module.exports = logger;
