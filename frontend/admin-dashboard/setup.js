/**
 * Setup script for MedTranslate AI Admin Dashboard
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const DASHBOARD_DIR = __dirname;
const ENV_FILE = path.join(DASHBOARD_DIR, '.env');

/**
 * Install dependencies
 */
function installDependencies() {
  console.log('Installing dependencies...');
  
  try {
    execSync('npm install', { stdio: 'inherit', cwd: DASHBOARD_DIR });
    console.log('Dependencies installed successfully');
  } catch (error) {
    console.error('Error installing dependencies:', error);
    process.exit(1);
  }
}

/**
 * Create environment file
 */
function createEnvFile() {
  console.log('Creating environment file...');
  
  const envContent = `
# MedTranslate AI Admin Dashboard Environment

# API Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001/ws

# Authentication
REACT_APP_AUTH_ENABLED=true
REACT_APP_AUTH_STORAGE_KEY=medtranslate_admin_token

# Analytics
REACT_APP_ANALYTICS_ENABLED=true
REACT_APP_ANALYTICS_REFRESH_INTERVAL=60000

# Feature Flags
REACT_APP_FEATURE_REAL_TIME_MONITORING=true
REACT_APP_FEATURE_USER_MANAGEMENT=true
REACT_APP_FEATURE_SYSTEM_HEALTH=true
REACT_APP_FEATURE_TRANSLATION_HISTORY=true
`.trim();
  
  fs.writeFileSync(ENV_FILE, envContent);
  console.log(`Environment file created at ${ENV_FILE}`);
}

/**
 * Start the development server
 */
function startDevServer() {
  console.log('Starting development server...');
  
  try {
    execSync('npm start', { stdio: 'inherit', cwd: DASHBOARD_DIR });
  } catch (error) {
    console.error('Error starting development server:', error);
    process.exit(1);
  }
}

/**
 * Build the dashboard for production
 */
function buildForProduction() {
  console.log('Building for production...');
  
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: DASHBOARD_DIR });
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Error building for production:', error);
    process.exit(1);
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log(`
MedTranslate AI Admin Dashboard Setup Script

Usage:
  node setup.js <command>

Commands:
  install    - Install dependencies
  env        - Create environment file
  start      - Start the development server
  build      - Build for production
  setup      - Run full setup (install + env)
`);
    return;
  }
  
  if (command === 'install') {
    installDependencies();
  } else if (command === 'env') {
    createEnvFile();
  } else if (command === 'start') {
    startDevServer();
  } else if (command === 'build') {
    buildForProduction();
  } else if (command === 'setup') {
    installDependencies();
    createEnvFile();
    console.log('Setup completed successfully');
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

// Run the main function
main();
