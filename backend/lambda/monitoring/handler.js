/**
 * Monitoring API Handler for MedTranslate AI
 * 
 * This Lambda function handles monitoring-related API requests.
 */

const monitoringService = require('../../services/monitoring-service');
const authService = require('../auth/auth-service');

/**
 * Helper function to get token from Authorization header
 *
 * @param {Object} event - Lambda event
 * @returns {string|null} - JWT token or null if not found
 */
function getTokenFromHeader(event) {
  const headers = event.headers || {};
  const authHeader = headers.Authorization || headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Helper function to format Lambda response
 *
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} - Formatted Lambda response
 */
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(body)
  };
}

/**
 * Get system health status
 */
exports.getSystemHealth = async (event) => {
  try {
    console.log('Get system health request received');

    // Get token from header
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken) {
      return formatResponse(401, {
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check if user has admin role
    if (decodedToken.role !== 'admin') {
      return formatResponse(403, {
        success: false,
        error: 'Admin role required'
      });
    }

    // Get system health
    const health = await monitoringService.getSystemHealth();

    return formatResponse(200, {
      success: true,
      health
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get system health',
      message: error.message
    });
  }
};

/**
 * Get component health status
 */
exports.getComponentHealth = async (event) => {
  try {
    console.log('Get component health request received');

    // Get token from header
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken) {
      return formatResponse(401, {
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check if user has admin role
    if (decodedToken.role !== 'admin') {
      return formatResponse(403, {
        success: false,
        error: 'Admin role required'
      });
    }

    // Get component from path parameters
    const component = event.pathParameters?.component;
    if (!component) {
      return formatResponse(400, {
        success: false,
        error: 'Component is required'
      });
    }

    // Check if component is valid
    if (!Object.values(monitoringService.SYSTEM_COMPONENTS).includes(component)) {
      return formatResponse(400, {
        success: false,
        error: 'Invalid component'
      });
    }

    // Get component health
    const health = await monitoringService.checkComponentHealth(component);

    return formatResponse(200, {
      success: true,
      health
    });
  } catch (error) {
    console.error('Error getting component health:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get component health',
      message: error.message
    });
  }
};

/**
 * Get active alerts
 */
exports.getActiveAlerts = async (event) => {
  try {
    console.log('Get active alerts request received');

    // Get token from header
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken) {
      return formatResponse(401, {
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check if user has admin role
    if (decodedToken.role !== 'admin') {
      return formatResponse(403, {
        success: false,
        error: 'Admin role required'
      });
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const filters = {};
    if (queryParams.component) filters.component = queryParams.component;
    if (queryParams.severity) filters.severity = queryParams.severity;

    // Get active alerts
    const alerts = await monitoringService.getActiveAlerts(filters);

    return formatResponse(200, {
      success: true,
      alerts
    });
  } catch (error) {
    console.error('Error getting active alerts:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get active alerts',
      message: error.message
    });
  }
};

/**
 * Resolve an alert
 */
exports.resolveAlert = async (event) => {
  try {
    console.log('Resolve alert request received');

    // Get token from header
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken) {
      return formatResponse(401, {
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check if user has admin role
    if (decodedToken.role !== 'admin') {
      return formatResponse(403, {
        success: false,
        error: 'Admin role required'
      });
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { alertId, resolution } = body;

    if (!alertId || !resolution) {
      return formatResponse(400, {
        success: false,
        error: 'Alert ID and resolution are required'
      });
    }

    // Resolve alert
    const alert = await monitoringService.resolveAlert(alertId, resolution);

    return formatResponse(200, {
      success: true,
      alert
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to resolve alert',
      message: error.message
    });
  }
};

/**
 * Create an alert
 */
exports.createAlert = async (event) => {
  try {
    console.log('Create alert request received');

    // Get token from header
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken) {
      return formatResponse(401, {
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check if user has admin role
    if (decodedToken.role !== 'admin') {
      return formatResponse(403, {
        success: false,
        error: 'Admin role required'
      });
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { component, message, severity, details } = body;

    if (!component || !message) {
      return formatResponse(400, {
        success: false,
        error: 'Component and message are required'
      });
    }

    // Check if component is valid
    if (!Object.values(monitoringService.SYSTEM_COMPONENTS).includes(component)) {
      return formatResponse(400, {
        success: false,
        error: 'Invalid component'
      });
    }

    // Check if severity is valid
    if (severity && !Object.values(monitoringService.ALERT_SEVERITY).includes(severity)) {
      return formatResponse(400, {
        success: false,
        error: 'Invalid severity'
      });
    }

    // Create alert
    const alert = await monitoringService.createAlert(
      component,
      message,
      severity || monitoringService.ALERT_SEVERITY.WARNING,
      details || {}
    );

    return formatResponse(200, {
      success: true,
      alert
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to create alert',
      message: error.message
    });
  }
};

/**
 * Get system metrics
 */
exports.getSystemMetrics = async (event) => {
  try {
    console.log('Get system metrics request received');

    // Get token from header
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken) {
      return formatResponse(401, {
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check if user has admin role
    if (decodedToken.role !== 'admin') {
      return formatResponse(403, {
        success: false,
        error: 'Admin role required'
      });
    }

    // Get system metrics
    const metrics = await monitoringService.getSystemMetrics();

    return formatResponse(200, {
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error getting system metrics:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get system metrics',
      message: error.message
    });
  }
};
