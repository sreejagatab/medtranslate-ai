/**
 * Unit tests for the Test Data Manager
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const testDataManager = require('../utils/test-data-manager');

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn()
}));

// Mock axios
jest.mock('axios', () => jest.fn());

describe('Test Data Manager', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createTestProvider', () => {
    it('should login if provider already exists', async () => {
      // Set up axios mock to return successful login
      axios.mockResolvedValueOnce({
        status: 200,
        data: {
          token: 'mock-token',
          user: {
            id: 'provider-123',
            name: 'Test Provider',
            email: 'test-provider@example.com',
            role: 'doctor'
          }
        }
      });
      
      // Call the function
      const result = await testDataManager.createTestProvider();
      
      // Verify axios was called with login request
      expect(axios).toHaveBeenCalledWith({
        url: expect.stringContaining('/auth/login'),
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        data: expect.objectContaining({
          email: 'test-provider@example.com',
          password: 'testpassword123'
        })
      });
      
      // Verify result
      expect(result).toEqual(expect.objectContaining({
        email: 'test-provider@example.com',
        password: 'testpassword123',
        token: 'mock-token'
      }));
    });
    
    it('should register if provider does not exist', async () => {
      // Set up axios mock to return failed login, then successful register, then successful login
      axios.mockResolvedValueOnce({
        status: 401,
        data: {
          success: false,
          error: 'Invalid email or password'
        }
      });
      
      axios.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          user: {
            id: 'provider-123',
            name: 'Test Provider',
            email: 'test-provider@example.com',
            role: 'doctor'
          }
        }
      });
      
      axios.mockResolvedValueOnce({
        status: 200,
        data: {
          token: 'mock-token',
          user: {
            id: 'provider-123',
            name: 'Test Provider',
            email: 'test-provider@example.com',
            role: 'doctor'
          }
        }
      });
      
      // Call the function
      const result = await testDataManager.createTestProvider();
      
      // Verify axios was called with register request
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        url: expect.stringContaining('/auth/register'),
        method: 'POST',
        data: expect.objectContaining({
          email: 'test-provider@example.com',
          password: 'testpassword123'
        })
      }));
      
      // Verify result
      expect(result).toEqual(expect.objectContaining({
        email: 'test-provider@example.com',
        password: 'testpassword123',
        token: 'mock-token'
      }));
    });
  });
  
  describe('createTestSession', () => {
    it('should create a test session', async () => {
      // Set up axios mock to return successful session creation
      axios.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          sessionId: 'session-123',
          providerName: 'Test Provider',
          medicalContext: 'general'
        }
      });
      
      // Call the function
      const result = await testDataManager.createTestSession('mock-token', 'general', 'es');
      
      // Verify axios was called with session creation request
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        url: expect.stringContaining('/sessions'),
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token'
        }),
        data: expect.objectContaining({
          medicalContext: 'general',
          patientLanguage: 'es'
        })
      }));
      
      // Verify result
      expect(result).toEqual(expect.objectContaining({
        success: true,
        sessionId: 'session-123'
      }));
    });
  });
  
  describe('generatePatientToken', () => {
    it('should generate a patient token', async () => {
      // Set up axios mock to return successful token generation
      axios.mockResolvedValueOnce({
        status: 200,
        data: {
          token: 'mock-patient-token',
          sessionCode: '123456'
        }
      });
      
      // Call the function
      const result = await testDataManager.generatePatientToken('session-123', 'mock-token', 'es');
      
      // Verify axios was called with token generation request
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        url: expect.stringContaining('/sessions/patient-token'),
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token'
        }),
        data: expect.objectContaining({
          sessionId: 'session-123',
          language: 'es'
        })
      }));
      
      // Verify result
      expect(result).toEqual(expect.objectContaining({
        token: 'mock-patient-token',
        sessionCode: '123456'
      }));
    });
  });
  
  describe('createTestAudioFile', () => {
    it('should return existing file if it exists', async () => {
      // Set up fs mock to return true for existsSync
      fs.existsSync.mockReturnValueOnce(true);
      
      // Call the function
      const result = await testDataManager.createTestAudioFile('test-audio.mp3');
      
      // Verify fs.existsSync was called
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('test-audio.mp3'));
      
      // Verify fs.writeFileSync was not called
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      
      // Verify result
      expect(result).toContain('test-audio.mp3');
    });
    
    it('should create a new file if it does not exist', async () => {
      // Set up fs mock to return false for existsSync
      fs.existsSync.mockReturnValueOnce(false);
      
      // Call the function
      const result = await testDataManager.createTestAudioFile('test-audio.mp3');
      
      // Verify fs.existsSync was called
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('test-audio.mp3'));
      
      // Verify fs.writeFileSync was called
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test-audio.mp3'),
        expect.any(Buffer)
      );
      
      // Verify result
      expect(result).toContain('test-audio.mp3');
    });
  });
  
  describe('createTestMedicalTextFile', () => {
    it('should return existing file if it exists', async () => {
      // Set up fs mock to return true for existsSync
      fs.existsSync.mockReturnValueOnce(true);
      
      // Call the function
      const result = await testDataManager.createTestMedicalTextFile('long-medical-text.txt');
      
      // Verify fs.existsSync was called
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('long-medical-text.txt'));
      
      // Verify fs.writeFileSync was not called
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      
      // Verify result
      expect(result).toContain('long-medical-text.txt');
    });
    
    it('should create a new file if it does not exist', async () => {
      // Set up fs mock to return false for existsSync
      fs.existsSync.mockReturnValueOnce(false);
      
      // Call the function
      const result = await testDataManager.createTestMedicalTextFile('long-medical-text.txt');
      
      // Verify fs.existsSync was called
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('long-medical-text.txt'));
      
      // Verify fs.writeFileSync was called
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('long-medical-text.txt'),
        expect.any(String)
      );
      
      // Verify result
      expect(result).toContain('long-medical-text.txt');
    });
  });
  
  describe('cleanupTestData', () => {
    it('should clean up test sessions', async () => {
      // Set up axios mock to return successful login, sessions list, and session end
      axios.mockResolvedValueOnce({
        status: 200,
        data: {
          token: 'mock-token'
        }
      });
      
      axios.mockResolvedValueOnce({
        status: 200,
        data: {
          sessions: [
            {
              sessionId: 'session-123',
              status: 'active'
            },
            {
              sessionId: 'session-456',
              status: 'ended'
            }
          ]
        }
      });
      
      axios.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true
        }
      });
      
      // Call the function
      await testDataManager.cleanupTestData({ sessions: true, files: false });
      
      // Verify axios was called with session end request
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        url: expect.stringContaining('/sessions/session-123/end'),
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token'
        })
      }));
    });
    
    it('should clean up test files', async () => {
      // Set up fs mock to return test files
      fs.readdirSync.mockReturnValueOnce(['test-file1.txt', 'test-file2.txt', 'regular-file.txt']);
      
      // Call the function
      await testDataManager.cleanupTestData({ sessions: false, files: true });
      
      // Verify fs.readdirSync was called
      expect(fs.readdirSync).toHaveBeenCalled();
      
      // Verify fs.unlinkSync was called for test files
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('test-file1.txt'));
      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('test-file2.txt'));
    });
  });
});
