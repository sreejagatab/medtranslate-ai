/**
 * Unit tests for the Edge Sync Module
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { syncWithCloud } = require('../../edge/app/sync');
const { cacheManager } = require('../../edge/app/cache');

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('axios');
jest.mock('../../edge/app/cache');

describe('Edge Sync Module', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock path.join to return predictable paths
    path.join.mockImplementation((...args) => args.join('/'));
    
    // Mock process.env
    process.env.SYNC_DIR = '/sync';
    process.env.CLOUD_API_URL = 'https://api.medtranslate.ai';
    process.env.DEVICE_ID = 'test-device-123';
    
    // Mock fs.existsSync to return false for sync queue file
    fs.existsSync.mockReturnValue(false);
    
    // Mock fs.mkdirSync
    fs.mkdirSync.mockImplementation(() => {});
  });
  
  describe('testConnection', () => {
    it('should return connected: true when API is reachable', async () => {
      // Mock axios.get to return success
      axios.get.mockResolvedValue({
        status: 200,
        data: { status: 'healthy' }
      });
      
      // Call the function
      const result = await syncWithCloud.testConnection();
      
      // Verify axios.get was called with correct URL
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.medtranslate.ai/health',
        { timeout: 5000 }
      );
      
      // Verify result
      expect(result).toEqual({
        connected: true,
        status: 'healthy'
      });
    });
    
    it('should return connected: false when API is not reachable', async () => {
      // Mock axios.get to throw an error
      axios.get.mockRejectedValue(new Error('Connection timeout'));
      
      // Call the function
      const result = await syncWithCloud.testConnection();
      
      // Verify axios.get was called with correct URL
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.medtranslate.ai/health',
        { timeout: 5000 }
      );
      
      // Verify result
      expect(result).toEqual({
        connected: false,
        error: 'Connection timeout'
      });
    });
  });
  
  describe('queueTranslation', () => {
    it('should add a translation to the sync queue', () => {
      // Mock Date.now to return a predictable value
      const mockNow = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      // Mock fs.writeFileSync
      fs.writeFileSync.mockImplementation(() => {});
      
      // Call the function
      syncWithCloud.queueTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      );
      
      // Verify fs.writeFileSync was not called (queue length < 10)
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      
      // Add more items to trigger save
      for (let i = 0; i < 10; i++) {
        syncWithCloud.queueTranslation(
          `Hello world ${i}`,
          'en',
          'es',
          'general',
          {
            translatedText: `Hola mundo ${i}`,
            confidence: 'high'
          }
        );
      }
      
      // Verify fs.writeFileSync was called
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/sync/sync_queue.json',
        expect.any(String),
        'utf8'
      );
      
      // Verify the content written to the file
      const fileContent = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(fileContent.length).toBeGreaterThan(0);
      expect(fileContent[0]).toEqual({
        type: 'translation',
        data: {
          originalText: 'Hello world',
          translatedText: 'Hola mundo',
          confidence: 'high',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general'
        },
        timestamp: mockNow
      });
    });
  });
  
  describe('syncCachedData', () => {
    it('should sync cached data with the cloud', async () => {
      // Mock Date.now to return a predictable value
      const mockNow = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      // Add items to the sync queue
      syncWithCloud.queueTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      );
      
      // Mock axios.post to return success
      axios.post.mockResolvedValue({
        status: 200,
        data: { success: true }
      });
      
      // Mock console.log to verify it's called
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Call the function
      await syncWithCloud.syncCachedData();
      
      // Verify axios.post was called with correct arguments
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.medtranslate.ai/sync',
        {
          items: expect.any(Array),
          deviceId: 'test-device-123',
          timestamp: mockNow
        },
        { timeout: 10000 }
      );
      
      // Verify console.log was called
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Syncing'));
      
      // Restore the spy
      consoleLogSpy.mockRestore();
    });
    
    it('should handle empty sync queue', async () => {
      // Mock console.log to verify it's called
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Call the function with empty queue
      await syncWithCloud.syncCachedData();
      
      // Verify axios.post was not called
      expect(axios.post).not.toHaveBeenCalled();
      
      // Verify console.log was called
      expect(consoleLogSpy).toHaveBeenCalledWith('No items in sync queue');
      
      // Restore the spy
      consoleLogSpy.mockRestore();
    });
    
    it('should handle API errors', async () => {
      // Add items to the sync queue
      syncWithCloud.queueTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      );
      
      // Mock axios.post to throw an error
      axios.post.mockRejectedValue(new Error('API error'));
      
      // Mock console.error to verify it's called
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the function
      await syncWithCloud.syncCachedData();
      
      // Verify console.error was called
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error syncing batch'),
        'API error'
      );
      
      // Restore the spy
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('checkForModelUpdates', () => {
    it('should check for and download model updates', async () => {
      // Mock getCurrentModelVersions to return model versions
      const getCurrentModelVersionsSpy = jest.spyOn(syncWithCloud, 'getCurrentModelVersions')
        .mockReturnValue({
          'en-es.bin': {
            size: 1000,
            modified: '2023-01-01T00:00:00.000Z'
          }
        });
      
      // Mock axios.get to return updates
      axios.get.mockResolvedValue({
        status: 200,
        data: {
          updates: [
            {
              filename: 'en-es.bin',
              version: '2.0',
              size: 2000,
              downloadUrl: 'https://api.medtranslate.ai/models/en-es.bin'
            }
          ]
        }
      });
      
      // Mock downloadModelUpdate to return success
      const downloadModelUpdateSpy = jest.spyOn(syncWithCloud, 'downloadModelUpdate')
        .mockResolvedValue(true);
      
      // Mock console.log to verify it's called
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Call the function
      await syncWithCloud.checkForModelUpdates();
      
      // Verify axios.get was called with correct arguments
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.medtranslate.ai/models/updates',
        {
          params: {
            deviceId: 'test-device-123',
            currentVersions: expect.any(Object)
          },
          timeout: 10000
        }
      );
      
      // Verify downloadModelUpdate was called
      expect(downloadModelUpdateSpy).toHaveBeenCalledWith(expect.objectContaining({
        filename: 'en-es.bin',
        version: '2.0'
      }));
      
      // Verify console.log was called
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 model updates'));
      
      // Restore the spies
      getCurrentModelVersionsSpy.mockRestore();
      downloadModelUpdateSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
    
    it('should handle no updates available', async () => {
      // Mock getCurrentModelVersions to return model versions
      const getCurrentModelVersionsSpy = jest.spyOn(syncWithCloud, 'getCurrentModelVersions')
        .mockReturnValue({
          'en-es.bin': {
            size: 1000,
            modified: '2023-01-01T00:00:00.000Z'
          }
        });
      
      // Mock axios.get to return no updates
      axios.get.mockResolvedValue({
        status: 200,
        data: { updates: [] }
      });
      
      // Mock console.log to verify it's called
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Call the function
      await syncWithCloud.checkForModelUpdates();
      
      // Verify console.log was called
      expect(consoleLogSpy).toHaveBeenCalledWith('No model updates available');
      
      // Restore the spies
      getCurrentModelVersionsSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
    
    it('should handle API errors', async () => {
      // Mock getCurrentModelVersions to return model versions
      const getCurrentModelVersionsSpy = jest.spyOn(syncWithCloud, 'getCurrentModelVersions')
        .mockReturnValue({});
      
      // Mock axios.get to throw an error
      axios.get.mockRejectedValue(new Error('API error'));
      
      // Mock console.error to verify it's called
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the function
      await syncWithCloud.checkForModelUpdates();
      
      // Verify console.error was called
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking for model updates:',
        'API error'
      );
      
      // Restore the spies
      getCurrentModelVersionsSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('downloadModelUpdate', () => {
    it('should download a model update', async () => {
      // Mock fs.createWriteStream
      const mockWriter = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
          return mockWriter;
        })
      };
      fs.createWriteStream.mockReturnValue(mockWriter);
      
      // Mock axios for file download
      const mockStream = {
        pipe: jest.fn()
      };
      axios.mockResolvedValue({
        data: mockStream
      });
      
      // Mock console.log to verify it's called
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Call the function
      const result = await syncWithCloud.downloadModelUpdate({
        filename: 'en-es.bin',
        version: '2.0',
        size: 2000,
        downloadUrl: 'https://api.medtranslate.ai/models/en-es.bin'
      });
      
      // Verify axios was called with correct arguments
      expect(axios).toHaveBeenCalledWith({
        method: 'get',
        url: 'https://api.medtranslate.ai/models/en-es.bin',
        responseType: 'stream',
        timeout: 300000
      });
      
      // Verify fs.createWriteStream was called
      expect(fs.createWriteStream).toHaveBeenCalled();
      
      // Verify stream.pipe was called
      expect(mockStream.pipe).toHaveBeenCalledWith(mockWriter);
      
      // Verify result
      expect(result).toBe(true);
      
      // Verify console.log was called
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully downloaded'));
      
      // Restore the spy
      consoleLogSpy.mockRestore();
    });
    
    it('should handle download errors', async () => {
      // Mock axios to throw an error
      axios.mockRejectedValue(new Error('Download error'));
      
      // Mock console.error to verify it's called
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the function
      const result = await syncWithCloud.downloadModelUpdate({
        filename: 'en-es.bin',
        version: '2.0',
        size: 2000,
        downloadUrl: 'https://api.medtranslate.ai/models/en-es.bin'
      });
      
      // Verify result
      expect(result).toBe(false);
      
      // Verify console.error was called
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error downloading model update'),
        'Download error'
      );
      
      // Restore the spy
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('getCurrentModelVersions', () => {
    it('should return current model versions', () => {
      // Mock process.env
      process.env.MODEL_DIR = '/models';
      
      // Mock fs.readdirSync to return model files
      fs.readdirSync.mockReturnValue(['en-es.bin', 'en-fr.bin', 'README.txt']);
      
      // Mock fs.statSync to return file stats
      fs.statSync.mockImplementation((filePath) => ({
        size: 1000,
        mtime: new Date('2023-01-01T00:00:00.000Z')
      }));
      
      // Call the function
      const result = syncWithCloud.getCurrentModelVersions();
      
      // Verify fs.readdirSync was called
      expect(fs.readdirSync).toHaveBeenCalledWith('/models');
      
      // Verify fs.statSync was called for each model file
      expect(fs.statSync).toHaveBeenCalledWith('/models/en-es.bin');
      expect(fs.statSync).toHaveBeenCalledWith('/models/en-fr.bin');
      
      // Verify result
      expect(result).toEqual({
        'en-es.bin': {
          size: 1000,
          modified: '2023-01-01T00:00:00.000Z'
        },
        'en-fr.bin': {
          size: 1000,
          modified: '2023-01-01T00:00:00.000Z'
        }
      });
    });
    
    it('should handle errors', () => {
      // Mock fs.readdirSync to throw an error
      fs.readdirSync.mockImplementation(() => {
        throw new Error('Directory not found');
      });
      
      // Mock console.error to verify it's called
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the function
      const result = syncWithCloud.getCurrentModelVersions();
      
      // Verify result is an empty object
      expect(result).toEqual({});
      
      // Verify console.error was called
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting current model versions:',
        expect.any(Error)
      );
      
      // Restore the spy
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('saveQueueToDisk', () => {
    it('should save the sync queue to disk', () => {
      // Add an item to the sync queue
      syncWithCloud.queueTranslation(
        'Hello world',
        'en',
        'es',
        'general',
        {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      );
      
      // Mock console.log to verify it's called
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Call the function
      syncWithCloud.saveQueueToDisk();
      
      // Verify fs.writeFileSync was called with correct arguments
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/sync/sync_queue.json',
        expect.any(String),
        'utf8'
      );
      
      // Verify console.log was called
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Saved'));
      
      // Restore the spy
      consoleLogSpy.mockRestore();
    });
    
    it('should handle errors when saving to disk', () => {
      // Mock fs.writeFileSync to throw an error
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });
      
      // Mock console.error to verify it's called
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the function
      syncWithCloud.saveQueueToDisk();
      
      // Verify console.error was called
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error saving sync queue to disk:',
        expect.any(Error)
      );
      
      // Restore the spy
      consoleErrorSpy.mockRestore();
    });
  });
});
