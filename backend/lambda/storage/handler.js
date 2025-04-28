/**
 * Secure Storage Lambda Handler for MedTranslate AI
 * 
 * This Lambda function handles secure storage operations, including
 * storing conversation transcripts and retrieving session data.
 */

const secureStorage = require('./secure-storage');
const authService = require('../auth/auth-service');

/**
 * Store conversation transcript handler
 */
exports.storeTranscript = async (event) => {
  try {
    console.log('Store transcript request received');
    
    // Verify token
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }
    
    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken) {
      return formatResponse(403, {
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { sessionId, messages, sessionInfo } = body;
    
    // Validate required parameters
    if (!sessionId || !messages || !sessionInfo) {
      return formatResponse(400, {
        success: false,
        error: 'Missing required parameters: sessionId, messages, sessionInfo'
      });
    }
    
    // Store transcript
    const result = await secureStorage.storeConversationTranscript(
      sessionId,
      messages,
      sessionInfo
    );
    
    return formatResponse(200, {
      success: true,
      objectKey: result.objectKey,
      expirationDate: result.expirationDate
    });
  } catch (error) {
    console.error('Error storing transcript:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to store transcript',
      message: error.message
    });
  }
};

/**
 * Get session data handler
 */
exports.getSessionData = async (event) => {
  try {
    console.log('Get session data request received');
    
    // Verify token
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }
    
    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken) {
      return formatResponse(403, {
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // Get session ID from path parameters
    const sessionId = event.pathParameters?.sessionId;
    
    // Validate required parameters
    if (!sessionId) {
      return formatResponse(400, {
        success: false,
        error: 'Missing required parameter: sessionId'
      });
    }
    
    // Get session data
    const result = await secureStorage.getSessionData(
      sessionId,
      decodedToken.sub,
      decodedToken.type
    );
    
    if (!result.success) {
      return formatResponse(404, result);
    }
    
    return formatResponse(200, result);
  } catch (error) {
    console.error('Error retrieving session data:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to retrieve session data',
      message: error.message
    });
  }
};

/**
 * Clean up expired data handler
 */
exports.cleanupExpiredData = async (event) => {
  try {
    console.log('Cleanup expired data request received');
    
    // Delete expired data
    const result = await secureStorage.deleteExpiredData();
    
    return formatResponse(200, {
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up expired data:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to clean up expired data',
      message: error.message
    });
  }
};

/**
 * Extract token from Authorization header
 * 
 * @param {Object} event - Lambda event
 * @returns {string|null} - JWT token or null if not found
 */
function getTokenFromHeader(event) {
  const headers = event.headers || {};
  const authHeader = headers.Authorization || headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Format Lambda response
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
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
    },
    body: JSON.stringify(body)
  };
}
