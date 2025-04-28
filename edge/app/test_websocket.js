const WebSocket = require('ws');

// Create WebSocket connection
const ws = new WebSocket('ws://localhost:3000');

// Connection opened
ws.on('open', function() {
  console.log('Connected to WebSocket server');
  
  // Send a translation request
  ws.send(JSON.stringify({
    type: 'translate',
    requestId: 'test-request-1',
    text: 'Hello, how are you?',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    context: 'general'
  }));
});

// Listen for messages
ws.on('message', function(data) {
  console.log('Received message from server:');
  console.log(JSON.parse(data));
  
  // Close the connection after receiving a response
  ws.close();
});

// Handle errors
ws.on('error', function(error) {
  console.error('WebSocket error:', error);
});

// Connection closed
ws.on('close', function() {
  console.log('Connection closed');
  process.exit(0);
});
