/**
 * Enhanced Amazon Bedrock client for medical translation
 *
 * This module provides advanced functions to interact with Amazon Bedrock for
 * medical translation tasks with specialized prompts for healthcare contexts.
 *
 * Features:
 * - Specialized medical prompts for different model families
 * - Medical terminology verification
 * - Context-aware model selection
 * - Fallback mechanisms for reliability
 * - Comprehensive language support
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Initialize AWS services
let bedrock = null;
let translate = null;
let comprehendMedical = null;

// Initialize services if not in development mode
if (process.env.NODE_ENV !== 'development') {
  bedrock = new AWS.BedrockRuntime();
  translate = new AWS.Translate();
  comprehendMedical = new AWS.ComprehendMedical();
}

// Load model configuration
const MODEL_CONFIG_PATH = process.env.MODEL_CONFIG_PATH || '../models/configs/models-config.json';
const PROMPT_TEMPLATES_PATH = process.env.PROMPT_TEMPLATES_PATH || '../models/prompts';

// Load model configuration if file exists
let modelConfig = {
  modelFamilies: ['claude', 'titan', 'llama', 'mistral'],
  models: {
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
  },
  defaultModel: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0'
};

try {
  const configPath = path.resolve(__dirname, MODEL_CONFIG_PATH);
  if (fs.existsSync(configPath)) {
    modelConfig = require(configPath);
    console.log('Loaded model configuration from:', configPath);
  }
} catch (error) {
  console.warn('Error loading model configuration:', error.message);
  console.warn('Using default model configuration');
}

// Load prompt templates
const promptTemplates = {
  claude: '',
  titan: '',
  llama: '',
  mistral: '',
  terminologyVerification: ''
};

try {
  const promptsDir = path.resolve(__dirname, PROMPT_TEMPLATES_PATH);
  
  if (fs.existsSync(path.join(promptsDir, 'claude-prompt.txt'))) {
    promptTemplates.claude = fs.readFileSync(path.join(promptsDir, 'claude-prompt.txt'), 'utf8');
  }
  
  if (fs.existsSync(path.join(promptsDir, 'titan-prompt.txt'))) {
    promptTemplates.titan = fs.readFileSync(path.join(promptsDir, 'titan-prompt.txt'), 'utf8');
  }
  
  if (fs.existsSync(path.join(promptsDir, 'llama-prompt.txt'))) {
    promptTemplates.llama = fs.readFileSync(path.join(promptsDir, 'llama-prompt.txt'), 'utf8');
  }
  
  if (fs.existsSync(path.join(promptsDir, 'mistral-prompt.txt'))) {
    promptTemplates.mistral = fs.readFileSync(path.join(promptsDir, 'mistral-prompt.txt'), 'utf8');
  }
  
  if (fs.existsSync(path.join(promptsDir, 'terminology-verification-prompt.txt'))) {
    promptTemplates.terminologyVerification = fs.readFileSync(path.join(promptsDir, 'terminology-verification-prompt.txt'), 'utf8');
  }
  
  console.log('Loaded prompt templates from:', promptsDir);
} catch (error) {
  console.warn('Error loading prompt templates:', error.message);
  console.warn('Using default prompt templates');
}

// Language code mapping for Bedrock models
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
  'pl': 'Polish',
  'tr': 'Turkish',
  'vi': 'Vietnamese',
  'th': 'Thai',
  'sv': 'Swedish',
  'uk': 'Ukrainian'
};

// Medical contexts
const MEDICAL_CONTEXTS = {
  'general': 'General medical context',
  'cardiology': 'Cardiology (heart-related)',
  'neurology': 'Neurology (brain and nervous system)',
  'oncology': 'Oncology (cancer)',
  'pediatrics': 'Pediatrics (children\'s health)',
  'psychiatry': 'Psychiatry (mental health)',
  'radiology': 'Radiology (imaging)',
  'emergency': 'Emergency medicine',
  'surgery': 'Surgery',
  'obstetrics': 'Obstetrics (pregnancy and childbirth)',
  'gynecology': 'Gynecology (women\'s health)',
  'orthopedics': 'Orthopedics (bones and joints)',
  'dermatology': 'Dermatology (skin)',
  'ophthalmology': 'Ophthalmology (eyes)',
  'urology': 'Urology (urinary system)',
  'endocrinology': 'Endocrinology (hormones)',
  'gastroenterology': 'Gastroenterology (digestive system)',
  'pulmonology': 'Pulmonology (lungs and respiratory system)',
  'nephrology': 'Nephrology (kidneys)',
  'hematology': 'Hematology (blood)',
  'immunology': 'Immunology (immune system)',
  'infectious_disease': 'Infectious disease',
  'rheumatology': 'Rheumatology (autoimmune and inflammatory diseases)',
  'anesthesiology': 'Anesthesiology',
  'pathology': 'Pathology',
  'pharmacy': 'Pharmacy and medications'
};

/**
 * Mock translation for development mode
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} medicalContext - Medical context
 * @returns {Object} - Translation result
 */
