/**
 * E2E Test Setup Configuration for MedTranslate AI
 * 
 * This file contains the setup configuration for E2E tests.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
  // Browser configuration
  browser: {
    headless: process.env.HEADLESS !== 'false', // Run in headless mode by default
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0, // Slow down by ms
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ],
    defaultViewport: {
      width: 1280,
      height: 800
    }
  },
  
  // Test URLs
  urls: {
    backend: process.env.BACKEND_URL || 'http://localhost:3005',
    edge: process.env.EDGE_URL || 'http://localhost:3006',
    providerApp: process.env.PROVIDER_APP_URL || 'http://localhost:3002',
    patientApp: process.env.PATIENT_APP_URL || 'http://localhost:3003',
    adminDashboard: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3004'
  },
  
  // Test credentials
  credentials: {
    provider: {
      email: process.env.PROVIDER_EMAIL || 'test.provider@example.com',
      password: process.env.PROVIDER_PASSWORD || 'TestPassword123!'
    },
    patient: {
      email: process.env.PATIENT_EMAIL || 'test.patient@example.com',
      password: process.env.PATIENT_PASSWORD || 'TestPassword123!'
    },
    admin: {
      email: process.env.ADMIN_EMAIL || 'test.admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'TestPassword123!'
    }
  },
  
  // Screenshot configuration
  screenshots: {
    directory: path.join(__dirname, '../../../test-reports/e2e/screenshots'),
    saveOnFailure: true,
    saveOnSuccess: false
  },
  
  // Test timeouts
  timeouts: {
    navigation: 30000, // 30 seconds
    action: 10000, // 10 seconds
    element: 5000 // 5 seconds
  }
};

// Create screenshot directory if it doesn't exist
if (!fs.existsSync(config.screenshots.directory)) {
  fs.mkdirSync(config.screenshots.directory, { recursive: true });
}

// Launch browser
async function launchBrowser() {
  return await puppeteer.launch(config.browser);
}

// Create a new page with default viewport
async function createPage(browser) {
  const page = await browser.newPage();
  await page.setViewport(config.browser.defaultViewport);
  return page;
}

// Take a screenshot
async function takeScreenshot(page, name) {
  const screenshotPath = path.join(config.screenshots.directory, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

// Wait for navigation to complete
async function waitForNavigation(page) {
  return page.waitForNavigation({ 
    waitUntil: 'networkidle2', 
    timeout: config.timeouts.navigation 
  });
}

// Export configuration and helper functions
module.exports = {
  config,
  launchBrowser,
  createPage,
  takeScreenshot,
  waitForNavigation
};
