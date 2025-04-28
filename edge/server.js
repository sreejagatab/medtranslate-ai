/**
 * Edge Server for MedTranslate AI
 * 
 * This server provides edge computing capabilities for the MedTranslate AI application,
 * including local translation, caching, and synchronization with the cloud.
 */

require('dotenv').config({ path: '.env.development' });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Import edge modules
const { cacheManager } = require('./app/cache');
const translation = require('./app/translation');
const { syncWithCloud } = require('./app/sync');

// Create Express app
const app = express();
const PORT = process.env.EDGE_PORT || 3002;

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, 'temp'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize edge modules
async function initializeEdgeModules() {
  try {
    console.log('Initializing edge modules...');
    
    // Initialize translation module
    const translationResult = await translation.initialize();
    if (!translationResult.success) {
      console.error('Failed to initialize translation module:', translationResult.error);
    }
    
    // Initialize sync module
    const syncResult = await syncWithCloud.initialize();
    if (!syncResult.success) {
      console.error('Failed to initialize sync module:', syncResult.error);
    }
    
    console.log('Edge modules initialized successfully');
  } catch (error) {
    console.error('Error initializing edge modules:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    modules: {
      translation: translation.isInitialized || false,
      sync: syncWithCloud.getSyncStatus()
    }
  });
});

