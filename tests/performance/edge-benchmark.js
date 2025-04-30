/**
 * Edge Component Benchmarking Tool for MedTranslate AI
 * 
 * This script benchmarks the performance of the edge component
 * under different conditions and configurations.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { runBenchmark, compareBenchmarks } = require('./benchmark-framework');
const { generateScenarios, generateComprehensiveTestSuite } = require('../integration/test-scenario-generator');

// Configuration
const CONFIG = {
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3002',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  iterations: parseInt(process.env.BENCHMARK_ITERATIONS || '50'),
  warmupIterations: parseInt(process.env.BENCHMARK_WARMUP_ITERATIONS || '5'),
  concurrencyLevels: [1, 5, 10],
  testMode: process.argv[2] || 'all', // all, translation, cache, sync, offline
  optimizationLevels: ['none', 'int8', 'fp16', 'ctranslate2'],
  deviceProfiles: ['low-end', 'mid-range', 'high-end']
};

// Device profiles for simulation
const DEVICE_PROFILES = {
  'low-end': {
    cpu: { count: 2, speed: 1.2 },
    memory: { total: 2 * 1024 * 1024 * 1024 }, // 2GB
    gpu: { available: false }
  },
  'mid-range': {
    cpu: { count: 4, speed: 2.0 },
    memory: { total: 8 * 1024 * 1024 * 1024 }, // 8GB
    gpu: { available: false }
  },
  'high-end': {
    cpu: { count: 8, speed: 3.0 },
    memory: { total: 16 * 1024 * 1024 * 1024 }, // 16GB
    gpu: { available: true }
  }
};

// Test scenarios
const TEST_SCENARIOS = generateScenarios(10);

/**
 * Benchmark text translation performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkTextTranslation(options = {}) {
  const concurrency = options.concurrency || 1;
  const scenario = options.scenario || TEST_SCENARIOS[0];
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.post(`${CONFIG.edgeUrl}/translate`, {
        text: scenario.text,
        sourceLanguage: scenario.sourceLanguage,
        targetLanguage: scenario.targetLanguage,
        context: scenario.context
      }, {
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('Translation error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Edge Text Translation (${scenario.sourceLanguage}->${scenario.targetLanguage}, ${scenario.context}, concurrency=${concurrency})`,
    testFn,
    {
      iterations: CONFIG.iterations,
      warmupIterations: CONFIG.warmupIterations,
      concurrency
    }
  );
}

/**
 * Benchmark audio translation performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkAudioTranslation(options = {}) {
  const concurrency = options.concurrency || 1;
  const audioSize = options.audioSize || 'small'; // small, medium, large
  
  // Create test audio file if it doesn't exist
  const testAudioPath = path.join(__dirname, `../test-audio-${audioSize}.mp3`);
  if (!fs.existsSync(testAudioPath)) {
    console.log(`Creating test audio file: ${testAudioPath}`);
    // This is just a placeholder - in a real test, you would use actual audio files of different sizes
    const audioData = Buffer.alloc(
      audioSize === 'small' ? 10 * 1024 : // 10KB
      audioSize === 'medium' ? 100 * 1024 : // 100KB
      1024 * 1024 // 1MB
    );
    fs.writeFileSync(testAudioPath, audioData);
  }
  
  // Create form data
  const formData = new FormData();
  formData.append('audio', fs.createReadStream(testAudioPath));
  formData.append('sourceLanguage', 'en');
  formData.append('targetLanguage', 'es');
  formData.append('context', 'general');
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.post(`${CONFIG.edgeUrl}/translate/audio`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });
      
      return response.data;
    } catch (error) {
      console.error('Audio translation error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Edge Audio Translation (${audioSize}, concurrency=${concurrency})`,
    testFn,
    {
      iterations: Math.max(5, Math.floor(CONFIG.iterations / 5)), // Fewer iterations for audio
      warmupIterations: Math.max(2, Math.floor(CONFIG.warmupIterations / 2)),
      concurrency
    }
  );
}

/**
 * Benchmark cache performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkCachePerformance(options = {}) {
  const concurrency = options.concurrency || 1;
  const scenario = options.scenario || TEST_SCENARIOS[0];
  
  // First, ensure the translation is cached
  try {
    await axios.post(`${CONFIG.edgeUrl}/translate`, {
      text: scenario.text,
      sourceLanguage: scenario.sourceLanguage,
      targetLanguage: scenario.targetLanguage,
      context: scenario.context
    });
  } catch (error) {
    console.error('Error caching translation:', error.message);
  }
  
  // Create test function for cache hit
  const testFn = async () => {
    try {
      const response = await axios.post(`${CONFIG.edgeUrl}/translate`, {
        text: scenario.text,
        sourceLanguage: scenario.sourceLanguage,
        targetLanguage: scenario.targetLanguage,
        context: scenario.context
      }, {
        timeout: 5000
      });
      
      return response.data;
    } catch (error) {
      console.error('Cache hit error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Edge Cache Performance (${scenario.sourceLanguage}->${scenario.targetLanguage}, concurrency=${concurrency})`,
    testFn,
    {
      iterations: CONFIG.iterations,
      warmupIterations: CONFIG.warmupIterations,
      concurrency
    }
  );
}

/**
 * Benchmark sync performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkSyncPerformance(options = {}) {
  const concurrency = options.concurrency || 1;
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.post(`${CONFIG.edgeUrl}/sync`, {
        force: true
      }, {
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('Sync error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Edge Sync Performance (concurrency=${concurrency})`,
    testFn,
    {
      iterations: Math.max(5, Math.floor(CONFIG.iterations / 10)), // Fewer iterations for sync
      warmupIterations: Math.max(1, Math.floor(CONFIG.warmupIterations / 2)),
      concurrency
    }
  );
}

/**
 * Benchmark offline mode performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkOfflinePerformance(options = {}) {
  const concurrency = options.concurrency || 1;
  const scenario = options.scenario || TEST_SCENARIOS[0];
  
  // First, put the edge in offline mode
  try {
    await axios.post(`${CONFIG.edgeUrl}/test/offline-mode`, {
      enabled: true
    });
  } catch (error) {
    console.error('Error enabling offline mode:', error.message);
  }
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.post(`${CONFIG.edgeUrl}/translate`, {
        text: scenario.text,
        sourceLanguage: scenario.sourceLanguage,
        targetLanguage: scenario.targetLanguage,
        context: scenario.context
      }, {
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('Offline translation error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  const result = await runBenchmark(
    `Edge Offline Performance (${scenario.sourceLanguage}->${scenario.targetLanguage}, concurrency=${concurrency})`,
    testFn,
    {
      iterations: CONFIG.iterations,
      warmupIterations: CONFIG.warmupIterations,
      concurrency
    }
  );
  
  // Restore online mode
  try {
    await axios.post(`${CONFIG.edgeUrl}/test/offline-mode`, {
      enabled: false
    });
  } catch (error) {
    console.error('Error disabling offline mode:', error.message);
  }
  
  return result;
}

/**
 * Benchmark device profile performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkDeviceProfile(options = {}) {
  const deviceProfile = options.deviceProfile || 'mid-range';
  const scenario = options.scenario || TEST_SCENARIOS[0];
  
  // Set device profile
  try {
    await axios.post(`${CONFIG.edgeUrl}/test/device-profile`, {
      profile: deviceProfile
    });
  } catch (error) {
    console.error(`Error setting device profile to ${deviceProfile}:`, error.message);
  }
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.post(`${CONFIG.edgeUrl}/translate`, {
        text: scenario.text,
        sourceLanguage: scenario.sourceLanguage,
        targetLanguage: scenario.targetLanguage,
        context: scenario.context
      }, {
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('Translation error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Edge Device Profile (${deviceProfile}, ${scenario.sourceLanguage}->${scenario.targetLanguage})`,
    testFn,
    {
      iterations: CONFIG.iterations,
      warmupIterations: CONFIG.warmupIterations,
      concurrency: 1
    }
  );
}

/**
 * Benchmark optimization level performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkOptimizationLevel(options = {}) {
  const optimizationLevel = options.optimizationLevel || 'none';
  const scenario = options.scenario || TEST_SCENARIOS[0];
  
  // Set optimization level
  try {
    await axios.post(`${CONFIG.edgeUrl}/test/optimization-level`, {
      level: optimizationLevel
    });
  } catch (error) {
    console.error(`Error setting optimization level to ${optimizationLevel}:`, error.message);
  }
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.post(`${CONFIG.edgeUrl}/translate`, {
        text: scenario.text,
        sourceLanguage: scenario.sourceLanguage,
        targetLanguage: scenario.targetLanguage,
        context: scenario.context
      }, {
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('Translation error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Edge Optimization Level (${optimizationLevel}, ${scenario.sourceLanguage}->${scenario.targetLanguage})`,
    testFn,
    {
      iterations: CONFIG.iterations,
      warmupIterations: CONFIG.warmupIterations,
      concurrency: 1
    }
  );
}

/**
 * Run all benchmarks
 * 
 * @returns {Promise<Array<Object>>} - Benchmark results
 */
