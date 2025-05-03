/**
 * Test script for the enhanced cache manager
 * 
 * This script tests the enhanced cache manager with versioning, compression,
 * and criticality-based retention.
 * 
 * Run with: node tests/cache-test.js
 */

const cacheManager = require('../cache');

// Test data
const testTranslations = [
  {
    text: 'The patient is experiencing chest pain',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    context: 'emergency',
    result: {
      translatedText: 'El paciente está experimentando dolor en el pecho',
      confidence: 'high',
      processingTime: 120,
      model: 'claude-3-sonnet'
    },
    options: {
      criticality: 4, // CRITICAL
      compress: true
    }
  },
  {
    text: 'Take this medication twice daily with food',
    sourceLanguage: 'en',
    targetLanguage: 'fr',
    context: 'medication',
    result: {
      translatedText: 'Prenez ce médicament deux fois par jour avec de la nourriture',
      confidence: 'high',
      processingTime: 110,
      model: 'claude-3-sonnet'
    },
    options: {
      criticality: 3, // HIGH
      compress: true
    }
  },
  {
    text: 'How are you feeling today?',
    sourceLanguage: 'en',
    targetLanguage: 'de',
    context: 'general',
    result: {
      translatedText: 'Wie fühlen Sie sich heute?',
      confidence: 'medium',
      processingTime: 90,
      model: 'claude-3-haiku'
    },
    options: {
      criticality: 1, // LOW
      compress: false
    }
  }
];

// Large text for compression testing
const largeText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100);
const largeTranslation = {
  text: largeText,
  sourceLanguage: 'en',
  targetLanguage: 'es',
  context: 'general',
  result: {
    translatedText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100),
    confidence: 'medium',
    processingTime: 250,
    model: 'claude-3-sonnet'
  },
  options: {
    criticality: 2, // MEDIUM
    compress: true
  }
};

// Test functions
async function testBasicCaching() {
  console.log('\n=== Testing Basic Caching ===');
  
  // Initialize cache
  await cacheManager.initialize();
  
  // Cache translations
  for (const translation of testTranslations) {
    console.log(`Caching translation: "${translation.text.substring(0, 30)}..."`);
    await cacheManager.cacheTranslation(
      translation.text,
      translation.sourceLanguage,
      translation.targetLanguage,
      translation.context,
      translation.result,
      translation.options
    );
  }
  
  // Get cache stats
  const stats = cacheManager.getCacheStats(true);
  console.log('Cache statistics:', JSON.stringify(stats, null, 2));
  
  // Retrieve cached translations
  for (const translation of testTranslations) {
    const cached = await cacheManager.getCachedTranslation(
      translation.text,
      translation.sourceLanguage,
      translation.targetLanguage,
      translation.context,
      { includeMetadata: true }
    );
    
    console.log(`Retrieved translation: "${translation.text.substring(0, 30)}..."`);
    console.log('Cached result:', JSON.stringify(cached, null, 2));
  }
}

async function testCompression() {
  console.log('\n=== Testing Compression ===');
  
  // Cache large translation
  console.log(`Caching large translation (${largeText.length} chars)`);
  await cacheManager.cacheTranslation(
    largeTranslation.text,
    largeTranslation.sourceLanguage,
    largeTranslation.targetLanguage,
    largeTranslation.context,
    largeTranslation.result,
    largeTranslation.options
  );
  
  // Get cache stats
  const stats = cacheManager.getCacheStats(true);
  console.log('Compression statistics:');
  console.log(`- Compressed items: ${stats.enhanced.compression.compressedItems}`);
  console.log(`- Savings: ${stats.enhanced.compression.savingsPercent.toFixed(2)}%`);
  console.log(`- Total savings: ${stats.enhanced.compression.totalSavingsBytes} bytes`);
  
  // Retrieve compressed translation
  const cached = await cacheManager.getCachedTranslation(
    largeTranslation.text,
    largeTranslation.sourceLanguage,
    largeTranslation.targetLanguage,
    largeTranslation.context,
    { includeMetadata: true }
  );
  
  console.log('Retrieved large translation:');
  console.log(`- Original size: ${cached.originalSize} bytes`);
  console.log(`- Compressed size: ${cached.size} bytes`);
  console.log(`- Compression ratio: ${(cached.size / cached.originalSize).toFixed(2)}`);
  console.log(`- Is compressed: ${cached.isCompressed}`);
  console.log(`- First 50 chars of translation: "${cached.data.translatedText.substring(0, 50)}..."`);
}

