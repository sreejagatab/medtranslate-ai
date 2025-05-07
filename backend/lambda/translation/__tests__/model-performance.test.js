/**
 * Tests for model performance tracking and enhanced model selection
 */

const {
  getModelInfo,
  getAvailableModels,
  selectBestModelForContext,
  trackModelPerformance,
  calculateModelPerformanceMetrics,
  estimateModelCost
} = require('../enhanced-bedrock-client');

// Mock fs and path modules
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn()
}));

jest.mock('path', () => ({
  resolve: jest.fn().mockReturnValue('/mock/path'),
  join: jest.fn().mockReturnValue('/mock/path')
}));

// Mock the model configuration
jest.mock('../../../models/configs/models-config.json', () => ({
  modelFamilies: ['claude', 'titan', 'llama', 'mistral', 'cohere', 'ai21'],
  models: {
    'claude': [
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'anthropic.claude-3-haiku-20240307-v1:0',
      'anthropic.claude-3-opus-20240229-v1:0'
    ],
    'titan': [
      'amazon.titan-text-express-v1',
      'amazon.titan-text-lite-v1',
      'amazon.titan-text-premier-v1:0'
    ],
    'llama': [
      'meta.llama3-8b-instruct-v1:0',
      'meta.llama3-70b-instruct-v1:0'
    ],
    'mistral': [
      'mistral.mistral-7b-instruct-v0:2',
      'mistral.mistral-large-2402-v1:0'
    ]
  },
  modelCapabilities: {
    'anthropic.claude-3-opus-20240229-v1:0': {
      maxTokens: 200000,
      outputTokens: 4096,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'],
      strengths: ['medical translation', 'complex reasoning'],
      contextHandling: 'excellent',
      medicalAccuracy: 'excellent',
      costTier: 'premium'
    }
  },
  fallbackStrategy: {
    enabled: true,
    maxAttempts: 3,
    order: ['claude', 'titan', 'llama', 'mistral'],
    contextSpecificFallbacks: {
      'cardiology': ['claude', 'mistral', 'llama', 'titan']
    },
    languageSpecificFallbacks: {
      'asian': {
        languages: ['zh', 'ja', 'ko'],
        order: ['titan', 'claude', 'mistral']
      }
    }
  },
  modelPerformanceTracking: {
    enabled: true,
    metricsToTrack: [
      'responseTime',
      'errorRate',
      'confidenceScore'
    ],
    performanceThresholds: {
      responseTime: {
        excellent: 1000,
        good: 2000,
        acceptable: 3000,
        poor: 5000
      },
      errorRate: {
        excellent: 0.01,
        good: 0.03,
        acceptable: 0.05,
        poor: 0.1
      },
      confidenceScore: {
        excellent: 0.95,
        good: 0.85,
        acceptable: 0.75,
        poor: 0.6
      }
    }
  }
}), { virtual: true });

