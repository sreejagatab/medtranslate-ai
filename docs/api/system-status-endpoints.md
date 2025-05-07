# MedTranslate AI: System Status API Endpoints

This document provides technical documentation for the API endpoints used by the System Status Dashboard.

## Base URL

All API endpoints are relative to the base URL:

```
https://api.medtranslate-ai.com
```

For local development:

```
http://localhost:3000
```

## Authentication

All API endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Cache Status Endpoints

### Get Cache Statistics

Retrieves statistics about the cache.

**Endpoint:** `/api/cache/stats`

**Method:** `GET`

**Response:**

```json
{
  "cacheSize": 10485760,
  "itemCount": 100,
  "hitRate": 0.85,
  "lastUpdated": "2023-06-15T10:30:00Z",
  "compressionRatio": 2.5,
  "cacheEfficiency": 0.9,
  "averageCacheAge": 300000,
  "prioritizedItems": 20,
  "offlineReadiness": 0.75,
  "offlineRisk": 0.25,
  "mlPredictions": {
    "predictedOfflineDuration": {
      "hours": 2
    },
    "confidence": 0.8,
    "predictedItemCount": 50,
    "predictionAccuracy": 0.85
  }
}
```

### Refresh Cache

Refreshes the cache with the latest data.

**Endpoint:** `/api/cache/refresh`

**Method:** `POST`

**Response:**

```json
{
  "success": true,
  "message": "Cache refreshed successfully",
  "refreshedItems": 50
}
```

### Clear Cache

Clears the cache.

**Endpoint:** `/api/cache/clear`

**Method:** `POST`

**Response:**

```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "clearedItems": 100
}
```

## ML Model Endpoints

### Get ML Model Performance

Retrieves performance metrics for the ML models.

**Endpoint:** `/api/ml/performance`

**Method:** `GET`

**Response:**

```json
{
  "isInitialized": true,
  "version": "1.2.0",
  "accuracy": 0.9,
  "computeTimeMs": 120,
  "memoryUsageMB": 256,
  "lastTrainingTime": "2023-06-10T15:45:00Z"
}
```

### Get ML Model Performance History

Retrieves historical performance metrics for the ML models.

**Endpoint:** `/api/ml/performance/history`

**Method:** `GET`

**Query Parameters:**

- `days` (optional): Number of days of history to retrieve (default: 7)

**Response:**

```json
[
  {
    "label": "Day 1",
    "accuracy": 0.85,
    "predictionAccuracy": 0.8,
    "computeTimeMs": 150
  },
  {
    "label": "Day 2",
    "accuracy": 0.87,
    "predictionAccuracy": 0.82,
    "computeTimeMs": 140
  },
  {
    "label": "Day 3",
    "accuracy": 0.9,
    "predictionAccuracy": 0.85,
    "computeTimeMs": 120
  }
]
```

### Train ML Models

Trains the ML models with the latest data.

**Endpoint:** `/api/ml/train`

**Method:** `POST`

**Response:**

```json
{
  "success": true,
  "message": "Models trained successfully",
  "newAccuracy": 0.92,
  "trainingTimeMs": 5000
}
```

### Configure ML Models

Configures the ML models for specific optimization goals.

**Endpoint:** `/api/ml/configure`

**Method:** `POST`

**Request Body:**

```json
{
  "optimizeForSpeed": true,
  "optimizeForSize": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Models configured successfully",
  "newComputeTimeMs": 100,
  "newMemoryUsageMB": 280
}
```

## Storage Endpoints

### Get Storage Information

Retrieves information about storage usage.

**Endpoint:** `/api/storage/info`

**Method:** `GET`

**Response:**

```json
{
  "usagePercentage": 65,
  "currentUsageMB": 650,
  "quotaMB": 1000,
  "reservedForOfflineMB": 200,
  "compressionSavingsMB": 150,
  "priorityItemCount": 30,
  "lastOptimizationTime": "2023-06-12T08:20:00Z",
  "categories": [
    {
      "name": "Translations",
      "sizeMB": 300
    },
    {
      "name": "ML Models",
      "sizeMB": 200
    },
    {
      "name": "Medical Terms",
      "sizeMB": 100
    },
    {
      "name": "User Data",
      "sizeMB": 50
    }
  ],
  "history": [
    {
      "label": "Day 1",
      "usageMB": 600,
      "compressionSavingsMB": 140,
      "itemCount": 90
    },
    {
      "label": "Day 2",
      "usageMB": 630,
      "compressionSavingsMB": 145,
      "itemCount": 95
    },
    {
      "label": "Day 3",
      "usageMB": 650,
      "compressionSavingsMB": 150,
      "itemCount": 100
    }
  ]
}
```

### Optimize Storage

Optimizes storage usage by removing unnecessary data and compressing stored data.

**Endpoint:** `/api/storage/optimize`

**Method:** `POST`

**Response:**

```json
{
  "success": true,
  "message": "Storage optimized successfully",
  "spaceSavedMB": 50,
  "newUsagePercentage": 60
}
```

