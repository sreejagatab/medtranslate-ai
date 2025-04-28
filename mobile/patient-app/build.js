/**
 * Build script for MedTranslate AI Patient Mobile App
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const APP_NAME = 'MedTranslate Patient';
const APP_VERSION = '1.0.0';
const APP_BUNDLE_ID = 'ai.medtranslate.patient';

// Build platforms
const PLATFORMS = {
  ANDROID: 'android',
  IOS: 'ios'
};

/**
 * Build the app for a specific platform
 * @param {string} platform - Platform to build for
 */
function buildApp(platform) {
  console.log(`Building ${APP_NAME} for ${platform}...`);
  
  try {
    if (platform === PLATFORMS.ANDROID) {
      // Build Android app
      execSync('npx expo build:android --type apk', { stdio: 'inherit' });
    } else if (platform === PLATFORMS.IOS) {
      // Build iOS app
      execSync('npx expo build:ios --type archive', { stdio: 'inherit' });
    } else {
      console.error(`Unknown platform: ${platform}`);
      process.exit(1);
    }
    
    console.log(`Successfully built ${APP_NAME} for ${platform}!`);
  } catch (error) {
    console.error(`Error building app for ${platform}:`, error);
    process.exit(1);
  }
}

/**
 * Start the development server
 */
function startDevServer() {
  console.log('Starting development server...');
  
  try {
    execSync('npx expo start', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error starting development server:', error);
    process.exit(1);
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const platform = args[1];
  
  if (!command) {
    console.log(`
MedTranslate AI Patient Mobile App Build Script

Usage:
  node build.js <command> [platform]

Commands:
  start       - Start the development server
  build       - Build the app for a specific platform
  
Platforms:
  android     - Android platform
  ios         - iOS platform
`);
    return;
  }
  
  if (command === 'start') {
    startDevServer();
  } else if (command === 'build') {
    if (!platform) {
      console.error('Please specify a platform: android or ios');
      process.exit(1);
    }
    
    buildApp(platform.toLowerCase());
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

// Run the main function
main();
