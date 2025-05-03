/**
 * ML Model Adapter for Predictive Caching
 *
 * This module adapts the machine learning models to work with the
 * existing predictive caching system. It provides a unified interface
 * for training models and generating predictions.
 */

const fs = require('fs');
const path = require('path');
const {
  HoltWintersModel,
  ContentBasedFilteringModel,
  NetworkPatternModel,
  HybridRecommendationSystem
} = require('./prediction-model');
const ConnectionPredictionModel = require('./connection-prediction-model');

// Constants
const MODEL_STORAGE_PATH = path.join(__dirname, '../../data/ml-models');
const MODEL_FILE = path.join(MODEL_STORAGE_PATH, 'trained-models.json');
const DEFAULT_CONFIDENCE_THRESHOLD = 0.3;

// Ensure model storage directory exists
if (!fs.existsSync(MODEL_STORAGE_PATH)) {
  fs.mkdirSync(MODEL_STORAGE_PATH, { recursive: true });
}

// Model adapter class
class ModelAdapter {
  constructor() {
    this.hybridModel = new HybridRecommendationSystem();
    this.timeSeriesModel = new HoltWintersModel();
    this.contentModel = new ContentBasedFilteringModel();
    this.networkModel = new NetworkPatternModel();
    this.connectionPredictionModel = new ConnectionPredictionModel(); // New enhanced model
    this.isInitialized = false;
    this.lastTrainingTime = 0;
    this.modelPerformance = {
      timeSeries: 0.4,
      content: 0.4,
      network: 0.2
    };
    this.useEnhancedConnectionPrediction = true; // Flag to use enhanced model
  }

