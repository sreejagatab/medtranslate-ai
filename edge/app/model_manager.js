/**
 * Model Manager for MedTranslate AI Edge Application
 *
 * This module provides functions for loading, managing, and accessing
 * translation models on the edge device.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Configuration
const MODEL_DIR = process.env.MODEL_DIR || '../../models';
const CONFIG_DIR = process.env.CONFIG_DIR || '../../config';
const MODEL_MANIFEST_FILE = path.join(__dirname, '../../models/model_manifest.json');

// Model registry
let modelRegistry = {};
let isInitialized = false;

/**
 * Initialize the model manager
 *
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize() {
  try {
    console.log('Initializing model manager...');

    // Create model directory if it doesn't exist
    if (!fs.existsSync(MODEL_DIR)) {
      fs.mkdirSync(MODEL_DIR, { recursive: true });
    }

    // Load model manifest if it exists
    let manifest = {};
    if (fs.existsSync(MODEL_MANIFEST_FILE)) {
      manifest = JSON.parse(fs.readFileSync(MODEL_MANIFEST_FILE, 'utf8'));
      console.log(`Loaded model manifest with ${Object.keys(manifest.models || {}).length} models`);
    } else {
      console.log('No model manifest found, creating new one');
      manifest = { models: {}, lastSync: null };
      fs.writeFileSync(MODEL_MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
    }

    // Scan model directory
    const modelFiles = fs.readdirSync(MODEL_DIR).filter(file => file.endsWith('.bin'));
    console.log(`Found ${modelFiles.length} model files in ${MODEL_DIR}`);

    // Register models
    for (const modelFile of modelFiles) {
      try {
        // Parse language pair from filename
        const languagePair = modelFile.split('.')[0];
        const [sourceLanguage, targetLanguage] = languagePair.split('-');

        // Get model info from manifest or file stats
        let modelInfo = manifest.models[modelFile] || {};
        if (!modelInfo.size) {
          const stats = fs.statSync(path.join(MODEL_DIR, modelFile));
          modelInfo = {
            filename: modelFile,
            size: stats.size,
            modified: stats.mtime.getTime(),
            sourceLanguage,
            targetLanguage
          };
        }

        // Register model
        registerModel(sourceLanguage, targetLanguage, modelFile, modelInfo);
      } catch (error) {
        console.error(`Error registering model ${modelFile}:`, error);
      }
    }

    // Update manifest with current models
    manifest.models = Object.fromEntries(
      Object.entries(modelRegistry).map(([key, model]) => [
        model.filename,
        {
          filename: model.filename,
          size: model.size,
          modified: model.modified,
          sourceLanguage: model.sourceLanguage,
          targetLanguage: model.targetLanguage
        }
      ])
    );
    manifest.lastSync = Date.now();
    fs.writeFileSync(MODEL_MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');

    isInitialized = true;
    console.log(`Model manager initialized with ${Object.keys(modelRegistry).length} models`);

    return {
      success: true,
      modelCount: Object.keys(modelRegistry).length,
      supportedLanguagePairs: Object.keys(modelRegistry)
    };
  } catch (error) {
    console.error('Error initializing model manager:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Register a model in the registry
 *
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} filename - Model filename
 * @param {Object} modelInfo - Model information
 */
function registerModel(sourceLanguage, targetLanguage, filename, modelInfo) {
  const key = `${sourceLanguage}-${targetLanguage}`;

  modelRegistry[key] = {
    filename,
    path: path.join(MODEL_DIR, filename),
    sourceLanguage,
    targetLanguage,
    size: modelInfo.size,
    modified: modelInfo.modified,
    isLoaded: false
  };

  console.log(`Registered model for ${sourceLanguage} to ${targetLanguage}: ${filename}`);
}

/**
 * Get a model for a language pair
 *
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Object|null} - Model information or null if not available
 */
