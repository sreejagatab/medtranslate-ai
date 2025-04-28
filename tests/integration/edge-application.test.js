/**
 * Integration tests for the complete Edge Application
 */

const request = require('supertest');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const { spawn } = require('child_process');

// Import setup
require('./setup');

// Mock dependencies
jest.mock('axios');
jest.mock('child_process', () => {
  const originalModule = jest.requireActual('child_process');
  
  return {
    ...originalModule,
    spawn: jest.fn((command, args) => {
      // Check if this is a call to the Python inference script
      if (args[0] && (args[0].includes('inference.py') || args[0].includes('audio_processor.py'))) {
        const mockProcess = {
          stdout: {
            on: (event, callback) => {
              if (event === 'data') {
                // Return mock translation result
                callback(JSON.stringify({
                  translatedText: 'Hola mundo',
                  confidence: 'high',
                  processingTime: 0.123,
                  transcription: args[0].includes('audio_processor.py') ? 'Hello world' : undefined,
                  audioResponse: args[0].includes('audio_processor.py') ? 'base64audio' : undefined
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

describe('Edge Application Integration', () => {
  let server;
  let baseUrl;
  let wss;
  
  beforeAll((done) => {
    // Mock axios for cloud connection
    axios.get.mockResolvedValue({
      status: 200,
      data: { status: 'healthy' }
    });
    
    // Load the server module
    jest.isolateModules(() => {
      server = require('../../edge/app/server');
      
      // Wait for server to start
      setTimeout(() => {
        baseUrl = `http://localhost:${process.env.PORT}`;
        done();
      }, 1000);
    });
  });
  
  afterAll((done) => {
    // Close server
    if (server && server.close) {
      server.close(done);
    } else {
      done();
    }
  });
  
  it('should return health status', async () => {
    const response = await request(baseUrl).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      status: 'healthy'
    }));
  });
  
  it('should translate text', async () => {
    const response = await request(baseUrl)
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
      context: 'general'
    }));
  });
  
  it('should translate audio', async () => {
    const response = await request(baseUrl)
      .post('/translate-audio')
      .send({
        audioData: 'base64audiodata',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      confidence: 'high',
      audioResponse: 'base64audio',
      sourceLanguage: 'en',
      targetLanguage: 'es'
    }));
  });
  
  it('should validate required parameters for audio translation', async () => {
    const response = await request(baseUrl)
      .post('/translate-audio')
      .send({
        sourceLanguage: 'en',
        targetLanguage: 'es'
        // Missing audioData
      });
    
    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({
      error: expect.stringContaining('Missing required parameters')
    }));
  });
  
  it('should use cache for repeated translations', async () => {
    // First request to cache the translation
    await request(baseUrl)
      .post('/translate')
      .send({
        text: 'Hello cache',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    
    // Reset spawn mock to verify it's not called again
    spawn.mockClear();
    
    // Second request should use cache
    const response = await request(baseUrl)
      .post('/translate')
      .send({
        text: 'Hello cache',
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
    
    // Verify spawn was not called for the second request
    expect(spawn).not.toHaveBeenCalled();
  });
  
  it('should handle WebSocket connections', (done) => {
    // Create WebSocket client
    const ws = new WebSocket(`ws://localhost:${process.env.PORT}`);
    
    ws.on('open', () => {
      // Send translation request
      ws.send(JSON.stringify({
        type: 'translate',
        requestId: '123',
        text: 'Hello WebSocket',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      expect(message).toEqual({
        type: 'translation',
        requestId: '123',
        result: expect.objectContaining({
          originalText: 'Hello WebSocket',
          translatedText: 'Hola mundo',
          confidence: 'high'
        })
      });
      
      ws.close();
      done();
    });
    
    ws.on('error', (error) => {
      done(error);
    });
  });
});
