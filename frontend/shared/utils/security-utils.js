/**
 * Security Utilities for MedTranslate AI
 * 
 * This module provides utilities for enhancing security in the MedTranslate AI application.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

// Storage keys
const STORAGE_KEYS = {
  SECURITY_SETTINGS: 'medtranslate_security_settings',
  BIOMETRIC_ENABLED: 'medtranslate_biometric_enabled',
  LAST_AUTHENTICATION: 'medtranslate_last_authentication',
  DEVICE_ID: 'medtranslate_device_id',
  SESSION_TIMEOUT: 'medtranslate_session_timeout'
};

// Default security settings
const DEFAULT_SECURITY_SETTINGS = {
  biometricEnabled: false,
  sessionTimeout: 15, // minutes
  secureStorageEnabled: true,
  jailbreakDetectionEnabled: true,
  certificatePinningEnabled: true,
  screenCaptureDisabled: false
};

// Current settings
let currentSettings = { ...DEFAULT_SECURITY_SETTINGS };

/**
 * Initialize security settings
 * 
 * @returns {Promise<Object>} - Current security settings
 */
export const initialize = async () => {
  try {
    // Load settings from storage
    const storedSettings = await getSecureItem(STORAGE_KEYS.SECURITY_SETTINGS);
    
    if (storedSettings) {
      currentSettings = { ...DEFAULT_SECURITY_SETTINGS, ...JSON.parse(storedSettings) };
    }
    
    // Generate device ID if not exists
    await getOrCreateDeviceId();
    
    // Check if device is jailbroken/rooted
    if (currentSettings.jailbreakDetectionEnabled) {
      const isJailbroken = await isDeviceJailbroken();
      
      if (isJailbroken) {
        console.warn('Device appears to be jailbroken or rooted');
        // In a real app, you might want to take action here
      }
    }
    
    // Disable screen capture if needed
    if (currentSettings.screenCaptureDisabled) {
      await disableScreenCapture();
    }
    
    return currentSettings;
  } catch (error) {
    console.error('Error initializing security settings:', error);
    return DEFAULT_SECURITY_SETTINGS;
  }
};

/**
 * Get current security settings
 * 
 * @returns {Object} - Current security settings
 */
export const getSettings = () => {
  return { ...currentSettings };
};

/**
 * Update security settings
 * 
 * @param {Object} settings - New settings
 * @returns {Promise<Object>} - Updated settings
 */
export const updateSettings = async (settings) => {
  try {
    // Update current settings
    currentSettings = { ...currentSettings, ...settings };
    
    // Save settings to secure storage
    await setSecureItem(
      STORAGE_KEYS.SECURITY_SETTINGS,
      JSON.stringify(currentSettings)
    );
    
    // Update screen capture setting if changed
    if (settings.hasOwnProperty('screenCaptureDisabled')) {
      if (settings.screenCaptureDisabled) {
        await disableScreenCapture();
      } else {
        await enableScreenCapture();
      }
    }
    
    return currentSettings;
  } catch (error) {
    console.error('Error updating security settings:', error);
    throw error;
  }
};

/**
 * Check if biometric authentication is available
 * 
 * @returns {Promise<Object>} - Biometric availability info
 */
export const checkBiometricAvailability = async () => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    
    if (!hasHardware) {
      return {
        available: false,
        error: 'Biometric hardware not available'
      };
    }
    
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (!isEnrolled) {
      return {
        available: false,
        error: 'No biometric identities enrolled'
      };
    }
    
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    return {
      available: true,
      types: types.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'face';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'iris';
          default:
            return 'unknown';
        }
      })
    };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return {
      available: false,
      error: error.message
    };
  }
};

/**
 * Authenticate user with biometrics
 * 
 * @param {string} reason - Reason for authentication
 * @returns {Promise<boolean>} - Whether authentication was successful
 */
export const authenticateWithBiometrics = async (reason = 'Authenticate to continue') => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false
    });
    
    if (result.success) {
      // Update last authentication time
      await setSecureItem(
        STORAGE_KEYS.LAST_AUTHENTICATION,
        Date.now().toString()
      );
    }
    
    return result.success;
  } catch (error) {
    console.error('Error authenticating with biometrics:', error);
    return false;
  }
};

/**
 * Check if session is expired
 * 
 * @returns {Promise<boolean>} - Whether session is expired
 */
export const isSessionExpired = async () => {
  try {
    const lastAuthStr = await getSecureItem(STORAGE_KEYS.LAST_AUTHENTICATION);
    
    if (!lastAuthStr) {
      return true;
    }
    
    const lastAuth = parseInt(lastAuthStr, 10);
    const now = Date.now();
    const sessionTimeoutMs = currentSettings.sessionTimeout * 60 * 1000;
    
    return now - lastAuth > sessionTimeoutMs;
  } catch (error) {
    console.error('Error checking session expiration:', error);
    return true;
  }
};

/**
 * Reset session timeout
 * 
 * @returns {Promise<void>}
 */
export const resetSessionTimeout = async () => {
  try {
    await setSecureItem(
      STORAGE_KEYS.LAST_AUTHENTICATION,
      Date.now().toString()
    );
  } catch (error) {
    console.error('Error resetting session timeout:', error);
  }
};

