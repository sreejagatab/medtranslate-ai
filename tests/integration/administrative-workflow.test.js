/**
 * Administrative Workflow End-to-End Test
 *
 * This test verifies the complete administrative workflow:
 * 1. Admin login
 * 2. System status monitoring
 * 3. Configuration changes
 * 4. User management
 * 5. Analytics review
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3003',
  patientAppUrl: process.env.PATIENT_APP_URL || 'http://localhost:3002',
  providerAppUrl: process.env.PROVIDER_APP_URL || 'http://localhost:3000',
  adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3004',
  testTimeout: 60000 // 60 seconds
};

// Mock admin credentials
const mockAdmin = {
  email: 'admin@example.com',
  password: 'Admin123!',
  role: 'admin'
};

// Run the complete administrative workflow test
async function runAdministrativeWorkflowTest() {
  console.log('Starting Administrative Workflow End-to-End Test...');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Open admin dashboard
    const page = await browser.newPage();
    await page.goto(config.adminDashboardUrl, { waitUntil: 'networkidle2', timeout: config.testTimeout });
    
    console.log('Admin dashboard loaded');
    
    // Step 1: Admin login
    console.log('\n=== Step 1: Admin Login ===');
    
    // Mock the login API response
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/auth/login') && request.method() === 'POST') {
        const postData = JSON.parse(request.postData());
        
        if (postData.email === mockAdmin.email && postData.password === mockAdmin.password) {
          await request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              token: 'mock-jwt-token',
              user: {
                id: 'admin-123',
                email: mockAdmin.email,
                role: mockAdmin.role,
                name: 'Admin User'
              }
            })
          });
        } else {
          await request.respond({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Invalid email or password'
            })
          });
        }
      } else {
        await request.continue();
      }
    });
    
    // Fill in login form
    await page.type('input[name="email"]', mockAdmin.email);
    await page.type('input[name="password"]', mockAdmin.password);
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('div[data-testid="admin-dashboard"]', { timeout: config.testTimeout });
    
    console.log('✅ Admin login successful');
    
    // Step 2: System status monitoring
    console.log('\n=== Step 2: System Status Monitoring ===');
    
    // Mock the system health API response
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/system/health')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            backend: {
              status: 'healthy',
              uptime: 86400,
              version: '1.0.0',
              cpu: 25,
              memory: 40,
              storage: 60
            },
            edge: [
              {
                deviceId: 'device-1',
                status: 'healthy',
                uptime: 43200,
                version: '1.0.0',
                battery: 85,
                storage: 45,
                lastSeen: new Date().toISOString()
              },
              {
                deviceId: 'device-2',
                status: 'warning',
                uptime: 21600,
                version: '1.0.0',
                battery: 20,
                storage: 85,
                lastSeen: new Date().toISOString()
              }
            ],
            alerts: [
              { id: 'alert-1', level: 'warning', message: 'Edge device battery low', timestamp: new Date().toISOString() }
            ]
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Navigate to system health page
    await page.click('a[href="/system-health"]');
    await page.waitForSelector('div[data-testid="system-health-dashboard"]', { timeout: config.testTimeout });
    
    console.log('Navigated to system health page');
    
    // Verify system health information is displayed
    const backendStatus = await page.$eval('div[data-testid="backend-status"]', el => el.textContent);
    const edgeDevices = await page.$$('div[data-testid="edge-device"]');
    const alerts = await page.$$('div[data-testid="alert-item"]');
    
    console.log(`Backend status: ${backendStatus}`);
    console.log(`Edge devices displayed: ${edgeDevices.length}`);
    console.log(`Alerts displayed: ${alerts.length}`);
    
    if (!backendStatus.includes('healthy')) {
      throw new Error(`Backend status mismatch: expected "healthy", got "${backendStatus}"`);
    }
    
    if (edgeDevices.length !== 2) {
      throw new Error(`Edge devices count mismatch: expected 2, got ${edgeDevices.length}`);
    }
    
    if (alerts.length !== 1) {
      throw new Error(`Alerts count mismatch: expected 1, got ${alerts.length}`);
    }
    
    console.log('✅ System health information displayed correctly');
    
    // Acknowledge alert
    await page.click('button[data-testid="acknowledge-alert"]');
    
    // Wait for alert to be acknowledged
    await page.waitForFunction(
      () => document.querySelectorAll('div[data-testid="alert-item"]').length === 0,
      { timeout: config.testTimeout }
    );
    
    console.log('✅ Alert acknowledged successfully');
    
    // Step 3: Configuration changes
    console.log('\n=== Step 3: Configuration Changes ===');
    
    // Mock the configuration API responses
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/system/config') && request.method() === 'GET') {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            general: {
              systemName: 'MedTranslate AI',
              defaultLanguage: 'en'
            },
            security: {
              sessionTimeout: 30,
              mfaRequired: true,
              passwordPolicy: {
                minLength: 8,
                requireSpecialChars: true,
                requireNumbers: true
              }
            },
            translation: {
              defaultModel: 'advanced',
              confidenceThreshold: 0.8,
              fallbackEnabled: true
            },
            edge: {
              syncInterval: 15,
              offlineMode: 'enabled',
              cacheSize: 500
            }
          })
        });
      } else if (request.url().includes('/system/config') && request.method() === 'PUT') {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Configuration updated successfully'
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Navigate to configuration page
    await page.click('a[href="/configuration"]');
    await page.waitForSelector('div[data-testid="configuration-panel"]', { timeout: config.testTimeout });
    
    console.log('Navigated to configuration page');
    
    // Change a configuration setting
    await page.type('input[name="general.systemName"]', ' - Updated', { delay: 50 });
    
    // Save changes
    await page.click('button[data-testid="save-config"]');
    
    // Wait for success message
    await page.waitForSelector('div[data-testid="config-success-message"]', { timeout: config.testTimeout });
    
    console.log('✅ Configuration updated successfully');
    
    // Step 4: User management
    console.log('\n=== Step 4: User Management ===');
    
    // Mock the user management API responses
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/users') && request.method() === 'GET') {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            users: [
              { id: 'user-1', email: 'provider@example.com', role: 'provider', status: 'active', lastLogin: new Date().toISOString() },
              { id: 'user-2', email: 'admin@example.com', role: 'admin', status: 'active', lastLogin: new Date().toISOString() }
            ]
          })
        });
      } else if (request.url().includes('/users') && request.method() === 'POST') {
        await request.respond({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: {
              id: 'new-user',
              email: 'new@example.com',
              role: 'provider',
              status: 'active'
            }
          })
        });
      } else if (request.url().includes('/users/user-1') && request.method() === 'PUT') {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'User updated successfully'
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Navigate to user management page
    await page.click('a[href="/users"]');
    await page.waitForSelector('div[data-testid="user-management-panel"]', { timeout: config.testTimeout });
    
    console.log('Navigated to user management page');
    
    // Verify users are displayed
    const users = await page.$$('div[data-testid="user-item"]');
    
    console.log(`Users displayed: ${users.length}`);
    
    if (users.length !== 2) {
      throw new Error(`Users count mismatch: expected 2, got ${users.length}`);
    }
    
    // Create a new user
    await page.click('button[data-testid="create-user"]');
    
    // Fill out new user form
    await page.waitForSelector('form[data-testid="user-form"]', { timeout: config.testTimeout });
    await page.type('input[name="email"]', 'new@example.com');
    await page.select('select[name="role"]', 'provider');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await page.waitForSelector('div[data-testid="user-success-message"]', { timeout: config.testTimeout });
    
    console.log('✅ New user created successfully');
    
    // Step 5: Analytics review
    console.log('\n=== Step 5: Analytics Review ===');
    
    // Mock the analytics API response
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/analytics/sync')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalSyncs: 1250,
            successfulSyncs: 1200,
            failedSyncs: 50,
            averageSyncTime: 2.3,
            syncsByDevice: [
              { deviceId: 'device-1', syncs: 500, success: 490, failed: 10 },
              { deviceId: 'device-2', syncs: 750, success: 710, failed: 40 }
            ],
            syncsByDay: [
              { date: '2023-01-01', syncs: 100, success: 95, failed: 5 },
              { date: '2023-01-02', syncs: 120, success: 115, failed: 5 },
              { date: '2023-01-03', syncs: 130, success: 125, failed: 5 }
            ]
          })
        });
      } else if (request.url().includes('/analytics/translation')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTranslations: 5000,
            byLanguagePair: [
              { sourceLang: 'en', targetLang: 'es', count: 2500 },
              { sourceLang: 'es', targetLang: 'en', count: 1800 },
              { sourceLang: 'en', targetLang: 'fr', count: 700 }
            ],
            bySource: [
              { source: 'cloud', count: 3000 },
              { source: 'edge', count: 2000 }
            ],
            averageConfidence: 0.92
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Navigate to analytics page
    await page.click('a[href="/analytics"]');
    await page.waitForSelector('div[data-testid="analytics-dashboard"]', { timeout: config.testTimeout });
    
    console.log('Navigated to analytics page');
    
    // Verify sync analytics are displayed
    await page.waitForSelector('div[data-testid="sync-analytics"]', { timeout: config.testTimeout });
    const syncStats = await page.$eval('div[data-testid="sync-stats"]', el => el.textContent);
    
    console.log(`Sync stats: ${syncStats}`);
    
    if (!syncStats.includes('1,250')) {
      throw new Error(`Sync stats mismatch: expected to include "1,250", got "${syncStats}"`);
    }
    
    // Switch to translation analytics
    await page.click('button[data-testid="translation-analytics-tab"]');
    
    // Verify translation analytics are displayed
    await page.waitForSelector('div[data-testid="translation-analytics"]', { timeout: config.testTimeout });
    const translationStats = await page.$eval('div[data-testid="translation-stats"]', el => el.textContent);
    
    console.log(`Translation stats: ${translationStats}`);
    
    if (!translationStats.includes('5,000')) {
      throw new Error(`Translation stats mismatch: expected to include "5,000", got "${translationStats}"`);
    }
    
    console.log('✅ Analytics displayed correctly');
    
    // Export analytics
    await page.click('button[data-testid="export-analytics"]');
    
    // Wait for export success message
    await page.waitForSelector('div[data-testid="export-success-message"]', { timeout: config.testTimeout });
    
    console.log('✅ Analytics exported successfully');
    
    console.log('\n=== Administrative Workflow Test Completed Successfully ===');
    return true;
  } catch (error) {
    console.error('❌ Error in administrative workflow test:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Export for Jest
module.exports = {
  runAdministrativeWorkflowTest
};

// Run test if executed directly
if (require.main === module) {
  runAdministrativeWorkflowTest();
}
