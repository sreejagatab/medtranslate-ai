/**
 * Edge Service for MedTranslate AI
 * 
 * This service provides functions for interacting with edge devices
 * for offline translation and synchronization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';

// Storage keys
const STORAGE_KEYS = {
  EDGE_DEVICE_IP: 'medtranslate_edge_device_ip',
  EDGE_DEVICE_STATUS: 'medtranslate_edge_device_status',
  OFFLINE_QUEUE: 'medtranslate_offline_queue',
  TRANSLATION_CACHE: 'medtranslate_translation_cache',
  OFFLINE_MODELS: 'medtranslate_offline_models',
  LAST_SYNC: 'medtranslate_last_sync'
};

// Default endpoints
const DEFAULT_ENDPOINTS = {
  CLOUD: 'https://api.medtranslate.ai',
  EDGE: 'http://192.168.1.100:3000'
};

// Default timeout
const DEFAULT_TIMEOUT = 5000;

// Maximum cache size (in entries)
const MAX_CACHE_SIZE = 1000;

// Maximum offline queue size
const MAX_QUEUE_SIZE = 500;

// Service state
let isInitialized = false;
let activeEndpoint = DEFAULT_ENDPOINTS.CLOUD;
let isEdgeDevice = false;
let offlineQueue = [];
let translationCache = {};
let offlineModels = {};
let lastSyncTime = 0;

/**
 * Initialize the edge service
 * 
 * @returns {Promise<Object>} - Service state
 */
export const initialize = async () => {
  try {
    if (isInitialized) {
      return {
        activeEndpoint,
        isEdgeDevice,
        offlineQueue: offlineQueue.length,
        lastSyncTime
      };
    }
    
    // Load stored edge device IP
    const storedEdgeIp = await AsyncStorage.getItem(STORAGE_KEYS.EDGE_DEVICE_IP);
    
    if (storedEdgeIp) {
      DEFAULT_ENDPOINTS.EDGE = storedEdgeIp;
    }
    
    // Load stored edge device status
    const storedEdgeStatus = await AsyncStorage.getItem(STORAGE_KEYS.EDGE_DEVICE_STATUS);
    
    if (storedEdgeStatus) {
      isEdgeDevice = JSON.parse(storedEdgeStatus);
    }
    
    // Load offline queue
    const storedQueue = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    
    if (storedQueue) {
      offlineQueue = JSON.parse(storedQueue);
    }
    
    // Load translation cache
    const storedCache = await AsyncStorage.getItem(STORAGE_KEYS.TRANSLATION_CACHE);
    
    if (storedCache) {
      translationCache = JSON.parse(storedCache);
    }
    
    // Load offline models
    const storedModels = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODELS);
    
    if (storedModels) {
      offlineModels = JSON.parse(storedModels);
    }
    
    // Load last sync time
    const storedLastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    
    if (storedLastSync) {
      lastSyncTime = parseInt(storedLastSync, 10);
    }
    
    // Set active endpoint based on edge device status
    activeEndpoint = isEdgeDevice ? DEFAULT_ENDPOINTS.EDGE : DEFAULT_ENDPOINTS.CLOUD;
    
    // Check network status
    const networkState = await NetInfo.fetch();
    
    // If we're online and on WiFi, try to discover edge device
    if (networkState.isConnected && networkState.type === 'wifi') {
      await discoverEdgeDevice();
    }
    
    isInitialized = true;
    
    return {
      activeEndpoint,
      isEdgeDevice,
      offlineQueue: offlineQueue.length,
      lastSyncTime
    };
  } catch (error) {
    console.error('Error initializing edge service:', error);
    
    return {
      activeEndpoint: DEFAULT_ENDPOINTS.CLOUD,
      isEdgeDevice: false,
      offlineQueue: 0,
      lastSyncTime: 0
    };
  }
};

/**
 * Discover edge device on local network
 * 
 * @returns {Promise<boolean>} - Whether edge device was discovered
 */
