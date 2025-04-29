/**
 * Jest setup file for MedTranslate AI tests
 */

// Set up global test environment
global.console.log = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Set up environment variables for tests
process.env.NODE_ENV = 'test';
process.env.BACKEND_URL = 'http://localhost:3001';
process.env.EDGE_URL = 'http://localhost:3002';
process.env.WS_URL = 'ws://localhost:3001/ws';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Global setup
beforeAll(() => {
  console.log('Starting tests...');
});

// Global teardown
afterAll(() => {
  console.log('Tests completed.');
});
