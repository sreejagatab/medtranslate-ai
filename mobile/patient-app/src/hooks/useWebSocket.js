/**
 * useWebSocket Hook for MedTranslate AI Mobile App
 * 
 * This hook provides a WebSocket connection to the MedTranslate AI backend.
 * It handles connection management, reconnection, and message handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WS_URL } from '../utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/config';

export const useWebSocket = (channel) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState(null);
  
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = 5;
  const reconnectInterval = 5000; // 5 seconds
  
  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      // Get session token from AsyncStorage
      const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      
      // Create WebSocket connection
      const ws = new WebSocket(`${WS_URL}/${channel}?token=${token || ''}`);
      
      // Set up event handlers
      ws.onopen = () => {
        console.log(`WebSocket connected to ${channel}`);
        setIsConnected(true);
        setReconnectAttempts(0);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        setLastMessage(event);
      };
      
      ws.onerror = (event) => {
        console.error(`WebSocket error on ${channel}:`, event);
        setError(`WebSocket error: ${event.message || 'Unknown error'}`);
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket disconnected from ${channel}:`, event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000) {
          reconnect();
        }
      };
      
      setSocket(ws);
      
      return () => {
        if (ws) {
          ws.close();
        }
      };
    } catch (error) {
      console.error(`Error connecting to WebSocket on ${channel}:`, error);
      setError(`Error connecting to WebSocket: ${error.message}`);
      reconnect();
    }
  }, [channel]);
  
  // Reconnect to WebSocket
  const reconnect = useCallback(() => {
    if (reconnectAttempts < maxReconnectAttempts) {
      console.log(`Attempting to reconnect to WebSocket on ${channel} (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
      
      // Clear any existing timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Set timeout for reconnection
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempts((prev) => prev + 1);
        connect();
      }, reconnectInterval);
    } else {
      console.error(`Maximum reconnect attempts reached for WebSocket on ${channel}`);
      setError('Maximum reconnect attempts reached. Please try again later.');
    }
  }, [reconnectAttempts, channel, connect]);
  
  // Send message to WebSocket
  const sendMessage = useCallback((message) => {
    if (socket && isConnected) {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }
    return false;
  }, [socket, isConnected]);
  
  // Connect on mount
  useEffect(() => {
    const cleanup = connect();
    
    // Cleanup on unmount
    return () => {
      if (cleanup) {
        cleanup();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
  
  return {
    socket,
    isConnected,
    lastMessage,
    error,
    reconnectAttempts,
    sendMessage
  };
};
