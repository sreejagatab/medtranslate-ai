/**
 * Performance Benchmarking Tool for MedTranslate AI Edge Computing
 * 
 * This tool measures the performance of the edge computing capabilities
 * across different devices, models, and configurations.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Import modules
const modelManager = require('../app/model_manager');
const cache = require('../app/cache');

// Configuration
const CONFIG = {
  outputDir: process.env.BENCHMARK_OUTPUT_DIR || path.join(__dirname, '../benchmark-results'),
  iterations: parseInt(process.env.BENCHMARK_ITERATIONS || '5'),
  warmupIterations: parseInt(process.env.BENCHMARK_WARMUP_ITERATIONS || '2'),
  testSizes: ['small', 'medium', 'large'],
  deviceProfiles: ['low-end', 'mid-range', 'high-end'],
  optimizationLevels: ['none', 'int8', 'fp16', 'ctranslate2'],
  languagePairs: [
    { source: 'en', target: 'es' },
    { source: 'en', target: 'fr' },
    { source: 'es', target: 'en' }
  ]
};

// Test data by size
const TEST_DATA = {
  small: {
    en: "The patient has a fever of 101°F.",
    es: "El paciente tiene fiebre de 38.3°C.",
    fr: "Le patient a une fièvre de 38,3°C."
  },
  medium: {
    en: "The patient has a fever of 101°F and complains of headache and fatigue. The symptoms started two days ago after attending a large gathering.",
    es: "El paciente tiene fiebre de 38.3°C y se queja de dolor de cabeza y fatiga. Los síntomas comenzaron hace dos días después de asistir a una gran reunión.",
    fr: "Le patient a une fièvre de 38,3°C et se plaint de maux de tête et de fatigue. Les symptômes ont commencé il y a deux jours après avoir assisté à un grand rassemblement."
  },
  large: {
    en: "The patient has a fever of 101°F and complains of headache and fatigue. The symptoms started two days ago after attending a large gathering. The patient has a history of hypertension and type 2 diabetes, currently managed with lisinopril 10mg daily and metformin 1000mg twice daily. The patient reports no known allergies to medications. Physical examination reveals mild pharyngeal erythema without exudate. Lungs are clear to auscultation bilaterally. Heart rate is regular without murmurs, gallops, or rubs.",
    es: "El paciente tiene fiebre de 38.3°C y se queja de dolor de cabeza y fatiga. Los síntomas comenzaron hace dos días después de asistir a una gran reunión. El paciente tiene antecedentes de hipertensión y diabetes tipo 2, actualmente tratados con lisinopril 10 mg diarios y metformina 1000 mg dos veces al día. El paciente no reporta alergias conocidas a medicamentos. El examen físico revela eritema faríngeo leve sin exudado. Los pulmones están claros a la auscultación bilateralmente. La frecuencia cardíaca es regular sin soplos, galopes o roces.",
    fr: "Le patient a une fièvre de 38,3°C et se plaint de maux de tête et de fatigue. Les symptômes ont commencé il y a deux jours après avoir assisté à un grand rassemblement. Le patient a des antécédents d'hypertension et de diabète de type 2, actuellement traités avec du lisinopril 10 mg par jour et de la metformine 1000 mg deux fois par jour. Le patient ne signale aucune allergie connue aux médicaments. L'examen physique révèle un érythème pharyngé léger sans exsudat. Les poumons sont clairs à l'auscultation bilatérale. La fréquence cardiaque est régulière sans souffle, galop ou frottement."
  }
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

// Benchmark results
let benchmarkResults = {
  system: {
    platform: os.platform(),
    arch: os.arch(),
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    cpuCount: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    nodeVersion: process.version
  },
  timestamp: Date.now(),
  results: []
};

/**
 * Simulate a device profile by limiting resources
 */
