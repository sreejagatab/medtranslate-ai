# Storage Optimizer for MedTranslate AI

The Storage Optimizer module provides advanced storage management capabilities for the MedTranslate AI Edge Application, focusing on intelligent data prioritization, adaptive compression, and proactive cleanup based on predictive analytics.

## Features

- **Intelligent Data Prioritization**: Prioritizes data based on usage patterns, importance, and predictive analytics
- **Adaptive Compression Strategies**: Applies optimal compression algorithms based on data type and size
- **Proactive Cleanup**: Uses predictive analytics to clean up low-priority data before storage issues occur
- **Integration with Auto-Sync Manager**: Coordinates with the sync process for efficient storage management
- **Offline Preparation**: Prepares storage for predicted offline periods by reserving space and marking high-priority items for retention
- **Usage Analytics**: Tracks and analyzes storage usage patterns to optimize storage decisions

## Usage

### Basic Usage

```javascript
const storageOptimizer = require('./utils/storage-optimizer');

// Initialize the storage optimizer
await storageOptimizer.initialize({
  storageDir: '/path/to/storage',
  cacheDir: '/path/to/cache',
  optimizationInterval: 3600000 // 1 hour
});

// Optimize storage
const result = await storageOptimizer.optimizeStorage();
console.log(`Optimized storage: freed ${result.freedSpaceMB}MB by removing ${result.removedCount} files`);

// Record data access for usage statistics
storageOptimizer.recordAccess('important-data-key', {
  importance: 5, // Higher values indicate more important data
  size: 1024 * 1024, // Size in bytes
  compressionRatio: 2.0 // If known
});

// Analyze storage patterns
const analysis = await storageOptimizer.analyzeStoragePatterns();
console.log('Storage analysis:', analysis.stats);

// Prepare for offline operation
const preparation = await storageOptimizer.prepareForOfflineOperation({
  offlineDurationHours: 24 // Expected offline duration
});
console.log(`Prepared for offline: reserved ${preparation.reservedSpaceMB}MB, marked ${preparation.retentionResults.markedCount} items for retention`);
```

### Integration with Auto-Sync Manager

```javascript
const autoSyncManager = require('../auto-sync-manager');
const storageOptimizer = require('./utils/storage-optimizer');

// Initialize both modules
await autoSyncManager.initialize();
await storageOptimizer.initialize();

// Integrate storage optimizer with auto-sync-manager
await storageOptimizer.integrateWithAutoSyncManager(autoSyncManager);
```

## API Reference

### `initialize(options)`

Initializes the storage optimizer.

**Parameters:**
- `options` (Object): Initialization options
  - `storageDir` (string): Path to storage directory
  - `cacheDir` (string): Path to cache directory
  - `optimizationInterval` (number): Interval for automatic optimization in milliseconds

**Returns:** Promise<Object> - Initialization result

### `optimizeStorage(options)`

Optimizes storage based on usage patterns and priorities.

**Parameters:**
- `options` (Object): Optimization options
  - `force` (boolean): Force optimization even if storage usage is below threshold
  - `targetFreeMB` (number): Target amount of space to free in MB

**Returns:** Promise<Object> - Optimization result

### `recordAccess(key, metadata)`

Records data access for usage statistics.

**Parameters:**
- `key` (string): Data key
- `metadata` (Object): Access metadata
  - `importance` (number): Importance level (higher is more important)
  - `size` (number): Size in bytes
  - `compressionRatio` (number): Compression ratio if known

### `getPriorityScore(key)`

Gets priority score for a data item.

**Parameters:**
- `key` (string): Data key

**Returns:** number - Priority score

### `analyzeStoragePatterns()`

Analyzes storage usage patterns.

**Returns:** Promise<Object> - Analysis results

### `prepareForOfflineOperation(options)`

Prepares storage for offline operation.

**Parameters:**
- `options` (Object): Preparation options
  - `offlineDurationHours` (number): Expected offline duration in hours

**Returns:** Promise<Object> - Preparation result

### `integrateWithAutoSyncManager(autoSyncManager)`

Integrates with auto-sync-manager.

**Parameters:**
- `autoSyncManager` (Object): Auto sync manager instance

**Returns:** Promise<Object> - Integration result

## Integration with Predictive Caching

The Storage Optimizer works closely with the Predictive Caching system to prepare for offline periods:

1. When the Predictive Caching system predicts an offline period, it triggers the `offline_predicted` event
2. The Storage Optimizer listens for this event and prepares storage for the predicted offline period
3. The Storage Optimizer reserves space and marks high-priority items for retention
4. During offline periods, the marked items are prioritized for retention

This integration ensures that the most important data is available during offline periods, even when storage space is limited.

## Advanced Configuration

The Storage Optimizer can be configured through environment variables:

- `STORAGE_DIR`: Path to storage directory
- `CACHE_DIR`: Path to cache directory
- `OPTIMIZATION_INTERVAL`: Interval for automatic optimization in milliseconds
- `STORAGE_QUOTA_MB`: Storage quota in MB
- `LOW_STORAGE_THRESHOLD`: Threshold for low storage warning (percentage)
- `CRITICAL_STORAGE_THRESHOLD`: Threshold for critical storage warning (percentage)