// Text translation endpoint
app.post('/translate', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage, context } = req.body;
    
    // Validate required parameters
    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: text, sourceLanguage, targetLanguage'
      });
    }
    
    // Check cache first
    const cachedResult = cacheManager.getCachedTranslation(
      text, sourceLanguage, targetLanguage, context
    );
    
    if (cachedResult) {
      console.log('Cache hit for translation');
      return res.json({
        success: true,
        originalText: text,
        translatedText: cachedResult.translatedText,
        confidence: cachedResult.confidence,
        sourceLanguage,
        targetLanguage,
        context,
        fromCache: true
      });
    }
    
    // Perform local translation
    const result = await translation.translateLocally(
      text, sourceLanguage, targetLanguage, context
    );
    
    // Cache the result
    cacheManager.cacheTranslation(
      text, sourceLanguage, targetLanguage, context, result
    );
    
    // Queue for sync with cloud
    syncWithCloud.queueTranslation(
      text, sourceLanguage, targetLanguage, context, result
    );
    
    return res.json({
      success: true,
      originalText: result.originalText,
      translatedText: result.translatedText,
      confidence: result.confidence,
      sourceLanguage,
      targetLanguage,
      context,
      processingTime: result.processingTime,
      fromCache: false
    });
  } catch (error) {
    console.error('Error in text translation:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Audio translation endpoint
app.post('/translate/audio', async (req, res) => {
  try {
    const { audioData, sourceLanguage, targetLanguage, context } = req.body;
    
    // Validate required parameters
    if (!audioData || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: audioData, sourceLanguage, targetLanguage'
      });
    }
    
    // Process audio for translation
    const result = await translation.processAudio(
      audioData, sourceLanguage, targetLanguage, context
    );
    
    // Cache the text translation result
    cacheManager.cacheTranslation(
      result.originalText, sourceLanguage, targetLanguage, context, {
        translatedText: result.translatedText,
        confidence: result.confidence
      }
    );
    
    // Queue for sync with cloud
    syncWithCloud.queueTranslation(
      result.originalText, sourceLanguage, targetLanguage, context, {
        translatedText: result.translatedText,
        confidence: result.confidence
      }
    );
    
    return res.json({
      success: true,
      originalText: result.originalText,
      translatedText: result.translatedText,
      confidence: result.confidence,
      audioResponse: result.audioResponse,
      audioFormat: result.audioFormat,
      sourceLanguage,
      targetLanguage,
      context,
      processingTime: result.processingTime
    });
  } catch (error) {
    console.error('Error in audio translation:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Audio file upload endpoint
app.post('/translate/audio/upload', upload.single('audio'), async (req, res) => {
  try {
    const { sourceLanguage, targetLanguage, context } = req.body;
    const audioFile = req.file;
    
    // Validate required parameters
    if (!audioFile || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: audio file, sourceLanguage, targetLanguage'
      });
    }
    
    // Read audio file
    const audioData = fs.readFileSync(audioFile.path, { encoding: 'base64' });
    
    // Process audio for translation
    const result = await translation.processAudio(
      audioData, sourceLanguage, targetLanguage, context
    );
    
    // Clean up temporary file
    fs.unlinkSync(audioFile.path);
    
    // Cache the text translation result
    cacheManager.cacheTranslation(
      result.originalText, sourceLanguage, targetLanguage, context, {
        translatedText: result.translatedText,
        confidence: result.confidence
      }
    );
    
    // Queue for sync with cloud
    syncWithCloud.queueTranslation(
      result.originalText, sourceLanguage, targetLanguage, context, {
        translatedText: result.translatedText,
        confidence: result.confidence
      }
    );
    
    return res.json({
      success: true,
      originalText: result.originalText,
      translatedText: result.translatedText,
      confidence: result.confidence,
      audioResponse: result.audioResponse,
      audioFormat: result.audioFormat,
      sourceLanguage,
      targetLanguage,
      context,
      processingTime: result.processingTime
    });
  } catch (error) {
    console.error('Error in audio file translation:', error);
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get supported languages endpoint
app.get('/languages', (req, res) => {
  try {
    const supportedLanguagePairs = translation.getSupportedLanguagePairs();
    
    // Extract unique languages
    const languages = new Set();
    supportedLanguagePairs.forEach(pair => {
      languages.add(pair.sourceLanguage);
      languages.add(pair.targetLanguage);
    });
    
    // Map to language objects
    const languageList = Array.from(languages).map(code => ({
      code,
      name: getLanguageName(code),
      nativeName: getLanguageNativeName(code)
    }));
    
    return res.json({
      success: true,
      languages: languageList,
      languagePairs: supportedLanguagePairs
    });
  } catch (error) {
    console.error('Error getting supported languages:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sync status endpoint
app.get('/sync/status', (req, res) => {
  try {
    const status = syncWithCloud.getSyncStatus();
    return res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Trigger manual sync endpoint
app.post('/sync/manual', async (req, res) => {
  try {
    // Test connection first
    const connectionStatus = await syncWithCloud.testConnection();
    
    if (!connectionStatus.connected) {
      return res.status(503).json({
        success: false,
        error: 'Cannot connect to cloud service',
        details: connectionStatus
      });
    }
    
    // Perform sync
    const result = await syncWithCloud.syncCachedData();
    
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in manual sync:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache endpoint
app.post('/cache/clear', (req, res) => {
  try {
    cacheManager.clearCache();
    return res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to get language name
function getLanguageName(code) {
  const languages = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'pa': 'Punjabi',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'tr': 'Turkish'
  };
  
  return languages[code] || code;
}

// Helper function to get language native name
function getLanguageNativeName(code) {
  const nativeNames = {
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'it': 'Italiano',
    'pt': 'Português',
    'ru': 'Русский',
    'zh': '中文',
    'ja': '日本語',
    'ko': '한국어',
    'ar': 'العربية',
    'hi': 'हिन्दी',
    'bn': 'বাংলা',
    'pa': 'ਪੰਜਾਬੀ',
    'vi': 'Tiếng Việt',
    'th': 'ไทย',
    'tr': 'Türkçe'
  };
  
  return nativeNames[code] || code;
}

// Initialize edge modules and start server
initializeEdgeModules().then(() => {
  app.listen(PORT, () => {
    console.log(`MedTranslate AI edge server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log('Available endpoints:');
    console.log('- GET /health');
    console.log('- POST /translate');
    console.log('- POST /translate/audio');
    console.log('- POST /translate/audio/upload');
    console.log('- GET /languages');
    console.log('- GET /sync/status');
    console.log('- POST /sync/manual');
    console.log('- POST /cache/clear');
  });
});
