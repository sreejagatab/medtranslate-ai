/**
 * Unit Tests for ML Models in Predictive Caching System
 * 
 * This test suite verifies the functionality of the machine learning models
 * used in the predictive caching system, including:
 * - Time Series Forecasting Models
 * - Content-Based Filtering Model
 * - Network Pattern Analysis Model
 * - Hybrid Recommendation System
 */

const {
  ExponentialSmoothingModel,
  HoltsModel,
  HoltWintersModel,
  ContentBasedFilteringModel,
  NetworkPatternModel,
  HybridRecommendationSystem
} = require('../../edge/app/ml-models/prediction-model');

const modelAdapter = require('../../edge/app/ml-models/model-adapter');

// Mock fs module to avoid file system operations
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn()
}));

describe('ML Models for Predictive Caching', () => {
  describe('ExponentialSmoothingModel', () => {
    let model;
    
    beforeEach(() => {
      model = new ExponentialSmoothingModel(0.3);
    });
    
    test('should initialize with default values', () => {
      expect(model.alpha).toBe(0.3);
      expect(model.forecast).toBeNull();
    });
    
    test('should train on historical data', () => {
      const data = [10, 12, 15, 14, 16];
      model.train(data);
      
      expect(model.forecast).not.toBeNull();
      expect(typeof model.forecast).toBe('number');
    });
    
    test('should predict next value', () => {
      const data = [10, 12, 15, 14, 16];
      model.train(data);
      
      const prediction = model.predict();
      expect(typeof prediction).toBe('number');
    });
    
    test('should handle empty data', () => {
      model.train([]);
      expect(model.forecast).toBe(0);
      
      const prediction = model.predict();
      expect(prediction).toBe(0);
    });
    
    test('should predict multiple steps ahead', () => {
      const data = [10, 12, 15, 14, 16];
      model.train(data);
      
      const predictions = model.predictMultipleSteps(3);
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(3);
    });
  });
  
  describe('HoltsModel', () => {
    let model;
    
    beforeEach(() => {
      model = new HoltsModel(0.3, 0.1);
    });
    
    test('should initialize with default values', () => {
      expect(model.alpha).toBe(0.3);
      expect(model.beta).toBe(0.1);
      expect(model.level).toBeNull();
      expect(model.trend).toBeNull();
    });
    
    test('should train on historical data', () => {
      const data = [10, 12, 15, 14, 16];
      model.train(data);
      
      expect(model.level).not.toBeNull();
      expect(model.trend).not.toBeNull();
      expect(typeof model.level).toBe('number');
      expect(typeof model.trend).toBe('number');
    });
    
    test('should predict next value', () => {
      const data = [10, 12, 15, 14, 16];
      model.train(data);
      
      const prediction = model.predict();
      expect(typeof prediction).toBe('number');
    });
    
    test('should handle insufficient data', () => {
      model.train([10]);
      expect(model.level).toBe(10);
      expect(model.trend).toBe(0);
      
      const prediction = model.predict();
      expect(prediction).toBe(10);
    });
    
    test('should predict multiple steps ahead', () => {
      const data = [10, 12, 15, 14, 16];
      model.train(data);
      
      const predictions = model.predictMultipleSteps(3);
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(3);
      
      // Each prediction should be different due to trend
      expect(predictions[0]).not.toBe(predictions[1]);
      expect(predictions[1]).not.toBe(predictions[2]);
    });
  });
  
  describe('HoltWintersModel', () => {
    let model;
    
    beforeEach(() => {
      model = new HoltWintersModel(0.3, 0.1, 0.1, 4); // Using 4 as seasonal period for testing
    });
    
    test('should initialize with default values', () => {
      expect(model.alpha).toBe(0.3);
      expect(model.beta).toBe(0.1);
      expect(model.gamma).toBe(0.1);
      expect(model.seasonalPeriod).toBe(4);
      expect(model.level).toBeNull();
      expect(model.trend).toBeNull();
      expect(model.seasonalComponents).toBeNull();
    });
    
    test('should train on historical data', () => {
      // Create seasonal data with period 4
      const data = [
        10, 12, 8, 6,  // Season 1
        11, 13, 9, 7,  // Season 2
        12, 14, 10, 8  // Season 3
      ];
      
      model.train(data);
      
      expect(model.level).not.toBeNull();
      expect(model.trend).not.toBeNull();
      expect(Array.isArray(model.seasonalComponents)).toBe(true);
      expect(model.seasonalComponents.length).toBe(4);
    });
    
    test('should predict next value', () => {
      const data = [
        10, 12, 8, 6,  // Season 1
        11, 13, 9, 7,  // Season 2
        12, 14, 10, 8  // Season 3
      ];
      
      model.train(data);
      
      const prediction = model.predict();
      expect(typeof prediction).toBe('number');
    });
    
    test('should handle insufficient data', () => {
      // Not enough data for 2 seasonal periods
      model.train([10, 12, 8]);
      
      expect(model.level).toBe(10);
      expect(model.trend).toBe(0);
      expect(Array.isArray(model.seasonalComponents)).toBe(true);
      expect(model.seasonalComponents.every(c => c === 1)).toBe(true);
    });
    
    test('should predict multiple steps ahead', () => {
      const data = [
        10, 12, 8, 6,  // Season 1
        11, 13, 9, 7,  // Season 2
        12, 14, 10, 8  // Season 3
      ];
      
      model.train(data);
      
      const predictions = model.predictMultipleSteps(8); // Two seasons ahead
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(8);
      
      // Should show seasonality
      const firstSeasonAvg = (predictions[0] + predictions[1] + predictions[2] + predictions[3]) / 4;
      const secondSeasonAvg = (predictions[4] + predictions[5] + predictions[6] + predictions[7]) / 4;
      
      // Second season should be higher due to trend
      expect(secondSeasonAvg).toBeGreaterThan(firstSeasonAvg);
    });
  });
  
  describe('ContentBasedFilteringModel', () => {
    let model;
    
    beforeEach(() => {
      model = new ContentBasedFilteringModel();
    });
    
    test('should initialize with empty content profiles and user preferences', () => {
      expect(model.contentProfiles).toEqual({});
      expect(model.userPreferences).toEqual({});
    });
    
    test('should add content items', () => {
      model.addContentItem('item1', { feature1: 0.5, feature2: 0.8 });
      model.addContentItem('item2', { feature1: 0.2, feature3: 0.9 });
      
      expect(Object.keys(model.contentProfiles).length).toBe(2);
      expect(model.contentProfiles['item1']).toEqual({ feature1: 0.5, feature2: 0.8 });
      expect(model.contentProfiles['item2']).toEqual({ feature1: 0.2, feature3: 0.9 });
    });
    
    test('should update user preferences based on interactions', () => {
      model.addContentItem('item1', { feature1: 0.5, feature2: 0.8 });
      model.addContentItem('item2', { feature1: 0.2, feature3: 0.9 });
      
      model.updateUserPreferences('user1', 'item1');
      expect(model.userPreferences['user1']).toEqual({ feature1: 0.5, feature2: 0.8 });
      
      model.updateUserPreferences('user1', 'item2');
      expect(model.userPreferences['user1']).toEqual({ feature1: 0.7, feature2: 0.8, feature3: 0.9 });
    });
    
    test('should calculate similarity between feature vectors', () => {
      const features1 = { feature1: 0.5, feature2: 0.8 };
      const features2 = { feature1: 0.5, feature2: 0.8 };
      const features3 = { feature1: 0.2, feature3: 0.9 };
      
      const similarity1 = model.calculateSimilarity(features1, features2);
      const similarity2 = model.calculateSimilarity(features1, features3);
      
      expect(similarity1).toBe(1); // Identical features
      expect(similarity2).toBeGreaterThan(0); // Some similarity
      expect(similarity2).toBeLessThan(1); // Not identical
    });
    
    test('should get recommendations for a user', () => {
      model.addContentItem('item1', { feature1: 0.5, feature2: 0.8 });
      model.addContentItem('item2', { feature1: 0.2, feature3: 0.9 });
      model.addContentItem('item3', { feature2: 0.7, feature3: 0.6 });
      
      model.updateUserPreferences('user1', 'item1');
      
      const recommendations = model.getRecommendations('user1', 2);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBe(2);
      expect(recommendations[0]).toHaveProperty('itemId');
      expect(recommendations[0]).toHaveProperty('score');
    });
    
    test('should handle unknown users', () => {
      const recommendations = model.getRecommendations('unknown-user');
      expect(recommendations).toEqual([]);
    });
  });
  
  describe('NetworkPatternModel', () => {
    let model;
    
    beforeEach(() => {
      model = new NetworkPatternModel();
    });
    
    test('should initialize with default values', () => {
      expect(model.hourlyPatterns).toEqual(Array(24).fill(0));
      expect(model.dailyPatterns).toEqual(Array(7).fill(0));
      expect(model.offlineEvents).toEqual([]);
      expect(model.totalSamples).toBe(0);
    });
    
    test('should add network status samples', () => {
      // Add online sample
      model.addSample(true, new Date('2023-01-01T10:00:00Z'));
      expect(model.totalSamples).toBe(1);
      expect(model.offlineEvents.length).toBe(0);
      
      // Add offline sample
      model.addSample(false, new Date('2023-01-01T12:00:00Z'));
      expect(model.totalSamples).toBe(2);
      expect(model.offlineEvents.length).toBe(1);
      
      // Check hourly pattern update
      const hour = new Date('2023-01-01T12:00:00Z').getHours();
      expect(model.hourlyPatterns[hour]).toBe(1);
    });
    
    test('should calculate hourly offline probability', () => {
      // Add samples for specific hours
      model.addSample(false, new Date('2023-01-01T10:00:00Z')); // Hour 10
      model.addSample(true, new Date('2023-01-01T10:30:00Z')); // Hour 10
      model.addSample(false, new Date('2023-01-01T11:00:00Z')); // Hour 11
      
      const hour10Probability = model.getHourlyOfflineProbability(10);
      const hour11Probability = model.getHourlyOfflineProbability(11);
      const hour12Probability = model.getHourlyOfflineProbability(12);
      
      expect(hour10Probability).toBeGreaterThan(0);
      expect(hour11Probability).toBeGreaterThan(0);
      expect(hour12Probability).toBe(0); // No samples for hour 12
    });
    
    test('should predict offline risk', () => {
      // Add samples to build patterns
      for (let i = 0; i < 10; i++) {
        // Hour 10 is often offline
        model.addSample(false, new Date(`2023-01-0${i+1}T10:00:00Z`));
        
        // Hour 12 is usually online
        model.addSample(true, new Date(`2023-01-0${i+1}T12:00:00Z`));
      }
      
      // Predict for hour 10
      const risk1 = model.predictOfflineRisk(new Date('2023-01-20T10:00:00Z'));
      
      // Predict for hour 12
      const risk2 = model.predictOfflineRisk(new Date('2023-01-20T12:00:00Z'));
      
      expect(risk1).toBeGreaterThan(0.5); // High risk for hour 10
      expect(risk2).toBeLessThan(0.5); // Low risk for hour 12
    });
    
    test('should find patterns in offline events', () => {
      // Add samples to build patterns
      for (let i = 0; i < 10; i++) {
        // Hour 10 is often offline
        model.addSample(false, new Date(`2023-01-0${i+1}T10:00:00Z`));
        
        // Sunday (day 0) is often offline
        model.addSample(false, new Date(`2023-01-0${i+1}T00:00:00Z`));
      }
      
      const patterns = model.findPatterns();
      
      expect(patterns).toHaveProperty('patterns');
      expect(patterns).toHaveProperty('confidence');
      expect(patterns.patterns).toHaveProperty('peakOfflineHours');
      expect(patterns.patterns.peakOfflineHours).toContain(10);
    });
  });
  
  describe('HybridRecommendationSystem', () => {
    let model;
    
    beforeEach(() => {
      model = new HybridRecommendationSystem();
    });
    
    test('should initialize with default models and weights', () => {
      expect(model.timeSeriesModel).toBeInstanceOf(HoltWintersModel);
      expect(model.contentModel).toBeInstanceOf(ContentBasedFilteringModel);
      expect(model.networkModel).toBeInstanceOf(NetworkPatternModel);
      expect(model.modelWeights).toEqual({
        timeSeries: 0.4,
        content: 0.4,
        network: 0.2
      });
    });
    
    test('should train all models with available data', () => {
      // Create training data
      const trainingData = {
        timeSeriesData: [10, 12, 15, 14, 16],
        contentItems: {
          'item1': { feature1: 0.5, feature2: 0.8 },
          'item2': { feature1: 0.2, feature3: 0.9 }
        },
        userInteractions: [
          { userId: 'user1', itemId: 'item1', weight: 1 },
          { userId: 'user1', itemId: 'item2', weight: 0.5 }
        ],
        networkSamples: [
          { isOnline: true, timestamp: Date.now() - 3600000 },
          { isOnline: false, timestamp: Date.now() - 1800000 }
        ]
      };
      
      // Spy on individual model train methods
      const timeSeriesSpy = jest.spyOn(model.timeSeriesModel, 'train');
      const contentItemSpy = jest.spyOn(model.contentModel, 'addContentItem');
      const userPrefSpy = jest.spyOn(model.contentModel, 'updateUserPreferences');
      const networkSpy = jest.spyOn(model.networkModel, 'addSample');
      
      model.train(trainingData);
      
      expect(timeSeriesSpy).toHaveBeenCalled();
      expect(contentItemSpy).toHaveBeenCalledTimes(2);
      expect(userPrefSpy).toHaveBeenCalledTimes(2);
      expect(networkSpy).toHaveBeenCalledTimes(2);
    });
    
    test('should get recommendations using all models', () => {
      // Create training data and train models
      const trainingData = {
        timeSeriesData: [10, 12, 15, 14, 16],
        contentItems: {
          'en-es-general': { sourceLanguage: 'en', targetLanguage: 'es', context: 'general', complexity: 0.3 },
          'en-fr-medical': { sourceLanguage: 'en', targetLanguage: 'fr', context: 'medical', complexity: 0.8 }
        },
        userInteractions: [
          { userId: 'default-user', itemId: 'en-es-general', weight: 1 },
          { userId: 'default-user', itemId: 'en-fr-medical', weight: 0.5 }
        ],
        networkSamples: [
          { isOnline: true, timestamp: Date.now() - 3600000 },
          { isOnline: false, timestamp: Date.now() - 1800000 }
        ]
      };
      
      model.train(trainingData);
      
      // Get recommendations
      const recommendations = model.getRecommendations({
        timeSeriesParams: { steps: 3 },
        userId: 'default-user',
        count: 5,
        predictOfflineRisk: true,
        timestamp: new Date()
      });
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should have recommendations from different sources
      const sources = recommendations.map(r => r.source);
      expect(sources).toContain('content');
      expect(sources).toContain('network');
    });
    
    test('should update model weights based on performance', () => {
      const performance = {
        timeSeries: 0.8,
        content: 0.5,
        network: 0.2
      };
      
      model.updateModelWeights(performance);
      
      // Total performance is 1.5
      expect(model.modelWeights.timeSeries).toBeCloseTo(0.8 / 1.5);
      expect(model.modelWeights.content).toBeCloseTo(0.5 / 1.5);
      expect(model.modelWeights.network).toBeCloseTo(0.2 / 1.5);
    });
  });
  
  describe('ModelAdapter', () => {
    beforeEach(() => {
      // Reset the module before each test
      jest.resetModules();
    });
    
    test('should initialize successfully', async () => {
      const result = await modelAdapter.initialize();
      expect(result).toBe(true);
      expect(modelAdapter.isInitialized).toBe(true);
    });
    
    test('should convert usage data to training data', () => {
      const usageData = {
        timePatterns: {
          hourly: Array(24).fill(0).map((_, i) => i % 3 === 0 ? 10 : 5)
        },
        usageLog: [
          {
            sourceLanguage: 'en',
            targetLanguage: 'es',
            context: 'general',
            textLength: 100,
            timestamp: Date.now() - 3600000,
            deviceInfo: {
              networkStatus: 'online'
            }
          },
          {
            sourceLanguage: 'en',
            targetLanguage: 'fr',
            context: 'medical',
            textLength: 250,
            timestamp: Date.now() - 1800000,
            deviceInfo: {
              networkStatus: 'offline'
            }
          }
        ],
        networkPatterns: {
          offlineTimeOfDay: Array(24).fill(0).map((_, i) => i === 12 ? 5 : 0)
        }
      };
      
      const trainingData = modelAdapter.convertUsageDataToTrainingData(usageData);
      
      expect(trainingData).toHaveProperty('timeSeriesData');
      expect(trainingData).toHaveProperty('contentItems');
      expect(trainingData).toHaveProperty('userInteractions');
      expect(trainingData).toHaveProperty('networkSamples');
      
      expect(trainingData.timeSeriesData).toEqual(usageData.timePatterns.hourly);
      expect(Object.keys(trainingData.contentItems).length).toBe(2);
      expect(trainingData.userInteractions.length).toBe(2);
      expect(trainingData.networkSamples.length).toBeGreaterThan(0);
    });
    
    test('should generate predictions', async () => {
      // Initialize and train with sample data
      await modelAdapter.initialize();
      
      const usageData = {
        timePatterns: {
          hourly: Array(24).fill(0).map((_, i) => i % 3 === 0 ? 10 : 5)
        },
        usageLog: [
          {
            sourceLanguage: 'en',
            targetLanguage: 'es',
            context: 'general',
            textLength: 100,
            timestamp: Date.now() - 3600000,
            deviceInfo: {
              networkStatus: 'online'
            }
          },
          {
            sourceLanguage: 'en',
            targetLanguage: 'fr',
            context: 'medical',
            textLength: 250,
            timestamp: Date.now() - 1800000,
            deviceInfo: {
              networkStatus: 'offline'
            }
          }
        ],
        networkPatterns: {
          offlineTimeOfDay: Array(24).fill(0).map((_, i) => i === 12 ? 5 : 0)
        }
      };
      
      await modelAdapter.trainModels(usageData);
      
      // Generate predictions
      const predictions = modelAdapter.generatePredictions({
        currentHour: new Date().getHours(),
        currentDay: new Date().getDay(),
        languagePair: 'en-es',
        context: 'general',
        confidenceThreshold: 0.1,
        maxPredictions: 10,
        includeOfflineRisk: true
      });
      
      expect(Array.isArray(predictions)).toBe(true);
      
      // Even with minimal training data, we should get some predictions
      if (predictions.length > 0) {
        expect(predictions[0]).toHaveProperty('sourceLanguage');
        expect(predictions[0]).toHaveProperty('targetLanguage');
        expect(predictions[0]).toHaveProperty('context');
        expect(predictions[0]).toHaveProperty('score');
        expect(predictions[0]).toHaveProperty('reason');
      }
    });
    
    test('should predict offline risk', async () => {
      // Initialize and train with sample data
      await modelAdapter.initialize();
      
      const usageData = {
        networkPatterns: {
          offlineTimeOfDay: Array(24).fill(0).map((_, i) => i === new Date().getHours() ? 5 : 0)
        },
        usageLog: [
          {
            deviceInfo: {
              networkStatus: 'offline'
            },
            timestamp: Date.now() - 3600000
          }
        ]
      };
      
      await modelAdapter.trainModels(usageData);
      
      // Predict offline risk
      const risk = modelAdapter.predictOfflineRisk();
      
      expect(typeof risk).toBe('number');
      expect(risk).toBeGreaterThanOrEqual(0);
      expect(risk).toBeLessThanOrEqual(1);
    });
    
    test('should update performance metrics', () => {
      const performance = {
        timeSeries: 0.8,
        content: 0.5,
        network: 0.2
      };
      
      const result = modelAdapter.updatePerformance(performance);
      
      expect(result).toBe(true);
      expect(modelAdapter.modelPerformance).toEqual(expect.objectContaining(performance));
    });
    
    test('should get model status', async () => {
      await modelAdapter.initialize();
      
      const status = modelAdapter.getStatus();
      
      expect(status).toHaveProperty('isInitialized');
      expect(status).toHaveProperty('lastTrainingTime');
      expect(status).toHaveProperty('modelPerformance');
      expect(status.isInitialized).toBe(true);
    });
  });
});
