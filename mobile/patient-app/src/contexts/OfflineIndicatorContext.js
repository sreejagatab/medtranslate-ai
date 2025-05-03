/**
 * Offline Indicator Context for MedTranslate AI Patient App
 * 
 * This context provides information about offline readiness and caching status
 * for the EnhancedOfflineIndicator component.
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import { ConnectionContext } from './ConnectionContext';
import edgeWebSocketService from '../services/EdgeWebSocketService';

// Create context
const OfflineIndicatorContext = createContext({
  isOffline: false,
  offlineReadiness: 0,
  offlineRisk: 0,
  cacheStats: null,
  prepareForOffline: async () => {},
  checkConnection: async () => {}
});

// Offline indicator provider component
export const OfflineIndicatorProvider = ({ children }) => {
  // State
  const [isOffline, setIsOffline] = useState(false);
  const [offlineReadiness, setOfflineReadiness] = useState(0);
  const [offlineRisk, setOfflineRisk] = useState(0);
  const [cacheStats, setCacheStats] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Get connection state from ConnectionContext
  const connectionContext = useContext(ConnectionContext);
  
  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize edge WebSocket service
        await edgeWebSocketService.initialize();
        
        // Set initial offline state
        setIsOffline(!connectionContext.isConnected);
        
        // Get initial cache stats
        await fetchCacheStats();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing OfflineIndicatorContext:', error);
        setIsInitialized(true);
      }
    };
    
    initialize();
  }, []);
  
  // Update offline state when connection state changes
  useEffect(() => {
    setIsOffline(!connectionContext.isConnected);
  }, [connectionContext.isConnected]);
  
  // Fetch cache stats periodically
  useEffect(() => {
    // Initial fetch
    fetchCacheStats();
    
    // Set up interval for periodic fetching
    const interval = setInterval(() => {
      fetchCacheStats();
    }, 60000); // Every minute
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  // Fetch cache stats from edge server
  const fetchCacheStats = async () => {
    try {
      // Skip if offline
      if (isOffline) {
        return;
      }
      
      // Get cache stats
      const response = await edgeWebSocketService.getCacheStats();
      
      if (response && response.success) {
        setCacheStats(response.stats);
        setOfflineReadiness(response.offlineReadiness || 0);
        setOfflineRisk(response.offlineRisk || 0);
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    }
  };
  
  // Prepare for offline mode
  const prepareForOffline = async () => {
    try {
      // Skip if offline
      if (isOffline) {
        return false;
      }
      
      // Prepare for offline mode
      const response = await edgeWebSocketService.prepareForOffline({
        forcePrepare: true
      });
      
      if (response && response.success) {
        // Update cache stats
        setCacheStats(response.stats);
        setOfflineReadiness(response.offlineReadiness || 0);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error preparing for offline mode:', error);
      return false;
    }
  };
  
  // Check connection
  const checkConnection = async () => {
    try {
      // Try to connect to edge server
      const connected = await edgeWebSocketService.connect();
      
      if (connected) {
        // Get cache stats
        await fetchCacheStats();
      }
      
      return connected;
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    }
  };
  
  // Context value
  const value = {
    isOffline,
    offlineReadiness,
    offlineRisk,
    cacheStats,
    prepareForOffline,
    checkConnection
  };
  
  // Don't render children until initialized
  if (!isInitialized) {
    return null;
  }
  
  return (
    <OfflineIndicatorContext.Provider value={value}>
      {children}
    </OfflineIndicatorContext.Provider>
  );
};

// Hook for using the offline indicator context
export const useOfflineIndicator = () => {
  return useContext(OfflineIndicatorContext);
};

export default OfflineIndicatorContext;
