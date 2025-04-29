/**
 * Performance tests for the Backend Translation Service
 * 
 * This script tests the performance of the translation service under different conditions.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const API_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const RESULTS_DIR = path.join(__dirname, '../../results/performance');
const TEST_ITERATIONS = 10;
const WARMUP_ITERATIONS = 3;

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Test data
const testTexts = {
  short: 'Hello, how are you feeling today?',
  medium: 'The patient is experiencing chest pain, shortness of breath, and fatigue. These symptoms started two days ago and have been getting progressively worse.',
  long: `The patient is a 45-year-old male with a history of hypertension and type 2 diabetes. He presents with chest pain that started 3 hours ago. The pain is described as pressure-like, radiating to the left arm, and is associated with shortness of breath and diaphoresis. He rates the pain as 8/10. He has a family history of coronary artery disease. His current medications include metformin, lisinopril, and aspirin. Vital signs show BP 160/95, HR 95, RR 22, and O2 saturation 94% on room air. Physical examination reveals an anxious-appearing male in moderate distress. Heart sounds are regular with no murmurs, rubs, or gallops. Lungs are clear to auscultation bilaterally. ECG shows ST-segment elevation in leads II, III, and aVF.`,
  veryLong: fs.readFileSync(path.join(__dirname, '../test-data/long-medical-text.txt'), 'utf8')
};

const languagePairs = [
  { source: 'en', target: 'es' },
  { source: 'en', target: 'fr' },
  { source: 'es', target: 'en' },
  { source: 'fr', target: 'en' }
];

const medicalContexts = [
  'general',
  'cardiology',
  'neurology',
  'pediatrics'
];

// Helper function for API requests
async function translateText(text, sourceLanguage, targetLanguage, context) {
  try {
    const response = await axios.post(`${API_URL}/translate/text`, {
      text,
      sourceLanguage,
      targetLanguage,
      context
    });
    
    return response.data;
  } catch (error) {
    console.error('Translation error:', error.message);
    throw error;
  }
}

// Performance test framework
async function runPerformanceTest(name, testFn, iterations = TEST_ITERATIONS) {
  console.log(`\nRunning performance test: ${name}`);
  console.log(`Warming up with ${WARMUP_ITERATIONS} iterations...`);
  
  // Warm-up
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await testFn();
  }
  
  console.log(`Running ${iterations} test iterations...`);
  
  // Test iterations
  const durations = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await testFn();
    const end = performance.now();
    const duration = end - start;
    durations.push(duration);
    
    console.log(`  Iteration ${i + 1}: ${duration.toFixed(2)} ms`);
  }
  
  // Calculate statistics
  durations.sort((a, b) => a - b);
  
  const min = durations[0];
  const max = durations[durations.length - 1];
  const mean = durations.reduce((sum, val) => sum + val, 0) / durations.length;
  const median = durations[Math.floor(durations.length / 2)];
  
  // Calculate percentiles
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  
  // Calculate standard deviation
  const variance = durations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  
  // Results
  const results = {
    name,
    timestamp: new Date().toISOString(),
    iterations,
    totalDuration: durations.reduce((sum, val) => sum + val, 0),
    statistics: {
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
  
  // Print summary
  console.log('\nResults:');
  console.log(`  Min: ${min.toFixed(2)} ms`);
  console.log(`  Max: ${max.toFixed(2)} ms`);
  console.log(`  Mean: ${mean.toFixed(2)} ms`);
  console.log(`  Median: ${median.toFixed(2)} ms`);
  console.log(`  P95: ${p95.toFixed(2)} ms`);
  console.log(`  P99: ${p99.toFixed(2)} ms`);
  console.log(`  Std Dev: ${stdDev.toFixed(2)} ms`);
  
  // Save results
  const resultsFile = path.join(RESULTS_DIR, `${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log(`\nResults saved to ${resultsFile}`);
  
  return results;
}

// Test cases
async function testTextLength() {
  // Test translation performance with different text lengths
  for (const [length, text] of Object.entries(testTexts)) {
    await runPerformanceTest(`Translation - ${length} text`, async () => {
      await translateText(text, 'en', 'es', 'general');
    });
  }
}

async function testLanguagePairs() {
  // Test translation performance with different language pairs
  for (const { source, target } of languagePairs) {
    await runPerformanceTest(`Translation - ${source} to ${target}`, async () => {
      await translateText(testTexts.medium, source, target, 'general');
    });
  }
}

async function testMedicalContexts() {
  // Test translation performance with different medical contexts
  for (const context of medicalContexts) {
    await runPerformanceTest(`Translation - ${context} context`, async () => {
      await translateText(testTexts.medium, 'en', 'es', context);
    });
  }
}

async function testConcurrentRequests() {
  // Test translation performance with concurrent requests
  const concurrencyLevels = [1, 5, 10, 20];
  
  for (const concurrency of concurrencyLevels) {
    await runPerformanceTest(`Translation - ${concurrency} concurrent requests`, async () => {
      const promises = [];
      
      for (let i = 0; i < concurrency; i++) {
        promises.push(translateText(testTexts.short, 'en', 'es', 'general'));
      }
      
      await Promise.all(promises);
    });
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting Backend Translation Performance Tests...');
  
  await testTextLength();
  await testLanguagePairs();
  await testMedicalContexts();
  await testConcurrentRequests();
  
  console.log('\nAll performance tests completed.');
}

// Run tests
runAllTests().catch(error => {
  console.error('Error running performance tests:', error);
  process.exit(1);
});
