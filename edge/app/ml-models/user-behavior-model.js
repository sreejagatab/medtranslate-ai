/**
 * User Behavior Model for Predictive Caching
 *
 * This module implements a model for predicting user behavior patterns
 * and preferences. It analyzes historical user interactions to identify
 * patterns and predict future needs.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_MODEL_FILE = 'user-behavior-model.json';
const DEFAULT_CONFIDENCE_THRESHOLD = 0.3;
const DEFAULT_MAX_PREDICTIONS = 50;

// State
let isInitialized = false;
let modelData = {
  userPreferences: {
    languagePairs: {},
    contexts: {},
    complexSequences: []
  },
  sessionPatterns: {
    averageSessionDuration: 0,
    averageSessionItems: 0,
    sessionFrequency: 0,
    sessionTimeDistribution: Array(24).fill(0)
  },
  interactionPatterns: {},
  contextTransitions: {},
  lastUpdated: 0,
  version: '1.0'
};
let modelDir = '';
let modelFile = '';

/**
 * Initialize the user behavior model
 *
 * @param {Object} options - Initialization options
 * @returns {Promise<boolean>} - Whether initialization was successful
 */
async function initialize(options = {}) {
  try {
    console.log('Initializing user behavior model...');

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
        console.log('Loaded user behavior model data');
      } catch (error) {
        console.error('Error loading user behavior model data:', error);
        // Use default model data
      }
    } else {
      // Save default model data
      await saveModel();
    }

    isInitialized = true;
    console.log('User behavior model initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing user behavior model:', error);
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
    console.log('Saved user behavior model data');
    return true;
  } catch (error) {
    console.error('Error saving user behavior model data:', error);
    return false;
  }
}

/**
 * Train the user behavior model with usage data
 *
 * @param {Object} usageStats - Usage statistics
 * @returns {Promise<boolean>} - Whether training was successful
 */
