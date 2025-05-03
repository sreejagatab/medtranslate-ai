/**
 * Edge WebSocket Service for MedTranslate AI Patient App
 * 
 * This service handles WebSocket communication with the edge server,
 * including getting cache statistics and offline readiness information.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/config';

// Default edge endpoint
const DEFAULT_EDGE_ENDPOINT = 'http://192.168.1.100:3000';

class EdgeWebSocketService {
  constructor() {
    this.websocket = null;
    this.isConnected = false;
    this.messageHandlers = {};
    this.connectionHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000; // 3 seconds
    this.reconnectTimeoutId = null;
    this.requestMap = new Map(); // Map to track requests and their callbacks
    this.edgeEndpoint = DEFAULT_EDGE_ENDPOINT;
  }

  /**
   * Initialize the WebSocket service
   * 
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Load saved edge endpoint
      const savedEndpoint = await AsyncStorage.getItem(STORAGE_KEYS.EDGE_DEVICE_IP);
      if (savedEndpoint) {
        this.edgeEndpoint = savedEndpoint;
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing EdgeWebSocketService:', error);
      return false;
    }
  }

  /**
   * Connect to the WebSocket server
   * 
   * @returns {Promise<boolean>} Connection success
   */
  async connect() {
    try {
      // Close existing connection if any
      if (this.websocket) {
        this.websocket.close();
      }

      // Convert HTTP endpoint to WebSocket endpoint
      const wsEndpoint = this.edgeEndpoint.replace('http://', 'ws://').replace('https://', 'wss://');
      
      // Create new WebSocket connection
      this.websocket = new WebSocket(`${wsEndpoint}`);
      
      // Set up event handlers
      this.websocket.onopen = this.handleOpen.bind(this);
      this.websocket.onclose = this.handleClose.bind(this);
      this.websocket.onerror = this.handleError.bind(this);
      this.websocket.onmessage = this.handleMessage.bind(this);
      
      // Wait for connection to be established
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000); // 5 second timeout
        
        this.connectionHandlers.push({
          onConnect: () => {
            clearTimeout(timeout);
            resolve(true);
          },
          onError: () => {
            clearTimeout(timeout);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      return false;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.websocket) {
      this.websocket.close();
    }
    
    // Clear reconnect timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Send a request to the WebSocket server
   * 
   * @param {Object} request - Request object
   * @returns {Promise<Object>} - Response object
   */
  sendRequest(request) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }
      
      // Generate a request ID if not provided
      const requestId = request.requestId || `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const requestWithId = { ...request, requestId };
      
      // Store the callback in the request map
      this.requestMap.set(requestId, { resolve, reject, timestamp: Date.now() });
      
      // Send the request
      this.websocket.send(JSON.stringify(requestWithId));
      
      // Set a timeout for the request
      setTimeout(() => {
        if (this.requestMap.has(requestId)) {
          this.requestMap.delete(requestId);
          reject(new Error('Request timed out'));
        }
      }, 10000); // 10 second timeout
    });
  }

  /**
   * Get cache statistics from the edge server
   * 
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats() {
    try {
      // Ensure connection
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('Failed to connect to edge server');
        }
      }
      
      // Send request
      const response = await this.sendRequest({
        type: 'get_cache_stats'
      });
      
      return response;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      throw error;
    }
  }

  /**
   * Prepare for offline mode
   * 
   * @param {Object} options - Options for offline preparation
   * @returns {Promise<Object>} Preparation result
   */
  async prepareForOffline(options = {}) {
    try {
      // Ensure connection
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('Failed to connect to edge server');
        }
      }
      
      // Send request
      const response = await this.sendRequest({
        type: 'prepare_offline',
        options
      });
      
      return response;
    } catch (error) {
      console.error('Error preparing for offline mode:', error);
      throw error;
    }
  }

  /**
   * Handle WebSocket open event
   */
  handleOpen() {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Notify connection handlers
    this.connectionHandlers.forEach(handler => {
      if (handler.onConnect) {
        handler.onConnect();
      }
    });
  }

  /**
   * Handle WebSocket close event
   * 
   * @param {Event} event - Close event
   */
  handleClose(event) {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnected = false;
    
    // Notify connection handlers
    this.connectionHandlers.forEach(handler => {
      if (handler.onDisconnect) {
        handler.onDisconnect(event);
      }
    });
    
    // Attempt to reconnect
    this.attemptReconnect();
  }

  /**
   * Handle WebSocket error event
   * 
   * @param {Event} event - Error event
   */
  handleError(event) {
    console.error('WebSocket error:', event);
    
    // Notify connection handlers
    this.connectionHandlers.forEach(handler => {
      if (handler.onError) {
        handler.onError(event);
      }
    });
  }

  /**
   * Handle WebSocket message event
   * 
   * @param {MessageEvent} event - Message event
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Check if this is a response to a request
      if (data.requestId && this.requestMap.has(data.requestId)) {
        const { resolve, reject } = this.requestMap.get(data.requestId);
        this.requestMap.delete(data.requestId);
        
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data);
        }
        
        return;
      }
      
      // Handle different message types
      switch (data.type) {
        case 'cache_stats':
          this.handleCacheStats(data);
          break;
          
        case 'network_status':
          this.handleNetworkStatus(data);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Handle cache stats message
   * 
   * @param {Object} data - Cache stats data
   */
  handleCacheStats(data) {
    // Notify message handlers
    if (this.messageHandlers.cache_stats) {
      this.messageHandlers.cache_stats.forEach(handler => {
        handler(data);
      });
    }
  }

  /**
   * Handle network status message
   * 
   * @param {Object} data - Network status data
   */
  handleNetworkStatus(data) {
    // Notify message handlers
    if (this.messageHandlers.network_status) {
      this.messageHandlers.network_status.forEach(handler => {
        handler(data);
      });
    }
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  attemptReconnect() {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }
    
    // Check if we've reached the maximum number of reconnect attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached');
      
      // Notify connection handlers
      this.connectionHandlers.forEach(handler => {
        if (handler.onMaxReconnectAttemptsReached) {
          handler.onMaxReconnectAttemptsReached();
        }
      });
      
      return;
    }
    
    // Increment reconnect attempts
    this.reconnectAttempts++;
    
    // Set timeout for reconnect
    this.reconnectTimeoutId = setTimeout(() => {
      console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Add a message handler
   * 
   * @param {string} type - Message type
   * @param {Function} handler - Message handler
   */
  addMessageHandler(type, handler) {
    if (!this.messageHandlers[type]) {
      this.messageHandlers[type] = [];
    }
    
    this.messageHandlers[type].push(handler);
  }

  /**
   * Remove a message handler
   * 
   * @param {string} type - Message type
   * @param {Function} handler - Message handler
   */
  removeMessageHandler(type, handler) {
    if (this.messageHandlers[type]) {
      this.messageHandlers[type] = this.messageHandlers[type].filter(h => h !== handler);
    }
  }

  /**
   * Add a connection handler
   * 
   * @param {Object} handler - Connection handler
   */
  addConnectionHandler(handler) {
    this.connectionHandlers.push(handler);
  }

  /**
   * Remove a connection handler
   * 
   * @param {Object} handler - Connection handler
   */
  removeConnectionHandler(handler) {
    this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
  }

  /**
   * Check if connected to the WebSocket server
   * 
   * @returns {boolean} Connection status
   */
  isConnectedToServer() {
    return this.isConnected;
  }

  /**
   * Set the edge endpoint
   * 
   * @param {string} endpoint - Edge endpoint
   */
  setEdgeEndpoint(endpoint) {
    this.edgeEndpoint = endpoint;
  }
}

// Create and export singleton instance
const edgeWebSocketService = new EdgeWebSocketService();
export default edgeWebSocketService;
