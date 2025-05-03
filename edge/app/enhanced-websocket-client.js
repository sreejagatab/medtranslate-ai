/**
 * Enhanced WebSocket Client for MedTranslate AI Edge Application
 *
 * This module provides a robust WebSocket client with reconnection handling,
 * message queuing, and heartbeat mechanism.
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class EnhancedWebSocketClient extends EventEmitter {
  /**
   * Create a new EnhancedWebSocketClient
   *
   * @param {Object} options - Configuration options
   * @param {number} options.maxReconnectAttempts - Maximum number of reconnection attempts (default: 10)
   * @param {number} options.initialReconnectDelay - Initial reconnection delay in ms (default: 1000)
   * @param {number} options.maxReconnectDelay - Maximum reconnection delay in ms (default: 30000)
   * @param {number} options.reconnectBackoffFactor - Backoff factor for reconnection delay (default: 1.5)
   * @param {number} options.heartbeatInterval - Heartbeat interval in ms (default: 30000)
   * @param {number} options.heartbeatTimeout - Heartbeat timeout in ms (default: 5000)
   * @param {boolean} options.debug - Enable debug logging (default: false)
   */
  constructor(options = {}) {
    super();

    // Configuration
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.initialReconnectDelay = options.initialReconnectDelay || 1000;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;
    this.reconnectBackoffFactor = options.reconnectBackoffFactor || 1.5;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.heartbeatTimeout = options.heartbeatTimeout || 5000;
    this.debug = options.debug || false;
    this.adaptiveReconnection = options.adaptiveReconnection !== undefined ? options.adaptiveReconnection : true;

    // State
    this.ws = null;
    this.url = null;
    this.options = null;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.recoveryTimeout = null;
    this._networkCheckInterval = null;
    this.heartbeatTimeoutId = null;
    this.heartbeatIntervalId = null;
    this._lastHeartbeatSent = null;
    this.lastHeartbeatResponse = null;
    this.messageQueue = [];

    // Connection states:
    // - 'disconnected': Not connected, no active connection
    // - 'connecting': Attempting to establish a connection
    // - 'connected': Successfully connected
    // - 'reconnecting': Connection lost, attempting to reconnect
    // - 'waiting_for_network': Network is offline, waiting for it to come back
    // - 'failed': Failed to connect after max attempts
    // - 'error': Connection error occurred
    // - 'recovery_scheduled': Scheduled recovery after cooling period
    // - 'recovery_attempt': Attempting recovery after max reconnect attempts
    this.connectionState = 'disconnected';
    this.connectionStateReason = '';
    this.connectionStateTimestamp = Date.now();
    this.forceClosed = false;
    this.networkOnline = true;
    this.lastActive = Date.now();

    // Generate a unique client ID for logging
    this.clientId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Connect to WebSocket server
   *
   * @param {string} url - WebSocket URL
   * @param {Object} options - Connection options
   * @param {Object} options.headers - WebSocket headers
   * @param {Object} options.protocols - WebSocket protocols
   * @returns {Promise<boolean>} - Connection success
   */
  connect(url, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Reset force closed flag
        this.forceClosed = false;

        // Store connection info
        this.url = url;
        this.options = options;

        // Update connection state
        this._updateConnectionState('connecting');

        this._log('Connecting to WebSocket server:', url);

        // Create WebSocket connection
        this.ws = new WebSocket(url, options.protocols || [], {
          headers: options.headers || {},
          ...options
        });

        // Set up event handlers
        this.ws.on('open', () => {
          this._log(`WebSocket connected to ${url}`);
          this.reconnectAttempts = 0;
          this._updateConnectionState('connected');

          // Start heartbeat
          this._startHeartbeat();

          // Process queued messages
          this._processMessageQueue();

          resolve(true);
        });

        this.ws.on('message', (data) => {
          this._handleMessage(data);
        });

        this.ws.on('close', (code, reason) => {
          this._log(`WebSocket disconnected: ${code} - ${reason}`);
          this._updateConnectionState('disconnected', reason);

          // Stop heartbeat
          this._stopHeartbeat();

          // Attempt to reconnect if not closed cleanly and not force closed
          if (!this.forceClosed && code !== 1000 && code !== 1001) {
            this._attemptReconnect();
          }
        });

        this.ws.on('error', (error) => {
          this._log('WebSocket error:', error, 'error');
          this._updateConnectionState('error', error.message);

          // Only reject if this is the initial connection attempt
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });
      } catch (error) {
        this._log('Error connecting to WebSocket:', error, 'error');
        this._updateConnectionState('error', error.message);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   *
   * @param {number} code - Close code (default: 1000)
   * @param {string} reason - Close reason (default: 'Normal closure')
   */
  disconnect(code = 1000, reason = 'Normal closure') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this._log(`Disconnecting WebSocket: ${code} - ${reason}`);

      // Set force closed flag to prevent reconnection
      this.forceClosed = true;

      // Stop heartbeat
      this._stopHeartbeat();

      // Clear reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Close socket
      this.ws.close(code, reason);

      // Update connection state
      this._updateConnectionState('disconnected', reason);
    }
  }

  /**
   * Send message to WebSocket server
   *
   * @param {Object|string} message - Message to send
   * @param {boolean} queueIfDisconnected - Queue message if disconnected (default: true)
   * @returns {boolean} - Send success
   */
  send(message, queueIfDisconnected = true) {
    try {
      // Convert object to string if needed
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);

      // Check if connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(messageString);
        return true;
      } else if (queueIfDisconnected) {
        // Queue message if disconnected
        this._log('WebSocket not connected, queueing message');
        this.messageQueue.push(messageString);
        return false;
      } else {
        this._log('WebSocket not connected, message not sent', null, 'warn');
        return false;
      }
    } catch (error) {
      this._log('Error sending message:', error, 'error');
      return false;
    }
  }

  /**
   * Get current connection state
   *
   * @returns {string} - Connection state
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Check if connected
   *
   * @returns {boolean} - Connected status
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Send heartbeat message
   *
   * @private
   */
  _sendHeartbeat() {
    // Don't send heartbeat if not connected
    if (!this.isConnected()) {
      this._log('Skipping heartbeat, not connected', {
        connectionState: this.connectionState
      }, 'debug');
      return;
    }

    const heartbeatTimestamp = Date.now();
    this._lastHeartbeatSent = heartbeatTimestamp;

    // Include client ID in heartbeat for better tracking
    this.send({
      type: 'heartbeat',
      timestamp: heartbeatTimestamp,
      clientId: this.clientId,
      lastResponseTime: this.lastHeartbeatResponse ? heartbeatTimestamp - this.lastHeartbeatResponse : null
    });

    this._log('Heartbeat sent', {
      timestamp: heartbeatTimestamp,
      timeSinceLastResponse: this.lastHeartbeatResponse ? heartbeatTimestamp - this.lastHeartbeatResponse : null
    }, 'debug');

    // Set timeout for heartbeat response
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
    }

    this.heartbeatTimeoutId = setTimeout(() => {
      // Check if we're still connected before taking action
      if (!this.isConnected()) {
        this._log('Heartbeat timeout ignored, already disconnected', {
          connectionState: this.connectionState
        }, 'debug');
        return;
      }

      const timeSinceLastHeartbeat = this._lastHeartbeatSent ? Date.now() - this._lastHeartbeatSent : null;

      this._log('Heartbeat timeout, reconnecting', {
        lastHeartbeatSent: this._lastHeartbeatSent,
        lastHeartbeatResponse: this.lastHeartbeatResponse,
        timeSinceLastHeartbeat,
        heartbeatTimeoutValue: this.heartbeatTimeout
      }, 'warn');

      // Update connection state
      this._updateConnectionState('reconnecting', 'Heartbeat timeout');

      // Force close and reconnect
      if (this.ws) {
        // Try one last ping before closing
        try {
          if (this.ws.readyState === WebSocket.OPEN) {
            this._log('Sending final ping before heartbeat timeout close', null, 'debug');

            // Send an urgent heartbeat
            this.send({
              type: 'heartbeat',
              timestamp: Date.now(),
              urgent: true
            }, true);

            // Give it a very short time to respond
            setTimeout(() => {
              if (this.isConnected()) {
                this.ws.close(4000, 'Heartbeat timeout');
              }
            }, 500);
          } else {
            this.ws.close(4000, 'Heartbeat timeout');
          }
        } catch (error) {
          this._log('Error sending final ping', { error: error.message }, 'error');
          this.ws.close(4000, 'Heartbeat timeout');
        }
      }
    }, this.heartbeatTimeout);
  }

  /**
   * Start heartbeat mechanism
   *
   * @private
   */
  _startHeartbeat() {
    // Clear existing intervals/timeouts
    this._stopHeartbeat();

    // Log heartbeat configuration
    this._log('Starting heartbeat mechanism', {
      interval: this.heartbeatInterval,
      timeout: this.heartbeatTimeout
    }, 'info');

    // Start heartbeat interval
    this.heartbeatIntervalId = setInterval(() => {
      this._sendHeartbeat();
    }, this.heartbeatInterval);

    // Send initial heartbeat immediately
    setTimeout(() => {
      this._sendHeartbeat();
    }, 1000); // Wait 1 second after connection before first heartbeat
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

      this._log('Heartbeat mechanism stopped', null, 'info');
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
    if (this.messageQueue.length > 0 && this.isConnected()) {
      this._log(`Processing ${this.messageQueue.length} queued messages`);

      // Process all queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        this.ws.send(message);
      }
    }
  }

  /**
   * Handle incoming message
   *
   * @param {string} data - Message data
   * @private
   */
  _handleMessage(data) {
    try {
      // Parse message if it's a string
      const message = typeof data === 'string' ? JSON.parse(data) : data;

      // Handle heartbeat response
      if (message.type === 'heartbeat_response') {
        this.lastHeartbeatResponse = Date.now();

        // Clear heartbeat timeout
        if (this.heartbeatTimeout) {
          clearTimeout(this.heartbeatTimeout);
          this.heartbeatTimeout = null;
        }

        return;
      }

      // Emit message event
      this.emit('message', message);

      // Emit type-specific event
      if (message.type) {
        this.emit(`message:${message.type}`, message);
      }
    } catch (error) {
      this._log('Error handling message:', error, 'error');
    }
  }

  /**
   * Update connection state
   *
   * @param {string} state - New connection state
   * @param {string} reason - Reason for state change
   * @private
   */
  _updateConnectionState(state, reason = '') {
    // Get previous state for logging and events
    const previousState = this.connectionState;
    const previousReason = this.connectionStateReason;
    const previousTimestamp = this.connectionStateTimestamp;
    const stateDuration = Date.now() - previousTimestamp;

    // Update state
    this.connectionState = state;
    this.connectionStateReason = reason;
    this.connectionStateTimestamp = Date.now();

    // Log state change
    this._log(`Connection state changed: ${previousState} -> ${state}`, {
      previousState,
      newState: state,
      reason,
      previousReason,
      duration: stateDuration
    }, 'info');

    // Emit state change event with additional information
    this.emit('connectionState', state, reason, {
      previousState,
      duration: stateDuration,
      timestamp: this.connectionStateTimestamp
    });

    // Emit specific state events
    this.emit(`state:${state}`, reason, {
      previousState,
      duration: stateDuration,
      timestamp: this.connectionStateTimestamp
    });
  }

  /**
   * Attempt to reconnect to WebSocket server
   *
   * @private
   */
  _attemptReconnect() {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Don't reconnect if network is offline
    if (!this.networkOnline) {
      this._log('Network is offline, not attempting to reconnect', null, 'info');
      this._updateConnectionState('waiting_for_network', 'Network is offline');

      // Set up a periodic check for network status
      if (!this._networkCheckInterval) {
        this._networkCheckInterval = setInterval(() => {
          // If network is back online, clear interval and attempt reconnect
          if (this.networkOnline) {
            this._log('Network is back online during periodic check', null, 'info');

            clearInterval(this._networkCheckInterval);
            this._networkCheckInterval = null;
            this._attemptReconnect();
          }
        }, 5000); // Check every 5 seconds
      }

      return;
    }

    // Clear network check interval if it exists
    if (this._networkCheckInterval) {
      clearInterval(this._networkCheckInterval);
      this._networkCheckInterval = null;
    }

    // Check if we've reached max reconnect attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._log('Max reconnect attempts reached', null, 'warn');
      this._updateConnectionState('failed', 'Max reconnect attempts reached');

      // Set up a recovery attempt after a longer delay
      // This gives the system a chance to recover after max attempts
      const recoveryDelay = this.maxReconnectDelay * 2;
      this._log(`Scheduling recovery attempt after cooling period (${Math.round(recoveryDelay/1000)}s)`, null, 'info');

      this._updateConnectionState('recovery_scheduled', `Cooling period before recovery (${Math.round(recoveryDelay/1000)}s)`);

      this.recoveryTimeout = setTimeout(() => {
        this._log('Executing recovery attempt after max reconnects', null, 'info');

        // Reset reconnect attempts for a fresh start
        this.reconnectAttempts = 0;
        this._updateConnectionState('recovery_attempt', 'Attempting recovery after cooling period');

        // Attempt to reconnect
        this._attemptReconnect();
      }, recoveryDelay);

      return;
    }

    // Increment reconnect attempts
    this.reconnectAttempts++;

    // Calculate backoff delay (exponential backoff with jitter)
    const delay = Math.min(
      this.initialReconnectDelay * Math.pow(this.reconnectBackoffFactor, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    const finalDelay = Math.max(100, delay + jitter);

    this._log(`Scheduling reconnection attempt in ${Math.round(finalDelay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this._updateConnectionState('reconnecting', `Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    // Set timeout for reconnect
    this.reconnectTimeout = setTimeout(() => {
      if (this.url) {
        // Check if network is still online before attempting
        if (!this.networkOnline) {
          this._log('Network went offline before reconnection attempt', null, 'info');
          this._updateConnectionState('waiting_for_network', 'Network went offline');
          return;
        }

        this._log(`Executing reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`, null, 'info');

        // Set a timeout for this specific connection attempt
        const connectionTimeout = setTimeout(() => {
          this._log('Connection attempt timed out', null, 'warn');

          // Force close the socket if it exists
          if (this.ws) {
            this.ws.close(4000, 'Connection attempt timed out');
          }

          // Schedule next reconnect attempt
          this._attemptReconnect();
        }, 10000); // 10 seconds timeout

        // Attempt to reconnect
        this.connect(this.url, this.options)
          .then(() => {
            // Clear the connection timeout
            clearTimeout(connectionTimeout);

            this._log('Reconnection successful', null, 'info');

            // Reset reconnect attempts counter after a successful connection
            // that stays stable for a period of time
            setTimeout(() => {
              if (this.isConnected()) {
                this._log('Connection stable, resetting reconnect attempts counter', null, 'info');
                this.reconnectAttempts = 0;
              }
            }, 30000); // Check after 30 seconds of stability
          })
          .catch(error => {
            // Clear the connection timeout
            clearTimeout(connectionTimeout);

            this._log('Reconnection failed:', error, 'error');

            // Check if we should try a different approach after certain failures
            if (this.reconnectAttempts % 3 === 0) {
              this._log('Trying alternative reconnection approach', null, 'info');

              // Force a new WebSocket instance on next attempt
              if (this.ws) {
                this.ws.close(4000, 'Forcing new connection instance');
                this.ws = null;
              }
            }

            // Schedule next reconnect attempt
            this._attemptReconnect();
          });
      }
    }, finalDelay);
  }

  /**
   * Set network status
   *
   * @param {boolean} online - Network online status
   */
  setNetworkStatus(online) {
    // Update network status
    this.networkOnline = online;

    this._log(`Network status changed: ${this.networkOnline ? 'online' : 'offline'}`);

    // If network is back online and we're not connected, attempt to reconnect
    if (this.networkOnline && this.connectionState !== 'connected' && !this.forceClosed) {
      this._log('Network is back online, attempting to reconnect');
      this._attemptReconnect();
    }
  }

  /**
   * Log message
   *
   * @param {string} message - Message to log
   * @param {*} data - Additional data to log
   * @param {string} level - Log level (log, warn, error)
   * @private
   */
  _log(message, data = null, level = 'log') {
    if (this.debug) {
      const logPrefix = '[EnhancedWebSocketClient]';

      if (data) {
        console[level](`${logPrefix} ${message}`, data);
      } else {
        console[level](`${logPrefix} ${message}`);
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Disconnect
    this.disconnect(1000, 'Client destroyed');

    // Clear all timeouts and intervals
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
      this.recoveryTimeout = null;
    }

    if (this._networkCheckInterval) {
      clearInterval(this._networkCheckInterval);
      this._networkCheckInterval = null;
    }

    this._stopHeartbeat();

    // Clear in-memory message queue
    if (this.messageQueue.length > 0) {
      this._log(`Clearing ${this.messageQueue.length} queued messages`, null, 'info');
      this.messageQueue = [];
    }

    // Update connection state
    this._updateConnectionState('destroyed', 'Client destroyed');

    // Log destruction
    this._log('WebSocket client destroyed', null, 'info');

    // Remove all listeners
    this.removeAllListeners();

    // Clear references
    this.ws = null;
    this.url = null;
    this.options = null;
  }
}

module.exports = EnhancedWebSocketClient;
