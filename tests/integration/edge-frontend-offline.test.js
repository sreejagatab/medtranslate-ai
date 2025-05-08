/**
 * Edge-Frontend Offline Operation Integration Test
 *
 * This test verifies that the frontend can operate with the edge device
 * in offline mode, including translation, queue management, and synchronization.
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
  status: 'connected',
  supportedLanguages: ['en', 'es', 'fr'],
  batteryLevel: 85,
  storageAvailable: 500,
  version: '1.0.0'
};

// Test transition to offline mode
async function testTransitionToOfflineMode() {
  console.log('\n=== Testing Transition to Offline Mode ===');
  
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
    
    // Mock the edge device connection status
    await page.evaluate(() => {
      localStorage.setItem('edgeDeviceConnected', 'true');
      localStorage.setItem('edgeDeviceId', 'edge-12345678');
    });
    
    // Navigate to system status page
    await page.click('a[href="/system-status"]');
    await page.waitForSelector('div[data-testid="system-status-dashboard"]', { timeout: config.testTimeout });
    
    console.log('Navigated to system status page');
    
    // Mock the system status API response for online mode
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/system/status')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isOnline: true,
            backendStatus: 'connected',
            edgeStatus: 'connected',
            lastSyncTime: new Date().toISOString(),
            syncStatus: 'success',
            networkType: 'wifi'
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Verify online status is displayed
    await page.waitForSelector('div[data-testid="online-status"]', { timeout: config.testTimeout });
    const onlineStatus = await page.$eval('div[data-testid="online-status"]', el => el.textContent);
    
    console.log(`Online status: ${onlineStatus}`);
    
    if (!onlineStatus.includes('Online')) {
      throw new Error(`Online status mismatch: expected "Online", got "${onlineStatus}"`);
    }
    
    console.log('✅ Online status displayed correctly');
    
    // Now simulate going offline
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/system/status')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isOnline: false,
            backendStatus: 'disconnected',
            edgeStatus: 'connected',
            lastSyncTime: new Date().toISOString(),
            syncStatus: 'offline',
            networkType: 'none'
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Refresh status
    await page.click('button[data-testid="refresh-button"]');
    
    // Wait for offline status to be displayed
    await page.waitForSelector('div[data-testid="offline-status"]', { timeout: config.testTimeout });
    const offlineStatus = await page.$eval('div[data-testid="offline-status"]', el => el.textContent);
    
    console.log(`Offline status: ${offlineStatus}`);
    
    if (!offlineStatus.includes('Offline')) {
      throw new Error(`Offline status mismatch: expected "Offline", got "${offlineStatus}"`);
    }
    
    console.log('✅ Transition to offline mode detected');
    
    // Verify offline mode notification is displayed
    await page.waitForSelector('div[data-testid="offline-notification"]', { timeout: config.testTimeout });
    const offlineNotification = await page.$eval('div[data-testid="offline-notification"]', el => el.textContent);
    
    console.log(`Offline notification: ${offlineNotification}`);
    
    if (!offlineNotification.includes('offline mode')) {
      throw new Error(`Offline notification mismatch: expected message about offline mode, got "${offlineNotification}"`);
    }
    
    console.log('✅ Offline mode notification displayed');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing transition to offline mode:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Test translation during offline mode
async function testOfflineTranslation() {
  console.log('\n=== Testing Translation During Offline Mode ===');
  
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
    
    // Mock the edge device connection and offline status
    await page.evaluate(() => {
      localStorage.setItem('edgeDeviceConnected', 'true');
      localStorage.setItem('edgeDeviceId', 'edge-12345678');
      localStorage.setItem('isOffline', 'true');
    });
    
    // Mock the translation API response in offline mode
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/translate') && request.method() === 'POST') {
        const postData = JSON.parse(request.postData());
        
        let translatedText = '';
        if (postData.sourceLanguage === 'en' && postData.targetLanguage === 'es') {
          if (postData.text === 'Hello') translatedText = 'Hola';
          else if (postData.text === 'How are you?') translatedText = '¿Cómo estás?';
          else translatedText = `[Translated to Spanish] ${postData.text}`;
        } else {
          translatedText = `[Translated to ${postData.targetLanguage}] ${postData.text}`;
        }
        
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            originalText: postData.text,
            translatedText: translatedText,
            sourceLanguage: postData.sourceLanguage,
            targetLanguage: postData.targetLanguage,
            confidence: 0.95,
            source: 'edge-offline',
            context: postData.context || 'general',
            queuedForSync: true,
            syncId: uuidv4()
          })
        });
      } else if (request.url().includes('/system/status')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isOnline: false,
            backendStatus: 'disconnected',
            edgeStatus: 'connected',
            lastSyncTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            syncStatus: 'offline',
            networkType: 'none'
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Navigate to translation page
    await page.click('a[href="/translate"]');
    await page.waitForSelector('div[data-testid="translation-panel"]', { timeout: config.testTimeout });
    
    console.log('Navigated to translation page');
    
    // Verify offline mode indicator is displayed
    await page.waitForSelector('div[data-testid="offline-mode-indicator"]', { timeout: config.testTimeout });
    
    console.log('✅ Offline mode indicator displayed on translation page');
    
    // Select languages
    await page.select('select[data-testid="source-language"]', 'en');
    await page.select('select[data-testid="target-language"]', 'es');
    
    console.log('Selected languages: English to Spanish');
    
    // Enter text to translate
    await page.type('textarea[data-testid="source-text"]', 'Hello');
    
    // Click translate button
    await page.click('button[data-testid="translate-button"]');
    
    // Wait for translation result
    await page.waitForSelector('div[data-testid="translation-result"]', { timeout: config.testTimeout });
    
    // Verify translation result
    const translatedText = await page.$eval('div[data-testid="translation-result"]', el => el.textContent);
    const translationSource = await page.$eval('div[data-testid="translation-source"]', el => el.textContent);
    const syncStatus = await page.$eval('div[data-testid="sync-status"]', el => el.textContent);
    
    console.log(`Translated text: ${translatedText}`);
    console.log(`Translation source: ${translationSource}`);
    console.log(`Sync status: ${syncStatus}`);
    
    if (!translatedText.includes('Hola')) {
      throw new Error(`Translation mismatch: expected "Hola", got "${translatedText}"`);
    }
    
    if (!translationSource.includes('edge-offline')) {
      throw new Error(`Translation source mismatch: expected "edge-offline", got "${translationSource}"`);
    }
    
    if (!syncStatus.includes('queued for sync')) {
      throw new Error(`Sync status mismatch: expected "queued for sync", got "${syncStatus}"`);
    }
    
    console.log('✅ Offline translation successful');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing offline translation:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Test queue management during offline mode
async function testQueueManagement() {
  console.log('\n=== Testing Queue Management During Offline Mode ===');
  
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
    
    // Mock the edge device connection and offline status
    await page.evaluate(() => {
      localStorage.setItem('edgeDeviceConnected', 'true');
      localStorage.setItem('edgeDeviceId', 'edge-12345678');
      localStorage.setItem('isOffline', 'true');
    });
    
    // Mock the queue API response
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/sync/queue')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            queueSize: 5,
            queueStatus: 'pending',
            lastSyncTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            items: [
              { id: 'item-1', type: 'translation', timestamp: new Date(Date.now() - 300000).toISOString() },
              { id: 'item-2', type: 'translation', timestamp: new Date(Date.now() - 240000).toISOString() },
              { id: 'item-3', type: 'translation', timestamp: new Date(Date.now() - 180000).toISOString() },
              { id: 'item-4', type: 'translation', timestamp: new Date(Date.now() - 120000).toISOString() },
              { id: 'item-5', type: 'translation', timestamp: new Date(Date.now() - 60000).toISOString() }
            ]
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Navigate to offline queue page
    await page.click('a[href="/offline-queue"]');
    await page.waitForSelector('div[data-testid="offline-queue-panel"]', { timeout: config.testTimeout });
    
    console.log('Navigated to offline queue page');
    
    // Verify queue information is displayed
    const queueSize = await page.$eval('div[data-testid="queue-size"]', el => el.textContent);
    const queueStatus = await page.$eval('div[data-testid="queue-status"]', el => el.textContent);
    const lastSyncTime = await page.$eval('div[data-testid="last-sync-time"]', el => el.textContent);
    
    console.log(`Queue size: ${queueSize}`);
    console.log(`Queue status: ${queueStatus}`);
    console.log(`Last sync time: ${lastSyncTime}`);
    
    if (!queueSize.includes('5')) {
      throw new Error(`Queue size mismatch: expected "5", got "${queueSize}"`);
    }
    
    if (!queueStatus.includes('pending')) {
      throw new Error(`Queue status mismatch: expected "pending", got "${queueStatus}"`);
    }
    
    if (!lastSyncTime.includes('hour ago')) {
      throw new Error(`Last sync time mismatch: expected "hour ago", got "${lastSyncTime}"`);
    }
    
    console.log('✅ Queue information displayed correctly');
    
    // Verify queue items are displayed
    const queueItems = await page.$$('div[data-testid="queue-item"]');
    
    console.log(`Queue items displayed: ${queueItems.length}`);
    
    if (queueItems.length !== 5) {
      throw new Error(`Queue items count mismatch: expected 5, got ${queueItems.length}`);
    }
    
    console.log('✅ Queue items displayed correctly');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing queue management:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Test synchronization after reconnection
async function testSynchronizationAfterReconnection() {
  console.log('\n=== Testing Synchronization After Reconnection ===');
  
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
    
    // Mock the edge device connection and offline status
    await page.evaluate(() => {
      localStorage.setItem('edgeDeviceConnected', 'true');
      localStorage.setItem('edgeDeviceId', 'edge-12345678');
      localStorage.setItem('isOffline', 'true');
    });
    
    // Navigate to offline queue page
    await page.click('a[href="/offline-queue"]');
    await page.waitForSelector('div[data-testid="offline-queue-panel"]', { timeout: config.testTimeout });
    
    console.log('Navigated to offline queue page');
    
    // Mock the queue API response for offline mode
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/sync/queue')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            queueSize: 5,
            queueStatus: 'pending',
            lastSyncTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            items: [
              { id: 'item-1', type: 'translation', timestamp: new Date(Date.now() - 300000).toISOString() },
              { id: 'item-2', type: 'translation', timestamp: new Date(Date.now() - 240000).toISOString() },
              { id: 'item-3', type: 'translation', timestamp: new Date(Date.now() - 180000).toISOString() },
              { id: 'item-4', type: 'translation', timestamp: new Date(Date.now() - 120000).toISOString() },
              { id: 'item-5', type: 'translation', timestamp: new Date(Date.now() - 60000).toISOString() }
            ]
          })
        });
      } else if (request.url().includes('/system/status')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isOnline: false,
            backendStatus: 'disconnected',
            edgeStatus: 'connected',
            lastSyncTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            syncStatus: 'offline',
            networkType: 'none'
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Verify offline status
    await page.waitForSelector('div[data-testid="offline-status-indicator"]', { timeout: config.testTimeout });
    
    console.log('✅ Offline status indicator displayed');
    
    // Now simulate coming back online
    await page.evaluate(() => {
      localStorage.setItem('isOffline', 'false');
    });
    
    // Mock the system status and sync API responses for online mode
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/system/status')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isOnline: true,
            backendStatus: 'connected',
            edgeStatus: 'connected',
            lastSyncTime: new Date().toISOString(),
            syncStatus: 'success',
            networkType: 'wifi'
          })
        });
      } else if (request.url().includes('/sync/force') && request.method() === 'POST') {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            itemsSynced: 5,
            failedItems: 0,
            timestamp: new Date().toISOString()
          })
        });
      } else if (request.url().includes('/sync/queue')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            queueSize: 0,
            queueStatus: 'synced',
            lastSyncTime: new Date().toISOString(),
            items: []
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Refresh status
    await page.click('button[data-testid="refresh-button"]');
    
    // Wait for online status to be displayed
    await page.waitForSelector('div[data-testid="online-status-indicator"]', { timeout: config.testTimeout });
    
    console.log('✅ Online status indicator displayed after reconnection');
    
    // Click sync button
    await page.click('button[data-testid="sync-button"]');
    
    // Wait for sync success message
    await page.waitForSelector('div[data-testid="sync-success-message"]', { timeout: config.testTimeout });
    const syncMessage = await page.$eval('div[data-testid="sync-success-message"]', el => el.textContent);
    
    console.log(`Sync message: ${syncMessage}`);
    
    if (!syncMessage.includes('successfully synced')) {
      throw new Error(`Sync message mismatch: expected message about successful sync, got "${syncMessage}"`);
    }
    
    console.log('✅ Sync success message displayed');
    
    // Verify queue is empty after sync
    const queueSize = await page.$eval('div[data-testid="queue-size"]', el => el.textContent);
    const queueStatus = await page.$eval('div[data-testid="queue-status"]', el => el.textContent);
    
    console.log(`Queue size after sync: ${queueSize}`);
    console.log(`Queue status after sync: ${queueStatus}`);
    
    if (!queueSize.includes('0')) {
      throw new Error(`Queue size mismatch after sync: expected "0", got "${queueSize}"`);
    }
    
    if (!queueStatus.includes('synced')) {
      throw new Error(`Queue status mismatch after sync: expected "synced", got "${queueStatus}"`);
    }
    
    console.log('✅ Queue empty after synchronization');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing synchronization after reconnection:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Edge-Frontend Offline Operation Integration Test...');
  
  try {
    // Run tests in sequence
    const testResults = {
      transitionToOfflineMode: await testTransitionToOfflineMode(),
      offlineTranslation: await testOfflineTranslation(),
      queueManagement: await testQueueManagement(),
      synchronizationAfterReconnection: await testSynchronizationAfterReconnection()
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
  testTransitionToOfflineMode,
  testOfflineTranslation,
  testQueueManagement,
  testSynchronizationAfterReconnection,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
