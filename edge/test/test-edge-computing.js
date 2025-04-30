/**
 * Test Script for Edge Computing Capabilities
 * 
 * This script tests the enhanced edge computing capabilities:
 * - Device capability detection
 * - Model optimization
 * - Offline translation
 * - Synchronization
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Import modules
const modelManager = require('../app/model_manager');
const cache = require('../app/cache');
const sync = require('../app/sync');
const networkMonitor = require('../app/network-monitor');

// Test data
const testTexts = {
  en: {
    general: "The patient has a fever of 101°F and complains of headache and fatigue.",
    cardiology: "The patient has a history of myocardial infarction and is currently on anticoagulant therapy.",
    neurology: "The patient presents with symptoms of multiple sclerosis, including numbness and visual disturbances."
  },
  es: {
    general: "El paciente tiene fiebre de 38.3°C y se queja de dolor de cabeza y fatiga.",
    cardiology: "El paciente tiene antecedentes de infarto de miocardio y actualmente está en terapia anticoagulante.",
    neurology: "El paciente presenta síntomas de esclerosis múltiple, incluyendo entumecimiento y alteraciones visuales."
  },
  fr: {
    general: "Le patient a une fièvre de 38,3°C et se plaint de maux de tête et de fatigue.",
    cardiology: "Le patient a des antécédents d'infarctus du myocarde et suit actuellement un traitement anticoagulant.",
    neurology: "Le patient présente des symptômes de sclérose en plaques, notamment des engourdissements et des troubles visuels."
  }
};

// Language pairs to test
const languagePairs = [
  { source: 'en', target: 'es' },
  { source: 'en', target: 'fr' },
  { source: 'es', target: 'en' },
  { source: 'fr', target: 'en' }
];

// Medical contexts to test
const medicalContexts = ['general', 'cardiology', 'neurology'];

/**
 * Test device capability detection
 */
async function testDeviceCapabilities() {
  console.log('\n=== Testing Device Capability Detection ===\n');
  
  try {
    // Access the detectDeviceCapabilities function
    const detectDeviceCapabilities = modelManager.__get__('detectDeviceCapabilities');
    
    if (typeof detectDeviceCapabilities !== 'function') {
      console.log('detectDeviceCapabilities function not available for testing');
      return;
    }
    
    const capabilities = await detectDeviceCapabilities();
    console.log('Detected device capabilities:');
    console.log(JSON.stringify(capabilities, null, 2));
    
    console.log('\nRecommended inference settings:');
    console.log(`- Engine: ${capabilities.inference.recommendedEngine}`);
    console.log(`- Compute Type: ${capabilities.inference.recommendedComputeType}`);
    console.log(`- Batch Size: ${capabilities.inference.maxBatchSize}`);
    console.log(`- Use Quantization: ${capabilities.inference.useQuantization}`);
    
    return capabilities;
  } catch (error) {
    console.error('Error testing device capabilities:', error);
  }
}

/**
 * Test model optimization
 */
async function testModelOptimization() {
  console.log('\n=== Testing Model Optimization ===\n');
  
  try {
    // Initialize model manager
    await modelManager.initialize();
    
    // Get supported language pairs
    const languagePairs = modelManager.getSupportedLanguagePairs();
    console.log(`Found ${languagePairs.length} supported language pairs`);
    
    if (languagePairs.length === 0) {
      console.log('No language pairs available for testing');
      return;
    }
    
    // Test optimization for the first language pair
    const pair = languagePairs[0];
    console.log(`Testing optimization for ${pair.sourceLanguage} to ${pair.targetLanguage}`);
    
    // Get model
    const model = modelManager.getModel(pair.sourceLanguage, pair.targetLanguage);
    
    if (!model) {
      console.log(`No model available for ${pair.sourceLanguage} to ${pair.targetLanguage}`);
      return;
    }
    
    console.log('Model information:');
    console.log(`- Path: ${model.path}`);
    console.log(`- Optimized: ${model.optimizedPath ? 'Yes' : 'No'}`);
    
    if (model.optimizedPath) {
      console.log(`- Optimized Path: ${model.optimizedPath}`);
    }
    
    return model;
  } catch (error) {
    console.error('Error testing model optimization:', error);
  }
}

/**
 * Test offline translation
 */
