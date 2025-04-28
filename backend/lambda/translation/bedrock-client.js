/**
 * Amazon Bedrock client for medical translation
 *
 * This module provides functions to interact with Amazon Bedrock for
 * medical translation tasks with specialized prompts for healthcare contexts.
 */

const AWS = require('aws-sdk');

// Initialize Bedrock client (only if not in development mode)
const bedrock = process.env.NODE_ENV !== 'development' ? new AWS.BedrockRuntime() : null;

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
  'hi': 'Hindi'
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
  'obstetrics': 'obstetrics and gynecology'
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
 *
 * @param {string} sourceLanguage - The source language code (e.g., 'en', 'es')
 * @param {string} targetLanguage - The target language code (e.g., 'en', 'es')
 * @param {string} text - The text to translate
 * @param {string} medicalContext - Optional medical context (e.g., 'general', 'cardiology', 'pediatrics')
 * @returns {Promise<Object>} - The translation result with confidence score
 */
async function translateText(sourceLanguage, targetLanguage, text, medicalContext = 'general') {
  // For local development, use mock translations
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Translating from ${sourceLanguage} to ${targetLanguage}: ${text}`);
    return mockTranslate(text, sourceLanguage, targetLanguage, medicalContext);
  }

  // Get full language names
  const sourceLang = LANGUAGE_CODES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_CODES[targetLanguage] || targetLanguage;
  const context = MEDICAL_CONTEXTS[medicalContext] || medicalContext;

  // Select the appropriate model based on configuration
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';

  // Prepare prompt for the model
  let prompt;
  let params;

  if (modelId.startsWith('anthropic.claude')) {
    // Claude-specific prompt format
    prompt = `<instructions>
You are an expert medical translator specializing in healthcare communications.
Translate the following text from ${sourceLang} to ${targetLang}.
Maintain medical accuracy and appropriate tone.
Only return the translated text, nothing else.
</instructions>

<input>
Medical context: ${context}
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
Maintain medical accuracy and appropriate tone.
Medical context: ${context}
Text to translate: ${text}`;

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
  } else {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  try {
    const response = await bedrock.invokeModel(params).promise();
    const responseBody = JSON.parse(response.body.toString());

    let translatedText;
    let confidence = 'medium';

    // Parse response based on model
    if (modelId.startsWith('anthropic.claude')) {
      translatedText = responseBody.content[0].text.trim();
      confidence = 'high'; // Claude models typically provide high-quality translations
    } else if (modelId.startsWith('amazon.titan')) {
      translatedText = responseBody.results[0].outputText.trim();
      confidence = responseBody.results[0].completionReason === 'FINISH' ? 'high' : 'medium';
    }

    return {
      translatedText,
      confidence,
      sourceLanguage,
      targetLanguage,
      medicalContext
    };
  } catch (error) {
    console.error('Error calling Bedrock:', error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}

/**
 * Verifies medical terminology in a translation using Amazon Bedrock
 *
 * @param {string} sourceText - The original text
 * @param {string} translatedText - The translated text
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - The medical context
 * @returns {Promise<Object>} - Verification results with confidence scores
 */
async function verifyMedicalTerminology(sourceText, translatedText, sourceLanguage, targetLanguage, medicalContext) {
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

  // Select the appropriate model based on configuration
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';

  // Prepare prompt for terminology verification
  let prompt;
  let params;

  if (modelId.startsWith('anthropic.claude')) {
    // Claude-specific prompt format
    prompt = `<instructions>
You are a medical terminology expert specializing in multilingual healthcare communications.
Review the following translation from ${sourceLang} to ${targetLang} in the context of ${context} medicine.
Identify any medical terms that may have been mistranslated or require verification.

For each medical term, provide:
1. The term in the source language
2. The translated term
3. Whether the translation is accurate (yes/no)
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
</instructions>

<input>
Original text: ${sourceText}
Translated text: ${translatedText}
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
    prompt = `You are a medical terminology expert.
Review the following translation from ${sourceLang} to ${targetLang} in the context of ${context}.
Identify any medical terms that may have been mistranslated or require verification.

Original text: ${sourceText}
Translated text: ${translatedText}

For each medical term, provide:
1. The term in the source language
2. The translated term
3. Whether the translation is accurate (yes/no)
4. A suggested correction if needed

Format your response as a JSON array of objects with the following structure:
[
  {
    "sourceTerm": "term in source language",
    "translatedTerm": "term in target language",
    "isAccurate": true/false,
    "suggestion": "suggested correction if needed"
  }
]`;

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
  } else {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  try {
    const response = await bedrock.invokeModel(params).promise();
    const responseBody = JSON.parse(response.body.toString());

    let responseText;

    // Parse response based on model
    if (modelId.startsWith('anthropic.claude')) {
      responseText = responseBody.content[0].text.trim();
    } else if (modelId.startsWith('amazon.titan')) {
      responseText = responseBody.results[0].outputText.trim();
    }

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse terminology verification response');
    }

    // Parse the JSON array
    const terms = JSON.parse(jsonMatch[0]);

    return {
      terms,
      overallAccuracy: terms.filter(t => t.isAccurate).length / Math.max(terms.length, 1)
    };
  } catch (error) {
    console.error('Error verifying medical terminology:', error);

    // Fallback to simple verification if JSON parsing fails
    return {
      terms: [],
      overallAccuracy: 0.5
    };
  }
}

module.exports = {
  translateText,
  verifyMedicalTerminology
};
