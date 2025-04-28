/**
 * DynamoDB Initialization Script for MedTranslate AI
 * 
 * This script creates the required DynamoDB tables for local development.
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');

// Configure AWS SDK for local DynamoDB
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local'
});

// Create DynamoDB client
const dynamoDB = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

// Table definitions
const TABLES = [
  {
    TableName: 'MedTranslateProviders-local',
    KeySchema: [
      { AttributeName: 'username', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'username', AttributeType: 'S' },
      { AttributeName: 'providerId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'ProviderIdIndex',
        KeySchema: [
          { AttributeName: 'providerId', KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
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
    TableName: 'MedTranslateSessions-local',
    KeySchema: [
      { AttributeName: 'sessionId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'sessionId', AttributeType: 'S' },
      { AttributeName: 'sessionCode', AttributeType: 'S' },
      { AttributeName: 'providerId', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'SessionCodeIndex',
        KeySchema: [
          { AttributeName: 'sessionCode', KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: 'ProviderSessionsIndex',
        KeySchema: [
          { AttributeName: 'providerId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
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
      { AttributeName: 'term_source', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'term_source', AttributeType: 'S' },
      { AttributeName: 'domain', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'DomainIndex',
        KeySchema: [
          { AttributeName: 'domain', KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
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

// Sample data
const SAMPLE_PROVIDERS = [
  {
    username: 'drsmith',
    password: hashPassword('password123', 'salt1'),
    salt: 'salt1',
    providerId: 'provider-1',
    name: 'Dr. John Smith',
    role: 'doctor',
    specialty: 'cardiology',
    email: 'drsmith@example.com',
    createdAt: new Date().toISOString()
  },
  {
    username: 'drjones',
    password: hashPassword('password123', 'salt2'),
    salt: 'salt2',
    providerId: 'provider-2',
    name: 'Dr. Sarah Jones',
    role: 'doctor',
    specialty: 'neurology',
    email: 'drjones@example.com',
    createdAt: new Date().toISOString()
  },
  {
    username: 'demo',
    password: hashPassword('demo123', 'salt3'),
    salt: 'salt3',
    providerId: 'provider-demo',
    name: 'Demo Provider',
    role: 'doctor',
    specialty: 'general',
    email: 'demo@example.com',
    createdAt: new Date().toISOString()
  }
];

// Sample medical terminology
const SAMPLE_MEDICAL_TERMS = [
  {
    term_source: 'en:headache',
    domain: 'general',
    translations: {
      es: 'dolor de cabeza',
      fr: 'mal de tête',
      de: 'Kopfschmerzen'
    }
  },
  {
    term_source: 'en:fever',
    domain: 'general',
    translations: {
      es: 'fiebre',
      fr: 'fièvre',
      de: 'Fieber'
    }
  },
  {
    term_source: 'en:heart attack',
    domain: 'cardiology',
    translations: {
      es: 'ataque cardíaco',
      fr: 'crise cardiaque',
      de: 'Herzinfarkt'
    }
  }
];

// Helper function to hash password
function hashPassword(password, salt) {
  return crypto
    .createHmac('sha256', salt)
    .update(password)
    .digest('hex');
}

// Create tables
async function createTables() {
  for (const tableDefinition of TABLES) {
    try {
      console.log(`Creating table: ${tableDefinition.TableName}`);
      await dynamoDB.createTable(tableDefinition).promise();
      console.log(`Table created: ${tableDefinition.TableName}`);
    } catch (error) {
      if (error.code === 'ResourceInUseException') {
        console.log(`Table already exists: ${tableDefinition.TableName}`);
      } else {
        console.error(`Error creating table ${tableDefinition.TableName}:`, error);
      }
    }
  }
}

// Insert sample data
async function insertSampleData() {
  // Wait for tables to be active
  console.log('Waiting for tables to be active...');
  for (const tableDefinition of TABLES) {
    let tableActive = false;
    while (!tableActive) {
      try {
        const result = await dynamoDB.describeTable({ TableName: tableDefinition.TableName }).promise();
        tableActive = result.Table.TableStatus === 'ACTIVE';
        if (!tableActive) {
          console.log(`Waiting for ${tableDefinition.TableName} to be active...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error checking table status for ${tableDefinition.TableName}:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Insert providers
  for (const provider of SAMPLE_PROVIDERS) {
    try {
      console.log(`Inserting provider: ${provider.username}`);
      await docClient.put({
        TableName: 'MedTranslateProviders-local',
        Item: provider
      }).promise();
    } catch (error) {
      console.error(`Error inserting provider ${provider.username}:`, error);
    }
  }

  // Insert medical terms
  for (const term of SAMPLE_MEDICAL_TERMS) {
    try {
      console.log(`Inserting medical term: ${term.term_source}`);
      await docClient.put({
        TableName: 'MedicalTerminology-local',
        Item: term
      }).promise();
    } catch (error) {
      console.error(`Error inserting medical term ${term.term_source}:`, error);
    }
  }
}

// Main function
async function main() {
  try {
    await createTables();
    await insertSampleData();
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the script
main();
