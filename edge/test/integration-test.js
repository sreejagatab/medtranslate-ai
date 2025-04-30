/**
 * Integration Test for MedTranslate AI Edge Computing Capabilities
 * 
 * This script tests the integration of enhanced edge computing capabilities
 * with the full MedTranslate AI system.
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Import modules
const modelManager = require('../app/model_manager');
const cache = require('../app/cache');
const sync = require('../app/sync');
const networkMonitor = require('../app/network-monitor');
const server = require('../app/server');

// Test configuration
const CONFIG = {
  serverPort: process.env.TEST_SERVER_PORT || 3000,
  testDuration: process.env.TEST_DURATION || 60000, // 1 minute
  concurrentUsers: process.env.CONCURRENT_USERS || 5,
  offlineTestDuration: process.env.OFFLINE_TEST_DURATION || 30000, // 30 seconds
  apiEndpoint: process.env.API_ENDPOINT || 'http://localhost:3000/api',
  wsEndpoint: process.env.WS_ENDPOINT || 'ws://localhost:3000/ws',
  testReportPath: process.env.TEST_REPORT_PATH || '../test-reports/integration-test-report.json'
};

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Basic Translation',
    endpoint: '/translate',
    method: 'POST',
    data: {
      text: 'The patient has a fever of 101°F and complains of headache and fatigue.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    },
    validation: (response) => {
      return response.translatedText && response.confidence;
    }
  },
  {
    name: 'Medical Terminology Translation',
    endpoint: '/translate',
    method: 'POST',
    data: {
      text: 'The patient has a history of myocardial infarction and is currently on anticoagulant therapy.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'cardiology'
    },
    validation: (response) => {
      return response.translatedText && 
             response.translatedText.includes('infarto') && 
             response.confidence;
    }
  },
  {
    name: 'Offline Translation',
    endpoint: '/translate',
    method: 'POST',
    offline: true,
    data: {
      text: 'The patient presents with symptoms of multiple sclerosis, including numbness and visual disturbances.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'neurology',
      offlinePriority: true
    },
    validation: (response) => {
      return response.translatedText && response.confidence;
    }
  },
  {
    name: 'Audio Translation',
    endpoint: '/translate-audio',
    method: 'POST',
    data: {
      // Base64 encoded audio would go here in a real test
      audioBase64: 'DUMMY_AUDIO_DATA',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    },
    validation: (response) => {
      return response.translatedText;
    },
    skip: true // Skip this test as it requires real audio data
  },
  {
    name: 'WebSocket Translation',
    websocket: true,
    data: {
      type: 'translate',
      payload: {
        text: 'The patient is experiencing shortness of breath and chest pain.',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'cardiology'
      }
    },
    validation: (response) => {
      return response.type === 'translation' && 
             response.payload.translatedText;
    }
  }
];

// Test results
let testResults = {
  summary: {
    startTime: null,
    endTime: null,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    averageResponseTime: 0
  },
  scenarios: [],
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuCores: require('os').cpus().length,
    totalMemory: require('os').totalmem(),
    freeMemory: require('os').freemem()
  }
};

/**
 * Start the test server
 */
async function startTestServer() {
  console.log('Starting test server...');
  
  // Check if server is already running
  try {
    const response = await axios.get(`http://localhost:${CONFIG.serverPort}/health`);
    if (response.status === 200) {
      console.log('Server is already running');
      return true;
    }
  } catch (error) {
    // Server is not running, which is expected
  }
  
  // Start server
  try {
    // Set environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.PORT = CONFIG.serverPort;
    process.env.USE_OPTIMIZED_INFERENCE = 'true';
    
    // Start server in a separate process
    const serverProcess = spawn('node', ['app/server.js'], {
      detached: true,
      stdio: 'ignore',
      env: process.env
    });
    
    serverProcess.unref();
    
    // Wait for server to start
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await axios.get(`http://localhost:${CONFIG.serverPort}/health`);
        if (response.status === 200) {
          console.log('Server started successfully');
          return true;
        }
      } catch (error) {
        attempts++;
        console.log(`Waiting for server to start (${attempts}/${maxAttempts})...`);
      }
    }
    
    console.error('Failed to start server');
    return false;
  } catch (error) {
    console.error('Error starting server:', error);
    return false;
  }
}

/**
 * Run a test scenario
 */
