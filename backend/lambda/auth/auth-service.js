/**
 * Authentication Service for MedTranslate AI
 *
 * This module provides functions for user authentication, session management,
 * and secure token generation.
 */

const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const secretsManager = new AWS.SecretsManager();

// Constants
const TOKEN_EXPIRY = '24h'; // Provider session token expiry
const TEMP_TOKEN_EXPIRY = '4h'; // Patient temporary token expiry

/**
 * Get JWT secret from AWS Secrets Manager
 *
 * @returns {Promise<string>} - JWT secret
 */
async function getJwtSecret() {
  try {
    // For local development, use a hardcoded secret
    if (process.env.NODE_ENV === 'development') {
      return 'local-development-secret';
    }

    const data = await secretsManager.getSecretValue({
      SecretId: process.env.JWT_SECRET_ARN || 'MedTranslateJwtSecret'
    }).promise();

    return JSON.parse(data.SecretString).secret;
  } catch (error) {
    console.error('Error retrieving JWT secret:', error);
    // Fallback to local secret for development
    return 'local-development-secret';
  }
}

/**
 * Generate a provider JWT token
 *
 * @param {string} providerId - Provider ID
 * @param {string} name - Provider name
 * @param {string} role - Provider role
 * @returns {Promise<string>} - JWT token
 */