function mockTranslate(text, sourceLanguage, targetLanguage, medicalContext = 'general') {
  console.log(`[MOCK] Translating from ${sourceLanguage} to ${targetLanguage} in ${medicalContext} context: ${text}`);
  
  // Simple mock translations for development
  const translations = {
    'en-es': {
      'hello': 'hola',
      'doctor': 'médico',
      'hospital': 'hospital',
      'patient': 'paciente',
      'heart attack': 'ataque cardíaco',
      'headache': 'dolor de cabeza',
      'fever': 'fiebre',
      'blood pressure': 'presión arterial',
      'diabetes': 'diabetes',
      'cancer': 'cáncer'
    },
    'es-en': {
      'hola': 'hello',
      'médico': 'doctor',
      'hospital': 'hospital',
      'paciente': 'patient',
      'ataque cardíaco': 'heart attack',
      'dolor de cabeza': 'headache',
      'fiebre': 'fever',
      'presión arterial': 'blood pressure',
      'diabetes': 'diabetes',
      'cáncer': 'cancer'
    }
  };
  
  const languagePair = `${sourceLanguage}-${targetLanguage}`;
  
  // Check if we have a direct translation for the entire text
  if (translations[languagePair] && translations[languagePair][text.toLowerCase()]) {
    const translatedText = translations[languagePair][text.toLowerCase()];
    
    return {
      translatedText,
      confidence: 'high',
      sourceLanguage,
      targetLanguage,
      medicalContext,
      modelUsed: 'mock',
      processingTime: 0
    };
  }
  
  // Otherwise, translate word by word
  const words = text.split(' ');
  let translatedWords = [];
  
  for (const word of words) {
    const wordLower = word.toLowerCase();
    if (translations[languagePair] && translations[languagePair][wordLower]) {
      translatedWords.push(translations[languagePair][wordLower]);
    } else {
      // If no translation found, keep the original word
      translatedWords.push(word);
    }
  }
  
  return {
    translatedText: translatedWords.join(' '),
    confidence: 'medium',
    sourceLanguage,
    targetLanguage,
    medicalContext,
    modelUsed: 'mock',
    processingTime: 0
  };
}

/**
 * Translates text from one language to another using Amazon Bedrock
 * with enhanced medical terminology support
 *
 * @param {string} sourceLanguage - The source language code (e.g., 'en', 'es')
 * @param {string} targetLanguage - The target language code (e.g., 'en', 'es')
 * @param {string} text - The text to translate
 * @param {string} medicalContext - Optional medical context (e.g., 'general', 'cardiology', 'pediatrics')
 * @param {string} preferredModel - Optional preferred model type ('claude', 'titan', 'llama', 'mistral')
 * @param {Array} medicalTerms - Optional array of known medical terms and translations
 * @returns {Promise<Object>} - The translation result with confidence score
 */
