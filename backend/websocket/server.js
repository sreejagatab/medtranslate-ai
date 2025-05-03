/**
 * WebSocket Server for MedTranslate AI
 *
 * This server handles real-time communication between providers and patients
 * during translation sessions.
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const authService = require('../auth/auth-service');
const translationService = require('../translation/translation-service');
const { v4: uuidv4 } = require('uuid');
const analyticsService = require('../monitoring/analytics-service');
const logger = require('../utils/cloudwatch-logger');

// Session connections map
const sessions = new Map();

/**
 * Initialize WebSocket server
 *
 * @param {http.Server} server - HTTP server to attach WebSocket server to
 * @returns {WebSocket.Server} - WebSocket server instance
 */
function initializeWebSocketServer(server) {
  const wss = new WebSocket.Server({
    server,
    path: '/ws'
  });

  console.log('WebSocket server created with path /ws');

  // Track WebSocket server statistics
  const stats = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    totalErrors: 0,
    startTime: Date.now()
  };

  wss.on('connection', (ws, req) => {
    // Generate connection ID
    ws.connectionId = uuidv4();

    // Increment connection counters
    stats.totalConnections++;
    stats.activeConnections++;

    // Log connection
    logger.info('WebSocket connection received', {
      url: req.url,
      connectionId: ws.connectionId,
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      activeConnections: stats.activeConnections
    }, 'websocket');

    // Record connection metric
    analyticsService.recordPerformanceMetrics({
      component: 'websocket',
      operation: 'connection',
      responseTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      successRate: 100
    });

    // Handle connection
    handleConnection(ws, req);

    // Track disconnection to update stats
    ws.on('close', () => {
      stats.activeConnections = Math.max(0, stats.activeConnections - 1);

      // Log connection stats periodically
      if (stats.totalConnections % 100 === 0) {
        logger.info('WebSocket server statistics', {
          totalConnections: stats.totalConnections,
          activeConnections: stats.activeConnections,
          totalMessages: stats.totalMessages,
          totalErrors: stats.totalErrors,
          uptime: Math.floor((Date.now() - stats.startTime) / 1000)
        }, 'websocket');
      }
    });
  });

  wss.on('error', (error) => {
    // Log error
    logger.error('WebSocket server error', {
      error: error.message,
      stack: error.stack
    }, 'websocket');

    // Record error metric
    analyticsService.recordErrorEvent({
      errorType: 'websocket_server',
      errorMessage: error.message,
      component: 'websocket'
    });

    // Increment error counter
    stats.totalErrors++;
  });

  wss.on('headers', (headers, request) => {
    // Log headers at debug level
    logger.info('WebSocket headers', {
      url: request.url,
      headers: headers.join(', ')
    }, 'websocket');
  });

  // Set up heartbeat interval to detect dead connections
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds

  setInterval(() => {
    let activeCount = 0;
    let terminatedCount = 0;
    let heartbeatsSent = 0;

    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        // Log termination
        logger.warn('Terminating inactive WebSocket connection', {
          connectionId: ws.connectionId || 'unknown',
          sessionId: ws.sessionId || 'unknown',
          userId: ws.userId || 'unknown',
          lastActive: ws.lastActive ? new Date(ws.lastActive).toISOString() : 'unknown',
          inactiveTime: ws.lastActive ? Date.now() - ws.lastActive : 'unknown'
        }, 'websocket');

        // Record metric
        analyticsService.recordErrorEvent({
          errorType: 'websocket_timeout',
          errorMessage: 'Connection terminated due to inactivity',
          component: 'websocket',
          sessionId: ws.sessionId,
          userId: ws.userId
        });

        terminatedCount++;
        return ws.terminate();
      }

      ws.isAlive = false;
      activeCount++;

      // Send heartbeat message instead of ping
      if (ws.readyState === WebSocket.OPEN) {
        // Store heartbeat timestamp
        const heartbeatTimestamp = Date.now();
        ws.lastHeartbeatSent = heartbeatTimestamp;

        // Send heartbeat
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: heartbeatTimestamp
        }));

        heartbeatsSent++;
      }
    });

    // Log heartbeat statistics
    logger.info('WebSocket heartbeat statistics', {
      activeConnections: activeCount,
      terminatedConnections: terminatedCount,
      heartbeatsSent: heartbeatsSent
    }, 'websocket');

    // Record metrics
    analyticsService.recordPerformanceMetrics({
      component: 'websocket',
      operation: 'heartbeat',
      responseTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      successRate: activeCount > 0 ? ((activeCount - terminatedCount) / activeCount) * 100 : 100
    });
  }, HEARTBEAT_INTERVAL);

  console.log('WebSocket server initialized');
  return wss;
}

