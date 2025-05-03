/**
 * Setup Mobile Shared Components Script
 * 
 * This script creates symbolic links from the frontend/shared directory to the mobile/patient-app/src/shared directory.
 * This ensures that the mobile app has access to the latest shared components without duplicating code.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const FRONTEND_SHARED_PATH = path.resolve(__dirname, '../frontend/shared');
const MOBILE_SHARED_PATH = path.resolve(__dirname, '../mobile/patient-app/src/shared');

// Components to link
const COMPONENTS_TO_LINK = [
  'components/EdgeDeviceDiscovery.js',
  'services/enhanced-edge-discovery.js',
  'utils/accessibility-utils.js'
];

// Create directories if they don't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Create symbolic link
function createSymlink(sourcePath, targetPath) {
  try {
    // Remove existing file or symlink
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      console.log(`Removed existing file: ${targetPath}`);
    }

    // Create parent directory if it doesn't exist
    const targetDir = path.dirname(targetPath);
    ensureDirectoryExists(targetDir);

    // Create symlink
    fs.symlinkSync(sourcePath, targetPath, 'file');
    console.log(`Created symlink: ${targetPath} -> ${sourcePath}`);
  } catch (error) {
    console.error(`Error creating symlink for ${targetPath}:`, error);
  }
}

// Copy file (fallback if symlink fails)
function copyFile(sourcePath, targetPath) {
  try {
    // Remove existing file
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      console.log(`Removed existing file: ${targetPath}`);
    }

    // Create parent directory if it doesn't exist
    const targetDir = path.dirname(targetPath);
    ensureDirectoryExists(targetDir);

    // Copy file
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied file: ${targetPath} <- ${sourcePath}`);
  } catch (error) {
    console.error(`Error copying file ${targetPath}:`, error);
  }
}

// Main function
function setupMobileShared() {
  console.log('Setting up mobile shared components...');

  // Ensure mobile shared directory exists
  ensureDirectoryExists(MOBILE_SHARED_PATH);
  ensureDirectoryExists(path.join(MOBILE_SHARED_PATH, 'components'));
  ensureDirectoryExists(path.join(MOBILE_SHARED_PATH, 'services'));
  ensureDirectoryExists(path.join(MOBILE_SHARED_PATH, 'utils'));

  // Link or copy each component
  COMPONENTS_TO_LINK.forEach(componentPath => {
    const sourcePath = path.join(FRONTEND_SHARED_PATH, componentPath);
    const targetPath = path.join(MOBILE_SHARED_PATH, componentPath);

    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`Source file does not exist: ${sourcePath}`);
      return;
    }

    try {
      // Try to create symlink first
      createSymlink(sourcePath, targetPath);
    } catch (error) {
      console.warn(`Symlink failed, falling back to copy for ${componentPath}`);
      copyFile(sourcePath, targetPath);
    }
  });

  console.log('Mobile shared components setup complete!');
}

// Run the setup
setupMobileShared();
