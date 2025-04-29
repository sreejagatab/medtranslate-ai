/**
 * Local translation module for MedTranslate AI Edge Application
 *
 * This module provides functions for performing translation locally
 * on the edge device using optimized models for medical translation.
 * Supports offline operation with local models and caching.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { cacheManager } = require('./cache');
const modelManager = require('./model_manager');

// Use real models for production, mock mode can be enabled for testing
const MOCK_MODE = process.env.MOCK_MODE === 'true' || false;

// Configuration
const MODEL_DIR = process.env.MODEL_DIR || '../../models';
const TEMP_DIR = process.env.TEMP_DIR || '../../temp';
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '86400', 10); // 24 hours in seconds

// Track initialization status
let isInitialized = false;

/**
 * Initialize the translation module
 *
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize() {
  try {
    console.log('Initializing translation module...');

    // Initialize model manager
    const result = await modelManager.initialize();

    if (!result.success) {
      throw new Error(`Failed to initialize model manager: ${result.error}`);
    }

    isInitialized = true;
    console.log('Translation module initialized successfully');

    return {
      success: true,
      supportedLanguagePairs: result.supportedLanguagePairs
    };
  } catch (error) {
    console.error('Error initializing translation module:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Translates text locally on the edge device
 *
 * @param {string} text - The text to translate
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} context - The medical context
 * @param {boolean} useCache - Whether to use cache (default: true)
 * @returns {Promise<Object>} - Translation result
 */
async function translateLocally(text, sourceLanguage, targetLanguage, context = 'general', useCache = true) {
  try {
    // Ensure module is initialized
    if (!isInitialized) {
      await initialize();
    }

    // Generate cache key
    const cacheKey = `${sourceLanguage}:${targetLanguage}:${context}:${text}`;

    // Check cache if enabled
    if (CACHE_ENABLED && useCache) {
      const cachedResult = await cacheManager.get('translation', cacheKey);
      if (cachedResult) {
        console.log(`Using cached translation for: ${cacheKey}`);
        return {
          ...cachedResult,
          fromCache: true
        };
      }
    }

    // Start timing
    const startTime = Date.now();

    let result;
    let isPivotTranslation = false;
    let pivotLanguage = null;

    // For testing, we'll use a simpler approach
    if (MOCK_MODE) {
      // Call mock inference script directly
      const modelPath = path.join(MODEL_DIR, `${sourceLanguage}-${targetLanguage}.bin`);
      result = await callPythonInference(
        modelPath, text, sourceLanguage, targetLanguage, context
      );
    } else {
      // Check if language pair is directly supported
      if (modelManager.isLanguagePairSupported(sourceLanguage, targetLanguage)) {
        // Perform direct translation
        result = await modelManager.translateText(
          text, sourceLanguage, targetLanguage, context
        );

        isPivotTranslation = result.isPivotTranslation || false;
        pivotLanguage = result.pivotLanguage;
      } else {
        // Try pivot translation through English if direct translation is not available
        console.log(`Direct translation from ${sourceLanguage} to ${targetLanguage} not available, trying pivot translation`);

        // First translate to English if source is not English
        if (sourceLanguage !== 'en' && modelManager.isLanguagePairSupported(sourceLanguage, 'en')) {
          const toEnglishResult = await modelManager.translateText(
            text, sourceLanguage, 'en', context
          );

          // Then translate from English to target if target is not English
          if (targetLanguage !== 'en' && modelManager.isLanguagePairSupported('en', targetLanguage)) {
            const fromEnglishResult = await modelManager.translateText(
              toEnglishResult.translatedText, 'en', targetLanguage, context
            );

            result = {
              translatedText: fromEnglishResult.translatedText,
              confidence: Math.min(toEnglishResult.confidence, fromEnglishResult.confidence),
              processingTime: toEnglishResult.processingTime + fromEnglishResult.processingTime
            };

            isPivotTranslation = true;
            pivotLanguage = 'en';
          } else {
            throw new Error(`Cannot translate from English to ${targetLanguage}`);
          }
        } else {
          throw new Error(`No local model available for ${sourceLanguage} to ${targetLanguage} translation`);
        }
      }
    }

    // Calculate total processing time
    const processingTime = result.processingTime || (Date.now() - startTime);

    // Prepare final result
    const translationResult = {
      originalText: text,
      translatedText: result.translatedText,
      confidence: result.confidence,
      sourceLanguage,
      targetLanguage,
      context,
      processingTime,
      isPivotTranslation,
      pivotLanguage,
      timestamp: new Date().toISOString()
    };

    // Cache the result if caching is enabled
    if (CACHE_ENABLED && useCache) {
      await cacheManager.set('translation', cacheKey, translationResult, CACHE_TTL);
    }

    return translationResult;
  } catch (error) {
    console.error('Local translation error:', error);
    throw new Error(`Local translation failed: ${error.message}`);
  }
}

/**
 * Processes audio for translation locally
 *
 * @param {string} audioData - Base64-encoded audio data
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} context - The medical context
 * @param {boolean} useCache - Whether to use cache (default: true)
 * @returns {Promise<Object>} - Translation result with audio
 */
