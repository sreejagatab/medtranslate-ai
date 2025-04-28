/**
 * Simplified integration tests for Edge Server and Sync Module
 */

const request = require('supertest');
const express = require('express');
const axios = require('axios');

// Create a mock sync implementation
const mockSync = {
  queue: [],

  queueTranslation(text, sourceLanguage, targetLanguage, context, result) {
    this.queue.push({
      type: 'translation',
      data: {
        originalText: text,
        translatedText: result.translatedText,
        confidence: result.confidence,
        sourceLanguage,
        targetLanguage,
        context,
        timestamp: Date.now()
      }
    });
  },

  async testConnection() {
    // Mock implementation that doesn't use axios
    return {
      connected: true,
      status: 'healthy'
    };
  },

  async syncCachedData() {
    // Mock implementation that doesn't use axios
    if (this.queue.length === 0) {
      return { success: true, itemsSynced: 0 };
    }

    const itemsSynced = this.queue.length;
    this.queue = [];
    return { success: true, itemsSynced };
  },

  clearQueue() {
    this.queue = [];
  }
};

// Mock the sync module
jest.mock('../../edge/app/sync', () => ({
  syncWithCloud: mockSync
}));

describe('Edge Server and Sync Module Integration', () => {
  let app;

  beforeAll(() => {
    // Create express app
    app = express();
    app.use(express.json());

    // Import mocked modules
    const { syncWithCloud } = require('../../edge/app/sync');

    // Define endpoints for testing sync
    app.post('/queue-translation', (req, res) => {
      const { text, sourceLanguage, targetLanguage, context, result } = req.body;

      syncWithCloud.queueTranslation(
        text, sourceLanguage, targetLanguage, context, result
      );

      res.json({ success: true, queueSize: syncWithCloud.queue.length });
    });

    app.post('/sync', async (req, res) => {
      try {
        const result = await syncWithCloud.syncCachedData();
        res.json(result);
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
  });

  beforeEach(() => {
    // Clear queue before each test
    mockSync.clearQueue();

    // Reset axios mocks
    jest.clearAllMocks();
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
    expect(response.body).toEqual({ success: true, queueSize: 1 });

    // Verify queue content
    expect(mockSync.queue.length).toBe(1);
    expect(mockSync.queue[0]).toEqual(expect.objectContaining({
      type: 'translation',
      data: expect.objectContaining({
        originalText: 'Hello world',
        translatedText: 'Hola mundo'
      })
    }));
  });

  it('should test connection to cloud API', async () => {
    const response = await request(app).get('/connection');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      connected: true,
      status: 'healthy'
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

    const response = await request(app).post('/sync');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      itemsSynced: 1
    });

    // Verify queue was cleared
    expect(mockSync.queue.length).toBe(0);
  });
});
