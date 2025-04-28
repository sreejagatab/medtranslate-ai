/**
 * Unit tests for the Edge Cache Module
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cacheModule = require('../../edge/app/cache');

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('crypto');

describe('Edge Cache Module', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock path.join to return predictable paths
    path.join.mockImplementation((...args) => args.join('/'));
    
    // Mock process.env
    process.env.CACHE_DIR = '/cache';
    process.env.CACHE_SIZE_LIMIT = '1000';
    
    // Mock crypto hash
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock-hash')
    };
    crypto.createHash.mockReturnValue(mockHash);
    
    // Reset the module's internal state
    // Note: This is a bit hacky but necessary since the module has internal state
    cacheModule.clearCache();
  });
  
  describe('getCachedTranslation', () => {
    it('should return null if no cached translation exists', () => {
      // Call the function
      const result = cacheModule.getCachedTranslation(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      // Verify result
      expect(result).toBeNull();
      
      // Verify crypto was called to generate cache key
      expect(crypto.createHash).toHaveBeenCalledWith('md5');
    });
    
    it('should return cached translation if it exists', () => {
      // Setup: Add an item to the cache
      const mockResult = {
        translatedText: 'Hola mundo',
        confidence: 'high'
      };
      
      cacheModule.cacheTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        mockResult
      );
      
      // Call the function
      const result = cacheModule.getCachedTranslation(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      // Verify result
      expect(result).toEqual(expect.objectContaining({
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        confidence: 'high',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      }));
      
      // Verify lastAccessed was updated
      expect(result.lastAccessed).toBeGreaterThan(0);
    });
    
    it('should use default context if not provided', () => {
      // Setup: Add an item to the cache
      const mockResult = {
        translatedText: 'Hola mundo',
        confidence: 'high'
      };
      
      cacheModule.cacheTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        mockResult
      );
      
      // Call the function without context
      const result = cacheModule.getCachedTranslation(
        'Hello world',
        'en',
        'es'
      );
      
      // Verify result
      expect(result).toEqual(expect.objectContaining({
        originalText: 'Hello world',
        translatedText: 'Hola mundo'
      }));
    });
  });
  
  describe('cacheTranslation', () => {
    it('should add a new translation to the cache', () => {
      // Mock Date.now to return a predictable value
      const mockNow = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      // Call the function
      cacheModule.cacheTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      );
      
      // Verify the item was added to the cache
      const cachedItem = cacheModule.getCachedTranslation(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      expect(cachedItem).toEqual({
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        confidence: 'high',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general',
        created: mockNow,
        lastAccessed: mockNow
      });
    });
    
    it('should update an existing translation in the cache', () => {
      // Add an item to the cache
      cacheModule.cacheTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        {
          translatedText: 'Hola mundo',
          confidence: 'medium'
        }
      );
      
      // Update the item
      cacheModule.cacheTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        {
          translatedText: 'Hola mundo actualizado',
          confidence: 'high'
        }
      );
      
      // Verify the item was updated
      const cachedItem = cacheModule.getCachedTranslation(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      expect(cachedItem.translatedText).toBe('Hola mundo actualizado');
      expect(cachedItem.confidence).toBe('high');
    });
    
    it('should evict items when cache is full', () => {
      // Mock small cache size
      process.env.CACHE_SIZE_LIMIT = '2';
      
      // Mock Date.now to return increasing values
      let mockTime = 1000;
      jest.spyOn(Date, 'now').mockImplementation(() => mockTime += 1000);
      
      // Add items to fill the cache
      cacheModule.cacheTranslation(
        'Hello world 1',
        'en',
        'es',
        'general',
        { translatedText: 'Hola mundo 1', confidence: 'high' }
      );
      
      cacheModule.cacheTranslation(
        'Hello world 2',
        'en',
        'es',
        'general',
        { translatedText: 'Hola mundo 2', confidence: 'high' }
      );
      
      // Mock evictCacheItems to verify it's called
      const evictSpy = jest.spyOn(cacheModule, 'evictCacheItems');
      
      // Add one more item to trigger eviction
      cacheModule.cacheTranslation(
        'Hello world 3',
        'en',
        'es',
        'general',
        { translatedText: 'Hola mundo 3', confidence: 'high' }
      );
      
      // Verify evictCacheItems was called
      expect(evictSpy).toHaveBeenCalled();
      
      // Restore the spy
      evictSpy.mockRestore();
    });
    
    it('should save cache to disk periodically', () => {
      // Mock saveCacheToDisk to verify it's called
      const saveSpy = jest.spyOn(cacheModule, 'saveCacheToDisk').mockImplementation(() => {});
      
      // Add multiple items to trigger save
      for (let i = 0; i < 10; i++) {
        cacheModule.cacheTranslation(
          `Hello world ${i}`,
          'en',
          'es',
          'general',
          { translatedText: `Hola mundo ${i}`, confidence: 'high' }
        );
      }
      
      // Verify saveCacheToDisk was called
      expect(saveSpy).toHaveBeenCalled();
      
      // Restore the spy
      saveSpy.mockRestore();
    });
  });
  
  describe('clearCache', () => {
    it('should clear the cache', () => {
      // Add an item to the cache
      cacheModule.cacheTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        { translatedText: 'Hola mundo', confidence: 'high' }
      );
      
      // Mock saveCacheToDisk to verify it's called
      const saveSpy = jest.spyOn(cacheModule, 'saveCacheToDisk').mockImplementation(() => {});
      
      // Call the function
      cacheModule.clearCache();
      
      // Verify the cache is empty
      const cachedItem = cacheModule.getCachedTranslation(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      expect(cachedItem).toBeNull();
      
      // Verify saveCacheToDisk was called
      expect(saveSpy).toHaveBeenCalled();
      
      // Restore the spy
      saveSpy.mockRestore();
    });
  });
  
  describe('saveCacheToDisk', () => {
    it('should save the cache to disk', () => {
      // Add an item to the cache
      cacheModule.cacheTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        { translatedText: 'Hola mundo', confidence: 'high' }
      );
      
      // Mock Date.now for consistent timestamps
      const mockNow = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      // Call the function
      cacheModule.saveCacheToDisk();
      
      // Verify fs.writeFileSync was called with correct arguments
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/cache/translation_cache.json',
        expect.any(String),
        'utf8'
      );
      
      // Verify the content written to the file
      const fileContent = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(fileContent).toEqual({
        cache: expect.any(Object),
        lastSaved: mockNow
      });
      
      // Verify the cache contains our item
      const cacheKey = Object.keys(fileContent.cache)[0];
      expect(fileContent.cache[cacheKey].translatedText).toBe('Hola mundo');
    });
    
    it('should handle errors when saving to disk', () => {
      // Mock console.error to verify it's called
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock fs.writeFileSync to throw an error
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });
      
      // Call the function
      cacheModule.saveCacheToDisk();
      
      // Verify console.error was called
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error saving cache to disk:',
        expect.any(Error)
      );
      
      // Restore the spy
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('evictCacheItems', () => {
    it('should evict the oldest items from the cache', () => {
      // Mock Date.now to return increasing values for different timestamps
      let mockTime = 1000;
      const mockNow = jest.spyOn(Date, 'now').mockImplementation(() => mockTime += 1000);
      
      // Add multiple items to the cache with different access times
      for (let i = 0; i < 10; i++) {
        cacheModule.cacheTranslation(
          `Hello world ${i}`,
          'en',
          'es',
          'general',
          { translatedText: `Hola mundo ${i}`, confidence: 'high' }
        );
      }
      
      // Reset mock to ensure we get consistent results
      mockNow.mockReset();
      mockNow.mockReturnValue(20000);
      
      // Mock console.log to verify it's called
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Call the function directly
      cacheModule.evictCacheItems();
      
      // Verify console.log was called with the correct message
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Evicted'));
      
      // Verify the oldest item was evicted
      const oldestItem = cacheModule.getCachedTranslation(
        'Hello world 0',
        'en',
        'es',
        'general'
      );
      
      expect(oldestItem).toBeNull();
      
      // Verify newer items are still in the cache
      const newerItem = cacheModule.getCachedTranslation(
        'Hello world 9',
        'en',
        'es',
        'general'
      );
      
      expect(newerItem).not.toBeNull();
      
      // Restore the spies
      consoleLogSpy.mockRestore();
      mockNow.mockRestore();
    });
  });
  
  describe('generateCacheKey', () => {
    it('should generate a consistent cache key', () => {
      // Mock crypto hash
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('abcdef1234567890')
      };
      crypto.createHash.mockReturnValue(mockHash);
      
      // Call the function directly through the module's exported object
      const key1 = cacheModule.generateCacheKey(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      const key2 = cacheModule.generateCacheKey(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      // Verify keys are consistent
      expect(key1).toBe(key2);
      
      // Verify key format
      expect(key1).toBe('en:es:general:abcdef1234567890');
      
      // Verify crypto was called correctly
      expect(crypto.createHash).toHaveBeenCalledWith('md5');
      expect(mockHash.update).toHaveBeenCalledWith('Hello world');
    });
    
    it('should generate different keys for different inputs', () => {
      // Mock crypto hash to return different values for different inputs
      const mockHash1 = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash1')
      };
      
      const mockHash2 = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash2')
      };
      
      crypto.createHash.mockImplementation(() => {
        return mockHash1; // First call
      }).mockImplementationOnce(() => {
        return mockHash1; // Second call
      }).mockImplementationOnce(() => {
        return mockHash2; // Third call
      });
      
      // Generate keys for different inputs
      const key1 = cacheModule.generateCacheKey(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      const key2 = cacheModule.generateCacheKey(
        'Different text',
        'en',
        'es',
        'general'
      );
      
      // Verify keys are different
      expect(key1).not.toBe(key2);
    });
  });
});
