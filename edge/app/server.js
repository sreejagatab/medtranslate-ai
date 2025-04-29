/**
 * MedTranslate AI Edge Application Server
 *
 * This server provides edge computing capabilities for the MedTranslate AI system,
 * including local translation, caching, and synchronization with the cloud.
 * Features enhanced offline mode detection and automatic reconnection.
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { translateLocally, initialize: initTranslation, getSupportedLanguagePairs, processAudio } = require('./translation');
const { syncWithCloud } = require('./sync');
const { cacheManager } = require('./cache');
const networkMonitor = require('./network-monitor');

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
  const networkStatus = networkMonitor.getNetworkStatus();

  res.json({
    status: 'healthy',
    onlineStatus: isOnline ? 'connected' : 'offline',
    initialized: isInitialized,
    modelStatus: isInitialized ? 'loaded' : 'loading',
    supportedLanguagePairs,
    deviceId: DEVICE_ID,
    version: VERSION,
    timestamp: new Date().toISOString(),
    network: {
      online: networkStatus.online,
      lastOnlineTime: networkStatus.lastOnlineTime ? new Date(networkStatus.lastOnlineTime).toISOString() : null,
      lastOfflineTime: networkStatus.lastOfflineTime ? new Date(networkStatus.lastOfflineTime).toISOString() : null,
      reconnecting: networkStatus.reconnecting,
      connectionAttempts: networkStatus.connectionAttempts
    },
    cache: cacheManager.getCacheStats()
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
    const { audioData, sourceLanguage, targetLanguage, context, useCache = true } = req.body;

    if (!audioData || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        error: 'Missing required parameters: audioData, sourceLanguage, targetLanguage'
      });
    }

    // Generate a hash of the audio data for caching
    const crypto = require('crypto');
    const audioHash = crypto.createHash('md5').update(audioData).digest('hex');
    const cacheKey = `audio:${audioHash}:${sourceLanguage}:${targetLanguage}:${context || 'general'}`;

    // Check cache if enabled
    if (useCache) {
      const cachedResult = await cacheManager.get('audio', cacheKey);
      if (cachedResult) {
        console.log(`Using cached audio translation for: ${cacheKey}`);
        return res.json({
          ...cachedResult,
          source: 'cache',
          fromCache: true
        });
      }
    }

    // Process audio locally
    const result = await processAudio(
      audioData, sourceLanguage, targetLanguage, context, useCache
    );

    // Cache the result
    if (useCache) {
      const audioTtl = 3600; // 1 hour TTL for audio translations
      await cacheManager.set('audio', cacheKey, result, audioTtl);
    }

    // Queue for sync with cloud if online
    if (isOnline) {
      syncWithCloud.queueAudioTranslation(
        audioHash, sourceLanguage, targetLanguage, context, result
      );
    }

    res.json({
      ...result,
      source: 'local',
      networkStatus: {
        online: isOnline
      }
    });
  } catch (error) {
    console.error('Audio translation error:', error);
    res.status(500).json({
      error: error.message,
      networkStatus: {
        online: isOnline
      }
    });
  }
});

// Audio file upload endpoint
app.post('/translate-audio/upload', async (req, res) => {
  try {
    const multer = require('multer');
    const upload = multer({ dest: 'temp/' });

    // Handle file upload
    upload.single('audio')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }

      const { sourceLanguage, targetLanguage, context } = req.body;

      if (!sourceLanguage || !targetLanguage) {
        return res.status(400).json({
          error: 'Missing required parameters: sourceLanguage, targetLanguage'
        });
      }

      // Read file as base64
      const fs = require('fs');
      const audioData = fs.readFileSync(req.file.path, { encoding: 'base64' });

      // Process audio
      const result = await processAudio(
        audioData, sourceLanguage, targetLanguage, context
      );

      // Clean up temporary file
      fs.unlinkSync(req.file.path);

      res.json({
        ...result,
        source: 'local',
        networkStatus: {
          online: isOnline
        }
      });
    });
  } catch (error) {
    console.error('Audio file upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time translation
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // Send initial network status
  ws.send(JSON.stringify({
    type: 'network_status',
    online: isOnline,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'translate') {
        // Check cache first
        const cachedTranslation = cacheManager.getCachedTranslation(
          data.text,
          data.sourceLanguage,
          data.targetLanguage,
          data.context
        );

        if (cachedTranslation) {
          ws.send(JSON.stringify({
            type: 'translation',
            requestId: data.requestId,
            result: {
              translatedText: cachedTranslation.translatedText,
              confidence: cachedTranslation.confidence,
              sourceLanguage: data.sourceLanguage,
              targetLanguage: data.targetLanguage,
              context: data.context,
              source: 'cache'
            }
          }));
          return;
        }

        // Perform local translation
        const result = await translateLocally(
          data.text,
          data.sourceLanguage,
          data.targetLanguage,
          data.context
        );

        // Cache the result
        cacheManager.cacheTranslation(
          data.text,
          data.sourceLanguage,
          data.targetLanguage,
          data.context,
          result
        );

        // Try to sync with cloud if online
        if (isOnline) {
          syncWithCloud.queueTranslation(
            data.text,
            data.sourceLanguage,
            data.targetLanguage,
            data.context,
            result
          );
        }

        ws.send(JSON.stringify({
          type: 'translation',
          requestId: data.requestId,
          result: {
            ...result,
            source: 'local'
          }
        }));
      } else if (data.type === 'translate_audio') {
        // Process audio translation
        const result = await processAudio(
          data.audioData,
          data.sourceLanguage,
          data.targetLanguage,
          data.context
        );

        ws.send(JSON.stringify({
          type: 'audio_translation',
          requestId: data.requestId,
          result
        }));
      } else if (data.type === 'network_check') {
        // Send current network status
        ws.send(JSON.stringify({
          type: 'network_status',
          online: isOnline,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        requestId: data?.requestId,
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

app.get('/network/status', (req, res) => {
  const networkStatus = networkMonitor.getNetworkStatus();

  res.json({
    online: isOnline,
    lastOnlineTime: networkStatus.lastOnlineTime ? new Date(networkStatus.lastOnlineTime).toISOString() : null,
    lastOfflineTime: networkStatus.lastOfflineTime ? new Date(networkStatus.lastOfflineTime).toISOString() : null,
    reconnecting: networkStatus.reconnecting,
    connectionAttempts: networkStatus.connectionAttempts,
    networkInterfaces: networkStatus.networkInterfaces
  });
});

app.post('/network/reconnect', (req, res) => {
  // Force a network connectivity check
  networkMonitor.checkConnectivity()
    .then(status => {
      res.json({
        success: true,
        online: status.online,
        reason: status.reason
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        error: error.message
      });
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

    // Initialize cache manager
    console.log('Initializing cache manager...');
    await cacheManager.initialize();

    // Initialize network monitor
    console.log('Initializing network monitor...');
    await networkMonitor.initialize();

    // Register network event listeners
    networkMonitor.on('online', handleOnlineStatus);
    networkMonitor.on('offline', handleOfflineStatus);

    // Initialize sync module
    console.log('Initializing sync module...');
    await syncWithCloud.initialize();

    // Start server
    server.listen(PORT, () => {
      console.log(`Edge application server running on port ${PORT}`);
      isInitialized = true;

      // Get initial network status
      const networkStatus = networkMonitor.getNetworkStatus();
      isOnline = networkStatus.online;
      console.log(`Initial network status: ${isOnline ? 'Online' : 'Offline'}`);

      // If online, sync with cloud
      if (isOnline) {
        syncWithCloud.syncCachedData();
      }
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Handle online status
function handleOnlineStatus(data) {
  console.log(`Network is online (${new Date(data.timestamp).toISOString()})`);
  isOnline = true;

  // Notify connected clients
  broadcastNetworkStatus();

  // Sync with cloud
  syncWithCloud.syncCachedData()
    .then(result => {
      console.log(`Synced ${result.itemsSynced || 0} items with cloud`);
    })
    .catch(error => {
      console.error('Error syncing with cloud:', error);
    });

  // Check for model updates
  syncWithCloud.checkForModelUpdates()
    .then(result => {
      if (result.success && result.updatesAvailable > 0) {
        console.log(`Downloaded ${result.updatesDownloaded} model updates`);
        // Refresh supported language pairs
        supportedLanguagePairs = getSupportedLanguagePairs();
      }
    })
    .catch(error => {
      console.error('Error checking for model updates:', error);
    });
}

// Handle offline status
function handleOfflineStatus(data) {
  console.log(`Network is offline: ${data.reason} (${new Date(data.timestamp).toISOString()})`);
  isOnline = false;

  // Notify connected clients
  broadcastNetworkStatus();
}

// Broadcast network status to all connected WebSocket clients
function broadcastNetworkStatus() {
  const status = {
    type: 'network_status',
    online: isOnline,
    timestamp: new Date().toISOString()
  };

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(status));
    }
  });
}

// Graceful shutdown
function shutdown() {
  console.log('Shutting down MedTranslate Edge Application...');

  // Remove network event listeners
  networkMonitor.off('online', handleOnlineStatus);
  networkMonitor.off('offline', handleOfflineStatus);

  // Save cache to disk
  cacheManager.saveCacheToDisk();

  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds if server doesn't close gracefully
  setTimeout(() => {
    console.log('Forcing exit after timeout');
    process.exit(1);
  }, 5000);
}

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  shutdown();
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  shutdown();
});

// Start the server
startServer();
