/**
 * Role-Based Access Control (RBAC) for MedTranslate AI
 *
 * This module provides comprehensive role-based access control with:
 * - Hierarchical roles with inheritance
 * - Fine-grained permissions
 * - Resource-based access control
 * - Audit logging for permission changes
 */

const db = require('../database');
const { logger } = require('../utils/logger');

// Define role hierarchy and default permissions
const ROLES = {
  ADMIN: {
    name: 'admin',
    level: 100,
    inherits: ['provider'],
    description: 'Administrator with full system access'
  },
  PROVIDER: {
    name: 'provider',
    level: 50,
    inherits: ['user'],
    description: 'Medical provider with patient management access'
  },
  USER: {
    name: 'user',
    level: 10,
    inherits: [],
    description: 'Standard user with basic access'
  },
  GUEST: {
    name: 'guest',
    level: 0,
    inherits: [],
    description: 'Unauthenticated guest with minimal access'
  }
};

// Define permissions
const PERMISSIONS = {
  // User management
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Patient management
  PATIENT_VIEW: 'patient:view',
  PATIENT_CREATE: 'patient:create',
  PATIENT_UPDATE: 'patient:update',
  PATIENT_DELETE: 'patient:delete',
  
  // Translation management
  TRANSLATION_CREATE: 'translation:create',
  TRANSLATION_VIEW: 'translation:view',
  TRANSLATION_HISTORY: 'translation:history',
  
  // System management
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_BACKUP: 'system:backup',
  
  // Edge device management
  EDGE_MANAGE: 'edge:manage',
  EDGE_DEPLOY: 'edge:deploy',
  EDGE_MONITOR: 'edge:monitor'
};

// Default role permissions
const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.ADMIN.name]: Object.values(PERMISSIONS),
  [ROLES.PROVIDER.name]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_CREATE,
    PERMISSIONS.PATIENT_UPDATE,
    PERMISSIONS.TRANSLATION_CREATE,
    PERMISSIONS.TRANSLATION_VIEW,
    PERMISSIONS.TRANSLATION_HISTORY,
    PERMISSIONS.EDGE_MONITOR
  ],
  [ROLES.USER.name]: [
    PERMISSIONS.TRANSLATION_CREATE,
    PERMISSIONS.TRANSLATION_VIEW
  ],
  [ROLES.GUEST.name]: []
};

/**
 * Initialize RBAC system
 * 
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize() {
  try {
    console.log('Initializing RBAC system...');
    
    // Create roles if they don't exist
    for (const role of Object.values(ROLES)) {
      const roleExists = await db.query(
        'SELECT id FROM roles WHERE name = $1',
        [role.name]
      );
      
      if (roleExists.rows.length === 0) {
        await db.query(
          'INSERT INTO roles (name, level, description) VALUES ($1, $2, $3)',
          [role.name, role.level, role.description]
        );
        
        console.log(`Created role: ${role.name}`);
      }
    }
    
    // Create role inheritance
    for (const role of Object.values(ROLES)) {
      if (role.inherits && role.inherits.length > 0) {
        const roleId = await getRoleId(role.name);
        
        for (const inheritedRole of role.inherits) {
          const inheritedRoleId = await getRoleId(inheritedRole);
          
          const inheritanceExists = await db.query(
            'SELECT id FROM role_inheritance WHERE role_id = $1 AND inherited_role_id = $2',
            [roleId, inheritedRoleId]
          );
          
          if (inheritanceExists.rows.length === 0) {
            await db.query(
              'INSERT INTO role_inheritance (role_id, inherited_role_id) VALUES ($1, $2)',
              [roleId, inheritedRoleId]
            );
            
            console.log(`Created inheritance: ${role.name} inherits ${inheritedRole}`);
          }
        }
      }
    }
    
    // Create permissions if they don't exist
    for (const [key, permission] of Object.entries(PERMISSIONS)) {
      const permissionExists = await db.query(
        'SELECT id FROM permissions WHERE name = $1',
        [permission]
      );
      
      if (permissionExists.rows.length === 0) {
        await db.query(
          'INSERT INTO permissions (name, description) VALUES ($1, $2)',
          [permission, `Permission to ${permission.replace(':', ' ')}`]
        );
        
        console.log(`Created permission: ${permission}`);
      }
    }
    
    // Assign default permissions to roles
    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const roleId = await getRoleId(roleName);
      
      for (const permission of permissions) {
        const permissionId = await getPermissionId(permission);
        
        const assignmentExists = await db.query(
          'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
          [roleId, permissionId]
        );
        
        if (assignmentExists.rows.length === 0) {
          await db.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [roleId, permissionId]
          );
          
          console.log(`Assigned permission ${permission} to role ${roleName}`);
        }
      }
    }
    
    console.log('RBAC system initialized successfully');
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing RBAC system:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get role ID by name
 * 
 * @param {string} roleName - Role name
 * @returns {Promise<number>} - Role ID
 */
