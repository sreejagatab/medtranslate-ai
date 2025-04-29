/**
 * Analytics API Handler for MedTranslate AI
 * 
 * This Lambda function handles analytics-related API requests.
 */

const analyticsService = require('../../services/analytics-service');
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
 * Track an analytics event
 */
exports.trackEvent = async (event) => {
  try {
    console.log('Track event request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { eventType, eventData } = body;

    if (!eventType) {
      return formatResponse(400, {
        success: false,
        error: 'Event type is required'
      });
    }

    // Get user ID from token if available
    let userId = null;
    const token = getTokenFromHeader(event);
    if (token) {
      const decodedToken = await authService.verifyToken(token);
      if (decodedToken) {
        userId = decodedToken.sub;
      }
    }

    // Track event
    const result = await analyticsService.trackEvent(
      eventType,
      eventData || {},
      userId,
      body.sessionId
    );

    return formatResponse(200, {
      success: true,
      eventId: result.eventId
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to track event',
      message: error.message
    });
  }
};

/**
 * Track a translation event
 */
exports.trackTranslation = async (event) => {
  try {
    console.log('Track translation request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { translation, status } = body;

    if (!translation) {
      return formatResponse(400, {
        success: false,
        error: 'Translation data is required'
      });
    }

    // Get user ID from token if available
    let userId = null;
    const token = getTokenFromHeader(event);
    if (token) {
      const decodedToken = await authService.verifyToken(token);
      if (decodedToken) {
        userId = decodedToken.sub;
      }
    }

    // Track translation
    const result = await analyticsService.trackTranslation(
      translation,
      status || 'completed',
      userId,
      body.sessionId
    );

    return formatResponse(200, {
      success: true,
      eventId: result.eventId
    });
  } catch (error) {
    console.error('Error tracking translation:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to track translation',
      message: error.message
    });
  }
};

/**
 * Track a session event
 */
exports.trackSession = async (event) => {
  try {
    console.log('Track session request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { action, sessionData } = body;

    if (!action || !sessionData) {
      return formatResponse(400, {
        success: false,
        error: 'Action and session data are required'
      });
    }

    // Get user ID from token if available
    let userId = null;
    const token = getTokenFromHeader(event);
    if (token) {
      const decodedToken = await authService.verifyToken(token);
      if (decodedToken) {
        userId = decodedToken.sub;
      }
    }

    // Track session
    const result = await analyticsService.trackSession(
      action,
      sessionData,
      userId
    );

    return formatResponse(200, {
      success: true,
      eventId: result.eventId
    });
  } catch (error) {
    console.error('Error tracking session:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to track session',
      message: error.message
    });
  }
};

/**
 * Track an error event
 */
exports.trackError = async (event) => {
  try {
    console.log('Track error request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { error, context } = body;

    if (!error || !context) {
      return formatResponse(400, {
        success: false,
        error: 'Error and context are required'
      });
    }

    // Get user ID from token if available
    let userId = null;
    const token = getTokenFromHeader(event);
    if (token) {
      const decodedToken = await authService.verifyToken(token);
      if (decodedToken) {
        userId = decodedToken.sub;
      }
    }

    // Track error
    const result = await analyticsService.trackError(
      error,
      context,
      userId,
      body.sessionId
    );

    return formatResponse(200, {
      success: true,
      eventId: result.eventId
    });
  } catch (error) {
    console.error('Error tracking error:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to track error',
      message: error.message
    });
  }
};

/**
 * Track user feedback
 */
exports.trackFeedback = async (event) => {
  try {
    console.log('Track feedback request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { feedback } = body;

    if (!feedback) {
      return formatResponse(400, {
        success: false,
        error: 'Feedback data is required'
      });
    }

    // Get user ID from token if available
    let userId = null;
    const token = getTokenFromHeader(event);
    if (token) {
      const decodedToken = await authService.verifyToken(token);
      if (decodedToken) {
        userId = decodedToken.sub;
      }
    }

    // Track feedback
    const result = await analyticsService.trackFeedback(
      feedback,
      userId,
      body.sessionId
    );

    return formatResponse(200, {
      success: true,
      eventId: result.eventId
    });
  } catch (error) {
    console.error('Error tracking feedback:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to track feedback',
      message: error.message
    });
  }
};

/**
 * Get analytics data
 */
exports.getAnalyticsData = async (event) => {
  try {
    console.log('Get analytics data request received');

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
    const startDate = queryParams.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = queryParams.endDate || new Date().toISOString();
    
    // Parse filters
    const filters = {};
    if (queryParams.eventType) filters.eventType = queryParams.eventType;
    if (queryParams.userId) filters.userId = queryParams.userId;
    if (queryParams.sessionId) filters.sessionId = queryParams.sessionId;

    // Get analytics data
    const data = await analyticsService.getAnalyticsData(startDate, endDate, filters);

    return formatResponse(200, {
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting analytics data:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get analytics data',
      message: error.message
    });
  }
};
