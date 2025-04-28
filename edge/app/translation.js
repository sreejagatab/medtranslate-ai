/**
 * Local translation module for MedTranslate AI Edge Application
 *
 * This module provides functions for performing translation locally
 * on the edge device using optimized models.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { cacheManager } = require('./cache');
const modelManager = require('./model_manager');

// Use mock inference for testing
const MOCK_MODE = true;

// Configuration
const MODEL_DIR = process.env.MODEL_DIR || '../../models';
const TEMP_DIR = process.env.TEMP_DIR || '../../temp';

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
 * @returns {Promise<Object>} - Translation result
 */
async function translateLocally(text, sourceLanguage, targetLanguage, context = 'general') {
  try {
    // Ensure module is initialized
    if (!isInitialized) {
      await initialize();
    }

    // For testing, we'll use a simpler approach
    if (MOCK_MODE) {
      // Call mock inference script directly
      const modelPath = path.join(MODEL_DIR, `${sourceLanguage}-${targetLanguage}.bin`);
      const result = await callPythonInference(
        modelPath, text, sourceLanguage, targetLanguage, context
      );

      return {
        originalText: text,
        translatedText: result.translatedText,
        confidence: result.confidence,
        sourceLanguage,
        targetLanguage,
        context,
        processingTime: result.processingTime || 0,
        isPivotTranslation: false
      };
    } else {
      // Check if language pair is supported
      if (!modelManager.isLanguagePairSupported(sourceLanguage, targetLanguage)) {
        throw new Error(`No local model available for ${sourceLanguage} to ${targetLanguage} translation`);
      }

      // Perform translation
      const result = await modelManager.translateText(
        text, sourceLanguage, targetLanguage, context
      );

      return {
        originalText: text,
        translatedText: result.translatedText,
        confidence: result.confidence,
        sourceLanguage,
        targetLanguage,
        context,
        processingTime: result.processingTime,
        isPivotTranslation: result.isPivotTranslation || false,
        pivotLanguage: result.pivotLanguage
      };
    }
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
 * @returns {Promise<Object>} - Translation result with audio
 */
async function processAudio(audioData, sourceLanguage, targetLanguage, context = 'general') {
  try {
    // Ensure module is initialized
    if (!isInitialized) {
      await initialize();
    }

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Save audio to temporary file
    const tempAudioPath = path.join(TEMP_DIR, `audio-${Date.now()}.wav`);
    fs.writeFileSync(tempAudioPath, Buffer.from(audioData, 'base64'));

    // Call Python script for audio processing
    const pythonProcess = spawn('python3', [
      path.join(__dirname, 'audio_processor.py'),
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

    return {
      originalText: parsedResult.transcription,
      translatedText: parsedResult.translation,
      confidence: parsedResult.confidence,
      audioResponse: parsedResult.audioResponse,
      audioFormat: parsedResult.audioFormat,
      sourceLanguage,
      targetLanguage,
      context,
      processingTime: parsedResult.processingTime
    };
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

module.exports = {
  initialize,
  translateLocally,
  processAudio,
  getSupportedLanguagePairs,
  isLanguagePairSupported
};
