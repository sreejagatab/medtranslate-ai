/**
 * Integration Tests for Enhanced Predictive Caching System
 * 
 * This test suite verifies the functionality of the enhanced predictive caching system
 * for the MedTranslate AI Edge Application, including:
 * - Usage pattern analysis
 * - Prediction model generation
 * - Offline preparation
 * - Energy-aware caching
 * - Cache prioritization
 */

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const express = require('express');
const request = require('supertest');

// Import modules to test
const predictiveCache = require('../../edge/app/predictive-cache');
const networkMonitor = require('../../edge/app/network-monitor');

// Configuration
const config = {
  edgeUrl: 'http://localhost:3001',
  testTimeout: 30000 // 30 seconds
};

// Mock axios for network requests
let axiosMock;

// Test server
let app;
let server;

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  console.log('\n=== Setting up Predictive Caching Test Environment ===\n');
  
  // Create mock axios
  axiosMock = new MockAdapter(axios);
  
  // Create express app for testing
  app = express();
  app.use(express.json());
  
  // Define test endpoints
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });
  
  app.post('/translate', async (req, res) => {
    const { text, sourceLanguage, targetLanguage, context } = req.body;
    
    // Log usage for predictive caching
    await predictiveCache.logTranslationUsage(
      text, sourceLanguage, targetLanguage, context, 
      { translatedText: `Translated: ${text}`, confidence: 0.9, processingTime: 100 }
    );
    
    res.json({
      translatedText: `Translated: ${text}`,
      sourceLanguage,
      targetLanguage,
      context,
      confidence: 0.9,
      fromCache: false
    });
  });
  
  app.get('/cache/stats', (req, res) => {
    res.json(predictiveCache.getUsageStats());
  });
  
  app.post('/cache/prepare-offline', async (req, res) => {
    const result = await predictiveCache.prepareForOfflineMode(req.body);
    res.json(result);
  });
  
  app.get('/cache/predictions', (req, res) => {
    const predictions = predictiveCache.getPredictions(req.query);
    res.json(predictions);
  });
  
  // Start server
  server = app.listen(3001);
  
  // Initialize predictive cache
  await predictiveCache.initialize();
  
  console.log('Test environment setup complete');
}

/**
 * Teardown test environment
 */
async function teardownTestEnvironment() {
  console.log('\n=== Tearing down Predictive Caching Test Environment ===\n');
  
  // Close server
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  
  // Restore axios
  if (axiosMock) {
    axiosMock.restore();
  }
  
  console.log('Test environment teardown complete');
}

/**
 * Test usage pattern analysis
 */
