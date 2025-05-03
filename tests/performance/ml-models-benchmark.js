/**
 * Performance Benchmark for ML Models in Predictive Caching
 * 
 * This script benchmarks the performance of the machine learning models
 * used in the predictive caching system, measuring:
 * - Training time
 * - Prediction generation time
 * - Memory usage
 * - Prediction accuracy
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import modules to benchmark
const {
  ExponentialSmoothingModel,
  HoltsModel,
  HoltWintersModel,
  ContentBasedFilteringModel,
  NetworkPatternModel,
  HybridRecommendationSystem
} = require('../../edge/app/ml-models/prediction-model');

const modelAdapter = require('../../edge/app/ml-models/model-adapter');
const predictiveCache = require('../../edge/app/predictive-cache');

// Configuration
const CONFIG = {
  iterations: 10,
  datasetSizes: [100, 500, 1000, 5000],
  timeSeriesLength: 168, // 7 days * 24 hours
  contentItemsCount: 100,
  userInteractionsCount: 1000,
  networkSamplesCount: 1000,
  outputFile: path.join(__dirname, '../../benchmark-results/ml-models-benchmark.json')
};

// Ensure output directory exists
const outputDir = path.dirname(CONFIG.outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Generate synthetic training data
 * 
 * @param {number} size - Size of the dataset
 * @returns {Object} - Training data
 */
function generateTrainingData(size) {
  console.log(`Generating synthetic training data (size: ${size})...`);
  
  // Generate time series data
  const timeSeriesData = Array(CONFIG.timeSeriesLength).fill(0).map(() => 
    Math.random() * 100 + 50 + // Base value
    Math.sin(Math.random() * Math.PI) * 30 // Seasonal component
  );
  
  // Generate content items
  const contentItems = {};
  const languages = ['en', 'es', 'fr', 'de', 'zh', 'ja'];
  const contexts = ['general', 'cardiology', 'neurology', 'pediatrics', 'oncology'];
  
  for (let i = 0; i < Math.min(CONFIG.contentItemsCount, size); i++) {
    const sourceLanguage = languages[Math.floor(Math.random() * languages.length)];
    const targetLanguage = languages[Math.floor(Math.random() * languages.length)];
    const context = contexts[Math.floor(Math.random() * contexts.length)];
    
    if (sourceLanguage === targetLanguage) continue;
    
    const itemId = `${sourceLanguage}-${targetLanguage}-${context}`;
    
    contentItems[itemId] = {
      sourceLanguage,
      targetLanguage,
      context,
      complexity: Math.random(),
      medicalTerms: Math.random() > 0.5 ? 1 : 0
    };
  }
  
  // Generate user interactions
  const userInteractions = [];
  const itemIds = Object.keys(contentItems);
  
  for (let i = 0; i < Math.min(CONFIG.userInteractionsCount, size * 2); i++) {
    if (itemIds.length === 0) break;
    
    const itemId = itemIds[Math.floor(Math.random() * itemIds.length)];
    
    userInteractions.push({
      userId: 'default-user',
      itemId,
      weight: Math.random() + 0.5,
      timestamp: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000) // Up to 30 days ago
    });
  }
  
  // Generate network samples
  const networkSamples = [];
  
  for (let i = 0; i < Math.min(CONFIG.networkSamplesCount, size); i++) {
    const timestamp = Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000); // Up to 30 days ago
    const hour = new Date(timestamp).getHours();
    
    // More likely to be offline at night
    const isOfflineHour = hour >= 22 || hour <= 5;
    const isOnline = isOfflineHour ? Math.random() > 0.7 : Math.random() > 0.2;
    
    networkSamples.push({
      isOnline,
      timestamp
    });
  }
  
  // Generate usage log for predictive cache
  const usageLog = [];
  
  for (let i = 0; i < size; i++) {
    const timestamp = Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000); // Up to 30 days ago
    const hour = new Date(timestamp).getHours();
    
    // Select random languages and context
    const sourceLanguage = languages[Math.floor(Math.random() * languages.length)];
    const targetLanguage = languages[Math.floor(Math.random() * languages.length)];
    
    // Ensure source and target are different
    if (sourceLanguage === targetLanguage) continue;
    
    const context = contexts[Math.floor(Math.random() * contexts.length)];
    
    // Create network status - more likely to be offline during certain hours
    const isOfflineHour = hour >= 22 || hour <= 5;
    const networkStatus = isOfflineHour && Math.random() > 0.7 ? 'offline' : 'online';
    
    // Create usage entry
    const entry = {
      timestamp,
      sourceLanguage,
      targetLanguage,
      context,
      textLength: Math.floor(Math.random() * 500) + 50,
      textHash: Math.random().toString(36).substring(2, 10),
      terms: [],
      confidence: 0.9,
      processingTime: Math.floor(Math.random() * 200) + 50,
      deviceInfo: {
        batteryLevel: Math.floor(Math.random() * 100),
        batteryCharging: Math.random() > 0.5,
        networkStatus,
        networkSpeed: networkStatus === 'online' ? Math.floor(Math.random() * 5000000) + 500000 : 0,
        latency: networkStatus === 'online' ? Math.floor(Math.random() * 200) + 20 : 0,
        memoryUsage: Math.random() * 0.5 + 0.2
      },
      location: {
        latitude: (Math.random() * 180) - 90,
        longitude: (Math.random() * 360) - 180,
        accuracy: Math.random() * 100,
        locationName: ['home', 'office', 'hospital', 'clinic'][Math.floor(Math.random() * 4)]
      }
    };
    
    usageLog.push(entry);
  }
  
  return {
    timeSeriesData,
    contentItems,
    userInteractions,
    networkSamples,
    usageLog
  };
}

