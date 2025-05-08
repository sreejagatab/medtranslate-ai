/**
 * Visual Regression Tests for Provider Application
 * 
 * This file contains visual regression tests for the provider application.
 */

const path = require('path');
const { 
  config, 
  runVisualTest, 
  generateReport 
} = require('./visual-regression');

// Test configuration
const TEST_TIMEOUT = 180000; // 3 minutes

// Set test timeout
jest.setTimeout(TEST_TIMEOUT);

describe('Provider Application Visual Regression Tests', () => {
  // Test results
  const testResults = [];
  
  // Login credentials
  const credentials = {
    email: process.env.PROVIDER_EMAIL || 'test.provider@example.com',
    password: process.env.PROVIDER_PASSWORD || 'TestPassword123!'
  };
  
  afterAll(async () => {
    // Generate report
    const reportPath = path.join(config.screenshots.diffDir, '../report-provider.html');
    await generateReport(testResults, reportPath);
    console.log(`Report generated: ${reportPath}`);
  });
  
  test('Provider Login Page', async () => {
    const result = await runVisualTest(
      'provider-login-page',
      `${config.urls.providerApp}/login`,
      {
        waitForSelector: 'form'
      }
    );
    
    testResults.push(result);
    expect(result.error).toBeUndefined();
  });
  
  test('Provider Dashboard', async () => {
    // This test requires authentication
    // We'll use Puppeteer directly to handle the login flow
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch(config.browser);
    const page = await browser.newPage();
    
    try {
      // Navigate to login page
      await page.goto(`${config.urls.providerApp}/login`, { 
        waitUntil: 'networkidle2', 
        timeout: config.timeouts.navigation 
      });
      
      // Fill in login form
      await page.type('input[name="email"]', credentials.email);
      await page.type('input[name="password"]', credentials.password);
      
      // Submit form
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.timeouts.navigation })
      ]);
      
      // Wait for dashboard to load
      await page.waitForSelector('.provider-dashboard', { timeout: config.timeouts.element });
      
      // Take screenshot
      const screenshotPath = path.join(config.screenshots.currentDir, 'provider-dashboard.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Check if baseline exists
      const baselinePath = path.join(config.screenshots.baselineDir, 'provider-dashboard.png');
      const baselineExists = require('fs').existsSync(baselinePath);
      
      if (!baselineExists) {
        // Create baseline
        require('fs').copyFileSync(screenshotPath, baselinePath);
        
        testResults.push({
          name: 'provider-dashboard',
          url: `${config.urls.providerApp}/dashboard`,
          baselinePath,
          currentPath: screenshotPath,
          baselineCreated: true,
          match: true,
          diffPercentage: 0,
          diffPath: null
        });
      } else {
        // Compare screenshots
        const diffPath = path.join(config.screenshots.diffDir, 'provider-dashboard.png');
        const { compareScreenshots } = require('./visual-regression');
        const comparisonResult = await compareScreenshots(
          baselinePath,
          screenshotPath,
          diffPath
        );
        
        testResults.push({
          name: 'provider-dashboard',
          url: `${config.urls.providerApp}/dashboard`,
          baselinePath,
          currentPath: screenshotPath,
          baselineCreated: false,
          ...comparisonResult
        });
      }
    } finally {
      await browser.close();
    }
  });
  
  test('Provider Translation Interface', async () => {
    // This test requires authentication
    // We'll use Puppeteer directly to handle the login flow
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch(config.browser);
    const page = await browser.newPage();
    
    try {
      // Navigate to login page
      await page.goto(`${config.urls.providerApp}/login`, { 
        waitUntil: 'networkidle2', 
        timeout: config.timeouts.navigation 
      });
      
      // Fill in login form
      await page.type('input[name="email"]', credentials.email);
      await page.type('input[name="password"]', credentials.password);
      
      // Submit form
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.timeouts.navigation })
      ]);
      
      // Navigate to translation page
      await page.goto(`${config.urls.providerApp}/translation`, { 
        waitUntil: 'networkidle2', 
        timeout: config.timeouts.navigation 
      });
      
      // Wait for translation interface to load
      await page.waitForSelector('.translation-interface', { timeout: config.timeouts.element });
      
      // Take screenshot
      const screenshotPath = path.join(config.screenshots.currentDir, 'provider-translation.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Check if baseline exists
      const baselinePath = path.join(config.screenshots.baselineDir, 'provider-translation.png');
      const baselineExists = require('fs').existsSync(baselinePath);
      
      if (!baselineExists) {
        // Create baseline
        require('fs').copyFileSync(screenshotPath, baselinePath);
        
        testResults.push({
          name: 'provider-translation',
          url: `${config.urls.providerApp}/translation`,
          baselinePath,
          currentPath: screenshotPath,
          baselineCreated: true,
          match: true,
          diffPercentage: 0,
          diffPath: null
        });
      } else {
        // Compare screenshots
        const diffPath = path.join(config.screenshots.diffDir, 'provider-translation.png');
        const { compareScreenshots } = require('./visual-regression');
        const comparisonResult = await compareScreenshots(
          baselinePath,
          screenshotPath,
          diffPath
        );
        
        testResults.push({
          name: 'provider-translation',
          url: `${config.urls.providerApp}/translation`,
          baselinePath,
          currentPath: screenshotPath,
          baselineCreated: false,
          ...comparisonResult
        });
      }
    } finally {
      await browser.close();
    }
  });
  
  test('Provider Settings Page', async () => {
    // This test requires authentication
    // We'll use Puppeteer directly to handle the login flow
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch(config.browser);
    const page = await browser.newPage();
    
    try {
      // Navigate to login page
      await page.goto(`${config.urls.providerApp}/login`, { 
        waitUntil: 'networkidle2', 
        timeout: config.timeouts.navigation 
      });
      
      // Fill in login form
      await page.type('input[name="email"]', credentials.email);
      await page.type('input[name="password"]', credentials.password);
      
      // Submit form
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.timeouts.navigation })
      ]);
      
      // Navigate to settings page
      await page.goto(`${config.urls.providerApp}/settings`, { 
        waitUntil: 'networkidle2', 
        timeout: config.timeouts.navigation 
      });
      
      // Wait for settings page to load
      await page.waitForSelector('.settings-page', { timeout: config.timeouts.element });
      
      // Take screenshot
      const screenshotPath = path.join(config.screenshots.currentDir, 'provider-settings.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Check if baseline exists
      const baselinePath = path.join(config.screenshots.baselineDir, 'provider-settings.png');
      const baselineExists = require('fs').existsSync(baselinePath);
      
      if (!baselineExists) {
        // Create baseline
        require('fs').copyFileSync(screenshotPath, baselinePath);
        
        testResults.push({
          name: 'provider-settings',
          url: `${config.urls.providerApp}/settings`,
          baselinePath,
          currentPath: screenshotPath,
          baselineCreated: true,
          match: true,
          diffPercentage: 0,
          diffPath: null
        });
      } else {
        // Compare screenshots
        const diffPath = path.join(config.screenshots.diffDir, 'provider-settings.png');
        const { compareScreenshots } = require('./visual-regression');
        const comparisonResult = await compareScreenshots(
          baselinePath,
          screenshotPath,
          diffPath
        );
        
        testResults.push({
          name: 'provider-settings',
          url: `${config.urls.providerApp}/settings`,
          baselinePath,
          currentPath: screenshotPath,
          baselineCreated: false,
          ...comparisonResult
        });
      }
    } finally {
      await browser.close();
    }
  });
});
