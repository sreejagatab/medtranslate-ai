/**
 * Run Integration Tests for MedTranslate AI
 * 
 * This script runs the integration tests for the MedTranslate AI project.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test files to run
const testFiles = [
  'integration/system-status-dashboard.test.js',
  'integration/alerting-system.test.js',
  'integration/cloudwatch-integration.test.js'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

/**
 * Run a test file
 * 
 * @param {string} testFile - Test file to run
 * @returns {Promise<boolean>} - Whether the test passed
 */
function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`${colors.bright}${colors.cyan}Running test: ${testFile}${colors.reset}`);
    
    // Check if the test file exists
    const testFilePath = path.join(__dirname, testFile);
    if (!fs.existsSync(testFilePath)) {
      console.error(`${colors.red}Test file not found: ${testFilePath}${colors.reset}`);
      resolve(false);
      return;
    }
    
    // Run the test
    const jest = spawn('npx', ['jest', testFilePath, '--colors'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    // Handle test completion
    jest.on('close', (code) => {
      if (code === 0) {
        console.log(`${colors.green}Test passed: ${testFile}${colors.reset}`);
        resolve(true);
      } else {
        console.error(`${colors.red}Test failed: ${testFile}${colors.reset}`);
        resolve(false);
      }
    });
    
    // Handle test error
    jest.on('error', (error) => {
      console.error(`${colors.red}Error running test: ${testFile}${colors.reset}`);
      console.error(error);
      resolve(false);
    });
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`${colors.bright}${colors.magenta}Running integration tests for MedTranslate AI${colors.reset}`);
  
  // Start the server if it's not already running
  const serverProcess = startServer();
  
  // Wait for the server to start
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Run each test
  const results = [];
  for (const testFile of testFiles) {
    const passed = await runTest(testFile);
    results.push({ testFile, passed });
  }
  
  // Stop the server
  stopServer(serverProcess);
  
  // Print results
  console.log(`\n${colors.bright}${colors.magenta}Test Results:${colors.reset}`);
  
  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? `${colors.green}PASSED${colors.reset}` : `${colors.red}FAILED${colors.reset}`;
    console.log(`${result.testFile}: ${status}`);
    
    if (!result.passed) {
      allPassed = false;
    }
  }
  
  // Print summary
  console.log(`\n${colors.bright}${colors.magenta}Summary:${colors.reset}`);
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.passed).length}`);
  console.log(`Failed: ${results.filter(r => !r.passed).length}`);
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

/**
 * Start the server
 * 
 * @returns {ChildProcess} - Server process
 */
function startServer() {
  console.log(`${colors.bright}${colors.cyan}Starting server...${colors.reset}`);
  
  // Check if the server is already running
  try {
    const response = fetch('http://localhost:3001/health');
    if (response.ok) {
      console.log(`${colors.green}Server is already running${colors.reset}`);
      return null;
    }
  } catch (error) {
    // Server is not running, which is expected
  }
  
  // Start the server
  const server = spawn('npm', ['run', 'start'], {
    cwd: path.join(__dirname, '..', 'backend'),
    stdio: 'pipe'
  });
  
  // Handle server output
  server.stdout.on('data', (data) => {
    console.log(`${colors.dim}Server: ${data.toString().trim()}${colors.reset}`);
  });
  
  server.stderr.on('data', (data) => {
    console.error(`${colors.red}Server error: ${data.toString().trim()}${colors.reset}`);
  });
  
  // Handle server error
  server.on('error', (error) => {
    console.error(`${colors.red}Error starting server:${colors.reset}`);
    console.error(error);
  });
  
  return server;
}

/**
 * Stop the server
 * 
 * @param {ChildProcess} serverProcess - Server process
 */
function stopServer(serverProcess) {
  if (serverProcess) {
    console.log(`${colors.bright}${colors.cyan}Stopping server...${colors.reset}`);
    serverProcess.kill();
  }
}

// Run the tests
runAllTests();
