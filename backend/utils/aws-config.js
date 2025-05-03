/**
 * AWS Configuration Utility for MedTranslate AI
 * 
 * This module provides a centralized configuration for AWS services
 * to ensure consistent region settings and endpoint configuration.
 */

const AWS = require('aws-sdk');

// Environment variables
const IS_OFFLINE = process.env.IS_OFFLINE === 'true';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const STAGE = process.env.STAGE || 'dev';

// Set global AWS region
AWS.config.update({ region: AWS_REGION });

/**
 * Get CloudWatch configuration
 * 
 * @returns {Object} CloudWatch configuration
 */
function getCloudWatchConfig() {
  const config = {
    region: AWS_REGION
  };
  
  if (IS_OFFLINE) {
    config.endpoint = 'http://localhost:4582';
  }
  
  return config;
}

/**
 * Get DynamoDB configuration
 * 
 * @returns {Object} DynamoDB configuration
 */
function getDynamoDBConfig() {
  const config = {
    region: AWS_REGION
  };
  
  if (IS_OFFLINE) {
    config.endpoint = 'http://localhost:8000';
  }
  
  return config;
}

/**
 * Get S3 configuration
 * 
 * @returns {Object} S3 configuration
 */
function getS3Config() {
  const config = {
    region: AWS_REGION
  };
  
  if (IS_OFFLINE) {
    config.endpoint = 'http://localhost:9000';
    config.s3ForcePathStyle = true;
  }
  
  return config;
}

/**
 * Get Lambda configuration
 * 
 * @returns {Object} Lambda configuration
 */
function getLambdaConfig() {
  const config = {
    region: AWS_REGION
  };
  
  if (IS_OFFLINE) {
    config.endpoint = 'http://localhost:3002';
  }
  
  return config;
}

/**
 * Get Bedrock configuration
 * 
 * @returns {Object} Bedrock configuration
 */
function getBedrockConfig() {
  const config = {
    region: AWS_REGION
  };
  
  return config;
}

/**
 * Get SNS configuration
 * 
 * @returns {Object} SNS configuration
 */
function getSNSConfig() {
  const config = {
    region: AWS_REGION
  };
  
  if (IS_OFFLINE) {
    config.endpoint = 'http://localhost:4575';
  }
  
  return config;
}

/**
 * Get CloudWatch Logs configuration
 * 
 * @returns {Object} CloudWatch Logs configuration
 */
function getCloudWatchLogsConfig() {
  const config = {
    region: AWS_REGION
  };
  
  if (IS_OFFLINE) {
    config.endpoint = 'http://localhost:4586';
  }
  
  return config;
}

/**
 * Create CloudWatch client
 * 
 * @returns {AWS.CloudWatch} CloudWatch client
 */
function createCloudWatchClient() {
  return new AWS.CloudWatch(getCloudWatchConfig());
}

/**
 * Create DynamoDB client
 * 
 * @returns {AWS.DynamoDB} DynamoDB client
 */
function createDynamoDBClient() {
  return new AWS.DynamoDB(getDynamoDBConfig());
}

/**
 * Create DynamoDB DocumentClient
 * 
 * @returns {AWS.DynamoDB.DocumentClient} DynamoDB DocumentClient
 */
function createDynamoDBDocumentClient() {
  return new AWS.DynamoDB.DocumentClient(getDynamoDBConfig());
}

/**
 * Create S3 client
 * 
 * @returns {AWS.S3} S3 client
 */
function createS3Client() {
  return new AWS.S3(getS3Config());
}

/**
 * Create Lambda client
 * 
 * @returns {AWS.Lambda} Lambda client
 */
function createLambdaClient() {
  return new AWS.Lambda(getLambdaConfig());
}

/**
 * Create Bedrock client
 * 
 * @returns {AWS.BedrockRuntime} Bedrock client
 */
function createBedrockClient() {
  return new AWS.BedrockRuntime(getBedrockConfig());
}

/**
 * Create SNS client
 * 
 * @returns {AWS.SNS} SNS client
 */
function createSNSClient() {
  return new AWS.SNS(getSNSConfig());
}

/**
 * Create CloudWatch Logs client
 * 
 * @returns {AWS.CloudWatchLogs} CloudWatch Logs client
 */
function createCloudWatchLogsClient() {
  return new AWS.CloudWatchLogs(getCloudWatchLogsConfig());
}

module.exports = {
  AWS_REGION,
  IS_OFFLINE,
  STAGE,
  getCloudWatchConfig,
  getDynamoDBConfig,
  getS3Config,
  getLambdaConfig,
  getBedrockConfig,
  getSNSConfig,
  getCloudWatchLogsConfig,
  createCloudWatchClient,
  createDynamoDBClient,
  createDynamoDBDocumentClient,
  createS3Client,
  createLambdaClient,
  createBedrockClient,
  createSNSClient,
  createCloudWatchLogsClient
};
