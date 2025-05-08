/**
 * Edge Device Performance Test
 *
 * This test measures the performance of the edge device under various loads,
 * including translation speed, memory usage, battery consumption, and network bandwidth.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3003',
  testTimeout: 60000, // 60 seconds
  concurrentTranslations: process.env.CONCURRENT_TRANSLATIONS ? parseInt(process.env.CONCURRENT_TRANSLATIONS) : 5,
  translationIterations: process.env.TRANSLATION_ITERATIONS ? parseInt(process.env.TRANSLATION_ITERATIONS) : 10,
  testAudioPath: path.join(__dirname, '../test-data/test-audio.mp3')
};

// Mock translation data
const mockTextTranslations = [
  { text: 'Hello, how are you feeling today?', sourceLanguage: 'en', targetLanguage: 'es', context: 'general' },
  { text: 'I have a headache', sourceLanguage: 'en', targetLanguage: 'es', context: 'medical' },
  { text: 'I have a fever', sourceLanguage: 'en', targetLanguage: 'es', context: 'medical' },
  { text: 'My throat hurts', sourceLanguage: 'en', targetLanguage: 'es', context: 'medical' },
  { text: 'I feel dizzy', sourceLanguage: 'en', targetLanguage: 'es', context: 'medical' },
  { text: 'Take this medication twice a day', sourceLanguage: 'en', targetLanguage: 'es', context: 'medical' },
  { text: 'You need to rest for a few days', sourceLanguage: 'en', targetLanguage: 'es', context: 'medical' },
  { text: 'Do you have any allergies?', sourceLanguage: 'en', targetLanguage: 'es', context: 'medical' },
  { text: 'When did the symptoms start?', sourceLanguage: 'en', targetLanguage: 'es', context: 'medical' },
  { text: 'I will need to run some tests', sourceLanguage: 'en', targetLanguage: 'es', context: 'medical' }
];

// Helper function to measure response time
async function measureResponseTime(apiCall) {
  const start = performance.now();
  try {
    const response = await apiCall();
    const end = performance.now();
    return {
      success: true,
      responseTime: end - start,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    const end = performance.now();
    return {
      success: false,
      responseTime: end - start,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Test text translation speed
async function testTextTranslationSpeed() {
  console.log('\n=== Testing Text Translation Speed ===');
  
  const results = {
    totalTranslations: 0,
    successfulTranslations: 0,
    failedTranslations: 0,
    averageTranslationTime: 0,
    translationTimes: [],
    byLanguagePair: {},
    byTextLength: {}
  };
  
  // Perform translations sequentially
  console.log('Performing sequential translations...');
  
  for (let i = 0; i < config.translationIterations; i++) {
    for (const translation of mockTextTranslations) {
      results.totalTranslations++;
      
      const result = await measureResponseTime(() => {
        return axios.post(`${config.edgeUrl}/api/translate`, translation);
      });
      
      const langPair = `${translation.sourceLanguage}-${translation.targetLanguage}`;
      const textLength = translation.text.length;
      const textLengthCategory = textLength < 10 ? 'short' : textLength < 50 ? 'medium' : 'long';
      
      // Initialize language pair stats if not exists
      if (!results.byLanguagePair[langPair]) {
        results.byLanguagePair[langPair] = {
          count: 0,
          totalTime: 0,
          averageTime: 0
        };
      }
      
      // Initialize text length category stats if not exists
      if (!results.byTextLength[textLengthCategory]) {
        results.byTextLength[textLengthCategory] = {
          count: 0,
          totalTime: 0,
          averageTime: 0
        };
      }
      
      if (result.success) {
        results.successfulTranslations++;
        results.translationTimes.push(result.responseTime);
        
        // Update language pair stats
        results.byLanguagePair[langPair].count++;
        results.byLanguagePair[langPair].totalTime += result.responseTime;
        
        // Update text length category stats
        results.byTextLength[textLengthCategory].count++;
        results.byTextLength[textLengthCategory].totalTime += result.responseTime;
      } else {
        results.failedTranslations++;
        console.error(`  Translation failed: ${result.error}`);
      }
    }
  }
  
  // Calculate average translation time
  if (results.translationTimes.length > 0) {
    results.averageTranslationTime = results.translationTimes.reduce((sum, time) => sum + time, 0) / results.translationTimes.length;
  }
  
  // Calculate averages for language pairs
  for (const langPair in results.byLanguagePair) {
    if (results.byLanguagePair[langPair].count > 0) {
      results.byLanguagePair[langPair].averageTime = results.byLanguagePair[langPair].totalTime / results.byLanguagePair[langPair].count;
    }
  }
  
  // Calculate averages for text length categories
  for (const category in results.byTextLength) {
    if (results.byTextLength[category].count > 0) {
      results.byTextLength[category].averageTime = results.byTextLength[category].totalTime / results.byTextLength[category].count;
    }
  }
  
  console.log(`  Total translations: ${results.totalTranslations}`);
  console.log(`  Successful translations: ${results.successfulTranslations}`);
  console.log(`  Failed translations: ${results.failedTranslations}`);
  console.log(`  Average translation time: ${results.averageTranslationTime.toFixed(2)} ms`);
  
  console.log('\n  By Language Pair:');
  for (const langPair in results.byLanguagePair) {
    console.log(`    ${langPair}: ${results.byLanguagePair[langPair].averageTime.toFixed(2)} ms avg (${results.byLanguagePair[langPair].count} translations)`);
  }
  
  console.log('\n  By Text Length:');
  for (const category in results.byTextLength) {
    console.log(`    ${category}: ${results.byTextLength[category].averageTime.toFixed(2)} ms avg (${results.byTextLength[category].count} translations)`);
  }
  
  // Perform concurrent translations
  console.log('\nPerforming concurrent translations...');
  
  const concurrentResults = {
    totalTranslations: 0,
    successfulTranslations: 0,
    failedTranslations: 0,
    averageTranslationTime: 0,
    translationTimes: []
  };
  
  for (let i = 0; i < config.translationIterations; i++) {
    const translationPromises = [];
    
    for (let j = 0; j < config.concurrentTranslations; j++) {
      const translation = mockTextTranslations[j % mockTextTranslations.length];
      concurrentResults.totalTranslations++;
      
      translationPromises.push(
        measureResponseTime(() => {
          return axios.post(`${config.edgeUrl}/api/translate`, translation);
        })
      );
    }
    
    const results = await Promise.all(translationPromises);
    
    for (const result of results) {
      if (result.success) {
        concurrentResults.successfulTranslations++;
        concurrentResults.translationTimes.push(result.responseTime);
      } else {
        concurrentResults.failedTranslations++;
      }
    }
  }
  
  // Calculate average concurrent translation time
  if (concurrentResults.translationTimes.length > 0) {
    concurrentResults.averageTranslationTime = concurrentResults.translationTimes.reduce((sum, time) => sum + time, 0) / concurrentResults.translationTimes.length;
  }
  
  console.log(`  Total concurrent translations: ${concurrentResults.totalTranslations}`);
  console.log(`  Successful concurrent translations: ${concurrentResults.successfulTranslations}`);
  console.log(`  Failed concurrent translations: ${concurrentResults.failedTranslations}`);
  console.log(`  Average concurrent translation time: ${concurrentResults.averageTranslationTime.toFixed(2)} ms`);
  
  return {
    sequential: results,
    concurrent: concurrentResults
  };
}

// Test audio translation speed
async function testAudioTranslationSpeed() {
  console.log('\n=== Testing Audio Translation Speed ===');
  
  // Check if test audio file exists
  if (!fs.existsSync(config.testAudioPath)) {
    console.error(`  Test audio file not found: ${config.testAudioPath}`);
    return {
      success: false,
      error: 'Test audio file not found'
    };
  }
  
  const results = {
    totalTranslations: 0,
    successfulTranslations: 0,
    failedTranslations: 0,
    averageTranslationTime: 0,
    translationTimes: []
  };
  
  // Read audio file
  const audioData = fs.readFileSync(config.testAudioPath);
  const audioBase64 = audioData.toString('base64');
  
  // Perform audio translations
  console.log('Performing audio translations...');
  
  for (let i = 0; i < 5; i++) { // Fewer iterations for audio as it's more resource-intensive
    results.totalTranslations++;
    
    const result = await measureResponseTime(() => {
      return axios.post(`${config.edgeUrl}/api/translate/audio`, {
        audioData: audioBase64,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'medical'
      });
    });
    
    if (result.success) {
      results.successfulTranslations++;
      results.translationTimes.push(result.responseTime);
    } else {
      results.failedTranslations++;
      console.error(`  Audio translation failed: ${result.error}`);
    }
  }
  
  // Calculate average translation time
  if (results.translationTimes.length > 0) {
    results.averageTranslationTime = results.translationTimes.reduce((sum, time) => sum + time, 0) / results.translationTimes.length;
  }
  
  console.log(`  Total audio translations: ${results.totalTranslations}`);
  console.log(`  Successful audio translations: ${results.successfulTranslations}`);
  console.log(`  Failed audio translations: ${results.failedTranslations}`);
  console.log(`  Average audio translation time: ${results.averageTranslationTime.toFixed(2)} ms`);
  
  return results;
}

// Test memory usage
async function testMemoryUsage() {
  console.log('\n=== Testing Memory Usage ===');
  
  // Get initial memory usage
  const initialResponse = await axios.get(`${config.edgeUrl}/api/diagnostics/memory`);
  const initialMemory = initialResponse.data;
  
  console.log('Initial memory usage:');
  console.log(`  Total: ${initialMemory.total} MB`);
  console.log(`  Used: ${initialMemory.used} MB (${initialMemory.usedPercentage}%)`);
  console.log(`  Free: ${initialMemory.free} MB`);
  
  // Perform intensive operations to measure memory impact
  console.log('\nPerforming intensive operations...');
  
  // Load multiple models
  await axios.post(`${config.edgeUrl}/api/models/load`, {
    languages: ['en-es', 'en-fr', 'es-en', 'fr-en']
  });
  
  // Perform multiple translations concurrently
  const translationPromises = [];
  for (let i = 0; i < 20; i++) {
    const translation = mockTextTranslations[i % mockTextTranslations.length];
    translationPromises.push(
      axios.post(`${config.edgeUrl}/api/translate`, translation)
    );
  }
  
  await Promise.all(translationPromises);
  
  // Get memory usage after intensive operations
  const afterResponse = await axios.get(`${config.edgeUrl}/api/diagnostics/memory`);
  const afterMemory = afterResponse.data;
  
  console.log('Memory usage after intensive operations:');
  console.log(`  Total: ${afterMemory.total} MB`);
  console.log(`  Used: ${afterMemory.used} MB (${afterMemory.usedPercentage}%)`);
  console.log(`  Free: ${afterMemory.free} MB`);
  
  // Calculate memory impact
  const memoryImpact = afterMemory.used - initialMemory.used;
  const memoryImpactPercentage = ((memoryImpact / initialMemory.total) * 100).toFixed(2);
  
  console.log(`\nMemory impact: ${memoryImpact} MB (${memoryImpactPercentage}% of total)`);
  
  return {
    initial: initialMemory,
    after: afterMemory,
    impact: memoryImpact,
    impactPercentage: memoryImpactPercentage
  };
}

// Test battery consumption
async function testBatteryConsumption() {
  console.log('\n=== Testing Battery Consumption ===');
  
  // Get initial battery status
  const initialResponse = await axios.get(`${config.edgeUrl}/api/diagnostics/battery`);
  const initialBattery = initialResponse.data;
  
  if (!initialBattery.available) {
    console.log('Battery monitoring not available on this device');
    return {
      available: false
    };
  }
  
  console.log('Initial battery status:');
  console.log(`  Level: ${initialBattery.level}%`);
  console.log(`  Charging: ${initialBattery.charging}`);
  console.log(`  Time remaining: ${initialBattery.timeRemaining} minutes`);
  
  // Perform intensive operations to measure battery impact
  console.log('\nPerforming intensive operations for battery test...');
  
  // Perform multiple translations and model loads
  for (let i = 0; i < 5; i++) {
    // Load models
    await axios.post(`${config.edgeUrl}/api/models/load`, {
      languages: ['en-es', 'en-fr', 'es-en', 'fr-en']
    });
    
    // Perform translations
    for (const translation of mockTextTranslations) {
      await axios.post(`${config.edgeUrl}/api/translate`, translation);
    }
    
    // Wait a bit between iterations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Get battery status after intensive operations
  const afterResponse = await axios.get(`${config.edgeUrl}/api/diagnostics/battery`);
  const afterBattery = afterResponse.data;
  
  console.log('Battery status after intensive operations:');
  console.log(`  Level: ${afterBattery.level}%`);
  console.log(`  Charging: ${afterBattery.charging}`);
  console.log(`  Time remaining: ${afterBattery.timeRemaining} minutes`);
  
  // Calculate battery impact
  const batteryImpact = initialBattery.level - afterBattery.level;
  
  console.log(`\nBattery impact: ${batteryImpact}% decrease`);
  
  return {
    available: true,
    initial: initialBattery,
    after: afterBattery,
    impact: batteryImpact
  };
}

// Test network bandwidth
async function testNetworkBandwidth() {
  console.log('\n=== Testing Network Bandwidth ===');
  
  // Get initial network stats
  const initialResponse = await axios.get(`${config.edgeUrl}/api/diagnostics/network`);
  const initialNetwork = initialResponse.data;
  
  console.log('Initial network stats:');
  console.log(`  Type: ${initialNetwork.type}`);
  console.log(`  Bytes sent: ${initialNetwork.bytesSent}`);
  console.log(`  Bytes received: ${initialNetwork.bytesReceived}`);
  
  // Perform network-intensive operations
  console.log('\nPerforming network-intensive operations...');
  
  // Sync with backend
  await axios.post(`${config.edgeUrl}/api/sync/force`);
  
  // Download model updates
  await axios.post(`${config.edgeUrl}/api/models/update`);
  
  // Get network stats after intensive operations
  const afterResponse = await axios.get(`${config.edgeUrl}/api/diagnostics/network`);
  const afterNetwork = afterResponse.data;
  
  console.log('Network stats after intensive operations:');
  console.log(`  Type: ${afterNetwork.type}`);
  console.log(`  Bytes sent: ${afterNetwork.bytesSent}`);
  console.log(`  Bytes received: ${afterNetwork.bytesReceived}`);
  
  // Calculate network impact
  const bytesSentImpact = afterNetwork.bytesSent - initialNetwork.bytesSent;
  const bytesReceivedImpact = afterNetwork.bytesReceived - initialNetwork.bytesReceived;
  
  console.log(`\nNetwork impact:`);
  console.log(`  Bytes sent: ${bytesSentImpact} (${(bytesSentImpact / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  Bytes received: ${bytesReceivedImpact} (${(bytesReceivedImpact / 1024 / 1024).toFixed(2)} MB)`);
  
  return {
    initial: initialNetwork,
    after: afterNetwork,
    sentImpact: bytesSentImpact,
    receivedImpact: bytesReceivedImpact
  };
}

// Run all tests
async function runTests() {
  console.log('Starting Edge Device Performance Test...');
  
  try {
    // Run tests in sequence
    const textTranslationResults = await testTextTranslationSpeed();
    const audioTranslationResults = await testAudioTranslationSpeed();
    const memoryUsageResults = await testMemoryUsage();
    const batteryConsumptionResults = await testBatteryConsumption();
    const networkBandwidthResults = await testNetworkBandwidth();
    
    // Compile all results
    const allResults = {
      textTranslation: textTranslationResults,
      audioTranslation: audioTranslationResults,
      memoryUsage: memoryUsageResults,
      batteryConsumption: batteryConsumptionResults,
      networkBandwidth: networkBandwidthResults
    };
    
    // Print summary
    console.log('\n=== Edge Device Performance Test Summary ===');
    
    console.log('\nText Translation Speed:');
    console.log(`  Sequential: ${textTranslationResults.sequential.averageTranslationTime.toFixed(2)} ms avg (${textTranslationResults.sequential.successfulTranslations} translations)`);
    console.log(`  Concurrent: ${textTranslationResults.concurrent.averageTranslationTime.toFixed(2)} ms avg (${textTranslationResults.concurrent.successfulTranslations} translations)`);
    
    console.log('\nAudio Translation Speed:');
    console.log(`  Average: ${audioTranslationResults.averageTranslationTime.toFixed(2)} ms (${audioTranslationResults.successfulTranslations} translations)`);
    
    console.log('\nMemory Usage:');
    console.log(`  Impact: ${memoryUsageResults.impact} MB (${memoryUsageResults.impactPercentage}% of total)`);
    
    if (batteryConsumptionResults.available) {
      console.log('\nBattery Consumption:');
      console.log(`  Impact: ${batteryConsumptionResults.impact}% decrease`);
    }
    
    console.log('\nNetwork Bandwidth:');
    console.log(`  Sent: ${(networkBandwidthResults.sentImpact / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Received: ${(networkBandwidthResults.receivedImpact / 1024 / 1024).toFixed(2)} MB`);
    
    return allResults;
  } catch (error) {
    console.error('Error running tests:', error.message);
    return { error: error.message };
  }
}

// Export for Jest
module.exports = {
  testTextTranslationSpeed,
  testAudioTranslationSpeed,
  testMemoryUsage,
  testBatteryConsumption,
  testNetworkBandwidth,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
