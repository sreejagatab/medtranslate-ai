/**
 * Integration tests for Edge Server and Translation Module
 */

const request = require('supertest');
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Import setup
require('./setup');

// Mock child_process.spawn for Python processes
jest.mock('child_process', () => {
  const originalModule = jest.requireActual('child_process');
  
  return {
    ...originalModule,
    spawn: jest.fn((command, args) => {
      // Check if this is a call to the Python inference script
      if (args[0].includes('inference.py')) {
        const mockProcess = {
          stdout: {
            on: (event, callback) => {
              if (event === 'data') {
                // Return mock translation result
                callback(JSON.stringify({
                  translatedText: 'Hola mundo',
                  confidence: 'high',
                  processingTime: 0.123
                }));
              }
              return mockProcess.stdout;
            }
          },
          stderr: {
            on: (event, callback) => {
              return mockProcess.stderr;
            }
          },
          on: (event, callback) => {
            if (event === 'close') {
              callback(0); // Exit code 0 (success)
            }
          }
        };
        return mockProcess;
      }
      
      // For other spawn calls, use the original implementation
      return originalModule.spawn(command, args);
    })
  };
});

describe('Edge Server and Translation Module Integration', () => {
  let app;
  let server;
  
  beforeAll(() => {
    // Load the modules after mocking
    const { translateLocally } = require('../../edge/app/translation');
    const { cacheManager } = require('../../edge/app/cache');
    const { syncWithCloud } = require('../../edge/app/sync');
    
    // Create express app
    app = express();
    app.use(express.json());
    
    // Define endpoints
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        onlineStatus: 'connected',
        modelStatus: 'loaded',
        version: '1.0.0'
      });
    });
    
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
        
        res.json({
          ...result,
          source: 'local'
        });
      } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Start server
    server = app.listen(3001);
  });
  
  afterAll((done) => {
    // Close server
    server.close(done);
  });
  
  it('should return health status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      onlineStatus: 'connected',
      modelStatus: 'loaded',
      version: '1.0.0'
    });
  });
  
  it('should translate text using the translation module', async () => {
    const response = await request(app)
      .post('/translate')
      .send({
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      confidence: 'high',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general',
      source: 'local'
    }));
  });
  
  it('should return cached translation on second request', async () => {
    // First request to cache the translation
    await request(app)
      .post('/translate')
      .send({
        text: 'Hello again',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    // Second request should use cache
    const response = await request(app)
      .post('/translate')
      .send({
        text: 'Hello again',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      translatedText: 'Hola mundo',
      confidence: 'high',
      source: 'cache'
    }));
  });
  
  it('should handle translation errors', async () => {
    // Temporarily modify the spawn mock to simulate an error
    const originalSpawn = spawn;
    spawn.mockImplementationOnce((command, args) => {
      const mockProcess = {
        stdout: {
          on: (event, callback) => {
            return mockProcess.stdout;
          }
        },
        stderr: {
          on: (event, callback) => {
            if (event === 'data') {
              callback('Python error message');
            }
            return mockProcess.stderr;
          }
        },
        on: (event, callback) => {
          if (event === 'close') {
            callback(1); // Exit code 1 (error)
          }
        }
      };
      return mockProcess;
    });
    
    const response = await request(app)
      .post('/translate')
      .send({
        text: 'Error test',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
    
    // Restore the original mock
    spawn.mockImplementation(originalSpawn);
  });
});
