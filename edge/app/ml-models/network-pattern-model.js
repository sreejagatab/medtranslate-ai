/**
 * Network Pattern Model for Predictive Caching
 *
 * This module implements a model for predicting network connectivity patterns
 * and offline periods. It analyzes historical network data to identify patterns
 * and predict future connectivity issues.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_MODEL_FILE = 'network-pattern-model.json';
const DEFAULT_CONFIDENCE_THRESHOLD = 0.3;
const DEFAULT_MAX_PREDICTIONS = 50;
const FORECAST_HOURS = 24; // Forecast for the next 24 hours

// State
let isInitialized = false;
let modelData = {
  offlineTimeOfDay: Array(24).fill(0),
  offlineDayOfWeek: Array(7).fill(0),
  offlineFrequency: 0,
  offlineDurations: [],
  averageOfflineDuration: 0,
  locationConnectivity: {},
  networkTransitions: {
    onlineToOffline: Array(24).fill(0),
    offlineToOnline: Array(24).fill(0)
  },
  offlinePredictions: [],
  lastUpdated: 0,
  version: '1.0'
};
let modelDir = '';
let modelFile = '';

/**
 * Initialize the network pattern model
 *
 * @param {Object} options - Initialization options
 * @returns {Promise<boolean>} - Whether initialization was successful
 */
async function initialize(options = {}) {
  try {
    console.log('Initializing network pattern model...');

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
        console.log('Loaded network pattern model data');
      } catch (error) {
        console.error('Error loading network pattern model data:', error);
        // Use default model data
      }
    } else {
      // Save default model data
      await saveModel();
    }

    isInitialized = true;
    console.log('Network pattern model initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing network pattern model:', error);
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
    console.log('Saved network pattern model data');
    return true;
  } catch (error) {
    console.error('Error saving network pattern model data:', error);
    return false;
  }
}

/**
 * Train the network pattern model with usage data
 *
 * @param {Object} usageStats - Usage statistics
 * @returns {Promise<boolean>} - Whether training was successful
 */
async function train(usageStats) {
  try {
    if (!isInitialized) {
      await initialize();
    }

    console.log('Training network pattern model...');

    // Process offline time of day patterns
    if (usageStats.networkPatterns && usageStats.networkPatterns.offlineTimeOfDay) {
      // Update offline time of day patterns with exponential smoothing
      const alpha = 0.3; // Smoothing factor
      for (let i = 0; i < 24; i++) {
        const newValue = usageStats.networkPatterns.offlineTimeOfDay[i] || 0;
        modelData.offlineTimeOfDay[i] = alpha * newValue + (1 - alpha) * modelData.offlineTimeOfDay[i];
      }
    }

    // Process offline day of week patterns
    if (usageStats.networkPatterns && usageStats.networkPatterns.weeklyOfflinePatterns) {
      // Update offline day of week patterns with exponential smoothing
      const alpha = 0.3; // Smoothing factor
      for (let i = 0; i < 7; i++) {
        const newValue = usageStats.networkPatterns.weeklyOfflinePatterns[i] || 0;
        modelData.offlineDayOfWeek[i] = alpha * newValue + (1 - alpha) * modelData.offlineDayOfWeek[i];
      }
    }

    // Process offline frequency
    if (usageStats.networkPatterns && typeof usageStats.networkPatterns.offlineFrequency === 'number') {
      // Update offline frequency with exponential smoothing
      const alpha = 0.3; // Smoothing factor
      const newValue = usageStats.networkPatterns.offlineFrequency;
      modelData.offlineFrequency = alpha * newValue + (1 - alpha) * modelData.offlineFrequency;
    }

    // Process offline durations
    if (usageStats.networkPatterns && usageStats.networkPatterns.offlineDurations) {
      // Add new offline durations
      modelData.offlineDurations = [
        ...modelData.offlineDurations,
        ...usageStats.networkPatterns.offlineDurations
      ];

      // Keep only the last 100 durations
      if (modelData.offlineDurations.length > 100) {
        modelData.offlineDurations = modelData.offlineDurations.slice(-100);
      }

      // Calculate average offline duration
      if (modelData.offlineDurations.length > 0) {
        modelData.averageOfflineDuration = modelData.offlineDurations.reduce((sum, duration) => sum + duration, 0) / modelData.offlineDurations.length;
      }
    }

    // Process location connectivity
    if (usageStats.locationPatterns && usageStats.locationPatterns.locationConnectivity) {
      for (const [location, connectivity] of Object.entries(usageStats.locationPatterns.locationConnectivity)) {
        if (!modelData.locationConnectivity[location]) {
          modelData.locationConnectivity[location] = {
            onlineCount: 0,
            offlineCount: 0,
            lastStatus: null,
            networkQuality: []
          };
        }

        // Update with exponential smoothing
        const alpha = 0.3; // Smoothing factor
        modelData.locationConnectivity[location].onlineCount = alpha * (connectivity.onlineCount || 0) + (1 - alpha) * modelData.locationConnectivity[location].onlineCount;
        modelData.locationConnectivity[location].offlineCount = alpha * (connectivity.offlineCount || 0) + (1 - alpha) * modelData.locationConnectivity[location].offlineCount;
        
        // Update last status
        if (connectivity.lastStatus) {
          modelData.locationConnectivity[location].lastStatus = connectivity.lastStatus;
        }

        // Update network quality
        if (connectivity.networkQuality && connectivity.networkQuality.length > 0) {
          modelData.locationConnectivity[location].networkQuality = [
            ...modelData.locationConnectivity[location].networkQuality,
            ...connectivity.networkQuality
          ];

          // Keep only the last 10 quality measurements
          if (modelData.locationConnectivity[location].networkQuality.length > 10) {
            modelData.locationConnectivity[location].networkQuality = modelData.locationConnectivity[location].networkQuality.slice(-10);
          }
        }
      }
    }

    // Process network transitions
    if (usageStats.networkPatterns && usageStats.networkPatterns.networkTransitions) {
      // Update online to offline transitions
      if (usageStats.networkPatterns.networkTransitions.onlineToOffline) {
        for (let i = 0; i < 24; i++) {
          const newValue = usageStats.networkPatterns.networkTransitions.onlineToOffline[i] || 0;
          modelData.networkTransitions.onlineToOffline[i] = (modelData.networkTransitions.onlineToOffline[i] || 0) + newValue;
        }
      }

      // Update offline to online transitions
      if (usageStats.networkPatterns.networkTransitions.offlineToOnline) {
        for (let i = 0; i < 24; i++) {
          const newValue = usageStats.networkPatterns.networkTransitions.offlineToOnline[i] || 0;
          modelData.networkTransitions.offlineToOnline[i] = (modelData.networkTransitions.offlineToOnline[i] || 0) + newValue;
        }
      }
    }

    // Generate offline predictions
    generateOfflinePredictions();

    // Save updated model
    await saveModel();

    console.log('Network pattern model training completed');
    return true;
  } catch (error) {
    console.error('Error training network pattern model:', error);
    return false;
  }
}