async function processAudio(audioData, sourceLanguage, targetLanguage, context = 'general', useCache = true) {
  try {
    // Ensure module is initialized
    if (!isInitialized) {
      await initialize();
    }

    // Generate a hash of the audio data for caching
    const crypto = require('crypto');
    const audioHash = crypto.createHash('md5').update(audioData).digest('hex');
    const cacheKey = `audio:${audioHash}:${sourceLanguage}:${targetLanguage}:${context}`;

    // Check cache if enabled
    if (CACHE_ENABLED && useCache) {
      const cachedResult = await cacheManager.get('audio', cacheKey);
      if (cachedResult) {
        console.log(`Using cached audio translation for: ${cacheKey}`);
        return {
          ...cachedResult,
          fromCache: true
        };
      }
    }

    // Start timing
    const startTime = Date.now();

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Save audio to temporary file
    const tempAudioPath = path.join(TEMP_DIR, `audio-${Date.now()}.wav`);
    fs.writeFileSync(tempAudioPath, Buffer.from(audioData, 'base64'));

    // Call Python script for audio processing
    const pythonScript = MOCK_MODE ?
      path.join(__dirname, 'mock_audio_processor.py') :
      path.join(__dirname, 'audio_processor.py');

    const pythonProcess = spawn('python3', [
      pythonScript,
      tempAudioPath,
      sourceLanguage,
      targetLanguage,
      '--context', context
    ]);

    // Collect output
    let result = '';
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    // Handle errors
    let errorOutput = '';
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Wait for process to complete
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Audio processing failed with code ${code}: ${errorOutput}`));
        }
      });
    });

    // Clean up temporary file
    if (fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }

    // Parse result
    const parsedResult = JSON.parse(result);

    // Calculate total processing time
    const processingTime = parsedResult.processingTime || (Date.now() - startTime);

    // Prepare final result
    const audioResult = {
      originalText: parsedResult.transcription,
      translatedText: parsedResult.translation,
      confidence: parsedResult.confidence,
      audioResponse: parsedResult.audioResponse,
      audioFormat: parsedResult.audioFormat || 'audio/wav',
      sourceLanguage,
      targetLanguage,
      context,
      processingTime,
      transcriptionConfidence: parsedResult.transcriptionConfidence,
      timestamp: new Date().toISOString()
    };

    // Cache the result if caching is enabled
    // Note: We might want to cache audio results for a shorter time than text translations
    if (CACHE_ENABLED && useCache) {
      const audioTtl = Math.floor(CACHE_TTL / 2); // Half the TTL of text translations
      await cacheManager.set('audio', cacheKey, audioResult, audioTtl);
    }

    return audioResult;
  } catch (error) {
    console.error('Audio processing error:', error);
    throw new Error(`Audio processing failed: ${error.message}`);
  }
}

/**
 * Get supported language pairs
 *
 * @returns {Array<Object>} - Array of supported language pairs
 */
function getSupportedLanguagePairs() {
  return modelManager.getSupportedLanguagePairs();
}

/**
 * Check if a language pair is supported
 *
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {boolean} - Whether the language pair is supported
 */
function isLanguagePairSupported(sourceLanguage, targetLanguage) {
  return modelManager.isLanguagePairSupported(sourceLanguage, targetLanguage);
}

/**
 * Call Python inference script for translation
 *
 * @param {string} modelPath - Path to the model
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Promise<Object>} - Translation result
 */
async function callPythonInference(modelPath, text, sourceLanguage, targetLanguage, context) {
  return new Promise((resolve, reject) => {
    // Use mock inference script for testing
    const scriptPath = MOCK_MODE ?
      path.join(__dirname, 'mock_inference.py') :
      path.join(__dirname, 'inference.py');

    const pythonProcess = spawn('python', [
      scriptPath,
      modelPath,
      text,
      sourceLanguage,
      targetLanguage,
      '--context', context
    ]);

    let result = '';
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    let errorOutput = '';
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const parsedResult = JSON.parse(result);
          resolve(parsedResult);
        } catch (error) {
          reject(new Error(`Failed to parse inference result: ${error.message}`));
        }
      } else {
        reject(new Error(`Inference failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}

/**
 * Get information about available models
 *
 * @returns {Promise<Object>} - Information about available models
 */
async function getModelInfo() {
  try {
    // Ensure module is initialized
    if (!isInitialized) {
      await initialize();
    }

    // Get model information from model manager
    const modelInfo = await modelManager.getModelInfo();

    // Add cache statistics
    const cacheStats = CACHE_ENABLED ? await cacheManager.getStats() : { enabled: false };

    return {
      models: modelInfo,
      supportedLanguagePairs: modelManager.getSupportedLanguagePairs(),
      caching: {
        enabled: CACHE_ENABLED,
        ttl: CACHE_TTL,
        stats: cacheStats
      },
      mockMode: MOCK_MODE
    };
  } catch (error) {
    console.error('Error getting model info:', error);
    return {
      error: error.message,
      mockMode: MOCK_MODE
    };
  }
}

/**
 * Clear translation cache
 *
 * @param {string} cacheType - Type of cache to clear ('translation', 'audio', or 'all')
 * @returns {Promise<Object>} - Result of cache clearing operation
 */
async function clearCache(cacheType = 'all') {
  try {
    if (!CACHE_ENABLED) {
      return { success: false, message: 'Caching is disabled' };
    }

    if (cacheType === 'all') {
      await cacheManager.clear();
      return { success: true, message: 'All caches cleared successfully' };
    } else if (cacheType === 'translation' || cacheType === 'audio') {
      await cacheManager.clear(cacheType);
      return { success: true, message: `${cacheType} cache cleared successfully` };
    } else {
      return { success: false, message: 'Invalid cache type. Use "translation", "audio", or "all"' };
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initialize,
  translateLocally,
  processAudio,
  getSupportedLanguagePairs,
  isLanguagePairSupported,
  getModelInfo,
  clearCache
};
