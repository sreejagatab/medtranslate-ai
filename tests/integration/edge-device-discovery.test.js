/**
 * Edge Device Discovery Integration Test
 *
 * This test verifies that the backend can discover, register, and manage edge devices.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');

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
  macAddress: '00:11:22:33:44:55',
  supportedLanguages: ['en', 'es', 'fr'],
  capabilities: {
    translation: true,
    audioProcessing: true,
    offlineMode: true
  },
  specs: {
    cpu: 'ARM Cortex-A72',
    memory: '4GB',
    storage: '64GB',
    battery: true
  },
  version: '1.0.0'
};

// Test edge device registration
async function testEdgeDeviceRegistration() {
  console.log('\n=== Testing Edge Device Registration ===');
  
  try {
    // Register edge device with backend
    console.log('Registering edge device with backend...');
    const registrationResponse = await axios.post(`${config.backendUrl}/api/edge/register`, mockEdgeDevice);
    
    // Verify registration response
    if (!registrationResponse.data.success) {
      throw new Error(`Registration failed: ${registrationResponse.data.message}`);
    }
    
    console.log('Registration response:', registrationResponse.data);
    
    // Verify device ID is returned
    if (!registrationResponse.data.deviceId) {
      throw new Error('Registration response missing deviceId');
    }
    
    // Store the registered device ID
    const registeredDeviceId = registrationResponse.data.deviceId;
    console.log(`Device registered with ID: ${registeredDeviceId}`);
    
    // Verify device is registered by getting device details
    console.log('Verifying device registration...');
    const deviceResponse = await axios.get(`${config.backendUrl}/api/edge/devices/${registeredDeviceId}`);
    
    // Verify device details
    if (!deviceResponse.data.device) {
      throw new Error('Device details response missing device data');
    }
    
    const device = deviceResponse.data.device;
    console.log('Device details:', device);
    
    // Verify device properties
    if (device.name !== mockEdgeDevice.name) {
      throw new Error(`Device name mismatch: expected "${mockEdgeDevice.name}", got "${device.name}"`);
    }
    
    if (device.ipAddress !== mockEdgeDevice.ipAddress) {
      throw new Error(`Device IP address mismatch: expected "${mockEdgeDevice.ipAddress}", got "${device.ipAddress}"`);
    }
    
    console.log('✅ Edge device registration successful');
    return { success: true, deviceId: registeredDeviceId };
  } catch (error) {
    console.error('❌ Error testing edge device registration:', error.message);
    return { success: false, error: error.message };
  }
}

// Test edge device status updates
async function testEdgeDeviceStatusUpdates(deviceId) {
  console.log('\n=== Testing Edge Device Status Updates ===');
  
  try {
    // Update device status
    console.log('Updating device status...');
    const statusUpdate = {
      deviceId,
      status: 'online',
      batteryLevel: 85,
      storageAvailable: 45.5, // GB
      networkStatus: 'wifi',
      lastSyncTime: new Date().toISOString()
    };
    
    const updateResponse = await axios.post(`${config.backendUrl}/api/edge/status`, statusUpdate);
    
    // Verify update response
    if (!updateResponse.data.success) {
      throw new Error(`Status update failed: ${updateResponse.data.message}`);
    }
    
    console.log('Status update response:', updateResponse.data);
    
    // Verify status is updated by getting device details
    console.log('Verifying status update...');
    const deviceResponse = await axios.get(`${config.backendUrl}/api/edge/devices/${deviceId}`);
    
    // Verify device details
    if (!deviceResponse.data.device) {
      throw new Error('Device details response missing device data');
    }
    
    const device = deviceResponse.data.device;
    console.log('Updated device details:', device);
    
    // Verify status properties
    if (device.status !== statusUpdate.status) {
      throw new Error(`Device status mismatch: expected "${statusUpdate.status}", got "${device.status}"`);
    }
    
    if (device.batteryLevel !== statusUpdate.batteryLevel) {
      throw new Error(`Battery level mismatch: expected ${statusUpdate.batteryLevel}, got ${device.batteryLevel}`);
    }
    
    console.log('✅ Edge device status updates successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Error testing edge device status updates:', error.message);
    return { success: false, error: error.message };
  }
}

// Test edge device discovery
async function testEdgeDeviceDiscovery() {
  console.log('\n=== Testing Edge Device Discovery ===');
  
  try {
    // Get list of available edge devices
    console.log('Discovering edge devices...');
    const discoveryResponse = await axios.get(`${config.backendUrl}/api/edge/discover`);
    
    // Verify discovery response
    if (!discoveryResponse.data.devices) {
      throw new Error('Discovery response missing devices array');
    }
    
    const devices = discoveryResponse.data.devices;
    console.log(`Discovered ${devices.length} edge devices`);
    
    // Verify our registered device is in the list
    const registeredDevice = devices.find(device => device.name === mockEdgeDevice.name);
    
    if (!registeredDevice) {
      throw new Error(`Registered device "${mockEdgeDevice.name}" not found in discovery results`);
    }
    
    console.log('Registered device found in discovery results:', registeredDevice);
    
    console.log('✅ Edge device discovery successful');
    return { success: true, devices };
  } catch (error) {
    console.error('❌ Error testing edge device discovery:', error.message);
    return { success: false, error: error.message };
  }
}

// Test edge device configuration
async function testEdgeDeviceConfiguration(deviceId) {
  console.log('\n=== Testing Edge Device Configuration ===');
  
  try {
    // Update device configuration
    console.log('Updating device configuration...');
    const configUpdate = {
      syncInterval: 15, // minutes
      offlineMode: 'enabled',
      cacheSize: 500, // MB
      logLevel: 'info',
      powerSavingMode: 'auto'
    };
    
    const updateResponse = await axios.post(`${config.backendUrl}/api/edge/devices/${deviceId}/config`, configUpdate);
    
    // Verify update response
    if (!updateResponse.data.success) {
      throw new Error(`Configuration update failed: ${updateResponse.data.message}`);
    }
    
    console.log('Configuration update response:', updateResponse.data);
    
    // Verify configuration is updated by getting device details
    console.log('Verifying configuration update...');
    const deviceResponse = await axios.get(`${config.backendUrl}/api/edge/devices/${deviceId}`);
    
    // Verify device details
    if (!deviceResponse.data.device || !deviceResponse.data.device.config) {
      throw new Error('Device details response missing device config data');
    }
    
    const deviceConfig = deviceResponse.data.device.config;
    console.log('Updated device configuration:', deviceConfig);
    
    // Verify config properties
    if (deviceConfig.syncInterval !== configUpdate.syncInterval) {
      throw new Error(`Sync interval mismatch: expected ${configUpdate.syncInterval}, got ${deviceConfig.syncInterval}`);
    }
    
    if (deviceConfig.offlineMode !== configUpdate.offlineMode) {
      throw new Error(`Offline mode mismatch: expected "${configUpdate.offlineMode}", got "${deviceConfig.offlineMode}"`);
    }
    
    console.log('✅ Edge device configuration successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Error testing edge device configuration:', error.message);
    return { success: false, error: error.message };
  }
}

// Test edge device deregistration
async function testEdgeDeviceDeregistration(deviceId) {
  console.log('\n=== Testing Edge Device Deregistration ===');
  
  try {
    // Deregister edge device
    console.log('Deregistering edge device...');
    const deregistrationResponse = await axios.delete(`${config.backendUrl}/api/edge/devices/${deviceId}`);
    
    // Verify deregistration response
    if (!deregistrationResponse.data.success) {
      throw new Error(`Deregistration failed: ${deregistrationResponse.data.message}`);
    }
    
    console.log('Deregistration response:', deregistrationResponse.data);
    
    // Verify device is deregistered by trying to get device details
    console.log('Verifying device deregistration...');
    try {
      await axios.get(`${config.backendUrl}/api/edge/devices/${deviceId}`);
      throw new Error('Device still exists after deregistration');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('Device not found after deregistration, as expected');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Edge device deregistration successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Error testing edge device deregistration:', error.message);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Edge Device Discovery Integration Test...');
  
  try {
    // Run tests in sequence
    const registrationResult = await testEdgeDeviceRegistration();
    
    if (!registrationResult.success) {
      throw new Error('Edge device registration failed, aborting remaining tests');
    }
    
    const deviceId = registrationResult.deviceId;
    
    const statusResult = await testEdgeDeviceStatusUpdates(deviceId);
    const discoveryResult = await testEdgeDeviceDiscovery();
    const configResult = await testEdgeDeviceConfiguration(deviceId);
    const deregistrationResult = await testEdgeDeviceDeregistration(deviceId);
    
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Registration: ${registrationResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Status Updates: ${statusResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Discovery: ${discoveryResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Configuration: ${configResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Deregistration: ${deregistrationResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    const allPassed = registrationResult.success && 
                      statusResult.success && 
                      discoveryResult.success && 
                      configResult.success && 
                      deregistrationResult.success;
    
    console.log(`\nOverall result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return allPassed;
  } catch (error) {
    console.error('Error running tests:', error.message);
    return false;
  }
}

// Export for Jest
module.exports = {
  testEdgeDeviceRegistration,
  testEdgeDeviceStatusUpdates,
  testEdgeDeviceDiscovery,
  testEdgeDeviceConfiguration,
  testEdgeDeviceDeregistration,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
