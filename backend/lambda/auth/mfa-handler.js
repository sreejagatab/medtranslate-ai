/**
 * MFA Lambda Handler for MedTranslate AI
 *
 * This Lambda function handles MFA-related requests, including
 * MFA setup, verification, and management.
 */

const mfaService = require('./mfa-service');
const authService = require('./auth-service');

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
 * Generate MFA setup information
 */
exports.generateMfaSetup = async (event) => {
  try {
    console.log('Generate MFA setup request received');

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

    // Generate MFA setup
    const userId = decodedToken.sub;
    const username = decodedToken.name || decodedToken.email || userId;

    const mfaSetup = await mfaService.generateMfaSecret(userId, username);

    return formatResponse(200, {
      success: true,
      mfaSetup: {
        secret: mfaSetup.secret,
        qrCodeUrl: mfaSetup.qrCodeUrl
      }
    });
  } catch (error) {
    console.error('Error generating MFA setup:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to generate MFA setup',
      message: error.message
    });
  }
};

/**
 * Enable MFA for a user
 */
exports.enableMfa = async (event) => {
  try {
    console.log('Enable MFA request received');

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

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { secret, verificationCode } = body;

    if (!secret || !verificationCode) {
      return formatResponse(400, {
        success: false,
        error: 'Secret and verification code are required'
      });
    }

    // Enable MFA
    const userId = decodedToken.sub;
    const result = await mfaService.enableMfa(userId, secret, verificationCode);

    if (!result.success) {
      return formatResponse(400, result);
    }

    return formatResponse(200, result);
  } catch (error) {
    console.error('Error enabling MFA:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to enable MFA',
      message: error.message
    });
  }
};

/**
 * Disable MFA for a user
 */
exports.disableMfa = async (event) => {
  try {
    console.log('Disable MFA request received');

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

    // Disable MFA
    const userId = decodedToken.sub;
    const result = await mfaService.disableMfa(userId);

    return formatResponse(200, result);
  } catch (error) {
    console.error('Error disabling MFA:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to disable MFA',
      message: error.message
    });
  }
};

/**
 * Verify MFA token
 */
exports.verifyMfaToken = async (event) => {
  try {
    console.log('Verify MFA token request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { userId, token } = body;

    if (!userId || !token) {
      return formatResponse(400, {
        success: false,
        error: 'User ID and token are required'
      });
    }

    // Get the user's MFA secret
    const tableName = process.env.PROVIDERS_TABLE || 'MedTranslateProviders';
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    
    const userResult = await dynamoDB.get({
      TableName: tableName,
      Key: { providerId: userId }
    }).promise();

    if (!userResult.Item || !userResult.Item.mfaSecret) {
      return formatResponse(400, {
        success: false,
        error: 'MFA not enabled for this user'
      });
    }

    // Verify the token
    const isValid = mfaService.verifyToken(userResult.Item.mfaSecret, token);

    return formatResponse(200, {
      success: true,
      valid: isValid
    });
  } catch (error) {
    console.error('Error verifying MFA token:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to verify MFA token',
      message: error.message
    });
  }
};

/**
 * Verify backup code
 */
exports.verifyBackupCode = async (event) => {
  try {
    console.log('Verify backup code request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { userId, backupCode } = body;

    if (!userId || !backupCode) {
      return formatResponse(400, {
        success: false,
        error: 'User ID and backup code are required'
      });
    }

    // Verify the backup code
    const isValid = await mfaService.verifyBackupCode(userId, backupCode);

    return formatResponse(200, {
      success: true,
      valid: isValid
    });
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to verify backup code',
      message: error.message
    });
  }
};

/**
 * Get MFA status for a user
 */
exports.getMfaStatus = async (event) => {
  try {
    console.log('Get MFA status request received');

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

    // Get MFA status
    const userId = decodedToken.sub;
    const result = await mfaService.getMfaStatus(userId);

    return formatResponse(200, result);
  } catch (error) {
    console.error('Error getting MFA status:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get MFA status',
      message: error.message
    });
  }
};