async function testOfflineTranslation() {
  console.log('\n=== Testing Offline Translation ===\n');
  
  try {
    // Initialize model manager
    await modelManager.initialize();
    
    // Get supported language pairs
    const supportedPairs = modelManager.getSupportedLanguagePairs();
    
    if (supportedPairs.length === 0) {
      console.log('No language pairs available for testing');
      return;
    }
    
    // Filter to pairs that have test data
    const testPairs = supportedPairs.filter(pair => 
      testTexts[pair.sourceLanguage] && testTexts[pair.targetLanguage]
    );
    
    if (testPairs.length === 0) {
      console.log('No test data available for supported language pairs');
      return;
    }
    
    // Simulate offline mode
    console.log('Simulating offline mode...');
    networkMonitor.setOfflineMode(true);
    
    // Test translation for each available pair
    for (const pair of testPairs.slice(0, 2)) { // Limit to 2 pairs for brevity
      const { sourceLanguage, targetLanguage } = pair;
      
      console.log(`\nTesting ${sourceLanguage} to ${targetLanguage} translation in offline mode`);
      
      // Test each medical context
      for (const context of medicalContexts) {
        if (!testTexts[sourceLanguage][context]) continue;
        
        const text = testTexts[sourceLanguage][context];
        console.log(`\nContext: ${context}`);
        console.log(`Source: "${text}"`);
        
        try {
          const result = await modelManager.translateText(
            text,
            sourceLanguage,
            targetLanguage,
            context
          );
          
          console.log(`Translation: "${result.translatedText}"`);
          console.log(`Confidence: ${result.confidence}`);
          console.log(`Processing Time: ${result.processingTime}ms`);
          
          if (result.terminologyMatches && result.terminologyMatches.length > 0) {
            console.log(`Terminology Matches: ${result.terminologyMatches.length}`);
          }
        } catch (error) {
          console.error(`Error translating in context ${context}:`, error.message);
        }
      }
    }
    
    // Restore online mode
    networkMonitor.setOfflineMode(false);
    
    return true;
  } catch (error) {
    console.error('Error testing offline translation:', error);
    return false;
  }
}

/**
 * Test synchronization
 */
async function testSynchronization() {
  console.log('\n=== Testing Synchronization ===\n');
  
  try {
    // Initialize cache
    await cache.initialize();
    
    // Add some items to the cache
    console.log('Adding items to cache...');
    
    const cacheItems = [
      {
        key: 'test-translation-1',
        value: {
          originalText: 'This is a test',
          translatedText: 'Esto es una prueba',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        },
        type: 'translation'
      },
      {
        key: 'test-translation-2',
        value: {
          originalText: 'Another test',
          translatedText: 'Otra prueba',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        },
        type: 'translation'
      }
    ];
    
    for (const item of cacheItems) {
      await cache.set(item.key, item.value, item.type);
    }
    
    console.log(`Added ${cacheItems.length} items to cache`);
    
    // Simulate offline mode
    console.log('\nSimulating offline mode...');
    networkMonitor.setOfflineMode(true);
    
    // Perform some operations in offline mode
    console.log('Performing operations in offline mode...');
    
    const offlineItem = {
      key: 'offline-translation',
      value: {
        originalText: 'Offline test',
        translatedText: 'Prueba sin conexión',
        sourceLanguage: 'en',
        targetLanguage: 'es'
      },
      type: 'translation'
    };
    
    await cache.set(offlineItem.key, offlineItem.value, offlineItem.type);
    console.log('Added offline item to cache');
    
    // Mark item as priority for offline use
    await cache.setPriority(offlineItem.key, offlineItem.type, true);
    console.log('Marked offline item as priority');
    
    // Restore online mode
    console.log('\nRestoring online mode...');
    networkMonitor.setOfflineMode(false);
    
    // Synchronize with server
    console.log('Synchronizing with server...');
    try {
      const syncResult = await sync.synchronize();
      console.log('Synchronization result:', syncResult);
    } catch (error) {
      console.log('Synchronization error (expected in test environment):', error.message);
    }
    
    // Check cache statistics
    const stats = await cache.getStats();
    console.log('\nCache statistics:');
    console.log(JSON.stringify(stats, null, 2));
    
    return stats;
  } catch (error) {
    console.error('Error testing synchronization:', error);
    return null;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== Edge Computing Capabilities Test ===\n');
  
  try {
    // Test device capabilities
    await testDeviceCapabilities();
    
    // Test model optimization
    await testModelOptimization();
    
    // Test offline translation
    await testOfflineTranslation();
    
    // Test synchronization
    await testSynchronization();
    
    console.log('\n=== All Tests Completed ===');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run tests
runTests();
