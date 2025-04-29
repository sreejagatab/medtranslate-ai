/**
 * Edge Model Generator for MedTranslate AI
 * 
 * This script generates optimized medical terminology JSON files for the edge device
 * to enable offline translation capabilities. It extracts data from the DynamoDB
 * medical terminology database and creates language-specific model files.
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const TABLE_NAME = process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology';
const REGION = process.env.AWS_REGION || 'us-east-1';
const LOCAL_ENDPOINT = process.env.DYNAMODB_LOCAL_ENDPOINT || 'http://localhost:8000';
const USE_LOCAL = process.env.USE_LOCAL_DYNAMODB === 'true';
const EDGE_MODELS_DIR = path.join(__dirname, '../edge/models');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const match = arg.match(/^--([^=]+)(?:=(.+))?$/);
  if (match) {
    acc[match[1]] = match[2] || true;
  }
  return acc;
}, {});

// Override settings from command line
const USE_LOCAL_DB = args.local === 'true' || USE_LOCAL;
const SELECTED_LANGUAGE_PAIR = args.languages;

// Configure AWS SDK
const dynamoDbConfig = {
  region: REGION
};

if (USE_LOCAL_DB) {
  dynamoDbConfig.endpoint = LOCAL_ENDPOINT;
}

const dynamoDB = new AWS.DynamoDB.DocumentClient(dynamoDbConfig);

// Language pairs to generate models for
const LANGUAGE_PAIRS = [
  { source: 'en', target: 'es' },
  { source: 'es', target: 'en' },
  { source: 'en', target: 'fr' },
  { source: 'fr', target: 'en' },
  { source: 'en', target: 'de' },
  { source: 'de', target: 'en' },
  { source: 'en', target: 'zh' },
  { source: 'zh', target: 'en' },
  { source: 'en', target: 'ar' },
  { source: 'ar', target: 'en' },
  { source: 'en', target: 'ru' },
  { source: 'ru', target: 'en' }
];

/**
 * Query medical terminology for a specific language pair
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Array>} - Array of terminology entries
 */
async function queryMedicalTerminology(sourceLanguage, targetLanguage) {
  console.log(`Querying medical terminology for ${sourceLanguage} -> ${targetLanguage}...`);
  
  // Use scan operation with filter (in production, use a GSI)
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'source_language = :sourceLanguage AND target_language = :targetLanguage',
    ExpressionAttributeValues: {
      ':sourceLanguage': sourceLanguage,
      ':targetLanguage': targetLanguage
    }
  };
  
  try {
    const result = await dynamoDB.scan(params).promise();
    console.log(`Found ${result.Items.length} terms for ${sourceLanguage} -> ${targetLanguage}`);
    return result.Items;
  } catch (error) {
    console.error('Error querying medical terminology:', error);
    return [];
  }
}

/**
 * Generate a medical terminology model file for a language pair
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<boolean>} - Success indicator
 */
