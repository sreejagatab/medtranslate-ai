/**
 * Screenshot Manager for E2E Tests
 * 
 * This file contains utilities for managing screenshots in E2E tests.
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config/setup');

/**
 * Generate a screenshot filename
 * 
 * @param {string} testName - Name of the test
 * @param {string} description - Description of the screenshot
 * @param {string} status - Status of the test (success, failure)
 * @returns {string} - Screenshot filename
 */
function generateScreenshotFilename(testName, description, status = 'success') {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const sanitizedTestName = testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const sanitizedDescription = description.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  return `${sanitizedTestName}--${sanitizedDescription}--${status}--${timestamp}.png`;
}

/**
 * Take a screenshot
 * 
 * @param {Page} page - Puppeteer page object
 * @param {string} testName - Name of the test
 * @param {string} description - Description of the screenshot
 * @param {string} status - Status of the test (success, failure)
 * @returns {Promise<string>} - Path to the screenshot
 */
async function takeScreenshot(page, testName, description, status = 'success') {
  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync(config.screenshots.directory)) {
    fs.mkdirSync(config.screenshots.directory, { recursive: true });
  }
  
  // Generate filename
  const filename = generateScreenshotFilename(testName, description, status);
  const screenshotPath = path.join(config.screenshots.directory, filename);
  
  // Take screenshot
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  console.log(`Screenshot saved: ${screenshotPath}`);
  
  return screenshotPath;
}

/**
 * Take a screenshot on test failure
 * 
 * @param {Page} page - Puppeteer page object
 * @param {string} testName - Name of the test
 * @param {string} description - Description of the screenshot
 * @returns {Promise<string>} - Path to the screenshot
 */
async function takeFailureScreenshot(page, testName, description) {
  return await takeScreenshot(page, testName, description, 'failure');
}

/**
 * Take a screenshot on test success
 * 
 * @param {Page} page - Puppeteer page object
 * @param {string} testName - Name of the test
 * @param {string} description - Description of the screenshot
 * @returns {Promise<string>} - Path to the screenshot
 */
async function takeSuccessScreenshot(page, testName, description) {
  if (config.screenshots.saveOnSuccess) {
    return await takeScreenshot(page, testName, description, 'success');
  }
  
  return null;
}

/**
 * Compare screenshots
 * 
 * @param {string} baselinePath - Path to baseline screenshot
 * @param {string} currentPath - Path to current screenshot
 * @param {Object} options - Comparison options
 * @returns {Promise<Object>} - Comparison result
 */
async function compareScreenshots(baselinePath, currentPath, options = {}) {
  // This is a placeholder for screenshot comparison functionality
  // In a real implementation, you would use a library like pixelmatch or resemblejs
  
  console.log(`Comparing screenshots: ${baselinePath} vs ${currentPath}`);
  
  // For now, just check if both files exist
  const baselineExists = fs.existsSync(baselinePath);
  const currentExists = fs.existsSync(currentPath);
  
  if (!baselineExists) {
    throw new Error(`Baseline screenshot does not exist: ${baselinePath}`);
  }
  
  if (!currentExists) {
    throw new Error(`Current screenshot does not exist: ${currentPath}`);
  }
  
  // In a real implementation, you would compare the images and return a result
  return {
    match: true,
    diffPercentage: 0,
    diffPath: null
  };
}

/**
 * Clean up old screenshots
 * 
 * @param {number} maxAge - Maximum age of screenshots in days
 * @returns {Promise<number>} - Number of screenshots deleted
 */
async function cleanupOldScreenshots(maxAge = 7) {
  const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let deletedCount = 0;
  
  // Get all files in screenshots directory
  const files = fs.readdirSync(config.screenshots.directory);
  
  for (const file of files) {
    const filePath = path.join(config.screenshots.directory, file);
    
    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Check if file is older than maxAge
    if (now - stats.mtime.getTime() > maxAgeMs) {
      // Delete file
      fs.unlinkSync(filePath);
      deletedCount++;
    }
  }
  
  console.log(`Cleaned up ${deletedCount} old screenshots`);
  
  return deletedCount;
}

module.exports = {
  takeScreenshot,
  takeFailureScreenshot,
  takeSuccessScreenshot,
  compareScreenshots,
  cleanupOldScreenshots
};