/**
 * Generate offline predictions
 */
function generateOfflinePredictions() {
  try {
    // Clear existing predictions
    modelData.offlinePredictions = [];

    // Skip if offline frequency is too low
    if (modelData.offlineFrequency < 0.1) {
      return;
    }

    const now = Date.now();
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    // Find peak offline hours
    const peakOfflineHours = [];
    const maxOfflineValue = Math.max(...modelData.offlineTimeOfDay);
    
    if (maxOfflineValue > 0) {
      for (let i = 0; i < 24; i++) {
        if (modelData.offlineTimeOfDay[i] > maxOfflineValue * 0.7) {
          peakOfflineHours.push(i);
        }
      }
    }

    // Generate predictions for peak offline hours
    for (const hour of peakOfflineHours) {
      // Skip if this hour has already passed today
      if (hour <= currentHour) {
        continue;
      }

      // Calculate time until this hour
      const hoursUntil = hour - currentHour;
      const predictedStartTime = now + hoursUntil * 60 * 60 * 1000;

      // Calculate confidence based on offline frequency and historical data
      const hourFactor = modelData.offlineTimeOfDay[hour] / maxOfflineValue;
      const dayFactor = modelData.offlineDayOfWeek[currentDay] / Math.max(1, Math.max(...modelData.offlineDayOfWeek));
      const confidence = modelData.offlineFrequency * hourFactor * (0.5 + 0.5 * dayFactor);

      // Skip if confidence is too low
      if (confidence < 0.3) {
        continue;
      }

      // Add prediction
      modelData.offlinePredictions.push({
        predictedStartTime,
        predictedDuration: modelData.averageOfflineDuration,
        confidence,
        hour,
        day: currentDay
      });
    }

    // Sort predictions by start time
    modelData.offlinePredictions.sort((a, b) => a.predictedStartTime - b.predictedStartTime);
  } catch (error) {
    console.error('Error generating offline predictions:', error);
  }
}

/**
 * Generate predictions using the network pattern model
 *
 * @param {Object} options - Prediction options
 * @returns {Array} - Predictions
 */
