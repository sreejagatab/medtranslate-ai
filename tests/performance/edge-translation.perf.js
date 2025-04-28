/**
 * Performance tests for the Edge Translation Module
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { runPerformanceTest } = require('./framework');

// Mock dependencies for testing
jest.mock('child_process', () => {
  const originalModule = jest.requireActual('child_process');
  
  return {
    ...originalModule,
    spawn: jest.fn((command, args) => {
      // Simulate different processing times based on text length
      const textArg = args.find(arg => !arg.startsWith('-') && !arg.includes('/'));
      const textLength = textArg ? textArg.length : 10;
      const processingTime = Math.max(10, textLength * 0.5); // Simulate longer processing for longer text
      
      const mockProcess = {
        stdout: {
          on: (event, callback) => {
            if (event === 'data') {
              // Add a delay proportional to the text length
              setTimeout(() => {
                callback(JSON.stringify({
                  translatedText: 'Hola mundo'.repeat(Math.ceil(textLength / 10)),
                  confidence: 'high',
                  processingTime: processingTime / 1000
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
    })
  };
});

// Mock fs and path
jest.mock('fs');
jest.mock('path');

// Set up environment
process.env.MODEL_DIR = '/models';

// Set up test data
const TEST_TEXTS = [
  'Hello', // Short text
  'Hello world, how are you today?', // Medium text
  'Hello world, this is a longer text that should take more time to translate. It contains multiple sentences and should simulate a more realistic translation scenario.', // Long text
  'Hello world, this is a very long text that should take even more time to translate. It contains multiple sentences and paragraphs. This is to simulate a very complex translation task that might be encountered in real-world scenarios. The more text we have to translate, the longer it should take, which allows us to measure the performance of the translation module under different loads.'.repeat(3) // Very long text
];

/**
 * Runs performance tests for the translation module
 */
async function runTranslationPerformanceTests() {
  // Mock path.join to return predictable paths
  path.join.mockImplementation((...args) => args.join('/'));
  
  // Mock fs.existsSync to return true for model paths
  fs.existsSync.mockReturnValue(true);
  
  // Import the translation module
  const { translateLocally } = require('../../edge/app/translation');
  
  // Test translation performance with different text lengths
  for (const text of TEST_TEXTS) {
    const testName = `translation-${text.length <= 10 ? 'short' : text.length <= 50 ? 'medium' : text.length <= 200 ? 'long' : 'very-long'}`;
    
    await runPerformanceTest(
      testName,
      async () => {
        await translateLocally(text, 'en', 'es', 'general');
      },
      {
        iterations: 20,
        warmupIterations: 3
      }
    );
  }
  
  // Test translation performance with different language pairs
  const languagePairs = [
    { source: 'en', target: 'es' }, // English to Spanish
    { source: 'en', target: 'fr' }, // English to French
    { source: 'es', target: 'en' }  // Spanish to English
  ];
  
  for (const pair of languagePairs) {
    const testName = `translation-${pair.source}-to-${pair.target}`;
    
    await runPerformanceTest(
      testName,
      async () => {
        await translateLocally(
          'Hello world, how are you today?',
          pair.source,
          pair.target,
          'general'
        );
      },
      {
        iterations: 20,
        warmupIterations: 3
      }
    );
  }
  
  // Test translation performance with different medical contexts
  const contexts = ['general', 'cardiology', 'neurology', 'pediatrics'];
  
  for (const context of contexts) {
    const testName = `translation-context-${context}`;
    
    await runPerformanceTest(
      testName,
      async () => {
        await translateLocally(
          'Hello world, how are you today?',
          'en',
          'es',
          context
        );
      },
      {
        iterations: 20,
        warmupIterations: 3
      }
    );
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runTranslationPerformanceTests()
    .then(() => {
      console.log('Translation performance tests completed');
    })
    .catch(error => {
      console.error('Error running translation performance tests:', error);
      process.exit(1);
    });
}

module.exports = {
  runTranslationPerformanceTests
};
