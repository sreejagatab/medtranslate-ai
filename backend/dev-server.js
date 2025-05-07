/**
 * MedTranslate AI Development Server
 *
 * This server provides a local development environment for testing
 * the MedTranslate AI application without requiring AWS services.
 *
 * Enhanced with:
 * - Multi-factor authentication
 * - Secure session management
 * - Role-based access control
 * - Request logging
 */

require('dotenv').config({ path: '.env.development' });
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Import routes and middleware
const authRoutes = require('./auth/auth-routes');
const enhancedAuthRoutes = require('./auth/enhanced-auth-controller');
const translationRoutes = require('./translation/translation-routes');
const storageHandler = require('./lambda/storage/handler');
const websocketServer = require('./websocket/server');
const { logger, requestLogger } = require('./utils/logger');
const rbac = require('./auth/rbac');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket server
const wss = websocketServer.initializeWebSocketServer(server);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: ['http://localhost:3003', 'http://localhost:3004', 'http://localhost:19000', 'http://localhost:19001', 'http://localhost:19002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(requestLogger); // Add request logging

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

// Initialize RBAC system
rbac.initialize()
  .then(result => {
    logger.info('RBAC system initialization result:', result);
  })
  .catch(error => {
    logger.error('Error initializing RBAC system:', error);
  });

// Auth routes - both legacy and enhanced
app.use('/auth', authRoutes); // Legacy auth routes
app.use('/auth/enhanced', enhancedAuthRoutes); // Enhanced auth routes with MFA and session management

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

  // Legacy endpoints
  console.log('\nLegacy Authentication:');
  console.log('- POST /auth/login');
  console.log('- POST /auth/register');
  console.log('- POST /auth/verify');

  // Enhanced authentication endpoints
  console.log('\nEnhanced Authentication:');
  console.log('- POST /auth/enhanced/login (with MFA support)');
  console.log('- POST /auth/enhanced/register');
  console.log('- POST /auth/enhanced/refresh');
  console.log('- POST /auth/enhanced/logout');
  console.log('- POST /auth/enhanced/mfa/setup');
  console.log('- POST /auth/enhanced/mfa/verify');
  console.log('- POST /auth/enhanced/mfa/disable');
  console.log('- POST /auth/enhanced/mfa/backup-codes');
  console.log('- GET  /auth/enhanced/sessions');
  console.log('- DELETE /auth/enhanced/sessions/:sessionId');
  console.log('- DELETE /auth/enhanced/sessions');

  // Session endpoints
  console.log('\nSession Management:');
  console.log('- POST /sessions');
  console.log('- POST /sessions/join');
  console.log('- POST /sessions/patient-token');
  console.log('- POST /sessions/:sessionId/end');
  console.log('- GET  /sessions/:sessionId/participants');
  console.log('- POST /sessions/:sessionId/broadcast');
  console.log('- POST /sessions/:sessionId/close');

  // Translation endpoints
  console.log('\nTranslation:');
  console.log('- POST /translate/text');
  console.log('- POST /translate/audio');

  // Storage endpoints
  console.log('\nStorage:');
  console.log('- POST /storage/transcript');
  console.log('- GET  /storage/sessions/:sessionId');

  // System endpoints
  console.log('\nSystem:');
  console.log('- GET  /health');
});
