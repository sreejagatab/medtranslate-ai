/**
 * useOfflineIndicator Hook for MedTranslate AI Mobile App
 * 
 * This hook provides a way to show an offline indicator when the device is offline.
 */

import { useState, useEffect, useCallback } from 'react';
import useConnection from './useConnection';

const useOfflineIndicator = () => {
  const { isConnected, connectionType, offlineDuration } = useConnection();
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState('You are offline');
  const [offlineSeverity, setOfflineSeverity] = useState('warning');

  // Update offline indicator
  useEffect(() => {
    if (!isConnected) {
      setShowOfflineIndicator(true);
      
      // Update message based on offline duration
      if (offlineDuration > 3600) {
        // More than 1 hour
        const hours = Math.floor(offlineDuration / 3600);
        setOfflineMessage(`Offline for ${hours} hour${hours > 1 ? 's' : ''}`);
        setOfflineSeverity('error');
      } else if (offlineDuration > 60) {
        // More than 1 minute
        const minutes = Math.floor(offlineDuration / 60);
        setOfflineMessage(`Offline for ${minutes} minute${minutes > 1 ? 's' : ''}`);
        setOfflineSeverity('warning');
      } else {
        // Less than 1 minute
        setOfflineMessage('You are offline');
        setOfflineSeverity('warning');
      }
    } else {
      // When back online, show a brief "back online" message, then hide
      if (showOfflineIndicator) {
        setOfflineMessage('Back online');
        setOfflineSeverity('success');
        
        // Hide after 3 seconds
        const timeout = setTimeout(() => {
          setShowOfflineIndicator(false);
        }, 3000);
        
        return () => clearTimeout(timeout);
      } else {
        setShowOfflineIndicator(false);
      }
    }
  }, [isConnected, offlineDuration, showOfflineIndicator]);

  // Force show/hide the indicator
  const showIndicator = useCallback(() => {
    setShowOfflineIndicator(true);
  }, []);
  
  const hideIndicator = useCallback(() => {
    setShowOfflineIndicator(false);
  }, []);

  // Set a custom offline message
  const setCustomOfflineMessage = useCallback((message, severity = 'warning') => {
    setOfflineMessage(message);
    setOfflineSeverity(severity);
  }, []);

  return {
    showOfflineIndicator,
    offlineMessage,
    offlineSeverity,
    isOffline: !isConnected,
    connectionType,
    offlineDuration,
    showIndicator,
    hideIndicator,
    setCustomOfflineMessage
  };
};

export default useOfflineIndicator;
