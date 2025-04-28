/**
 * Performance Test Framework for MedTranslate AI
 * 
 * This module provides utilities for running performance tests and collecting metrics.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const RESULTS_DIR = path.join(__dirname, '../../results/performance');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Runs a performance test and collects metrics
 * 
 * @param {string} testName - Name of the test
 * @param {Function} testFn - Test function to run
 * @param {Object} options - Test options
 * @param {number} options.iterations - Number of iterations to run
 * @param {number} options.warmupIterations - Number of warmup iterations
 * @param {boolean} options.saveResults - Whether to save results to disk
 * @returns {Object} - Test results
 */
async function runPerformanceTest(testName, testFn, options = {}) {
  const iterations = options.iterations || 100;
  const warmupIterations = options.warmupIterations || 5;
  const saveResults = options.saveResults !== false;
  
  console.log(`Running performance test: ${testName}`);
  console.log(`Warmup iterations: ${warmupIterations}`);
  console.log(`Test iterations: ${iterations}`);
  
  // Run warmup iterations
  console.log('Warming up...');
  for (let i = 0; i < warmupIterations; i++) {
    await testFn();
  }
  
  // Run test iterations
  console.log('Running test...');
  const durations = [];
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const iterationStart = performance.now();
    await testFn();
    const iterationEnd = performance.now();
    durations.push(iterationEnd - iterationStart);
    
    // Log progress
    if ((i + 1) % 10 === 0 || i === iterations - 1) {
      console.log(`Completed ${i + 1}/${iterations} iterations`);
    }
  }
  
  const endTime = performance.now();
  const totalDuration = endTime - startTime;
  
  // Calculate metrics
  durations.sort((a, b) => a - b);
  const min = durations[0];
  const max = durations[durations.length - 1];
  const median = durations[Math.floor(durations.length / 2)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const mean = durations.reduce((sum, val) => sum + val, 0) / durations.length;
  
  // Calculate standard deviation
  const variance = durations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  
  // Prepare results
  const results = {
    testName,
    timestamp: new Date().toISOString(),
    iterations,
    totalDuration,
    metrics: {
      min,
      max,
      mean,
      median,
      p95,
      p99,
      stdDev
    },
    durations
  };
  
  // Log results
  console.log('\nTest Results:');
  console.log(`Total Duration: ${totalDuration.toFixed(2)} ms`);
  console.log(`Min: ${min.toFixed(2)} ms`);
  console.log(`Max: ${max.toFixed(2)} ms`);
  console.log(`Mean: ${mean.toFixed(2)} ms`);
  console.log(`Median: ${median.toFixed(2)} ms`);
  console.log(`P95: ${p95.toFixed(2)} ms`);
  console.log(`P99: ${p99.toFixed(2)} ms`);
  console.log(`Std Dev: ${stdDev.toFixed(2)} ms`);
  
  // Save results
  if (saveResults) {
    const resultsFile = path.join(RESULTS_DIR, `${testName}-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${resultsFile}`);
  }
  
  return results;
}

/**
 * Simulates different network conditions
 * 
 * @param {string} condition - Network condition to simulate ('fast', 'slow', 'unreliable')
 * @param {Function} fn - Function to run under the simulated condition
 * @returns {Promise<any>} - Result of the function
 */
async function withNetworkCondition(condition, fn) {
  switch (condition) {
    case 'fast':
      // No delay for fast network
      return await fn();
    
    case 'slow':
      // Add delay for slow network
      await new Promise(resolve => setTimeout(resolve, 100));
      return await fn();
    
    case 'unreliable':
      // Randomly fail for unreliable network
      if (Math.random() < 0.1) {
        throw new Error('Network error (simulated)');
      }
      // Add variable delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
      return await fn();
    
    default:
      return await fn();
  }
}

module.exports = {
  runPerformanceTest,
  withNetworkCondition
};
