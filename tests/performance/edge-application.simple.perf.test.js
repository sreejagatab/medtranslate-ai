/**
 * Simplified performance tests for the Edge Application
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../../edge/app/translation', () => ({
  translateLocally: jest.fn().mockImplementation((text, sourceLanguage, targetLanguage, context) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          originalText: text,
          translatedText: 'Hola mundo',
          confidence: 'high',
          sourceLanguage,
          targetLanguage,
          context
        });
      }, text.length * 2); // Simulate longer processing for longer text
    });
  }),
  processAudio: jest.fn().mockImplementation((audioData, sourceLanguage, targetLanguage, context) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          originalText: 'Hello world',
          translatedText: 'Hola mundo',
          confidence: 'high',
          audioResponse: 'base64audio',
          sourceLanguage,
          targetLanguage,
          context
        });
      }, audioData.length * 0.01); // Simulate longer processing for larger audio
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
  
  clearQueue() {
    this.queue = [];
  }
};

// Mock the sync module
jest.mock('../../edge/app/sync', () => ({
  syncWithCloud: mockSync
}));

describe('Edge Application Performance', () => {
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
  });
  
  beforeEach(() => {
    // Clear cache and queue before each test
    mockCache.clearCache();
    mockSync.clearQueue();
  });
  
  it('should measure text translation performance with different text lengths', async () => {
    const textLengths = [
      { name: 'short', text: 'Hello' },
      { name: 'medium', text: 'Hello world, how are you today?' },
      { name: 'long', text: 'Hello world, this is a longer text that should take more time to translate. It contains multiple sentences and should simulate a more realistic translation scenario.' }
    ];
    
    for (const { name, text } of textLengths) {
      const startTime = Date.now();
      
      await request(app)
        .post('/translate')
        .send({
          text,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general'
        });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`${name} text translation took ${duration}ms`);
      expect(duration).toBeLessThan(name === 'long' ? 2000 : 1000);
    }
  });
  
  it('should measure audio translation performance with different audio sizes', async () => {
    const audioSizes = [
      { name: 'small', size: 1000 },
      { name: 'medium', size: 10000 },
      { name: 'large', size: 100000 }
    ];
    
    for (const { name, size } of audioSizes) {
      // Generate mock audio data of the specified size
      const audioData = 'a'.repeat(size);
      
      const startTime = Date.now();
      
      await request(app)
        .post('/translate-audio')
        .send({
          audioData,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general'
        });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`${name} audio translation took ${duration}ms`);
      expect(duration).toBeLessThan(name === 'large' ? 5000 : 2000);
    }
  });
  
  it('should measure cache performance', async () => {
    const text = 'Hello world, cache test';
    
    // First request (cache miss)
    const missStartTime = Date.now();
    
    await request(app)
      .post('/translate')
      .send({
        text,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    const missEndTime = Date.now();
    const missDuration = missEndTime - missStartTime;
    
    console.log(`Translation with cache miss took ${missDuration}ms`);
    
    // Second request (cache hit)
    const hitStartTime = Date.now();
    
    await request(app)
      .post('/translate')
      .send({
        text,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    const hitEndTime = Date.now();
    const hitDuration = hitEndTime - hitStartTime;
    
    console.log(`Translation with cache hit took ${hitDuration}ms`);
    
    // Cache hit should be significantly faster than cache miss
    expect(hitDuration).toBeLessThan(missDuration / 2);
  });
  
  it('should measure concurrent request performance', async () => {
    const concurrentRequests = 10;
    const requests = [];
    
    const startTime = Date.now();
    
    // Create concurrent requests
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        request(app)
          .post('/translate')
          .send({
            text: `Hello concurrent ${i}`,
            sourceLanguage: 'en',
            targetLanguage: 'es',
            context: 'general'
          })
      );
    }
    
    // Wait for all requests to complete
    await Promise.all(requests);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / concurrentRequests;
    
    console.log(`${concurrentRequests} concurrent requests took ${duration}ms (avg: ${avgTime.toFixed(2)}ms per request)`);
    
    // Average time should be reasonable
    expect(avgTime).toBeLessThan(1000);
  });
});
