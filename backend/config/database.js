/**
 * Database Configuration for MedTranslate AI
 * 
 * This module provides configuration for database connections,
 * including DynamoDB settings with proper encryption.
 */

const AWS = require('aws-sdk');

// Load environment variables
const isProduction = process.env.NODE_ENV === 'production';
const region = process.env.AWS_REGION || 'us-east-1';

// Configure AWS SDK
AWS.config.update({
  region,
  maxRetries: 3,
  httpOptions: {
    timeout: 5000,
    connectTimeout: 3000
  }
});

// DynamoDB configuration
const dynamoConfig = {
  // Use local DynamoDB in development if specified
  endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  
  // Enable encryption at rest
  encryption: true,
  
  // Enable point-in-time recovery for production
  pointInTimeRecovery: isProduction,
  
  // Table configuration
  tables: {
    users: {
      name: process.env.USERS_TABLE || 'medtranslate-users',
      hashKey: 'id',
      indexes: [
        {
          name: 'EmailIndex',
          hashKey: 'email',
          type: 'global'
        }
      ],
      encryption: true,
      ttl: {
        enabled: false
      }
    },
    sessions: {
      name: process.env.SESSIONS_TABLE || 'medtranslate-sessions',
      hashKey: 'sessionId',
      indexes: [
        {
          name: 'SessionCodeIndex',
          hashKey: 'sessionCode',
          type: 'global'
        },
        {
          name: 'ProviderIndex',
          hashKey: 'providerId',
          type: 'global'
        }
      ],
      encryption: true,
      ttl: {
        enabled: true,
        attributeName: 'expiresAt'
      }
    },
    mfa: {
      name: process.env.MFA_TABLE || 'medtranslate-mfa',
      hashKey: 'userId',
      encryption: true,
      ttl: {
        enabled: false
      }
    },
    translations: {
      name: process.env.TRANSLATIONS_TABLE || 'medtranslate-translations',
      hashKey: 'id',
      rangeKey: 'timestamp',
      indexes: [
        {
          name: 'SessionIndex',
          hashKey: 'sessionId',
          rangeKey: 'timestamp',
          type: 'global'
        }
      ],
      encryption: true,
      ttl: {
        enabled: true,
        attributeName: 'expiresAt'
      }
    },
    medicalTerms: {
      name: process.env.MEDICAL_TERMS_TABLE || 'medtranslate-medical-terms',
      hashKey: 'termId',
      indexes: [
        {
          name: 'LanguageIndex',
          hashKey: 'language',
          rangeKey: 'term',
          type: 'global'
        },
        {
          name: 'SpecialtyIndex',
          hashKey: 'specialty',
          rangeKey: 'term',
          type: 'global'
        }
      ],
      encryption: true,
      ttl: {
        enabled: false
      }
    }
  }
};

/**
 * Create DynamoDB client with proper configuration
 * 
 * @returns {AWS.DynamoDB.DocumentClient} - Configured DynamoDB client
 */
function createDynamoDBClient() {
  // Configure client options
  const clientOptions = {
    region,
    convertEmptyValues: true
  };
  
  // Add endpoint for local development if specified
  if (dynamoConfig.endpoint) {
    clientOptions.endpoint = dynamoConfig.endpoint;
  }
  
  // Create DynamoDB document client
  return new AWS.DynamoDB.DocumentClient(clientOptions);
}

/**
 * Create DynamoDB table with encryption and other security features
 * 
 * @param {string} tableName - Table name
 * @param {Object} tableConfig - Table configuration
 * @returns {Promise<Object>} - Table creation result
 */
async function createTable(tableName, tableConfig) {
  const dynamodb = new AWS.DynamoDB({ region });
  
  // Define key schema
  const keySchema = [
    { AttributeName: tableConfig.hashKey, KeyType: 'HASH' }
  ];
  
  if (tableConfig.rangeKey) {
    keySchema.push({ AttributeName: tableConfig.rangeKey, KeyType: 'RANGE' });
  }
  
  // Define attribute definitions
  const attributeDefinitions = [
    { AttributeName: tableConfig.hashKey, AttributeType: 'S' }
  ];
  
  if (tableConfig.rangeKey) {
    attributeDefinitions.push({ AttributeName: tableConfig.rangeKey, AttributeType: 'S' });
  }
  
  // Add index attributes
  if (tableConfig.indexes) {
    tableConfig.indexes.forEach(index => {
      if (!attributeDefinitions.some(attr => attr.AttributeName === index.hashKey)) {
        attributeDefinitions.push({ AttributeName: index.hashKey, AttributeType: 'S' });
      }
      
      if (index.rangeKey && !attributeDefinitions.some(attr => attr.AttributeName === index.rangeKey)) {
        attributeDefinitions.push({ AttributeName: index.rangeKey, AttributeType: 'S' });
      }
    });
  }
  
  // Define global secondary indexes
  const globalSecondaryIndexes = tableConfig.indexes
    ? tableConfig.indexes
      .filter(index => index.type === 'global')
      .map(index => {
        const indexKeySchema = [
          { AttributeName: index.hashKey, KeyType: 'HASH' }
        ];
        
        if (index.rangeKey) {
          indexKeySchema.push({ AttributeName: index.rangeKey, KeyType: 'RANGE' });
        }
        
        return {
          IndexName: index.name,
          KeySchema: indexKeySchema,
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        };
      })
    : [];
  
  // Create table params
  const params = {
    TableName: tableName,
    KeySchema: keySchema,
    AttributeDefinitions: attributeDefinitions,
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    },
    SSESpecification: {
      Enabled: tableConfig.encryption === true,
      SSEType: 'KMS',
      KMSMasterKeyId: process.env.KMS_KEY_ID || 'alias/aws/dynamodb'
    },
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: tableConfig.pointInTimeRecovery === true
    }
  };
  
  // Add global secondary indexes if defined
  if (globalSecondaryIndexes.length > 0) {
    params.GlobalSecondaryIndexes = globalSecondaryIndexes;
  }
  
  // Add TTL if enabled
  if (tableConfig.ttl && tableConfig.ttl.enabled) {
    // TTL must be enabled after table creation
    // This is just for documentation purposes
    console.log(`TTL will be enabled for ${tableName} on attribute ${tableConfig.ttl.attributeName}`);
  }
  
  try {
    const result = await dynamodb.createTable(params).promise();
    console.log(`Created table ${tableName}`);
    
    // Enable TTL if specified
    if (tableConfig.ttl && tableConfig.ttl.enabled) {
      await dynamodb.updateTimeToLive({
        TableName: tableName,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: tableConfig.ttl.attributeName
        }
      }).promise();
      console.log(`Enabled TTL for ${tableName} on attribute ${tableConfig.ttl.attributeName}`);
    }
    
    return result;
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`Table ${tableName} already exists`);
      return { TableDescription: { TableName: tableName } };
    }
    throw error;
  }
}

module.exports = {
  dynamoConfig,
  createDynamoDBClient,
  createTable
};
