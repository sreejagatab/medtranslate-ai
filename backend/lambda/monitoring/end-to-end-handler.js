/**
 * End-to-End Monitoring Lambda Handler for MedTranslate AI
 *
 * This module provides API handlers for end-to-end transaction monitoring.
 */

const endToEndMonitoring = require('../../monitoring/end-to-end-monitoring');
const authService = require('../auth/auth-service');

/**
 * Start a new transaction
 */
exports.startTransaction = async (event) => {
  try {
    console.log('Start transaction request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { transactionType, sourceComponent, metadata } = body;

    if (!transactionType || !sourceComponent) {
      return formatResponse(400, {
        success: false,
        error: 'Transaction type and source component are required'
      });
    }

    // Get user ID from token if available
    let userId = null;
    let sessionId = body.sessionId || null;
    
    const token = getTokenFromHeader(event);
    if (token) {
      try {
        const decodedToken = await authService.verifyToken(token);
        if (decodedToken) {
          userId = decodedToken.sub;
          
          // If session ID is not provided but exists in token, use it
          if (!sessionId && decodedToken.sessionId) {
            sessionId = decodedToken.sessionId;
          }
        }
      } catch (error) {
        console.warn('Invalid token in request, continuing without user ID');
      }
    }

    // Start transaction
    const result = await endToEndMonitoring.startTransaction({
      transactionType,
      userId,
      sessionId,
      sourceComponent,
      metadata: metadata || {}
    });

    return formatResponse(200, {
      success: true,
      transactionId: result.transactionId,
      startTime: result.startTime,
      status: result.status
    });
  } catch (error) {
    console.error('Error starting transaction:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to start transaction',
      message: error.message
    });
  }
};

/**
 * Update an existing transaction
 */
exports.updateTransaction = async (event) => {
  try {
    console.log('Update transaction request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { transactionId, component, action, status, metadata, errorDetails } = body;

    if (!transactionId || !component || !action) {
      return formatResponse(400, {
        success: false,
        error: 'Transaction ID, component, and action are required'
      });
    }

    // Update transaction
    const result = await endToEndMonitoring.updateTransaction({
      transactionId,
      component,
      action,
      status: status || 'success',
      metadata: metadata || {},
      errorDetails: errorDetails || null
    });

    return formatResponse(200, {
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to update transaction',
      message: error.message
    });
  }
};

/**
 * Complete a transaction
 */
exports.completeTransaction = async (event) => {
  try {
    console.log('Complete transaction request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { transactionId, status, component, metadata, errorDetails } = body;

    if (!transactionId) {
      return formatResponse(400, {
        success: false,
        error: 'Transaction ID is required'
      });
    }

    // Complete transaction
    const result = await endToEndMonitoring.completeTransaction({
      transactionId,
      status: status || 'completed',
      component,
      metadata: metadata || {},
      errorDetails: errorDetails || null
    });

    return formatResponse(200, {
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      endTime: result.endTime,
      duration: result.duration
    });
  } catch (error) {
    console.error('Error completing transaction:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to complete transaction',
      message: error.message
    });
  }
};

/**
 * Get transaction details
 */
exports.getTransaction = async (event) => {
  try {
    console.log('Get transaction request received');

    // Get transaction ID from path parameters
    const transactionId = event.pathParameters?.transactionId;

    if (!transactionId) {
      return formatResponse(400, {
        success: false,
        error: 'Transaction ID is required'
      });
    }

    // Get transaction
    const transaction = await endToEndMonitoring.getTransaction(transactionId);

    return formatResponse(200, {
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get transaction',
      message: error.message
    });
  }
};

/**
 * Get transactions by user
 */
exports.getTransactionsByUser = async (event) => {
  try {
    console.log('Get transactions by user request received');

    // Get user ID from path parameters
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return formatResponse(400, {
        success: false,
        error: 'User ID is required'
      });
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const options = {
      limit: parseInt(queryParams.limit) || 100,
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      status: queryParams.status,
      transactionType: queryParams.transactionType
    };

    // Get transactions
    const result = await endToEndMonitoring.getTransactionsByUser(userId, options);

    return formatResponse(200, {
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting transactions by user:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get transactions',
      message: error.message
    });
  }
};

/**
 * Get transactions by session
 */
exports.getTransactionsBySession = async (event) => {
  try {
    console.log('Get transactions by session request received');

    // Get session ID from path parameters
    const sessionId = event.pathParameters?.sessionId;

    if (!sessionId) {
      return formatResponse(400, {
        success: false,
        error: 'Session ID is required'
      });
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const options = {
      limit: parseInt(queryParams.limit) || 100,
      status: queryParams.status,
      transactionType: queryParams.transactionType
    };

    // Get transactions
    const result = await endToEndMonitoring.getTransactionsBySession(sessionId, options);

    return formatResponse(200, {
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting transactions by session:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get transactions',
      message: error.message
    });
  }
};

/**
 * Get transaction metrics
 */
exports.getTransactionMetrics = async (event) => {
  try {
    console.log('Get transaction metrics request received');

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const options = {
      startTime: queryParams.startTime,
      endTime: queryParams.endTime,
      transactionType: queryParams.transactionType,
      component: queryParams.component
    };

    // Get metrics
    const metrics = await endToEndMonitoring.getTransactionMetrics(options);

    return formatResponse(200, {
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error getting transaction metrics:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get transaction metrics',
      message: error.message
    });
  }
};

/**
 * Helper function to format Lambda response
 */
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Helper function to extract token from Authorization header
 */
function getTokenFromHeader(event) {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}
