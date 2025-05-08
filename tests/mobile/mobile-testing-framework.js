/**
 * Mobile Testing Framework for MedTranslate AI
 * 
 * This framework provides utilities for testing the mobile application.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  appDir: process.env.MOBILE_APP_DIR || path.join(__dirname, '../../mobile-app'),
  testDir: process.env.MOBILE_TEST_DIR || path.join(__dirname, '../../mobile-app/e2e'),
  screenshotDir: process.env.MOBILE_SCREENSHOT_DIR || path.join(__dirname, '../../test-reports/mobile/screenshots'),
  reportDir: process.env.MOBILE_REPORT_DIR || path.join(__dirname, '../../test-reports/mobile/reports'),
  platform: process.env.MOBILE_TEST_PLATFORM || 'android',
  device: process.env.MOBILE_TEST_DEVICE || 'emulator',
  apiUrl: process.env.API_URL || 'http://localhost:3005',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3006'
};

// Create directories if they don't exist
for (const dir of [config.screenshotDir, config.reportDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Mobile Testing class
 */
class MobileTesting {
  /**
   * Constructor
   * 
   * @param {Object} options - Testing options
   */
  constructor(options = {}) {
    this.options = {
      ...options,
      testId: options.testId || uuidv4().split('-')[0],
      platform: options.platform || config.platform,
      device: options.device || config.device,
      appDir: options.appDir || config.appDir,
      testDir: options.testDir || config.testDir,
      screenshotDir: options.screenshotDir || config.screenshotDir,
      reportDir: options.reportDir || config.reportDir
    };
    
    this.testResults = {
      testId: this.options.testId,
      timestamp: new Date().toISOString(),
      platform: this.options.platform,
      device: this.options.device,
      tests: []
    };
  }
  
