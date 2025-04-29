/**
 * Medical Knowledge Base Population Script
 * 
 * This script populates the DynamoDB medical terminology database with
 * sample medical terms across multiple languages and specialties.
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Configure AWS
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
});

// Table name
const MEDICAL_TERMINOLOGY_TABLE = process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology';

// Sample medical terms by specialty
const medicalTerms = {
  cardiology: [
    {
      term: 'myocardial infarction',
      language: 'en',
      domain: 'cardiology',
      translations: [
        { language: 'es', term: 'infarto de miocardio', confidence: 'high' },
        { language: 'fr', term: 'infarctus du myocarde', confidence: 'high' },
        { language: 'de', term: 'Myokardinfarkt', confidence: 'high' },
        { language: 'zh', term: '心肌梗死', confidence: 'high' },
        { language: 'ar', term: 'احتشاء عضلة القلب', confidence: 'high' }
      ]
    },
    {
      term: 'atrial fibrillation',
      language: 'en',
      domain: 'cardiology',
      translations: [
        { language: 'es', term: 'fibrilación auricular', confidence: 'high' },
        { language: 'fr', term: 'fibrillation auriculaire', confidence: 'high' },
        { language: 'de', term: 'Vorhofflimmern', confidence: 'high' },
        { language: 'zh', term: '心房颤动', confidence: 'high' },
        { language: 'ar', term: 'رجفان أذيني', confidence: 'high' }
      ]
    },
    {
      term: 'hypertension',
      language: 'en',
      domain: 'cardiology',
      translations: [
        { language: 'es', term: 'hipertensión', confidence: 'high' },
        { language: 'fr', term: 'hypertension', confidence: 'high' },
        { language: 'de', term: 'Bluthochdruck', confidence: 'high' },
        { language: 'zh', term: '高血压', confidence: 'high' },
        { language: 'ar', term: 'ارتفاع ضغط الدم', confidence: 'high' }
      ]
    }
  ],
  neurology: [
    {
      term: 'stroke',
      language: 'en',
      domain: 'neurology',
      translations: [
        { language: 'es', term: 'accidente cerebrovascular', confidence: 'high' },
        { language: 'fr', term: 'accident vasculaire cérébral', confidence: 'high' },
        { language: 'de', term: 'Schlaganfall', confidence: 'high' },
        { language: 'zh', term: '中风', confidence: 'high' },
        { language: 'ar', term: 'سكتة دماغية', confidence: 'high' }
      ]
    },
    {
      term: 'epilepsy',
      language: 'en',
      domain: 'neurology',
      translations: [
        { language: 'es', term: 'epilepsia', confidence: 'high' },
        { language: 'fr', term: 'épilepsie', confidence: 'high' },
        { language: 'de', term: 'Epilepsie', confidence: 'high' },
        { language: 'zh', term: '癫痫', confidence: 'high' },
        { language: 'ar', term: 'الصرع', confidence: 'high' }
      ]
    },
    {
      term: 'multiple sclerosis',
      language: 'en',
      domain: 'neurology',
      translations: [
        { language: 'es', term: 'esclerosis múltiple', confidence: 'high' },
        { language: 'fr', term: 'sclérose en plaques', confidence: 'high' },
        { language: 'de', term: 'Multiple Sklerose', confidence: 'high' },
        { language: 'zh', term: '多发性硬化症', confidence: 'high' },
        { language: 'ar', term: 'التصلب المتعدد', confidence: 'high' }
      ]
    }
  ],
  gastroenterology: [
    {
      term: 'gastroesophageal reflux disease',
      language: 'en',
      domain: 'gastroenterology',
      translations: [
        { language: 'es', term: 'enfermedad por reflujo gastroesofágico', confidence: 'high' },
        { language: 'fr', term: 'reflux gastro-œsophagien', confidence: 'high' },
        { language: 'de', term: 'Gastroösophageale Refluxkrankheit', confidence: 'high' },
        { language: 'zh', term: '胃食管反流病', confidence: 'high' },
        { language: 'ar', term: 'مرض الارتجاع المعدي المريئي', confidence: 'high' }
      ]
    },
    {
      term: 'irritable bowel syndrome',
      language: 'en',
      domain: 'gastroenterology',
      translations: [
        { language: 'es', term: 'síndrome del intestino irritable', confidence: 'high' },
        { language: 'fr', term: 'syndrome du côlon irritable', confidence: 'high' },
        { language: 'de', term: 'Reizdarmsyndrom', confidence: 'high' },
        { language: 'zh', term: '肠易激综合征', confidence: 'high' },
        { language: 'ar', term: 'متلازمة القولون العصبي', confidence: 'high' }
      ]
    },
    {
      term: 'cirrhosis',
      language: 'en',
      domain: 'gastroenterology',
      translations: [
        { language: 'es', term: 'cirrosis', confidence: 'high' },
        { language: 'fr', term: 'cirrhose', confidence: 'high' },
        { language: 'de', term: 'Leberzirrhose', confidence: 'high' },
        { language: 'zh', term: '肝硬化', confidence: 'high' },
        { language: 'ar', term: 'تليف الكبد', confidence: 'high' }
      ]
    }
  ],
  orthopedics: [
    {
      term: 'osteoarthritis',
      language: 'en',
      domain: 'orthopedics',
      translations: [
        { language: 'es', term: 'osteoartritis', confidence: 'high' },
        { language: 'fr', term: 'arthrose', confidence: 'high' },
        { language: 'de', term: 'Arthrose', confidence: 'high' },
        { language: 'zh', term: '骨关节炎', confidence: 'high' },
        { language: 'ar', term: 'التهاب المفاصل العظمي', confidence: 'high' }
      ]
    },
    {
      term: 'fracture',
      language: 'en',
      domain: 'orthopedics',
      translations: [
        { language: 'es', term: 'fractura', confidence: 'high' },
        { language: 'fr', term: 'fracture', confidence: 'high' },
        { language: 'de', term: 'Fraktur', confidence: 'high' },
        { language: 'zh', term: '骨折', confidence: 'high' },
        { language: 'ar', term: 'كسر', confidence: 'high' }
      ]
    },
    {
      term: 'rheumatoid arthritis',
      language: 'en',
      domain: 'orthopedics',
      translations: [
        { language: 'es', term: 'artritis reumatoide', confidence: 'high' },
        { language: 'fr', term: 'polyarthrite rhumatoïde', confidence: 'high' },
        { language: 'de', term: 'Rheumatoide Arthritis', confidence: 'high' },
        { language: 'zh', term: '类风湿性关节炎', confidence: 'high' },
        { language: 'ar', term: 'التهاب المفاصل الروماتويدي', confidence: 'high' }
      ]
    }
  ],
  general: [
    {
      term: 'fever',
      language: 'en',
      domain: 'general',
      translations: [
        { language: 'es', term: 'fiebre', confidence: 'high' },
        { language: 'fr', term: 'fièvre', confidence: 'high' },
        { language: 'de', term: 'Fieber', confidence: 'high' },
        { language: 'zh', term: '发热', confidence: 'high' },
        { language: 'ar', term: 'حمى', confidence: 'high' }
      ]
    },
    {
      term: 'headache',
      language: 'en',
      domain: 'general',
      translations: [
        { language: 'es', term: 'dolor de cabeza', confidence: 'high' },
        { language: 'fr', term: 'mal de tête', confidence: 'high' },
        { language: 'de', term: 'Kopfschmerzen', confidence: 'high' },
        { language: 'zh', term: '头痛', confidence: 'high' },
        { language: 'ar', term: 'صداع', confidence: 'high' }
      ]
    },
    {
      term: 'nausea',
      language: 'en',
      domain: 'general',
      translations: [
        { language: 'es', term: 'náusea', confidence: 'high' },
        { language: 'fr', term: 'nausée', confidence: 'high' },
        { language: 'de', term: 'Übelkeit', confidence: 'high' },
        { language: 'zh', term: '恶心', confidence: 'high' },
        { language: 'ar', term: 'غثيان', confidence: 'high' }
      ]
    }
  ]
};

/**
 * Save a term to the database
 * 
 * @param {Object} termData - Term data to save
 * @returns {Promise<boolean>} - Success indicator
 */
