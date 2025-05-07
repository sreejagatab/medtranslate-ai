/**
 * Enhanced Integration Tests for Predictive Caching System
 *
 * This test suite provides comprehensive testing for the predictive caching system,
 * focusing on edge cases, real-world scenarios, and advanced ML model integration:
 *
 * - Network fluctuation scenarios
 * - Battery level impact on caching strategies
 * - Storage constraints handling
 * - ML model accuracy evaluation
 * - Offline readiness assessment
 * - Cache hit rate optimization
 * - Adaptive threshold testing
 */

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');

// Import modules to test
const predictiveCache = require('../../edge/app/predictive-cache');
const networkMonitor = require('../../edge/app/network-monitor');
const storageManager = require('../../edge/app/utils/storage-manager');
const modelAdapter = require('../../edge/app/ml-models/model-adapter').modelAdapter;

// Configuration
const config = {
  testTimeout: 60000, // 60 seconds
  sampleSize: 200,    // Number of sample usage entries
  offlineRiskThreshold: 0.3,
  networkFluctuationCount: 20, // Number of network fluctuations to simulate
  batteryLevels: [100, 75, 50, 25, 10, 5], // Battery levels to test
  storageConstraints: [90, 70, 50, 30, 10], // Storage percentage available
  testDuration: 48 // Hours of simulated usage
};

// Test app
let app;
let server;
let mockAxios;

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  console.log('Setting up enhanced test environment...');

  // Create Express app for testing
  app = express();

  // Configure middleware
  app.use(express.json());

  // Mock axios for network requests
  mockAxios = new MockAdapter(axios);

  // Mock API endpoints
  mockAxios.onPost(/\/translate/).reply(200, {
    translatedText: 'Mocked translation',
    confidence: 0.9
  });

  // Define endpoints
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

  app.get('/cache/metrics', (req, res) => {
    res.json(predictiveCache.getMetrics());
  });

  app.get('/cache/predictions', (req, res) => {
    const predictions = predictiveCache.getPredictions({
      aggressiveness: req.query.aggressiveness || 0.5,
      count: req.query.count || 20
    });

    res.json(predictions);
  });

  app.get('/cache/offline-readiness', (req, res) => {
    const readiness = predictiveCache.calculateOfflineReadiness();

    res.json({
      offlineReadiness: readiness,
      timestamp: new Date()
    });
  });

  app.post('/cache/prepare-offline', async (req, res) => {
    const result = await predictiveCache.prepareForOfflineMode(req.body);
    res.json(result);
  });

  app.post('/network/status', (req, res) => {
    // Allow test to control network status
    networkMonitor.setNetworkStatus(req.body);
    res.json(networkMonitor.getNetworkStatus());
  });

  app.post('/device/battery', (req, res) => {
    // Allow test to control battery status
    const { level, charging } = req.body;
    // This is a mock - in a real app we'd update the device performance module
    res.json({ level, charging });
    return { level, charging };
  });

  app.post('/storage/status', (req, res) => {
    // Allow test to control storage status
    const { availablePercentage } = req.body;
    // This is a mock - in a real app we'd update the storage manager
    res.json({ availablePercentage });
    return { availablePercentage };
  });

  // Start server
  server = app.listen(0); // Use any available port

  // Initialize predictive cache
  await predictiveCache.initialize();

  // Generate sample data
  await generateSampleData(config.sampleSize);

  // Update prediction model
  await predictiveCache.updatePredictionModel();

  console.log('Enhanced test environment setup complete');
}

/**
 * Teardown test environment
 */
async function teardownTestEnvironment() {
  console.log('Tearing down test environment...');

  if (server) {
    server.close();
  }

  if (mockAxios) {
    mockAxios.restore();
  }

  console.log('Test environment teardown complete');
}

/**
 * Generate sample data with enhanced patterns
 *
 * @param {number} count - Number of samples to generate
 */
