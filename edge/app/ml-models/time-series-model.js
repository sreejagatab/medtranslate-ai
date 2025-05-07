/**
 * Time Series Model for Predictive Caching
 *
 * This module implements a time series model for predicting cache needs
 * based on temporal patterns. It uses simple time series analysis techniques
 * to identify patterns in usage data over time.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_MODEL_FILE = 'time-series-model.json';
const DEFAULT_CONFIDENCE_THRESHOLD = 0.3;
const DEFAULT_MAX_PREDICTIONS = 50;
const FORECAST_HOURS = 24; // Forecast for the next 24 hours

// State
let isInitialized = false;
let modelData = {
  hourlyPatterns: Array(24).fill(0),
  dailyPatterns: Array(7).fill(0),
  hourlyLanguagePairs: {},
  dailyLanguagePairs: {},
  hourlyContexts: {},
  dailyContexts: {},
  seasonalFactors: {
    hourly: Array(24).fill(1),
    daily: Array(7).fill(1)
  },
  trendFactors: {
    hourly: 0,
    daily: 0
  },
  lastUpdated: 0,
  version: '1.0'
};
let modelDir = '';
let modelFile = '';

/**
 * Initialize the time series model
 *
 * @param {Object} options - Initialization options
 * @returns {Promise<boolean>} - Whether initialization was successful
 */
async function initialize(options = {}) {
  try {
    console.log('Initializing time series model...');

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
        console.log('Loaded time series model data');
      } catch (error) {
        console.error('Error loading time series model data:', error);
        // Use default model data
      }
    } else {
      // Save default model data
      await saveModel();
    }

    isInitialized = true;
    console.log('Time series model initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing time series model:', error);
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
    console.log('Saved time series model data');
    return true;
  } catch (error) {
    console.error('Error saving time series model data:', error);
    return false;
  }
}

/**
 * Train the time series model with usage data
 *
 * @param {Object} usageStats - Usage statistics
 * @returns {Promise<boolean>} - Whether training was successful
 */
