# MedTranslate AI: System Status Dashboard User Guide

## Overview

The System Status Dashboard provides a comprehensive view of the MedTranslate AI system's status and performance. It allows you to monitor the health of various components, identify issues, and take appropriate actions to maintain optimal performance.

## Accessing the Dashboard

### Provider Application
1. Log in to the Provider Application
2. Navigate to the Dashboard
3. Click on the "System Status Dashboard" button in the right sidebar
4. The System Status Dashboard will open in a new page

### Admin Dashboard
1. Log in to the Admin Dashboard
2. Navigate to the Monitoring Dashboard
3. The System Status Dashboard is integrated into the Monitoring Dashboard

### Patient Application
1. Open the Patient Application
2. Tap on the "System Status" tab in the bottom navigation bar
3. The Mobile System Status Dashboard will be displayed

## Dashboard Components

### System Overview

The System Overview section provides a high-level view of the system's status with four key metrics:

#### Cache Health
- Shows the overall health of the caching system
- Indicates how prepared the system is for offline operation
- A higher percentage indicates better cache health

#### ML Models
- Shows the status and accuracy of the ML models
- Indicates whether the models are initialized and functioning correctly
- A higher percentage indicates better model accuracy

#### Sync Status
- Shows the last sync time and sync status
- Provides a button for manual sync
- Indicates whether auto-sync is enabled

#### Offline Risk
- Shows the risk of going offline
- A lower percentage indicates lower risk
- Based on network quality, battery level, and other factors

### Detailed Tabs

The dashboard includes multiple tabs for detailed information:

#### Cache Tab
- **Cache Statistics**: Shows cache size, item count, hit rate, and last update time
- **Offline Readiness**: Shows how prepared the system is for offline operation
- **Cache Performance**: Shows compression ratio, cache efficiency, average age, and prioritized items
- **Cache Management**: Provides buttons for refreshing and clearing the cache, and preparing for offline operation

#### ML Models Tab
- **Model Status**: Shows the status, version, accuracy, compute time, memory usage, and last training time of the ML models
- **Predictions**: Shows predictions made by the ML models, including predicted offline duration, confidence, and prediction accuracy
- **Performance History**: Shows a chart of model performance over time
- **Model Management**: Provides buttons for training models and optimizing for speed or size

#### Sync Tab
- **Current Status**: Shows the current sync status, auto-sync status, last sync time, next scheduled sync, pending items, and sync interval
- **Sync Statistics**: Shows success rate, average duration, total syncs, failed syncs, and network quality
- **Sync History**: Shows a chart of sync history over time
- **Sync Management**: Provides buttons for manual sync, toggling auto-sync, and preparing for offline operation

#### Storage Tab
- **Storage Usage**: Shows storage usage, reserved space for offline operation, compression savings, priority items, and last optimization time
- **Storage Categories**: Shows a pie chart of storage usage by category
- **Storage Trends**: Shows a chart of storage usage over time
- **Storage Management**: Provides buttons for optimizing storage, refreshing cache, and clearing cache

#### Device Tab
- **CPU Usage**: Shows CPU usage and number of cores
- **Memory Usage**: Shows memory usage and free memory
- **Network Status**: Shows network connection type, signal strength, and stability
- **Battery Status**: Shows battery level, charging status, and time remaining
- **Network Details**: Shows detailed network information including connection type, signal strength, download/upload speed, latency, and stability
- **System Information**: Shows detailed system information including platform, version, architecture, uptime, device type, and device name
- **Performance History**: Shows a chart of device performance over time

#### API Status Tab
- **API Status Overview**: Shows the overall status of the API
- **API Endpoints**: Shows the status, response time, and last checked time for each API endpoint
- **Response Time History**: Shows a chart of API response time over time
- **Recent API Errors**: Shows recent API errors with timestamp, endpoint, error message, and error code

## Health Check Features

The System Status Dashboard includes comprehensive health check features that monitor the health of various components of the MedTranslate AI system. These features include:

### Component Health Monitoring
- **Database**: Monitors the health of the database connection, query performance, and connection pool
- **Translation Service**: Monitors the health of the translation service, model performance, and request queue
- **Edge Device**: Monitors the health of the edge device, including CPU usage, memory usage, and network connectivity
- **Authentication Service**: Monitors the health of the authentication service, including token validation and session management
- **Storage Service**: Monitors the health of the storage service, including disk usage, file operations, and quota management

