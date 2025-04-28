/**
 * Script to run edge component tests
 */

const { execSync } = require('child_process');
const path = require('path');

// Configuration
const TEST_PATTERNS = [
  'tests/unit/edge-*.test.js'
];

// Run tests
console.log('Running edge component tests...');

try {
  // Run Jest with the specified test patterns
  const command = `npx jest ${TEST_PATTERNS.join(' ')} --verbose`;
  execSync(command, { stdio: 'inherit' });
  
  console.log('\n✅ All edge component tests passed!');
} catch (error) {
  console.error('\n❌ Some tests failed. See above for details.');
  process.exit(1);
}
