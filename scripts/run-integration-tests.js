/**
 * Integration Test Runner for MedTranslate AI
 * 
 * This script runs integration tests for the MedTranslate AI system
 * and generates detailed reports of the results.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { generateReport, saveReport, saveHtmlReport } = require('../tests/integration/test-reporter');

// Configuration
const CONFIG = {
  testDir: path.join(__dirname, '../tests/integration'),
  reportDir: path.join(__dirname, '../test-reports'),
  testPattern: process.argv[2] || '*',
  runInParallel: false,
  generateHtmlReports: true
};

// Get test files
function getTestFiles() {
  const pattern = CONFIG.testPattern === '*' ? '.test.js' : CONFIG.testPattern;
  
  return fs.readdirSync(CONFIG.testDir)
    .filter(file => file.endsWith('.test.js') && file.includes(pattern))
    .map(file => path.join(CONFIG.testDir, file));
}

// Run a single test
async function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`\nRunning test: ${path.basename(testFile)}`);
    
    const test = spawn('node', [testFile], {
      stdio: 'inherit'
    });
    
    test.on('close', (code) => {
      const success = code === 0;
      console.log(`Test ${path.basename(testFile)} ${success ? 'passed' : 'failed'} with exit code ${code}`);
      resolve({ file: testFile, success });
    });
  });
}

// Run all tests
async function runAllTests() {
  const testFiles = getTestFiles();
  
  if (testFiles.length === 0) {
    console.log('No test files found matching pattern:', CONFIG.testPattern);
    return;
  }
  
  console.log(`Found ${testFiles.length} test files to run`);
  
  const results = {};
  
  if (CONFIG.runInParallel) {
    // Run tests in parallel
    const testPromises = testFiles.map(file => runTest(file));
    const testResults = await Promise.all(testPromises);
    
    testResults.forEach(result => {
      const testName = path.basename(result.file, '.test.js');
      results[testName] = result.success;
    });
  } else {
    // Run tests sequentially
    for (const file of testFiles) {
      const result = await runTest(file);
      const testName = path.basename(file, '.test.js');
      results[testName] = result.success;
    }
  }
  
  return results;
}

// Generate and save reports
function generateReports(results) {
  // Create report directory if it doesn't exist
  if (!fs.existsSync(CONFIG.reportDir)) {
    fs.mkdirSync(CONFIG.reportDir, { recursive: true });
  }
  
  // Generate report
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const report = generateReport('MedTranslate AI Integration Tests', results);
  
  // Save JSON report
  const jsonReportPath = saveReport(report, `integration-test-report-${timestamp}.json`);
  console.log(`\nJSON report saved to: ${jsonReportPath}`);
  
  // Save HTML report if enabled
  if (CONFIG.generateHtmlReports) {
    const htmlReportPath = saveHtmlReport(report, `integration-test-report-${timestamp}.html`);
    console.log(`HTML report saved to: ${htmlReportPath}`);
  }
  
  return report;
}

// Main function
async function main() {
  console.log('Starting MedTranslate AI Integration Tests');
  
  try {
    // Run tests
    const results = await runAllTests();
    
    if (!results) {
      return;
    }
    
    // Generate reports
    const report = generateReports(results);
    
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Total: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Overall: ${report.summary.success ? 'PASSED' : 'FAILED'}`);
    
    // Exit with appropriate code
    process.exit(report.summary.success ? 0 : 1);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the script
main();