async function train(usageStats) {
  try {
    if (!isInitialized) {
      await initialize();
    }

    console.log('Training time series model...');

    // Process hourly patterns
    if (usageStats.timePatterns && usageStats.timePatterns.hourly) {
      // Update hourly patterns with exponential smoothing
      const alpha = 0.3; // Smoothing factor
      for (let i = 0; i < 24; i++) {
        const newValue = usageStats.timePatterns.hourly[i] || 0;
        modelData.hourlyPatterns[i] = alpha * newValue + (1 - alpha) * modelData.hourlyPatterns[i];
      }
    }

    // Process daily patterns
    if (usageStats.timePatterns && usageStats.timePatterns.daily) {
      // Update daily patterns with exponential smoothing
      const alpha = 0.3; // Smoothing factor
      for (let i = 0; i < 7; i++) {
        const newValue = usageStats.timePatterns.daily[i] || 0;
        modelData.dailyPatterns[i] = alpha * newValue + (1 - alpha) * modelData.dailyPatterns[i];
      }
    }

    // Process hourly language pair patterns
    if (usageStats.timePatterns && usageStats.timePatterns.hourlyLanguagePairs) {
      for (const [pair, hourlyData] of Object.entries(usageStats.timePatterns.hourlyLanguagePairs)) {
        if (!modelData.hourlyLanguagePairs[pair]) {
          modelData.hourlyLanguagePairs[pair] = Array(24).fill(0);
        }

        // Update with exponential smoothing
        const alpha = 0.3; // Smoothing factor
        for (let i = 0; i < 24; i++) {
          const newValue = hourlyData[i] || 0;
          modelData.hourlyLanguagePairs[pair][i] = alpha * newValue + (1 - alpha) * modelData.hourlyLanguagePairs[pair][i];
        }
      }
    }

    // Process daily language pair patterns
    if (usageStats.timePatterns && usageStats.timePatterns.dailyLanguagePairs) {
      for (const [pair, dailyData] of Object.entries(usageStats.timePatterns.dailyLanguagePairs)) {
        if (!modelData.dailyLanguagePairs[pair]) {
          modelData.dailyLanguagePairs[pair] = Array(7).fill(0);
        }

        // Update with exponential smoothing
        const alpha = 0.3; // Smoothing factor
        for (let i = 0; i < 7; i++) {
          const newValue = dailyData[i] || 0;
          modelData.dailyLanguagePairs[pair][i] = alpha * newValue + (1 - alpha) * modelData.dailyLanguagePairs[pair][i];
        }
      }
    }

    // Process hourly context patterns
    if (usageStats.timePatterns && usageStats.timePatterns.hourlyContexts) {
      for (const [context, hourlyData] of Object.entries(usageStats.timePatterns.hourlyContexts)) {
        if (!modelData.hourlyContexts[context]) {
          modelData.hourlyContexts[context] = Array(24).fill(0);
        }

        // Update with exponential smoothing
        const alpha = 0.3; // Smoothing factor
        for (let i = 0; i < 24; i++) {
          const newValue = hourlyData[i] || 0;
          modelData.hourlyContexts[context][i] = alpha * newValue + (1 - alpha) * modelData.hourlyContexts[context][i];
        }
      }
    }

    // Process daily context patterns
    if (usageStats.timePatterns && usageStats.timePatterns.dailyContexts) {
      for (const [context, dailyData] of Object.entries(usageStats.timePatterns.dailyContexts)) {
        if (!modelData.dailyContexts[context]) {
          modelData.dailyContexts[context] = Array(7).fill(0);
        }

        // Update with exponential smoothing
        const alpha = 0.3; // Smoothing factor
        for (let i = 0; i < 7; i++) {
          const newValue = dailyData[i] || 0;
          modelData.dailyContexts[context][i] = alpha * newValue + (1 - alpha) * modelData.dailyContexts[context][i];
        }
      }
    }

    // Calculate seasonal factors
    calculateSeasonalFactors();

    // Calculate trend factors
    calculateTrendFactors(usageStats);

    // Save updated model
    await saveModel();

    console.log('Time series model training completed');
    return true;
  } catch (error) {
    console.error('Error training time series model:', error);
    return false;
  }
}

/**
 * Calculate seasonal factors
 */
function calculateSeasonalFactors() {
  try {
    // Calculate hourly seasonal factors
    const hourlySum = modelData.hourlyPatterns.reduce((sum, val) => sum + val, 0);
    if (hourlySum > 0) {
      const hourlyAvg = hourlySum / 24;
      modelData.seasonalFactors.hourly = modelData.hourlyPatterns.map(val => 
        hourlyAvg > 0 ? val / hourlyAvg : 1
      );
    }

    // Calculate daily seasonal factors
    const dailySum = modelData.dailyPatterns.reduce((sum, val) => sum + val, 0);
    if (dailySum > 0) {
      const dailyAvg = dailySum / 7;
      modelData.seasonalFactors.daily = modelData.dailyPatterns.map(val => 
        dailyAvg > 0 ? val / dailyAvg : 1
      );
    }
  } catch (error) {
    console.error('Error calculating seasonal factors:', error);
  }
}

/**
 * Calculate trend factors
 *
 * @param {Object} usageStats - Usage statistics
 */
function calculateTrendFactors(usageStats) {
  try {
    // Simple trend calculation based on recent usage
    if (usageStats.recentUsage && usageStats.recentUsage.length >= 2) {
      const recent = usageStats.recentUsage.slice(-2);
      const oldValue = recent[0];
      const newValue = recent[1];
      
      if (oldValue > 0) {
        const trendFactor = (newValue - oldValue) / oldValue;
        
        // Update hourly trend with smoothing
        const alpha = 0.2; // Smoothing factor
        modelData.trendFactors.hourly = alpha * trendFactor + (1 - alpha) * modelData.trendFactors.hourly;
        
        // Update daily trend with smoothing
        modelData.trendFactors.daily = alpha * trendFactor + (1 - alpha) * modelData.trendFactors.daily;
      }
    }
  } catch (error) {
    console.error('Error calculating trend factors:', error);
  }
}

