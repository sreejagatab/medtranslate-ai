/**
 * Enhanced Authentication Middleware for MedTranslate AI
 * 
 * Provides middleware functions for authenticating API requests with:
 * - Session validation
 * - Role-based access control
 * - Permission-based authorization
 */

const sessionManager = require('../auth/session-manager');
const rbac = require('../auth/rbac');
const { logger } = require('../utils/logger');

/**
 * Extract token from request headers
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} - JWT token or null if not found
 */
const getTokenFromHeader = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

/**
 * Authenticate user middleware with session validation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Validate session
    const sessionValidation = await sessionManager.validateSession(token, req);
    
    if (!sessionValidation.success) {
      // Handle specific error codes
      if (sessionValidation.code === 'TOKEN_EXPIRED') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (sessionValidation.code === 'INACTIVITY_TIMEOUT') {
        return res.status(401).json({
          success: false,
          message: 'Session expired due to inactivity',
          code: 'INACTIVITY_TIMEOUT'
        });
      } else if (sessionValidation.code === 'SECURITY_VALIDATION_FAILED') {
        // Log security validation failure
        logger.warn('Security validation failed', {
          ip: req.ip,
          path: req.path,
          userAgent: req.headers['user-agent']
        });
        
        return res.status(401).json({
          success: false,
          message: 'Security validation failed',
          code: 'SECURITY_VALIDATION_FAILED'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: sessionValidation.error || 'Invalid or expired token'
      });
    }
    
    // Add user info to request
    req.user = {
      id: sessionValidation.userId,
      email: sessionValidation.email,
      role: sessionValidation.role,
      sessionId: sessionValidation.sessionId
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Authenticate admin middleware with role check
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // First authenticate the user
    await authenticate(req, res, async () => {
      // Check if user has admin role
      const hasAdminRole = await rbac.hasPermission(
        req.user.id,
        rbac.PERMISSIONS.SYSTEM_SETTINGS
      );
      
      if (!hasAdminRole) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      next();
    });
  } catch (error) {
    console.error('Admin authentication error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Authenticate provider middleware with role check
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateProvider = async (req, res, next) => {
  try {
    // First authenticate the user
    await authenticate(req, res, async () => {
      // Check if user has provider role
      const hasProviderPermission = await rbac.hasPermission(
        req.user.id,
        rbac.PERMISSIONS.PATIENT_VIEW
      );
      
      if (!hasProviderPermission) {
        return res.status(403).json({
          success: false,
          message: 'Provider access required'
        });
      }
      
      next();
    });
  } catch (error) {
    console.error('Provider authentication error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Middleware to check if a user has a specific permission
 * 
 * @param {string} permission - Permission to check
 * @returns {Function} - Express middleware function
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      // First authenticate the user
      await authenticate(req, res, async () => {
        // Check if user has the required permission
        const hasPermission = await rbac.hasPermission(
          req.user.id,
          permission
        );
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Permission denied: ${permission}`
          });
        }
        
        next();
      });
    } catch (error) {
      console.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Permission check error'
      });
    }
  };
};

/**
 * Middleware to check if a user has any of the specified permissions
 * 
 * @param {Array<string>} permissions - Permissions to check
 * @returns {Function} - Express middleware function
 */
const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      // First authenticate the user
      await authenticate(req, res, async () => {
        // Check if user has any of the required permissions
        for (const permission of permissions) {
          const hasPermission = await rbac.hasPermission(
            req.user.id,
            permission
          );
          
          if (hasPermission) {
            return next();
          }
        }
        
        return res.status(403).json({
          success: false,
          message: `Permission denied: requires any of [${permissions.join(', ')}]`
        });
      });
    } catch (error) {
      console.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Permission check error'
      });
    }
  };
};

/**
 * Middleware to check if a user has all of the specified permissions
 * 
 * @param {Array<string>} permissions - Permissions to check
 * @returns {Function} - Express middleware function
 */
const requireAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      // First authenticate the user
      await authenticate(req, res, async () => {
        // Check if user has all of the required permissions
        for (const permission of permissions) {
          const hasPermission = await rbac.hasPermission(
            req.user.id,
            permission
          );
          
          if (!hasPermission) {
            return res.status(403).json({
              success: false,
              message: `Permission denied: requires all of [${permissions.join(', ')}]`
            });
          }
        }
        
        next();
      });
    } catch (error) {
      console.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Permission check error'
      });
    }
  };
};

/**
 * Middleware to check if a user is accessing their own resource
 * 
 * @param {Function} getResourceUserId - Function to extract resource user ID from request
 * @param {string} permission - Permission required if not accessing own resource
 * @returns {Function} - Express middleware function
 */
const requireSelfOrPermission = (getResourceUserId, permission) => {
  return async (req, res, next) => {
    try {
      // First authenticate the user
      await authenticate(req, res, async () => {
        // Get resource user ID
        const resourceUserId = getResourceUserId(req);
        
        // Check if user is accessing their own resource
        if (req.user.id === resourceUserId) {
          return next();
        }
        
        // If not, check if user has the required permission
        const hasPermission = await rbac.hasPermission(
          req.user.id,
          permission
        );
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Permission denied: requires ${permission} to access other user's resource`
          });
        }
        
        next();
      });
    } catch (error) {
      console.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Permission check error'
      });
    }
  };
};

module.exports = {
  getTokenFromHeader,
  authenticate,
  authenticateAdmin,
  authenticateProvider,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireSelfOrPermission
};