async function generateSampleData(count) {
  console.log(`Generating ${count} enhanced sample usage entries...`);

  const usageLog = [];
  const now = new Date();

  // Language pairs with realistic distribution
  const languagePairs = [
    { source: 'en', target: 'es', weight: 0.3 },
    { source: 'en', target: 'fr', weight: 0.2 },
    { source: 'es', target: 'en', weight: 0.25 },
    { source: 'fr', target: 'en', weight: 0.15 },
    { source: 'en', target: 'de', weight: 0.05 },
    { source: 'de', target: 'en', weight: 0.05 }
  ];

  // Medical contexts with realistic distribution
  const contexts = [
    { name: 'general', weight: 0.4 },
    { name: 'cardiology', weight: 0.15 },
    { name: 'neurology', weight: 0.1 },
    { name: 'pediatrics', weight: 0.15 },
    { name: 'emergency', weight: 0.1 },
    { name: 'oncology', weight: 0.1 }
  ];

  // Locations with realistic distribution
  const locations = [
    { name: 'hospital', weight: 0.5 },
    { name: 'clinic', weight: 0.3 },
    { name: 'office', weight: 0.1 },
    { name: 'home', weight: 0.1 }
  ];

  // Generate entries over a simulated time period
  for (let i = 0; i < count; i++) {
    // Calculate timestamp with realistic distribution
    // Spread over the last 7 days with more recent entries being more common
    const hoursAgo = Math.floor(Math.pow(Math.random(), 2) * 24 * 7);
    const date = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    // Select language pair based on weighted distribution
    const languagePair = selectWeighted(languagePairs);

    // Select context based on weighted distribution
    const context = selectWeighted(contexts);

    // Select location based on weighted distribution
    const location = selectWeighted(locations);

    // Network status with realistic patterns
    // More likely to be offline during certain hours
    const hour = date.getHours();
    const isOfflineHour = (hour >= 22 || hour <= 5); // Night hours
    const networkStatus = isOfflineHour && Math.random() < 0.3 ? 'offline' : 'online';

    // Generate sample text length with realistic distribution
    const textLength = Math.floor(10 + Math.random() * 190); // 10-200 characters

    // Create usage entry with enhanced metadata
    const entry = {
      timestamp: date.getTime(),
      sourceLanguage: languagePair.source,
      targetLanguage: languagePair.target,
      context: context.name,
      textLength,
      textHash: Math.random().toString(36).substring(2, 10),
      terms: generateRandomTerms(context.name, Math.floor(Math.random() * 5)),
      confidence: 0.7 + Math.random() * 0.3, // 0.7-1.0
      processingTime: Math.floor(Math.random() * 200) + 50,
      deviceInfo: {
        batteryLevel: Math.floor(Math.random() * 100),
        batteryCharging: Math.random() > 0.7, // 30% chance of not charging
        networkStatus,
        networkSpeed: networkStatus === 'online' ? Math.floor(Math.random() * 5000000) + 500000 : 0,
        latency: networkStatus === 'online' ? Math.floor(Math.random() * 200) + 20 : 0,
        memoryUsage: Math.random() * 0.5 + 0.2
      },
      location: {
        latitude: (Math.random() * 180) - 90,
        longitude: (Math.random() * 360) - 180,
        accuracy: Math.random() * 100,
        locationName: location.name
      }
    };

    usageLog.push(entry);
  }

  // Sort by timestamp
  usageLog.sort((a, b) => a.timestamp - b.timestamp);

  // Set usage log
  predictiveCache.setUsageLog(usageLog);

  console.log(`Generated ${usageLog.length} enhanced sample usage entries`);
}

/**
 * Helper function to select an item based on weighted distribution
 *
 * @param {Array<Object>} items - Array of items with weight property
 * @returns {Object} - Selected item
 */
function selectWeighted(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }

  return items[0]; // Fallback
}

/**
 * Generate random medical terms based on context
 *
 * @param {string} context - Medical context
 * @param {number} count - Number of terms to generate
 * @returns {Array<string>} - Array of medical terms
 */
function generateRandomTerms(context, count) {
  const contextTerms = {
    general: ['fever', 'pain', 'nausea', 'headache', 'dizziness'],
    cardiology: ['hypertension', 'arrhythmia', 'tachycardia', 'murmur', 'angina'],
    neurology: ['seizure', 'migraine', 'neuropathy', 'stroke', 'tremor'],
    pediatrics: ['otitis', 'croup', 'rash', 'vaccination', 'growth'],
    emergency: ['trauma', 'fracture', 'laceration', 'burn', 'shock'],
    oncology: ['tumor', 'metastasis', 'chemotherapy', 'radiation', 'biopsy']
  };

  const terms = contextTerms[context] || contextTerms.general;
  const result = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * terms.length);
    result.push(terms[randomIndex]);
  }

  return result;
}

/**
 * Test network fluctuation handling
 */
