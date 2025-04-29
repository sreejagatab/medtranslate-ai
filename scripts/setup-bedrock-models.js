/**
 * Setup Bedrock Models for MedTranslate AI
 * 
 * This script configures Amazon Bedrock models for medical translation.
 * It sets up the necessary AWS resources and configurations for using
 * Bedrock models in the MedTranslate AI application.
 * 
 * Usage:
 *   node setup-bedrock-models.js [--profile=AWS_PROFILE] [--region=AWS_REGION]
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env.development') });

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.replace('--', '')] = value;
  }
  return acc;
}, {});

// Configuration
const config = {
  profile: args.profile || process.env.AWS_PROFILE || 'default',
  region: args.region || process.env.AWS_REGION || 'us-east-1',
  environment: process.env.NODE_ENV || 'development',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0'
};

// Set AWS credentials
if (config.profile !== 'default') {
  process.env.AWS_PROFILE = config.profile;
}

// Initialize AWS SDK
AWS.config.update({ region: config.region });

// Bedrock models for medical translation
const BEDROCK_MODELS = {
  'claude': [
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'anthropic.claude-instant-v1'
  ],
  'titan': [
    'amazon.titan-text-express-v1',
    'amazon.titan-text-lite-v1'
  ],
  'llama': [
    'meta.llama2-13b-chat-v1',
    'meta.llama2-70b-chat-v1'
  ],
  'mistral': [
    'mistral.mistral-7b-instruct-v0:2',
    'mistral.mixtral-8x7b-instruct-v0:1'
  ]
};

// Medical contexts for translation
const MEDICAL_CONTEXTS = [
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

// Language pairs for translation
const LANGUAGE_PAIRS = [
  { source: 'en', target: 'es', name: 'English to Spanish' },
  { source: 'es', target: 'en', name: 'Spanish to English' },
  { source: 'en', target: 'fr', name: 'English to French' },
  { source: 'fr', target: 'en', name: 'French to English' },
  { source: 'en', target: 'de', name: 'English to German' },
  { source: 'de', target: 'en', name: 'German to English' },
  { source: 'en', target: 'zh', name: 'English to Chinese' },
  { source: 'zh', target: 'en', name: 'Chinese to English' },
  { source: 'en', target: 'ar', name: 'English to Arabic' },
  { source: 'ar', target: 'en', name: 'Arabic to English' },
  { source: 'en', target: 'ru', name: 'English to Russian' },
  { source: 'ru', target: 'en', name: 'Russian to English' },
  { source: 'en', target: 'pt', name: 'English to Portuguese' },
  { source: 'pt', target: 'en', name: 'Portuguese to English' },
  { source: 'en', target: 'ja', name: 'English to Japanese' },
  { source: 'ja', target: 'en', name: 'Japanese to English' },
  { source: 'en', target: 'it', name: 'English to Italian' },
  { source: 'it', target: 'en', name: 'Italian to English' }
];

/**
 * Check if Bedrock is available in the current region
 * @returns {Promise<boolean>} Whether Bedrock is available
 */
async function checkBedrockAvailability() {
  try {
    // Use AWS CLI to check if Bedrock is available
    const result = execSync(`aws bedrock list-foundation-models --region ${config.region} --query "modelSummaries[0].modelId" --output text`, { encoding: 'utf8' });
    return result.trim() !== '';
  } catch (error) {
    console.error('Error checking Bedrock availability:', error.message);
    return false;
  }
}

/**
 * Get available Bedrock models in the current region
 * @returns {Promise<Array>} Available models
 */
async function getAvailableModels() {
  try {
    const result = execSync(`aws bedrock list-foundation-models --region ${config.region} --output json`, { encoding: 'utf8' });
    const models = JSON.parse(result).modelSummaries;
    return models.map(model => model.modelId);
  } catch (error) {
    console.error('Error getting available models:', error.message);
    return [];
  }
}

/**
 * Create model configuration files
 */
