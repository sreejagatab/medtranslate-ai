/**
 * Amazon Bedrock client for medical translation
 *
 * This module provides functions to interact with Amazon Bedrock for
 * medical translation tasks with specialized prompts for healthcare contexts.
 */

const AWS = require('aws-sdk');

// Initialize Bedrock client (only if not in development mode)
const bedrock = process.env.NODE_ENV !== 'development' ? new AWS.BedrockRuntime() : null;

// Mock translation function for development
function mockTranslate(text, sourceLanguage, targetLanguage) {
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
    return mockTranslate(text, sourceLanguage, targetLanguage);
  }

  // Prepare prompt for the model
  const prompt = `You are an expert medical translator specializing in healthcare communications.
Translate the following text from ${sourceLanguage} to ${targetLanguage}.
Maintain medical accuracy and appropriate tone.
Medical context: ${medicalContext}
Text to translate: ${text}`;

  const params = {
    modelId: process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-express-v1',
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

  try {
    const response = await bedrock.invokeModel(params).promise();
    const result = JSON.parse(response.body.toString());
    return {
      translatedText: result.results[0].outputText.trim(),
      confidence: result.results[0].completionReason === 'FINISH' ? 'high' : 'medium'
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

  // Prepare prompt for terminology verification
  const prompt = `You are a medical terminology expert.
Review the following translation from ${sourceLanguage} to ${targetLanguage} in the context of ${medicalContext}.
Identify any medical terms that may have been mistranslated or require verification.

Original text: ${sourceText}
Translated text: ${translatedText}

For each medical term, provide:
1. The term in the source language
2. The translated term
3. Whether the translation is accurate (yes/no)
4. A suggested correction if needed`;

  const params = {
    modelId: process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-express-v1',
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

  try {
    const response = await bedrock.invokeModel(params).promise();
    const result = JSON.parse(response.body.toString());

    // Parse the verification results
    const verificationText = result.results[0].outputText.trim();

    // Simple parsing logic - in a real implementation, this would be more sophisticated
    const terms = verificationText.split('\n\n')
      .filter(line => line.includes(':'))
      .map(termBlock => {
        const lines = termBlock.split('\n');
        return {
          sourceTerm: lines[0].split(':')[1]?.trim() || '',
          translatedTerm: lines[1].split(':')[1]?.trim() || '',
          isAccurate: lines[2].toLowerCase().includes('yes'),
          suggestion: lines[3]?.split(':')[1]?.trim() || ''
        };
      });

    return {
      terms,
      overallAccuracy: terms.filter(t => t.isAccurate).length / Math.max(terms.length, 1)
    };
  } catch (error) {
    console.error('Error verifying medical terminology:', error);
    throw new Error(`Terminology verification failed: ${error.message}`);
  }
}

module.exports = {
  translateText,
  verifyMedicalTerminology
};
