/**
 * Test Database Utility for MedTranslate AI
 * 
 * This utility manages isolated test databases for testing.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const mongoose = require('mongoose');

// Configuration
const config = {
  mongodb: {
    uri: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/medtranslate-test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false
    }
  },
  dynamodb: {
    local: process.env.TEST_DYNAMODB_LOCAL === 'true',
    endpoint: process.env.TEST_DYNAMODB_ENDPOINT || 'http://localhost:8000',
    region: process.env.TEST_DYNAMODB_REGION || 'us-east-1',
    accessKeyId: process.env.TEST_DYNAMODB_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.TEST_DYNAMODB_SECRET_ACCESS_KEY || 'test'
  },
  s3: {
    local: process.env.TEST_S3_LOCAL === 'true',
    endpoint: process.env.TEST_S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.TEST_S3_REGION || 'us-east-1',
    accessKeyId: process.env.TEST_S3_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.TEST_S3_SECRET_ACCESS_KEY || 'test',
    bucket: process.env.TEST_S3_BUCKET || 'medtranslate-test'
  }
};

/**
 * Test Database class
 */
class TestDatabase {
  constructor(options = {}) {
    this.options = {
      ...options,
      databaseName: options.databaseName || `medtranslate-test-${uuidv4().split('-')[0]}`,
      tablePrefix: options.tablePrefix || `test_${uuidv4().split('-')[0]}_`,
      bucketPrefix: options.bucketPrefix || `test-${uuidv4().split('-')[0]}-`
    };
    
    this.mongoConnection = null;
    this.dynamodbClient = null;
    this.s3Client = null;
    
    this.createdTables = [];
    this.createdBuckets = [];
    
    this.isSetup = false;
  }
  
  /**
   * Set up the test database
   * 
   * @returns {Promise<void>}
   */
  async setup() {
    if (this.isSetup) {
      console.warn('Test database is already set up');
      return;
    }
    
    try {
      // Set up MongoDB
      if (this.options.useMongoDB !== false) {
        await this.setupMongoDB();
      }
      
      // Set up DynamoDB
      if (this.options.useDynamoDB !== false) {
        await this.setupDynamoDB();
      }
      
      // Set up S3
      if (this.options.useS3 !== false) {
        await this.setupS3();
      }
      
      this.isSetup = true;
      console.log('Test database set up successfully');
    } catch (error) {
      console.error('Error setting up test database:', error);
      await this.teardown();
      throw error;
    }
  }
  
  /**
   * Set up MongoDB
   * 
   * @returns {Promise<void>}
   */
  async setupMongoDB() {
    // Connect to MongoDB
    const uri = config.mongodb.uri.replace(
      /\/([^/]*)$/,
      `/${this.options.databaseName}`
    );
    
    this.mongoConnection = await mongoose.createConnection(uri, config.mongodb.options);
    console.log(`Connected to MongoDB: ${this.options.databaseName}`);
  }
  
  /**
   * Set up DynamoDB
   * 
   * @returns {Promise<void>}
   */
  async setupDynamoDB() {
    // Configure DynamoDB client
    const dynamodbConfig = {
      region: config.dynamodb.region
    };
    
    if (config.dynamodb.local) {
      dynamodbConfig.endpoint = config.dynamodb.endpoint;
      dynamodbConfig.accessKeyId = config.dynamodb.accessKeyId;
      dynamodbConfig.secretAccessKey = config.dynamodb.secretAccessKey;
    }
    
    this.dynamodbClient = new AWS.DynamoDB(dynamodbConfig);
    this.dynamodbDocClient = new AWS.DynamoDB.DocumentClient({
      service: this.dynamodbClient
    });
    
    console.log('Connected to DynamoDB');
  }
  
