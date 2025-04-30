/**
 * Test Script for Enhanced Predictive Cache
 * 
 * This script tests the enhanced predictive caching functionality
 * of the MedTranslate AI Edge Application.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import the predictive cache module
const predictiveCache = require('./predictive-cache');
const networkMonitor = require('./network-monitor');

// Test configuration
const TEST_CONFIG = {
  usageLogSize: 100,
  testDuration: 60000, // 1 minute
  simulateOffline: true,
  generateSampleData: true,
  testPreCaching: true,
  testPredictions: true,
  verbose: true
};

// Sample data for testing
const SAMPLE_CONTEXTS = ['general', 'cardiology', 'neurology', 'orthopedics', 'pediatrics', 'oncology', 'emergency'];
const SAMPLE_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh'];
const SAMPLE_TERMS = [
  'hypertension', 'diabetes mellitus', 'myocardial infarction', 'asthma', 'pneumonia',
  'osteoarthritis', 'migraine', 'epilepsy', 'hypothyroidism', 'gastroesophageal reflux disease',
  'chronic obstructive pulmonary disease', 'rheumatoid arthritis', 'multiple sclerosis',
  'congestive heart failure', 'cerebrovascular accident', 'chronic kidney disease'
];

/**
 * Generate sample usage data
 * 
 * @param {number} count - Number of entries to generate
 * @returns {Array<Object>} - Sample usage data
 */
function generateSampleUsageData(count) {
  const usageData = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Create some patterns in the data
  const commonPairs = [
    { source: 'en', target: 'es', contexts: ['general', 'cardiology'] },
    { source: 'en', target: 'fr', contexts: ['neurology', 'orthopedics'] },
    { source: 'es', target: 'en', contexts: ['pediatrics', 'general'] }
  ];
  
  // Time patterns - more usage during certain hours
  const busyHours = [9, 10, 11, 14, 15, 16]; // 9am-11am, 2pm-4pm
  
  for (let i = 0; i < count; i++) {
    // Determine if this entry should follow a pattern (70% chance)
    const followPattern = Math.random() < 0.7;
    
    let sourceLanguage, targetLanguage, context;
    
    if (followPattern) {
      // Use one of the common pairs
      const pair = commonPairs[Math.floor(Math.random() * commonPairs.length)];
      sourceLanguage = pair.source;
      targetLanguage = pair.target;
      context = pair.contexts[Math.floor(Math.random() * pair.contexts.length)];
    } else {
      // Use random languages and context
      sourceLanguage = SAMPLE_LANGUAGES[Math.floor(Math.random() * SAMPLE_LANGUAGES.length)];
      targetLanguage = SAMPLE_LANGUAGES[Math.floor(Math.random() * SAMPLE_LANGUAGES.length)];
      context = SAMPLE_CONTEXTS[Math.floor(Math.random() * SAMPLE_CONTEXTS.length)];
    }
    
    // Generate timestamp with time patterns
    let timestamp;
    if (Math.random() < 0.6) {
      // 60% of entries during busy hours
      const busyHour = busyHours[Math.floor(Math.random() * busyHours.length)];
      const dayOffset = Math.floor(Math.random() * 7) * oneDay; // Within the last week
      const date = new Date(now - dayOffset);
      date.setHours(busyHour, Math.floor(Math.random() * 60), 0, 0);
      timestamp = date.getTime();
    } else {
      // 40% of entries at random times within the last month
      timestamp = now - Math.floor(Math.random() * 30 * oneDay);
    }
    
    // Generate random terms (1-3 terms per entry)
    const termCount = Math.floor(Math.random() * 3) + 1;
    const terms = [];
    
    for (let j = 0; j < termCount; j++) {
      const term = SAMPLE_TERMS[Math.floor(Math.random() * SAMPLE_TERMS.length)];
      if (!terms.includes(term)) {
        terms.push(term);
      }
    }
    
    // Create entry
    usageData.push({
      sourceLanguage,
      targetLanguage,
      context,
      terms,
      timestamp
    });
  }
  
  // Sort by timestamp
  usageData.sort((a, b) => a.timestamp - b.timestamp);
  
  return usageData;
}

/**
 * Run the predictive cache test
 */
async function runTest() {
  console.log('Starting Enhanced Predictive Cache Test');
  console.log('======================================');
  
  try {
    // Initialize the predictive cache module
    await predictiveCache.initialize();
    console.log('Predictive cache module initialized');
    
    // Generate and set sample usage data if configured
    if (TEST_CONFIG.generateSampleData) {
      console.log(`Generating ${TEST_CONFIG.usageLogSize} sample usage entries...`);
      const sampleData = generateSampleUsageData(TEST_CONFIG.usageLogSize);
      
      // Set the sample data in the module
      predictiveCache.setUsageLog(sampleData);
      console.log('Sample usage data set');
    }
    
    // Update the prediction model
    console.log('Updating prediction model...');
    const updateResult = await predictiveCache.updatePredictionModel();
    
    if (updateResult.success) {
      console.log('Prediction model updated successfully');
    } else {
      console.error('Failed to update prediction model:', updateResult.reason || updateResult.error);
    }
    
    // Test predictions
    if (TEST_CONFIG.testPredictions) {
      console.log('\nTesting predictions...');
      
      // Test with different aggressiveness levels
      const aggressivenessLevels = [0.2, 0.5, 0.8];
      
      for (const aggressiveness of aggressivenessLevels) {
        console.log(`\nGenerating predictions with aggressiveness ${aggressiveness}:`);
        const predictions = predictiveCache.getPredictions({ aggressiveness });
        
        console.log(`Generated ${predictions.length} predictions`);
        
        if (TEST_CONFIG.verbose && predictions.length > 0) {
          console.log('\nTop 5 predictions:');
          predictions.slice(0, 5).forEach((prediction, index) => {
            console.log(`${index + 1}. ${prediction.sourceLanguage}->${prediction.targetLanguage} (${prediction.context})`);
            console.log(`   Score: ${prediction.score.toFixed(3)}, Reason: ${prediction.reason}`);
            
            // Generate sample text for this prediction
            const sampleText = predictiveCache.generateSampleText(prediction);
            console.log(`   Sample: "${sampleText.substring(0, 100)}${sampleText.length > 100 ? '...' : ''}"`);
          });
        }
      }
    }
    
    // Test pre-caching
    if (TEST_CONFIG.testPreCaching) {
      console.log('\nTesting pre-caching...');
      
      // Mock the translation API for testing
      global.fetch = async (url, options) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Parse request body
        const body = JSON.parse(options.body);
        
        // Return mock response
        return {
          ok: true,
          json: async () => ({
            translatedText: `Translated: ${body.text.substring(0, 30)}...`,
            sourceLanguage: body.sourceLanguage,
            targetLanguage: body.targetLanguage
          })
        };
      };
      
      // Run pre-caching
      const preCacheResult = await predictiveCache.preCachePredictedContent();
      
      console.log('Pre-caching result:', preCacheResult);
    }
    
    // Test offline mode if configured
    if (TEST_CONFIG.simulateOffline) {
      console.log('\nTesting offline mode behavior...');
      
      // Simulate going offline
      networkMonitor.simulateOffline(true);
      console.log('Network is now offline');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to pre-cache while offline
      console.log('Attempting to pre-cache while offline...');
      const offlinePreCacheResult = await predictiveCache.preCachePredictedContent();
      console.log('Offline pre-cache result:', offlinePreCacheResult);
      
      // Simulate coming back online
      networkMonitor.simulateOffline(false);
      console.log('Network is now online');
    }
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest();