async function runTestScenario(scenario, userIndex = 0) {
  if (scenario.skip) {
    console.log(`Skipping scenario: ${scenario.name}`);
    return {
      name: scenario.name,
      status: 'skipped',
      duration: 0,
      error: null
    };
  }
  
  console.log(`Running scenario: ${scenario.name} (User ${userIndex + 1})`);
  
  // Set offline mode if required
  if (scenario.offline) {
    networkMonitor.setOfflineMode(true);
    console.log('Switched to offline mode');
  }
  
  const startTime = Date.now();
  let result;
  
  try {
    if (scenario.websocket) {
      // WebSocket test
      result = await runWebSocketTest(scenario);
    } else {
      // REST API test
      const url = `${CONFIG.apiEndpoint}${scenario.endpoint}`;
      const response = await axios({
        method: scenario.method,
        url,
        data: scenario.data,
        timeout: 10000
      });
      
      result = {
        status: response.status === 200 && scenario.validation(response.data) ? 'passed' : 'failed',
        response: response.data,
        duration: Date.now() - startTime,
        error: null
      };
      
      if (result.status === 'failed') {
        result.error = 'Validation failed';
      }
    }
  } catch (error) {
    result = {
      status: 'failed',
      response: null,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
  
  // Restore online mode
  if (scenario.offline) {
    networkMonitor.setOfflineMode(false);
    console.log('Restored online mode');
  }
  
  console.log(`Scenario ${scenario.name} ${result.status} in ${result.duration}ms`);
  
  return {
    name: scenario.name,
    user: userIndex + 1,
    status: result.status,
    duration: result.duration,
    error: result.error,
    response: result.response
  };
}

/**
 * Run a WebSocket test
 */
async function runWebSocketTest(scenario) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const ws = new WebSocket(CONFIG.wsEndpoint);
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket test timed out'));
    }, 10000);
    
    ws.on('open', () => {
      console.log('WebSocket connection established');
      ws.send(JSON.stringify(scenario.data));
    });
    
    ws.on('message', (data) => {
      clearTimeout(timeout);
      const response = JSON.parse(data);
      
      const result = {
        status: scenario.validation(response) ? 'passed' : 'failed',
        response,
        duration: Date.now() - startTime,
        error: null
      };
      
      if (result.status === 'failed') {
        result.error = 'Validation failed';
      }
      
      ws.close();
      resolve(result);
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Run all test scenarios with concurrent users
 */
async function runAllScenarios() {
  const concurrentUsers = parseInt(CONFIG.concurrentUsers);
  const allResults = [];
  
  // Run each scenario with multiple concurrent users
  for (const scenario of TEST_SCENARIOS) {
    const scenarioResults = [];
    
    // Create promises for concurrent users
    const userPromises = Array.from({ length: concurrentUsers }, (_, userIndex) => {
      return runTestScenario(scenario, userIndex);
    });
    
    // Wait for all users to complete the scenario
    const results = await Promise.all(userPromises);
    scenarioResults.push(...results);
    
    // Add results to the overall results
    allResults.push(...scenarioResults);
  }
  
  return allResults;
}

/**
 * Test offline mode with network interruption
 */
async function testOfflineMode() {
  console.log('\n=== Testing Offline Mode with Network Interruption ===\n');
  
  // Cache some translations first
  console.log('Caching translations for offline use...');
  
  const translationsToCache = [
    {
      text: 'The patient has a fever and headache.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    },
    {
      text: 'The doctor prescribed antibiotics for the infection.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    }
  ];
  
  // Cache translations
  for (const translation of translationsToCache) {
    try {
      const response = await axios.post(`${CONFIG.apiEndpoint}/translate`, {
        ...translation,
        offlinePriority: true
      });
      
      console.log(`Cached translation: "${translation.text}" -> "${response.data.translatedText}"`);
    } catch (error) {
      console.error(`Error caching translation: ${error.message}`);
    }
  }
  
  // Simulate network interruption
  console.log('\nSimulating network interruption...');
  networkMonitor.setOfflineMode(true);
  
  // Try to use cached translations
  const offlineResults = [];
  
  for (const translation of translationsToCache) {
    try {
      const startTime = Date.now();
      const response = await axios.post(`${CONFIG.apiEndpoint}/translate`, translation);
      
      offlineResults.push({
        text: translation.text,
        translatedText: response.data.translatedText,
        duration: Date.now() - startTime,
        fromCache: response.data.fromCache || false,
        status: 'passed'
      });
      
      console.log(`Offline translation: "${translation.text}" -> "${response.data.translatedText}" (${response.data.fromCache ? 'from cache' : 'not from cache'})`);
    } catch (error) {
      offlineResults.push({
        text: translation.text,
        status: 'failed',
        error: error.message
      });
      
      console.error(`Error in offline translation: ${error.message}`);
    }
  }
  
  // Try a new translation that's not in cache
  try {
    const newTranslation = {
      text: 'This is a new text that should not be in cache.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    };
    
    const startTime = Date.now();
    const response = await axios.post(`${CONFIG.apiEndpoint}/translate`, newTranslation);
    
    offlineResults.push({
      text: newTranslation.text,
      translatedText: response.data.translatedText,
      duration: Date.now() - startTime,
      fromCache: response.data.fromCache || false,
      status: 'passed'
    });
    
    console.log(`New offline translation: "${newTranslation.text}" -> "${response.data.translatedText}" (${response.data.fromCache ? 'from cache' : 'not from cache'})`);
  } catch (error) {
    offlineResults.push({
      text: 'New translation',
      status: 'failed',
      error: error.message
    });
    
    console.error(`Error in new offline translation: ${error.message}`);
  }
  
  // Restore online mode
  networkMonitor.setOfflineMode(false);
  console.log('\nRestored online mode');
  
  return offlineResults;
}

/**
 * Generate test report
 */
function generateTestReport(scenarioResults, offlineResults) {
  // Calculate summary
  const totalTests = scenarioResults.length;
  const passedTests = scenarioResults.filter(r => r.status === 'passed').length;
  const failedTests = scenarioResults.filter(r => r.status === 'failed').length;
  const skippedTests = scenarioResults.filter(r => r.status === 'skipped').length;
  const totalDuration = scenarioResults.reduce((sum, r) => sum + r.duration, 0);
  const averageResponseTime = totalTests > 0 ? totalDuration / totalTests : 0;
  
  // Group results by scenario name
  const scenarioGroups = {};
  
  for (const result of scenarioResults) {
    if (!scenarioGroups[result.name]) {
      scenarioGroups[result.name] = [];
    }
    
    scenarioGroups[result.name].push(result);
  }
  
  // Calculate scenario statistics
  const scenarios = Object.keys(scenarioGroups).map(name => {
    const results = scenarioGroups[name];
    const totalScenarioTests = results.length;
    const passedScenarioTests = results.filter(r => r.status === 'passed').length;
    const failedScenarioTests = results.filter(r => r.status === 'failed').length;
    const skippedScenarioTests = results.filter(r => r.status === 'skipped').length;
    const totalScenarioDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const averageScenarioResponseTime = totalScenarioTests > 0 ? totalScenarioDuration / totalScenarioTests : 0;
    
    return {
      name,
      totalTests: totalScenarioTests,
      passedTests: passedScenarioTests,
      failedTests: failedScenarioTests,
      skippedTests: skippedScenarioTests,
      averageResponseTime: averageScenarioResponseTime,
      results: results.map(r => ({
        user: r.user,
        status: r.status,
        duration: r.duration,
        error: r.error
      }))
    };
  });
  
  // Create report
  const report = {
    summary: {
      startTime: testResults.summary.startTime,
      endTime: Date.now(),
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      averageResponseTime,
      success: failedTests === 0
    },
    scenarios,
    offlineMode: {
      results: offlineResults
    },
    environment: testResults.environment
  };
  
  // Save report to file
  const reportDir = path.dirname(CONFIG.testReportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(CONFIG.testReportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`\nTest report saved to ${CONFIG.testReportPath}`);
  
  return report;
}

/**
 * Run the integration test
 */
async function runIntegrationTest() {
  console.log('=== MedTranslate AI Integration Test ===\n');
  
  try {
    // Record start time
    testResults.summary.startTime = Date.now();
    
    // Start test server
    const serverStarted = await startTestServer();
    
    if (!serverStarted) {
      console.error('Failed to start test server. Aborting test.');
      return;
    }
    
    // Wait for server to initialize
    console.log('Waiting for server to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Run all scenarios
    console.log('\n=== Running Test Scenarios ===\n');
    const scenarioResults = await runAllScenarios();
    
    // Test offline mode
    const offlineResults = await testOfflineMode();
    
    // Generate test report
    const report = generateTestReport(scenarioResults, offlineResults);
    
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    console.log(`Skipped: ${report.summary.skippedTests}`);
    console.log(`Average Response Time: ${report.summary.averageResponseTime.toFixed(2)}ms`);
    console.log(`Overall Status: ${report.summary.success ? 'SUCCESS' : 'FAILURE'}`);
    
    return report;
  } catch (error) {
    console.error('Error running integration test:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runIntegrationTest();
}

module.exports = {
  runIntegrationTest,
  CONFIG
};
