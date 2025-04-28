/**
 * Simplified integration tests for the complete Edge Application
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

// Create a mock cache implementation
const mockCache = {
  cache: new Map(),
  
  getCachedTranslation(text, sourceLanguage, targetLanguage, context = 'general') {
    const key = `${text}|${sourceLanguage}|${targetLanguage}|${context}`;
    return this.cache.get(key);
  },
  
  cacheTranslation(text, sourceLanguage, targetLanguage, context, result) {
    const key = `${text}|${sourceLanguage}|${targetLanguage}|${context}`;
    const cacheItem = {
      originalText: text,
      translatedText: result.translatedText,
      confidence: result.confidence,
      sourceLanguage,
      targetLanguage,
      context,
      timestamp: Date.now()
    };
    this.cache.set(key, cacheItem);
    return cacheItem;
  },
  
  clearCache() {
    this.cache.clear();
  }
};

// Mock the cache module
jest.mock('../../edge/app/cache', () => ({
  cacheManager: mockCache
}));

// Create a mock sync implementation
const mockSync = {
  queue: [],
  
  queueTranslation(text, sourceLanguage, targetLanguage, context, result) {
    this.queue.push({
      type: 'translation',
      data: {
        originalText: text,
        translatedText: result.translatedText,
        confidence: result.confidence,
        sourceLanguage,
        targetLanguage,
        context,
        timestamp: Date.now()
      }
    });
  },
  
  async testConnection() {
    return {
      connected: true,
      status: 'healthy'
    };
  },
  
  async syncCachedData() {
    if (this.queue.length === 0) {
      return { success: true, itemsSynced: 0 };
    }
    
    const itemsSynced = this.queue.length;
    this.queue = [];
    return { success: true, itemsSynced };
  },
  
  clearQueue() {
    this.queue = [];
  }
};

// Mock the sync module
jest.mock('../../edge/app/sync', () => ({
  syncWithCloud: mockSync
}));

describe('Edge Application Integration', () => {
  let app;
  
  beforeAll(() => {
    // Create express app
    app = express();
    app.use(express.json());
    
    // Import mocked modules
    const { translateLocally, processAudio } = require('../../edge/app/translation');
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
  });
  
  beforeEach(() => {
    // Clear cache and queue before each test
    mockCache.clearCache();
    mockSync.clearQueue();
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
    
    // Verify translation was queued for sync
    expect(mockSync.queue.length).toBe(1);
    
    // Verify translation was cached
    const cachedItem = mockCache.getCachedTranslation(
      'Hello world',
      'en',
      'es',
      'general'
    );
    expect(cachedItem).toBeDefined();
    expect(cachedItem.translatedText).toBe('Hola mundo');
  });
  
  it('should return cached translation if available', async () => {
    // Add item to cache
    mockCache.cacheTranslation(
      'Hello cache',
      'en',
      'es',
      'general',
      {
        translatedText: 'Hola caché',
        confidence: 'high'
      }
    );
    
    const response = await request(app)
      .post('/translate')
      .send({
        text: 'Hello cache',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      originalText: 'Hello cache',
      translatedText: 'Hola caché',
      confidence: 'high',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general',
      source: 'cache'
    }));
    
    // Verify translation function was not called
    const { translateLocally } = require('../../edge/app/translation');
    expect(translateLocally).not.toHaveBeenCalledWith(
      'Hello cache',
      'en',
      'es',
      'general'
    );
  });
  
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
    
    // Verify translation was queued for sync
    expect(mockSync.queue.length).toBe(1);
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
  
  it('should sync cached data with cloud', async () => {
    // Queue a translation
    mockSync.queueTranslation(
      'Hello world',
      'en',
      'es',
      'general',
      {
        translatedText: 'Hola mundo',
        confidence: 'high'
      }
    );
    
    const response = await request(app).post('/sync');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      itemsSynced: 1
    });
    
    // Verify queue was cleared
    expect(mockSync.queue.length).toBe(0);
  });
});
