/**
 * Navigation Helper for E2E Tests
 * 
 * This file contains helper functions for navigation in E2E tests.
 */

const { config, waitForNavigation } = require('../config/setup');

/**
 * Navigate to provider dashboard
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToProviderDashboard(page) {
  await page.goto(config.urls.providerApp + '/dashboard');
  await page.waitForSelector('.provider-dashboard', { timeout: config.timeouts.element });
}

/**
 * Navigate to provider translation page
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToProviderTranslation(page) {
  await page.goto(config.urls.providerApp + '/translation');
  await page.waitForSelector('.translation-interface', { timeout: config.timeouts.element });
}

/**
 * Navigate to provider session history
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToProviderSessionHistory(page) {
  await page.goto(config.urls.providerApp + '/sessions');
  await page.waitForSelector('.session-history', { timeout: config.timeouts.element });
}

/**
 * Navigate to provider settings
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToProviderSettings(page) {
  await page.goto(config.urls.providerApp + '/settings');
  await page.waitForSelector('.settings-page', { timeout: config.timeouts.element });
}

/**
 * Navigate to patient dashboard
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToPatientDashboard(page) {
  await page.goto(config.urls.patientApp + '/dashboard');
  await page.waitForSelector('.patient-dashboard', { timeout: config.timeouts.element });
}

/**
 * Navigate to patient translation page
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToPatientTranslation(page) {
  await page.goto(config.urls.patientApp + '/translation');
  await page.waitForSelector('.translation-interface', { timeout: config.timeouts.element });
}

/**
 * Navigate to patient settings
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToPatientSettings(page) {
  await page.goto(config.urls.patientApp + '/settings');
  await page.waitForSelector('.settings-page', { timeout: config.timeouts.element });
}

/**
 * Navigate to admin dashboard
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToAdminDashboard(page) {
  await page.goto(config.urls.adminDashboard + '/dashboard');
  await page.waitForSelector('.admin-dashboard', { timeout: config.timeouts.element });
}

/**
 * Navigate to admin analytics
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToAdminAnalytics(page) {
  await page.goto(config.urls.adminDashboard + '/analytics');
  await page.waitForSelector('.analytics-dashboard', { timeout: config.timeouts.element });
}

/**
 * Navigate to admin user management
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToAdminUserManagement(page) {
  await page.goto(config.urls.adminDashboard + '/users');
  await page.waitForSelector('.user-management', { timeout: config.timeouts.element });
}

/**
 * Navigate to admin system settings
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToAdminSystemSettings(page) {
  await page.goto(config.urls.adminDashboard + '/settings');
  await page.waitForSelector('.system-settings', { timeout: config.timeouts.element });
}

/**
 * Navigate to admin edge devices
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function navigateToAdminEdgeDevices(page) {
  await page.goto(config.urls.adminDashboard + '/edge-devices');
  await page.waitForSelector('.edge-devices', { timeout: config.timeouts.element });
}

module.exports = {
  navigateToProviderDashboard,
  navigateToProviderTranslation,
  navigateToProviderSessionHistory,
  navigateToProviderSettings,
  navigateToPatientDashboard,
  navigateToPatientTranslation,
  navigateToPatientSettings,
  navigateToAdminDashboard,
  navigateToAdminAnalytics,
  navigateToAdminUserManagement,
  navigateToAdminSystemSettings,
  navigateToAdminEdgeDevices
};