async function simulateDeviceProfile(profile) {
  console.log(`Simulating device profile: ${profile}`);
  
  const deviceProfile = DEVICE_PROFILES[profile];
  
  if (!deviceProfile) {
    console.error(`Unknown device profile: ${profile}`);
    return false;
  }
  
  // Set environment variables to simulate the device
  process.env.SIMULATED_CPU_COUNT = deviceProfile.cpu.count.toString();
  process.env.SIMULATED_CPU_SPEED = deviceProfile.cpu.speed.toString();
  process.env.SIMULATED_MEMORY = deviceProfile.memory.total.toString();
  process.env.SIMULATED_GPU_AVAILABLE = deviceProfile.gpu.available.toString();
  
  // Override the detectDeviceCapabilities function in model_manager
  try {
    // This is a hack to override the function for testing
    // In a real implementation, you would modify the code to accept these parameters
    const originalDetectDeviceCapabilities = modelManager.__get__('detectDeviceCapabilities');
    
    modelManager.__set__('detectDeviceCapabilities', async () => {
      console.log(`Using simulated device profile: ${profile}`);
      
      return {
        cpu: {
          count: deviceProfile.cpu.count,
          model: `Simulated CPU (${profile})`,
          architecture: os.arch()
        },
        memory: {
          total: deviceProfile.memory.total,
          free: deviceProfile.memory.total * 0.3, // Simulate 30% free
          totalGB: deviceProfile.memory.total / (1024 * 1024 * 1024)
        },
        gpu: {
          available: deviceProfile.gpu.available,
          info: deviceProfile.gpu.available ? [{ name: 'Simulated GPU', memory: '4GB' }] : null
        },
        os: {
          platform: os.platform(),
          release: os.release(),
          type: os.type()
        },
        inference: {
          recommendedEngine: deviceProfile.gpu.available ? 'gpu' : 'cpu',
          recommendedComputeType: deviceProfile.gpu.available ? 'fp16' : 
                                 (deviceProfile.memory.total >= 8 * 1024 * 1024 * 1024 ? 'fp32' : 'int8'),
          maxBatchSize: deviceProfile.gpu.available ? 8 : 
                       (deviceProfile.memory.total >= 8 * 1024 * 1024 * 1024 ? 4 : 
                       (deviceProfile.memory.total >= 4 * 1024 * 1024 * 1024 ? 2 : 1)),
          useQuantization: deviceProfile.memory.total < 4 * 1024 * 1024 * 1024,
          useOptimizedModels: true
        },
        timestamp: Date.now()
      };
    });
    
    // Store the original function to restore later
    return originalDetectDeviceCapabilities;
  } catch (error) {
    console.error('Error simulating device profile:', error);
    return null;
  }
}

/**
 * Restore original device detection
 */
function restoreDeviceDetection(originalFunction) {
  if (originalFunction) {
    try {
      modelManager.__set__('detectDeviceCapabilities', originalFunction);
      console.log('Restored original device detection');
    } catch (error) {
      console.error('Error restoring device detection:', error);
    }
  }
}

/**
 * Set optimization level
 */
function setOptimizationLevel(level) {
  console.log(`Setting optimization level: ${level}`);
  
  switch (level) {
    case 'none':
      process.env.USE_OPTIMIZED_INFERENCE = 'false';
      process.env.INFERENCE_COMPUTE_TYPE = 'fp32';
      break;
    case 'int8':
      process.env.USE_OPTIMIZED_INFERENCE = 'true';
      process.env.INFERENCE_COMPUTE_TYPE = 'int8';
      break;
    case 'fp16':
      process.env.USE_OPTIMIZED_INFERENCE = 'true';
      process.env.INFERENCE_COMPUTE_TYPE = 'fp16';
      break;
    case 'ctranslate2':
      process.env.USE_OPTIMIZED_INFERENCE = 'true';
      process.env.INFERENCE_COMPUTE_TYPE = 'int8';
      process.env.USE_CTRANSLATE2 = 'true';
      break;
    default:
      console.error(`Unknown optimization level: ${level}`);
      return false;
  }
  
  return true;
}

/**
 * Run a single benchmark test
 */
