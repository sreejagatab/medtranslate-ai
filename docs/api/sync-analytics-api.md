# Sync Analytics API Documentation

This document provides detailed information about the Sync Analytics API endpoints for the MedTranslate AI project.

## Overview

The Sync Analytics API provides access to analytics data from the auto-sync-manager, which is responsible for synchronizing data between edge devices and the cloud. This API allows you to monitor the status of sync operations, view metrics, and trigger manual syncs.

## Base URL

```
https://api.medtranslate.ai/api/sync-analytics
```

## Authentication

All API endpoints require authentication using a JWT token. Include the token in the `Authorization` header of your requests:

```
Authorization: Bearer <your_token>
```

## Endpoints

### Get Sync Status

Retrieves the current sync status from all connected edge devices.

**URL**: `/status`

**Method**: `GET`

**Auth required**: Yes

**Response**:

```json
{
  "success": true,
  "devices": [
    {
      "deviceId": "edge-device-1",
      "deviceName": "Hospital Wing A",
      "status": {
        "enabled": true,
        "inProgress": false,
        "lastSyncTime": 1746138009497,
        "lastSyncStatus": "success",
        "queueSize": 5,
        "interval": 300000,
        "metrics": {
          "totalSyncs": 120,
          "successfulSyncs": 118,
          "itemsSynced": 1450,
          "conflicts": 3,
          "conflictsResolved": 3
        },
        "queueByPriority": {
          "critical": 1,
          "high": 2,
          "medium": 1,
          "low": 1
        }
      },
      "online": true,
      "lastUpdated": "2023-05-01T12:00:00.000Z"
    },
    {
      "deviceId": "edge-device-2",
      "deviceName": "Hospital Wing B",
      "status": null,
      "online": false,
      "error": "Connection refused",
      "lastUpdated": "2023-05-01T12:00:00.000Z"
    }
  ],
  "timestamp": "2023-05-01T12:00:00.000Z"
}
```

### Get Sync Metrics

Retrieves detailed sync metrics from all connected edge devices.

**URL**: `/metrics`

**Method**: `GET`

**Auth required**: Yes

**Response**:

```json
{
  "success": true,
  "devices": [
    {
      "deviceId": "edge-device-1",
      "deviceName": "Hospital Wing A",
      "metrics": {
        "totalSyncs": 120,
        "successfulSyncs": 118,
        "failedSyncs": 2,
        "itemsSynced": 1450,
        "itemsFailed": 5,
        "conflicts": 3,
        "conflictsResolved": 3,
        "bytesUploaded": 2500000,
        "bytesDownloaded": 1200000,
        "compressionSavings": 450000,
        "lastReset": 1746135909337,
        "syncDurations": [2500, 1800, 2200],
        "lastUpdated": 1746138009497
      },
      "online": true,
      "lastUpdated": "2023-05-01T12:00:00.000Z"
    },
    {
      "deviceId": "edge-device-2",
      "deviceName": "Hospital Wing B",
      "metrics": null,
      "online": false,
      "error": "Connection refused",
      "lastUpdated": "2023-05-01T12:00:00.000Z"
    }
  ],
  "timestamp": "2023-05-01T12:00:00.000Z"
}
```

### Get Quality Metrics

Retrieves translation quality metrics from all connected edge devices.

**URL**: `/quality`

**Method**: `GET`

**Auth required**: Yes

**Response**:

```json
{
  "success": true,
  "devices": [
    {
      "deviceId": "edge-device-1",
      "deviceName": "Hospital Wing A",
      "quality": {
        "modelPerformance": {
          "claude-3-sonnet": {
            "averageConfidence": 0.92,
            "accuracy": 0.95,
            "usageCount": 450
          },
          "claude-3-haiku": {
            "averageConfidence": 0.88,
            "accuracy": 0.91,
            "usageCount": 320
          }
        },
        "contextPerformance": {
          "general": {
            "averageConfidence": 0.90,
            "accuracy": 0.93,
            "usageCount": 380
          },
          "cardiology": {
            "averageConfidence": 0.94,
            "accuracy": 0.96,
            "usageCount": 210
          }
        },
        "languagePairPerformance": {
          "en-es": {
            "averageConfidence": 0.93,
            "accuracy": 0.95,
            "usageCount": 320
          },
          "es-en": {
            "averageConfidence": 0.91,
            "accuracy": 0.94,
            "usageCount": 280
          }
        },
        "feedbackStats": {
          "positive": 580,
          "negative": 25,
          "byContext": {
            "general": {
              "positive": 320,
              "negative": 15
            },
            "cardiology": {
              "positive": 260,
              "negative": 10
            }
          }
        }
      },
      "online": true,
      "lastUpdated": "2023-05-01T12:00:00.000Z"
    }
  ],
  "timestamp": "2023-05-01T12:00:00.000Z"
}
```

### Get Trend Analysis

Retrieves trend analysis data from all connected edge devices.

**URL**: `/trends`

**Method**: `GET`

**Auth required**: Yes

**Response**:

