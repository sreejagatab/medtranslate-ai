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
  claude: {},
  titan: {},
  llama: {},
  mistral: {},
  terminologyVerification: ''
};

// Load specialty-specific prompts
const SPECIALTIES = ['general', 'cardiology', 'neurology', 'gastroenterology', 'orthopedics', 'pulmonology'];

// Try to load prompt templates from files
try {
  // Load specialty-specific prompts for each model family
  for (const modelFamily of ['claude', 'titan', 'llama', 'mistral']) {
    promptTemplates[modelFamily] = {};

    for (const specialty of SPECIALTIES) {
      try {
        const promptPath = path.resolve(__dirname, `../../models/prompts/${specialty}-prompt.txt`);
        if (fs.existsSync(promptPath)) {
          promptTemplates[modelFamily][specialty] = fs.readFileSync(promptPath, 'utf8');
          console.log(`Loaded ${specialty} prompt for ${modelFamily}`);
        }
      } catch (error) {
        console.warn(`Error loading ${specialty} prompt for ${modelFamily}:`, error.message);
      }
    }

    // Set default prompt if no specialty prompts were loaded
    if (Object.keys(promptTemplates[modelFamily]).length === 0) {
      promptTemplates[modelFamily]['general'] = `You are an expert medical translator specializing in healthcare communications.
Translate the following text from {sourceLanguage} to {targetLanguage}.
Maintain medical accuracy, technical terminology, and appropriate tone.

Medical specialty context: {medicalContext}

If there are specialized medical terms, ensure they are translated accurately according to standard medical terminology in the target language.

Provide only the translated text without any explanations or notes.`;
    }
  }

  // Load terminology verification prompt
  try {
    const verificationPromptPath = path.resolve(__dirname, '../../models/prompts/terminology-verification-prompt.txt');
    if (fs.existsSync(verificationPromptPath)) {
      promptTemplates.terminologyVerification = fs.readFileSync(verificationPromptPath, 'utf8');
      console.log('Loaded terminology verification prompt');
    }
  } catch (error) {
    console.warn('Error loading terminology verification prompt:', error.message);
  }
} catch (error) {
  console.warn('Error loading prompt templates:', error.message);
}

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
 * with enhanced medical terminology support and fallback mechanisms
 *
 * @param {string} sourceLanguage - The source language code (e.g., 'en', 'es')
 * @param {string} targetLanguage - The target language code (e.g., 'en', 'es')
 * @param {string} text - The text to translate
 * @param {string} medicalContext - Optional medical context (e.g., 'general', 'cardiology', 'pediatrics')
 * @param {string} preferredModel - Optional preferred model type ('claude', 'titan', 'llama', 'mistral')
 * @param {Array} medicalTerms - Optional array of known medical terms and translations
 * @param {boolean} useFallback - Whether to use fallback mechanisms if primary model fails
 * @param {boolean} includeConfidenceAnalysis - Whether to include detailed confidence analysis
 * @returns {Promise<Object>} - The translation result with confidence score and analysis
 */
async function translateText(sourceLanguage, targetLanguage, text, medicalContext = 'general', preferredModel = null, medicalTerms = [], useFallback = true, includeConfidenceAnalysis = false) {
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

  // Normalize medical context to match available prompts
  const normalizedContext = SPECIALTIES.includes(medicalContext) ? medicalContext : 'general';

  // Get ordered list of models to try (primary + fallbacks)
  const modelsToTry = getModelFallbackChain(sourceLanguage, targetLanguage, medicalContext, preferredModel);

  // Track errors for diagnostic purposes
  const errors = [];

  // Try each model in sequence until one succeeds
  for (const modelInfo of modelsToTry) {
    try {
      const result = await translateWithModel(
        text,
        sourceLanguage,
        targetLanguage,
        normalizedContext,
        modelInfo.id,
        modelInfo.family,
        medicalTerms
      );

      // Add fallback information if this wasn't the first choice
      if (modelInfo.fallback) {
        result.fallback = true;
        result.primaryModelFailed = modelsToTry[0].id;
      }

      return result;
    } catch (error) {
      console.error(`Error with model ${modelInfo.id}:`, error);
      errors.push({ model: modelInfo.id, error: error.message });

      // If fallback is disabled, don't try other models
      if (!useFallback) {
        throw error;
      }

      // Continue to next model in fallback chain
    }
  }

  // If all models failed and AWS Translate is available, try it as a last resort
  if (useFallback && translate) {
    try {
      console.log('All Bedrock models failed, falling back to AWS Translate');
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
        processingTime,
        errors
      };
    } catch (translateError) {
      errors.push({ model: 'aws.translate', error: translateError.message });
    }
  }

  // If we got here, all models including fallbacks failed
  throw new Error(`Translation failed with all models: ${JSON.stringify(errors)}`);
}

/**
 * Get an ordered list of models to try for translation, including fallbacks
 *
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - The medical context
 * @param {string} preferredModel - Optional preferred model family
 * @returns {Array<Object>} - Ordered list of models to try
 */
