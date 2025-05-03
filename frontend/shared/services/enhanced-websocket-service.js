/**
 * Enhanced WebSocket Service for MedTranslate AI
 *
 * This service provides improved WebSocket connection handling with:
 * - Robust reconnection logic with adaptive exponential backoff
 * - Advanced network quality detection and monitoring
 * - Network status monitoring
 * - Heartbeat mechanism with adaptive intervals
 * - Message queuing during disconnections with persistent storage
 * - Comprehensive logging and metrics collection
 */

import offlineMessageQueue from './offline-message-queue';
import networkQualityService from './network-quality-service';

class EnhancedWebSocketService {
  /**
   * Create a new EnhancedWebSocketService
   *
   * @param {Object} options - Configuration options
   * @param {number} options.maxReconnectAttempts - Maximum number of reconnection attempts (default: based on network quality)
   * @param {number} options.initialReconnectDelay - Initial reconnection delay in ms (default: based on network quality)
   * @param {number} options.maxReconnectDelay - Maximum reconnection delay in ms (default: based on network quality)
   * @param {number} options.reconnectBackoffFactor - Backoff factor for reconnection delay (default: based on network quality)
   * @param {number} options.heartbeatInterval - Heartbeat interval in ms (default: based on network quality)
   * @param {number} options.heartbeatTimeout - Heartbeat timeout in ms (default: based on network quality)
   * @param {boolean} options.debug - Enable debug logging (default: false)
   * @param {boolean} options.adaptiveReconnection - Enable adaptive reconnection based on network quality (default: true)
   * @param {boolean} options.adaptiveHeartbeat - Enable adaptive heartbeat based on network quality (default: true)
   */
  constructor(options = {}) {
    // Get initial network quality
    const initialNetworkQuality = networkQualityService.getNetworkQuality();
    const recommendedStrategy = networkQualityService.getReconnectionStrategy();

    // Configuration with adaptive defaults
    this.maxReconnectAttempts = options.maxReconnectAttempts || recommendedStrategy.maxReconnectAttempts;
    this.initialReconnectDelay = options.initialReconnectDelay || recommendedStrategy.initialReconnectDelay;
    this.maxReconnectDelay = options.maxReconnectDelay || recommendedStrategy.maxReconnectDelay;
    this.reconnectBackoffFactor = options.reconnectBackoffFactor || recommendedStrategy.reconnectBackoffFactor;
    this.heartbeatInterval = options.heartbeatInterval || recommendedStrategy.heartbeatInterval;
    this.heartbeatTimeout = options.heartbeatTimeout || recommendedStrategy.heartbeatTimeout;
    this.debug = options.debug || false;
    this.adaptiveReconnection = options.adaptiveReconnection !== undefined ? options.adaptiveReconnection : true;
    this.adaptiveHeartbeat = options.adaptiveHeartbeat !== undefined ? options.adaptiveHeartbeat : true;

    // State
    this.socket = null;
    this.url = null;
    this.sessionId = null;
    this.token = null;
    this.messageHandlers = new Map();
    this.connectionHandlers = new Set();
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.recoveryTimeout = null;
    this._networkCheckInterval = null;
    this.heartbeatTimeout = null;
    this.heartbeatInterval = null;
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
    // - 'token_expired': Authentication token expired
    // - 'token_refresh': Refreshing authentication token
    this.connectionState = 'disconnected';
    this.connectionStateReason = '';
    this.connectionStateTimestamp = Date.now();
    this.forceClosed = false;
    this.networkOnline = true;

    // Initialize offline message queue
    this.offlineQueueInitialized = false;
    this._initOfflineQueue();

    // Network quality monitoring
    this.networkQuality = initialNetworkQuality;
    this._handleNetworkQualityChange = this._handleNetworkQualityChange.bind(this);

    // Start network quality monitoring
    networkQualityService.addListener(this._handleNetworkQualityChange);
    networkQualityService.startPeriodicMeasurements(60000); // Check every minute

    // Bind methods
    this._handleNetworkStatusChange = this._handleNetworkStatusChange.bind(this);

    // Add network status event listeners
    this._setupNetworkListeners();
  }