```json
{
  "success": true,
  "devices": [
    {
      "deviceId": "edge-device-1",
      "deviceName": "Hospital Wing A",
      "trends": {
        "confidenceOverTime": [
          { "timestamp": 1746135909337, "value": 0.91 },
          { "timestamp": 1746136909337, "value": 0.92 },
          { "timestamp": 1746137909337, "value": 0.93 }
        ],
        "feedbackOverTime": [
          { "timestamp": 1746135909337, "positive": 180, "negative": 8 },
          { "timestamp": 1746136909337, "positive": 195, "negative": 9 },
          { "timestamp": 1746137909337, "positive": 205, "negative": 8 }
        ],
        "qualityByHour": [
          { "hour": 0, "confidence": 0.91, "feedback": 0.95 },
          { "hour": 1, "confidence": 0.92, "feedback": 0.96 },
          // ... more hours
        ],
        "qualityByDay": [
          { "day": 0, "confidence": 0.91, "feedback": 0.95 },
          { "day": 1, "confidence": 0.92, "feedback": 0.96 },
          // ... more days
        ]
      },
      "online": true,
      "lastUpdated": "2023-05-01T12:00:00.000Z"
    }
  ],
  "timestamp": "2023-05-01T12:00:00.000Z"
}
```

### Get Anomaly Detection

Retrieves anomaly detection data from all connected edge devices.

**URL**: `/anomalies`

**Method**: `GET`

**Auth required**: Yes

**Response**:

```json
{
  "success": true,
  "devices": [
    {
      "deviceId": "edge-device-1",
      "deviceName": "Hospital Wing A",
      "anomalies": {
        "anomalyHistory": [
          {
            "timestamp": 1746135909337,
            "type": "confidence_drop",
            "value": 0.75,
            "threshold": 0.85,
            "severity": "high",
            "context": "cardiology",
            "model": "claude-3-sonnet"
          },
          {
            "timestamp": 1746136909337,
            "type": "feedback_negative_spike",
            "value": 0.25,
            "threshold": 0.15,
            "severity": "medium",
            "context": "general",
            "model": "claude-3-haiku"
          }
        ],
        "anomalyDetection": {
          "confidenceThreshold": 0.2,
          "feedbackThreshold": 0.3,
          "lastAnalysisTime": 1746138009497,
          "baselineConfidence": 0.92,
          "baselineFeedback": 0.95
        }
      },
      "online": true,
      "lastUpdated": "2023-05-01T12:00:00.000Z"
    }
  ],
  "timestamp": "2023-05-01T12:00:00.000Z"
}
```

### Trigger Manual Sync

Triggers a manual sync on a specific edge device.

**URL**: `/manual-sync/:deviceId`

**Method**: `POST`

**Auth required**: Yes

**URL Parameters**:

- `deviceId` - ID of the edge device to sync

**Response**:

```json
{
  "success": true,
  "result": {
    "success": true,
    "syncedItems": 5,
    "conflicts": 0,
    "duration": 2500
  },
  "timestamp": "2023-05-01T12:00:00.000Z"
}
```

## WebSocket Events

The Sync Analytics API also provides real-time updates via WebSocket. Connect to the WebSocket server at:

```
wss://api.medtranslate.ai/ws/admin?token=<your_token>
```

### Event Types

#### Sync Status Update

```json
{
  "type": "sync_status_update",
  "devices": [
    {
      "deviceId": "edge-device-1",
      "deviceName": "Hospital Wing A",
      "status": {
        "enabled": true,
        "inProgress": false,
        "lastSyncTime": 1746138009497,
        "lastSyncStatus": "success",
        "queueSize": 5,
        "interval": 300000,
        "metrics": {
          "totalSyncs": 120,
          "successfulSyncs": 118,
          "itemsSynced": 1450,
          "conflicts": 3,
          "conflictsResolved": 3
        }
      },
      "online": true,
      "lastUpdated": "2023-05-01T12:00:00.000Z"
    }
  ],
  "timestamp": "2023-05-01T12:00:00.000Z"
}
```

#### Quality Metrics Update

```json
{
  "type": "quality_metrics_update",
  "devices": [
    {
      "deviceId": "edge-device-1",
      "deviceName": "Hospital Wing A",
      "quality": {
        "modelPerformance": {
          "claude-3-sonnet": {
            "averageConfidence": 0.92,
            "accuracy": 0.95,
            "usageCount": 450
          }
        },
        "contextPerformance": {
          "general": {
            "averageConfidence": 0.90,
            "accuracy": 0.93,
            "usageCount": 380
          }
        }
      },
      "online": true,
      "lastUpdated": "2023-05-01T12:00:00.000Z"
    }
  ],
  "timestamp": "2023-05-01T12:00:00.000Z"
}
```

#### Anomaly Detection Update

```json
{
  "type": "anomaly_detection_update",
  "devices": [
    {
      "deviceId": "edge-device-1",
      "deviceName": "Hospital Wing A",
      "anomalies": {
        "anomalyHistory": [
          {
            "timestamp": 1746135909337,
            "type": "confidence_drop",
            "value": 0.75,
            "threshold": 0.85,
            "severity": "high",
            "context": "cardiology",
            "model": "claude-3-sonnet"
          }
        ]
      },
      "online": true,
      "lastUpdated": "2023-05-01T12:00:00.000Z"
    }
  ],
  "timestamp": "2023-05-01T12:00:00.000Z"
}
```

## Error Responses

All endpoints return a standard error response format:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common error codes:

- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