function getModel(sourceLanguage, targetLanguage) {
  const key = `${sourceLanguage}-${targetLanguage}`;

  // Check if we have a direct model
  if (modelRegistry[key]) {
    return modelRegistry[key];
  }

  // Check for fallback models
  const fallbackKey = `${sourceLanguage}-${targetLanguage}-small`;
  if (modelRegistry[fallbackKey]) {
    console.log(`Using fallback model for ${sourceLanguage} to ${targetLanguage}`);
    return modelRegistry[fallbackKey];
  }

  // Check for pivot translation if direct path not available
  // For example, if es->fr not available but es->en and en->fr are
  const sourceModels = Object.keys(modelRegistry).filter(k => k.startsWith(`${sourceLanguage}-`));
  const targetModels = Object.keys(modelRegistry).filter(k => k.endsWith(`-${targetLanguage}`));

  for (const sourceModel of sourceModels) {
    const pivotLanguage = sourceModel.split('-')[1];
    const pivotTargetKey = `${pivotLanguage}-${targetLanguage}`;

    if (modelRegistry[pivotTargetKey]) {
      console.log(`Using pivot translation via ${pivotLanguage} for ${sourceLanguage} to ${targetLanguage}`);
      return {
        isPivot: true,
        sourceModel: modelRegistry[sourceModel],
        targetModel: modelRegistry[pivotTargetKey],
        pivotLanguage
      };
    }
  }

  console.log(`No model available for ${sourceLanguage} to ${targetLanguage}`);
  return null;
}

/**
 * Get all supported language pairs
 *
 * @returns {Array<Object>} - Array of supported language pairs
 */
function getSupportedLanguagePairs() {
  return Object.keys(modelRegistry).map(key => {
    const [sourceLanguage, targetLanguage] = key.split('-');
    return {
      sourceLanguage,
      targetLanguage,
      model: modelRegistry[key].filename
    };
  });
}

/**
 * Check if a language pair is supported
 *
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {boolean} - Whether the language pair is supported
 */
function isLanguagePairSupported(sourceLanguage, targetLanguage) {
  return getModel(sourceLanguage, targetLanguage) !== null;
}

/**
 * Translate text using the appropriate model
 *
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Promise<Object>} - Translation result
 */
async function translateText(text, sourceLanguage, targetLanguage, context = 'general') {
  if (!isInitialized) {
    await initialize();
  }

  const model = getModel(sourceLanguage, targetLanguage);

  if (!model) {
    throw new Error(`No model available for ${sourceLanguage} to ${targetLanguage} translation`);
  }

  // Handle pivot translation if needed
  if (model.isPivot) {
    console.log(`Performing pivot translation via ${model.pivotLanguage}`);

    // First translate to pivot language
    const pivotResult = await callPythonInference(
      model.sourceModel.path,
      text,
      sourceLanguage,
      model.pivotLanguage,
      context
    );

    // Then translate from pivot to target
    const finalResult = await callPythonInference(
      model.targetModel.path,
      pivotResult.translatedText,
      model.pivotLanguage,
      targetLanguage,
      context
    );

    // Combine confidence scores
    const combinedConfidence = combineConfidenceScores(
      pivotResult.confidence,
      finalResult.confidence
    );

    return {
      originalText: text,
      translatedText: finalResult.translatedText,
      confidence: combinedConfidence,
      isPivotTranslation: true,
      pivotLanguage: model.pivotLanguage,
      processingTime: pivotResult.processingTime + finalResult.processingTime
    };
  }

  // Direct translation
  const result = await callPythonInference(
    model.path,
    text,
    sourceLanguage,
    targetLanguage,
    context
  );

  return {
    originalText: text,
    translatedText: result.translatedText,
    confidence: result.confidence,
    processingTime: result.processingTime
  };
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
    const pythonProcess = spawn('python3', [
      path.join(__dirname, 'inference.py'),
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
 * Combine confidence scores from multiple translation steps
 *
 * @param {string|number} confidence1 - First confidence score
 * @param {string|number} confidence2 - Second confidence score
 * @returns {string} - Combined confidence level
 */
function combineConfidenceScores(confidence1, confidence2) {
  // Convert string confidence levels to numeric values
  const confidenceMap = {
    'high': 0.9,
    'medium': 0.7,
    'low': 0.5
  };

  const score1 = typeof confidence1 === 'string' ? confidenceMap[confidence1.toLowerCase()] || 0.5 : confidence1;
  const score2 = typeof confidence2 === 'string' ? confidenceMap[confidence2.toLowerCase()] || 0.5 : confidence2;

  // Multiply scores and convert back to confidence level
  const combinedScore = score1 * score2;

  if (combinedScore >= 0.8) {
    return 'high';
  } else if (combinedScore >= 0.6) {
    return 'medium';
  } else {
    return 'low';
  }
}

module.exports = {
  initialize,
  getModel,
  getSupportedLanguagePairs,
  isLanguagePairSupported,
  translateText
};