### System Health Monitoring
- **Overall Status**: Shows the overall health status of the system based on the status of all components
- **System Metrics**: Shows system-level metrics like uptime, load average, memory usage, and CPU count
- **Health Check History**: Shows the history of health checks, allowing you to track system health over time

### Alerting
- **Email Alerts**: Sends email alerts for critical system issues
- **SMS Alerts**: Sends SMS alerts for critical system issues
- **Slack Alerts**: Sends Slack alerts for critical system issues
- **CloudWatch Alarms**: Integrates with AWS CloudWatch to provide monitoring and alerting capabilities

## Actions

The dashboard provides various actions to manage the system:

### Cache Management
- **Refresh Cache**: Updates the cache with the latest data
- **Clear Cache**: Removes all cached data
- **Prepare for Offline**: Prepares the system for offline operation by caching essential data

### ML Model Management
- **Train Models**: Trains the ML models with the latest data
- **Optimize for Speed**: Configures the ML models for faster performance
- **Optimize for Size**: Configures the ML models for smaller size

### Sync Management
- **Manual Sync**: Initiates a manual sync operation
- **Toggle Auto-Sync**: Enables or disables automatic synchronization
- **Prepare for Offline**: Prepares the system for offline operation by syncing essential data

### Storage Management
- **Optimize Storage**: Optimizes storage usage by removing unnecessary data and compressing stored data
- **Refresh Cache**: Updates the cache with the latest data
- **Clear Cache**: Removes all cached data

## Interpreting the Dashboard

### Status Colors
- **Green**: Good/Healthy - No action required
- **Yellow**: Warning/Degraded - Monitor closely, action may be required soon
- **Red**: Error/Critical - Immediate action required

### Performance Metrics
- **Response Time**: Lower is better
- **Cache Hit Rate**: Higher is better
- **ML Model Accuracy**: Higher is better
- **Network Quality**: Higher is better
- **Storage Usage**: Lower is better
- **CPU/Memory Usage**: Lower is better

## Troubleshooting

### Common Issues

#### Poor Cache Health
- **Symptoms**: Low cache hit rate, high offline risk
- **Actions**:
  - Click "Refresh Cache" to update the cache
  - Click "Prepare for Offline" to cache essential data
  - Check network connection quality

#### ML Model Issues
- **Symptoms**: Low model accuracy, high compute time
- **Actions**:
  - Click "Train Models" to retrain the models
  - Click "Optimize for Speed" or "Optimize for Size" based on your needs
  - Check if models are initialized

#### Sync Issues
- **Symptoms**: Failed syncs, old last sync time
- **Actions**:
  - Click "Manual Sync" to force a sync
  - Check network connection quality
  - Check if auto-sync is enabled

#### Storage Issues
- **Symptoms**: High storage usage, low free space
- **Actions**:
  - Click "Optimize Storage" to free up space
  - Click "Clear Cache" to remove cached data
  - Check storage usage by category

#### Network Issues
- **Symptoms**: Low network quality, high latency
- **Actions**:
  - Check network connection type
  - Move to an area with better signal
  - Connect to a different network if available

#### API Issues
- **Symptoms**: High response time, API errors
- **Actions**:
  - Check API status overview
  - Check recent API errors
  - Contact system administrator if persistent

#### Component Health Issues
- **Symptoms**: Component status is "degraded" or "error"
- **Actions**:
  - Check the component details for specific warnings or errors
  - Check the system logs for more information
  - Contact system administrator if persistent
  - Check if alerts have been sent for the issue

#### System Health Issues
- **Symptoms**: Overall system status is "degraded" or "error"
- **Actions**:
  - Check which components are causing the issue
  - Follow the troubleshooting steps for the affected components
  - Check the system logs for more information
  - Contact system administrator if persistent

## Best Practices

1. **Regular Monitoring**: Check the dashboard regularly to identify issues before they become critical
2. **Proactive Management**: Take action when warnings appear, don't wait for errors
3. **Prepare for Offline**: Before going to areas with poor connectivity, click "Prepare for Offline"
4. **Optimize Resources**: Regularly optimize storage and ML models to maintain performance
5. **Update Cache**: Refresh the cache regularly to ensure the latest data is available offline

## Support

If you encounter issues that cannot be resolved using the dashboard, please contact support:

- Email: support@medtranslate-ai.com
- Phone: 1-800-MED-TRAN
- In-app: Click on the "Help" button and select "Contact Support"
