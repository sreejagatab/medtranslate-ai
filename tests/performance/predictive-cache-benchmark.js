/**
 * Performance Benchmark for Predictive Caching System
 * 
 * This benchmark tests the performance of the predictive caching system
 * under various scenarios and loads.
 */

const { runBenchmark } = require('./benchmark-framework');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3006',
  authToken: process.env.AUTH_TOKEN,
  testDataPath: path.join(__dirname, '../test-data/predictive-cache-benchmark-data.json'),
  scenariosPath: path.join(__dirname, '../test-data/predictive-cache-scenarios.json')
};

// Load test data or create if it doesn't exist
let testData;
if (fs.existsSync(config.testDataPath)) {
  testData = JSON.parse(fs.readFileSync(config.testDataPath, 'utf8'));
} else {
  // Create sample test data
  testData = {
    commonPhrases: [
      { text: "How are you feeling today?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "Where does it hurt?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "Have you taken any medication?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "Do you have any allergies?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "I need to check your blood pressure.", sourceLanguage: "en", targetLanguage: "es" }
    ],
    specialtyPhrases: {
      cardiology: [
        { text: "Have you experienced chest pain?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Do you have a history of heart disease?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Are you taking any blood thinners?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Have you had any palpitations?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Do you get short of breath with exertion?", sourceLanguage: "en", targetLanguage: "es" }
      ],
      neurology: [
        { text: "Have you had any headaches?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Have you experienced any numbness or tingling?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Have you had any seizures?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Do you have a history of stroke?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Have you had any memory problems?", sourceLanguage: "en", targetLanguage: "es" }
      ],
      pediatrics: [
        { text: "How is your child sleeping?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Is your child eating well?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Has your child had any fevers?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Is your child up to date on vaccinations?", sourceLanguage: "en", targetLanguage: "es" },
        { text: "Has your child had any ear infections?", sourceLanguage: "en", targetLanguage: "es" }
      ]
    },
    languagePairs: [
      { sourceLanguage: "en", targetLanguage: "es" },
      { sourceLanguage: "en", targetLanguage: "fr" },
      { sourceLanguage: "en", targetLanguage: "de" },
      { sourceLanguage: "en", targetLanguage: "zh" },
      { sourceLanguage: "es", targetLanguage: "en" }
    ]
  };
  
  // Save test data
  fs.mkdirSync(path.dirname(config.testDataPath), { recursive: true });
  fs.writeFileSync(config.testDataPath, JSON.stringify(testData, null, 2));
}

// Load scenarios or create if they don't exist
let scenarios;
if (fs.existsSync(config.scenariosPath)) {
  scenarios = JSON.parse(fs.readFileSync(config.scenariosPath, 'utf8'));
} else {
  // Create sample scenarios
  scenarios = {
    coldCache: {
      description: "Testing with an empty cache",
      setup: "clearCache",
      iterations: 20,
      concurrency: 1
    },
    warmCache: {
      description: "Testing with a pre-warmed cache",
      setup: "warmCache",
      iterations: 20,
      concurrency: 1
    },
    predictiveAccuracy: {
      description: "Testing predictive accuracy with specialty-specific phrases",
      setup: "trainPredictiveModel",
      iterations: 30,
      concurrency: 1
    },
    highConcurrency: {
      description: "Testing with high concurrency",
      setup: "warmCache",
      iterations: 50,
      concurrency: 10
    },
    multiLanguage: {
      description: "Testing with multiple language pairs",
      setup: "warmCache",
      iterations: 25,
      concurrency: 1,
      useMultipleLanguages: true
    },
    offlineMode: {
      description: "Testing in offline mode",
      setup: "warmCache",
      iterations: 20,
      concurrency: 1,
      offlineMode: true
    }
  };
  
  // Save scenarios
  fs.mkdirSync(path.dirname(config.scenariosPath), { recursive: true });
  fs.writeFileSync(config.scenariosPath, JSON.stringify(scenarios, null, 2));
}

/**
 * Get authentication token
 * 
 * @returns {Promise<string>} - Authentication token
 */
async function getAuthToken() {
  if (config.authToken) {
    return config.authToken;
  }
  
  try {
    const response = await axios.post(`${config.edgeUrl}/api/auth/login`, {
      email: 'test.provider@example.com',
      password: 'TestPassword123!'
    });
    
    return response.data.token;
  } catch (error) {
    console.error('Error getting auth token:', error.message);
    throw error;
  }
}

/**
 * Clear the cache
 * 
 * @returns {Promise<void>}
 */
async function clearCache() {
  const token = await getAuthToken();
  
  try {
    await axios.post(
      `${config.edgeUrl}/api/edge/cache/clear`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error.message);
    throw error;
  }
}

/**
 * Warm up the cache
 * 
 * @returns {Promise<void>}
 */
