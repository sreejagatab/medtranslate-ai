/**
 * Medical Terminology Database Populator for MedTranslate AI
 *
 * This script populates the DynamoDB table with comprehensive medical terminology
 * for accurate translation in healthcare settings. It supports multiple data sources
 * and languages, with specialized medical domains for context-aware translation.
 *
 * Usage:
 *   node populate-medical-terminology-full.js [--source=SOURCE_NAME] [--domain=DOMAIN_NAME] [--local] [--sample]
 *
 * Options:
 *   --source: Specify a single data source to process (default: all sources)
 *   --domain: Specify a single medical domain to process (default: all domains)
 *   --local: Use local DynamoDB instance (default: false)
 *   --sample: Generate sample data only (default: false)
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env.development') });

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.replace('--', '')] = value;
  } else if (key) {
    acc[key.replace('--', '')] = true;
  }
  return acc;
}, {});

// Configuration
const USE_LOCAL_DYNAMODB = args.local || false;
const SAMPLE_ONLY = args.sample || false;
const SPECIFIC_SOURCE = args.source || null;
const SPECIFIC_DOMAIN = args.domain || null;
const TABLE_NAME = process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology-dev';
const BATCH_SIZE = 25; // DynamoDB batch write limit

// Configure AWS SDK
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1'
};

// Use local DynamoDB if specified
if (USE_LOCAL_DYNAMODB) {
  awsConfig.endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
}

AWS.config.update(awsConfig);
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Medical terminology data sources
const DATA_SOURCES = [
  {
    name: 'UMLS',
    path: path.join(__dirname, '../data/medical-terminology/umls_sample.csv'),
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ar', 'ru'],
    description: 'Unified Medical Language System - comprehensive medical terminology'
  },
  {
    name: 'MedlinePlus',
    path: path.join(__dirname, '../data/medical-terminology/medlineplus_sample.csv'),
    languages: ['en', 'es', 'fr', 'de', 'zh'],
    description: 'MedlinePlus - consumer health information'
  },
  {
    name: 'SNOMED',
    path: path.join(__dirname, '../data/medical-terminology/snomed_sample.csv'),
    languages: ['en', 'es', 'fr', 'de', 'nl', 'sv', 'da'],
    description: 'SNOMED CT - clinical terminology'
  },
  {
    name: 'ICD10',
    path: path.join(__dirname, '../data/medical-terminology/icd10_sample.csv'),
    languages: ['en', 'es', 'fr', 'de', 'it', 'ru', 'zh', 'ar', 'ja'],
    description: 'International Classification of Diseases - diagnostic codes'
  },
  {
    name: 'RxNorm',
    path: path.join(__dirname, '../data/medical-terminology/rxnorm_sample.csv'),
    languages: ['en', 'es', 'fr', 'de'],
    description: 'RxNorm - normalized names for clinical drugs'
  },
  {
    name: 'LOINC',
    path: path.join(__dirname, '../data/medical-terminology/loinc_sample.csv'),
    languages: ['en', 'es', 'fr', 'it', 'zh'],
    description: 'Logical Observation Identifiers Names and Codes - lab tests and observations'
  }
];

// Medical domains
const MEDICAL_DOMAINS = [
  'general',
  'cardiology',
  'neurology',
  'oncology',
  'pediatrics',
  'psychiatry',
  'radiology',
  'emergency',
  'surgery',
  'obstetrics',
  'gynecology',
  'orthopedics',
  'dermatology',
  'ophthalmology',
  'urology',
  'endocrinology',
  'gastroenterology',
  'pulmonology',
  'nephrology',
  'hematology',
  'immunology',
  'infectious_disease',
  'rheumatology',
  'anesthesiology',
  'pathology',
  'pharmacy'
];

/**
 * Create the DynamoDB table if it doesn't exist
 */
async function createTableIfNotExists() {
  // Skip table creation if using local DynamoDB
  if (USE_LOCAL_DYNAMODB) {
    console.log(`Using local DynamoDB table: ${TABLE_NAME}`);
    return;
  }

  const dynamoDb = new AWS.DynamoDB();

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
        { AttributeName: 'term_source', KeyType: 'HASH' } // Partition key
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
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        }
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    };

    await dynamoDb.createTable(params).promise();
    console.log(`Table ${TABLE_NAME} created successfully`);

    // Wait for table to become active
    console.log('Waiting for table to become active...');
    await dynamoDb.waitFor('tableExists', { TableName: TABLE_NAME }).promise();
    console.log('Table is now active');
  }
}