async function train(usageStats) {
  try {
    if (!isInitialized) {
      await initialize();
    }

    console.log('Training user behavior model...');

    // Process language pair preferences
    if (usageStats.languagePairUsage) {
      for (const [pair, count] of Object.entries(usageStats.languagePairUsage)) {
        modelData.userPreferences.languagePairs[pair] = (modelData.userPreferences.languagePairs[pair] || 0) + count;
      }
    }

    // Process context preferences
    if (usageStats.contextUsage) {
      for (const [context, count] of Object.entries(usageStats.contextUsage)) {
        modelData.userPreferences.contexts[context] = (modelData.userPreferences.contexts[context] || 0) + count;
      }
    }

    // Process session patterns
    if (usageStats.userPatterns) {
      // Update session duration with exponential smoothing
      if (typeof usageStats.userPatterns.sessionDuration === 'number') {
        const alpha = 0.3; // Smoothing factor
        modelData.sessionPatterns.averageSessionDuration = alpha * usageStats.userPatterns.sessionDuration + 
          (1 - alpha) * modelData.sessionPatterns.averageSessionDuration;
      }

      // Update session items with exponential smoothing
      if (typeof usageStats.userPatterns.averageSessionItems === 'number') {
        const alpha = 0.3; // Smoothing factor
        modelData.sessionPatterns.averageSessionItems = alpha * usageStats.userPatterns.averageSessionItems + 
          (1 - alpha) * modelData.sessionPatterns.averageSessionItems;
      }

      // Update session frequency with exponential smoothing
      if (typeof usageStats.userPatterns.sessionFrequency === 'number') {
        const alpha = 0.3; // Smoothing factor
        modelData.sessionPatterns.sessionFrequency = alpha * usageStats.userPatterns.sessionFrequency + 
          (1 - alpha) * modelData.sessionPatterns.sessionFrequency;
      }

      // Update session time distribution
      if (usageStats.userPatterns.sessionTimeDistribution) {
        for (let i = 0; i < 24; i++) {
          const newValue = usageStats.userPatterns.sessionTimeDistribution[i] || 0;
          modelData.sessionPatterns.sessionTimeDistribution[i] += newValue;
        }
      }

      // Process complex sequences
      if (usageStats.userPatterns.complexSequences) {
        for (const sequence of usageStats.userPatterns.complexSequences) {
          // Check if sequence already exists
          const existingIndex = modelData.userPreferences.complexSequences.findIndex(
            s => s.pattern.join('|') === sequence.pattern.join('|')
          );

          if (existingIndex >= 0) {
            // Update existing sequence
            modelData.userPreferences.complexSequences[existingIndex].count += sequence.count || 1;
            modelData.userPreferences.complexSequences[existingIndex].lastSeen = Date.now();
          } else {
            // Add new sequence
            modelData.userPreferences.complexSequences.push({
              pattern: sequence.pattern,
              count: sequence.count || 1,
              firstSeen: Date.now(),
              lastSeen: Date.now()
            });
          }
        }

        // Sort sequences by count
        modelData.userPreferences.complexSequences.sort((a, b) => b.count - a.count);

        // Keep only top 20 sequences
        if (modelData.userPreferences.complexSequences.length > 20) {
          modelData.userPreferences.complexSequences = modelData.userPreferences.complexSequences.slice(0, 20);
        }
      }
    }

    // Process interaction patterns
    if (usageStats.userPatterns && usageStats.userPatterns.interactionPatterns) {
      for (const [type, pattern] of Object.entries(usageStats.userPatterns.interactionPatterns)) {
        if (!modelData.interactionPatterns[type]) {
          modelData.interactionPatterns[type] = {
            count: 0,
            lastTime: 0,
            timeDistribution: Array(24).fill(0),
            contextDistribution: {}
          };
        }

        // Update count
        modelData.interactionPatterns[type].count += pattern.count || 0;

        // Update last time
        if (pattern.lastTime > modelData.interactionPatterns[type].lastTime) {
          modelData.interactionPatterns[type].lastTime = pattern.lastTime;
        }

        // Update time distribution
        if (pattern.timeDistribution) {
          for (let i = 0; i < 24; i++) {
            modelData.interactionPatterns[type].timeDistribution[i] += pattern.timeDistribution[i] || 0;
          }
        }

        // Update context distribution
        if (pattern.contextDistribution) {
          for (const [context, count] of Object.entries(pattern.contextDistribution)) {
            modelData.interactionPatterns[type].contextDistribution[context] = 
              (modelData.interactionPatterns[type].contextDistribution[context] || 0) + count;
          }
        }
      }
    }

    // Process context transitions
    if (usageStats.userPatterns && usageStats.userPatterns.contextTransitions) {
      for (const [fromContext, transitions] of Object.entries(usageStats.userPatterns.contextTransitions)) {
        if (!modelData.contextTransitions[fromContext]) {
          modelData.contextTransitions[fromContext] = {};
        }

        for (const [toContext, count] of Object.entries(transitions)) {
          modelData.contextTransitions[fromContext][toContext] = 
            (modelData.contextTransitions[fromContext][toContext] || 0) + count;
        }
      }
    }

    // Save updated model
    await saveModel();

    console.log('User behavior model training completed');
    return true;
  } catch (error) {
    console.error('Error training user behavior model:', error);
    return false;
  }
}

/**
 * Generate predictions using the user behavior model
 *
 * @param {Object} options - Prediction options
 * @returns {Array} - Predictions
 */
