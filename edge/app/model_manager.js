/**
 * Model Manager for MedTranslate AI Edge Application
 *
 * This module provides functions for loading, managing, and accessing
 * translation models on the edge device. It handles both machine learning models
 * and medical terminology dictionaries for accurate medical translations.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Configuration
const MODEL_DIR = process.env.MODEL_DIR || path.join(__dirname, '../../models');
const CONFIG_DIR = process.env.CONFIG_DIR || path.join(__dirname, '../../config');
const MODEL_MANIFEST_FILE = path.join(MODEL_DIR, 'manifest.json');

// Model registry
let modelRegistry = {};
let medicalTerminology = {};
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
      console.log(`Loaded model manifest with ${manifest.models?.length || 0} models`);
    } else {
      console.log('No model manifest found, creating new one');
      manifest = { models: [], lastSync: null };
      fs.writeFileSync(MODEL_MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
    }

    // Scan model directory for language pair directories
    let languagePairDirs = [];
    try {
      languagePairDirs = fs.readdirSync(MODEL_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && dirent.name.includes('-'))
        .map(dirent => dirent.name);

      console.log(`Found ${languagePairDirs.length} language pair directories in ${MODEL_DIR}`);
    } catch (error) {
      console.error(`Error reading model directory: ${error.message}`);
      console.log(`Trying to read from current directory...`);

      // Try to read from the current directory + models
      const altModelDir = path.join(process.cwd(), 'edge/models');
      if (fs.existsSync(altModelDir)) {
        languagePairDirs = fs.readdirSync(altModelDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory() && dirent.name.includes('-'))
          .map(dirent => dirent.name);

        console.log(`Found ${languagePairDirs.length} language pair directories in ${altModelDir}`);
      }
    }

    // Load medical terminology for each language pair
    let terminologyCount = 0;
    for (const dirName of languagePairDirs) {
      try {
        // Parse language pair from directory name
        const [sourceLanguage, targetLanguage] = dirName.split('-');

        // Try different paths for medical terminology file
        let medicalTermsPath = path.join(MODEL_DIR, dirName, 'medical_terms.json');
        let modelDir = MODEL_DIR;

        // If not found, try alternate path
        if (!fs.existsSync(medicalTermsPath)) {
          const altModelDir = path.join(process.cwd(), 'edge/models');
          const altPath = path.join(altModelDir, dirName, 'medical_terms.json');

          if (fs.existsSync(altPath)) {
            medicalTermsPath = altPath;
            modelDir = altModelDir;
            console.log(`Using alternate path for medical terminology: ${medicalTermsPath}`);
          }
        }

        if (fs.existsSync(medicalTermsPath)) {
          const terms = JSON.parse(fs.readFileSync(medicalTermsPath, 'utf8'));

          // Register medical terminology
          registerMedicalTerminology(sourceLanguage, targetLanguage, terms);
          terminologyCount++;

          // Check for model file
          const modelPath = path.join(modelDir, dirName, `model.bin`);
          const smallModelPath = path.join(modelDir, dirName, `model-small.bin`);

          // Get metadata
          const metadataPath = path.join(modelDir, dirName, 'metadata.json');
          let metadata = {};
          if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          }

          // Register model if it exists
          if (fs.existsSync(modelPath)) {
            const stats = fs.statSync(modelPath);
            const modelInfo = {
              filename: `${dirName}/model.bin`,
              size: stats.size,
              modified: stats.mtime.getTime(),
              sourceLanguage,
              targetLanguage,
              termCount: Object.keys(terms).length,
              ...metadata
            };

            registerModel(sourceLanguage, targetLanguage, modelInfo.filename, modelInfo);
          }
          // Register small model if it exists
          else if (fs.existsSync(smallModelPath)) {
            const stats = fs.statSync(smallModelPath);
            const modelInfo = {
              filename: `${dirName}/model-small.bin`,
              size: stats.size,
              modified: stats.mtime.getTime(),
              sourceLanguage,
              targetLanguage,
              termCount: Object.keys(terms).length,
              isSmall: true,
              ...metadata
            };

            registerModel(sourceLanguage, targetLanguage, modelInfo.filename, modelInfo, true);
          }
          // Register terminology-only model
          else {
            const modelInfo = {
              filename: null,
              sourceLanguage,
              targetLanguage,
              termCount: Object.keys(terms).length,
              isTerminologyOnly: true,
              ...metadata
            };

            registerModel(sourceLanguage, targetLanguage, null, modelInfo, false, true);
          }
        }
      } catch (error) {
        console.error(`Error processing language pair ${dirName}:`, error);
      }
    }

    // Update manifest with current models
    const modelList = Object.values(modelRegistry).map(model => ({
      id: `${model.sourceLanguage}-${model.targetLanguage}`,
      sourceLanguage: model.sourceLanguage,
      targetLanguage: model.targetLanguage,
      filename: model.filename,
      size: model.size,
      modified: model.modified,
      termCount: model.termCount,
      isSmall: model.isSmall || false,
      isTerminologyOnly: model.isTerminologyOnly || false
    }));

    manifest.models = modelList;
    manifest.lastSync = Date.now();
    manifest.terminologyCount = terminologyCount;
    fs.writeFileSync(MODEL_MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');

    isInitialized = true;
    console.log(`Model manager initialized with ${Object.keys(modelRegistry).length} models and ${terminologyCount} terminology sets`);

    return {
      success: true,
      modelCount: Object.keys(modelRegistry).length,
      terminologyCount,
      supportedLanguagePairs: getSupportedLanguagePairs()
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
 * @param {boolean} isSmall - Whether this is a small model
 * @param {boolean} isTerminologyOnly - Whether this is a terminology-only model
 */