export const discoverEdgeDevice = async () => {
  try {
    // Check if we're online
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      console.log('Not connected to network, cannot discover edge device');
      return false;
    }
    
    // Try to connect to edge device
    const response = await fetch(`${DEFAULT_ENDPOINTS.EDGE}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: DEFAULT_TIMEOUT
    });
    
    if (response.ok) {
      console.log('Edge device discovered on local network');
      
      // Update state
      isEdgeDevice = true;
      activeEndpoint = DEFAULT_ENDPOINTS.EDGE;
      
      // Save edge device status
      await AsyncStorage.setItem(STORAGE_KEYS.EDGE_DEVICE_STATUS, JSON.stringify(true));
      
      return true;
    } else {
      console.log('Edge device not available, using cloud endpoint');
      
      // Update state
      isEdgeDevice = false;
      activeEndpoint = DEFAULT_ENDPOINTS.CLOUD;
      
      // Save edge device status
      await AsyncStorage.setItem(STORAGE_KEYS.EDGE_DEVICE_STATUS, JSON.stringify(false));
      
      return false;
    }
  } catch (error) {
    console.log('Error discovering edge device:', error);
    
    // Update state
    isEdgeDevice = false;
    activeEndpoint = DEFAULT_ENDPOINTS.CLOUD;
    
    // Save edge device status
    await AsyncStorage.setItem(STORAGE_KEYS.EDGE_DEVICE_STATUS, JSON.stringify(false));
    
    return false;
  }
};

/**
 * Translate text using the active endpoint
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Promise<Object>} - Translation result
 */
export const translateText = async (text, sourceLanguage, targetLanguage, context = 'general') => {
  try {
    // Check if we have a cached translation
    const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}_${context}`;
    
    if (translationCache[cacheKey]) {
      console.log('Using cached translation');
      
      return {
        ...translationCache[cacheKey],
        source: 'cache'
      };
    }
    
    // Check if we're online
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      console.log('Offline, using local translation');
      
      // Check if we have an offline model for this language pair
      const modelKey = `${sourceLanguage}_${targetLanguage}`;
      
      if (!offlineModels[modelKey]) {
        throw new Error('No offline model available for this language pair');
      }
      
      // Use offline model
      const result = await translateOffline(text, sourceLanguage, targetLanguage, context);
      
      // Cache the result
      cacheTranslation(cacheKey, result);
      
      return {
        ...result,
        source: 'offline'
      };
    }
    
    // Try to use edge device if available
    if (isEdgeDevice) {
      try {
        console.log('Using edge device for translation');
        
        const response = await fetch(`${activeEndpoint}/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            sourceLanguage,
            targetLanguage,
            context
          }),
          timeout: DEFAULT_TIMEOUT
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Cache the result
          cacheTranslation(cacheKey, result);
          
          return {
            ...result,
            source: 'edge'
          };
        } else {
          throw new Error('Edge device translation failed');
        }
      } catch (error) {
        console.log('Edge device translation failed, falling back to cloud:', error);
        
        // Fall back to cloud
        isEdgeDevice = false;
        activeEndpoint = DEFAULT_ENDPOINTS.CLOUD;
        
        // Save edge device status
        await AsyncStorage.setItem(STORAGE_KEYS.EDGE_DEVICE_STATUS, JSON.stringify(false));
      }
    }
    
    // Use cloud endpoint
    console.log('Using cloud endpoint for translation');
    
    const response = await fetch(`${DEFAULT_ENDPOINTS.CLOUD}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        sourceLanguage,
        targetLanguage,
        context
      }),
      timeout: DEFAULT_TIMEOUT * 2 // Longer timeout for cloud
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Cache the result
      cacheTranslation(cacheKey, result);
      
      return {
        ...result,
        source: 'cloud'
      };
    } else {
      throw new Error('Cloud translation failed');
    }
  } catch (error) {
    console.error('Translation error:', error);
    
    // Add to offline queue if we're offline
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      addToOfflineQueue({
        type: 'translate',
        data: {
          text,
          sourceLanguage,
          targetLanguage,
          context
        },
        timestamp: Date.now()
      });
    }
    
    throw error;
  }
};

/**
 * Translate audio using the active endpoint
 * 
 * @param {string} audioData - Base64-encoded audio data
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Promise<Object>} - Translation result
 */
