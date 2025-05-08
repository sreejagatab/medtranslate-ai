/**
 * Mobile App Performance Test
 *
 * This test measures the performance of the mobile app,
 * including startup time, UI responsiveness, memory usage, and battery consumption.
 */

const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  patientAppUrl: process.env.PATIENT_APP_URL || 'http://localhost:3002',
  testTimeout: 60000, // 60 seconds
  uiInteractionIterations: process.env.UI_ITERATIONS ? parseInt(process.env.UI_ITERATIONS) : 5
};

// Test app startup time
async function testAppStartupTime() {
  console.log('\n=== Testing App Startup Time ===');
  
  const results = {
    startupTimes: [],
    averageStartupTime: 0,
    coldStartTime: 0,
    warmStartTimes: []
  };
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Measure cold start time
    console.log('Measuring cold start time...');
    
    const coldStartPage = await browser.newPage();
    
    // Set performance metrics
    await coldStartPage.setCacheEnabled(false);
    await coldStartPage.coverage.startJSCoverage();
    
    // Record start time
    const coldStartBegin = performance.now();
    
    // Navigate to app
    await coldStartPage.goto(config.patientAppUrl, { waitUntil: 'networkidle0', timeout: config.testTimeout });
    
    // Wait for app to be fully loaded
    await coldStartPage.waitForSelector('[data-testid="app-loaded"]', { timeout: config.testTimeout });
    
    // Record end time
    const coldStartEnd = performance.now();
    results.coldStartTime = coldStartEnd - coldStartBegin;
    results.startupTimes.push(results.coldStartTime);
    
    console.log(`  Cold start time: ${results.coldStartTime.toFixed(2)} ms`);
    
    // Close page
    await coldStartPage.close();
    
    // Measure warm start times
    console.log('Measuring warm start times...');
    
    for (let i = 0; i < 5; i++) {
      const warmStartPage = await browser.newPage();
      
      // Set performance metrics
      await warmStartPage.setCacheEnabled(true);
      await warmStartPage.coverage.startJSCoverage();
      
      // Record start time
      const warmStartBegin = performance.now();
      
      // Navigate to app
      await warmStartPage.goto(config.patientAppUrl, { waitUntil: 'networkidle0', timeout: config.testTimeout });
      
      // Wait for app to be fully loaded
      await warmStartPage.waitForSelector('[data-testid="app-loaded"]', { timeout: config.testTimeout });
      
      // Record end time
      const warmStartEnd = performance.now();
      const warmStartTime = warmStartEnd - warmStartBegin;
      
      results.warmStartTimes.push(warmStartTime);
      results.startupTimes.push(warmStartTime);
      
      console.log(`  Warm start time (${i + 1}): ${warmStartTime.toFixed(2)} ms`);
      
      // Close page
      await warmStartPage.close();
    }
    
    // Calculate average startup time
    results.averageStartupTime = results.startupTimes.reduce((sum, time) => sum + time, 0) / results.startupTimes.length;
    const averageWarmStartTime = results.warmStartTimes.reduce((sum, time) => sum + time, 0) / results.warmStartTimes.length;
    
    console.log(`  Average startup time: ${results.averageStartupTime.toFixed(2)} ms`);
    console.log(`  Average warm start time: ${averageWarmStartTime.toFixed(2)} ms`);
    console.log(`  Cold vs. Warm difference: ${(results.coldStartTime - averageWarmStartTime).toFixed(2)} ms`);
    
    return results;
  } finally {
    await browser.close();
  }
}

