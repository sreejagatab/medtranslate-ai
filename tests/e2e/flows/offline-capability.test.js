/**
 * E2E Test for Offline Capability Flow
 * 
 * This test verifies the offline capabilities of the MedTranslate AI system.
 */

const { config, launchBrowser, createPage } = require('../config/setup');
const { loginAsProvider } = require('../helpers/auth-helper');
const { navigateToProviderTranslation } = require('../helpers/navigation-helper');
const { 
  generateTranslationData,
  generateProviderData,
  createTestUser,
  cleanupTestData
} = require('../utils/test-data');
const { 
  takeScreenshot,
  takeFailureScreenshot,
  takeSuccessScreenshot
} = require('../utils/screenshot-manager');

// Test configuration
const TEST_NAME = 'offline-capability-flow';
const TEST_TIMEOUT = 180000; // 3 minutes

// Test data
let providerData;
let providerId;
let translationData;

// Browser and page objects
let browser;
let providerPage;

// Set test timeout
jest.setTimeout(TEST_TIMEOUT);

describe('Offline Capability Flow', () => {
  beforeAll(async () => {
    try {
      // Generate test data
      providerData = generateProviderData();
      translationData = generateTranslationData('en', 'es');
      
      // Create test user
      const createdProvider = await createTestUser('provider', providerData);
      providerId = createdProvider.id;
      
      // Launch browser
      browser = await launchBrowser();
      
      // Create page
      providerPage = await createPage(browser);
      
      // Login as provider
      await loginAsProvider(providerPage);
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    try {
      // Clean up test data
      await cleanupTestData([providerId]);
      
      // Close browser
      if (browser) {
        await browser.close();
      }
    } catch (error) {
      console.error('Error in test cleanup:', error);
    }
  });
  
  test('Provider can see online status indicator', async () => {
    try {
      // Navigate to provider translation page
      await navigateToProviderTranslation(providerPage);
      await takeScreenshot(providerPage, TEST_NAME, 'provider-translation-page');
      
      // Check for online status indicator
      const onlineIndicator = await providerPage.$('.online-status-indicator.online');
      expect(onlineIndicator).not.toBeNull();
      
      // Take screenshot of online status
      await takeScreenshot(providerPage, TEST_NAME, 'provider-online-status');
    } catch (error) {
      await takeFailureScreenshot(providerPage, TEST_NAME, 'provider-online-status-failure');
      throw error;
    }
  });
  
  test('Provider can see caching status indicator', async () => {
    try {
      // Check for caching status indicator
      const cachingIndicator = await providerPage.$('.caching-status-indicator');
      expect(cachingIndicator).not.toBeNull();
      
      // Take screenshot of caching status
      await takeScreenshot(providerPage, TEST_NAME, 'provider-caching-status');
      
      // Check caching status text
      const cachingStatusText = await providerPage.$eval('.caching-status-indicator', el => el.textContent);
      expect(cachingStatusText).toContain('Cached');
    } catch (error) {
      await takeFailureScreenshot(providerPage, TEST_NAME, 'provider-caching-status-failure');
      throw error;
    }
  });
  
  test('Provider can simulate offline mode', async () => {
    try {
      // Click on network settings
      await providerPage.click('.network-settings-button');
      await providerPage.waitForSelector('.network-settings-panel', { timeout: config.timeouts.element });
      
      // Take screenshot of network settings panel
      await takeScreenshot(providerPage, TEST_NAME, 'provider-network-settings');
      
      // Enable offline mode
      await providerPage.click('.simulate-offline-button');
      
      // Wait for offline indicator
      await providerPage.waitForSelector('.online-status-indicator.offline', { timeout: config.timeouts.element });
      
      // Take screenshot of offline status
      await takeScreenshot(providerPage, TEST_NAME, 'provider-offline-status');
      
      // Check offline status text
      const offlineStatusText = await providerPage.$eval('.online-status-indicator.offline', el => el.textContent);
      expect(offlineStatusText).toContain('Offline');
    } catch (error) {
      await takeFailureScreenshot(providerPage, TEST_NAME, 'provider-offline-mode-failure');
      throw error;
    }
  });
  
  test('Provider can perform translations in offline mode', async () => {
    try {
      // Start a new offline session
      await providerPage.click('.new-offline-session-button');
      await providerPage.waitForSelector('.offline-session-setup-form', { timeout: config.timeouts.element });
      
      // Fill in session details
      await providerPage.select('select[name="patientLanguage"]', 'es');
      await providerPage.select('select[name="medicalContext"]', 'general');
      await providerPage.click('.create-offline-session-button');
      
      // Wait for offline session to be created
      await providerPage.waitForSelector('.offline-session-active', { timeout: config.timeouts.navigation });
      await takeScreenshot(providerPage, TEST_NAME, 'provider-offline-session-created');
      
      // Send a message in offline mode
      await providerPage.type('.message-input', translationData.sourceText);
      await providerPage.click('.send-message-button');
      
      // Wait for message to appear in provider's chat
      await providerPage.waitForSelector('.message-sent', { timeout: config.timeouts.element });
      await takeScreenshot(providerPage, TEST_NAME, 'provider-offline-message-sent');
      
      // Wait for translated message to appear
      await providerPage.waitForSelector('.message-translated', { timeout: config.timeouts.element });
      await takeScreenshot(providerPage, TEST_NAME, 'provider-offline-message-translated');
      
      // Verify message was translated
      const translatedMessages = await providerPage.$$eval('.message-translated', elements => 
        elements.map(el => el.textContent.trim())
      );
      
      expect(translatedMessages.length).toBeGreaterThan(0);
      
      // Check for offline translation indicator
      const offlineTranslationIndicator = await providerPage.$('.offline-translation-indicator');
      expect(offlineTranslationIndicator).not.toBeNull();
      
      // Take success screenshot
      await takeSuccessScreenshot(providerPage, TEST_NAME, 'provider-offline-translation-success');
    } catch (error) {
      await takeFailureScreenshot(providerPage, TEST_NAME, 'provider-offline-translation-failure');
      throw error;
    }
  });
  
  test('Provider can return to online mode and sync offline translations', async () => {
    try {
      // Click on network settings
      await providerPage.click('.network-settings-button');
      await providerPage.waitForSelector('.network-settings-panel', { timeout: config.timeouts.element });
      
      // Disable offline mode
      await providerPage.click('.simulate-online-button');
      
      // Wait for online indicator
      await providerPage.waitForSelector('.online-status-indicator.online', { timeout: config.timeouts.element });
      
      // Take screenshot of online status
      await takeScreenshot(providerPage, TEST_NAME, 'provider-back-online-status');
      
      // Check for sync indicator
      await providerPage.waitForSelector('.sync-in-progress-indicator', { timeout: config.timeouts.element });
      await takeScreenshot(providerPage, TEST_NAME, 'provider-sync-in-progress');
      
      // Wait for sync to complete
      await providerPage.waitForSelector('.sync-complete-indicator', { timeout: config.timeouts.navigation });
      await takeScreenshot(providerPage, TEST_NAME, 'provider-sync-complete');
      
      // Check sync status text
      const syncStatusText = await providerPage.$eval('.sync-complete-indicator', el => el.textContent);
      expect(syncStatusText).toContain('Sync Complete');
      
      // Verify offline translations were synced
      const syncedMessages = await providerPage.$$eval('.message-synced', elements => 
        elements.map(el => el.textContent.trim())
      );
      
      expect(syncedMessages.length).toBeGreaterThan(0);
      
      // Take success screenshot
      await takeSuccessScreenshot(providerPage, TEST_NAME, 'provider-sync-success');
    } catch (error) {
      await takeFailureScreenshot(providerPage, TEST_NAME, 'provider-sync-failure');
      throw error;
    }
  });
  
  test('Provider can view offline usage statistics', async () => {
    try {
      // Navigate to offline statistics
      await providerPage.click('.offline-statistics-button');
      await providerPage.waitForSelector('.offline-statistics-panel', { timeout: config.timeouts.element });
      
      // Take screenshot of offline statistics
      await takeScreenshot(providerPage, TEST_NAME, 'provider-offline-statistics');
      
      // Check for offline usage data
      const offlineUsageData = await providerPage.$('.offline-usage-data');
      expect(offlineUsageData).not.toBeNull();
      
      // Check for cache hit rate
      const cacheHitRate = await providerPage.$('.cache-hit-rate');
      expect(cacheHitRate).not.toBeNull();
      
      // Check for predictive caching accuracy
      const predictiveAccuracy = await providerPage.$('.predictive-accuracy');
      expect(predictiveAccuracy).not.toBeNull();
      
      // Take success screenshot
      await takeSuccessScreenshot(providerPage, TEST_NAME, 'provider-offline-statistics-success');
    } catch (error) {
      await takeFailureScreenshot(providerPage, TEST_NAME, 'provider-offline-statistics-failure');
      throw error;
    }
  });
});
