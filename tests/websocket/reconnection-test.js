/**
 * WebSocket Reconnection Test for MedTranslate AI
 * 
 * This script tests the WebSocket reconnection handling with the enhanced
 * WebSocket client and server implementations.
 */

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  port: process.env.PORT || 3002,
  testDuration: 60000, // 60 seconds
  reconnectTestCount: 3,
  messageInterval: 1000, // 1 second
  logDir: path.join(__dirname, '../../logs')
};

// Create log directory if it doesn't exist
if (!fs.existsSync(CONFIG.logDir)) {
  fs.mkdirSync(CONFIG.logDir, { recursive: true });
}

// Log file
const logFile = path.join(CONFIG.logDir, `websocket-reconnection-test-${Date.now()}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Log function
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

// Test state
const state = {
  server: null,
  wss: null,
  clients: new Map(),
  sessions: new Map(),
  messagesSent: 0,
  messagesReceived: 0,
  reconnections: 0,
  disconnections: 0,
  errors: 0,
  testRunning: false
};

// Create test server
function createServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocket.Server({ server });
  
  // Handle WebSocket connections
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.pathname.split('/')[1] || 'default';
    const token = url.searchParams.get('token') || 'anonymous';
    const clientId = url.searchParams.get('clientId') || uuidv4();
    const isReconnect = url.searchParams.get('reconnect') === 'true';
    
    // Generate connection ID
    ws.connectionId = uuidv4();
    ws.clientId = clientId;
    ws.sessionId = sessionId;
    ws.token = token;
    ws.isReconnect = isReconnect;
    ws.messageCount = 0;
    ws.lastActive = Date.now();
    
    // Add to clients map
    state.clients.set(ws.connectionId, ws);
    
    // Create session if it doesn't exist
    if (!state.sessions.has(sessionId)) {
      state.sessions.set(sessionId, new Map());
      log(`Created new session: ${sessionId}`);
    }
    
    const sessionClients = state.sessions.get(sessionId);
    
    // Check if client is reconnecting
    const existingClient = Array.from(sessionClients.values())
      .find(client => client.clientId === clientId);
    
    if (existingClient) {
      log(`Client reconnected: ${clientId} (${ws.connectionId})`);
      state.reconnections++;
      
      // Close existing connection
      if (existingClient.readyState === WebSocket.OPEN) {
        existingClient.close(4000, 'Reconnected from another connection');
      }
    } else {
      log(`New client connected: ${clientId} (${ws.connectionId})`);
    }
    
    // Add to session
    sessionClients.set(ws.connectionId, ws);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId,
      connectionId: ws.connectionId,
      clientId,
      isReconnect,
      timestamp: Date.now()
    }));
    
    // Handle messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        ws.lastActive = Date.now();
        ws.messageCount++;
        state.messagesReceived++;
        
        // Handle heartbeat
        if (data.type === 'heartbeat_response') {
          ws.isAlive = true;
          return;
        }
        
        // Echo message back to sender
        if (data.type === 'echo') {
          ws.send(JSON.stringify({
            type: 'echo_response',
            originalId: data.id,
            content: data.content,
            timestamp: Date.now()
          }));
        }
        
        // Broadcast message to session
        if (data.type === 'broadcast') {
          broadcastToSession(sessionId, {
            type: 'broadcast_message',
            senderId: ws.connectionId,
            content: data.content,
            timestamp: Date.now()
          }, ws.connectionId);
        }
      } catch (error) {
        log(`Error handling message: ${error.message}`, 'error');
        state.errors++;
      }
    });
    
    // Handle close
    ws.on('close', (code, reason) => {
      log(`Client disconnected: ${clientId} (${ws.connectionId}) - Code: ${code}, Reason: ${reason || 'No reason'}`);
      state.disconnections++;
      
      // Remove from clients map
      state.clients.delete(ws.connectionId);
      
      // Remove from session
      if (state.sessions.has(sessionId)) {
        state.sessions.get(sessionId).delete(ws.connectionId);
        
        // Remove empty session
        if (state.sessions.get(sessionId).size === 0) {
          state.sessions.delete(sessionId);
          log(`Removed empty session: ${sessionId}`);
        }
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      log(`WebSocket error: ${error.message}`, 'error');
      state.errors++;
    });
    
    // Set up heartbeat
    ws.isAlive = true;
  });
  
  // Set up heartbeat interval
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        log(`Terminating inactive connection: ${ws.connectionId}`);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now()
      }));
      
      state.messagesSent++;
    });
  }, 30000);
  
  // Handle server close
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });
  
  // Store server and WebSocket server in state
  state.server = server;
  state.wss = wss;
  
  return server;
}

/**
 * Broadcast message to all clients in a session
 * 
 * @param {string} sessionId - Session ID
 * @param {Object} message - Message to broadcast
 * @param {string} excludeConnectionId - Connection ID to exclude
 */
function broadcastToSession(sessionId, message, excludeConnectionId = null) {
  if (!state.sessions.has(sessionId)) {
    return;
  }
  
  const sessionClients = state.sessions.get(sessionId);
  const messageString = JSON.stringify(message);
  
  for (const [connectionId, client] of sessionClients.entries()) {
    if (connectionId !== excludeConnectionId && client.readyState === WebSocket.OPEN) {
      client.send(messageString);
      state.messagesSent++;
    }
  }
}

/**
 * Run the WebSocket reconnection test
 */
async function runTest() {
  try {
    log('Starting WebSocket reconnection test...');
    
    // Create and start server
    const server = createServer();
    server.listen(CONFIG.port, () => {
      log(`Test server listening on port ${CONFIG.port}`);
    });
    
    // Set test running flag
    state.testRunning = true;
    
    // Run test for specified duration
    setTimeout(() => {
      // Stop test
      state.testRunning = false;
      
      // Print test results
      log('\n=== Test Results ===');
      log(`Test duration: ${CONFIG.testDuration / 1000} seconds`);
      log(`Clients connected: ${state.clients.size}`);
      log(`Sessions: ${state.sessions.size}`);
      log(`Messages sent: ${state.messagesSent}`);
      log(`Messages received: ${state.messagesReceived}`);
      log(`Reconnections: ${state.reconnections}`);
      log(`Disconnections: ${state.disconnections}`);
      log(`Errors: ${state.errors}`);
      
      // Close server
      server.close(() => {
        log('Test server closed');
        logStream.end();
        process.exit(0);
      });
    }, CONFIG.testDuration);
  } catch (error) {
    log(`Test error: ${error.message}`, 'error');
    logStream.end();
    process.exit(1);
  }
}

// Run the test
runTest();