async function warmCache() {
  const token = await getAuthToken();
  
  try {
    // Warm up with common phrases
    for (const phrase of testData.commonPhrases) {
      await axios.post(
        `${config.edgeUrl}/api/edge/translate`,
        {
          text: phrase.text,
          sourceLanguage: phrase.sourceLanguage,
          targetLanguage: phrase.targetLanguage,
          medicalContext: 'general'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
    }
    
    console.log('Cache warmed up successfully');
  } catch (error) {
    console.error('Error warming up cache:', error.message);
    throw error;
  }
}

/**
 * Train predictive model
 * 
 * @returns {Promise<void>}
 */
async function trainPredictiveModel() {
  const token = await getAuthToken();
  
  try {
    // Train with specialty-specific phrases
    for (const [specialty, phrases] of Object.entries(testData.specialtyPhrases)) {
      for (const phrase of phrases) {
        await axios.post(
          `${config.edgeUrl}/api/edge/translate`,
          {
            text: phrase.text,
            sourceLanguage: phrase.sourceLanguage,
            targetLanguage: phrase.targetLanguage,
            medicalContext: specialty
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
      }
    }
    
    // Trigger model training
    await axios.post(
      `${config.edgeUrl}/api/edge/predictive-cache/train`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Predictive model trained successfully');
  } catch (error) {
    console.error('Error training predictive model:', error.message);
    throw error;
  }
}

/**
 * Run cache benchmark
 * 
 * @param {string} name - Benchmark name
 * @param {Object} scenario - Benchmark scenario
 * @returns {Promise<Object>} - Benchmark results
 */
async function runCacheBenchmark(name, scenario) {
  // Get auth token
  const token = await getAuthToken();
  
  // Set up scenario
  console.log(`Setting up scenario: ${scenario.setup}`);
  
  switch (scenario.setup) {
    case 'clearCache':
      await clearCache();
      break;
    case 'warmCache':
      await clearCache();
      await warmCache();
      break;
    case 'trainPredictiveModel':
      await clearCache();
      await trainPredictiveModel();
      break;
    default:
      console.log('No setup required');
  }
  
  // Define test function
  const testFn = async () => {
    let phrase;
    let languagePair;
    
    if (scenario.useMultipleLanguages) {
      // Use random language pair
      languagePair = testData.languagePairs[Math.floor(Math.random() * testData.languagePairs.length)];
      
      // Find a phrase with matching source language
      const matchingPhrases = testData.commonPhrases.filter(p => p.sourceLanguage === languagePair.sourceLanguage);
      phrase = matchingPhrases.length > 0
        ? matchingPhrases[Math.floor(Math.random() * matchingPhrases.length)]
        : testData.commonPhrases[0];
      
      // Override target language
      phrase = {
        ...phrase,
        targetLanguage: languagePair.targetLanguage
      };
    } else if (scenario.setup === 'trainPredictiveModel') {
      // Use specialty-specific phrases
      const specialties = Object.keys(testData.specialtyPhrases);
      const specialty = specialties[Math.floor(Math.random() * specialties.length)];
      const specialtyPhrases = testData.specialtyPhrases[specialty];
      phrase = specialtyPhrases[Math.floor(Math.random() * specialtyPhrases.length)];
    } else {
      // Use common phrases
      phrase = testData.commonPhrases[Math.floor(Math.random() * testData.commonPhrases.length)];
    }
    
    try {
      const response = await axios.post(
        `${config.edgeUrl}/api/edge/translate`,
        {
          text: phrase.text,
          sourceLanguage: phrase.sourceLanguage,
          targetLanguage: phrase.targetLanguage,
          medicalContext: scenario.setup === 'trainPredictiveModel' ? 'specialty' : 'general',
          offlineMode: scenario.offlineMode || false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return {
        ...response.data,
        cacheHit: response.data.cacheHit || false
      };
    } catch (error) {
      console.error(`Translation error: ${error.message}`);
      throw error;
    }
  };
  
  // Run benchmark
  return await runBenchmark(name, testFn, {
    warmupIterations: 2,
    iterations: scenario.iterations || 20,
    concurrency: scenario.concurrency || 1,
    saveResults: true
  });
}

/**
 * Run all cache benchmarks
 */
async function runAllCacheBenchmarks() {
  try {
    console.log('Running predictive cache benchmarks...');
    
    for (const [name, scenario] of Object.entries(scenarios)) {
      console.log(`\nRunning benchmark: ${name}`);
      console.log(`Description: ${scenario.description}`);
      
      await runCacheBenchmark(name, scenario);
    }
    
    console.log('\nAll cache benchmarks completed successfully');
  } catch (error) {
    console.error('Error running cache benchmarks:', error);
  }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runAllCacheBenchmarks();
}

module.exports = {
  runCacheBenchmark,
  runAllCacheBenchmarks,
  clearCache,
  warmCache,
  trainPredictiveModel
};
