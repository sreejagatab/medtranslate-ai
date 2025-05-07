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
const {
  ARIMAModel,
  ProphetInspiredModel,
  EnsembleTimeSeriesModel
} = require('./advanced-time-series');
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

    // Advanced time series models with edge computing optimizations
    this.advancedTimeSeriesModel = new EnsembleTimeSeriesModel({
      models: [
        { type: 'ARIMA', params: { p: 2, d: 1, q: 1 } },
        { type: 'ProphetInspired', params: { seasonalPeriods: [24, 168] } },
        { type: 'LSTMInspired', params: { hiddenUnits: 4, windowSize: 24 } }
      ],
      edgeOptimized: true,
      memoryConstraint: 'medium',
      batteryAware: true,
      adaptiveComplexity: true
    });

    // Legacy time series model (kept for backward compatibility)
    this.timeSeriesModel = new HoltWintersModel();

    this.contentModel = new ContentBasedFilteringModel();
    this.networkModel = new NetworkPatternModel();
    this.connectionPredictionModel = new ConnectionPredictionModel();

    this.isInitialized = false;
    this.lastTrainingTime = 0;
    this.modelPerformance = {
      advancedTimeSeries: 0.5,
      timeSeries: 0.2,
      content: 0.2,
      network: 0.1
    };

    this.useEnhancedConnectionPrediction = true; // Flag to use enhanced model
    this.useAdvancedTimeSeriesModels = true; // Flag to use advanced time series models
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
        this.useAdvancedTimeSeriesModels = modelData.useAdvancedTimeSeriesModels !== false;

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

      // Log advanced time series model status
      if (this.useAdvancedTimeSeriesModels) {
        console.log('Using advanced time series models for prediction');
        console.log('Advanced models configuration:',
          this.advancedTimeSeriesModel.models.map(m => m.constructor.name).join(', '));
      } else {
        console.log('Using legacy time series model (HoltWinters) for prediction');
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

      // Train time series models
      if (trainingData.timeSeriesData.length > 0) {
        // Train legacy time series model
        this.timeSeriesModel.train(trainingData.timeSeriesData);

        // Train advanced time series models if enabled
        if (this.useAdvancedTimeSeriesModels) {
          console.log('Training advanced time series models...');
          const success = this.advancedTimeSeriesModel.train(trainingData.timeSeriesData);

          if (success) {
            console.log('Advanced time series models trained successfully');

            // Get model status
            const modelStatus = this.advancedTimeSeriesModel.getStatus();
            console.log('Advanced time series model status:',
              modelStatus.models.map(m => `${m.type} (weight: ${m.weight.toFixed(2)})`).join(', '));
          } else {
            console.warn('Failed to train advanced time series models, falling back to legacy model');
            this.useAdvancedTimeSeriesModels = false;
          }
        }
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
        useAdvancedTimeSeriesModels: this.useAdvancedTimeSeriesModels,
        connectionModelStatus: this.connectionPredictionModel.getStatus(),
        advancedTimeSeriesStatus: this.useAdvancedTimeSeriesModels ?
          this.advancedTimeSeriesModel.getStatus() : null
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
  /**
   * Validate prediction parameters and set defaults
   *
   * @param {Object} params - Input parameters
   * @returns {Object} - Validated parameters with defaults
   */
  validatePredictionParams(params) {
    // Set defaults and validate
    return {
      currentHour: params.currentHour || new Date().getHours(),
      currentDay: params.currentDay || new Date().getDay(),
      languagePair: params.languagePair,
      context: params.context,
      confidenceThreshold: params.confidenceThreshold || DEFAULT_CONFIDENCE_THRESHOLD,
      maxPredictions: params.maxPredictions || 20,
      includeOfflineRisk: params.includeOfflineRisk !== false,
      batteryLevel: params.batteryLevel || 100,
      isCharging: params.isCharging !== false,
      networkConnected: params.networkConnected !== false,
      availableMemoryMB: params.availableMemoryMB || 1000,
      devicePerformance: params.devicePerformance || 'medium'
    };
  }

  generatePredictions(params) {
    try {
      if (!this.isInitialized) {
        console.warn('Model adapter not initialized, returning empty predictions');
        return [];
      }

      console.log('Using ML model adapter for predictions');

      // Validate and set default parameters
      const validatedParams = this.validatePredictionParams(params);

      const {
        currentHour,
        currentDay,
        languagePair,
        context,
        confidenceThreshold,
        maxPredictions,
        includeOfflineRisk
      } = validatedParams;

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
      let recommendations = [];
      try {
        recommendations = this.hybridModel.getRecommendations(hybridParams);
        console.log(`Received ${recommendations.length} recommendations from hybrid model`);
      } catch (hybridError) {
        console.error('Error getting recommendations from hybrid model:', hybridError);
        // Continue with empty recommendations - we'll try other models
      }

      // Convert recommendations to predictions
      const predictions = [];

      for (const rec of recommendations) {
        // Skip low confidence predictions
        if (!rec.score || rec.score < confidenceThreshold) continue;

        // Handle different recommendation sources
        if (rec.source === 'content' && rec.itemId) {
          // Parse language pair and context from item ID
          const parts = rec.itemId.split('-');
          if (parts.length >= 3) {
            const [sourceLanguage, targetLanguage, itemContext] = parts;

            predictions.push({
              sourceLanguage,
              targetLanguage,
              context: itemContext,
              score: rec.score,
              reason: 'ml_content_based',
              priority: rec.score > 0.7 ? 'high' : rec.score > 0.4 ? 'medium' : 'low'
            });
          }
        } else if (rec.source === 'network' && rec.offlineRisk) {
          // Add network-based prediction
          if (languagePair) {
            const parts = languagePair.split('-');
            if (parts.length >= 2) {
              const [sourceLanguage, targetLanguage] = parts;

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
          }
        } else if (rec.source === 'timeSeries') {
          // Add time series prediction if we have language pair
          if (languagePair) {
            const parts = languagePair.split('-');
            if (parts.length >= 2) {
              const [sourceLanguage, targetLanguage] = parts;

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
      }

      // Add advanced time series predictions if enabled
      if (this.useAdvancedTimeSeriesModels && languagePair) {
        try {
          // Get predictions from advanced time series model
          const timeSteps = 24; // Predict for next 24 hours

          // Get device state information for edge-optimized predictions
          const deviceState = {
            batteryLevel: validatedParams.batteryLevel,
            isCharging: validatedParams.isCharging,
            networkConnected: validatedParams.networkConnected,
            availableMemoryMB: validatedParams.availableMemoryMB,
            devicePerformance: validatedParams.devicePerformance
          };

          // Validate the advanced time series model is ready
          if (!this.advancedTimeSeriesModel) {
            throw new Error('Advanced time series model not initialized');
          }

          // Check if the model has the required methods
          const predictMethod = this.advancedTimeSeriesModel.predict || this.advancedTimeSeriesModel.predictMultipleSteps;

          if (typeof predictMethod !== 'function') {
            throw new Error('Advanced time series model missing predict or predictMultipleSteps method');
          }

          // Pass device state to the prediction model
          let advancedPredictions;
          try {
            // Try to use predict method with device state
            if (typeof this.advancedTimeSeriesModel.predict === 'function') {
              advancedPredictions = this.advancedTimeSeriesModel.predict(timeSteps, deviceState);
            }
            // Fall back to predictMultipleSteps if predict is not available
            else if (typeof this.advancedTimeSeriesModel.predictMultipleSteps === 'function') {
              advancedPredictions = this.advancedTimeSeriesModel.predictMultipleSteps(timeSteps);
            }
          } catch (predictionError) {
            console.error('Error calling prediction method:', predictionError);
            throw predictionError;
          }

          // Validate predictions
          if (!Array.isArray(advancedPredictions)) {
            console.error('Advanced time series model returned invalid predictions:', advancedPredictions);
            throw new Error('Advanced time series model returned invalid predictions (not an array)');
          }

          // Convert to prediction format
          const parts = languagePair.split('-');
          if (parts.length >= 2) {
            const [sourceLanguage, targetLanguage] = parts;

            console.log(`Generated ${advancedPredictions.length} ML-based predictions using advanced models`);

            // Get model status for detailed logging
            let modelStatus;
            try {
              modelStatus = this.advancedTimeSeriesModel.getStatus();
              console.log(`Using ${modelStatus.modelCount} time series models (${modelStatus.activeModels.join(', ')})`);
              console.log(`Prediction performance: ${modelStatus.performance.computeTimeMs}ms, ${modelStatus.performance.memoryUsageMB.toFixed(2)}MB`);
            } catch (statusError) {
              console.warn('Error getting advanced time series model status:', statusError);
              modelStatus = { modelCount: 'unknown', activeModels: ['unknown'], performance: { computeTimeMs: 0, memoryUsageMB: 0 } };
            }

            for (let i = 0; i < advancedPredictions.length; i++) {
              const predictionValue = advancedPredictions[i];
              // Only add if prediction is significant and valid
              if (predictionValue && !isNaN(predictionValue) && predictionValue > 0.3) {
                predictions.push({
                  sourceLanguage,
                  targetLanguage,
                  context: context || 'general',
                  score: predictionValue,
                  timeStep: i + 1,
                  reason: 'ml_advanced_time_series',
                  modelType: 'enhanced_ensemble',
                  priority: predictionValue > 0.7 ? 'high' : predictionValue > 0.4 ? 'medium' : 'low',
                  confidence: Math.min(0.9, 0.5 + (predictionValue - 0.3) / 0.7)
                });
              }
            }
          }
        } catch (error) {
          console.error('Error generating advanced time series predictions:', error);
          // Log detailed error information for debugging
          console.error('Error details:', {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
            modelState: this.useAdvancedTimeSeriesModels ? 'enabled' : 'disabled',
            modelInitialized: this.isInitialized
          });

          // Fall back to basic time series model if available
          try {
            if (this.timeSeriesModel && typeof this.timeSeriesModel.predict === 'function' && languagePair) {
              console.log('Falling back to basic time series model');
              const basicPredictions = this.timeSeriesModel.predict(timeSteps);

              const parts = languagePair.split('-');
              if (parts.length >= 2 && Array.isArray(basicPredictions)) {
                const [sourceLanguage, targetLanguage] = parts;

                for (let i = 0; i < basicPredictions.length; i++) {
                  const predictionValue = basicPredictions[i];
                  if (predictionValue && !isNaN(predictionValue) && predictionValue > 0.3) {
                    predictions.push({
                      sourceLanguage,
                      targetLanguage,
                      context: context || 'general',
                      score: predictionValue,
                      timeStep: i + 1,
                      reason: 'ml_basic_time_series',
                      modelType: 'fallback_basic',
                      priority: 'medium',
                      confidence: 0.5
                    });
                  }
                }
              }
            }
          } catch (fallbackError) {
            console.error('Error using fallback time series model:', fallbackError);
          }
        }
      }

      // Add network pattern predictions
      if (includeOfflineRisk) {
        try {
          const offlineRisk = this.networkModel.predictOfflineRisk();
          const patterns = this.networkModel.findPatterns();

          // If we have high confidence patterns and offline risk
          if (patterns && patterns.confidence > 0.5 && offlineRisk > 0.3) {
            // Add predictions for peak offline hours
            if (patterns.patterns && patterns.patterns.peakOfflineHours) {
              for (const hour of patterns.patterns.peakOfflineHours) {
                // If this is a future hour today
                const currentHour = new Date().getHours();
                if (hour > currentHour) {
                  // If we have a language pair, add a prediction
                  if (languagePair) {
                    const parts = languagePair.split('-');
                    if (parts.length >= 2) {
                      const [sourceLanguage, targetLanguage] = parts;

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
          }
        } catch (error) {
          console.warn('Error generating network pattern predictions:', error);
        }
      }

      // Ensure all predictions have valid scores and required fields
      const validPredictions = predictions.filter(p => {
        // Check for required fields and valid score
        return p &&
               p.score !== null &&
               p.score !== undefined &&
               !isNaN(p.score) &&
               p.sourceLanguage &&
               p.targetLanguage;
      });

      // Add metadata to each prediction
      const enhancedPredictions = validPredictions.map(p => ({
        ...p,
        timestamp: Date.now(),
        modelVersion: '2.0',
        generatedBy: 'enhanced_ml_adapter'
      }));

      console.log(`Returning ${enhancedPredictions.length} ML-based predictions from advanced models`);

      // Sort by score and limit
      const sortedPredictions = enhancedPredictions
        .sort((a, b) => b.score - a.score)
        .slice(0, maxPredictions);

      // If we have no predictions but language pair was provided, add a fallback prediction
      if (sortedPredictions.length === 0 && languagePair) {
        console.warn('No valid predictions generated, adding fallback prediction');

        const parts = languagePair.split('-');
        if (parts.length >= 2) {
          const [sourceLanguage, targetLanguage] = parts;

          sortedPredictions.push({
            sourceLanguage,
            targetLanguage,
            context: context || 'general',
            score: 0.5,
            reason: 'fallback_prediction',
            priority: 'medium',
            confidence: 0.3,
            timestamp: Date.now(),
            modelVersion: '2.0',
            generatedBy: 'fallback_mechanism'
          });
        }
      }

      return sortedPredictions;
    } catch (error) {
      console.error('Error generating predictions:', error);
      console.error('Error details:', {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack
      });

      // Return empty array with diagnostic information
      return [{
        error: true,
        errorMessage: error.message,
        reason: 'error_in_prediction',
        timestamp: Date.now(),
        recoverable: true,
        score: 0
      }];
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
    // Get advanced time series model status if available
    let timeSeriesStatus = null;
    if (this.useAdvancedTimeSeriesModels && this.advancedTimeSeriesModel) {
      try {
        timeSeriesStatus = this.advancedTimeSeriesModel.getStatus();
      } catch (error) {
        console.warn('Error getting advanced time series model status:', error);
      }
    }

    // Get connection prediction model status if available
    let connectionModelStatus = null;
    if (this.useEnhancedConnectionPrediction && this.connectionPredictionModel) {
      try {
        connectionModelStatus = this.connectionPredictionModel.getStatus();
      } catch (error) {
        console.warn('Error getting connection prediction model status:', error);
      }
    }

    return {
      isInitialized: this.isInitialized,
      lastTrainingTime: this.lastTrainingTime,
      modelPerformance: this.modelPerformance,
      useEnhancedConnectionPrediction: this.useEnhancedConnectionPrediction,
      useAdvancedTimeSeriesModels: this.useAdvancedTimeSeriesModels,
      enhancedModelStatus: connectionModelStatus,
      advancedTimeSeriesStatus: timeSeriesStatus,
      edgeOptimized: true,
      version: '2.0',
      supportedModels: {
        timeSeries: ['HoltWinters', 'ARIMA', 'ProphetInspired', 'LSTMInspired', 'Ensemble'],
        network: ['NetworkPattern', 'ConnectionPrediction'],
        content: ['ContentBasedFiltering'],
        hybrid: ['HybridRecommendationSystem']
      }
    };
  }
}

// Create and export singleton instance
const modelAdapter = new ModelAdapter();
module.exports = modelAdapter;
