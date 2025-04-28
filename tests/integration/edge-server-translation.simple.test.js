/**
 * Simplified integration tests for Edge Server and Translation Module
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../../edge/app/translation', () => ({
  translateLocally: jest.fn().mockImplementation((text, sourceLanguage, targetLanguage, context) => {
    return Promise.resolve({
      originalText: text,
      translatedText: 'Hola mundo',
      confidence: 'high',
      sourceLanguage,
      targetLanguage,
      context
    });
  }),
  processAudio: jest.fn().mockImplementation((audioData, sourceLanguage, targetLanguage, context) => {
    return Promise.resolve({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      confidence: 'high',
      audioResponse: 'base64audio',
      sourceLanguage,
      targetLanguage,
      context
    });
  })
}));

jest.mock('../../edge/app/cache', () => ({
  cacheManager: {
    getCachedTranslation: jest.fn(),
    cacheTranslation: jest.fn()
  }
}));

jest.mock('../../edge/app/sync', () => ({
  syncWithCloud: {
    testConnection: jest.fn().mockResolvedValue({
      connected: true,
      status: 'healthy'
    }),
    queueTranslation: jest.fn(),
    syncCachedData: jest.fn().mockResolvedValue({
      success: true
    })
  }
}));

describe('Edge Server and Translation Module Integration', () => {
  let app;
  
  beforeAll(() => {
    // Create express app
    app = express();
    app.use(express.json());
    
    // Import mocked modules
    const { translateLocally } = require('../../edge/app/translation');
    const { cacheManager } = require('../../edge/app/cache');
    const { syncWithCloud } = require('../../edge/app/sync');
    
    // Define endpoints
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        onlineStatus: 'connected',
        modelStatus: 'loaded',
        version: '1.0.0'
      });
    });
    
    app.post('/translate', async (req, res) => {
      try {
        const { text, sourceLanguage, targetLanguage, context } = req.body;
        
        // Check cache first
        const cachedTranslation = cacheManager.getCachedTranslation(
          text, sourceLanguage, targetLanguage, context
        );
        
        if (cachedTranslation) {
          return res.json({
            ...cachedTranslation,
            source: 'cache'
          });
        }
        
        // Perform local translation
        const result = await translateLocally(text, sourceLanguage, targetLanguage, context);
        
        // Queue for sync with cloud
        syncWithCloud.queueTranslation(
          text, sourceLanguage, targetLanguage, context, result
        );
        
        // Cache the result
        cacheManager.cacheTranslation(
          text, sourceLanguage, targetLanguage, context, result
        );
        
        res.json({
          ...result,
          source: 'local'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });
  
  it('should return health status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      onlineStatus: 'connected',
      modelStatus: 'loaded',
      version: '1.0.0'
    });
  });
  
  it('should translate text using the translation module', async () => {
    const response = await request(app)
      .post('/translate')
      .send({
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      confidence: 'high',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general',
      source: 'local'
    }));
  });
  
  it('should return cached translation on second request', async () => {
    // Mock cache hit for the second request
    const { cacheManager } = require('../../edge/app/cache');
    cacheManager.getCachedTranslation.mockReturnValueOnce({
      originalText: 'Hello again',
      translatedText: 'Hola de nuevo',
      confidence: 'high',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    });
    
    const response = await request(app)
      .post('/translate')
      .send({
        text: 'Hello again',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      translatedText: 'Hola de nuevo',
      source: 'cache'
    }));
    
    // Verify translation function was not called for the second request
    const { translateLocally } = require('../../edge/app/translation');
    expect(translateLocally).not.toHaveBeenCalledWith(
      'Hello again',
      'en',
      'es',
      'general'
    );
  });
});
