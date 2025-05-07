/**
 * Tests for the Storage Optimizer module
 */

const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const rimraf = require('rimraf');

// Mock dependencies
jest.mock('../app/utils/storage-manager', () => ({
  initialize: jest.fn().mockResolvedValue({ success: true }),
  getStorageInfo: jest.fn().mockReturnValue({
    initialized: true,
    storageDir: path.join(__dirname, '../test-storage'),
    quotaMB: 100,
    currentUsageMB: 75,
    availableMB: 25,
    usagePercentage: 75,
    lowStorageThreshold: 10,
    criticalStorageThreshold: 5
  }),
  optimizeStorage: jest.fn().mockResolvedValue({
    success: true,
    optimized: true,
    freedSpaceMB: 10,
    deletedCount: 5
  })
}));

jest.mock('../app/utils/compression-util', () => ({
  compressCacheItem: jest.fn().mockImplementation(async (data) => ({
    ...data,
    compressed: true,
    compressionRatio: 2.5,
    originalSize: 1000,
    compressedSize: 400
  })),
  COMPRESSION_ALGORITHMS: {
    GZIP: 'gzip',
    DEFLATE: 'deflate',
    BROTLI: 'brotli'
  },
  COMPRESSION_LEVELS: {
    NONE: 0,
    FAST: 1,
    BALANCED: 5,
    MAX: 9
  }
}));

jest.mock('../app/predictive-cache', () => ({
  getPredictions: jest.fn().mockResolvedValue({
    offlinePredicted: true,
    predictedOfflineDuration: 3600000, // 1 hour
    predictedKeys: ['test-key-1', 'test-key-2']
  }),
  getPredictionsSync: jest.fn().mockReturnValue({
    offlinePredicted: true,
    predictedOfflineDuration: 3600000, // 1 hour
    predictedKeys: ['test-key-1', 'test-key-2']
  })
}));

// Import the module under test
const storageOptimizer = require('../app/utils/storage-optimizer');

// Test storage directory
const TEST_STORAGE_DIR = path.join(__dirname, '../test-storage');
const TEST_CACHE_DIR = path.join(__dirname, '../test-cache');

// Setup and teardown
beforeAll(async () => {
  // Create test directories
  if (!fs.existsSync(TEST_STORAGE_DIR)) {
    fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(TEST_CACHE_DIR)) {
    fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
  }
  
  // Create some test files
  const testFiles = [
    { key: 'test-key-1', priority: 5, size: 1024 * 1024 }, // 1MB
    { key: 'test-key-2', priority: 3, size: 512 * 1024 },  // 0.5MB
    { key: 'test-key-3', priority: 1, size: 256 * 1024 }   // 0.25MB
  ];
  
  for (const file of testFiles) {
    const filePath = path.join(TEST_STORAGE_DIR, `${file.key}.json`);
    const data = {
      id: file.key,
      content: 'Test content',
      priority: file.priority,
      timestamp: Date.now()
    };
    
    // Fill with random data to match size
    data.padding = Buffer.alloc(file.size).toString('base64');
    
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
  }
});

afterAll(async () => {
  // Clean up test directories
  rimraf.sync(TEST_STORAGE_DIR);
  rimraf.sync(TEST_CACHE_DIR);
});

// Tests
describe('Storage Optimizer', () => {
  test('should initialize successfully', async () => {
    const result = await storageOptimizer.initialize({
      storageDir: TEST_STORAGE_DIR,
      cacheDir: TEST_CACHE_DIR
    });
    
    expect(result.success).toBe(true);
  });
  
  test('should record access and update usage stats', () => {
    storageOptimizer.recordAccess('test-key-1', {
      importance: 5,
      size: 1024 * 1024,
      compressionRatio: 2.0
    });
    
    // Access again to increase frequency
    storageOptimizer.recordAccess('test-key-1');
    
    // Record another key
    storageOptimizer.recordAccess('test-key-2', {
      importance: 3,
      size: 512 * 1024
    });
  });
  
  test('should calculate priority score correctly', () => {
    const score1 = storageOptimizer.getPriorityScore('test-key-1');
    const score2 = storageOptimizer.getPriorityScore('test-key-2');
    const score3 = storageOptimizer.getPriorityScore('test-key-3');
    
    // test-key-1 should have higher priority than test-key-2
    expect(score1).toBeGreaterThan(score2);
    
    // test-key-3 should have lowest priority (or not exist)
    expect(score2).toBeGreaterThan(score3);
  });
  
  test('should optimize storage', async () => {
    const result = await storageOptimizer.optimizeStorage();
    
    expect(result.success).toBe(true);
    expect(result.optimized).toBeDefined();
  });
  
  test('should analyze storage patterns', async () => {
    const result = await storageOptimizer.analyzeStoragePatterns();
    
    expect(result.success).toBe(true);
    expect(result.stats).toBeDefined();
    expect(result.stats.totalItems).toBeGreaterThanOrEqual(0);
  });
  
  test('should prepare for offline operation', async () => {
    const result = await storageOptimizer.prepareForOfflineOperation();
    
    expect(result.success).toBe(true);
    expect(result.prepared).toBe(true);
    expect(result.reservedSpaceMB).toBeGreaterThan(0);
  });
  
  test('should integrate with auto-sync-manager', async () => {
    const mockAutoSyncManager = {
      registerPreSyncHook: jest.fn(),
      on: jest.fn()
    };
    
    const result = await storageOptimizer.integrateWithAutoSyncManager(mockAutoSyncManager);
    
    expect(result.success).toBe(true);
    expect(result.integrated).toBe(true);
    expect(mockAutoSyncManager.registerPreSyncHook).toHaveBeenCalled();
  });
});
