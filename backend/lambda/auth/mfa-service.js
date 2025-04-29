/**
 * Multi-Factor Authentication Service for MedTranslate AI
 *
 * This module provides functions for MFA setup, verification, and management
 * using Time-based One-Time Password (TOTP) authentication.
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Constants
const MFA_SECRET_LENGTH = 20; // Length of MFA secret in bytes
const MFA_ISSUER = 'MedTranslate AI';

/**
 * Generate a new MFA secret for a user
 *
 * @param {string} userId - User ID
 * @param {string} username - Username for display in authenticator app
 * @returns {Promise<Object>} - MFA setup information
 */
async function generateMfaSecret(userId, username) {
  try {
    // Generate a random secret
    const secret = speakeasy.generateSecret({
      length: MFA_SECRET_LENGTH,
      name: `${MFA_ISSUER}:${username}`,
      issuer: MFA_ISSUER
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Return MFA setup information
    return {
      userId,
      secret: secret.base32,
      qrCodeUrl,
      otpauthUrl: secret.otpauth_url
    };
  } catch (error) {
    console.error('Error generating MFA secret:', error);
    throw new Error('Failed to generate MFA secret');
  }
}

/**
 * Enable MFA for a user
 *
 * @param {string} userId - User ID
 * @param {string} secret - MFA secret
 * @param {string} token - Verification token from authenticator app
 * @returns {Promise<Object>} - Result of MFA enablement
 */
async function enableMfa(userId, secret, token) {
  try {
    // Verify the token first
    const isValid = verifyToken(secret, token);

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid verification code'
      };
    }

    // Get the table name from environment variable
    const tableName = process.env.PROVIDERS_TABLE || 'MedTranslateProviders';

    // Get the user
    const userResult = await dynamoDB.get({
      TableName: tableName,
      Key: { providerId: userId }
    }).promise();

    if (!userResult.Item) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Update user with MFA information
    await dynamoDB.update({
      TableName: tableName,
      Key: { providerId: userId },
      UpdateExpression: 'SET mfaEnabled = :enabled, mfaSecret = :secret, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':enabled': true,
        ':secret': secret,
        ':updatedAt': new Date().toISOString()
      }
    }).promise();

    // Generate backup codes
    const backupCodes = generateBackupCodes(userId);

    return {
      success: true,
      mfaEnabled: true,
      backupCodes
    };
  } catch (error) {
    console.error('Error enabling MFA:', error);
    throw new Error('Failed to enable MFA');
  }
}

/**
 * Disable MFA for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Result of MFA disablement
 */
async function disableMfa(userId) {
  try {
    // Get the table name from environment variable
    const tableName = process.env.PROVIDERS_TABLE || 'MedTranslateProviders';

    // Update user to disable MFA
    await dynamoDB.update({
      TableName: tableName,
      Key: { providerId: userId },
      UpdateExpression: 'SET mfaEnabled = :enabled, mfaSecret = :secret, backupCodes = :backupCodes, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':enabled': false,
        ':secret': null,
        ':backupCodes': null,
        ':updatedAt': new Date().toISOString()
      }
    }).promise();

    return {
      success: true,
      mfaEnabled: false
    };
  } catch (error) {
    console.error('Error disabling MFA:', error);
    throw new Error('Failed to disable MFA');
  }
}

/**
 * Verify a TOTP token
 *
 * @param {string} secret - MFA secret
 * @param {string} token - Token to verify
 * @returns {boolean} - Whether the token is valid
 */
function verifyToken(secret, token) {
  try {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1 // Allow 1 step before and after for clock drift
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

/**
 * Generate backup codes for a user
 *
 * @param {string} userId - User ID
 * @param {number} count - Number of backup codes to generate
 * @returns {Promise<Array<string>>} - Array of backup codes
 */
async function generateBackupCodes(userId, count = 10) {
  try {
    // Generate random backup codes
    const backupCodes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    // Get the table name from environment variable
    const tableName = process.env.PROVIDERS_TABLE || 'MedTranslateProviders';

    // Hash the backup codes for storage
    const hashedCodes = backupCodes.map(code => {
      return {
        code: crypto.createHash('sha256').update(code).digest('hex'),
        used: false
      };
    });

    // Store the hashed backup codes
    await dynamoDB.update({
      TableName: tableName,
      Key: { providerId: userId },
      UpdateExpression: 'SET backupCodes = :codes, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':codes': hashedCodes,
        ':updatedAt': new Date().toISOString()
      }
    }).promise();

    // Return the plain text backup codes to show to the user
    return backupCodes;
  } catch (error) {
    console.error('Error generating backup codes:', error);
    throw new Error('Failed to generate backup codes');
  }
}

/**
 * Verify a backup code
 *
 * @param {string} userId - User ID
 * @param {string} backupCode - Backup code to verify
 * @returns {Promise<boolean>} - Whether the backup code is valid
 */
async function verifyBackupCode(userId, backupCode) {
  try {
    // Normalize the backup code
    const normalizedCode = backupCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Hash the backup code
    const hashedCode = crypto.createHash('sha256').update(normalizedCode).digest('hex');

    // Get the table name from environment variable
    const tableName = process.env.PROVIDERS_TABLE || 'MedTranslateProviders';

    // Get the user
    const userResult = await dynamoDB.get({
      TableName: tableName,
      Key: { providerId: userId }
    }).promise();

    if (!userResult.Item || !userResult.Item.backupCodes) {
      return false;
    }

    // Find the backup code
    const backupCodes = userResult.Item.backupCodes;
    const codeIndex = backupCodes.findIndex(code => code.code === hashedCode && !code.used);

    if (codeIndex === -1) {
      return false;
    }

    // Mark the backup code as used
    backupCodes[codeIndex].used = true;

    // Update the user
    await dynamoDB.update({
      TableName: tableName,
      Key: { providerId: userId },
      UpdateExpression: 'SET backupCodes = :codes, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':codes': backupCodes,
        ':updatedAt': new Date().toISOString()
      }
    }).promise();

    return true;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
}

/**
 * Get MFA status for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - MFA status
 */
async function getMfaStatus(userId) {
  try {
    // Get the table name from environment variable
    const tableName = process.env.PROVIDERS_TABLE || 'MedTranslateProviders';

    // Get the user
    const userResult = await dynamoDB.get({
      TableName: tableName,
      Key: { providerId: userId }
    }).promise();

    if (!userResult.Item) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      mfaEnabled: userResult.Item.mfaEnabled || false
    };
  } catch (error) {
    console.error('Error getting MFA status:', error);
    throw new Error('Failed to get MFA status');
  }
}

module.exports = {
  generateMfaSecret,
  enableMfa,
  disableMfa,
  verifyToken,
  generateBackupCodes,
  verifyBackupCode,
  getMfaStatus
};
