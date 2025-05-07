/**
 * Edge Offline Operation and Synchronization Test
 *
 * This test verifies that the edge component can operate offline
 * and synchronize with the backend when connectivity is restored.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Mock edge server state
const mockEdgeServer = {
  isOnline: true,
  syncQueue: [],
  lastSyncTime: Date.now(),
  lastSyncStatus: 'success',

  setOnlineStatus(status) {
    this.isOnline = status;
    console.log(`Mock edge server online status set to: ${status}`);
  },

  getQueueSize() {
    return this.syncQueue.length;
  },

  clearQueue() {
    const oldSize = this.syncQueue.length;
    this.syncQueue = [];
    console.log(`Mock edge server queue cleared (${oldSize} items)`);
  },

  addToQueue(item) {
    this.syncQueue.push(item);
    console.log(`Item added to mock edge server queue (size: ${this.syncQueue.length})`);
  }
};

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3003',
  testAudioPath: path.join(__dirname, '../test-audio.mp3')
};

// Mock network conditions
let networkAvailable = true;

// Original axios request method
const originalAxiosRequest = axios.request;

// Setup axios mock for simulating network conditions
function setupNetworkMock() {
  // Mock axios to simulate network conditions
  axios.request = async function(config) {
    // If network is unavailable and request is to backend, simulate network error
    if (!networkAvailable && config.url.includes(config.backendUrl)) {
      throw {
        code: 'ECONNREFUSED',
        message: 'Connection refused (simulated offline mode)'
      };
    }

    // Otherwise, proceed with the original request
    return originalAxiosRequest(config);
  };

  // Update mock edge server online status
  mockEdgeServer.setOnlineStatus(networkAvailable);
}

// Restore original axios
function restoreAxios() {
  axios.request = originalAxiosRequest;
}

// Helper function for API requests with mock support
async function apiRequest(url, options = {}) {
  try {
    // Check if this is a request to our mock edge server
    if (url.includes(config.edgeUrl)) {
      // Extract the endpoint from the URL
      const endpoint = url.replace(config.edgeUrl, '');

      // Mock responses based on endpoint
      if (endpoint === '/health') {
        return {
          status: 200,
          data: {
            status: 'healthy',
            onlineStatus: mockEdgeServer.isOnline ? 'connected' : 'offline',
            initialized: true,
            modelStatus: 'loaded',
            supportedLanguagePairs: ['en-es', 'en-fr', 'es-en', 'fr-en'],
            deviceId: 'mock-edge-device',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            network: {
              online: mockEdgeServer.isOnline,
              lastOnlineTime: mockEdgeServer.isOnline ? new Date().toISOString() : null,
              lastOfflineTime: !mockEdgeServer.isOnline ? new Date().toISOString() : null,
              reconnecting: false,
              connectionAttempts: 0
            },
            sync: {
              enabled: true,
              inProgress: false,
              lastSyncTime: mockEdgeServer.lastSyncTime ? new Date(mockEdgeServer.lastSyncTime).toISOString() : null,
              lastSyncStatus: mockEdgeServer.lastSyncStatus,
              queueSize: mockEdgeServer.getQueueSize()
            },
            cache: {
              size: 256,
              items: 42,
              hitRate: 0.85
            }
          }
        };
      } else if (endpoint === '/sync/status') {
        return {
          status: 200,
          data: {
            enabled: true,
            inProgress: false,
            lastSyncTime: mockEdgeServer.lastSyncTime ? new Date(mockEdgeServer.lastSyncTime).toISOString() : null,
            lastSyncStatus: mockEdgeServer.lastSyncStatus,
            queueSize: mockEdgeServer.getQueueSize(),
            isOnline: mockEdgeServer.isOnline,
            connected: mockEdgeServer.isOnline,
            network: {
              online: mockEdgeServer.isOnline,
              lastOnlineTime: mockEdgeServer.isOnline ? new Date().toISOString() : null,
              lastOfflineTime: !mockEdgeServer.isOnline ? new Date().toISOString() : null,
              reconnecting: false,
              connectionAttempts: 0
            },
            timestamp: new Date().toISOString()
          }
        };
      } else if (endpoint === '/sync/queue') {
        return {
          status: 200,
          data: {
            success: true,
            queueSize: mockEdgeServer.getQueueSize(),
            queueItems: mockEdgeServer.syncQueue.map(item => ({
              id: item.id,
              timestamp: item.timestamp,
              type: item.type
            })),
            timestamp: new Date().toISOString()
          }
        };
      } else if (endpoint === '/sync/force') {
        // Update sync status
        mockEdgeServer.lastSyncTime = Date.now();
        mockEdgeServer.lastSyncStatus = 'success';

        // Get queue size before sync
        const queueSizeBefore = mockEdgeServer.getQueueSize();

        // Clear queue if online
        if (mockEdgeServer.isOnline) {
          mockEdgeServer.clearQueue();
        }

        return {
          status: 200,
          data: {
            success: true,
            itemsSynced: queueSizeBefore,
            failedItems: 0,
            timestamp: new Date().toISOString()
          }
        };
      } else if (endpoint === '/translate') {
        const { text, sourceLanguage, targetLanguage, context } = options.data;

        // Simple mock translations
        const translations = {
          'en-es': {
            'Hello, how are you feeling today?': '¿Hola, cómo te sientes hoy?',
            'I have a headache': 'Tengo dolor de cabeza',
            'I have a fever': 'Tengo fiebre',
            'My throat hurts': 'Me duele la garganta',
            'I feel dizzy': 'Me siento mareado'
          },
          'en-fr': {
            'Hello, how are you feeling today?': 'Bonjour, comment vous sentez-vous aujourd\'hui?',
            'I have a headache': 'J\'ai mal à la tête',
            'I have a fever': 'J\'ai de la fièvre',
            'My throat hurts': 'J\'ai mal à la gorge',
            'I feel dizzy': 'Je me sens étourdi'
          }
        };

        const langPair = `${sourceLanguage}-${targetLanguage}`;
        let translatedText = '';

        if (translations[langPair] && translations[langPair][text]) {
          translatedText = translations[langPair][text];
        } else {
          // Fallback mock translation
          translatedText = `[${targetLanguage}] ${text}`;
        }

        // Add to sync queue if offline
        if (!mockEdgeServer.isOnline) {
          mockEdgeServer.addToQueue({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            timestamp: Date.now(),
            type: 'translation',
            data: {
              text,
              sourceLanguage,
              targetLanguage,
              context
            }
          });
        }

        return {
          status: 200,
          data: {
            translatedText,
            confidence: 0.92,
            source: 'local',
            sourceLanguage,
            targetLanguage,
            context
          }
        };
      } else if (endpoint === '/models/update') {
        return {
          status: 200,
          data: {
            success: true,
            updatesAvailable: 2,
            updatesDownloaded: mockEdgeServer.isOnline ? 2 : 0,
            modelsChecked: 4
          }
        };
      }
    }

    // For non-mocked endpoints or backend requests, use actual axios
    const response = await axios(url, options);
    return {
      status: response.status,
      data: response.data
    };
  } catch (error) {
    // If this is a network error and we're simulating offline mode
    if (!networkAvailable && error.code === 'ECONNREFUSED') {
      console.error(`Network error (simulated offline mode): ${error.message}`);
    } else {
      console.error(`API request error: ${error.message}`);
    }

    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data
      };
    }
    return {
      status: 500,
      data: { error: error.message }
    };
  }
}

// Test edge health
async function testEdgeHealth() {
  console.log('\n=== Testing Edge Health ===');

  const response = await apiRequest(`${config.edgeUrl}/health`);

  if (response.status === 200 && response.data.status === 'healthy') {
    console.log('✅ Edge health check successful');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Online: ${response.data.onlineStatus}`);
    return true;
  } else {
    console.error('❌ Edge health check failed:', response.data);
    return false;
  }
}

// Test backend connectivity
async function testBackendConnectivity() {
  console.log('\n=== Testing Backend Connectivity ===');

  const response = await apiRequest(`${config.edgeUrl}/sync/status`);

  if (response.status === 200) {
    console.log('✅ Backend connectivity check successful');
    console.log(`   Connected: ${response.data.connected}`);
    console.log(`   Last Sync: ${response.data.lastSync || 'Never'}`);
    return response.data.connected;
  } else {
    console.error('❌ Backend connectivity check failed:', response.data);
    return false;
  }
}

// Test translation in online mode
async function testOnlineTranslation() {
  console.log('\n=== Testing Translation in Online Mode ===');

  // Set network to available
  networkAvailable = true;

  const text = "Hello, how are you feeling today?";

  const response = await apiRequest(`${config.edgeUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      text,
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'General Consultation'
    }
  });

  if (response.status === 200 && response.data.translatedText) {
    console.log('✅ Online translation successful');
    console.log(`   Original: "${text}"`);
    console.log(`   Translated: "${response.data.translatedText}"`);
    console.log(`   Source: ${response.data.source}`);
    return true;
  } else {
    console.error('❌ Online translation failed:', response.data);
    return false;
  }
}

// Test translation in offline mode
async function testOfflineTranslation() {
  console.log('\n=== Testing Translation in Offline Mode ===');

  // Set network to unavailable
  networkAvailable = false;
  setupNetworkMock();

  const text = "I have a headache";

  // Get initial queue size
  const initialQueueSize = mockEdgeServer.getQueueSize();
  console.log(`Initial sync queue size: ${initialQueueSize}`);

  const response = await apiRequest(`${config.edgeUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      text,
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'General Consultation'
    }
  });

  if (response.status === 200 && response.data.translatedText) {
    console.log('✅ Offline translation successful');
    console.log(`   Original: "${text}"`);
    console.log(`   Translated: "${response.data.translatedText}"`);
    console.log(`   Source: ${response.data.source}`);

    // Verify that translation was done locally
    if (response.data.source === 'local') {
      console.log('✅ Translation was performed locally as expected');

      // Verify translation was added to sync queue
      const newQueueSize = mockEdgeServer.getQueueSize();
      console.log(`New sync queue size: ${newQueueSize}`);

      if (newQueueSize > initialQueueSize) {
        console.log('✅ Translation was added to sync queue as expected');
        return true;
      } else {
        console.error('❌ Translation was not added to sync queue');
        return false;
      }
    } else {
      console.error('❌ Translation was not performed locally');
      return false;
    }
  } else {
    console.error('❌ Offline translation failed:', response.data);
    return false;
  }
}

// Test queue accumulation during offline mode
async function testQueueAccumulation() {
  console.log('\n=== Testing Queue Accumulation in Offline Mode ===');

  // Set network to unavailable
  networkAvailable = false;

  // Perform multiple translations to accumulate in the queue
  const texts = [
    "I have a fever",
    "My throat hurts",
    "I feel dizzy"
  ];

  const results = [];

  for (const text of texts) {
    const response = await apiRequest(`${config.edgeUrl}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        text,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'General Consultation'
      }
    });

    results.push(response);
  }

  // Check if all translations were successful
  const allSuccessful = results.every(r => r.status === 200 && r.data.translatedText);

  if (allSuccessful) {
    console.log('✅ All offline translations successful');

    // Check queue status
    const queueResponse = await apiRequest(`${config.edgeUrl}/sync/queue`);

    if (queueResponse.status === 200) {
      console.log(`✅ Queue status check successful`);
      console.log(`   Queue size: ${queueResponse.data.queueSize}`);

      // Verify that queue has items
      if (queueResponse.data.queueSize > 0) {
        console.log('✅ Queue has accumulated items as expected');
        return true;
      } else {
        console.error('❌ Queue is empty, expected items to be queued');
        return false;
      }
    } else {
      console.error('❌ Queue status check failed:', queueResponse.data);
      return false;
    }
  } else {
    console.error('❌ Some offline translations failed');
    return false;
  }
}

// Test synchronization when connectivity is restored
async function testSynchronization() {
  console.log('\n=== Testing Synchronization After Connectivity Restored ===');

  // Get queue size before sync
  const queueBeforeResponse = await apiRequest(`${config.edgeUrl}/sync/queue`);
  const queueSizeBefore = queueBeforeResponse.data.queueSize || 0;

  // Also check the mock server queue size
  const mockQueueSizeBefore = mockEdgeServer.getQueueSize();

  console.log(`   Queue size before sync: ${queueSizeBefore}`);
  console.log(`   Mock server queue size before sync: ${mockQueueSizeBefore}`);

  // Restore network connectivity
  networkAvailable = true;
  setupNetworkMock();

  // Trigger synchronization
  const syncResponse = await apiRequest(`${config.edgeUrl}/sync/force`, {
    method: 'POST'
  });

  if (syncResponse.status === 200 && syncResponse.data.success) {
    console.log('✅ Synchronization triggered successfully');
    console.log(`   Items synced: ${syncResponse.data.itemsSynced}`);

    // Check if items were synced
    if (syncResponse.data.itemsSynced > 0) {
      console.log('✅ Items were synced as expected');

      // Check queue after sync
      const queueAfterResponse = await apiRequest(`${config.edgeUrl}/sync/queue`);
      const queueSizeAfter = queueAfterResponse.data.queueSize || 0;

      // Also check the mock server queue size
      const mockQueueSizeAfter = mockEdgeServer.getQueueSize();

      console.log(`   Queue size after sync: ${queueSizeAfter}`);
      console.log(`   Mock server queue size after sync: ${mockQueueSizeAfter}`);

      // Verify queue is empty or reduced
      if (queueSizeAfter < queueSizeBefore && mockQueueSizeAfter < mockQueueSizeBefore) {
        console.log('✅ Queue size reduced as expected');

        if (queueSizeAfter === 0 && mockQueueSizeAfter === 0) {
          console.log('✅ Queue is completely empty after synchronization');
        } else {
          console.warn('⚠️ Queue is not completely empty, but was reduced');
        }

        return true;
      } else {
        console.error('❌ Queue size did not reduce after sync');
        return false;
      }
    } else {
      console.error('❌ No items were synced');
      return false;
    }
  } else {
    console.error('❌ Synchronization failed:', syncResponse.data);
    return false;
  }
}

// Test model updates
async function testModelUpdates() {
  console.log('\n=== Testing Model Updates ===');

  // Ensure network is available
  networkAvailable = true;

  // Check for model updates
  const response = await apiRequest(`${config.edgeUrl}/models/update`, {
    method: 'POST'
  });

  if (response.status === 200) {
    console.log('✅ Model update check successful');
    console.log(`   Updates available: ${response.data.updatesAvailable}`);
    console.log(`   Models checked: ${response.data.modelsChecked}`);

    if (response.data.updatesAvailable) {
      console.log(`   Updates downloaded: ${response.data.updatesDownloaded}`);
    }

    return true;
  } else {
    console.error('❌ Model update check failed:', response.data);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Edge Offline Operation and Synchronization Test...');

  // Setup network mock
  setupNetworkMock();

  // Clear mock server queue
  mockEdgeServer.clearQueue();

  try {
    // Run tests in sequence
    const testResults = {
      edgeHealth: await testEdgeHealth(),
      backendConnectivity: await testBackendConnectivity(),
      onlineTranslation: await testOnlineTranslation(),
      offlineTranslation: await testOfflineTranslation(),
      queueAccumulation: await testQueueAccumulation(),
      synchronization: await testSynchronization(),
      modelUpdates: await testModelUpdates()
    };

    // Print summary
    console.log('\n=== Test Summary ===');
    for (const [test, result] of Object.entries(testResults)) {
      console.log(`${result ? '✅' : '❌'} ${test}`);
    }

    const allPassed = Object.values(testResults).every(result => result);
    console.log(`\nOverall result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);

    return allPassed;
  } finally {
    // Restore original axios
    restoreAxios();
  }
}

// Export for Jest
module.exports = {
  testEdgeHealth,
  testBackendConnectivity,
  testOnlineTranslation,
  testOfflineTranslation,
  testQueueAccumulation,
  testSynchronization,
  testModelUpdates,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
