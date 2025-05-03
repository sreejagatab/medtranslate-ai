/**
 * Run ML Model Tests
 * 
 * This script runs all tests related to the ML models in the predictive caching system.
 */

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const config = {
  outputDir: path.join(__dirname, '../test-reports/ml-models'),
  testSuites: [
    {
      name: 'ML Models Unit Tests',
      command: 'jest tests/unit/ml-models.test.js --verbose',
      outputFile: 'unit-tests.log',
      enabled: true
    },
    {
      name: 'ML Predictive Cache Integration Tests',
      command: 'node tests/integration/ml-predictive-cache.test.js',
      outputFile: 'integration-tests.log',
      enabled: true
    },
    {
      name: 'ML Models Performance Benchmark',
      command: 'node tests/performance/ml-models-benchmark.js',
      outputFile: 'performance-benchmark.log',
      enabled: true
    }
  ]
};

/**
 * Run all test suites
 */
async function runAllTests() {
  console.log('=== Running ML Model Tests ===\n');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  const results = {};
  
  // Run each test suite
  for (const suite of config.testSuites) {
    if (!suite.enabled) {
      console.log(`Skipping ${suite.name} (disabled)`);
      results[suite.name] = { status: 'skipped' };
      continue;
    }
    
    console.log(`Running ${suite.name}...`);
    
    const outputPath = path.join(config.outputDir, suite.outputFile);
    
    try {
      // Run the test command
      const output = execSync(suite.command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Save output to file
      fs.writeFileSync(outputPath, output);
      
      console.log(`✅ ${suite.name} completed successfully`);
      results[suite.name] = { status: 'success', outputPath };
    } catch (error) {
      // Save error output to file
      fs.writeFileSync(outputPath, error.stdout || error.message);
      
      console.error(`❌ ${suite.name} failed: ${error.message}`);
      results[suite.name] = { status: 'failed', error: error.message, outputPath };
    }
    
    console.log(''); // Add empty line for spacing
  }
  
  // Generate summary report
  const summaryPath = path.join(config.outputDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results
  }, null, 2));
  
  // Print summary
  console.log('=== Test Summary ===');
  for (const [name, result] of Object.entries(results)) {
    console.log(`${result.status === 'success' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌'} ${name}`);
  }
  
  const allPassed = Object.values(results).every(r => r.status === 'success' || r.status === 'skipped');
  console.log(`\nOverall result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  return allPassed;
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error running tests:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests
};
