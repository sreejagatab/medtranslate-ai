# MedTranslate AI Deployment Guide

This guide provides detailed instructions for deploying the MedTranslate AI system to various environments.

## Prerequisites

Before deploying, ensure you have the following:

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js 18.x or later
- Python 3.9 or later
- Docker and Docker Compose (for local development)
- GitHub account (for CI/CD)

## Environment Setup

MedTranslate AI supports three deployment environments:

- **Development (dev)**: For development and testing
- **Testing (test)**: For QA and user acceptance testing
- **Production (prod)**: For live deployment

## Infrastructure Deployment

The infrastructure is defined as code using AWS CloudFormation templates in the `infrastructure/cloudformation` directory.

### Manual Deployment

1. Create S3 deployment bucket (first time only):
   ```bash
   aws s3 mb s3://medtranslate-deployment-{env} --region us-east-1
   aws s3api put-bucket-versioning --bucket medtranslate-deployment-{env} --versioning-configuration Status=Enabled
   ```

2. Package Lambda functions:
   ```bash
   # Auth Lambda
   cd backend/lambda/auth
   zip -r ../../../dist/auth.zip .
   
   # Translation Lambda
   cd backend/lambda/translation
   zip -r ../../../dist/translation.zip .
   
   # Storage Lambda
   cd backend/lambda/storage
   zip -r ../../../dist/storage.zip .
   ```

3. Upload Lambda packages to S3:
   ```bash
   aws s3 cp dist/auth.zip s3://medtranslate-deployment-{env}/{env}/lambda/auth.zip
   aws s3 cp dist/translation.zip s3://medtranslate-deployment-{env}/{env}/lambda/translation.zip
   aws s3 cp dist/storage.zip s3://medtranslate-deployment-{env}/{env}/lambda/storage.zip
   ```

4. Deploy CloudFormation stacks:
   ```bash
   cd infrastructure
   ./deploy.sh {env} {region}
   ```

### Automated Deployment (CI/CD)

The project includes GitHub Actions workflows for automated deployment:

1. Set up GitHub repository secrets:
   - `AWS_ACCESS_KEY_ID`: AWS access key with deployment permissions
   - `AWS_SECRET_ACCESS_KEY`: AWS secret key
   - `PROVIDER_APP_DISTRIBUTION_ID`: CloudFront distribution ID for provider app
   - `PATIENT_APP_DISTRIBUTION_ID`: CloudFront distribution ID for patient app

2. Push to the appropriate branch:
   - `develop` branch: Deploys to development environment
   - `main` branch: Deploys to testing environment
   - Manual workflow dispatch: Can deploy to any environment

## Frontend Deployment

The frontend applications are deployed to AWS S3 and served through CloudFront.

### Manual Deployment

1. Build the provider app:
   ```bash
   cd frontend/provider-app
   npm ci
   npm run build
   ```

2. Build the patient app:
   ```bash
   cd frontend/patient-app
   npm ci
   npm run build
   ```

3. Upload to S3:
   ```bash
   aws s3 sync frontend/provider-app/build s3://medtranslate-provider-app-{env} --delete
   aws s3 sync frontend/patient-app/build s3://medtranslate-patient-app-{env} --delete
   ```

4. Invalidate CloudFront cache:
   ```bash
   aws cloudfront create-invalidation --distribution-id {PROVIDER_APP_DISTRIBUTION_ID} --paths "/*"
   aws cloudfront create-invalidation --distribution-id {PATIENT_APP_DISTRIBUTION_ID} --paths "/*"
   ```

## Edge Device Deployment

### Building the Edge Runtime

1. Build the Docker image:
   ```bash
   cd edge
   docker build -t medtranslate-edge:latest -f runtime/Dockerfile .
   ```

2. Save the image for distribution:
   ```bash
   docker save medtranslate-edge:latest | gzip > medtranslate-edge-latest.tar.gz
   ```

### Deploying to Edge Devices

#### Raspberry Pi Setup

1. Install Docker on the Raspberry Pi:
   ```bash
   curl -sSL https://get.docker.com | sh
   sudo usermod -aG docker pi
   ```

2. Transfer and load the Docker image:
   ```bash
   scp medtranslate-edge-latest.tar.gz pi@raspberrypi.local:~/
   ssh pi@raspberrypi.local
   docker load < medtranslate-edge-latest.tar.gz
   ```

3. Create configuration directories:
   ```bash
   sudo mkdir -p /opt/medtranslate/models
   sudo mkdir -p /opt/medtranslate/cache
   sudo mkdir -p /opt/medtranslate/config
   ```

4. Create environment file:
   ```bash
   cat > /opt/medtranslate/config/.env << EOF
   MODEL_DIR=/models
   CACHE_DIR=/cache
   CLOUD_API_URL=https://api.medtranslate.ai
   DEVICE_ID=$(hostname)
   EOF
   ```

