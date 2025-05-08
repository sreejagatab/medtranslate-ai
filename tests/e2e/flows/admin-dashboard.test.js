/**
 * E2E Test for Admin Dashboard Flow
 * 
 * This test verifies the functionality of the admin dashboard.
 */

const { config, launchBrowser, createPage } = require('../config/setup');
const { loginAsAdmin } = require('../helpers/auth-helper');
const { 
  navigateToAdminDashboard,
  navigateToAdminAnalytics,
  navigateToAdminUserManagement,
  navigateToAdminSystemSettings,
  navigateToAdminEdgeDevices
} = require('../helpers/navigation-helper');
const { 
  generateRandomString,
  createTestUser,
  cleanupTestData
} = require('../utils/test-data');
const { 
  takeScreenshot,
  takeFailureScreenshot,
  takeSuccessScreenshot
} = require('../utils/screenshot-manager');

// Test configuration
const TEST_NAME = 'admin-dashboard-flow';
const TEST_TIMEOUT = 180000; // 3 minutes

// Test data
let adminData = {
  email: process.env.ADMIN_EMAIL || 'test.admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'TestPassword123!'
};
let adminId;

// Browser and page objects
let browser;
let adminPage;

// Set test timeout
jest.setTimeout(TEST_TIMEOUT);

