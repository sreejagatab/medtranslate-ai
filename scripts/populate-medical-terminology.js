/**
 * Medical Terminology Database Populator for MedTranslate AI
 *
 * This script populates the DynamoDB table with comprehensive medical terminology
 * for accurate translation in healthcare settings. It supports multiple data sources
 * and languages, with specialized medical domains for context-aware translation.
 *
 * Usage:
 *   node populate-medical-terminology.js [--source=SOURCE_NAME] [--domain=DOMAIN_NAME]
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
dotenv.config({ path: '.env.local' });

// Configuration
const TABLE_NAME = process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology';
const REGION = process.env.AWS_REGION || 'us-east-1';
const LOCAL_ENDPOINT = process.env.DYNAMODB_LOCAL_ENDPOINT || 'http://localhost:8000';
const USE_LOCAL = process.env.USE_LOCAL_DYNAMODB === 'true';
const BATCH_SIZE = 25; // DynamoDB batch write limit

// Language code mapping
const LANGUAGE_CODES = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'ru': 'Russian',
  'hi': 'Hindi',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'da': 'Danish',
  'pl': 'Polish',
  'tr': 'Turkish',
  'uk': 'Ukrainian'
};

// Configure AWS SDK
const dynamoDbConfig = {
  region: REGION
};

if (USE_LOCAL) {
  dynamoDbConfig.endpoint = LOCAL_ENDPOINT;
}

const dynamoDB = new AWS.DynamoDB.DocumentClient(dynamoDbConfig);

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const match = arg.match(/^--([^=]+)(?:=(.+))?$/);
  if (match) {
    acc[match[1]] = match[2] || true;
  }
  return acc;
}, {});

// Override settings from command line
const SAMPLE_ONLY = args.sample === 'true';
const SELECTED_SOURCE = args.source;
const SELECTED_DOMAIN = args.domain;

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
const DOMAINS = [
  'cardiology',
  'neurology',
  'oncology',
  'pediatrics',
  'psychiatry',
  'radiology',
  'general',
  'dermatology',
  'endocrinology',
  'gastroenterology',
  'hematology',
  'immunology',
  'infectious',
  'nephrology',
  'obstetrics',
  'ophthalmology',
  'orthopedics',
  'otolaryngology',
  'pulmonology',
  'rheumatology',
  'urology',
  'emergency',
  'primary',
  'surgery',
  'anesthesiology',
  'pathology',
  'pharmacology'
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

    // Read and parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv({
        // Handle quoted fields properly
        quote: '"',
        escape: '"',
        skipLines: 0,
        headers: ['term_id', 'source_language', 'target_language', 'source_term', 'target_term', 'domain', 'definition', 'source']
      }))
      .on('data', (data) => {
        // Skip header row if it matches the header fields
        if (data.term_id === 'term_id') return;

        // Clean up fields
        Object.keys(data).forEach(key => {
          if (typeof data[key] === 'string') {
            // Remove quotes from definition field
            if (key === 'definition') {
              data[key] = data[key].replace(/^"(.*)"$/, '$1');
            }
            data[key] = data[key].trim();
          }
        });

        results.push(data);
      })
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
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
      { en: 'angina', es: 'angina de pecho', fr: 'angine de poitrine', de: 'Angina pectoris', zh: '心绞痛', ru: 'стенокардия',
        definition: 'Chest pain caused by reduced blood flow to the heart' }
    ],
    neurology: [
      { en: 'stroke', es: 'accidente cerebrovascular', fr: 'accident vasculaire cérébral', de: 'Schlaganfall', zh: '中风', ru: 'инсульт',
        definition: 'Sudden interruption of blood supply to the brain' },
      { en: 'seizure', es: 'convulsión', fr: 'crise d\'épilepsie', de: 'Anfall', zh: '癫痫发作', ru: 'судорожный припадок',
        definition: 'Sudden, uncontrolled electrical disturbance in the brain' },
      { en: 'migraine', es: 'migraña', fr: 'migraine', de: 'Migräne', zh: '偏头痛', ru: 'мигрень',
        definition: 'A headache of varying intensity, often accompanied by nausea and sensitivity to light and sound' },
      { en: 'multiple sclerosis', es: 'esclerosis múltiple', fr: 'sclérose en plaques', de: 'Multiple Sklerose', zh: '多发性硬化症', ru: 'рассеянный склероз',
        definition: 'A disease in which the immune system eats away at the protective covering of nerves' },
      { en: 'parkinson\'s disease', es: 'enfermedad de parkinson', fr: 'maladie de parkinson', de: 'Parkinson-Krankheit', zh: '帕金森病', ru: 'болезнь Паркинсона',
        definition: 'A disorder of the central nervous system that affects movement' }
    ],
    oncology: [
      { en: 'cancer', es: 'cáncer', fr: 'cancer', de: 'Krebs', zh: '癌症', ru: 'рак',
        definition: 'Disease in which abnormal cells divide uncontrollably' },
      { en: 'chemotherapy', es: 'quimioterapia', fr: 'chimiothérapie', de: 'Chemotherapie', zh: '化疗', ru: 'химиотерапия',
        definition: 'Treatment that uses drugs to kill cancer cells' },
      { en: 'radiation therapy', es: 'radioterapia', fr: 'radiothérapie', de: 'Strahlentherapie', zh: '放射治疗', ru: 'лучевая терапия',
        definition: 'Treatment that uses high doses of radiation to kill cancer cells and shrink tumors' },
      { en: 'metastasis', es: 'metástasis', fr: 'métastase', de: 'Metastase', zh: '转移', ru: 'метастаз',
        definition: 'The spread of cancer cells from the place where they first formed to another part of the body' },
      { en: 'biopsy', es: 'biopsia', fr: 'biopsie', de: 'Biopsie', zh: '活检', ru: 'биопсия',
        definition: 'A procedure to remove a piece of tissue or a sample of cells from your body to analyze it' }
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
    pharmacology: [
      { en: 'antibiotic', es: 'antibiótico', fr: 'antibiotique', de: 'Antibiotikum', zh: '抗生素', ru: 'антибиотик',
        definition: 'A medicine that inhibits the growth of or destroys microorganisms' },
      { en: 'analgesic', es: 'analgésico', fr: 'analgésique', de: 'Analgetikum', zh: '镇痛药', ru: 'анальгетик',
        definition: 'A drug used to relieve pain' },
      { en: 'anticoagulant', es: 'anticoagulante', fr: 'anticoagulant', de: 'Antikoagulans', zh: '抗凝血剂', ru: 'антикоагулянт',
        definition: 'A drug that prevents blood clots from forming' },
      { en: 'antidepressant', es: 'antidepresivo', fr: 'antidépresseur', de: 'Antidepressivum', zh: '抗抑郁药', ru: 'антидепрессант',
        definition: 'A drug used to treat depression' },
      { en: 'vaccine', es: 'vacuna', fr: 'vaccin', de: 'Impfstoff', zh: '疫苗', ru: 'вакцина',
        definition: 'A substance used to stimulate the production of antibodies and provide immunity against a disease' }
    ]
  };

  // Filter languages based on input
  const availableLanguages = languages.filter(lang => Object.keys(LANGUAGE_CODES).includes(lang));

  // Generate terms
  const terms = [];
  let termId = 1;

  // If a specific domain is selected, only generate terms for that domain
  const domainsToProcess = SELECTED_DOMAIN ? [SELECTED_DOMAIN] : Object.keys(termsByDomain);

  for (const domain of domainsToProcess) {
    if (!termsByDomain[domain]) continue;

    for (const term of termsByDomain[domain]) {
      // Use English as the base language
      const baseLanguage = 'en';

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

  return header + terms.join('\n');
}

/**
 * Create sample medical terminology data for all sources
 * @returns {Object} - Map of source name to CSV data
 */
