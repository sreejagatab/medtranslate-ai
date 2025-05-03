# WebSocket Reconnection Improvements

This document outlines the improvements made to the WebSocket reconnection handling in the MedTranslate AI application.

## Overview

The WebSocket reconnection handling has been enhanced to provide more robust and reliable connections between the various components of the MedTranslate AI system. These improvements address several key areas:

1. **Enhanced Reconnection Logic**: More sophisticated reconnection algorithm with adaptive backoff and recovery mechanisms
2. **Improved Connection State Management**: More detailed connection states and better state transition handling
3. **Enhanced Heartbeat Mechanism**: More robust heartbeat with adaptive intervals and better timeout handling
4. **Token Refresh Support**: Automatic token refresh when authentication tokens expire
5. **Comprehensive Logging and Metrics**: Better visibility into connection issues and performance

## Key Improvements

### Enhanced Reconnection Logic

The reconnection logic has been significantly improved with the following features:

- **Exponential Backoff with Jitter**: Gradually increases delay between reconnection attempts with randomization to prevent thundering herd problems
- **Network Status Monitoring**: Detects network status changes and adapts reconnection strategy accordingly
- **Recovery Mechanism**: After reaching maximum reconnection attempts, schedules a recovery attempt after a cooling period
- **Connection Timeout Handling**: Sets timeouts for connection attempts to prevent hanging connections
- **Adaptive Reconnection Strategy**: Adjusts reconnection parameters based on network quality

### Improved Connection State Management

The connection state management has been enhanced with:

- **More Detailed Connection States**: Added new states like `waiting_for_network`, `recovery_scheduled`, `recovery_attempt`, `token_expired`, and `token_refresh`
- **State Transition Logging**: Comprehensive logging of state transitions with reasons and durations
- **State Change Events**: Emits detailed events for state changes with additional context
- **Connection State History**: Tracks previous states and transition timestamps

### Enhanced Heartbeat Mechanism

The heartbeat mechanism has been improved with:

- **Adaptive Heartbeat Intervals**: Adjusts heartbeat frequency based on network quality
- **Robust Timeout Handling**: Better handling of heartbeat timeouts with final ping attempts
- **Heartbeat Metrics**: Tracks heartbeat latency and success rates
- **Immediate Initial Heartbeat**: Sends an initial heartbeat shortly after connection

### Token Refresh Support

Added support for authentication token refresh:

- **Token Expiration Detection**: Detects when authentication tokens expire
- **Automatic Token Refresh**: Calls a provided callback to refresh tokens
- **Reconnection with New Token**: Automatically reconnects with the new token

### Comprehensive Logging and Metrics

Enhanced logging and metrics collection:

- **Detailed Connection Logging**: Logs all connection events with relevant context
- **Reconnection Metrics**: Tracks reconnection attempts, success rates, and latency
- **Heartbeat Metrics**: Monitors heartbeat performance and timeouts
- **Network Quality Metrics**: Records network quality measurements and their impact on connection strategy

## Implementation Details

The improvements have been implemented in the following files:

1. `frontend/shared/services/enhanced-websocket-service.js` - Frontend WebSocket service
2. `edge/app/enhanced-websocket-client.js` - Edge application WebSocket client

Both implementations share similar features but are adapted to their specific environments.

## Usage Guidelines

### Frontend Applications

When using the `EnhancedWebSocketService` in frontend applications:

```javascript
import EnhancedWebSocketService from '../shared/services/enhanced-websocket-service';

// Create enhanced WebSocket service
const ws = new EnhancedWebSocketService({
  maxReconnectAttempts: 10,
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  reconnectBackoffFactor: 1.5,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
  debug: true,
  adaptiveReconnection: true,
  adaptiveHeartbeat: true
});

// Connect to WebSocket server with token refresh callback
ws.connect('wss://example.com/ws', {
  sessionId: '123',
  token: 'abc',
  tokenRefreshCallback: async () => {
    // Implement token refresh logic
    const response = await fetch('/api/refresh-token');
    const data = await response.json();
    return data.token;
  }
})
  .then(() => {
    console.log('Connected to WebSocket server');
  })
  .catch(error => {
    console.error('Error connecting to WebSocket server:', error);
  });

// Register connection state handler
ws.onConnectionState((state, reason, details) => {
  console.log(`Connection state: ${state}`, reason, details);
  
  // Update UI based on connection state
  if (state === 'connected') {
    // Show connected status
  } else if (state === 'reconnecting') {
    // Show reconnecting status
  } else if (state === 'waiting_for_network') {
    // Show offline status
  } else if (state === 'failed') {
    // Show connection failed status
  }
});

// Register message handler
ws.onMessage('translation', (message) => {
  console.log('Received translation:', message);
});

// Send message with queue if disconnected
ws.send({
  type: 'translation_request',
  text: 'Hello, world!',
  sourceLanguage: 'en',
  targetLanguage: 'es'
}, true);

// Clean up when done
ws.destroy();
```

### Edge Application

When using the `EnhancedWebSocketClient` in the edge application:

```javascript
const EnhancedWebSocketClient = require('./enhanced-websocket-client');

// Create enhanced WebSocket client
const client = new EnhancedWebSocketClient({
  maxReconnectAttempts: 10,
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  reconnectBackoffFactor: 1.5,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
  debug: true,
  adaptiveReconnection: true
});

// Register connection state handler
client.on('connectionState', (state, reason, details) => {
  console.log(`Connection state: ${state}`, reason, details);
});

// Register message handler
client.on('message', (message) => {
  console.log('Received message:', message);
});

// Connect to WebSocket server
client.connect('wss://example.com/ws', {
  headers: {
    'Authorization': 'Bearer token123'
  }
})
  .then(() => {
    console.log('Connected to WebSocket server');
  })
  .catch(error => {
    console.error('Error connecting to WebSocket server:', error);
  });

// Send message with queue if disconnected
client.send({
  type: 'status_update',
  status: 'online'
}, true);

// Set network status
client.setNetworkStatus(false); // Offline
client.setNetworkStatus(true);  // Online

// Clean up when done
client.destroy();
```

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Check the network status and quality
2. Verify that the WebSocket server is running and accessible
3. Check authentication tokens and ensure they are valid
4. Review the logs for connection errors and state transitions
5. Verify that the WebSocket URL is correct
6. Check for firewall or proxy issues that might block WebSocket connections

### Reconnection Issues

If reconnection is not working as expected:

1. Check the network status and quality
2. Verify that the maximum reconnection attempts have not been reached
3. Check the logs for reconnection attempts and failures
4. Verify that the WebSocket server is accepting reconnection attempts
5. Check for authentication token expiration

### Heartbeat Issues

If heartbeat is not working as expected:

1. Verify that the heartbeat interval and timeout are appropriate for your network conditions
2. Check the logs for heartbeat messages and responses
3. Verify that the WebSocket server is responding to heartbeat messages
4. Check for network latency issues that might affect heartbeat timing

## Conclusion

These improvements to the WebSocket reconnection handling provide a more robust and reliable connection between the various components of the MedTranslate AI system. The enhanced reconnection logic, improved connection state management, and better heartbeat mechanism work together to ensure that connections are maintained even in challenging network conditions.
