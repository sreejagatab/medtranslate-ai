/**
 * Performance Benchmarking Tool for Predictive Caching System
 * 
 * This tool measures the performance of the predictive caching system
 * under various conditions and workloads.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { performance } = require('perf_hooks');
const chalk = require('chalk');

// Import modules to benchmark
const predictiveCache = require('../app/predictive-cache');
const networkMonitor = require('../app/network-monitor');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '../benchmark-results'),
  iterations: 5,
  translationsPerIteration: 100,
  offlinePreparationThresholds: [0.3, 0.5, 0.7, 0.9],
  batteryLevels: [0.2, 0.5, 0.8],
  networkConditions: ['good', 'fair', 'poor', 'offline'],
  cacheAggressiveness: [0.2, 0.5, 0.8, 1.0]
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Sample data for benchmarking
const SAMPLE_DATA = {
  languages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ru', 'ar'],
  contexts: ['general', 'cardiology', 'neurology', 'pediatrics', 'oncology', 'emergency'],
  textLengths: {
    short: { min: 10, max: 50 },
    medium: { min: 51, max: 200 },
    long: { min: 201, max: 500 }
  }
};

// Generate random text of specified length
function generateRandomText(length) {
  const words = [
    'patient', 'doctor', 'hospital', 'treatment', 'medication', 'diagnosis',
    'symptom', 'pain', 'fever', 'infection', 'surgery', 'prescription',
    'heart', 'blood', 'pressure', 'test', 'result', 'examination',
    'chronic', 'acute', 'condition', 'disease', 'disorder', 'syndrome',
    'therapy', 'recovery', 'care', 'health', 'medical', 'clinical'
  ];
  
  let text = '';
  while (text.length < length) {
    text += words[Math.floor(Math.random() * words.length)] + ' ';
  }
  
  return text.trim().substring(0, length);
}

// Generate random translation request
function generateRandomTranslation(textLength = 'medium') {
  const sourceLanguage = SAMPLE_DATA.languages[Math.floor(Math.random() * SAMPLE_DATA.languages.length)];
  let targetLanguage;
  do {
    targetLanguage = SAMPLE_DATA.languages[Math.floor(Math.random() * SAMPLE_DATA.languages.length)];
  } while (targetLanguage === sourceLanguage);
  
  const context = SAMPLE_DATA.contexts[Math.floor(Math.random() * SAMPLE_DATA.contexts.length)];
  const lengthRange = SAMPLE_DATA.textLengths[textLength];
  const textLength = Math.floor(Math.random() * (lengthRange.max - lengthRange.min + 1)) + lengthRange.min;
  
  return {
    text: generateRandomText(textLength),
    sourceLanguage,
    targetLanguage,
    context
  };
}

// Set network condition
function setNetworkCondition(condition) {
  switch (condition) {
    case 'good':
      networkMonitor.setOfflineMode(false);
      networkMonitor.setNetworkQuality({
        latency: 50,
        packetLoss: 0,
        bandwidth: 10000,
        jitter: 5
      });
      break;
    case 'fair':
      networkMonitor.setOfflineMode(false);
      networkMonitor.setNetworkQuality({
        latency: 150,
        packetLoss: 0.05,
        bandwidth: 2000,
        jitter: 20
      });
      break;
    case 'poor':
      networkMonitor.setOfflineMode(false);
      networkMonitor.setNetworkQuality({
        latency: 300,
        packetLoss: 0.2,
        bandwidth: 500,
        jitter: 50
      });
      break;
    case 'offline':
      networkMonitor.setOfflineMode(true);
      break;
  }
}

// Set battery level
function setBatteryLevel(level) {
  // Mock battery API
  global.navigator = {
    ...global.navigator,
    getBattery: async () => ({
      level,
      charging: false,
      addEventListener: () => {}
    })
  };
}

// Format duration in ms to human-readable format
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    return `${(ms / 60000).toFixed(2)}m`;
  }
}

// Format bytes to human-readable format
function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes}B`;
  } else if (bytes < 1048576) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  } else {
    return `${(bytes / 1048576).toFixed(2)}MB`;
  }
}

// Benchmark offline preparation
async function benchmarkOfflinePreparation() {
  console.log(chalk.blue.bold('\n=== Benchmarking Offline Preparation ===\n'));
  
  const results = [];
  
  // Test different offline risk thresholds
  for (const threshold of CONFIG.offlinePreparationThresholds) {
    console.log(chalk.yellow(`Testing offline risk threshold: ${threshold}`));
    
    // Test different battery levels
    for (const batteryLevel of CONFIG.batteryLevels) {
      console.log(chalk.cyan(`  Battery level: ${batteryLevel * 100}%`));
      
      // Set battery level
      setBatteryLevel(batteryLevel);
      
      // Test different network conditions
      for (const networkCondition of CONFIG.networkConditions.filter(c => c !== 'offline')) {
        console.log(chalk.green(`    Network condition: ${networkCondition}`));
        
        // Set network condition
        setNetworkCondition(networkCondition);
        
        // Run multiple iterations
        const iterationResults = [];
        
        for (let i = 0; i < CONFIG.iterations; i++) {
          // Reset cache
          await predictiveCache.initialize();
          
          // Generate some usage data
          for (let j = 0; j < 20; j++) {
            const translation = generateRandomTranslation();
            await predictiveCache.logTranslationUsage(
              translation.text,
              translation.sourceLanguage,
              translation.targetLanguage,
              translation.context,
              { translatedText: `Translated: ${translation.text}`, confidence: 0.9, processingTime: 100 }
            );
          }
          
          // Measure preparation time
          const startTime = performance.now();
          const prepareResult = await predictiveCache.prepareForOfflineMode({
            offlineRisk: threshold,
            forcePrepare: true
          });
          const endTime = performance.now();
          
          // Calculate metrics
          const duration = endTime - startTime;
          const itemsCached = prepareResult.itemsCached || 0;
          const cacheSize = prepareResult.cacheSize || 0;
          
          iterationResults.push({
            duration,
            itemsCached,
            cacheSize,
            success: prepareResult.success
          });
          
          console.log(chalk.gray(`      Iteration ${i + 1}: ${formatDuration(duration)}, ${itemsCached} items cached, ${formatBytes(cacheSize)}`));
        }
        
        // Calculate averages
        const avgDuration = iterationResults.reduce((sum, r) => sum + r.duration, 0) / iterationResults.length;
        const avgItemsCached = iterationResults.reduce((sum, r) => sum + r.itemsCached, 0) / iterationResults.length;
        const avgCacheSize = iterationResults.reduce((sum, r) => sum + r.cacheSize, 0) / iterationResults.length;
        const successRate = iterationResults.filter(r => r.success).length / iterationResults.length;
        
        results.push({
          threshold,
          batteryLevel,
          networkCondition,
          avgDuration,
          avgItemsCached,
          avgCacheSize,
          successRate
        });
        
        console.log(chalk.green(`    Average: ${formatDuration(avgDuration)}, ${avgItemsCached.toFixed(1)} items, ${formatBytes(avgCacheSize)}, ${(successRate * 100).toFixed(1)}% success`));
      }
    }
  }
  
  // Save results
  const resultsFile = path.join(CONFIG.outputDir, 'offline-preparation-benchmark.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log(chalk.blue.bold(`\nOffline preparation benchmark complete. Results saved to ${resultsFile}`));
  
  return results;
}

// Benchmark prediction generation
async function benchmarkPredictionGeneration() {
  console.log(chalk.blue.bold('\n=== Benchmarking Prediction Generation ===\n'));
  
  const results = [];
  
  // Test different cache aggressiveness levels
  for (const aggressiveness of CONFIG.cacheAggressiveness) {
    console.log(chalk.yellow(`Testing cache aggressiveness: ${aggressiveness}`));
    
    // Test different battery levels
    for (const batteryLevel of CONFIG.batteryLevels) {
      console.log(chalk.cyan(`  Battery level: ${batteryLevel * 100}%`));
      
      // Set battery level
      setBatteryLevel(batteryLevel);
      
      // Run multiple iterations
      const iterationResults = [];
      
      for (let i = 0; i < CONFIG.iterations; i++) {
        // Reset cache
        await predictiveCache.initialize();
        
        // Generate some usage data
        for (let j = 0; j < 50; j++) {
          const translation = generateRandomTranslation();
          await predictiveCache.logTranslationUsage(
            translation.text,
            translation.sourceLanguage,
            translation.targetLanguage,
            translation.context,
            { translatedText: `Translated: ${translation.text}`, confidence: 0.9, processingTime: 100 }
          );
        }
        
        // Measure prediction generation time
        const startTime = performance.now();
        const predictions = predictiveCache.getPredictions({
          aggressiveness
        });
        const endTime = performance.now();
        
        // Calculate metrics
        const duration = endTime - startTime;
        const predictionCount = predictions.length;
        
        iterationResults.push({
          duration,
          predictionCount
        });
        
        console.log(chalk.gray(`    Iteration ${i + 1}: ${formatDuration(duration)}, ${predictionCount} predictions`));
      }
      
      // Calculate averages
      const avgDuration = iterationResults.reduce((sum, r) => sum + r.duration, 0) / iterationResults.length;
      const avgPredictionCount = iterationResults.reduce((sum, r) => sum + r.predictionCount, 0) / iterationResults.length;
      
      results.push({
        aggressiveness,
        batteryLevel,
        avgDuration,
        avgPredictionCount
      });
      
      console.log(chalk.green(`  Average: ${formatDuration(avgDuration)}, ${avgPredictionCount.toFixed(1)} predictions`));
    }
  }
  
  // Save results
  const resultsFile = path.join(CONFIG.outputDir, 'prediction-generation-benchmark.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log(chalk.blue.bold(`\nPrediction generation benchmark complete. Results saved to ${resultsFile}`));
  
  return results;
}

// Benchmark offline translation performance
async function benchmarkOfflineTranslation() {
  console.log(chalk.blue.bold('\n=== Benchmarking Offline Translation Performance ===\n'));
  
  const results = [];
  
  // Test different preparation levels
  for (const threshold of [0.5, 0.9]) {
    console.log(chalk.yellow(`Testing offline preparation threshold: ${threshold}`));
    
    // Test different text lengths
    for (const textLength of Object.keys(SAMPLE_DATA.textLengths)) {
      console.log(chalk.cyan(`  Text length: ${textLength}`));
      
      // Run multiple iterations
      const iterationResults = [];
      
      for (let i = 0; i < CONFIG.iterations; i++) {
        // Reset cache
        await predictiveCache.initialize();
        
        // Generate some usage data
        for (let j = 0; j < 50; j++) {
          const translation = generateRandomTranslation(textLength);
          await predictiveCache.logTranslationUsage(
            translation.text,
            translation.sourceLanguage,
            translation.targetLanguage,
            translation.context,
            { translatedText: `Translated: ${translation.text}`, confidence: 0.9, processingTime: 100 }
          );
        }
        
        // Prepare for offline mode
        await predictiveCache.prepareForOfflineMode({
          offlineRisk: threshold,
          forcePrepare: true
        });
        
        // Set to offline mode
        setNetworkCondition('offline');
        
        // Generate test translations
        const testTranslations = [];
        for (let j = 0; j < CONFIG.translationsPerIteration; j++) {
          testTranslations.push(generateRandomTranslation(textLength));
        }
        
        // Measure translation performance
        const translationResults = [];
        const startTime = performance.now();
        
        for (const translation of testTranslations) {
          try {
            const result = await predictiveCache.translateOffline(
              translation.text,
              translation.sourceLanguage,
              translation.targetLanguage,
              translation.context
            );
            
            translationResults.push({
              success: true,
              fromCache: result.fromCache || false,
              confidence: result.confidence || 0
            });
          } catch (error) {
            translationResults.push({
              success: false,
              error: error.message
            });
          }
        }
        
        const endTime = performance.now();
        
        // Calculate metrics
        const duration = endTime - startTime;
        const successCount = translationResults.filter(r => r.success).length;
        const cacheHitCount = translationResults.filter(r => r.success && r.fromCache).length;
        const avgConfidence = translationResults.filter(r => r.success).reduce((sum, r) => sum + r.confidence, 0) / 
                             (successCount || 1);
        
        iterationResults.push({
          duration,
          successRate: successCount / testTranslations.length,
          cacheHitRate: cacheHitCount / testTranslations.length,
          avgConfidence
        });
        
        console.log(chalk.gray(`    Iteration ${i + 1}: ${formatDuration(duration)}, ${(successCount / testTranslations.length * 100).toFixed(1)}% success, ${(cacheHitCount / testTranslations.length * 100).toFixed(1)}% cache hits`));
      }
      
      // Calculate averages
      const avgDuration = iterationResults.reduce((sum, r) => sum + r.duration, 0) / iterationResults.length;
      const avgSuccessRate = iterationResults.reduce((sum, r) => sum + r.successRate, 0) / iterationResults.length;
      const avgCacheHitRate = iterationResults.reduce((sum, r) => sum + r.cacheHitRate, 0) / iterationResults.length;
      const avgConfidence = iterationResults.reduce((sum, r) => sum + r.avgConfidence, 0) / iterationResults.length;
      
      results.push({
        threshold,
        textLength,
        avgDuration,
        avgSuccessRate,
        avgCacheHitRate,
        avgConfidence,
        translationsPerSecond: CONFIG.translationsPerIteration / (avgDuration / 1000)
      });
      
      console.log(chalk.green(`  Average: ${formatDuration(avgDuration)}, ${(avgSuccessRate * 100).toFixed(1)}% success, ${(avgCacheHitRate * 100).toFixed(1)}% cache hits, ${(avgConfidence * 100).toFixed(1)}% confidence`));
    }
  }
  
  // Save results
  const resultsFile = path.join(CONFIG.outputDir, 'offline-translation-benchmark.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log(chalk.blue.bold(`\nOffline translation benchmark complete. Results saved to ${resultsFile}`));
  
  return results;
}

// Generate benchmark report
function generateBenchmarkReport(offlinePreparationResults, predictionGenerationResults, offlineTranslationResults) {
  console.log(chalk.blue.bold('\n=== Generating Benchmark Report ===\n'));
  
  const reportFile = path.join(CONFIG.outputDir, 'benchmark-report.md');
  
  let report = `# Predictive Caching System Benchmark Report\n\n`;
  report += `Generated on: ${new Date().toISOString()}\n\n`;
  
  // Offline Preparation Section
  report += `## Offline Preparation Performance\n\n`;
  report += `| Risk Threshold | Battery Level | Network | Avg Duration | Items Cached | Cache Size | Success Rate |\n`;
  report += `|----------------|---------------|---------|--------------|--------------|------------|-------------|\n`;
  
  for (const result of offlinePreparationResults) {
    report += `| ${result.threshold} | ${(result.batteryLevel * 100).toFixed(0)}% | ${result.networkCondition} | ${formatDuration(result.avgDuration)} | ${result.avgItemsCached.toFixed(1)} | ${formatBytes(result.avgCacheSize)} | ${(result.successRate * 100).toFixed(1)}% |\n`;
  }
  
  // Prediction Generation Section
  report += `\n## Prediction Generation Performance\n\n`;
  report += `| Aggressiveness | Battery Level | Avg Duration | Predictions |\n`;
  report += `|----------------|---------------|--------------|-------------|\n`;
  
  for (const result of predictionGenerationResults) {
    report += `| ${result.aggressiveness} | ${(result.batteryLevel * 100).toFixed(0)}% | ${formatDuration(result.avgDuration)} | ${result.avgPredictionCount.toFixed(1)} |\n`;
  }
  
  // Offline Translation Section
  report += `\n## Offline Translation Performance\n\n`;
  report += `| Preparation | Text Length | Avg Duration | Success Rate | Cache Hit Rate | Avg Confidence | Translations/sec |\n`;
  report += `|-------------|-------------|--------------|--------------|----------------|----------------|------------------|\n`;
  
  for (const result of offlineTranslationResults) {
    report += `| ${result.threshold} | ${result.textLength} | ${formatDuration(result.avgDuration)} | ${(result.avgSuccessRate * 100).toFixed(1)}% | ${(result.avgCacheHitRate * 100).toFixed(1)}% | ${(result.avgConfidence * 100).toFixed(1)}% | ${result.translationsPerSecond.toFixed(2)} |\n`;
  }
  
  // Key Findings
  report += `\n## Key Findings\n\n`;
  
  // Offline Preparation Findings
  const bestOfflinePrep = offlinePreparationResults.reduce((best, current) => 
    (current.avgItemsCached > best.avgItemsCached) ? current : best, offlinePreparationResults[0]);
  
  const worstOfflinePrep = offlinePreparationResults.reduce((worst, current) => 
    (current.avgItemsCached < worst.avgItemsCached) ? current : worst, offlinePreparationResults[0]);
  
  report += `### Offline Preparation\n\n`;
  report += `- Best performance: Risk threshold ${bestOfflinePrep.threshold}, ${(bestOfflinePrep.batteryLevel * 100).toFixed(0)}% battery, ${bestOfflinePrep.networkCondition} network - ${bestOfflinePrep.avgItemsCached.toFixed(1)} items cached\n`;
  report += `- Worst performance: Risk threshold ${worstOfflinePrep.threshold}, ${(worstOfflinePrep.batteryLevel * 100).toFixed(0)}% battery, ${worstOfflinePrep.networkCondition} network - ${worstOfflinePrep.avgItemsCached.toFixed(1)} items cached\n`;
  
  // Prediction Generation Findings
  const fastestPrediction = predictionGenerationResults.reduce((fastest, current) => 
    (current.avgDuration < fastest.avgDuration) ? current : fastest, predictionGenerationResults[0]);
  
  const mostPredictions = predictionGenerationResults.reduce((most, current) => 
    (current.avgPredictionCount > most.avgPredictionCount) ? current : most, predictionGenerationResults[0]);
  
  report += `\n### Prediction Generation\n\n`;
  report += `- Fastest generation: Aggressiveness ${fastestPrediction.aggressiveness}, ${(fastestPrediction.batteryLevel * 100).toFixed(0)}% battery - ${formatDuration(fastestPrediction.avgDuration)}\n`;
  report += `- Most predictions: Aggressiveness ${mostPredictions.aggressiveness}, ${(mostPredictions.batteryLevel * 100).toFixed(0)}% battery - ${mostPredictions.avgPredictionCount.toFixed(1)} predictions\n`;
  
  // Offline Translation Findings
  const bestOfflineTranslation = offlineTranslationResults.reduce((best, current) => 
    (current.avgSuccessRate > best.avgSuccessRate) ? current : best, offlineTranslationResults[0]);
  
  const fastestOfflineTranslation = offlineTranslationResults.reduce((fastest, current) => 
    (current.translationsPerSecond > fastest.translationsPerSecond) ? current : fastest, offlineTranslationResults[0]);
  
  report += `\n### Offline Translation\n\n`;
  report += `- Best success rate: Preparation threshold ${bestOfflineTranslation.threshold}, ${bestOfflineTranslation.textLength} text - ${(bestOfflineTranslation.avgSuccessRate * 100).toFixed(1)}% success\n`;
  report += `- Fastest translation: Preparation threshold ${fastestOfflineTranslation.threshold}, ${fastestOfflineTranslation.textLength} text - ${fastestOfflineTranslation.translationsPerSecond.toFixed(2)} translations/sec\n`;
  
  // Recommendations
  report += `\n## Recommendations\n\n`;
  
  // Determine optimal settings based on results
  const optimalRiskThreshold = offlinePreparationResults.reduce((best, current) => 
    (current.avgItemsCached / current.avgDuration > best.avgItemsCached / best.avgDuration) ? current : best, offlinePreparationResults[0]).threshold;
  
  const optimalAggressiveness = predictionGenerationResults.reduce((best, current) => 
    (current.avgPredictionCount / current.avgDuration > best.avgPredictionCount / best.avgDuration) ? current : best, predictionGenerationResults[0]).aggressiveness;
  
  report += `1. **Optimal Risk Threshold**: Set offline risk threshold to ${optimalRiskThreshold} for best balance of preparation speed and cache coverage\n`;
  report += `2. **Optimal Cache Aggressiveness**: Set cache aggressiveness to ${optimalAggressiveness} for best prediction generation efficiency\n`;
  report += `3. **Battery Awareness**: Reduce cache aggressiveness when battery is below 30% to conserve energy\n`;
  report += `4. **Network Adaptation**: Increase cache aggressiveness when network quality is poor\n`;
  report += `5. **Text Length Optimization**: Prioritize caching ${fastestOfflineTranslation.textLength} text for best offline performance\n`;
  
  // Write report to file
  fs.writeFileSync(reportFile, report);
  
  console.log(chalk.blue.bold(`\nBenchmark report generated: ${reportFile}`));
}

// Run all benchmarks
async function runAllBenchmarks() {
  console.log(chalk.blue.bold('=== Starting Predictive Caching System Benchmarks ==='));
  
  // Initialize predictive cache
  await predictiveCache.initialize();
  
  // Run benchmarks
  const offlinePreparationResults = await benchmarkOfflinePreparation();
  const predictionGenerationResults = await benchmarkPredictionGeneration();
  const offlineTranslationResults = await benchmarkOfflineTranslation();
  
  // Generate report
  generateBenchmarkReport(offlinePreparationResults, predictionGenerationResults, offlineTranslationResults);
  
  console.log(chalk.blue.bold('\n=== Benchmarks Complete ==='));
}

// Run benchmarks if executed directly
if (require.main === module) {
  runAllBenchmarks();
}

module.exports = {
  runAllBenchmarks,
  benchmarkOfflinePreparation,
  benchmarkPredictionGeneration,
  benchmarkOfflineTranslation
};
