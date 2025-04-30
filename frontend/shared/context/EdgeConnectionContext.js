/**
 * Edge Connection Context for MedTranslate AI
 * 
 * This context provides edge device connection state and functions
 * for components throughout the application.
 */

import React, { createContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as EdgeService from '../services/edge-service';
import * as AnalyticsService from '../services/analytics-service';

// Create context
export const EdgeConnectionContext = createContext({
  isEdgeDevice: false,
  isOfflineMode: false,
  lastSyncTime: 0,
  offlineQueueSize: 0,
  availableModels: {},
  translateText: async () => {},
  translateAudio: async () => {},
  syncOfflineData: async () => {},
  downloadOfflineModel: async () => {},
  toggleOfflineMode: () => {},
  rediscoverEdgeDevice: async () => {}
});

/**
 * Edge Connection Provider Component
 */
export const EdgeConnectionProvider = ({ children }) => {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEdgeDevice, setIsEdgeDevice] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [availableModels, setAvailableModels] = useState({});
  
  // Initialize edge service
  useEffect(() => {
    const initializeEdgeService = async () => {
      try {
        const state = await EdgeService.initialize();
        
        setIsEdgeDevice(state.isEdgeDevice);
        setLastSyncTime(state.lastSyncTime);
        setOfflineQueueSize(state.offlineQueue);
        setAvailableModels(EdgeService.getOfflineModels());
        setIsInitialized(true);
        
        // Track initialization
        AnalyticsService.trackEvent(
          AnalyticsService.EVENT_TYPES.SYSTEM,
          'edge_service',
          'initialize',
          {
            isEdgeDevice: state.isEdgeDevice,
            offlineQueueSize: state.offlineQueue,
            endpoint: state.activeEndpoint
          }
        );
      } catch (error) {
        console.error('Error initializing edge service:', error);
        setIsInitialized(true);
      }
    };
    
    initializeEdgeService();
  }, []);
  
  // Listen for network changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // If we're coming back online and not in offline mode, sync data
      if (state.isConnected && !isOfflineMode) {
        syncOfflineData();
      }
      
      // If we're coming back online and on WiFi, try to discover edge device
      if (state.isConnected && state.type === 'wifi' && !isEdgeDevice) {
        rediscoverEdgeDevice();
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [isEdgeDevice, isOfflineMode]);
  
  // Translate text
  const translateText = async (text, sourceLanguage, targetLanguage, context = 'general') => {
    try {
      // Track translation request
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'translation',
        'text_translation_request',
        {
          sourceLanguage,
          targetLanguage,
          context,
          isEdgeDevice,
          isOfflineMode
        }
      );
      
      const result = await EdgeService.translateText(
        text,
        sourceLanguage,
        targetLanguage,
        context
      );
      
      // Track translation result
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'translation',
        'text_translation_result',
        {
          sourceLanguage,
          targetLanguage,
          context,
          source: result.source,
          confidence: result.confidence,
          processingTime: result.processingTime
        }
      );
      
      return result;
    } catch (error) {
      console.error('Error translating text:', error);
      
      // Track translation error
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.ERROR,
        'translation',
        'text_translation_error',
        {
          sourceLanguage,
          targetLanguage,
          context,
          error: error.message
        }
      );
      
      throw error;
    }
  };
  
  // Translate audio
  const translateAudio = async (audioData, sourceLanguage, targetLanguage, context = 'general') => {
    try {
      // Track audio translation request
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'translation',
        'audio_translation_request',
        {
          sourceLanguage,
          targetLanguage,
          context,
          isEdgeDevice,
          isOfflineMode
        }
      );
      
      const result = await EdgeService.translateAudio(
        audioData,
        sourceLanguage,
        targetLanguage,
        context
      );
      
      // Track audio translation result
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'translation',
        'audio_translation_result',
        {
          sourceLanguage,
          targetLanguage,
          context,
          source: result.source,
          confidence: result.confidence,
          processingTime: result.processingTime
        }
      );
      
      return result;
    } catch (error) {
      console.error('Error translating audio:', error);
      
      // Track audio translation error
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.ERROR,
        'translation',
        'audio_translation_error',
        {
          sourceLanguage,
          targetLanguage,
          context,
          error: error.message
        }
      );
      
      throw error;
    }
  };
  
  // Sync offline data
  const syncOfflineData = async () => {
    try {
      // Track sync request
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_service',
        'sync_request',
        {
          offlineQueueSize
        }
      );
      
      const result = await EdgeService.syncOfflineData();
      
      if (result) {
        // Update state
        setLastSyncTime(EdgeService.getLastSyncTime());
        setOfflineQueueSize(EdgeService.getOfflineQueue().length);
        
        // Track sync success
        AnalyticsService.trackEvent(
          AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
          'edge_service',
          'sync_success',
          {
            newOfflineQueueSize: EdgeService.getOfflineQueue().length
          }
        );
      } else {
        // Track sync failure
        AnalyticsService.trackEvent(
          AnalyticsService.EVENT_TYPES.ERROR,
          'edge_service',
          'sync_failure',
          {
            offlineQueueSize
          }
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error syncing offline data:', error);
      
      // Track sync error
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.ERROR,
        'edge_service',
        'sync_error',
        {
          error: error.message,
          offlineQueueSize
        }
      );
      
      return false;
    }
  };
  
  // Download offline model
  const downloadOfflineModel = async (sourceLanguage, targetLanguage) => {
    try {
      // Track download request
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_service',
        'model_download_request',
        {
          sourceLanguage,
          targetLanguage
        }
      );
      
      const result = await EdgeService.downloadOfflineModel(sourceLanguage, targetLanguage);
      
      if (result) {
        // Update available models
        setAvailableModels(EdgeService.getOfflineModels());
        
        // Track download success
        AnalyticsService.trackEvent(
          AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
          'edge_service',
          'model_download_success',
          {
            sourceLanguage,
            targetLanguage
          }
        );
      } else {
        // Track download failure
        AnalyticsService.trackEvent(
          AnalyticsService.EVENT_TYPES.ERROR,
          'edge_service',
          'model_download_failure',
          {
            sourceLanguage,
            targetLanguage
          }
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error downloading offline model:', error);
      
      // Track download error
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.ERROR,
        'edge_service',
        'model_download_error',
        {
          sourceLanguage,
          targetLanguage,
          error: error.message
        }
      );
      
      return false;
    }
  };
  
  // Toggle offline mode
  const toggleOfflineMode = (value) => {
    setIsOfflineMode(value);
    
    // Track offline mode toggle
    AnalyticsService.trackEvent(
      AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
      'edge_service',
      'toggle_offline_mode',
      {
        enabled: value
      }
    );
    
    // If turning off offline mode, sync data
    if (!value) {
      syncOfflineData();
    }
  };
  
  // Rediscover edge device
  const rediscoverEdgeDevice = async () => {
    try {
      // Track discovery request
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_service',
        'discover_request',
        {
          previousState: isEdgeDevice
        }
      );
      
      const result = await EdgeService.discoverEdgeDevice();
      
      // Update state
      setIsEdgeDevice(result);
      
      // Track discovery result
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_service',
        'discover_result',
        {
          success: result,
          previousState: isEdgeDevice
        }
      );
      
      return result;
    } catch (error) {
      console.error('Error discovering edge device:', error);
      
      // Track discovery error
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.ERROR,
        'edge_service',
        'discover_error',
        {
          error: error.message,
          previousState: isEdgeDevice
        }
      );
      
      return false;
    }
  };
  
  // Context value
  const contextValue = {
    isEdgeDevice,
    isOfflineMode,
    lastSyncTime,
    offlineQueueSize,
    availableModels,
    translateText,
    translateAudio,
    syncOfflineData,
    downloadOfflineModel,
    toggleOfflineMode,
    rediscoverEdgeDevice
  };
  
  // Render loading state if not initialized
  if (!isInitialized) {
    return null;
  }
  
  return (
    <EdgeConnectionContext.Provider value={contextValue}>
      {children}
    </EdgeConnectionContext.Provider>
  );
};
