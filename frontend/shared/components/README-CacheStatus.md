# CacheStatus Component for MedTranslate AI

The CacheStatus component provides a visual representation of the predictive caching system's status, showing offline readiness and detailed cache metrics.

## Features

- **Offline Readiness Indicator**: Shows how prepared the system is for offline operation
- **Cache Statistics**: Displays detailed cache metrics including size, hit rate, and item count
- **Compression Information**: Shows compression ratio and space savings
- **Offline Prediction Warning**: Alerts users when an offline period is predicted
- **Expandable Details**: Allows users to see detailed information when needed
- **Real-time Updates**: Automatically refreshes to show the latest cache status

## Usage

```jsx
import { CacheStatus } from '../../shared/components';

// Basic usage
<CacheStatus endpoint="/api/cache/status" />

// With all options
<CacheStatus
  endpoint="/api/cache/status"
  label="Edge Cache"
  refreshInterval={30000}
  style={{
    container: { backgroundColor: '#f5f5f5' },
    indicator: { width: '15px', height: '15px' },
    title: { fontWeight: 'bold' }
  }}
  onStatusChange={(status, data, error) => {
    console.log('Cache status changed:', status, data, error);
  }}
  expanded={true}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `endpoint` | string | (required) | API endpoint to check cache status |
| `label` | string | 'Predictive Cache' | Label to display |
| `refreshInterval` | number | 30000 | Refresh interval in milliseconds |
| `style` | object | {} | Custom styles for the component |
| `onStatusChange` | function | null | Callback when status changes |
| `expanded` | boolean | false | Whether to show expanded details by default |

## API Response Format

The component expects the API endpoint to return a JSON response with the following structure:

```json
{
  "success": true,
  "cacheSize": 5242880,
  "itemCount": 100,
  "hitRate": 0.85,
  "offlineReadiness": 0.9,
  "lastUpdated": "2023-05-01T12:00:00Z",
  "predictedOffline": false,
  "predictedDuration": 0,
  "storageUsage": 0.3,
  "compressionRatio": 2.5
}
```

## Status Types

The component has four status types:

1. **Offline Ready** (green): The system is well-prepared for offline operation (offlineReadiness >= 0.8)
2. **Partially Ready** (yellow): The system is somewhat prepared for offline operation (offlineReadiness >= 0.4)
3. **Not Ready** (red): The system is not prepared for offline operation (offlineReadiness < 0.4)
4. **Unknown** (gray): The system status could not be determined

## Integration with Backend

The component works with the `/api/cache/status` endpoint provided by the backend's cache-status.js route. This endpoint retrieves information from the edge application's predictive caching system and storage optimizer.

## Example

```jsx
import React from 'react';
import { CacheStatus } from '../../shared/components';
import { Card, Typography } from '@mui/material';

const CacheStatusExample = () => {
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        System Status
      </Typography>
      
      <CacheStatus
        endpoint="/api/cache/status"
        refreshInterval={60000}
        expanded={true}
      />
    </Card>
  );
};

export default CacheStatusExample;
```

## Customization

The component can be customized using the `style` prop to override the default styles:

```jsx
<CacheStatus
  endpoint="/api/cache/status"
  style={{
    container: {
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px'
    },
    indicator: {
      width: '15px',
      height: '15px'
    },
    title: {
      fontWeight: 'bold',
      fontSize: '16px'
    },
    progressContainer: {
      height: '8px'
    }
  }}
/>
```
