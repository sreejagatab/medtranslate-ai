# WebSocket Reconnection Handling in MedTranslate AI

This document outlines the approach for handling WebSocket reconnection in the MedTranslate AI applications.

## Overview

MedTranslate AI uses WebSockets for real-time communication between the frontend applications and the backend server. To ensure reliable communication, we've implemented a robust reconnection handling mechanism.

## Implementation

### EnhancedWebSocketService

The core of our WebSocket reconnection handling is the `EnhancedWebSocketService` class (`frontend/shared/services/enhanced-websocket-service.js`), which provides:

1. **Robust Reconnection Logic**: Exponential backoff with jitter for reconnection attempts
2. **Network Status Monitoring**: Automatic reconnection when network connectivity is restored
3. **Heartbeat Mechanism**: Detection of dead connections through periodic heartbeats
4. **Message Queuing**: Queuing of messages during disconnections
5. **Comprehensive Logging**: Detailed logging of connection events

### Configuration Options

The `EnhancedWebSocketService` can be configured with the following options:

```javascript
const options = {
  maxReconnectAttempts: 10,       // Maximum number of reconnection attempts
  initialReconnectDelay: 1000,    // Initial reconnection delay in ms
  maxReconnectDelay: 30000,       // Maximum reconnection delay in ms
  reconnectBackoffFactor: 1.5,    // Backoff factor for reconnection delay
  heartbeatInterval: 30000,       // Heartbeat interval in ms
  heartbeatTimeout: 5000,         // Heartbeat timeout in ms
  debug: true                     // Enable debug logging
};
```

### Connection States

The `EnhancedWebSocketService` provides the following connection states:

- `disconnected`: The WebSocket is disconnected
- `connecting`: The WebSocket is connecting
- `connected`: The WebSocket is connected
- `reconnecting`: The WebSocket is reconnecting
- `waiting_for_network`: The WebSocket is waiting for network connectivity
- `error`: An error occurred
- `failed`: Reconnection failed after maximum attempts

### Usage

To use the `EnhancedWebSocketService`:

```javascript
import EnhancedWebSocketService from '../../shared/services/enhanced-websocket-service';

// Create enhanced WebSocket service
const ws = new EnhancedWebSocketService({
  maxReconnectAttempts: 10,
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  reconnectBackoffFactor: 1.5,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
  debug: true
});

// Connect to WebSocket server
ws.connect('wss://example.com/ws', { sessionId: '123', token: 'abc' })
  .then(() => {
    console.log('Connected to WebSocket server');
  })
  .catch(error => {
    console.error('Error connecting to WebSocket server:', error);
  });

// Register message handler
ws.onMessage('message_type', (message) => {
  console.log('Received message:', message);
});

// Register connection state handler
ws.onConnectionState((state, reason) => {
  console.log(`Connection state changed to ${state}:`, reason);
});

// Send message
ws.send({ type: 'message_type', data: 'Hello, world!' });

// Disconnect
ws.disconnect();

// Clean up resources
ws.destroy();
```

## Heartbeat Mechanism

The heartbeat mechanism is used to detect dead connections. The client sends a heartbeat message to the server every `heartbeatInterval` milliseconds. If the server doesn't respond within `heartbeatTimeout` milliseconds, the connection is considered dead and the client attempts to reconnect.

### Heartbeat Message Format

```javascript
// Client to server
{
  type: 'heartbeat',
  timestamp: 1620000000000
}

// Server to client
{
  type: 'heartbeat_response',
  timestamp: 1620000000100,
  originalTimestamp: 1620000000000
}
```

## Message Queuing

Messages sent during disconnections are queued and sent when the connection is re-established. This ensures that no messages are lost during temporary disconnections.

## Network Status Monitoring

The `EnhancedWebSocketService` monitors the network status using the browser's `online` and `offline` events. When the network goes offline, the service stops reconnection attempts. When the network comes back online, the service automatically attempts to reconnect.

## Best Practices

1. **Always use the EnhancedWebSocketService**: Use the `EnhancedWebSocketService` for all WebSocket connections in the application.
2. **Handle connection state changes**: Register a connection state handler to update the UI based on the connection state.
3. **Queue messages during disconnections**: Use the `queueIfDisconnected` parameter when sending messages to ensure they're delivered when the connection is re-established.
4. **Clean up resources**: Call the `destroy` method when the WebSocket is no longer needed to clean up resources.

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Check the network connectivity
2. Verify that the WebSocket server is running
3. Check for any firewall or proxy issues
4. Enable debug logging to see detailed connection events

### Heartbeat Issues

If you encounter heartbeat issues:

1. Verify that the server is responding to heartbeat messages
2. Adjust the `heartbeatInterval` and `heartbeatTimeout` parameters
3. Check for any network latency issues

## Conclusion

By implementing the `EnhancedWebSocketService`, MedTranslate AI ensures reliable real-time communication between the frontend applications and the backend server, even in challenging network conditions.
