/**
 * Setup file for integration tests
 * 
 * This file contains setup code that runs before integration tests.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create temporary directories for tests
const TEST_DIRS = [
  '/tmp/medtranslate-test/models',
  '/tmp/medtranslate-test/cache',
  '/tmp/medtranslate-test/sync',
  '/tmp/medtranslate-test/config'
];

// Create test directories
TEST_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Set environment variables for tests
process.env.MODEL_DIR = '/tmp/medtranslate-test/models';
process.env.CACHE_DIR = '/tmp/medtranslate-test/cache';
process.env.SYNC_DIR = '/tmp/medtranslate-test/sync';
process.env.CONFIG_DIR = '/tmp/medtranslate-test/config';
process.env.CLOUD_API_URL = 'http://localhost:4000';
process.env.PORT = '3001';
process.env.DEVICE_ID = 'test-device-integration';

// Create a mock model file
const mockModelPath = path.join(process.env.MODEL_DIR, 'en-es.bin');
if (!fs.existsSync(mockModelPath)) {
  fs.writeFileSync(mockModelPath, 'MOCK MODEL DATA');
}

// Global teardown
afterAll(() => {
  // Clean up test directories if needed
  // Uncomment the following lines to clean up after tests
  /*
  TEST_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      execSync(`rm -rf ${dir}`);
    }
  });
  */
});