## Sync Endpoints

### Get Sync Status

Retrieves the current sync status.

**Endpoint:** `/api/sync/status`

**Method:** `GET`

**Response:**

```json
{
  "status": "healthy",
  "autoSyncEnabled": true,
  "lastSyncTime": "2023-06-15T09:45:00Z",
  "nextScheduledSync": "2023-06-15T10:45:00Z",
  "pendingItems": 5,
  "syncIntervalMinutes": 60,
  "successRate": 0.95,
  "averageSyncDurationMs": 2500,
  "totalSyncs": 120,
  "failedSyncs": 6,
  "networkQuality": 0.85
}
```

### Get Sync History

Retrieves historical sync information.

**Endpoint:** `/api/sync/history`

**Method:** `GET`

**Query Parameters:**

- `days` (optional): Number of days of history to retrieve (default: 7)

**Response:**

```json
[
  {
    "label": "Day 1",
    "itemCount": 100,
    "durationMs": 2600,
    "networkQuality": 0.8
  },
  {
    "label": "Day 2",
    "itemCount": 110,
    "durationMs": 2550,
    "networkQuality": 0.82
  },
  {
    "label": "Day 3",
    "itemCount": 105,
    "durationMs": 2500,
    "networkQuality": 0.85
  }
]
```

### Manual Sync

Initiates a manual sync operation.

**Endpoint:** `/api/sync/manual`

**Method:** `POST`

**Response:**

```json
{
  "success": true,
  "message": "Manual sync completed successfully",
  "syncedItems": 15,
  "durationMs": 2300
}
```

### Toggle Auto-Sync

Enables or disables automatic synchronization.

**Endpoint:** `/api/sync/toggle`

**Method:** `POST`

**Request Body:**

```json
{
  "enabled": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Auto-sync enabled successfully",
  "nextScheduledSync": "2023-06-15T10:45:00Z"
}
```

## Device Performance Endpoints

### Get Device Performance

Retrieves performance metrics for the device.

**Endpoint:** `/api/device/performance`

**Method:** `GET`

**Response:**

```json
{
  "cpuUsage": 0.45,
  "cpuCores": 8,
  "memoryUsage": 0.6,
  "freeMemoryMB": 4096,
  "network": {
    "connectionType": "wifi",
    "online": true,
    "signalStrength": 0.85,
    "downloadSpeedMbps": 50,
    "uploadSpeedMbps": 20,
    "latencyMs": 35,
    "connectionStability": 0.9
  },
  "battery": {
    "level": 0.75,
    "charging": true,
    "timeRemaining": 180
  },
  "system": {
    "platform": "Windows",
    "version": "10",
    "architecture": "x64",
    "uptime": 259200,
    "deviceType": "desktop",
    "deviceName": "DESKTOP-ABC123"
  },
  "history": [
    {
      "label": "Hour 1",
      "cpuUsage": 0.4,
      "memoryUsage": 0.55,
      "connectionStability": 0.85,
      "batteryLevel": 0.8
    },
    {
      "label": "Hour 2",
      "cpuUsage": 0.45,
      "memoryUsage": 0.6,
      "connectionStability": 0.9,
      "batteryLevel": 0.75
    },
    {
      "label": "Hour 3",
      "cpuUsage": 0.42,
      "memoryUsage": 0.58,
      "connectionStability": 0.88,
      "batteryLevel": 0.7
    }
  ]
}
```

## Offline Preparation Endpoint

### Prepare for Offline

Prepares the system for offline operation by caching essential data.

**Endpoint:** `/api/offline/prepare`

**Method:** `POST`

**Response:**

```json
{
  "success": true,
  "message": "Prepared for offline operation successfully",
  "cachedItems": 75,
  "offlineReadiness": 0.95,
  "estimatedOfflineDurationHours": 8
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "details": "Parameter 'days' must be a positive integer"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication required",
  "details": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions",
  "details": "User does not have access to this resource"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Resource not found",
  "details": "The requested resource does not exist"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "details": "Please try again later or contact support"
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse. The rate limits are as follows:

- 60 requests per minute for GET endpoints
- 30 requests per minute for POST endpoints

If you exceed the rate limit, you will receive a 429 Too Many Requests response:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "details": "Please try again in 30 seconds"
}
```

## WebSocket Updates

Real-time updates for system status are available through WebSocket connection:

**WebSocket URL:** `wss://api.medtranslate-ai.com/ws`

**Authentication:** Include the JWT token as a query parameter:

```
wss://api.medtranslate-ai.com/ws?token=<jwt_token>
```

**Message Format:**

```json
{
  "type": "system_status_update",
  "timestamp": "2023-06-15T10:35:00Z",
  "cacheStats": { ... },
  "offlineReadiness": 0.75,
  "offlineRisk": 0.25,
  "mlPredictions": { ... },
  "mlPerformance": { ... },
  "storageInfo": { ... },
  "syncStatus": { ... },
  "devicePerformance": { ... }
}
```
