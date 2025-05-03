# MedTranslate AI Edge Application

## Enhanced Offline Capabilities

The MedTranslate AI Edge Application has been enhanced with robust offline capabilities to ensure reliable operation even in challenging network conditions. These enhancements focus on:

1. **Enhanced Cache Manager**
2. **Advanced Sync Module**

## Enhanced Cache Manager

The cache manager now includes:

- **Versioning**: Track multiple versions of cached translations with metadata
- **Compression**: Automatically compress large cache items to save space
- **Criticality-based Retention**: Prioritize critical medical translations
- **Conflict Resolution**: Smart resolution of conflicts between local and remote data

### Key Features

- **Intelligent Eviction**: Uses a multi-factor scoring system to determine which items to evict when cache is full
- **Metadata Enrichment**: Stores detailed metadata with each cache item
- **Compression**: Uses zlib to compress large items, with configurable thresholds
- **Version History**: Maintains history of previous versions for conflict resolution

### Usage

```javascript
// Cache a translation with enhanced options
await cacheManager.cacheTranslation(
  text,
  sourceLanguage,
  targetLanguage,
  context,
  result,
  {
    criticality: 3, // HIGH
    compress: true,
    needsSync: true,
    version: 'v1'
  }
);

// Retrieve a cached translation with options
const translation = await cacheManager.getCachedTranslation(
  text,
  sourceLanguage,
  targetLanguage,
  context,
  {
    includeMetadata: true,
    includeVersionHistory: true
  }
);

// Resolve a version conflict
const resolution = await cacheManager.resolveVersionConflict(
  'translation',
  cacheKey,
  localData,
  remoteData,
  {
    strategy: 'merge',
    localVersion: 'local-v1',
    remoteVersion: 'remote-v1'
  }
);
```

## Advanced Sync Module

The sync module now includes:

- **Prioritized Sync**: Critical medical translations are synced first
- **Compression**: Reduces bandwidth usage during sync
- **Differential Sync**: Only sends changes rather than full data
- **Conflict Detection and Resolution**: Smart handling of conflicts
- **Detailed Metrics**: Comprehensive statistics on sync operations

### Key Features

- **Priority Levels**: Four levels of sync priority (CRITICAL, HIGH, MEDIUM, LOW)
- **Compression**: Uses zlib to compress data during sync
- **Conflict Resolution Strategies**: Multiple strategies for resolving conflicts
- **Detailed Metrics**: Tracks success rates, conflict rates, and performance metrics
- **Robust Error Handling**: Graceful degradation during network issues

### Usage

```javascript
// Queue a translation with enhanced options
syncWithCloud.queueTranslation(
  text,
  sourceLanguage,
  targetLanguage,
  context,
  result,
  {
    priority: 4, // CRITICAL
    compress: true,
    version: 'v1'
  }
);

// Get detailed sync status
const status = syncWithCloud.getSyncStatus(true);

// Handle conflicts with specific strategy
const resolution = await syncWithCloud.handleConflicts(
  conflicts,
  { strategy: 'merge' }
);
```

## Testing

Two test scripts are provided to verify the enhanced functionality:

1. `tests/cache-test.js`: Tests the enhanced cache manager
2. `tests/sync-test.js`: Tests the enhanced sync module

Run the tests with:

```bash
node tests/cache-test.js
node tests/sync-test.js
```

## Configuration

Both modules are highly configurable through environment variables:

### Cache Manager Configuration

- `CACHE_ENABLED`: Enable/disable caching (default: true)
- `CACHE_SIZE_LIMIT`: Maximum number of items in cache (default: 1000)
- `CACHE_TTL`: Time-to-live in milliseconds (default: 24 hours)
- `COMPRESSION_ENABLED`: Enable/disable compression (default: true)
- `COMPRESSION_THRESHOLD`: Size threshold for compression in bytes (default: 1024)
- `COMPRESSION_LEVEL`: zlib compression level 0-9 (default: 6)

### Sync Module Configuration

- `SYNC_INTERVAL`: Sync interval in milliseconds (default: 5 minutes)
- `RETRY_INTERVAL`: Retry interval in milliseconds (default: 1 minute)
- `MAX_RETRIES`: Maximum number of retries (default: 5)
- `DIFFERENTIAL_SYNC`: Enable/disable differential sync (default: true)
- `SYNC_COMPRESSION`: Enable/disable sync compression (default: true)
- `SYNC_COMPRESSION_THRESHOLD`: Size threshold for compression in bytes (default: 1024)
- `SYNC_BATCH_SIZE`: Number of items to sync in a batch (default: 10)
- `VERSION_HISTORY_SIZE`: Number of versions to keep (default: 5)
