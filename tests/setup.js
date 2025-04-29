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

  const mockTranslate = {
    translateText: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({
      TranslatedText: 'Translated text',
      SourceLanguageCode: 'en',
      TargetLanguageCode: 'es'
    })
  };

  const mockKMS = {
    encrypt: jest.fn().mockReturnThis(),
    decrypt: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({
      Plaintext: Buffer.from('decrypted data'),
      CiphertextBlob: Buffer.from('encrypted data')
    })
  };

  const mockTranscribeService = {
    startTranscriptionJob: jest.fn().mockReturnThis(),
    getTranscriptionJob: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({
      TranscriptionJob: {
        TranscriptionJobStatus: 'COMPLETED',
        Transcript: {
          TranscriptFileUri: 'https://example.com/transcript.json'
        }
      }
    })
  };

  const mockPolly = {
    synthesizeSpeech: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({
      AudioStream: Buffer.from('mock audio data')
    })
  };

  const mockSecretsManager = {
    getSecretValue: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({
      SecretString: JSON.stringify({
        username: 'test-user',
        password: 'test-password'
      })
    })
  };

  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDynamoDB)
    },
    S3: jest.fn(() => mockS3),
    BedrockRuntime: jest.fn(() => mockBedrockRuntime),
    Translate: jest.fn(() => mockTranslate),
    KMS: jest.fn(() => mockKMS),
    TranscribeService: jest.fn(() => mockTranscribeService),
    Polly: jest.fn(() => mockPolly),
    SecretsManager: jest.fn(() => mockSecretsManager)
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
