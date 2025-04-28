/**
 * Integration tests for Edge Server and Cache Module
 */

const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Import setup
require('./setup');

describe('Edge Server and Cache Module Integration', () => {
  let app;
  let server;
  let cacheManager;
  
  beforeAll(() => {
    // Load the cache module
    cacheManager = require('../../edge/app/cache').cacheManager;
    
    // Create express app
    app = express();
    app.use(express.json());
    
    // Define endpoints for testing cache
    app.post('/cache', (req, res) => {
      const { text, sourceLanguage, targetLanguage, context, result } = req.body;
      
      cacheManager.cacheTranslation(
        text, sourceLanguage, targetLanguage, context, result
      );
      
      res.json({ success: true });
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
    
    // Start server
    server = app.listen(3002);
  });
  
  afterAll((done) => {
    // Close server
    server.close(done);
  });
  
  beforeEach(() => {
    // Clear cache before each test
    cacheManager.clearCache();
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
    expect(cacheResponse.body).toEqual({ success: true });
    
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
  
  it('should persist cache to disk and load it back', async () => {
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
    
    // Save cache to disk
    cacheManager.saveCacheToDisk();
    
    // Verify cache file exists
    const cacheFile = path.join(process.env.CACHE_DIR, 'translation_cache.json');
    expect(fs.existsSync(cacheFile)).toBe(true);
    
    // Load a new instance of the cache module to test loading from disk
    jest.resetModules();
    const newCacheManager = require('../../edge/app/cache').cacheManager;
    
    // Verify the cached item was loaded
    const cachedItem = newCacheManager.getCachedTranslation(
      'Hello world',
      'en',
      'es',
      'general'
    );
    
    expect(cachedItem).toBeDefined();
    expect(cachedItem.translatedText).toBe('Hola mundo');
  });
  
  it('should handle multiple cache entries', async () => {
    // Cache multiple translations
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/cache')
        .send({
          text: `Hello ${i}`,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general',
          result: {
            translatedText: `Hola ${i}`,
            confidence: 'high'
          }
        });
    }
    
    // Verify all items are in cache
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .get('/cache')
        .query({
          text: `Hello ${i}`,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.translatedText).toBe(`Hola ${i}`);
    }
  });
});