export const translateAudio = async (audioData, sourceLanguage, targetLanguage, context = 'general') => {
  try {
    // Check if we're online
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      console.log('Offline, using local translation');
      
      // Check if we have an offline model for this language pair
      const modelKey = `${sourceLanguage}_${targetLanguage}`;
      
      if (!offlineModels[modelKey]) {
        throw new Error('No offline model available for this language pair');
      }
      
      // Use offline model
      const result = await translateAudioOffline(audioData, sourceLanguage, targetLanguage, context);
      
      return {
        ...result,
        source: 'offline'
      };
    }
    
    // Try to use edge device if available
    if (isEdgeDevice) {
      try {
        console.log('Using edge device for audio translation');
        
        const response = await fetch(`${activeEndpoint}/translate/audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            audioData,
            sourceLanguage,
            targetLanguage,
            context
          }),
          timeout: DEFAULT_TIMEOUT * 2 // Longer timeout for audio
        });
        
        if (response.ok) {
          const result = await response.json();
          
          return {
            ...result,
            source: 'edge'
          };
        } else {
          throw new Error('Edge device audio translation failed');
        }
      } catch (error) {
        console.log('Edge device audio translation failed, falling back to cloud:', error);
        
        // Fall back to cloud
        isEdgeDevice = false;
        activeEndpoint = DEFAULT_ENDPOINTS.CLOUD;
        
        // Save edge device status
        await AsyncStorage.setItem(STORAGE_KEYS.EDGE_DEVICE_STATUS, JSON.stringify(false));
      }
    }
    
    // Use cloud endpoint
    console.log('Using cloud endpoint for audio translation');
    
    const response = await fetch(`${DEFAULT_ENDPOINTS.CLOUD}/translate/audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audioData,
        sourceLanguage,
        targetLanguage,
        context
      }),
      timeout: DEFAULT_TIMEOUT * 3 // Even longer timeout for cloud audio
    });
    
    if (response.ok) {
      const result = await response.json();
      
      return {
        ...result,
        source: 'cloud'
      };
    } else {
      throw new Error('Cloud audio translation failed');
    }
  } catch (error) {
    console.error('Audio translation error:', error);
    
    // Add to offline queue if we're offline
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      addToOfflineQueue({
        type: 'translateAudio',
        data: {
          audioData,
          sourceLanguage,
          targetLanguage,
          context
        },
        timestamp: Date.now()
      });
    }
    
    throw error;
  }
};

/**
 * Sync offline data with cloud
 * 
 * @returns {Promise<boolean>} - Whether sync was successful
 */
