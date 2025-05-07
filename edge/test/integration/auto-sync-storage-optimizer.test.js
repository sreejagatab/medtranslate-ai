/**
 * Integration test for auto-sync-manager and storage-optimizer
 */

const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

// Test directories
const TEST_STORAGE_DIR = path.join(__dirname, '../../test-storage-integration');
const TEST_CACHE_DIR = path.join(__dirname, '../../test-cache-integration');
const TEST_CONFIG_DIR = path.join(__dirname, '../../test-config-integration');
const TEST_SYNC_DIR = path.join(__dirname, '../../test-sync-integration');

// Setup environment variables for testing
process.env.STORAGE_DIR = TEST_STORAGE_DIR;
process.env.CACHE_DIR = TEST_CACHE_DIR;
process.env.CONFIG_DIR = TEST_CONFIG_DIR;
process.env.SYNC_DIR = TEST_SYNC_DIR;

// Import modules
const autoSyncManager = require('../../app/auto-sync-manager');
const storageOptimizer = require('../../app/utils/storage-optimizer');

// Setup and teardown
beforeAll(async () => {
  // Create test directories
  for (const dir of [TEST_STORAGE_DIR, TEST_CACHE_DIR, TEST_CONFIG_DIR, TEST_SYNC_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
});

afterAll(async () => {
  // Clean up test directories
  for (const dir of [TEST_STORAGE_DIR, TEST_CACHE_DIR, TEST_CONFIG_DIR, TEST_SYNC_DIR]) {
    rimraf.sync(dir);
  }
});

// Tests
describe('Auto Sync Manager and Storage Optimizer Integration', () => {
  test('should initialize both modules', async () => {
    // Initialize storage optimizer
    const optimizerResult = await storageOptimizer.initialize({
      storageDir: TEST_STORAGE_DIR,
      cacheDir: TEST_CACHE_DIR
    });
    
    expect(optimizerResult.success).toBe(true);
    
    // Initialize auto sync manager
    const syncResult = await autoSyncManager.initialize();
    
    expect(syncResult.success).toBe(true);
  });
  
  test('should register hooks between modules', async () => {
    // Spy on registerPreSyncHook
    const registerSpy = jest.spyOn(autoSyncManager, 'registerPreSyncHook');
    
    // Integrate storage optimizer with auto sync manager
    const integrationResult = await storageOptimizer.integrateWithAutoSyncManager(autoSyncManager);
    
    expect(integrationResult.success).toBe(true);
    expect(integrationResult.integrated).toBe(true);
    
    // Verify that registerPreSyncHook was called
    expect(registerSpy).toHaveBeenCalled();
    
    // Restore the spy
    registerSpy.mockRestore();
  });
  
  test('should execute pre-sync hooks during sync', async () => {
    // Spy on optimizeStorage
    const optimizeSpy = jest.spyOn(storageOptimizer, 'optimizeStorage');
    
    // Mock the network connection test to return success
    jest.spyOn(autoSyncManager, 'testConnection').mockResolvedValue({
      connected: true,
      quality: 0.9,
      latency: 50
    });
    
    // Trigger a sync
    const syncResult = await autoSyncManager.syncWithCloud();
    
    // Verify that optimizeStorage was called as part of the pre-sync hook
    expect(optimizeSpy).toHaveBeenCalled();
    
    // Restore the spies
    optimizeSpy.mockRestore();
    autoSyncManager.testConnection.mockRestore();
  });
  
  test('should prepare for offline operation when offline is predicted', async () => {
    // Spy on prepareForOfflineOperation
    const prepareSpy = jest.spyOn(storageOptimizer, 'prepareForOfflineOperation');
    
    // Simulate an offline prediction event
    autoSyncManager.on('offline_predicted', () => {});
    autoSyncManager.syncEvents.emit('offline_predicted', {
      predictedDurationHours: 2,
      confidence: 0.8
    });
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify that prepareForOfflineOperation was called
    expect(prepareSpy).toHaveBeenCalled();
    
    // Restore the spy
    prepareSpy.mockRestore();
  });
});
