/**
 * Enhanced Logger Utility for MedTranslate AI
 *
 * This module provides a centralized logging system with:
 * - Multiple log levels
 * - Structured logging
 * - File and console output
 * - Sensitive data masking
 * - Authentication and security event logging
 */

const config = require('../config');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Get configured log level
const configuredLevel = config.monitoring?.loggingLevel || 'info';
const CURRENT_LOG_LEVEL = LOG_LEVELS[configuredLevel] || LOG_LEVELS.info;

/**
 * Mask sensitive data in logs
 *
 * @param {Object} data - Data to mask
 * @returns {Object} - Masked data
 */
function maskSensitiveData(data) {
  if (!data) return data;

  // Create a deep copy to avoid modifying the original
  const maskedData = JSON.parse(JSON.stringify(data));

  // Fields to mask
  const sensitiveFields = [
    'password',
    'token',
    'refreshToken',
    'accessToken',
    'secret',
    'apiKey',
    'mfaSecret',
    'passwordHash',
    'passwordSalt',
    'creditCard',
    'ssn',
    'socialSecurityNumber'
  ];

  // Recursively mask sensitive fields
  function maskRecursive(obj) {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        if (typeof obj[key] === 'string') {
          // Mask string values
          const length = obj[key].length;
          if (length > 0) {
            obj[key] = '********';
          }
        } else {
          // For non-string values, replace with [REDACTED]
          obj[key] = '[REDACTED]';
        }
      } else if (typeof obj[key] === 'object') {
        // Recursively process nested objects
        maskRecursive(obj[key]);
      }
    }
  }

  maskRecursive(maskedData);
  return maskedData;
}

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
      // Mask sensitive data before logging
      logObject.data = maskSensitiveData(data);
    }
  }

  // In development, pretty print the log
  if (process.env.NODE_ENV !== 'production') {
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${data ? '\n' + JSON.stringify(logObject.data, null, 2) : ''}`;
  }

  // In production, return JSON for structured logging
  return JSON.stringify(logObject);
}

/**
 * Write log to file
 *
 * @param {string} level - Log level
 * @param {string} formattedMessage - Formatted log message
 */
function writeLogToFile(level, formattedMessage) {
  try {
    // Determine log file based on level
    let logFile = path.join(logsDir, 'combined.log');

    if (level === 'error') {
      // Also write errors to a separate file
      fs.appendFileSync(path.join(logsDir, 'error.log'), formattedMessage + '\n');
    } else if (level === 'security' || level === 'auth') {
      // Write security and auth logs to a separate file
      fs.appendFileSync(path.join(logsDir, 'security.log'), formattedMessage + '\n');
    }

    // Write to combined log
    fs.appendFileSync(logFile, formattedMessage + '\n');
  } catch (error) {
    // If file writing fails, log to console
    console.error('Failed to write log to file:', error);
  }
}

/**
 * Enhanced logger object with methods for different log levels
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
      const formattedMessage = formatLogMessage('error', message, error);
      console.error(formattedMessage);
      writeLogToFile('error', formattedMessage);
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
      const formattedMessage = formatLogMessage('warn', message, data);
      console.warn(formattedMessage);
      writeLogToFile('warn', formattedMessage);
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
      const formattedMessage = formatLogMessage('info', message, data);
      console.info(formattedMessage);
      writeLogToFile('info', formattedMessage);
    }
  },

  /**
   * Log HTTP request message
   *
   * @param {string} message - HTTP message
   * @param {Object} [data] - Additional data
   */
  http(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.http) {
      const formattedMessage = formatLogMessage('http', message, data);
      console.log(formattedMessage);
      writeLogToFile('http', formattedMessage);
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
      const formattedMessage = formatLogMessage('debug', message, data);
      console.debug(formattedMessage);
      writeLogToFile('debug', formattedMessage);
    }
  },

  /**
   * Log authentication event
   *
   * @param {string} message - Auth message
   * @param {Object} [data] - Additional data
   */
  auth(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.info) {
      const formattedMessage = formatLogMessage('auth', `[AUTH] ${message}`, data);
      console.info(formattedMessage);
      writeLogToFile('auth', formattedMessage);
    }
  },

  /**
   * Log security event
   *
   * @param {string} message - Security message
   * @param {Object} [data] - Additional data
   */
  security(message, data) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.warn) {
      const formattedMessage = formatLogMessage('security', `[SECURITY] ${message}`, data);
      console.warn(formattedMessage);
      writeLogToFile('security', formattedMessage);
    }
  }
};

/**
 * Create HTTP request logger middleware
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log when the response is finished
  res.on('finish', () => {
    const responseTime = Date.now() - start;

    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Add user ID if authenticated
    if (req.user) {
      logData.userId = req.user.id;
    }

    logger.http(`API Request: ${req.method} ${req.url}`, logData);
  });

  next();
};

module.exports = {
  logger,
  requestLogger
};
