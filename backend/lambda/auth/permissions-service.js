/**
 * Permissions Service for MedTranslate AI
 *
 * This module provides functions for role-based access control (RBAC)
 * and permission management.
 */

const AWS = require('aws-sdk');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Constants
const DEFAULT_ROLES = {
  ADMIN: 'admin',
  PROVIDER: 'provider',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  PATIENT: 'patient',
  TRANSLATOR: 'translator',
  GUEST: 'guest'
};

// Define permissions for each role
const ROLE_PERMISSIONS = {
  [DEFAULT_ROLES.ADMIN]: [
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:list',
    'session:create',
    'session:read',
    'session:update',
    'session:delete',
    'session:list',
    'translation:perform',
    'translation:history',
    'system:settings',
    'system:logs',
    'system:metrics',
    'mfa:manage'
  ],
  [DEFAULT_ROLES.PROVIDER]: [
    'user:read',
    'user:update:self',
    'session:create',
    'session:read',
    'session:update',
    'session:delete',
    'session:list:own',
    'translation:perform',
    'translation:history:own',
    'mfa:manage:self'
  ],
  [DEFAULT_ROLES.DOCTOR]: [
    'user:read',
    'user:update:self',
    'session:create',
    'session:read',
    'session:update',
    'session:delete',
    'session:list:own',
    'translation:perform',
    'translation:history:own',
    'mfa:manage:self'
  ],
  [DEFAULT_ROLES.NURSE]: [
    'user:read',
    'user:update:self',
    'session:create',
    'session:read',
    'session:update',
    'session:delete',
    'session:list:own',
    'translation:perform',
    'translation:history:own',
    'mfa:manage:self'
  ],
  [DEFAULT_ROLES.PATIENT]: [
    'user:read:self',
    'user:update:self',
    'session:read',
    'translation:perform',
    'mfa:manage:self'
  ],
  [DEFAULT_ROLES.TRANSLATOR]: [
    'user:read:self',
    'user:update:self',
    'session:read',
    'translation:perform',
    'translation:history:own',
    'mfa:manage:self'
  ],
  [DEFAULT_ROLES.GUEST]: [
    'session:join',
    'translation:perform'
  ]
};

/**
 * Check if a user has a specific permission
 *
 * @param {string} userId - User ID
 * @param {string} permission - Permission to check
 * @returns {Promise<boolean>} - Whether the user has the permission
 */
