/**
 * Run Predictive Cache Integration Tests
 * 
 * This script runs the integration tests for the predictive caching system.
 */

const { runTests } = require('./tests/integration/predictive-cache.test');

console.log('Running Predictive Cache Integration Tests...');

runTests()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    } else {
      console.error('\n❌ Some tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Error running tests:', error);
    process.exit(1);
  });
