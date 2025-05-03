# AWS Region Configuration in MedTranslate AI

This document outlines the approach for configuring AWS regions consistently across all services in the MedTranslate AI application.

## Overview

MedTranslate AI uses various AWS services, including:

- DynamoDB for data storage
- CloudWatch for monitoring and logging
- S3 for file storage
- Lambda for serverless functions
- Bedrock for AI models
- SNS for notifications

To ensure consistent behavior across all services, it's important to configure the AWS region consistently.

## Implementation

### Centralized Configuration

The AWS region configuration is centralized in the `backend/utils/aws-config.js` file, which provides:

1. A global AWS region configuration
2. Service-specific configuration functions
3. Factory functions to create AWS service clients

### Environment Variables

The AWS region is configured using environment variables:

- `AWS_REGION`: The AWS region to use (default: `us-east-1`)
- `IS_OFFLINE`: Whether the application is running in offline mode (default: `false`)
- `STAGE`: The deployment stage (default: `dev`)

### Usage

To use the centralized AWS configuration:

```javascript
const {
  createDynamoDBDocumentClient,
  createCloudWatchClient,
  createS3Client
} = require('./utils/aws-config');

// Create AWS service clients
const dynamoDB = createDynamoDBDocumentClient();
const cloudWatch = createCloudWatchClient();
const s3 = createS3Client();
```

### CloudWatch Logging

For CloudWatch logging, use the `cloudwatch-logger.js` utility:

```javascript
const logger = require('./utils/cloudwatch-logger');

// Log messages
logger.info('This is an info message', { key: 'value' }, 'component-name');
logger.warn('This is a warning message', { key: 'value' }, 'component-name');
logger.error('This is an error message', { key: 'value' }, 'component-name');
```

## Configuration by Service

### DynamoDB

DynamoDB is configured with the AWS region from the environment variable `AWS_REGION` or defaults to `us-east-1`.

In offline mode, DynamoDB uses a local endpoint at `http://localhost:8000`.

### CloudWatch

CloudWatch is configured with the AWS region from the environment variable `AWS_REGION` or defaults to `us-east-1`.

In offline mode, CloudWatch uses a local endpoint at `http://localhost:4582`.

### S3

S3 is configured with the AWS region from the environment variable `AWS_REGION` or defaults to `us-east-1`.

In offline mode, S3 uses a local endpoint at `http://localhost:9000` with path-style addressing.

### Lambda

Lambda is configured with the AWS region from the environment variable `AWS_REGION` or defaults to `us-east-1`.

In offline mode, Lambda uses a local endpoint at `http://localhost:3002`.

### Bedrock

Bedrock is configured with the AWS region from the environment variable `AWS_REGION` or defaults to `us-east-1`.

### SNS

SNS is configured with the AWS region from the environment variable `AWS_REGION` or defaults to `us-east-1`.

In offline mode, SNS uses a local endpoint at `http://localhost:4575`.

## Best Practices

1. **Always use the centralized configuration**: Never create AWS service clients directly with hardcoded regions.
2. **Use environment variables**: Set the `AWS_REGION` environment variable to configure the region.
3. **Test in offline mode**: Use the `IS_OFFLINE=true` environment variable to test with local AWS service emulators.
4. **Use the logger utility**: Use the `cloudwatch-logger.js` utility for consistent logging to CloudWatch.

## Troubleshooting

### Region Mismatch

If you encounter region mismatch errors:

1. Check that all services are using the centralized configuration
2. Verify that the `AWS_REGION` environment variable is set correctly
3. Restart the application to ensure the configuration is applied

### CloudWatch Logging Issues

If CloudWatch logs are not appearing:

1. Check that the log group and stream exist
2. Verify that the AWS credentials have permission to write to CloudWatch Logs
3. Check for errors in the application logs

## Conclusion

By centralizing the AWS region configuration and using environment variables, MedTranslate AI ensures consistent behavior across all AWS services, making the application more reliable and easier to maintain.
