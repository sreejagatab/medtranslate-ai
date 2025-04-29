/**
 * Test Runner for MedTranslate AI
 *
 * This script runs the tests for the MedTranslate AI application.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_TYPES = {
  UNIT: 'unit',
  INTEGRATION: 'integration',
  PERFORMANCE: 'performance',
  E2E: 'e2e',
  WEBSOCKET: 'websocket',
  EDGE: 'edge',
  ALL: 'all'
};

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || TEST_TYPES.ALL;
const testPattern = args[1] || '';

// Validate test type
if (!Object.values(TEST_TYPES).includes(testType)) {
  console.error(`Invalid test type: ${testType}`);
  console.error(`Valid test types: ${Object.values(TEST_TYPES).join(', ')}`);
  process.exit(1);
}

// Get test directories
const getTestDirectories = () => {
  const directories = [];

  if (testType === TEST_TYPES.ALL || testType === TEST_TYPES.UNIT) {
    directories.push('unit');
  }

  if (testType === TEST_TYPES.ALL || testType === TEST_TYPES.INTEGRATION) {
    directories.push('integration');
  }

  if (testType === TEST_TYPES.ALL || testType === TEST_TYPES.PERFORMANCE) {
    directories.push('performance');
  }

  return directories;
};

// Get specific test files based on test type
const getSpecificTestFiles = () => {
  if (testType === TEST_TYPES.E2E) {
    return [
      path.join(__dirname, 'integration/complete-translation-flow.test.js')
    ];
  }

  if (testType === TEST_TYPES.WEBSOCKET) {
    return [
      path.join(__dirname, 'integration/websocket-communication.test.js')
    ];
  }

  if (testType === TEST_TYPES.EDGE) {
    return [
      path.join(__dirname, 'integration/edge-offline-sync.test.js'),
      path.join(__dirname, 'unit/edge-translation.test.js'),
      path.join(__dirname, 'unit/edge-cache.test.js'),
      path.join(__dirname, 'unit/edge-sync.test.js'),
      path.join(__dirname, 'unit/edge-server.test.js')
    ];
  }

  return [];
};

// Get test files
const getTestFiles = (directory) => {
  const testDir = path.join(__dirname, directory);

  if (!fs.existsSync(testDir)) {
    console.warn(`Test directory not found: ${testDir}`);
    return [];
  }

  const files = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js'))
    .filter(file => testPattern ? file.includes(testPattern) : true)
    .map(file => path.join(testDir, file));

  return files;
};

// Run tests
const runTests = async () => {
  let allFiles = [];

  // Check for specific test types first
  const specificFiles = getSpecificTestFiles();
  if (specificFiles.length > 0) {
    allFiles = specificFiles;
  } else {
    // Collect all test files from directories
    const directories = getTestDirectories();
    for (const directory of directories) {
      const files = getTestFiles(directory);
      allFiles = [...allFiles, ...files];
    }
  }

  if (allFiles.length === 0) {
    console.warn('No test files found.');
    return;
  }

  console.log(`Running ${allFiles.length} test files...`);

  // Run Jest with the test files
  const jest = spawn('npx', ['jest', '--verbose', ...allFiles], {
    stdio: 'inherit',
    shell: true
  });

  return new Promise((resolve, reject) => {
    jest.on('close', (code) => {
      if (code === 0) {
        console.log('All tests passed!');
        resolve();
      } else {
        console.error(`Tests failed with code ${code}`);
        reject(new Error(`Tests failed with code ${code}`));
      }
    });
  });
};

// Start the server if needed
const startServer = async () => {
  if (testType === TEST_TYPES.UNIT && !testType.includes('edge')) {
    return null; // No server needed for unit tests except edge tests
  }

  console.log('Starting test server...');

  // Start backend server
  const backendServer = spawn('node', ['./backend/dev-server.js'], {
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, PORT: '3005' }
  });

  // Start edge server if needed
  let edgeServer = null;
  if (testType === TEST_TYPES.EDGE || testType === TEST_TYPES.E2E || testType === TEST_TYPES.ALL) {
    console.log('Starting edge server...');
    edgeServer = spawn('node', ['./edge/app/server.js'], {
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, PORT: '3006' }
    });
  }

  // Wait for server to start
  return new Promise((resolve, reject) => {
    let backendOutput = '';
    let edgeOutput = '';
    let backendStarted = false;
    let edgeStarted = edgeServer ? false : true; // If no edge server, consider it started

    backendServer.stdout.on('data', (data) => {
      backendOutput += data.toString();
      console.log(`[Backend] ${data.toString().trim()}`);

      if (backendOutput.includes('Server running on port') || backendOutput.includes('development server running on port')) {
        console.log('Backend server started successfully.');
        backendStarted = true;

        if (backendStarted && edgeStarted) {
          resolve({ backendServer, edgeServer });
        }
      }
    });

    backendServer.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backendServer.on('error', (error) => {
      console.error('Failed to start backend server:', error);
      reject(error);
    });

    if (edgeServer) {
      edgeServer.stdout.on('data', (data) => {
        edgeOutput += data.toString();
        console.log(`[Edge] ${data.toString().trim()}`);

        if (edgeOutput.includes('Server running on port') || edgeOutput.includes('Edge server running on port')) {
          console.log('Edge server started successfully.');
          edgeStarted = true;

          if (backendStarted && edgeStarted) {
            resolve({ backendServer, edgeServer });
          }
        }
      });

      edgeServer.stderr.on('data', (data) => {
        console.error(`[Edge Error] ${data.toString().trim()}`);
      });

      edgeServer.on('error', (error) => {
        console.error('Failed to start edge server:', error);
        reject(error);
      });
    }

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!backendStarted || !edgeStarted) {
        let errorMessage = '';
        if (!backendStarted) errorMessage += 'Backend server startup timeout. ';
        if (!edgeStarted && edgeServer) errorMessage += 'Edge server startup timeout.';
        reject(new Error(errorMessage));
      }
    }, 15000);
  });
};

// Main function
const main = async () => {
  let servers = null;

  try {
    // Start servers if needed
    servers = await startServer();

    // Set environment variables for tests
    if (servers) {
      process.env.BACKEND_URL = 'http://localhost:3005';
      process.env.EDGE_URL = 'http://localhost:3006';
      process.env.WS_URL = 'ws://localhost:3005/ws';
    }

    // Run tests
    await runTests();
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  } finally {
    // Clean up servers
    if (servers) {
      console.log('Stopping servers...');

      if (servers.backendServer) {
        servers.backendServer.kill();
        console.log('Backend server stopped.');
      }

      if (servers.edgeServer) {
        servers.edgeServer.kill();
        console.log('Edge server stopped.');
      }
    }
  }
};

// Run the main function
main();