/**
 * Get or create device ID
 * 
 * @returns {Promise<string>} - Device ID
 */
export const getOrCreateDeviceId = async () => {
  try {
    // Try to get existing device ID
    let deviceId = await getSecureItem(STORAGE_KEYS.DEVICE_ID);
    
    if (!deviceId) {
      // Generate a new device ID
      deviceId = await generateDeviceId();
      
      // Save device ID
      await setSecureItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('Error getting or creating device ID:', error);
    throw error;
  }
};

/**
 * Generate a device ID
 * 
 * @returns {Promise<string>} - Generated device ID
 */
const generateDeviceId = async () => {
  try {
    // Get device info
    const deviceName = Device.deviceName || 'unknown';
    const deviceType = Device.deviceType || 0;
    const deviceBrand = Device.brand || 'unknown';
    const deviceModel = Device.modelName || 'unknown';
    
    // Get app info
    const appVersion = Application.nativeApplicationVersion || '1.0.0';
    const appBuild = Application.nativeBuildVersion || '1';
    
    // Create a unique string
    const uniqueString = `${deviceName}-${deviceType}-${deviceBrand}-${deviceModel}-${appVersion}-${appBuild}-${Date.now()}`;
    
    // Generate a hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      uniqueString
    );
    
    // Return a portion of the hash as the device ID
    return hash.substring(0, 32);
  } catch (error) {
    console.error('Error generating device ID:', error);
    
    // Fallback to a random ID
    return `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
};

/**
 * Check if device is jailbroken or rooted
 * 
 * @returns {Promise<boolean>} - Whether device is jailbroken or rooted
 */
const isDeviceJailbroken = async () => {
  try {
    if (Platform.OS === 'ios') {
      // Check if device is jailbroken
      return await Device.isRootedExperimentalAsync();
    } else if (Platform.OS === 'android') {
      // Check if device is rooted
      return await Device.isRootedExperimentalAsync();
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if device is jailbroken:', error);
    return false;
  }
};

/**
 * Disable screen capture
 * 
 * @returns {Promise<void>}
 */
const disableScreenCapture = async () => {
  try {
    // This would use platform-specific APIs
    // For a real implementation, you would use a native module
    console.log('Screen capture disabled');
  } catch (error) {
    console.error('Error disabling screen capture:', error);
  }
};

/**
 * Enable screen capture
 * 
 * @returns {Promise<void>}
 */
const enableScreenCapture = async () => {
  try {
    // This would use platform-specific APIs
    // For a real implementation, you would use a native module
    console.log('Screen capture enabled');
  } catch (error) {
    console.error('Error enabling screen capture:', error);
  }
};

/**
 * Get item from secure storage
 * 
 * @param {string} key - Storage key
 * @returns {Promise<string>} - Stored value
 */
export const getSecureItem = async (key) => {
  try {
    if (Platform.OS === 'web') {
      // Web doesn't support secure storage, fall back to AsyncStorage
      return await AsyncStorage.getItem(key);
    }
    
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error getting secure item ${key}:`, error);
    return null;
  }
};

/**
 * Set item in secure storage
 * 
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {Promise<void>}
 */
export const setSecureItem = async (key, value) => {
  try {
    if (Platform.OS === 'web') {
      // Web doesn't support secure storage, fall back to AsyncStorage
      await AsyncStorage.setItem(key, value);
      return;
    }
    
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error setting secure item ${key}:`, error);
    throw error;
  }
};

/**
 * Remove item from secure storage
 * 
 * @param {string} key - Storage key
 * @returns {Promise<void>}
 */
export const removeSecureItem = async (key) => {
  try {
    if (Platform.OS === 'web') {
      // Web doesn't support secure storage, fall back to AsyncStorage
      await AsyncStorage.removeItem(key);
      return;
    }
    
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error removing secure item ${key}:`, error);
    throw error;
  }
};

/**
 * Hash a string
 * 
 * @param {string} text - Text to hash
 * @param {string} algorithm - Hash algorithm
 * @returns {Promise<string>} - Hashed text
 */
export const hashString = async (text, algorithm = Crypto.CryptoDigestAlgorithm.SHA256) => {
  try {
    return await Crypto.digestStringAsync(algorithm, text);
  } catch (error) {
    console.error('Error hashing string:', error);
    throw error;
  }
};

/**
 * Sanitize input to prevent injection attacks
 * 
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  
  // Replace potentially dangerous characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate JWT token
 * 
 * @param {string} token - JWT token to validate
 * @returns {Object} - Token validation result
 */
export const validateToken = (token) => {
  try {
    if (!token) {
      return {
        valid: false,
        error: 'No token provided'
      };
    }
    
    // Split token into parts
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      return {
        valid: false,
        error: 'Invalid token format'
      };
    }
    
    // Decode payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) {
      return {
        valid: false,
        error: 'Token expired',
        expired: true
      };
    }
    
    return {
      valid: true,
      payload
    };
  } catch (error) {
    console.error('Error validating token:', error);
    return {
      valid: false,
      error: 'Invalid token'
    };
  }
};
