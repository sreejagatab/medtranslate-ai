/**
 * Authentication Helper for E2E Tests
 * 
 * This file contains helper functions for authentication in E2E tests.
 */

const { config } = require('../config/setup');

/**
 * Login as a provider
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function loginAsProvider(page) {
  await page.goto(config.urls.providerApp);
  
  // Wait for login form
  await page.waitForSelector('form', { timeout: config.timeouts.element });
  
  // Fill in login form
  await page.type('input[name="email"]', config.credentials.provider.email);
  await page.type('input[name="password"]', config.credentials.provider.password);
  
  // Submit form
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.timeouts.navigation })
  ]);
  
  // Verify login was successful
  await page.waitForSelector('.provider-dashboard', { timeout: config.timeouts.element });
}

/**
 * Login as a patient
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function loginAsPatient(page) {
  await page.goto(config.urls.patientApp);
  
  // Wait for login form
  await page.waitForSelector('form', { timeout: config.timeouts.element });
  
  // Fill in login form
  await page.type('input[name="email"]', config.credentials.patient.email);
  await page.type('input[name="password"]', config.credentials.patient.password);
  
  // Submit form
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.timeouts.navigation })
  ]);
  
  // Verify login was successful
  await page.waitForSelector('.patient-dashboard', { timeout: config.timeouts.element });
}

/**
 * Login as an admin
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function loginAsAdmin(page) {
  await page.goto(config.urls.adminDashboard);
  
  // Wait for login form
  await page.waitForSelector('form', { timeout: config.timeouts.element });
  
  // Fill in login form
  await page.type('input[name="email"]', config.credentials.admin.email);
  await page.type('input[name="password"]', config.credentials.admin.password);
  
  // Submit form
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.timeouts.navigation })
  ]);
  
  // Verify login was successful
  await page.waitForSelector('.admin-dashboard', { timeout: config.timeouts.element });
}

/**
 * Logout current user
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function logout(page) {
  // Click on user menu
  await page.click('.user-menu');
  
  // Wait for logout button to appear
  await page.waitForSelector('.logout-button', { timeout: config.timeouts.element });
  
  // Click logout button
  await Promise.all([
    page.click('.logout-button'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.timeouts.navigation })
  ]);
  
  // Verify logout was successful by checking for login form
  await page.waitForSelector('form', { timeout: config.timeouts.element });
}

module.exports = {
  loginAsProvider,
  loginAsPatient,
  loginAsAdmin,
  logout
};