/**
 * Generate predictions using the time series model
 *
 * @param {Object} options - Prediction options
 * @returns {Array} - Predictions
 */
function predict(options = {}) {
  try {
    if (!isInitialized) {
      console.warn('Time series model not initialized');
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

    // Generate hourly predictions for the next FORECAST_HOURS hours
    for (let hour = 1; hour <= FORECAST_HOURS; hour++) {
      const forecastHour = (currentHour + hour) % 24;
      const forecastDay = (currentDay + Math.floor((currentHour + hour) / 24)) % 7;
      
      // Get base hourly and daily factors
      const hourlyFactor = modelData.seasonalFactors.hourly[forecastHour];
      const dailyFactor = modelData.seasonalFactors.daily[forecastDay];
      
      // Apply trend
      const trendFactor = 1 + (modelData.trendFactors.hourly * hour / 24) + (modelData.trendFactors.daily * Math.floor((currentHour + hour) / 24) / 7);
      
      // Calculate base confidence
      const baseConfidence = hourlyFactor * dailyFactor * trendFactor;
      
      // Skip if base confidence is below threshold
      if (baseConfidence < confidenceThreshold) {
        continue;
      }

      // Generate language pair specific predictions
      if (languagePair) {
        // If we have data for this language pair
        if (modelData.hourlyLanguagePairs[languagePair]) {
          const pairHourlyFactor = modelData.hourlyLanguagePairs[languagePair][forecastHour];
          const pairConfidence = baseConfidence * pairHourlyFactor;
          
          if (pairConfidence >= confidenceThreshold) {
            const [sourceLanguage, targetLanguage] = languagePair.split('-');
            
            predictions.push({
              key: `${sourceLanguage}|${targetLanguage}|${context || 'general'}|${forecastHour}`,
              sourceLanguage,
              targetLanguage,
              context: context || 'general',
              confidence: pairConfidence,
              hour: forecastHour,
              day: forecastDay,
              hourOffset: hour,
              source: 'time_series'
            });
          }
        }
      } else {
        // Generate predictions for all language pairs
        for (const [pair, hourlyData] of Object.entries(modelData.hourlyLanguagePairs)) {
          const pairHourlyFactor = hourlyData[forecastHour];
          const pairConfidence = baseConfidence * pairHourlyFactor;
          
          if (pairConfidence >= confidenceThreshold) {
            const [sourceLanguage, targetLanguage] = pair.split('-');
            
            // Skip if context filter is applied and we have context data
            if (context && modelData.hourlyContexts[context]) {
              const contextFactor = modelData.hourlyContexts[context][forecastHour];
              if (contextFactor < 0.3) { // Skip if context is unlikely at this hour
                continue;
              }
            }
            
            predictions.push({
              key: `${sourceLanguage}|${targetLanguage}|${context || 'general'}|${forecastHour}`,
              sourceLanguage,
              targetLanguage,
              context: context || 'general',
              confidence: pairConfidence,
              hour: forecastHour,
              day: forecastDay,
              hourOffset: hour,
              source: 'time_series'
            });
          }
        }
      }
    }

    // Sort by confidence and limit
    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxPredictions);
  } catch (error) {
    console.error('Error generating time series predictions:', error);
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
    languagePairCount: Object.keys(modelData.hourlyLanguagePairs).length,
    contextCount: Object.keys(modelData.hourlyContexts).length,
    trendFactors: modelData.trendFactors
  };
}

// Export the module
module.exports = {
  initialize,
  train,
  predict,
  getStatus
};