export const syncOfflineData = async () => {
  try {
    // Check if we're online
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      console.log('Not connected to network, cannot sync');
      return false;
    }
    
    // Check if we have anything to sync
    if (offlineQueue.length === 0) {
      console.log('No offline data to sync');
      
      // Update last sync time
      lastSyncTime = Date.now();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, lastSyncTime.toString());
      
      return true;
    }
    
    console.log(`Syncing ${offlineQueue.length} offline items`);
    
    // Process offline queue
    const successfulItems = [];
    
    for (const item of offlineQueue) {
      try {
        if (item.type === 'translate') {
          // Sync translation
          await fetch(`${DEFAULT_ENDPOINTS.CLOUD}/translate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...item.data,
              offlineTimestamp: item.timestamp
            }),
            timeout: DEFAULT_TIMEOUT * 2
          });
          
          successfulItems.push(item);
        } else if (item.type === 'translateAudio') {
          // Sync audio translation
          await fetch(`${DEFAULT_ENDPOINTS.CLOUD}/translate/audio`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...item.data,
              offlineTimestamp: item.timestamp
            }),
            timeout: DEFAULT_TIMEOUT * 3
          });
          
          successfulItems.push(item);
        }
      } catch (error) {
        console.error(`Error syncing item ${item.type}:`, error);
      }
    }
    
    // Remove successful items from queue
    offlineQueue = offlineQueue.filter(item => !successfulItems.includes(item));
    
    // Save updated queue
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
    
    // Update last sync time
    lastSyncTime = Date.now();
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, lastSyncTime.toString());
    
    console.log(`Synced ${successfulItems.length} items, ${offlineQueue.length} remaining`);
    
    return true;
  } catch (error) {
    console.error('Error syncing offline data:', error);
    return false;
  }
};

/**
 * Download offline model for a language pair
 * 
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<boolean>} - Whether download was successful
 */
export const downloadOfflineModel = async (sourceLanguage, targetLanguage) => {
  try {
    // Check if we're online
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      console.log('Not connected to network, cannot download model');
      return false;
    }
    
    // Check if we already have this model
    const modelKey = `${sourceLanguage}_${targetLanguage}`;
    
    if (offlineModels[modelKey]) {
      console.log(`Model for ${modelKey} already downloaded`);
      return true;
    }
    
    console.log(`Downloading model for ${modelKey}`);
    
    // Get model info
    const infoResponse = await fetch(`${DEFAULT_ENDPOINTS.CLOUD}/models/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceLanguage,
        targetLanguage
      }),
      timeout: DEFAULT_TIMEOUT
    });
    
    if (!infoResponse.ok) {
      throw new Error('Failed to get model info');
    }
    
    const modelInfo = await infoResponse.json();
    
    // Check if model is available for download
    if (!modelInfo.downloadUrl) {
      throw new Error('Model not available for download');
    }
    
    // Create models directory if it doesn't exist
    const modelsDir = `${FileSystem.documentDirectory}models/`;
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
    }
    
    // Download model
    const modelPath = `${modelsDir}${modelKey}.bin`;
    
    await FileSystem.downloadAsync(
      modelInfo.downloadUrl,
      modelPath
    );
    
    // Verify download
    const fileInfo = await FileSystem.getInfoAsync(modelPath);
    
    if (!fileInfo.exists) {
      throw new Error('Model download failed');
    }
    
    // Add model to offline models
    offlineModels[modelKey] = {
      path: modelPath,
      size: fileInfo.size,
      version: modelInfo.version,
      downloadDate: Date.now()
    };
    
    // Save offline models
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODELS, JSON.stringify(offlineModels));
    
    console.log(`Model for ${modelKey} downloaded successfully`);
    
    return true;
  } catch (error) {
    console.error('Error downloading offline model:', error);
    return false;
  }
};

/**
 * Clear translation cache
 * 
 * @returns {Promise<boolean>} - Whether cache was cleared
 */
export const clearTranslationCache = async () => {
  try {
    translationCache = {};
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSLATION_CACHE, JSON.stringify({}));
    
    console.log('Translation cache cleared');
    
    return true;
  } catch (error) {
    console.error('Error clearing translation cache:', error);
    return false;
  }
};

/**
 * Get offline models
 * 
 * @returns {Object} - Offline models
 */
export const getOfflineModels = () => {
  return { ...offlineModels };
};

/**
 * Get offline queue
 * 
 * @returns {Array} - Offline queue
 */
export const getOfflineQueue = () => {
  return [...offlineQueue];
};

/**
 * Get last sync time
 * 
 * @returns {number} - Last sync time
 */
export const getLastSyncTime = () => {
  return lastSyncTime;
};

/**
 * Get active endpoint
 * 
 * @returns {string} - Active endpoint
 */
export const getActiveEndpoint = () => {
  return activeEndpoint;
};

/**
 * Check if edge device is active
 * 
 * @returns {boolean} - Whether edge device is active
 */
export const isEdgeDeviceActive = () => {
  return isEdgeDevice;
};

/**
 * Translate text using offline model
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Promise<Object>} - Translation result
 */
