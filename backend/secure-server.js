/**
 * MedTranslate AI Secure Backend Server
 *
 * This is a secure HTTPS server for production use.
 * It implements proper TLS configuration and security best practices.
 */

const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import handlers
const authHandler = require('./lambda/auth/handler');
const translationHandler = require('./lambda/translation/handler');
const storageHandler = require('./lambda/storage/handler');
const endToEndHandler = require('./lambda/monitoring/end-to-end-handler');

// Import routes
const monitoringRoutes = require('./routes/monitoring-routes');
const medicalTerminologyRoutes = require('./routes/medicalTerminologyRoutes');
const analyticsRoutes = require('./routes/analytics-routes');
const feedbackRoutes = require('./routes/feedback-routes');
const syncAnalyticsRoutes = require('./routes/sync-analytics-routes');
const cacheStatusRoutes = require('./routes/cache-status');
const systemStatusRoutes = require('./routes/system-status-routes');
const healthCheckRoutes = require('./routes/health-check-routes');

// Create Express app
const app = express();
const port = process.env.PORT || 4001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'same-origin' }
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to all requests
app.use(apiLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 
    ['https://provider.medtranslate.ai', 'https://patient.medtranslate.ai', 'https://admin.medtranslate.ai'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours in seconds
}));

// Body parser with size limit
app.use(express.json({ limit: '10mb' }));

// TLS configuration
const tlsOptions = {
  key: fs.readFileSync(process.env.TLS_KEY_PATH || path.join(__dirname, 'certs', 'server.key')),
  cert: fs.readFileSync(process.env.TLS_CERT_PATH || path.join(__dirname, 'certs', 'server.cert')),
  minVersion: 'TLSv1.2', // Require minimum TLS 1.2
  ciphers: [
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256'
  ].join(':'),
  honorCipherOrder: true,
  sessionTimeout: 300, // 5 minutes in seconds
  sessionTickets: false
};

// Create HTTPS server
const server = https.createServer(tlsOptions, app);

// Create WebSocket server with secure configuration
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
  }
});

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
app.post('/translate/feedback', lambdaToExpress(translationHandler.processFeedback));

// Storage routes
app.post('/storage/transcript', lambdaToExpress(storageHandler.storeTranscript));
app.get('/storage/sessions/:sessionId', lambdaToExpress(storageHandler.getSessionData));

// Monitoring routes
app.use('/monitoring', monitoringRoutes);

// End-to-end monitoring routes
app.post('/monitoring/transactions', lambdaToExpress(endToEndHandler.startTransaction));
app.put('/monitoring/transactions/:transactionId', lambdaToExpress(endToEndHandler.updateTransaction));
app.post('/monitoring/transactions/:transactionId/complete', lambdaToExpress(endToEndHandler.completeTransaction));
app.get('/monitoring/transactions/:transactionId', lambdaToExpress(endToEndHandler.getTransaction));
app.get('/monitoring/transactions/user/:userId', lambdaToExpress(endToEndHandler.getTransactionsByUser));
app.get('/monitoring/transactions/session/:sessionId', lambdaToExpress(endToEndHandler.getTransactionsBySession));
app.get('/monitoring/transactions/metrics', lambdaToExpress(endToEndHandler.getTransactionMetrics));

// Medical terminology routes
app.use('/api/medical-terminology', medicalTerminologyRoutes);

// Analytics routes
app.use('/api/analytics', analyticsRoutes);

// Sync analytics routes
app.use('/api/sync-analytics', syncAnalyticsRoutes);

// Cache status routes
app.use('/api/cache', cacheStatusRoutes);

// System status routes
app.use('/api/system', systemStatusRoutes);

// Feedback routes
app.use('/feedback', feedbackRoutes);

// Health check routes
app.use('/api/health', healthCheckRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MedTranslate AI Secure API Server',
    version: '1.0.0'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// WebSocket connection with secure token validation
wss.on('connection', (ws, req) => {
  // Extract session ID and token from URL
  const url = new URL(req.url, `https://${req.headers.host}`);
  const sessionId = url.pathname.split('/').pop();
  const token = url.searchParams.get('token');

  // Validate token
  try {
    // Use JWT secret from environment
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    // Verify with explicit options for enhanced security
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'], // Only accept tokens signed with HMAC SHA-256
      issuer: 'medtranslate-ai',
      audience: 'medtranslate-api',
      complete: true // Return the decoded header and payload
    });

    // Add client to session
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Set());
    }
    activeSessions.get(sessionId).add(ws);

    // Set client properties
    ws.sessionId = sessionId;
    ws.userId = decoded.payload.sub;
    ws.userType = decoded.payload.type;

    console.log(`Client connected to session ${sessionId}: ${decoded.payload.type} ${decoded.payload.sub}`);

    // Send patient joined message if this is a patient
    if (decoded.payload.type === 'patient') {
      const message = {
        type: 'patient_joined',
        sessionId,
        language: decoded.payload.language,
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
      console.log(`Client disconnected from session ${sessionId}: ${decoded.payload.type} ${decoded.payload.sub}`);

      // Remove client from session
      if (activeSessions.has(sessionId)) {
        activeSessions.get(sessionId).delete(ws);

        // Send patient left message if this is a patient
        if (decoded.payload.type === 'patient') {
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
  console.log(`MedTranslate AI secure backend server running on port ${port}`);
});
