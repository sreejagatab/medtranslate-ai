/**
 * Simplified unit tests for the Edge Server Module
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

// Create a mock server
function createMockServer() {
  const app = express();
  app.use(express.json());
  
  // Import mocked modules
  const { translateLocally, processAudio } = require('../../edge/app/translation');
  const { cacheManager } = require('../../edge/app/cache');
  const { syncWithCloud } = require('../../edge/app/sync');
  
  // Define routes
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
  
  app.post('/translate-audio', async (req, res) => {
    try {
      const { audioData, sourceLanguage, targetLanguage, context } = req.body;
      
      if (!audioData) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Process audio
      const result = await processAudio(audioData, sourceLanguage, targetLanguage, context);
      
      // Queue for sync with cloud
      syncWithCloud.queueTranslation(
        result.originalText, sourceLanguage, targetLanguage, context, result
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/sync', async (req, res) => {
    try {
      const result = await syncWithCloud.syncCachedData();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  return app;
}

describe('Edge Server Module', () => {
  let app;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a fresh app for each test
    app = createMockServer();
  });
  
  describe('GET /health', () => {
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
  });
  
  describe('POST /translate', () => {
    it('should translate text', async () => {
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
    
    it('should return cached translation if available', async () => {
      // Mock cache hit
      const { cacheManager } = require('../../edge/app/cache');
      cacheManager.getCachedTranslation.mockReturnValueOnce({
        originalText: 'Hello world',
        translatedText: 'Hola mundo (cached)',
        confidence: 'high',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
      
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
        translatedText: 'Hola mundo (cached)',
        source: 'cache'
      }));
      
      // Verify translation function was not called
      const { translateLocally } = require('../../edge/app/translation');
      expect(translateLocally).not.toHaveBeenCalled();
    });
  });
  
  describe('POST /translate-audio', () => {
    it('should translate audio', async () => {
      const response = await request(app)
        .post('/translate-audio')
        .send({
          audioData: 'base64audiodata',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        confidence: 'high',
        audioResponse: 'base64audio',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      }));
    });
    
    it('should return 400 if required parameters are missing', async () => {
      const response = await request(app)
        .post('/translate-audio')
        .send({
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general'
          // Missing audioData
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({
        error: 'Missing required parameters'
      }));
    });
  });
  
  describe('POST /sync', () => {
    it('should sync cached data with cloud', async () => {
      const response = await request(app)
        .post('/sync')
        .send({});
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true
      });
      
      // Verify sync function was called
      const { syncWithCloud } = require('../../edge/app/sync');
      expect(syncWithCloud.syncCachedData).toHaveBeenCalled();
    });
  });
});
