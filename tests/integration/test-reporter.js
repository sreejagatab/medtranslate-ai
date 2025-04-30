/**
 * Test Reporter for MedTranslate AI Integration Tests
 * 
 * This module provides functions for generating detailed test reports
 * that can be used to track integration test results over time.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  reportDir: process.env.TEST_REPORT_DIR || path.join(__dirname, '../../test-reports'),
  includeSystemInfo: true,
  includeTimestamps: true,
  includeTestDetails: true,
  includeErrorDetails: true
};

/**
 * Generate a test report
 * 
 * @param {string} testName - Name of the test suite
 * @param {Object} results - Test results
 * @param {Object} options - Report options
 * @returns {Object} - Report object
 */
function generateReport(testName, results, options = {}) {
  const timestamp = new Date();
  
  // Create report object
  const report = {
    testName,
    timestamp: timestamp.toISOString(),
    summary: {
      total: Object.keys(results).length,
      passed: Object.values(results).filter(r => r === true).length,
      failed: Object.values(results).filter(r => r === false).length,
      success: Object.values(results).every(r => r === true)
    },
    results: { ...results }
  };
  
  // Add system info if enabled
  if (CONFIG.includeSystemInfo || options.includeSystemInfo) {
    report.system = {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem()
      }
    };
  }
  
  return report;
}

/**
 * Save a test report to disk
 * 
 * @param {Object} report - Report object
 * @param {string} filename - Optional filename
 * @returns {string} - Path to saved report
 */
function saveReport(report, filename = null) {
  // Create report directory if it doesn't exist
  if (!fs.existsSync(CONFIG.reportDir)) {
    fs.mkdirSync(CONFIG.reportDir, { recursive: true });
  }
  
  // Generate filename if not provided
  if (!filename) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    filename = `${report.testName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`;
  }
  
  // Save report
  const reportPath = path.join(CONFIG.reportDir, filename);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return reportPath;
}

/**
 * Generate HTML report from JSON report
 * 
 * @param {Object} report - Report object
 * @returns {string} - HTML report
 */
function generateHtmlReport(report) {
  const passedTests = Object.entries(report.results).filter(([_, result]) => result === true);
  const failedTests = Object.entries(report.results).filter(([_, result]) => result === false);
  
  // Generate HTML
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.testName} - Test Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #0066cc;
    }
    .summary {
      display: flex;
      margin-bottom: 20px;
    }
    .summary-item {
      padding: 15px;
      margin-right: 15px;
      border-radius: 5px;
    }
    .success {
      background-color: #d4edda;
      color: #155724;
    }
    .failure {
      background-color: #f8d7da;
      color: #721c24;
    }
    .neutral {
      background-color: #e2e3e5;
      color: #383d41;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px 15px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f8f9fa;
    }
    tr.passed td:first-child {
      color: #28a745;
    }
    tr.passed td:first-child::before {
      content: "✓ ";
      font-weight: bold;
    }
    tr.failed td:first-child {
      color: #dc3545;
    }
    tr.failed td:first-child::before {
      content: "✗ ";
      font-weight: bold;
    }
    .system-info {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <h1>${report.testName}</h1>
  <p>Report generated on ${new Date(report.timestamp).toLocaleString()}</p>
  
  <div class="summary">
    <div class="summary-item ${report.summary.success ? 'success' : 'failure'}">
      <h3>Overall Result</h3>
      <p>${report.summary.success ? 'PASSED' : 'FAILED'}</p>
    </div>
    <div class="summary-item neutral">
      <h3>Total Tests</h3>
      <p>${report.summary.total}</p>
    </div>
    <div class="summary-item success">
      <h3>Passed</h3>
      <p>${report.summary.passed}</p>
    </div>
    <div class="summary-item failure">
      <h3>Failed</h3>
      <p>${report.summary.failed}</p>
    </div>
  </div>
  
  <h2>Test Results</h2>
  <table>
    <thead>
      <tr>
        <th>Test</th>
        <th>Result</th>
      </tr>
    </thead>
    <tbody>
`;

  // Add test results
  Object.entries(report.results).forEach(([test, result]) => {
    html += `
      <tr class="${result ? 'passed' : 'failed'}">
        <td>${test}</td>
        <td>${result ? 'Passed' : 'Failed'}</td>
      </tr>
    `;
  });

  html += `
    </tbody>
  </table>
`;

  // Add system info if available
  if (report.system) {
    html += `
  <h2>System Information</h2>
  <div class="system-info">
    <p><strong>Platform:</strong> ${report.system.platform} ${report.system.release} (${report.system.arch})</p>
    <p><strong>Node Version:</strong> ${report.system.nodeVersion}</p>
    <p><strong>CPUs:</strong> ${report.system.cpus}</p>
    <p><strong>Memory:</strong> ${Math.round(report.system.memory.total / (1024 * 1024 * 1024))} GB total, ${Math.round(report.system.memory.free / (1024 * 1024 * 1024))} GB free</p>
  </div>
`;
  }

  html += `
</body>
</html>
  `;
  
  return html;
}

/**
 * Save HTML report to disk
 * 
 * @param {Object} report - Report object
 * @param {string} filename - Optional filename
 * @returns {string} - Path to saved HTML report
 */
function saveHtmlReport(report, filename = null) {
  // Create report directory if it doesn't exist
  if (!fs.existsSync(CONFIG.reportDir)) {
    fs.mkdirSync(CONFIG.reportDir, { recursive: true });
  }
  
  // Generate filename if not provided
  if (!filename) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    filename = `${report.testName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.html`;
  }
  
  // Generate HTML report
  const html = generateHtmlReport(report);
  
  // Save report
  const reportPath = path.join(CONFIG.reportDir, filename);
  fs.writeFileSync(reportPath, html);
  
  return reportPath;
}

module.exports = {
  generateReport,
  saveReport,
  generateHtmlReport,
  saveHtmlReport,
  CONFIG
};
