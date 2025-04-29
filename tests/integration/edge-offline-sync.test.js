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

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3002',
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
}

// Restore original axios
function restoreAxios() {
  axios.request = originalAxiosRequest;
}

// Helper function for API requests
async function apiRequest(url, options = {}) {
  try {
    const response = await axios(url, options);
    return {
      status: response.status,
      data: response.data
    };
  } catch (error) {
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
  
  const text = "I have a headache";
  
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
      return true;
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
  
  console.log(`   Queue size before sync: ${queueSizeBefore}`);
  
  // Restore network connectivity
  networkAvailable = true;
  
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
      
      console.log(`   Queue size after sync: ${queueSizeAfter}`);
      
      // Verify queue is empty or reduced
      if (queueSizeAfter < queueSizeBefore) {
        console.log('✅ Queue size reduced as expected');
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
