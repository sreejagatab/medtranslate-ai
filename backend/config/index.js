/**
 * Configuration settings for MedTranslate AI Backend
 */

// Load environment variables
require('dotenv').config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost'
  },
  
  // AWS configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    dynamoEndpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    s3Endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID,
    cognitoClientId: process.env.COGNITO_CLIENT_ID,
    lambdaEndpoint: process.env.LAMBDA_ENDPOINT
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'medtranslate-dev-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
  },
  
  // Translation service configuration
  translation: {
    defaultModel: process.env.DEFAULT_TRANSLATION_MODEL || 'aws-bedrock-claude',
    fallbackModel: process.env.FALLBACK_TRANSLATION_MODEL || 'aws-translate',
    cacheEnabled: process.env.TRANSLATION_CACHE_ENABLED === 'true',
    cacheTTL: parseInt(process.env.TRANSLATION_CACHE_TTL || '86400', 10) // 24 hours in seconds
  },
  
  // WebSocket configuration
  websocket: {
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000', 10), // 30 seconds
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '10000', 10) // 10 seconds
  },
  
  // Edge device configuration
  edge: {
    discoveryPort: process.env.EDGE_DISCOVERY_PORT || 5001,
    discoveryInterval: parseInt(process.env.EDGE_DISCOVERY_INTERVAL || '60000', 10) // 60 seconds
  },
  
  // Monitoring configuration
  monitoring: {
    loggingLevel: process.env.LOGGING_LEVEL || 'info',
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    alertingEnabled: process.env.ALERTING_ENABLED === 'true'
  }
};

module.exports = config;
