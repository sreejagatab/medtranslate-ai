# WebSocket Heartbeat Mechanism in MedTranslate AI

This document outlines the heartbeat mechanism used to maintain WebSocket connections in the MedTranslate AI application.

## Overview

WebSocket connections can become "dead" without either the client or server being notified. This can happen due to network issues, proxies, or other intermediaries. To detect and handle these dead connections, we've implemented a heartbeat mechanism.

## Implementation

### Server-Side Implementation

The server sends heartbeat messages to all connected clients at regular intervals. If a client doesn't respond to a heartbeat message, the server considers the connection dead and terminates it.

```javascript
// Set up heartbeat interval to detect dead connections
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating inactive WebSocket connection');
      return ws.terminate();
    }

    ws.isAlive = false;
    
    // Send heartbeat message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now()
      }));
    }
  });
}, HEARTBEAT_INTERVAL);
```

When a client connects, the server sets up the heartbeat handling:

```javascript
// Set up heartbeat handling
ws.isAlive = true;

// Handle messages
ws.on('message', (message) => {
  // Parse message to check if it's a heartbeat response
  try {
    const data = JSON.parse(message);
    
    // Handle heartbeat response
    if (data.type === 'heartbeat_response') {
      ws.isAlive = true;
      return;
    }
    
    // Handle other messages
    handleMessage(message, sessionId, userId, userType, userName);
  } catch (error) {
    // If not JSON or other error, treat as regular message
    handleMessage(message, sessionId, userId, userType, userName);
  }
});

// Handle pong messages (for backward compatibility)
ws.on('pong', () => {
  ws.isAlive = true;
});
```

The server also handles heartbeat messages from clients:

```javascript
case 'heartbeat':
  // Respond to heartbeat
  sendToUser(sessionId, userId, {
    type: 'heartbeat_response',
    timestamp: Date.now(),
    originalTimestamp: data.timestamp
  });
  break;
```

### Client-Side Implementation

The client sends heartbeat responses when it receives heartbeat messages from the server. It also monitors the heartbeat responses to detect dead connections.

```javascript
// Set up heartbeat response handler
this.enhancedWs.onMessage('heartbeat', (message) => {
  this.enhancedWs.send({
    type: 'heartbeat_response',
    timestamp: Date.now(),
    originalTimestamp: message.timestamp
  });
});
```

The client also has a timeout mechanism to detect if the server doesn't respond to heartbeat messages:

```javascript
/**
 * Send heartbeat message
 * 
 * @private
 */
_sendHeartbeat() {
  this.send({
    type: 'heartbeat',
    timestamp: Date.now()
  });
  
  // Set timeout for heartbeat response
  this.heartbeatTimeout = setTimeout(() => {
    this._log('Heartbeat timeout, reconnecting', null, 'warn');
    
    // Force close and reconnect
    if (this.ws) {
      this.ws.close(4000, 'Heartbeat timeout');
    }
  }, this.heartbeatTimeout);
}
```

## Heartbeat Message Format

### Server to Client

```json
{
  "type": "heartbeat",
  "timestamp": 1620000000000
}
```

### Client to Server

```json
{
  "type": "heartbeat_response",
  "timestamp": 1620000000100,
  "originalTimestamp": 1620000000000
}
```

## Benefits

The heartbeat mechanism provides several benefits:

1. **Dead Connection Detection**: Detects and handles dead connections that would otherwise remain open.
2. **Resource Cleanup**: Ensures server resources are not wasted on dead connections.
3. **Improved Reliability**: Clients can detect when the server is unresponsive and reconnect.
4. **Proxy Compatibility**: Keeps connections alive through proxies that might otherwise close inactive connections.

## Configuration

The heartbeat mechanism can be configured with the following parameters:

- `HEARTBEAT_INTERVAL`: The interval at which the server sends heartbeat messages (default: 30000ms).
- `heartbeatInterval`: The interval at which the client sends heartbeat messages (default: 30000ms).
- `heartbeatTimeout`: The timeout for heartbeat responses (default: 5000ms).

## Best Practices

1. **Balance Frequency and Overhead**: Set the heartbeat interval to balance between quick detection of dead connections and minimizing network overhead.
2. **Handle Reconnection Gracefully**: When a heartbeat timeout occurs, reconnect gracefully with exponential backoff.
3. **Monitor Heartbeat Failures**: Log and monitor heartbeat failures to detect network issues.
4. **Test with Network Disruptions**: Test the heartbeat mechanism with simulated network disruptions to ensure it works correctly.

## Conclusion

The heartbeat mechanism is a critical component of the MedTranslate AI WebSocket infrastructure, ensuring reliable real-time communication between clients and servers, even in challenging network conditions.
