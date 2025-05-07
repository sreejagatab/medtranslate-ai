/**
 * Enhanced Authentication Controller for MedTranslate AI
 *
 * This module provides enhanced authentication endpoints with:
 * - Multi-factor authentication
 * - Secure session management
 * - Role-based access control
 * - Device fingerprinting
 */

const express = require('express');
const router = express.Router();
const authService = require('./auth-service');
const enhancedMfa = require('./enhanced-mfa');
const sessionManager = require('./session-manager');
const rbac = require('./rbac');
const { getClientInfo, detectSuspiciousCharacteristics } = require('../utils/device-fingerprint');
const { logger } = require('../utils/logger');

/**
 * Provider login endpoint with enhanced security
 * POST /auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, mfaToken, trustDevice } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Authenticate user with basic credentials
    const user = authService.authenticateUser(email, password);

    if (!user) {
      // Log failed login attempt
      logger.warn('Failed login attempt', {
        email,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if MFA is enabled for this user
    const userMfaEnabled = user.mfaEnabled || false;

    if (userMfaEnabled) {
      // If MFA is enabled but no token provided, return success but require MFA
      if (!mfaToken) {
        return res.status(200).json({
          success: true,
          mfaRequired: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        });
      }

      // Verify MFA token
      const mfaResult = await enhancedMfa.verifyMfa(user.id, mfaToken);

      if (!mfaResult.success) {
        // Log failed MFA attempt
        logger.warn('Failed MFA attempt', {
          userId: user.id,
          email: user.email,
          ip: req.ip
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid MFA code',
          mfaRequired: true
        });
      }
    }

    // Get client information for device fingerprinting
    const clientInfo = getClientInfo(req);

    // Check for suspicious characteristics
    const suspiciousCheck = detectSuspiciousCharacteristics(clientInfo);
    if (suspiciousCheck.hasSuspiciousCharacteristics) {
      logger.warn('Suspicious login characteristics detected', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        characteristics: suspiciousCheck.suspiciousCharacteristics
      });
    }

    // Create session
    const sessionResult = await sessionManager.createSession(user, req);

    if (!sessionResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }

    // If user requested to trust this device, register it
    if (trustDevice) {
      await enhancedMfa.registerTrustedDevice(user.id, {
        name: clientInfo.browser,
        type: clientInfo.deviceType,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    // Get user roles and permissions
    const userRoles = await rbac.getUserRoles(user.id);
    const userPermissions = await rbac.getUserPermissions(user.id);

    // Log successful login
    logger.info('User logged in', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      sessionId: sessionResult.sessionId
    });

    res.json({
      success: true,
      token: sessionResult.token,
      refreshToken: sessionResult.refreshToken,
      expiresIn: sessionResult.expiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      roles: userRoles.success ? userRoles.roles : [],
      permissions: userPermissions.success ? userPermissions.permissions : []
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during login'
    });
  }
});

/**
 * Refresh token endpoint
 * POST /auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Refresh session
    const refreshResult = await sessionManager.refreshSession(refreshToken, req);

    if (!refreshResult.success) {
      return res.status(401).json({
        success: false,
        error: refreshResult.error || 'Invalid refresh token'
      });
    }

    res.json({
      success: true,
      token: refreshResult.token,
      expiresIn: refreshResult.expiresIn
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during token refresh'
    });
  }
});

/**
 * Logout endpoint
 * POST /auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Validate session
    const sessionValidation = await sessionManager.validateSession(token, req);

    if (!sessionValidation.success) {
      return res.status(200).json({
        success: true,
        message: 'Already logged out'
      });
    }

    // Revoke session
    await sessionManager.revokeSession(sessionValidation.sessionId);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during logout'
    });
  }
});

/**
 * Register a new user with enhanced security
 * POST /auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, specialty } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Register user
    const result = authService.registerUser({
      name,
      email,
      password,
      role,
      specialty
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Assign default role to user
    if (role) {
      await rbac.assignRoleToUser(result.user.id, role);
    } else {
      // Assign default user role
      await rbac.assignRoleToUser(result.user.id, rbac.ROLES.USER.name);
    }

    // Create session
    const sessionResult = await sessionManager.createSession(result.user, req);

    if (!sessionResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }

    // Log successful registration
    logger.info('User registered', {
      userId: result.user.id,
      email: result.user.email,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      token: sessionResult.token,
      refreshToken: sessionResult.refreshToken,
      expiresIn: sessionResult.expiresIn,
      user: result.user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during registration'
    });
  }
});

/**
 * Setup MFA endpoint
 * POST /auth/mfa/setup
 */
