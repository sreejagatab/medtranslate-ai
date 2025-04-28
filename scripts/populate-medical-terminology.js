/**
 * Medical Terminology Database Populator for MedTranslate AI
 * 
 * This script populates the DynamoDB table with medical terminology
 * for accurate translation in healthcare settings.
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const TABLE_NAME = process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology';
const REGION = process.env.AWS_REGION || 'us-east-1';
const LOCAL_ENDPOINT = process.env.DYNAMODB_LOCAL_ENDPOINT || 'http://localhost:8000';
const USE_LOCAL = process.env.USE_LOCAL_DYNAMODB === 'true';
const BATCH_SIZE = 25; // DynamoDB batch write limit

// Configure AWS SDK
const dynamoDbConfig = {
  region: REGION
};

if (USE_LOCAL) {
  dynamoDbConfig.endpoint = LOCAL_ENDPOINT;
}

const dynamoDB = new AWS.DynamoDB.DocumentClient(dynamoDbConfig);

// Medical terminology data sources
const DATA_SOURCES = [
  {
    name: 'UMLS',
    path: path.join(__dirname, '../data/medical-terminology/umls_sample.csv'),
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ar']
  },
  {
    name: 'MedlinePlus',
    path: path.join(__dirname, '../data/medical-terminology/medlineplus_sample.csv'),
    languages: ['en', 'es']
  }
];

// Medical domains
const DOMAINS = [
  'cardiology',
  'neurology',
  'oncology',
  'pediatrics',
  'psychiatry',
  'radiology',
  'general'
];

/**
 * Create the medical terminology table if it doesn't exist
 * @returns {Promise<void>}
 */
async function createTableIfNotExists() {
  const dynamoDb = new AWS.DynamoDB({ region: REGION, ...(USE_LOCAL ? { endpoint: LOCAL_ENDPOINT } : {}) });
  
  try {
    // Check if table exists
    await dynamoDb.describeTable({ TableName: TABLE_NAME }).promise();
    console.log(`Table ${TABLE_NAME} already exists`);
    return;
  } catch (error) {
    if (error.code !== 'ResourceNotFoundException') {
      throw error;
    }
    
    // Create table
    console.log(`Creating table ${TABLE_NAME}...`);
    
    const params = {
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'term_source', KeyType: 'HASH' }, // Partition key
        { AttributeName: 'term_id', KeyType: 'RANGE' }     // Sort key
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
    };
    
    await dynamoDb.createTable(params).promise();
    console.log(`Table ${TABLE_NAME} created successfully`);
  }
}

/**
 * Load medical terminology from CSV file
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Array of terminology entries
 */
async function loadTerminologyFromCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      // Create sample data directory and file
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Create sample data
      const sampleData = createSampleData();
      fs.writeFileSync(filePath, sampleData);
      console.log(`Created sample data file: ${filePath}`);
    }
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Create sample medical terminology data
 * @returns {string} - CSV data
 */
function createSampleData() {
  const header = 'term_id,source_language,target_language,source_term,target_term,domain,definition,source\n';
  const terms = [
    // Cardiology terms
    'TERM001,en,es,heart attack,ataque cardíaco,cardiology,"A sudden blockage of blood flow to the heart muscle",UMLS',
    'TERM002,en,fr,heart attack,crise cardiaque,cardiology,"A sudden blockage of blood flow to the heart muscle",UMLS',
    'TERM003,en,es,blood pressure,presión arterial,cardiology,"The pressure of circulating blood against the walls of blood vessels",UMLS',
    'TERM004,en,fr,blood pressure,tension artérielle,cardiology,"The pressure of circulating blood against the walls of blood vessels",UMLS',
    'TERM005,en,es,hypertension,hipertensión,cardiology,"Abnormally high blood pressure",UMLS',
    'TERM006,en,fr,hypertension,hypertension,cardiology,"Abnormally high blood pressure",UMLS',
    
    // Neurology terms
    'TERM007,en,es,stroke,accidente cerebrovascular,neurology,"Sudden interruption of blood supply to the brain",UMLS',
    'TERM008,en,fr,stroke,accident vasculaire cérébral,neurology,"Sudden interruption of blood supply to the brain",UMLS',
    'TERM009,en,es,seizure,convulsión,neurology,"Sudden, uncontrolled electrical disturbance in the brain",UMLS',
    'TERM010,en,fr,seizure,crise d\'épilepsie,neurology,"Sudden, uncontrolled electrical disturbance in the brain",UMLS',
    
    // Oncology terms
    'TERM011,en,es,cancer,cáncer,oncology,"Disease in which abnormal cells divide uncontrollably",UMLS',
    'TERM012,en,fr,cancer,cancer,oncology,"Disease in which abnormal cells divide uncontrollably",UMLS',
    'TERM013,en,es,chemotherapy,quimioterapia,oncology,"Treatment that uses drugs to kill cancer cells",UMLS',
    'TERM014,en,fr,chemotherapy,chimiothérapie,oncology,"Treatment that uses drugs to kill cancer cells",UMLS',
    
    // General terms
    'TERM015,en,es,diabetes,diabetes,general,"A disease that occurs when blood glucose is too high",UMLS',
    'TERM016,en,fr,diabetes,diabète,general,"A disease that occurs when blood glucose is too high",UMLS',
    'TERM017,en,es,asthma,asma,general,"A condition that affects the airways in the lungs",UMLS',
    'TERM018,en,fr,asthma,asthme,general,"A condition that affects the airways in the lungs",UMLS',
    
    // Spanish to English
    'TERM019,es,en,ataque cardíaco,heart attack,cardiology,"Un bloqueo repentino del flujo sanguíneo al músculo cardíaco",UMLS',
    'TERM020,es,en,presión arterial,blood pressure,cardiology,"La presión de la sangre circulante contra las paredes de los vasos sanguíneos",UMLS',
    
    // French to English
    'TERM021,fr,en,crise cardiaque,heart attack,cardiology,"Un blocage soudain du flux sanguin vers le muscle cardiaque",UMLS',
    'TERM022,fr,en,tension artérielle,blood pressure,cardiology,"La pression du sang circulant contre les parois des vaisseaux sanguins",UMLS'
  ];
  
  return header + terms.join('\n');
}

