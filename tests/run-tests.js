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
  const directories = getTestDirectories();
  let allFiles = [];

  // Collect all test files
  for (const directory of directories) {
    const files = getTestFiles(directory);
    allFiles = [...allFiles, ...files];
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
  if (testType === TEST_TYPES.UNIT) {
    return null; // No server needed for unit tests
  }

  console.log('Starting test server...');

  const server = spawn('node', ['./backend/dev-server.js'], {
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, PORT: '3005' }
  });

  // Wait for server to start
  return new Promise((resolve, reject) => {
    let output = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[Server] ${data.toString().trim()}`);

      if (output.includes('Server running on port') || output.includes('development server running on port')) {
        console.log('Server started successfully.');
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data.toString().trim()}`);
    });

    server.on('error', (error) => {
      console.error('Failed to start server:', error);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!output.includes('Server running on port')) {
        reject(new Error('Server startup timeout'));
      }
    }, 10000);
  });
};

// Main function
const main = async () => {
  let server = null;

  try {
    // Start server if needed
    server = await startServer();

    // Run tests
    await runTests();
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  } finally {
    // Clean up server
    if (server) {
      console.log('Stopping server...');
      server.kill();
    }
  }
};

// Run the main function
main();