function registerModel(sourceLanguage, targetLanguage, filename, modelInfo, isSmall = false, isTerminologyOnly = false) {
  const key = `${sourceLanguage}-${targetLanguage}`;

  modelRegistry[key] = {
    filename,
    path: filename ? path.join(MODEL_DIR, filename) : null,
    sourceLanguage,
    targetLanguage,
    size: modelInfo.size,
    modified: modelInfo.modified,
    termCount: modelInfo.termCount || 0,
    isSmall: isSmall,
    isTerminologyOnly: isTerminologyOnly,
    isLoaded: false
  };

  if (isTerminologyOnly) {
    console.log(`Registered terminology-only model for ${sourceLanguage} to ${targetLanguage} with ${modelInfo.termCount} terms`);
  } else {
    console.log(`Registered model for ${sourceLanguage} to ${targetLanguage}: ${filename} with ${modelInfo.termCount} terms`);
  }
}

/**
 * Register medical terminology for a language pair
 *
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {Object} terms - Medical terminology dictionary
 */
function registerMedicalTerminology(sourceLanguage, targetLanguage, terms) {
  const key = `${sourceLanguage}-${targetLanguage}`;

  medicalTerminology[key] = terms;

  console.log(`Registered medical terminology for ${sourceLanguage} to ${targetLanguage} with ${Object.keys(terms).length} terms`);
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
 * Translate text using the appropriate model and medical terminology
 *
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @param {boolean} useMedicalTerminology - Whether to use medical terminology
 * @returns {Promise<Object>} - Translation result
 */
async function translateText(text, sourceLanguage, targetLanguage, context = 'general', useMedicalTerminology = true) {
  if (!isInitialized) {
    await initialize();
  }

  const model = getModel(sourceLanguage, targetLanguage);
  const terminologyKey = `${sourceLanguage}-${targetLanguage}`;
  const hasMedicalTerminology = medicalTerminology[terminologyKey] && Object.keys(medicalTerminology[terminologyKey]).length > 0;

  if (!model && !hasMedicalTerminology) {
    throw new Error(`No model or terminology available for ${sourceLanguage} to ${targetLanguage} translation`);
  }

  // Start timing
  const startTime = Date.now();

  // If we only have terminology (no model), use terminology-based translation
  if (model?.isTerminologyOnly || !model) {
    if (hasMedicalTerminology) {
      console.log(`Using terminology-only translation for ${sourceLanguage} to ${targetLanguage}`);
      const result = translateWithTerminology(text, sourceLanguage, targetLanguage, context);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      return {
        originalText: text,
        translatedText: result.translatedText,
        confidence: result.confidence,
        terminologyMatches: result.terminologyMatches,
        isTerminologyOnly: true,
        processingTime
      };
    } else {
      throw new Error(`No model or terminology available for ${sourceLanguage} to ${targetLanguage} translation`);
    }
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

    // Apply medical terminology to pivot result if available
    let pivotTranslatedText = pivotResult.translatedText;
    let pivotTerminologyMatches = [];

    if (useMedicalTerminology && medicalTerminology[`${sourceLanguage}-${model.pivotLanguage}`]) {
      const pivotTerminologyResult = applyMedicalTerminology(
        pivotTranslatedText,
        sourceLanguage,
        model.pivotLanguage,
        context
      );

      pivotTranslatedText = pivotTerminologyResult.translatedText;
      pivotTerminologyMatches = pivotTerminologyResult.terminologyMatches;
    }

    // Then translate from pivot to target
    const finalResult = await callPythonInference(
      model.targetModel.path,
      pivotTranslatedText,
      model.pivotLanguage,
      targetLanguage,
      context
    );

    // Apply medical terminology to final result if available
    let finalTranslatedText = finalResult.translatedText;
    let finalTerminologyMatches = [];

    if (useMedicalTerminology && medicalTerminology[`${model.pivotLanguage}-${targetLanguage}`]) {
      const finalTerminologyResult = applyMedicalTerminology(
        finalTranslatedText,
        model.pivotLanguage,
        targetLanguage,
        context
      );

      finalTranslatedText = finalTerminologyResult.translatedText;
      finalTerminologyMatches = finalTerminologyResult.terminologyMatches;
    }

    // Combine confidence scores
    const combinedConfidence = combineConfidenceScores(
      pivotResult.confidence,
      finalResult.confidence
    );

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    return {
      originalText: text,
      translatedText: finalTranslatedText,
      confidence: combinedConfidence,
      isPivotTranslation: true,
      pivotLanguage: model.pivotLanguage,
      terminologyMatches: [...pivotTerminologyMatches, ...finalTerminologyMatches],
      processingTime
    };
  }

  // Direct translation with model
  const result = await callPythonInference(
    model.path,
    text,
    sourceLanguage,
    targetLanguage,
    context
  );

  // Apply medical terminology if available and requested
  let translatedText = result.translatedText;
  let terminologyMatches = [];

  if (useMedicalTerminology && hasMedicalTerminology) {
    const terminologyResult = applyMedicalTerminology(
      translatedText,
      sourceLanguage,
      targetLanguage,
      context
    );

    translatedText = terminologyResult.translatedText;
    terminologyMatches = terminologyResult.terminologyMatches;
  }

  // Calculate processing time
  const processingTime = Date.now() - startTime;

  return {
    originalText: text,
    translatedText,
    confidence: result.confidence,
    terminologyMatches,
    processingTime
  };
}

/**
 * Translate text using only medical terminology
 *
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Object} - Translation result
 */
function translateWithTerminology(text, sourceLanguage, targetLanguage, context = 'general') {
  const terminologyKey = `${sourceLanguage}-${targetLanguage}`;
  const terminology = medicalTerminology[terminologyKey] || {};

  if (Object.keys(terminology).length === 0) {
    return {
      translatedText: text,
      confidence: 'low',
      terminologyMatches: []
    };
  }

  // Simple word-by-word translation using terminology
  const words = text.split(/\s+/);
  const translatedWords = [];
  const terminologyMatches = [];

  for (const word of words) {
    // Clean word (remove punctuation for matching)
    const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');

    // Check if word exists in terminology
    if (terminology[cleanWord]) {
      translatedWords.push(terminology[cleanWord]);
      terminologyMatches.push({
        original: cleanWord,
        translated: terminology[cleanWord],
        confidence: 'high'
      });
    }
    // Check if multi-word term contains this word
    else {
      let found = false;

      // Look for multi-word terms that might contain this word
      for (const term in terminology) {
        if (term.toLowerCase().includes(cleanWord) && term.split(/\s+/).length > 1) {
          // Check if the full term appears in the text
          const termRegex = new RegExp(`\\b${term}\\b`, 'i');
          if (text.match(termRegex)) {
            // Don't replace here, just mark as found
            found = true;
            break;
          }
        }
      }

      if (!found) {
        // Keep original word if no match found
        translatedWords.push(word);
      }
    }
  }

  // Now handle multi-word terms
  let translatedText = translatedWords.join(' ');

  for (const term in terminology) {
    if (term.split(/\s+/).length > 1) {
      // Create regex to match the term with word boundaries
      const termRegex = new RegExp(`\\b${term}\\b`, 'gi');

      // Check if the term exists in the original text
      if (text.match(termRegex)) {
        // Replace the term in the translated text
        translatedText = translatedText.replace(termRegex, terminology[term]);

        terminologyMatches.push({
          original: term,
          translated: terminology[term],
          confidence: 'high'
        });
      }
    }
  }

  // Determine confidence based on percentage of words translated
  const percentTranslated = terminologyMatches.length / words.length;
  let confidence = 'low';

  if (percentTranslated > 0.7) {
    confidence = 'high';
  } else if (percentTranslated > 0.3) {
    confidence = 'medium';
  }

  return {
    translatedText,
    confidence,
    terminologyMatches
  };
}

/**
 * Apply medical terminology to a translated text
 *
 * @param {string} text - Text to process
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Object} - Processed text and terminology matches
 */
function applyMedicalTerminology(text, sourceLanguage, targetLanguage, context = 'general') {
  const terminologyKey = `${sourceLanguage}-${targetLanguage}`;
  const terminology = medicalTerminology[terminologyKey] || {};

  if (Object.keys(terminology).length === 0) {
    return {
      translatedText: text,
      terminologyMatches: []
    };
  }

  let translatedText = text;
  const terminologyMatches = [];

  // First handle multi-word terms (longest first to avoid partial matches)
  const multiWordTerms = Object.keys(terminology)
    .filter(term => term.split(/\s+/).length > 1)
    .sort((a, b) => b.length - a.length);

  for (const term of multiWordTerms) {
    // Create regex to match the term with word boundaries
    const termRegex = new RegExp(`\\b${term}\\b`, 'gi');

    // Check if the term exists in the text
    if (translatedText.match(termRegex)) {
      // Replace the term in the translated text
      translatedText = translatedText.replace(termRegex, terminology[term]);

      terminologyMatches.push({
        original: term,
        translated: terminology[term],
        confidence: 'high'
      });
    }
  }

  // Then handle single-word terms
  const singleWordTerms = Object.keys(terminology)
    .filter(term => term.split(/\s+/).length === 1)
    .sort((a, b) => b.length - a.length);

  for (const term of singleWordTerms) {
    // Create regex to match the term with word boundaries
    const termRegex = new RegExp(`\\b${term}\\b`, 'gi');

    // Check if the term exists in the text
    if (translatedText.match(termRegex)) {
      // Replace the term in the translated text
      translatedText = translatedText.replace(termRegex, terminology[term]);

      terminologyMatches.push({
        original: term,
        translated: terminology[term],
        confidence: 'high'
      });
    }
  }

  return {
    translatedText,
    terminologyMatches
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

/**
 * Translate text using only medical terminology
 * This is a direct export of the internal function for testing purposes
 *
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Object} - Translation result
 */
function translateWithTerminologyExport(text, sourceLanguage, targetLanguage, context = 'general') {
  return translateWithTerminology(text, sourceLanguage, targetLanguage, context);
}

module.exports = {
  initialize,
  getModel,
  getSupportedLanguagePairs,
  isLanguagePairSupported,
  translateText,
  translateWithTerminology: translateWithTerminologyExport,
  applyMedicalTerminology,
  registerMedicalTerminology
};
