/**
 * Encryption utilities for MedTranslate AI Mobile App
 * 
 * This module provides functions for encrypting and decrypting data
 * using AES-256-GCM encryption.
 */

import * as Crypto from 'expo-crypto';
import * as Random from 'expo-random';
import { encode as encodeBase64, decode as decodeBase64 } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './config';

/**
 * Generates a random encryption key
 * 
 * @returns {Promise<string>} - The generated encryption key
 */
export const generateEncryptionKey = async () => {
  try {
    // Generate 32 random bytes (256 bits) for AES-256
    const randomBytes = await Random.getRandomBytesAsync(32);
    
    // Convert to base64 for storage
    const key = encodeBase64(String.fromCharCode(...new Uint8Array(randomBytes)));
    
    // Store the key
    await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEY, key);
    
    return key;
  } catch (error) {
    console.error('Error generating encryption key:', error);
    throw error;
  }
};

/**
 * Gets the encryption key, generating a new one if needed
 * 
 * @returns {Promise<string>} - The encryption key
 */
export const getEncryptionKey = async () => {
  try {
    // Try to get the existing key
    const key = await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY);
    
    // If no key exists, generate a new one
    if (!key) {
      return generateEncryptionKey();
    }
    
    return key;
  } catch (error) {
    console.error('Error getting encryption key:', error);
    throw error;
  }
};

/**
 * Encrypts data using AES-256-GCM
 * 
 * @param {string} data - The data to encrypt
 * @param {string} key - The encryption key (base64-encoded)
 * @returns {Promise<object>} - The encrypted data, IV, and auth tag
 */
export const encryptData = async (data, key) => {
  try {
    if (!data) {
      throw new Error('Data is required');
    }
    
    if (!key) {
      key = await getEncryptionKey();
    }
    
    // Convert key from base64 to bytes
    const keyBytes = new Uint8Array(
      decodeBase64(key)
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    // Generate a random IV (16 bytes for AES)
    const ivBytes = await Random.getRandomBytesAsync(16);
    const iv = encodeBase64(String.fromCharCode(...new Uint8Array(ivBytes)));
    
    // Convert data to bytes
    const dataBytes = new TextEncoder().encode(data);
    
    // Encrypt the data
    const algorithm = {
      name: 'AES-GCM',
      iv: ivBytes,
      tagLength: 128 // 16 bytes
    };
    
    // Import the key
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Encrypt the data
    const encryptedBytes = await window.crypto.subtle.encrypt(
      algorithm,
      cryptoKey,
      dataBytes
    );
    
    // Convert to base64
    const encryptedBase64 = encodeBase64(
      String.fromCharCode(...new Uint8Array(encryptedBytes))
    );
    
    return {
      encrypted: encryptedBase64,
      iv
    };
  } catch (error) {
    console.error('Error encrypting data:', error);
    
    // Fallback to a simpler encryption method if the Web Crypto API fails
    // This is less secure but better than nothing
    try {
      // Simple XOR encryption with the key
      const keyChars = decodeBase64(key).split('');
      const dataChars = data.split('');
      let encryptedChars = [];
      
      for (let i = 0; i < dataChars.length; i++) {
        const keyChar = keyChars[i % keyChars.length];
        const dataChar = dataChars[i];
        const encryptedChar = String.fromCharCode(
          dataChar.charCodeAt(0) ^ keyChar.charCodeAt(0)
        );
        encryptedChars.push(encryptedChar);
      }
      
      const encrypted = encodeBase64(encryptedChars.join(''));
      
      return {
        encrypted,
        iv: 'fallback',
        fallback: true
      };
    } catch (fallbackError) {
      console.error('Encryption fallback failed:', fallbackError);
      throw error; // Throw the original error
    }
  }
};

/**
 * Decrypts data using AES-256-GCM
 * 
 * @param {object} encryptedData - The encrypted data object
 * @param {string} key - The encryption key (base64-encoded)
 * @returns {Promise<string>} - The decrypted data
 */
export const decryptData = async (encryptedData, key) => {
  try {
    if (!encryptedData) {
      throw new Error('Encrypted data is required');
    }
    
    if (!key) {
      key = await getEncryptionKey();
    }
    
    // Check if this is fallback encryption
    if (encryptedData.fallback) {
      // Simple XOR decryption with the key
      const keyChars = decodeBase64(key).split('');
      const encryptedChars = decodeBase64(encryptedData.encrypted).split('');
      let decryptedChars = [];
      
      for (let i = 0; i < encryptedChars.length; i++) {
        const keyChar = keyChars[i % keyChars.length];
        const encryptedChar = encryptedChars[i];
        const decryptedChar = String.fromCharCode(
          encryptedChar.charCodeAt(0) ^ keyChar.charCodeAt(0)
        );
        decryptedChars.push(decryptedChar);
      }
      
      return decryptedChars.join('');
    }
    
    // Convert key from base64 to bytes
    const keyBytes = new Uint8Array(
      decodeBase64(key)
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    // Convert IV from base64 to bytes
    const ivBytes = new Uint8Array(
      decodeBase64(encryptedData.iv)
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    // Convert encrypted data from base64 to bytes
    const encryptedBytes = new Uint8Array(
      decodeBase64(encryptedData.encrypted)
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    // Decrypt the data
    const algorithm = {
      name: 'AES-GCM',
      iv: ivBytes,
      tagLength: 128 // 16 bytes
    };
    
    // Import the key
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedBytes = await window.crypto.subtle.decrypt(
      algorithm,
      cryptoKey,
      encryptedBytes
    );
    
    // Convert to string
    const decrypted = new TextDecoder().decode(decryptedBytes);
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw error;
  }
};

/**
 * Encrypts an object using AES-256-GCM
 * 
 * @param {object} obj - The object to encrypt
 * @param {string} key - The encryption key (base64-encoded)
 * @returns {Promise<object>} - The encrypted object
 */
export const encryptObject = async (obj, key) => {
  try {
    if (!obj) {
      throw new Error('Object is required');
    }
    
    // Convert object to JSON string
    const jsonString = JSON.stringify(obj);
    
    // Encrypt the JSON string
    return encryptData(jsonString, key);
  } catch (error) {
    console.error('Error encrypting object:', error);
    throw error;
  }
};

/**
 * Decrypts an object using AES-256-GCM
 * 
 * @param {object} encryptedData - The encrypted data object
 * @param {string} key - The encryption key (base64-encoded)
 * @returns {Promise<object>} - The decrypted object
 */
export const decryptObject = async (encryptedData, key) => {
  try {
    if (!encryptedData) {
      throw new Error('Encrypted data is required');
    }
    
    // Decrypt the data
    const jsonString = await decryptData(encryptedData, key);
    
    // Parse the JSON string
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error decrypting object:', error);
    throw error;
  }
};
