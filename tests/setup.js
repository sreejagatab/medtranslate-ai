/**
 * Jest setup file for MedTranslate AI
 * 
 * This file is run before each test file.
 */

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.API_URL = 'http://localhost:3001';
process.env.WS_URL = 'ws://localhost:3001';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.BEDROCK_MODEL_ID = 'amazon.titan-text-express-v1';

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockDynamoDB = {
    get: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    scan: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({ Item: {} })
  };

  const mockS3 = {
    getObject: jest.fn().mockReturnThis(),
    putObject: jest.fn().mockReturnThis(),
    deleteObject: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({})
  };

  const mockBedrockRuntime = {
    invokeModel: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({
      body: JSON.stringify({
        results: [{ outputText: 'Translated text', completionReason: 'FINISH' }]
      })
    })
  };

  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDynamoDB)
    },
    S3: jest.fn(() => mockS3),
    BedrockRuntime: jest.fn(() => mockBedrockRuntime)
  };
});

// Global beforeAll
beforeAll(() => {
  console.log('Starting tests...');
});

// Global afterAll
afterAll(() => {
  console.log('All tests completed.');
});

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});
