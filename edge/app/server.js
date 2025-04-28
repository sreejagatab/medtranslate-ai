/**
 * MedTranslate AI Edge Application Server
 *
 * This server provides edge computing capabilities for the MedTranslate AI system,
 * including local translation, caching, and synchronization with the cloud.
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { translateLocally, initialize: initTranslation, getSupportedLanguagePairs } = require('./translation');
const { syncWithCloud } = require('./sync');
const { cacheManager } = require('./cache');

// Initialize express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3000;
const VERSION = process.env.VERSION || '1.0.0';
const DEVICE_ID = process.env.DEVICE_ID || `medtranslate-edge-${Math.random().toString(36).substring(2, 10)}`;

// Application state
let isOnline = false;
let isInitialized = false;
let supportedLanguagePairs = [];
let connectionCheckInterval;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    onlineStatus: isOnline ? 'connected' : 'offline',
    initialized: isInitialized,
    modelStatus: isInitialized ? 'loaded' : 'loading',
    supportedLanguagePairs,
    deviceId: DEVICE_ID,
    version: VERSION,
    timestamp: new Date().toISOString()
  });
});

// Translation endpoint
app.post('/translate', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage, context } = req.body;

    // Check cache first
    const cachedTranslation = cacheManager.getCachedTranslation(
      text, sourceLanguage, targetLanguage, context
    );

    if (cachedTranslation) {
      return res.json({
        translatedText: cachedTranslation.translatedText,
        confidence: cachedTranslation.confidence,
        source: 'cache'
      });
    }

    // Perform local translation
    const result = await translateLocally(text, sourceLanguage, targetLanguage, context);

    // Cache the result
    cacheManager.cacheTranslation(
      text, sourceLanguage, targetLanguage, context, result
    );

    // Try to sync with cloud if online
    if (isOnline) {
      syncWithCloud.queueTranslation(text, sourceLanguage, targetLanguage, context, result);
    }

    res.json({
      ...result,
      source: 'local'
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Audio translation endpoint
app.post('/translate-audio', async (req, res) => {
  try {
    const { audioData, sourceLanguage, targetLanguage, context } = req.body;

    if (!audioData || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        error: 'Missing required parameters: audioData, sourceLanguage, targetLanguage'
      });
    }

    // Process audio locally
    const result = await translateLocally.processAudio(
      audioData, sourceLanguage, targetLanguage, context
    );

    res.json({
      ...result,
      source: 'local'
    });
  } catch (error) {
    console.error('Audio translation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time translation
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'translate') {
        const result = await translateLocally(
          data.text,
          data.sourceLanguage,
          data.targetLanguage,
          data.context
        );

        ws.send(JSON.stringify({
          type: 'translation',
          requestId: data.requestId,
          result
        }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Additional endpoints
app.get('/languages', (req, res) => {
  res.json({
    supported: supportedLanguagePairs
  });
});

app.get('/sync/status', (req, res) => {
  res.json({
    ...syncWithCloud.getSyncStatus(),
    isOnline
  });
});

app.post('/sync/force', async (req, res) => {
  try {
    const result = await syncWithCloud.syncCachedData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post('/models/update', async (req, res) => {
  try {
    const result = await syncWithCloud.checkForModelUpdates();

    // If new models were downloaded, refresh the language pairs
    if (result.success && result.updatesDownloaded > 0) {
      supportedLanguagePairs = getSupportedLanguagePairs();
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post('/cache/clear', (req, res) => {
  try {
    cacheManager.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Initialize components and start server
async function startServer() {
  try {
    console.log('Initializing MedTranslate Edge Application...');

    // Initialize translation module
    console.log('Initializing translation module...');
    const translationResult = await initTranslation();
    if (translationResult.success) {
      supportedLanguagePairs = getSupportedLanguagePairs();
      console.log(`Translation module initialized with ${supportedLanguagePairs.length} language pairs`);
    } else {
      console.error('Failed to initialize translation module:', translationResult.error);
    }

    // Initialize sync module
    console.log('Initializing sync module...');
    await syncWithCloud.initialize();

    // Start server
    server.listen(PORT, () => {
      console.log(`Edge application server running on port ${PORT}`);
      isInitialized = true;

      // Initial cloud connection check
      checkCloudConnection();

      // Start periodic connection checks
      connectionCheckInterval = setInterval(checkCloudConnection, 30000);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Check cloud connectivity
async function checkCloudConnection() {
  try {
    const result = await syncWithCloud.testConnection();
    isOnline = result.connected;

    if (isOnline) {
      // If we're online, sync cached data
      syncWithCloud.syncCachedData();
    }

    console.log(`Cloud connection status: ${isOnline ? 'online' : 'offline'}`);
  } catch (error) {
    isOnline = false;
    console.error('Error checking cloud connection:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();
