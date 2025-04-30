/**
 * Test Scenario Runner for MedTranslate AI Integration Tests
 * 
 * This script runs test scenarios for the MedTranslate AI system
 * using the test scenario generator.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { 
  generateRandomScenario, 
  generateScenarios,
  generateComprehensiveTestSuite,
  generateEdgeCaseScenarios
} = require('./test-scenario-generator');
const { generateReport, saveReport, saveHtmlReport } = require('./test-reporter');

// Configuration
const CONFIG = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3002',
  reportDir: path.join(__dirname, '../../test-reports'),
  scenarioCount: parseInt(process.env.SCENARIO_COUNT || '10'),
  testMode: process.argv[2] || 'random', // random, comprehensive, edge-cases
  targetService: process.argv[3] || 'both' // backend, edge, both
};

// Helper function for API requests
async function apiRequest(url, options = {}) {
  try {
    const response = await axios({
      url,
      ...options,
      validateStatus: () => true, // Don't throw on non-2xx status
      timeout: 10000 // 10 second timeout
    });
    
    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
      duration: response.headers['x-response-time'] ? 
        parseInt(response.headers['x-response-time']) : 
        null
    };
  } catch (error) {
    console.error(`API request error: ${error.message}`);
    return {
      status: 500,
      data: { error: error.message },
      headers: {},
      duration: null
    };
  }
}

// Run a single test scenario against the backend
async function testBackendScenario(scenario) {
  console.log(`Testing backend with scenario: ${scenario.context} (${scenario.sourceLanguage}->${scenario.targetLanguage})`);
  
  const startTime = Date.now();
  const response = await apiRequest(`${CONFIG.backendUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      text: scenario.text,
      sourceLanguage: scenario.sourceLanguage,
      targetLanguage: scenario.targetLanguage,
      context: scenario.context
    }
  });
  const endTime = Date.now();
  
  const duration = response.duration || (endTime - startTime);
  
  return {
    success: response.status === 200 && response.data.translatedText,
    duration,
    response: response.data,
    error: response.status !== 200 ? response.data.error || 'Unknown error' : null
  };
}

// Run a single test scenario against the edge
async function testEdgeScenario(scenario) {
  console.log(`Testing edge with scenario: ${scenario.context} (${scenario.sourceLanguage}->${scenario.targetLanguage})`);
  
  const startTime = Date.now();
  const response = await apiRequest(`${CONFIG.edgeUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      text: scenario.text,
      sourceLanguage: scenario.sourceLanguage,
      targetLanguage: scenario.targetLanguage,
      context: scenario.context
    }
  });
  const endTime = Date.now();
  
  const duration = response.duration || (endTime - startTime);
  
  return {
    success: response.status === 200 && response.data.translatedText,
    duration,
    response: response.data,
    error: response.status !== 200 ? response.data.error || 'Unknown error' : null
  };
}

// Run a test scenario
async function runTestScenario(scenario) {
  const results = {
    scenario,
    backend: null,
    edge: null
  };
  
  // Test backend if configured
  if (CONFIG.targetService === 'backend' || CONFIG.targetService === 'both') {
    results.backend = await testBackendScenario(scenario);
  }
  
  // Test edge if configured
  if (CONFIG.targetService === 'edge' || CONFIG.targetService === 'both') {
    results.edge = await testEdgeScenario(scenario);
  }
  
  return results;
}

// Run all test scenarios
async function runAllScenarios(scenarios) {
  const results = [];
  
  for (const scenario of scenarios) {
    const result = await runTestScenario(scenario);
    results.push(result);
  }
  
  return results;
}

// Generate test scenarios based on mode
function getTestScenarios() {
  switch (CONFIG.testMode) {
    case 'comprehensive':
      return generateComprehensiveTestSuite();
    case 'edge-cases':
      return generateEdgeCaseScenarios();
    case 'random':
    default:
      return generateScenarios(CONFIG.scenarioCount);
  }
}

// Generate a summary report
function generateSummaryReport(results) {
  // Calculate backend stats
  const backendResults = results
    .filter(r => r.backend)
    .map(r => r.backend);
  
  const backendSuccess = backendResults.filter(r => r.success).length;
  const backendTotal = backendResults.length;
  const backendDurations = backendResults.map(r => r.duration).filter(d => d);
  const backendAvgDuration = backendDurations.length > 0 ? 
    backendDurations.reduce((sum, d) => sum + d, 0) / backendDurations.length : 
    null;
  
  // Calculate edge stats
  const edgeResults = results
    .filter(r => r.edge)
    .map(r => r.edge);
  
  const edgeSuccess = edgeResults.filter(r => r.success).length;
  const edgeTotal = edgeResults.length;
  const edgeDurations = edgeResults.map(r => r.duration).filter(d => d);
  const edgeAvgDuration = edgeDurations.length > 0 ? 
    edgeDurations.reduce((sum, d) => sum + d, 0) / edgeDurations.length : 
    null;
  
  // Create summary
  const summary = {
    testMode: CONFIG.testMode,
    targetService: CONFIG.targetService,
    scenarioCount: results.length,
    backend: {
      total: backendTotal,
      success: backendSuccess,
      failed: backendTotal - backendSuccess,
      successRate: backendTotal > 0 ? (backendSuccess / backendTotal) * 100 : null,
      avgDuration: backendAvgDuration
    },
    edge: {
      total: edgeTotal,
      success: edgeSuccess,
      failed: edgeTotal - edgeSuccess,
      successRate: edgeTotal > 0 ? (edgeSuccess / edgeTotal) * 100 : null,
      avgDuration: edgeAvgDuration
    },
    overall: {
      success: (backendSuccess + edgeSuccess) === (backendTotal + edgeTotal)
    }
  };
  
  return summary;
}

// Save test results
function saveResults(results, summary) {
  // Create report directory if it doesn't exist
  if (!fs.existsSync(CONFIG.reportDir)) {
    fs.mkdirSync(CONFIG.reportDir, { recursive: true });
  }
  
  // Generate timestamp
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  
  // Save detailed results
  const detailedResultsPath = path.join(
    CONFIG.reportDir, 
    `scenario-test-results-${CONFIG.testMode}-${timestamp}.json`
  );
  
  fs.writeFileSync(detailedResultsPath, JSON.stringify({
    summary,
    results
  }, null, 2));
  
  console.log(`\nDetailed results saved to: ${detailedResultsPath}`);
  
  // Generate and save report
  const report = generateReport(
    `MedTranslate AI ${CONFIG.testMode.charAt(0).toUpperCase() + CONFIG.testMode.slice(1)} Scenario Tests`,
    {
      backend: summary.backend.successRate === 100,
      edge: summary.edge.successRate === 100,
      overall: summary.overall.success
    }
  );
  
  // Save HTML report
  const htmlReportPath = saveHtmlReport(
    report, 
    `scenario-test-report-${CONFIG.testMode}-${timestamp}.html`
  );
  
  console.log(`HTML report saved to: ${htmlReportPath}`);
  
  return {
    detailedResultsPath,
    htmlReportPath
  };
}

// Main function
async function main() {
  console.log(`Starting MedTranslate AI ${CONFIG.testMode} scenario tests`);
  console.log(`Target service: ${CONFIG.targetService}`);
  
  try {
    // Generate scenarios
    const scenarios = getTestScenarios();
    console.log(`Generated ${scenarios.length} test scenarios`);
    
    // Run scenarios
    const results = await runAllScenarios(scenarios);
    
    // Generate summary
    const summary = generateSummaryReport(results);
    
    // Save results
    saveResults(results, summary);
    
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Test mode: ${CONFIG.testMode}`);
    console.log(`Scenarios: ${summary.scenarioCount}`);
    
    if (summary.backend.total > 0) {
      console.log('\nBackend:');
      console.log(`  Success: ${summary.backend.success}/${summary.backend.total} (${summary.backend.successRate.toFixed(2)}%)`);
      console.log(`  Avg duration: ${summary.backend.avgDuration ? summary.backend.avgDuration.toFixed(2) + 'ms' : 'N/A'}`);
    }
    
    if (summary.edge.total > 0) {
      console.log('\nEdge:');
      console.log(`  Success: ${summary.edge.success}/${summary.edge.total} (${summary.edge.successRate.toFixed(2)}%)`);
      console.log(`  Avg duration: ${summary.edge.avgDuration ? summary.edge.avgDuration.toFixed(2) + 'ms' : 'N/A'}`);
    }
    
    console.log(`\nOverall result: ${summary.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Exit with appropriate code
    process.exit(summary.overall.success ? 0 : 1);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the script
main();