async function testVersioning() {
  console.log('\n=== Testing Versioning ===');
  
  // Get first test translation
  const translation = testTranslations[0];
  
  // Cache initial version
  console.log('Caching initial version');
  await cacheManager.cacheTranslation(
    translation.text,
    translation.sourceLanguage,
    translation.targetLanguage,
    translation.context,
    translation.result,
    { ...translation.options, version: 'v1' }
  );
  
  // Cache updated version
  console.log('Caching updated version');
  const updatedResult = {
    ...translation.result,
    translatedText: translation.result.translatedText + ' (updated)',
    confidence: 'high',
    processingTime: 90
  };
  
  await cacheManager.cacheTranslation(
    translation.text,
    translation.sourceLanguage,
    translation.targetLanguage,
    translation.context,
    updatedResult,
    { ...translation.options, version: 'v2' }
  );
  
  // Get latest version
  console.log('Retrieving latest version');
  const latest = await cacheManager.getCachedTranslation(
    translation.text,
    translation.sourceLanguage,
    translation.targetLanguage,
    translation.context,
    { includeMetadata: true, includeVersionHistory: true }
  );
  
  console.log('Latest version:', JSON.stringify(latest, null, 2));
  
  // Get specific version
  console.log('Retrieving specific version (v1)');
  const v1 = await cacheManager.getCachedTranslation(
    translation.text,
    translation.sourceLanguage,
    translation.targetLanguage,
    translation.context,
    { version: 'v1' }
  );
  
  console.log('Version v1:', JSON.stringify(v1, null, 2));
  
  // Get version statistics
  const stats = cacheManager.getCacheStats(true);
  console.log('Version statistics:');
  console.log(`- Total versions: ${stats.enhanced.versioning.versions.total}`);
  console.log(`- Translation versions: ${stats.enhanced.versioning.versions.translation}`);
}

async function testCriticalityAndEviction() {
  console.log('\n=== Testing Criticality and Eviction ===');
  
  // Add many low-priority items to force eviction
  console.log('Adding 20 low-priority items to force eviction');
  for (let i = 0; i < 20; i++) {
    await cacheManager.cacheTranslation(
      `Test text ${i}`,
      'en',
      'es',
      'general',
      {
        translatedText: `Texto de prueba ${i}`,
        confidence: 'low',
        processingTime: 50,
        model: 'claude-3-haiku'
      },
      {
        criticality: 1, // LOW
        compress: false
      }
    );
  }
  
  // Force eviction
  console.log('Forcing eviction');
  await cacheManager.evictCacheItems('translation', { targetCount: 10 });
  
  // Check if critical items are preserved
  console.log('Checking if critical items are preserved');
  const criticalTranslation = await cacheManager.getCachedTranslation(
    testTranslations[0].text,
    testTranslations[0].sourceLanguage,
    testTranslations[0].targetLanguage,
    testTranslations[0].context
  );
  
  console.log('Critical translation preserved:', !!criticalTranslation);
  
  // Get criticality statistics
  const stats = cacheManager.getCacheStats(true);
  console.log('Criticality statistics:');
  console.log(`- Low: ${stats.enhanced.criticality.low}`);
  console.log(`- Medium: ${stats.enhanced.criticality.medium}`);
  console.log(`- High: ${stats.enhanced.criticality.high}`);
  console.log(`- Critical: ${stats.enhanced.criticality.critical}`);
  console.log(`- Distribution: ${JSON.stringify(stats.metrics.criticalityDistribution)}`);
}

