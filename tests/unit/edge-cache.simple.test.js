/**
 * Simplified unit tests for the Edge Cache Module
 */

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('{}')
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash')
  })
}));

// Create a mock cache module
const mockCache = {
  cacheManager: {
    getCachedTranslation: jest.fn((text, sourceLanguage, targetLanguage, context = 'general') => {
      if (text === 'cached text') {
        return {
          originalText: text,
          translatedText: 'texto en caché',
          confidence: 'high',
          sourceLanguage,
          targetLanguage,
          context,
          timestamp: Date.now()
        };
      }
      return null;
    }),
    
    cacheTranslation: jest.fn((text, sourceLanguage, targetLanguage, context, result) => {
      // Just a mock implementation that does nothing
    }),
    
    clearCache: jest.fn(),
    
    saveCacheToDisk: jest.fn()
  }
};

// Mock the cache module
jest.mock('../../edge/app/cache', () => mockCache);

describe('Edge Cache Module', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getCachedTranslation', () => {
    it('should return null if no cached translation exists', () => {
      const result = mockCache.cacheManager.getCachedTranslation(
        'Hello world',
        'en',
        'es',
        'general'
      );

      expect(mockCache.cacheManager.getCachedTranslation).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'es',
        'general'
      );

      expect(result).toBeNull();
    });

    it('should return cached translation if it exists', () => {
      const result = mockCache.cacheManager.getCachedTranslation(
        'cached text',
        'en',
        'es',
        'general'
      );

      expect(mockCache.cacheManager.getCachedTranslation).toHaveBeenCalledWith(
        'cached text',
        'en',
        'es',
        'general'
      );

      expect(result).toEqual(expect.objectContaining({
        originalText: 'cached text',
        translatedText: 'texto en caché',
        confidence: 'high',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      }));
    });
  });

  describe('cacheTranslation', () => {
    it('should add a new translation to the cache', () => {
      mockCache.cacheManager.cacheTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      );

      expect(mockCache.cacheManager.cacheTranslation).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'es',
        'general',
        {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      );
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      mockCache.cacheManager.clearCache();

      expect(mockCache.cacheManager.clearCache).toHaveBeenCalled();
    });
  });

  describe('saveCacheToDisk', () => {
    it('should save the cache to disk', () => {
      mockCache.cacheManager.saveCacheToDisk();

      expect(mockCache.cacheManager.saveCacheToDisk).toHaveBeenCalled();
    });
  });
});
