/**
 * Enhanced Multi-Factor Authentication for MedTranslate AI
 *
 * This module provides advanced MFA capabilities including:
 * - TOTP (Time-based One-Time Password) authentication
 * - Backup codes generation and management
 * - MFA recovery options
 * - Device trust management
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

// Configuration
const BACKUP_CODES_COUNT = 10;
const BACKUP_CODE_LENGTH = 10;
const TOTP_WINDOW = 1; // Allow 1 period before and after current time
const RECOVERY_CODE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const TRUSTED_DEVICE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Generate a new TOTP secret for a user
 *
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {Promise<Object>} - TOTP setup information
 */
async function generateTotpSecret(userId, email) {
  try {
    // Generate a new secret
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `MedTranslate AI (${email})`,
      issuer: 'MedTranslate AI'
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Store secret in database (encrypted)
    await db.query(
      'UPDATE users SET mfa_secret = $1, mfa_enabled = false, mfa_type = $2 WHERE id = $3',
      [encryptSecret(secret.base32), 'totp', userId]
    );

    return {
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl
    };
  } catch (error) {
    console.error('Error generating TOTP secret:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify TOTP token and enable MFA if valid
 *
 * @param {string} userId - User ID
 * @param {string} token - TOTP token
 * @returns {Promise<Object>} - Verification result with backup codes
 */
async function verifyAndEnableMfa(userId, token) {
  try {
    // Get user's secret
    const result = await db.query(
      'SELECT mfa_secret FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const secret = decryptSecret(result.rows[0].mfa_secret);

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: TOTP_WINDOW
    });

    if (!verified) {
      return {
        success: false,
        error: 'Invalid verification code'
      };
    }

    // Generate backup codes
    const backupCodes = await generateBackupCodes(userId);

    // Enable MFA
    await db.query(
      'UPDATE users SET mfa_enabled = true, mfa_verified_at = NOW() WHERE id = $1',
      [userId]
    );

    return {
      success: true,
      backupCodes
    };
  } catch (error) {
    console.error('Error verifying and enabling MFA:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify TOTP token for authentication
 *
 * @param {string} userId - User ID
 * @param {string} token - TOTP token or backup code
 * @returns {Promise<Object>} - Verification result
 */
async function verifyMfa(userId, token) {
  try {
    // Get user's MFA information
    const result = await db.query(
      'SELECT mfa_secret, mfa_type, mfa_backup_codes FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const { mfa_secret, mfa_type, mfa_backup_codes } = result.rows[0];

    // Check if it's a backup code
    if (mfa_backup_codes && mfa_backup_codes.includes(token)) {
      // Remove used backup code
      const updatedBackupCodes = mfa_backup_codes.filter(code => code !== token);

      await db.query(
        'UPDATE users SET mfa_backup_codes = $1, mfa_last_used_at = NOW() WHERE id = $2',
        [updatedBackupCodes, userId]
      );

      // If only a few backup codes remain, notify user
      if (updatedBackupCodes.length <= 3) {
        // TODO: Send notification to user about low backup codes
      }

      return {
        success: true,
        method: 'backup_code',
        remainingBackupCodes: updatedBackupCodes.length
      };
    }

    // Verify TOTP
    if (mfa_type === 'totp') {
      const secret = decryptSecret(mfa_secret);

      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: TOTP_WINDOW
      });

      if (verified) {
        // Update last used timestamp
        await db.query(
          'UPDATE users SET mfa_last_used_at = NOW() WHERE id = $1',
          [userId]
        );

        return {
          success: true,
          method: 'totp'
        };
      }
    }

    return {
      success: false,
      error: 'Invalid verification code'
    };
  } catch (error) {
    console.error('Error verifying MFA:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate backup codes for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array<string>>} - Generated backup codes
 */
async function generateBackupCodes(userId) {
  try {
    const backupCodes = [];

    // Generate random backup codes
    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
      const code = crypto.randomBytes(Math.ceil(BACKUP_CODE_LENGTH / 2))
        .toString('hex')
        .slice(0, BACKUP_CODE_LENGTH)
        .toUpperCase();

      // Format as XXXX-XXXX-XX
      const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
      backupCodes.push(formattedCode);
    }

    // Store backup codes in database
    await db.query(
      'UPDATE users SET mfa_backup_codes = $1 WHERE id = $2',
      [backupCodes, userId]
    );

    return backupCodes;
  } catch (error) {
    console.error('Error generating backup codes:', error);
    throw error;
  }
}

/**
 * Disable MFA for a user
 *
 * @param {string} userId - User ID
 * @param {string} password - User password for verification
 * @returns {Promise<Object>} - Disable result
 */
async function disableMfa(userId, password) {
  try {
    // Verify password (implementation depends on your auth system)
    const passwordVerified = await verifyPassword(userId, password);

    if (!passwordVerified) {
      return {
        success: false,
        error: 'Invalid password'
      };
    }

    // Disable MFA
    await db.query(
      'UPDATE users SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1',
      [userId]
    );

    return {
      success: true
    };
  } catch (error) {
    console.error('Error disabling MFA:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate a recovery code for MFA
 *
 * @param {string} userId - User ID
 * @param {string} email - User email for verification
 * @returns {Promise<Object>} - Recovery result
 */
async function generateRecoveryCode(userId, email) {
  try {
    // Verify email matches user
    const result = await db.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].email !== email) {
      return {
        success: false,
        error: 'User not found or email mismatch'
      };
    }

    // Generate recovery code
    const recoveryCode = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + RECOVERY_CODE_EXPIRY);

    // Store recovery code
    await db.query(
      'INSERT INTO mfa_recovery_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [userId, recoveryCode, expiresAt]
    );

    // TODO: Send recovery code to user's email

    return {
      success: true,
      expiresAt
    };
  } catch (error) {
    console.error('Error generating recovery code:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Recover MFA access using a recovery code
 *
 * @param {string} userId - User ID
 * @param {string} recoveryCode - Recovery code
 * @returns {Promise<Object>} - Recovery result
 */
async function recoverMfaAccess(userId, recoveryCode) {
  try {
    // Verify recovery code
    const result = await db.query(
      'SELECT id, expires_at FROM mfa_recovery_codes WHERE user_id = $1 AND code = $2 AND used = false',
      [userId, recoveryCode]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Invalid recovery code'
      };
    }

    const { id, expires_at } = result.rows[0];

    // Check if code has expired
    if (new Date(expires_at) < new Date()) {
      return {
        success: false,
        error: 'Recovery code has expired'
      };
    }

    // Mark recovery code as used
    await db.query(
      'UPDATE mfa_recovery_codes SET used = true, used_at = NOW() WHERE id = $1',
      [id]
    );

    // Generate new backup codes
    const backupCodes = await generateBackupCodes(userId);

    return {
      success: true,
      backupCodes
    };
  } catch (error) {
    console.error('Error recovering MFA access:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Register a trusted device
 *
 * @param {string} userId - User ID
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<Object>} - Registration result
 */
async function registerTrustedDevice(userId, deviceInfo) {
  try {
    const deviceId = uuidv4();
    const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_EXPIRY);

    // Store device information
    await db.query(
      'INSERT INTO trusted_devices (user_id, device_id, device_name, device_type, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        userId,
        deviceId,
        deviceInfo.name,
        deviceInfo.type,
        deviceInfo.ipAddress,
        deviceInfo.userAgent,
        expiresAt
      ]
    );

    return {
      success: true,
      deviceId,
      expiresAt
    };
  } catch (error) {
    console.error('Error registering trusted device:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify if a device is trusted
 *
 * @param {string} userId - User ID
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} - Verification result
 */
async function verifyTrustedDevice(userId, deviceId) {
  try {
    const result = await db.query(
      'SELECT id, expires_at FROM trusted_devices WHERE user_id = $1 AND device_id = $2 AND revoked = false',
      [userId, deviceId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        trusted: false
      };
    }

    const { expires_at } = result.rows[0];

    // Check if trust has expired
    if (new Date(expires_at) < new Date()) {
      return {
        success: true,
        trusted: false,
        reason: 'expired'
      };
    }

    return {
      success: true,
      trusted: true,
      expiresAt: expires_at
    };
  } catch (error) {
    console.error('Error verifying trusted device:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Revoke a trusted device
 *
 * @param {string} userId - User ID
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} - Revocation result
 */
async function revokeTrustedDevice(userId, deviceId) {
  try {
    const result = await db.query(
      'UPDATE trusted_devices SET revoked = true, revoked_at = NOW() WHERE user_id = $1 AND device_id = $2 RETURNING id',
      [userId, deviceId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Device not found'
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Error revoking trusted device:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all trusted devices for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - List of trusted devices
 */
async function getTrustedDevices(userId) {
  try {
    const result = await db.query(
      'SELECT device_id, device_name, device_type, ip_address, user_agent, created_at, expires_at, last_used_at FROM trusted_devices WHERE user_id = $1 AND revoked = false ORDER BY created_at DESC',
      [userId]
    );

    return {
      success: true,
      devices: result.rows
    };
  } catch (error) {
    console.error('Error getting trusted devices:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Encrypt a secret using AES-256-GCM
 *
 * @param {string} secret - Secret to encrypt
 * @returns {string} - Encrypted secret in format: iv:authTag:encryptedData
 */
function encryptSecret(secret) {
  try {
    // Get encryption key from environment or generate a secure one
    // In production, this would be stored in a secure key management service
    const key = process.env.MFA_ENCRYPTION_KEY ||
      crypto.randomBytes(32).toString('hex'); // 256 bits

    // Convert key to Buffer if it's a string
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');

    // Generate random IV
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

    // Encrypt data
    const encryptedData = Buffer.concat([
      cipher.update(Buffer.from(secret, 'utf8')),
      cipher.final()
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Return encrypted data in format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encryptedData.toString('hex')}`;
  } catch (error) {
    console.error('Error encrypting secret:', error);
    throw new Error('Failed to encrypt secret');
  }
}

/**
 * Decrypt a secret using AES-256-GCM
 *
 * @param {string} encryptedSecret - Encrypted secret in format: iv:authTag:encryptedData
 * @returns {string} - Decrypted secret
 */
function decryptSecret(encryptedSecret) {
  try {
    // Handle legacy format
    if (encryptedSecret.startsWith('encrypted:')) {
      return encryptedSecret.replace('encrypted:', '');
    }

    // Parse encrypted data
    const [ivHex, authTagHex, encryptedDataHex] = encryptedSecret.split(':');

    // Get encryption key from environment
    const key = process.env.MFA_ENCRYPTION_KEY ||
      crypto.randomBytes(32).toString('hex'); // 256 bits

    // Convert key to Buffer if it's a string
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');

    // Convert components to Buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedData = Buffer.from(encryptedDataHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);

    // Set auth tag
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    return decryptedData.toString('utf8');
  } catch (error) {
    console.error('Error decrypting secret:', error);
    throw new Error('Failed to decrypt secret');
  }
}

/**
 * Verify user password
 *
 * @param {string} userId - User ID
 * @param {string} password - Password to verify
 * @returns {Promise<boolean>} - Whether password is valid
 */
async function verifyPassword(userId, password) {
  // This is a placeholder - the actual implementation would depend on your auth system
  return true;
}

module.exports = {
  generateTotpSecret,
  verifyAndEnableMfa,
  verifyMfa,
  generateBackupCodes,
  disableMfa,
  generateRecoveryCode,
  recoverMfaAccess,
  registerTrustedDevice,
  verifyTrustedDevice,
  revokeTrustedDevice,
  getTrustedDevices
};