  /**
   * Connect to WebSocket server
   *
   * @param {string} url - WebSocket URL
   * @param {Object} options - Connection options
   * @param {string} options.sessionId - Session ID
   * @param {string} options.token - Authentication token
   * @param {Function} options.tokenRefreshCallback - Callback to refresh token when expired
   * @returns {Promise<boolean>} - Connection success
   */
  connect(url, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Reset force closed flag
        this.forceClosed = false;

        // Store connection info
        this.url = url;
        this.sessionId = options.sessionId;
        this.token = options.token;
        this.tokenRefreshCallback = options.tokenRefreshCallback;

        // Reset connection ID for new connection
        this._connectionId = null;

        // Update connection state
        this._updateConnectionState('connecting');

        this._log('Connecting to WebSocket server', {
          url,
          sessionId: this.sessionId,
          hasToken: !!this.token,
          hasRefreshCallback: !!this.tokenRefreshCallback,
          networkQuality: this.networkQuality
        }, 'info', 'connection');

        // Create WebSocket connection with appropriate options
        const wsOptions = {};

        // Add protocols if specified
        if (options.protocols) {
          wsOptions.protocols = options.protocols;
        }

        // Create WebSocket connection
        this.socket = new WebSocket(url, wsOptions.protocols || []);

        // Capture connection start time for latency metrics
        this._connectionStartTime = Date.now();

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            this._log('Connection attempt timed out', {
              url,
              sessionId: this.sessionId,
              readyState: this.socket ? this.socket.readyState : 'no socket'
            }, 'error', 'connection');

            this._recordMetric('connection_timeout', 1);
            this._updateConnectionState('error', 'Connection timeout');

            // Close socket if it exists but isn't open
            if (this.socket) {
              try {
                this.socket.close(4000, 'Connection timeout');
              } catch (error) {
                // Ignore errors when closing an already problematic socket
              }
            }

            // Reject the promise if this is the initial connection attempt
            if (this.reconnectAttempts === 0) {
              reject(new Error('Connection timeout'));
            } else {
              // Otherwise attempt to reconnect
              this._attemptReconnect();
            }
          }
        }, 15000); // 15 second connection timeout

        // Set up event handlers
        this.socket.onopen = () => {
          // Clear connection timeout
          clearTimeout(connectionTimeout);

          const connectionTime = Date.now() - this._connectionStartTime;
          this._log(`WebSocket connected to ${url}`, {
            connectionTime,
            reconnectAttempts: this.reconnectAttempts,
            sessionId: this.sessionId,
            networkQuality: this.networkQuality
          }, 'info', 'connection');

          this.reconnectAttempts = 0;
          this._updateConnectionState('connected');

          // Record connection success
          this._recordMetric('connection_success', 1, {
            connectionTime,
            networkQuality: this.networkQuality
          });
          this._recordMetric('connection_time', connectionTime);

          // Start heartbeat
          this._startHeartbeat();

          // Process queued messages
          this._processMessageQueue();

          resolve(true);
        };

        this.socket.onmessage = (event) => {
          // Update last active timestamp
          this.lastActive = Date.now();

          // Log message receipt with size information
          const messageSize = event.data ? event.data.length : 0;
          this._log('WebSocket message received', {
            size: messageSize,
            type: 'raw'
          }, 'debug', 'message');

          // Record message received metric
          this._recordMetric('message_received', 1);
          this._recordMetric('message_size_received', messageSize);

          this._handleMessage(event.data);
        };

        this.socket.onclose = (event) => {
          // Clear connection timeout if it exists
          clearTimeout(connectionTimeout);

          this._log(`WebSocket disconnected`, {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            reconnectAttempts: this.reconnectAttempts,
            connectionDuration: this._getConnectionDuration(),
            networkQuality: this.networkQuality
          }, 'info', 'connection');

          // Check for authentication errors (codes 4001-4004 are auth-related)
          const isAuthError = event.code >= 4001 && event.code <= 4004;

          if (isAuthError && this.tokenRefreshCallback) {
            this._log('Authentication error, attempting token refresh', {
              code: event.code,
              reason: event.reason
            }, 'warn', 'connection');

            this._updateConnectionState('token_expired', 'Authentication token expired');
            this._recordMetric('token_expired', 1);

            // Attempt to refresh token
            this._refreshToken()
              .then(success => {
                if (success) {
                  this._log('Token refreshed successfully, reconnecting', null, 'info', 'connection');
                  this._updateConnectionState('token_refresh', 'Token refreshed, reconnecting');
                  this._recordMetric('token_refresh_success', 1);

                  // Reset reconnect attempts for a fresh start
                  this.reconnectAttempts = 0;

                  // Attempt to reconnect with new token
                  this._attemptReconnect();
                } else {
                  this._log('Token refresh failed', null, 'error', 'connection');
                  this._updateConnectionState('failed', 'Token refresh failed');
                  this._recordMetric('token_refresh_failure', 1);
                }
              })
              .catch(error => {
                this._log('Error refreshing token', { error: error.message }, 'error', 'connection');
                this._updateConnectionState('failed', 'Token refresh error');
                this._recordMetric('token_refresh_error', 1);
              });

            return;
          }

          this._updateConnectionState('disconnected', event.reason);

          // Record disconnection
          this._recordMetric('disconnection', 1, {
            code: event.code,
            wasClean: event.wasClean,
            networkQuality: this.networkQuality
          });

          // Stop heartbeat
          this._stopHeartbeat();

          // Attempt to reconnect if not closed cleanly and not force closed
          if (!this.forceClosed && event.code !== 1000 && event.code !== 1001) {
            this._attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          // Clear connection timeout if it exists
          clearTimeout(connectionTimeout);

          this._log('WebSocket error', {
            message: error.message || 'Unknown error',
            type: error.type || 'unknown',
            url: this.url,
            sessionId: this.sessionId,
            networkQuality: this.networkQuality
          }, 'error', 'connection');

          this._updateConnectionState('error', error.message || 'Connection error');

          // Record connection error
          this._recordMetric('connection_error', 1, {
            networkQuality: this.networkQuality
          });

          // Only reject if this is the initial connection attempt
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };
      } catch (error) {
        this._log('Error connecting to WebSocket:', {
          error: error.message,
          stack: error.stack,
          url: url
        }, 'error', 'connection');

        this._updateConnectionState('error', error.message);
        this._recordMetric('connection_setup_error', 1);

        reject(error);
      }
    });
  }

  /**
   * Refresh authentication token
   *
   * @private
   * @returns {Promise<boolean>} - Success indicator
   */
  async _refreshToken() {
    if (!this.tokenRefreshCallback) {
      this._log('No token refresh callback provided', null, 'warn', 'connection');
      return false;
    }

    try {
      this._log('Attempting to refresh token', {
        sessionId: this.sessionId
      }, 'info', 'connection');

      // Call the token refresh callback
      const newToken = await this.tokenRefreshCallback();

      if (!newToken) {
        this._log('Token refresh callback returned empty token', null, 'error', 'connection');
        return false;
      }

      // Update token
      this.token = newToken;

      this._log('Token refreshed successfully', {
        sessionId: this.sessionId
      }, 'info', 'connection');

      return true;
    } catch (error) {
      this._log('Error refreshing token', {
        error: error.message,
        stack: error.stack
      }, 'error', 'connection');

      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   *
   * @param {number} code - Close code (default: 1000)
   * @param {string} reason - Close reason (default: 'Normal closure')
   * @param {boolean} clearOfflineQueue - Whether to clear the offline queue (default: false)
   */
  disconnect(code = 1000, reason = 'Normal closure', clearOfflineQueue = false) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this._log(`Disconnecting WebSocket: ${code} - ${reason}`, {
        sessionId: this.sessionId,
        clearOfflineQueue
      }, 'info', 'connection');

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
      this.socket.close(code, reason);

      // Update connection state
      this._updateConnectionState('disconnected', reason);

      // Clear offline queue if requested
      if (clearOfflineQueue && this.offlineQueueInitialized && this.sessionId) {
        this._log('Clearing offline queue for session', {
          sessionId: this.sessionId
        }, 'info', 'queue');

        offlineMessageQueue.clearSession(this.sessionId)
          .then(success => {
            if (success) {
              this._log('Offline queue cleared successfully', {
                sessionId: this.sessionId
              }, 'info', 'queue');

              this._recordMetric('offline_queue_cleared', 1);
            } else {
              this._log('Failed to clear offline queue', {
                sessionId: this.sessionId
              }, 'warn', 'queue');
            }
          })
          .catch(error => {
            this._log('Error clearing offline queue', {
              error: error.message,
              sessionId: this.sessionId
            }, 'error', 'queue');
          });
      }
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
      // Generate message ID if not present
      if (typeof message === 'object' && !message.id) {
        message.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      }

      // Convert object to string if needed
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      const messageSize = messageString.length;
      const messageType = typeof message === 'object' ? (message.type || 'unknown') : 'raw';

      // Check if connected
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Log before sending
        this._log('Sending WebSocket message', {
          type: messageType,
          id: typeof message === 'object' ? message.id : null,
          size: messageSize
        }, 'debug', 'message');

        // Send message
        this.socket.send(messageString);

        // Record metrics
        this._recordMetric('message_sent', 1);
        this._recordMetric('message_size_sent', messageSize);
        this._recordMetric(`message_type_sent_${messageType}`, 1);

        return true;
      } else if (queueIfDisconnected) {
        // Queue message if disconnected
        this._log('WebSocket not connected, queueing message', {
          type: messageType,
          id: typeof message === 'object' ? message.id : null,
          size: messageSize,
          queueLength: this.messageQueue.length
        }, 'info', 'queue');

        // Add to in-memory queue
        this.messageQueue.push(messageString);

        // Add to persistent offline queue if available
        if (this.offlineQueueInitialized && this.sessionId) {
          // Determine message priority (higher for important messages)
          let priority = 1; // Default priority

          if (typeof message === 'object') {
            // Higher priority for certain message types
            if (message.type === 'translation_request' || message.type === 'medical_data') {
              priority = 3; // High priority
            } else if (message.type === 'status_update' || message.type === 'user_action') {
              priority = 2; // Medium priority
            }
          }

          // Store in offline queue
          offlineMessageQueue.addMessage(messageString, this.sessionId, priority)
            .then(success => {
              if (success) {
                this._log('Message added to persistent offline queue', {
                  type: messageType,
                  id: typeof message === 'object' ? message.id : null,
                  priority
                }, 'debug', 'queue');

                this._recordMetric('message_persisted', 1);
              } else {
                this._log('Failed to add message to persistent offline queue', {
                  type: messageType,
                  id: typeof message === 'object' ? message.id : null
                }, 'warn', 'queue');
              }
            })
            .catch(error => {
              this._log('Error adding message to persistent offline queue', {
                error: error.message,
                type: messageType,
                id: typeof message === 'object' ? message.id : null
              }, 'error', 'queue');
            });
        }

        // Record metrics
        this._recordMetric('message_queued', 1);
        this._recordMetric('queue_size', this.messageQueue.length);

        return false;
      } else {
        this._log('WebSocket not connected, message not sent', {
          type: messageType,
          id: typeof message === 'object' ? message.id : null,
          size: messageSize
        }, 'warn', 'message');

        // Record metrics
        this._recordMetric('message_dropped', 1);

        return false;
      }
    } catch (error) {
      this._log('Error sending message', {
        error: error.message,
        message: typeof message === 'object' ? JSON.stringify(message) : message
      }, 'error', 'message');

      // Record error metric
      this._recordMetric('message_send_error', 1);

      return false;
    }
  }

  /**
   * Register message handler
   *
   * @param {string} messageType - Message type to handle
   * @param {Function} handler - Message handler function
   */
  onMessage(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }

    this.messageHandlers.get(messageType).add(handler);
  }

  /**
   * Unregister message handler
   *
   * @param {string} messageType - Message type
   * @param {Function} handler - Message handler function
   */
  offMessage(messageType, handler) {
    if (this.messageHandlers.has(messageType)) {
      this.messageHandlers.get(messageType).delete(handler);

      // Remove empty handler sets
      if (this.messageHandlers.get(messageType).size === 0) {
        this.messageHandlers.delete(messageType);
      }
    }
  }

  /**
   * Register connection state handler
   *
   * @param {Function} handler - Connection state handler function
   */
  onConnectionState(handler) {
    this.connectionHandlers.add(handler);

    // Call handler with current state
    handler(this.connectionState);
  }

  /**
   * Unregister connection state handler
   *
   * @param {Function} handler - Connection state handler function
   */
  offConnectionState(handler) {
    this.connectionHandlers.delete(handler);
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
    return this.socket && this.socket.readyState === WebSocket.OPEN;
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
      }, 'debug', 'heartbeat');
      return;
    }

    const heartbeatTimestamp = Date.now();
    this._lastHeartbeatSent = heartbeatTimestamp;

    // Include connection ID and session ID in heartbeat for better tracking
    this.send({
      type: 'heartbeat',
      timestamp: heartbeatTimestamp,
      connectionId: this._getConnectionId(),
      sessionId: this.sessionId || 'none',
      lastResponseTime: this.lastHeartbeatResponse ? heartbeatTimestamp - this.lastHeartbeatResponse : null
    });

    this._log('Heartbeat sent', {
      timestamp: heartbeatTimestamp,
      timeSinceLastResponse: this.lastHeartbeatResponse ? heartbeatTimestamp - this.lastHeartbeatResponse : null
    }, 'debug', 'heartbeat');

    this._recordMetric('heartbeat_sent', 1);

    // Set timeout for heartbeat response
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }

    this.heartbeatTimeout = setTimeout(() => {
      // Check if we're still connected before taking action
      if (!this.isConnected()) {
        this._log('Heartbeat timeout ignored, already disconnected', {
          connectionState: this.connectionState
        }, 'debug', 'heartbeat');
        return;
      }

      const timeSinceLastHeartbeat = this._lastHeartbeatSent ? Date.now() - this._lastHeartbeatSent : null;

      this._log('Heartbeat timeout, reconnecting', {
        lastHeartbeatSent: this._lastHeartbeatSent,
        lastHeartbeatResponse: this.lastHeartbeatResponse,
        timeSinceLastHeartbeat,
        heartbeatTimeoutValue: this.heartbeatTimeout,
        networkQuality: this.networkQuality
      }, 'warn', 'heartbeat');

      // Record heartbeat timeout metric
      this._recordMetric('heartbeat_timeout', 1, {
        timeSinceLastHeartbeat,
        networkQuality: this.networkQuality
      });

      // Update connection state
      this._updateConnectionState('reconnecting', 'Heartbeat timeout');

      // Force close and reconnect
      if (this.socket) {
        // Try one last ping before closing
        try {
          if (this.socket.readyState === WebSocket.OPEN) {
            this._log('Sending final ping before heartbeat timeout close', null, 'debug', 'heartbeat');

            // Use native WebSocket ping if available (browser support varies)
            if (typeof this.socket.ping === 'function') {
              this.socket.ping();
            } else {
              // Otherwise send an urgent heartbeat
              this.send({
                type: 'heartbeat',
                timestamp: Date.now(),
                urgent: true
              }, true);
            }

            // Give it a very short time to respond
            setTimeout(() => {
              if (this.isConnected()) {
                this.socket.close(4000, 'Heartbeat timeout');
              }
            }, 500);
          } else {
            this.socket.close(4000, 'Heartbeat timeout');
          }
        } catch (error) {
          this._log('Error sending final ping', { error: error.message }, 'error', 'heartbeat');
          this.socket.close(4000, 'Heartbeat timeout');
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
      timeout: this.heartbeatTimeout,
      networkQuality: this.networkQuality
    }, 'info', 'heartbeat');

    // Start heartbeat interval
    this.heartbeatIntervalId = setInterval(() => {
      this._sendHeartbeat();
    }, this.heartbeatInterval);

    // Record metric
    this._recordMetric('heartbeat_started', 1, {
      interval: this.heartbeatInterval,
      timeout: this.heartbeatTimeout
    });

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

      this._log('Heartbeat mechanism stopped', null, 'info', 'heartbeat');
      this._recordMetric('heartbeat_stopped', 1);
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Adapt heartbeat parameters based on network conditions
   *
   * @private
   */
  _adaptHeartbeat() {
    // Get recommended strategy for current network quality
    const recommendedStrategy = networkQualityService.getReconnectionStrategy();

    // Check if heartbeat parameters need to be updated
    const heartbeatIntervalChanged = this.heartbeatInterval !== recommendedStrategy.heartbeatInterval;
    const heartbeatTimeoutChanged = this.heartbeatTimeout !== recommendedStrategy.heartbeatTimeout;

    if (heartbeatIntervalChanged || heartbeatTimeoutChanged) {
      this._log('Adapting heartbeat parameters', {
        networkQuality: this.networkQuality,
        current: {
          interval: this.heartbeatInterval,
          timeout: this.heartbeatTimeout
        },
        recommended: {
          interval: recommendedStrategy.heartbeatInterval,
          timeout: recommendedStrategy.heartbeatTimeout
        }
      }, 'info', 'adaptation');

      // Update heartbeat parameters
      this.heartbeatInterval = recommendedStrategy.heartbeatInterval;
      this.heartbeatTimeout = recommendedStrategy.heartbeatTimeout;

      // Restart heartbeat if connected
      if (this.isConnected()) {
        this._stopHeartbeat();
        this._startHeartbeat();
      }

      // Record metric
      this._recordMetric('heartbeat_adapted', 1, {
        networkQuality: this.networkQuality,
        newInterval: this.heartbeatInterval,
        newTimeout: this.heartbeatTimeout
      });
    }
  }

  /**
   * Process message queue
   *
   * @private
   */
  async _processMessageQueue() {
    if (!this.isConnected()) {
      return;
    }

    // Process in-memory queue
    const inMemoryQueueSize = this.messageQueue.length;
    if (inMemoryQueueSize > 0) {
      this._log(`Processing in-memory queued messages`, {
        queueLength: inMemoryQueueSize,
        connectionState: this.connectionState
      }, 'info', 'queue');

      // Record queue processing metric
      this._recordMetric('queue_processing_started', 1, {
        queueSize: inMemoryQueueSize,
        queueType: 'memory'
      });

      let successCount = 0;
      let failureCount = 0;

      // Process all queued messages
      const queueCopy = [...this.messageQueue];
      this.messageQueue = [];

      for (const message of queueCopy) {
        try {
          this.socket.send(message);
          successCount++;
        } catch (error) {
          failureCount++;
          this._log('Error sending queued message', {
            error: error.message,
            messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : '')
          }, 'error', 'queue');
        }
      }

      // Log results
      this._log('In-memory queue processing completed', {
        total: queueCopy.length,
        success: successCount,
        failure: failureCount
      }, 'info', 'queue');

      // Record queue processing metrics
      this._recordMetric('queue_processing_completed', 1, {
        total: queueCopy.length,
        success: successCount,
        failure: failureCount,
        queueType: 'memory'
      });
      this._recordMetric('queue_messages_sent', successCount);
      this._recordMetric('queue_messages_failed', failureCount);
    }

    // Process offline queue if available
    if (this.offlineQueueInitialized && this.sessionId) {
      try {
        // Get messages from offline queue
        const offlineMessages = await offlineMessageQueue.getMessages(this.sessionId);

        if (offlineMessages.length > 0) {
          this._log(`Processing offline queued messages`, {
            queueLength: offlineMessages.length,
            connectionState: this.connectionState,
            sessionId: this.sessionId
          }, 'info', 'queue');

          // Record queue processing metric
          this._recordMetric('queue_processing_started', 1, {
            queueSize: offlineMessages.length,
            queueType: 'offline'
          });

          let successCount = 0;
          let failureCount = 0;

          // Process offline messages
          for (const messageObj of offlineMessages) {
            try {
              // Send the message
              this.socket.send(messageObj.message);

              // Remove from offline queue on success
              await offlineMessageQueue.removeMessage(messageObj.id);

              successCount++;
            } catch (error) {
              // Increment attempt count
              await offlineMessageQueue.incrementAttemptCount(messageObj.id);

              failureCount++;
              this._log('Error sending offline queued message', {
                error: error.message,
                messageId: messageObj.id,
                attempts: messageObj.attempts + 1,
                messagePreview: messageObj.message.substring(0, 100) + (messageObj.message.length > 100 ? '...' : '')
              }, 'error', 'queue');
            }
          }

          // Log results
          this._log('Offline queue processing completed', {
            total: offlineMessages.length,
            success: successCount,
            failure: failureCount,
            sessionId: this.sessionId
          }, 'info', 'queue');

          // Record queue processing metrics
          this._recordMetric('queue_processing_completed', 1, {
            total: offlineMessages.length,
            success: successCount,
            failure: failureCount,
            queueType: 'offline'
          });
          this._recordMetric('offline_queue_messages_sent', successCount);
          this._recordMetric('offline_queue_messages_failed', failureCount);

          // Get updated queue stats
          const stats = await offlineMessageQueue.getStats();
          this._recordMetric('offline_queue_size', stats.totalMessages);
        }
      } catch (error) {
        this._log('Error processing offline queue', {
          error: error.message,
          sessionId: this.sessionId
        }, 'error', 'queue');

        this._recordMetric('offline_queue_processing_error', 1);
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
      // Parse message
      const message = JSON.parse(data);

      // Get message type
      const messageType = message.type || 'unknown';

      // Log parsed message
      this._log(`Parsed message of type: ${messageType}`, {
        messageType,
        messageId: message.id || 'none',
        timestamp: message.timestamp
      }, 'debug', 'message');

      // Record message type metric
      this._recordMetric(`message_type_${messageType}`, 1);

      // Handle heartbeat response
      if (messageType === 'heartbeat_response') {
        const responseTime = Date.now() - (this._lastHeartbeatSent || 0);
        this.lastHeartbeatResponse = Date.now();

        this._log('Heartbeat response received', {
          responseTime,
          originalTimestamp: message.originalTimestamp,
          timeSinceLastHeartbeat: this._lastHeartbeatSent ? Date.now() - this._lastHeartbeatSent : null
        }, 'debug', 'heartbeat');

        // Record heartbeat metrics
        this._recordMetric('heartbeat_response', 1);
        this._recordMetric('heartbeat_latency', responseTime);

        // Clear heartbeat timeout
        if (this.heartbeatTimeout) {
          clearTimeout(this.heartbeatTimeout);
          this.heartbeatTimeout = null;
        }

        return;
      }

      // Call handlers for this message type
      let handlerCount = 0;
      if (this.messageHandlers.has(messageType)) {
        for (const handler of this.messageHandlers.get(messageType)) {
          try {
            handler(message);
            handlerCount++;
          } catch (error) {
            this._log(`Error in message handler for ${messageType}`, error, 'error', 'handler');
            this._recordMetric('handler_error', 1, { messageType });
          }
        }
      }

      // Call handlers for all messages
      if (this.messageHandlers.has('*')) {
        for (const handler of this.messageHandlers.get('*')) {
          try {
            handler(message);
            handlerCount++;
          } catch (error) {
            this._log('Error in wildcard message handler', error, 'error', 'handler');
            this._recordMetric('handler_error', 1, { messageType: 'wildcard' });
          }
        }
      }

      // Log if no handlers were found
      if (handlerCount === 0) {
        this._log(`No handlers found for message type: ${messageType}`, { message }, 'warn', 'message');
        this._recordMetric('unhandled_message', 1, { messageType });
      }
    } catch (error) {
      this._log('Error handling message', { error: error.message, data }, 'error', 'message');
      this._recordMetric('message_parse_error', 1);
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
      duration: stateDuration,
      sessionId: this.sessionId
    }, 'info', 'connection');

    // Record metric for state change
    this._recordMetric('connection_state_change', 1, {
      previousState,
      newState: state,
      duration: stateDuration
    });

    // Record state-specific metrics
    this._recordMetric(`state_${state}`, 1);

    // Emit a custom event for connection state change
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const stateChangeEvent = new CustomEvent('websocket-state-change', {
        detail: {
          connectionId: this._getConnectionId(),
          sessionId: this.sessionId,
          previousState,
          newState: state,
          reason,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(stateChangeEvent);
    }

    // Notify handlers
    for (const handler of this.connectionHandlers) {
      try {
        handler(state, reason, {
          previousState,
          duration: stateDuration,
          timestamp: this.connectionStateTimestamp
        });
      } catch (error) {
        this._log('Error in connection state handler:', error, 'error');
      }
    }
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
      this._log('Network is offline, not attempting to reconnect', {
        reconnectAttempts: this.reconnectAttempts
      }, 'info', 'reconnection');

      this._recordMetric('reconnect_delayed_network', 1);
      this._updateConnectionState('waiting_for_network', 'Network is offline');

      // Set up a periodic check for network status
      if (!this._networkCheckInterval) {
        this._networkCheckInterval = setInterval(() => {
          // If network is back online, clear interval and attempt reconnect
          if (this.networkOnline) {
            this._log('Network is back online during periodic check', {
              reconnectAttempts: this.reconnectAttempts
            }, 'info', 'reconnection');

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
      this._log('Max reconnect attempts reached', {
        maxAttempts: this.maxReconnectAttempts,
        sessionId: this.sessionId
      }, 'warn', 'reconnection');

      this._recordMetric('max_reconnect_attempts_reached', 1);
      this._updateConnectionState('failed', 'Max reconnect attempts reached');

      // Emit a custom event for max reconnect attempts reached
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const maxReconnectEvent = new CustomEvent('websocket-max-reconnect', {
          detail: {
            connectionId: this._getConnectionId(),
            sessionId: this.sessionId,
            attempts: this.reconnectAttempts,
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(maxReconnectEvent);
      }

      // Set up a recovery attempt after a longer delay
      // This gives the system a chance to recover after max attempts
      const recoveryDelay = this.maxReconnectDelay * 2;
      this._log('Scheduling recovery attempt after cooling period', {
        delay: recoveryDelay,
        sessionId: this.sessionId
      }, 'info', 'reconnection');

      this._updateConnectionState('recovery_scheduled', `Cooling period before recovery (${Math.round(recoveryDelay/1000)}s)`);

      this.recoveryTimeout = setTimeout(() => {
        this._log('Executing recovery attempt after max reconnects', {
          sessionId: this.sessionId
        }, 'info', 'reconnection');

        // Reset reconnect attempts for a fresh start
        this.reconnectAttempts = 0;
        this._updateConnectionState('recovery_attempt', 'Attempting recovery after cooling period');
        this._recordMetric('reconnect_recovery_attempt', 1);

        // Attempt to reconnect
        this._attemptReconnect();
      }, recoveryDelay);

      return;
    }

    // Increment reconnect attempts
    this.reconnectAttempts++;

    // Check network quality and adjust strategy if needed
    if (this.adaptiveReconnection) {
      // Trigger a network quality measurement before reconnecting
      networkQualityService.measureNetworkQuality()
        .then(measurement => {
          if (measurement) {
            this._log('Network quality before reconnection', {
              quality: measurement.networkQuality,
              metrics: measurement.metrics
            }, 'info', 'reconnection');

            // Adapt reconnection strategy based on latest measurement
            this._adaptReconnectionStrategy();
          }
        })
        .catch(error => {
          this._log('Error measuring network quality before reconnection', {
            error: error.message
          }, 'error', 'reconnection');
        });
    }

    // Calculate backoff delay (exponential backoff with jitter)
    const delay = Math.min(
      this.initialReconnectDelay * Math.pow(this.reconnectBackoffFactor, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    const finalDelay = Math.max(100, delay + jitter);

    this._log('Scheduling reconnection attempt', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay: Math.round(finalDelay),
      baseDelay: delay,
      jitter: jitter,
      sessionId: this.sessionId,
      networkQuality: this.networkQuality
    }, 'info', 'reconnection');

    this._recordMetric('reconnect_scheduled', 1, {
      attempt: this.reconnectAttempts,
      delay: Math.round(finalDelay),
      networkQuality: this.networkQuality
    });

    this._updateConnectionState('reconnecting', `Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    // Set timeout for reconnect
    this.reconnectTimeout = setTimeout(() => {
      if (this.url) {
        // Check if network is still online before attempting
        if (!this.networkOnline) {
          this._log('Network went offline before reconnection attempt', {
            attempt: this.reconnectAttempts,
            sessionId: this.sessionId
          }, 'info', 'reconnection');

          this._recordMetric('reconnect_aborted_network', 1);
          this._updateConnectionState('waiting_for_network', 'Network went offline');
          return;
        }

        this._log('Executing reconnection attempt', {
          attempt: this.reconnectAttempts,
          maxAttempts: this.maxReconnectAttempts,
          url: this.url,
          sessionId: this.sessionId
        }, 'info', 'reconnection');

        this._recordMetric('reconnect_attempt', 1, {
          attempt: this.reconnectAttempts
        });

        // Create options object
        const options = {};

        if (this.sessionId) {
          options.sessionId = this.sessionId;
        }

        if (this.token) {
          options.token = this.token;
        }

        // Capture reconnect start time
        const reconnectStartTime = Date.now();

        // Set a timeout for this specific connection attempt
        const connectionTimeout = setTimeout(() => {
          this._log('Connection attempt timed out', {
            attempt: this.reconnectAttempts,
            sessionId: this.sessionId,
            timeout: 10000 // 10 seconds timeout
          }, 'warn', 'reconnection');

          this._recordMetric('reconnect_timeout', 1, {
            attempt: this.reconnectAttempts
          });

          // Force close the socket if it exists
          if (this.socket) {
            this.socket.close(4000, 'Connection attempt timed out');
          }

          // Schedule next reconnect attempt
          this._attemptReconnect();
        }, 10000); // 10 seconds timeout

        // Attempt to reconnect
        this.connect(this.url, options)
          .then(() => {
            // Clear the connection timeout
            clearTimeout(connectionTimeout);

            const reconnectTime = Date.now() - reconnectStartTime;
            this._log('Reconnection successful', {
              attempt: this.reconnectAttempts,
              reconnectTime,
              sessionId: this.sessionId
            }, 'info', 'reconnection');

            this._recordMetric('reconnect_success', 1, {
              attempt: this.reconnectAttempts,
              reconnectTime,
              networkQuality: this.networkQuality
            });

            // Reset reconnect attempts counter after a successful connection
            // that stays stable for a period of time
            setTimeout(() => {
              if (this.isConnected()) {
                this._log('Connection stable, resetting reconnect attempts counter', {
                  previousAttempts: this.reconnectAttempts,
                  sessionId: this.sessionId
                }, 'info', 'reconnection');

                this.reconnectAttempts = 0;
                this._recordMetric('reconnect_attempts_reset', 1);
              }
            }, 30000); // Check after 30 seconds of stability
          })
          .catch(error => {
            // Clear the connection timeout
            clearTimeout(connectionTimeout);

            this._log('Reconnection failed', {
              attempt: this.reconnectAttempts,
              error: error.message,
              sessionId: this.sessionId
            }, 'error', 'reconnection');

            this._recordMetric('reconnect_failure', 1, {
              attempt: this.reconnectAttempts,
              errorType: error.name || 'unknown'
            });

            // Check if we should try a different approach after certain failures
            if (this.reconnectAttempts % 3 === 0) {
              this._log('Trying alternative reconnection approach', {
                attempt: this.reconnectAttempts,
                sessionId: this.sessionId
              }, 'info', 'reconnection');

              // Force a new WebSocket instance on next attempt
              if (this.socket) {
                this.socket.close(4000, 'Forcing new connection instance');
                this.socket = null;
              }

              // Clear any cached DNS or connection data
              if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
                // Attempt to clear connection cache via service worker if available
                this._recordMetric('reconnect_cache_clear_attempt', 1);
              }
            }

            // Schedule next reconnect attempt
            this._attemptReconnect();
          });
      }
    }, finalDelay);
  }

  /**
   * Set up network status listeners
   *
   * @private
   */
  _setupNetworkListeners() {
    // Check if window is available (browser environment)
    if (typeof window !== 'undefined') {
      // Initial network status
      this.networkOnline = navigator.onLine;

      // Add event listeners
      window.addEventListener('online', this._handleNetworkStatusChange);
      window.addEventListener('offline', this._handleNetworkStatusChange);
    }
  }

  /**
   * Clean up network status listeners
   *
   * @private
   */
  _cleanupNetworkListeners() {
    // Check if window is available (browser environment)
    if (typeof window !== 'undefined') {
      // Remove event listeners
      window.removeEventListener('online', this._handleNetworkStatusChange);
      window.removeEventListener('offline', this._handleNetworkStatusChange);
    }

    // Remove network quality listener
    networkQualityService.removeListener(this._handleNetworkQualityChange);
  }

  /**
   * Handle network quality change
   *
   * @param {Object} event - Network quality change event
   * @private
   */
  _handleNetworkQualityChange(event) {
    if (event.type === 'networkQualityChange') {
      const oldQuality = this.networkQuality;
      const newQuality = event.newNetworkQuality;

      this._log('Network quality changed', {
        oldQuality,
        newQuality,
        metrics: event.measurement.metrics
      }, 'info', 'network');

      // Update network quality
      this.networkQuality = newQuality;

      // Record metric
      this._recordMetric('network_quality_change', 1, {
        oldQuality,
        newQuality
      });

      // Adapt reconnection strategy if enabled
      if (this.adaptiveReconnection) {
        this._adaptReconnectionStrategy();
      }

      // Adapt heartbeat if enabled
      if (this.adaptiveHeartbeat) {
        this._adaptHeartbeat();
      }
    }
  }

  /**
   * Adapt reconnection strategy based on network quality
   *
   * @private
   */
  _adaptReconnectionStrategy() {
    // Get recommended strategy for current network quality
    const recommendedStrategy = networkQualityService.getReconnectionStrategy();

    // Log current and recommended settings
    this._log('Adapting reconnection strategy', {
      networkQuality: this.networkQuality,
      current: {
        maxReconnectAttempts: this.maxReconnectAttempts,
        initialReconnectDelay: this.initialReconnectDelay,
        maxReconnectDelay: this.maxReconnectDelay,
        reconnectBackoffFactor: this.reconnectBackoffFactor
      },
      recommended: recommendedStrategy
    }, 'info', 'adaptation');

    // Update reconnection parameters
    this.maxReconnectAttempts = recommendedStrategy.maxReconnectAttempts;
    this.initialReconnectDelay = recommendedStrategy.initialReconnectDelay;
    this.maxReconnectDelay = recommendedStrategy.maxReconnectDelay;
    this.reconnectBackoffFactor = recommendedStrategy.reconnectBackoffFactor;

    // Record metric
    this._recordMetric('reconnection_strategy_adapted', 1, {
      networkQuality: this.networkQuality
    });
  }

  /**
   * Adapt heartbeat based on network quality
   *
   * @private
   */
  _adaptHeartbeat() {
    // Get recommended strategy for current network quality
    const recommendedStrategy = networkQualityService.getReconnectionStrategy();

    // Log current and recommended settings
    this._log('Adapting heartbeat', {
      networkQuality: this.networkQuality,
      current: {
        heartbeatInterval: this.heartbeatInterval,
        heartbeatTimeout: this.heartbeatTimeout
      },
      recommended: {
        heartbeatInterval: recommendedStrategy.heartbeatInterval,
        heartbeatTimeout: recommendedStrategy.heartbeatTimeout
      }
    }, 'info', 'adaptation');

    // Check if heartbeat parameters have changed
    const heartbeatChanged =
      this.heartbeatInterval !== recommendedStrategy.heartbeatInterval ||
      this.heartbeatTimeout !== recommendedStrategy.heartbeatTimeout;

    // Update heartbeat parameters
    this.heartbeatInterval = recommendedStrategy.heartbeatInterval;
    this.heartbeatTimeout = recommendedStrategy.heartbeatTimeout;

    // Restart heartbeat if connected and parameters changed
    if (heartbeatChanged && this.isConnected()) {
      this._log('Restarting heartbeat with new parameters', null, 'info', 'heartbeat');
      this._stopHeartbeat();
      this._startHeartbeat();
    }

    // Record metric
    this._recordMetric('heartbeat_adapted', 1, {
      networkQuality: this.networkQuality
    });
  }

  /**
   * Handle network status change
   *
   * @param {Event} event - Network status change event
   * @private
   */
  _handleNetworkStatusChange(event) {
    // Update network status
    this.networkOnline = event.type === 'online';

    this._log(`Network status changed: ${this.networkOnline ? 'online' : 'offline'}`, {
      previousState: !this.networkOnline ? 'online' : 'offline',
      newState: this.networkOnline ? 'online' : 'offline'
    }, 'info', 'network');

    // Record metric
    this._recordMetric('network_status_change', 1, {
      online: this.networkOnline
    });

    // If network is back online
    if (this.networkOnline) {
      // Trigger network quality measurement
      networkQualityService.measureNetworkQuality()
        .then(measurement => {
          if (measurement) {
            this._log('Network quality after reconnection', {
              quality: measurement.networkQuality,
              metrics: measurement.metrics
            }, 'info', 'network');
          }
        })
        .catch(error => {
          this._log('Error measuring network quality after reconnection', {
            error: error.message
          }, 'error', 'network');
        });

      // Attempt to reconnect if not connected
      if (this.connectionState !== 'connected' && !this.forceClosed) {
        this._log('Network is back online, attempting to reconnect', null, 'info', 'reconnection');
        this._attemptReconnect();
      }
    } else {
      // Network is offline
      this._log('Network is offline, connection may be interrupted', null, 'warn', 'network');

      // Update connection state if currently connected
      if (this.connectionState === 'connected') {
        this._updateConnectionState('waiting_for_network', 'Network is offline');
      }
    }
  }

  /**
   * Log message with enhanced details
   *
   * @param {string} message - Message to log
   * @param {*} data - Additional data to log
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} category - Log category (connection, message, heartbeat, etc.)
   * @private
   */
  _log(message, data = null, level = 'info', category = 'general') {
    // Always log errors and warnings, respect debug flag for other levels
    if (this.debug || level === 'error' || level === 'warn') {
      const timestamp = new Date().toISOString();
      const connectionId = this.socket ? this._getConnectionId() : 'not_connected';
      const logPrefix = `[EnhancedWebSocketService][${timestamp}][${level.toUpperCase()}][${category}][${connectionId}]`;

      // Create structured log object
      const logObject = {
        timestamp,
        level,
        category,
        connectionId,
        sessionId: this.sessionId || 'none',
        connectionState: this.connectionState,
        message,
        data: data || {}
      };

      // Log to console
      if (data) {
        console[level === 'debug' ? 'log' : level](`${logPrefix} ${message}`, data);
      } else {
        console[level === 'debug' ? 'log' : level](`${logPrefix} ${message}`);
      }

      // Emit log event for external logging systems
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const logEvent = new CustomEvent('websocket-log', {
          detail: logObject
        });
        window.dispatchEvent(logEvent);
      }

      // Store logs in memory (limited to last 100 entries)
      if (!this._logs) {
        this._logs = [];
      }

      this._logs.push(logObject);
      if (this._logs.length > 100) {
        this._logs.shift();
      }
    }
  }

  /**
   * Get connection ID for logging
   *
   * @returns {string} - Connection ID
   * @private
   */
  _getConnectionId() {
    if (!this._connectionId) {
      // Generate a unique connection ID
      this._connectionId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    return this._connectionId;
  }

  /**
   * Get recent logs
   *
   * @param {number} count - Number of logs to retrieve (default: 50)
   * @param {string} level - Filter by log level (optional)
   * @param {string} category - Filter by log category (optional)
   * @returns {Array} - Recent logs
   */
  getLogs(count = 50, level = null, category = null) {
    if (!this._logs) {
      return [];
    }

    let filteredLogs = this._logs;

    // Apply filters
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    // Return most recent logs
    return filteredLogs.slice(-count);
  }

  /**
   * Initialize offline message queue
   *
   * @private
   */
  async _initOfflineQueue() {
    try {
      const initialized = await offlineMessageQueue.init();
      this.offlineQueueInitialized = initialized;

      if (initialized) {
        this._log('Offline message queue initialized', null, 'info', 'queue');

        // Get queue stats
        const stats = await offlineMessageQueue.getStats();
        this._log('Offline queue stats', stats, 'info', 'queue');

        // Record metrics
        if (stats.totalMessages > 0) {
          this._recordMetric('offline_queue_size', stats.totalMessages);
          this._recordMetric('offline_queue_total_size', stats.totalSize);
        }
      } else {
        this._log('Failed to initialize offline message queue', null, 'error', 'queue');
      }
    } catch (error) {
      this._log('Error initializing offline message queue', { error: error.message }, 'error', 'queue');
      this.offlineQueueInitialized = false;
    }
  }

  /**
   * Record metric for analytics
   *
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {Object} dimensions - Additional dimensions
   * @private
   */
  _recordMetric(name, value, dimensions = {}) {
    // Create metric object
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      connectionId: this._getConnectionId(),
      sessionId: this.sessionId || 'none',
      ...dimensions
    };

    // Emit metric event for external analytics systems
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const metricEvent = new CustomEvent('websocket-metric', {
        detail: metric
      });
      window.dispatchEvent(metricEvent);
    }

    // Store metrics in memory (limited to last 100 entries)
    if (!this._metrics) {
      this._metrics = [];
    }

    this._metrics.push(metric);
    if (this._metrics.length > 100) {
      this._metrics.shift();
    }

    // Log metric at debug level
    this._log(`Metric: ${name}`, metric, 'debug', 'metric');
  }

  /**
   * Get connection duration in milliseconds
   *
   * @returns {number} - Connection duration in ms
   * @private
   */
  _getConnectionDuration() {
    if (!this._connectionStartTime || !this.socket) {
      return 0;
    }

    return Date.now() - this._connectionStartTime;
  }

  /**
   * Get recent metrics
   *
   * @param {number} count - Number of metrics to retrieve (default: 50)
   * @param {string} name - Filter by metric name (optional)
   * @returns {Array} - Recent metrics
   */
  getMetrics(count = 50, name = null) {
    if (!this._metrics) {
      return [];
    }

    let filteredMetrics = this._metrics;

    // Apply filter
    if (name) {
      filteredMetrics = filteredMetrics.filter(metric => metric.name === name);
    }

    // Return most recent metrics
    return filteredMetrics.slice(-count);
  }

  /**
   * Clean up resources
   *
   * @param {boolean} clearOfflineQueue - Whether to clear the offline queue (default: false)
   */
  destroy(clearOfflineQueue = false) {
    // Disconnect
    this.disconnect(1000, 'Service destroyed', clearOfflineQueue);

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

    // Clean up network listeners
    this._cleanupNetworkListeners();

    // Stop network quality monitoring
    if (this.adaptiveReconnection || this.adaptiveHeartbeat) {
      networkQualityService.stopPeriodicMeasurements();
    }

    // Clear handlers
    this.messageHandlers.clear();
    this.connectionHandlers.clear();

    // Clear in-memory message queue
    if (this.messageQueue.length > 0) {
      this._log(`Clearing ${this.messageQueue.length} queued messages`, {
        sessionId: this.sessionId
      }, 'info', 'queue');

      this.messageQueue = [];
    }

    // Update connection state
    this._updateConnectionState('destroyed', 'Service destroyed');

    // Log destruction
    this._log('WebSocket service destroyed', {
      clearOfflineQueue,
      sessionId: this.sessionId,
      networkQuality: this.networkQuality,
      connectionDuration: this._getConnectionDuration()
    }, 'info', 'lifecycle');

    // Record metric
    this._recordMetric('service_destroyed', 1, {
      clearOfflineQueue: clearOfflineQueue,
      networkQuality: this.networkQuality
    });

    // Clear socket reference
    this.socket = null;

    // Clear connection info
    this.url = null;
    this.sessionId = null;
    this.token = null;
  }

  /**
   * Get network quality information
   *
   * @returns {Object} - Network quality information
   */
  getNetworkQualityInfo() {
    return {
      quality: this.networkQuality,
      online: this.networkOnline,
      metrics: networkQualityService.getAverageMetrics(),
      networkType: networkQualityService.getNetworkType(),
      reconnectionStrategy: {
        maxReconnectAttempts: this.maxReconnectAttempts,
        initialReconnectDelay: this.initialReconnectDelay,
        maxReconnectDelay: this.maxReconnectDelay,
        reconnectBackoffFactor: this.reconnectBackoffFactor,
        heartbeatInterval: this.heartbeatInterval,
        heartbeatTimeout: this.heartbeatTimeout
      },
      adaptiveReconnection: this.adaptiveReconnection,
      adaptiveHeartbeat: this.adaptiveHeartbeat
    };
  }

  /**
   * Manually trigger network quality measurement
   *
   * @returns {Promise<Object>} - Network quality measurement
   */
  async measureNetworkQuality() {
    try {
      const measurement = await networkQualityService.measureNetworkQuality();

      if (measurement) {
        this._log('Manual network quality measurement', {
          quality: measurement.networkQuality,
          metrics: measurement.metrics
        }, 'info', 'network');

        // Record metric
        this._recordMetric('manual_network_quality_measurement', 1, {
          quality: measurement.networkQuality
        });
      }

      return measurement;
    } catch (error) {
      this._log('Error in manual network quality measurement', {
        error: error.message
      }, 'error', 'network');

      return null;
    }
  }

  /**
   * Get offline queue statistics
   *
   * @returns {Promise<Object>} - Queue statistics
   */
  async getOfflineQueueStats() {
    if (!this.offlineQueueInitialized) {
      return {
        initialized: false,
        totalMessages: 0,
        sessionMessages: 0
      };
    }

    try {
      const stats = await offlineMessageQueue.getStats();
      const sessionMessages = this.sessionId ?
        (stats.sessionCounts[this.sessionId] || 0) : 0;

      return {
        initialized: true,
        ...stats,
        sessionMessages,
        currentSessionId: this.sessionId
      };
    } catch (error) {
      this._log('Error getting offline queue stats', {
        error: error.message
      }, 'error', 'queue');

      return {
        initialized: true,
        error: error.message,
        totalMessages: 0,
        sessionMessages: 0
      };
    }
  }
}

export default EnhancedWebSocketService;