async function runBenchmarkTest(deviceProfile, optimizationLevel, languagePair, textSize) {
  console.log(`\nRunning benchmark: Device=${deviceProfile}, Optimization=${optimizationLevel}, Languages=${languagePair.source}->${languagePair.target}, Size=${textSize}`);
  
  try {
    // Get test text
    const text = TEST_DATA[textSize][languagePair.source];
    
    if (!text) {
      console.error(`No test data available for language ${languagePair.source} and size ${textSize}`);
      return null;
    }
    
    // Initialize model manager
    await modelManager.initialize();
    
    // Check if language pair is supported
    if (!modelManager.isLanguagePairSupported(languagePair.source, languagePair.target)) {
      console.log(`Language pair ${languagePair.source}->${languagePair.target} is not supported. Skipping.`);
      return null;
    }
    
    // Warm-up runs
    console.log(`Performing ${CONFIG.warmupIterations} warm-up iterations...`);
    for (let i = 0; i < CONFIG.warmupIterations; i++) {
      await modelManager.translateText(text, languagePair.source, languagePair.target, 'general');
    }
    
    // Benchmark runs
    console.log(`Performing ${CONFIG.iterations} benchmark iterations...`);
    const durations = [];
    const memoryUsage = [];
    
    for (let i = 0; i < CONFIG.iterations; i++) {
      // Record memory before
      const memBefore = process.memoryUsage();
      
      // Start timing
      const startTime = process.hrtime.bigint();
      
      // Perform translation
      const result = await modelManager.translateText(text, languagePair.source, languagePair.target, 'general');
      
      // End timing
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      // Record memory after
      const memAfter = process.memoryUsage();
      
      // Calculate memory usage
      const memoryDelta = {
        rss: memAfter.rss - memBefore.rss,
        heapTotal: memAfter.heapTotal - memBefore.heapTotal,
        heapUsed: memAfter.heapUsed - memBefore.heapUsed,
        external: memAfter.external - memBefore.external
      };
      
      durations.push(duration);
      memoryUsage.push(memoryDelta);
      
      console.log(`Iteration ${i + 1}: ${duration.toFixed(2)}ms, Memory: ${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Calculate statistics
    const avgDuration = durations.reduce((sum, val) => sum + val, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    // Calculate standard deviation
    const variance = durations.reduce((sum, val) => sum + Math.pow(val - avgDuration, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate average memory usage
    const avgMemoryUsage = {
      rss: memoryUsage.reduce((sum, val) => sum + val.rss, 0) / memoryUsage.length,
      heapTotal: memoryUsage.reduce((sum, val) => sum + val.heapTotal, 0) / memoryUsage.length,
      heapUsed: memoryUsage.reduce((sum, val) => sum + val.heapUsed, 0) / memoryUsage.length,
      external: memoryUsage.reduce((sum, val) => sum + val.external, 0) / memoryUsage.length
    };
    
    // Get model information
    const model = modelManager.getModel(languagePair.source, languagePair.target);
    
    // Create result object
    const result = {
      deviceProfile,
      optimizationLevel,
      languagePair: `${languagePair.source}->${languagePair.target}`,
      textSize,
      textLength: text.length,
      performance: {
        avgDuration,
        minDuration,
        maxDuration,
        stdDev,
        iterations: CONFIG.iterations
      },
      memory: {
        avgUsage: avgMemoryUsage,
        avgHeapUsedMB: avgMemoryUsage.heapUsed / 1024 / 1024
      },
      model: {
        path: model?.path || 'N/A',
        optimized: model?.optimizedPath ? true : false,
        size: model?.size || 0,
        type: model?.isTerminologyOnly ? 'terminology-only' : 'full'
      }
    };
    
    console.log(`\nBenchmark completed: Avg=${avgDuration.toFixed(2)}ms, Min=${minDuration.toFixed(2)}ms, Max=${maxDuration.toFixed(2)}ms, StdDev=${stdDev.toFixed(2)}ms`);
    
    return result;
  } catch (error) {
    console.error('Error running benchmark test:', error);
    return null;
  }
}

/**
 * Run all benchmark tests
 */
async function runAllBenchmarks() {
  console.log('=== MedTranslate AI Performance Benchmark ===\n');
  
  try {
    // Create output directory
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    // Run benchmarks for each combination
    for (const deviceProfile of CONFIG.deviceProfiles) {
      // Simulate device profile
      const originalDetectDeviceCapabilities = await simulateDeviceProfile(deviceProfile);
      
      for (const optimizationLevel of CONFIG.optimizationLevels) {
        // Set optimization level
        setOptimizationLevel(optimizationLevel);
        
        for (const languagePair of CONFIG.languagePairs) {
          for (const textSize of CONFIG.testSizes) {
            // Run benchmark test
            const result = await runBenchmarkTest(deviceProfile, optimizationLevel, languagePair, textSize);
            
            if (result) {
              benchmarkResults.results.push(result);
            }
          }
        }
      }
      
      // Restore original device detection
      restoreDeviceDetection(originalDetectDeviceCapabilities);
    }
    
    // Save benchmark results
    const outputFile = path.join(CONFIG.outputDir, `benchmark-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(benchmarkResults, null, 2), 'utf8');
    
    console.log(`\nBenchmark results saved to ${outputFile}`);
    
    // Generate summary
    generateSummary(benchmarkResults);
    
    return benchmarkResults;
  } catch (error) {
    console.error('Error running benchmarks:', error);
  }
}

/**
 * Generate benchmark summary
 */
function generateSummary(results) {
  console.log('\n=== Benchmark Summary ===\n');
  
  // Group results by device profile and optimization level
  const groupedResults = {};
  
  for (const result of results.results) {
    const key = `${result.deviceProfile}-${result.optimizationLevel}`;
    
    if (!groupedResults[key]) {
      groupedResults[key] = [];
    }
    
    groupedResults[key].push(result);
  }
  
  // Calculate average performance for each group
  const summaries = [];
  
  for (const key in groupedResults) {
    const [deviceProfile, optimizationLevel] = key.split('-');
    const groupResults = groupedResults[key];
    
    // Calculate average duration across all tests in this group
    const avgDuration = groupResults.reduce((sum, r) => sum + r.performance.avgDuration, 0) / groupResults.length;
    
    // Calculate average memory usage
    const avgMemoryUsage = groupResults.reduce((sum, r) => sum + r.memory.avgHeapUsedMB, 0) / groupResults.length;
    
    summaries.push({
      deviceProfile,
      optimizationLevel,
      avgDuration,
      avgMemoryUsageMB: avgMemoryUsage,
      testCount: groupResults.length
    });
  }
  
  // Sort summaries by device profile and then by performance
  summaries.sort((a, b) => {
    if (a.deviceProfile !== b.deviceProfile) {
      return CONFIG.deviceProfiles.indexOf(a.deviceProfile) - CONFIG.deviceProfiles.indexOf(b.deviceProfile);
    }
    
    return a.avgDuration - b.avgDuration;
  });
  
  // Print summary table
  console.log('Device Profile | Optimization | Avg Duration (ms) | Avg Memory (MB) | Tests');
  console.log('--------------|--------------|------------------|----------------|------');
  
  for (const summary of summaries) {
    console.log(`${summary.deviceProfile.padEnd(14)} | ${summary.optimizationLevel.padEnd(12)} | ${summary.avgDuration.toFixed(2).padEnd(18)} | ${summary.avgMemoryUsageMB.toFixed(2).padEnd(16)} | ${summary.testCount}`);
  }
  
  // Find best configuration for each device profile
  console.log('\nRecommended Configurations:');
  
  const deviceProfiles = [...new Set(summaries.map(s => s.deviceProfile))];
  
  for (const profile of deviceProfiles) {
    const profileSummaries = summaries.filter(s => s.deviceProfile === profile);
    profileSummaries.sort((a, b) => a.avgDuration - b.avgDuration);
    
    const best = profileSummaries[0];
    console.log(`- ${profile}: Use ${best.optimizationLevel} optimization (${best.avgDuration.toFixed(2)}ms, ${best.avgMemoryUsageMB.toFixed(2)}MB)`);
  }
  
  // Save summary to file
  const summaryFile = path.join(CONFIG.outputDir, `summary-${Date.now()}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify({ summaries, system: results.system }, null, 2), 'utf8');
  
  console.log(`\nSummary saved to ${summaryFile}`);
}

/**
 * Run the benchmark
 */
async function runBenchmark() {
  await runAllBenchmarks();
}

// Run the benchmark if this script is executed directly
if (require.main === module) {
  runBenchmark();
}

module.exports = {
  runBenchmark,
  CONFIG
};
