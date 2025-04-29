/**
 * Network Service for MedTranslate AI Patient App
 * 
 * Handles API calls and WebSocket connections
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API_URL, WS_URL, STORAGE_KEYS } from '../utils/config';

/**
 * API client for making HTTP requests
 */
export class ApiClient {
  /**
   * Make an API request
   * @param {string} endpoint API endpoint
   * @param {Object} options Request options
   * @returns {Promise<Object>} Response data
   */
  static async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add auth token if available
    const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('No internet connection');
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }
  
  /**
   * Join a session with a code
   * @param {string} sessionCode Session code
   * @param {string} language User language
   * @returns {Promise<Object>} Session data
   */
  static async joinSession(sessionCode, language) {
    return this.request('/sessions/join', {
      method: 'POST',
      body: JSON.stringify({
        sessionCode,
        language
      })
    });
  }
  
  /**
   * End the current session
   * @param {string} sessionId Session ID
   * @returns {Promise<Object>} Response data
   */
  static async endSession(sessionId) {
    return this.request(`/sessions/${sessionId}/end`, {
      method: 'POST'
    });
  }
}

/**
 * WebSocket client for real-time communication
 */
export class WebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.messageHandlers = new Map();
    this.connectionHandlers = new Map();
  }
  
  /**
   * Connect to the WebSocket server
   * @param {string} sessionId Session ID
   * @returns {Promise<boolean>} Connection success
   */
  async connect(sessionId) {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      
      if (!token || !sessionId) {
        throw new Error('No session token or ID found');
      }
      
      // Close existing connection if any
      if (this.ws) {
        this.ws.close();
      }
      
      // Create new WebSocket connection
      this.ws = new WebSocket(`${WS_URL}?token=${token}&sessionId=${sessionId}`);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Notify connection handlers
        this.connectionHandlers.forEach(handler => {
          if (typeof handler.onConnect === 'function') {
            handler.onConnect();
          }
        });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Notify message handlers
          this.messageHandlers.forEach(handler => {
            if (typeof handler === 'function') {
              handler(data);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        
        // Notify connection handlers
        this.connectionHandlers.forEach(handler => {
          if (typeof handler.onError === 'function') {
            handler.onError(error);
          }
        });
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        
        // Notify connection handlers
        this.connectionHandlers.forEach(handler => {
          if (typeof handler.onDisconnect === 'function') {
            handler.onDisconnect();
          }
        });
        
        // Try to reconnect
        this.attemptReconnect(sessionId);
      };
      
      return true;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      return false;
    }
  }
  
  /**
   * Attempt to reconnect to the WebSocket server
   * @param {string} sessionId Session ID
   * @private
   */
  attemptReconnect(sessionId) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect(sessionId);
      }, delay);
    } else {
      console.log('Max reconnect attempts reached');
      
      // Notify connection handlers
      this.connectionHandlers.forEach(handler => {
        if (typeof handler.onMaxReconnectAttemptsReached === 'function') {
          handler.onMaxReconnectAttemptsReached();
        }
      });
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
  }
  
  /**
   * Send a message through the WebSocket
   * @param {Object} message Message to send
   * @returns {boolean} Send success
   */
  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  /**
   * Add a message handler
   * @param {string} id Handler ID
   * @param {Function} handler Message handler function
   */
  addMessageHandler(id, handler) {
    this.messageHandlers.set(id, handler);
  }
  
  /**
   * Remove a message handler
   * @param {string} id Handler ID
   */
  removeMessageHandler(id) {
    this.messageHandlers.delete(id);
  }
  
  /**
   * Add a connection handler
   * @param {string} id Handler ID
   * @param {Object} handlers Connection event handlers
   */
  addConnectionHandler(id, handlers) {
    this.connectionHandlers.set(id, handlers);
  }
  
  /**
   * Remove a connection handler
   * @param {string} id Handler ID
   */
  removeConnectionHandler(id) {
    this.connectionHandlers.delete(id);
  }
  
  /**
   * Check if the WebSocket is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}
