/**
 * Test script for the enhanced sync module
 * 
 * This script tests the enhanced sync module with versioning, compression,
 * and conflict resolution.
 * 
 * Run with: node tests/sync-test.js
 */

const { syncWithCloud } = require('../sync');

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
      priority: 4, // CRITICAL
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
      priority: 3, // HIGH
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
      priority: 1, // LOW
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
    priority: 2, // MEDIUM
    compress: true
  }
};

// Test audio data
const testAudio = {
  audioHash: 'abc123def456',
  sourceLanguage: 'en',
  targetLanguage: 'es',
  context: 'emergency',
  result: {
    originalText: 'I need help immediately',
    translatedText: 'Necesito ayuda inmediatamente',
    confidence: 'high',
    processingTime: 150
  },
  options: {
    priority: 4, // CRITICAL
    compress: true
  }
};

// Test functions
async function testInitialization() {
  console.log('\n=== Testing Initialization ===');
  
  // Initialize sync module
  const result = await syncWithCloud.initialize();
  console.log('Initialization result:', result);
  
  // Get sync status
  const status = syncWithCloud.getSyncStatus(true);
  console.log('Sync status:', JSON.stringify(status, null, 2));
}

async function testQueueing() {
  console.log('\n=== Testing Enhanced Queueing ===');
  
  // Queue translations
  for (const translation of testTranslations) {
    console.log(`Queueing translation: "${translation.text.substring(0, 30)}..."`);
    const id = syncWithCloud.queueTranslation(
      translation.text,
      translation.sourceLanguage,
      translation.targetLanguage,
      translation.context,
      translation.result,
      translation.options
    );
    console.log(`Queued with ID: ${id}`);
  }
  
  // Queue large translation to test compression
  console.log(`Queueing large translation (${largeText.length} chars)`);
  const largeId = syncWithCloud.queueTranslation(
    largeTranslation.text,
    largeTranslation.sourceLanguage,
    largeTranslation.targetLanguage,
    largeTranslation.context,
    largeTranslation.result,
    largeTranslation.options
  );
  console.log(`Queued large translation with ID: ${largeId}`);
  
  // Queue audio translation
  console.log('Queueing audio translation');
  const audioId = syncWithCloud.queueAudioTranslation(
    testAudio.audioHash,
    testAudio.sourceLanguage,
    testAudio.targetLanguage,
    testAudio.context,
    testAudio.result,
    testAudio.options
  );
  console.log(`Queued audio translation with ID: ${audioId}`);
  
  // Get sync status
  const status = syncWithCloud.getSyncStatus();
  console.log('Queue status:', JSON.stringify(status, null, 2));
}

async function testConflictResolution() {
  console.log('\n=== Testing Conflict Resolution ===');
  
  // Create mock conflicts
  const conflicts = testTranslations.map((translation, index) => {
    // Create a slightly different server version
    const serverData = {
      originalText: translation.text,
      translatedText: translation.result.translatedText + ' (server version)',
      confidence: index === 0 ? 'medium' : 'high', // First item has lower confidence on server
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      context: translation.context,
      timestamp: Date.now() + (index === 1 ? 1000 : -1000) // Second item is newer on server
    };
    
    // Create mock item
    return {
      index,
      item: {
        id: `mock-conflict-${index}`,
        type: 'translation',
        data: {
          originalText: translation.text,
          translatedText: translation.result.translatedText,
          confidence: translation.result.confidence,
          sourceLanguage: translation.sourceLanguage,
          targetLanguage: translation.targetLanguage,
          context: translation.context,
          timestamp: Date.now()
        },
        deviceId: 'test-device',
        timestamp: Date.now(),
        version: `local-v${index}`
      },
      serverData
    };
  });
  
  // Test different resolution strategies
  const strategies = ['local', 'remote', 'merge', 'both'];
  
  for (const strategy of strategies) {
    console.log(`\nTesting conflict resolution strategy: ${strategy}`);
    const result = await syncWithCloud.handleConflicts(conflicts, { strategy });
    console.log('Resolution result:', JSON.stringify(result, null, 2));
  }
}

async function testConnectionAndSync() {
  console.log('\n=== Testing Connection and Sync ===');
  
  // Test connection
  const connectionResult = await syncWithCloud.testConnection();
  console.log('Connection test result:', connectionResult);
  
  if (connectionResult.connected) {
    // Attempt to sync data
    console.log('\nAttempting to sync data with cloud...');
    const syncResult = await syncWithCloud.syncCachedData();
    console.log('Sync result:', syncResult);
  } else {
    console.log('Skipping sync test as connection failed');
  }
}

// Run all tests
async function runTests() {
  try {
    console.log('=== Enhanced Sync Module Tests ===');
    
    await testInitialization();
    await testQueueing();
    await testConflictResolution();
    await testConnectionAndSync();
    
    console.log('\n=== All Tests Completed ===');
    
    // Final status
    const finalStatus = syncWithCloud.getSyncStatus(true);
    console.log('\nFinal Sync Status:');
    console.log(`- Queue size: ${finalStatus.queueSize} items`);
    console.log(`- Queue by priority: ${JSON.stringify(finalStatus.queueByPriority)}`);
    console.log(`- Sync state: ${finalStatus.syncState}`);
    console.log(`- Metrics: ${JSON.stringify(finalStatus.metrics)}`);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the tests
runTests();
