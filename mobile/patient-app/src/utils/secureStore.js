/**
 * Secure Storage utilities for MedTranslate AI Mobile App
 * 
 * This module provides a wrapper around Expo's SecureStore for storing
 * sensitive data securely on the device.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { encryptData, decryptData, getEncryptionKey } from './encryption';

// SecureStore is not available on web, so we need to use a fallback
const isSecureStoreAvailable = Platform.OS !== 'web';

/**
 * Secure store wrapper that falls back to encrypted AsyncStorage on web
 */
export const secureStore = {
  /**
   * Gets an item from secure storage
   * 
   * @param {string} key - The key to get
   * @returns {Promise<string>} - The value
   */
  async getItemAsync(key) {
    try {
      if (isSecureStoreAvailable) {
        return SecureStore.getItemAsync(key);
      } else {
        // On web, use encrypted AsyncStorage
        const encryptedData = await AsyncStorage.getItem(`secure_${key}`);
        
        if (!encryptedData) {
          return null;
        }
        
        const encryptionKey = await getEncryptionKey();
        return decryptData(JSON.parse(encryptedData), encryptionKey);
      }
    } catch (error) {
      console.error(`Error getting secure item ${key}:`, error);
      return null;
    }
  },
  
  /**
   * Sets an item in secure storage
   * 
   * @param {string} key - The key to set
   * @param {string} value - The value to set
   * @returns {Promise<void>}
   */
  async setItemAsync(key, value) {
    try {
      if (isSecureStoreAvailable) {
        return SecureStore.setItemAsync(key, value);
      } else {
        // On web, use encrypted AsyncStorage
        const encryptionKey = await getEncryptionKey();
        const encryptedData = await encryptData(value, encryptionKey);
        return AsyncStorage.setItem(`secure_${key}`, JSON.stringify(encryptedData));
      }
    } catch (error) {
      console.error(`Error setting secure item ${key}:`, error);
      throw error;
    }
  },
  
  /**
   * Deletes an item from secure storage
   * 
   * @param {string} key - The key to delete
   * @returns {Promise<void>}
   */
  async deleteItemAsync(key) {
    try {
      if (isSecureStoreAvailable) {
        return SecureStore.deleteItemAsync(key);
      } else {
        // On web, use AsyncStorage
        return AsyncStorage.removeItem(`secure_${key}`);
      }
    } catch (error) {
      console.error(`Error deleting secure item ${key}:`, error);
      throw error;
    }
  },
  
  /**
   * Checks if secure storage is available
   * 
   * @returns {boolean} - Whether secure storage is available
   */
  isAvailable() {
    return isSecureStoreAvailable;
  }
};

/**
 * Stores sensitive user data securely
 * 
 * @param {string} key - The key to store under
 * @param {object} data - The data to store
 * @returns {Promise<void>}
 */
export const storeUserData = async (key, data) => {
  try {
    const jsonValue = JSON.stringify(data);
    await secureStore.setItemAsync(key, jsonValue);
  } catch (error) {
    console.error(`Error storing user data for ${key}:`, error);
    throw error;
  }
};

/**
 * Retrieves sensitive user data
 * 
 * @param {string} key - The key to retrieve
 * @returns {Promise<object>} - The retrieved data
 */
export const getUserData = async (key) => {
  try {
    const jsonValue = await secureStore.getItemAsync(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error getting user data for ${key}:`, error);
    return null;
  }
};

/**
 * Stores authentication credentials securely
 * 
 * @param {object} credentials - The credentials to store
 * @returns {Promise<void>}
 */
export const storeCredentials = async (credentials) => {
  return storeUserData('credentials', credentials);
};

/**
 * Retrieves authentication credentials
 * 
 * @returns {Promise<object>} - The credentials
 */
export const getCredentials = async () => {
  return getUserData('credentials');
};

/**
 * Clears authentication credentials
 * 
 * @returns {Promise<void>}
 */
export const clearCredentials = async () => {
  try {
    await secureStore.deleteItemAsync('credentials');
  } catch (error) {
    console.error('Error clearing credentials:', error);
    throw error;
  }
};

/**
 * Stores a session token securely
 * 
 * @param {string} token - The token to store
 * @returns {Promise<void>}
 */
export const storeSessionToken = async (token) => {
  try {
    await secureStore.setItemAsync('session_token', token);
  } catch (error) {
    console.error('Error storing session token:', error);
    throw error;
  }
};

/**
 * Retrieves a session token
 * 
 * @returns {Promise<string>} - The token
 */
export const getSessionToken = async () => {
  try {
    return await secureStore.getItemAsync('session_token');
  } catch (error) {
    console.error('Error getting session token:', error);
    return null;
  }
};

/**
 * Clears a session token
 * 
 * @returns {Promise<void>}
 */
export const clearSessionToken = async () => {
  try {
    await secureStore.deleteItemAsync('session_token');
  } catch (error) {
    console.error('Error clearing session token:', error);
    throw error;
  }
};