/**
 * Benchmark individual ML models
 * 
 * @param {Object} trainingData - Training data
 * @returns {Object} - Benchmark results
 */
function benchmarkIndividualModels(trainingData) {
  console.log('Benchmarking individual ML models...');
  
  const results = {
    exponentialSmoothing: {},
    holts: {},
    holtWinters: {},
    contentBasedFiltering: {},
    networkPattern: {}
  };
  
  // Benchmark ExponentialSmoothingModel
  {
    const model = new ExponentialSmoothingModel();
    
    // Measure training time
    const trainStart = performance.now();
    model.train(trainingData.timeSeriesData);
    const trainEnd = performance.now();
    
    // Measure prediction time
    const predictStart = performance.now();
    model.predict();
    const predictEnd = performance.now();
    
    // Measure multiple prediction time
    const multiPredictStart = performance.now();
    model.predictMultipleSteps(24);
    const multiPredictEnd = performance.now();
    
    results.exponentialSmoothing = {
      trainingTime: trainEnd - trainStart,
      predictionTime: predictEnd - predictStart,
      multiplePredictionTime: multiPredictEnd - multiPredictStart
    };
  }
  
  // Benchmark HoltsModel
  {
    const model = new HoltsModel();
    
    // Measure training time
    const trainStart = performance.now();
    model.train(trainingData.timeSeriesData);
    const trainEnd = performance.now();
    
    // Measure prediction time
    const predictStart = performance.now();
    model.predict();
    const predictEnd = performance.now();
    
    // Measure multiple prediction time
    const multiPredictStart = performance.now();
    model.predictMultipleSteps(24);
    const multiPredictEnd = performance.now();
    
    results.holts = {
      trainingTime: trainEnd - trainStart,
      predictionTime: predictEnd - predictStart,
      multiplePredictionTime: multiPredictEnd - multiPredictStart
    };
  }
  
  // Benchmark HoltWintersModel
  {
    const model = new HoltWintersModel(0.3, 0.1, 0.1, 24); // 24-hour seasonality
    
    // Measure training time
    const trainStart = performance.now();
    model.train(trainingData.timeSeriesData);
    const trainEnd = performance.now();
    
    // Measure prediction time
    const predictStart = performance.now();
    model.predict();
    const predictEnd = performance.now();
    
    // Measure multiple prediction time
    const multiPredictStart = performance.now();
    model.predictMultipleSteps(24);
    const multiPredictEnd = performance.now();
    
    results.holtWinters = {
      trainingTime: trainEnd - trainStart,
      predictionTime: predictEnd - predictStart,
      multiplePredictionTime: multiPredictEnd - multiPredictStart
    };
  }
  
  // Benchmark ContentBasedFilteringModel
  {
    const model = new ContentBasedFilteringModel();
    
    // Measure content item addition time
    const addItemsStart = performance.now();
    for (const [itemId, features] of Object.entries(trainingData.contentItems)) {
      model.addContentItem(itemId, features);
    }
    const addItemsEnd = performance.now();
    
    // Measure user preference update time
    const updatePrefsStart = performance.now();
    for (const interaction of trainingData.userInteractions) {
      model.updateUserPreferences(interaction.userId, interaction.itemId, interaction.weight);
    }
    const updatePrefsEnd = performance.now();
    
    // Measure recommendation time
    const recommendStart = performance.now();
    model.getRecommendations('default-user', 10);
    const recommendEnd = performance.now();
    
    results.contentBasedFiltering = {
      addItemsTime: addItemsEnd - addItemsStart,
      updatePreferencesTime: updatePrefsEnd - updatePrefsStart,
      recommendationTime: recommendEnd - recommendStart,
      totalTime: (addItemsEnd - addItemsStart) + (updatePrefsEnd - updatePrefsStart) + (recommendEnd - recommendStart)
    };
  }
  
  // Benchmark NetworkPatternModel
  {
    const model = new NetworkPatternModel();
    
    // Measure sample addition time
    const addSamplesStart = performance.now();
    for (const sample of trainingData.networkSamples) {
      model.addSample(sample.isOnline, new Date(sample.timestamp));
    }
    const addSamplesEnd = performance.now();
    
    // Measure offline risk prediction time
    const predictRiskStart = performance.now();
    model.predictOfflineRisk();
    const predictRiskEnd = performance.now();
    
    // Measure pattern finding time
    const findPatternsStart = performance.now();
    model.findPatterns();
    const findPatternsEnd = performance.now();
    
    results.networkPattern = {
      addSamplesTime: addSamplesEnd - addSamplesStart,
      predictRiskTime: predictRiskEnd - predictRiskStart,
      findPatternsTime: findPatternsEnd - findPatternsStart,
      totalTime: (addSamplesEnd - addSamplesStart) + (predictRiskEnd - predictRiskStart) + (findPatternsEnd - findPatternsStart)
    };
  }
  
  return results;
}

