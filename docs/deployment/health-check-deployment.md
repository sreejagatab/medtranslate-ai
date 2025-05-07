# MedTranslate AI: Health Check System Deployment Guide

This document provides instructions for deploying the health check system for the MedTranslate AI project.

## Prerequisites

Before deploying the health check system, ensure you have the following:

- AWS account with appropriate permissions
- AWS CLI installed and configured
- Node.js 14.x or later
- npm 6.x or later
- Access to the MedTranslate AI codebase

## AWS Setup

### 1. Create IAM Role

Create an IAM role with the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:DeleteAlarms",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams",
        "sns:Publish"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Create CloudWatch Log Group

Create a CloudWatch Log Group for the health check system:

```bash
aws logs create-log-group --log-group-name /medtranslate-ai/health-check
```

### 3. Create SNS Topic for Alerts

Create an SNS topic for health check alerts:

```bash
aws sns create-topic --name medtranslate-ai-health-alerts
```

Subscribe your email to the SNS topic:

```bash
aws sns subscribe \
  --topic-arn <topic-arn> \
  --protocol email \
  --notification-endpoint your-email@example.com
```

## Environment Configuration

### 1. AWS Configuration

Set the following environment variables for AWS configuration:

```bash
# AWS Region
export AWS_REGION=us-east-1

# CloudWatch Configuration
export CLOUDWATCH_NAMESPACE=MedTranslateAI
export CLOUDWATCH_LOG_GROUP=/medtranslate-ai/health-check

# SNS Configuration
export SNS_TOPIC_ARN=<topic-arn>
```

### 2. Alerting Configuration

Set the following environment variables for alerting configuration:

```bash
# Email Alerting
export SMTP_HOST=smtp.example.com
export SMTP_PORT=587
export SMTP_SECURE=true
export SMTP_USER=your-username
export SMTP_PASS=your-password
export ALERT_EMAIL_FROM=alerts@medtranslate-ai.com
export ALERT_EMAIL_TO=admin@medtranslate-ai.com

# SMS Alerting
export ALERT_SMS_TO=+1234567890

# Slack Alerting
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your-webhook-url
```

## Deployment Steps

### 1. Install Dependencies

Install the required dependencies:

```bash
cd backend
npm install
```

### 2. Deploy to Development Environment

Deploy the health check system to the development environment:

```bash
npm run deploy:dev
```

This will deploy the health check system to the development environment using the Serverless Framework.

### 3. Deploy to Production Environment

Deploy the health check system to the production environment:

```bash
npm run deploy:prod
```

This will deploy the health check system to the production environment using the Serverless Framework.

## Verification

### 1. Verify API Endpoints

Verify that the health check API endpoints are working:

```bash
# Get system health
curl https://api.dev.medtranslate-ai.com/api/health

# Get specific components
curl https://api.dev.medtranslate-ai.com/api/health?components=database,auth_service

# Check component health (requires authentication)
curl -H "Authorization: Bearer <token>" https://api.dev.medtranslate-ai.com/api/health/components/database

# Get health check history (requires authentication)
curl -H "Authorization: Bearer <token>" https://api.dev.medtranslate-ai.com/api/health/history
```

### 2. Verify CloudWatch Integration

Verify that metrics are being sent to CloudWatch:

1. Open the AWS CloudWatch console
2. Navigate to Metrics
3. Select the "MedTranslateAI" namespace
4. Check for the following metrics:
   - SystemStatus
   - ComponentStatus
   - ComponentResponseTime
   - SystemUptime
   - SystemLoad
   - MemoryUsage

### 3. Verify Alerting

Verify that alerts are being sent:

1. Simulate an unhealthy component by modifying the health check controller
2. Check your email for alerts
3. Check your phone for SMS alerts
4. Check Slack for alerts

## Monitoring

### 1. CloudWatch Dashboard

Create a CloudWatch Dashboard for monitoring the health check system:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name MedTranslateAI-Health \
  --dashboard-body file://cloudwatch-dashboard.json
```

The `cloudwatch-dashboard.json` file should contain the following:

```json
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["MedTranslateAI", "SystemStatus"]
        ],
        "period": 60,
        "stat": "Minimum",
        "region": "us-east-1",
        "title": "System Status"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["MedTranslateAI", "ComponentStatus", "Component", "database"],
          ["MedTranslateAI", "ComponentStatus", "Component", "translation_service"],
          ["MedTranslateAI", "ComponentStatus", "Component", "edge_device"],
          ["MedTranslateAI", "ComponentStatus", "Component", "auth_service"],
          ["MedTranslateAI", "ComponentStatus", "Component", "storage_service"]
        ],
        "period": 60,
        "stat": "Minimum",
        "region": "us-east-1",
        "title": "Component Status"
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["MedTranslateAI", "ComponentResponseTime", "Component", "database"],
          ["MedTranslateAI", "ComponentResponseTime", "Component", "translation_service"],
          ["MedTranslateAI", "ComponentResponseTime", "Component", "edge_device"],
          ["MedTranslateAI", "ComponentResponseTime", "Component", "auth_service"],
          ["MedTranslateAI", "ComponentResponseTime", "Component", "storage_service"]
        ],
        "period": 60,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Component Response Time"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["MedTranslateAI", "SystemUptime"],
          ["MedTranslateAI", "SystemLoad"],
          ["MedTranslateAI", "MemoryUsage"]
        ],
        "period": 60,
        "stat": "Average",
        "region": "us-east-1",
        "title": "System Metrics"
      }
    }
  ]
}
```

### 2. CloudWatch Alarms

Create CloudWatch Alarms for monitoring the health check system:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name MedTranslateAI-SystemStatus-Error \
  --alarm-description "Alarm for system error" \
  --metric-name SystemStatus \
  --namespace MedTranslateAI \
  --statistic Minimum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 0.1 \
  --comparison-operator LessThanThreshold \
  --alarm-actions <sns-topic-arn>
```

## Troubleshooting

### 1. API Endpoint Issues

If the API endpoints are not working:

1. Check the API Gateway logs
2. Check the Lambda function logs
3. Check the CloudWatch logs for errors
4. Verify that the IAM role has the correct permissions

### 2. CloudWatch Integration Issues

If metrics are not appearing in CloudWatch:

1. Check the AWS credentials
2. Check the CloudWatch permissions
3. Check the network connectivity to AWS
4. Check the CloudWatch logs for errors

### 3. Alerting Issues

If alerts are not being sent:

1. Check the alerting configuration
2. Check the email/SMS/Slack settings
3. Check the network connectivity
4. Check the logs for errors

## References

- [Health Check API Documentation](../api/health-check-endpoints.md)
- [System Status Dashboard User Guide](../user-guides/system-status-dashboard.md)
- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/index.html)
- [Alerting System Documentation](../../README-HealthCheck.md)
- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/)
