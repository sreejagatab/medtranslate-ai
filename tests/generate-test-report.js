/**
 * Test Report Generator
 * 
 * This script generates a comprehensive test report by aggregating results from all test types.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  testResultsDir: path.join(__dirname, '..', 'test-results'),
  reportOutputDir: path.join(__dirname, '..', 'test-report'),
  testTypes: ['unit', 'integration', 'e2e', 'performance', 'security']
};

// Create report output directory if it doesn't exist
if (!fs.existsSync(config.reportOutputDir)) {
  fs.mkdirSync(config.reportOutputDir, { recursive: true });
}

// Helper function to read test results
function readTestResults(testType) {
  const testTypeDir = path.join(config.testResultsDir, testType);
  
  if (!fs.existsSync(testTypeDir)) {
    console.log(`No results found for ${testType} tests`);
    return null;
  }
  
  try {
    // Find all JSON result files
    const resultFiles = fs.readdirSync(testTypeDir)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(testTypeDir, file));
    
    if (resultFiles.length === 0) {
      console.log(`No result files found for ${testType} tests`);
      return null;
    }
    
    // Read and parse all result files
    const results = [];
    for (const file of resultFiles) {
      const content = fs.readFileSync(file, 'utf8');
      results.push(JSON.parse(content));
    }
    
    return results;
  } catch (error) {
    console.error(`Error reading ${testType} test results:`, error.message);
    return null;
  }
}

// Helper function to aggregate test results
function aggregateResults(results) {
  if (!results || results.length === 0) {
    return null;
  }
  
  const aggregated = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    duration: 0,
    testSuites: []
  };
  
  for (const result of results) {
    if (result.numTotalTests) {
      // Jest format
      aggregated.totalTests += result.numTotalTests;
      aggregated.passedTests += result.numPassedTests;
      aggregated.failedTests += result.numFailedTests;
      aggregated.skippedTests += result.numPendingTests || 0;
      aggregated.duration += result.testResults.reduce((sum, suite) => sum + suite.perfStats.runtime, 0);
      aggregated.testSuites.push(...result.testResults);
    } else if (result.stats) {
      // Mocha format
      aggregated.totalTests += result.stats.tests;
      aggregated.passedTests += result.stats.passes;
      aggregated.failedTests += result.stats.failures;
      aggregated.skippedTests += result.stats.pending || 0;
      aggregated.duration += result.stats.duration;
      aggregated.testSuites.push(...result.suites);
    } else if (result.tests) {
      // Custom format
      aggregated.totalTests += result.tests.length;
      aggregated.passedTests += result.tests.filter(t => t.status === 'passed').length;
      aggregated.failedTests += result.tests.filter(t => t.status === 'failed').length;
      aggregated.skippedTests += result.tests.filter(t => t.status === 'skipped').length;
      aggregated.duration += result.duration || 0;
      aggregated.testSuites.push(result);
    }
  }
  
  return aggregated;
}

// Helper function to generate HTML report
function generateHtmlReport(results) {
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MedTranslate AI Test Report</title>
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
      justify-content: space-between;
      flex-wrap: wrap;
      margin-bottom: 30px;
    }
    .summary-card {
      background-color: #f5f5f5;
      border-radius: 5px;
      padding: 15px;
      margin: 10px;
      flex: 1;
      min-width: 200px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      margin-top: 0;
    }
    .passed { color: #4CAF50; }
    .failed { color: #F44336; }
    .skipped { color: #FF9800; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #0066cc;
      color: white;
    }
    tr:nth-child(even) {
      background-color: #f2f2f2;
    }
    .test-details {
      margin-top: 30px;
    }
    .test-suite {
      margin-bottom: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow: hidden;
    }
    .test-suite-header {
      background-color: #eee;
      padding: 10px 15px;
      cursor: pointer;
    }
    .test-suite-body {
      padding: 0 15px;
    }
    .test-case {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .test-case:last-child {
      border-bottom: none;
    }
    .chart-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto 30px;
    }
  </style>
</head>
<body>
  <h1>MedTranslate AI Test Report</h1>
  <p>Generated on ${new Date().toLocaleString()}</p>
  
  <div class="summary">
`;

  // Add summary cards for each test type
  for (const testType of config.testTypes) {
    if (results[testType]) {
      const r = results[testType];
      const passRate = r.totalTests > 0 ? Math.round((r.passedTests / r.totalTests) * 100) : 0;
      
      html += `
    <div class="summary-card">
      <h3>${testType.charAt(0).toUpperCase() + testType.slice(1)} Tests</h3>
      <p>Total: <strong>${r.totalTests}</strong></p>
      <p>Passed: <strong class="passed">${r.passedTests}</strong> (${passRate}%)</p>
      <p>Failed: <strong class="failed">${r.failedTests}</strong></p>
      <p>Skipped: <strong class="skipped">${r.skippedTests}</strong></p>
      <p>Duration: ${(r.duration / 1000).toFixed(2)}s</p>
    </div>`;
    }
  }
  
  // Add overall summary
  const totalTests = Object.values(results).reduce((sum, r) => r ? sum + r.totalTests : sum, 0);
  const passedTests = Object.values(results).reduce((sum, r) => r ? sum + r.passedTests : sum, 0);
  const failedTests = Object.values(results).reduce((sum, r) => r ? sum + r.failedTests : sum, 0);
  const skippedTests = Object.values(results).reduce((sum, r) => r ? sum + r.skippedTests : sum, 0);
  const totalDuration = Object.values(results).reduce((sum, r) => r ? sum + r.duration : sum, 0);
  const overallPassRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  html += `
    <div class="summary-card">
      <h3>Overall</h3>
      <p>Total: <strong>${totalTests}</strong></p>
      <p>Passed: <strong class="passed">${passedTests}</strong> (${overallPassRate}%)</p>
      <p>Failed: <strong class="failed">${failedTests}</strong></p>
      <p>Skipped: <strong class="skipped">${skippedTests}</strong></p>
      <p>Duration: ${(totalDuration / 1000).toFixed(2)}s</p>
    </div>
  </div>
  
  <div class="chart-container">
    <canvas id="resultsChart"></canvas>
  </div>
  
  <h2>Test Results</h2>`;
  
  // Add test results for each test type
  for (const testType of config.testTypes) {
    if (results[testType]) {
      html += `
  <h3>${testType.charAt(0).toUpperCase() + testType.slice(1)} Tests</h3>
  <div class="test-details">`;
      
      // Add test suites
      if (results[testType].testSuites && results[testType].testSuites.length > 0) {
        for (let i = 0; i < results[testType].testSuites.length; i++) {
          const suite = results[testType].testSuites[i];
          const suiteName = suite.testFilePath || suite.file || `Test Suite ${i + 1}`;
          const suiteStatus = suite.numFailingTests > 0 || suite.status === 'failed' ? 'failed' : 'passed';
          
          html += `
    <div class="test-suite">
      <div class="test-suite-header" onclick="toggleSuite('${testType}-suite-${i}')">
        <span class="${suiteStatus}">${suiteStatus === 'passed' ? '✓' : '✗'}</span> ${suiteName}
      </div>
      <div class="test-suite-body" id="${testType}-suite-${i}" style="display: none;">`;
          
          // Add test cases
          const testCases = suite.testResults || suite.tests || [];
          for (const testCase of testCases) {
            const testName = testCase.title || testCase.fullName || testCase.name || 'Unnamed test';
            const testStatus = testCase.status;
            
            html += `
        <div class="test-case">
          <span class="${testStatus}">${testStatus === 'passed' ? '✓' : testStatus === 'failed' ? '✗' : '⚠'}</span> ${testName}
          ${testCase.failureMessages ? `<pre>${testCase.failureMessages.join('\n')}</pre>` : ''}
        </div>`;
          }
          
          html += `
      </div>
    </div>`;
        }
      } else {
        html += `<p>No detailed test results available</p>`;
      }
      
      html += `
  </div>`;
    }
  }
  
  // Add JavaScript for interactivity and charts
  html += `
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    function toggleSuite(id) {
      const element = document.getElementById(id);
      if (element.style.display === 'none') {
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
    }
    
    // Create chart
    document.addEventListener('DOMContentLoaded', function() {
      const ctx = document.getElementById('resultsChart').getContext('2d');
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Passed', 'Failed', 'Skipped'],
          datasets: [{
            data: [${passedTests}, ${failedTests}, ${skippedTests}],
            backgroundColor: ['#4CAF50', '#F44336', '#FF9800']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Test Results'
            }
          }
        }
      });
    });
  </script>
</body>
</html>`;
  
  return html;
}

// Helper function to generate Markdown report
function generateMarkdownReport(results) {
  let markdown = `# MedTranslate AI Test Report\n\nGenerated on ${new Date().toLocaleString()}\n\n`;
  
  // Add summary for each test type
  markdown += `## Summary\n\n`;
  
  for (const testType of config.testTypes) {
    if (results[testType]) {
      const r = results[testType];
      const passRate = r.totalTests > 0 ? Math.round((r.passedTests / r.totalTests) * 100) : 0;
      
      markdown += `### ${testType.charAt(0).toUpperCase() + testType.slice(1)} Tests\n\n`;
      markdown += `- Total: **${r.totalTests}**\n`;
      markdown += `- Passed: **${r.passedTests}** (${passRate}%)\n`;
      markdown += `- Failed: **${r.failedTests}**\n`;
      markdown += `- Skipped: **${r.skippedTests}**\n`;
      markdown += `- Duration: ${(r.duration / 1000).toFixed(2)}s\n\n`;
    }
  }
  
  // Add overall summary
  const totalTests = Object.values(results).reduce((sum, r) => r ? sum + r.totalTests : sum, 0);
  const passedTests = Object.values(results).reduce((sum, r) => r ? sum + r.passedTests : sum, 0);
  const failedTests = Object.values(results).reduce((sum, r) => r ? sum + r.failedTests : sum, 0);
  const skippedTests = Object.values(results).reduce((sum, r) => r ? sum + r.skippedTests : sum, 0);
  const totalDuration = Object.values(results).reduce((sum, r) => r ? sum + r.duration : sum, 0);
  const overallPassRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  markdown += `### Overall\n\n`;
  markdown += `- Total: **${totalTests}**\n`;
  markdown += `- Passed: **${passedTests}** (${overallPassRate}%)\n`;
  markdown += `- Failed: **${failedTests}**\n`;
  markdown += `- Skipped: **${skippedTests}**\n`;
  markdown += `- Duration: ${(totalDuration / 1000).toFixed(2)}s\n\n`;
  
  // Add failed tests if any
  if (failedTests > 0) {
    markdown += `## Failed Tests\n\n`;
    
    for (const testType of config.testTypes) {
      if (results[testType] && results[testType].testSuites) {
        for (const suite of results[testType].testSuites) {
          const testCases = suite.testResults || suite.tests || [];
          const failedTests = testCases.filter(t => t.status === 'failed');
          
          if (failedTests.length > 0) {
            const suiteName = suite.testFilePath || suite.file || 'Unknown Test Suite';
            markdown += `### ${suiteName}\n\n`;
            
            for (const test of failedTests) {
              const testName = test.title || test.fullName || test.name || 'Unnamed test';
              markdown += `- ❌ **${testName}**\n`;
              
              if (test.failureMessages) {
                markdown += `  ```\n  ${test.failureMessages.join('\n  ')}\n  ```\n`;
              }
            }
            
            markdown += '\n';
          }
        }
      }
    }
  }
  
  return markdown;
}

// Main function to generate test report
function generateTestReport() {
  console.log('Generating test report...');
  
  // Read test results for each test type
  const testResults = {};
  for (const testType of config.testTypes) {
    const results = readTestResults(testType);
    if (results) {
      testResults[testType] = aggregateResults(results);
    }
  }
  
  // Generate HTML report
  const htmlReport = generateHtmlReport(testResults);
  fs.writeFileSync(path.join(config.reportOutputDir, 'report.html'), htmlReport);
  console.log(`HTML report saved to ${path.join(config.reportOutputDir, 'report.html')}`);
  
  // Generate Markdown report
  const markdownReport = generateMarkdownReport(testResults);
  fs.writeFileSync(path.join(config.reportOutputDir, 'report.md'), markdownReport);
  console.log(`Markdown report saved to ${path.join(config.reportOutputDir, 'report.md')}`);
  
  // Generate summary for GitHub comment
  fs.writeFileSync(path.join(config.reportOutputDir, 'summary.md'), markdownReport);
  console.log(`Summary report saved to ${path.join(config.reportOutputDir, 'summary.md')}`);
  
  console.log('Test report generation completed');
}

// Run the report generator
generateTestReport();
