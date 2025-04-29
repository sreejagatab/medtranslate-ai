/**
 * Amazon Bedrock client for medical translation
 *
 * This module provides functions to interact with Amazon Bedrock for
 * medical translation tasks with specialized prompts for healthcare contexts.
 *
 * Supports multiple models including Claude, Titan, and Llama 2 for optimal
 * translation quality with medical terminology.
 */

const AWS = require('aws-sdk');

// Initialize Bedrock client (only if not in development mode)
const bedrock = process.env.NODE_ENV !== 'development' ? new AWS.BedrockRuntime() : null;

// Initialize AWS Translate for fallback
const translate = process.env.NODE_ENV !== 'development' ? new AWS.Translate() : null;

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

// Medical context mapping
const MEDICAL_CONTEXTS = {
  'general': 'general medical',
  'cardiology': 'cardiology',
  'neurology': 'neurology',
  'pediatrics': 'pediatrics',
  'oncology': 'oncology',
  'emergency': 'emergency medicine',
  'psychiatry': 'psychiatry',
  'obstetrics': 'obstetrics and gynecology',
  'dermatology': 'dermatology',
  'orthopedics': 'orthopedics',
  'gastroenterology': 'gastroenterology',
  'endocrinology': 'endocrinology',
  'pulmonology': 'pulmonology',
  'nephrology': 'nephrology',
  'urology': 'urology',
  'infectious': 'infectious disease',
  'primary': 'primary care'
};

