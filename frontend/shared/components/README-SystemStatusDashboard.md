# SystemStatusDashboard Component for MedTranslate AI

The SystemStatusDashboard component provides a comprehensive dashboard for monitoring system status and performance, including cache status, ML model performance, sync status, storage optimization, device performance, and network status.

## Features

### Overview Section
- **Cache Health**: Shows the overall health of the caching system with a progress bar
- **ML Models**: Displays the status and accuracy of ML models
- **Sync Status**: Shows the last sync time and provides a button for manual sync
- **Offline Risk**: Indicates the risk of going offline with a progress bar

### Detailed Tabs
The component includes multiple tabs for detailed information:

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
- **Actions**: Provides buttons for training and configuring ML models

#### Sync Tab
- **Status**: Shows the status of the auto-sync-manager
- **History**: Displays the sync history with charts
- **Settings**: Allows configuring sync settings
- **Actions**: Provides buttons for manual sync and toggling auto-sync

#### Storage Tab
- **Usage**: Shows storage usage with a progress bar
- **Categories**: Displays storage usage by category
- **Optimization**: Shows storage optimization metrics
- **Actions**: Provides a button for optimizing storage

#### Device Tab
- **CPU**: Shows CPU usage with a progress bar
- **Memory**: Shows memory usage with a progress bar
- **Network**: Displays network status and quality
- **Battery**: Shows battery level and charging status

#### API Status Tab
- **Endpoints**: Lists all API endpoints with their status
- **Response Time**: Shows response time for each endpoint
- **History**: Displays status history with charts

## Usage

```jsx
import { SystemStatusDashboard } from '../shared/components';

// In your component
const YourComponent = () => {
  return (
    <div>
      <h1>System Status</h1>
      <SystemStatusDashboard refreshInterval={30000} />
    </div>
  );
};
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| refreshInterval | number | 30000 | Refresh interval in milliseconds |

## Integration with Backend

The component works with the following API endpoints:

- `/api/system/cache/stats` - Cache statistics
- `/api/system/ml/performance` - ML model performance metrics
- `/api/system/ml/performance/history` - ML model performance history
- `/api/system/storage/info` - Storage information
- `/api/system/sync/status` - Sync status
- `/api/system/sync/history` - Sync history
- `/api/system/device/performance` - Device performance metrics

These endpoints are accessed through the `useSystemStatus` hook, which provides a unified interface for accessing and controlling system components.

## Integration with Other Components

The SystemStatusDashboard component is designed to work with other components in the MedTranslate AI system:

- **CachingStatusIndicator**: Provides a lightweight indicator for cache status
- **ApiStatus**: Displays API health status
- **WebSocketStatus**: Shows WebSocket connection status
- **NetworkQualityIndicator**: Displays network quality information

## Example

```jsx
import React from 'react';
import { SystemStatusDashboard } from '../shared/components';
import { Container, Typography, Box } from '@mui/material';

const SystemMonitoringPage = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          System Monitoring
        </Typography>
        <SystemStatusDashboard refreshInterval={60000} />
      </Box>
    </Container>
  );
};

export default SystemMonitoringPage;
```

## Customization

The SystemStatusDashboard component can be customized by modifying the following files:

- `SystemStatusDashboard.js` - Main component file
- `useSystemStatus.js` - Hook for accessing system status information

## Future Enhancements

- **Real-time Updates**: Add WebSocket support for real-time updates
- **Alerts**: Add alerts for critical system events
- **Export**: Add ability to export system status data
- **Custom Views**: Allow users to customize the dashboard layout
- **Mobile Support**: Optimize the dashboard for mobile devices

## Troubleshooting

If the dashboard is not displaying data correctly, check the following:

1. Make sure the backend API endpoints are accessible
2. Check that the `useSystemStatus` hook is configured correctly
3. Verify that the refresh interval is appropriate for your use case
4. Check the browser console for any errors

## Related Components

- [CachingStatusIndicator](./README-EnhancedCachingStatusIndicator.md)
- [ApiStatus](./README-ApiStatus.md)
- [WebSocketStatus](./README-WebSocketStatus.md)
