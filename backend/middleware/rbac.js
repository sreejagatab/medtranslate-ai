/**
 * Role-Based Access Control Middleware for MedTranslate AI
 * 
 * Provides middleware functions for permission-based authorization
 */

const permissionsService = require('../lambda/auth/permissions-service');
const { getTokenFromHeader } = require('./auth');

/**
 * Middleware to check if a user has a specific permission
 * 
 * @param {string} permission - Permission to check
 * @returns {Function} - Express middleware function
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Check if user has the required permission
      const hasPermission = await permissionsService.hasPermission(req.user.sub, permission);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permission}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
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
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Get user permissions
      const userPermissions = await permissionsService.getUserPermissions(req.user.sub);
      
      // Check if user has any of the required permissions
      const hasAnyPermission = permissions.some(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: requires one of [${permissions.join(', ')}]`
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
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
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Get user permissions
      const userPermissions = await permissionsService.getUserPermissions(req.user.sub);
      
      // Check if user has all of the required permissions
      const hasAllPermissions = permissions.every(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: requires all of [${permissions.join(', ')}]`
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

/**
 * Middleware to check if a user has a specific role
 * 
 * @param {string|Array<string>} roles - Role(s) to check
 * @returns {Function} - Express middleware function
 */
const requireRole = (roles) => {
  const rolesToCheck = Array.isArray(roles) ? roles : [roles];
  
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Check if user has the required role
      if (!rolesToCheck.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Role required: ${rolesToCheck.join(' or ')}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Role check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Error checking role'
      });
    }
  };
};

/**
 * Middleware to check if a user is accessing their own resource
 * 
 * @param {Function} getResourceUserId - Function to extract resource user ID from request
 * @returns {Function} - Express middleware function
 */
const requireSelfOrPermission = (getResourceUserId, permission) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Get resource user ID
      const resourceUserId = getResourceUserId(req);
      
      // Check if user is accessing their own resource
      if (req.user.sub === resourceUserId) {
        return next();
      }
      
      // Check if user has the required permission
      const hasPermission = await permissionsService.hasPermission(req.user.sub, permission);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own resources'
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireSelfOrPermission
};
