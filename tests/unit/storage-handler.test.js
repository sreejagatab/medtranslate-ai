/**
 * Unit tests for the Storage Handler
 */

const storageHandler = require('../../backend/lambda/storage/handler');
const secureStorage = require('../../backend/lambda/storage/secure-storage');
const authService = require('../../backend/lambda/auth/auth-service');

// Mock secure-storage
const mockSecureStorage = {
  storeConversationTranscript: jest.fn(),
  getSessionData: jest.fn(),
  retrieveEncryptedData: jest.fn(),
  deleteSessionData: jest.fn()
};
jest.mock('../../backend/lambda/storage/secure-storage', () => mockSecureStorage);

// Mock auth-service
const mockAuthService = {
  verifyToken: jest.fn()
};
jest.mock('../../backend/lambda/auth/auth-service', () => mockAuthService);

describe('Storage Handler', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeTranscript', () => {
    it('should store a conversation transcript', async () => {
      // Set up mocks
      secureStorage.storeConversationTranscript.mockResolvedValue({
        success: true,
        objectKey: 'sessions/session-123/transcript/1234567890',
        expirationDate: '2023-12-31T00:00:00Z'
      });

      // Create mock event
      const event = {
        headers: {
          Authorization: 'Bearer valid-token'
        },
        body: JSON.stringify({
          sessionId: 'session-123',
          messages: [
            {
              type: 'translation',
              messageId: 'msg-1',
              originalText: 'Hello',
              translatedText: 'Hola',
              sourceLanguage: 'en',
              targetLanguage: 'es',
              timestamp: '2023-01-01T12:00:00Z'
            }
          ],
          sessionInfo: {
            providerId: 'provider-123',
            providerName: 'Dr. Smith',
            medicalContext: 'general',
            patientLanguage: 'es',
            startTime: '2023-01-01T12:00:00Z'
          }
        })
      };

      // Set up auth service mock
      authService.verifyToken.mockResolvedValue({
        sub: 'provider-123',
        type: 'provider'
      });

      // Call the function
      const result = await storageHandler.storeTranscript(event);

      // Verify token was verified
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');

      // Verify secure storage was called
      expect(secureStorage.storeConversationTranscript).toHaveBeenCalledWith(
        'session-123',
        expect.any(Array),
        expect.objectContaining({
          providerId: 'provider-123',
          providerName: 'Dr. Smith',
          medicalContext: 'general'
        })
      );

      // Verify response
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        objectKey: 'sessions/session-123/transcript/1234567890',
        expirationDate: '2023-12-31T00:00:00Z'
      });
    });

    it('should return error for missing parameters', async () => {
      // Create mock event with missing parameters
      const event = {
        headers: {
          Authorization: 'Bearer valid-token'
        },
        body: JSON.stringify({
          sessionId: 'session-123'
          // Missing messages and sessionInfo
        })
      };

      // Set up auth service mock
      authService.verifyToken.mockResolvedValue({
        sub: 'provider-123',
        type: 'provider'
      });

      // Call the function
      const result = await storageHandler.storeTranscript(event);

      // Verify response
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: expect.stringContaining('Missing required parameters')
      });
    });

    it('should return error for unauthorized access', async () => {
      // Create mock event
      const event = {
        headers: {
          Authorization: 'Bearer invalid-token'
        },
        body: JSON.stringify({
          sessionId: 'session-123',
          messages: [],
          sessionInfo: {}
        })
      };

      // Set up auth service mock to return null (invalid token)
      authService.verifyToken.mockResolvedValue(null);

      // Call the function
      const result = await storageHandler.storeTranscript(event);

      // Verify response
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should handle storage errors gracefully', async () => {
      // Set up mocks to throw an error
      secureStorage.storeConversationTranscript.mockRejectedValue(new Error('Storage error'));

      // Create mock event
      const event = {
        headers: {
          Authorization: 'Bearer valid-token'
        },
        body: JSON.stringify({
          sessionId: 'session-123',
          messages: [],
          sessionInfo: {}
        })
      };

      // Set up auth service mock
      authService.verifyToken.mockResolvedValue({
        sub: 'provider-123',
        type: 'provider'
      });

      // Call the function
      const result = await storageHandler.storeTranscript(event);

      // Verify response
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Failed to store transcript',
        message: 'Storage error'
      });
    });
  });

  describe('getSessionData', () => {
    it('should retrieve session data', async () => {
      // Set up mocks
      secureStorage.getSessionData.mockResolvedValue({
        success: true,
        sessionData: {
          sessionId: 'session-123',
          providerId: 'provider-123',
          providerName: 'Dr. Smith',
          medicalContext: 'general',
          messages: [
            {
              type: 'translation',
              messageId: 'msg-1',
              originalText: 'Hello',
              translatedText: 'Hola'
            }
          ]
        }
      });

      // Create mock event
      const event = {
        headers: {
          Authorization: 'Bearer valid-token'
        },
        pathParameters: {
          sessionId: 'session-123'
        }
      };

      // Set up auth service mock
      authService.verifyToken.mockResolvedValue({
        sub: 'provider-123',
        type: 'provider'
      });

      // Call the function
      const result = await storageHandler.getSessionData(event);

      // Verify token was verified
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');

      // Verify secure storage was called
      expect(secureStorage.getSessionData).toHaveBeenCalledWith(
        'session-123',
        'provider-123',
        'provider'
      );

      // Verify response
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        sessionData: expect.objectContaining({
          sessionId: 'session-123',
          providerId: 'provider-123',
          messages: expect.any(Array)
        })
      });
    });

    it('should return error for unauthorized access', async () => {
      // Create mock event
      const event = {
        headers: {
          Authorization: 'Bearer invalid-token'
        },
        pathParameters: {
          sessionId: 'session-123'
        }
      };

      // Set up auth service mock to return null (invalid token)
      authService.verifyToken.mockResolvedValue(null);

      // Call the function
      const result = await storageHandler.getSessionData(event);

      // Verify response
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should handle retrieval errors gracefully', async () => {
      // Set up mocks to throw an error
      secureStorage.getSessionData.mockRejectedValue(new Error('Retrieval error'));

      // Create mock event
      const event = {
        headers: {
          Authorization: 'Bearer valid-token'
        },
        pathParameters: {
          sessionId: 'session-123'
        }
      };

      // Set up auth service mock
      authService.verifyToken.mockResolvedValue({
        sub: 'provider-123',
        type: 'provider'
      });

      // Call the function
      const result = await storageHandler.getSessionData(event);

      // Verify response
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Failed to retrieve session data',
        message: 'Retrieval error'
      });
    });
  });
});
