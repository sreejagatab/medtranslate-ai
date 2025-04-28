/**
 * Performance tests for the Edge Cache Module
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { runPerformanceTest } = require('./framework');

// Mock dependencies for testing
jest.mock('fs');
jest.mock('path');
jest.mock('crypto');

// Set up environment
process.env.CACHE_DIR = '/cache';
process.env.CACHE_SIZE_LIMIT = '10000';

/**
 * Runs performance tests for the cache module
 */
async function runCachePerformanceTests() {
  // Mock path.join to return predictable paths
  path.join.mockImplementation((...args) => args.join('/'));
  
  // Mock fs functions
  fs.existsSync.mockReturnValue(false);
  fs.mkdirSync.mockImplementation(() => {});
  fs.writeFileSync.mockImplementation(() => {});
  
  // Mock crypto hash
  const mockHash = {
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockImplementation((format) => {
      // Return a hash based on the input to simulate different keys
      return Math.random().toString(16).substring(2);
    })
  };
  crypto.createHash.mockReturnValue(mockHash);
  
  // Import the cache module
  const { cacheManager } = require('../../edge/app/cache');
  
  // Test cache write performance
  await runPerformanceTest(
    'cache-write',
    async () => {
      const text = `Hello world ${Math.random()}`;
      const result = {
        translatedText: `Hola mundo ${Math.random()}`,
        confidence: 'high'
      };
      
      cacheManager.cacheTranslation(
        text,
        'en',
        'es',
        'general',
        result
      );
    },
    {
      iterations: 1000,
      warmupIterations: 100
    }
  );
  
  // Test cache read performance (cache hit)
  await runPerformanceTest(
    'cache-read-hit',
    async () => {
      // First, add an item to the cache
      const text = 'Hello world cache hit test';
      const result = {
        translatedText: 'Hola mundo cache hit test',
        confidence: 'high'
      };
      
      cacheManager.cacheTranslation(
        text,
        'en',
        'es',
        'general',
        result
      );
      
      // Then read it back
      cacheManager.getCachedTranslation(
        text,
        'en',
        'es',
        'general'
      );
    },
    {
      iterations: 1000,
      warmupIterations: 100
    }
  );
  
  // Test cache read performance (cache miss)
  await runPerformanceTest(
    'cache-read-miss',
    async () => {
      // Generate a unique text each time to ensure cache miss
      const text = `Hello world cache miss test ${Math.random()}`;
      
      cacheManager.getCachedTranslation(
        text,
        'en',
        'es',
        'general'
      );
    },
    {
      iterations: 1000,
      warmupIterations: 100
    }
  );
  
  // Test cache performance with different cache sizes
  const cacheSizes = [100, 1000, 10000];
  
  for (const cacheSize of cacheSizes) {
    // Reset the cache
    cacheManager.clearCache();
    
    // Set cache size
    process.env.CACHE_SIZE_LIMIT = cacheSize.toString();
    
    // Fill the cache to 90% capacity
    const fillCount = Math.floor(cacheSize * 0.9);
    for (let i = 0; i < fillCount; i++) {
      const text = `Hello world fill ${i}`;
      const result = {
        translatedText: `Hola mundo fill ${i}`,
        confidence: 'high'
      };
      
      cacheManager.cacheTranslation(
        text,
        'en',
        'es',
        'general',
        result
      );
    }
    
    // Test cache write performance with the cache nearly full
    await runPerformanceTest(
      `cache-write-size-${cacheSize}`,
      async () => {
        const text = `Hello world ${Math.random()}`;
        const result = {
          translatedText: `Hola mundo ${Math.random()}`,
          confidence: 'high'
        };
        
        cacheManager.cacheTranslation(
          text,
          'en',
          'es',
          'general',
          result
        );
      },
      {
        iterations: 100,
        warmupIterations: 10
      }
    );
    
    // Test cache read performance with the cache nearly full
    await runPerformanceTest(
      `cache-read-size-${cacheSize}`,
      async () => {
        // Read a random item from the cache
        const index = Math.floor(Math.random() * fillCount);
        const text = `Hello world fill ${index}`;
        
        cacheManager.getCachedTranslation(
          text,
          'en',
          'es',
          'general'
        );
      },
      {
        iterations: 100,
        warmupIterations: 10
      }
    );
  }
  
  // Test cache eviction performance
  await runPerformanceTest(
    'cache-eviction',
    async () => {
      // Set a small cache size
      process.env.CACHE_SIZE_LIMIT = '10';
      
      // Reset the cache
      cacheManager.clearCache();
      
      // Fill the cache to capacity
      for (let i = 0; i < 10; i++) {
        const text = `Hello world eviction ${i}`;
        const result = {
          translatedText: `Hola mundo eviction ${i}`,
          confidence: 'high'
        };
        
        cacheManager.cacheTranslation(
          text,
          'en',
          'es',
          'general',
          result
        );
      }
      
      // Add one more item to trigger eviction
      const text = `Hello world eviction trigger`;
      const result = {
        translatedText: `Hola mundo eviction trigger`,
        confidence: 'high'
      };
      
      cacheManager.cacheTranslation(
        text,
        'en',
        'es',
        'general',
        result
      );
    },
    {
      iterations: 100,
      warmupIterations: 10
    }
  );
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runCachePerformanceTests()
    .then(() => {
      console.log('Cache performance tests completed');
    })
    .catch(error => {
      console.error('Error running cache performance tests:', error);
      process.exit(1);
    });
}

module.exports = {
  runCachePerformanceTests
};