  /**
   * Initialize the model adapter
   *
   * @returns {Promise<boolean>} - Success status
   */
  async initialize() {
    try {
      // Load trained models if available
      if (fs.existsSync(MODEL_FILE)) {
        const modelData = JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
        this.lastTrainingTime = modelData.lastTrainingTime || 0;
        this.modelPerformance = modelData.modelPerformance || this.modelPerformance;
        this.useEnhancedConnectionPrediction = modelData.useEnhancedConnectionPrediction !== false;

        console.log('Loaded trained models from disk');
      } else {
        console.log('No trained models found, will train from scratch');
      }

      // Initialize the enhanced connection prediction model
      const connectionModelInitialized = this.connectionPredictionModel.initialize({
        thresholds: {
          minSamplesForConfidence: 10, // Lower threshold for development
          highRisk: 0.7,
          mediumRisk: 0.4,
          lowRisk: 0.2
        }
      });

      if (connectionModelInitialized) {
        console.log('Enhanced connection prediction model initialized successfully');
      } else {
        console.warn('Failed to initialize enhanced connection prediction model, will use basic model');
        this.useEnhancedConnectionPrediction = false;
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing model adapter:', error);
      return false;
    }
  }

  /**
   * Convert usage data to training data for ML models
   *
   * @param {Object} usageData - Usage data from predictive cache
   * @returns {Object} - Training data for ML models
   */
  convertUsageDataToTrainingData(usageData) {
    try {
      const trainingData = {
        timeSeriesData: [],
        contentItems: {},
        userInteractions: [],
        networkSamples: []
      };

      // Extract time series data
      if (usageData.timePatterns && usageData.timePatterns.hourly) {
        trainingData.timeSeriesData = [...usageData.timePatterns.hourly];
      }

      // Extract content items and user interactions
      if (usageData.usageLog && usageData.usageLog.length > 0) {
        // Use a single user ID for now (could be extended to multiple users)
        const userId = 'default-user';

        // Process each usage log entry
        for (let i = 0; i < usageData.usageLog.length; i++) {
          const entry = usageData.usageLog[i];
          const itemId = `${entry.sourceLanguage}-${entry.targetLanguage}-${entry.context}`;

          // Create content item if not exists
          if (!trainingData.contentItems[itemId]) {
            trainingData.contentItems[itemId] = {
              sourceLanguage: entry.sourceLanguage,
              targetLanguage: entry.targetLanguage,
              context: entry.context,
              complexity: entry.textLength > 200 ? 0.8 : entry.textLength > 100 ? 0.5 : 0.3,
              medicalTerms: entry.terms ? 1 : 0
            };
          }

          // Add user interaction
          trainingData.userInteractions.push({
            userId,
            itemId,
            weight: 1,
            timestamp: entry.timestamp
          });

          // Add network sample if available
          if (entry.deviceInfo && entry.deviceInfo.networkStatus) {
            trainingData.networkSamples.push({
              isOnline: entry.deviceInfo.networkStatus === 'online',
              timestamp: entry.timestamp
            });
          }
        }
      }

      // Extract network samples from network patterns
      if (usageData.networkPatterns) {
        // Convert offline time of day to network samples
        if (usageData.networkPatterns.offlineTimeOfDay) {
          const now = Date.now();
          const dayMs = 24 * 60 * 60 * 1000;

          for (let hour = 0; hour < 24; hour++) {
            const offlineCount = usageData.networkPatterns.offlineTimeOfDay[hour] || 0;

            if (offlineCount > 0) {
              // Create a timestamp for this hour
              const timestamp = now - (((new Date().getHours() - hour + 24) % 24) * 60 * 60 * 1000);

              // Add network sample
              trainingData.networkSamples.push({
                isOnline: false,
                timestamp
              });
            }
          }
        }
      }

      return trainingData;
    } catch (error) {
      console.error('Error converting usage data to training data:', error);
      return {
        timeSeriesData: [],
        contentItems: {},
        userInteractions: [],
        networkSamples: []
      };
    }
  }

  /**
   * Train models with usage data
   *
   * @param {Object} usageData - Usage data from predictive cache
   * @returns {Promise<boolean>} - Success status
   */
  async trainModels(usageData) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Convert usage data to training data
      const trainingData = this.convertUsageDataToTrainingData(usageData);

      // Train individual models
      if (trainingData.timeSeriesData.length > 0) {
        this.timeSeriesModel.train(trainingData.timeSeriesData);
      }

      // Train content model
      for (const [itemId, features] of Object.entries(trainingData.contentItems)) {
        this.contentModel.addContentItem(itemId, features);
      }

      for (const interaction of trainingData.userInteractions) {
        this.contentModel.updateUserPreferences(
          interaction.userId,
          interaction.itemId,
          interaction.weight
        );
      }

      // Train network model
      for (const sample of trainingData.networkSamples) {
        this.networkModel.addSample(sample.isOnline, new Date(sample.timestamp));
      }

      // Train hybrid model
      this.hybridModel.train(trainingData);

      // Update model weights based on performance
      this.hybridModel.updateModelWeights(this.modelPerformance);

      // Save trained models
      this.lastTrainingTime = Date.now();
      await this.saveModels();

      console.log('Successfully trained ML models');
      return true;
    } catch (error) {
      console.error('Error training models:', error);
      return false;
    }
  }

  /**
   * Save trained models to disk
   *
   * @returns {Promise<boolean>} - Success status
   */
  async saveModels() {
    try {
      // Create a simplified representation of the models for storage
      const modelData = {
        lastTrainingTime: this.lastTrainingTime,
        modelPerformance: this.modelPerformance,
        useEnhancedConnectionPrediction: this.useEnhancedConnectionPrediction,
        connectionModelStatus: this.connectionPredictionModel.getStatus()
      };

      // Save to disk
      fs.writeFileSync(MODEL_FILE, JSON.stringify(modelData, null, 2));

      return true;
    } catch (error) {
      console.error('Error saving models:', error);
      return false;
    }
  }

  /**
   * Generate predictions using trained models
   *
   * @param {Object} params - Prediction parameters
   * @returns {Array<Object>} - Predictions
   */
  generatePredictions(params) {
    try {
      if (!this.isInitialized) {
        console.warn('Model adapter not initialized, returning empty predictions');
        return [];
      }

      const {
        currentHour = new Date().getHours(),
        currentDay = new Date().getDay(),
        languagePair,
        context,
        confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
        maxPredictions = 20,
        includeOfflineRisk = true
      } = params;

      // Prepare parameters for hybrid model
      const hybridParams = {
        timeSeriesParams: {
          steps: 24 // Predict for next 24 hours
        },
        userId: 'default-user',
        count: maxPredictions,
        predictOfflineRisk: includeOfflineRisk,
        timestamp: new Date()
      };

      // Get recommendations from hybrid model
      const recommendations = this.hybridModel.getRecommendations(hybridParams);

      // Convert recommendations to predictions
      const predictions = [];

      for (const rec of recommendations) {
        // Skip low confidence predictions
        if (rec.score < confidenceThreshold) continue;

        // Handle different recommendation sources
        if (rec.source === 'content' && rec.itemId) {
          // Parse language pair and context from item ID
          const [sourceLanguage, targetLanguage, itemContext] = rec.itemId.split('-');

          predictions.push({
            sourceLanguage,
            targetLanguage,
            context: itemContext,
            score: rec.score,
            reason: 'ml_content_based',
            priority: rec.score > 0.7 ? 'high' : rec.score > 0.4 ? 'medium' : 'low'
          });
        } else if (rec.source === 'network' && rec.offlineRisk) {
          // Add network-based prediction
          if (languagePair) {
            const [sourceLanguage, targetLanguage] = languagePair.split('-');

            predictions.push({
              sourceLanguage,
              targetLanguage,
              context: context || 'general',
              score: rec.score,
              offlineRisk: rec.offlineRisk,
              reason: 'ml_offline_risk',
              priority: rec.offlineRisk > 0.7 ? 'critical' : rec.offlineRisk > 0.4 ? 'high' : 'medium'
            });
          }
        } else if (rec.source === 'timeSeries') {
          // Add time series prediction if we have language pair
          if (languagePair) {
            const [sourceLanguage, targetLanguage] = languagePair.split('-');

            predictions.push({
              sourceLanguage,
              targetLanguage,
              context: context || 'general',
              score: rec.score,
              timeStep: rec.step,
              reason: 'ml_time_series',
              priority: rec.score > 0.7 ? 'high' : rec.score > 0.4 ? 'medium' : 'low'
            });
          }
        }
      }

      // Add network pattern predictions
      if (includeOfflineRisk) {
        const offlineRisk = this.networkModel.predictOfflineRisk();
        const patterns = this.networkModel.findPatterns();

        // If we have high confidence patterns and offline risk
        if (patterns.confidence > 0.5 && offlineRisk > 0.3) {
          // Add predictions for peak offline hours
          for (const hour of patterns.patterns.peakOfflineHours) {
            // If this is a future hour today
            const currentHour = new Date().getHours();
            if (hour > currentHour) {
              // If we have a language pair, add a prediction
              if (languagePair) {
                const [sourceLanguage, targetLanguage] = languagePair.split('-');

                predictions.push({
                  sourceLanguage,
                  targetLanguage,
                  context: context || 'general',
                  score: offlineRisk * patterns.confidence,
                  reason: 'ml_offline_pattern',
                  offlineHour: hour,
                  priority: offlineRisk > 0.7 ? 'critical' : 'high'
                });
              }
            }
          }
        }
      }

      // Sort by score and limit
      return predictions
        .sort((a, b) => b.score - a.score)
        .slice(0, maxPredictions);
    } catch (error) {
      console.error('Error generating predictions:', error);
      return [];
    }
  }

  /**
   * Update model performance based on prediction accuracy
   *
   * @param {Object} performance - Performance metrics
   * @returns {boolean} - Success status
   */
  updatePerformance(performance) {
    try {
      this.modelPerformance = {
        ...this.modelPerformance,
        ...performance
      };

      // Update hybrid model weights
      this.hybridModel.updateModelWeights(this.modelPerformance);

      return true;
    } catch (error) {
      console.error('Error updating performance:', error);
      return false;
    }
  }

  /**
   * Predict offline risk for a specific time
   *
   * @param {Date} timestamp - Time to predict for
   * @returns {number} - Offline risk (0-1)
   */
  predictOfflineRisk(timestamp = new Date()) {
    try {
      return this.networkModel.predictOfflineRisk(timestamp);
    } catch (error) {
      console.error('Error predicting offline risk:', error);
      return 0;
    }
  }

  /**
   * Predict connection issues for a specific time and location
   *
   * @param {Date} timestamp - Time to predict for
   * @param {Object} options - Additional options for prediction
   * @returns {Object} - Connection issue prediction
   */
  predictConnectionIssues(timestamp = new Date(), options = {}) {
    try {
      if (!this.isInitialized) {
        console.warn('Model adapter not initialized, returning default prediction');
        return {
          risk: 0.1,
          confidence: 0,
          predictions: [],
          reason: 'not_initialized'
        };
      }

      // Use enhanced model if enabled and initialized
      if (this.useEnhancedConnectionPrediction && this.connectionPredictionModel.isInitialized) {
        const enhancedPrediction = this.connectionPredictionModel.predictConnectionIssues(timestamp, options);

        // Add model type to the prediction
        enhancedPrediction.modelType = 'enhanced';

        return enhancedPrediction;
      } else {
        // Fall back to basic model
        const basicPrediction = this.networkModel.predictConnectionIssues(timestamp, options);

        // Add model type to the prediction
        basicPrediction.modelType = 'basic';

        return basicPrediction;
      }
    } catch (error) {
      console.error('Error predicting connection issues:', error);
      return {
        risk: 0.1,
        confidence: 0,
        predictions: [],
        reason: 'error',
        error: error.message,
        modelType: 'fallback'
      };
    }
  }

  /**
   * Add a translation sample
   *
   * @param {Object} sample - Translation sample
   * @returns {boolean} - Success indicator
   */
  addTranslationSample(sample) {
    try {
      if (!this.isInitialized) {
        console.warn('Model adapter not initialized, sample not added');
        return false;
      }

      this.contentModel.addContentItem(sample.itemId, {
        sourceLanguage: sample.sourceLanguage,
        targetLanguage: sample.targetLanguage,
        context: sample.context || 'general',
        complexity: sample.complexity || 0.5,
        medicalTerms: sample.medicalTerms ? 1 : 0
      });

      this.isDirty = true;
      return true;
    } catch (error) {
      console.error('Error adding translation sample:', error);
      return false;
    }
  }

  /**
   * Add a network sample to the connection prediction models
   *
   * @param {boolean} isOnline - Whether the network is online
   * @param {Date} timestamp - Time of the sample
   * @param {Object} additionalData - Additional data about the network
   * @returns {boolean} - Success status
   */
  addNetworkSample(isOnline, timestamp = new Date(), additionalData = {}) {
    try {
      if (!this.isInitialized) {
        console.warn('Model adapter not initialized, sample not added');
        return false;
      }

      // Add to basic network model
      this.networkModel.addSample(isOnline, timestamp, additionalData);

      // Add to enhanced connection prediction model if enabled
      if (this.useEnhancedConnectionPrediction) {
        this.connectionPredictionModel.addSample(isOnline, timestamp, additionalData);
      }

      return true;
    } catch (error) {
      console.error('Error adding network sample:', error);
      return false;
    }
  }

  /**
   * Get model status information
   *
   * @returns {Object} - Model status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      lastTrainingTime: this.lastTrainingTime,
      modelPerformance: this.modelPerformance,
      useEnhancedConnectionPrediction: this.useEnhancedConnectionPrediction,
      enhancedModelStatus: this.useEnhancedConnectionPrediction ?
        this.connectionPredictionModel.getStatus() : null
    };
  }
}

// Create and export singleton instance
const modelAdapter = new ModelAdapter();
module.exports = {
  modelAdapter,
  ModelAdapter // Export the class for creating new instances
};
