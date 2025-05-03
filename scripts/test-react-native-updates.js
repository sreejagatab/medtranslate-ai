/**
 * MedTranslate AI React Native Update Test Script
 * 
 * This script tests the applications after React Native version updates.
 * It verifies that the applications can start and checks for common issues.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Applications to test
const applications = [
  {
    name: 'Frontend Patient App',
    directory: 'frontend/patient-app',
    startCommand: 'npm run start:expo -- --no-dev --minify',
    testDuration: 10000 // 10 seconds
  },
  {
    name: 'Frontend Provider App',
    directory: 'frontend/provider-app',
    startCommand: 'npm run start:expo -- --no-dev --minify',
    testDuration: 10000 // 10 seconds
  },
  {
    name: 'Mobile Patient App',
    directory: 'mobile/patient-app',
    startCommand: 'npm start -- --no-dev --minify',
    testDuration: 10000 // 10 seconds
  }
];

// Main function
async function testApplications() {
  console.log('MedTranslate AI React Native Update Test Script');
  console.log('==============================================');
  
  for (const app of applications) {
    try {
      console.log(`\nTesting ${app.name}...`);
      
      // Check if directory exists
      if (!fs.existsSync(app.directory)) {
        console.error(`Directory ${app.directory} does not exist. Skipping.`);
        continue;
      }
      
      // Check if package.json exists
      const packageJsonPath = path.join(app.directory, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        console.error(`package.json not found in ${app.directory}. Skipping.`);
        continue;
      }
      
      // Read package.json to verify React Native version
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log(`React Native version: ${packageJson.dependencies['react-native']}`);
      console.log(`Expo version: ${packageJson.dependencies['expo']}`);
      
      // Start the application in a separate process
      console.log(`Starting ${app.name}...`);
      const startTime = Date.now();
      
      try {
        // Use a short timeout to just test if the app can start
        execSync(`timeout 10 ${app.startCommand}`, {
          cwd: app.directory,
          stdio: 'inherit'
        });
      } catch (error) {
        // This is expected as we're using timeout to kill the process
        // We just want to see if it starts without errors
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // If the app ran for at least 5 seconds without crashing, consider it a success
      if (duration >= 5000) {
        console.log(`✅ ${app.name} started successfully`);
      } else {
        console.error(`❌ ${app.name} failed to start properly`);
      }
    } catch (error) {
      console.error(`Error testing ${app.name}:`, error.message);
    }
  }
  
  console.log('\nApplication testing completed.');
}

// Run the script
testApplications().catch(error => {
  console.error('Error running test script:', error);
  process.exit(1);
});