/**
 * Load terminology data from CSV file
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Array of terminology data
 */
async function loadTerminologyFromCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      // Create sample data directory and file
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Get source name from file path
      const fileName = path.basename(filePath);
      const sourceName = fileName.split('_')[0].toUpperCase();

      // Find matching source in DATA_SOURCES
      const source = DATA_SOURCES.find(s => s.name === sourceName) || DATA_SOURCES[0];

      // Create sample data
      const sampleData = createSampleData(source.name, source.languages);
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
 * Process terminology data and write to DynamoDB
 * @param {Array} data - Array of terminology data
 * @param {string} source - Data source name
 * @returns {Promise<number>} - Number of items written
 */
async function processTerminologyData(data, source) {
  let itemsWritten = 0;
  const batches = [];
  let currentBatch = [];

  for (const item of data) {
    // Skip if specific domain is specified and doesn't match
    if (SPECIFIC_DOMAIN && item.domain !== SPECIFIC_DOMAIN) {
      continue;
    }

    // Extract data from CSV row
    const {
      term_id: termId,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      source_term: sourceTerm,
      target_term: targetTerm,
      domain,
      definition
    } = item;

    // Skip if missing required fields
    if (!sourceLanguage || !targetLanguage || !sourceTerm || !targetTerm) {
      continue;
    }

    // Create term_source key
    const termSource = `${sourceTerm.toLowerCase()}:${sourceLanguage}`;

    // Check if term already exists
    try {
      const existingItem = await dynamoDB.get({
        TableName: TABLE_NAME,
        Key: { term_source: termSource }
      }).promise();

      if (existingItem.Item) {
        // Update existing item
        const translations = existingItem.Item.translations || [];
        const existingTranslation = translations.find(t => t.language === targetLanguage);

        if (existingTranslation) {
          // Skip if translation already exists
          continue;
        }

        // Add new translation
        translations.push({
          language: targetLanguage,
          term: targetTerm,
          confidence: 'high'
        });

        await dynamoDB.update({
          TableName: TABLE_NAME,
          Key: { term_source: termSource },
          UpdateExpression: 'SET translations = :translations, updated_at = :updated_at',
          ExpressionAttributeValues: {
            ':translations': translations,
            ':updated_at': new Date().toISOString()
          }
        }).promise();

        itemsWritten++;
        continue;
      }
    } catch (error) {
      // Ignore errors and proceed with batch write
      console.error(`Error checking existing item: ${error.message}`);
    }

    // Create item for DynamoDB
    const dbItem = {
      PutRequest: {
        Item: {
          term_source: termSource,
          term: sourceTerm,
          language: sourceLanguage,
          domain: domain || 'general',
          translations: [
            {
              language: targetLanguage,
              term: targetTerm,
              confidence: 'high'
            }
          ],
          definition: definition || '',
          data_source: source,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    };

    currentBatch.push(dbItem);

    // If batch is full, add to batches array and start a new batch
    if (currentBatch.length === BATCH_SIZE) {
      batches.push([...currentBatch]);
      currentBatch = [];
    }
  }

  // Add remaining items to batches
  if (currentBatch.length > 0) {
    batches.push([...currentBatch]);
  }

  // Process batches
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} items)...`);

    try {
      await dynamoDB.batchWrite({
        RequestItems: {
          [TABLE_NAME]: batch
        }
      }).promise();

      itemsWritten += batch.length;
    } catch (error) {
      console.error(`Error writing batch: ${error.message}`);
      
      // Try writing items individually
      for (const item of batch) {
        try {
          await dynamoDB.put({
            TableName: TABLE_NAME,
            Item: item.PutRequest.Item
          }).promise();

          itemsWritten++;
        } catch (itemError) {
          console.error(`Error writing item: ${itemError.message}`);
        }
      }
    }
  }

  return itemsWritten;
}

/**
 * Create sample medical terminology data for a specific source
 * @param {string} source - Data source name
 * @param {Array} languages - Supported languages
 * @returns {string} - CSV data
 */
function createSampleData(source = 'UMLS', languages = ['en', 'es', 'fr']) {
  const header = 'term_id,source_language,target_language,source_term,target_term,domain,definition,source\n';

  // Base terms by domain
  const termsByDomain = {
    cardiology: [
      { en: 'heart attack', es: 'ataque cardíaco', fr: 'crise cardiaque', de: 'Herzinfarkt', zh: '心脏病发作', ru: 'сердечный приступ',
        definition: 'A sudden blockage of blood flow to the heart muscle' },
      { en: 'blood pressure', es: 'presión arterial', fr: 'tension artérielle', de: 'Blutdruck', zh: '血压', ru: 'кровяное давление',
        definition: 'The pressure of circulating blood against the walls of blood vessels' },
      { en: 'hypertension', es: 'hipertensión', fr: 'hypertension', de: 'Hypertonie', zh: '高血压', ru: 'гипертония',
        definition: 'Abnormally high blood pressure' },
      { en: 'arrhythmia', es: 'arritmia', fr: 'arythmie', de: 'Arrhythmie', zh: '心律失常', ru: 'аритмия',
        definition: 'Irregular heartbeat or abnormal heart rhythm' },
      { en: 'myocardial infarction', es: 'infarto de miocardio', fr: 'infarctus du myocarde', de: 'Myokardinfarkt', zh: '心肌梗塞', ru: 'инфаркт миокарда',
        definition: 'Death of heart muscle due to lack of blood supply' }
    ],
    neurology: [
      { en: 'stroke', es: 'accidente cerebrovascular', fr: 'accident vasculaire cérébral', de: 'Schlaganfall', zh: '中风', ru: 'инсульт',
        definition: 'Sudden interruption of blood supply to the brain' },
      { en: 'seizure', es: 'convulsión', fr: 'crise d\'épilepsie', de: 'Anfall', zh: '癫痫发作', ru: 'судорожный припадок',
        definition: 'Sudden, uncontrolled electrical disturbance in the brain' },
      { en: 'migraine', es: 'migraña', fr: 'migraine', de: 'Migräne', zh: '偏头痛', ru: 'мигрень',
        definition: 'Recurring headache that causes moderate to severe pain' },
      { en: 'multiple sclerosis', es: 'esclerosis múltiple', fr: 'sclérose en plaques', de: 'Multiple Sklerose', zh: '多发性硬化症', ru: 'рассеянный склероз',
        definition: 'Disease that affects the central nervous system' }
    ],
    oncology: [
      { en: 'cancer', es: 'cáncer', fr: 'cancer', de: 'Krebs', zh: '癌症', ru: 'рак',
        definition: 'Disease caused by abnormal cell growth' },
      { en: 'chemotherapy', es: 'quimioterapia', fr: 'chimiothérapie', de: 'Chemotherapie', zh: '化疗', ru: 'химиотерапия',
        definition: 'Treatment that uses drugs to kill cancer cells' },
      { en: 'radiation therapy', es: 'radioterapia', fr: 'radiothérapie', de: 'Strahlentherapie', zh: '放射治疗', ru: 'лучевая терапия',
        definition: 'Treatment that uses high doses of radiation to kill cancer cells' },
      { en: 'metastasis', es: 'metástasis', fr: 'métastase', de: 'Metastase', zh: '转移', ru: 'метастаз',
        definition: 'Spread of cancer cells from the primary site to other parts of the body' }
    ],
    general: [
      { en: 'diabetes', es: 'diabetes', fr: 'diabète', de: 'Diabetes', zh: '糖尿病', ru: 'диабет',
        definition: 'A disease that occurs when blood glucose is too high' },
      { en: 'asthma', es: 'asma', fr: 'asthme', de: 'Asthma', zh: '哮喘', ru: 'астма',
        definition: 'A condition that affects the airways in the lungs' },
      { en: 'allergy', es: 'alergia', fr: 'allergie', de: 'Allergie', zh: '过敏', ru: 'аллергия',
        definition: 'An immune system response to a substance that most people don\'t react to' },
      { en: 'infection', es: 'infección', fr: 'infection', de: 'Infektion', zh: '感染', ru: 'инфекция',
        definition: 'The invasion of an organism\'s body tissues by disease-causing agents' },
      { en: 'inflammation', es: 'inflamación', fr: 'inflammation', de: 'Entzündung', zh: '炎症', ru: 'воспаление',
        definition: 'A process by which the body\'s white blood cells protect from infection' }
    ],
    pediatrics: [
      { en: 'chickenpox', es: 'varicela', fr: 'varicelle', de: 'Windpocken', zh: '水痘', ru: 'ветрянка',
        definition: 'A highly contagious viral infection causing an itchy, blister-like rash' },
      { en: 'measles', es: 'sarampión', fr: 'rougeole', de: 'Masern', zh: '麻疹', ru: 'корь',
        definition: 'A highly contagious viral infection causing fever and a red rash' },
      { en: 'mumps', es: 'paperas', fr: 'oreillons', de: 'Mumps', zh: '腮腺炎', ru: 'свинка',
        definition: 'A viral infection affecting the salivary glands' },
      { en: 'croup', es: 'crup', fr: 'croup', de: 'Krupp', zh: '哮吼', ru: 'круп',
        definition: 'A viral infection of the upper airway that obstructs breathing and causes a barking cough' }
    ]
  };

  // Generate CSV data
  let termId = 1000;
  const terms = [];

  // Add header
  terms.push(header);

  // Process each domain
  for (const [domain, domainTerms] of Object.entries(termsByDomain)) {
    // Skip if specific domain is specified and doesn't match
    if (SPECIFIC_DOMAIN && domain !== SPECIFIC_DOMAIN) {
      continue;
    }

    // Process each term in the domain
    for (const term of domainTerms) {
      // Use English as the base language
      const baseLanguage = 'en';
      
      // Filter available languages based on the provided languages
      const availableLanguages = languages.filter(lang => term[lang]);

      // Generate translations for each target language
      for (const targetLang of availableLanguages) {
        // Skip self-translation
        if (targetLang === baseLanguage) continue;

        // Skip if term doesn't have translation for this language
        if (!term[targetLang]) continue;

        const termIdStr = `TERM${String(termId).padStart(4, '0')}`;
        termId++;

        // Create term entry
        terms.push(
          `${termIdStr},${baseLanguage},${targetLang},${term[baseLanguage]},${term[targetLang]},${domain},"${term.definition}",${source}`
        );

        // Create reverse mapping (target to base)
        const reverseTermIdStr = `TERM${String(termId).padStart(4, '0')}`;
        termId++;

        terms.push(
          `${reverseTermIdStr},${targetLang},${baseLanguage},${term[targetLang]},${term[baseLanguage]},${domain},"${term.definition}",${source}`
        );
      }
    }
  }

  return terms.join('\n');
}

/**
 * Main function
 */
async function main() {
  console.log(`Populating medical terminology database: ${TABLE_NAME}`);
  console.log(`Using local DynamoDB: ${USE_LOCAL_DYNAMODB}`);
  console.log(`Sample data only: ${SAMPLE_ONLY}`);
  
  if (SPECIFIC_SOURCE) {
    console.log(`Processing only source: ${SPECIFIC_SOURCE}`);
  }
  
  if (SPECIFIC_DOMAIN) {
    console.log(`Processing only domain: ${SPECIFIC_DOMAIN}`);
  }

  // Create table if it doesn't exist
  await createTableIfNotExists();

  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, '../data/medical-terminology');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Store sample data for each source
  const sampleData = {};

  // Process each data source
  let totalItems = 0;
  for (const source of DATA_SOURCES) {
    // Skip if specific source is specified and doesn't match
    if (SPECIFIC_SOURCE && source.name !== SPECIFIC_SOURCE) {
      continue;
    }

    console.log(`Processing ${source.name} data...`);

    try {
      // Write sample data to file
      if (sampleData[source.name]) {
        fs.writeFileSync(source.path, sampleData[source.name]);
        console.log(`Created/updated sample data file: ${source.path}`);
      }

      // Skip database population if in sample-only mode
      if (SAMPLE_ONLY) {
        continue;
      }

      // Load data from CSV
      const data = await loadTerminologyFromCsv(source.path);
      console.log(`Loaded ${data.length} items from ${source.path}`);

      // Process data and write to DynamoDB
      const itemsWritten = await processTerminologyData(data, source.name);
      totalItems += itemsWritten;

      console.log(`Processed ${itemsWritten} items from ${source.name}`);
    } catch (error) {
      console.error(`Error processing ${source.name}:`, error);
    }
  }

  console.log(`Total items written to database: ${totalItems}`);
  console.log('Medical terminology database population completed!');
}

// Run the script
main().catch(error => {
  console.error('Error populating medical terminology database:', error);
  process.exit(1);
});
