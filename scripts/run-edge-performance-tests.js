/**
 * Script to run edge component performance tests
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const PERFORMANCE_TESTS = [
  'tests/performance/edge-translation.perf.js',
  'tests/performance/edge-cache.perf.js',
  'tests/performance/edge-sync.perf.js',
  'tests/performance/edge-application.perf.js'
];

// Ensure results directory exists
const RESULTS_DIR = path.join(__dirname, '../results/performance');
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Run tests
console.log('Running edge component performance tests...');

try {
  // Run each performance test
  for (const testFile of PERFORMANCE_TESTS) {
    console.log(`\nRunning ${testFile}...`);
    execSync(`node ${testFile}`, { stdio: 'inherit' });
  }
  
  console.log('\n✅ All edge component performance tests completed!');
  console.log(`Results saved to: ${RESULTS_DIR}`);
} catch (error) {
  console.error('\n❌ Some performance tests failed. See above for details.');
  process.exit(1);
}