  /**
   * Set up S3
   * 
   * @returns {Promise<void>}
   */
  async setupS3() {
    // Configure S3 client
    const s3Config = {
      region: config.s3.region
    };
    
    if (config.s3.local) {
      s3Config.endpoint = config.s3.endpoint;
      s3Config.accessKeyId = config.s3.accessKeyId;
      s3Config.secretAccessKey = config.s3.secretAccessKey;
      s3Config.s3ForcePathStyle = true;
    }
    
    this.s3Client = new AWS.S3(s3Config);
    
    // Create test bucket
    const bucketName = `${this.options.bucketPrefix}${config.s3.bucket}`;
    
    try {
      await this.s3Client.createBucket({
        Bucket: bucketName
      }).promise();
      
      this.createdBuckets.push(bucketName);
      console.log(`Created S3 bucket: ${bucketName}`);
    } catch (error) {
      if (error.code === 'BucketAlreadyOwnedByYou') {
        this.createdBuckets.push(bucketName);
        console.log(`Using existing S3 bucket: ${bucketName}`);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Create a DynamoDB table
   * 
   * @param {string} tableName - Table name
   * @param {Object} keySchema - Key schema
   * @param {Array<Object>} attributeDefinitions - Attribute definitions
   * @returns {Promise<string>} - Full table name
   */
  async createTable(tableName, keySchema, attributeDefinitions) {
    const fullTableName = `${this.options.tablePrefix}${tableName}`;
    
    try {
      await this.dynamodbClient.createTable({
        TableName: fullTableName,
        KeySchema: keySchema,
        AttributeDefinitions: attributeDefinitions,
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }).promise();
      
      // Wait for table to be created
      await this.dynamodbClient.waitFor('tableExists', {
        TableName: fullTableName
      }).promise();
      
      this.createdTables.push(fullTableName);
      console.log(`Created DynamoDB table: ${fullTableName}`);
      
      return fullTableName;
    } catch (error) {
      if (error.code === 'ResourceInUseException') {
        this.createdTables.push(fullTableName);
        console.log(`Using existing DynamoDB table: ${fullTableName}`);
        return fullTableName;
      }
      
      throw error;
    }
  }
  
  /**
   * Create a MongoDB model
   * 
   * @param {string} modelName - Model name
   * @param {Object} schema - Mongoose schema
   * @returns {Object} - Mongoose model
   */
  createModel(modelName, schema) {
    if (!this.mongoConnection) {
      throw new Error('MongoDB is not set up');
    }
    
    return this.mongoConnection.model(modelName, schema);
  }
  
  /**
   * Seed data into the database
   * 
   * @param {Object} dataset - Test dataset
   * @returns {Promise<Object>} - Seeded data references
   */
  async seed(dataset) {
    if (!this.isSetup) {
      throw new Error('Test database is not set up');
    }
    
    const seededData = {};
    
    // Seed MongoDB
    if (this.mongoConnection && dataset.mongodb) {
      for (const [modelName, data] of Object.entries(dataset.mongodb)) {
        const model = this.mongoConnection.model(modelName);
        seededData.mongodb = seededData.mongodb || {};
        seededData.mongodb[modelName] = await model.insertMany(data);
        console.log(`Seeded ${data.length} documents into MongoDB model: ${modelName}`);
      }
    }
    
    // Seed DynamoDB
    if (this.dynamodbDocClient && dataset.dynamodb) {
      for (const [tableName, data] of Object.entries(dataset.dynamodb)) {
        const fullTableName = `${this.options.tablePrefix}${tableName}`;
        seededData.dynamodb = seededData.dynamodb || {};
        seededData.dynamodb[tableName] = [];
        
        for (const item of data) {
          await this.dynamodbDocClient.put({
            TableName: fullTableName,
            Item: item
          }).promise();
          
          seededData.dynamodb[tableName].push(item);
        }
        
        console.log(`Seeded ${data.length} items into DynamoDB table: ${fullTableName}`);
      }
    }
    
    // Seed S3
    if (this.s3Client && dataset.s3) {
      const bucketName = `${this.options.bucketPrefix}${config.s3.bucket}`;
      seededData.s3 = seededData.s3 || {};
      
      for (const [key, data] of Object.entries(dataset.s3)) {
        await this.s3Client.putObject({
          Bucket: bucketName,
          Key: key,
          Body: typeof data === 'string' ? data : JSON.stringify(data)
        }).promise();
        
        seededData.s3[key] = data;
      }
      
      console.log(`Seeded ${Object.keys(dataset.s3).length} objects into S3 bucket: ${bucketName}`);
    }
    
    return seededData;
  }
  
  /**
   * Tear down the test database
   * 
   * @returns {Promise<void>}
   */
  async teardown() {
    // Tear down MongoDB
    if (this.mongoConnection) {
      try {
        await this.mongoConnection.dropDatabase();
        await this.mongoConnection.close();
        console.log(`Dropped MongoDB database: ${this.options.databaseName}`);
      } catch (error) {
        console.error('Error tearing down MongoDB:', error);
      }
      
      this.mongoConnection = null;
    }
    
    // Tear down DynamoDB
    if (this.dynamodbClient) {
      try {
        for (const tableName of this.createdTables) {
          await this.dynamodbClient.deleteTable({
            TableName: tableName
          }).promise();
          console.log(`Deleted DynamoDB table: ${tableName}`);
        }
      } catch (error) {
        console.error('Error tearing down DynamoDB:', error);
      }
      
      this.dynamodbClient = null;
      this.dynamodbDocClient = null;
      this.createdTables = [];
    }
    
    // Tear down S3
    if (this.s3Client) {
      try {
        for (const bucketName of this.createdBuckets) {
          // Delete all objects in the bucket
          const objects = await this.s3Client.listObjectsV2({
            Bucket: bucketName
          }).promise();
          
          if (objects.Contents && objects.Contents.length > 0) {
            await this.s3Client.deleteObjects({
              Bucket: bucketName,
              Delete: {
                Objects: objects.Contents.map(obj => ({ Key: obj.Key }))
              }
            }).promise();
            console.log(`Deleted ${objects.Contents.length} objects from S3 bucket: ${bucketName}`);
          }
          
          // Delete the bucket
          await this.s3Client.deleteBucket({
            Bucket: bucketName
          }).promise();
          console.log(`Deleted S3 bucket: ${bucketName}`);
        }
      } catch (error) {
        console.error('Error tearing down S3:', error);
      }
      
      this.s3Client = null;
      this.createdBuckets = [];
    }
    
    this.isSetup = false;
    console.log('Test database torn down successfully');
  }
}

module.exports = {
  TestDatabase,
  config
};