5. Create systemd service:
   ```bash
   sudo tee /etc/systemd/system/medtranslate.service > /dev/null << EOF
   [Unit]
   Description=MedTranslate AI Edge Service
   After=docker.service
   Requires=docker.service
   
   [Service]
   Restart=always
   ExecStart=/usr/bin/docker run --rm --name medtranslate \
     -p 3000:3000 \
     -v /opt/medtranslate/models:/models \
     -v /opt/medtranslate/cache:/cache \
     -v /opt/medtranslate/config/.env:/.env \
     --device /dev/snd \
     medtranslate-edge:latest
   ExecStop=/usr/bin/docker stop medtranslate
   
   [Install]
   WantedBy=multi-user.target
   EOF
   ```

6. Enable and start the service:
   ```bash
   sudo systemctl enable medtranslate
   sudo systemctl start medtranslate
   ```

7. Sync models:
   ```bash
   docker exec medtranslate python /app/model_sync.py
   ```

## Database Setup

### DynamoDB Tables

The CloudFormation templates automatically create the required DynamoDB tables. For manual setup:

1. Create Providers table:
   ```bash
   aws dynamodb create-table \
     --table-name MedTranslateProviders-{env} \
     --attribute-definitions AttributeName=username,AttributeType=S AttributeName=providerId,AttributeType=S \
     --key-schema AttributeName=username,KeyType=HASH \
     --global-secondary-indexes 'IndexName=ProviderIdIndex,KeySchema=[{AttributeName=providerId,KeyType=HASH}],Projection={ProjectionType=ALL}' \
     --billing-mode PAY_PER_REQUEST
   ```

2. Create Sessions table:
   ```bash
   aws dynamodb create-table \
     --table-name MedTranslateSessions-{env} \
     --attribute-definitions AttributeName=sessionId,AttributeType=S AttributeName=sessionCode,AttributeType=S AttributeName=providerId,AttributeType=S AttributeName=createdAt,AttributeType=S \
     --key-schema AttributeName=sessionId,KeyType=HASH \
     --global-secondary-indexes 'IndexName=SessionCodeIndex,KeySchema=[{AttributeName=sessionCode,KeyType=HASH}],Projection={ProjectionType=ALL}' 'IndexName=ProviderSessionsIndex,KeySchema=[{AttributeName=providerId,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
     --billing-mode PAY_PER_REQUEST
   ```

3. Create Medical Terminology table:
   ```bash
   aws dynamodb create-table \
     --table-name MedicalTerminology-{env} \
     --attribute-definitions AttributeName=term_source,AttributeType=S AttributeName=domain,AttributeType=S \
     --key-schema AttributeName=term_source,KeyType=HASH \
     --global-secondary-indexes 'IndexName=DomainIndex,KeySchema=[{AttributeName=domain,KeyType=HASH}],Projection={ProjectionType=ALL}' \
     --billing-mode PAY_PER_REQUEST
   ```

## Monitoring and Logging

### CloudWatch Logs

All Lambda functions and the API Gateway are configured to log to CloudWatch Logs:

- Lambda logs: `/aws/lambda/medtranslate-{function}-{env}`
- API Gateway logs: `API-Gateway-Execution-Logs_{api-id}/{env}`

### CloudWatch Alarms

Set up CloudWatch Alarms for monitoring:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name MedTranslate-API-Errors-{env} \
  --alarm-description "Alarm for API errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=ApiName,Value=MedTranslateAPI-{env} \
  --evaluation-periods 1 \
  --alarm-actions {SNS_TOPIC_ARN}
```

## Backup and Disaster Recovery

### DynamoDB Backups

Enable point-in-time recovery for DynamoDB tables:

```bash
aws dynamodb update-continuous-backups \
  --table-name MedTranslateProviders-{env} \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### S3 Versioning

S3 buckets are configured with versioning enabled for data protection.

## Security Considerations

### Secrets Management

Sensitive information is stored in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name MedTranslateJwtSecret \
  --description "JWT signing secret for MedTranslate AI" \
  --secret-string '{"secret":"RANDOM_SECRET_VALUE"}'
```

### IAM Roles

The CloudFormation templates create IAM roles with least privilege permissions.

### HIPAA Compliance

For HIPAA compliance:

1. Ensure all S3 buckets have server-side encryption enabled
2. Enable CloudTrail for API activity monitoring
3. Implement regular security audits
4. Maintain proper access controls and authentication

## Troubleshooting

### Common Issues

1. **Lambda Deployment Failures**:
   - Check Lambda function logs in CloudWatch
   - Verify IAM permissions
   - Ensure Lambda package size is within limits

2. **API Gateway Issues**:
   - Check API Gateway CloudWatch logs
   - Verify CORS configuration
   - Test endpoints with Postman or curl

3. **Edge Device Connectivity**:
   - Check network connectivity
   - Verify Docker container is running
   - Check edge device logs: `docker logs medtranslate`

### Support Resources

- AWS Documentation: https://docs.aws.amazon.com/
- GitHub Issues: https://github.com/your-org/medtranslate-ai/issues
- Support Email: support@medtranslate.ai