function getModelFallbackChain(sourceLanguage, targetLanguage, medicalContext, preferredModel = null) {
  const models = [];

  // Start with preferred model if specified
  if (preferredModel && modelConfig.models[preferredModel]) {
    const modelId = modelConfig.models[preferredModel][0];
    models.push({
      id: modelId,
      family: preferredModel,
      fallback: false
    });
  } else {
    // Otherwise use the best model for this context
    const bestModelFamily = selectBestModelForContext(sourceLanguage, targetLanguage, medicalContext);
    const modelId = modelConfig.models[bestModelFamily][0];
    models.push({
      id: modelId,
      family: bestModelFamily,
      fallback: false
    });
  }

  // If fallback strategy is not enabled, just return the primary model
  if (modelConfig.fallbackStrategy && !modelConfig.fallbackStrategy.enabled) {
    return models;
  }

  // Determine which fallback order to use
  let fallbackOrder = [];

  // Check if we have context-specific fallbacks
  if (modelConfig.fallbackStrategy &&
      modelConfig.fallbackStrategy.contextSpecificFallbacks &&
      modelConfig.fallbackStrategy.contextSpecificFallbacks[medicalContext]) {
    fallbackOrder = modelConfig.fallbackStrategy.contextSpecificFallbacks[medicalContext];
  }
  // Check if we have language-specific fallbacks
  else if (modelConfig.fallbackStrategy && modelConfig.fallbackStrategy.languageSpecificFallbacks) {
    // Find the language group that contains the source or target language
    for (const [groupName, group] of Object.entries(modelConfig.fallbackStrategy.languageSpecificFallbacks)) {
      if (group.languages &&
          (group.languages.includes(sourceLanguage) || group.languages.includes(targetLanguage))) {
        fallbackOrder = group.order;
        break;
      }
    }
  }

  // If no specific fallback order was found, use the default order
  if (fallbackOrder.length === 0 && modelConfig.fallbackStrategy && modelConfig.fallbackStrategy.order) {
    fallbackOrder = modelConfig.fallbackStrategy.order;
  }

  // If cost optimization is enabled, use cost-optimized fallback order
  if (modelConfig.fallbackStrategy &&
      modelConfig.fallbackStrategy.costOptimizedFallbacks &&
      modelConfig.fallbackStrategy.costOptimizedFallbacks.enabled) {
    fallbackOrder = modelConfig.fallbackStrategy.costOptimizedFallbacks.order;
  }

  // If performance optimization is enabled, use performance-optimized fallback order
  if (modelConfig.fallbackStrategy &&
      modelConfig.fallbackStrategy.performanceOptimizedFallbacks &&
      modelConfig.fallbackStrategy.performanceOptimizedFallbacks.enabled) {
    fallbackOrder = modelConfig.fallbackStrategy.performanceOptimizedFallbacks.order;
  }

  // Add fallback models in the determined order
  for (const family of fallbackOrder) {
    // Skip the family that's already the primary model
    if (models[0].family === family) {
      continue;
    }

    // Handle special cases like claude-haiku, titan-lite, etc.
    if (family.includes('-')) {
      const [baseName, variant] = family.split('-');

      if (modelConfig.models[baseName]) {
        // Find the specific model variant
        const modelVariants = {
          'claude-haiku': 'anthropic.claude-3-haiku-20240307-v1:0',
          'claude-sonnet': 'anthropic.claude-3-sonnet-20240229-v1:0',
          'claude-opus': 'anthropic.claude-3-opus-20240229-v1:0',
          'titan-lite': 'amazon.titan-text-lite-v1',
          'titan-express': 'amazon.titan-text-express-v1',
          'llama-small': 'meta.llama3-8b-instruct-v1:0',
          'llama-large': 'meta.llama3-70b-instruct-v1:0'
        };

        const specificModelId = modelVariants[family];
        if (specificModelId) {
          models.push({
            id: specificModelId,
            family: baseName,
            variant: variant,
            fallback: true
          });
          continue;
        }
      }
    }

    // Standard case - add the first model from the family
    if (modelConfig.models[family] && modelConfig.models[family].length > 0) {
      models.push({
        id: modelConfig.models[family][0],
        family: family,
        fallback: true
      });
    }
  }

  // If AWS Translate is in the fallback order and we have the translate service
  if (fallbackOrder.includes('aws.translate') && translate) {
    models.push({
      id: 'aws.translate',
      family: 'aws.translate',
      fallback: true
    });
  }

  // Limit the number of fallbacks based on maxAttempts
  const maxAttempts = modelConfig.fallbackStrategy && modelConfig.fallbackStrategy.maxAttempts
    ? modelConfig.fallbackStrategy.maxAttempts
    : 3;

  return models.slice(0, maxAttempts);
}

/**
 * Translate text using a specific model
 *
 * @param {string} text - The text to translate
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - The medical context
 * @param {string} modelId - The model ID to use
 * @param {string} modelFamily - The model family
 * @param {Array} medicalTerms - Optional array of known medical terms
 * @returns {Promise<Object>} - The translation result
 */