/**
 * Handle new WebSocket connection
 *
 * @param {WebSocket} ws - WebSocket connection
 * @param {http.IncomingMessage} req - HTTP request
 */
async function handleConnection(ws, req) {
  const connectionStartTime = Date.now();

  try {
    // Parse URL and query parameters
    const parsedUrl = url.parse(req.url, true);
    const pathParts = parsedUrl.pathname.split('/');
    const sessionId = pathParts[2]; // /ws/:sessionId
    const token = parsedUrl.query.token;

    // Store session ID for reference
    ws.sessionId = sessionId;

    // Log connection attempt with details
    logger.info('WebSocket connection attempt', {
      connectionId: ws.connectionId,
      sessionId: sessionId || 'unknown',
      url: req.url,
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    }, 'websocket');

    // Validate session ID and token
    if (!sessionId || !token) {
      // Log validation failure
      logger.warn('WebSocket connection rejected: Missing session ID or token', {
        connectionId: ws.connectionId,
        sessionId: sessionId || 'unknown',
        hasToken: !!token
      }, 'websocket');

      // Record error metric
      analyticsService.recordErrorEvent({
        errorType: 'websocket_validation',
        errorMessage: 'Missing session ID or token',
        component: 'websocket',
        sessionId: sessionId || 'unknown'
      });

      ws.close(4000, 'Missing session ID or token');
      return;
    }

    // Verify token
    const decodedToken = authService.verifyToken(token);
    if (!decodedToken) {
      // Log token verification failure
      logger.warn('WebSocket connection rejected: Invalid or expired token', {
        connectionId: ws.connectionId,
        sessionId: sessionId
      }, 'websocket');

      // Record error metric
      analyticsService.recordErrorEvent({
        errorType: 'websocket_auth',
        errorMessage: 'Invalid or expired token',
        component: 'websocket',
        sessionId: sessionId
      });

      ws.close(4001, 'Invalid or expired token');
      return;
    }

    // Record authentication success
    analyticsService.recordPerformanceMetrics({
      component: 'websocket',
      operation: 'authentication',
      responseTime: Date.now() - connectionStartTime,
      cpuUsage: 0,
      memoryUsage: 0,
      successRate: 100
    });

    // Add connection to session
    const userId = decodedToken.sub;
    const userType = decodedToken.type;
    const userName = decodedToken.name;

    // Store user info for reference
    ws.userId = userId;
    ws.userType = userType;
    ws.userName = userName;

    // Log user info
    logger.info('WebSocket user authenticated', {
      connectionId: ws.connectionId,
      sessionId: sessionId,
      userId: userId,
      userType: userType,
      userName: userName
    }, 'websocket');

    // Create session if it doesn't exist
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, new Map());

      // Log new session creation
      logger.info('New WebSocket session created', {
        sessionId: sessionId,
        createdBy: userId,
        userType: userType
      }, 'websocket');
    }

    const sessionConnections = sessions.get(sessionId);

    // Check if user is already connected
    const existingConnection = sessionConnections.get(userId);
    if (existingConnection) {
      // Log duplicate connection
      logger.warn('User already connected to session, replacing connection', {
        connectionId: ws.connectionId,
        sessionId: sessionId,
        userId: userId,
        userType: userType
      }, 'websocket');

      // Close existing connection
      if (existingConnection.ws.readyState === WebSocket.OPEN) {
        existingConnection.ws.close(4003, 'User connected from another location');
      }
    }

    // Add connection to session
    sessionConnections.set(userId, {
      ws,
      userType,
      userName,
      userId,
      connectionId: ws.connectionId,
      connectedAt: new Date().toISOString()
    });

    // Log successful connection
    logger.info('User connected to session', {
      connectionId: ws.connectionId,
      sessionId: sessionId,
      userId: userId,
      userType: userType,
      userName: userName,
      participantCount: sessionConnections.size
    }, 'websocket');

    // Record session event
    analyticsService.recordSessionEvent({
      sessionId: sessionId,
      providerId: userType === 'provider' ? userId : null,
      eventType: 'join',
      patientLanguage: userType === 'patient' ? decodedToken.language : null,
      deviceType: req.headers['user-agent'] ? 'web' : 'unknown',
      medicalContext: decodedToken.context || 'general'
    });

    // Send welcome message
    const welcomeMessage = {
      type: 'connected',
      sessionId,
      userId,
      userType,
      timestamp: new Date().toISOString(),
      participantCount: sessionConnections.size
    };

    ws.send(JSON.stringify(welcomeMessage));

    // Log message sent
    logger.info('Welcome message sent', {
      connectionId: ws.connectionId,
      sessionId: sessionId,
      userId: userId,
      messageType: 'connected'
    }, 'websocket');

    // Notify other participants
    broadcastToSession(sessionId, {
      type: 'user_joined',
      userId,
      userName,
      userType,
      timestamp: new Date().toISOString(),
      participantCount: sessionConnections.size
    }, userId);

    // Set up heartbeat handling
    ws.isAlive = true;
    ws.lastActive = Date.now();

    // Track message count for this connection
    ws.messageCount = 0;
    ws.errorCount = 0;

    // Handle messages
    ws.on('message', (message) => {
      // Update last active timestamp
      ws.lastActive = Date.now();
      ws.messageCount++;

      // Record message received metric
      if (ws.messageCount % 100 === 0) {
        // Log message count milestone
        logger.info('WebSocket message count milestone', {
          connectionId: ws.connectionId,
          sessionId: sessionId,
          userId: userId,
          messageCount: ws.messageCount
        }, 'websocket');
      }

      // Parse message to check if it's a heartbeat response
      try {
        const data = JSON.parse(message);

        // Handle heartbeat response
        if (data.type === 'heartbeat_response') {
          ws.isAlive = true;

          // Calculate heartbeat latency if we have the original timestamp
          if (data.originalTimestamp && ws.lastHeartbeatSent) {
            const heartbeatLatency = Date.now() - data.originalTimestamp;

            // Record heartbeat latency metric
            analyticsService.recordPerformanceMetrics({
              component: 'websocket',
              operation: 'heartbeat_latency',
              responseTime: heartbeatLatency,
              cpuUsage: 0,
              memoryUsage: 0,
              successRate: 100
            });

            // Log high latency
            if (heartbeatLatency > 1000) {
              logger.warn('High WebSocket heartbeat latency', {
                connectionId: ws.connectionId,
                sessionId: sessionId,
                userId: userId,
                latency: heartbeatLatency
              }, 'websocket');
            }
          }

          return;
        }

        // Handle other messages
        handleMessage(message, sessionId, userId, userType, userName);
      } catch (error) {
        // Log parse error
        logger.error('Error parsing WebSocket message', {
          connectionId: ws.connectionId,
          sessionId: sessionId,
          userId: userId,
          error: error.message,
          messagePreview: message.length > 100 ? message.substring(0, 100) + '...' : message
        }, 'websocket');

        ws.errorCount++;

        // Record error metric
        analyticsService.recordErrorEvent({
          errorType: 'websocket_parse',
          errorMessage: error.message,
          component: 'websocket',
          sessionId: sessionId,
          userId: userId
        });

        // If not JSON or other error, treat as regular message
        handleMessage(message, sessionId, userId, userType, userName);
      }
    });

    // Handle pong messages (for backward compatibility)
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastActive = Date.now();
    });

    // Handle disconnection
    ws.on('close', (code, reason) => {
      // Log close event
      logger.info('WebSocket connection closed', {
        connectionId: ws.connectionId,
        sessionId: sessionId,
        userId: userId,
        code: code,
        reason: reason || 'No reason provided',
        messageCount: ws.messageCount || 0,
        errorCount: ws.errorCount || 0,
        duration: ws.lastActive ? Math.floor((Date.now() - ws.lastActive) / 1000) : 'unknown'
      }, 'websocket');

      handleDisconnection(sessionId, userId, userName, userType);
    });

    // Handle errors
    ws.on('error', (error) => {
      // Log error
      logger.error('WebSocket connection error', {
        connectionId: ws.connectionId,
        sessionId: sessionId,
        userId: userId,
        error: error.message,
        stack: error.stack
      }, 'websocket');

      // Record error metric
      analyticsService.recordErrorEvent({
        errorType: 'websocket_connection',
        errorMessage: error.message,
        component: 'websocket',
        sessionId: sessionId,
        userId: userId
      });
    });

    // Record successful connection metric
    analyticsService.recordPerformanceMetrics({
      component: 'websocket',
      operation: 'connection_complete',
      responseTime: Date.now() - connectionStartTime,
      cpuUsage: 0,
      memoryUsage: 0,
      successRate: 100
    });
  } catch (error) {
    // Log error
    logger.error('Error handling WebSocket connection', {
      connectionId: ws.connectionId || 'unknown',
      error: error.message,
      stack: error.stack,
      url: req ? req.url : 'unknown'
    }, 'websocket');

    // Record error metric
    analyticsService.recordErrorEvent({
      errorType: 'websocket_connection_handler',
      errorMessage: error.message,
      component: 'websocket'
    });

    ws.close(4500, 'Internal server error');
  }
}

