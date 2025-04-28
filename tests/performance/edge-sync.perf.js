/**
 * Performance tests for the Edge Sync Module
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { runPerformanceTest, withNetworkCondition } = require('./framework');

// Mock dependencies for testing
jest.mock('fs');
jest.mock('path');
jest.mock('axios');

// Set up environment
process.env.SYNC_DIR = '/sync';
process.env.CLOUD_API_URL = 'https://api.medtranslate.ai';
process.env.DEVICE_ID = 'test-device-perf';

/**
 * Runs performance tests for the sync module
 */
async function runSyncPerformanceTests() {
  // Mock path.join to return predictable paths
  path.join.mockImplementation((...args) => args.join('/'));
  
  // Mock fs functions
  fs.existsSync.mockReturnValue(false);
  fs.mkdirSync.mockImplementation(() => {});
  fs.writeFileSync.mockImplementation(() => {});
  fs.readdirSync.mockReturnValue(['en-es.bin', 'en-fr.bin']);
  fs.statSync.mockImplementation(() => ({
    size: 1000,
    mtime: new Date('2023-01-01T00:00:00.000Z')
  }));
  
  // Import the sync module
  const { syncWithCloud } = require('../../edge/app/sync');
  
  // Test connection performance under different network conditions
  const networkConditions = ['fast', 'slow', 'unreliable'];
  
  for (const condition of networkConditions) {
    // Mock axios.get based on network condition
    axios.get.mockImplementation(async () => {
      return await withNetworkCondition(condition, async () => {
        return {
          status: 200,
          data: { status: 'healthy' }
        };
      });
    });
    
    await runPerformanceTest(
      `sync-connection-${condition}`,
      async () => {
        await syncWithCloud.testConnection();
      },
      {
        iterations: 20,
        warmupIterations: 3
      }
    );
  }
  
  // Test queue translation performance
  await runPerformanceTest(
    'sync-queue-translation',
    async () => {
      const text = `Hello world ${Math.random()}`;
      const result = {
        translatedText: `Hola mundo ${Math.random()}`,
        confidence: 'high'
      };
      
      syncWithCloud.queueTranslation(
        text,
        'en',
        'es',
        'general',
        result
      );
    },
    {
      iterations: 1000,
      warmupIterations: 100
    }
  );
  
  // Test sync cached data performance with different batch sizes
  const batchSizes = [10, 100, 1000];
  
  for (const batchSize of batchSizes) {
    // Reset the queue
    syncWithCloud.clearQueue();
    
    // Fill the queue
    for (let i = 0; i < batchSize; i++) {
      const text = `Hello world batch ${i}`;
      const result = {
        translatedText: `Hola mundo batch ${i}`,
        confidence: 'high'
      };
      
      syncWithCloud.queueTranslation(
        text,
        'en',
        'es',
        'general',
        result
      );
    }
    
    // Mock axios.post for sync
    axios.post.mockImplementation(async (url, data) => {
      // Simulate network delay based on batch size
      await new Promise(resolve => setTimeout(resolve, Math.log(data.items.length) * 10));
      
      return {
        status: 200,
        data: { success: true }
      };
    });
    
    await runPerformanceTest(
      `sync-cached-data-batch-${batchSize}`,
      async () => {
        await syncWithCloud.syncCachedData();
      },
      {
        iterations: 10,
        warmupIterations: 2
      }
    );
  }
  
  // Test model update check performance
  await runPerformanceTest(
    'sync-check-model-updates',
    async () => {
      // Mock axios.get for model updates
      axios.get.mockResolvedValue({
        status: 200,
        data: {
          updates: [
            {
              filename: 'en-fr.bin',
              version: '1.0',
              size: 1000,
              downloadUrl: 'https://api.medtranslate.ai/models/en-fr.bin'
            }
          ]
        }
      });
      
      // Mock downloadModelUpdate to avoid actual downloads
      const downloadModelUpdateSpy = jest.spyOn(syncWithCloud, 'downloadModelUpdate')
        .mockResolvedValue(true);
      
      await syncWithCloud.checkForModelUpdates();
      
      // Restore the mock
      downloadModelUpdateSpy.mockRestore();
    },
    {
      iterations: 20,
      warmupIterations: 3
    }
  );
  
  // Test model download performance with different file sizes
  const fileSizes = [1, 10, 100]; // MB
  
  for (const size of fileSizes) {
    // Mock axios for file download
    axios.mockImplementation(async () => {
      // Simulate download time based on file size
      await new Promise(resolve => setTimeout(resolve, size * 10));
      
      // Create a mock stream
      const mockStream = {
        pipe: jest.fn()
      };
      
      return {
        data: mockStream
      };
    });
    
    // Mock fs.createWriteStream
    const mockWriter = {
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          // Simulate write time based on file size
          setTimeout(callback, size * 5);
        }
        return mockWriter;
      })
    };
    fs.createWriteStream.mockReturnValue(mockWriter);
    
    await runPerformanceTest(
      `sync-download-model-${size}mb`,
      async () => {
        await syncWithCloud.downloadModelUpdate({
          filename: `en-fr-${size}mb.bin`,
          version: '1.0',
          size: size * 1024 * 1024,
          downloadUrl: `https://api.medtranslate.ai/models/en-fr-${size}mb.bin`
        });
      },
      {
        iterations: 10,
        warmupIterations: 2
      }
    );
  }
}

// Add clearQueue method to syncWithCloud for testing
function addClearQueueMethod() {
  const syncModule = require('../../edge/app/sync');
  if (!syncModule.syncWithCloud.clearQueue) {
    syncModule.syncWithCloud.clearQueue = function() {
      // Access the internal syncQueue variable
      // This is a bit hacky but necessary for testing
      syncModule.syncQueue = [];
    };
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  addClearQueueMethod();
  
  runSyncPerformanceTests()
    .then(() => {
      console.log('Sync performance tests completed');
    })
    .catch(error => {
      console.error('Error running sync performance tests:', error);
      process.exit(1);
    });
}

module.exports = {
  runSyncPerformanceTests
};