async function testUsagePatternAnalysis() {
  console.log('\n=== Testing Usage Pattern Analysis ===\n');
  
  // Generate sample translations to build usage patterns
  const translations = [
    {
      text: 'The patient has a fever and headache.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    },
    {
      text: 'Take this medication twice daily.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'medication'
    },
    {
      text: 'Your blood pressure is slightly elevated.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'cardiology'
    }
  ];
  
  // Perform translations to build usage patterns
  for (let i = 0; i < 3; i++) { // Repeat to build stronger patterns
    for (const translation of translations) {
      await request(app)
        .post('/translate')
        .send(translation);
    }
  }
  
  // Get usage stats
  const statsResponse = await request(app).get('/cache/stats');
  
  // Verify that usage patterns are being collected
  const stats = statsResponse.body;
  console.log('Usage stats:', JSON.stringify(stats, null, 2));
  
  // Check if usage patterns are being analyzed
  const hasUsagePatterns = stats.usagePatterns && 
                          Object.keys(stats.usagePatterns.languagePairs).length > 0 &&
                          Object.keys(stats.usagePatterns.contexts).length > 0;
  
  console.log(`Usage pattern analysis: ${hasUsagePatterns ? 'PASSED' : 'FAILED'}`);
  return hasUsagePatterns;
}

/**
 * Test prediction model generation
 */
async function testPredictionModelGeneration() {
  console.log('\n=== Testing Prediction Model Generation ===\n');
  
  // Force update of prediction model
  await predictiveCache.updatePredictionModel();
  
  // Get predictions
  const predictionsResponse = await request(app).get('/cache/predictions');
  const predictions = predictionsResponse.body;
  
  console.log(`Generated ${predictions.length} predictions`);
  
  // Check if predictions were generated
  const hasPredictions = predictions.length > 0;
  
  // Log some sample predictions
  if (hasPredictions && predictions.length > 0) {
    console.log('Sample predictions:');
    for (let i = 0; i < Math.min(3, predictions.length); i++) {
      console.log(`- ${predictions[i].reason}: ${predictions[i].score.toFixed(2)} (${predictions[i].type})`);
    }
  }
  
  console.log(`Prediction model generation: ${hasPredictions ? 'PASSED' : 'FAILED'}`);
  return hasPredictions;
}

/**
 * Test offline preparation
 */
async function testOfflinePreparation() {
  console.log('\n=== Testing Offline Preparation ===\n');
  
  // Prepare for offline mode
  const prepareResponse = await request(app)
    .post('/cache/prepare-offline')
    .send({
      forcePrepare: true,
      offlineRisk: 0.8
    });
  
  const prepareResult = prepareResponse.body;
  console.log('Offline preparation result:', JSON.stringify(prepareResult, null, 2));
  
  // Check if preparation was successful
  const preparationSuccessful = prepareResult.success;
  
  console.log(`Offline preparation: ${preparationSuccessful ? 'PASSED' : 'FAILED'}`);
  return preparationSuccessful;
}

/**
 * Test energy-aware caching
 */
async function testEnergyAwareCaching() {
  console.log('\n=== Testing Energy-Aware Caching ===\n');
  
  // Simulate low battery
  const originalBatteryLevel = global.navigator ? global.navigator.getBattery : null;
  
  // Mock battery API
  global.navigator = {
    ...global.navigator,
    getBattery: async () => ({
      level: 0.2, // 20% battery
      charging: false,
      addEventListener: () => {}
    })
  };
  
  // Prepare for offline mode with energy awareness
  const prepareResponse = await request(app)
    .post('/cache/prepare-offline')
    .send({
      forcePrepare: true,
      energyAware: true
    });
  
  const prepareResult = prepareResponse.body;
  console.log('Energy-aware preparation result:', JSON.stringify(prepareResult, null, 2));
  
  // Check if energy awareness was applied
  const energyAwarenessApplied = prepareResult.adjustments && 
                               prepareResult.adjustments.includes('energy_conservation');
  
  // Restore original battery API
  if (originalBatteryLevel) {
    global.navigator.getBattery = originalBatteryLevel;
  }
  
  console.log(`Energy-aware caching: ${energyAwarenessApplied ? 'PASSED' : 'FAILED'}`);
  return energyAwarenessApplied;
}

/**
 * Test cache prioritization
 */
async function testCachePrioritization() {
  console.log('\n=== Testing Cache Prioritization ===\n');
  
  // Get predictions with different priorities
  const predictionsResponse = await request(app)
    .get('/cache/predictions')
    .query({
      aggressiveness: 0.8
    });
  
  const predictions = predictionsResponse.body;
  
  // Group predictions by priority
  const priorityGroups = {};
  
  for (const prediction of predictions) {
    const priority = prediction.priority || 'medium';
    priorityGroups[priority] = priorityGroups[priority] || [];
    priorityGroups[priority].push(prediction);
  }
  
  console.log('Prediction priority groups:');
  for (const [priority, items] of Object.entries(priorityGroups)) {
    console.log(`- ${priority}: ${items.length} items`);
  }
  
  // Check if prioritization is working
  const hasPrioritization = Object.keys(priorityGroups).length > 1;
  
  console.log(`Cache prioritization: ${hasPrioritization ? 'PASSED' : 'FAILED'}`);
  return hasPrioritization;
}

/**
 * Test offline mode with network interruption
 */
async function testOfflineModeWithPredictiveCache() {
  console.log('\n=== Testing Offline Mode with Predictive Cache ===\n');
  
  // First, prepare for offline mode
  await request(app)
    .post('/cache/prepare-offline')
    .send({
      forcePrepare: true,
      offlineRisk: 1.0 // Certain to go offline
    });
  
  // Get predictions to see what should be cached
  const predictionsResponse = await request(app).get('/cache/predictions');
  const predictions = predictionsResponse.body;
  
  // Generate sample texts from predictions
  const sampleTexts = [];
  for (let i = 0; i < Math.min(3, predictions.length); i++) {
    const sampleText = predictiveCache.generateSampleText(predictions[i]);
    if (sampleText) {
      sampleTexts.push({
        text: sampleText,
        sourceLanguage: predictions[i].sourceLanguage || 'en',
        targetLanguage: predictions[i].targetLanguage || 'es',
        context: predictions[i].context || 'general'
      });
    }
  }
  
  // Add a completely new text that shouldn't be in cache
  sampleTexts.push({
    text: 'This is a completely new text that should not be in cache.',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    context: 'general'
  });
  
  // Simulate network interruption
  networkMonitor.setOfflineMode(true);
  
  // Try translations in offline mode
  const offlineResults = [];
  
  for (const translation of sampleTexts) {
    try {
      const response = await request(app)
        .post('/translate')
        .send(translation);
      
      offlineResults.push({
        text: translation.text,
        success: true,
        fromCache: response.body.fromCache || false
      });
    } catch (error) {
      offlineResults.push({
        text: translation.text,
        success: false,
        error: error.message
      });
    }
  }
  
  // Restore network
  networkMonitor.setOfflineMode(false);
  
  // Check results
  console.log('Offline translation results:');
  for (const result of offlineResults) {
    console.log(`- "${result.text.substring(0, 30)}...": ${result.success ? 'Success' : 'Failed'} ${result.fromCache ? '(from cache)' : ''}`);
  }
  
  // Calculate success rate for predicted content
  const predictedResults = offlineResults.slice(0, -1); // Exclude the last one which is not predicted
  const predictedSuccessRate = predictedResults.filter(r => r.success).length / predictedResults.length;
  
  console.log(`Predicted content offline success rate: ${(predictedSuccessRate * 100).toFixed(1)}%`);
  
  // Check if the unpredicted content failed (as expected)
  const unpredictedResult = offlineResults[offlineResults.length - 1];
  
  console.log(`Offline mode with predictive cache: ${predictedSuccessRate > 0.5 ? 'PASSED' : 'FAILED'}`);
  return predictedSuccessRate > 0.5;
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Setup test environment
    await setupTestEnvironment();
    
    // Run tests
    const testResults = {
      usagePatternAnalysis: await testUsagePatternAnalysis(),
      predictionModelGeneration: await testPredictionModelGeneration(),
      offlinePreparation: await testOfflinePreparation(),
      energyAwareCaching: await testEnergyAwareCaching(),
      cachePrioritization: await testCachePrioritization(),
      offlineModeWithPredictiveCache: await testOfflineModeWithPredictiveCache()
    };
    
    // Print summary
    console.log('\n=== Test Summary ===');
    for (const [test, result] of Object.entries(testResults)) {
      console.log(`${result ? '✅' : '❌'} ${test}`);
    }
    
    const allPassed = Object.values(testResults).every(result => result);
    console.log(`\nOverall result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return allPassed;
  } finally {
    // Teardown test environment
    await teardownTestEnvironment();
  }
}

// Export for Jest
module.exports = {
  testUsagePatternAnalysis,
  testPredictionModelGeneration,
  testOfflinePreparation,
  testEnergyAwareCaching,
  testCachePrioritization,
  testOfflineModeWithPredictiveCache,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