async function saveTerm(termData) {
  try {
    const now = new Date().toISOString();
    const termSource = `${termData.term.toLowerCase()}:${termData.language}`;
    
    const params = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      Item: {
        term_source: termSource,
        term: termData.term,
        language: termData.language,
        domain: termData.domain,
        translations: termData.translations,
        created_at: now,
        updated_at: now
      }
    };
    
    await dynamoDB.put(params).promise();
    console.log(`Saved term: ${termData.term} (${termData.language})`);
    return true;
  } catch (error) {
    console.error(`Error saving term ${termData.term}:`, error);
    return false;
  }
}

/**
 * Check if the table exists
 * 
 * @returns {Promise<boolean>} - Whether the table exists
 */
async function checkTableExists() {
  try {
    const dynamoDBClient = new AWS.DynamoDB({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
    });
    
    await dynamoDBClient.describeTable({
      TableName: MEDICAL_TERMINOLOGY_TABLE
    }).promise();
    
    return true;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

/**
 * Create the table if it doesn't exist
 * 
 * @returns {Promise<boolean>} - Success indicator
 */
async function createTableIfNotExists() {
  try {
    const exists = await checkTableExists();
    
    if (exists) {
      console.log(`Table ${MEDICAL_TERMINOLOGY_TABLE} already exists`);
      return true;
    }
    
    const dynamoDBClient = new AWS.DynamoDB({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
    });
    
    await dynamoDBClient.createTable({
      TableName: MEDICAL_TERMINOLOGY_TABLE,
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
    }).promise();
    
    console.log(`Created table ${MEDICAL_TERMINOLOGY_TABLE}`);
    
    // Wait for table to be active
    let tableActive = false;
    while (!tableActive) {
      const response = await dynamoDBClient.describeTable({
        TableName: MEDICAL_TERMINOLOGY_TABLE
      }).promise();
      
      if (response.Table.TableStatus === 'ACTIVE') {
        tableActive = true;
      } else {
        console.log('Waiting for table to be active...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error creating table:', error);
    return false;
  }
}

/**
 * Populate the database with sample terms
 */
async function populateDatabase() {
  try {
    // Create table if it doesn't exist
    const tableCreated = await createTableIfNotExists();
    
    if (!tableCreated) {
      console.error('Failed to create or verify table');
      return;
    }
    
    console.log('Starting database population...');
    
    // Populate terms for each specialty
    for (const specialty in medicalTerms) {
      console.log(`Populating ${specialty} terms...`);
      
      for (const termData of medicalTerms[specialty]) {
        await saveTerm(termData);
      }
    }
    
    console.log('Database population complete!');
    console.log(`Added ${Object.values(medicalTerms).flat().length} terms to the database`);
  } catch (error) {
    console.error('Error populating database:', error);
  }
}

// Run the script
populateDatabase();
