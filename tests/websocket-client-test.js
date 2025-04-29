const WebSocket = require('ws');

// Create WebSocket connection
const ws = new WebSocket('ws://localhost:3002/ws');

// Connection opened
ws.on('open', function() {
  console.log('WebSocket connection opened');
  
  // Send a message
  ws.send(JSON.stringify({
    type: 'test',
    message: 'Hello from WebSocket test client'
  }));
});

// Listen for messages
ws.on('message', function(data) {
  console.log('Message received:', data.toString());
});

// Handle errors
ws.on('error', function(error) {
  console.error('WebSocket error:', error.message);
});

// Connection closed
ws.on('close', function() {
  console.log('WebSocket connection closed');
});

// Keep the process running for a while
setTimeout(() => {
  console.log('Test completed');
  ws.close();
  process.exit(0);
}, 5000);