function createAllSampleData() {
  const result = {};

  for (const source of DATA_SOURCES) {
    if (SELECTED_SOURCE && source.name !== SELECTED_SOURCE) continue;

    result[source.name] = createSampleData(source.name, source.languages);
  }

  return result;
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
    console.log(`Mode: ${SAMPLE_ONLY ? 'Sample data generation only' : 'Database population'}`);

    if (SELECTED_SOURCE) {
      console.log(`Filtering to source: ${SELECTED_SOURCE}`);
    }

    if (SELECTED_DOMAIN) {
      console.log(`Filtering to domain: ${SELECTED_DOMAIN}`);
    }

    // Create table if it doesn't exist and we're not in sample-only mode
    if (!SAMPLE_ONLY) {
      await createTableIfNotExists();
    }

    let totalItems = 0;

    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../data/medical-terminology');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory: ${dataDir}`);
    }

    // Generate sample data for all sources
    const sampleData = createAllSampleData();

    // Process each data source
    for (const source of DATA_SOURCES) {
      if (SELECTED_SOURCE && source.name !== SELECTED_SOURCE) {
        continue;
      }

      console.log(`Processing data source: ${source.name} (${source.description})`);

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

    if (SAMPLE_ONLY) {
      console.log(`Sample data generation completed. Files created in ${dataDir}`);
    } else {
      console.log(`Medical terminology database population completed. Total items: ${totalItems}`);
    }
  } catch (error) {
    console.error('Error populating medical terminology database:', error);
    process.exit(1);
  }
}

// Run the main function
main();