describe('Admin Dashboard Flow', () => {
  beforeAll(async () => {
    try {
      // Launch browser
      browser = await launchBrowser();
      
      // Create page
      adminPage = await createPage(browser);
      
      // Login as admin
      await loginAsAdmin(adminPage);
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    try {
      // Close browser
      if (browser) {
        await browser.close();
      }
    } catch (error) {
      console.error('Error in test cleanup:', error);
    }
  });
  
  test('Admin can view dashboard overview', async () => {
    try {
      // Navigate to admin dashboard
      await navigateToAdminDashboard(adminPage);
      await takeScreenshot(adminPage, TEST_NAME, 'admin-dashboard-overview');
      
      // Check for dashboard components
      const systemStatusCard = await adminPage.$('.system-status-card');
      const translationStatsCard = await adminPage.$('.translation-stats-card');
      const userStatsCard = await adminPage.$('.user-stats-card');
      const edgeDeviceStatsCard = await adminPage.$('.edge-device-stats-card');
      
      expect(systemStatusCard).not.toBeNull();
      expect(translationStatsCard).not.toBeNull();
      expect(userStatsCard).not.toBeNull();
      expect(edgeDeviceStatsCard).not.toBeNull();
      
      // Take success screenshot
      await takeSuccessScreenshot(adminPage, TEST_NAME, 'admin-dashboard-overview-success');
    } catch (error) {
      await takeFailureScreenshot(adminPage, TEST_NAME, 'admin-dashboard-overview-failure');
      throw error;
    }
  });
  
  test('Admin can view analytics dashboard', async () => {
    try {
      // Navigate to admin analytics
      await navigateToAdminAnalytics(adminPage);
      await takeScreenshot(adminPage, TEST_NAME, 'admin-analytics-dashboard');
      
      // Check for analytics components
      const translationChart = await adminPage.$('.translation-chart');
      const sessionChart = await adminPage.$('.session-chart');
      const errorChart = await adminPage.$('.error-chart');
      
      expect(translationChart).not.toBeNull();
      expect(sessionChart).not.toBeNull();
      expect(errorChart).not.toBeNull();
      
      // Check date range selector
      const dateRangeSelector = await adminPage.$('.date-range-selector');
      expect(dateRangeSelector).not.toBeNull();
      
      // Take success screenshot
      await takeSuccessScreenshot(adminPage, TEST_NAME, 'admin-analytics-dashboard-success');
    } catch (error) {
      await takeFailureScreenshot(adminPage, TEST_NAME, 'admin-analytics-dashboard-failure');
      throw error;
    }
  });
  
  test('Admin can export analytics data', async () => {
    try {
      // Click export button
      await adminPage.click('.export-button');
      await adminPage.waitForSelector('.export-options', { timeout: config.timeouts.element });
      
      // Take screenshot of export options
      await takeScreenshot(adminPage, TEST_NAME, 'admin-analytics-export-options');
      
      // Select export format
      await adminPage.click('.export-format-xlsx');
      
      // Click export confirm button
      await adminPage.click('.export-confirm-button');
      
      // Wait for export progress
      await adminPage.waitForSelector('.export-progress', { timeout: config.timeouts.element });
      await takeScreenshot(adminPage, TEST_NAME, 'admin-analytics-export-progress');
      
      // Wait for export completion
      await adminPage.waitForSelector('.export-complete', { timeout: config.timeouts.navigation });
      await takeScreenshot(adminPage, TEST_NAME, 'admin-analytics-export-complete');
      
      // Check export success message
      const exportSuccessMessage = await adminPage.$eval('.export-complete', el => el.textContent);
      expect(exportSuccessMessage).toContain('Export completed successfully');
      
      // Take success screenshot
      await takeSuccessScreenshot(adminPage, TEST_NAME, 'admin-analytics-export-success');
    } catch (error) {
      await takeFailureScreenshot(adminPage, TEST_NAME, 'admin-analytics-export-failure');
      throw error;
    }
  });
  
  test('Admin can view user management', async () => {
    try {
      // Navigate to user management
      await navigateToAdminUserManagement(adminPage);
      await takeScreenshot(adminPage, TEST_NAME, 'admin-user-management');
      
      // Check for user management components
      const userTable = await adminPage.$('.user-table');
      const userSearch = await adminPage.$('.user-search');
      const userFilter = await adminPage.$('.user-filter');
      
      expect(userTable).not.toBeNull();
      expect(userSearch).not.toBeNull();
      expect(userFilter).not.toBeNull();
      
      // Take success screenshot
      await takeSuccessScreenshot(adminPage, TEST_NAME, 'admin-user-management-success');
    } catch (error) {
      await takeFailureScreenshot(adminPage, TEST_NAME, 'admin-user-management-failure');
      throw error;
    }
  });
  
  test('Admin can view system settings', async () => {
    try {
      // Navigate to system settings
      await navigateToAdminSystemSettings(adminPage);
      await takeScreenshot(adminPage, TEST_NAME, 'admin-system-settings');
      
      // Check for system settings components
      const generalSettings = await adminPage.$('.general-settings');
      const translationSettings = await adminPage.$('.translation-settings');
      const securitySettings = await adminPage.$('.security-settings');
      const notificationSettings = await adminPage.$('.notification-settings');
      
      expect(generalSettings).not.toBeNull();
      expect(translationSettings).not.toBeNull();
      expect(securitySettings).not.toBeNull();
      expect(notificationSettings).not.toBeNull();
      
      // Take success screenshot
      await takeSuccessScreenshot(adminPage, TEST_NAME, 'admin-system-settings-success');
    } catch (error) {
      await takeFailureScreenshot(adminPage, TEST_NAME, 'admin-system-settings-failure');
      throw error;
    }
  });
  
  test('Admin can view edge devices', async () => {
    try {
      // Navigate to edge devices
      await navigateToAdminEdgeDevices(adminPage);
      await takeScreenshot(adminPage, TEST_NAME, 'admin-edge-devices');
      
      // Check for edge devices components
      const edgeDeviceTable = await adminPage.$('.edge-device-table');
      const edgeDeviceSearch = await adminPage.$('.edge-device-search');
      const edgeDeviceFilter = await adminPage.$('.edge-device-filter');
      
      expect(edgeDeviceTable).not.toBeNull();
      expect(edgeDeviceSearch).not.toBeNull();
      expect(edgeDeviceFilter).not.toBeNull();
      
      // Take success screenshot
      await takeSuccessScreenshot(adminPage, TEST_NAME, 'admin-edge-devices-success');
    } catch (error) {
      await takeFailureScreenshot(adminPage, TEST_NAME, 'admin-edge-devices-failure');
      throw error;
    }
  });
  
  test('Admin can view edge device details', async () => {
    try {
      // Click on first edge device in table
      await adminPage.click('.edge-device-table tbody tr:first-child');
      await adminPage.waitForSelector('.edge-device-details', { timeout: config.timeouts.element });
      
      // Take screenshot of edge device details
      await takeScreenshot(adminPage, TEST_NAME, 'admin-edge-device-details');
      
      // Check for edge device details components
      const deviceInfo = await adminPage.$('.device-info');
      const deviceStatus = await adminPage.$('.device-status');
      const deviceMetrics = await adminPage.$('.device-metrics');
      const deviceLogs = await adminPage.$('.device-logs');
      
      expect(deviceInfo).not.toBeNull();
      expect(deviceStatus).not.toBeNull();
      expect(deviceMetrics).not.toBeNull();
      expect(deviceLogs).not.toBeNull();
      
      // Take success screenshot
      await takeSuccessScreenshot(adminPage, TEST_NAME, 'admin-edge-device-details-success');
    } catch (error) {
      await takeFailureScreenshot(adminPage, TEST_NAME, 'admin-edge-device-details-failure');
      throw error;
    }
  });
  
  test('Admin can view offline usage statistics', async () => {
    try {
      // Click on offline tab
      await adminPage.click('.offline-tab');
      await adminPage.waitForSelector('.offline-statistics', { timeout: config.timeouts.element });
      
      // Take screenshot of offline statistics
      await takeScreenshot(adminPage, TEST_NAME, 'admin-offline-statistics');
      
      // Check for offline statistics components
      const offlineUsageChart = await adminPage.$('.offline-usage-chart');
      const cacheHitRateChart = await adminPage.$('.cache-hit-rate-chart');
      const predictiveAccuracyChart = await adminPage.$('.predictive-accuracy-chart');
      
      expect(offlineUsageChart).not.toBeNull();
      expect(cacheHitRateChart).not.toBeNull();
      expect(predictiveAccuracyChart).not.toBeNull();
      
      // Take success screenshot
      await takeSuccessScreenshot(adminPage, TEST_NAME, 'admin-offline-statistics-success');
    } catch (error) {
      await takeFailureScreenshot(adminPage, TEST_NAME, 'admin-offline-statistics-failure');
      throw error;
    }
  });
});