function predict(options = {}) {
  try {
    if (!isInitialized) {
      console.warn('Network pattern model not initialized');
      return [];
    }

    const {
      confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
      maxPredictions = DEFAULT_MAX_PREDICTIONS,
      currentHour = new Date().getHours(),
      currentDay = new Date().getDay(),
      context,
      languagePair,
      location
    } = options;

    const predictions = [];

    // Get offline predictions
    const offlinePredictions = predictOfflinePeriods();

    // Skip if no offline predictions
    if (offlinePredictions.length === 0) {
      return [];
    }

    // Generate predictions for each offline period
    for (const offlinePrediction of offlinePredictions) {
      // Skip if confidence is below threshold
      if (offlinePrediction.confidence < confidenceThreshold) {
        continue;
      }

      // Generate predictions for specific language pair if provided
      if (languagePair) {
        const [sourceLanguage, targetLanguage] = languagePair.split('-');

        predictions.push({
          key: `${sourceLanguage}|${targetLanguage}|${context || 'general'}|offline`,
          sourceLanguage,
          targetLanguage,
          context: context || 'general',
          confidence: offlinePrediction.confidence,
          offlinePrediction,
          source: 'network_pattern'
        });
      } else {
        // Generate predictions for all common language pairs
        // In a real implementation, this would use historical data to determine common language pairs
        const commonLanguagePairs = [
          { source: 'en', target: 'es' },
          { source: 'en', target: 'fr' },
          { source: 'en', target: 'de' },
          { source: 'en', target: 'zh' }
        ];

        for (const pair of commonLanguagePairs) {
          predictions.push({
            key: `${pair.source}|${pair.target}|${context || 'general'}|offline`,
            sourceLanguage: pair.source,
            targetLanguage: pair.target,
            context: context || 'general',
            confidence: offlinePrediction.confidence,
            offlinePrediction,
            source: 'network_pattern'
          });
        }
      }
    }

    // Sort by confidence and limit
    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxPredictions);
  } catch (error) {
    console.error('Error generating network pattern predictions:', error);
    return [];
  }
}

/**
 * Predict offline periods
 *
 * @returns {Array} - Predicted offline periods
 */
function predictOfflinePeriods() {
  try {
    // Return existing predictions if available
    if (modelData.offlinePredictions.length > 0) {
      // Filter out expired predictions
      const now = Date.now();
      return modelData.offlinePredictions.filter(prediction => prediction.predictedStartTime > now);
    }

    // Generate new predictions
    generateOfflinePredictions();
    
    // Return new predictions
    return modelData.offlinePredictions;
  } catch (error) {
    console.error('Error predicting offline periods:', error);
    return [];
  }
}

/**
 * Predict offline risk
 *
 * @param {Object} options - Prediction options
 * @returns {Object} - Offline risk prediction
 */
function predictOfflineRisk(options = {}) {
  try {
    if (!isInitialized) {
      console.warn('Network pattern model not initialized');
      return {
        offlinePredicted: false,
        confidence: 0,
        predictedDuration: 0
      };
    }

    const {
      timestamp = Date.now(),
      location,
      lookAheadHours = 6
    } = options;

    // Get offline predictions
    const offlinePredictions = predictOfflinePeriods();

    // Find the nearest predicted offline period
    let nearestPrediction = null;
    let minTimeDiff = Infinity;

    for (const prediction of offlinePredictions) {
      const timeDiff = prediction.predictedStartTime - timestamp;
      
      // Skip if prediction is in the past or too far in the future
      if (timeDiff < 0 || timeDiff > lookAheadHours * 60 * 60 * 1000) {
        continue;
      }
      
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        nearestPrediction = prediction;
      }
    }

    // If we found a prediction, return it
    if (nearestPrediction) {
      return {
        offlinePredicted: true,
        confidence: nearestPrediction.confidence,
        predictedStartTime: nearestPrediction.predictedStartTime,
        predictedDuration: nearestPrediction.predictedDuration,
        timeUntilOffline: minTimeDiff
      };
    }

    // Check location-based risk if location is provided
    if (location && modelData.locationConnectivity[location]) {
      const locationData = modelData.locationConnectivity[location];
      const totalChecks = locationData.onlineCount + locationData.offlineCount;
      
      if (totalChecks > 0) {
        const offlineRatio = locationData.offlineCount / totalChecks;
        
        // If location has high offline ratio, predict offline
        if (offlineRatio > 0.5) {
          return {
            offlinePredicted: true,
            confidence: offlineRatio,
            predictedStartTime: timestamp + 30 * 60 * 1000, // Assume 30 minutes from now
            predictedDuration: modelData.averageOfflineDuration,
            timeUntilOffline: 30 * 60 * 1000,
            locationBased: true
          };
        }
      }
    }

    // No offline predicted
    return {
      offlinePredicted: false,
      confidence: 0,
      predictedDuration: 0
    };
  } catch (error) {
    console.error('Error predicting offline risk:', error);
    return {
      offlinePredicted: false,
      confidence: 0,
      predictedDuration: 0,
      error: error.message
    };
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
    offlineFrequency: modelData.offlineFrequency,
    averageOfflineDuration: modelData.averageOfflineDuration,
    locationCount: Object.keys(modelData.locationConnectivity).length,
    predictionCount: modelData.offlinePredictions.length
  };
}

// Export the module
module.exports = {
  initialize,
  train,
  predict,
  predictOfflineRisk,
  getStatus
};