async function translateText(sourceLanguage, targetLanguage, text, medicalContext = 'general', preferredModel = null, medicalTerms = []) {
  // For local development, use mock translations
  if (process.env.NODE_ENV === 'development' || !bedrock) {
    console.log(`[DEV] Translating from ${sourceLanguage} to ${targetLanguage}: ${text}`);
    return mockTranslate(text, sourceLanguage, targetLanguage, medicalContext);
  }

  const startTime = Date.now();

  // Get full language names
  const sourceLang = LANGUAGE_CODES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_CODES[targetLanguage] || targetLanguage;
  const context = MEDICAL_CONTEXTS[medicalContext] || medicalContext;

  // Select the appropriate model based on configuration and preference
  let modelId;

  if (preferredModel && modelConfig.models[preferredModel]) {
    // Use the first model from the preferred model family
    modelId = modelConfig.models[preferredModel][0];
  } else {
    // Use the configured model or default to Claude
    modelId = process.env.BEDROCK_MODEL_ID || modelConfig.defaultModel;
  }

  console.log(`Using model ${modelId} for ${sourceLanguage} to ${targetLanguage} translation in ${medicalContext} context`);

  // Prepare medical terms prompt if provided
  let medicalTermsPrompt = '';
  if (medicalTerms && medicalTerms.length > 0) {
    medicalTermsPrompt = 'Use the following medical term translations:\n';
    for (const term of medicalTerms) {
      medicalTermsPrompt += `- "${term.sourceTerm}" (${sourceLanguage}) → "${term.targetTerm}" (${targetLanguage})\n`;
    }
  }

  // Prepare prompt based on model
  let prompt;
  let params;

  if (modelId.startsWith('anthropic.claude')) {
    // Claude-specific prompt format
    prompt = promptTemplates.claude || `<instructions>
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

    // Replace placeholders
    prompt = prompt
      .replace('{sourceLanguage}', sourceLang)
      .replace('{targetLanguage}', targetLang)
      .replace('{medicalContext}', context)
      .replace('{text}', text);

    params = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        temperature: 0.2,
        top_p: 0.9,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    };
  } else if (modelId.startsWith('amazon.titan')) {
    // Titan-specific prompt format
    prompt = promptTemplates.titan || `You are an expert medical translator specializing in healthcare communications.
Translate the following text from {sourceLanguage} to {targetLanguage}.
Maintain medical accuracy, technical terminology, and appropriate tone.

Medical specialty context: {medicalContext}

If there are specialized medical terms, ensure they are translated accurately according to standard medical terminology in the target language.

Text to translate: {text}

Provide only the translated text without any explanations or notes.`;

    // Replace placeholders
    prompt = prompt
      .replace('{sourceLanguage}', sourceLang)
      .replace('{targetLanguage}', targetLang)
      .replace('{medicalContext}', context)
      .replace('{text}', text);

    params = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: prompt,
        textGenerationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxTokenCount: 1024
        }
      })
    };
  } else if (modelId.startsWith('meta.llama')) {
    // Llama-specific prompt format
    prompt = promptTemplates.llama || `<s>[INST]You are an expert medical translator specializing in healthcare communications.
Translate the following text from {sourceLanguage} to {targetLanguage}.
Maintain medical accuracy, technical terminology, and appropriate tone.

Medical specialty context: {medicalContext}

If there are specialized medical terms, ensure they are translated accurately according to standard medical terminology in the target language.

Text to translate: {text}

Provide only the translated text without any explanations or notes.[/INST]</s>`;

    // Replace placeholders
    prompt = prompt
      .replace('{sourceLanguage}', sourceLang)
      .replace('{targetLanguage}', targetLang)
      .replace('{medicalContext}', context)
      .replace('{text}', text);

    params = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        temperature: 0.2,
        top_p: 0.9,
        max_gen_len: 1024
      })
    };
  } else if (modelId.startsWith('mistral.')) {
    // Mistral-specific prompt format
    prompt = promptTemplates.mistral || `<s>[INST]You are an expert medical translator specializing in healthcare communications.
Translate the following text from {sourceLanguage} to {targetLanguage}.
Maintain medical accuracy, technical terminology, and appropriate tone.

Medical specialty context: {medicalContext}

If there are specialized medical terms, ensure they are translated accurately according to standard medical terminology in the target language.

Text to translate: {text}

Provide only the translated text without any explanations or notes.[/INST]</s>`;

    // Replace placeholders
    prompt = prompt
      .replace('{sourceLanguage}', sourceLang)
      .replace('{targetLanguage}', targetLang)
      .replace('{medicalContext}', context)
      .replace('{text}', text);

    params = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1024
      })
    };
  } else {
    // Generic format for other models
    prompt = `Translate the following text from ${sourceLang} to ${targetLang}. 
Medical context: ${context}
Text: ${text}`;

    params = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1024
      })
    };
  }

  try {
    const response = await bedrock.invokeModel(params).promise();
    const responseBody = JSON.parse(response.body.toString());

    let responseText;
    let modelUsed = modelId;

    // Parse response based on model
    if (modelId.startsWith('anthropic.claude')) {
      responseText = responseBody.content[0].text.trim();
    } else if (modelId.startsWith('amazon.titan')) {
      responseText = responseBody.results[0].outputText.trim();
    } else if (modelId.startsWith('meta.llama')) {
      responseText = responseBody.generation.trim();
    } else if (modelId.startsWith('mistral.')) {
      responseText = responseBody.outputs[0].text.trim();
    } else {
      responseText = responseBody.completion || responseBody.generated_text || responseBody.text || '';
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    return {
      translatedText: responseText,
      confidence: 'high',
      sourceLanguage,
      targetLanguage,
      medicalContext,
      modelUsed,
      processingTime
    };
  } catch (error) {
    console.error('Error calling Bedrock:', error);

    // Try fallback to AWS Translate if Bedrock fails
    try {
      console.log('Falling back to AWS Translate');
      const translateParams = {
        Text: text,
        SourceLanguageCode: sourceLanguage,
        TargetLanguageCode: targetLanguage
      };

      const translateResult = await translate.translateText(translateParams).promise();
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      return {
        translatedText: translateResult.TranslatedText,
        confidence: 'low', // AWS Translate doesn't have medical specialization
        sourceLanguage,
        targetLanguage,
        medicalContext,
        modelUsed: 'aws.translate',
        fallback: true,
        processingTime
      };
    } catch (translateError) {
      console.error('Error with fallback translation:', translateError);
      throw new Error(`Translation failed: ${error.message}. Fallback also failed.`);
    }
  }
}

/**
 * Verify medical terminology in a translation
 *
 * @param {string} sourceText - The original text
 * @param {string} translatedText - The translated text
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - The medical context
 * @returns {Promise<Array>} - Array of terminology verification results
 */
async function verifyMedicalTerminology(sourceText, translatedText, sourceLanguage, targetLanguage, medicalContext = 'general') {
  // For local development, return empty array
  if (process.env.NODE_ENV === 'development' || !bedrock) {
    console.log(`[DEV] Verifying medical terminology for translation from ${sourceLanguage} to ${targetLanguage}`);
    return [];
  }

  // Get full language names
  const sourceLang = LANGUAGE_CODES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_CODES[targetLanguage] || targetLanguage;
  const context = MEDICAL_CONTEXTS[medicalContext] || medicalContext;

  // Select the appropriate model
  let modelId;
  if (modelConfig.models['claude']) {
    // Prefer Claude for medical terminology verification
    modelId = modelConfig.models['claude'][0];
  } else {
    // Fallback to configured model
    modelId = process.env.BEDROCK_MODEL_ID || modelConfig.defaultModel;
  }

  // Prepare prompt
  let prompt = promptTemplates.terminologyVerification || `<instructions>
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

  // Replace placeholders
  prompt = prompt
    .replace('{sourceText}', sourceText)
    .replace('{translatedText}', translatedText)
    .replace('{medicalContext}', context);

  const params = {
    modelId: modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      temperature: 0.2,
      top_p: 0.9,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  };

  try {
    const response = await bedrock.invokeModel(params).promise();
    const responseBody = JSON.parse(response.body.toString());
    const responseText = responseBody.content[0].text.trim();

    // Extract JSON array from response
    try {
      // Find JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      return [];
    } catch (jsonError) {
      console.error('Error parsing terminology verification result:', jsonError);
      return [];
    }
  } catch (error) {
    console.error('Error verifying medical terminology:', error);
    return [];
  }
}

/**
 * Selects the best model for a specific medical context and language pair
 *
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - The medical context
 * @returns {string} - The recommended model family ('claude', 'titan', 'llama', 'mistral')
 */
function selectBestModelForContext(sourceLanguage, targetLanguage, medicalContext = 'general') {
  // For complex medical contexts, Claude models tend to perform best
  const complexMedicalContexts = ['cardiology', 'neurology', 'oncology', 'psychiatry', 'endocrinology'];
  
  // For Asian languages, Titan models often perform better
  const asianLanguages = ['zh', 'ja', 'ko', 'th', 'vi'];
  
  // For Slavic languages, Mistral models may perform better
  const slavicLanguages = ['ru', 'uk', 'pl', 'cs', 'sk', 'bg'];
  
  // For European languages with simpler medical contexts, Llama models are efficient
  const europeanLanguages = ['es', 'fr', 'de', 'it', 'pt', 'nl'];

  // Check if both source and target are Asian languages
  const isAsianLanguagePair = asianLanguages.includes(sourceLanguage) && asianLanguages.includes(targetLanguage);
  
  // Check if both source and target are Slavic languages
  const isSlavicLanguagePair = slavicLanguages.includes(sourceLanguage) && slavicLanguages.includes(targetLanguage);
  
  // Check if both source and target are European languages
  const isEuropeanLanguagePair = europeanLanguages.includes(sourceLanguage) && europeanLanguages.includes(targetLanguage);
  
  // Check if it's a complex medical context
  const isComplexMedicalContext = complexMedicalContexts.includes(medicalContext);

  // Select model based on language pair and context
  if (isComplexMedicalContext) {
    // For complex medical contexts, prefer Claude
    return 'claude';
  } else if (isAsianLanguagePair) {
    // For Asian language pairs, prefer Titan
    return 'titan';
  } else if (isSlavicLanguagePair) {
    // For Slavic language pairs, prefer Mistral
    return 'mistral';
  } else if (isEuropeanLanguagePair && !isComplexMedicalContext) {
    // For European language pairs with simpler contexts, prefer Llama
    return 'llama';
  } else {
    // Default to Claude for best overall performance
    return 'claude';
  }
}

/**
 * Get information about a specific model
 *
 * @param {string} modelId - The model ID
 * @returns {Object} - Model information
 */
function getModelInfo(modelId) {
  const modelInfo = {
    id: modelId,
    family: 'unknown',
    capabilities: [],
    recommendedFor: [],
    contextWindow: 4096,
    tokenLimit: 1024
  };

  // Determine model family and capabilities
  if (modelId.startsWith('anthropic.claude')) {
    modelInfo.family = 'claude';
    modelInfo.capabilities = ['medical translation', 'terminology verification', 'context awareness'];
    modelInfo.recommendedFor = ['complex medical contexts', 'high accuracy needs', 'nuanced translations'];

    if (modelId.includes('claude-3-sonnet')) {
      modelInfo.contextWindow = 200000;
      modelInfo.tokenLimit = 4096;
    } else if (modelId.includes('claude-3-haiku')) {
      modelInfo.contextWindow = 100000;
      modelInfo.tokenLimit = 2048;
    } else {
      modelInfo.contextWindow = 100000;
      modelInfo.tokenLimit = 2048;
    }
  } else if (modelId.startsWith('amazon.titan')) {
    modelInfo.family = 'titan';
    modelInfo.capabilities = ['general translation', 'Asian language support'];
    modelInfo.recommendedFor = ['Asian languages', 'general medical contexts'];
    modelInfo.contextWindow = 8000;
    modelInfo.tokenLimit = 1024;
  } else if (modelId.startsWith('meta.llama')) {
    modelInfo.family = 'llama';
    modelInfo.capabilities = ['efficient translation', 'European language support'];
    modelInfo.recommendedFor = ['European languages', 'general medical contexts'];

    if (modelId.includes('70b')) {
      modelInfo.contextWindow = 4096;
      modelInfo.tokenLimit = 1024;
    } else {
      modelInfo.contextWindow = 2048;
      modelInfo.tokenLimit = 512;
    }
  } else if (modelId.startsWith('mistral.')) {
    modelInfo.family = 'mistral';
    modelInfo.capabilities = ['Slavic language support', 'general translation'];
    modelInfo.recommendedFor = ['Slavic languages', 'general medical contexts'];

    if (modelId.includes('mixtral')) {
      modelInfo.contextWindow = 8192;
      modelInfo.tokenLimit = 1024;
    } else {
      modelInfo.contextWindow = 4096;
      modelInfo.tokenLimit = 512;
    }
  }

  return modelInfo;
}

/**
 * Get available models and their capabilities
 * 
 * @returns {Object} - Available models and their capabilities
 */
function getAvailableModels() {
  const modelFamilies = Object.keys(modelConfig.models);
  const modelInfo = {};

  for (const family of modelFamilies) {
    const models = modelConfig.models[family];
    if (models && models.length > 0) {
      modelInfo[family] = {
        models: models,
        capabilities: getModelInfo(models[0]).capabilities,
        recommendedFor: getModelInfo(models[0]).recommendedFor
      };
    }
  }

  return {
    availableModels: modelInfo,
    defaultModel: modelConfig.defaultModel
  };
}

module.exports = {
  translateText,
  verifyMedicalTerminology,
  selectBestModelForContext,
  getModelInfo,
  getAvailableModels,
  mockTranslate
};
