/**
 * Permissions Lambda Handler for MedTranslate AI
 *
 * This Lambda function handles permissions-related requests, including
 * checking permissions, getting user permissions, and managing roles.
 */

const permissionsService = require('./permissions-service');
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
 * Check if a user has a specific permission
 */
exports.checkPermission = async (event) => {
  try {
    console.log('Check permission request received');

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
    const { permission } = body;

    if (!permission) {
      return formatResponse(400, {
        success: false,
        error: 'Permission is required'
      });
    }

    // Check permission
    const userId = decodedToken.sub;
    const hasPermission = await permissionsService.hasPermission(userId, permission);

    return formatResponse(200, {
      success: true,
      hasPermission
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to check permission',
      message: error.message
    });
  }
};

/**
 * Get all permissions for a user
 */
exports.getUserPermissions = async (event) => {
  try {
    console.log('Get user permissions request received');

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

    // Get user ID from path parameters or use the authenticated user
    const userId = event.pathParameters?.userId || decodedToken.sub;

    // Check if user is trying to access another user's permissions
    if (userId !== decodedToken.sub) {
      // Check if user has permission to view other users' permissions
      const canViewOtherPermissions = await permissionsService.hasPermission(decodedToken.sub, 'user:permissions:read');
      if (!canViewOtherPermissions) {
        return formatResponse(403, {
          success: false,
          error: 'You do not have permission to view other users\' permissions'
        });
      }
    }

    // Get permissions
    const permissions = await permissionsService.getUserPermissions(userId);

    return formatResponse(200, {
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get user permissions',
      message: error.message
    });
  }
};

/**
 * Add a permission to a user
 */
exports.addPermission = async (event) => {
  try {
    console.log('Add permission request received');

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

    // Check if user has permission to manage permissions
    const canManagePermissions = await permissionsService.hasPermission(decodedToken.sub, 'user:permissions:manage');
    if (!canManagePermissions) {
      return formatResponse(403, {
        success: false,
        error: 'You do not have permission to manage permissions'
      });
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { userId, permission } = body;

    if (!userId || !permission) {
      return formatResponse(400, {
        success: false,
        error: 'User ID and permission are required'
      });
    }

    // Add permission
    const result = await permissionsService.addPermission(userId, permission);

    if (!result) {
      return formatResponse(400, {
        success: false,
        error: 'Failed to add permission'
      });
    }

    return formatResponse(200, {
      success: true,
      message: 'Permission added successfully'
    });
  } catch (error) {
    console.error('Error adding permission:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to add permission',
      message: error.message
    });
  }
};

/**
 * Remove a permission from a user
 */
exports.removePermission = async (event) => {
  try {
    console.log('Remove permission request received');

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

    // Check if user has permission to manage permissions
    const canManagePermissions = await permissionsService.hasPermission(decodedToken.sub, 'user:permissions:manage');
    if (!canManagePermissions) {
      return formatResponse(403, {
        success: false,
        error: 'You do not have permission to manage permissions'
      });
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { userId, permission } = body;

    if (!userId || !permission) {
      return formatResponse(400, {
        success: false,
        error: 'User ID and permission are required'
      });
    }

    // Remove permission
    const result = await permissionsService.removePermission(userId, permission);

    if (!result) {
      return formatResponse(400, {
        success: false,
        error: 'Failed to remove permission'
      });
    }

    return formatResponse(200, {
      success: true,
      message: 'Permission removed successfully'
    });
  } catch (error) {
    console.error('Error removing permission:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to remove permission',
      message: error.message
    });
  }
};

/**
 * Change a user's role
 */
exports.changeRole = async (event) => {
  try {
    console.log('Change role request received');

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

    // Check if user has permission to manage roles
    const canManageRoles = await permissionsService.hasPermission(decodedToken.sub, 'user:role:manage');
    if (!canManageRoles) {
      return formatResponse(403, {
        success: false,
        error: 'You do not have permission to manage roles'
      });
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { userId, role } = body;

    if (!userId || !role) {
      return formatResponse(400, {
        success: false,
        error: 'User ID and role are required'
      });
    }

    // Change role
    const result = await permissionsService.changeRole(userId, role);

    if (!result) {
      return formatResponse(400, {
        success: false,
        error: 'Failed to change role'
      });
    }

    return formatResponse(200, {
      success: true,
      message: 'Role changed successfully'
    });
  } catch (error) {
    console.error('Error changing role:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to change role',
      message: error.message
    });
  }
};

/**
 * Get available roles
 */
exports.getAvailableRoles = async (event) => {
  try {
    console.log('Get available roles request received');

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

    // Get available roles
    const roles = permissionsService.getAvailableRoles();

    return formatResponse(200, {
      success: true,
      roles
    });
  } catch (error) {
    console.error('Error getting available roles:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get available roles',
      message: error.message
    });
  }
};

/**
 * Get permissions for a role
 */
exports.getRolePermissions = async (event) => {
  try {
    console.log('Get role permissions request received');

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

    // Get role from path parameters
    const role = event.pathParameters?.role;

    if (!role) {
      return formatResponse(400, {
        success: false,
        error: 'Role is required'
      });
    }

    // Get role permissions
    const permissions = permissionsService.getRolePermissions(role);

    return formatResponse(200, {
      success: true,
      role,
      permissions
    });
  } catch (error) {
    console.error('Error getting role permissions:', error);
    return formatResponse(500, {
      success: false,
      error: 'Failed to get role permissions',
      message: error.message
    });
  }
};
