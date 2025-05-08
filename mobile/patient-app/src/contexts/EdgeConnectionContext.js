/**
 * Enhanced Edge Connection Context for MedTranslate AI Patient App
 *
 * This context provides functions for connecting to and communicating with
 * the MedTranslate AI edge device or cloud service, with support for offline mode,
 * enhanced edge device discovery, and error handling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as EdgeDiscoveryService from '../shared/services/enhanced-edge-discovery';

// API endpoints
const API_ENDPOINTS = {
  CLOUD: 'https://api.medtranslate.ai',
  EDGE: 'http://192.168.1.100:3000' // Default edge device IP
};

// Cache keys
const CACHE_KEYS = {
  EDGE_DEVICE_IP: 'medtranslate_edge_device_ip',
  OFFLINE_QUEUE: 'medtranslate_offline_queue',
  TRANSLATION_CACHE: 'medtranslate_translation_cache'
};

// Create the context
export const EdgeConnectionContext = React.createContext({
  isConnected: true,
  activeEndpoint: API_ENDPOINTS.CLOUD,
  offlineQueue: 0,
  discoveredDevices: [],
  isDiscovering: false,
  preferredDevice: null,
  edgeConnection: {
    connect: async () => {},
    disconnect: async () => {},
    translateAudio: async () => {},
    translateText: async () => {},
    syncOfflineData: async () => false,
    clearTranslationCache: async () => false,
    isEdgeDevice: false,
    rediscoverEdgeDevice: async () => {},
    discoverEdgeDevices: async () => {}
  }
});

// Create the context provider component
export const EdgeConnectionProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [activeEndpoint, setActiveEndpoint] = useState(API_ENDPOINTS.CLOUD);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [translationCache, setTranslationCache] = useState({});
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [preferredDevice, setPreferredDevice] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cached data on startup
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load saved edge device IP
        const savedEdgeIP = await AsyncStorage.getItem(CACHE_KEYS.EDGE_DEVICE_IP);
        if (savedEdgeIP) {
          API_ENDPOINTS.EDGE = savedEdgeIP;
        }

        // Load offline queue
        const savedQueue = await AsyncStorage.getItem(CACHE_KEYS.OFFLINE_QUEUE);
        if (savedQueue) {
          setOfflineQueue(JSON.parse(savedQueue));
        }

        // Load translation cache
        const savedCache = await AsyncStorage.getItem(CACHE_KEYS.TRANSLATION_CACHE);
        if (savedCache) {
          setTranslationCache(JSON.parse(savedCache));
        }

        // Initialize enhanced edge discovery service
        const discoveryState = await EdgeDiscoveryService.initialize();

        setDiscoveredDevices(discoveryState.discoveredDevices || []);
        setPreferredDevice(discoveryState.preferredDevice || null);

        // If we have a preferred device, update edge endpoint
        if (discoveryState.preferredDevice) {
          const deviceEndpoint = `http://${discoveryState.preferredDevice.ipAddress}:${discoveryState.preferredDevice.port || 3000}`;
          API_ENDPOINTS.EDGE = deviceEndpoint;
          setActiveEndpoint(deviceEndpoint);

          // Save the edge device IP for future use
          await AsyncStorage.setItem(CACHE_KEYS.EDGE_DEVICE_IP, deviceEndpoint);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing edge connection:', error);
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const previouslyConnected = isConnected;
      setIsConnected(state.isConnected);

      // If we're on a local network, try to discover edge device
      if (state.isConnected) {
        if (state.type === 'wifi' && !isDiscovering) {
          discoverEdgeDevices({ background: true });
        } else {
          // Fall back to cloud endpoint if not on WiFi
          setActiveEndpoint(API_ENDPOINTS.CLOUD);
        }

        // If we just came back online, process offline queue
        if (!previouslyConnected) {
          processOfflineQueue();
        }
      }
    });

    return () => unsubscribe();
  }, [isConnected, offlineQueue]);

  // Process offline queue
  const processOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) {
      return;
    }

    console.log(`Processing offline queue: ${offlineQueue.length} items`);

    // Process each item in the queue
    const newQueue = [...offlineQueue];
    for (let i = 0; i < newQueue.length; i++) {
      const item = newQueue[i];

      try {
        // Process the item based on its type
        if (item.type === 'text_translation') {
          // Try to send the translation request
          await fetch(`${activeEndpoint}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          });

          // Remove from queue if successful
          newQueue.splice(i, 1);
          i--;
        } else if (item.type === 'audio_translation') {
          // Try to send the audio translation request
          await fetch(`${activeEndpoint}/translate/audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          });

          // Remove from queue if successful
          newQueue.splice(i, 1);
          i--;
        }
      } catch (error) {
        console.error('Error processing offline queue item:', error);
      }
    }

    // Update queue
    setOfflineQueue(newQueue);
    await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(newQueue));

    // Notify user
    if (newQueue.length === 0) {
      Alert.alert('Sync Complete', 'All offline data has been synchronized.');
    }
  }, [offlineQueue, activeEndpoint]);

  // Discover edge devices using enhanced discovery service
  const discoverEdgeDevices = async (options = {}) => {
    try {
      setIsDiscovering(true);

      const result = await EdgeDiscoveryService.discoverEdgeDevices(options);

      // Update state
      setDiscoveredDevices(result.discoveredDevices || []);

      // Get preferred device
      const newPreferredDevice = EdgeDiscoveryService.getPreferredDevice();
      setPreferredDevice(newPreferredDevice);

      // If we have a preferred device, update edge endpoint
      if (newPreferredDevice) {
        const deviceEndpoint = `http://${newPreferredDevice.ipAddress}:${newPreferredDevice.port || 3000}`;
        API_ENDPOINTS.EDGE = deviceEndpoint;
        setActiveEndpoint(deviceEndpoint);

        // Save the edge device IP for future use
        await AsyncStorage.setItem(CACHE_KEYS.EDGE_DEVICE_IP, deviceEndpoint);
      }

      setIsDiscovering(false);
      return result;
    } catch (error) {
      console.error('Error discovering edge devices:', error);
      setIsDiscovering(false);
      return {
        success: false,
        error: error.message,
        discoveredDevices: []
      };
    }
  };

  // Legacy method for backward compatibility
  const rediscoverEdgeDevice = async () => {
    try {
      // Use enhanced discovery
      const result = await discoverEdgeDevices();

      // Return success if we have a preferred device
      return result.success;
    } catch (error) {
      console.error('Error in legacy rediscoverEdgeDevice:', error);
      return false;
    }
  };

  // Connect to a translation session
  const connect = async (sessionId) => {
    try {
      const response = await fetch(`${activeEndpoint}/sessions/${sessionId}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceType: Platform.OS,
          appVersion: '1.0.0'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to connect to session: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error connecting to session:', error);
      throw error;
    }
  };

  // Disconnect from a translation session
  const disconnect = async () => {
    try {
      await fetch(`${activeEndpoint}/sessions/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error disconnecting from session:', error);
    }
  };

  // Translate audio with offline support
  const translateAudio = async (audioUri, sourceLanguage, targetLanguage, context = 'general') => {
    try {
      // Generate a cache key for this translation
      const cacheKey = `audio_${sourceLanguage}_${targetLanguage}_${context}_${audioUri.split('/').pop()}`;

      // Check if we're offline
      if (!isConnected) {
        // Check if we have a cached result
        if (translationCache[cacheKey]) {
          console.log('Using cached translation result');
          return translationCache[cacheKey];
        }

        // Add to offline queue
        const requestData = {
          audioUri,
          sourceLanguage,
          targetLanguage,
          context,
          timestamp: new Date().toISOString()
        };

        const newQueue = [...offlineQueue, {
          type: 'audio_translation',
          data: requestData,
          cacheKey
        }];

        setOfflineQueue(newQueue);
        await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(newQueue));

        // Return error for UI to handle
        throw new Error('Device is offline. Translation will be processed when connection is restored.');
      }

      // Convert audio to base64
      const audioData = await getBase64FromUri(audioUri);

      // Try edge device first if available
      if (activeEndpoint === API_ENDPOINTS.EDGE) {
        try {
          const response = await fetch(`${API_ENDPOINTS.EDGE}/translate/audio`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              audioData,
              sourceLanguage,
              targetLanguage,
              context
            })
          });

          if (response.ok) {
            const result = await response.json();

            // Cache the result
            const cacheResult = { ...result, timestamp: Date.now() };
            const newCache = { ...translationCache, [cacheKey]: cacheResult };
            setTranslationCache(newCache);
            await AsyncStorage.setItem(CACHE_KEYS.TRANSLATION_CACHE, JSON.stringify(newCache));

            return result;
          }
        } catch (error) {
          console.log('Edge device audio translation failed, falling back to cloud:', error);

          // Fall back to cloud
          setActiveEndpoint(API_ENDPOINTS.CLOUD);
        }
      }

      // Use cloud endpoint
      console.log('Using cloud endpoint for audio translation');

      const response = await fetch(`${API_ENDPOINTS.CLOUD}/translate/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioData,
          sourceLanguage,
          targetLanguage,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const result = await response.json();

      // Cache the result
      const cacheResult = { ...result, timestamp: Date.now() };
      const newCache = { ...translationCache, [cacheKey]: cacheResult };
      setTranslationCache(newCache);
      await AsyncStorage.setItem(CACHE_KEYS.TRANSLATION_CACHE, JSON.stringify(newCache));

      return result;
    } catch (error) {
      console.error('Error translating audio:', error);
      throw error;
    }
  };

  // Translate text with offline support
  const translateText = async (text, sourceLanguage, targetLanguage, context = 'general') => {
    try {
      // Generate a cache key for this translation
      const cacheKey = `text_${sourceLanguage}_${targetLanguage}_${context}_${text.substring(0, 50)}`;

      // Check if we're offline
      if (!isConnected) {
        // Check if we have a cached result
        if (translationCache[cacheKey]) {
          console.log('Using cached translation result');
          return translationCache[cacheKey];
        }

        // Add to offline queue
        const requestData = {
          text,
          sourceLanguage,
          targetLanguage,
          context,
          timestamp: new Date().toISOString()
        };

        const newQueue = [...offlineQueue, {
          type: 'text_translation',
          data: requestData,
          cacheKey
        }];

        setOfflineQueue(newQueue);
        await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(newQueue));

        // Return error for UI to handle
        throw new Error('Device is offline. Translation will be processed when connection is restored.');
      }

      // Try edge device first if available
      if (activeEndpoint === API_ENDPOINTS.EDGE) {
        try {
          const response = await fetch(`${API_ENDPOINTS.EDGE}/translate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text,
              sourceLanguage,
              targetLanguage,
              context
            })
          });

          if (response.ok) {
            const result = await response.json();

            // Cache the result
            const cacheResult = { ...result, timestamp: Date.now() };
            const newCache = { ...translationCache, [cacheKey]: cacheResult };
            setTranslationCache(newCache);
            await AsyncStorage.setItem(CACHE_KEYS.TRANSLATION_CACHE, JSON.stringify(newCache));

            return result;
          }
        } catch (error) {
          console.log('Edge device translation failed, falling back to cloud:', error);

          // Fall back to cloud
          setActiveEndpoint(API_ENDPOINTS.CLOUD);
        }
      }

      // Use cloud endpoint
      console.log('Using cloud endpoint for translation');

      const response = await fetch(`${API_ENDPOINTS.CLOUD}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          sourceLanguage,
          targetLanguage,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const result = await response.json();

      // Cache the result
      const cacheResult = { ...result, timestamp: Date.now() };
      const newCache = { ...translationCache, [cacheKey]: cacheResult };
      setTranslationCache(newCache);
      await AsyncStorage.setItem(CACHE_KEYS.TRANSLATION_CACHE, JSON.stringify(newCache));

      return result;
    } catch (error) {
      console.error('Error translating text:', error);
      throw error;
    }
  };

  // Sync offline data
  const syncOfflineData = async () => {
    try {
      await processOfflineQueue();
      return true;
    } catch (error) {
      console.error('Error syncing offline data:', error);
      return false;
    }
  };

  // Clear translation cache
  const clearTranslationCache = async () => {
    try {
      setTranslationCache({});
      await AsyncStorage.removeItem(CACHE_KEYS.TRANSLATION_CACHE);
      Alert.alert('Cache Cleared', 'Translation cache has been cleared successfully.');
      return true;
    } catch (error) {
      console.error('Error clearing translation cache:', error);
      Alert.alert('Error', `Failed to clear cache: ${error.message}`);
      return false;
    }
  };

  // Helper function to get base64 from URI
  const getBase64FromUri = async (uri) => {
    if (Platform.OS === 'web') {
      // Web implementation
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // React Native implementation
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  };

  // Provide context value
  const contextValue = {
    isConnected,
    activeEndpoint,
    offlineQueue: offlineQueue.length,
    discoveredDevices,
    isDiscovering,
    preferredDevice,
    edgeConnection: {
      connect,
      disconnect,
      translateAudio,
      translateText,
      syncOfflineData,
      clearTranslationCache,
      isEdgeDevice: activeEndpoint === API_ENDPOINTS.EDGE,
      rediscoverEdgeDevice,
      discoverEdgeDevices
    }
  };

  // Don't render until initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <EdgeConnectionContext.Provider value={contextValue}>
      {children}
    </EdgeConnectionContext.Provider>
  );
};
