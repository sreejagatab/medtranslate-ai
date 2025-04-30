/**
 * Test Runner for MedTranslate AI
 * 
 * This script runs all the tests for the MedTranslate AI project.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const config = {
  outputDir: path.join(__dirname, '../test-reports'),
  testSuites: [
    {
      name: 'Edge Device Integration',
      path: path.join(__dirname, 'integration/edge-device-integration.test.js'),
      enabled: true
    },
    {
      name: 'Security Audit',
      path: path.join(__dirname, 'security/security-audit-tool.js'),
      enabled: true
    },
    {
      name: 'Localization Testing',
      path: path.join(__dirname, 'localization/localization-test.js'),
      enabled: true
    },
    {
      name: 'App Store Submission',
      path: path.join(__dirname, 'app-store/app-store-submission-tool.js'),
      enabled: true
    }
  ]
};

/**
 * Run all tests
 * 
 * @returns {Promise<Object>} - Test results
 */
async function runAllTests() {
  try {
    console.log('Starting MedTranslate AI test suite...');
    console.log(`Date: ${new Date().toISOString()}`);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Generate report timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Results object
    const results = {
      timestamp,
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };
    
    // Run each test suite
    for (const suite of config.testSuites) {
      console.log(`\n=== Running Test Suite: ${suite.name} ===`);
      
      if (!suite.enabled) {
        console.log(`Skipping ${suite.name} (disabled)`);
        
        results.suites.push({
          name: suite.name,
          status: 'SKIPPED',
          duration: 0,
          output: 'Test suite is disabled'
        });
        
        results.summary.skipped++;
        results.summary.total++;
        
        continue;
      }
      
      // Check if test file exists
      if (!fs.existsSync(suite.path)) {
        console.error(`Test file not found: ${suite.path}`);
        
        results.suites.push({
          name: suite.name,
          status: 'FAILED',
          duration: 0,
          output: `Test file not found: ${suite.path}`
        });
        
        results.summary.failed++;
        results.summary.total++;
        
        continue;
      }
      
      try {
        // Record start time
        const startTime = Date.now();
        
        // Run test
        console.log(`Running ${suite.name}...`);
        const output = execSync(`node "${suite.path}"`, { encoding: 'utf8' });
        
        // Record end time
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`${suite.name} completed in ${duration}ms`);
        console.log(output);
        
        // Store results
        results.suites.push({
          name: suite.name,
          status: 'PASSED',
          duration,
          output
        });
        
        results.summary.passed++;
        results.summary.total++;
      } catch (error) {
        console.error(`Error running ${suite.name}:`, error.message);
        
        // Store results
        results.suites.push({
          name: suite.name,
          status: 'FAILED',
          duration: 0,
          output: error.stdout || error.message
        });
        
        results.summary.failed++;
        results.summary.total++;
      }
    }
    
    // Generate report
    const reportPath = path.join(config.outputDir, `test-report-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    // Generate HTML report
    const htmlReportPath = path.join(config.outputDir, `test-report-${timestamp}.html`);
    generateHtmlReport(results, htmlReportPath);
    
    console.log('\n=== Test Summary ===');
    console.log(`Total: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Skipped: ${results.summary.skipped}`);
    console.log(`\nReports generated:`);
    console.log(`- JSON: ${reportPath}`);
    console.log(`- HTML: ${htmlReportPath}`);
    
    return {
      results,
      reportPath,
      htmlReportPath
    };
  } catch (error) {
    console.error('Error running tests:', error);
    throw error;
  }
}

/**
 * Generate HTML report
 * 
 * @param {Object} results - Test results
 * @param {string} outputPath - Output path
 */
function generateHtmlReport(results, outputPath) {
  try {
    // Generate HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MedTranslate AI Test Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          h1, h2, h3 {
            color: #0077CC;
          }
          .summary {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .summary-item {
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            flex: 1;
            margin: 0 5px;
          }
          .passed {
            background-color: #DFF0D8;
            color: #3C763D;
          }
          .failed {
            background-color: #F2DEDE;
            color: #A94442;
          }
          .skipped {
            background-color: #FCF8E3;
            color: #8A6D3B;
          }
          .suite {
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            overflow: hidden;
          }
          .suite-header {
            padding: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
          }
          .suite-header.passed {
            background-color: #DFF0D8;
          }
          .suite-header.failed {
            background-color: #F2DEDE;
          }
          .suite-header.skipped {
            background-color: #FCF8E3;
          }
          .suite-content {
            padding: 10px;
            display: none;
            background-color: #f5f5f5;
            border-top: 1px solid #ddd;
          }
          .suite-content pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .show {
            display: block;
          }
        </style>
      </head>
      <body>
        <h1>MedTranslate AI Test Report</h1>
        <p>Generated: ${new Date(results.timestamp).toLocaleString()}</p>
        
        <h2>Summary</h2>
        <div class="summary">
          <div class="summary-item">
            <h3>Total</h3>
            <p>${results.summary.total}</p>
          </div>
          <div class="summary-item passed">
            <h3>Passed</h3>
            <p>${results.summary.passed}</p>
          </div>
          <div class="summary-item failed">
            <h3>Failed</h3>
            <p>${results.summary.failed}</p>
          </div>
          <div class="summary-item skipped">
            <h3>Skipped</h3>
            <p>${results.summary.skipped}</p>
          </div>
        </div>
        
        <h2>Test Suites</h2>
    `;
    
    // Add test suites
    for (let i = 0; i < results.suites.length; i++) {
      const suite = results.suites[i];
      
      htmlContent += `
        <div class="suite">
          <div class="suite-header ${suite.status.toLowerCase()}" onclick="toggleSuite(${i})">
            <h3>${suite.name}</h3>
            <div>
              <span>${suite.status}</span>
              ${suite.duration ? `<span>(${suite.duration}ms)</span>` : ''}
            </div>
          </div>
          <div id="suite-${i}" class="suite-content">
            <pre>${escapeHtml(suite.output)}</pre>
          </div>
        </div>
      `;
    }
    
    // Add JavaScript
    htmlContent += `
        <script>
          function toggleSuite(index) {
            const content = document.getElementById('suite-' + index);
            content.classList.toggle('show');
          }
        </script>
      </body>
      </html>
    `;
    
    // Write HTML report
    fs.writeFileSync(outputPath, htmlContent);
  } catch (error) {
    console.error('Error generating HTML report:', error);
  }
}

/**
 * Escape HTML special characters
 * 
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(({ results }) => {
      // Exit with non-zero code if any tests failed
      process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

// Export functions for use in other scripts
module.exports = {
  runAllTests
};
