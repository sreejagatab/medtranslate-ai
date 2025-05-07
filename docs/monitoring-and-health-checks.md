# MedTranslate AI: Monitoring and Health Checks

This document provides an overview of the monitoring and health check system for the MedTranslate AI project.

## Overview

The MedTranslate AI monitoring and health check system provides comprehensive monitoring of system health and performance. It includes:

- Health check endpoints for monitoring system components
- CloudWatch integration for metrics and logs
- Alerting system for critical issues
- System Status Dashboard for visualizing system health

## Health Check System

### Components

The health check system monitors the following components:

- **Database**: Monitors the health of the database connection, query performance, and connection pool
- **Translation Service**: Monitors the health of the translation service, model performance, and request queue
- **Edge Device**: Monitors the health of the edge device, including CPU usage, memory usage, and network connectivity
- **Authentication Service**: Monitors the health of the authentication service, including token validation and session management
- **Storage Service**: Monitors the health of the storage service, including disk usage, file operations, and quota management

### Status Levels

The health check system uses the following status levels:

- **Healthy**: The component is functioning normally
- **Degraded**: The component is functioning but with reduced performance or has warnings
- **Error**: The component is not functioning properly

The overall system status is determined based on the status of all components:

- **Healthy**: All components are healthy
- **Degraded**: At least one component is degraded, but none are in error state
- **Error**: At least one component is in error state

## API Endpoints

### Get System Health

Retrieves the overall health status of the system and its components.

**Endpoint:** `/api/health`

**Method:** `GET`

**Authentication:** None (Public)

**Query Parameters:**

- `components` (optional): Comma-separated list of components to check. If not provided, all components will be checked.

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

### Get Health Check History

Retrieves the history of health checks.

**Endpoint:** `/api/health/history`

**Method:** `GET`

**Authentication:** Required

## CloudWatch Integration

The health check system integrates with AWS CloudWatch to provide monitoring and alerting capabilities. The following metrics are sent to CloudWatch:

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

## Alerting System

The health check system integrates with the alerting service to send alerts for unhealthy components. Alerts are sent through the following channels:

### Email Alerts

Email alerts are sent to configured email addresses and include:

- Component name
- Component status
- Error details
- Warnings
- Environment information
- Link to the monitoring dashboard

### SMS Alerts

SMS alerts are sent to configured phone numbers and include:

- Component name
- Component status
- Environment information

### Slack Alerts

Slack alerts are sent to configured Slack webhooks and include:

- Component name
- Component status
- Error details
- Warnings
- Environment information
- Link to the monitoring dashboard
- Actions for quick access to monitoring dashboard

## System Status Dashboard

The System Status Dashboard provides a visual representation of the system health and performance. It includes:

### System Overview

- **Cache Health**: Shows the overall health of the caching system
- **ML Models**: Shows the status and accuracy of the ML models
- **Sync Status**: Shows the last sync time and sync status
- **Offline Risk**: Shows the risk of going offline

### Detailed Tabs

- **Cache Tab**: Shows cache statistics, offline readiness, cache performance, and cache management
- **ML Models Tab**: Shows model status, predictions, performance history, and model management
- **Sync Tab**: Shows current status, sync statistics, sync history, and sync management
- **Storage Tab**: Shows storage usage, storage categories, storage trends, and storage management
- **Device Tab**: Shows CPU usage, memory usage, network status, battery status, network details, system information, and performance history
- **API Status Tab**: Shows API status overview, API endpoints, response time history, and recent API errors

### Health Check Features

- **Component Health Monitoring**: Shows the health status of each component
- **System Health Monitoring**: Shows the overall health status of the system
- **Health Check History**: Shows the history of health checks

## Integration with Other Systems

### Edge Application

The health check system integrates with the Edge Application to monitor:

- Edge device performance
- Cache statistics
- Storage information
- Sync status

### Backend Services

The health check system integrates with the Backend Services to monitor:

- Database health
- Translation service health
- Authentication service health
- Storage service health

### Frontend Applications

The health check system integrates with the Frontend Applications to display:

- System Status Dashboard
- Component health status
- System health status
- Health check history

## Deployment

### AWS CloudWatch Setup

To set up AWS CloudWatch for the health check system:

1. Create an IAM role with the following permissions:
   - `cloudwatch:PutMetricData`
   - `cloudwatch:PutMetricAlarm`
   - `logs:CreateLogGroup`
   - `logs:CreateLogStream`
   - `logs:PutLogEvents`

2. Configure the AWS credentials in the environment variables:
   - `AWS_REGION`: The AWS region for CloudWatch
   - `AWS_ACCESS_KEY_ID`: The AWS access key ID
   - `AWS_SECRET_ACCESS_KEY`: The AWS secret access key

### Alerting Setup

To set up the alerting system:

1. Configure the email settings in the environment variables:
   - `SMTP_HOST`: The SMTP host
   - `SMTP_PORT`: The SMTP port
   - `SMTP_SECURE`: Whether to use a secure connection
   - `SMTP_USER`: The SMTP username
   - `SMTP_PASS`: The SMTP password
   - `ALERT_EMAIL_FROM`: The email address to send alerts from
   - `ALERT_EMAIL_TO`: The email address to send alerts to

2. Configure the SMS settings in the environment variables:
   - `ALERT_SMS_TO`: The phone number to send SMS alerts to

3. Configure the Slack settings in the environment variables:
   - `SLACK_WEBHOOK_URL`: The Slack webhook URL

## Testing

To test the health check system:

1. Run the unit tests:
   ```bash
   cd backend
   npm test
   ```

2. Run the integration tests:
   ```bash
   cd tests/integration
   npm test
   ```

3. Test the API endpoints:
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

## Troubleshooting

### Common Issues

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

#### CloudWatch Integration Issues

- **Symptoms**: Metrics not appearing in CloudWatch
- **Actions**:
  - Check AWS credentials
  - Check CloudWatch permissions
  - Check network connectivity to AWS
  - Check CloudWatch logs for errors

#### Alerting Issues

- **Symptoms**: Alerts not being sent
- **Actions**:
  - Check alerting configuration
  - Check email/SMS/Slack settings
  - Check network connectivity
  - Check logs for errors

## References

- [Health Check API Documentation](api/health-check-endpoints.md)
- [System Status Dashboard User Guide](user-guides/system-status-dashboard.md)
- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/index.html)
- [Alerting System Documentation](README-HealthCheck.md)
