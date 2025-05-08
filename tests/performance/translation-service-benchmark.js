/**
 * Performance Benchmark for Translation Service
 * 
 * This benchmark tests the performance of the translation service under various loads.
 */

const { runBenchmark } = require('./benchmark-framework');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  apiUrl: process.env.API_URL || 'http://localhost:3005',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3006',
  authToken: process.env.AUTH_TOKEN,
  testDataPath: path.join(__dirname, '../test-data/translation-benchmark-data.json')
};

// Load test data or create if it doesn't exist
let testData;
if (fs.existsSync(config.testDataPath)) {
  testData = JSON.parse(fs.readFileSync(config.testDataPath, 'utf8'));
} else {
  // Create sample test data
  testData = {
    shortTexts: [
      { text: "How are you feeling today?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "Where does it hurt?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "Have you taken any medication?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "Do you have any allergies?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "I need to check your blood pressure.", sourceLanguage: "en", targetLanguage: "es" }
    ],
    mediumTexts: [
      { 
        text: "Your blood pressure is slightly elevated. I recommend monitoring it regularly and reducing salt intake. We should also discuss lifestyle changes that might help.",
        sourceLanguage: "en", 
        targetLanguage: "es" 
      },
      { 
        text: "Based on your symptoms, you might have a respiratory infection. I'll prescribe antibiotics and recommend rest and plenty of fluids.",
        sourceLanguage: "en", 
        targetLanguage: "es" 
      },
      { 
        text: "Your lab results show elevated cholesterol levels. We should discuss dietary changes and possibly medication to address this issue.",
        sourceLanguage: "en", 
        targetLanguage: "es" 
      }
    ],
    longTexts: [
      { 
        text: "Your comprehensive blood panel shows several areas of concern. Your cholesterol is elevated, with LDL at 160 mg/dL, which is above the recommended range. Your blood glucose is also slightly high at 110 mg/dL, suggesting prediabetic tendencies. Additionally, your liver enzymes show mild elevation, which could indicate early liver stress. I recommend dietary modifications, increased physical activity, and a follow-up test in three months. We should also consider a referral to a nutritionist to help manage these issues through lifestyle changes before considering medication.",
        sourceLanguage: "en", 
        targetLanguage: "es" 
      }
    ],
    medicalTerminology: [
      { text: "myocardial infarction", sourceLanguage: "en", targetLanguage: "es" },
      { text: "cerebrovascular accident", sourceLanguage: "en", targetLanguage: "es" },
      { text: "hypertension", sourceLanguage: "en", targetLanguage: "es" },
      { text: "type 2 diabetes mellitus", sourceLanguage: "en", targetLanguage: "es" },
      { text: "chronic obstructive pulmonary disease", sourceLanguage: "en", targetLanguage: "es" }
    ],
    multiLanguage: [
      { text: "How are you feeling today?", sourceLanguage: "en", targetLanguage: "fr" },
      { text: "How are you feeling today?", sourceLanguage: "en", targetLanguage: "de" },
      { text: "How are you feeling today?", sourceLanguage: "en", targetLanguage: "it" },
      { text: "How are you feeling today?", sourceLanguage: "en", targetLanguage: "pt" },
      { text: "How are you feeling today?", sourceLanguage: "en", targetLanguage: "zh" }
    ]
  };
  
  // Save test data
  fs.mkdirSync(path.dirname(config.testDataPath), { recursive: true });
  fs.writeFileSync(config.testDataPath, JSON.stringify(testData, null, 2));
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
    const response = await axios.post(`${config.apiUrl}/api/auth/login`, {
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
 * Run translation benchmark
 * 
 * @param {string} name - Benchmark name
 * @param {Array<Object>} texts - Array of texts to translate
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark results
 */
async function runTranslationBenchmark(name, texts, options = {}) {
  // Get auth token
  const token = await getAuthToken();
  
  // Define test function
  const testFn = async () => {
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    
    try {
      const response = await axios.post(
        `${config.apiUrl}/api/translation/translate`,
        {
          text: randomText.text,
          sourceLanguage: randomText.sourceLanguage,
          targetLanguage: randomText.targetLanguage,
          medicalContext: options.medicalContext || 'general'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Translation error: ${error.message}`);
      throw error;
    }
  };
  
  // Run benchmark
  return await runBenchmark(name, testFn, {
    warmupIterations: options.warmupIterations || 2,
    iterations: options.iterations || 20,
    concurrency: options.concurrency || 1,
    saveResults: true
  });
}

/**
 * Run edge translation benchmark
 * 
 * @param {string} name - Benchmark name
 * @param {Array<Object>} texts - Array of texts to translate
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark results
 */
async function runEdgeTranslationBenchmark(name, texts, options = {}) {
  // Get auth token
  const token = await getAuthToken();
  
  // Define test function
  const testFn = async () => {
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    
    try {
      const response = await axios.post(
        `${config.edgeUrl}/api/edge/translate`,
        {
          text: randomText.text,
          sourceLanguage: randomText.sourceLanguage,
          targetLanguage: randomText.targetLanguage,
          medicalContext: options.medicalContext || 'general',
          offlineMode: options.offlineMode || false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Edge translation error: ${error.message}`);
      throw error;
    }
  };
  
  // Run benchmark
  return await runBenchmark(name, testFn, {
    warmupIterations: options.warmupIterations || 2,
    iterations: options.iterations || 20,
    concurrency: options.concurrency || 1,
    saveResults: true
  });
}

/**
 * Run all benchmarks
 */
async function runAllBenchmarks() {
  try {
    console.log('Running translation service benchmarks...');
    
    // Backend translation benchmarks
    await runTranslationBenchmark('Short Text Translation', testData.shortTexts, {
      iterations: 50,
      concurrency: 1
    });
    
    await runTranslationBenchmark('Medium Text Translation', testData.mediumTexts, {
      iterations: 30,
      concurrency: 1
    });
    
    await runTranslationBenchmark('Long Text Translation', testData.longTexts, {
      iterations: 10,
      concurrency: 1
    });
    
    await runTranslationBenchmark('Medical Terminology Translation', testData.medicalTerminology, {
      iterations: 30,
      concurrency: 1,
      medicalContext: 'medical'
    });
    
    await runTranslationBenchmark('Multi-Language Translation', testData.multiLanguage, {
      iterations: 25,
      concurrency: 1
    });
    
    await runTranslationBenchmark('Concurrent Translation (5)', testData.shortTexts, {
      iterations: 50,
      concurrency: 5
    });
    
    await runTranslationBenchmark('Concurrent Translation (10)', testData.shortTexts, {
      iterations: 100,
      concurrency: 10
    });
    
    // Edge translation benchmarks
    await runEdgeTranslationBenchmark('Edge Translation - Online', testData.shortTexts, {
      iterations: 30,
      concurrency: 1,
      offlineMode: false
    });
    
    await runEdgeTranslationBenchmark('Edge Translation - Offline', testData.shortTexts, {
      iterations: 30,
      concurrency: 1,
      offlineMode: true
    });
    
    console.log('All benchmarks completed successfully');
  } catch (error) {
    console.error('Error running benchmarks:', error);
  }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runAllBenchmarks();
}

module.exports = {
  runTranslationBenchmark,
  runEdgeTranslationBenchmark,
  runAllBenchmarks
};