function createModelConfigs() {
  console.log('Creating model configuration files...');

  // Create directory for model configs
  const configDir = path.join(__dirname, '../backend/models/configs');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Create configuration for each model family
  for (const [family, models] of Object.entries(BEDROCK_MODELS)) {
    const config = {
      family,
      models,
      capabilities: getModelCapabilities(family),
      recommendedFor: getModelRecommendations(family),
      medicalContexts: MEDICAL_CONTEXTS,
      languagePairs: LANGUAGE_PAIRS
    };

    const configPath = path.join(configDir, `${family}-models.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Created configuration for ${family} models at ${configPath}`);
  }

  // Create combined configuration
  const combinedConfig = {
    modelFamilies: Object.keys(BEDROCK_MODELS),
    models: BEDROCK_MODELS,
    medicalContexts: MEDICAL_CONTEXTS,
    languagePairs: LANGUAGE_PAIRS,
    defaultModel: config.bedrockModelId
  };

  const combinedConfigPath = path.join(configDir, 'models-config.json');
  fs.writeFileSync(combinedConfigPath, JSON.stringify(combinedConfig, null, 2));
  console.log(`Created combined configuration at ${combinedConfigPath}`);
}

/**
 * Get model capabilities based on family
 * @param {string} family - Model family
 * @returns {Array} Model capabilities
 */
function getModelCapabilities(family) {
  switch (family) {
    case 'claude':
      return ['medical translation', 'terminology verification', 'context awareness'];
    case 'titan':
      return ['general translation', 'Asian language support'];
    case 'llama':
      return ['efficient translation', 'European language support'];
    case 'mistral':
      return ['Slavic language support', 'general translation'];
    default:
      return ['general translation'];
  }
}

/**
 * Get model recommendations based on family
 * @param {string} family - Model family
 * @returns {Array} Model recommendations
 */
function getModelRecommendations(family) {
  switch (family) {
    case 'claude':
      return ['complex medical contexts', 'high accuracy needs', 'nuanced translations'];
    case 'titan':
      return ['Asian languages', 'general medical contexts'];
    case 'llama':
      return ['European languages', 'general medical contexts'];
    case 'mistral':
      return ['Slavic languages', 'general medical contexts'];
    default:
      return ['general medical contexts'];
  }
}

/**
 * Create prompt templates for medical translation
 */
function createPromptTemplates() {
  console.log('Creating prompt templates for medical translation...');

  // Create directory for prompt templates
  const promptsDir = path.join(__dirname, '../backend/models/prompts');
  if (!fs.existsSync(promptsDir)) {
    fs.mkdirSync(promptsDir, { recursive: true });
  }

  // Create Claude prompt template
  const claudePrompt = `<instructions>
You are an expert medical translator specializing in healthcare communications.
Translate the following text from {sourceLanguage} to {targetLanguage}.
Maintain medical accuracy, technical terminology, and appropriate tone.

Medical specialty context: {medicalContext}

If there are specialized medical terms, ensure they are translated accurately according to standard medical terminology in the target language.

Provide only the translated text without any explanations or notes.
</instructions>

<input>
{text}
</input>`;

  fs.writeFileSync(path.join(promptsDir, 'claude-prompt.txt'), claudePrompt);
  console.log('Created Claude prompt template');

  // Create Titan prompt template
  const titanPrompt = `You are an expert medical translator specializing in healthcare communications.
Translate the following text from {sourceLanguage} to {targetLanguage}.
Maintain medical accuracy, technical terminology, and appropriate tone.

Medical specialty context: {medicalContext}

If there are specialized medical terms, ensure they are translated accurately according to standard medical terminology in the target language.

Text to translate: {text}

Provide only the translated text without any explanations or notes.`;

  fs.writeFileSync(path.join(promptsDir, 'titan-prompt.txt'), titanPrompt);
  console.log('Created Titan prompt template');

  // Create Llama prompt template
  const llamaPrompt = `<s>[INST]You are an expert medical translator specializing in healthcare communications.
Translate the following text from {sourceLanguage} to {targetLanguage}.
Maintain medical accuracy, technical terminology, and appropriate tone.

Medical specialty context: {medicalContext}

If there are specialized medical terms, ensure they are translated accurately according to standard medical terminology in the target language.

Text to translate: {text}

Provide only the translated text without any explanations or notes.[/INST]</s>`;

  fs.writeFileSync(path.join(promptsDir, 'llama-prompt.txt'), llamaPrompt);
  console.log('Created Llama prompt template');

  // Create Mistral prompt template
  const mistralPrompt = `<s>[INST]You are an expert medical translator specializing in healthcare communications.
Translate the following text from {sourceLanguage} to {targetLanguage}.
Maintain medical accuracy, technical terminology, and appropriate tone.

Medical specialty context: {medicalContext}

If there are specialized medical terms, ensure they are translated accurately according to standard medical terminology in the target language.

Text to translate: {text}

Provide only the translated text without any explanations or notes.[/INST]</s>`;

  fs.writeFileSync(path.join(promptsDir, 'mistral-prompt.txt'), mistralPrompt);
  console.log('Created Mistral prompt template');

  // Create terminology verification prompt
  const terminologyPrompt = `<instructions>
You are an expert in medical terminology and translation.
Review the following medical text translation and verify if all medical terms have been translated correctly.
Focus only on specialized medical terminology, not general language.

Format your response as a JSON array of objects with the following structure:
[
  {
    "sourceTerm": "term in source language",
    "translatedTerm": "term in target language",
    "isAccurate": true/false,
    "suggestion": "suggested correction if needed"
  }
]

If no medical terms are found or all terms are correctly translated, return an empty array: []
</instructions>

<input>
Original text: {sourceText}
Translated text: {translatedText}
Medical specialty: {medicalContext}
</input>`;

  fs.writeFileSync(path.join(promptsDir, 'terminology-verification-prompt.txt'), terminologyPrompt);
  console.log('Created terminology verification prompt template');
}