describe('Model Performance Tracking', () => {
  test('trackModelPerformance correctly tracks metrics', () => {
    const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
    
    // Track some performance metrics
    trackModelPerformance(modelId, {
      responseTime: 1500,
      error: false,
      confidenceScore: 0.92,
      costPerRequest: 0.01
    });
    
    trackModelPerformance(modelId, {
      responseTime: 1800,
      error: false,
      confidenceScore: 0.88,
      costPerRequest: 0.012
    });
    
    // Track an error
    trackModelPerformance(modelId, {
      error: true,
      errorType: 'TimeoutError',
      errorMessage: 'Request timed out'
    });
    
    // Calculate metrics
    const metrics = calculateModelPerformanceMetrics(modelId);
    
    // Check metrics
    expect(metrics.responseTime).toBeCloseTo(1650, 0); // Average of 1500 and 1800
    expect(metrics.errorRate).toBeCloseTo(0.333, 2); // 1 error out of 3 requests
    expect(metrics.confidenceScore).toBeCloseTo(0.9, 1); // Average of 0.92 and 0.88
    expect(metrics.usageCount).toBe(3);
    expect(metrics.performanceRating).toBeTruthy(); // Should have a rating
  });
  
  test('estimateModelCost returns correct cost estimates', () => {
    // Test Claude Opus (premium tier)
    const opusCost = estimateModelCost('anthropic.claude-3-opus-20240229-v1:0', 1000);
    expect(opusCost).toBeGreaterThan(0);
    
    // Test Claude Sonnet (standard tier)
    const sonnetCost = estimateModelCost('anthropic.claude-3-sonnet-20240229-v1:0', 1000);
    expect(sonnetCost).toBeGreaterThan(0);
    expect(sonnetCost).toBeLessThan(opusCost); // Should be cheaper than Opus
    
    // Test Claude Haiku (economy tier)
    const haikuCost = estimateModelCost('anthropic.claude-3-haiku-20240307-v1:0', 1000);
    expect(haikuCost).toBeGreaterThan(0);
    expect(haikuCost).toBeLessThan(sonnetCost); // Should be cheaper than Sonnet
    
    // Test AWS Translate
    const translateCost = estimateModelCost('aws.translate', 1000);
    expect(translateCost).toBeGreaterThan(0);
  });
  
  test('getModelInfo returns detailed model information', () => {
    // Test with a model that has detailed capabilities in the config
    const opusInfo = getModelInfo('anthropic.claude-3-opus-20240229-v1:0');
    expect(opusInfo.contextWindow).toBe(200000);
    expect(opusInfo.tokenLimit).toBe(4096);
    expect(opusInfo.languages).toContain('en');
    expect(opusInfo.languages).toContain('zh');
    expect(opusInfo.capabilities).toContain('medical translation');
    expect(opusInfo.costTier).toBe('premium');
    
    // Test with a model that doesn't have detailed capabilities in the config
    const sonnetInfo = getModelInfo('anthropic.claude-3-sonnet-20240229-v1:0');
    expect(sonnetInfo.family).toBe('claude');
    expect(sonnetInfo.contextWindow).toBeGreaterThan(0);
    expect(sonnetInfo.tokenLimit).toBeGreaterThan(0);
    expect(sonnetInfo.languages.length).toBeGreaterThan(0);
    expect(sonnetInfo.capabilities.length).toBeGreaterThan(0);
    expect(sonnetInfo.costTier).toBeTruthy();
  });
  
  test('getAvailableModels returns comprehensive model information', () => {
    const availableModels = getAvailableModels();
    
    // Check that we have model families
    expect(availableModels.availableModels).toBeTruthy();
    expect(Object.keys(availableModels.availableModels).length).toBeGreaterThan(0);
    
    // Check that we have fallback strategy
    expect(availableModels.fallbackStrategy).toBeTruthy();
    expect(availableModels.fallbackStrategy.enabled).toBe(true);
    
    // Check that we have performance tracking info
    expect(availableModels.performanceTracking).toBeTruthy();
    expect(availableModels.performanceTracking.enabled).toBe(true);
    expect(availableModels.performanceTracking.metricsTracked).toContain('responseTime');
  });
  
  test('selectBestModelForContext selects appropriate models for different contexts', () => {
    // Test complex medical context
    const cardiologyModel = selectBestModelForContext('en', 'es', 'cardiology');
    expect(cardiologyModel).toBe('claude');
    
    // Test Asian language pair
    const asianModel = selectBestModelForContext('zh', 'ja', 'general');
    expect(asianModel).toBe('titan');
    
    // Test Slavic language pair
    const slavicModel = selectBestModelForContext('ru', 'uk', 'general');
    expect(slavicModel).toBe('mistral');
    
    // Test European language pair
    const europeanModel = selectBestModelForContext('es', 'fr', 'general');
    expect(europeanModel).toBe('llama');
  });
});
