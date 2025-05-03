/**
 * WebSocket Service for MedTranslate AI Patient Application
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
      debug: true
    });

    this.sessionId = null;
    this.token = null;

    // Set up heartbeat response handler
    this.enhancedWs.onMessage('heartbeat', (message) => {
      this.enhancedWs.send({
        type: 'heartbeat_response',
        timestamp: Date.now(),
        originalTimestamp: message.timestamp
      });
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
   * Clean up resources
   */
  destroy() {
    this.enhancedWs.destroy();
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
