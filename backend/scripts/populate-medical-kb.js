/**
 * Script to populate the Medical Terminology Knowledge Base
 * 
 * This script populates the DynamoDB table with medical terminology
 * for various specialties and languages.
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Configure AWS SDK
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
});

// Table name
const TABLE_NAME = process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology';

// Supported languages
const LANGUAGES = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'ru', 'pt', 'hi'];

// Medical specialties
const SPECIALTIES = [
  'general',
  'cardiology',
  'neurology',
  'gastroenterology',
  'pulmonology',
  'orthopedics',
  'oncology',
  'pediatrics',
  'psychiatry',
  'obstetrics',
  'gynecology',
  'dermatology',
  'ophthalmology',
  'urology',
  'endocrinology',
  'immunology',
  'infectious_disease',
  'rheumatology',
  'anesthesiology',
  'pathology',
  'pharmacy'
];

/**
 * Main function to populate the database
 */
async function populateDatabase() {
  try {
    console.log(`Starting to populate ${TABLE_NAME} table...`);

    // Check if table exists
    await checkTableExists();

    // Process each specialty
    for (const specialty of SPECIALTIES) {
      console.log(`Processing ${specialty} terminology...`);
      await processSpecialty(specialty);
    }

    console.log('Database population completed successfully!');
  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
}

/**
 * Check if the DynamoDB table exists
 */
async function checkTableExists() {
  try {
    const dynamoDb = new AWS.DynamoDB({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
    });

    const tables = await dynamoDb.listTables().promise();
    
    if (!tables.TableNames.includes(TABLE_NAME)) {
      console.log(`Table ${TABLE_NAME} does not exist. Creating...`);
      
      const params = {
        TableName: TABLE_NAME,
        KeySchema: [
          { AttributeName: 'term_source', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'term_source', AttributeType: 'S' }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      };
      
      await dynamoDb.createTable(params).promise();
      console.log(`Table ${TABLE_NAME} created successfully!`);
      
      // Wait for table to be active
      console.log('Waiting for table to become active...');
      await dynamoDb.waitFor('tableExists', { TableName: TABLE_NAME }).promise();
      console.log('Table is now active.');
    } else {
      console.log(`Table ${TABLE_NAME} already exists.`);
    }
  } catch (error) {
    console.error('Error checking/creating table:', error);
    throw error;
  }
}

/**
 * Process terminology for a specific medical specialty
 * 
 * @param {string} specialty - The medical specialty
 */
async function processSpecialty(specialty) {
  try {
    const dataPath = path.join(__dirname, '..', 'data', 'medical-terminology', `${specialty}.csv`);
    
    // Check if file exists
    if (!fs.existsSync(dataPath)) {
      console.log(`No data file found for ${specialty}. Creating sample data...`);
      await createSampleData(specialty);
      return;
    }
    
    // Process CSV file
    const terms = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(dataPath)
        .pipe(csv())
        .on('data', (row) => {
          terms.push(row);
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    console.log(`Loaded ${terms.length} terms for ${specialty}`);
    
    // Process terms in batches to avoid DynamoDB limits
    const BATCH_SIZE = 25;
    for (let i = 0; i < terms.length; i += BATCH_SIZE) {
      const batch = terms.slice(i, i + BATCH_SIZE);
      await processBatch(batch, specialty);
      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(terms.length / BATCH_SIZE)}`);
    }
  } catch (error) {
    console.error(`Error processing ${specialty}:`, error);
    throw error;
  }
}

/**
 * Process a batch of terms
 * 
 * @param {Array} batch - Batch of terms to process
 * @param {string} specialty - The medical specialty
 */
async function processBatch(batch, specialty) {
  try {
    const writeRequests = batch.map(term => {
      // Extract translations from the term object
      const translations = [];
      
      for (const lang of LANGUAGES) {
        if (lang !== 'en' && term[lang]) {
          translations.push({
            language: lang,
            term: term[lang],
            confidence: 'high'
          });
        }
      }
      
      // Create item for DynamoDB
      return {
        PutRequest: {
          Item: {
            term_source: `${term.en.toLowerCase()}:en`,
            term: term.en,
            language: 'en',
            domain: specialty,
            definition: term.definition || '',
            translations,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      };
    });
    
    // Split into chunks of 25 (DynamoDB batch write limit)
    const chunks = [];
    for (let i = 0; i < writeRequests.length; i += 25) {
      chunks.push(writeRequests.slice(i, i + 25));
    }
    
    // Process each chunk
    for (const chunk of chunks) {
      const params = {
        RequestItems: {
          [TABLE_NAME]: chunk
        }
      };
      
      await dynamoDB.batchWrite(params).promise();
    }
  } catch (error) {
    console.error('Error processing batch:', error);
    throw error;
  }
}

/**
 * Create sample data for a specialty if no data file exists
 * 
 * @param {string} specialty - The medical specialty
 */
async function createSampleData(specialty) {
  try {
    // Create directory if it doesn't exist
    const dirPath = path.join(__dirname, '..', 'data', 'medical-terminology');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Sample data based on specialty
    let sampleTerms = [];
    
    switch (specialty) {
      case 'cardiology':
        sampleTerms = [
          { en: 'heart attack', es: 'ataque cardíaco', fr: 'crise cardiaque', de: 'Herzinfarkt', definition: 'Damage to heart muscle from insufficient blood supply' },
          { en: 'arrhythmia', es: 'arritmia', fr: 'arythmie', de: 'Arrhythmie', definition: 'Irregular heartbeat' },
          { en: 'hypertension', es: 'hipertensión', fr: 'hypertension', de: 'Hypertonie', definition: 'High blood pressure' },
          { en: 'angina', es: 'angina', fr: 'angine', de: 'Angina', definition: 'Chest pain due to reduced blood flow to the heart' },
          { en: 'atrial fibrillation', es: 'fibrilación auricular', fr: 'fibrillation auriculaire', de: 'Vorhofflimmern', definition: 'Irregular and rapid heart rate' }
        ];
        break;
        
      case 'neurology':
        sampleTerms = [
          { en: 'stroke', es: 'derrame cerebral', fr: 'accident vasculaire cérébral', de: 'Schlaganfall', definition: 'Brain damage from interrupted blood supply' },
          { en: 'epilepsy', es: 'epilepsia', fr: 'épilepsie', de: 'Epilepsie', definition: 'Neurological disorder characterized by seizures' },
          { en: 'multiple sclerosis', es: 'esclerosis múltiple', fr: 'sclérose en plaques', de: 'Multiple Sklerose', definition: 'Disease affecting nerve cells in brain and spinal cord' },
          { en: 'migraine', es: 'migraña', fr: 'migraine', de: 'Migräne', definition: 'Recurring severe headache' },
          { en: 'parkinson disease', es: 'enfermedad de parkinson', fr: 'maladie de parkinson', de: 'Parkinson-Krankheit', definition: 'Progressive nervous system disorder affecting movement' }
        ];
        break;
        
      case 'gastroenterology':
        sampleTerms = [
          { en: 'gastritis', es: 'gastritis', fr: 'gastrite', de: 'Gastritis', definition: 'Inflammation of the stomach lining' },
          { en: 'ulcerative colitis', es: 'colitis ulcerosa', fr: 'colite ulcéreuse', de: 'Colitis ulcerosa', definition: 'Inflammatory bowel disease' },
          { en: 'cirrhosis', es: 'cirrosis', fr: 'cirrhose', de: 'Zirrhose', definition: 'Late stage scarring of the liver' },
          { en: 'gallstone', es: 'cálculo biliar', fr: 'calcul biliaire', de: 'Gallenstein', definition: 'Hardened deposit in the gallbladder' },
          { en: 'irritable bowel syndrome', es: 'síndrome del intestino irritable', fr: 'syndrome du côlon irritable', de: 'Reizdarmsyndrom', definition: 'Common disorder affecting the large intestine' }
        ];
        break;
        
      // Add more specialties as needed
      
      default:
        // General medical terms
        sampleTerms = [
          { en: 'fever', es: 'fiebre', fr: 'fièvre', de: 'Fieber', definition: 'Elevated body temperature' },
          { en: 'inflammation', es: 'inflamación', fr: 'inflammation', de: 'Entzündung', definition: 'Part of the body\'s immune response' },
          { en: 'infection', es: 'infección', fr: 'infection', de: 'Infektion', definition: 'Invasion of tissue by pathogens' },
          { en: 'allergy', es: 'alergia', fr: 'allergie', de: 'Allergie', definition: 'Hypersensitive immune response' },
          { en: 'diabetes', es: 'diabetes', fr: 'diabète', de: 'Diabetes', definition: 'Group of metabolic disorders characterized by high blood sugar' }
        ];
    }
    
    // Write sample data to CSV file
    const csvPath = path.join(dirPath, `${specialty}.csv`);
    const headers = ['en', 'es', 'fr', 'de', 'definition'];
    
    const csvContent = [
      headers.join(','),
      ...sampleTerms.map(term => headers.map(h => term[h] ? `"${term[h]}"` : '').join(','))
    ].join('\n');
    
    fs.writeFileSync(csvPath, csvContent);
    console.log(`Created sample data file for ${specialty} at ${csvPath}`);
    
    // Process the sample data
    await processSpecialty(specialty);
  } catch (error) {
    console.error(`Error creating sample data for ${specialty}:`, error);
    throw error;
  }
}

// Run the script
populateDatabase().then(() => {
  console.log('Script completed successfully!');
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