async function testConflictResolution() {
  console.log('\n=== Testing Conflict Resolution ===');
  
  // Create local and remote versions
  const text = 'This is a test for conflict resolution';
  const sourceLanguage = 'en';
  const targetLanguage = 'fr';
  const context = 'general';
  
  const localData = {
    originalText: text,
    translatedText: 'Ceci est un test pour la résolution des conflits',
    confidence: 'medium',
    sourceLanguage,
    targetLanguage,
    context,
    processingTime: 120,
    model: 'local-model',
    timestamp: Date.now() - 1000
  };
  
  const remoteData = {
    originalText: text,
    translatedText: 'Ceci est un test pour la résolution des conflits (remote)',
    confidence: 'high',
    sourceLanguage,
    targetLanguage,
    context,
    processingTime: 100,
    model: 'remote-model',
    timestamp: Date.now()
  };
  
  // Generate cache key
  const cacheKey = text + sourceLanguage + targetLanguage + context;
  
  // Test different resolution strategies
  const strategies = ['local', 'remote', 'merge', 'both'];
  
  for (const strategy of strategies) {
    console.log(`\nTesting conflict resolution strategy: ${strategy}`);
    
    // Set local version
    await cacheManager.set('translation', cacheKey, localData, {
      version: 'local-version',
      criticality: 2
    });
    
    // Resolve conflict
    const resolution = await cacheManager.resolveVersionConflict(
      'translation',
      cacheKey,
      localData,
      remoteData,
      {
        strategy,
        localVersion: 'local-version',
        remoteVersion: 'remote-version'
      }
    );
    
    console.log('Resolution result:', JSON.stringify(resolution, null, 2));
    
    // Get the result from cache
    const cached = await cacheManager.get('translation', cacheKey, { includeMetadata: true });
    console.log('Cached after resolution:', JSON.stringify(cached, null, 2));
  }
  
  // Get conflict statistics
  const stats = cacheManager.getCacheStats(true);
  console.log('\nConflict statistics:');
  console.log(`- Conflicts: ${stats.enhanced.versioning.conflicts}`);
  console.log(`- Resolved: ${stats.enhanced.versioning.resolved}`);
}

async function testCleanupWithCriticality() {
  console.log('\n=== Testing Cleanup with Criticality ===');
  
  // Add items with different criticality levels and expired TTL
  const now = Date.now();
  const hour = 3600000;
  
  // Add expired items with different criticality
  for (let i = 1; i <= 4; i++) {
    await cacheManager.set('translation', `expired-${i}`, {
      originalText: `Expired item ${i}`,
      translatedText: `Item ${i} expirado`,
      confidence: i === 4 ? 'high' : 'medium',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general',
      timestamp: now - (2 * hour)
    }, {
      criticality: i,
      ttl: hour / 1000 // 1 hour in seconds
    });
  }
  
  // Run cleanup respecting criticality
  console.log('Running cleanup respecting criticality');
  const result1 = await cacheManager.cleanupExpiredEntries(null, { respectCriticality: true });
  console.log('Cleanup result:', JSON.stringify(result1, null, 2));
  
  // Check which items remain
  for (let i = 1; i <= 4; i++) {
    const item = await cacheManager.get('translation', `expired-${i}`);
    console.log(`Item with criticality ${i} after cleanup: ${item ? 'exists' : 'removed'}`);
    if (item) {
      console.log(`- Needs refresh: ${item._metadata.needsRefresh}`);
    }
  }
  
  // Run cleanup ignoring criticality
  console.log('\nRunning cleanup ignoring criticality');
  const result2 = await cacheManager.cleanupExpiredEntries(null, { 
    respectCriticality: false,
    forceCleanup: true
  });
  console.log('Cleanup result:', JSON.stringify(result2, null, 2));
  
  // Check which items remain
  for (let i = 1; i <= 4; i++) {
    const item = await cacheManager.get('translation', `expired-${i}`);
    console.log(`Item with criticality ${i} after forced cleanup: ${item ? 'exists' : 'removed'}`);
  }
}

// Run all tests
async function runTests() {
  try {
    console.log('=== Enhanced Cache Manager Tests ===');
    
    await testBasicCaching();
    await testCompression();
    await testVersioning();
    await testCriticalityAndEviction();
    await testConflictResolution();
    await testCleanupWithCriticality();
    
    console.log('\n=== All Tests Completed ===');
    
    // Final stats
    const finalStats = cacheManager.getCacheStats(true);
    console.log('\nFinal Cache Statistics:');
    console.log(`- Cache size: ${finalStats.sizes.total} items`);
    console.log(`- Hit rate: ${finalStats.hitRate.total.toFixed(2)}%`);
    console.log(`- Compression savings: ${finalStats.enhanced.compression.savingsPercent.toFixed(2)}%`);
    console.log(`- Conflicts: ${finalStats.enhanced.versioning.conflicts}`);
    console.log(`- Criticality distribution: ${JSON.stringify(finalStats.metrics.criticalityDistribution)}`);
    
    // Clear cache
    await cacheManager.clear();
    console.log('\nCache cleared');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the tests
runTests();