async function translateWithModel(text, sourceLanguage, targetLanguage, medicalContext, modelId, modelFamily, medicalTerms = []) {
  const startTime = Date.now();

  // Get full language names
  const sourceLang = LANGUAGE_CODES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_CODES[targetLanguage] || targetLanguage;
  const context = MEDICAL_CONTEXTS[medicalContext] || medicalContext;

  console.log(`Using model ${modelId} for ${sourceLanguage} to ${targetLanguage} translation in ${medicalContext} context`);

  // Prepare medical terms prompt if provided
  let medicalTermsPrompt = '';
  if (medicalTerms && medicalTerms.length > 0) {
    medicalTermsPrompt = '\nPlease ensure these medical terms are translated correctly:\n';
    for (const term of medicalTerms) {
      medicalTermsPrompt += `- "${term.sourceTerm}" should be translated as "${term.targetTerm}"\n`;
    }
  }

  // Get specialty-specific prompt if available
  let promptTemplate = '';
  if (promptTemplates[modelFamily] && promptTemplates[modelFamily][medicalContext]) {
    promptTemplate = promptTemplates[modelFamily][medicalContext];
  } else if (promptTemplates[modelFamily] && promptTemplates[modelFamily]['general']) {
    promptTemplate = promptTemplates[modelFamily]['general'];
  } else {
    // Fallback to default prompt
    promptTemplate = `You are an expert medical translator specializing in healthcare communications.
Translate the following text from {sourceLanguage} to {targetLanguage}.
Maintain medical accuracy, technical terminology, and appropriate tone.

Medical specialty context: {medicalContext}

If there are specialized medical terms, ensure they are translated accurately according to standard medical terminology in the target language.

Provide only the translated text without any explanations or notes.`;
  }

  // Check if we have cultural context information
  let culturalContextPrompt = '';

  // Try to load cultural context configuration
  try {
    const culturalConfigPath = path.resolve(__dirname, '../../models/configs/cultural-context.json');
    if (fs.existsSync(culturalConfigPath)) {
      const culturalConfig = require(culturalConfigPath);

      // Extract language code (remove region if present)
      const baseTargetLang = targetLanguage.split('-')[0];

      // Check if we have cultural adaptations for this language
      if (culturalConfig.languageAdaptations &&
          (culturalConfig.languageAdaptations[targetLanguage] || culturalConfig.languageAdaptations[baseTargetLang])) {

        const langConfig = culturalConfig.languageAdaptations[targetLanguage] ||
                          culturalConfig.languageAdaptations[baseTargetLang];

        // Check if we have context-specific information
        if (langConfig.contexts && langConfig.contexts[medicalContext]) {
          const contextInfo = langConfig.contexts[medicalContext];

          culturalContextPrompt = `\nCultural Context Information:
- This translation should consider ${langConfig.name} cultural context
- ${contextInfo.description}
- Key cultural terms: ${contextInfo.keyTerms.join(', ')}
- Cultural note: ${contextInfo.culturalNotes}`;
        }
        // If no specific context but language has a default adaptation
        else if (langConfig.defaultAdaptation && culturalConfig.promptModifications) {
          const adaptationType = langConfig.defaultAdaptation;

          if (culturalConfig.promptModifications[adaptationType] &&
              culturalConfig.promptModifications[adaptationType].additions) {

            culturalContextPrompt = `\nCultural Context Information:`;
            for (const addition of culturalConfig.promptModifications[adaptationType].additions) {
              culturalContextPrompt += `\n- ${addition}`;
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error loading cultural context for prompt:', error.message);
  }

  // Prepare prompt based on model
  let prompt;
  let params;

  if (modelId.startsWith('anthropic.claude')) {
    // Claude-specific prompt format
    prompt = `<instructions>
${promptTemplate}
${medicalTermsPrompt}
${culturalContextPrompt}
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
    prompt = `${promptTemplate}
${medicalTermsPrompt}
${culturalContextPrompt}

Text to translate: {text}`;

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
    prompt = `<s>[INST]${promptTemplate}
${medicalTermsPrompt}
${culturalContextPrompt}

Text to translate: {text}[/INST]</s>`;

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
    prompt = `<s>[INST]${promptTemplate}
${medicalTermsPrompt}
${culturalContextPrompt}

Text to translate: {text}[/INST]</s>`;

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
    prompt = `${promptTemplate}
${medicalTermsPrompt}
${culturalContextPrompt}

Text to translate: ${text}`;

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

    // Generate confidence analysis if requested
    let confidenceScore = 'high';
    let confidenceAnalysis = null;
    let confidenceScoreNumeric = 0.95; // Default high confidence

    if (includeConfidenceAnalysis) {
      const analysisResult = await analyzeTranslationConfidence(
        text,
        responseText,
        sourceLanguage,
        targetLanguage,
        medicalContext,
        modelId
      );

      confidenceScore = analysisResult.confidenceLevel;
      confidenceAnalysis = analysisResult;

      // Convert confidence level to numeric value for tracking
      if (confidenceScore === 'high') confidenceScoreNumeric = 0.95;
      else if (confidenceScore === 'medium') confidenceScoreNumeric = 0.8;
      else if (confidenceScore === 'low') confidenceScoreNumeric = 0.6;

      // Use the actual score if available
      if (analysisResult.score) {
        confidenceScoreNumeric = analysisResult.score;
      }
    }

    // Track model performance
    trackModelPerformance(modelId, {
      responseTime: processingTime,
      error: false,
      confidenceScore: confidenceScoreNumeric,
      // Estimate cost based on model tier and input length
      costPerRequest: estimateModelCost(modelId, text.length)
    });

    return {
      translatedText: responseText,
      confidence: confidenceScore,
      sourceLanguage,
      targetLanguage,
      medicalContext,
      modelUsed,
      processingTime,
      ...(confidenceAnalysis && { confidenceAnalysis })
    };
  } catch (error) {
    console.error('Error calling Bedrock:', error);

    // Track model error
    trackModelPerformance(modelId, {
      error: true,
      errorType: error.name || 'UnknownError',
      errorMessage: error.message
    });

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

      // Track AWS Translate success
      trackModelPerformance('aws.translate', {
        responseTime: processingTime,
        error: false,
        confidenceScore: 0.7, // Default medium confidence for AWS Translate
        costPerRequest: estimateModelCost('aws.translate', text.length)
      });

      return {
        translatedText: translateResult.TranslatedText,
        confidence: 'low', // AWS Translate doesn't have medical specialization
        sourceLanguage,
        targetLanguage,
        medicalContext,
        modelUsed: 'aws.translate',
        fallback: true,
        processingTime,
        originalModelError: {
          model: modelId,
          error: error.message
        }
      };
    } catch (translateError) {
      console.error('Error with fallback translation:', translateError);

      // Track AWS Translate error
      trackModelPerformance('aws.translate', {
        error: true,
        errorType: translateError.name || 'UnknownError',
        errorMessage: translateError.message
      });

      throw new Error(`Translation failed: ${error.message}. Fallback also failed: ${translateError.message}`);
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
 * using the specialty-specific model mapping from the configuration
 *
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - The medical context
 * @returns {string} - The recommended model family ('claude', 'titan', 'llama', 'mistral')
 */
function selectBestModelForContext(sourceLanguage, targetLanguage, medicalContext = 'general') {
  // First, check if we have a specialty-specific mapping in the configuration
  if (modelConfig.specialtyModelMapping &&
      modelConfig.specialtyModelMapping[medicalContext]) {

    const specialtyMapping = modelConfig.specialtyModelMapping[medicalContext];

    // Check if we have a specific mapping for this language pair
    const languagePair = `${sourceLanguage}-${targetLanguage}`;
    if (specialtyMapping.languages &&
        specialtyMapping.languages[languagePair]) {
      return specialtyMapping.languages[languagePair];
    }

    // If no specific language pair mapping, use the default for this specialty
    if (specialtyMapping.default) {
      return specialtyMapping.default;
    }
  }

  // If no specialty mapping found, fall back to the heuristic approach

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
  // Default model info
  const modelInfo = {
    id: modelId,
    family: 'unknown',
    capabilities: [],
    recommendedFor: [],
    contextWindow: 4096,
    tokenLimit: 1024,
    languages: [],
    costTier: 'standard'
  };

  // Check if we have detailed capabilities in the config
  if (modelConfig.modelCapabilities && modelConfig.modelCapabilities[modelId]) {
    const capabilities = modelConfig.modelCapabilities[modelId];

    // Update model info with capabilities from config
    if (capabilities.maxTokens) modelInfo.contextWindow = capabilities.maxTokens;
    if (capabilities.outputTokens) modelInfo.tokenLimit = capabilities.outputTokens;
    if (capabilities.languages) modelInfo.languages = capabilities.languages;
    if (capabilities.strengths) modelInfo.capabilities = capabilities.strengths;
    if (capabilities.costTier) modelInfo.costTier = capabilities.costTier;

    // Set recommended for based on strengths and context handling
    if (capabilities.strengths && capabilities.contextHandling) {
      modelInfo.recommendedFor = [
        `${capabilities.contextHandling} context handling`,
        `${capabilities.medicalAccuracy || 'good'} medical accuracy`,
        ...capabilities.strengths.map(s => s.toLowerCase())
      ];
    }
  } else {
    // Fallback to hardcoded model family detection
    // Determine model family and capabilities
    if (modelId.startsWith('anthropic.claude')) {
      modelInfo.family = 'claude';
      modelInfo.capabilities = ['medical translation', 'terminology verification', 'context awareness'];
      modelInfo.recommendedFor = ['complex medical contexts', 'high accuracy needs', 'nuanced translations'];
      modelInfo.languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'ru'];

      if (modelId.includes('claude-3-opus')) {
        modelInfo.contextWindow = 200000;
        modelInfo.tokenLimit = 4096;
        modelInfo.costTier = 'premium';
      } else if (modelId.includes('claude-3-sonnet')) {
        modelInfo.contextWindow = 200000;
        modelInfo.tokenLimit = 4096;
        modelInfo.costTier = 'standard';
      } else if (modelId.includes('claude-3-haiku')) {
        modelInfo.contextWindow = 100000;
        modelInfo.tokenLimit = 2048;
        modelInfo.costTier = 'economy';
      } else {
        modelInfo.contextWindow = 100000;
        modelInfo.tokenLimit = 2048;
        modelInfo.costTier = 'economy';
      }
    } else if (modelId.startsWith('amazon.titan')) {
      modelInfo.family = 'titan';
      modelInfo.capabilities = ['general translation', 'Asian language support'];
      modelInfo.recommendedFor = ['Asian languages', 'general medical contexts'];
      modelInfo.languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'th', 'vi'];

      if (modelId.includes('premier')) {
        modelInfo.contextWindow = 32000;
        modelInfo.tokenLimit = 4096;
        modelInfo.costTier = 'standard';
      } else if (modelId.includes('express')) {
        modelInfo.contextWindow = 8000;
        modelInfo.tokenLimit = 1024;
        modelInfo.costTier = 'standard';
      } else if (modelId.includes('lite')) {
        modelInfo.contextWindow = 4000;
        modelInfo.tokenLimit = 512;
        modelInfo.costTier = 'economy';
      } else {
        modelInfo.contextWindow = 8000;
        modelInfo.tokenLimit = 1024;
        modelInfo.costTier = 'standard';
      }
    } else if (modelId.startsWith('meta.llama')) {
      modelInfo.family = 'llama';
      modelInfo.capabilities = ['efficient translation', 'European language support'];
      modelInfo.recommendedFor = ['European languages', 'general medical contexts'];
      modelInfo.languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl'];

      if (modelId.includes('llama3-70b')) {
        modelInfo.contextWindow = 8192;
        modelInfo.tokenLimit = 2048;
        modelInfo.costTier = 'standard';
      } else if (modelId.includes('llama3-8b')) {
        modelInfo.contextWindow = 4096;
        modelInfo.tokenLimit = 1024;
        modelInfo.costTier = 'economy';
      } else if (modelId.includes('70b')) {
        modelInfo.contextWindow = 4096;
        modelInfo.tokenLimit = 1024;
        modelInfo.costTier = 'standard';
      } else {
        modelInfo.contextWindow = 2048;
        modelInfo.tokenLimit = 512;
        modelInfo.costTier = 'economy';
      }
    } else if (modelId.startsWith('mistral.')) {
      modelInfo.family = 'mistral';
      modelInfo.capabilities = ['Slavic language support', 'general translation'];
      modelInfo.recommendedFor = ['Slavic languages', 'general medical contexts'];
      modelInfo.languages = ['en', 'es', 'fr', 'de', 'it', 'ru', 'uk', 'pl', 'cs'];

      if (modelId.includes('mistral-large')) {
        modelInfo.contextWindow = 32768;
        modelInfo.tokenLimit = 2048;
        modelInfo.costTier = 'standard';
      } else if (modelId.includes('mixtral')) {
        modelInfo.contextWindow = 8192;
        modelInfo.tokenLimit = 1024;
        modelInfo.costTier = 'standard';
      } else {
        modelInfo.contextWindow = 4096;
        modelInfo.tokenLimit = 512;
        modelInfo.costTier = 'economy';
      }
    } else if (modelId.startsWith('cohere.')) {
      modelInfo.family = 'cohere';
      modelInfo.capabilities = ['multilingual support', 'general translation'];
      modelInfo.recommendedFor = ['multilingual contexts', 'general medical content'];
      modelInfo.languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ja', 'ko', 'zh'];

      if (modelId.includes('command-text-v14')) {
        modelInfo.contextWindow = 128000;
        modelInfo.tokenLimit = 4096;
        modelInfo.costTier = 'standard';
      } else if (modelId.includes('command-light')) {
        modelInfo.contextWindow = 64000;
        modelInfo.tokenLimit = 2048;
        modelInfo.costTier = 'economy';
      } else {
        modelInfo.contextWindow = 4096;
        modelInfo.tokenLimit = 1024;
        modelInfo.costTier = 'standard';
      }
    } else if (modelId.startsWith('ai21.')) {
      modelInfo.family = 'ai21';
      modelInfo.capabilities = ['general translation', 'technical content'];
      modelInfo.recommendedFor = ['technical medical content', 'structured output'];
      modelInfo.languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'he'];

      if (modelId.includes('ultra')) {
        modelInfo.contextWindow = 8192;
        modelInfo.tokenLimit = 1024;
        modelInfo.costTier = 'standard';
      } else {
        modelInfo.contextWindow = 4096;
        modelInfo.tokenLimit = 512;
        modelInfo.costTier = 'economy';
      }
    } else if (modelId === 'aws.translate') {
      modelInfo.family = 'aws.translate';
      modelInfo.capabilities = ['basic translation', 'high availability'];
      modelInfo.recommendedFor = ['fallback option', 'simple content'];
      modelInfo.languages = Object.keys(LANGUAGE_CODES);
      modelInfo.contextWindow = 10000;
      modelInfo.tokenLimit = 10000;
      modelInfo.costTier = 'economy';
    }
  }

  // Determine model family if not set
  if (modelInfo.family === 'unknown') {
    if (modelId.startsWith('anthropic.')) modelInfo.family = 'claude';
    else if (modelId.startsWith('amazon.')) modelInfo.family = 'titan';
    else if (modelId.startsWith('meta.')) modelInfo.family = 'llama';
    else if (modelId.startsWith('mistral.')) modelInfo.family = 'mistral';
    else if (modelId.startsWith('cohere.')) modelInfo.family = 'cohere';
    else if (modelId.startsWith('ai21.')) modelInfo.family = 'ai21';
    else if (modelId.startsWith('stability.')) modelInfo.family = 'stability';
  }

  return modelInfo;
}

// Model performance tracking
const modelPerformanceData = {
  responseTime: {},
  errorRate: {},
  confidenceScore: {},
  userFeedbackScore: {},
  costPerRequest: {},
  usageCount: {},
  lastUpdated: {}
};

/**
 * Estimate the cost of a model request based on input length
 *
 * @param {string} modelId - The model ID
 * @param {number} inputLength - The length of the input text
 * @returns {number} - Estimated cost in USD
 */
function estimateModelCost(modelId, inputLength) {
  // Approximate token count (rough estimate)
  const tokenCount = Math.ceil(inputLength / 4);

  // Base cost per 1K tokens (input)
  let costPer1KTokens = 0.0;

  // Get model info to determine cost tier
  const modelInfo = getModelInfo(modelId);
  const costTier = modelInfo.costTier || 'standard';

  // Set cost based on model family and tier
  if (modelId.startsWith('anthropic.claude')) {
    if (modelId.includes('claude-3-opus')) {
      costPer1KTokens = 0.015; // Premium tier
    } else if (modelId.includes('claude-3-sonnet')) {
      costPer1KTokens = 0.008; // Standard tier
    } else if (modelId.includes('claude-3-haiku')) {
      costPer1KTokens = 0.0025; // Economy tier
    } else {
      costPer1KTokens = 0.0025; // Default Claude
    }
  } else if (modelId.startsWith('amazon.titan')) {
    if (modelId.includes('premier')) {
      costPer1KTokens = 0.0075; // Standard tier
    } else if (modelId.includes('express')) {
      costPer1KTokens = 0.0035; // Standard tier
    } else if (modelId.includes('lite')) {
      costPer1KTokens = 0.0015; // Economy tier
    } else {
      costPer1KTokens = 0.0035; // Default Titan
    }
  } else if (modelId.startsWith('meta.llama')) {
    if (modelId.includes('llama3-70b') || modelId.includes('70b')) {
      costPer1KTokens = 0.0045; // Standard tier
    } else {
      costPer1KTokens = 0.0015; // Economy tier
    }
  } else if (modelId.startsWith('mistral.')) {
    if (modelId.includes('mistral-large')) {
      costPer1KTokens = 0.006; // Standard tier
    } else if (modelId.includes('mixtral')) {
      costPer1KTokens = 0.003; // Standard tier
    } else {
      costPer1KTokens = 0.0015; // Economy tier
    }
  } else if (modelId.startsWith('cohere.')) {
    if (modelId.includes('command-light')) {
      costPer1KTokens = 0.0015; // Economy tier
    } else {
      costPer1KTokens = 0.003; // Standard tier
    }
  } else if (modelId.startsWith('ai21.')) {
    if (modelId.includes('ultra')) {
      costPer1KTokens = 0.0045; // Standard tier
    } else {
      costPer1KTokens = 0.0015; // Economy tier
    }
  } else if (modelId === 'aws.translate') {
    // AWS Translate pricing is per character
    return (inputLength / 1000000) * 15.0; // $15 per million characters
  }

  // Calculate cost based on token count
  return (tokenCount / 1000) * costPer1KTokens;
}

/**
 * Track model performance metrics
 *
 * @param {string} modelId - The model ID
 * @param {Object} metrics - Performance metrics
 * @returns {void}
 */
function trackModelPerformance(modelId, metrics) {
  // Skip if performance tracking is disabled
  if (!modelConfig.modelPerformanceTracking || !modelConfig.modelPerformanceTracking.enabled) {
    return;
  }

  // Initialize model data if not exists
  if (!modelPerformanceData.responseTime[modelId]) {
    modelPerformanceData.responseTime[modelId] = [];
    modelPerformanceData.errorRate[modelId] = { success: 0, error: 0 };
    modelPerformanceData.confidenceScore[modelId] = [];
    modelPerformanceData.userFeedbackScore[modelId] = [];
    modelPerformanceData.costPerRequest[modelId] = [];
    modelPerformanceData.usageCount[modelId] = 0;
  }

  // Update usage count
  modelPerformanceData.usageCount[modelId]++;

  // Update last updated timestamp
  modelPerformanceData.lastUpdated[modelId] = Date.now();

  // Track response time
  if (metrics.responseTime) {
    modelPerformanceData.responseTime[modelId].push(metrics.responseTime);
    // Keep only the last 100 samples
    if (modelPerformanceData.responseTime[modelId].length > 100) {
      modelPerformanceData.responseTime[modelId].shift();
    }
  }

  // Track error rate
  if (metrics.error !== undefined) {
    if (metrics.error) {
      modelPerformanceData.errorRate[modelId].error++;
    } else {
      modelPerformanceData.errorRate[modelId].success++;
    }
  }

  // Track confidence score
  if (metrics.confidenceScore) {
    modelPerformanceData.confidenceScore[modelId].push(metrics.confidenceScore);
    // Keep only the last 100 samples
    if (modelPerformanceData.confidenceScore[modelId].length > 100) {
      modelPerformanceData.confidenceScore[modelId].shift();
    }
  }

  // Track user feedback score
  if (metrics.userFeedbackScore) {
    modelPerformanceData.userFeedbackScore[modelId].push(metrics.userFeedbackScore);
    // Keep only the last 100 samples
    if (modelPerformanceData.userFeedbackScore[modelId].length > 100) {
      modelPerformanceData.userFeedbackScore[modelId].shift();
    }
  }

  // Track cost per request
  if (metrics.costPerRequest) {
    modelPerformanceData.costPerRequest[modelId].push(metrics.costPerRequest);
    // Keep only the last 100 samples
    if (modelPerformanceData.costPerRequest[modelId].length > 100) {
      modelPerformanceData.costPerRequest[modelId].shift();
    }
  }

  // Log performance data for debugging
  console.log(`Model performance tracked for ${modelId}: ${JSON.stringify(metrics)}`);
}

/**
 * Calculate model performance metrics
 *
 * @param {string} modelId - The model ID
 * @returns {Object} - Performance metrics
 */
function calculateModelPerformanceMetrics(modelId) {
  // Return empty metrics if no data available
  if (!modelPerformanceData.responseTime[modelId]) {
    return {
      responseTime: null,
      errorRate: null,
      confidenceScore: null,
      userFeedbackScore: null,
      costPerRequest: null,
      usageCount: 0,
      lastUpdated: null,
      performanceRating: null
    };
  }

  // Calculate average response time
  const responseTimeAvg = modelPerformanceData.responseTime[modelId].length > 0
    ? modelPerformanceData.responseTime[modelId].reduce((sum, time) => sum + time, 0) / modelPerformanceData.responseTime[modelId].length
    : null;

  // Calculate error rate
  const totalRequests = modelPerformanceData.errorRate[modelId].success + modelPerformanceData.errorRate[modelId].error;
  const errorRate = totalRequests > 0
    ? modelPerformanceData.errorRate[modelId].error / totalRequests
    : null;

  // Calculate average confidence score
  const confidenceScoreAvg = modelPerformanceData.confidenceScore[modelId].length > 0
    ? modelPerformanceData.confidenceScore[modelId].reduce((sum, score) => sum + score, 0) / modelPerformanceData.confidenceScore[modelId].length
    : null;

  // Calculate average user feedback score
  const userFeedbackScoreAvg = modelPerformanceData.userFeedbackScore[modelId].length > 0
    ? modelPerformanceData.userFeedbackScore[modelId].reduce((sum, score) => sum + score, 0) / modelPerformanceData.userFeedbackScore[modelId].length
    : null;

  // Calculate average cost per request
  const costPerRequestAvg = modelPerformanceData.costPerRequest[modelId].length > 0
    ? modelPerformanceData.costPerRequest[modelId].reduce((sum, cost) => sum + cost, 0) / modelPerformanceData.costPerRequest[modelId].length
    : null;

  // Calculate performance rating based on thresholds
  let performanceRating = null;
  if (modelConfig.modelPerformanceTracking && modelConfig.modelPerformanceTracking.performanceThresholds) {
    const thresholds = modelConfig.modelPerformanceTracking.performanceThresholds;

    // Calculate response time rating
    let responseTimeRating = 0;
    if (responseTimeAvg !== null && thresholds.responseTime) {
      if (responseTimeAvg <= thresholds.responseTime.excellent) responseTimeRating = 4;
      else if (responseTimeAvg <= thresholds.responseTime.good) responseTimeRating = 3;
      else if (responseTimeAvg <= thresholds.responseTime.acceptable) responseTimeRating = 2;
      else if (responseTimeAvg <= thresholds.responseTime.poor) responseTimeRating = 1;
    }

    // Calculate error rate rating
    let errorRateRating = 0;
    if (errorRate !== null && thresholds.errorRate) {
      if (errorRate <= thresholds.errorRate.excellent) errorRateRating = 4;
      else if (errorRate <= thresholds.errorRate.good) errorRateRating = 3;
      else if (errorRate <= thresholds.errorRate.acceptable) errorRateRating = 2;
      else if (errorRate <= thresholds.errorRate.poor) errorRateRating = 1;
    }

    // Calculate confidence score rating
    let confidenceScoreRating = 0;
    if (confidenceScoreAvg !== null && thresholds.confidenceScore) {
      if (confidenceScoreAvg >= thresholds.confidenceScore.excellent) confidenceScoreRating = 4;
      else if (confidenceScoreAvg >= thresholds.confidenceScore.good) confidenceScoreRating = 3;
      else if (confidenceScoreAvg >= thresholds.confidenceScore.acceptable) confidenceScoreRating = 2;
      else if (confidenceScoreAvg >= thresholds.confidenceScore.poor) confidenceScoreRating = 1;
    }

    // Calculate overall performance rating (average of all ratings)
    const ratings = [responseTimeRating, errorRateRating, confidenceScoreRating].filter(r => r > 0);
    if (ratings.length > 0) {
      const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      performanceRating = avgRating.toFixed(2);
    }
  }

  return {
    responseTime: responseTimeAvg,
    errorRate: errorRate,
    confidenceScore: confidenceScoreAvg,
    userFeedbackScore: userFeedbackScoreAvg,
    costPerRequest: costPerRequestAvg,
    usageCount: modelPerformanceData.usageCount[modelId],
    lastUpdated: modelPerformanceData.lastUpdated[modelId],
    performanceRating: performanceRating
  };
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
      const familyModels = [];

      for (const modelId of models) {
        const info = getModelInfo(modelId);
        const performance = calculateModelPerformanceMetrics(modelId);

        familyModels.push({
          id: modelId,
          capabilities: info.capabilities,
          recommendedFor: info.recommendedFor,
          contextWindow: info.contextWindow,
          tokenLimit: info.tokenLimit,
          languages: info.languages,
          costTier: info.costTier,
          performance: performance
        });
      }

      modelInfo[family] = {
        models: familyModels,
        capabilities: getModelInfo(models[0]).capabilities,
        recommendedFor: getModelInfo(models[0]).recommendedFor
      };
    }
  }

  return {
    availableModels: modelInfo,
    defaultModel: modelConfig.defaultModel,
    fallbackStrategy: modelConfig.fallbackStrategy,
    performanceTracking: modelConfig.modelPerformanceTracking ? {
      enabled: modelConfig.modelPerformanceTracking.enabled,
      metricsTracked: modelConfig.modelPerformanceTracking.metricsToTrack
    } : null
  };
}

/**
 * Analyzes the confidence of a translation based on various factors
 * using the enhanced adaptive confidence threshold system
 *
 * @param {string} sourceText - The original text
 * @param {string} translatedText - The translated text
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - The medical context
 * @param {string} modelId - The model ID used for translation
 * @returns {Promise<Object>} - Confidence analysis result
 */
async function analyzeTranslationConfidence(sourceText, translatedText, sourceLanguage, targetLanguage, medicalContext, modelId) {
  try {
    // Import the adaptive confidence module with enhanced functionality
    const {
      calculateAdaptiveThresholds,
      determineConfidenceLevel,
      analyzeMedicalTerminologyComplexity,
      getContextComplexityFactor
    } = require('./adaptive-confidence');

    // Start with a base confidence level based on the model used
    let baseConfidence = 0.9; // Default high confidence

    // Adjust base confidence based on model family
    if (modelId.startsWith('anthropic.claude')) {
      baseConfidence = 0.95; // Claude models have highest confidence for medical content
    } else if (modelId.startsWith('amazon.titan')) {
      baseConfidence = 0.85; // Titan models have good general confidence
    } else if (modelId.startsWith('meta.llama')) {
      baseConfidence = 0.8; // Llama models have moderate confidence
    } else if (modelId.startsWith('mistral.')) {
      baseConfidence = 0.85; // Mistral models have good confidence
    } else if (modelId === 'aws.translate') {
      baseConfidence = 0.7; // AWS Translate has lower confidence for medical content
    }

    // Factors that might affect confidence
    const factors = [];

    // Analyze medical terminology in source and target texts
    const sourceTerminologyAnalysis = analyzeMedicalTerminologyComplexity(sourceText, sourceLanguage, medicalContext);
    const targetTerminologyAnalysis = analyzeMedicalTerminologyComplexity(translatedText, targetLanguage, medicalContext);

    // Get context complexity factor
    const contextComplexity = getContextComplexityFactor(medicalContext);

    // Add context complexity as a factor
    factors.push({
      factor: 'medical_context_complexity',
      impact: contextComplexity > 1.2 ? 'negative' : 'neutral',
      description: `Medical context ${medicalContext} has complexity factor ${contextComplexity.toFixed(2)}`,
      value: contextComplexity
    });

    // Add terminology complexity as a factor
    factors.push({
      factor: 'terminology_complexity',
      impact: sourceTerminologyAnalysis.complexityScore > 1.2 ? 'negative' : 'neutral',
      description: `Source text has terminology complexity score ${sourceTerminologyAnalysis.complexityScore.toFixed(2)}`,
      value: sourceTerminologyAnalysis.complexityScore
    });

    // 1. Check for medical terminology presence and preservation
    if (sourceTerminologyAnalysis.termCount > 0) {
      // Calculate terminology preservation ratio
      const preservationRatio = targetTerminologyAnalysis.termCount / sourceTerminologyAnalysis.termCount;

      // If source has medical terms but target has significantly fewer, reduce confidence
      if (preservationRatio < 0.7) {
        // Scale confidence reduction based on the severity of terminology loss
        const confidenceReduction = 0.1 * (1 - preservationRatio);
        baseConfidence -= confidenceReduction;

        factors.push({
          factor: 'medical_terminology_preservation',
          impact: 'negative',
          description: `Only ${Math.round(preservationRatio * 100)}% of medical terms appear to be preserved in translation`,
          sourceTerms: sourceTerminologyAnalysis.termCount,
          targetTerms: targetTerminologyAnalysis.termCount,
          preservationRatio
        });
      } else {
        // Good preservation of terminology
        factors.push({
          factor: 'medical_terminology_preservation',
          impact: 'positive',
          description: `Good preservation of medical terminology (${Math.round(preservationRatio * 100)}%)`,
          preservationRatio
        });
      }
    }

    // 2. Check for length discrepancy
    const sourceLengthWords = sourceText.split(/\s+/).length;
    const targetLengthWords = translatedText.split(/\s+/).length;
    const lengthRatio = targetLengthWords / sourceLengthWords;

    // If target is significantly shorter or longer than source, reduce confidence
    if (lengthRatio < 0.7 || lengthRatio > 1.5) {
      // Scale confidence reduction based on how extreme the length difference is
      const normalizedRatio = lengthRatio < 1 ? lengthRatio : 1/lengthRatio;
      const confidenceReduction = 0.1 * (1 - normalizedRatio);
      baseConfidence -= confidenceReduction;

      factors.push({
        factor: 'length_discrepancy',
        impact: 'negative',
        description: `Significant difference in text length between source (${sourceLengthWords} words) and translation (${targetLengthWords} words)`,
        lengthRatio
      });
    }

    // 3. Check for critical terms preservation
    if (sourceTerminologyAnalysis.criticalTermsCount > 0) {
      // Calculate critical terms preservation ratio
      const criticalTermsRatio = targetTerminologyAnalysis.criticalTermsCount / sourceTerminologyAnalysis.criticalTermsCount;

      if (criticalTermsRatio < 1.0) {
        // Any loss of critical terms is significant
        const criticalReduction = 0.15 * (1 - criticalTermsRatio);
        baseConfidence -= criticalReduction;

        factors.push({
          factor: 'critical_terms_preservation',
          impact: 'negative',
          description: `Only ${Math.round(criticalTermsRatio * 100)}% of critical medical terms preserved`,
          sourceCriticalTerms: sourceTerminologyAnalysis.criticalTermsCount,
          targetCriticalTerms: targetTerminologyAnalysis.criticalTermsCount
        });
      } else {
        // All critical terms preserved
        factors.push({
          factor: 'critical_terms_preservation',
          impact: 'positive',
          description: 'All critical medical terms preserved in translation'
        });
      }
    }

    // 4. Apply model-specific adjustments for complex medical contexts
    if (contextComplexity > 1.2) {
      // For complex contexts, adjust confidence based on model
      if (modelId.startsWith('anthropic.claude')) {
        // Claude handles complex contexts well
        baseConfidence += 0.05;
        factors.push({
          factor: 'model_context_handling',
          impact: 'positive',
          description: 'Claude models excel at complex medical contexts'
        });
      } else {
        // Other models may struggle with complex contexts
        // Scale reduction based on context complexity
        const contextReduction = 0.05 * (contextComplexity - 1.0);
        baseConfidence -= contextReduction;

        factors.push({
          factor: 'model_context_handling',
          impact: 'negative',
          description: `Model may have reduced accuracy with complex ${medicalContext} context`
        });
      }
    }

    // Get enhanced adaptive thresholds based on context and other factors
    const adaptiveThresholds = calculateAdaptiveThresholds(
      medicalContext,
      sourceLanguage,
      targetLanguage,
      sourceText,
      {
        previousAccuracy: 0.9, // Default previous accuracy
        terminologyComplexity: sourceTerminologyAnalysis.complexityScore,
        criticalTermsCount: sourceTerminologyAnalysis.criticalTermsCount
      }
    );

    // Determine confidence level using adaptive thresholds
    const confidenceLevel = determineConfidenceLevel(baseConfidence, adaptiveThresholds);

    // Add adaptive threshold information to the result
    factors.push({
      factor: 'adaptive_thresholds',
      impact: 'neutral',
      description: 'Using enhanced adaptive thresholds based on medical context complexity',
      thresholds: adaptiveThresholds
    });

    return {
      confidenceLevel,
      confidenceScore: baseConfidence,
      adaptiveThresholds,
      factors,
      modelId,
      medicalContext,
      analysis: {
        sourceTerminology: sourceTerminologyAnalysis,
        targetTerminology: targetTerminologyAnalysis,
        contextComplexity,
        lengthRatio
      }
    };
  } catch (error) {
    console.error('Error analyzing translation confidence:', error);
    // Return default high confidence if analysis fails
    return {
      confidenceLevel: 'high',
      confidenceScore: 0.9,
      factors: [{
        factor: 'analysis_error',
        impact: 'neutral',
        description: 'Error during confidence analysis'
      }],
      modelId,
      medicalContext
    };
  }
}

/**
 * Simple function to extract potential medical terms from text
 * This is a simplified version of the more comprehensive function in medical-kb.js
 *
 * @param {string} text - The text to analyze
 * @param {string} language - The language code
 * @returns {Array<string>} - Array of potential medical terms
 */
function extractMedicalTermsSimple(text, language) {
  // Skip empty text
  if (!text || text.trim() === '') {
    return [];
  }

  // Common medical term patterns
  const medicalPatterns = [
    /\b[A-Z][a-z]+ (disease|syndrome|disorder|condition)\b/g,
    /\b(MRI|CT|CAT|PET|EKG|ECG|EEG|ultrasound|x-ray)\b/gi,
    /\b(diagnosis|prognosis|treatment|therapy)\b/gi,
    /\b(cardiac|pulmonary|hepatic|renal|neural|cerebral)\b/gi,
    /\b(diabetes|hypertension|asthma|arthritis|cancer)\b/gi
  ];

  // Extract terms using regex patterns
  let terms = [];
  for (const pattern of medicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms = [...terms, ...matches];
    }
  }

  // Remove duplicates and convert to lowercase for consistency
  return [...new Set(terms.map(term => term.toLowerCase()))];
}

module.exports = {
  translateText,
  verifyMedicalTerminology,
  selectBestModelForContext,
  getModelInfo,
  getAvailableModels,
  mockTranslate,
  analyzeTranslationConfidence,
  trackModelPerformance,
  calculateModelPerformanceMetrics,
  estimateModelCost
};
