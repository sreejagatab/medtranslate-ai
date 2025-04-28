/**
 * Web Server for MedTranslate AI Edge Application
 * 
 * This server provides a simple way to serve the edge application
 * for development and testing.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { translateLocally } = require('./translation');
const { cacheManager } = require('./cache');
const syncWithCloud = require('./sync');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    onlineStatus: 'connected',
    modelStatus: 'loaded',
    version: '1.0.0'
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

    // Queue for sync with cloud
    syncWithCloud.queueTranslation(
      text, sourceLanguage, targetLanguage, context, result
    );

    res.json({
      ...result,
      source: 'local'
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      error: 'Translation failed',
      message: error.message
    });
  }
});

// Audio translation endpoint
app.post('/translate/audio', async (req, res) => {
  try {
    const { audioData, sourceLanguage, targetLanguage, context } = req.body;

    // Process audio
    const result = await processAudio(audioData, sourceLanguage, targetLanguage, context);

    res.json(result);
  } catch (error) {
    console.error('Audio translation error:', error);
    res.status(500).json({
      error: 'Audio translation failed',
      message: error.message
    });
  }
});

// Sync status endpoint
app.get('/sync/status', (req, res) => {
  res.json(syncWithCloud.getSyncStatus());
});

// Start server
app.listen(PORT, () => {
  console.log(`MedTranslate AI Edge server running on port ${PORT}`);
});
