/**
 * Statistical Model for Predictive Caching
 *
 * This module implements a statistical model for predicting cache needs
 * based on usage patterns. It uses frequency analysis and statistical
 * methods to identify patterns in usage data.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_MODEL_FILE = 'statistical-model.json';
const DEFAULT_CONFIDENCE_THRESHOLD = 0.3;
const DEFAULT_MAX_PREDICTIONS = 50;

// State
let isInitialized = false;
let modelData = {
  frequencyMap: {},
  contextMap: {},
  languagePairMap: {},
  timeOfDayMap: Array(24).fill(0),
  dayOfWeekMap: Array(7).fill(0),
  lastUpdated: 0,
  version: '1.0'
};
let modelDir = '';
let modelFile = '';

/**
 * Initialize the statistical model
 *
 * @param {Object} options - Initialization options
 * @returns {Promise<boolean>} - Whether initialization was successful
 */
async function initialize(options = {}) {
  try {
    console.log('Initializing statistical model...');

    // Set model directory and file
    modelDir = options.modelDir || path.join(__dirname, '../../../models');
    modelFile = options.modelFile || path.join(modelDir, DEFAULT_MODEL_FILE);

    // Create model directory if it doesn't exist
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
      console.log(`Created model directory: ${modelDir}`);
    }

    // Load model data if it exists
    if (fs.existsSync(modelFile)) {
      try {
        const data = fs.readFileSync(modelFile, 'utf8');
        modelData = JSON.parse(data);
        console.log('Loaded statistical model data');
      } catch (error) {
        console.error('Error loading statistical model data:', error);
        // Use default model data
      }
    } else {
      // Save default model data
      await saveModel();
    }

    isInitialized = true;
    console.log('Statistical model initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing statistical model:', error);
    return false;
  }
}

/**
 * Save model data to file
 *
 * @returns {Promise<boolean>} - Whether save was successful
 */
async function saveModel() {
  try {
    // Update last updated timestamp
    modelData.lastUpdated = Date.now();

    // Save model data to file
    fs.writeFileSync(modelFile, JSON.stringify(modelData, null, 2), 'utf8');
    console.log('Saved statistical model data');
    return true;
  } catch (error) {
    console.error('Error saving statistical model data:', error);
    return false;
  }
}

/**
 * Train the statistical model with usage data
 *
 * @param {Object} usageStats - Usage statistics
 * @returns {Promise<boolean>} - Whether training was successful
 */
async function train(usageStats) {
  try {
    if (!isInitialized) {
      await initialize();
    }

    console.log('Training statistical model...');

    // Process frequency data
    if (usageStats.frequentItems) {
      for (const [key, count] of Object.entries(usageStats.frequentItems)) {
        modelData.frequencyMap[key] = (modelData.frequencyMap[key] || 0) + count;
      }
    }

    // Process context data
    if (usageStats.contextUsage) {
      for (const [context, count] of Object.entries(usageStats.contextUsage)) {
        modelData.contextMap[context] = (modelData.contextMap[context] || 0) + count;
      }
    }

    // Process language pair data
    if (usageStats.languagePairUsage) {
      for (const [pair, count] of Object.entries(usageStats.languagePairUsage)) {
        modelData.languagePairMap[pair] = (modelData.languagePairMap[pair] || 0) + count;
      }
    }

    // Process time of day data
    if (usageStats.timePatterns && usageStats.timePatterns.hourly) {
      for (let i = 0; i < 24; i++) {
        modelData.timeOfDayMap[i] += usageStats.timePatterns.hourly[i] || 0;
      }
    }

    // Process day of week data
    if (usageStats.timePatterns && usageStats.timePatterns.daily) {
      for (let i = 0; i < 7; i++) {
        modelData.dayOfWeekMap[i] += usageStats.timePatterns.daily[i] || 0;
      }
    }

    // Save updated model
    await saveModel();

    console.log('Statistical model training completed');
    return true;
  } catch (error) {
    console.error('Error training statistical model:', error);
    return false;
  }
}

/**
 * Generate predictions using the statistical model
 *
 * @param {Object} options - Prediction options
 * @returns {Array} - Predictions
 */
function predict(options = {}) {
  try {
    if (!isInitialized) {
      console.warn('Statistical model not initialized');
      return [];
    }

    const {
      confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
      maxPredictions = DEFAULT_MAX_PREDICTIONS,
      currentHour = new Date().getHours(),
      currentDay = new Date().getDay(),
      context,
      languagePair
    } = options;

    const predictions = [];

    // Get total frequency count
    const totalFrequency = Object.values(modelData.frequencyMap).reduce((sum, count) => sum + count, 0);
    if (totalFrequency === 0) {
      return [];
    }

    // Generate predictions based on frequency
    for (const [key, count] of Object.entries(modelData.frequencyMap)) {
      // Calculate confidence based on frequency
      const frequency = count / totalFrequency;
      
      // Skip items below threshold
      if (frequency < confidenceThreshold) {
        continue;
      }

      // Parse key to get components
      const parts = key.split('|');
      if (parts.length < 3) {
        continue;
      }

      const [sourceLanguage, targetLanguage, itemContext] = parts;
      
      // Skip if context filter is applied and doesn't match
      if (context && itemContext !== context) {
        continue;
      }
      
      // Skip if language pair filter is applied and doesn't match
      if (languagePair && `${sourceLanguage}-${targetLanguage}` !== languagePair) {
        continue;
      }

      // Calculate time-based adjustment
      const hourFactor = modelData.timeOfDayMap[currentHour] / Math.max(1, Math.max(...modelData.timeOfDayMap));
      const dayFactor = modelData.dayOfWeekMap[currentDay] / Math.max(1, Math.max(...modelData.dayOfWeekMap));
      
      // Combine factors for final confidence
      const confidence = frequency * (1 + 0.5 * hourFactor + 0.3 * dayFactor);

      predictions.push({
        key,
        sourceLanguage,
        targetLanguage,
        context: itemContext,
        confidence,
        frequency,
        count,
        source: 'statistical'
      });
    }

    // Sort by confidence and limit
    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxPredictions);
  } catch (error) {
    console.error('Error generating statistical predictions:', error);
    return [];
  }
}

/**
 * Get model status
 *
 * @returns {Object} - Model status
 */
function getStatus() {
  return {
    isInitialized,
    lastUpdated: modelData.lastUpdated,
    version: modelData.version,
    itemCount: Object.keys(modelData.frequencyMap).length,
    contextCount: Object.keys(modelData.contextMap).length,
    languagePairCount: Object.keys(modelData.languagePairMap).length
  };
}

// Export the module
module.exports = {
  initialize,
  train,
  predict,
  getStatus
};
