/**
 * Edge-Frontend Connection Integration Test
 *
 * This test verifies that the frontend can discover, connect to,
 * and monitor the status of edge devices.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3003',
  patientAppUrl: process.env.PATIENT_APP_URL || 'http://localhost:3002',
  providerAppUrl: process.env.PROVIDER_APP_URL || 'http://localhost:3000',
  adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3004',
  testTimeout: 60000 // 60 seconds
};

// Mock edge device data
const mockEdgeDevice = {
  id: `edge-${uuidv4().substring(0, 8)}`,
  name: 'Test Edge Device',
  status: 'available',
  supportedLanguages: ['en', 'es', 'fr'],
  batteryLevel: 85,
  storageAvailable: 500,
  version: '1.0.0'
};

// Test edge device discovery and connection
async function testEdgeDeviceDiscovery() {
  console.log('\n=== Testing Edge Device Discovery ===');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Open patient app
    const page = await browser.newPage();
    await page.goto(config.patientAppUrl, { waitUntil: 'networkidle2', timeout: config.testTimeout });
    
    console.log('Patient app loaded');
    
    // Mock the edge device discovery API response
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/edge/discover')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            devices: [mockEdgeDevice]
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Navigate to edge device discovery page
    await page.click('a[href="/edge-devices"]');
    await page.waitForSelector('button[data-testid="scan-button"]', { timeout: config.testTimeout });
    
    console.log('Navigated to edge devices page');
    
    // Click scan button
    await page.click('button[data-testid="scan-button"]');
    
    // Wait for device to appear in the list
    await page.waitForSelector(`div[data-testid="device-${mockEdgeDevice.id}"]`, { timeout: config.testTimeout });
    
    console.log('Edge device found in the list');
    
    // Verify device details are displayed correctly
    const deviceName = await page.$eval(`div[data-testid="device-${mockEdgeDevice.id}"] h3`, el => el.textContent);
    const deviceStatus = await page.$eval(`div[data-testid="device-${mockEdgeDevice.id}"] .status`, el => el.textContent);
    
    console.log(`Device name: ${deviceName}`);
    console.log(`Device status: ${deviceStatus}`);
    
    if (deviceName !== mockEdgeDevice.name) {
      throw new Error(`Device name mismatch: expected "${mockEdgeDevice.name}", got "${deviceName}"`);
    }
    
    if (!deviceStatus.includes('available')) {
      throw new Error(`Device status mismatch: expected "available", got "${deviceStatus}"`);
    }
    
    console.log('✅ Device details displayed correctly');
    
    // Mock the edge device connection API response
    page.on('request', async (request) => {
      if (request.url().includes('/edge/connect')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            deviceId: mockEdgeDevice.id,
            deviceName: mockEdgeDevice.name,
            status: 'connected'
          })
        });
      }
    });
    
    // Click connect button
    await page.click(`div[data-testid="device-${mockEdgeDevice.id}"] button[data-testid="connect-button"]`);
    
    // Wait for connection success message
    await page.waitForSelector('div[data-testid="connection-success"]', { timeout: config.testTimeout });
    
    console.log('✅ Successfully connected to edge device');
    
    // Verify connection status is updated
    const connectionStatus = await page.$eval('div[data-testid="connection-status"]', el => el.textContent);
    
    console.log(`Connection status: ${connectionStatus}`);
    
    if (!connectionStatus.includes('connected')) {
      throw new Error(`Connection status mismatch: expected "connected", got "${connectionStatus}"`);
    }
    
    console.log('✅ Connection status updated correctly');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing edge device discovery:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Test edge device status monitoring
async function testEdgeDeviceStatusMonitoring() {
  console.log('\n=== Testing Edge Device Status Monitoring ===');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Open patient app
    const page = await browser.newPage();
    await page.goto(config.patientAppUrl, { waitUntil: 'networkidle2', timeout: config.testTimeout });
    
    console.log('Patient app loaded');
    
    // Mock the edge device status API response
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/edge/status')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            deviceId: mockEdgeDevice.id,
            deviceName: mockEdgeDevice.name,
            status: 'healthy',
            batteryLevel: mockEdgeDevice.batteryLevel,
            storageAvailable: mockEdgeDevice.storageAvailable,
            networkStatus: 'connected',
            lastSyncTime: new Date().toISOString(),
            syncStatus: 'success',
            queueSize: 0
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Navigate to system status page
    await page.click('a[href="/system-status"]');
    await page.waitForSelector('div[data-testid="system-status-dashboard"]', { timeout: config.testTimeout });
    
    console.log('Navigated to system status page');
    
    // Wait for edge device status to be displayed
    await page.waitForSelector('div[data-testid="edge-device-status"]', { timeout: config.testTimeout });
    
    console.log('Edge device status displayed');
    
    // Verify status details are displayed correctly
    const deviceStatus = await page.$eval('div[data-testid="edge-device-status"] .status', el => el.textContent);
    const batteryLevel = await page.$eval('div[data-testid="edge-device-status"] .battery', el => el.textContent);
    const storageAvailable = await page.$eval('div[data-testid="edge-device-status"] .storage', el => el.textContent);
    
    console.log(`Device status: ${deviceStatus}`);
    console.log(`Battery level: ${batteryLevel}`);
    console.log(`Storage available: ${storageAvailable}`);
    
    if (!deviceStatus.includes('healthy')) {
      throw new Error(`Device status mismatch: expected "healthy", got "${deviceStatus}"`);
    }
    
    if (!batteryLevel.includes('85%')) {
      throw new Error(`Battery level mismatch: expected "85%", got "${batteryLevel}"`);
    }
    
    if (!storageAvailable.includes('500')) {
      throw new Error(`Storage available mismatch: expected "500", got "${storageAvailable}"`);
    }
    
    console.log('✅ Device status details displayed correctly');
    
    // Test status refresh
    await page.click('button[data-testid="refresh-button"]');
    
    // Wait for refresh to complete
    await page.waitForFunction(
      () => document.querySelector('div[data-testid="last-updated"]').textContent.includes('just now'),
      { timeout: config.testTimeout }
    );
    
    console.log('✅ Status refresh successful');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing edge device status monitoring:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Edge-Frontend Connection Integration Test...');
  
  try {
    // Run tests in sequence
    const testResults = {
      edgeDeviceDiscovery: await testEdgeDeviceDiscovery(),
      edgeDeviceStatusMonitoring: await testEdgeDeviceStatusMonitoring()
    };
    
    // Print summary
    console.log('\n=== Test Summary ===');
    for (const [test, result] of Object.entries(testResults)) {
      console.log(`${result ? '✅' : '❌'} ${test}`);
    }
    
    const allPassed = Object.values(testResults).every(result => result);
    console.log(`\nOverall result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return allPassed;
  } catch (error) {
    console.error('Error running tests:', error);
    return false;
  }
}

// Export for Jest
module.exports = {
  testEdgeDeviceDiscovery,
  testEdgeDeviceStatusMonitoring,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
