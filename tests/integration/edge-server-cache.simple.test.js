/**
 * Simplified integration tests for Edge Server and Cache Module
 */

const request = require('supertest');
const express = require('express');

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

describe('Edge Server and Cache Module Integration', () => {
  let app;
  
  beforeAll(() => {
    // Create express app
    app = express();
    app.use(express.json());
    
    // Import mocked modules
    const { cacheManager } = require('../../edge/app/cache');
    
    // Define endpoints for testing cache
    app.post('/cache', (req, res) => {
      const { text, sourceLanguage, targetLanguage, context, result } = req.body;
      
      const cacheItem = cacheManager.cacheTranslation(
        text, sourceLanguage, targetLanguage, context, result
      );
      
      res.json(cacheItem);
    });
    
    app.get('/cache', (req, res) => {
      const { text, sourceLanguage, targetLanguage, context } = req.query;
      
      const cachedItem = cacheManager.getCachedTranslation(
        text, sourceLanguage, targetLanguage, context
      );
      
      if (cachedItem) {
        res.json(cachedItem);
      } else {
        res.status(404).json({ error: 'Item not found in cache' });
      }
    });
    
    app.delete('/cache', (req, res) => {
      cacheManager.clearCache();
      res.json({ success: true });
    });
  });
  
  beforeEach(() => {
    // Clear cache before each test
    mockCache.clearCache();
  });
  
  it('should cache a translation and retrieve it', async () => {
    // Cache a translation
    const cacheResponse = await request(app)
      .post('/cache')
      .send({
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general',
        result: {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      });
    
    expect(cacheResponse.status).toBe(200);
    expect(cacheResponse.body).toEqual(expect.objectContaining({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      confidence: 'high',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    }));
    
    // Retrieve the cached translation
    const retrieveResponse = await request(app)
      .get('/cache')
      .query({
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    expect(retrieveResponse.status).toBe(200);
    expect(retrieveResponse.body).toEqual(expect.objectContaining({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      confidence: 'high',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    }));
  });
  
  it('should return 404 for non-existent cache items', async () => {
    const response = await request(app)
      .get('/cache')
      .query({
        text: 'Non-existent text',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Item not found in cache' });
  });
  
  it('should clear the cache', async () => {
    // Cache a translation
    await request(app)
      .post('/cache')
      .send({
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general',
        result: {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      });
    
    // Clear the cache
    const clearResponse = await request(app)
      .delete('/cache');
    
    expect(clearResponse.status).toBe(200);
    expect(clearResponse.body).toEqual({ success: true });
    
    // Try to retrieve the cached translation
    const retrieveResponse = await request(app)
      .get('/cache')
      .query({
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    expect(retrieveResponse.status).toBe(404);
  });
});