  /**
   * Build the app
   * 
   * @returns {Promise<void>}
   */
  async buildApp() {
    console.log(`Building app for ${this.options.platform}...`);
    
    try {
      if (this.options.platform === 'android') {
        execSync('npm run android:build', {
          cwd: this.options.appDir,
          stdio: 'inherit'
        });
      } else if (this.options.platform === 'ios') {
        execSync('npm run ios:build', {
          cwd: this.options.appDir,
          stdio: 'inherit'
        });
      } else {
        throw new Error(`Unsupported platform: ${this.options.platform}`);
      }
      
      console.log('App built successfully');
    } catch (error) {
      console.error(`Error building app: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Install the app
   * 
   * @returns {Promise<void>}
   */
  async installApp() {
    console.log(`Installing app on ${this.options.device}...`);
    
    try {
      if (this.options.platform === 'android') {
        execSync('npm run android:install', {
          cwd: this.options.appDir,
          stdio: 'inherit'
        });
      } else if (this.options.platform === 'ios') {
        execSync('npm run ios:install', {
          cwd: this.options.appDir,
          stdio: 'inherit'
        });
      } else {
        throw new Error(`Unsupported platform: ${this.options.platform}`);
      }
      
      console.log('App installed successfully');
    } catch (error) {
      console.error(`Error installing app: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Run Detox tests
   * 
   * @param {string} testName - Test name
   * @returns {Promise<Object>} - Test results
   */
  async runDetoxTests(testName) {
    console.log(`Running Detox tests: ${testName}...`);
    
    try {
      const command = `npx detox test -c ${this.options.platform}.${this.options.device} -l verbose ${testName ? `-f ${testName}` : ''}`;
      
      execSync(command, {
        cwd: this.options.appDir,
        stdio: 'inherit'
      });
      
      console.log('Detox tests completed successfully');
      
      // Parse test results
      const resultsPath = path.join(this.options.appDir, 'artifacts', 'detox', 'test-results.json');
      
      if (fs.existsSync(resultsPath)) {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        // Add to test results
        this.testResults.tests.push({
          name: testName || 'all',
          timestamp: new Date().toISOString(),
          results
        });
        
        return results;
      }
      
      return {
        success: true,
        message: 'Tests completed, but no results file found'
      };
    } catch (error) {
      console.error(`Error running Detox tests: ${error.message}`);
      
      // Add to test results
      this.testResults.tests.push({
        name: testName || 'all',
        timestamp: new Date().toISOString(),
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Take a screenshot
   * 
   * @param {string} name - Screenshot name
   * @returns {Promise<string>} - Screenshot path
   */
  async takeScreenshot(name) {
    console.log(`Taking screenshot: ${name}...`);
    
    try {
      const screenshotName = `${this.options.testId}-${name}-${Date.now()}.png`;
      const screenshotPath = path.join(this.options.screenshotDir, screenshotName);
      
      if (this.options.platform === 'android') {
        execSync(`adb shell screencap -p /sdcard/${screenshotName}`);
        execSync(`adb pull /sdcard/${screenshotName} ${screenshotPath}`);
        execSync(`adb shell rm /sdcard/${screenshotName}`);
      } else if (this.options.platform === 'ios') {
        // For iOS, we need to use Detox API or other methods
        // This is a placeholder
        console.log('iOS screenshots not implemented yet');
      }
      
      console.log(`Screenshot saved: ${screenshotPath}`);
      
      return screenshotPath;
    } catch (error) {
      console.error(`Error taking screenshot: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Run a performance test
   * 
   * @param {string} testName - Test name
   * @param {Function} testFn - Test function
   * @param {Object} options - Test options
   * @returns {Promise<Object>} - Test results
   */
  async runPerformanceTest(testName, testFn, options = {}) {
    console.log(`Running performance test: ${testName}...`);
    
    const iterations = options.iterations || 10;
    const results = {
      name: testName,
      timestamp: new Date().toISOString(),
      iterations,
      durations: [],
      memoryUsage: [],
      batteryUsage: [],
      networkUsage: []
    };
    
    try {
      // Run test iterations
      for (let i = 0; i < iterations; i++) {
        console.log(`Iteration ${i + 1}/${iterations}`);
        
        // Measure performance
        const startTime = Date.now();
        const startMemory = await this.getMemoryUsage();
        const startBattery = await this.getBatteryLevel();
        const startNetwork = await this.getNetworkUsage();
        
        // Run test function
        await testFn();
        
        // Measure performance again
        const endTime = Date.now();
        const endMemory = await this.getMemoryUsage();
        const endBattery = await this.getBatteryLevel();
        const endNetwork = await this.getNetworkUsage();
        
        // Calculate deltas
        const duration = endTime - startTime;
        const memoryDelta = endMemory - startMemory;
        const batteryDelta = startBattery - endBattery;
        const networkDelta = endNetwork - startNetwork;
        
        // Add to results
        results.durations.push(duration);
        results.memoryUsage.push(memoryDelta);
        results.batteryUsage.push(batteryDelta);
        results.networkUsage.push(networkDelta);
      }
      
      // Calculate statistics
      results.statistics = {
        duration: this.calculateStatistics(results.durations),
        memoryUsage: this.calculateStatistics(results.memoryUsage),
        batteryUsage: this.calculateStatistics(results.batteryUsage),
        networkUsage: this.calculateStatistics(results.networkUsage)
      };
      
      // Add to test results
      this.testResults.tests.push(results);
      
      console.log('Performance test completed successfully');
      
      return results;
    } catch (error) {
      console.error(`Error running performance test: ${error.message}`);
      
      // Add to test results
      this.testResults.tests.push({
        name: testName,
        timestamp: new Date().toISOString(),
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Get memory usage
   * 
   * @returns {Promise<number>} - Memory usage in bytes
   */
  async getMemoryUsage() {
    try {
      if (this.options.platform === 'android') {
        const output = execSync('adb shell dumpsys meminfo com.medtranslateai').toString();
        const match = output.match(/TOTAL PSS:\s+(\d+)/);
        
        if (match && match[1]) {
          return parseInt(match[1], 10) * 1024; // Convert KB to bytes
        }
      }
      
      return 0;
    } catch (error) {
      console.error(`Error getting memory usage: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Get battery level
   * 
   * @returns {Promise<number>} - Battery level (0-100)
   */
  async getBatteryLevel() {
    try {
      if (this.options.platform === 'android') {
        const output = execSync('adb shell dumpsys battery').toString();
        const match = output.match(/level:\s+(\d+)/);
        
        if (match && match[1]) {
          return parseInt(match[1], 10);
        }
      }
      
      return 100;
    } catch (error) {
      console.error(`Error getting battery level: ${error.message}`);
      return 100;
    }
  }
  
  /**
   * Get network usage
   * 
   * @returns {Promise<number>} - Network usage in bytes
   */
  async getNetworkUsage() {
    try {
      if (this.options.platform === 'android') {
        const output = execSync('adb shell cat /proc/net/xt_qtaguid/stats | grep com.medtranslateai').toString();
        const lines = output.split('\n');
        let totalBytes = 0;
        
        for (const line of lines) {
          const parts = line.trim().split(' ').filter(Boolean);
          
          if (parts.length >= 6) {
            totalBytes += parseInt(parts[5], 10) + parseInt(parts[7], 10);
          }
        }
        
        return totalBytes;
      }
      
      return 0;
    } catch (error) {
      console.error(`Error getting network usage: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Calculate statistics
   * 
   * @param {Array<number>} values - Values to calculate statistics for
   * @returns {Object} - Statistics
   */
  calculateStatistics(values) {
    if (values.length === 0) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        stdDev: 0
      };
    }
    
    // Sort values
    const sorted = [...values].sort((a, b) => a - b);
    
    // Calculate statistics
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / sorted.length;
    
    // Calculate median
    const midIndex = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[midIndex - 1] + sorted[midIndex]) / 2
      : sorted[midIndex];
    
    // Calculate standard deviation
    const squaredDiffs = sorted.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / sorted.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      min,
      max,
      mean,
      median,
      stdDev
    };
  }
  
  /**
   * Save test results
   * 
   * @returns {Promise<string>} - Path to saved results
   */
  async saveResults() {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const resultsPath = path.join(this.options.reportDir, `mobile-test-${this.options.testId}-${timestamp}.json`);
    
    try {
      fs.writeFileSync(resultsPath, JSON.stringify(this.testResults, null, 2));
      console.log(`Test results saved: ${resultsPath}`);
      return resultsPath;
    } catch (error) {
      console.error(`Error saving test results: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Generate HTML report
   * 
   * @returns {Promise<string>} - Path to HTML report
   */
  async generateReport() {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const reportPath = path.join(this.options.reportDir, `mobile-test-${this.options.testId}-${timestamp}.html`);
    
    // Generate HTML content
    // This is a placeholder for a more sophisticated HTML report
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mobile Test Report: ${this.options.testId}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3 {
            color: #2c3e50;
          }
          .summary {
            background-color: #f8f9fa;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f8f9fa;
          }
          .success {
            color: #28a745;
          }
          .error {
            color: #dc3545;
          }
        </style>
      </head>
      <body>
        <h1>Mobile Test Report: ${this.options.testId}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <h2>Summary</h2>
          <p>Platform: ${this.options.platform}</p>
          <p>Device: ${this.options.device}</p>
          <p>Tests: ${this.testResults.tests.length}</p>
          <p>Timestamp: ${this.testResults.timestamp}</p>
        </div>
        
        <h2>Test Results</h2>
        
        ${this.testResults.tests.map(test => `
          <div class="test-result">
            <h3>${test.name}</h3>
            <p>Timestamp: ${test.timestamp}</p>
            
            ${test.error ? `
              <p class="error">Error: ${test.error}</p>
            ` : ''}
            
            ${test.statistics ? `
              <h4>Performance Statistics</h4>
              
              <h5>Duration (ms)</h5>
              <table>
                <tr>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Mean</th>
                  <th>Median</th>
                  <th>StdDev</th>
                </tr>
                <tr>
                  <td>${test.statistics.duration.min.toFixed(2)}</td>
                  <td>${test.statistics.duration.max.toFixed(2)}</td>
                  <td>${test.statistics.duration.mean.toFixed(2)}</td>
                  <td>${test.statistics.duration.median.toFixed(2)}</td>
                  <td>${test.statistics.duration.stdDev.toFixed(2)}</td>
                </tr>
              </table>
              
              <h5>Memory Usage (bytes)</h5>
              <table>
                <tr>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Mean</th>
                  <th>Median</th>
                  <th>StdDev</th>
                </tr>
                <tr>
                  <td>${test.statistics.memoryUsage.min.toFixed(2)}</td>
                  <td>${test.statistics.memoryUsage.max.toFixed(2)}</td>
                  <td>${test.statistics.memoryUsage.mean.toFixed(2)}</td>
                  <td>${test.statistics.memoryUsage.median.toFixed(2)}</td>
                  <td>${test.statistics.memoryUsage.stdDev.toFixed(2)}</td>
                </tr>
              </table>
            ` : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;
    
    try {
      fs.writeFileSync(reportPath, html);
      console.log(`Report generated: ${reportPath}`);
      return reportPath;
    } catch (error) {
      console.error(`Error generating report: ${error.message}`);
      throw error;
    }
  }
}

module.exports = {
  MobileTesting,
  config
};
