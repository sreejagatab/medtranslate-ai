/**
 * Secure Session Management for MedTranslate AI
 *
 * This module provides enhanced session management with:
 * - Session timeout and inactivity detection
 * - Session revocation capabilities
 * - Device fingerprinting for enhanced security
 * - Session tracking and analytics
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { logger } = require('../utils/logger');
const { getClientInfo } = require('../utils/device-fingerprint');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Should be in environment variables
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
const REFRESH_TOKEN_EXPIRY = parseInt(process.env.REFRESH_TOKEN_EXPIRY || '30') * 24 * 60 * 60 * 1000; // 30 days in ms
const SESSION_INACTIVITY_TIMEOUT = parseInt(process.env.SESSION_INACTIVITY_TIMEOUT || '30') * 60 * 1000; // 30 minutes in ms
const MAX_SESSIONS_PER_USER = parseInt(process.env.MAX_SESSIONS_PER_USER || '5');
const ENABLE_DEVICE_FINGERPRINTING = process.env.ENABLE_DEVICE_FINGERPRINTING !== 'false';

/**
 * Create a new session for a user
 * 
 * @param {Object} user - User object
 * @param {Object} req - Request object
 * @returns {Promise<Object>} - Session tokens
 */
async function createSession(user, req) {
  try {
    // Generate session ID
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Get client information for device fingerprinting
    const clientInfo = ENABLE_DEVICE_FINGERPRINTING ? getClientInfo(req) : {};
    const deviceFingerprint = ENABLE_DEVICE_FINGERPRINTING ? generateDeviceFingerprint(clientInfo) : null;
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    
    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);
    const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);
    
    // Store session in database
    await db.query(
      `INSERT INTO user_sessions 
       (user_id, session_id, refresh_token, expires_at, ip_address, user_agent, device_fingerprint, device_type, location) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        user.id,
        sessionId,
        refreshTokenHash,
        refreshTokenExpiry,
        req.ip,
        req.headers['user-agent'],
        deviceFingerprint,
        clientInfo.deviceType || 'unknown',
        clientInfo.location || null
      ]
    );
    
    // Check if user has too many active sessions
    await enforceSessionLimit(user.id);
    
    // Log session creation
    logger.info('Session created', {
      userId: user.id,
      sessionId,
      ip: req.ip,
      deviceType: clientInfo.deviceType
    });
    
    return {
      success: true,
      token,
      refreshToken,
      expiresIn: JWT_EXPIRY,
      sessionId
    };
  } catch (error) {
    console.error('Error creating session:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Refresh a session using a refresh token
 * 
 * @param {string} refreshToken - Refresh token
 * @param {Object} req - Request object
 * @returns {Promise<Object>} - New session tokens
 */
async function refreshSession(refreshToken, req) {
  try {
    // Hash the refresh token for comparison
    const refreshTokenHash = hashToken(refreshToken);
    
    // Find session with this refresh token
    const result = await db.query(
      `SELECT s.id, s.user_id, s.session_id, s.device_fingerprint, s.expires_at, u.email, u.role
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.refresh_token = $1 AND s.revoked = false AND s.expires_at > NOW()`,
      [refreshTokenHash]
    );
    
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Invalid refresh token'
      };
    }
    
    const session = result.rows[0];
    
    // Verify device fingerprint if enabled
    if (ENABLE_DEVICE_FINGERPRINTING) {
      const clientInfo = getClientInfo(req);
      const currentFingerprint = generateDeviceFingerprint(clientInfo);
      
      // If fingerprints don't match, this could be a token theft attempt
      if (session.device_fingerprint && currentFingerprint !== session.device_fingerprint) {
        // Log potential security issue
        logger.warn('Fingerprint mismatch during token refresh', {
          sessionId: session.session_id,
          userId: session.user_id,
          storedFingerprint: session.device_fingerprint,
          currentFingerprint,
          ip: req.ip
        });
        
        // Revoke this session as a security measure
        await revokeSession(session.session_id);
        
        return {
          success: false,
          error: 'Security validation failed',
          code: 'SECURITY_VALIDATION_FAILED'
        };
      }
    }
    
    // Generate new JWT token
    const token = jwt.sign(
      {
        userId: session.user_id,
        email: session.email,
        role: session.role,
        sessionId: session.session_id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    
    // Update session last activity
    await db.query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE id = $1',
      [session.id]
    );
    
    return {
      success: true,
      token,
      refreshToken, // Same refresh token, no need to change it
      expiresIn: JWT_EXPIRY,
      sessionId: session.session_id
    };
  } catch (error) {
    console.error('Error refreshing session:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate a session
 * 
 * @param {string} token - JWT token
 * @param {Object} req - Request object
 * @returns {Promise<Object>} - Validation result
 */
async function validateSession(token, req) {
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session exists and is not revoked
    const result = await db.query(
      `SELECT s.id, s.last_activity, s.device_fingerprint, s.inactivity_timeout
       FROM user_sessions s
       WHERE s.session_id = $1 AND s.user_id = $2 AND s.revoked = false`,
      [decoded.sessionId, decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Session not found or revoked'
      };
    }
    
    const session = result.rows[0];
    
    // Check for session inactivity timeout
    if (session.last_activity) {
      const inactivityTimeout = session.inactivity_timeout || SESSION_INACTIVITY_TIMEOUT;
      const lastActivity = new Date(session.last_activity).getTime();
      const now = Date.now();
      
      if (now - lastActivity > inactivityTimeout) {
        // Session has timed out due to inactivity
        await revokeSession(decoded.sessionId);
        
        return {
          success: false,
          error: 'Session expired due to inactivity',
          code: 'INACTIVITY_TIMEOUT'
        };
      }
    }
    
    // Verify device fingerprint if enabled
    if (ENABLE_DEVICE_FINGERPRINTING && session.device_fingerprint) {
      const clientInfo = getClientInfo(req);
      const currentFingerprint = generateDeviceFingerprint(clientInfo);
      
      // If fingerprints don't match, this could be a token theft attempt
      if (currentFingerprint !== session.device_fingerprint) {
        // Log potential security issue
        logger.warn('Fingerprint mismatch during session validation', {
          sessionId: decoded.sessionId,
          userId: decoded.userId,
          storedFingerprint: session.device_fingerprint,
          currentFingerprint,
          ip: req.ip
        });
        
        // Don't revoke automatically, but return an error
        return {
          success: false,
          error: 'Security validation failed',
          code: 'SECURITY_VALIDATION_FAILED'
        };
      }
    }
    
    // Update session last activity
    await db.query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE id = $1',
      [session.id]
    );
    
    return {
      success: true,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return {
        success: false,
        error: 'Invalid token'
      };
    } else if (error.name === 'TokenExpiredError') {
      return {
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      };
    }
    
    console.error('Error validating session:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Revoke a session
 * 
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Revocation result
 */
async function revokeSession(sessionId) {
  try {
    const result = await db.query(
      'UPDATE user_sessions SET revoked = true, revoked_at = NOW() WHERE session_id = $1 RETURNING id, user_id',
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Session not found'
      };
    }
    
    // Log session revocation
    logger.info('Session revoked', {
      sessionId,
      userId: result.rows[0].user_id
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error revoking session:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Revoke all sessions for a user
 * 
 * @param {number} userId - User ID
 * @param {string} currentSessionId - Current session ID to exclude (optional)
 * @returns {Promise<Object>} - Revocation result
 */
async function revokeAllSessions(userId, currentSessionId = null) {
  try {
    let query = 'UPDATE user_sessions SET revoked = true, revoked_at = NOW() WHERE user_id = $1 AND revoked = false';
    const params = [userId];
    
    // Exclude current session if provided
    if (currentSessionId) {
      query += ' AND session_id != $2';
      params.push(currentSessionId);
    }
    
    const result = await db.query(query + ' RETURNING id', params);
    
    // Log session revocation
    logger.info('All sessions revoked for user', {
      userId,
      count: result.rows.length,
      excludedSessionId: currentSessionId
    });
    
    return {
      success: true,
      count: result.rows.length
    };
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all active sessions for a user
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - User sessions
 */
async function getUserSessions(userId) {
  try {
    const result = await db.query(
      `SELECT session_id, created_at, last_activity, ip_address, user_agent, device_type, location
       FROM user_sessions
       WHERE user_id = $1 AND revoked = false AND expires_at > NOW()
       ORDER BY last_activity DESC`,
      [userId]
    );
    
    return {
      success: true,
      sessions: result.rows
    };
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Set session inactivity timeout
 * 
 * @param {string} sessionId - Session ID
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} - Update result
 */
async function setSessionInactivityTimeout(sessionId, timeoutMs) {
  try {
    const result = await db.query(
      'UPDATE user_sessions SET inactivity_timeout = $1 WHERE session_id = $2 RETURNING id',
      [timeoutMs, sessionId]
    );
    
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Session not found'
      };
    }
    
    return {
      success: true,
      timeoutMs
    };
  } catch (error) {
    console.error('Error setting session inactivity timeout:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Enforce session limit per user
 * 
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
async function enforceSessionLimit(userId) {
  try {
    // Get count of active sessions
    const countResult = await db.query(
      'SELECT COUNT(*) FROM user_sessions WHERE user_id = $1 AND revoked = false AND expires_at > NOW()',
      [userId]
    );
    
    const sessionCount = parseInt(countResult.rows[0].count);
    
    // If under limit, no action needed
    if (sessionCount <= MAX_SESSIONS_PER_USER) {
      return;
    }
    
    // Get oldest sessions to revoke
    const excessCount = sessionCount - MAX_SESSIONS_PER_USER;
    
    const oldestSessions = await db.query(
      `SELECT session_id FROM user_sessions 
       WHERE user_id = $1 AND revoked = false AND expires_at > NOW()
       ORDER BY last_activity ASC
       LIMIT $2`,
      [userId, excessCount]
    );
    
    // Revoke oldest sessions
    for (const session of oldestSessions.rows) {
      await revokeSession(session.session_id);
    }
    
    logger.info('Enforced session limit', {
      userId,
      limit: MAX_SESSIONS_PER_USER,
      revoked: excessCount
    });
  } catch (error) {
    console.error('Error enforcing session limit:', error);
  }
}

/**
 * Generate device fingerprint
 * 
 * @param {Object} clientInfo - Client information
 * @returns {string} - Device fingerprint
 */
function generateDeviceFingerprint(clientInfo) {
  // Create a fingerprint based on device characteristics
  const fingerprintData = [
    clientInfo.userAgent,
    clientInfo.deviceType,
    clientInfo.os,
    clientInfo.browser,
    clientInfo.screenResolution,
    clientInfo.colorDepth,
    clientInfo.timezone
  ].filter(Boolean).join('|');
  
  // Hash the fingerprint data
  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
}

/**
 * Hash a token for secure storage
 * 
 * @param {string} token - Token to hash
 * @returns {string} - Hashed token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  createSession,
  refreshSession,
  validateSession,
  revokeSession,
  revokeAllSessions,
  getUserSessions,
  setSessionInactivityTimeout
};
