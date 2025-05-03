/**
 * MedTranslate AI Dependency Fix Script
 * 
 * This script helps fix dependency issues after React Native version updates.
 * It runs 'npx expo install --fix' in the specified directories.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Directories to fix
const directories = [
  'frontend/patient-app',
  'frontend/provider-app',
  'mobile/patient-app'
];

// Main function
async function fixDependencies() {
  console.log('MedTranslate AI Dependency Fix Script');
  console.log('====================================');
  
  for (const dir of directories) {
    try {
      console.log(`\nFixing dependencies in ${dir}...`);
      
      // Check if directory exists
      if (!fs.existsSync(dir)) {
        console.error(`Directory ${dir} does not exist. Skipping.`);
        continue;
      }
      
      // Check if package.json exists
      const packageJsonPath = path.join(dir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        console.error(`package.json not found in ${dir}. Skipping.`);
        continue;
      }
      
      // Run npx expo install --fix
      console.log(`Running 'npx expo install --fix' in ${dir}...`);
      execSync('npx expo install --fix', {
        cwd: dir,
        stdio: 'inherit'
      });
      
      console.log(`Successfully fixed dependencies in ${dir}`);
    } catch (error) {
      console.error(`Error fixing dependencies in ${dir}:`, error.message);
    }
  }
  
  console.log('\nDependency fix process completed.');
}

// Run the script
fixDependencies().catch(error => {
  console.error('Error running dependency fix script:', error);
  process.exit(1);
});
