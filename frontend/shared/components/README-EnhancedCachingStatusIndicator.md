# Enhanced CachingStatusIndicator Component for MedTranslate AI

The Enhanced CachingStatusIndicator component provides a comprehensive visual representation of the system's status, including predictive caching, ML models, auto-sync-manager, and storage-optimizer. This component is designed to give users detailed insights into the system's performance and health.

## Features

### Main Indicator
- **Status Overview**: Shows the overall health of the caching system with color-coded indicators
- **ML Model Status**: Indicates if ML models are active and their performance
- **Sync Status**: Shows the status of the auto-sync-manager
- **Offline Risk**: Alerts users when there's a high risk of going offline

### Detailed Dashboard
The component includes a modal dashboard with multiple tabs:

#### Cache Tab
- **Cache Health**: Shows the overall health of the cache with visual indicators
- **Offline Readiness**: Displays how prepared the system is for offline operation
- **Cache Details**: Shows detailed cache metrics including hit rate, size, and TTL
- **Cache Actions**: Provides buttons for refreshing and clearing the cache

#### ML Models Tab
- **Status**: Shows the status of the ML models with performance metrics
- **Models**: Lists all available ML models with detailed information
- **Performance**: Displays performance metrics for the ML models with charts
- **Predictions**: Shows predictions made by the ML models

#### Storage Tab
- **Storage Status**: Shows the current storage usage with visual indicators
- **Storage Details**: Displays detailed storage metrics
- **Storage Categories**: Lists all storage categories with their sizes
- **Storage Actions**: Provides a button for optimizing storage

#### Sync Tab
- **Status**: Shows the status of the auto-sync-manager with visual indicators
- **History**: Displays the sync history with charts and detailed information
- **Conflicts**: Lists all sync conflicts with resolution options
- **Settings**: Provides settings for the auto-sync-manager

#### Performance Tab
- **Overview**: Shows the overall performance of the system
- **Resource Usage**: Displays CPU and memory usage with charts
- **Network Performance**: Shows network performance metrics
- **Battery Performance**: Displays battery usage and status

## Usage

```jsx
import { CachingStatusIndicator } from '../shared/components';

// In your component
<CachingStatusIndicator
  cacheStats={cacheStats}
  offlineReadiness={offlineReadiness}
  offlineRisk={offlineRisk}
  mlPredictions={mlPredictions}
  mlPerformance={mlPerformance}
  mlPerformanceHistory={mlPerformanceHistory}
  storageInfo={storageInfo}
  syncStatus={syncStatus}
  syncHistory={syncHistory}
  devicePerformance={devicePerformance}
  onManualSync={handleManualSync}
  onPrepareOffline={handlePrepareOffline}
  onClearCache={handleClearCache}
  onRefreshCache={handleRefreshCache}
  onOptimizeStorage={handleOptimizeStorage}
  onTrainModels={handleTrainModels}
  onToggleAutoSync={handleToggleAutoSync}
  onConfigureModels={handleConfigureModels}
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `cacheStats` | Object | Cache statistics including hit rate, size, and TTL |
| `offlineReadiness` | Number | Percentage (0-100) indicating how prepared the system is for offline operation |
| `offlineRisk` | Number | Risk of going offline (0-1) |
| `mlPredictions` | Object | ML predictions information |
| `mlPerformance` | Object | ML model performance metrics |
| `mlPerformanceHistory` | Array | Historical ML performance data for charts |
| `storageInfo` | Object | Storage optimization information |
| `syncStatus` | Object | Auto-sync-manager status information |
| `syncHistory` | Array | Historical sync data for charts |
| `devicePerformance` | Object | Device performance metrics |
| `onManualSync` | Function | Callback for manual sync |
| `onPrepareOffline` | Function | Callback for preparing for offline mode |
| `onClearCache` | Function | Callback for clearing cache |
| `onRefreshCache` | Function | Callback for refreshing cache |
| `onOptimizeStorage` | Function | Callback for optimizing storage |
| `onTrainModels` | Function | Callback for training ML models |
| `onToggleAutoSync` | Function | Callback for toggling auto-sync |
| `onConfigureModels` | Function | Callback for configuring ML models |
| `style` | Object | Custom styles |

## Data Structure Examples

### ML Performance Object
```javascript
{
  isInitialized: true,
  version: '2.0',
  accuracy: 0.85,
  computeTimeMs: 120,
  memoryUsageMB: 25,
  lastTrainingTime: 1623456789000,
  trainingSamples: 5000,
  modelSizeKB: 1500,
  models: [
    {
      id: 'time-series-1',
      name: 'Time Series Model',
      type: 'HoltWinters',
      enabled: true,
      accuracy: 0.82,
      sizeKB: 500,
      latencyMs: 15
    },
    // More models...
  ]
}
```

### Sync Status Object
```javascript
{
  enabled: true,
  lastSyncTime: 1623456789000,
  lastSyncStatus: 'success',
  queueSize: 5,
  successRate: 0.95,
  syncInterval: 300000, // 5 minutes
  itemsSynced: 1250,
  conflicts: 2,
  nextSyncTime: 1623459789000,
  adaptiveScheduling: true,
  networkAware: true,
  storageOptimization: true,
  conflictResolution: {
    strategy: 'smart',
    prioritizeContext: true
  }
}
```

## Integration with Other Components

The Enhanced CachingStatusIndicator component is designed to work with other components in the MedTranslate AI system:

- **ML Model Adapter**: Provides ML model performance metrics
- **Auto-Sync Manager**: Provides sync status information
- **Storage Optimizer**: Provides storage optimization information
- **Predictive Cache**: Provides cache statistics and offline readiness information
