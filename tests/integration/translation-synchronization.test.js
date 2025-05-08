/**
 * Translation Synchronization Integration Test
 *
 * This test verifies that translations can be synchronized between the backend and edge devices,
 * including cloud-to-edge sync, edge-to-cloud sync, and conflict resolution.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3003',
  testTimeout: 60000 // 60 seconds
};

// Mock edge device data
const mockEdgeDevice = {
  id: `edge-${uuidv4().substring(0, 8)}`,
  name: 'Test Edge Device',
  ipAddress: '192.168.1.100',
  supportedLanguages: ['en', 'es', 'fr'],
  version: '1.0.0'
};

// Mock translation data
const mockTranslations = [
  {
    id: `trans-${uuidv4().substring(0, 8)}`,
    originalText: 'Hello',
    translatedText: 'Hola',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    confidence: 0.95,
    source: 'cloud',
    timestamp: new Date().toISOString(),
    context: 'general'
  },
  {
    id: `trans-${uuidv4().substring(0, 8)}`,
    originalText: 'How are you?',
    translatedText: '¿Cómo estás?',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    confidence: 0.92,
    source: 'cloud',
    timestamp: new Date().toISOString(),
    context: 'general'
  },
  {
    id: `trans-${uuidv4().substring(0, 8)}`,
    originalText: 'I have a headache',
    translatedText: 'Tengo dolor de cabeza',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    confidence: 0.88,
    source: 'cloud',
    timestamp: new Date().toISOString(),
    context: 'medical'
  }
];

// Test cloud-to-edge synchronization
async function testCloudToEdgeSync() {
  console.log('\n=== Testing Cloud-to-Edge Synchronization ===');
  
  try {
    // Register edge device with backend
    console.log('Registering edge device with backend...');
    const registrationResponse = await axios.post(`${config.backendUrl}/api/edge/register`, mockEdgeDevice);
    
    if (!registrationResponse.data.success) {
      throw new Error(`Registration failed: ${registrationResponse.data.message}`);
    }
    
    const deviceId = registrationResponse.data.deviceId;
    console.log(`Device registered with ID: ${deviceId}`);
    
    // Create translations in the cloud
    console.log('Creating translations in the cloud...');
    const createdTranslations = [];
    
    for (const translation of mockTranslations) {
      const response = await axios.post(`${config.backendUrl}/api/translations`, translation);
      createdTranslations.push(response.data.translation);
      console.log(`Created translation: ${translation.originalText} -> ${translation.translatedText}`);
    }
    
    // Initiate cloud-to-edge sync
    console.log('Initiating cloud-to-edge sync...');
    const syncResponse = await axios.post(`${config.backendUrl}/api/edge/devices/${deviceId}/sync`, {
      direction: 'cloud-to-edge',
      types: ['translations']
    });
    
    if (!syncResponse.data.success) {
      throw new Error(`Sync initiation failed: ${syncResponse.data.message}`);
    }
    
    console.log('Sync initiated:', syncResponse.data);
    
    // Wait for sync to complete
    console.log('Waiting for sync to complete...');
    let syncStatus;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await axios.get(`${config.backendUrl}/api/edge/devices/${deviceId}/sync/status`);
      syncStatus = statusResponse.data.status;
      
      console.log(`Sync status: ${syncStatus} (attempt ${attempts + 1}/${maxAttempts})`);
      attempts++;
    } while (syncStatus === 'in_progress' && attempts < maxAttempts);
    
    if (syncStatus !== 'completed') {
      throw new Error(`Sync did not complete successfully. Final status: ${syncStatus}`);
    }
    
    // Verify translations were synced to edge
    console.log('Verifying translations were synced to edge...');
    const edgeTranslationsResponse = await axios.get(`${config.edgeUrl}/api/translations`);
    
    const edgeTranslations = edgeTranslationsResponse.data.translations;
    console.log(`Edge has ${edgeTranslations.length} translations`);
    
    // Verify all cloud translations exist on edge
    for (const cloudTranslation of createdTranslations) {
      const matchingEdgeTranslation = edgeTranslations.find(t => t.id === cloudTranslation.id);
      
      if (!matchingEdgeTranslation) {
        throw new Error(`Translation ${cloudTranslation.id} not found on edge`);
      }
      
      console.log(`Verified translation: ${cloudTranslation.originalText} -> ${cloudTranslation.translatedText}`);
    }
    
    console.log('✅ Cloud-to-edge synchronization successful');
    return { success: true, deviceId };
  } catch (error) {
    console.error('❌ Error testing cloud-to-edge sync:', error.message);
    return { success: false, error: error.message };
  }
}

// Test edge-to-cloud synchronization
async function testEdgeToCloudSync(deviceId) {
  console.log('\n=== Testing Edge-to-Cloud Synchronization ===');
  
  try {
    // Create translations on the edge
    console.log('Creating translations on the edge...');
    const edgeTranslations = [
      {
        id: `trans-edge-${uuidv4().substring(0, 8)}`,
        originalText: 'Good morning',
        translatedText: 'Buenos días',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.94,
        source: 'edge',
        timestamp: new Date().toISOString(),
        context: 'general'
      },
      {
        id: `trans-edge-${uuidv4().substring(0, 8)}`,
        originalText: 'I feel dizzy',
        translatedText: 'Me siento mareado',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.87,
        source: 'edge',
        timestamp: new Date().toISOString(),
        context: 'medical'
      }
    ];
    
    const createdEdgeTranslations = [];
    
    for (const translation of edgeTranslations) {
      const response = await axios.post(`${config.edgeUrl}/api/translations`, translation);
      createdEdgeTranslations.push(response.data.translation);
      console.log(`Created edge translation: ${translation.originalText} -> ${translation.translatedText}`);
    }
    
    // Initiate edge-to-cloud sync
    console.log('Initiating edge-to-cloud sync...');
    const syncResponse = await axios.post(`${config.backendUrl}/api/edge/devices/${deviceId}/sync`, {
      direction: 'edge-to-cloud',
      types: ['translations']
    });
    
    if (!syncResponse.data.success) {
      throw new Error(`Sync initiation failed: ${syncResponse.data.message}`);
    }
    
    console.log('Sync initiated:', syncResponse.data);
    
    // Wait for sync to complete
    console.log('Waiting for sync to complete...');
    let syncStatus;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await axios.get(`${config.backendUrl}/api/edge/devices/${deviceId}/sync/status`);
      syncStatus = statusResponse.data.status;
      
      console.log(`Sync status: ${syncStatus} (attempt ${attempts + 1}/${maxAttempts})`);
      attempts++;
    } while (syncStatus === 'in_progress' && attempts < maxAttempts);
    
    if (syncStatus !== 'completed') {
      throw new Error(`Sync did not complete successfully. Final status: ${syncStatus}`);
    }
    
    // Verify translations were synced to cloud
    console.log('Verifying translations were synced to cloud...');
    const cloudTranslationsResponse = await axios.get(`${config.backendUrl}/api/translations`);
    
    const cloudTranslations = cloudTranslationsResponse.data.translations;
    console.log(`Cloud has ${cloudTranslations.length} translations`);
    
    // Verify all edge translations exist in cloud
    for (const edgeTranslation of createdEdgeTranslations) {
      const matchingCloudTranslation = cloudTranslations.find(t => t.id === edgeTranslation.id);
      
      if (!matchingCloudTranslation) {
        throw new Error(`Translation ${edgeTranslation.id} not found in cloud`);
      }
      
      console.log(`Verified translation: ${edgeTranslation.originalText} -> ${edgeTranslation.translatedText}`);
    }
    
    console.log('✅ Edge-to-cloud synchronization successful');
    return { success: true, edgeTranslations: createdEdgeTranslations };
  } catch (error) {
    console.error('❌ Error testing edge-to-cloud sync:', error.message);
    return { success: false, error: error.message };
  }
}

// Test conflict resolution
async function testConflictResolution(deviceId) {
  console.log('\n=== Testing Conflict Resolution ===');
  
  try {
    // Create a translation in the cloud
    console.log('Creating translation in the cloud...');
    const cloudTranslation = {
      id: `trans-conflict-${uuidv4().substring(0, 8)}`,
      originalText: 'Thank you',
      translatedText: 'Gracias',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      confidence: 0.96,
      source: 'cloud',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      context: 'general'
    };
    
    const cloudResponse = await axios.post(`${config.backendUrl}/api/translations`, cloudTranslation);
    const createdCloudTranslation = cloudResponse.data.translation;
    console.log(`Created cloud translation: ${cloudTranslation.originalText} -> ${cloudTranslation.translatedText}`);
    
    // Sync to edge
    console.log('Syncing to edge...');
    await axios.post(`${config.backendUrl}/api/edge/devices/${deviceId}/sync`, {
      direction: 'cloud-to-edge',
      types: ['translations']
    });
    
    // Wait for sync to complete
    let syncStatus;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await axios.get(`${config.backendUrl}/api/edge/devices/${deviceId}/sync/status`);
      syncStatus = statusResponse.data.status;
      
      attempts++;
    } while (syncStatus === 'in_progress' && attempts < maxAttempts);
    
    // Modify the same translation on both cloud and edge
    console.log('Modifying translation in cloud...');
    const updatedCloudTranslation = {
      ...createdCloudTranslation,
      translatedText: 'Muchas gracias',
      confidence: 0.97,
      timestamp: new Date().toISOString()
    };
    
    await axios.put(`${config.backendUrl}/api/translations/${createdCloudTranslation.id}`, updatedCloudTranslation);
    
    console.log('Modifying translation on edge...');
    const updatedEdgeTranslation = {
      ...createdCloudTranslation,
      translatedText: 'Gracias a ti',
      confidence: 0.92,
      timestamp: new Date().toISOString()
    };
    
    await axios.put(`${config.edgeUrl}/api/translations/${createdCloudTranslation.id}`, updatedEdgeTranslation);
    
    // Initiate bidirectional sync
    console.log('Initiating bidirectional sync...');
    const syncResponse = await axios.post(`${config.backendUrl}/api/edge/devices/${deviceId}/sync`, {
      direction: 'bidirectional',
      types: ['translations'],
      conflictResolution: 'cloud-wins' // Specify conflict resolution strategy
    });
    
    if (!syncResponse.data.success) {
      throw new Error(`Sync initiation failed: ${syncResponse.data.message}`);
    }
    
    // Wait for sync to complete
    console.log('Waiting for sync to complete...');
    attempts = 0;
    
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await axios.get(`${config.backendUrl}/api/edge/devices/${deviceId}/sync/status`);
      syncStatus = statusResponse.data.status;
      
      console.log(`Sync status: ${syncStatus} (attempt ${attempts + 1}/${maxAttempts})`);
      attempts++;
    } while (syncStatus === 'in_progress' && attempts < maxAttempts);
    
    if (syncStatus !== 'completed') {
      throw new Error(`Sync did not complete successfully. Final status: ${syncStatus}`);
    }
    
    // Verify conflict resolution
    console.log('Verifying conflict resolution...');
    
    // Check cloud translation
    const cloudTranslationResponse = await axios.get(`${config.backendUrl}/api/translations/${createdCloudTranslation.id}`);
    const resolvedCloudTranslation = cloudTranslationResponse.data.translation;
    
    // Check edge translation
    const edgeTranslationResponse = await axios.get(`${config.edgeUrl}/api/translations/${createdCloudTranslation.id}`);
    const resolvedEdgeTranslation = edgeTranslationResponse.data.translation;
    
    console.log('Resolved cloud translation:', resolvedCloudTranslation);
    console.log('Resolved edge translation:', resolvedEdgeTranslation);
    
    // Verify both have the same value (cloud wins)
    if (resolvedCloudTranslation.translatedText !== 'Muchas gracias') {
      throw new Error(`Cloud translation not resolved correctly: expected "Muchas gracias", got "${resolvedCloudTranslation.translatedText}"`);
    }
    
    if (resolvedEdgeTranslation.translatedText !== 'Muchas gracias') {
      throw new Error(`Edge translation not resolved correctly: expected "Muchas gracias", got "${resolvedEdgeTranslation.translatedText}"`);
    }
    
    console.log('✅ Conflict resolution successful (cloud wins)');
    
    // Clean up
    console.log('Cleaning up...');
    await axios.delete(`${config.backendUrl}/api/edge/devices/${deviceId}`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error testing conflict resolution:', error.message);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Translation Synchronization Integration Test...');
  
  try {
    // Run tests in sequence
    const cloudToEdgeResult = await testCloudToEdgeSync();
    
    if (!cloudToEdgeResult.success) {
      throw new Error('Cloud-to-edge sync failed, aborting remaining tests');
    }
    
    const deviceId = cloudToEdgeResult.deviceId;
    
    const edgeToCloudResult = await testEdgeToCloudSync(deviceId);
    const conflictResolutionResult = await testConflictResolution(deviceId);
    
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Cloud-to-Edge Sync: ${cloudToEdgeResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Edge-to-Cloud Sync: ${edgeToCloudResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Conflict Resolution: ${conflictResolutionResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    const allPassed = cloudToEdgeResult.success && 
                      edgeToCloudResult.success && 
                      conflictResolutionResult.success;
    
    console.log(`\nOverall result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return allPassed;
  } catch (error) {
    console.error('Error running tests:', error.message);
    return false;
  }
}

// Export for Jest
module.exports = {
  testCloudToEdgeSync,
  testEdgeToCloudSync,
  testConflictResolution,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
