import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WS_URL } from '../config';

/**
 * Custom hook for WebSocket connection
 * 
 * @returns {Object} WebSocket connection state and methods
 */
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const { token } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!token) return;
    
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Create new WebSocket connection
    const ws = new WebSocket(`${WS_URL}/admin?token=${token}`);
    wsRef.current = ws;
    
    // Connection opened
    ws.addEventListener('open', () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      setReconnectAttempt(0);
    });
    
    // Connection closed
    ws.addEventListener('close', (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      setIsConnected(false);
      
      // Attempt to reconnect with exponential backoff
      if (reconnectAttempt < 10) {
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        console.log(`Reconnecting in ${timeout}ms (attempt ${reconnectAttempt + 1})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
          connect();
        }, timeout);
      }
    });
    
    // Connection error
    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Message received
    ws.addEventListener('message', (event) => {
      setLastMessage(event);
    });
  }, [token, reconnectAttempt]);
  
  // Send message
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // Connect on mount and token change
  useEffect(() => {
    if (token) {
      connect();
    }
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token, connect]);
  
  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnectAttempt
  };
};
