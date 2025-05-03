/**
 * Cloud Connection Service for MedTranslate AI Edge Application
 * 
 * This module provides a robust WebSocket connection to the cloud backend
 * for real-time communication, with reconnection handling, heartbeat mechanism,
 * and message queuing.
 */

const EnhancedWebSocketClient = require('./enhanced-websocket-client');
const EventEmitter = require('events');
const axios = require('axios');
const crypto = require('crypto');

// Configuration
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://api.medtranslate.ai';
const CLOUD_WS_URL = process.env.CLOUD_WS_URL || 'wss://api.medtranslate.ai/ws';
const DEVICE_ID = process.env.DEVICE_ID || `medtranslate-edge-${Math.random().toString(36).substring(2, 10)}`;
const AUTH_TOKEN_REFRESH_INTERVAL = 3600000; // 1 hour

class CloudConnectionService extends EventEmitter {
  constructor() {
    super();
    
    // State
    this.isInitialized = false;
    this.isConnected = false;
    this.authToken = null;
    this.tokenExpiry = 0;
    this.tokenRefreshTimeout = null;
    
    // Create enhanced WebSocket client
    this.wsClient = new EnhancedWebSocketClient({
      maxReconnectAttempts: 10,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      reconnectBackoffFactor: 1.5,
      heartbeatInterval: 30000,
      heartbeatTimeout: 5000,
      debug: true
    });
    
    // Set up event handlers
    this.wsClient.on('connectionState', (state, reason) => {
      this.isConnected = state === 'connected';
      this.emit('connectionState', state, reason);
      
      if (state === 'connected') {
        this.emit('connected');
      } else if (state === 'disconnected') {
        this.emit('disconnected', reason);
      }
    });
    
    this.wsClient.on('message', (message) => {
      this.emit('message', message);
    });
    
    // Set up message type handlers
    this.wsClient.on('message:translation_request', (message) => {
      this.emit('translation_request', message);
    });
    
    this.wsClient.on('message:model_update', (message) => {
      this.emit('model_update', message);
    });
    
    this.wsClient.on('message:config_update', (message) => {
      this.emit('config_update', message);
    });
    
    this.wsClient.on('message:command', (message) => {
      this.emit('command', message);
    });
  }
  