/**
 * Handle incoming WebSocket message
 *
 * @param {string} message - Message data
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} userType - User type ('provider' or 'patient')
 * @param {string} userName - User name
 */
async function handleMessage(message, sessionId, userId, userType, userName) {
  try {
    const data = JSON.parse(message);

    // Add sender information
    data.sender = {
      id: userId,
      name: userName,
      type: userType
    };

    // Add timestamp if not present
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }

    // Handle different message types
    switch (data.type) {
      case 'translation':
        await handleTranslationMessage(data, sessionId, userId, userType, userName);
        break;

      case 'audio_translation':
        await handleAudioTranslationMessage(data, sessionId, userId, userType, userName);
        break;

      case 'typing':
        // Just forward typing indicators
        broadcastToSession(sessionId, data, userId);
        break;

      case 'message':
        // Regular chat message
        broadcastToSession(sessionId, data);
        break;

      case 'heartbeat':
        // Respond to heartbeat
        sendToUser(sessionId, userId, {
          type: 'heartbeat_response',
          timestamp: Date.now(),
          originalTimestamp: data.timestamp
        });
        break;

      default:
        // For other message types, just broadcast to session
        broadcastToSession(sessionId, data);
        break;
    }
  } catch (error) {
    console.error('Error handling WebSocket message:', error);

    // Send error message back to sender
    sendToUser(sessionId, userId, {
      type: 'error',
      error: 'Failed to process message',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle translation message
 *
 * @param {Object} data - Message data
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} userType - User type
 * @param {string} userName - User name
 */
async function handleTranslationMessage(data, sessionId, userId, userType, userName) {
  try {
    // Generate a unique message ID if not provided
    const messageId = data.messageId || uuidv4();

    // Extract translation parameters
    const {
      originalText,
      sourceLanguage,
      targetLanguage,
      context = 'general'
    } = data;

    // Perform translation
    const translationResult = await translationService.translateText(
      originalText,
      sourceLanguage,
      targetLanguage,
      context
    );

    // Create translation message
    const translationMessage = {
      type: 'translation',
      id: messageId,
      originalText,
      translatedText: translationResult.translatedText,
      sourceLanguage,
      targetLanguage,
      confidence: translationResult.confidence,
      context,
      sender: {
        id: userId,
        name: userName,
        type: userType
      },
      timestamp: data.timestamp || new Date().toISOString()
    };

    // Broadcast translation to session
    broadcastToSession(sessionId, translationMessage);

  } catch (error) {
    console.error('Error handling translation message:', error);

    // Send error message back to sender
    sendToUser(sessionId, userId, {
      type: 'error',
      error: 'Translation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle audio translation message
 *
 * @param {Object} data - Message data
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} userType - User type
 * @param {string} userName - User name
 */
async function handleAudioTranslationMessage(data, sessionId, userId, userType, userName) {
  try {
    // This would be implemented to handle audio translation
    // For now, we'll just send an error message
    sendToUser(sessionId, userId, {
      type: 'error',
      error: 'Audio translation not yet implemented',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error handling audio translation message:', error);

    // Send error message back to sender
    sendToUser(sessionId, userId, {
      type: 'error',
      error: 'Audio translation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle WebSocket disconnection
 *
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} userType - User type ('provider' or 'patient')
 */
function handleDisconnection(sessionId, userId, userName, userType) {
  try {
    // Get session connections
    const sessionConnections = sessions.get(sessionId);
    if (!sessionConnections) {
      logger.warn('Disconnection for unknown session', {
        sessionId: sessionId,
        userId: userId
      }, 'websocket');
      return;
    }

    // Get connection info before removing
    const connection = sessionConnections.get(userId);
    const connectionInfo = connection ? {
      connectionId: connection.connectionId || 'unknown',
      connectedAt: connection.connectedAt || 'unknown',
      messageCount: connection.ws.messageCount || 0,
      errorCount: connection.ws.errorCount || 0
    } : { connectionId: 'unknown' };

    // Remove connection from session
    sessionConnections.delete(userId);

    // Log disconnection
    logger.info('User disconnected from session', {
      sessionId: sessionId,
      userId: userId,
      userName: userName,
      userType: userType,
      remainingParticipants: sessionConnections.size,
      ...connectionInfo
    }, 'websocket');

    // Record session event
    analyticsService.recordSessionEvent({
      sessionId: sessionId,
      providerId: userType === 'provider' ? userId : null,
      eventType: 'leave',
      patientLanguage: null,
      deviceType: 'unknown',
      medicalContext: 'general'
    });

    // Notify other participants
    broadcastToSession(sessionId, {
      type: 'user_left',
      userId,
      userName,
      userType,
      timestamp: new Date().toISOString(),
      participantCount: sessionConnections.size
    });

    // Clean up empty sessions
    if (sessionConnections.size === 0) {
      sessions.delete(sessionId);

      // Log session closure
      logger.info('Session closed (no participants)', {
        sessionId: sessionId,
        lastUser: userId
      }, 'websocket');

      // Record session end event
      analyticsService.recordSessionEvent({
        sessionId: sessionId,
        providerId: null,
        eventType: 'end',
        patientLanguage: null,
        deviceType: 'unknown',
        medicalContext: 'general'
      });
    }
  } catch (error) {
    // Log error
    logger.error('Error handling WebSocket disconnection', {
      sessionId: sessionId,
      userId: userId,
      error: error.message,
      stack: error.stack
    }, 'websocket');

    // Record error metric
    analyticsService.recordErrorEvent({
      errorType: 'websocket_disconnection',
      errorMessage: error.message,
      component: 'websocket',
      sessionId: sessionId,
      userId: userId
    });
  }
}

/**
 * Broadcast message to all participants in a session
 *
 * @param {string} sessionId - Session ID
 * @param {Object} message - Message to broadcast
 * @param {string} excludeUserId - User ID to exclude from broadcast
 * @returns {number} - Number of recipients the message was sent to
 */
function broadcastToSession(sessionId, message, excludeUserId = null) {
  const startTime = Date.now();
  let recipientCount = 0;

  try {
    // Get session connections
    const sessionConnections = sessions.get(sessionId);
    if (!sessionConnections) {
      logger.warn('Broadcast to unknown session', {
        sessionId: sessionId,
        messageType: message.type
      }, 'websocket');
      return 0;
    }

    // Convert message to string
    const messageString = JSON.stringify(message);
    const messageSize = messageString.length;

    // Log broadcast attempt
    logger.info('Broadcasting message to session', {
      sessionId: sessionId,
      messageType: message.type,
      excludeUserId: excludeUserId,
      potentialRecipients: sessionConnections.size - (excludeUserId ? 1 : 0),
      messageSize: messageSize
    }, 'websocket');

    // Send to all participants except excluded user
    for (const [userId, connection] of sessionConnections.entries()) {
      if (userId !== excludeUserId && connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(messageString);
          recipientCount++;

          // Update message count for the connection
          if (connection.ws.messageCount !== undefined) {
            connection.ws.messageCount++;
          }
        } catch (error) {
          // Log send error
          logger.error('Error sending message to user', {
            sessionId: sessionId,
            userId: userId,
            messageType: message.type,
            error: error.message
          }, 'websocket');

          // Record error metric
          analyticsService.recordErrorEvent({
            errorType: 'websocket_send',
            errorMessage: error.message,
            component: 'websocket',
            sessionId: sessionId,
            userId: userId
          });
        }
      }
    }

    // Log broadcast result
    const duration = Date.now() - startTime;
    if (duration > 100) {
      // Log slow broadcasts
      logger.warn('Slow broadcast operation', {
        sessionId: sessionId,
        messageType: message.type,
        duration: duration,
        recipientCount: recipientCount
      }, 'websocket');
    }

    // Record broadcast metrics
    analyticsService.recordPerformanceMetrics({
      component: 'websocket',
      operation: 'broadcast',
      responseTime: duration,
      cpuUsage: 0,
      memoryUsage: 0,
      successRate: sessionConnections.size > 0 ? (recipientCount / (sessionConnections.size - (excludeUserId ? 1 : 0))) * 100 : 100
    });

    return recipientCount;
  } catch (error) {
    // Log error
    logger.error('Error broadcasting to session', {
      sessionId: sessionId,
      messageType: message ? message.type : 'unknown',
      error: error.message,
      stack: error.stack
    }, 'websocket');

    // Record error metric
    analyticsService.recordErrorEvent({
      errorType: 'websocket_broadcast',
      errorMessage: error.message,
      component: 'websocket',
      sessionId: sessionId
    });

    return recipientCount;
  }
}

/**
 * Send message to a specific user in a session
 *
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {Object} message - Message to send
 * @returns {boolean} - Success indicator
 */
function sendToUser(sessionId, userId, message) {
  const startTime = Date.now();

  try {
    // Get session connections
    const sessionConnections = sessions.get(sessionId);
    if (!sessionConnections) {
      logger.warn('Send to user in unknown session', {
        sessionId: sessionId,
        userId: userId,
        messageType: message.type
      }, 'websocket');
      return false;
    }

    // Get user connection
    const connection = sessionConnections.get(userId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Send to unavailable user', {
        sessionId: sessionId,
        userId: userId,
        messageType: message.type,
        connectionExists: !!connection,
        readyState: connection ? connection.ws.readyState : 'no connection'
      }, 'websocket');
      return false;
    }

    // Convert message to string
    const messageString = JSON.stringify(message);
    const messageSize = messageString.length;

    // Log send attempt
    logger.info('Sending message to user', {
      sessionId: sessionId,
      userId: userId,
      messageType: message.type,
      messageSize: messageSize,
      connectionId: connection.connectionId || 'unknown'
    }, 'websocket');

    // Send message
    connection.ws.send(messageString);

    // Update message count for the connection
    if (connection.ws.messageCount !== undefined) {
      connection.ws.messageCount++;
    }

    // Record send metrics
    const duration = Date.now() - startTime;
    analyticsService.recordPerformanceMetrics({
      component: 'websocket',
      operation: 'send_to_user',
      responseTime: duration,
      cpuUsage: 0,
      memoryUsage: 0,
      successRate: 100
    });

    // Log slow sends
    if (duration > 50) {
      logger.warn('Slow message send operation', {
        sessionId: sessionId,
        userId: userId,
        messageType: message.type,
        duration: duration,
        messageSize: messageSize
      }, 'websocket');
    }

    return true;
  } catch (error) {
    // Log error
    logger.error('Error sending to user', {
      sessionId: sessionId,
      userId: userId,
      messageType: message ? message.type : 'unknown',
      error: error.message,
      stack: error.stack
    }, 'websocket');

    // Record error metric
    analyticsService.recordErrorEvent({
      errorType: 'websocket_send_to_user',
      errorMessage: error.message,
      component: 'websocket',
      sessionId: sessionId,
      userId: userId
    });

    return false;
  }
}

/**
 * Get session participants
 *
 * @param {string} sessionId - Session ID
 * @returns {Array} - Array of participants
 */
function getSessionParticipants(sessionId) {
  try {
    // Get session connections
    const sessionConnections = sessions.get(sessionId);
    if (!sessionConnections) {
      return [];
    }

    // Convert to array of participants
    const participants = [];
    for (const [userId, connection] of sessionConnections.entries()) {
      participants.push({
        userId,
        userName: connection.userName,
        userType: connection.userType,
        online: connection.ws.readyState === WebSocket.OPEN
      });
    }

    return participants;
  } catch (error) {
    console.error('Error getting session participants:', error);
    return [];
  }
}

/**
 * Close a session
 *
 * @param {string} sessionId - Session ID
 * @param {string} reason - Reason for closing
 */
function closeSession(sessionId, reason = 'Session ended') {
  try {
    // Get session connections
    const sessionConnections = sessions.get(sessionId);
    if (!sessionConnections) {
      return;
    }

    // Send close message to all participants
    const closeMessage = {
      type: 'session_closed',
      reason,
      timestamp: new Date().toISOString()
    };

    broadcastToSession(sessionId, closeMessage);

    // Close all connections
    for (const [userId, connection] of sessionConnections.entries()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close(1000, reason);
      }
    }

    // Remove session
    sessions.delete(sessionId);
    console.log(`Session ${sessionId} closed: ${reason}`);
  } catch (error) {
    console.error('Error closing session:', error);
  }
}

module.exports = {
  initializeWebSocketServer,
  broadcastToSession,
  sendToUser,
  getSessionParticipants,
  closeSession
};