router.post('/mfa/setup', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate session
    const sessionValidation = await sessionManager.validateSession(token, req);

    if (!sessionValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Generate TOTP secret
    const mfaSetup = await enhancedMfa.generateTotpSecret(
      sessionValidation.userId,
      sessionValidation.email
    );

    if (!mfaSetup.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to setup MFA'
      });
    }

    res.json({
      success: true,
      secret: mfaSetup.secret,
      qrCode: mfaSetup.qrCode
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during MFA setup'
    });
  }
});

/**
 * Verify and enable MFA endpoint
 * POST /auth/mfa/verify
 */
router.post('/mfa/verify', async (req, res) => {
  try {
    const { token: mfaToken } = req.body;
    
    // Get user from token
    const authToken = req.headers.authorization?.split(' ')[1];

    if (!authToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate session
    const sessionValidation = await sessionManager.validateSession(authToken, req);

    if (!sessionValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Verify and enable MFA
    const mfaVerification = await enhancedMfa.verifyAndEnableMfa(
      sessionValidation.userId,
      mfaToken
    );

    if (!mfaVerification.success) {
      return res.status(400).json({
        success: false,
        error: mfaVerification.error || 'Invalid verification code'
      });
    }

    res.json({
      success: true,
      backupCodes: mfaVerification.backupCodes
    });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during MFA verification'
    });
  }
});

/**
 * Disable MFA endpoint
 * POST /auth/mfa/disable
 */
router.post('/mfa/disable', async (req, res) => {
  try {
    const { password } = req.body;
    
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate session
    const sessionValidation = await sessionManager.validateSession(token, req);

    if (!sessionValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Disable MFA
    const mfaDisable = await enhancedMfa.disableMfa(
      sessionValidation.userId,
      password
    );

    if (!mfaDisable.success) {
      return res.status(400).json({
        success: false,
        error: mfaDisable.error || 'Failed to disable MFA'
      });
    }

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while disabling MFA'
    });
  }
});

/**
 * Generate backup codes endpoint
 * POST /auth/mfa/backup-codes
 */
router.post('/mfa/backup-codes', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate session
    const sessionValidation = await sessionManager.validateSession(token, req);

    if (!sessionValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Generate backup codes
    const backupCodes = await enhancedMfa.generateBackupCodes(
      sessionValidation.userId
    );

    res.json({
      success: true,
      backupCodes
    });
  } catch (error) {
    console.error('Backup codes generation error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while generating backup codes'
    });
  }
});

/**
 * Get user sessions endpoint
 * GET /auth/sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate session
    const sessionValidation = await sessionManager.validateSession(token, req);

    if (!sessionValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user sessions
    const sessions = await sessionManager.getUserSessions(
      sessionValidation.userId
    );

    if (!sessions.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get sessions'
      });
    }

    res.json({
      success: true,
      sessions: sessions.sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while getting sessions'
    });
  }
});

/**
 * Revoke session endpoint
 * DELETE /auth/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate session
    const sessionValidation = await sessionManager.validateSession(token, req);

    if (!sessionValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Revoke session
    const revokeResult = await sessionManager.revokeSession(sessionId);

    if (!revokeResult.success) {
      return res.status(400).json({
        success: false,
        error: revokeResult.error || 'Failed to revoke session'
      });
    }

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while revoking session'
    });
  }
});

/**
 * Revoke all sessions endpoint
 * DELETE /auth/sessions
 */
router.delete('/sessions', async (req, res) => {
  try {
    const { keepCurrent } = req.query;
    
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate session
    const sessionValidation = await sessionManager.validateSession(token, req);

    if (!sessionValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Revoke all sessions
    const revokeResult = await sessionManager.revokeAllSessions(
      sessionValidation.userId,
      keepCurrent === 'true' ? sessionValidation.sessionId : null
    );

    if (!revokeResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to revoke sessions'
      });
    }

    res.json({
      success: true,
      message: `${revokeResult.count} sessions revoked successfully`
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while revoking sessions'
    });
  }
});

/**
 * Get user roles endpoint
 * GET /auth/roles
 */
router.get('/roles', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate session
    const sessionValidation = await sessionManager.validateSession(token, req);

    if (!sessionValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user roles
    const roles = await rbac.getUserRoles(sessionValidation.userId);

    if (!roles.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get roles'
      });
    }

    res.json({
      success: true,
      roles: roles.roles
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while getting roles'
    });
  }
});

/**
 * Get user permissions endpoint
 * GET /auth/permissions
 */
router.get('/permissions', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate session
    const sessionValidation = await sessionManager.validateSession(token, req);

    if (!sessionValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user permissions
    const permissions = await rbac.getUserPermissions(sessionValidation.userId);

    if (!permissions.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get permissions'
      });
    }

    res.json({
      success: true,
      permissions: permissions.permissions
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while getting permissions'
    });
  }
});

module.exports = router;