/**
 * Benchmark hybrid recommendation system
 * 
 * @param {Object} trainingData - Training data
 * @returns {Object} - Benchmark results
 */
function benchmarkHybridSystem(trainingData) {
  console.log('Benchmarking hybrid recommendation system...');
  
  const model = new HybridRecommendationSystem();
  
  // Measure training time
  const trainStart = performance.now();
  model.train(trainingData);
  const trainEnd = performance.now();
  
  // Measure recommendation time
  const recommendStart = performance.now();
  model.getRecommendations({
    timeSeriesParams: { steps: 24 },
    userId: 'default-user',
    count: 10,
    predictOfflineRisk: true,
    timestamp: new Date()
  });
  const recommendEnd = performance.now();
  
  return {
    trainingTime: trainEnd - trainStart,
    recommendationTime: recommendEnd - recommendStart
  };
}

/**
 * Benchmark model adapter
 * 
 * @param {Object} trainingData - Training data
 * @returns {Object} - Benchmark results
 */
async function benchmarkModelAdapter(trainingData) {
  console.log('Benchmarking model adapter...');
  
  // Reset model adapter
  await modelAdapter.initialize();
  
  // Convert usage log to training data
  const usageStats = {
    timePatterns: {
      hourly: trainingData.timeSeriesData.slice(0, 24)
    },
    usageLog: trainingData.usageLog,
    networkPatterns: {
      offlineTimeOfDay: Array(24).fill(0).map((_, i) => {
        const offlineCount = trainingData.networkSamples.filter(s => 
          !s.isOnline && new Date(s.timestamp).getHours() === i
        ).length;
        return offlineCount;
      })
    }
  };
  
  // Measure training time
  const trainStart = performance.now();
  await modelAdapter.trainModels(usageStats);
  const trainEnd = performance.now();
  
  // Measure prediction time
  const predictStart = performance.now();
  modelAdapter.generatePredictions({
    currentHour: new Date().getHours(),
    currentDay: new Date().getDay(),
    languagePair: 'en-es',
    context: 'general',
    confidenceThreshold: 0.2,
    maxPredictions: 20,
    includeOfflineRisk: true
  });
  const predictEnd = performance.now();
  
  // Measure offline risk prediction time
  const riskStart = performance.now();
  modelAdapter.predictOfflineRisk();
  const riskEnd = performance.now();
  
  return {
    trainingTime: trainEnd - trainStart,
    predictionTime: predictEnd - predictStart,
    riskPredictionTime: riskEnd - riskStart
  };
}

