/**
 * WebSocket Service for MedTranslate AI Patient Application
 * 
 * This service handles real-time communication with the backend
 * WebSocket server for translation sessions.
 */

import { API_ENDPOINTS } from '../config/api';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.sessionId = null;
    this.token = null;
    this.messageHandlers = new Map();
    this.connectionHandlers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
  }

  /**
   * Connect to WebSocket server for a session
   * 
   * @param {string} sessionId - Session ID
   * @param {string} token - Authentication token
   * @returns {Promise<boolean>} - Connection success
   */
  connect(sessionId, token) {
    return new Promise((resolve, reject) => {
      try {
        // Store session info
        this.sessionId = sessionId;
        this.token = token;
        
        // Create WebSocket URL
        const wsUrl = API_ENDPOINTS.WEBSOCKET(sessionId, token);
        
        // Create WebSocket connection
        this.socket = new WebSocket(wsUrl);
        
        // Set up event handlers
        this.socket.onopen = () => {
          console.log(`WebSocket connected to session ${sessionId}`);
          this.reconnectAttempts = 0;
          this._notifyConnectionHandlers('connected');
          resolve(true);
        };
        
        this.socket.onmessage = (event) => {
          this._handleMessage(event.data);
        };
        
        this.socket.onclose = (event) => {
          console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
          this._notifyConnectionHandlers('disconnected', event.reason);
          
          // Attempt to reconnect if not closed cleanly
          if (event.code !== 1000 && event.code !== 1001) {
            this._attemptReconnect();
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this._notifyConnectionHandlers('error', error.message);
          reject(error);
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(1000, 'Client disconnected');
    }
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.socket = null;
    this.sessionId = null;
    this.token = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Send a message to the WebSocket server
   * 
   * @param {Object} message - Message to send
   * @returns {boolean} - Send success
   */
  sendMessage(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Register a message handler
   * 
   * @param {string} messageType - Message type to handle
   * @param {Function} handler - Handler function
   */
  onMessage(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    this.messageHandlers.get(messageType).add(handler);
  }

  /**
   * Unregister a message handler
   * 
   * @param {string} messageType - Message type
   * @param {Function} handler - Handler function
   */
  offMessage(messageType, handler) {
    if (this.messageHandlers.has(messageType)) {
      this.messageHandlers.get(messageType).delete(handler);
    }
  }

  /**
   * Register a connection state handler
   * 
   * @param {Function} handler - Handler function
   */
  onConnectionState(handler) {
    this.connectionHandlers.add(handler);
  }

  /**
   * Unregister a connection state handler
   * 
   * @param {Function} handler - Handler function
   */
  offConnectionState(handler) {
    this.connectionHandlers.delete(handler);
  }

  /**
   * Handle incoming WebSocket message
   * 
   * @param {string} data - Message data
   */
  _handleMessage(data) {
    try {
      const message = JSON.parse(data);
      const messageType = message.type;
      
      // Call handlers for this message type
      if (this.messageHandlers.has(messageType)) {
        for (const handler of this.messageHandlers.get(messageType)) {
          handler(message);
        }
      }
      
      // Call handlers for all messages
      if (this.messageHandlers.has('*')) {
        for (const handler of this.messageHandlers.get('*')) {
          handler(message);
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Notify connection state handlers
   * 
   * @param {string} state - Connection state
   * @param {string} reason - Reason for state change
   */
  _notifyConnectionHandlers(state, reason = '') {
    for (const handler of this.connectionHandlers) {
      handler(state, reason);
    }
  }

  /**
   * Attempt to reconnect to WebSocket server
   */
  _attemptReconnect() {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Check if we've reached max reconnect attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      this._notifyConnectionHandlers('failed', 'Max reconnect attempts reached');
      return;
    }
    
    // Increment reconnect attempts
    this.reconnectAttempts++;
    
    // Calculate backoff delay (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this._notifyConnectionHandlers('reconnecting', `Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    // Set timeout for reconnect
    this.reconnectTimeout = setTimeout(() => {
      if (this.sessionId && this.token) {
        this.connect(this.sessionId, this.token).catch(error => {
          console.error('Reconnect failed:', error);
          this._attemptReconnect();
        });
      }
    }, delay);
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