/**
 * Write items to DynamoDB in batches
 * @param {Array} items - Items to write
 * @returns {Promise<void>}
 */
async function batchWriteItems(items) {
  // Split items into batches of 25 (DynamoDB limit)
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`Writing ${items.length} items in ${batches.length} batches...`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const params = {
      RequestItems: {
        [TABLE_NAME]: batch.map(item => ({
          PutRequest: {
            Item: item
          }
        }))
      }
    };
    
    try {
      await dynamoDB.batchWrite(params).promise();
      console.log(`Batch ${i + 1}/${batches.length} written successfully`);
    } catch (error) {
      console.error(`Error writing batch ${i + 1}:`, error);
      throw error;
    }
  }
}

/**
 * Process terminology data and write to DynamoDB
 * @param {Array} data - Terminology data
 * @param {string} source - Data source name
 * @returns {Promise<number>} - Number of items written
 */
async function processTerminologyData(data, source) {
  const items = [];
  
  for (const item of data) {
    const termId = item.term_id || uuidv4();
    const sourceLanguage = item.source_language;
    const targetLanguage = item.target_language;
    const sourceTerm = item.source_term;
    const targetTerm = item.target_term;
    const domain = item.domain || 'general';
    const definition = item.definition || '';
    
    // Skip if missing required fields
    if (!sourceLanguage || !targetLanguage || !sourceTerm || !targetTerm) {
      console.warn('Skipping item with missing required fields:', item);
      continue;
    }
    
    // Create item for DynamoDB
    const dbItem = {
      term_source: `${source}#${sourceLanguage}#${targetLanguage}`,
      term_id: termId,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      source_term: sourceTerm,
      target_term: targetTerm,
      domain: domain,
      definition: definition,
      data_source: source,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    items.push(dbItem);
    
    // Create reverse mapping (target to source)
    const reverseItem = {
      term_source: `${source}#${targetLanguage}#${sourceLanguage}`,
      term_id: `${termId}_reverse`,
      source_language: targetLanguage,
      target_language: sourceLanguage,
      source_term: targetTerm,
      target_term: sourceTerm,
      domain: domain,
      definition: definition,
      data_source: source,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    items.push(reverseItem);
  }
  
  // Write items to DynamoDB
  if (items.length > 0) {
    await batchWriteItems(items);
  }
  
  return items.length;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting medical terminology database population...');
    
    // Create table if it doesn't exist
    await createTableIfNotExists();
    
    let totalItems = 0;
    
    // Process each data source
    for (const source of DATA_SOURCES) {
      console.log(`Processing data source: ${source.name}`);
      
      try {
        const data = await loadTerminologyFromCsv(source.path);
        console.log(`Loaded ${data.length} items from ${source.path}`);
        
        const itemsWritten = await processTerminologyData(data, source.name);
        totalItems += itemsWritten;
        
        console.log(`Processed ${itemsWritten} items from ${source.name}`);
      } catch (error) {
        console.error(`Error processing ${source.name}:`, error);
      }
    }
    
    console.log(`Medical terminology database population completed. Total items: ${totalItems}`);
  } catch (error) {
    console.error('Error populating medical terminology database:', error);
    process.exit(1);
  }
}

// Run the main function
main();
