# MedTranslate AI Deployment Guide

This guide provides instructions for deploying the MedTranslate AI application to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Environments](#deployment-environments)
- [Deployment Process](#deployment-process)
- [Continuous Integration/Continuous Deployment (CI/CD)](#continuous-integrationcontinuous-deployment-cicd)
- [Monitoring and Logging](#monitoring-and-logging)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the MedTranslate AI application, ensure you have the following:

- AWS account with appropriate permissions
- AWS CLI installed and configured
- Node.js (v14 or later)
- npm (v6 or later)
- Git
- Docker (for containerized deployments)
- Terraform (for infrastructure as code)
- Access to the MedTranslate AI repository

## Environment Setup

### Environment Variables

Create environment files for each deployment environment:

- `.env.development` - Development environment
- `.env.staging` - Staging environment
- `.env.production` - Production environment

Each environment file should contain the following variables:

```
# API Configuration
API_URL=https://api.medtranslate.ai
API_VERSION=v1
API_TIMEOUT=30000

# Authentication
AUTH_DOMAIN=auth.medtranslate.ai
AUTH_CLIENT_ID=your-auth-client-id
AUTH_AUDIENCE=your-auth-audience

# AWS Configuration
AWS_REGION=us-west-2
AWS_COGNITO_POOL_ID=your-cognito-pool-id
AWS_COGNITO_CLIENT_ID=your-cognito-client-id
AWS_S3_BUCKET=your-s3-bucket
AWS_CLOUDFRONT_URL=your-cloudfront-url

# DynamoDB Tables
DYNAMODB_SESSIONS_TABLE=medtranslate-sessions
DYNAMODB_PATIENTS_TABLE=medtranslate-patients
DYNAMODB_TRANSLATIONS_TABLE=medtranslate-translations
DYNAMODB_USERS_TABLE=medtranslate-users

# WebSocket
WEBSOCKET_URL=wss://ws.medtranslate.ai

# Edge Computing
EDGE_API_URL=https://edge.medtranslate.ai
EDGE_API_KEY=your-edge-api-key

# Analytics
ANALYTICS_URL=https://analytics.medtranslate.ai
ANALYTICS_API_KEY=your-analytics-api-key

# Feature Flags
FEATURE_OFFLINE_MODE=true
FEATURE_EDGE_COMPUTING=true
FEATURE_VOICE_RECORDING=true
FEATURE_AUTO_CORRECTION=true

# Logging
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
```

### AWS Resources

Ensure the following AWS resources are set up:

- Amazon Cognito User Pool for authentication
- Amazon S3 buckets for static assets and file storage
- Amazon DynamoDB tables for data storage
- Amazon API Gateway for API endpoints
- AWS Lambda functions for serverless backend
- Amazon CloudFront for content delivery
- Amazon EC2 or ECS for containerized services (if applicable)
- Amazon CloudWatch for monitoring and logging

## Deployment Environments

### Development Environment

- **Purpose**: For development and testing by the development team
- **URL**: https://dev.medtranslate.ai
- **AWS Account**: MedTranslate-Dev
- **Deployment Frequency**: Continuous (on each commit to development branch)
- **Data**: Test data only

### Staging Environment

- **Purpose**: For QA testing and client demos
- **URL**: https://staging.medtranslate.ai
- **AWS Account**: MedTranslate-Staging
- **Deployment Frequency**: On demand or scheduled (typically daily)
- **Data**: Anonymized production-like data

### Production Environment

- **Purpose**: For end users
- **URL**: https://medtranslate.ai
- **AWS Account**: MedTranslate-Prod
- **Deployment Frequency**: Scheduled releases (typically weekly)
- **Data**: Real production data

## Deployment Process

### Backend Deployment

1. **Build the Backend**

   ```bash
   cd backend
   npm install
   npm run build
   ```

2. **Deploy to AWS Lambda**

   ```bash
   npm run deploy:lambda -- --stage=production
   ```

3. **Update API Gateway**

   ```bash
   npm run deploy:api -- --stage=production
   ```

4. **Update DynamoDB Tables**

   ```bash
   npm run deploy:dynamodb -- --stage=production
   ```

### Frontend Deployment

1. **Build the Frontend**

   ```bash
   cd frontend
   npm install
   npm run build -- --env=production
   ```

2. **Deploy to S3**

   ```bash
   npm run deploy:s3 -- --stage=production
   ```

3. **Invalidate CloudFront Cache**

   ```bash
   npm run deploy:cloudfront -- --stage=production
   ```

### Mobile App Deployment

1. **Build the Mobile App**

   ```bash
   cd mobile
   npm install
   npm run build:ios -- --env=production
   npm run build:android -- --env=production
   ```

2. **Deploy to App Stores**

   ```bash
   npm run deploy:ios -- --stage=production
   npm run deploy:android -- --stage=production
   ```

## Continuous Integration/Continuous Deployment (CI/CD)

### GitHub Actions Workflow

The repository includes GitHub Actions workflows for CI/CD:

- `.github/workflows/ci.yml` - Runs tests on pull requests
- `.github/workflows/cd-dev.yml` - Deploys to development environment on push to development branch
- `.github/workflows/cd-staging.yml` - Deploys to staging environment on push to staging branch
- `.github/workflows/cd-prod.yml` - Deploys to production environment on push to main branch

### CI/CD Pipeline

1. **Code Commit**: Developer commits code to a feature branch
2. **Pull Request**: Developer creates a pull request to the development branch
3. **Automated Tests**: CI pipeline runs automated tests
4. **Code Review**: Team reviews the code
5. **Merge**: Pull request is merged to the development branch
6. **Development Deployment**: CD pipeline deploys to the development environment
7. **QA Testing**: QA team tests the changes in the development environment
8. **Staging Deployment**: CD pipeline deploys to the staging environment
9. **UAT**: User acceptance testing is performed in the staging environment
10. **Production Deployment**: CD pipeline deploys to the production environment
11. **Monitoring**: Application is monitored for any issues

## Monitoring and Logging

### CloudWatch Monitoring

- **Metrics**: CPU, memory, API latency, error rates
- **Alarms**: Set up alarms for critical metrics
- **Dashboards**: Create dashboards for key performance indicators

### Logging

- **CloudWatch Logs**: All application logs are sent to CloudWatch Logs
- **Log Groups**: Separate log groups for each component
- **Log Retention**: 30 days for non-production, 90 days for production
- **Log Analysis**: Use CloudWatch Insights for log analysis

### Error Tracking

- **Sentry**: Integrated for real-time error tracking
- **Error Notifications**: Set up notifications for critical errors
- **Error Analysis**: Regular review of error reports

## Rollback Procedures

### Backend Rollback

1. **Identify the Last Stable Version**

   ```bash
   aws lambda list-versions-by-function --function-name medtranslate-api --region us-west-2
   ```

2. **Update Lambda Alias**

   ```bash
   aws lambda update-alias --function-name medtranslate-api --name production --function-version 42 --region us-west-2
   ```

### Frontend Rollback

1. **Identify the Last Stable Version**

   ```bash
   aws s3 ls s3://medtranslate-frontend/releases/
   ```

2. **Copy Previous Version to Current**

   ```bash
   aws s3 sync s3://medtranslate-frontend/releases/v1.2.3/ s3://medtranslate-frontend/current/ --delete
   ```

3. **Invalidate CloudFront Cache**

   ```bash
   aws cloudfront create-invalidation --distribution-id ABCDEFGHIJKLMN --paths "/*"
   ```

## Troubleshooting

### Common Issues

#### API Gateway 5xx Errors

- Check Lambda function logs in CloudWatch
- Verify Lambda function permissions
- Check for Lambda timeout issues

#### S3 Access Denied

- Verify IAM permissions
- Check S3 bucket policy
- Ensure CloudFront distribution is properly configured

#### DynamoDB Throughput Exceeded

- Check provisioned capacity
- Consider enabling auto-scaling
- Optimize query patterns

#### CloudFront Cache Issues

- Verify cache invalidation was successful
- Check cache settings in CloudFront distribution
- Ensure proper cache headers are set

### Support Contacts

- **DevOps Team**: devops@medtranslate.ai
- **Backend Team**: backend@medtranslate.ai
- **Frontend Team**: frontend@medtranslate.ai
- **Mobile Team**: mobile@medtranslate.ai
- **Emergency Contact**: oncall@medtranslate.ai