const translateOffline = async (text, sourceLanguage, targetLanguage, context) => {
  // This is a mock implementation
  // In a real app, this would use a local ML model
  
  console.log(`[MOCK] Translating offline: ${text} (${sourceLanguage} -> ${targetLanguage})`);
  
  // Simple mock translations for testing
  const mockTranslations = {
    'en_es': {
      'hello': 'hola',
      'goodbye': 'adiós',
      'thank you': 'gracias',
      'yes': 'sí',
      'no': 'no',
      'help': 'ayuda',
      'doctor': 'médico',
      'hospital': 'hospital',
      'pain': 'dolor',
      'medicine': 'medicina',
      'headache': 'dolor de cabeza',
      'fever': 'fiebre',
      'cold': 'resfriado',
      'flu': 'gripe',
      'allergy': 'alergia',
      'prescription': 'receta',
      'pharmacy': 'farmacia',
      'emergency': 'emergencia',
      'appointment': 'cita',
      'insurance': 'seguro'
    },
    'es_en': {
      'hola': 'hello',
      'adiós': 'goodbye',
      'gracias': 'thank you',
      'sí': 'yes',
      'no': 'no',
      'ayuda': 'help',
      'médico': 'doctor',
      'hospital': 'hospital',
      'dolor': 'pain',
      'medicina': 'medicine',
      'dolor de cabeza': 'headache',
      'fiebre': 'fever',
      'resfriado': 'cold',
      'gripe': 'flu',
      'alergia': 'allergy',
      'receta': 'prescription',
      'farmacia': 'pharmacy',
      'emergencia': 'emergency',
      'cita': 'appointment',
      'seguro': 'insurance'
    }
  };
  
  const modelKey = `${sourceLanguage}_${targetLanguage}`;
  const translations = mockTranslations[modelKey] || {};
  
  // Simple word-by-word translation
  const words = text.toLowerCase().split(' ');
  const translatedWords = words.map(word => translations[word] || word);
  
  return {
    originalText: text,
    translatedText: translatedWords.join(' '),
    confidence: 0.7,
    processingTime: 100
  };
};

/**
 * Translate audio using offline model
 * 
 * @param {string} audioData - Base64-encoded audio data
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Promise<Object>} - Translation result
 */
const translateAudioOffline = async (audioData, sourceLanguage, targetLanguage, context) => {
  // This is a mock implementation
  // In a real app, this would use a local ML model
  
  console.log(`[MOCK] Translating audio offline (${sourceLanguage} -> ${targetLanguage})`);
  
  // Mock transcription based on source language
  const mockTranscriptions = {
    'en': 'I have a headache and fever',
    'es': 'Tengo dolor de cabeza y fiebre',
    'fr': 'J\'ai mal à la tête et de la fièvre',
    'de': 'Ich habe Kopfschmerzen und Fieber'
  };
  
  // Transcribe audio
  const transcribedText = mockTranscriptions[sourceLanguage] || 'Unknown text';
  
  // Translate transcribed text
  const translationResult = await translateOffline(
    transcribedText,
    sourceLanguage,
    targetLanguage,
    context
  );
  
  return {
    ...translationResult,
    transcribedText
  };
};

/**
 * Add item to offline queue
 * 
 * @param {Object} item - Queue item
 */
const addToOfflineQueue = async (item) => {
  // Check if queue is full
  if (offlineQueue.length >= MAX_QUEUE_SIZE) {
    // Remove oldest item
    offlineQueue.shift();
  }
  
  // Add item to queue
  offlineQueue.push(item);
  
  // Save queue
  await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
  
  console.log(`Added item to offline queue (${offlineQueue.length} items)`);
};

/**
 * Cache translation result
 * 
 * @param {string} key - Cache key
 * @param {Object} result - Translation result
 */
const cacheTranslation = async (key, result) => {
  // Check if cache is full
  const cacheKeys = Object.keys(translationCache);
  
  if (cacheKeys.length >= MAX_CACHE_SIZE) {
    // Remove oldest entries
    const oldestKeys = cacheKeys.sort((a, b) => {
      return (translationCache[a].timestamp || 0) - (translationCache[b].timestamp || 0);
    }).slice(0, Math.ceil(MAX_CACHE_SIZE * 0.1)); // Remove 10% of oldest entries
    
    oldestKeys.forEach(k => {
      delete translationCache[k];
    });
  }
  
  // Add result to cache
  translationCache[key] = {
    ...result,
    timestamp: Date.now()
  };
  
  // Save cache
  await AsyncStorage.setItem(STORAGE_KEYS.TRANSLATION_CACHE, JSON.stringify(translationCache));
  
  console.log(`Cached translation (${Object.keys(translationCache).length} entries)`);
};
