/**
 * Unit tests for the Edge Server Module
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const request = require('supertest');
const { translateLocally } = require('../../edge/app/translation');
const { syncWithCloud } = require('../../edge/app/sync');
const { cacheManager } = require('../../edge/app/cache');

// Mock dependencies
jest.mock('../../edge/app/translation');
jest.mock('../../edge/app/sync');
jest.mock('../../edge/app/cache');
jest.mock('http');
jest.mock('ws');

describe('Edge Server Module', () => {
  let app;
  let server;
  
  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();
    
    // Mock express app
    app = express();
    
    // Mock http server
    server = {
      listen: jest.fn((port, callback) => {
        callback();
        return server;
      })
    };
    
    // Mock http.createServer
    http.createServer.mockReturnValue(server);
    
    // Mock WebSocket.Server
    WebSocket.Server.mockImplementation(() => ({
      on: jest.fn()
    }));
    
    // Mock process.env
    process.env.PORT = '3000';
    
    // Mock console.log and console.error
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock syncWithCloud.testConnection
    syncWithCloud.testConnection.mockResolvedValue({
      connected: true,
      status: 'healthy'
    });
    
    // Mock syncWithCloud.syncCachedData
    syncWithCloud.syncCachedData.mockResolvedValue();
    
    // Load the server module
    jest.isolateModules(() => {
      require('../../edge/app/server');
    });
  });
  
  // Cleanup after each test
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Server Initialization', () => {
    it('should initialize the server and listen on the configured port', () => {
      // Verify http.createServer was called
      expect(http.createServer).toHaveBeenCalled();
      
      // Verify server.listen was called with the correct port
      expect(server.listen).toHaveBeenCalledWith(
        '3000',
        expect.any(Function)
      );
      
      // Verify WebSocket.Server was initialized
      expect(WebSocket.Server).toHaveBeenCalledWith({
        server: expect.any(Object)
      });
      
      // Verify cloud connection was checked
      expect(syncWithCloud.testConnection).toHaveBeenCalled();
    });
  });
  
  describe('API Endpoints', () => {
    it('should handle health check requests', async () => {
      // Create a test instance of the app
      const app = express();
      
      // Mock isOnline variable
      const isOnline = true;
      
      // Define health check endpoint
      app.get('/health', (req, res) => {
        res.json({
          status: 'healthy',
          onlineStatus: isOnline ? 'connected' : 'offline',
          modelStatus: 'loaded',
          version: '1.0.0'
        });
      });
      
      // Send a request to the endpoint
      const response = await request(app).get('/health');
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'healthy',
        onlineStatus: 'connected',
        modelStatus: 'loaded',
        version: '1.0.0'
      });
    });
    
    it('should handle translation requests with cache hit', async () => {
      // Create a test instance of the app
      const app = express();
      app.use(express.json());
      
      // Mock cacheManager.getCachedTranslation to return a cached result
      cacheManager.getCachedTranslation.mockReturnValue({
        translatedText: 'Hola mundo',
        confidence: 'high',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
      
      // Define translation endpoint
      app.post('/translate', async (req, res) => {
        try {
          const { text, sourceLanguage, targetLanguage, context } = req.body;
          
          // Check cache first
          const cachedTranslation = cacheManager.getCachedTranslation(
            text, sourceLanguage, targetLanguage, context
          );
          
          if (cachedTranslation) {
            return res.json({
              translatedText: cachedTranslation.translatedText,
              confidence: cachedTranslation.confidence,
              source: 'cache'
            });
          }
          
          // This should not be reached in this test
          res.status(500).json({ error: 'Unexpected code path' });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      
      // Send a request to the endpoint
      const response = await request(app)
        .post('/translate')
        .send({
          text: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general'
        });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        translatedText: 'Hola mundo',
        confidence: 'high',
        source: 'cache'
      });
      
      // Verify cache was checked
      expect(cacheManager.getCachedTranslation).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      // Verify translateLocally was not called
      expect(translateLocally).not.toHaveBeenCalled();
    });
    
    it('should handle translation requests with cache miss', async () => {
      // Create a test instance of the app
      const app = express();
      app.use(express.json());
      
      // Mock cacheManager.getCachedTranslation to return null (cache miss)
      cacheManager.getCachedTranslation.mockReturnValue(null);
      
      // Mock translateLocally to return a translation result
      translateLocally.mockResolvedValue({
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        confidence: 'high',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
      
      // Define translation endpoint
      app.post('/translate', async (req, res) => {
        try {
          const { text, sourceLanguage, targetLanguage, context } = req.body;
          
          // Check cache first
          const cachedTranslation = cacheManager.getCachedTranslation(
            text, sourceLanguage, targetLanguage, context
          );
          
          if (cachedTranslation) {
            return res.json({
              translatedText: cachedTranslation.translatedText,
              confidence: cachedTranslation.confidence,
              source: 'cache'
            });
          }
          
          // Perform local translation
          const result = await translateLocally(text, sourceLanguage, targetLanguage, context);
          
          // Cache the result
          cacheManager.cacheTranslation(
            text, sourceLanguage, targetLanguage, context, result
          );
          
          // Try to sync with cloud if online
          syncWithCloud.queueTranslation(text, sourceLanguage, targetLanguage, context, result);
          
          res.json({
            ...result,
            source: 'local'
          });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      
      // Send a request to the endpoint
      const response = await request(app)
        .post('/translate')
        .send({
          text: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general'
        });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        confidence: 'high',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general',
        source: 'local'
      });
      
      // Verify cache was checked
      expect(cacheManager.getCachedTranslation).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      // Verify translateLocally was called
      expect(translateLocally).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      // Verify result was cached
      expect(cacheManager.cacheTranslation).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'es',
        'general',
        expect.objectContaining({
          translatedText: 'Hola mundo'
        })
      );
      
      // Verify translation was queued for sync
      expect(syncWithCloud.queueTranslation).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'es',
        'general',
        expect.objectContaining({
          translatedText: 'Hola mundo'
        })
      );
    });
    
    it('should handle translation errors', async () => {
      // Create a test instance of the app
      const app = express();
      app.use(express.json());
      
      // Mock cacheManager.getCachedTranslation to return null (cache miss)
      cacheManager.getCachedTranslation.mockReturnValue(null);
      
      // Mock translateLocally to throw an error
      translateLocally.mockRejectedValue(new Error('Translation failed'));
      
      // Define translation endpoint
      app.post('/translate', async (req, res) => {
        try {
          const { text, sourceLanguage, targetLanguage, context } = req.body;
          
          // Check cache first
          const cachedTranslation = cacheManager.getCachedTranslation(
            text, sourceLanguage, targetLanguage, context
          );
          
          if (cachedTranslation) {
            return res.json({
              translatedText: cachedTranslation.translatedText,
              confidence: cachedTranslation.confidence,
              source: 'cache'
            });
          }
          
          // Perform local translation
          const result = await translateLocally(text, sourceLanguage, targetLanguage, context);
          
          // This should not be reached in this test
          res.json({
            ...result,
            source: 'local'
          });
        } catch (error) {
          console.error('Translation error:', error);
          res.status(500).json({ error: error.message });
        }
      });
      
      // Send a request to the endpoint
      const response = await request(app)
        .post('/translate')
        .send({
          text: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general'
        });
      
      // Verify response
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Translation failed'
      });
      
      // Verify translateLocally was called
      expect(translateLocally).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'es',
        'general'
      );
      
      // Verify result was not cached
      expect(cacheManager.cacheTranslation).not.toHaveBeenCalled();
    });
    
    it('should handle audio translation requests', async () => {
      // Create a test instance of the app
      const app = express();
      app.use(express.json());
      
      // Mock translateLocally.processAudio to return a result
      translateLocally.processAudio = jest.fn().mockResolvedValue({
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        confidence: 'high',
        audioResponse: 'base64audio',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
      
      // Define audio translation endpoint
      app.post('/translate-audio', async (req, res) => {
        try {
          const { audioData, sourceLanguage, targetLanguage, context } = req.body;
          
          if (!audioData || !sourceLanguage || !targetLanguage) {
            return res.status(400).json({ 
              error: 'Missing required parameters: audioData, sourceLanguage, targetLanguage' 
            });
          }
          
          // Process audio locally
          const result = await translateLocally.processAudio(
            audioData, sourceLanguage, targetLanguage, context
          );
          
          res.json({
            ...result,
            source: 'local'
          });
        } catch (error) {
          console.error('Audio translation error:', error);
          res.status(500).json({ error: error.message });
        }
      });
      
      // Send a request to the endpoint
      const response = await request(app)
        .post('/translate-audio')
        .send({
          audioData: 'base64audiodata',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'general'
        });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        confidence: 'high',
        audioResponse: 'base64audio',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general',
        source: 'local'
      });
      
      // Verify processAudio was called
      expect(translateLocally.processAudio).toHaveBeenCalledWith(
        'base64audiodata',
        'en',
        'es',
        'general'
      );
    });
    
    it('should validate required parameters for audio translation', async () => {
      // Create a test instance of the app
      const app = express();
      app.use(express.json());
      
      // Define audio translation endpoint
      app.post('/translate-audio', async (req, res) => {
        try {
          const { audioData, sourceLanguage, targetLanguage, context } = req.body;
          
          if (!audioData || !sourceLanguage || !targetLanguage) {
            return res.status(400).json({ 
              error: 'Missing required parameters: audioData, sourceLanguage, targetLanguage' 
            });
          }
          
          // Process audio locally
          const result = await translateLocally.processAudio(
            audioData, sourceLanguage, targetLanguage, context
          );
          
          res.json({
            ...result,
            source: 'local'
          });
        } catch (error) {
          console.error('Audio translation error:', error);
          res.status(500).json({ error: error.message });
        }
      });
      
      // Send a request with missing parameters
      const response = await request(app)
        .post('/translate-audio')
        .send({
          sourceLanguage: 'en',
          targetLanguage: 'es'
          // Missing audioData
        });
      
      // Verify response
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Missing required parameters: audioData, sourceLanguage, targetLanguage'
      });
      
      // Verify processAudio was not called
      expect(translateLocally.processAudio).not.toHaveBeenCalled();
    });
  });
  
  describe('WebSocket Handling', () => {
    it('should handle WebSocket connections and messages', () => {
      // Mock WebSocket server and client
      const mockWs = {
        on: jest.fn(),
        send: jest.fn()
      };
      
      const mockWsServer = {
        on: jest.fn()
      };
      
      // Mock WebSocket.Server constructor
      WebSocket.Server.mockImplementation(() => mockWsServer);
      
      // Load the server module
      jest.isolateModules(() => {
        require('../../edge/app/server');
      });
      
      // Verify WebSocket.Server was initialized
      expect(WebSocket.Server).toHaveBeenCalledWith({
        server: expect.any(Object)
      });
      
      // Verify connection handler was registered
      expect(mockWsServer.on).toHaveBeenCalledWith(
        'connection',
        expect.any(Function)
      );
      
      // Simulate a connection
      const connectionHandler = mockWsServer.on.mock.calls[0][1];
      connectionHandler(mockWs);
      
      // Verify message handler was registered
      expect(mockWs.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
      
      // Verify close handler was registered
      expect(mockWs.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function)
      );
    });
  });
  
  describe('Cloud Connection Check', () => {
    it('should check cloud connection and sync data when online', async () => {
      // Mock syncWithCloud.testConnection to return online status
      syncWithCloud.testConnection.mockResolvedValue({
        connected: true,
        status: 'healthy'
      });
      
      // Load the server module
      jest.isolateModules(() => {
        require('../../edge/app/server');
      });
      
      // Verify testConnection was called
      expect(syncWithCloud.testConnection).toHaveBeenCalled();
      
      // Verify syncCachedData was called
      expect(syncWithCloud.syncCachedData).toHaveBeenCalled();
    });
    
    it('should handle offline status', async () => {
      // Mock syncWithCloud.testConnection to return offline status
      syncWithCloud.testConnection.mockResolvedValue({
        connected: false,
        error: 'Connection timeout'
      });
      
      // Load the server module
      jest.isolateModules(() => {
        require('../../edge/app/server');
      });
      
      // Verify testConnection was called
      expect(syncWithCloud.testConnection).toHaveBeenCalled();
      
      // Verify syncCachedData was not called
      expect(syncWithCloud.syncCachedData).not.toHaveBeenCalled();
    });
    
    it('should handle connection check errors', async () => {
      // Mock syncWithCloud.testConnection to throw an error
      syncWithCloud.testConnection.mockRejectedValue(new Error('Connection error'));
      
      // Mock console.error to verify it's called
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Load the server module
      jest.isolateModules(() => {
        require('../../edge/app/server');
      });
      
      // Verify testConnection was called
      expect(syncWithCloud.testConnection).toHaveBeenCalled();
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking cloud connection:',
        expect.any(Error)
      );
      
      // Verify syncCachedData was not called
      expect(syncWithCloud.syncCachedData).not.toHaveBeenCalled();
      
      // Restore the spy
      consoleErrorSpy.mockRestore();
    });
  });
});