function predict(options = {}) {
  try {
    if (!isInitialized) {
      console.warn('User behavior model not initialized');
      return [];
    }

    const {
      confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
      maxPredictions = DEFAULT_MAX_PREDICTIONS,
      currentHour = new Date().getHours(),
      currentContext = 'general',
      languagePair
    } = options;

    const predictions = [];

    // Get total counts for normalization
    const totalLanguagePairCount = Object.values(modelData.userPreferences.languagePairs).reduce((sum, count) => sum + count, 0);
    const totalContextCount = Object.values(modelData.userPreferences.contexts).reduce((sum, count) => sum + count, 0);

    // Generate predictions based on language pair preferences
    if (languagePair) {
      // If specific language pair is provided, predict contexts
      const [sourceLanguage, targetLanguage] = languagePair.split('-');

      // Get language pair preference
      const pairCount = modelData.userPreferences.languagePairs[languagePair] || 0;
      const pairConfidence = totalLanguagePairCount > 0 ? pairCount / totalLanguagePairCount : 0;

      // Skip if confidence is below threshold
      if (pairConfidence < confidenceThreshold) {
        return [];
      }

      // Predict contexts for this language pair
      for (const [context, count] of Object.entries(modelData.userPreferences.contexts)) {
        // Skip current context
        if (context === currentContext) {
          continue;
        }

        // Calculate context confidence
        const contextConfidence = totalContextCount > 0 ? count / totalContextCount : 0;

        // Calculate combined confidence
        const combinedConfidence = pairConfidence * contextConfidence;

        // Skip if combined confidence is below threshold
        if (combinedConfidence < confidenceThreshold) {
          continue;
        }

        // Check if there's a transition from current context to this context
        let transitionFactor = 1;
        if (modelData.contextTransitions[currentContext] && modelData.contextTransitions[currentContext][context]) {
          const transitionCount = modelData.contextTransitions[currentContext][context];
          const totalTransitions = Object.values(modelData.contextTransitions[currentContext]).reduce((sum, count) => sum + count, 0);
          
          if (totalTransitions > 0) {
            transitionFactor = 1 + (transitionCount / totalTransitions);
          }
        }

        // Calculate final confidence with transition factor
        const finalConfidence = combinedConfidence * transitionFactor;

        // Add prediction
        predictions.push({
          key: `${sourceLanguage}|${targetLanguage}|${context}`,
          sourceLanguage,
          targetLanguage,
          context,
          confidence: finalConfidence,
          source: 'user_behavior'
        });
      }
    } else {
      // If no language pair is provided, predict language pairs
      for (const [pair, count] of Object.entries(modelData.userPreferences.languagePairs)) {
        // Calculate language pair confidence
        const pairConfidence = totalLanguagePairCount > 0 ? count / totalLanguagePairCount : 0;

        // Skip if confidence is below threshold
        if (pairConfidence < confidenceThreshold) {
          continue;
        }

        // Parse language pair
        const [sourceLanguage, targetLanguage] = pair.split('-');

        // Add prediction
        predictions.push({
          key: `${sourceLanguage}|${targetLanguage}|${currentContext}`,
          sourceLanguage,
          targetLanguage,
          context: currentContext,
          confidence: pairConfidence,
          source: 'user_behavior'
        });
      }
    }

    // Add predictions based on complex sequences
    for (const sequence of modelData.userPreferences.complexSequences) {
      // Skip sequences with low count
      if (sequence.count < 3) {
        continue;
      }

      // Check if current context is in the sequence
      const contextIndex = sequence.pattern.findIndex(item => item.context === currentContext);
      
      // Skip if current context not found or is the last item
      if (contextIndex < 0 || contextIndex === sequence.pattern.length - 1) {
        continue;
      }

      // Get next item in sequence
      const nextItem = sequence.pattern[contextIndex + 1];
      
      // Skip if next item doesn't have language pair or context
      if (!nextItem.sourceLanguage || !nextItem.targetLanguage || !nextItem.context) {
        continue;
      }

      // Skip if language pair filter is applied and doesn't match
      if (languagePair && `${nextItem.sourceLanguage}-${nextItem.targetLanguage}` !== languagePair) {
        continue;
      }

      // Calculate sequence confidence
      const sequenceConfidence = Math.min(0.9, sequence.count / 10);

      // Skip if confidence is below threshold
      if (sequenceConfidence < confidenceThreshold) {
        continue;
      }

      // Add prediction
      predictions.push({
        key: `${nextItem.sourceLanguage}|${nextItem.targetLanguage}|${nextItem.context}|sequence`,
        sourceLanguage: nextItem.sourceLanguage,
        targetLanguage: nextItem.targetLanguage,
        context: nextItem.context,
        confidence: sequenceConfidence,
        sequencePattern: sequence.pattern.map(item => item.context).join(' -> '),
        source: 'user_behavior_sequence'
      });
    }

    // Sort by confidence and limit
    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxPredictions);
  } catch (error) {
    console.error('Error generating user behavior predictions:', error);
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
    languagePairCount: Object.keys(modelData.userPreferences.languagePairs).length,
    contextCount: Object.keys(modelData.userPreferences.contexts).length,
    sequenceCount: modelData.userPreferences.complexSequences.length,
    interactionTypeCount: Object.keys(modelData.interactionPatterns).length
  };
}

// Export the module
module.exports = {
  initialize,
  train,
  predict,
  getStatus
};
