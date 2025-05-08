/**
 * Visual Regression Testing Framework for MedTranslate AI
 * 
 * This file contains utilities for visual regression testing.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

// Configuration
const config = {
  // Browser configuration
  browser: {
    headless: process.env.HEADLESS !== 'false', // Run in headless mode by default
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
  
  // Screenshot configuration
  screenshots: {
    baselineDir: path.join(__dirname, '../../test-reports/visual/baseline'),
    currentDir: path.join(__dirname, '../../test-reports/visual/current'),
    diffDir: path.join(__dirname, '../../test-reports/visual/diff'),
    threshold: 0.1 // Threshold for pixel difference (0 to 1)
  },
  
  // Test timeouts
  timeouts: {
    navigation: 30000, // 30 seconds
    action: 10000, // 10 seconds
    element: 5000 // 5 seconds
  }
};

// Create directories if they don't exist
for (const dir of [config.screenshots.baselineDir, config.screenshots.currentDir, config.screenshots.diffDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Launch browser
 * 
 * @returns {Promise<Browser>} - Puppeteer browser instance
 */
async function launchBrowser() {
  return await puppeteer.launch(config.browser);
}

/**
 * Create a new page with default viewport
 * 
 * @param {Browser} browser - Puppeteer browser instance
 * @returns {Promise<Page>} - Puppeteer page instance
 */
async function createPage(browser) {
  const page = await browser.newPage();
  await page.setViewport(config.browser.defaultViewport);
  return page;
}

/**
 * Take a screenshot
 * 
 * @param {Page} page - Puppeteer page object
 * @param {string} name - Screenshot name
 * @param {string} dir - Directory to save screenshot
 * @returns {Promise<string>} - Path to the screenshot
 */
async function takeScreenshot(page, name, dir) {
  const screenshotPath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

/**
 * Compare two screenshots
 * 
 * @param {string} baselinePath - Path to baseline screenshot
 * @param {string} currentPath - Path to current screenshot
 * @param {string} diffPath - Path to save diff image
 * @param {number} threshold - Threshold for pixel difference (0 to 1)
 * @returns {Promise<Object>} - Comparison result
 */
async function compareScreenshots(baselinePath, currentPath, diffPath, threshold = config.screenshots.threshold) {
  // Read images
  const baselineImg = PNG.sync.read(fs.readFileSync(baselinePath));
  const currentImg = PNG.sync.read(fs.readFileSync(currentPath));
  
  // Check if images have the same dimensions
  if (baselineImg.width !== currentImg.width || baselineImg.height !== currentImg.height) {
    return {
      match: false,
      diffPercentage: 1,
      diffPath: null,
      error: 'Image dimensions do not match'
    };
  }
  
  // Create diff image
  const { width, height } = baselineImg;
  const diffImg = new PNG({ width, height });
  
  // Compare images
  const numDiffPixels = pixelmatch(
    baselineImg.data,
    currentImg.data,
    diffImg.data,
    width,
    height,
    { threshold }
  );
  
  // Calculate diff percentage
  const diffPercentage = numDiffPixels / (width * height);
  
  // Save diff image
  fs.writeFileSync(diffPath, PNG.sync.write(diffImg));
  
  return {
    match: diffPercentage <= threshold,
    diffPercentage,
    diffPixels: numDiffPixels,
    diffPath
  };
}

/**
 * Run visual regression test
 * 
 * @param {string} name - Test name
 * @param {string} url - URL to test
 * @param {Object} options - Test options
 * @returns {Promise<Object>} - Test result
 */
async function runVisualTest(name, url, options = {}) {
  const browser = await launchBrowser();
  const page = await createPage(browser);
  
  try {
    // Navigate to URL
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: config.timeouts.navigation 
    });
    
    // Wait for selector if provided
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { 
        timeout: config.timeouts.element 
      });
    }
    
    // Wait for additional time if specified
    if (options.waitTime) {
      await page.waitForTimeout(options.waitTime);
    }
    
    // Take current screenshot
    const currentPath = await takeScreenshot(page, name, config.screenshots.currentDir);
    
    // Check if baseline exists
    const baselinePath = path.join(config.screenshots.baselineDir, `${name}.png`);
    const baselineExists = fs.existsSync(baselinePath);
    
    // If baseline doesn't exist, create it
    if (!baselineExists) {
      fs.copyFileSync(currentPath, baselinePath);
      
      return {
        name,
        url,
        baselinePath,
        currentPath,
        baselineCreated: true,
        match: true,
        diffPercentage: 0,
        diffPath: null
      };
    }
    
    // Compare screenshots
    const diffPath = path.join(config.screenshots.diffDir, `${name}.png`);
    const comparisonResult = await compareScreenshots(
      baselinePath,
      currentPath,
      diffPath,
      options.threshold || config.screenshots.threshold
    );
    
    return {
      name,
      url,
      baselinePath,
      currentPath,
      baselineCreated: false,
      ...comparisonResult
    };
  } finally {
    await browser.close();
  }
}

