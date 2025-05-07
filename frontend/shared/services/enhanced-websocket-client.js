/**
 * Enhanced WebSocket Client for MedTranslate AI
 *
 * This client provides improved WebSocket connection handling with:
 * - Robust reconnection logic with exponential backoff
 * - Network status monitoring
 * - Message queuing during disconnections
 * - Session continuity across network changes
 * - Comprehensive error handling
 */

class EnhancedWebSocketClient {
  /**
   * Create a new enhanced WebSocket client
   *
   * @param {Object} options - Configuration options
   * @param {number} options.maxReconnectAttempts - Maximum number of reconnection attempts (default: 10)
   * @param {number} options.initialReconnectDelay - Initial reconnection delay in ms (default: 1000)
   * @param {number} options.maxReconnectDelay - Maximum reconnection delay in ms (default: 30000)
   * @param {number} options.reconnectBackoffFactor - Reconnection delay backoff factor (default: 1.5)
   * @param {number} options.heartbeatInterval - Heartbeat interval in ms (default: 30000)
   * @param {number} options.heartbeatTimeout - Heartbeat timeout in ms (default: 5000)
   * @param {boolean} options.debug - Enable debug logging (default: false)
   */
  constructor(options = {}) {
    // Configuration
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.initialReconnectDelay = options.initialReconnectDelay || 1000;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;
    this.reconnectBackoffFactor = options.reconnectBackoffFactor || 1.5;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.heartbeatTimeout = options.heartbeatTimeout || 5000;
    this.debug = options.debug || false;

    // State
    this.ws = null;
    this.url = null;
    this.sessionId = null;
    this.token = null;
    this.clientId = this._generateClientId();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.heartbeatIntervalId = null;
    this.heartbeatTimeoutId = null;
    this.lastHeartbeatResponse = 0;
    this.messageQueue = [];
    this.messageHandlers = new Map();
    this.connectionHandlers = [];
    this.networkOnline = true;

    // Bind methods
    this._handleNetworkStatusChange = this._handleNetworkStatusChange.bind(this);

    // Set up network status listeners
    this._setupNetworkListeners();
  }