async function generateProviderToken(providerId, name, role) {
  const secret = await getJwtSecret();

  const payload = {
    sub: providerId,
    name,
    role,
    type: 'provider'
  };

  return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Generate a temporary patient session token
 *
 * @param {string} sessionId - Session ID
 * @param {string} language - Patient language code
 * @returns {Promise<Object>} - Token and session code
 */
async function generatePatientSessionToken(sessionId, language) {
  const secret = await getJwtSecret();

  // Generate a random session code for easy joining
  const sessionCode = crypto.randomInt(100000, 999999).toString();

  const payload = {
    sub: `patient-${crypto.randomUUID()}`,
    sessionId,
    sessionCode,
    language,
    type: 'patient'
  };

  const token = jwt.sign(payload, secret, { expiresIn: TEMP_TOKEN_EXPIRY });

  // Store the session information
  await dynamoDB.put({
    TableName: process.env.SESSIONS_TABLE || 'MedTranslateSessions',
    Item: {
      sessionId,
      sessionCode,
      patientToken: token,
      language,
      createdAt: new Date().toISOString(),
      status: 'active'
    }
  }).promise();

  return { token, sessionCode };
}

/**
 * Verify and decode a JWT token
 *
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object|null>} - Decoded token payload or null if invalid
 */
async function verifyToken(token) {
  try {
    const secret = await getJwtSecret();
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Join a session with session code
 *
 * @param {string} sessionCode - Session code
 * @returns {Promise<Object>} - Session join result
 */
async function joinSessionWithCode(sessionCode) {
  try {
    // For local development, use hardcoded session
    if (process.env.NODE_ENV === 'development') {
      console.log(`Joining session with code: ${sessionCode}`);

      // Generate a patient token
      const sessionId = `session-${Date.now()}`;
      const language = 'es'; // Default to Spanish for demo

      const token = jwt.sign({
        sub: `patient-${crypto.randomUUID()}`,
        sessionId,
        sessionCode,
        language,
        type: 'patient'
      }, 'local-development-secret', { expiresIn: TEMP_TOKEN_EXPIRY });

      return {
        success: true,
        token,
        sessionId,
        language
      };
    }

    // Query for the session
    const result = await dynamoDB.query({
      TableName: process.env.SESSIONS_TABLE || 'MedTranslateSessions',
      IndexName: 'SessionCodeIndex',
      KeyConditionExpression: 'sessionCode = :code',
      ExpressionAttributeValues: {
        ':code': sessionCode,
        ':status': 'active'
      },
      FilterExpression: 'status = :status'
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      return { success: false, error: 'Invalid session code or expired session' };
    }

    const session = result.Items[0];

    // Check if the token is still valid by trying to verify it
    const decodedToken = await verifyToken(session.patientToken);
    if (!decodedToken) {
      return { success: false, error: 'Session has expired' };
    }

    return {
      success: true,
      token: session.patientToken,
      sessionId: session.sessionId,
      language: session.language
    };
  } catch (error) {
    console.error('Error joining session:', error);
    return { success: false, error: 'Session join failed' };
  }
}

/**
 * Create a new translation session
 *
 * @param {string} providerId - Provider ID
 * @param {string} providerName - Provider name
 * @param {string} medicalContext - Medical context
 * @returns {Promise<Object>} - Session creation result
 */
async function createSession(providerId, providerName, medicalContext = 'general') {
  try {
    // For local development, use in-memory storage
    if (process.env.NODE_ENV === 'development') {
      const sessionId = `session-${Date.now()}`;
      const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();

      // In a real implementation, this would be stored in DynamoDB
      console.log(`Creating session: ${sessionId}, code: ${sessionCode}, context: ${medicalContext}`);

      return {
        success: true,
        sessionId,
        sessionCode,
        providerName,
        medicalContext
      };
    }

    const sessionId = crypto.randomUUID();

    // Create session record
    await dynamoDB.put({
      TableName: process.env.SESSIONS_TABLE || 'MedTranslateSessions',
      Item: {
        sessionId,
        providerId,
        providerName,
        medicalContext,
        createdAt: new Date().toISOString(),
        status: 'created',
        patientJoined: false
      }
    }).promise();

    return {
      success: true,
      sessionId,
      providerName,
      medicalContext
    };
  } catch (error) {
    console.error('Error creating session:', error);
    return { success: false, error: 'Session creation failed' };
  }
}

/**
 * End a translation session
 *
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Session end result
 */
async function endSession(sessionId) {
  try {
    // For local development, use in-memory storage
    if (process.env.NODE_ENV === 'development') {
      console.log(`Ending session: ${sessionId}`);
      return { success: true };
    }

    // Update session status
    await dynamoDB.update({
      TableName: process.env.SESSIONS_TABLE || 'MedTranslateSessions',
      Key: { sessionId },
      UpdateExpression: 'SET #status = :status, endedAt = :endedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'ended',
        ':endedAt': new Date().toISOString()
      }
    }).promise();

    return { success: true };
  } catch (error) {
    console.error('Error ending session:', error);
    return { success: false, error: 'Failed to end session' };
  }
}

/**
 * Authenticate a provider with username and password
 *
 * @param {string} username - Provider username
 * @param {string} password - Provider password
 * @param {string} mfaToken - Optional MFA token
 * @returns {Promise<Object>} - Authentication result
 */
async function authenticateProvider(username, password, mfaToken = null) {
  try {
    // For local development, use hardcoded credentials
    if (process.env.NODE_ENV === 'development') {
      // Demo user for local development
      if (username === 'demo' && password === 'demo123') {
        const token = await generateProviderToken(
          'provider-demo',
          'Demo Provider',
          'doctor'
        );

        return {
          success: true,
          token,
          provider: {
            providerId: 'provider-demo',
            name: 'Demo Provider',
            role: 'doctor'
          },
          mfaRequired: false
        };
      }

      return { success: false, error: 'Invalid username or password' };
    }

    // Get provider from database
    const result = await dynamoDB.get({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { username }
    }).promise();

    if (!result.Item) {
      return { success: false, error: 'Invalid username or password' };
    }

    const provider = result.Item;

    // Verify password
    const hashedPassword = crypto
      .createHmac('sha256', provider.salt)
      .update(password)
      .digest('hex');

    if (hashedPassword !== provider.password) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Check if MFA is enabled for this user
    if (provider.mfaEnabled) {
      // If MFA is enabled but no token provided, return success but require MFA
      if (!mfaToken) {
        return {
          success: true,
          mfaRequired: true,
          provider: {
            providerId: provider.providerId,
            name: provider.name,
            role: provider.role
          }
        };
      }

      // Verify MFA token
      const mfaService = require('./mfa-service');
      const isValidToken = mfaService.verifyToken(provider.mfaSecret, mfaToken);

      if (!isValidToken) {
        return {
          success: false,
          error: 'Invalid MFA code',
          mfaRequired: true
        };
      }
    }

    // Generate token
    const token = await generateProviderToken(
      provider.providerId,
      provider.name,
      provider.role
    );

    return {
      success: true,
      token,
      provider: {
        providerId: provider.providerId,
        name: provider.name,
        role: provider.role
      },
      mfaRequired: false
    };
  } catch (error) {
    console.error('Error authenticating provider:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Register a new user
 *
 * @param {Object} userData - User data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @param {string} userData.role - User's role (default: 'provider')
 * @param {string} userData.specialty - User's specialty (for providers)
 * @returns {Promise<Object>} - Result of registration
 */
async function registerUser(userData) {
  try {
    // Validate required fields
    if (!userData.name || !userData.email || !userData.password) {
      return {
        success: false,
        error: 'Name, email, and password are required'
      };
    }

    // For local development, use in-memory storage
    if (process.env.NODE_ENV === 'development') {
      console.log(`Registering user: ${userData.name}, ${userData.email}`);

      // Generate a unique ID
      const userId = `user-${Date.now()}`;

      return {
        success: true,
        user: {
          id: userId,
          name: userData.name,
          email: userData.email,
          role: userData.role || 'provider',
          specialty: userData.specialty || 'general'
        }
      };
    }

    // Check if email already exists
    const emailCheckResult = await dynamoDB.scan({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': userData.email
      }
    }).promise();

    if (emailCheckResult.Items && emailCheckResult.Items.length > 0) {
      return {
        success: false,
        error: 'Email already in use'
      };
    }

    // Generate user ID and salt
    const userId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');

    // Hash password
    const hashedPassword = crypto
      .createHmac('sha256', salt)
      .update(userData.password)
      .digest('hex');

    // Create user object
    const newUser = {
      providerId: userId,
      username: userData.email,
      email: userData.email,
      password: hashedPassword,
      salt,
      name: userData.name,
      role: userData.role || 'provider',
      specialty: userData.specialty || 'general',
      active: true,
      createdAt: new Date().toISOString()
    };

    // Save to database
    await dynamoDB.put({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Item: newUser
    }).promise();

    // Return success with user info (excluding password)
    const { password, salt: userSalt, ...userWithoutPassword } = newUser;
    return {
      success: true,
      user: {
        id: userId,
        ...userWithoutPassword
      }
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      error: 'Registration failed'
    };
  }
}

/**
 * Get users with optional filtering
 *
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} - Array of users
 */
async function getUsers(options = {}) {
  try {
    // For local development, return mock data
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          id: 'provider-demo',
          name: 'Demo Provider',
          email: 'demo@example.com',
          role: 'doctor',
          specialty: 'general',
          active: true
        }
      ];
    }

    // Scan the providers table
    const result = await dynamoDB.scan({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders'
    }).promise();

    // Filter and format users
    let users = result.Items || [];

    // Apply filters
    if (options.role) {
      users = users.filter(user => user.role === options.role);
    }

    if (options.active !== undefined) {
      users = users.filter(user => user.active === options.active);
    }

    // Remove sensitive information
    return users.map(user => {
      const { password, salt, ...userWithoutPassword } = user;
      return {
        id: user.providerId,
        ...userWithoutPassword
      };
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

/**
 * Update a user
 *
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Result of update
 */
async function updateUser(userId, updates) {
  try {
    // For local development, return mock data
    if (process.env.NODE_ENV === 'development') {
      console.log(`Updating user ${userId} with:`, updates);
      return {
        success: true,
        user: {
          id: userId,
          name: updates.name || 'Updated User',
          email: updates.email || 'updated@example.com',
          role: updates.role || 'provider',
          specialty: updates.specialty || 'general',
          active: updates.active !== undefined ? updates.active : true
        }
      };
    }

    // Get the user
    const userResult = await dynamoDB.get({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { providerId: userId }
    }).promise();

    if (!userResult.Item) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Prepare update expression
    let updateExpression = 'SET ';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Process each update field
    Object.entries(updates).forEach(([key, value], index) => {
      // Skip password for now (handle separately)
      if (key === 'password') return;

      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;

      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;

      updateExpression += `${index > 0 ? ', ' : ''}${attrName} = ${attrValue}`;
    });

    // Add updatedAt
    updateExpression += ', #updatedAt = :updatedAt';
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    // Handle password update if provided
    if (updates.password) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hashedPassword = crypto
        .createHmac('sha256', salt)
        .update(updates.password)
        .digest('hex');

      updateExpression += ', #pwd = :pwd, #salt = :salt';
      expressionAttributeNames['#pwd'] = 'password';
      expressionAttributeNames['#salt'] = 'salt';
      expressionAttributeValues[':pwd'] = hashedPassword;
      expressionAttributeValues[':salt'] = salt;
    }

    // Update the user
    await dynamoDB.update({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { providerId: userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }).promise();

    // Get the updated user
    const updatedUserResult = await dynamoDB.get({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { providerId: userId }
    }).promise();

    // Return the updated user without sensitive information
    const { password, salt, ...userWithoutPassword } = updatedUserResult.Item;
    return {
      success: true,
      user: {
        id: userId,
        ...userWithoutPassword
      }
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      success: false,
      error: 'Update failed'
    };
  }
}

module.exports = {
  generateProviderToken,
  generatePatientSessionToken,
  verifyToken,
  joinSessionWithCode,
  createSession,
  endSession,
  authenticateProvider,
  registerUser,
  getUsers,
  updateUser
};
