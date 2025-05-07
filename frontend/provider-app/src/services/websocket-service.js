/**
 * WebSocket Service for MedTranslate AI Provider Application
 *
 * This service handles real-time communication with the backend
 * WebSocket server for translation sessions.
 *
 * It uses the EnhancedWebSocketService for improved connection handling.
 */

import { API_ENDPOINTS } from '../config/api';
import EnhancedWebSocketService from '../../shared/services/enhanced-websocket-service';

class WebSocketService {
  constructor() {
    // Create enhanced WebSocket service
    this.enhancedWs = new EnhancedWebSocketService({
      maxReconnectAttempts: 10,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      reconnectBackoffFactor: 1.5,
      heartbeatInterval: 30000,
      heartbeatTimeout: 5000,
      debug: true,
      adaptiveReconnection: true,
      adaptiveHeartbeat: true
    });

    this.sessionId = null;
    this.token = null;
    this.offlineMessageHandlers = [];

    // Set up heartbeat response handler
    this.enhancedWs.onMessage('heartbeat', (message) => {
      this.enhancedWs.send({
        type: 'heartbeat_response',
        timestamp: Date.now(),
        originalTimestamp: message.timestamp
      });
    });

    // Set up connection state handlers for offline mode
    this.enhancedWs.onConnectionState({
      onMaxReconnectAttemptsReached: (data) => {
        console.warn('Max reconnect attempts reached:', data);
        this._notifyOfflineMessageHandlers('maxReconnectAttemptsReached', data);
      },

      onWaitingForNetwork: (data) => {
        console.warn('Waiting for network:', data);
        this._notifyOfflineMessageHandlers('waitingForNetwork', data);
      },

      onNetworkStatusChange: (data) => {
        console.log('Network status changed:', data.online ? 'online' : 'offline');
        this._notifyOfflineMessageHandlers('networkStatusChange', data);
      },

      onOfflineMessageSent: (data) => {
        console.log('Offline message sent:', data);
        this._notifyOfflineMessageHandlers('offlineMessageSent', data);
      },

      onOfflineMessageFailed: (data) => {
        console.warn('Offline message failed:', data);
        this._notifyOfflineMessageHandlers('offlineMessageFailed', data);
      },

      onOfflineQueueProcessed: (data) => {
        console.log('Offline queue processed:', data);
        this._notifyOfflineMessageHandlers('offlineQueueProcessed', data);
      },

      onOfflineQueueError: (data) => {
        console.error('Offline queue error:', data);
        this._notifyOfflineMessageHandlers('offlineQueueError', data);
      }
    });
  }

  /**
   * Notify offline message handlers
   *
   * @private
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _notifyOfflineMessageHandlers(event, data) {
    this.offlineMessageHandlers.forEach(handler => {
      try {
        if (typeof handler === 'function') {
          handler(event, data);
        } else if (handler && typeof handler[event] === 'function') {
          handler[event](data);
        }
      } catch (error) {
        console.error(`Error in offline message handler for event ${event}:`, error);
      }
    });
  }

  /**
   * Connect to WebSocket server for a session
   *
   * @param {string} sessionId - Session ID
   * @param {string} token - Authentication token
   * @returns {Promise<boolean>} - Connection success
   */
  connect(sessionId, token) {
    // Store session info
    this.sessionId = sessionId;
    this.token = token;

    // Create WebSocket URL
    const wsUrl = API_ENDPOINTS.WEBSOCKET(sessionId, token);

    // Connect using enhanced WebSocket service
    return this.enhancedWs.connect(wsUrl, { sessionId, token });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.enhancedWs.disconnect(1000, 'Client disconnected');
    this.sessionId = null;
    this.token = null;
  }

  /**
   * Send a message to the WebSocket server
   *
   * @param {Object} message - Message to send
   * @returns {boolean} - Send success
   */
  sendMessage(message) {
    return this.enhancedWs.send(message, true);
  }

  /**
   * Register a message handler
   *
   * @param {string} messageType - Message type to handle
   * @param {Function} handler - Handler function
   */
  onMessage(messageType, handler) {
    this.enhancedWs.onMessage(messageType, handler);
  }

  /**
   * Unregister a message handler
   *
   * @param {string} messageType - Message type
   * @param {Function} handler - Handler function
   */
  offMessage(messageType, handler) {
    this.enhancedWs.offMessage(messageType, handler);
  }

  /**
   * Register a connection state handler
   *
   * @param {Function} handler - Handler function
   */
  onConnectionState(handler) {
    this.enhancedWs.onConnectionState(handler);
  }

  /**
   * Unregister a connection state handler
   *
   * @param {Function} handler - Handler function
   */
  offConnectionState(handler) {
    this.enhancedWs.offConnectionState(handler);
  }

  /**
   * Get current connection state
   *
   * @returns {string} - Connection state
   */
  getConnectionState() {
    return this.enhancedWs.getConnectionState();
  }

  /**
   * Check if connected
   *
   * @returns {boolean} - Connected status
   */
  isConnected() {
    return this.enhancedWs.isConnected();
  }

  /**
   * Register an offline message handler
   *
   * @param {Function|Object} handler - Handler function or object with event methods
   */
  onOfflineMessage(handler) {
    if (handler && !this.offlineMessageHandlers.includes(handler)) {
      this.offlineMessageHandlers.push(handler);
    }
  }

  /**
   * Unregister an offline message handler
   *
   * @param {Function|Object} handler - Handler function or object
   */
  offOfflineMessage(handler) {
    const index = this.offlineMessageHandlers.indexOf(handler);
    if (index !== -1) {
      this.offlineMessageHandlers.splice(index, 1);
    }
  }

  /**
   * Get offline queue statistics
   *
   * @returns {Promise<Object>} - Queue statistics
   */
  async getOfflineQueueStats() {
    return this.enhancedWs.getOfflineQueueStats();
  }

  /**
   * Get network quality information
   *
   * @returns {Object} - Network quality information
   */
  getNetworkQualityInfo() {
    return this.enhancedWs.getNetworkQualityInfo();
  }

  /**
   * Manually trigger network quality measurement
   *
   * @returns {Promise<Object>} - Network quality measurement
   */
  async measureNetworkQuality() {
    return this.enhancedWs.measureNetworkQuality();
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.offlineMessageHandlers = [];
    this.enhancedWs.destroy();
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