async function runAllBenchmarks() {
  const results = [];
  
  // Run translation benchmarks with different concurrency levels
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'translation') {
    for (const concurrency of CONFIG.concurrencyLevels) {
      const result = await benchmarkTextTranslation({ concurrency });
      results.push(result);
    }
    
    // Run audio translation benchmark
    const audioResult = await benchmarkAudioTranslation({ concurrency: 1 });
    results.push(audioResult);
  }
  
  // Run cache benchmarks
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'cache') {
    for (const concurrency of CONFIG.concurrencyLevels) {
      const result = await benchmarkCachePerformance({ concurrency });
      results.push(result);
    }
  }
  
  // Run sync benchmark
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'sync') {
    const syncResult = await benchmarkSyncPerformance({ concurrency: 1 });
    results.push(syncResult);
  }
  
  // Run offline benchmark
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'offline') {
    const offlineResult = await benchmarkOfflinePerformance({ concurrency: 1 });
    results.push(offlineResult);
  }
  
  // Run device profile benchmarks
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'device') {
    for (const deviceProfile of CONFIG.deviceProfiles) {
      const result = await benchmarkDeviceProfile({ deviceProfile });
      results.push(result);
    }
  }
  
  // Run optimization level benchmarks
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'optimization') {
    for (const optimizationLevel of CONFIG.optimizationLevels) {
      const result = await benchmarkOptimizationLevel({ optimizationLevel });
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  console.log('Starting Edge Component Benchmarks');
  console.log(`Test mode: ${CONFIG.testMode}`);
  console.log(`Iterations: ${CONFIG.iterations}`);
  console.log(`Warmup iterations: ${CONFIG.warmupIterations}`);
  
  try {
    // Run benchmarks
    const results = await runAllBenchmarks();
    
    // Compare results
    if (results.length > 1) {
      const comparison = compareBenchmarks(results, 'Edge Component Benchmark Comparison');
      console.log(`Comparison saved to: ${comparison.filePath}`);
      console.log(`HTML comparison saved to: ${comparison.htmlPath}`);
    }
    
    console.log('Edge Component Benchmarks completed successfully');
  } catch (error) {
    console.error('Error running benchmarks:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  benchmarkTextTranslation,
  benchmarkAudioTranslation,
  benchmarkCachePerformance,
  benchmarkSyncPerformance,
  benchmarkOfflinePerformance,
  benchmarkDeviceProfile,
  benchmarkOptimizationLevel,
  runAllBenchmarks
};
