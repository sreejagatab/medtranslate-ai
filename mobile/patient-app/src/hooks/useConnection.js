/**
 * useConnection Hook for MedTranslate AI Mobile App
 * 
 * This hook provides information about the device's network connection status.
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

const useConnection = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [connectionQuality, setConnectionQuality] = useState(1);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [lastConnectedTime, setLastConnectedTime] = useState(new Date());
  const [offlineDuration, setOfflineDuration] = useState(0);

  // Update connection status
  const updateConnectionStatus = useCallback((state) => {
    setIsConnected(state.isConnected);
    setConnectionType(state.type);
    setIsInternetReachable(state.isInternetReachable);
    
    // Update connection quality based on connection type
    if (!state.isConnected) {
      setConnectionQuality(0);
    } else if (state.type === 'wifi') {
      setConnectionQuality(1);
    } else if (state.type === 'cellular') {
      // Estimate quality based on cellular generation
      if (state.details?.cellularGeneration === '5g') {
        setConnectionQuality(0.9);
      } else if (state.details?.cellularGeneration === '4g') {
        setConnectionQuality(0.8);
      } else if (state.details?.cellularGeneration === '3g') {
        setConnectionQuality(0.6);
      } else if (state.details?.cellularGeneration === '2g') {
        setConnectionQuality(0.3);
      } else {
        setConnectionQuality(0.5);
      }
    } else {
      setConnectionQuality(0.5);
    }
    
    // Update offline duration
    if (state.isConnected) {
      setLastConnectedTime(new Date());
      setOfflineDuration(0);
    } else {
      const now = new Date();
      const duration = (now - lastConnectedTime) / 1000; // in seconds
      setOfflineDuration(duration);
    }
  }, [lastConnectedTime]);

  // Set up NetInfo listener
  useEffect(() => {
    // Get initial connection status
    NetInfo.fetch().then(updateConnectionStatus);
    
    // Subscribe to connection changes
    const unsubscribe = NetInfo.addEventListener(updateConnectionStatus);
    
    // Set up interval to update offline duration
    let intervalId;
    if (!isConnected) {
      intervalId = setInterval(() => {
        const now = new Date();
        const duration = (now - lastConnectedTime) / 1000; // in seconds
        setOfflineDuration(duration);
      }, 1000);
    }
    
    // Clean up
    return () => {
      unsubscribe();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [updateConnectionStatus, isConnected, lastConnectedTime]);

  return {
    isConnected,
    connectionType,
    connectionQuality,
    isInternetReachable,
    lastConnectedTime,
    offlineDuration
  };
};

export default useConnection;
