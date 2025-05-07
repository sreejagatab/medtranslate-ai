/**
 * Mock Edge Server for Testing
 *
 * This server simulates the edge application server for testing purposes.
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Create app
const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3003;
const SYNC_DIR = path.join(__dirname, '../sync');
const QUEUE_DIR = path.join(__dirname, '../queue');

// Ensure directories exist
for (const dir of [SYNC_DIR, QUEUE_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Mock state
let isOnline = true;
let syncQueue = [];
let lastSyncTime = Date.now();
let lastSyncStatus = 'success';

// Middleware
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    onlineStatus: isOnline ? 'connected' : 'offline',
    initialized: true,
    modelStatus: 'loaded',
    supportedLanguagePairs: ['en-es', 'en-fr', 'es-en', 'fr-en'],
    deviceId: 'mock-edge-device',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    network: {
      online: isOnline,
      lastOnlineTime: isOnline ? new Date().toISOString() : null,
      lastOfflineTime: !isOnline ? new Date().toISOString() : null,
      reconnecting: false,
      connectionAttempts: 0
    },
    sync: {
      enabled: true,
      inProgress: false,
      lastSyncTime: lastSyncTime ? new Date(lastSyncTime).toISOString() : null,
      lastSyncStatus,
      queueSize: syncQueue.length
    },
    cache: {
      size: 256,
      items: 42,
      hitRate: 0.85
    }
  });
});

// Sync status endpoint
app.get('/sync/status', (req, res) => {
  res.json({
    enabled: true,
    inProgress: false,
    lastSyncTime: lastSyncTime ? new Date(lastSyncTime).toISOString() : null,
    lastSyncStatus,
    queueSize: syncQueue.length,
    isOnline,
    connected: isOnline,
    network: {
      online: isOnline,
      lastOnlineTime: isOnline ? new Date().toISOString() : null,
      lastOfflineTime: !isOnline ? new Date().toISOString() : null,
      reconnecting: false,
      connectionAttempts: 0
    },
    timestamp: new Date().toISOString()
  });
});

// Sync queue endpoint
app.get('/sync/queue', (req, res) => {
  res.json({
    success: true,
    queueSize: syncQueue.length,
    queueItems: syncQueue.map(item => ({
      id: item.id,
      timestamp: item.timestamp,
      type: item.type
    })),
    timestamp: new Date().toISOString()
  });
});

// Force sync endpoint
app.post('/sync/force', (req, res) => {
  // Update sync status
  lastSyncTime = Date.now();
  lastSyncStatus = 'success';

  // Get queue size before sync
  const queueSizeBefore = syncQueue.length;

  // Clear queue if online
  if (isOnline) {
    syncQueue = [];
  }

  res.json({
    success: true,
    itemsSynced: queueSizeBefore,
    failedItems: 0,
    timestamp: new Date().toISOString()
  });
});

// Translation endpoint
app.post('/translate', (req, res) => {
  const { text, sourceLanguage, targetLanguage, context } = req.body;

  // Simple mock translations
  const translations = {
    'en-es': {
      'Hello, how are you feeling today?': '¿Hola, cómo te sientes hoy?',
      'I have a headache': 'Tengo dolor de cabeza',
      'I have a fever': 'Tengo fiebre',
      'My throat hurts': 'Me duele la garganta',
      'I feel dizzy': 'Me siento mareado'
    },
    'en-fr': {
      'Hello, how are you feeling today?': 'Bonjour, comment vous sentez-vous aujourd\'hui?',
      'I have a headache': 'J\'ai mal à la tête',
      'I have a fever': 'J\'ai de la fièvre',
      'My throat hurts': 'J\'ai mal à la gorge',
      'I feel dizzy': 'Je me sens étourdi'
    }
  };

  const langPair = `${sourceLanguage}-${targetLanguage}`;
  let translatedText = '';

  if (translations[langPair] && translations[langPair][text]) {
    translatedText = translations[langPair][text];
  } else {
    // Fallback mock translation
    translatedText = `[${targetLanguage}] ${text}`;
  }

  // Add to sync queue if offline
  if (!isOnline) {
    syncQueue.push({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      timestamp: Date.now(),
      type: 'translation',
      data: {
        text,
        sourceLanguage,
        targetLanguage,
        context
      }
    });
  }

  res.json({
    translatedText,
    confidence: 0.92,
    source: 'local',
    sourceLanguage,
    targetLanguage,
    context
  });
});

// Model update endpoint
app.post('/models/update', (req, res) => {
  res.json({
    success: true,
    updatesAvailable: 2,
    updatesDownloaded: isOnline ? 2 : 0,
    modelsChecked: 4
  });
});

// Set online/offline status
app.post('/network/status', (req, res) => {
  const { online } = req.body;
  isOnline = online !== undefined ? online : isOnline;

  res.json({
    success: true,
    online: isOnline
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Mock edge server running on port ${PORT}`);
});

// Export for testing
module.exports = {
  server,
  app,
  setOnlineStatus: (status) => {
    isOnline = status;
  },
  getQueueSize: () => syncQueue.length,
  clearQueue: () => {
    syncQueue = [];
  }
};

// Handle termination
process.on('SIGINT', () => {
  console.log('Shutting down mock edge server');
  server.close(() => {
    process.exit(0);
  });
});

// Run if executed directly
if (require.main === module) {
  // Keep server running
  console.log('Press Ctrl+C to stop the server');
}
