/**
 * Connection Context for MedTranslate AI Patient App
 * 
 * This context provides information about the device's network connection status
 * and manages the online/offline state of the application.
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import NetInfo from '@react-native-community/netinfo';

// Create context
const ConnectionContext = createContext({
  isConnected: true,
  connectionType: 'unknown',
  isInternetReachable: true,
  lastOnline: null
});

// Connection provider component
export const ConnectionProvider = ({ children }) => {
  const [connectionState, setConnectionState] = useState({
    isConnected: true,
    connectionType: 'unknown',
    isInternetReachable: true,
    lastOnline: Date.now()
  });

  // Subscribe to network state updates
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const newState = {
        isConnected: state.isConnected,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable
      };
      
      // Update last online timestamp if connected
      if (state.isConnected && state.isInternetReachable) {
        newState.lastOnline = Date.now();
      } else {
        newState.lastOnline = connectionState.lastOnline;
      }
      
      setConnectionState(newState);
    });

    // Initial connection check
    NetInfo.fetch().then(state => {
      const initialState = {
        isConnected: state.isConnected,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable,
        lastOnline: state.isConnected ? Date.now() : null
      };
      
      setConnectionState(initialState);
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <ConnectionContext.Provider value={connectionState}>
      {children}
    </ConnectionContext.Provider>
  );
};

// Custom hook to use the connection context
export const useConnection = () => useContext(ConnectionContext);

export default ConnectionContext;