/**
 * Benchmark predictive cache with ML models
 * 
 * @param {Object} trainingData - Training data
 * @returns {Object} - Benchmark results
 */
async function benchmarkPredictiveCache(trainingData) {
  console.log('Benchmarking predictive cache with ML models...');
  
  // Initialize predictive cache
  await predictiveCache.initialize();
  
  // Set usage log
  predictiveCache.setUsageLog(trainingData.usageLog);
  
  // Measure update model time
  const updateStart = performance.now();
  await predictiveCache.updatePredictionModel();
  const updateEnd = performance.now();
  
  // Measure prediction time
  const predictStart = performance.now();
  const predictions = predictiveCache.getPredictions();
  const predictEnd = performance.now();
  
  // Measure pre-cache time
  const preCacheStart = performance.now();
  await predictiveCache.preCachePredictedContent();
  const preCacheEnd = performance.now();
  
  return {
    updateModelTime: updateEnd - updateStart,
    predictionTime: predictEnd - predictStart,
    preCacheTime: preCacheEnd - preCacheStart,
    predictionsCount: predictions.length
  };
}

/**
 * Run benchmark
 */
async function runBenchmark() {
  console.log('Starting ML models benchmark...');
  
  const results = {
    config: CONFIG,
    timestamp: new Date().toISOString(),
    datasets: {}
  };
  
  // Benchmark with different dataset sizes
  for (const size of CONFIG.datasetSizes) {
    console.log(`\n=== Benchmarking with dataset size: ${size} ===\n`);
    
    const datasetResults = {
      iterations: []
    };
    
    // Run multiple iterations
    for (let i = 0; i < CONFIG.iterations; i++) {
      console.log(`\nIteration ${i + 1}/${CONFIG.iterations}`);
      
      // Generate training data
      const trainingData = generateTrainingData(size);
      
      // Benchmark individual models
      const individualResults = benchmarkIndividualModels(trainingData);
      
      // Benchmark hybrid system
      const hybridResults = benchmarkHybridSystem(trainingData);
      
      // Benchmark model adapter
      const adapterResults = await benchmarkModelAdapter(trainingData);
      
      // Benchmark predictive cache
      const cacheResults = await benchmarkPredictiveCache(trainingData);
      
      // Record iteration results
      datasetResults.iterations.push({
        individual: individualResults,
        hybrid: hybridResults,
        adapter: adapterResults,
        cache: cacheResults
      });
    }
    
    // Calculate averages
    datasetResults.averages = {
      individual: {
        exponentialSmoothing: {
          trainingTime: average(datasetResults.iterations.map(i => i.individual.exponentialSmoothing.trainingTime)),
          predictionTime: average(datasetResults.iterations.map(i => i.individual.exponentialSmoothing.predictionTime)),
          multiplePredictionTime: average(datasetResults.iterations.map(i => i.individual.exponentialSmoothing.multiplePredictionTime))
        },
        holts: {
          trainingTime: average(datasetResults.iterations.map(i => i.individual.holts.trainingTime)),
          predictionTime: average(datasetResults.iterations.map(i => i.individual.holts.predictionTime)),
          multiplePredictionTime: average(datasetResults.iterations.map(i => i.individual.holts.multiplePredictionTime))
        },
        holtWinters: {
          trainingTime: average(datasetResults.iterations.map(i => i.individual.holtWinters.trainingTime)),
          predictionTime: average(datasetResults.iterations.map(i => i.individual.holtWinters.predictionTime)),
          multiplePredictionTime: average(datasetResults.iterations.map(i => i.individual.holtWinters.multiplePredictionTime))
        },
        contentBasedFiltering: {
          addItemsTime: average(datasetResults.iterations.map(i => i.individual.contentBasedFiltering.addItemsTime)),
          updatePreferencesTime: average(datasetResults.iterations.map(i => i.individual.contentBasedFiltering.updatePreferencesTime)),
          recommendationTime: average(datasetResults.iterations.map(i => i.individual.contentBasedFiltering.recommendationTime)),
          totalTime: average(datasetResults.iterations.map(i => i.individual.contentBasedFiltering.totalTime))
        },
        networkPattern: {
          addSamplesTime: average(datasetResults.iterations.map(i => i.individual.networkPattern.addSamplesTime)),
          predictRiskTime: average(datasetResults.iterations.map(i => i.individual.networkPattern.predictRiskTime)),
          findPatternsTime: average(datasetResults.iterations.map(i => i.individual.networkPattern.findPatternsTime)),
          totalTime: average(datasetResults.iterations.map(i => i.individual.networkPattern.totalTime))
        }
      },
      hybrid: {
        trainingTime: average(datasetResults.iterations.map(i => i.hybrid.trainingTime)),
        recommendationTime: average(datasetResults.iterations.map(i => i.hybrid.recommendationTime))
      },
      adapter: {
        trainingTime: average(datasetResults.iterations.map(i => i.adapter.trainingTime)),
        predictionTime: average(datasetResults.iterations.map(i => i.adapter.predictionTime)),
        riskPredictionTime: average(datasetResults.iterations.map(i => i.adapter.riskPredictionTime))
      },
      cache: {
        updateModelTime: average(datasetResults.iterations.map(i => i.cache.updateModelTime)),
        predictionTime: average(datasetResults.iterations.map(i => i.cache.predictionTime)),
        preCacheTime: average(datasetResults.iterations.map(i => i.cache.preCacheTime)),
        predictionsCount: average(datasetResults.iterations.map(i => i.cache.predictionsCount))
      }
    };
    
    // Print summary
    console.log('\n=== Summary for dataset size:', size, '===');
    console.log('Time Series Models:');
    console.log(`  Exponential Smoothing: Training=${datasetResults.averages.individual.exponentialSmoothing.trainingTime.toFixed(2)}ms, Prediction=${datasetResults.averages.individual.exponentialSmoothing.predictionTime.toFixed(2)}ms`);
    console.log(`  Holt's Method: Training=${datasetResults.averages.individual.holts.trainingTime.toFixed(2)}ms, Prediction=${datasetResults.averages.individual.holts.predictionTime.toFixed(2)}ms`);
    console.log(`  Holt-Winters Method: Training=${datasetResults.averages.individual.holtWinters.trainingTime.toFixed(2)}ms, Prediction=${datasetResults.averages.individual.holtWinters.predictionTime.toFixed(2)}ms`);
    
    console.log('Content-Based Filtering:');
    console.log(`  Total Time: ${datasetResults.averages.individual.contentBasedFiltering.totalTime.toFixed(2)}ms`);
    
    console.log('Network Pattern Analysis:');
    console.log(`  Total Time: ${datasetResults.averages.individual.networkPattern.totalTime.toFixed(2)}ms`);
    
    console.log('Hybrid Recommendation System:');
    console.log(`  Training: ${datasetResults.averages.hybrid.trainingTime.toFixed(2)}ms, Recommendation: ${datasetResults.averages.hybrid.recommendationTime.toFixed(2)}ms`);
    
    console.log('Model Adapter:');
    console.log(`  Training: ${datasetResults.averages.adapter.trainingTime.toFixed(2)}ms, Prediction: ${datasetResults.averages.adapter.predictionTime.toFixed(2)}ms`);
    
    console.log('Predictive Cache:');
    console.log(`  Update Model: ${datasetResults.averages.cache.updateModelTime.toFixed(2)}ms, Prediction: ${datasetResults.averages.cache.predictionTime.toFixed(2)}ms`);
    console.log(`  Pre-Cache: ${datasetResults.averages.cache.preCacheTime.toFixed(2)}ms, Predictions: ${datasetResults.averages.cache.predictionsCount.toFixed(0)}`);
    
    // Store dataset results
    results.datasets[size] = datasetResults;
  }
  
  // Save results to file
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(results, null, 2));
  console.log(`\nBenchmark results saved to ${CONFIG.outputFile}`);
  
  return results;
}

/**
 * Calculate average of an array of numbers
 * 
 * @param {Array<number>} values - Values to average
 * @returns {number} - Average
 */
function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Run benchmark if executed directly
if (require.main === module) {
  runBenchmark();
}

module.exports = {
  runBenchmark,
  generateTrainingData,
  benchmarkIndividualModels,
  benchmarkHybridSystem,
  benchmarkModelAdapter,
  benchmarkPredictiveCache
};
