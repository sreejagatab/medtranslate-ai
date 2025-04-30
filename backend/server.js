/**
 * MedTranslate AI Backend Development Server
 *
 * This is a simple Express server for local development.
 * In production, the API is deployed as AWS Lambda functions.
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import handlers
const authHandler = require('./lambda/auth/handler');
const translationHandler = require('./lambda/translation/handler');
const storageHandler = require('./lambda/storage/handler');

// Import routes
const monitoringRoutes = require('./routes/monitoring-routes');
const medicalTerminologyRoutes = require('./routes/medicalTerminologyRoutes');

// Create Express app
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3003', 'http://localhost:3004', 'http://localhost:19000', 'http://localhost:19001', 'http://localhost:19002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Active sessions
const activeSessions = new Map();

// Helper function to convert Lambda handler to Express middleware
const lambdaToExpress = (handler) => async (req, res) => {
  try {
    // Convert Express request to Lambda event
    const event = {
      httpMethod: req.method,
      path: req.path,
      pathParameters: req.params,
      queryStringParameters: req.query,
      headers: req.headers,
      body: JSON.stringify(req.body)
    };

    // Call Lambda handler
    const result = await handler(event);

    // Convert Lambda response to Express response
    res.status(result.statusCode).set(result.headers).send(JSON.parse(result.body));
  } catch (error) {
    console.error('Error in Lambda handler:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Auth routes
app.post('/auth/login', lambdaToExpress(authHandler.login));
app.post('/auth/register', lambdaToExpress(authHandler.register));
app.post('/auth/verify', lambdaToExpress(authHandler.verifyToken));

// User management routes
app.get('/users', lambdaToExpress(authHandler.getUsers));
app.put('/users/:userId', lambdaToExpress(authHandler.updateUser));

// Session routes
app.post('/sessions', lambdaToExpress(authHandler.createSession));
app.post('/sessions/join', lambdaToExpress(authHandler.joinSession));
app.post('/sessions/patient-token', lambdaToExpress(authHandler.generatePatientToken));
app.post('/sessions/:sessionId/end', lambdaToExpress(authHandler.endSession));

// Translation routes
app.post('/translate/text', lambdaToExpress(translationHandler.translateText));
app.post('/translate/audio', lambdaToExpress(translationHandler.translateAudio));

// Storage routes
app.post('/storage/transcript', lambdaToExpress(storageHandler.storeTranscript));
app.get('/storage/sessions/:sessionId', lambdaToExpress(storageHandler.getSessionData));

// Monitoring routes
app.use('/monitoring', monitoringRoutes);

// Medical terminology routes
app.use('/api/medical-terminology', medicalTerminologyRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MedTranslate AI API Server',
    version: '1.0.0',
    endpoints: {
      auth: [
        '/auth/login',
        '/auth/register',
        '/auth/verify'
      ],
      users: [
        '/users',
        '/users/:userId'
      ],
      sessions: [
        '/sessions',
        '/sessions/join',
        '/sessions/patient-token',
        '/sessions/:sessionId/end'
      ],
      translation: [
        '/translate/text',
        '/translate/audio'
      ],
      storage: [
        '/storage/transcript',
        '/storage/sessions/:sessionId'
      ],
      monitoring: [
        '/monitoring/health',
        '/monitoring/performance',
        '/monitoring/resources',
        '/monitoring/alerts'
      ],
      medicalTerminology: [
        '/api/medical-terminology',
        '/api/medical-terminology/:id',
        '/api/medical-terminology/:id/translations',
        '/api/medical-terminology/specialty/:specialty',
        '/api/medical-terminology/category/:category'
      ],
      system: [
        '/health'
      ]
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// WebSocket connection
wss.on('connection', (ws, req) => {
  // Extract session ID and token from URL
  const url = new URL(req.url, 'http://localhost');
  const sessionId = url.pathname.split('/').pop();
  const token = url.searchParams.get('token');

  // Validate token
  try {
    // In development, we'll use a simple secret
    const secret = process.env.JWT_SECRET || 'local-development-secret';
    const decoded = jwt.verify(token, secret);

    // Add client to session
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Set());
    }
    activeSessions.get(sessionId).add(ws);

    // Set client properties
    ws.sessionId = sessionId;
    ws.userId = decoded.sub;
    ws.userType = decoded.type;

    console.log(`Client connected to session ${sessionId}: ${decoded.type} ${decoded.sub}`);

    // Send patient joined message if this is a patient
    if (decoded.type === 'patient') {
      const message = {
        type: 'patient_joined',
        sessionId,
        language: decoded.language,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all clients in the session
      broadcastToSession(sessionId, message);
    }

    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        message.sessionId = sessionId;
        message.timestamp = new Date().toISOString();

        // Add message ID if not provided
        if (!message.messageId) {
          message.messageId = uuidv4();
        }

        // Broadcast to all clients in the session
        broadcastToSession(sessionId, message);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log(`Client disconnected from session ${sessionId}: ${decoded.type} ${decoded.sub}`);

      // Remove client from session
      if (activeSessions.has(sessionId)) {
        activeSessions.get(sessionId).delete(ws);

        // Send patient left message if this is a patient
        if (decoded.type === 'patient') {
          const message = {
            type: 'patient_left',
            sessionId,
            timestamp: new Date().toISOString()
          };

          // Broadcast to all clients in the session
          broadcastToSession(sessionId, message);
        }

        // Remove session if empty
        if (activeSessions.get(sessionId).size === 0) {
          activeSessions.delete(sessionId);
        }
      }
    });
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    ws.close();
  }
});

// Broadcast message to all clients in a session
function broadcastToSession(sessionId, message) {
  if (activeSessions.has(sessionId)) {
    const clients = activeSessions.get(sessionId);
    const messageStr = JSON.stringify(message);

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

// Start server
server.listen(port, () => {
  console.log(`MedTranslate AI backend server running on port ${port}`);
});
