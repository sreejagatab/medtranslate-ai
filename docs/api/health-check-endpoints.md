# MedTranslate AI: Health Check API Endpoints

This document provides technical documentation for the health check API endpoints used by the System Status Dashboard.

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

Most health check endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

The main health check endpoint (`/api/health`) is public and does not require authentication.

## Health Check Endpoints

### Get System Health

Retrieves the overall health status of the system and its components.

**Endpoint:** `/api/health`

**Method:** `GET`

**Authentication:** None (Public)

**Query Parameters:**

- `components` (optional): Comma-separated list of components to check. If not provided, all components will be checked.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2023-06-15T10:30:00Z",
  "components": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "details": {
        "connections": 5,
        "maxConnections": 20
      }
    },
    "translation_service": {
      "status": "healthy",
      "responseTime": 120,
      "details": {
        "models": 5,
        "activeRequests": 2
      }
    },
    "edge_device": {
      "status": "healthy",
      "responseTime": 85,
      "details": {
        "warnings": []
      }
    },
    "auth_service": {
      "status": "healthy",
      "responseTime": 65,
      "details": {
        "activeSessions": 10,
        "tokenValidations": 50
      }
    },
    "storage_service": {
      "status": "healthy",
      "responseTime": 75,
      "details": {
        "warnings": []
      }
    }
  },
  "system": {
    "uptime": 86400,
    "loadAvg": [0.5, 0.7, 0.8],
    "memory": {
      "total": 8589934592,
      "free": 4294967296
    },
    "cpus": 8
  }
}
```

### Check Component Health

Retrieves the health status of a specific component.

**Endpoint:** `/api/health/components/:component`

**Method:** `GET`

**Authentication:** Required

**URL Parameters:**

- `component`: The name of the component to check. Valid values are:
  - `database`
  - `translation_service`
  - `edge_device`
  - `auth_service`
  - `storage_service`

**Response:**

```json
{
  "component": "database",
  "status": "healthy",
  "responseTime": 45,
  "details": {
    "connections": 5,
    "maxConnections": 20
  },
  "timestamp": "2023-06-15T10:30:00Z"
}
```

### Get Health Check History

Retrieves the history of health checks.

**Endpoint:** `/api/health/history`

**Method:** `GET`

**Authentication:** Required

**Response:**

```json
[
  {
    "timestamp": "2023-06-15T10:00:00Z",
    "status": "healthy",
    "components": {
      "database": {
        "status": "healthy",
        "responseTime": 45
      },
      "translation_service": {
        "status": "healthy",
        "responseTime": 120
      },
      "edge_device": {
        "status": "healthy",
        "responseTime": 85
      },
      "auth_service": {
        "status": "healthy",
        "responseTime": 65
      },
      "storage_service": {
        "status": "healthy",
        "responseTime": 75
      }
    }
  },
  {
    "timestamp": "2023-06-15T09:00:00Z",
    "status": "degraded",
    "components": {
      "database": {
        "status": "healthy",
        "responseTime": 45
      },
      "translation_service": {
        "status": "degraded",
        "responseTime": 250
      },
      "edge_device": {
        "status": "healthy",
        "responseTime": 85
      },
      "auth_service": {
        "status": "healthy",
        "responseTime": 65
      },
      "storage_service": {
        "status": "healthy",
        "responseTime": 75
      }
    }
  }
]
```

## Component Status Values

The status of a component can be one of the following values:

- `healthy`: The component is functioning normally.
- `degraded`: The component is functioning but with reduced performance or has warnings.
- `error`: The component is not functioning properly.

## System Status Values

The overall status of the system can be one of the following values:

- `healthy`: All components are healthy.
- `degraded`: At least one component is degraded, but none are in error state.
- `error`: At least one component is in error state.

## CloudWatch Integration

The health check endpoints integrate with AWS CloudWatch to provide monitoring and alerting capabilities. The following metrics are sent to CloudWatch:

- `SystemStatus`: The overall status of the system (1 for healthy, 0.5 for degraded, 0 for error).
- `ComponentStatus`: The status of each component (1 for healthy, 0.5 for degraded, 0 for error).
- `ComponentResponseTime`: The response time of each component in milliseconds.
- `SystemUptime`: The uptime of the system in seconds.
- `SystemLoad`: The system load average.
- `MemoryUsage`: The memory usage of the system as a percentage.

## Alerting

The health check endpoints integrate with the alerting service to send alerts for unhealthy components. Alerts are sent through the following channels:

- Email
- SMS
- Slack

Alerts include the following information:

- Component name
- Component status
- Error details
- Warnings
- Environment information
- Link to the monitoring dashboard

## Error Responses

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 404 Not Found

```json
{
  "error": "Component 'non-existent' not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to get system health status"
}
```

## Testing

To test the health check endpoints, you can use the following commands:

```bash
# Get system health
curl http://localhost:3000/api/health

# Get specific components
curl http://localhost:3000/api/health?components=database,auth_service

# Check component health (requires authentication)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/health/components/database

# Get health check history (requires authentication)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/health/history
```

## Integration with System Status Dashboard

The System Status Dashboard uses these endpoints to display the health status of the system and its components. The dashboard provides a visual representation of the health status and allows users to monitor the system in real-time.

The dashboard integrates with the following endpoints:

- `/api/health`: To get the overall health status of the system and its components.
- `/api/health/components/:component`: To get detailed information about a specific component.
- `/api/health/history`: To display historical health check data.

The dashboard also uses WebSocket connections to receive real-time updates about the system health status.
