/**
 * Authentication Lambda Handler for MedTranslate AI
 *
 * This Lambda function handles authentication requests, including
 * provider login, session creation, and patient session joining.
 */

const authService = require('./auth-service');

/**
 * Provider login handler
 */
exports.login = async (event) => {
  try {
    console.log('Provider login request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { username, password, mfaToken } = body;

    // Validate required parameters
    if (!username || !password) {
      return formatResponse(400, {
        success: false,
        error: 'Missing required parameters: username, password'
      });
    }

    // Authenticate provider
    const result = await authService.authenticateProvider(username, password, mfaToken);

    if (!result.success) {
      return formatResponse(401, result);
    }

    // If MFA is required but not provided, return 200 with mfaRequired flag
    if (result.mfaRequired) {
      return formatResponse(200, result);
    }

    return formatResponse(200, result);
  } catch (error) {
    console.error('Error processing login request:', error);
    return formatResponse(500, {
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
};

/**
 * Create session handler
 */
exports.createSession = async (event) => {
  try {
    console.log('Create session request received');

    // Verify provider token
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }

    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken || decodedToken.type !== 'provider') {
      return formatResponse(403, {
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { medicalContext } = body;

    // Create session
    const result = await authService.createSession(
      decodedToken.sub,
      decodedToken.name,
      medicalContext
    );

    if (!result.success) {
      return formatResponse(500, result);
    }

    return formatResponse(200, result);
  } catch (error) {
    console.error('Error creating session:', error);
    return formatResponse(500, {
      success: false,
      error: 'Session creation failed',
      message: error.message
    });
  }
};

/**
 * Generate patient session token handler
 */
exports.generatePatientToken = async (event) => {
  try {
    console.log('Generate patient token request received');

    // Verify provider token
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }

    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken || decodedToken.type !== 'provider') {
      return formatResponse(403, {
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { sessionId, language } = body;

    // Validate required parameters
    if (!sessionId || !language) {
      return formatResponse(400, {
        success: false,
        error: 'Missing required parameters: sessionId, language'
      });
    }

    // Generate patient token
    const result = await authService.generatePatientSessionToken(sessionId, language);

    return formatResponse(200, {
      success: true,
      token: result.token,
      sessionCode: result.sessionCode
    });
  } catch (error) {
    console.error('Error generating patient token:', error);
    return formatResponse(500, {
      success: false,
      error: 'Token generation failed',
      message: error.message
    });
  }
};

/**
 * Join session handler
 */
exports.joinSession = async (event) => {
  try {
    console.log('Join session request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { sessionCode } = body;

    // Validate required parameters
    if (!sessionCode) {
      return formatResponse(400, {
        success: false,
        error: 'Missing required parameter: sessionCode'
      });
    }

    // Join session
    const result = await authService.joinSessionWithCode(sessionCode);

    if (!result.success) {
      return formatResponse(400, result);
    }

    return formatResponse(200, result);
  } catch (error) {
    console.error('Error joining session:', error);
    return formatResponse(500, {
      success: false,
      error: 'Session join failed',
      message: error.message
    });
  }
};

/**
 * End session handler
 */
exports.endSession = async (event) => {
  try {
    console.log('End session request received');

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
    const { sessionId } = body;

    // Validate required parameters
    if (!sessionId) {
      return formatResponse(400, {
        success: false,
        error: 'Missing required parameter: sessionId'
      });
    }

    // End session
    const result = await authService.endSession(sessionId);

    if (!result.success) {
      return formatResponse(500, result);
    }

    return formatResponse(200, {
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    console.error('Error ending session:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to end session',
      message: error.message
    });
  }
};

/**
 * Verify token handler
 */
exports.verifyToken = async (event) => {
  try {
    console.log('Verify token request received');

    // Get token from header
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        valid: false,
        error: 'No token provided'
      });
    }

    // Verify token
    const decodedToken = await authService.verifyToken(token);

    if (!decodedToken) {
      return formatResponse(200, {
        valid: false,
        error: 'Invalid or expired token'
      });
    }

    return formatResponse(200, {
      valid: true,
      user: {
        sub: decodedToken.sub,
        type: decodedToken.type,
        name: decodedToken.name,
        role: decodedToken.role
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return formatResponse(500, {
      valid: false,
      error: 'Token verification failed',
      message: error.message
    });
  }
};

/**
 * Register user handler
 */
exports.register = async (event) => {
  try {
    console.log('Register user request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { name, email, password, role, specialty } = body;

    // Validate required parameters
    if (!name || !email || !password) {
      return formatResponse(400, {
        success: false,
        error: 'Missing required parameters: name, email, password'
      });
    }

    // Check if role is admin and verify admin token
    if (role === 'admin') {
      const token = getTokenFromHeader(event);
      if (!token) {
        return formatResponse(403, {
          success: false,
          error: 'Admin creation requires authentication'
        });
      }

      const decodedToken = await authService.verifyToken(token);
      if (!decodedToken || decodedToken.role !== 'admin') {
        return formatResponse(403, {
          success: false,
          error: 'Only existing admins can create new admin accounts'
        });
      }
    }

    // Register user
    const result = await authService.registerUser({
      name,
      email,
      password,
      role: role || 'provider',
      specialty: specialty || 'general'
    });

    if (!result.success) {
      return formatResponse(400, result);
    }

    // Generate token for the new user
    const token = await authService.generateToken({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role
    });

    return formatResponse(201, {
      success: true,
      token,
      user: result.user
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return formatResponse(500, {
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
};

/**
 * Get users handler (admin only)
 */
exports.getUsers = async (event) => {
  try {
    console.log('Get users request received');

    // Verify admin token
    const token = getTokenFromHeader(event);
    if (!token) {
      return formatResponse(401, {
        success: false,
        error: 'Authentication required'
      });
    }

    const decodedToken = await authService.verifyToken(token);
    if (!decodedToken || decodedToken.role !== 'admin') {
      return formatResponse(403, {
        success: false,
        error: 'Admin access required'
      });
    }

    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const { role, active } = queryParams;

    // Prepare filter options
    const options = {};
    if (role) options.role = role;
    if (active !== undefined) options.active = active === 'true';

    // Get users
    const users = await authService.getUsers(options);

    return formatResponse(200, {
      success: true,
      users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get users',
      message: error.message
    });
  }
};

/**
 * Update user handler
 */
exports.updateUser = async (event) => {
  try {
    console.log('Update user request received');

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

    // Get user ID from path parameters
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return formatResponse(400, {
        success: false,
        error: 'User ID is required'
      });
    }

    // Check permissions (admin or self)
    if (decodedToken.role !== 'admin' && decodedToken.sub !== userId) {
      return formatResponse(403, {
        success: false,
        error: 'You do not have permission to update this user'
      });
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Prevent role escalation
    if (body.role === 'admin' && decodedToken.role !== 'admin') {
      return formatResponse(403, {
        success: false,
        error: 'Only admins can assign admin role'
      });
    }

    // Update user
    const result = await authService.updateUser(userId, body);

    if (!result.success) {
      return formatResponse(400, result);
    }

    return formatResponse(200, result);
  } catch (error) {
    console.error('Error updating user:', error);
    return formatResponse(500, {
      success: false,
      error: 'Update failed',
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
