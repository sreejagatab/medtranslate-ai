/**
 * Integration tests for Edge Server and Sync Module
 */

const request = require('supertest');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import setup
require('./setup');

// Mock axios
jest.mock('axios');

describe('Edge Server and Sync Module Integration', () => {
  let app;
  let server;
  let syncWithCloud;
  let mockCloudServer;
  
  beforeAll(() => {
    // Load the sync module
    syncWithCloud = require('../../edge/app/sync').syncWithCloud;
    
    // Create express app for edge server
    app = express();
    app.use(express.json());
    
    // Define endpoints for testing sync
    app.post('/queue-translation', (req, res) => {
      const { text, sourceLanguage, targetLanguage, context, result } = req.body;
      
      syncWithCloud.queueTranslation(
        text, sourceLanguage, targetLanguage, context, result
      );
      
      res.json({ success: true });
    });
    
    app.post('/sync', async (req, res) => {
      try {
        await syncWithCloud.syncCachedData();
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.get('/connection', async (req, res) => {
      try {
        const result = await syncWithCloud.testConnection();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.post('/check-updates', async (req, res) => {
      try {
        await syncWithCloud.checkForModelUpdates();
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Start edge server
    server = app.listen(3003);
    
    // Create mock cloud server
    mockCloudServer = express();
    mockCloudServer.use(express.json());
    
    mockCloudServer.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });
    
    mockCloudServer.post('/sync', (req, res) => {
      res.json({ success: true, synced: req.body.items.length });
    });
    
    mockCloudServer.get('/models/updates', (req, res) => {
      res.json({
        updates: [
          {
            filename: 'en-fr.bin',
            version: '1.0',
            size: 1000,
            downloadUrl: 'http://localhost:4000/models/en-fr.bin'
          }
        ]
      });
    });
    
    // Start mock cloud server
    mockCloudServer.listen(4000);
  });
  
  afterAll((done) => {
    // Close servers
    server.close(() => {
      mockCloudServer.close(done);
    });
  });
  
  beforeEach(() => {
    // Reset axios mocks
    axios.mockReset();
  });
  
  it('should queue a translation for synchronization', async () => {
    const response = await request(app)
      .post('/queue-translation')
      .send({
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general',
        result: {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    
    // Verify queue file exists
    const queueFile = path.join(process.env.SYNC_DIR, 'sync_queue.json');
    expect(fs.existsSync(queueFile)).toBe(true);
    
    // Verify queue content
    const queueContent = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
    expect(queueContent.length).toBeGreaterThan(0);
    expect(queueContent[0]).toEqual(expect.objectContaining({
      type: 'translation',
      data: expect.objectContaining({
        originalText: 'Hello world',
        translatedText: 'Hola mundo'
      })
    }));
  });
  
  it('should test connection to cloud API', async () => {
    // Mock axios.get to return success
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { status: 'healthy' }
    });
    
    const response = await request(app).get('/connection');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      connected: true,
      status: 'healthy'
    });
    
    // Verify axios.get was called with correct URL
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:4000/health',
      { timeout: 5000 }
    );
  });
  
  it('should handle connection errors', async () => {
    // Mock axios.get to throw an error
    axios.get.mockRejectedValueOnce(new Error('Connection timeout'));
    
    const response = await request(app).get('/connection');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      connected: false,
      error: 'Connection timeout'
    });
  });
  
  it('should sync cached data with cloud', async () => {
    // Queue a translation
    await request(app)
      .post('/queue-translation')
      .send({
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general',
        result: {
          translatedText: 'Hola mundo',
          confidence: 'high'
        }
      });
    
    // Mock axios.post to return success
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: { success: true }
    });
    
    const response = await request(app).post('/sync');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    
    // Verify axios.post was called with correct URL and data
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:4000/sync',
      expect.objectContaining({
        items: expect.any(Array),
        deviceId: 'test-device-integration'
      }),
      { timeout: 10000 }
    );
  });
  
  it('should check for model updates', async () => {
    // Mock getCurrentModelVersions
    const getCurrentModelVersionsSpy = jest.spyOn(syncWithCloud, 'getCurrentModelVersions')
      .mockReturnValue({
        'en-es.bin': {
          size: 1000,
          modified: '2023-01-01T00:00:00.000Z'
        }
      });
    
    // Mock axios.get to return updates
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        updates: [
          {
            filename: 'en-fr.bin',
            version: '1.0',
            size: 1000,
            downloadUrl: 'http://localhost:4000/models/en-fr.bin'
          }
        ]
      }
    });
    
    // Mock downloadModelUpdate
    const downloadModelUpdateSpy = jest.spyOn(syncWithCloud, 'downloadModelUpdate')
      .mockResolvedValue(true);
    
    const response = await request(app).post('/check-updates');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    
    // Verify axios.get was called with correct URL
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:4000/models/updates',
      expect.objectContaining({
        params: expect.objectContaining({
          deviceId: 'test-device-integration'
        })
      })
    );
    
    // Verify downloadModelUpdate was called
    expect(downloadModelUpdateSpy).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'en-fr.bin',
      version: '1.0'
    }));
    
    // Restore mocks
    getCurrentModelVersionsSpy.mockRestore();
    downloadModelUpdateSpy.mockRestore();
  });
  
  it('should handle model update errors', async () => {
    // Mock getCurrentModelVersions
    const getCurrentModelVersionsSpy = jest.spyOn(syncWithCloud, 'getCurrentModelVersions')
      .mockReturnValue({});
    
    // Mock axios.get to throw an error
    axios.get.mockRejectedValueOnce(new Error('API error'));
    
    const response = await request(app).post('/check-updates');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    
    // Restore mock
    getCurrentModelVersionsSpy.mockRestore();
  });
});
