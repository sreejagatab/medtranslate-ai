/**
 * WebSocket Server for MedTranslate AI
 * 
 * This server handles real-time communication between providers and patients
 * during translation sessions.
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const { verifyToken } = require('../lambda/auth/auth-service');

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
  
  wss.on('connection', handleConnection);
  
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
  try {
    // Parse URL and query parameters
    const parsedUrl = url.parse(req.url, true);
    const pathParts = parsedUrl.pathname.split('/');
    const sessionId = pathParts[2]; // /ws/:sessionId
    const token = parsedUrl.query.token;
    
    // Validate session ID and token
    if (!sessionId || !token) {
      ws.close(4000, 'Missing session ID or token');
      return;
    }
    
    // Verify token
    const decodedToken = await verifyToken(token);
    if (!decodedToken) {
      ws.close(4001, 'Invalid or expired token');
      return;
    }
    
    // Add connection to session
    const userId = decodedToken.sub;
    const userType = decodedToken.type;
    const userName = decodedToken.name;
    
    // Create session if it doesn't exist
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, new Map());
    }
    
    const sessionConnections = sessions.get(sessionId);
    
    // Add connection to session
    sessionConnections.set(userId, {
      ws,
      userType,
      userName,
      userId
    });
    
    console.log(`User ${userName} (${userType}) connected to session ${sessionId}`);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId,
      userId,
      userType,
      timestamp: new Date().toISOString()
    }));
    
    // Notify other participants
    broadcastToSession(sessionId, {
      type: 'user_joined',
      userId,
      userName,
      userType,
      timestamp: new Date().toISOString()
    }, userId);
    
    // Handle messages
    ws.on('message', (message) => handleMessage(message, sessionId, userId, userType, userName));
    
    // Handle disconnection
    ws.on('close', () => handleDisconnection(sessionId, userId, userName, userType));
  } catch (error) {
    console.error('Error handling WebSocket connection:', error);
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
function handleMessage(message, sessionId, userId, userType, userName) {
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
    
    // Broadcast message to session
    broadcastToSession(sessionId, data);
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
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
      return;
    }
    
    // Remove connection from session
    sessionConnections.delete(userId);
    
    console.log(`User ${userName} (${userType}) disconnected from session ${sessionId}`);
    
    // Notify other participants
    broadcastToSession(sessionId, {
      type: 'user_left',
      userId,
      userName,
      userType,
      timestamp: new Date().toISOString()
    });
    
    // Clean up empty sessions
    if (sessionConnections.size === 0) {
      sessions.delete(sessionId);
      console.log(`Session ${sessionId} closed (no participants)`);
    }
  } catch (error) {
    console.error('Error handling WebSocket disconnection:', error);
  }
}

/**
 * Broadcast message to all participants in a session
 * 
 * @param {string} sessionId - Session ID
 * @param {Object} message - Message to broadcast
 * @param {string} excludeUserId - User ID to exclude from broadcast
 */
function broadcastToSession(sessionId, message, excludeUserId = null) {
  try {
    // Get session connections
    const sessionConnections = sessions.get(sessionId);
    if (!sessionConnections) {
      return;
    }
    
    // Convert message to string
    const messageString = JSON.stringify(message);
    
    // Send to all participants except excluded user
    for (const [userId, connection] of sessionConnections.entries()) {
      if (userId !== excludeUserId && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(messageString);
      }
    }
  } catch (error) {
    console.error('Error broadcasting to session:', error);
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
  try {
    // Get session connections
    const sessionConnections = sessions.get(sessionId);
    if (!sessionConnections) {
      return false;
    }
    
    // Get user connection
    const connection = sessionConnections.get(userId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    // Send message
    connection.ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('Error sending to user:', error);
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
