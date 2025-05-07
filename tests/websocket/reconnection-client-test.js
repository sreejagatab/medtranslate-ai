/**
 * WebSocket Reconnection Client Test for MedTranslate AI
 * 
 * This script tests the WebSocket client reconnection handling.
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  serverUrl: process.env.WS_URL || 'ws://localhost:3002',
  sessionId: process.env.SESSION_ID || 'test-session',
  clientCount: process.env.CLIENT_COUNT || 2,
  testDuration: 60000, // 60 seconds
  messageInterval: 1000, // 1 second
  disconnectInterval: 10000, // 10 seconds
  logDir: path.join(__dirname, '../../logs')
};

// Create log directory if it doesn't exist
if (!fs.existsSync(CONFIG.logDir)) {
  fs.mkdirSync(CONFIG.logDir, { recursive: true });
}

// Log file
const logFile = path.join(CONFIG.logDir, `websocket-client-test-${Date.now()}.log`);
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
  clients: [],
  messagesSent: 0,
  messagesReceived: 0,
  reconnections: 0,
  disconnections: 0,
  errors: 0,
  testRunning: false
};

/**
 * Create a WebSocket client with reconnection logic
 * 
 * @param {number} index - Client index
 * @returns {Object} - Client object
 */
function createClient(index) {
  const clientId = `client-${index}-${uuidv4().substring(0, 8)}`;
  const token = `token-${uuidv4().substring(0, 8)}`;
  
  const client = {
    index,
    clientId,
    token,
    sessionId: CONFIG.sessionId,
    ws: null,
    isConnected: false,
    reconnectAttempts: 0,
    messagesSent: 0,
    messagesReceived: 0,
    lastMessageId: 0,
    messageQueue: [],
    reconnectTimeout: null,
    messageInterval: null,
    connect: function() {
      try {
        // Build WebSocket URL with parameters
        const reconnect = this.reconnectAttempts > 0;
        const wsUrl = `${CONFIG.serverUrl}/${this.sessionId}?token=${this.token}&clientId=${this.clientId}${reconnect ? '&reconnect=true' : ''}`;
        
        log(`Client ${this.index} connecting to ${wsUrl}`);
        
        // Create WebSocket
        this.ws = new WebSocket(wsUrl);
        
        // Set up event handlers
        this.ws.onopen = () => {
          log(`Client ${this.index} connected`);
          this.isConnected = true;
          
          if (this.reconnectAttempts > 0) {
            state.reconnections++;
            log(`Client ${this.index} reconnected (attempt ${this.reconnectAttempts})`);
          }
          
          this.reconnectAttempts = 0;
          
          // Process queued messages
          this._processMessageQueue();
          
          // Start sending messages
          this._startSendingMessages();
        };
        
        this.ws.onclose = (event) => {
          log(`Client ${this.index} disconnected: ${event.code} - ${event.reason}`);
          this.isConnected = false;
          state.disconnections++;
          
          // Stop sending messages
          if (this.messageInterval) {
            clearInterval(this.messageInterval);
            this.messageInterval = null;
          }
          
          // Attempt to reconnect if not closed cleanly and test is still running
          if (event.code !== 1000 && event.code !== 1001 && state.testRunning) {
            this._attemptReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          log(`Client ${this.index} error: ${error.message || 'Unknown error'}`, 'error');
          state.errors++;
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.messagesReceived++;
            state.messagesReceived++;
            
            if (message.type === 'echo_response') {
              log(`Client ${this.index} received echo response for message ${message.originalId}`);
            } else if (message.type === 'heartbeat') {
              // Send heartbeat response
              this.send({
                type: 'heartbeat_response',
                timestamp: Date.now(),
                originalTimestamp: message.timestamp
              });
            }
          } catch (error) {
            log(`Client ${this.index} error parsing message: ${error.message}`, 'error');
            state.errors++;
          }
        };
        
        return true;
      } catch (error) {
        log(`Client ${this.index} connection error: ${error.message}`, 'error');
        state.errors++;
        return false;
      }
    },
    disconnect: function(code = 1000, reason = 'Client disconnected') {
      if (this.ws && this.isConnected) {
        this.ws.close(code, reason);
      }
      
      // Clear reconnection timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      // Stop sending messages
      if (this.messageInterval) {
        clearInterval(this.messageInterval);
        this.messageInterval = null;
      }
      
      this.isConnected = false;
    },
    send: function(message) {
      if (!this.isConnected) {
        // Queue message for later
        log(`Client ${this.index} not connected, queueing message: ${message.type}`);
        this.messageQueue.push(message);
        return false;
      }
      
      try {
        this.ws.send(JSON.stringify(message));
        this.messagesSent++;
        state.messagesSent++;
        return true;
      } catch (error) {
        log(`Client ${this.index} error sending message: ${error.message}`, 'error');
        state.errors++;
        
        // Queue message for later
        this.messageQueue.push(message);
        return false;
      }
    },
    _processMessageQueue: function() {
      if (this.messageQueue.length === 0 || !this.isConnected) {
        return;
      }
      
      log(`Client ${this.index} processing ${this.messageQueue.length} queued messages`);
      
      // Process all queued messages
      const queueCopy = [...this.messageQueue];
      this.messageQueue = [];
      
      for (const message of queueCopy) {
        try {
          this.ws.send(JSON.stringify(message));
          this.messagesSent++;
          state.messagesSent++;
        } catch (error) {
          log(`Client ${this.index} error sending queued message: ${error.message}`, 'error');
          state.errors++;
          
          // Put message back in queue
          this.messageQueue.unshift(message);
          break;
        }
      }
    },
    _startSendingMessages: function() {
      // Clear existing interval
      if (this.messageInterval) {
        clearInterval(this.messageInterval);
      }
      
      // Start sending messages
      this.messageInterval = setInterval(() => {
        if (this.isConnected) {
          const messageId = ++this.lastMessageId;
          
          this.send({
            type: 'echo',
            id: messageId,
            content: `Message ${messageId} from client ${this.index}`,
            timestamp: Date.now()
          });
        }
      }, CONFIG.messageInterval);
    },
    _attemptReconnect: function() {
      // Don't attempt to reconnect if we've reached the maximum number of attempts
      if (this.reconnectAttempts >= 10) {
        log(`Client ${this.index} maximum reconnect attempts reached`);
        return;
      }
      
      // Clear existing reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      // Calculate reconnect delay with exponential backoff
      const delay = Math.min(
        1000 * Math.pow(1.5, this.reconnectAttempts),
        30000
      );
      
      log(`Client ${this.index} attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
      
      // Schedule reconnect
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    }
  };
  
  return client;
}

/**
 * Run the WebSocket client test
 */
async function runTest() {
  try {
    log('Starting WebSocket client reconnection test...');
    
    // Create clients
    for (let i = 0; i < CONFIG.clientCount; i++) {
      const client = createClient(i);
      state.clients.push(client);
      client.connect();
    }
    
    // Set test running flag
    state.testRunning = true;
    
    // Periodically disconnect clients to test reconnection
    const disconnectInterval = setInterval(() => {
      if (!state.testRunning) {
        return;
      }
      
      // Randomly select a client to disconnect
      const clientIndex = Math.floor(Math.random() * state.clients.length);
      const client = state.clients[clientIndex];
      
      if (client.isConnected) {
        log(`Forcing disconnect for client ${client.index}`);
        client.disconnect(4000, 'Test forced disconnect');
      }
    }, CONFIG.disconnectInterval);
    
    // Run test for specified duration
    setTimeout(() => {
      // Stop test
      state.testRunning = false;
      clearInterval(disconnectInterval);
      
      // Disconnect all clients
      for (const client of state.clients) {
        client.disconnect();
      }
      
      // Print test results
      log('\n=== Test Results ===');
      log(`Test duration: ${CONFIG.testDuration / 1000} seconds`);
      log(`Clients: ${state.clients.length}`);
      log(`Messages sent: ${state.messagesSent}`);
      log(`Messages received: ${state.messagesReceived}`);
      log(`Reconnections: ${state.reconnections}`);
      log(`Disconnections: ${state.disconnections}`);
      log(`Errors: ${state.errors}`);
      
      // Per-client stats
      for (const client of state.clients) {
        log(`Client ${client.index}: Sent=${client.messagesSent}, Received=${client.messagesReceived}`);
      }
      
      // Close log stream
      logStream.end();
      
      // Exit process
      process.exit(0);
    }, CONFIG.testDuration);
  } catch (error) {
    log(`Test error: ${error.message}`, 'error');
    logStream.end();
    process.exit(1);
  }
}

// Run the test
runTest();
