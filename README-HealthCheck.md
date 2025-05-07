# MedTranslate AI: Health Check Implementation

This document outlines the implementation of the Health Check system for the MedTranslate AI project, which provides comprehensive monitoring of system health and performance.

## Components Implemented

### 1. Health Check Controller
- **Path**: `backend/controllers/health-check-controller.js`
- **Description**: A controller that handles health check operations, including getting system health status, component health status, and health check history.
- **Features**:
  - Component health checks for database, translation service, edge device, authentication service, and storage service
  - Overall system health status based on component health
  - Health check history

### 2. Health Check Routes
- **Path**: `backend/routes/health-check-routes.js`
- **Description**: API routes for health check operations.
- **Features**:
  - Public endpoint for system health status
  - Authenticated endpoints for component health status and health check history

### 3. CloudWatch Service
- **Path**: `backend/services/cloudwatch-service.js`
- **Description**: A service that provides functions for sending metrics and logs to AWS CloudWatch.
- **Features**:
  - Sending system health metrics to CloudWatch
  - Sending logs to CloudWatch
  - Creating CloudWatch alarms

### 4. Alerting Service
- **Path**: `backend/services/alerting-service.js`
- **Description**: A service that provides functions for sending alerts for critical system issues.
- **Features**:
  - Sending alerts via email, SMS, and Slack
  - Component error alerts
  - System alerts

### 5. Health Check Tests
- **Path**: `tests/health-check.test.js`
- **Description**: Tests for the health check API endpoints.
- **Features**:
  - Testing system health endpoint
  - Testing component health endpoint
  - Testing health check history endpoint
  - Testing integration with CloudWatch and alerting

## API Endpoints

### 1. Get System Health
- **Endpoint**: `/api/health`
- **Method**: `GET`
- **Authentication**: None (Public)
- **Description**: Retrieves the overall health status of the system and its components.

### 2. Check Component Health
- **Endpoint**: `/api/health/components/:component`
- **Method**: `GET`
- **Authentication**: Required
- **Description**: Retrieves the health status of a specific component.

### 3. Get Health Check History
- **Endpoint**: `/api/health/history`
- **Method**: `GET`
- **Authentication**: Required
- **Description**: Retrieves the history of health checks.

## Integration Points

### System Status Dashboard
- The health check endpoints are used by the System Status Dashboard to display the health status of the system and its components.
- The dashboard provides a visual representation of the health status and allows users to monitor the system in real-time.

### CloudWatch Integration
- The health check system integrates with AWS CloudWatch to provide monitoring and alerting capabilities.
- The following metrics are sent to CloudWatch:
  - `SystemStatus`: The overall status of the system
  - `ComponentStatus`: The status of each component
  - `ComponentResponseTime`: The response time of each component
  - `SystemUptime`: The uptime of the system
  - `SystemLoad`: The system load average
  - `MemoryUsage`: The memory usage of the system

### Alerting Integration
- The health check system integrates with the alerting service to send alerts for unhealthy components.
- Alerts are sent through the following channels:
  - Email
  - SMS
  - Slack

## Documentation

- `docs/api/health-check-endpoints.md` - Documentation for the health check API endpoints
- `docs/user-guides/system-status-dashboard.md` - User guide for the System Status Dashboard, including health check features
- `README-HealthCheck.md` (this file) - Overall implementation documentation

## Implementation Details

### Component Health Checks

The health check system performs health checks on the following components:

#### Database
- Checks database connection
- Measures query performance
- Monitors connection pool

#### Translation Service
- Checks translation service availability
- Measures translation performance
- Monitors request queue

#### Edge Device
- Checks edge device connectivity
- Measures CPU and memory usage
- Monitors network quality

#### Authentication Service
- Checks authentication service availability
- Measures token validation performance
- Monitors active sessions

#### Storage Service
- Checks storage service availability
- Measures storage usage
- Monitors quota and free space

### System Health Status

The overall system health status is determined based on the status of all components:

- `healthy`: All components are healthy
- `degraded`: At least one component is degraded, but none are in error state
- `error`: At least one component is in error state

### CloudWatch Metrics

The health check system sends the following metrics to CloudWatch:

- `SystemStatus`: The overall status of the system (1 for healthy, 0.5 for degraded, 0 for error)
- `ComponentStatus`: The status of each component (1 for healthy, 0.5 for degraded, 0 for error)
- `ComponentResponseTime`: The response time of each component in milliseconds
- `SystemUptime`: The uptime of the system in seconds
- `SystemLoad`: The system load average
- `MemoryUsage`: The memory usage of the system as a percentage

### CloudWatch Alarms

The health check system creates the following CloudWatch alarms:

- `MedTranslateAI-{component}-Error`: Alarm for component error
  - Triggers when the component status is less than 0.1 (error)
  - Evaluates every 1 minute
  - Requires 1 datapoint to trigger

### Alerting

The health check system sends alerts for unhealthy components through the following channels:

#### Email Alerts
- Sent to configured email addresses
- Include component name, status, and details
- Include link to monitoring dashboard

#### SMS Alerts
- Sent to configured phone numbers
- Include component name and status
- Include environment information

#### Slack Alerts
- Sent to configured Slack webhook
- Include component name, status, and details
- Include link to monitoring dashboard
- Include actions for quick access to monitoring dashboard

## Testing

To test the health check implementation:

1. **Start the server**:
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Test the API endpoints**:
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

3. **Run the tests**:
   ```bash
   cd tests
   npm test health-check.test.js
   ```

## Conclusion

The Health Check implementation provides a comprehensive system for monitoring the health of the MedTranslate AI system. It integrates with AWS CloudWatch for monitoring and alerting, and provides a visual representation of the system health through the System Status Dashboard.

The implementation follows a modular approach, with separate controllers, routes, and services for health check operations. This ensures maintainability and extensibility of the health check system.

The health check system is an essential component of the MedTranslate AI project, providing real-time monitoring and alerting capabilities to ensure the system is functioning properly and to quickly identify and resolve issues.