async function generateModelFile(sourceLanguage, targetLanguage) {
  try {
    // Query medical terminology
    const terms = await queryMedicalTerminology(sourceLanguage, targetLanguage);
    
    if (terms.length === 0) {
      console.warn(`No terms found for ${sourceLanguage} -> ${targetLanguage}`);
      return false;
    }
    
    // Create model directory
    const modelDir = path.join(EDGE_MODELS_DIR, `${sourceLanguage}-${targetLanguage}`);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
    
    // Create medical terms JSON file
    const medicalTerms = {};
    
    for (const term of terms) {
      medicalTerms[term.source_term] = term.target_term;
    }
    
    const medicalTermsPath = path.join(modelDir, 'medical_terms.json');
    fs.writeFileSync(medicalTermsPath, JSON.stringify(medicalTerms, null, 2));
    
    console.log(`Generated medical terms file: ${medicalTermsPath} with ${Object.keys(medicalTerms).length} terms`);
    
    // Create model metadata file
    const metadata = {
      source_language: sourceLanguage,
      target_language: targetLanguage,
      term_count: Object.keys(medicalTerms).length,
      created_at: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const metadataPath = path.join(modelDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log(`Generated metadata file: ${metadataPath}`);
    
    return true;
  } catch (error) {
    console.error(`Error generating model file for ${sourceLanguage} -> ${targetLanguage}:`, error);
    return false;
  }
}

/**
 * Generate a fallback model file if no data is available
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 */
function generateFallbackModelFile(sourceLanguage, targetLanguage) {
  try {
    // Create model directory
    const modelDir = path.join(EDGE_MODELS_DIR, `${sourceLanguage}-${targetLanguage}`);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
    
    // Create basic medical terms based on language pair
    const medicalTerms = {};
    
    // Add some basic medical terms
    if (sourceLanguage === 'en' && targetLanguage === 'es') {
      medicalTerms['heart attack'] = 'ataque cardíaco';
      medicalTerms['blood pressure'] = 'presión arterial';
      medicalTerms['diabetes'] = 'diabetes';
      medicalTerms['stroke'] = 'accidente cerebrovascular';
      medicalTerms['cancer'] = 'cáncer';
      medicalTerms['hypertension'] = 'hipertensión';
      medicalTerms['asthma'] = 'asma';
    } else if (sourceLanguage === 'es' && targetLanguage === 'en') {
      medicalTerms['ataque cardíaco'] = 'heart attack';
      medicalTerms['presión arterial'] = 'blood pressure';
      medicalTerms['diabetes'] = 'diabetes';
      medicalTerms['accidente cerebrovascular'] = 'stroke';
      medicalTerms['cáncer'] = 'cancer';
      medicalTerms['hipertensión'] = 'hypertension';
      medicalTerms['asma'] = 'asthma';
    } else if (sourceLanguage === 'en' && targetLanguage === 'fr') {
      medicalTerms['heart attack'] = 'crise cardiaque';
      medicalTerms['blood pressure'] = 'tension artérielle';
      medicalTerms['diabetes'] = 'diabète';
      medicalTerms['stroke'] = 'accident vasculaire cérébral';
      medicalTerms['cancer'] = 'cancer';
      medicalTerms['hypertension'] = 'hypertension';
      medicalTerms['asthma'] = 'asthme';
    } else if (sourceLanguage === 'fr' && targetLanguage === 'en') {
      medicalTerms['crise cardiaque'] = 'heart attack';
      medicalTerms['tension artérielle'] = 'blood pressure';
      medicalTerms['diabète'] = 'diabetes';
      medicalTerms['accident vasculaire cérébral'] = 'stroke';
      medicalTerms['cancer'] = 'cancer';
      medicalTerms['hypertension'] = 'hypertension';
      medicalTerms['asthme'] = 'asthma';
    } else if (sourceLanguage === 'en' && targetLanguage === 'de') {
      medicalTerms['heart attack'] = 'Herzinfarkt';
      medicalTerms['blood pressure'] = 'Blutdruck';
      medicalTerms['diabetes'] = 'Diabetes';
      medicalTerms['stroke'] = 'Schlaganfall';
      medicalTerms['cancer'] = 'Krebs';
      medicalTerms['hypertension'] = 'Hypertonie';
      medicalTerms['asthma'] = 'Asthma';
    } else if (sourceLanguage === 'de' && targetLanguage === 'en') {
      medicalTerms['Herzinfarkt'] = 'heart attack';
      medicalTerms['Blutdruck'] = 'blood pressure';
      medicalTerms['Diabetes'] = 'diabetes';
      medicalTerms['Schlaganfall'] = 'stroke';
      medicalTerms['Krebs'] = 'cancer';
      medicalTerms['Hypertonie'] = 'hypertension';
      medicalTerms['Asthma'] = 'asthma';
    } else if (sourceLanguage === 'en' && targetLanguage === 'zh') {
      medicalTerms['heart attack'] = '心脏病发作';
      medicalTerms['blood pressure'] = '血压';
      medicalTerms['diabetes'] = '糖尿病';
      medicalTerms['stroke'] = '中风';
      medicalTerms['cancer'] = '癌症';
      medicalTerms['hypertension'] = '高血压';
      medicalTerms['asthma'] = '哮喘';
    } else if (sourceLanguage === 'zh' && targetLanguage === 'en') {
      medicalTerms['心脏病发作'] = 'heart attack';
      medicalTerms['血压'] = 'blood pressure';
      medicalTerms['糖尿病'] = 'diabetes';
      medicalTerms['中风'] = 'stroke';
      medicalTerms['癌症'] = 'cancer';
      medicalTerms['高血压'] = 'hypertension';
      medicalTerms['哮喘'] = 'asthma';
    } else if (sourceLanguage === 'en' && targetLanguage === 'ar') {
      medicalTerms['heart attack'] = 'نوبة قلبية';
      medicalTerms['blood pressure'] = 'ضغط الدم';
      medicalTerms['diabetes'] = 'مرض السكري';
      medicalTerms['stroke'] = 'سكتة دماغية';
      medicalTerms['cancer'] = 'سرطان';
      medicalTerms['hypertension'] = 'ارتفاع ضغط الدم';
      medicalTerms['asthma'] = 'الربو';
    } else if (sourceLanguage === 'ar' && targetLanguage === 'en') {
      medicalTerms['نوبة قلبية'] = 'heart attack';
      medicalTerms['ضغط الدم'] = 'blood pressure';
      medicalTerms['مرض السكري'] = 'diabetes';
      medicalTerms['سكتة دماغية'] = 'stroke';
      medicalTerms['سرطان'] = 'cancer';
      medicalTerms['ارتفاع ضغط الدم'] = 'hypertension';
      medicalTerms['الربو'] = 'asthma';
    } else if (sourceLanguage === 'en' && targetLanguage === 'ru') {
      medicalTerms['heart attack'] = 'сердечный приступ';
      medicalTerms['blood pressure'] = 'кровяное давление';
      medicalTerms['diabetes'] = 'диабет';
      medicalTerms['stroke'] = 'инсульт';
      medicalTerms['cancer'] = 'рак';
      medicalTerms['hypertension'] = 'гипертония';
      medicalTerms['asthma'] = 'астма';
    } else if (sourceLanguage === 'ru' && targetLanguage === 'en') {
      medicalTerms['сердечный приступ'] = 'heart attack';
      medicalTerms['кровяное давление'] = 'blood pressure';
      medicalTerms['диабет'] = 'diabetes';
      medicalTerms['инсульт'] = 'stroke';
      medicalTerms['рак'] = 'cancer';
      medicalTerms['гипертония'] = 'hypertension';
      medicalTerms['астма'] = 'asthma';
    } else {
      // Generic fallback with just a few terms
      medicalTerms['medical'] = 'medical';
      medicalTerms['doctor'] = 'doctor';
      medicalTerms['hospital'] = 'hospital';
      medicalTerms['patient'] = 'patient';
      medicalTerms['medicine'] = 'medicine';
    }
    
    const medicalTermsPath = path.join(modelDir, 'medical_terms.json');
    fs.writeFileSync(medicalTermsPath, JSON.stringify(medicalTerms, null, 2));
    
    console.log(`Generated fallback medical terms file: ${medicalTermsPath} with ${Object.keys(medicalTerms).length} terms`);
    
    // Create model metadata file
    const metadata = {
      source_language: sourceLanguage,
      target_language: targetLanguage,
      term_count: Object.keys(medicalTerms).length,
      created_at: new Date().toISOString(),
      version: '1.0.0',
      is_fallback: true
    };
    
    const metadataPath = path.join(modelDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log(`Generated fallback metadata file: ${metadataPath}`);
  } catch (error) {
    console.error(`Error generating fallback model file for ${sourceLanguage} -> ${targetLanguage}:`, error);
  }
}

/**
 * Generate a manifest file listing all available models
 */
function generateManifest() {
  try {
    const models = [];
    
    // Scan the models directory
    const dirs = fs.readdirSync(EDGE_MODELS_DIR);
    
    for (const dir of dirs) {
      const modelDir = path.join(EDGE_MODELS_DIR, dir);
      
      // Skip if not a directory
      if (!fs.statSync(modelDir).isDirectory()) {
        continue;
      }
      
      // Check if metadata file exists
      const metadataPath = path.join(modelDir, 'metadata.json');
      if (!fs.existsSync(metadataPath)) {
        continue;
      }
      
      // Read metadata
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Add to models list
      models.push({
        id: dir,
        source_language: metadata.source_language,
        target_language: metadata.target_language,
        term_count: metadata.term_count,
        version: metadata.version,
        created_at: metadata.created_at,
        is_fallback: metadata.is_fallback || false
      });
    }
    
    // Create manifest file
    const manifest = {
      models,
      total_models: models.length,
      generated_at: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const manifestPath = path.join(EDGE_MODELS_DIR, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`Generated manifest file: ${manifestPath} with ${models.length} models`);
  } catch (error) {
    console.error('Error generating manifest file:', error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting edge model generation...');
    
    // Create edge models directory if it doesn't exist
    if (!fs.existsSync(EDGE_MODELS_DIR)) {
      fs.mkdirSync(EDGE_MODELS_DIR, { recursive: true });
    }
    
    // Filter language pairs if specified
    const languagePairsToProcess = SELECTED_LANGUAGE_PAIR
      ? LANGUAGE_PAIRS.filter(pair => `${pair.source}-${pair.target}` === SELECTED_LANGUAGE_PAIR)
      : LANGUAGE_PAIRS;
    
    if (languagePairsToProcess.length === 0) {
      console.warn(`No language pairs found matching: ${SELECTED_LANGUAGE_PAIR}`);
      return;
    }
    
    // Generate model files for each language pair
    for (const pair of languagePairsToProcess) {
      const { source, target } = pair;
      
      console.log(`Processing language pair: ${source} -> ${target}`);
      
      // Try to generate model file from database
      const success = await generateModelFile(source, target);
      
      // If no data found, generate fallback model
      if (!success) {
        console.log(`Generating fallback model for ${source} -> ${target}`);
        generateFallbackModelFile(source, target);
      }
    }
    
    // Generate manifest file
    generateManifest();
    
    console.log('Edge model generation completed');
  } catch (error) {
    console.error('Error generating edge models:', error);
    process.exit(1);
  }
}

// Run the main function
main();