// Supported models for medical translation
const SUPPORTED_MODELS = {
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

// Mock translation function for development
function mockTranslate(text, sourceLanguage, targetLanguage, medicalContext = 'general') {
  // Simple mock translations for demo
  const translations = {
    'en-es': {
      'Hello': 'Hola',
      'How are you?': '¿Cómo estás?',
      'I am a doctor': 'Soy médico',
      'Where does it hurt?': '¿Dónde te duele?',
      'Do you have any allergies?': '¿Tienes alguna alergia?',
      'Take this medication twice a day': 'Toma este medicamento dos veces al día',
      'Hello, how are you feeling today?': '¿Hola, cómo te sientes hoy?'
    },
    'es-en': {
      'Hola': 'Hello',
      '¿Cómo estás?': 'How are you?',
      'Me duele la cabeza': 'My head hurts',
      'Tengo fiebre': 'I have a fever',
      'Soy alérgico a la penicilina': 'I am allergic to penicillin',
      'No puedo respirar bien': 'I cannot breathe well'
    }
  };

  const langPair = `${sourceLanguage}-${targetLanguage}`;

  // Check if we have translations for this language pair
  if (!translations[langPair]) {
    return {
      translatedText: `[Translation not available for ${langPair}] ${text}`,
      confidence: 'low'
    };
  }

  // Check if we have a direct translation
  if (translations[langPair][text]) {
    return {
      translatedText: translations[langPair][text],
      confidence: 'high'
    };
  }

  // Simple fallback: just append a note
  return {
    translatedText: `[Translated] ${text}`,
    confidence: 'medium'
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
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Translating from ${sourceLanguage} to ${targetLanguage}: ${text}`);
    return mockTranslate(text, sourceLanguage, targetLanguage, medicalContext);
  }

  // Get full language names
  const sourceLang = LANGUAGE_CODES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_CODES[targetLanguage] || targetLanguage;
  const context = MEDICAL_CONTEXTS[medicalContext] || medicalContext;

  // Select the appropriate model based on configuration and preference
  let modelId;

  if (preferredModel && SUPPORTED_MODELS[preferredModel]) {
    // Use the first model from the preferred model family
    modelId = SUPPORTED_MODELS[preferredModel][0];
  } else {
    // Use the configured model or default to Claude
    modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
  }

  // Format medical terms for inclusion in the prompt
  let medicalTermsPrompt = '';
  if (medicalTerms && medicalTerms.length > 0) {
    medicalTermsPrompt = 'Known medical terminology translations:\n';
    medicalTerms.forEach(term => {
      medicalTermsPrompt += `- "${term.sourceTerm}" (${sourceLang}) → "${term.targetTerm}" (${targetLang})\n`;
    });
    medicalTermsPrompt += '\nPlease ensure these terms are translated consistently.\n';
  }

  // Prepare prompt for the model
  let prompt;
  let params;

  if (modelId.startsWith('anthropic.claude')) {
    // Claude-specific prompt format with enhanced medical context
    prompt = `<instructions>
You are an expert medical translator specializing in healthcare communications.
Translate the following text from ${sourceLang} to ${targetLang}.
Maintain medical accuracy, technical terminology, and appropriate tone.
Pay special attention to medical terms, drug names, anatomical references, and procedural descriptions.
Only return the translated text, nothing else.
${medicalTermsPrompt}
</instructions>

<input>
Medical specialty context: ${context}
Text to translate: ${text}
</input>`;

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
    prompt = `You are an expert medical translator specializing in healthcare communications.
Translate the following text from ${sourceLang} to ${targetLang}.
Maintain medical accuracy, technical terminology, and appropriate tone.
Pay special attention to medical terms, drug names, anatomical references, and procedural descriptions.
${medicalTermsPrompt}

Medical specialty context: ${context}
Text to translate: ${text}

Provide only the translated text without any explanations or notes.`;

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
    prompt = `<s>[INST]You are an expert medical translator specializing in healthcare communications.
Translate the following text from ${sourceLang} to ${targetLang}.
Maintain medical accuracy, technical terminology, and appropriate tone.
${medicalTermsPrompt}

Medical specialty context: ${context}
Text to translate: ${text}

Provide only the translated text without any explanations or notes.[/INST]</s>`;

    params = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_gen_len: 512,
        temperature: 0.2,
        top_p: 0.9
      })
    };
  } else if (modelId.startsWith('mistral.')) {
    // Mistral-specific prompt format
    prompt = `<s>[INST]You are an expert medical translator specializing in healthcare communications.
Translate the following text from ${sourceLang} to ${targetLang}.
Maintain medical accuracy, technical terminology, and appropriate tone.
${medicalTermsPrompt}

Medical specialty context: ${context}
Text to translate: ${text}

Provide only the translated text without any explanations or notes.[/INST]</s>`;

    params = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 512,
        temperature: 0.2,
        top_p: 0.9
      })
    };
  } else {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  try {
    const response = await bedrock.invokeModel(params).promise();
    const responseBody = JSON.parse(response.body.toString());

    let translatedText;
    let confidence = 'medium';
    let modelUsed = modelId;

    // Parse response based on model
    if (modelId.startsWith('anthropic.claude')) {
      translatedText = responseBody.content[0].text.trim();
      confidence = 'high'; // Claude models typically provide high-quality translations
    } else if (modelId.startsWith('amazon.titan')) {
      translatedText = responseBody.results[0].outputText.trim();
      confidence = responseBody.results[0].completionReason === 'FINISH' ? 'high' : 'medium';
    } else if (modelId.startsWith('meta.llama')) {
      translatedText = responseBody.generation.trim();
      confidence = 'medium';
    } else if (modelId.startsWith('mistral.')) {
      translatedText = responseBody.outputs[0].text.trim();
      confidence = 'medium';
    }

    // Clean up any potential model artifacts or prefixes
    translatedText = cleanTranslationOutput(translatedText);

    return {
      translatedText,
      confidence,
      sourceLanguage,
      targetLanguage,
      medicalContext,
      modelUsed
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

      return {
        translatedText: translateResult.TranslatedText,
        confidence: 'low', // AWS Translate doesn't have medical specialization
        sourceLanguage,
        targetLanguage,
        medicalContext,
        modelUsed: 'aws.translate',
        fallback: true
      };
    } catch (translateError) {
      console.error('Error with fallback translation:', translateError);
      throw new Error(`Translation failed: ${error.message}. Fallback also failed.`);
    }
  }
}

/**
 * Cleans up translation output to remove any model artifacts or prefixes
 *
 * @param {string} text - The raw translated text
 * @returns {string} - The cleaned translated text
 */
function cleanTranslationOutput(text) {
  // Remove common prefixes that models might add
  const prefixesToRemove = [
    'Translation:',
    'Translated text:',
    'Here is the translation:',
    'The translation is:'
  ];

  let cleanedText = text;

  for (const prefix of prefixesToRemove) {
    if (cleanedText.startsWith(prefix)) {
      cleanedText = cleanedText.substring(prefix.length).trim();
    }
  }

  return cleanedText;
}

/**
 * Verifies medical terminology in a translation using Amazon Bedrock
 *
 * @param {string} sourceText - The original text
 * @param {string} translatedText - The translated text
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - The medical context
 * @param {string} preferredModel - Optional preferred model type ('claude', 'titan', 'llama', 'mistral')
 * @returns {Promise<Object>} - Verification results with confidence scores
 */
async function verifyMedicalTerminology(sourceText, translatedText, sourceLanguage, targetLanguage, medicalContext, preferredModel = null) {
  // For local development, use mock verification
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Verifying medical terminology for ${sourceLanguage} to ${targetLanguage}`);
    return {
      terms: [
        {
          sourceTerm: 'headache',
          translatedTerm: 'dolor de cabeza',
          isAccurate: true,
          suggestion: ''
        }
      ],
      overallAccuracy: 1.0
    };
  }

  // Get full language names
  const sourceLang = LANGUAGE_CODES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_CODES[targetLanguage] || targetLanguage;
  const context = MEDICAL_CONTEXTS[medicalContext] || medicalContext;

  // Select the appropriate model based on configuration and preference
  // For terminology verification, we prefer Claude models for their accuracy
  let modelId;

  if (preferredModel && SUPPORTED_MODELS[preferredModel]) {
    // Use the first model from the preferred model family
    modelId = SUPPORTED_MODELS[preferredModel][0];
  } else if (SUPPORTED_MODELS['claude']) {
    // Prefer Claude for medical terminology verification
    modelId = SUPPORTED_MODELS['claude'][0];
  } else {
    // Fallback to configured model
    modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
  }

  // Prepare prompt for terminology verification
  let prompt;
  let params;

  if (modelId.startsWith('anthropic.claude')) {
    // Claude-specific prompt format with enhanced medical context
    prompt = `<instructions>
You are a medical terminology expert specializing in multilingual healthcare communications.
Review the following translation from ${sourceLang} to ${targetLang} in the context of ${context} medicine.
Identify any medical terms, drug names, anatomical references, or procedural descriptions that may have been mistranslated or require verification.

For each medical term, provide:
1. The term in the source language
2. The translated term
3. Whether the translation is accurate (true/false)
4. A suggested correction if needed

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
Original text: ${sourceText}
Translated text: ${translatedText}
Medical specialty: ${context}
</input>`;

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
    prompt = `You are a medical terminology expert specializing in multilingual healthcare communications.
Review the following translation from ${sourceLang} to ${targetLang} in the context of ${context} medicine.
Identify any medical terms, drug names, anatomical references, or procedural descriptions that may have been mistranslated or require verification.

Original text: ${sourceText}
Translated text: ${translatedText}
Medical specialty: ${context}

For each medical term, provide:
1. The term in the source language
2. The translated term
3. Whether the translation is accurate (true/false)
4. A suggested correction if needed

Format your response as a JSON array of objects with the following structure:
[
  {
    "sourceTerm": "term in source language",
    "translatedTerm": "term in target language",
    "isAccurate": true/false,
    "suggestion": "suggested correction if needed"
  }
]

If no medical terms are found or all terms are correctly translated, return an empty array: []`;

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
    prompt = `<s>[INST]You are a medical terminology expert specializing in multilingual healthcare communications.
Review the following translation from ${sourceLang} to ${targetLang} in the context of ${context} medicine.
Identify any medical terms that may have been mistranslated or require verification.

Original text: ${sourceText}
Translated text: ${translatedText}
Medical specialty: ${context}

Format your response as a JSON array of objects with the following structure:
[
  {
    "sourceTerm": "term in source language",
    "translatedTerm": "term in target language",
    "isAccurate": true/false,
    "suggestion": "suggested correction if needed"
  }
]

If no medical terms are found or all terms are correctly translated, return an empty array: [][/INST]</s>`;

    params = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_gen_len: 512,
        temperature: 0.2,
        top_p: 0.9
      })
    };
  } else if (modelId.startsWith('mistral.')) {
    // Mistral-specific prompt format
    prompt = `<s>[INST]You are a medical terminology expert specializing in multilingual healthcare communications.
Review the following translation from ${sourceLang} to ${targetLang} in the context of ${context} medicine.
Identify any medical terms that may have been mistranslated or require verification.

Original text: ${sourceText}
Translated text: ${translatedText}
Medical specialty: ${context}

Format your response as a JSON array of objects with the following structure:
[
  {
    "sourceTerm": "term in source language",
    "translatedTerm": "term in target language",
    "isAccurate": true/false,
    "suggestion": "suggested correction if needed"
  }
]

If no medical terms are found or all terms are correctly translated, return an empty array: [][/INST]</s>`;

    params = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 512,
        temperature: 0.2,
        top_p: 0.9
      })
    };
  } else {
    throw new Error(`Unsupported model: ${modelId}`);
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
    }

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('Could not parse terminology verification response, returning empty result');
      return {
        terms: [],
        overallAccuracy: 1.0,
        modelUsed
      };
    }

    // Parse the JSON array
    const terms = JSON.parse(jsonMatch[0]);

    // Calculate accuracy
    const accurateTerms = terms.filter(t => t.isAccurate).length;
    const overallAccuracy = terms.length > 0 ? accurateTerms / terms.length : 1.0;

    return {
      terms,
      overallAccuracy,
      modelUsed
    };
  } catch (error) {
    console.error('Error verifying medical terminology:', error);

    // Fallback to simple verification if JSON parsing fails
    return {
      terms: [],
      overallAccuracy: 0.5,
      error: error.message,
      fallback: true
    };
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

  // For Slavic languages, Mistral models can be more accurate
  const slavicLanguages = ['ru', 'uk', 'pl'];

  // For general contexts with European languages, Llama models are efficient
  const europeanLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv'];

  // Decision logic for model selection
  if (complexMedicalContexts.includes(medicalContext)) {
    // For complex medical contexts, prefer Claude
    return 'claude';
  } else if (asianLanguages.includes(sourceLanguage) || asianLanguages.includes(targetLanguage)) {
    // For Asian languages, prefer Titan
    return 'titan';
  } else if (slavicLanguages.includes(sourceLanguage) || slavicLanguages.includes(targetLanguage)) {
    // For Slavic languages, prefer Mistral
    return 'mistral';
  } else if (europeanLanguages.includes(sourceLanguage) && europeanLanguages.includes(targetLanguage)) {
    // For European language pairs, Llama is efficient
    return 'llama';
  }

  // Default to Claude for best overall quality
  return 'claude';
}

/**
 * Gets model information for a specific model ID
 *
 * @param {string} modelId - The model ID
 * @returns {Object} - Model information including family, capabilities, and recommended use cases
 */
function getModelInfo(modelId) {
  // Base model information
  const modelInfo = {
    id: modelId,
    family: null,
    capabilities: [],
    recommendedFor: [],
    contextWindow: 0,
    tokenLimit: 0
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

module.exports = {
  translateText,
  verifyMedicalTerminology,
  selectBestModelForContext,
  getModelInfo,
  SUPPORTED_MODELS
};
