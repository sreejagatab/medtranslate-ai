/**
 * MedTranslate AI Development Server
 *
 * This server provides a local development environment for testing
 * the MedTranslate AI application without requiring AWS services.
 */

require('dotenv').config({ path: '.env.development' });
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./auth/auth-routes');
const translationRoutes = require('./translation/translation-routes');
const storageHandler = require('./lambda/storage/handler');
const websocketServer = require('./websocket/server');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket server
const wss = websocketServer.initializeWebSocketServer(server);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Convert Lambda handler to Express middleware
function lambdaToExpress(handler) {
  return async (req, res) => {
    try {
      // Create Lambda event from Express request
      const event = {
        body: JSON.stringify(req.body),
        pathParameters: req.params,
        queryStringParameters: req.query,
        headers: req.headers,
        httpMethod: req.method
      };

      // Call Lambda handler
      const result = await handler(event);

      // Send response
      res.status(result.statusCode).json(JSON.parse(result.body));
    } catch (error) {
      console.error('Error in handler:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Auth routes
app.use('/auth', authRoutes);

// Translation routes
app.use('/translate', translationRoutes);

// Storage routes
app.post('/storage/transcript', lambdaToExpress(storageHandler.storeTranscript));
app.get('/storage/sessions/:sessionId', lambdaToExpress(storageHandler.getSessionData));

// WebSocket routes
app.get('/sessions/:sessionId/participants', (req, res) => {
  const sessionId = req.params.sessionId;
  const participants = websocketServer.getSessionParticipants(sessionId);
  res.json({ participants });
});

app.post('/sessions/:sessionId/broadcast', (req, res) => {
  const sessionId = req.params.sessionId;
  const message = req.body;

  websocketServer.broadcastToSession(sessionId, message);
  res.json({ success: true });
});

app.post('/sessions/:sessionId/close', (req, res) => {
  const sessionId = req.params.sessionId;
  const reason = req.body.reason || 'Session ended by administrator';

  websocketServer.closeSession(sessionId, reason);
  res.json({ success: true });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    websocket: {
      status: 'active',
      connections: wss.clients.size
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`MedTranslate AI development server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`WebSocket server running at ws://localhost:${PORT}/ws`);
  console.log('Available endpoints:');
  console.log('- POST /auth/login');
  console.log('- POST /sessions');
  console.log('- POST /sessions/join');
  console.log('- POST /sessions/patient-token');
  console.log('- POST /sessions/:sessionId/end');
  console.log('- POST /translate/text');
  console.log('- POST /translate/audio');
  console.log('- POST /storage/transcript');
  console.log('- GET /storage/sessions/:sessionId');
  console.log('- GET /sessions/:sessionId/participants');
  console.log('- POST /sessions/:sessionId/broadcast');
  console.log('- POST /sessions/:sessionId/close');
  console.log('- GET /health');
});
