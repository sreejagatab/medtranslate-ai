/**
 * Unit tests for the Authentication Service
 */

const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const authService = require('../../backend/lambda/auth/auth-service');

// Mock AWS services
jest.mock('aws-sdk', () => {
  const mockDynamoDB = {
    get: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  
  const mockSecretsManager = {
    getSecretValue: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDynamoDB)
    },
    SecretsManager: jest.fn(() => mockSecretsManager)
  };
});

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn()
}));

describe('Authentication Service', () => {
  let dynamoDBMock;
  let secretsManagerMock;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get mock instances
    dynamoDBMock = new AWS.DynamoDB.DocumentClient();
    secretsManagerMock = new AWS.SecretsManager();
    
    // Set up default mock responses
    secretsManagerMock.promise.mockResolvedValue({
      SecretString: JSON.stringify({ secret: 'mock-secret' })
    });
  });
  
  describe('getJwtSecret', () => {
    it('should retrieve the JWT secret from Secrets Manager', async () => {
      // Call the function (indirectly through another function)
      await authService.generateProviderToken('provider-123', 'Dr. Smith', 'doctor');
      
      // Verify Secrets Manager was called
      expect(secretsManagerMock.getSecretValue).toHaveBeenCalledWith({
        SecretId: expect.any(String)
      });
    });
    
    it('should throw an error if secret retrieval fails', async () => {
      // Set up mock to reject
      secretsManagerMock.promise.mockRejectedValue(new Error('Secret not found'));
      
      // Call the function and expect it to throw
      await expect(authService.generateProviderToken('provider-123', 'Dr. Smith', 'doctor'))
        .rejects.toThrow('Authentication configuration error');
    });
  });
  
  describe('generateProviderToken', () => {
    it('should generate a JWT token for a provider', async () => {
      // Call the function
      const token = await authService.generateProviderToken('provider-123', 'Dr. Smith', 'doctor');
      
      // Verify JWT sign was called with correct parameters
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          sub: 'provider-123',
          name: 'Dr. Smith',
          role: 'doctor',
          type: 'provider'
        },
        'mock-secret',
        { expiresIn: expect.any(String) }
      );
      
      // Verify token was returned
      expect(token).toBe('mock-token');
    });
  });
  
  describe('generatePatientSessionToken', () => {
    it('should generate a token and session code for a patient', async () => {
      // Set up DynamoDB mock
      dynamoDBMock.promise.mockResolvedValue({});
      
      // Call the function
      const result = await authService.generatePatientSessionToken('session-123', 'es');
      
      // Verify JWT sign was called
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-123',
          sessionCode: expect.any(String),
          language: 'es',
          type: 'patient'
        }),
        'mock-secret',
        { expiresIn: expect.any(String) }
      );
      
      // Verify DynamoDB put was called
      expect(dynamoDBMock.put).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Item: expect.objectContaining({
          sessionId: 'session-123',
          sessionCode: expect.any(String),
          language: 'es'
        })
      }));
      
      // Verify result structure
      expect(result).toEqual({
        token: 'mock-token',
        sessionCode: expect.any(String)
      });
    });
  });
  
  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      // Set up JWT verify mock
      const mockPayload = { sub: 'user-123', type: 'provider' };
      jwt.verify.mockReturnValue(mockPayload);
      
      // Call the function
      const result = await authService.verifyToken('valid-token');
      
      // Verify JWT verify was called
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'mock-secret');
      
      // Verify result
      expect(result).toEqual(mockPayload);
    });
    
    it('should return null for an invalid token', async () => {
      // Set up JWT verify mock to throw
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Call the function
      const result = await authService.verifyToken('invalid-token');
      
      // Verify result
      expect(result).toBeNull();
    });
  });
  
  describe('joinSessionWithCode', () => {
    it('should join a session with a valid code', async () => {
      // Set up DynamoDB mock
      dynamoDBMock.promise.mockResolvedValue({
        Items: [{
          sessionId: 'session-123',
          patientToken: 'valid-token',
          language: 'es',
          status: 'active'
        }]
      });
      
      // Set up JWT verify mock
      jwt.verify.mockReturnValue({ sub: 'patient-123' });
      
      // Call the function
      const result = await authService.joinSessionWithCode('123456');
      
      // Verify DynamoDB query was called
      expect(dynamoDBMock.query).toHaveBeenCalledWith(expect.objectContaining({
        KeyConditionExpression: 'sessionCode = :code',
        ExpressionAttributeValues: expect.objectContaining({
          ':code': '123456'
        })
      }));
      
      // Verify result
      expect(result).toEqual({
        success: true,
        token: 'valid-token',
        sessionId: 'session-123',
        language: 'es'
      });
    });
    
    it('should return error for invalid session code', async () => {
      // Set up DynamoDB mock to return empty result
      dynamoDBMock.promise.mockResolvedValue({
        Items: []
      });
      
      // Call the function
      const result = await authService.joinSessionWithCode('invalid-code');
      
      // Verify result
      expect(result).toEqual({
        success: false,
        error: 'Invalid session code or expired session'
      });
    });
    
    it('should return error for expired session token', async () => {
      // Set up DynamoDB mock
      dynamoDBMock.promise.mockResolvedValue({
        Items: [{
          sessionId: 'session-123',
          patientToken: 'expired-token',
          language: 'es',
          status: 'active'
        }]
      });
      
      // Set up JWT verify mock to return null (expired token)
      jwt.verify.mockReturnValue(null);
      
      // Call the function
      const result = await authService.joinSessionWithCode('123456');
      
      // Verify result
      expect(result).toEqual({
        success: false,
        error: 'Session has expired'
      });
    });
  });
  
  describe('createSession', () => {
    it('should create a new session', async () => {
      // Set up DynamoDB mock
      dynamoDBMock.promise.mockResolvedValue({});
      
      // Call the function
      const result = await authService.createSession('provider-123', 'Dr. Smith', 'cardiology');
      
      // Verify DynamoDB put was called
      expect(dynamoDBMock.put).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Item: expect.objectContaining({
          providerId: 'provider-123',
          providerName: 'Dr. Smith',
          medicalContext: 'cardiology',
          status: 'created'
        })
      }));
      
      // Verify result
      expect(result).toEqual({
        success: true,
        sessionId: expect.any(String),
        providerName: 'Dr. Smith',
        medicalContext: 'cardiology'
      });
    });
  });
  
  describe('endSession', () => {
    it('should end a session', async () => {
      // Set up DynamoDB mock
      dynamoDBMock.promise.mockResolvedValue({});
      
      // Call the function
      const result = await authService.endSession('session-123');
      
      // Verify DynamoDB update was called
      expect(dynamoDBMock.update).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Key: { sessionId: 'session-123' },
        UpdateExpression: expect.stringContaining('SET #status = :status')
      }));
      
      // Verify result
      expect(result).toEqual({
        success: true
      });
    });
  });
  
  describe('authenticateProvider', () => {
    it('should authenticate a provider with valid credentials', async () => {
      // Set up crypto mock for password hashing
      const crypto = require('crypto');
      const mockHash = 'hashed-password';
      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHash)
      });
      
      // Set up DynamoDB mock
      dynamoDBMock.promise.mockResolvedValue({
        Item: {
          providerId: 'provider-123',
          username: 'drsmith',
          password: mockHash,
          salt: 'salt',
          name: 'Dr. Smith',
          role: 'doctor'
        }
      });
      
      // Call the function
      const result = await authService.authenticateProvider('drsmith', 'password123');
      
      // Verify DynamoDB get was called
      expect(dynamoDBMock.get).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Key: { username: 'drsmith' }
      }));
      
      // Verify result
      expect(result).toEqual({
        success: true,
        token: 'mock-token',
        provider: {
          providerId: 'provider-123',
          name: 'Dr. Smith',
          role: 'doctor'
        }
      });
    });
    
    it('should return error for invalid username', async () => {
      // Set up DynamoDB mock to return no item
      dynamoDBMock.promise.mockResolvedValue({});
      
      // Call the function
      const result = await authService.authenticateProvider('invalid', 'password123');
      
      // Verify result
      expect(result).toEqual({
        success: false,
        error: 'Invalid username or password'
      });
    });
    
    it('should return error for invalid password', async () => {
      // Set up crypto mock for password hashing
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('wrong-hash')
      });
      
      // Set up DynamoDB mock
      dynamoDBMock.promise.mockResolvedValue({
        Item: {
          providerId: 'provider-123',
          username: 'drsmith',
          password: 'correct-hash',
          salt: 'salt',
          name: 'Dr. Smith',
          role: 'doctor'
        }
      });
      
      // Call the function
      const result = await authService.authenticateProvider('drsmith', 'wrong-password');
      
      // Verify result
      expect(result).toEqual({
        success: false,
        error: 'Invalid username or password'
      });
    });
  });
});