async function getRoleId(roleName) {
  const result = await db.query(
    'SELECT id FROM roles WHERE name = $1',
    [roleName]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Role not found: ${roleName}`);
  }
  
  return result.rows[0].id;
}

/**
 * Get permission ID by name
 * 
 * @param {string} permissionName - Permission name
 * @returns {Promise<number>} - Permission ID
 */
async function getPermissionId(permissionName) {
  const result = await db.query(
    'SELECT id FROM permissions WHERE name = $1',
    [permissionName]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Permission not found: ${permissionName}`);
  }
  
  return result.rows[0].id;
}

/**
 * Assign a role to a user
 * 
 * @param {number} userId - User ID
 * @param {string} roleName - Role name
 * @param {Object} options - Assignment options
 * @returns {Promise<Object>} - Assignment result
 */
async function assignRoleToUser(userId, roleName, options = {}) {
  try {
    const { expiresAt = null, assignedBy = null } = options;
    
    // Get role ID
    const roleId = await getRoleId(roleName);
    
    // Check if user already has this role
    const existingRole = await db.query(
      'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
    
    if (existingRole.rows.length > 0) {
      // Update existing role assignment
      await db.query(
        'UPDATE user_roles SET expires_at = $1, updated_at = NOW() WHERE id = $2',
        [expiresAt, existingRole.rows[0].id]
      );
    } else {
      // Create new role assignment
      await db.query(
        'INSERT INTO user_roles (user_id, role_id, expires_at) VALUES ($1, $2, $3)',
        [userId, roleId, expiresAt]
      );
    }
    
    // Log the action
    await logRoleChange({
      userId,
      roleId,
      action: 'assign',
      performedBy: assignedBy,
      expiresAt
    });
    
    return {
      success: true,
      role: roleName,
      expiresAt
    };
  } catch (error) {
    console.error('Error assigning role to user:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Remove a role from a user
 * 
 * @param {number} userId - User ID
 * @param {string} roleName - Role name
 * @param {Object} options - Removal options
 * @returns {Promise<Object>} - Removal result
 */
async function removeRoleFromUser(userId, roleName, options = {}) {
  try {
    const { removedBy = null } = options;
    
    // Get role ID
    const roleId = await getRoleId(roleName);
    
    // Remove role
    const result = await db.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING id',
      [userId, roleId]
    );
    
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'User does not have this role'
      };
    }
    
    // Log the action
    await logRoleChange({
      userId,
      roleId,
      action: 'remove',
      performedBy: removedBy
    });
    
    return {
      success: true,
      role: roleName
    };
  } catch (error) {
    console.error('Error removing role from user:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all roles for a user
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - User roles
 */
async function getUserRoles(userId) {
  try {
    const result = await db.query(
      `SELECT r.name, r.level, r.description, ur.expires_at
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       ORDER BY r.level DESC`,
      [userId]
    );
    
    return {
      success: true,
      roles: result.rows
    };
  } catch (error) {
    console.error('Error getting user roles:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if a user has a specific permission
 * 
 * @param {number} userId - User ID
 * @param {string} permissionName - Permission name
 * @param {Object} resource - Optional resource to check permission against
 * @returns {Promise<boolean>} - Whether user has permission
 */
async function hasPermission(userId, permissionName, resource = null) {
  try {
    // Get user roles
    const userRoles = await getUserRoles(userId);
    
    if (!userRoles.success) {
      return false;
    }
    
    // If user has admin role, they have all permissions
    if (userRoles.roles.some(role => role.name === ROLES.ADMIN.name)) {
      return true;
    }
    
    // Get role IDs
    const roleIds = userRoles.roles.map(role => role.id);
    
    if (roleIds.length === 0) {
      return false;
    }
    
    // Check if any of the user's roles have this permission
    const result = await db.query(
      `SELECT 1
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ANY($1)
       AND p.name = $2
       LIMIT 1`,
      [roleIds, permissionName]
    );
    
    // If resource is provided, check resource-specific permissions
    if (resource && result.rows.length > 0) {
      return await hasResourcePermission(userId, permissionName, resource);
    }
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if a user has permission for a specific resource
 * 
 * @param {number} userId - User ID
 * @param {string} permissionName - Permission name
 * @param {Object} resource - Resource to check permission against
 * @returns {Promise<boolean>} - Whether user has permission for the resource
 */
async function hasResourcePermission(userId, permissionName, resource) {
  try {
    // This is a placeholder - the actual implementation would depend on your resource model
    // For example, checking if a user can access a specific patient's data
    
    const resourceType = resource.type;
    const resourceId = resource.id;
    
    if (resourceType === 'patient') {
      // Check if user is the patient's provider
      const result = await db.query(
        'SELECT 1 FROM patient_providers WHERE patient_id = $1 AND provider_id = $2 LIMIT 1',
        [resourceId, userId]
      );
      
      return result.rows.length > 0;
    }
    
    // Default to false for unknown resource types
    return false;
  } catch (error) {
    console.error('Error checking resource permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - User permissions
 */
async function getUserPermissions(userId) {
  try {
    // Get user roles
    const userRoles = await getUserRoles(userId);
    
    if (!userRoles.success) {
      return {
        success: false,
        error: userRoles.error
      };
    }
    
    // If no roles, return empty permissions
    if (userRoles.roles.length === 0) {
      return {
        success: true,
        permissions: []
      };
    }
    
    // Get role IDs
    const roleIds = userRoles.roles.map(role => {
      const roleResult = db.query(
        'SELECT id FROM roles WHERE name = $1',
        [role.name]
      );
      return roleResult.rows[0].id;
    });
    
    // Get permissions for these roles
    const result = await db.query(
      `SELECT DISTINCT p.name, p.description
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ANY($1)
       ORDER BY p.name`,
      [roleIds]
    );
    
    return {
      success: true,
      permissions: result.rows
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Log role change for audit purposes
 * 
 * @param {Object} options - Log options
 */
async function logRoleChange(options) {
  try {
    const { userId, roleId, action, performedBy, expiresAt } = options;
    
    await db.query(
      `INSERT INTO role_change_logs 
       (user_id, role_id, action, performed_by, expires_at) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, roleId, action, performedBy, expiresAt]
    );
    
    // Also log to application logs
    logger.info('Role change', {
      userId,
      roleId,
      action,
      performedBy,
      expiresAt
    });
  } catch (error) {
    console.error('Error logging role change:', error);
  }
}

/**
 * Create a new permission
 * 
 * @param {string} name - Permission name
 * @param {string} description - Permission description
 * @returns {Promise<Object>} - Creation result
 */
async function createPermission(name, description) {
  try {
    // Check if permission already exists
    const existingPermission = await db.query(
      'SELECT id FROM permissions WHERE name = $1',
      [name]
    );
    
    if (existingPermission.rows.length > 0) {
      return {
        success: false,
        error: 'Permission already exists'
      };
    }
    
    // Create permission
    await db.query(
      'INSERT INTO permissions (name, description) VALUES ($1, $2)',
      [name, description]
    );
    
    return {
      success: true,
      name,
      description
    };
  } catch (error) {
    console.error('Error creating permission:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Assign a permission to a role
 * 
 * @param {string} roleName - Role name
 * @param {string} permissionName - Permission name
 * @param {Object} options - Assignment options
 * @returns {Promise<Object>} - Assignment result
 */
async function assignPermissionToRole(roleName, permissionName, options = {}) {
  try {
    const { assignedBy = null } = options;
    
    // Get role and permission IDs
    const roleId = await getRoleId(roleName);
    const permissionId = await getPermissionId(permissionName);
    
    // Check if role already has this permission
    const existingPermission = await db.query(
      'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    );
    
    if (existingPermission.rows.length > 0) {
      return {
        success: false,
        error: 'Role already has this permission'
      };
    }
    
    // Assign permission to role
    await db.query(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
      [roleId, permissionId]
    );
    
    // Log the action
    await logPermissionChange({
      roleId,
      permissionId,
      action: 'assign',
      performedBy: assignedBy
    });
    
    return {
      success: true,
      role: roleName,
      permission: permissionName
    };
  } catch (error) {
    console.error('Error assigning permission to role:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Remove a permission from a role
 * 
 * @param {string} roleName - Role name
 * @param {string} permissionName - Permission name
 * @param {Object} options - Removal options
 * @returns {Promise<Object>} - Removal result
 */
async function removePermissionFromRole(roleName, permissionName, options = {}) {
  try {
    const { removedBy = null } = options;
    
    // Get role and permission IDs
    const roleId = await getRoleId(roleName);
    const permissionId = await getPermissionId(permissionName);
    
    // Remove permission from role
    const result = await db.query(
      'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2 RETURNING id',
      [roleId, permissionId]
    );
    
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Role does not have this permission'
      };
    }
    
    // Log the action
    await logPermissionChange({
      roleId,
      permissionId,
      action: 'remove',
      performedBy: removedBy
    });
    
    return {
      success: true,
      role: roleName,
      permission: permissionName
    };
  } catch (error) {
    console.error('Error removing permission from role:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Log permission change for audit purposes
 * 
 * @param {Object} options - Log options
 */
async function logPermissionChange(options) {
  try {
    const { roleId, permissionId, action, performedBy } = options;
    
    await db.query(
      `INSERT INTO permission_change_logs 
       (role_id, permission_id, action, performed_by) 
       VALUES ($1, $2, $3, $4)`,
      [roleId, permissionId, action, performedBy]
    );
    
    // Also log to application logs
    logger.info('Permission change', {
      roleId,
      permissionId,
      action,
      performedBy
    });
  } catch (error) {
    console.error('Error logging permission change:', error);
  }
}

module.exports = {
  ROLES,
  PERMISSIONS,
  initialize,
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  hasPermission,
  getUserPermissions,
  createPermission,
  assignPermissionToRole,
  removePermissionFromRole
};
