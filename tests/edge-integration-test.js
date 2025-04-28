/**
 * Edge Computing Integration Test for MedTranslate AI
 * 
 * This script tests the edge computing integration with fallback to cloud services.
 * It simulates translation requests to both edge and cloud services.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  edgeEndpoint: 'http://localhost:3002',
  cloudEndpoint: 'http://localhost:3001',
  sessionId: 'test-session-123',
  sessionToken: 'test-token-123',
  testAudioPath: path.join(__dirname, 'test-audio.mp3')
};

// Test text translation with edge device
async function testEdgeTextTranslation() {
  console.log('Testing edge text translation...');
  
  try {
    const response = await axios.post(`${config.edgeEndpoint}/translate`, {
      text: 'Me duele la cabeza',
      sourceLanguage: 'es',
      targetLanguage: 'en',
      context: 'General Medical'
    });
    
    console.log('Edge text translation result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Edge text translation failed:', error.message);
    return null;
  }
}

// Test text translation with cloud service
async function testCloudTextTranslation() {
  console.log('Testing cloud text translation...');
  
  try {
    const response = await axios.post(`${config.cloudEndpoint}/translate/text`, {
      sessionId: config.sessionId,
      text: 'Me duele la cabeza',
      sourceLanguage: 'es',
      targetLanguage: 'en',
      context: 'General Medical'
    }, {
      headers: {
        'Authorization': `Bearer ${config.sessionToken}`
      }
    });
    
    console.log('Cloud text translation result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Cloud text translation failed:', error.message);
    return null;
  }
}

// Test audio translation with edge device
async function testEdgeAudioTranslation() {
  console.log('Testing edge audio translation...');
  
  try {
    // Read test audio file
    const audioData = fs.readFileSync(config.testAudioPath, { encoding: 'base64' });
    
    const response = await axios.post(`${config.edgeEndpoint}/translate/audio`, {
      audioData,
      sourceLanguage: 'es',
      targetLanguage: 'en',
      context: 'General Medical'
    });
    
    console.log('Edge audio translation result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Edge audio translation failed:', error.message);
    return null;
  }
}

// Test audio translation with cloud service
async function testCloudAudioTranslation() {
  console.log('Testing cloud audio translation...');
  
  try {
    // Read test audio file
    const audioData = fs.readFileSync(config.testAudioPath, { encoding: 'base64' });
    
    const response = await axios.post(`${config.cloudEndpoint}/translate/audio`, {
      sessionId: config.sessionId,
      audioData,
      sourceLanguage: 'es',
      targetLanguage: 'en',
      context: 'General Medical'
    }, {
      headers: {
        'Authorization': `Bearer ${config.sessionToken}`
      }
    });
    
    console.log('Cloud audio translation result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Cloud audio translation failed:', error.message);
    return null;
  }
}

// Test edge fallback to cloud
async function testEdgeFallbackToCloud() {
  console.log('Testing edge fallback to cloud...');
  
  try {
    // First, simulate edge device being offline
    const originalEdgeEndpoint = config.edgeEndpoint;
    config.edgeEndpoint = 'http://localhost:9999'; // Non-existent endpoint
    
    // Try edge translation (should fail)
    const edgeResult = await testEdgeTextTranslation();
    
    // Restore edge endpoint
    config.edgeEndpoint = originalEdgeEndpoint;
    
    // Try cloud translation (should succeed)
    const cloudResult = await testCloudTextTranslation();
    
    console.log('Edge fallback test results:');
    console.log('- Edge result:', edgeResult ? 'Success' : 'Failed (expected)');
    console.log('- Cloud result:', cloudResult ? 'Success' : 'Failed');
    
    return cloudResult != null;
  } catch (error) {
    console.error('Edge fallback test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting edge computing integration tests...');
  
  // Create test audio file if it doesn't exist
  if (!fs.existsSync(config.testAudioPath)) {
    console.log('Creating test audio file...');
    // This is just a placeholder - in a real test, you would use an actual audio file
    fs.writeFileSync(config.testAudioPath, Buffer.from('test audio data'));
  }
  
  // Run tests
  await testEdgeTextTranslation();
  console.log('---');
  
  await testCloudTextTranslation();
  console.log('---');
  
  await testEdgeAudioTranslation();
  console.log('---');
  
  await testCloudAudioTranslation();
  console.log('---');
  
  await testEdgeFallbackToCloud();
  
  console.log('Edge computing integration tests completed.');
}

// Run the tests
runTests();
