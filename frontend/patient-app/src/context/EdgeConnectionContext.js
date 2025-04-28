/**
 * Edge Connection Context for MedTranslate AI Patient Application
 * 
 * This context provides functions for connecting to and communicating with
 * the MedTranslate AI edge device or cloud service.
 */

import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// API endpoints
const API_ENDPOINTS = {
  CLOUD: 'https://api.medtranslate.ai',
  EDGE: 'http://192.168.1.100:3000' // Default edge device IP
};

// Create the context provider component
export const EdgeConnectionProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [activeEndpoint, setActiveEndpoint] = useState(API_ENDPOINTS.CLOUD);
  
  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      
      // If we're on a local network, try to discover edge device
      if (state.isConnected && state.type === 'wifi') {
        discoverEdgeDevice();
      } else {
        // Fall back to cloud endpoint if not on WiFi
        setActiveEndpoint(API_ENDPOINTS.CLOUD);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Discover edge device on local network
  const discoverEdgeDevice = async () => {
    try {
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
      } else {
        console.log('Edge device not available, using cloud endpoint');
        setActiveEndpoint(API_ENDPOINTS.CLOUD);
      }
    } catch (error) {
      console.log('Edge device not found, using cloud endpoint');
      setActiveEndpoint(API_ENDPOINTS.CLOUD);
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
  
  // Translate audio
  const translateAudio = async (audioUri, sourceLanguage, targetLanguage, context = 'general') => {
    try {
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
      
      return await response.json();
    } catch (error) {
      console.error('Error translating audio:', error);
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
  
  // Provide context value
  const contextValue = {
    isConnected,
    activeEndpoint,
    edgeConnection: {
      connect,
      disconnect,
      translateAudio,
      isEdgeDevice: activeEndpoint === API_ENDPOINTS.EDGE
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
  edgeConnection: {
    connect: async () => {},
    disconnect: async () => {},
    translateAudio: async () => {},
    isEdgeDevice: false
  }
});