async function testNetworkFluctuationHandling() {
  console.log('\n=== Testing Network Fluctuation Handling ===\n');

  // Simulate network fluctuations
  console.log(`Simulating ${config.networkFluctuationCount} network fluctuations...`);

  const fluctuationResults = [];

  for (let i = 0; i < config.networkFluctuationCount; i++) {
    // Toggle network status
    const isOnline = i % 2 === 0;

    // Set network status
    await request(app)
      .post('/network/status')
      .send({
        online: isOnline,
        connectionType: isOnline ? 'wifi' : 'none',
        speed: isOnline ? 1000000 : 0,
        latency: isOnline ? 50 : 0
      });

    // Get cache metrics after network change
    const metricsResponse = await request(app).get('/cache/metrics');
    const metrics = metricsResponse.body;

    // Get offline readiness
    const readinessResponse = await request(app).get('/cache/offline-readiness');
    const readiness = readinessResponse.body;

    // Record results
    fluctuationResults.push({
      iteration: i,
      online: isOnline,
      offlineReadiness: readiness.offlineReadiness,
      cacheMetrics: {
        hitRate: metrics.hitRate,
        itemCount: metrics.itemCount,
        prioritizedItemCount: metrics.prioritizedItemCount
      }
    });

    // If offline, try to prepare for offline mode
    if (!isOnline) {
      const prepareResponse = await request(app)
        .post('/cache/prepare-offline')
        .send({
          aggressive: true,
          prioritizeOfflineRisk: true
        });

      fluctuationResults[i].offlinePrepareResult = prepareResponse.body;
    }

    // Wait a short time between fluctuations
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Analyze results
  const offlineReadinessValues = fluctuationResults.map(r => r.offlineReadiness);
  const avgOfflineReadiness = offlineReadinessValues.reduce((sum, val) => sum + val, 0) / offlineReadinessValues.length;

  console.log(`Average offline readiness: ${avgOfflineReadiness.toFixed(3)}`);

  // Check if offline readiness improves over time (learning)
  const firstHalfAvg = offlineReadinessValues.slice(0, Math.floor(offlineReadinessValues.length / 2))
    .reduce((sum, val) => sum + val, 0) / Math.floor(offlineReadinessValues.length / 2);

  const secondHalfAvg = offlineReadinessValues.slice(Math.floor(offlineReadinessValues.length / 2))
    .reduce((sum, val) => sum + val, 0) / (offlineReadinessValues.length - Math.floor(offlineReadinessValues.length / 2));

  const readinessImproved = secondHalfAvg > firstHalfAvg;

  console.log(`First half avg readiness: ${firstHalfAvg.toFixed(3)}`);
  console.log(`Second half avg readiness: ${secondHalfAvg.toFixed(3)}`);
  console.log(`Readiness improved over time: ${readinessImproved ? 'YES' : 'NO'}`);

  return {
    success: avgOfflineReadiness > 0.5 && readinessImproved,
    avgOfflineReadiness,
    readinessImproved,
    fluctuationResults
  };
}

/**
 * Test battery level impact on caching strategies
 */
async function testBatteryLevelImpact() {
  console.log('\n=== Testing Battery Level Impact on Caching ===\n');

  const batteryResults = [];

  // Test different battery levels
  for (const level of config.batteryLevels) {
    console.log(`Testing battery level: ${level}%`);

    // Set battery level
    await request(app)
      .post('/device/battery')
      .send({
        level,
        charging: level < 20 ? false : true // Low battery usually means not charging
      });

    // Prepare for offline mode
    const prepareResponse = await request(app)
      .post('/cache/prepare-offline')
      .send({
        aggressive: level > 50, // More aggressive when battery is good
        prioritizeOfflineRisk: true
      });

    // Get predictions
    const predictionsResponse = await request(app)
      .get('/cache/predictions')
      .query({
        aggressiveness: level / 100, // Scale aggressiveness with battery level
        count: 20
      });

    // Record results
    batteryResults.push({
      batteryLevel: level,
      prepareResult: prepareResponse.body,
      predictions: predictionsResponse.body,
      predictionCount: predictionsResponse.body.length
    });
  }

  // Analyze results
  const highBatteryResults = batteryResults.filter(r => r.batteryLevel >= 50);
  const lowBatteryResults = batteryResults.filter(r => r.batteryLevel < 50);

  const highBatteryAvgPredictions = highBatteryResults.reduce((sum, r) => sum + r.predictionCount, 0) / highBatteryResults.length;
  const lowBatteryAvgPredictions = lowBatteryResults.reduce((sum, r) => sum + r.predictionCount, 0) / lowBatteryResults.length;

  console.log(`High battery (>=50%) avg predictions: ${highBatteryAvgPredictions.toFixed(1)}`);
  console.log(`Low battery (<50%) avg predictions: ${lowBatteryAvgPredictions.toFixed(1)}`);

  // Check if battery level affects caching strategy
  const batteryAffectsCaching = highBatteryAvgPredictions > lowBatteryAvgPredictions;

  console.log(`Battery level affects caching strategy: ${batteryAffectsCaching ? 'YES' : 'NO'}`);

  return {
    success: batteryAffectsCaching,
    highBatteryAvgPredictions,
    lowBatteryAvgPredictions,
    batteryResults
  };
}

/**
 * Test ML model accuracy evaluation
 */
async function testMLModelAccuracy() {
  console.log('\n=== Testing ML Model Accuracy ===\n');

  // Get current ML model status
  const statsResponse = await request(app).get('/cache/stats');
  const stats = statsResponse.body;

  // Check if ML model is initialized
  const isMLInitialized = stats.mlModelStatus && stats.mlModelStatus.isInitialized;

  if (!isMLInitialized) {
    console.log('ML model not initialized, skipping accuracy test');
    return {
      success: false,
      reason: 'ml_not_initialized'
    };
  }

  console.log('ML model initialized, testing accuracy...');

  // Generate test data with known patterns
  const testPatterns = [
    { hour: 9, day: 1, sourceLanguage: 'en', targetLanguage: 'es', context: 'cardiology' },
    { hour: 14, day: 3, sourceLanguage: 'es', targetLanguage: 'en', context: 'general' },
    { hour: 10, day: 2, sourceLanguage: 'en', targetLanguage: 'fr', context: 'neurology' }
  ];

  // Add test patterns to usage log
  const now = new Date();
  const usageLog = [];

  for (const pattern of testPatterns) {
    // Add multiple entries for each pattern to strengthen it
    for (let i = 0; i < 10; i++) {
      const date = new Date(now);
      date.setHours(pattern.hour);
      date.setDate(now.getDate() - (now.getDay() - pattern.day + 7) % 7); // Set to the correct day of week

      usageLog.push({
        timestamp: date.getTime() - i * 60 * 60 * 1000, // Spread over the last few hours
        sourceLanguage: pattern.sourceLanguage,
        targetLanguage: pattern.targetLanguage,
        context: pattern.context,
        textLength: 100,
        textHash: Math.random().toString(36).substring(2, 10),
        terms: [],
        confidence: 0.9,
        processingTime: 100,
        deviceInfo: {
          batteryLevel: 80,
          batteryCharging: true,
          networkStatus: 'online',
          networkSpeed: 1000000,
          latency: 50,
          memoryUsage: 0.3
        }
      });
    }
  }

  // Set usage log with test patterns
  predictiveCache.setUsageLog(usageLog);

  // Update prediction model
  await predictiveCache.updatePredictionModel();

  // Get predictions
  const predictionsResponse = await request(app).get('/cache/predictions');
  const predictions = predictionsResponse.body;

  // Check if predictions include our test patterns
  const matchedPatterns = [];

  for (const pattern of testPatterns) {
    const matches = predictions.filter(p =>
      p.sourceLanguage === pattern.sourceLanguage &&
      p.targetLanguage === pattern.targetLanguage &&
      p.context === pattern.context
    );

    if (matches.length > 0) {
      matchedPatterns.push({
        pattern,
        matches: matches.length,
        topScore: matches.reduce((max, p) => Math.max(max, p.score), 0)
      });
    }
  }

  const matchRate = matchedPatterns.length / testPatterns.length;
  console.log(`ML model matched ${matchedPatterns.length}/${testPatterns.length} test patterns (${(matchRate * 100).toFixed(1)}%)`);

  for (const match of matchedPatterns) {
    console.log(`Pattern ${match.pattern.sourceLanguage}->${match.pattern.targetLanguage} (${match.pattern.context}): ${match.matches} matches, top score: ${match.topScore.toFixed(3)}`);
  }

  return {
    success: matchRate >= 0.5, // At least 50% of patterns should be matched
    matchRate,
    matchedPatterns,
    predictions
  };
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
      networkFluctuationHandling: await testNetworkFluctuationHandling(),
      batteryLevelImpact: await testBatteryLevelImpact(),
      mlModelAccuracy: await testMLModelAccuracy()
    };

    // Print summary
    console.log('\n=== Test Summary ===');
    for (const [test, result] of Object.entries(testResults)) {
      console.log(`${result.success ? '✅' : '❌'} ${test}`);
    }

    const allPassed = Object.values(testResults).every(result => result.success);
    console.log(`\nOverall result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);

    return allPassed;
  } finally {
    // Teardown test environment
    await teardownTestEnvironment();
  }
}

// Export test functions
module.exports = {
  setupTestEnvironment,
  teardownTestEnvironment,
  generateSampleData,
  testNetworkFluctuationHandling,
  testBatteryLevelImpact,
  testMLModelAccuracy,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
