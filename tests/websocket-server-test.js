const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({
  server,
  path: '/ws'
});

// Handle WebSocket connection
wss.on('connection', (ws, req) => {
  console.log('WebSocket connection received:', req.url);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Welcome to the WebSocket server'
  }));

  // Handle messages
  ws.on('message', (message) => {
    console.log('Message received:', message.toString());

    // Parse the message
    const data = JSON.parse(message.toString());

    // Broadcast the message to all clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Start server
const PORT = 3002;
server.listen(PORT, () => {
  console.log(`WebSocket server running at ws://localhost:${PORT}/ws`);
});
