/**
 * Performance tests for the complete Edge Application
 */

const request = require('supertest');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const { spawn } = require('child_process');
const { runPerformanceTest, withNetworkCondition } = require('./framework');

// Import setup
require('../integration/setup');

// Mock dependencies
jest.mock('axios');
jest.mock('child_process', () => {
  const originalModule = jest.requireActual('child_process');
  
  return {
    ...originalModule,
    spawn: jest.fn((command, args) => {
      // Check if this is a call to the Python inference script
      if (args[0] && (args[0].includes('inference.py') || args[0].includes('audio_processor.py'))) {
        // Simulate different processing times based on text length or audio data
        const dataArg = args.find(arg => !arg.startsWith('-') && !arg.includes('/'));
        const dataLength = dataArg ? dataArg.length : 10;
        const processingTime = Math.max(10, dataLength * 0.5); // Simulate longer processing for longer input
        
        const mockProcess = {
          stdout: {
            on: (event, callback) => {
              if (event === 'data') {
                // Add a delay proportional to the data length
                setTimeout(() => {
                  callback(JSON.stringify({
                    translatedText: 'Hola mundo'.repeat(Math.ceil(dataLength / 10)),
                    confidence: 'high',
                    processingTime: processingTime / 1000,
                    transcription: args[0].includes('audio_processor.py') ? 'Hello world' : undefined,
                    audioResponse: args[0].includes('audio_processor.py') ? 'base64audio' : undefined
                  }));
                }, processingTime);
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
              setTimeout(() => {
                callback(0); // Exit code 0 (success)
              }, processingTime);
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

/**
 * Runs performance tests for the complete edge application
 */
async function runEdgeApplicationPerformanceTests() {
  let server;
  let baseUrl;
  
  try {
    // Mock axios for cloud connection
    axios.get.mockResolvedValue({
      status: 200,
      data: { status: 'healthy' }
    });
    
    // Start the server
    console.log('Starting edge application server for performance testing...');
    
    // Load the server module
    jest.isolateModules(() => {
      server = require('../../edge/app/server');
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    baseUrl = `http://localhost:${process.env.PORT}`;
    console.log(`Server started at ${baseUrl}`);
    
    // Test text translation performance with different text lengths
    const textLengths = [
      { name: 'short', text: 'Hello' },
      { name: 'medium', text: 'Hello world, how are you today?' },
      { name: 'long', text: 'Hello world, this is a longer text that should take more time to translate. It contains multiple sentences and should simulate a more realistic translation scenario.' },
      { name: 'very-long', text: 'Hello world, this is a very long text that should take even more time to translate. It contains multiple sentences and paragraphs. This is to simulate a very complex translation task that might be encountered in real-world scenarios. The more text we have to translate, the longer it should take, which allows us to measure the performance of the translation module under different loads.'.repeat(3) }
    ];
    
    for (const { name, text } of textLengths) {
      await runPerformanceTest(
        `edge-app-text-translation-${name}`,
        async () => {
          await request(baseUrl)
            .post('/translate')
            .send({
              text,
              sourceLanguage: 'en',
              targetLanguage: 'es',
              context: 'general'
            });
        },
        {
          iterations: 20,
          warmupIterations: 3
        }
      );
    }
    
    // Test audio translation performance with different audio sizes
    const audioSizes = [
      { name: 'small', size: 1000 },
      { name: 'medium', size: 10000 },
      { name: 'large', size: 100000 }
    ];
    
    for (const { name, size } of audioSizes) {
      // Generate mock audio data of the specified size
      const audioData = Buffer.from('a'.repeat(size)).toString('base64');
      
      await runPerformanceTest(
        `edge-app-audio-translation-${name}`,
        async () => {
          await request(baseUrl)
            .post('/translate-audio')
            .send({
              audioData,
              sourceLanguage: 'en',
              targetLanguage: 'es',
              context: 'general'
            });
        },
        {
          iterations: 10,
          warmupIterations: 2
        }
      );
    }
    
    // Test cache performance
    await runPerformanceTest(
      'edge-app-cache-performance',
      async () => {
        // First request to cache the translation
        const text = `Hello cache ${Math.random()}`;
        
        // First request (cache miss)
        await request(baseUrl)
          .post('/translate')
          .send({
            text,
            sourceLanguage: 'en',
            targetLanguage: 'es',
            context: 'general'
          });
        
        // Second request (cache hit)
        await request(baseUrl)
          .post('/translate')
          .send({
            text,
            sourceLanguage: 'en',
            targetLanguage: 'es',
            context: 'general'
          });
      },
      {
        iterations: 50,
        warmupIterations: 5
      }
    );
    
    // Test WebSocket performance
    await runPerformanceTest(
      'edge-app-websocket-performance',
      async () => {
        return new Promise((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${process.env.PORT}`);
          
          ws.on('open', () => {
            // Send translation request
            ws.send(JSON.stringify({
              type: 'translate',
              requestId: Math.random().toString(),
              text: 'Hello WebSocket',
              sourceLanguage: 'en',
              targetLanguage: 'es',
              context: 'general'
            }));
          });
          
          ws.on('message', (data) => {
            ws.close();
            resolve();
          });
          
          ws.on('error', (error) => {
            reject(error);
          });
          
          // Set a timeout in case the WebSocket doesn't respond
          setTimeout(() => {
            reject(new Error('WebSocket timeout'));
          }, 5000);
        });
      },
      {
        iterations: 20,
        warmupIterations: 3
      }
    );
    
    // Test concurrent requests performance
    await runPerformanceTest(
      'edge-app-concurrent-requests',
      async () => {
        // Create 10 concurrent requests
        const requests = [];
        for (let i = 0; i < 10; i++) {
          requests.push(
            request(baseUrl)
              .post('/translate')
              .send({
                text: `Hello concurrent ${i}`,
                sourceLanguage: 'en',
                targetLanguage: 'es',
                context: 'general'
              })
          );
        }
        
        // Wait for all requests to complete
        await Promise.all(requests);
      },
      {
        iterations: 10,
        warmupIterations: 2
      }
    );
    
  } finally {
    // Clean up
    if (server && server.close) {
      console.log('Stopping edge application server...');
      await new Promise(resolve => server.close(resolve));
      console.log('Server stopped');
    }
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runEdgeApplicationPerformanceTests()
    .then(() => {
      console.log('Edge application performance tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error running edge application performance tests:', error);
      process.exit(1);
    });
}

module.exports = {
  runEdgeApplicationPerformanceTests
};
