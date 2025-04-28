/**
 * Setup Local DynamoDB for MedTranslate AI
 * 
 * This script sets up a local DynamoDB instance for development.
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configuration
const LOCAL_ENDPOINT = 'http://localhost:8000';
const TABLES = [
  {
    TableName: 'MedTranslateSessions-local',
    KeySchema: [
      { AttributeName: 'session_id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'session_id', AttributeType: 'S' },
      { AttributeName: 'provider_id', AttributeType: 'S' },
      { AttributeName: 'created_at', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'ProviderSessionsIndex',
        KeySchema: [
          { AttributeName: 'provider_id', KeyType: 'HASH' },
          { AttributeName: 'created_at', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  {
    TableName: 'MedicalTerminology-local',
    KeySchema: [
      { AttributeName: 'term_source', KeyType: 'HASH' },
      { AttributeName: 'term_id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'term_source', AttributeType: 'S' },
      { AttributeName: 'term_id', AttributeType: 'S' },
      { AttributeName: 'domain', AttributeType: 'S' },
      { AttributeName: 'source_language', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'DomainIndex',
        KeySchema: [
          { AttributeName: 'domain', KeyType: 'HASH' },
          { AttributeName: 'term_id', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: 'LanguageIndex',
        KeySchema: [
          { AttributeName: 'source_language', KeyType: 'HASH' },
          { AttributeName: 'term_id', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  {
    TableName: 'MedTranslateUsers-local',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'username', AttributeType: 'S' },
      { AttributeName: 'user_type', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: 'UsernameIndex',
        KeySchema: [
          { AttributeName: 'username', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: 'UserTypeIndex',
        KeySchema: [
          { AttributeName: 'user_type', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  {
    TableName: 'TranslationHistory-local',
    KeySchema: [
      { AttributeName: 'translation_id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'translation_id', AttributeType: 'S' },
      { AttributeName: 'session_id', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'SessionTranslationsIndex',
        KeySchema: [
          { AttributeName: 'session_id', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  {
    TableName: 'MedTranslateAnalytics-local',
    KeySchema: [
      { AttributeName: 'event_id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'event_id', AttributeType: 'S' },
      { AttributeName: 'event_type', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' },
      { AttributeName: 'year_month', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EventTypeIndex',
        KeySchema: [
          { AttributeName: 'event_type', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: 'TimestampIndex',
        KeySchema: [
          { AttributeName: 'year_month', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  }
];

// Configure DynamoDB
const dynamoDB = new AWS.DynamoDB({
  endpoint: LOCAL_ENDPOINT,
  region: 'local',
  accessKeyId: 'local',
  secretAccessKey: 'local'
});

/**
 * Create DynamoDB tables
 */
async function createTables() {
  console.log('Creating DynamoDB tables...');
  
  for (const tableConfig of TABLES) {
    try {
      // Check if table exists
      try {
        await dynamoDB.describeTable({ TableName: tableConfig.TableName }).promise();
        console.log(`Table ${tableConfig.TableName} already exists`);
        continue;
      } catch (error) {
        if (error.code !== 'ResourceNotFoundException') {
          throw error;
        }
      }
      
      // Create table
      console.log(`Creating table ${tableConfig.TableName}...`);
      await dynamoDB.createTable(tableConfig).promise();
      console.log(`Table ${tableConfig.TableName} created successfully`);
    } catch (error) {
      console.error(`Error creating table ${tableConfig.TableName}:`, error);
    }
  }
}

/**
 * List DynamoDB tables
 */
async function listTables() {
  try {
    const result = await dynamoDB.listTables().promise();
    console.log('DynamoDB tables:');
    result.TableNames.forEach(tableName => {
      console.log(`- ${tableName}`);
    });
  } catch (error) {
    console.error('Error listing tables:', error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Setting up local DynamoDB...');
    
    // Check if DynamoDB is running
    try {
      await dynamoDB.listTables().promise();
      console.log('Local DynamoDB is running');
    } catch (error) {
      console.error('Error connecting to local DynamoDB:', error);
      console.log('Please make sure DynamoDB Local is running on http://localhost:8000');
      console.log('You can download and run DynamoDB Local from: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html');
      process.exit(1);
    }
    
    // Create tables
    await createTables();
    
    // List tables
    await listTables();
    
    console.log('Local DynamoDB setup completed successfully!');
  } catch (error) {
    console.error('Error setting up local DynamoDB:', error);
    process.exit(1);
  }
}

// Run the main function
main();