// Test UI responsiveness
async function testUIResponsiveness() {
  console.log('\n=== Testing UI Responsiveness ===');
  
  const results = {
    navigationTimes: {},
    interactionTimes: {},
    averageNavigationTime: 0,
    averageInteractionTime: 0
  };
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Navigate to app
    await page.goto(config.patientAppUrl, { waitUntil: 'networkidle0', timeout: config.testTimeout });
    
    // Wait for app to be fully loaded
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: config.testTimeout });
    
    // Test navigation times
    console.log('Measuring navigation times...');
    
    const navigationRoutes = [
      { name: 'Home', selector: '[data-testid="nav-home"]' },
      { name: 'Translate', selector: '[data-testid="nav-translate"]' },
      { name: 'History', selector: '[data-testid="nav-history"]' },
      { name: 'Settings', selector: '[data-testid="nav-settings"]' },
      { name: 'Profile', selector: '[data-testid="nav-profile"]' }
    ];
    
    for (const route of navigationRoutes) {
      // Navigate to route
      console.log(`  Navigating to ${route.name}...`);
      
      const navigationStart = performance.now();
      
      await page.click(route.selector);
      
      // Wait for page to be loaded
      await page.waitForSelector(`[data-testid="${route.name.toLowerCase()}-page-loaded"]`, { timeout: config.testTimeout });
      
      const navigationEnd = performance.now();
      const navigationTime = navigationEnd - navigationStart;
      
      results.navigationTimes[route.name] = navigationTime;
      
      console.log(`    Navigation time: ${navigationTime.toFixed(2)} ms`);
    }
    
    // Calculate average navigation time
    const navigationTimes = Object.values(results.navigationTimes);
    results.averageNavigationTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
    
    console.log(`  Average navigation time: ${results.averageNavigationTime.toFixed(2)} ms`);
    
    // Test interaction times
    console.log('\nMeasuring interaction times...');
    
    // Navigate to translate page
    await page.click('[data-testid="nav-translate"]');
    await page.waitForSelector('[data-testid="translate-page-loaded"]', { timeout: config.testTimeout });
    
    // Test text input
    console.log('  Testing text input responsiveness...');
    
    const textInputTimes = [];
    
    for (let i = 0; i < config.uiInteractionIterations; i++) {
      // Clear input
      await page.click('[data-testid="source-text"]');
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      
      // Type text
      const text = `Hello, this is a test message ${i + 1}`;
      
      const inputStart = performance.now();
      
      await page.type('[data-testid="source-text"]', text, { delay: 10 });
      
      const inputEnd = performance.now();
      const inputTime = inputEnd - inputStart;
      
      textInputTimes.push(inputTime);
      
      console.log(`    Text input time (${i + 1}): ${inputTime.toFixed(2)} ms`);
    }
    
    const averageTextInputTime = textInputTimes.reduce((sum, time) => sum + time, 0) / textInputTimes.length;
    results.interactionTimes['textInput'] = averageTextInputTime;
    
    console.log(`    Average text input time: ${averageTextInputTime.toFixed(2)} ms`);
    
    // Test button click
    console.log('  Testing button click responsiveness...');
    
    const buttonClickTimes = [];
    
    for (let i = 0; i < config.uiInteractionIterations; i++) {
      // Click translate button
      const clickStart = performance.now();
      
      await page.click('[data-testid="translate-button"]');
      
      // Wait for translation result
      await page.waitForSelector('[data-testid="translation-result"]', { timeout: config.testTimeout });
      
      const clickEnd = performance.now();
      const clickTime = clickEnd - clickStart;
      
      buttonClickTimes.push(clickTime);
      
      console.log(`    Button click time (${i + 1}): ${clickTime.toFixed(2)} ms`);
    }
    
    const averageButtonClickTime = buttonClickTimes.reduce((sum, time) => sum + time, 0) / buttonClickTimes.length;
    results.interactionTimes['buttonClick'] = averageButtonClickTime;
    
    console.log(`    Average button click time: ${averageButtonClickTime.toFixed(2)} ms`);
    
    // Test dropdown selection
    console.log('  Testing dropdown selection responsiveness...');
    
    const dropdownSelectionTimes = [];
    
    for (let i = 0; i < config.uiInteractionIterations; i++) {
      // Select language
      const selectionStart = performance.now();
      
      await page.select('[data-testid="target-language"]', i % 2 === 0 ? 'es' : 'fr');
      
      const selectionEnd = performance.now();
      const selectionTime = selectionEnd - selectionStart;
      
      dropdownSelectionTimes.push(selectionTime);
      
      console.log(`    Dropdown selection time (${i + 1}): ${selectionTime.toFixed(2)} ms`);
    }
    
    const averageDropdownSelectionTime = dropdownSelectionTimes.reduce((sum, time) => sum + time, 0) / dropdownSelectionTimes.length;
    results.interactionTimes['dropdownSelection'] = averageDropdownSelectionTime;
    
    console.log(`    Average dropdown selection time: ${averageDropdownSelectionTime.toFixed(2)} ms`);
    
    // Calculate average interaction time
    const interactionTimes = Object.values(results.interactionTimes);
    results.averageInteractionTime = interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length;
    
    console.log(`  Average interaction time: ${results.averageInteractionTime.toFixed(2)} ms`);
    
    return results;
  } finally {
    await browser.close();
  }
}