  /**
   * Connect to WebSocket server
   *
   * @param {string} url - WebSocket URL
   * @param {Object} options - Connection options
   * @param {string} options.sessionId - Session ID
   * @param {string} options.token - Authentication token
   * @returns {Promise<boolean>} - Connection success
   */
  connect(url, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Store connection parameters
        this.url = url;
        this.sessionId = options.sessionId;
        this.token = options.token;

        // Add reconnection flag if reconnecting
        const reconnect = this.reconnectAttempts > 0;

        // Build WebSocket URL with parameters
        const wsUrl = `${url}?token=${this.token}&clientId=${this.clientId}${reconnect ? '&reconnect=true' : ''}`;

        this._log(`Connecting to ${wsUrl}`);

        // Create WebSocket
        this.ws = new WebSocket(wsUrl);

        // Set up event handlers
        this.ws.onopen = () => {
          this._log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Start heartbeat
          this._startHeartbeat();

          // Process queued messages
          this._processMessageQueue();

          // Notify connection handlers
          this._notifyConnectionHandlers('connect');

          resolve(true);
        };

        this.ws.onclose = (event) => {
          this._log(`WebSocket closed: ${event.code} - ${event.reason}`);
          this.isConnected = false;

          // Stop heartbeat
          this._stopHeartbeat();

          // Attempt to reconnect if not closed cleanly
          if (event.code !== 1000 && event.code !== 1001) {
            this._attemptReconnect();
          }

          // Notify connection handlers
          this._notifyConnectionHandlers('disconnect', { code: event.code, reason: event.reason });
        };

        this.ws.onerror = (error) => {
          this._log(`WebSocket error: ${error.message || 'Unknown error'}`, 'error');

          // Notify connection handlers
          this._notifyConnectionHandlers('error', error);

          // Reject promise if this is the initial connection
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Handle heartbeat
            if (message.type === 'heartbeat') {
              this._handleHeartbeat(message);
              return;
            }

            // Handle other messages
            this._handleMessage(message);
          } catch (error) {
            this._log(`Error parsing message: ${error.message}`, 'error');
          }
        };
      } catch (error) {
        this._log(`Connection error: ${error.message}`, 'error');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   *
   * @param {number} code - Close code
   * @param {string} reason - Close reason
   */
  disconnect(code = 1000, reason = 'Client disconnected') {
    if (this.ws && this.isConnected) {
      this.ws.close(code, reason);
    }

    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Stop heartbeat
    this._stopHeartbeat();

    this.isConnected = false;
  }

  /**
   * Send message to server
   *
   * @param {Object} message - Message to send
   * @returns {boolean} - Send success
   */
  send(message) {
    if (!this.isConnected) {
      // Queue message for later
      this._log(`WebSocket not connected, queueing message: ${message.type}`);
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this._log(`Error sending message: ${error.message}`, 'error');

      // Queue message for later
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Add message handler
   *
   * @param {string} messageType - Message type to handle
   * @param {Function} handler - Message handler function
   */
  addMessageHandler(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }

    this.messageHandlers.get(messageType).push(handler);
  }

  /**
   * Remove message handler
   *
   * @param {string} messageType - Message type
   * @param {Function} handler - Handler function to remove
   */
  removeMessageHandler(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      return;
    }

    const handlers = this.messageHandlers.get(messageType);
    const index = handlers.indexOf(handler);

    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Add connection handler
   *
   * @param {string} id - Handler ID
   * @param {Object} handlers - Connection event handlers
   * @param {Function} handlers.onConnect - Connect handler
   * @param {Function} handlers.onDisconnect - Disconnect handler
   * @param {Function} handlers.onError - Error handler
   * @param {Function} handlers.onReconnect - Reconnect handler
   * @param {Function} handlers.onMaxReconnectAttemptsReached - Max reconnect attempts reached handler
   */
  addConnectionHandler(id, handlers) {
    this.connectionHandlers.push({
      id,
      ...handlers
    });
  }

  /**
   * Remove connection handler
   *
   * @param {string} id - Handler ID
   */
  removeConnectionHandler(id) {
    const index = this.connectionHandlers.findIndex(handler => handler.id === id);

    if (index !== -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  /**
   * Generate a unique client ID
   *
   * @private
   * @returns {string} - Client ID
   */
  _generateClientId() {
    return 'client_' + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Set up network status listeners
   *
   * @private
   */
  _setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._handleNetworkStatusChange);
      window.addEventListener('offline', this._handleNetworkStatusChange);
    }
  }

  /**
   * Handle network status change
   *
   * @private
   */
  _handleNetworkStatusChange() {
    const wasOnline = this.networkOnline;
    this.networkOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    this._log(`Network status changed: ${this.networkOnline ? 'online' : 'offline'}`);

    // If we're coming back online and not connected, attempt to reconnect
    if (this.networkOnline && !wasOnline && !this.isConnected) {
      this._attemptReconnect();
    }
  }

  /**
   * Handle message from server
   *
   * @private
   * @param {Object} message - Message from server
   */
  _handleMessage(message) {
    // Call handlers for this message type
    if (this.messageHandlers.has(message.type)) {
      const handlers = this.messageHandlers.get(message.type);

      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          this._log(`Error in message handler for ${message.type}: ${error.message}`, 'error');
        }
      }
    }

    // Call handlers for all messages
    if (this.messageHandlers.has('*')) {
      const handlers = this.messageHandlers.get('*');

      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          this._log(`Error in wildcard message handler: ${error.message}`, 'error');
        }
      }
    }
  }

  /**
   * Handle heartbeat message
   *
   * @private
   * @param {Object} message - Heartbeat message
   */
  _handleHeartbeat(message) {
    // Reset heartbeat timeout
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }

    // Send heartbeat response
    this.send({
      type: 'heartbeat_response',
      timestamp: Date.now(),
      originalTimestamp: message.timestamp
    });

    this.lastHeartbeatResponse = Date.now();
  }

  /**
   * Start heartbeat mechanism
   *
   * @private
   */
  _startHeartbeat() {
    // Clear existing heartbeat
    this._stopHeartbeat();

    // Start heartbeat interval
    this.heartbeatIntervalId = setInterval(() => {
      if (this.isConnected) {
        // Check if we've received a heartbeat response recently
        const timeSinceLastResponse = Date.now() - this.lastHeartbeatResponse;

        if (this.lastHeartbeatResponse > 0 && timeSinceLastResponse > this.heartbeatInterval * 2) {
          this._log(`No heartbeat response for ${timeSinceLastResponse}ms, reconnecting...`, 'warn');

          // Close connection and reconnect
          if (this.ws) {
            this.ws.close(4000, 'Heartbeat timeout');
          }

          return;
        }
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   *
   * @private
   */
  _stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }

    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
  }

  /**
   * Process message queue
   *
   * @private
   */
  _processMessageQueue() {
    if (this.messageQueue.length === 0 || !this.isConnected) {
      return;
    }

    this._log(`Processing ${this.messageQueue.length} queued messages`);

    // Process all queued messages
    const queueCopy = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of queueCopy) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        this._log(`Error sending queued message: ${error.message}`, 'error');

        // Put message back in queue
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  /**
   * Attempt to reconnect to server
   *
   * @private
   */
  _attemptReconnect() {
    // Don't attempt to reconnect if we're offline
    if (!this.networkOnline) {
      this._log('Not attempting to reconnect because network is offline');
      return;
    }

    // Don't attempt to reconnect if we're already connected
    if (this.isConnected) {
      this._log('Not attempting to reconnect because already connected');
      return;
    }

    // Don't attempt to reconnect if we've reached the maximum number of attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._log(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);

      // Notify connection handlers
      this._notifyConnectionHandlers('maxReconnectAttemptsReached');

      return;
    }

    // Clear existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Calculate reconnect delay with exponential backoff
    const delay = Math.min(
      this.initialReconnectDelay * Math.pow(this.reconnectBackoffFactor, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this._log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    // Schedule reconnect
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;

      // Notify connection handlers
      this._notifyConnectionHandlers('reconnect', { attempt: this.reconnectAttempts });

      // Attempt to connect
      this.connect(this.url, {
        sessionId: this.sessionId,
        token: this.token
      }).catch(error => {
        this._log(`Reconnect attempt failed: ${error.message}`, 'error');

        // Schedule next reconnect attempt
        this._attemptReconnect();
      });
    }, delay);
  }

  /**
   * Notify connection handlers
   *
   * @private
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _notifyConnectionHandlers(event, data = {}) {
    for (const handler of this.connectionHandlers) {
      switch (event) {
        case 'connect':
          if (typeof handler.onConnect === 'function') {
            handler.onConnect();
          }
          break;

        case 'disconnect':
          if (typeof handler.onDisconnect === 'function') {
            handler.onDisconnect(data);
          }
          break;

        case 'error':
          if (typeof handler.onError === 'function') {
            handler.onError(data);
          }
          break;

        case 'reconnect':
          if (typeof handler.onReconnect === 'function') {
            handler.onReconnect(data);
          }
          break;

        case 'maxReconnectAttemptsReached':
          if (typeof handler.onMaxReconnectAttemptsReached === 'function') {
            handler.onMaxReconnectAttemptsReached();
          }
          break;
      }
    }
  }

  /**
   * Log message
   *
   * @private
   * @param {string} message - Message to log
   * @param {string} level - Log level
   */
  _log(message, level = 'info') {
    if (!this.debug) {
      return;
    }

    const prefix = `[EnhancedWebSocketClient]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;

      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;

      default:
        console.log(`${prefix} ${message}`);
        break;
    }
  }
}

export default EnhancedWebSocketClient;