  /**
   * Initialize the cloud connection service
   * 
   * @returns {Promise<Object>} - Initialization result
   */
  async initialize() {
    try {
      console.log('Initializing cloud connection service...');
      
      // Get authentication token
      await this.refreshAuthToken();
      
      // Set up token refresh interval
      this.setupTokenRefresh();
      
      this.isInitialized = true;
      console.log('Cloud connection service initialized successfully');
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error initializing cloud connection service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Connect to the cloud WebSocket server
   * 
   * @returns {Promise<boolean>} - Connection success
   */
  async connect() {
    try {
      // Ensure we have a valid token
      if (!this.authToken || Date.now() > this.tokenExpiry) {
        await this.refreshAuthToken();
      }
      
      // Connect to WebSocket server
      const url = `${CLOUD_WS_URL}?token=${this.authToken}&deviceId=${DEVICE_ID}`;
      
      await this.wsClient.connect(url, {
        headers: {
          'X-Device-ID': DEVICE_ID
        }
      });
      
      console.log('Connected to cloud WebSocket server');
      return true;
    } catch (error) {
      console.error('Error connecting to cloud WebSocket server:', error);
      return false;
    }
  }
  
  /**
   * Disconnect from the cloud WebSocket server
   */
  disconnect() {
    this.wsClient.disconnect(1000, 'Client disconnected');
  }
  
  /**
   * Send a message to the cloud WebSocket server
   * 
   * @param {Object} message - Message to send
   * @param {boolean} queueIfDisconnected - Queue message if disconnected
   * @returns {boolean} - Send success
   */
  send(message, queueIfDisconnected = true) {
    // Add device ID to message
    const messageWithDeviceId = {
      ...message,
      deviceId: DEVICE_ID,
      timestamp: Date.now()
    };
    
    return this.wsClient.send(messageWithDeviceId, queueIfDisconnected);
  }
  
  /**
   * Send a translation result to the cloud
   * 
   * @param {string} requestId - Request ID
   * @param {Object} result - Translation result
   * @returns {boolean} - Send success
   */
  sendTranslationResult(requestId, result) {
    return this.send({
      type: 'translation_result',
      requestId,
      result
    });
  }
  
  /**
   * Send a status update to the cloud
   * 
   * @param {Object} status - Status information
   * @returns {boolean} - Send success
   */
  sendStatusUpdate(status) {
    return this.send({
      type: 'status_update',
      status: {
        ...status,
        deviceId: DEVICE_ID,
        timestamp: Date.now()
      }
    });
  }
  
  /**
   * Send an error report to the cloud
   * 
   * @param {string} errorType - Error type
   * @param {string} errorMessage - Error message
   * @param {Object} details - Error details
   * @returns {boolean} - Send success
   */
  sendErrorReport(errorType, errorMessage, details = {}) {
    return this.send({
      type: 'error_report',
      error: {
        type: errorType,
        message: errorMessage,
        details,
        deviceId: DEVICE_ID,
        timestamp: Date.now()
      }
    });
  }
  
  /**
   * Test the connection to the cloud API
   * 
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const response = await axios.get(`${CLOUD_API_URL}/health`, {
        timeout: 5000,
        headers: {
          'X-Device-ID': DEVICE_ID
        }
      });
      
      return {
        connected: response.status === 200,
        status: response.data.status,
        serverTime: response.headers['date']
      };
    } catch (error) {
      console.error('Cloud connection test failed:', error.message);
      return {
        connected: false,
        error: error.message
      };
    }
  }
  
  /**
   * Refresh the authentication token
   * 
   * @returns {Promise<string>} - New authentication token
   */
  async refreshAuthToken() {
    try {
      console.log('Refreshing authentication token...');
      
      // Generate a device signature for authentication
      const timestamp = Date.now();
      const signature = crypto.createHash('sha256')
        .update(`${DEVICE_ID}:${timestamp}`)
        .digest('hex');
      
      // Request token from server
      const response = await axios.post(`${CLOUD_API_URL}/auth/device`, {
        deviceId: DEVICE_ID,
        timestamp,
        signature
      }, {
        timeout: 10000,
        headers: {
          'X-Device-ID': DEVICE_ID,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data.token) {
        this.authToken = response.data.token;
        this.tokenExpiry = Date.now() + (response.data.expiresIn || 3600) * 1000;
        
        console.log('Authentication token refreshed successfully');
        return this.authToken;
      } else {
        throw new Error('Invalid response from authentication server');
      }
    } catch (error) {
      console.error('Error refreshing authentication token:', error.message);
      throw error;
    }
  }
  
  /**
   * Set up token refresh interval
   */
  setupTokenRefresh() {
    // Clear existing timeout
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }
    
    // Calculate time until refresh (80% of expiry time)
    const refreshTime = Math.max(
      1000, // Minimum 1 second
      this.tokenExpiry - Date.now() - AUTH_TOKEN_REFRESH_INTERVAL * 0.2
    );
    
    // Set up timeout
    this.tokenRefreshTimeout = setTimeout(async () => {
      try {
        await this.refreshAuthToken();
        this.setupTokenRefresh();
      } catch (error) {
        console.error('Error in token refresh cycle:', error);
        
        // Retry after a short delay
        setTimeout(() => this.setupTokenRefresh(), 60000);
      }
    }, refreshTime);
  }
  
  /**
   * Set network status
   * 
   * @param {boolean} online - Network online status
   */
  setNetworkStatus(online) {
    this.wsClient.setNetworkStatus(online);
  }
  
  /**
   * Get connection state
   * 
   * @returns {string} - Connection state
   */
  getConnectionState() {
    return this.wsClient.getConnectionState();
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Disconnect WebSocket
    this.disconnect();
    
    // Clear token refresh timeout
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
    
    // Clean up WebSocket client
    this.wsClient.destroy();
    
    // Remove all listeners
    this.removeAllListeners();
  }
}

// Create singleton instance
const cloudConnection = new CloudConnectionService();

module.exports = cloudConnection;