/**
 * Generate HTML report
 * 
 * @param {Array<Object>} results - Test results
 * @param {string} outputPath - Path to save report
 * @returns {Promise<string>} - Path to the report
 */
async function generateReport(results, outputPath) {
  // Create report directory if it doesn't exist
  const reportDir = path.dirname(outputPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // Generate HTML content
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Visual Regression Test Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2, h3 {
          color: #2c3e50;
        }
        .summary {
          background-color: #f8f9fa;
          border-radius: 5px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .test-result {
          margin-bottom: 30px;
          border: 1px solid #ddd;
          border-radius: 5px;
          overflow: hidden;
        }
        .test-header {
          padding: 10px 15px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .test-header h3 {
          margin: 0;
        }
        .test-body {
          padding: 15px;
        }
        .test-images {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }
        .test-image {
          flex: 1;
          min-width: 300px;
        }
        .test-image img {
          max-width: 100%;
          border: 1px solid #ddd;
        }
        .pass {
          color: #28a745;
        }
        .fail {
          color: #dc3545;
        }
        .new {
          color: #007bff;
        }
      </style>
    </head>
    <body>
      <h1>Visual Regression Test Report</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      
      <div class="summary">
        <h2>Summary</h2>
        <p>Total tests: ${results.length}</p>
        <p>Passed: ${results.filter(r => r.match).length}</p>
        <p>Failed: ${results.filter(r => !r.match).length}</p>
        <p>New baselines: ${results.filter(r => r.baselineCreated).length}</p>
      </div>
      
      <h2>Test Results</h2>
  `;
  
  // Add test results
  for (const result of results) {
    const status = result.baselineCreated ? 'new' : (result.match ? 'pass' : 'fail');
    const statusText = result.baselineCreated ? 'NEW BASELINE' : (result.match ? 'PASS' : 'FAIL');
    
    html += `
      <div class="test-result">
        <div class="test-header">
          <h3>${result.name}</h3>
          <span class="${status}">${statusText}</span>
        </div>
        <div class="test-body">
          <p>URL: ${result.url}</p>
          ${!result.baselineCreated ? `<p>Diff percentage: ${(result.diffPercentage * 100).toFixed(2)}%</p>` : ''}
          ${result.error ? `<p class="fail">Error: ${result.error}</p>` : ''}
          
          <div class="test-images">
            <div class="test-image">
              <h4>Baseline</h4>
              <img src="${path.relative(reportDir, result.baselinePath)}" alt="Baseline">
            </div>
            <div class="test-image">
              <h4>Current</h4>
              <img src="${path.relative(reportDir, result.currentPath)}" alt="Current">
            </div>
            ${!result.baselineCreated && !result.match ? `
              <div class="test-image">
                <h4>Diff</h4>
                <img src="${path.relative(reportDir, result.diffPath)}" alt="Diff">
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  html += `
    </body>
    </html>
  `;
  
  // Write HTML to file
  fs.writeFileSync(outputPath, html);
  
  return outputPath;
}

module.exports = {
  config,
  launchBrowser,
  createPage,
  takeScreenshot,
  compareScreenshots,
  runVisualTest,
  generateReport
};
