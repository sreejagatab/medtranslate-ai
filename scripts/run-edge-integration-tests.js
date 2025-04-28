/**
 * Script to run edge component integration tests
 */

const { execSync } = require('child_process');
const path = require('path');

// Configuration
const TEST_PATTERNS = [
  'tests/integration/edge-*.test.js'
];

// Run tests
console.log('Running edge component integration tests...');

try {
  // Run Jest with the specified test patterns
  const command = `npx jest ${TEST_PATTERNS.join(' ')} --verbose --runInBand`;
  execSync(command, { stdio: 'inherit' });
  
  console.log('\n✅ All edge component integration tests passed!');
} catch (error) {
  console.error('\n❌ Some integration tests failed. See above for details.');
  process.exit(1);
}
