/**
 * Run Enhanced Predictive Cache Test for MedTranslate AI Edge Application
 */

const { runTest } = require('./tests/test-enhanced-predictive-cache');

console.log('Starting Enhanced Predictive Cache Test Runner');
console.log('=============================================');

// Run the test
runTest().then(result => {
  if (result.success) {
    console.log('\nTest completed successfully!');
    process.exit(0);
  } else {
    console.error('\nTest failed:', result.error);
    process.exit(1);
  }
}).catch(error => {
  console.error('\nUnexpected error running test:', error);
  process.exit(1);
});
