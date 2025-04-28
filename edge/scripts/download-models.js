/**
 * Translation Model Downloader for MedTranslate AI
 *
 * This script creates sample translation models for the edge application
 * to enable offline translation capabilities.
 */

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

// Configuration
const MODEL_DIR = path.join(__dirname, '..', 'models');
const MANIFEST_PATH = path.join(MODEL_DIR, 'manifest.json');
const LANGUAGE_PAIRS = [
  { source: 'en', target: 'es' },
  { source: 'es', target: 'en' },
  { source: 'en', target: 'fr' },
  { source: 'fr', target: 'en' },
  { source: 'en', target: 'zh' },
  { source: 'zh', target: 'en' },
  { source: 'en', target: 'ar' },
  { source: 'ar', target: 'en' }
];

// Create model directory if it doesn't exist
if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
  console.log(`Created model directory: ${MODEL_DIR}`);
}

/**
 * Create a sample model for a language pair
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 * @returns {Promise<Object>} - Model info
 */
async function createSampleModel(sourceLang, targetLang) {
  const modelKey = `${sourceLang}-${targetLang}`;
  const modelDir = path.join(MODEL_DIR, modelKey);

  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  console.log(`Creating sample model for ${modelKey}...`);

  // Create sample model files
  const files = [
    { name: 'config.json', content: JSON.stringify({
      model_type: "marian",
      source_language: sourceLang,
      target_language: targetLang,
      vocab_size: 32000,
      d_model: 512,
      encoder_layers: 6,
      decoder_layers: 6,
      encoder_attention_heads: 8,
      decoder_attention_heads: 8,
      encoder_ffn_dim: 2048,
      decoder_ffn_dim: 2048,
      activation_function: "relu",
      max_position_embeddings: 512,
      pad_token_id: 0,
      eos_token_id: 0,
      forced_eos_token_id: 0
    }, null, 2) },
    { name: 'tokenizer_config.json', content: JSON.stringify({
      source_lang: sourceLang,
      target_lang: targetLang,
      model_max_length: 512,
      special_tokens_map_file: null,
      tokenizer_class: "MarianTokenizer"
    }, null, 2) },
    { name: 'vocab.json', content: JSON.stringify({
      "<pad>": 0,
      "<unk>": 1,
      "<s>": 2,
      "</s>": 3
    }, null, 2) },
    { name: 'source.spm', content: 'Sample sentencepiece model for source language' },
    { name: 'target.spm', content: 'Sample sentencepiece model for target language' },
    { name: 'pytorch_model.bin', content: Buffer.from(`Sample model for ${sourceLang} to ${targetLang} translation`).toString('base64') }
  ];

  // Write files
  for (const file of files) {
    const filePath = path.join(modelDir, file.name);
    fs.writeFileSync(filePath, file.content);
    console.log(`Created: ${filePath}`);
  }

  // Create a hash for the model
  const hash = createHash('sha256').update(`${sourceLang}-${targetLang}-sample`).digest('hex');

  return {
    source: sourceLang,
    target: targetLang,
    name: `${sourceLang}-${targetLang}`,
    path: modelDir,
    hash: hash,
    size: fs.statSync(path.join(modelDir, 'pytorch_model.bin')).size,
    created: new Date().toISOString(),
    isSample: true
  };
}

/**
 * Create a dictionary file with medical terms
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 */
function createMedicalDictionary(sourceLang, targetLang) {
  const modelKey = `${sourceLang}-${targetLang}`;
  const dictionaryPath = path.join(MODEL_DIR, modelKey, 'medical_terms.json');

  // Sample medical terms
  const medicalTerms = {
    'en-es': {
      'heart attack': 'ataque cardíaco',
      'blood pressure': 'presión arterial',
      'diabetes': 'diabetes',
      'stroke': 'accidente cerebrovascular',
      'cancer': 'cáncer',
      'hypertension': 'hipertensión',
      'asthma': 'asma'
    },
    'es-en': {
      'ataque cardíaco': 'heart attack',
      'presión arterial': 'blood pressure',
      'diabetes': 'diabetes',
      'accidente cerebrovascular': 'stroke',
      'cáncer': 'cancer',
      'hipertensión': 'hypertension',
      'asma': 'asthma'
    },
    'en-fr': {
      'heart attack': 'crise cardiaque',
      'blood pressure': 'tension artérielle',
      'diabetes': 'diabète',
      'stroke': 'accident vasculaire cérébral',
      'cancer': 'cancer',
      'hypertension': 'hypertension',
      'asthma': 'asthme'
    },
    'fr-en': {
      'crise cardiaque': 'heart attack',
      'tension artérielle': 'blood pressure',
      'diabète': 'diabetes',
      'accident vasculaire cérébral': 'stroke',
      'cancer': 'cancer',
      'hypertension': 'hypertension',
      'asthme': 'asthma'
    },
    'en-zh': {
      'heart attack': '心脏病发作',
      'blood pressure': '血压',
      'diabetes': '糖尿病',
      'stroke': '中风',
      'cancer': '癌症',
      'hypertension': '高血压',
      'asthma': '哮喘'
    },
    'zh-en': {
      '心脏病发作': 'heart attack',
      '血压': 'blood pressure',
      '糖尿病': 'diabetes',
      '中风': 'stroke',
      '癌症': 'cancer',
      '高血压': 'hypertension',
      '哮喘': 'asthma'
    },
    'en-ar': {
      'heart attack': 'نوبة قلبية',
      'blood pressure': 'ضغط الدم',
      'diabetes': 'مرض السكري',
      'stroke': 'سكتة دماغية',
      'cancer': 'سرطان',
      'hypertension': 'ارتفاع ضغط الدم',
      'asthma': 'الربو'
    },
    'ar-en': {
      'نوبة قلبية': 'heart attack',
      'ضغط الدم': 'blood pressure',
      'مرض السكري': 'diabetes',
      'سكتة دماغية': 'stroke',
      'سرطان': 'cancer',
      'ارتفاع ضغط الدم': 'hypertension',
      'الربو': 'asthma'
    }
  };

  // Write dictionary file
  fs.writeFileSync(dictionaryPath, JSON.stringify(medicalTerms[modelKey] || {}, null, 2));
  console.log(`Created medical dictionary: ${dictionaryPath}`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting model creation process...');

    // Create sample models for each language pair
    const createdModels = [];
    for (const pair of LANGUAGE_PAIRS) {
      const model = await createSampleModel(pair.source, pair.target);
      if (model) {
        createdModels.push(model);
        createMedicalDictionary(pair.source, pair.target);
      }
    }

    console.log(`Created ${createdModels.length} sample models`);

    // Save model manifest
    const localManifest = {
      models: createdModels,
      updated: new Date().toISOString(),
      version: '1.0.0'
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(localManifest, null, 2));
    console.log(`Saved model manifest to ${MANIFEST_PATH}`);

    console.log('Model creation process completed successfully!');
  } catch (error) {
    console.error('Error creating models:', error);
    process.exit(1);
  }
}

// Run the main function
main();
