# MobileSystemStatusDashboard Component for MedTranslate AI

The MobileSystemStatusDashboard component provides a mobile-friendly dashboard for monitoring system status and performance, including cache status, ML model performance, sync status, storage optimization, device performance, and network status.

## Features

### Overview Section
- **Cache Health**: Shows the overall health of the caching system with a progress bar
- **ML Models**: Displays the status and accuracy of ML models
- **Sync Status**: Shows the last sync time and provides a button for manual sync
- **Offline Risk**: Indicates the risk of going offline with a progress bar

### Tab Navigation
The component includes multiple tabs for detailed information:

#### Overview Tab
- Provides a high-level overview of the system status
- Shows the most important metrics at a glance

#### Cache Tab
- **Cache Health**: Shows the overall health of the cache with visual indicators
- **Offline Readiness**: Displays how prepared the system is for offline operation
- **Cache Details**: Shows detailed cache metrics including hit rate, size, and TTL
- **Cache Actions**: Provides buttons for refreshing and clearing the cache

#### Sync Tab
- **Status**: Shows the status of the auto-sync-manager
- **History**: Displays the sync history with charts
- **Settings**: Allows configuring sync settings
- **Actions**: Provides buttons for manual sync and toggling auto-sync

#### Device Tab
- **CPU**: Shows CPU usage with a progress bar
- **Memory**: Shows memory usage with a progress bar
- **Network**: Displays network status and quality
- **Battery**: Shows battery level and charging status

## Usage

```jsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import MobileSystemStatusDashboard from './MobileSystemStatusDashboard';

const SystemStatusScreen = () => {
  return (
    <View style={styles.container}>
      <MobileSystemStatusDashboard refreshInterval={60000} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});

export default SystemStatusScreen;
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| refreshInterval | number | 30000 | Refresh interval in milliseconds |

## Integration with Backend

The component works with the following API endpoints:

- `/api/cache/stats` - Cache statistics
- `/api/ml/performance` - ML model performance metrics
- `/api/ml/performance/history` - ML model performance history
- `/api/storage/info` - Storage information
- `/api/sync/status` - Sync status
- `/api/sync/history` - Sync history
- `/api/device/performance` - Device performance metrics

These endpoints are accessed through the `useSystemStatus` hook, which provides a unified interface for accessing and controlling system components.

## Integration with Other Components

The MobileSystemStatusDashboard component is designed to work with other components in the MedTranslate AI system:

- **CachingStatusIndicator**: Provides a lightweight indicator for cache status
- **WebSocketStatus**: Shows WebSocket connection status
- **NetworkQualityIndicator**: Displays network quality information

## Pull-to-Refresh

The component supports pull-to-refresh functionality, allowing users to manually refresh the data by pulling down on the screen.

## Automatic Refresh

The component automatically refreshes the data at the specified interval (default: 30 seconds) to ensure the displayed information is up-to-date.

## Error Handling

The component handles errors gracefully, displaying an error message when there's a problem fetching data from the backend.

## Loading State

The component displays a loading indicator while fetching data from the backend.

## Customization

The MobileSystemStatusDashboard component can be customized by modifying the following files:

- `MobileSystemStatusDashboard.js` - Main component file
- `useSystemStatus.js` - Hook for accessing system status information

## Future Enhancements

- **Real-time Updates**: Add WebSocket support for real-time updates
- **Alerts**: Add alerts for critical system events
- **Export**: Add ability to export system status data
- **Custom Views**: Allow users to customize the dashboard layout
- **Detailed Metrics**: Add more detailed metrics for each tab

## Troubleshooting

If the dashboard is not displaying data correctly, check the following:

1. Make sure the backend API endpoints are accessible
2. Check that the `useSystemStatus` hook is configured correctly
3. Verify that the refresh interval is appropriate for your use case
4. Check the console for any errors

## Related Components

- [CachingStatusIndicator](../../shared/components/README-EnhancedCachingStatusIndicator.md)
- [WebSocketStatus](../../shared/components/README-WebSocketStatus.md)