async function hasPermission(userId, permission) {
  try {
    // For local development, use hardcoded permissions
    if (process.env.NODE_ENV === 'development') {
      // Demo admin user
      if (userId === 'provider-demo') {
        return ROLE_PERMISSIONS[DEFAULT_ROLES.ADMIN].includes(permission);
      }

      // Demo provider user
      if (userId.startsWith('provider-')) {
        return ROLE_PERMISSIONS[DEFAULT_ROLES.PROVIDER].includes(permission);
      }

      // Demo patient user
      if (userId.startsWith('patient-')) {
        return ROLE_PERMISSIONS[DEFAULT_ROLES.PATIENT].includes(permission);
      }

      return false;
    }

    // Get user from database
    const result = await dynamoDB.get({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { providerId: userId }
    }).promise();

    if (!result.Item) {
      return false;
    }

    const user = result.Item;
    const role = user.role || DEFAULT_ROLES.GUEST;

    // Check if the role has the permission
    if (ROLE_PERMISSIONS[role] && ROLE_PERMISSIONS[role].includes(permission)) {
      return true;
    }

    // Check for custom permissions
    if (user.permissions && user.permissions.includes(permission)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array<string>>} - Array of permissions
 */
async function getUserPermissions(userId) {
  try {
    // For local development, use hardcoded permissions
    if (process.env.NODE_ENV === 'development') {
      // Demo admin user
      if (userId === 'provider-demo') {
        return ROLE_PERMISSIONS[DEFAULT_ROLES.ADMIN];
      }

      // Demo provider user
      if (userId.startsWith('provider-')) {
        return ROLE_PERMISSIONS[DEFAULT_ROLES.PROVIDER];
      }

      // Demo patient user
      if (userId.startsWith('patient-')) {
        return ROLE_PERMISSIONS[DEFAULT_ROLES.PATIENT];
      }

      return [];
    }

    // Get user from database
    const result = await dynamoDB.get({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { providerId: userId }
    }).promise();

    if (!result.Item) {
      return [];
    }

    const user = result.Item;
    const role = user.role || DEFAULT_ROLES.GUEST;

    // Get role permissions
    const rolePermissions = ROLE_PERMISSIONS[role] || [];

    // Combine with custom permissions
    const customPermissions = user.permissions || [];

    // Return unique permissions
    return [...new Set([...rolePermissions, ...customPermissions])];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Add a custom permission to a user
 *
 * @param {string} userId - User ID
 * @param {string} permission - Permission to add
 * @returns {Promise<boolean>} - Whether the permission was added
 */
async function addPermission(userId, permission) {
  try {
    // For local development, return success
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Adding permission ${permission} to user ${userId}`);
      return true;
    }

    // Get user from database
    const result = await dynamoDB.get({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { providerId: userId }
    }).promise();

    if (!result.Item) {
      return false;
    }

    // Get current permissions
    const currentPermissions = result.Item.permissions || [];

    // Check if permission already exists
    if (currentPermissions.includes(permission)) {
      return true;
    }

    // Add permission
    const updatedPermissions = [...currentPermissions, permission];

    // Update user
    await dynamoDB.update({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { providerId: userId },
      UpdateExpression: 'SET permissions = :permissions, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':permissions': updatedPermissions,
        ':updatedAt': new Date().toISOString()
      }
    }).promise();

    return true;
  } catch (error) {
    console.error('Error adding permission:', error);
    return false;
  }
}

/**
 * Remove a custom permission from a user
 *
 * @param {string} userId - User ID
 * @param {string} permission - Permission to remove
 * @returns {Promise<boolean>} - Whether the permission was removed
 */
async function removePermission(userId, permission) {
  try {
    // For local development, return success
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Removing permission ${permission} from user ${userId}`);
      return true;
    }

    // Get user from database
    const result = await dynamoDB.get({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { providerId: userId }
    }).promise();

    if (!result.Item) {
      return false;
    }

    // Get current permissions
    const currentPermissions = result.Item.permissions || [];

    // Check if permission exists
    if (!currentPermissions.includes(permission)) {
      return true;
    }

    // Remove permission
    const updatedPermissions = currentPermissions.filter(p => p !== permission);

    // Update user
    await dynamoDB.update({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { providerId: userId },
      UpdateExpression: 'SET permissions = :permissions, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':permissions': updatedPermissions,
        ':updatedAt': new Date().toISOString()
      }
    }).promise();

    return true;
  } catch (error) {
    console.error('Error removing permission:', error);
    return false;
  }
}

/**
 * Change a user's role
 *
 * @param {string} userId - User ID
 * @param {string} newRole - New role
 * @returns {Promise<boolean>} - Whether the role was changed
 */
async function changeRole(userId, newRole) {
  try {
    // Validate role
    if (!Object.values(DEFAULT_ROLES).includes(newRole)) {
      return false;
    }

    // For local development, return success
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Changing role of user ${userId} to ${newRole}`);
      return true;
    }

    // Update user
    await dynamoDB.update({
      TableName: process.env.PROVIDERS_TABLE || 'MedTranslateProviders',
      Key: { providerId: userId },
      UpdateExpression: 'SET #role = :role, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#role': 'role'
      },
      ExpressionAttributeValues: {
        ':role': newRole,
        ':updatedAt': new Date().toISOString()
      }
    }).promise();

    return true;
  } catch (error) {
    console.error('Error changing role:', error);
    return false;
  }
}

/**
 * Get all available roles
 *
 * @returns {Object} - Available roles
 */
function getAvailableRoles() {
  return DEFAULT_ROLES;
}

/**
 * Get permissions for a role
 *
 * @param {string} role - Role
 * @returns {Array<string>} - Permissions for the role
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

module.exports = {
  hasPermission,
  getUserPermissions,
  addPermission,
  removePermission,
  changeRole,
  getAvailableRoles,
  getRolePermissions,
  DEFAULT_ROLES,
  ROLE_PERMISSIONS
};