/**
 * Update environment configuration
 */
function updateEnvironmentConfig() {
  console.log('Updating environment configuration...');

  // Update .env.development file
  const envPath = path.join(__dirname, '../backend/.env.development');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Update Bedrock model ID
  envContent = envContent.replace(
    /BEDROCK_MODEL_ID=.*/,
    `BEDROCK_MODEL_ID=${config.bedrockModelId}`
  );

  // Add model configuration paths
  if (!envContent.includes('MODEL_CONFIG_PATH')) {
    envContent += '\n# Model Configuration\n';
    envContent += 'MODEL_CONFIG_PATH=../models/configs/models-config.json\n';
    envContent += 'PROMPT_TEMPLATES_PATH=../models/prompts\n';
  }

  fs.writeFileSync(envPath, envContent);
  console.log('Updated environment configuration');
}

/**
 * Main function
 */
async function main() {
  console.log('Setting up Bedrock models for MedTranslate AI...');
  console.log(`AWS Profile: ${config.profile}`);
  console.log(`AWS Region: ${config.region}`);
  console.log(`Environment: ${config.environment}`);
  console.log(`Default Bedrock Model: ${config.bedrockModelId}`);

  // Check if Bedrock is available
  const isBedrockAvailable = await checkBedrockAvailability();
  if (!isBedrockAvailable) {
    console.warn(`Amazon Bedrock is not available in the ${config.region} region.`);
    console.warn('Using mock implementation for development.');
  } else {
    console.log('Amazon Bedrock is available in this region.');
    
    // Get available models
    const availableModels = await getAvailableModels();
    console.log('Available Bedrock models:');
    availableModels.forEach(model => console.log(`- ${model}`));
    
    // Check if default model is available
    if (!availableModels.includes(config.bedrockModelId)) {
      console.warn(`Default model ${config.bedrockModelId} is not available in this region.`);
      console.warn('Please update the BEDROCK_MODEL_ID in your .env file.');
    }
  }

  // Create model configurations
  createModelConfigs();

  // Create prompt templates
  createPromptTemplates();

  // Update environment configuration
  updateEnvironmentConfig();

  console.log('Bedrock models setup completed successfully!');
}

// Run the script
main().catch(error => {
  console.error('Error setting up Bedrock models:', error);
  process.exit(1);
});
