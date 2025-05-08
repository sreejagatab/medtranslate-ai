/**
 * Configuration for MedTranslate AI Backend
 * 
 * This file contains configuration settings for the backend services.
 */

// Load environment variables
require('dotenv').config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost'
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'local-development-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    mfaEnabled: process.env.MFA_ENABLED === 'true' || false
  },
  
  // Database configuration
  database: {
    dynamoDb: {
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
      tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || 'medtranslate-'
    }
  },
  
  // AWS configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.S3_BUCKET || 'medtranslate-dev'
    },
    bedrock: {
      region: process.env.BEDROCK_REGION || 'us-east-1',
      endpoint: process.env.BEDROCK_ENDPOINT || null
    }
  },
  
  // Translation configuration
  translation: {
    defaultModel: process.env.DEFAULT_TRANSLATION_MODEL || 'claude-3-sonnet',
    fallbackModel: process.env.FALLBACK_TRANSLATION_MODEL || 'titan',
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7')
  },
  
  // Edge device configuration
  edge: {
    discoveryEnabled: process.env.EDGE_DISCOVERY_ENABLED === 'true' || true,
    discoveryInterval: parseInt(process.env.EDGE_DISCOVERY_INTERVAL || '60000', 10),
    syncInterval: parseInt(process.env.EDGE_SYNC_INTERVAL || '300000', 10)
  },
  
  // Monitoring configuration
  monitoring: {
    loggingLevel: process.env.LOGGING_LEVEL || 'info',
    metricsEnabled: process.env.METRICS_ENABLED === 'true' || true,
    metricsInterval: parseInt(process.env.METRICS_INTERVAL || '60000', 10),
    alertsEnabled: process.env.ALERTS_ENABLED === 'true' || true
  },
  
  // Email configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true' || false,
    from: process.env.EMAIL_FROM || 'noreply@medtranslate.ai',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    }
  },
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Feature flags
  features: {
    mfa: process.env.FEATURE_MFA === 'true' || false,
    offlineMode: process.env.FEATURE_OFFLINE_MODE === 'true' || true,
    predictiveCache: process.env.FEATURE_PREDICTIVE_CACHE === 'true' || true,
    enhancedSecurity: process.env.FEATURE_ENHANCED_SECURITY === 'true' || false
  }
};

module.exports = config;
