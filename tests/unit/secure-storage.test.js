/**
 * Unit tests for the Secure Storage Service
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');
const secureStorage = require('../../backend/lambda/storage/secure-storage');

// Mock AWS services
jest.mock('aws-sdk', () => {
  const mockS3 = {
    putObject: jest.fn().mockReturnThis(),
    getObject: jest.fn().mockReturnThis(),
    headObject: jest.fn().mockReturnThis(),
    listObjectsV2: jest.fn().mockReturnThis(),
    deleteObjects: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  
  const mockKMS = {
    generateDataKey: jest.fn().mockReturnThis(),
    decrypt: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  
  return {
    S3: jest.fn(() => mockS3),
    KMS: jest.fn(() => mockKMS)
  };
});

// Mock crypto
jest.mock('crypto', () => {
  const originalCrypto = jest.requireActual('crypto');
  
  return {
    ...originalCrypto,
    randomBytes: jest.fn().mockReturnValue(Buffer.from('random-bytes')),
    randomUUID: jest.fn().mockReturnValue('mock-uuid'),
    createCipheriv: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue('encrypted-data-part1'),
      final: jest.fn().mockReturnValue('encrypted-data-part2')
    }),
    createDecipheriv: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue('decrypted-data-part1'),
      final: jest.fn().mockReturnValue('decrypted-data-part2')
    })
  };
});

describe('Secure Storage Service', () => {
  let s3Mock;
  let kmsMock;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get mock instances
    s3Mock = new AWS.S3();
    kmsMock = new AWS.KMS();
    
    // Set up default mock responses
    kmsMock.promise.mockImplementation(() => {
      return Promise.resolve({
        Plaintext: Buffer.from('plaintext-key'),
        CiphertextBlob: Buffer.from('encrypted-key')
      });
    });
    
    s3Mock.promise.mockImplementation(() => {
      return Promise.resolve({});
    });
  });
  
  describe('generateDataKey', () => {
    it('should generate a data encryption key using KMS', async () => {
      // Call the function (indirectly through storeEncryptedData)
      await secureStorage.storeEncryptedData('session-123', 'test', 'test-data');
      
      // Verify KMS was called
      expect(kmsMock.generateDataKey).toHaveBeenCalledWith({
        KeyId: expect.any(String),
        KeySpec: 'AES_256'
      });
    });
    
    it('should throw an error if key generation fails', async () => {
      // Set up mock to reject
      kmsMock.promise.mockRejectedValue(new Error('KMS error'));
      
      // Call the function and expect it to throw
      await expect(secureStorage.storeEncryptedData('session-123', 'test', 'test-data'))
        .rejects.toThrow('Encryption key generation failed');
    });
  });
  
  describe('encryptData', () => {
    it('should encrypt data using the provided key', async () => {
      // Call the function (indirectly through storeEncryptedData)
      await secureStorage.storeEncryptedData('session-123', 'test', 'test-data');
      
      // Verify crypto functions were called
      expect(crypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        expect.any(Buffer),
        expect.any(Buffer)
      );
    });
  });
  
  describe('storeEncryptedData', () => {
    it('should store encrypted data in S3', async () => {
      // Call the function
      const result = await secureStorage.storeEncryptedData(
        'session-123',
        'test',
        'test-data',
        { 'custom-metadata': 'value' }
      );
      
      // Verify S3 putObject was called
      expect(s3Mock.putObject).toHaveBeenCalledWith(expect.objectContaining({
        Bucket: expect.any(String),
        Key: expect.stringContaining('sessions/session-123/test/'),
        Body: expect.any(String),
        Metadata: expect.objectContaining({
          'session-id': 'session-123',
          'data-type': 'test',
          'encrypted': 'true',
          'custom-metadata': 'value'
        }),
        ContentType: 'application/json',
        ServerSideEncryption: 'AES256'
      }));
      
      // Verify result
      expect(result).toEqual({
        success: true,
        objectKey: expect.stringContaining('sessions/session-123/test/'),
        expirationDate: expect.any(String)
      });
    });
    
    it('should throw an error if S3 storage fails', async () => {
      // Set up mock to reject
      s3Mock.promise.mockRejectedValue(new Error('S3 error'));
      
      // Call the function and expect it to throw
      await expect(secureStorage.storeEncryptedData('session-123', 'test', 'test-data'))
        .rejects.toThrow('Secure storage failed');
    });
  });
  
  describe('retrieveEncryptedData', () => {
    it('should retrieve and decrypt data from S3', async () => {
      // Set up S3 mock
      s3Mock.promise.mockResolvedValue({
        Body: Buffer.from(JSON.stringify({
          encryptedData: 'encrypted-data',
          iv: Buffer.from('iv').toString('base64'),
          encryptedKey: Buffer.from('encrypted-key').toString('base64')
        })),
        Metadata: {
          'session-id': 'session-123',
          'data-type': 'test'
        }
      });
      
      // Set up KMS mock
      kmsMock.promise.mockResolvedValue({
        Plaintext: Buffer.from('plaintext-key')
      });
      
      // Call the function
      const result = await secureStorage.retrieveEncryptedData('test-object-key');
      
      // Verify S3 getObject was called
      expect(s3Mock.getObject).toHaveBeenCalledWith({
        Bucket: expect.any(String),
        Key: 'test-object-key'
      });
      
      // Verify KMS decrypt was called
      expect(kmsMock.decrypt).toHaveBeenCalledWith(expect.objectContaining({
        CiphertextBlob: expect.any(Buffer),
        KeyId: expect.any(String)
      }));
      
      // Verify crypto functions were called
      expect(crypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        expect.any(Buffer),
        expect.any(Buffer)
      );
      
      // Verify result
      expect(result).toEqual({
        data: 'decrypted-data-part1decrypted-data-part2',
        metadata: {
          'session-id': 'session-123',
          'data-type': 'test'
        }
      });
    });
    
    it('should throw an error if retrieval fails', async () => {
      // Set up mock to reject
      s3Mock.promise.mockRejectedValue(new Error('S3 error'));
      
      // Call the function and expect it to throw
      await expect(secureStorage.retrieveEncryptedData('test-object-key'))
        .rejects.toThrow('Data retrieval failed');
    });
  });
  
  describe('storeConversationTranscript', () => {
    it('should store a conversation transcript securely', async () => {
      // Set up mock for storeEncryptedData
      const storeEncryptedDataSpy = jest.spyOn(secureStorage, 'storeEncryptedData')
        .mockResolvedValue({
          success: true,
          objectKey: 'test-object-key',
          expirationDate: '2023-12-31T00:00:00Z'
        });
      
      // Sample data
      const messages = [
        {
          id: 'msg-1',
          sender: 'provider',
          text: 'Hello, how can I help you?',
          timestamp: '2023-01-01T12:00:00Z',
          confidence: 'high'
        },
        {
          id: 'msg-2',
          sender: 'patient',
          text: 'I have a headache',
          timestamp: '2023-01-01T12:01:00Z',
          confidence: 'high'
        }
      ];
      
      const sessionInfo = {
        providerId: 'provider-123',
        providerName: 'Dr. Smith',
        medicalContext: 'general',
        patientLanguage: 'es',
        startTime: '2023-01-01T12:00:00Z'
      };
      
      // Call the function
      const result = await secureStorage.storeConversationTranscript(
        'session-123',
        messages,
        sessionInfo
      );
      
      // Verify storeEncryptedData was called
      expect(storeEncryptedDataSpy).toHaveBeenCalledWith(
        'session-123',
        'transcript',
        expect.any(String),
        expect.objectContaining({
          'provider-id': 'provider-123',
          'patient-language': 'es',
          'medical-context': 'general'
        })
      );
      
      // Verify result
      expect(result).toEqual({
        success: true,
        objectKey: 'test-object-key',
        expirationDate: '2023-12-31T00:00:00Z'
      });
      
      // Restore the original implementation
      storeEncryptedDataSpy.mockRestore();
    });
  });
  
  describe('deleteExpiredData', () => {
    it('should delete expired objects from S3', async () => {
      // Set up S3 listObjectsV2 mock
      s3Mock.promise.mockImplementation((params) => {
        if (params && params.Bucket) {
          return Promise.resolve({
            Contents: [
              { Key: 'sessions/session-1/transcript/file1.json' },
              { Key: 'sessions/session-2/transcript/file2.json' }
            ]
          });
        } else if (params && params.Key) {
          // headObject mock
          return Promise.resolve({
            Metadata: {
              'expiration-date': '2000-01-01T00:00:00Z' // Expired date
            }
          });
        }
        return Promise.resolve({});
      });
      
      // Call the function
      const result = await secureStorage.deleteExpiredData();
      
      // Verify S3 listObjectsV2 was called
      expect(s3Mock.listObjectsV2).toHaveBeenCalledWith(expect.objectContaining({
        Bucket: expect.any(String),
        Prefix: 'sessions/'
      }));
      
      // Verify S3 headObject was called for each object
      expect(s3Mock.headObject).toHaveBeenCalledTimes(2);
      
      // Verify S3 deleteObjects was called
      expect(s3Mock.deleteObjects).toHaveBeenCalledWith(expect.objectContaining({
        Bucket: expect.any(String),
        Delete: {
          Objects: [
            { Key: 'sessions/session-1/transcript/file1.json' },
            { Key: 'sessions/session-2/transcript/file2.json' }
          ]
        }
      }));
      
      // Verify result
      expect(result).toEqual({
        success: true,
        deletedCount: 2
      });
    });
    
    it('should return success with zero deletions if no expired objects', async () => {
      // Set up S3 listObjectsV2 mock
      s3Mock.promise.mockImplementation((params) => {
        if (params && params.Bucket) {
          return Promise.resolve({
            Contents: [
              { Key: 'sessions/session-1/transcript/file1.json' }
            ]
          });
        } else if (params && params.Key) {
          // headObject mock
          return Promise.resolve({
            Metadata: {
              'expiration-date': '2099-01-01T00:00:00Z' // Future date
            }
          });
        }
        return Promise.resolve({});
      });
      
      // Call the function
      const result = await secureStorage.deleteExpiredData();
      
      // Verify S3 deleteObjects was not called
      expect(s3Mock.deleteObjects).not.toHaveBeenCalled();
      
      // Verify result
      expect(result).toEqual({
        success: true,
        deletedCount: 0
      });
    });
  });
  
  describe('getSessionData', () => {
    it('should retrieve session data for authorized users', async () => {
      // Set up S3 listObjectsV2 mock
      s3Mock.promise.mockImplementation((params) => {
        if (params && params.Prefix) {
          return Promise.resolve({
            Contents: [
              { Key: 'sessions/session-123/transcript/file1.json', LastModified: new Date() }
            ]
          });
        } else if (params && params.Key) {
          // getObject mock
          return Promise.resolve({
            Body: Buffer.from(JSON.stringify({
              encryptedData: 'encrypted-data',
              iv: Buffer.from('iv').toString('base64'),
              encryptedKey: Buffer.from('encrypted-key').toString('base64')
            })),
            Metadata: {
              'provider-id': 'provider-123'
            }
          });
        }
        return Promise.resolve({});
      });
      
      // Mock retrieveEncryptedData
      const retrieveEncryptedDataSpy = jest.spyOn(secureStorage, 'retrieveEncryptedData')
        .mockResolvedValue({
          data: JSON.stringify({
            sessionId: 'session-123',
            providerName: 'Dr. Smith',
            medicalContext: 'general',
            patientLanguage: 'es',
            startTime: '2023-01-01T12:00:00Z',
            endTime: '2023-01-01T12:30:00Z',
            messages: [
              { id: 'msg-1', sender: 'provider', text: 'Hello' }
            ]
          }),
          metadata: {
            'provider-id': 'provider-123'
          }
        });
      
      // Call the function
      const result = await secureStorage.getSessionData(
        'session-123',
        'provider-123',
        'provider'
      );
      
      // Verify S3 listObjectsV2 was called
      expect(s3Mock.listObjectsV2).toHaveBeenCalledWith(expect.objectContaining({
        Bucket: expect.any(String),
        Prefix: 'sessions/session-123/'
      }));
      
      // Verify retrieveEncryptedData was called
      expect(retrieveEncryptedDataSpy).toHaveBeenCalledWith(
        'sessions/session-123/transcript/file1.json'
      );
      
      // Verify result
      expect(result).toEqual({
        success: true,
        sessionData: expect.objectContaining({
          sessionId: 'session-123',
          providerName: 'Dr. Smith',
          medicalContext: 'general',
          patientLanguage: 'es',
          messages: expect.any(Array)
        })
      });
      
      // Restore the original implementation
      retrieveEncryptedDataSpy.mockRestore();
    });
    
    it('should return error for unauthorized access', async () => {
      // Mock retrieveEncryptedData
      const retrieveEncryptedDataSpy = jest.spyOn(secureStorage, 'retrieveEncryptedData')
        .mockResolvedValue({
          data: JSON.stringify({
            sessionId: 'session-123',
            providerName: 'Dr. Smith',
            messages: []
          }),
          metadata: {
            'provider-id': 'provider-123'
          }
        });
      
      // Set up S3 listObjectsV2 mock
      s3Mock.promise.mockResolvedValue({
        Contents: [
          { Key: 'sessions/session-123/transcript/file1.json', LastModified: new Date() }
        ]
      });
      
      // Call the function with different provider ID
      const result = await secureStorage.getSessionData(
        'session-123',
        'different-provider',
        'provider'
      );
      
      // Verify result
      expect(result).toEqual({
        success: false,
        error: 'Access denied'
      });
      
      // Restore the original implementation
      retrieveEncryptedDataSpy.mockRestore();
    });
    
    it('should return error if session data not found', async () => {
      // Set up S3 listObjectsV2 mock to return empty result
      s3Mock.promise.mockResolvedValue({
        Contents: []
      });
      
      // Call the function
      const result = await secureStorage.getSessionData(
        'non-existent-session',
        'provider-123',
        'provider'
      );
      
      // Verify result
      expect(result).toEqual({
        success: false,
        error: 'Session data not found'
      });
    });
  });
});
