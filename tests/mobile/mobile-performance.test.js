/**
 * Mobile Performance Tests for MedTranslate AI
 * 
 * This file contains performance tests for the mobile application.
 */

const { MobileTesting } = require('./mobile-testing-framework');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const config = {
  apiUrl: process.env.API_URL || 'http://localhost:3005',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3006',
  authToken: process.env.AUTH_TOKEN,
  testDataPath: path.join(__dirname, '../test-data/mobile-performance-test-data.json')
};

// Load test data or create if it doesn't exist
let testData;
if (fs.existsSync(config.testDataPath)) {
  testData = JSON.parse(fs.readFileSync(config.testDataPath, 'utf8'));
} else {
  // Create sample test data
  testData = {
    translations: [
      { text: "How are you feeling today?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "Where does it hurt?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "Have you taken any medication?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "Do you have any allergies?", sourceLanguage: "en", targetLanguage: "es" },
      { text: "I need to check your blood pressure.", sourceLanguage: "en", targetLanguage: "es" }
    ],
    sessions: [
      { patientName: "John Doe", patientLanguage: "es", medicalContext: "general" },
      { patientName: "Jane Smith", patientLanguage: "fr", medicalContext: "cardiology" },
      { patientName: "Bob Johnson", patientLanguage: "de", medicalContext: "neurology" }
    ]
  };
  
  // Save test data
  fs.mkdirSync(path.dirname(config.testDataPath), { recursive: true });
  fs.writeFileSync(config.testDataPath, JSON.stringify(testData, null, 2));
}

/**
 * Get authentication token
 * 
 * @returns {Promise<string>} - Authentication token
 */
async function getAuthToken() {
  if (config.authToken) {
    return config.authToken;
  }
  
  try {
    const response = await axios.post(`${config.apiUrl}/api/auth/login`, {
      email: 'test.provider@example.com',
      password: 'TestPassword123!'
    });
    
    return response.data.token;
  } catch (error) {
    console.error('Error getting auth token:', error.message);
    throw error;
  }
}

/**
 * Run mobile performance tests
 */
async function runMobilePerformanceTests() {
  // Create mobile testing instance
  const mobileTesting = new MobileTesting({
    platform: 'android',
    device: 'emulator'
  });
  
  try {
    // Get auth token
    const token = await getAuthToken();
    
    // Test app startup time
    await mobileTesting.runPerformanceTest('App Startup Time', async () => {
      // Kill app if running
      try {
        execSync('adb shell am force-stop com.medtranslateai');
      } catch (error) {
        // Ignore errors
      }
      
      // Start app
      execSync('adb shell am start -n com.medtranslateai/.MainActivity');
      
      // Wait for app to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Take screenshot
      await mobileTesting.takeScreenshot('app-startup');
    }, { iterations: 5 });
    
    // Test translation performance
    await mobileTesting.runPerformanceTest('Translation Performance', async () => {
      // Get random translation
      const translation = testData.translations[Math.floor(Math.random() * testData.translations.length)];
      
      // Perform translation
      await axios.post(
        `${config.apiUrl}/api/translation/translate`,
        {
          text: translation.text,
          sourceLanguage: translation.sourceLanguage,
          targetLanguage: translation.targetLanguage,
          medicalContext: 'general'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
    }, { iterations: 10 });
    
    // Test offline mode performance
    await mobileTesting.runPerformanceTest('Offline Mode Performance', async () => {
      // Enable airplane mode
      execSync('adb shell settings put global airplane_mode_on 1');
      execSync('adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true');
      
      // Wait for airplane mode to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take screenshot
      await mobileTesting.takeScreenshot('offline-mode');
      
      // Perform offline translation
      // This is a placeholder since we can't directly call the app's functions
      // In a real test, we would use Detox or other testing frameworks to interact with the app
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Disable airplane mode
      execSync('adb shell settings put global airplane_mode_on 0');
      execSync('adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false');
      
      // Wait for airplane mode to be disabled
      await new Promise(resolve => setTimeout(resolve, 2000));
    }, { iterations: 5 });
    
    // Test session creation performance
    await mobileTesting.runPerformanceTest('Session Creation Performance', async () => {
      // Get random session
      const session = testData.sessions[Math.floor(Math.random() * testData.sessions.length)];
      
      // Create session
      await axios.post(
        `${config.apiUrl}/api/provider/sessions`,
        {
          patientName: session.patientName,
          patientLanguage: session.patientLanguage,
          medicalContext: session.medicalContext
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
    }, { iterations: 5 });
    
    // Test UI rendering performance
    await mobileTesting.runPerformanceTest('UI Rendering Performance', async () => {
      // Navigate to different screens
      // This is a placeholder since we can't directly navigate in the app
      // In a real test, we would use Detox or other testing frameworks to interact with the app
      
      // Take screenshots
      await mobileTesting.takeScreenshot('ui-rendering-1');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await mobileTesting.takeScreenshot('ui-rendering-2');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await mobileTesting.takeScreenshot('ui-rendering-3');
    }, { iterations: 5 });
    
    // Save results and generate report
    await mobileTesting.saveResults();
    await mobileTesting.generateReport();
    
    console.log('Mobile performance tests completed successfully');
  } catch (error) {
    console.error('Error running mobile performance tests:', error);
    
    // Save results and generate report even if tests fail
    try {
      await mobileTesting.saveResults();
      await mobileTesting.generateReport();
    } catch (reportError) {
      console.error('Error generating report:', reportError);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runMobilePerformanceTests();
}

module.exports = {
  runMobilePerformanceTests
};
