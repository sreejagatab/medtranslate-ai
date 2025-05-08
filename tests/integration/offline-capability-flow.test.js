/**
 * Offline Capability Flow End-to-End Test
 *
 * This test verifies the complete offline capability workflow:
 * 1. Edge device connection
 * 2. Network disconnection
 * 3. Offline translation
 * 4. Queue accumulation
 * 5. Network reconnection
 * 6. Synchronization
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

// Mock translation data
const mockTranslations = [
  { original: 'Hello', translated: 'Hola' },
  { original: 'How are you?', translated: '¿Cómo estás?' },
  { original: 'I have a headache', translated: 'Tengo dolor de cabeza' },
  { original: 'I feel dizzy', translated: 'Me siento mareado' },
  { original: 'My throat hurts', translated: 'Me duele la garganta' }
];

// Run the complete offline capability flow test
async function runOfflineCapabilityFlowTest() {
  console.log('Starting Offline Capability Flow End-to-End Test...');
  
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
    
    // Step 1: Edge device connection
    console.log('\n=== Step 1: Edge Device Connection ===');
    
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
      } else if (request.url().includes('/edge/connect') && request.method() === 'POST') {
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
      } else if (request.url().includes('/system/status')) {
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
    
    // Navigate to edge device discovery page
    await page.click('a[href="/edge-devices"]');
    await page.waitForSelector('button[data-testid="scan-button"]', { timeout: config.testTimeout });
    
    console.log('Navigated to edge devices page');
    
    // Click scan button
    await page.click('button[data-testid="scan-button"]');
    
    // Wait for device to appear in the list
    await page.waitForSelector(`div[data-testid="device-${mockEdgeDevice.id}"]`, { timeout: config.testTimeout });
    
    console.log('Edge device found in the list');
    
    // Click connect button
    await page.click(`div[data-testid="device-${mockEdgeDevice.id}"] button[data-testid="connect-button"]`);
    
    // Wait for connection success message
    await page.waitForSelector('div[data-testid="connection-success"]', { timeout: config.testTimeout });
    
    console.log('✅ Successfully connected to edge device');
    
    // Step 2: Network disconnection
    console.log('\n=== Step 2: Network Disconnection ===');
    
    // Navigate to system status page
    await page.click('a[href="/system-status"]');
    await page.waitForSelector('div[data-testid="system-status-dashboard"]', { timeout: config.testTimeout });
    
    console.log('Navigated to system status page');
    
    // Simulate network disconnection
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
    
    // Update local storage to reflect offline status
    await page.evaluate(() => {
      localStorage.setItem('isOffline', 'true');
    });
    
    // Refresh status
    await page.click('button[data-testid="refresh-button"]');
    
    // Wait for offline status to be displayed
    await page.waitForSelector('div[data-testid="offline-status"]', { timeout: config.testTimeout });
    
    console.log('✅ Network disconnection detected');
    
    // Step 3: Offline translation
    console.log('\n=== Step 3: Offline Translation ===');
    
    // Mock the translation API response in offline mode
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/translate') && request.method() === 'POST') {
        const postData = JSON.parse(request.postData());
        
        let translatedText = '';
        if (postData.sourceLanguage === 'en' && postData.targetLanguage === 'es') {
          const mockTranslation = mockTranslations.find(t => t.original === postData.text);
          translatedText = mockTranslation ? mockTranslation.translated : `[Translated to Spanish] ${postData.text}`;
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
    
    console.log('Offline mode indicator displayed on translation page');
    
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
    
    console.log(`Translated text: ${translatedText}`);
    
    if (!translatedText.includes('Hola')) {
      throw new Error(`Translation mismatch: expected "Hola", got "${translatedText}"`);
    }
    
    console.log('✅ Offline translation successful');
    
    // Step 4: Queue accumulation
    console.log('\n=== Step 4: Queue Accumulation ===');
    
    // Perform multiple translations to accumulate in the queue
    for (let i = 1; i < mockTranslations.length; i++) {
      // Clear previous text
      await page.$eval('textarea[data-testid="source-text"]', el => el.value = '');
      
      // Enter new text to translate
      await page.type('textarea[data-testid="source-text"]', mockTranslations[i].original);
      
      // Click translate button
      await page.click('button[data-testid="translate-button"]');
      
      // Wait for translation result
      await page.waitForFunction(
        (expected) => document.querySelector('div[data-testid="translation-result"]').textContent.includes(expected),
        { timeout: config.testTimeout },
        mockTranslations[i].translated
      );
      
      console.log(`Translated: ${mockTranslations[i].original} -> ${mockTranslations[i].translated}`);
    }
    
    // Mock the queue API response
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/sync/queue')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            queueSize: mockTranslations.length,
            queueStatus: 'pending',
            lastSyncTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            items: mockTranslations.map((t, i) => ({
              id: `item-${i+1}`,
              type: 'translation',
              timestamp: new Date(Date.now() - (mockTranslations.length - i) * 60000).toISOString(),
              data: {
                original: t.original,
                translated: t.translated
              }
            }))
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
    
    // Verify queue size
    const queueSize = await page.$eval('div[data-testid="queue-size"]', el => el.textContent);
    
    console.log(`Queue size: ${queueSize}`);
    
    if (!queueSize.includes(mockTranslations.length.toString())) {
      throw new Error(`Queue size mismatch: expected "${mockTranslations.length}", got "${queueSize}"`);
    }
    
    console.log(`✅ Queue accumulated with ${mockTranslations.length} translations`);
    
    // Step 5: Network reconnection
    console.log('\n=== Step 5: Network Reconnection ===');
    
    // Simulate network reconnection
    await page.evaluate(() => {
      localStorage.setItem('isOffline', 'false');
    });
    
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
    
    // Refresh status
    await page.click('button[data-testid="refresh-button"]');
    
    // Wait for online status to be displayed
    await page.waitForSelector('div[data-testid="online-status-indicator"]', { timeout: config.testTimeout });
    
    console.log('✅ Network reconnection detected');
    
    // Step 6: Synchronization
    console.log('\n=== Step 6: Synchronization ===');
    
    // Mock the sync API response
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/sync/force') && request.method() === 'POST') {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            itemsSynced: mockTranslations.length,
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
    
    // Click sync button
    await page.click('button[data-testid="sync-button"]');
    
    // Wait for sync success message
    await page.waitForSelector('div[data-testid="sync-success-message"]', { timeout: config.testTimeout });
    
    console.log('✅ Synchronization successful');
    
    // Verify queue is empty after sync
    const queueSizeAfterSync = await page.$eval('div[data-testid="queue-size"]', el => el.textContent);
    
    console.log(`Queue size after sync: ${queueSizeAfterSync}`);
    
    if (!queueSizeAfterSync.includes('0')) {
      throw new Error(`Queue size mismatch after sync: expected "0", got "${queueSizeAfterSync}"`);
    }
    
    console.log('✅ Queue empty after synchronization');
    
    console.log('\n=== Offline Capability Flow Test Completed Successfully ===');
    return true;
  } catch (error) {
    console.error('❌ Error in offline capability flow test:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Export for Jest
module.exports = {
  runOfflineCapabilityFlowTest
};

// Run test if executed directly
if (require.main === module) {
  runOfflineCapabilityFlowTest();
}
