/**
 * Edge Connection Context for MedTranslate AI Patient Application
 *
 * This context provides functions for connecting to and communicating with
 * the MedTranslate AI edge device or cloud service, with support for offline mode
 * and error handling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Platform, Alert, AsyncStorage } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

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

// Create the context provider component
export const EdgeConnectionProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [activeEndpoint, setActiveEndpoint] = useState(API_ENDPOINTS.CLOUD);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [translationCache, setTranslationCache] = useState({});

  // Load cached data on startup
  useEffect(() => {
    const loadCachedData = async () => {
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
      } catch (error) {
        console.error('Error loading cached data:', error);
      }
    };

    loadCachedData();
  }, []);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const previouslyConnected = isConnected;
      setIsConnected(state.isConnected);

      // If we're on a local network, try to discover edge device
      if (state.isConnected) {
        if (state.type === 'wifi') {
          discoverEdgeDevice();
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

  // Process offline queue when coming back online
  const processOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return;

    console.log(`Processing ${offlineQueue.length} items from offline queue`);

    // Process each item in the queue
    const newQueue = [...offlineQueue];
    for (let i = 0; i < newQueue.length; i++) {
      const item = newQueue[i];

      try {
        // Process the item based on its type
        if (item.type === 'translation') {
          // Try to send the translation request
          await fetch(`${activeEndpoint}/translate`, {
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

  // Discover edge device on local network
  const discoverEdgeDevice = async () => {
    if (isDiscovering) return;

    try {
      setIsDiscovering(true);

      // Try to connect to the edge device
      const response = await fetch(`${API_ENDPOINTS.EDGE}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 2000 // Short timeout for quick discovery
      });

      if (response.ok) {
        console.log('Edge device discovered on local network');
        setActiveEndpoint(API_ENDPOINTS.EDGE);

        // Save the edge device IP for future use
        await AsyncStorage.setItem(CACHE_KEYS.EDGE_DEVICE_IP, API_ENDPOINTS.EDGE);
      } else {
        console.log('Edge device not available, using cloud endpoint');
        setActiveEndpoint(API_ENDPOINTS.CLOUD);
      }
    } catch (error) {
      console.log('Edge device not found, using cloud endpoint');
      setActiveEndpoint(API_ENDPOINTS.CLOUD);
    } finally {
      setIsDiscovering(false);
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

      // Read audio file as base64
      const audioData = await readAudioFileAsBase64(audioUri);

      // Send to translation service
      const response = await fetch(`${activeEndpoint}/translate-audio`, {
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

      // Get the result
      const result = await response.json();

      // Cache the result
      const newCache = { ...translationCache, [cacheKey]: result };
      setTranslationCache(newCache);
      await AsyncStorage.setItem(CACHE_KEYS.TRANSLATION_CACHE, JSON.stringify(newCache));

      return result;
    } catch (error) {
      console.error('Error translating audio:', error);

      // If it's a network error and we're actually online, we might have just lost connection
      if (error.message.includes('Network request failed') && isConnected) {
        setIsConnected(false);

        // Try to handle as offline
        return translateAudio(audioUri, sourceLanguage, targetLanguage, context);
      }

      throw error;
    }
  };

  // Helper to read audio file as base64
  const readAudioFileAsBase64 = async (uri) => {
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

  // Add text translation with offline support
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

      // Send to translation service
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
        })
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      // Get the result
      const result = await response.json();

      // Cache the result
      const newCache = { ...translationCache, [cacheKey]: result };
      setTranslationCache(newCache);
      await AsyncStorage.setItem(CACHE_KEYS.TRANSLATION_CACHE, JSON.stringify(newCache));

      return result;
    } catch (error) {
      console.error('Error translating text:', error);

      // If it's a network error and we're actually online, we might have just lost connection
      if (error.message.includes('Network request failed') && isConnected) {
        setIsConnected(false);

        // Try to handle as offline
        return translateText(text, sourceLanguage, targetLanguage, context);
      }

      throw error;
    }
  };

  // Force sync offline queue
  const syncOfflineData = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Cannot sync while offline. Please connect to the internet and try again.');
      return false;
    }

    try {
      await processOfflineQueue();
      return true;
    } catch (error) {
      console.error('Error syncing offline data:', error);
      Alert.alert('Sync Error', `Failed to sync offline data: ${error.message}`);
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

  // Provide context value
  const contextValue = {
    isConnected,
    activeEndpoint,
    offlineQueue: offlineQueue.length,
    edgeConnection: {
      connect,
      disconnect,
      translateAudio,
      translateText,
      syncOfflineData,
      clearTranslationCache,
      isEdgeDevice: activeEndpoint === API_ENDPOINTS.EDGE,
      rediscoverEdgeDevice: discoverEdgeDevice
    }
  };

  return (
    <EdgeConnectionContext.Provider value={contextValue}>
      {children}
    </EdgeConnectionContext.Provider>
  );
};

// Create and export the context
export const EdgeConnectionContext = React.createContext({
  isConnected: true,
  activeEndpoint: API_ENDPOINTS.CLOUD,
  offlineQueue: 0,
  edgeConnection: {
    connect: async () => {},
    disconnect: async () => {},
    translateAudio: async () => {},
    translateText: async () => {},
    syncOfflineData: async () => false,
    clearTranslationCache: async () => false,
    isEdgeDevice: false,
    rediscoverEdgeDevice: async () => {}
  }
});
