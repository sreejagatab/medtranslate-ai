/**
 * Generate Accessibility Report
 * 
 * This script generates an HTML report of accessibility violations found by Cypress.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CYPRESS_RESULTS_DIR = path.join(__dirname, 'cypress', 'results');
const REPORT_DIR = path.join(__dirname, 'reports');
const REPORT_FILE = path.join(REPORT_DIR, 'accessibility-report.html');

// Create directories if they don't exist
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Read the Cypress results
const results = [];
try {
  const files = fs.readdirSync(CYPRESS_RESULTS_DIR);
  
  files.forEach(file => {
    if (file.endsWith('.json') && file.includes('accessibility')) {
      const filePath = path.join(CYPRESS_RESULTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const result = JSON.parse(content);
      
      results.push(result);
    }
  });
} catch (error) {
  console.error('Error reading Cypress results:', error);
  process.exit(1);
}

// Extract accessibility violations
const violations = [];
results.forEach(result => {
  result.runs.forEach(run => {
    run.tests.forEach(test => {
      test.commands.forEach(command => {
        if (command.name === 'checkA11y' && command.state === 'failed') {
          const testName = test.title.join(' > ');
          const testFile = run.spec.name;
          
          command.error.message.split('\\n').forEach(line => {
            if (line.includes('accessibility violation')) {
              const match = line.match(/(\d+) accessibility violation/);
              if (match) {
                const count = parseInt(match[1], 10);
                
                violations.push({
                  testName,
                  testFile,
                  count,
                  details: command.error.message
                });
              }
            }
          });
        }
      });
    });
  });
});

// Generate HTML report
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #2c3e50;
      margin-top: 30px;
    }
    .summary {
      background-color: #f8f9fa;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin-bottom: 20px;
    }
    .violation {
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .violation h3 {
      margin-top: 0;
      color: #e74c3c;
    }
    .violation-details {
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      white-space: pre-wrap;
      overflow-x: auto;
    }
    .no-violations {
      background-color: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .timestamp {
      color: #6c757d;
      font-size: 0.9em;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <h1>Accessibility Report</h1>
  
  <div class="summary">
    <p><strong>Total Tests:</strong> ${results.length}</p>
    <p><strong>Total Violations:</strong> ${violations.length}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>
  
  ${violations.length === 0 ? '<div class="no-violations">No accessibility violations found!</div>' : ''}
  
  ${violations.length > 0 ? '<h2>Violations</h2>' : ''}
  
  ${violations.map(violation => `
    <div class="violation">
      <h3>Test: ${violation.testName}</h3>
      <p><strong>File:</strong> ${violation.testFile}</p>
      <p><strong>Violations:</strong> ${violation.count}</p>
      <div class="violation-details">${violation.details}</div>
    </div>
  `).join('')}
  
  <p class="timestamp">Report generated on ${new Date().toISOString()}</p>
</body>
</html>
`;

// Write the report
fs.writeFileSync(REPORT_FILE, html);

console.log(`Accessibility report generated at ${REPORT_FILE}`);
