/**
 * Unit Tests for Advanced Time Series Models
 * 
 * This test suite verifies the functionality of the advanced time series models
 * used in the predictive caching system, including:
 * - ARIMA Model
 * - Prophet-inspired Decomposition Model
 * - Ensemble Time Series Model
 */

const {
  ARIMAModel,
  ProphetInspiredModel,
  EnsembleTimeSeriesModel
} = require('../../edge/app/ml-models/advanced-time-series');

describe('Advanced Time Series Models', () => {
  describe('ARIMA Model', () => {
    let model;
    
    beforeEach(() => {
      model = new ARIMAModel({ p: 2, d: 1, q: 1 });
    });
    
    test('should initialize with default values', () => {
      expect(model.p).toBe(2);
      expect(model.d).toBe(1);
      expect(model.q).toBe(1);
      expect(model.isInitialized).toBe(false);
    });
    
    test('should train on historical data', () => {
      const data = [10, 12, 15, 14, 16, 18, 17, 20, 22, 24, 23, 26];
      const result = model.train(data);
      
      expect(result).toBe(true);
      expect(model.isInitialized).toBe(true);
      expect(model.trainingData).toEqual(data);
      expect(model.arCoefficients.length).toBe(model.p);
      expect(model.maCoefficients.length).toBe(model.q);
    });
    
    test('should predict future values', () => {
      const data = [10, 12, 15, 14, 16, 18, 17, 20, 22, 24, 23, 26];
      model.train(data);
      
      const predictions = model.predict(3);
      expect(predictions.length).toBe(3);
      predictions.forEach(prediction => {
        expect(typeof prediction).toBe('number');
      });
    });
    
    test('should handle insufficient data', () => {
      const data = [10, 12];
      const result = model.train(data);
      
      expect(result).toBe(false);
      expect(model.isInitialized).toBe(false);
    });
    
    test('should return model status', () => {
      const data = [10, 12, 15, 14, 16, 18, 17, 20, 22, 24, 23, 26];
      model.train(data);
      
      const status = model.getStatus();
      expect(status.type).toBe('ARIMA');
      expect(status.p).toBe(2);
      expect(status.d).toBe(1);
      expect(status.q).toBe(1);
      expect(status.isInitialized).toBe(true);
      expect(status.coefficients).toBeDefined();
    });
  });
  
  describe('Prophet-inspired Model', () => {
    let model;
    
    beforeEach(() => {
      model = new ProphetInspiredModel({
        seasonalPeriods: [7, 24],
        trendChangePoints: 3
      });
    });
    
    test('should initialize with default values', () => {
      expect(model.seasonalPeriods).toEqual([7, 24]);
      expect(model.trendChangePoints).toBe(3);
      expect(model.isInitialized).toBe(false);
    });
    
    test('should train on historical data', () => {
      // Generate data with trend and seasonality
      const data = [];
      for (let i = 0; i < 100; i++) {
        // Trend component
        const trend = 0.1 * i;
        
        // Seasonal component (daily)
        const dailySeasonal = 5 * Math.sin(2 * Math.PI * (i % 24) / 24);
        
        // Seasonal component (weekly)
        const weeklySeasonal = 10 * Math.sin(2 * Math.PI * (i % 168) / 168);
        
        // Random noise
        const noise = Math.random() * 2 - 1;
        
        data.push(trend + dailySeasonal + weeklySeasonal + noise);
      }
      
      const result = model.train(data);
      
      expect(result).toBe(true);
      expect(model.isInitialized).toBe(true);
      expect(model.trainingData).toEqual(data);
      expect(model.trend.level).toBeDefined();
      expect(model.trend.slope).toBeDefined();
      expect(model.seasonality[7]).toBeDefined();
      expect(model.seasonality[24]).toBeDefined();
    });
    
    test('should predict future values', () => {
      // Generate data with trend and seasonality
      const data = [];
      for (let i = 0; i < 100; i++) {
        // Trend component
        const trend = 0.1 * i;
        
        // Seasonal component (daily)
        const dailySeasonal = 5 * Math.sin(2 * Math.PI * (i % 24) / 24);
        
        // Seasonal component (weekly)
        const weeklySeasonal = 10 * Math.sin(2 * Math.PI * (i % 168) / 168);
        
        // Random noise
        const noise = Math.random() * 2 - 1;
        
        data.push(trend + dailySeasonal + weeklySeasonal + noise);
      }
      
      model.train(data);
      
      const predictions = model.predict(5);
      expect(predictions.length).toBe(5);
      predictions.forEach(prediction => {
        expect(typeof prediction).toBe('number');
      });
    });
    
    test('should handle insufficient data', () => {
      const data = [10, 12, 15, 14, 16];
      const result = model.train(data);
      
      expect(result).toBe(false);
      expect(model.isInitialized).toBe(false);
    });
    
    test('should return model status', () => {
      // Generate data with trend and seasonality
      const data = [];
      for (let i = 0; i < 100; i++) {
        data.push(0.1 * i + 5 * Math.sin(2 * Math.PI * (i % 24) / 24) + Math.random() * 2 - 1);
      }
      
      model.train(data);
      
      const status = model.getStatus();
      expect(status.type).toBe('ProphetInspired');
      expect(status.seasonalPeriods).toEqual([7, 24]);
      expect(status.trendChangePoints).toBe(3);
      expect(status.isInitialized).toBe(true);
    });
  });
  
  describe('Ensemble Time Series Model', () => {
    let model;
    
    beforeEach(() => {
      model = new EnsembleTimeSeriesModel({
        models: [
          { type: 'ARIMA', params: { p: 1, d: 1, q: 1 } },
          { type: 'ProphetInspired', params: { seasonalPeriods: [24] } }
        ]
      });
    });
    
    test('should initialize with default values', () => {
      expect(model.models.length).toBe(2);
      expect(model.weights.length).toBe(2);
      expect(model.isInitialized).toBe(false);
    });
    
    test('should train on historical data', () => {
      // Generate data with trend and seasonality
      const data = [];
      for (let i = 0; i < 100; i++) {
        data.push(0.1 * i + 5 * Math.sin(2 * Math.PI * (i % 24) / 24) + Math.random() * 2 - 1);
      }
      
      const result = model.train(data);
      
      expect(result).toBe(true);
      expect(model.isInitialized).toBe(true);
      expect(model.weights.length).toBe(2);
      expect(model.weights[0] + model.weights[1]).toBeCloseTo(1, 5);
    });
    
    test('should predict future values', () => {
      // Generate data with trend and seasonality
      const data = [];
      for (let i = 0; i < 100; i++) {
        data.push(0.1 * i + 5 * Math.sin(2 * Math.PI * (i % 24) / 24) + Math.random() * 2 - 1);
      }
      
      model.train(data);
      
      const predictions = model.predict(5);
      expect(predictions.length).toBe(5);
      predictions.forEach(prediction => {
        expect(typeof prediction).toBe('number');
      });
    });
    
    test('should return model status', () => {
      // Generate data with trend and seasonality
      const data = [];
      for (let i = 0; i < 100; i++) {
        data.push(0.1 * i + 5 * Math.sin(2 * Math.PI * (i % 24) / 24) + Math.random() * 2 - 1);
      }
      
      model.train(data);
      
      const status = model.getStatus();
      expect(status.type).toBe('Ensemble');
      expect(status.models.length).toBe(2);
      expect(status.isInitialized).toBe(true);
      expect(status.models[0].weight).toBeDefined();
      expect(status.models[1].weight).toBeDefined();
    });
  });
});