// Test memory usage
async function testMemoryUsage() {
  console.log('\n=== Testing Memory Usage ===');
  
  const results = {
    initialMemory: null,
    afterNavigationMemory: null,
    afterTranslationMemory: null,
    peakMemory: null
  };
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Navigate to app
    await page.goto(config.patientAppUrl, { waitUntil: 'networkidle0', timeout: config.testTimeout });
    
    // Wait for app to be fully loaded
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: config.testTimeout });
    
    // Measure initial memory usage
    results.initialMemory = await page.evaluate(() => performance.memory ? {
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    } : null);
    
    if (!results.initialMemory) {
      console.log('  Memory usage measurement not supported in this browser');
      return { supported: false };
    }
    
    console.log('Initial memory usage:');
    console.log(`  Total JS Heap Size: ${(results.initialMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Used JS Heap Size: ${(results.initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  JS Heap Size Limit: ${(results.initialMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
    
    // Navigate between pages to measure memory impact
    console.log('\nNavigating between pages...');
    
    const navigationRoutes = [
      '[data-testid="nav-translate"]',
      '[data-testid="nav-history"]',
      '[data-testid="nav-settings"]',
      '[data-testid="nav-profile"]',
      '[data-testid="nav-home"]'
    ];
    
    for (const route of navigationRoutes) {
      await page.click(route);
      await page.waitForTimeout(1000);
    }
    
    // Measure memory after navigation
    results.afterNavigationMemory = await page.evaluate(() => performance.memory ? {
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    } : null);
    
    console.log('Memory usage after navigation:');
    console.log(`  Total JS Heap Size: ${(results.afterNavigationMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Used JS Heap Size: ${(results.afterNavigationMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Perform translations to measure memory impact
    console.log('\nPerforming translations...');
    
    // Navigate to translate page
    await page.click('[data-testid="nav-translate"]');
    await page.waitForSelector('[data-testid="translate-page-loaded"]', { timeout: config.testTimeout });
    
    for (let i = 0; i < 10; i++) {
      // Clear input
      await page.click('[data-testid="source-text"]');
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      
      // Type text
      const text = `Hello, this is test message ${i + 1} for memory usage measurement`;
      await page.type('[data-testid="source-text"]', text);
      
      // Click translate button
      await page.click('[data-testid="translate-button"]');
      
      // Wait for translation result
      await page.waitForSelector('[data-testid="translation-result"]', { timeout: config.testTimeout });
    }
    
    // Measure memory after translation
    results.afterTranslationMemory = await page.evaluate(() => performance.memory ? {
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    } : null);
    
    console.log('Memory usage after translation:');
    console.log(`  Total JS Heap Size: ${(results.afterTranslationMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Used JS Heap Size: ${(results.afterTranslationMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Calculate memory impact
    const navigationMemoryImpact = results.afterNavigationMemory.usedJSHeapSize - results.initialMemory.usedJSHeapSize;
    const translationMemoryImpact = results.afterTranslationMemory.usedJSHeapSize - results.afterNavigationMemory.usedJSHeapSize;
    const totalMemoryImpact = results.afterTranslationMemory.usedJSHeapSize - results.initialMemory.usedJSHeapSize;
    
    console.log('\nMemory impact:');
    console.log(`  Navigation: ${(navigationMemoryImpact / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Translation: ${(translationMemoryImpact / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Total: ${(totalMemoryImpact / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      supported: true,
      initial: results.initialMemory,
      afterNavigation: results.afterNavigationMemory,
      afterTranslation: results.afterTranslationMemory,
      navigationImpact: navigationMemoryImpact,
      translationImpact: translationMemoryImpact,
      totalImpact: totalMemoryImpact
    };
  } finally {
    await browser.close();
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Mobile App Performance Test...');
  
  try {
    // Run tests in sequence
    const startupTimeResults = await testAppStartupTime();
    const uiResponsivenessResults = await testUIResponsiveness();
    const memoryUsageResults = await testMemoryUsage();
    
    // Compile all results
    const allResults = {
      startupTime: startupTimeResults,
      uiResponsiveness: uiResponsivenessResults,
      memoryUsage: memoryUsageResults
    };
    
    // Print summary
    console.log('\n=== Mobile App Performance Test Summary ===');
    
    console.log('\nStartup Time:');
    console.log(`  Cold Start: ${startupTimeResults.coldStartTime.toFixed(2)} ms`);
    console.log(`  Average Warm Start: ${(startupTimeResults.warmStartTimes.reduce((sum, time) => sum + time, 0) / startupTimeResults.warmStartTimes.length).toFixed(2)} ms`);
    
    console.log('\nUI Responsiveness:');
    console.log(`  Average Navigation Time: ${uiResponsivenessResults.averageNavigationTime.toFixed(2)} ms`);
    console.log(`  Average Interaction Time: ${uiResponsivenessResults.averageInteractionTime.toFixed(2)} ms`);
    
    if (memoryUsageResults.supported) {
      console.log('\nMemory Usage:');
      console.log(`  Initial: ${(memoryUsageResults.initial.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  After Navigation: ${(memoryUsageResults.afterNavigation.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  After Translation: ${(memoryUsageResults.afterTranslation.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Total Impact: ${(memoryUsageResults.totalImpact / 1024 / 1024).toFixed(2)} MB`);
    }
    
    return allResults;
  } catch (error) {
    console.error('Error running tests:', error.message);
    return { error: error.message };
  }
}

// Export for Jest
module.exports = {
  testAppStartupTime,
  testUIResponsiveness,
  testMemoryUsage,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
