/**
 * Translation Service for MedTranslate AI
 *
 * This module provides functions for translating text and audio
 * using AWS Bedrock and other services with specialized medical translation capabilities.
 * Supports multiple language models and medical terminology verification.
 */

// Use enhanced Bedrock client for improved medical translation
const {
  translateText: bedrockTranslate,
  verifyMedicalTerminology,
  selectBestModelForContext,
  getModelInfo,
  getAvailableModels: getBedrockModels
} = require('./enhanced-bedrock-client');
const { transcribeAudio, synthesizeSpeech } = require('./audio-processor');
const { verifyMedicalTerms, addTermToKB } = require('./medical-kb');

/**
 * Translates text from one language to another
 *
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} text - The text to translate
 * @param {string} medicalContext - Optional medical context
 * @param {string} preferredModel - Optional preferred model type
 * @param {boolean} useTerminologyVerification - Whether to use terminology verification
 * @param {boolean} includeConfidenceAnalysis - Whether to include detailed confidence analysis
 * @param {boolean} useCulturalContext - Whether to adapt translation for cultural context
 * @returns {Promise<Object>} - The translation result with enhanced information
 */
async function translateText(
  sourceLanguage,
  targetLanguage,
  text,
  medicalContext = 'general',
  preferredModel = null,
  useTerminologyVerification = true,
  includeConfidenceAnalysis = false,
  useCulturalContext = false
) {
  try {
    // Select the best model for this language pair and context if no preference specified
    const recommendedModel = preferredModel || selectBestModelForContext(sourceLanguage, targetLanguage, medicalContext);

    console.log(`Using ${recommendedModel} model family for ${sourceLanguage} to ${targetLanguage} translation in ${medicalContext} context`);

    // Prepare cultural context adaptation if requested
    let adaptedContext = medicalContext;
    if (useCulturalContext) {
      // Adapt context based on target language cultural considerations
      adaptedContext = adaptContextForCulture(medicalContext, targetLanguage);
      console.log(`Adapted medical context from ${medicalContext} to ${adaptedContext} for cultural context in ${targetLanguage}`);
    }

    // Perform translation using Bedrock with the recommended model
    const translationResult = await bedrockTranslate(
      sourceLanguage,
      targetLanguage,
      text,
      adaptedContext,
      recommendedModel,
      [], // medical terms
      true, // use fallback
      includeConfidenceAnalysis // include confidence analysis if requested
    );

    // Skip verification if disabled
    if (!useTerminologyVerification) {
      return translationResult;
    }

    // Verify medical terminology if available
    let verificationResult = null;
    try {
      // First try to verify using the medical knowledge base
      const medicalTerms = await verifyMedicalTerms(text, sourceLanguage, targetLanguage);

      if (medicalTerms && medicalTerms.length > 0) {
        // Apply verified medical terms to the translation
        let enhancedTranslation = translationResult.translatedText;

        for (const term of medicalTerms) {
          if (term.verified && term.targetTerm) {
            // Simple replacement - in a real implementation, this would be more sophisticated
            enhancedTranslation = enhancedTranslation.replace(
              new RegExp(term.sourceTerm, 'gi'),
              term.targetTerm
            );
          }
        }

        translationResult.translatedText = enhancedTranslation;
        translationResult.verifiedTerms = medicalTerms;
        translationResult.terminologySource = 'knowledge-base';
      } else {
        // If no terms found in KB, use Bedrock for verification
        // For verification, we prefer Claude models for their accuracy with medical terminology
        verificationResult = await verifyMedicalTerminology(
          text,
          translationResult.translatedText,
          sourceLanguage,
          targetLanguage,
          medicalContext,
          'claude' // Always use Claude for verification if available
        );

        translationResult.verificationResult = verificationResult;
        translationResult.terminologySource = 'bedrock-verification';

        // If we found medical terms through verification, add them to the knowledge base for future use
        if (verificationResult.terms && verificationResult.terms.length > 0) {
          try {
            for (const term of verificationResult.terms) {
              if (term.isAccurate) {
                await addTermToKB(
                  term.sourceTerm,
                  sourceLanguage,
                  term.translatedTerm,
                  targetLanguage,
                  medicalContext,
                  'high'
                );
              }
            }
            console.log(`Added ${verificationResult.terms.length} verified terms to medical knowledge base`);
          } catch (kbError) {
            console.warn('Failed to add terms to knowledge base:', kbError);
          }
        }
      }
    } catch (verificationError) {
      console.warn('Medical terminology verification failed:', verificationError);
      // Continue without verification
      translationResult.verificationError = verificationError.message;
    }

    // Add model information to the result
    if (translationResult.modelUsed) {
      translationResult.modelInfo = getModelInfo(translationResult.modelUsed);
    }

    return translationResult;
  } catch (error) {
    console.error('Error translating text:', error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}

/**
 * Translates audio from one language to another
 *
 * @param {string} audioData - Base64-encoded audio data
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - Optional medical context
 * @param {string} preferredModel - Optional preferred model type
 * @param {boolean} useTerminologyVerification - Whether to use terminology verification
 * @returns {Promise<Object>} - The translation result with audio
 */
async function translateAudio(
  audioData,
  sourceLanguage,
  targetLanguage,
  medicalContext = 'general',
  preferredModel = null,
  useTerminologyVerification = true
) {
  try {
    // Step 1: Transcribe audio to text
    const transcriptionResult = await transcribeAudio(audioData, sourceLanguage);

    // Log the transcription for debugging
    console.log(`Transcribed text (${sourceLanguage}): ${transcriptionResult.text}`);

    // Step 2: Translate the transcribed text using our enhanced translation
    const translationResult = await translateText(
      sourceLanguage,
      targetLanguage,
      transcriptionResult.text,
      medicalContext,
      preferredModel,
      useTerminologyVerification
    );

    // Step 3: Synthesize the translated text to audio
    const audioResult = await synthesizeSpeech(
      translationResult.translatedText,
      targetLanguage
    );

    // Return combined result with enhanced information
    return {
      originalText: transcriptionResult.text,
      translatedText: translationResult.translatedText,
      confidence: translationResult.confidence,
      audioResponse: audioResult.audioData,
      audioFormat: audioResult.format,
      sourceLanguage,
      targetLanguage,
      medicalContext,
      transcriptionConfidence: transcriptionResult.confidence,
      modelUsed: translationResult.modelUsed,
      modelInfo: translationResult.modelInfo,
      verificationResult: translationResult.verificationResult,
      verifiedTerms: translationResult.verifiedTerms,
      terminologySource: translationResult.terminologySource,
      processingTime: {
        transcription: transcriptionResult.processingTime,
        translation: translationResult.processingTime,
        synthesis: audioResult.processingTime,
        total: Date.now() - transcriptionResult.startTime
      }
    };
  } catch (error) {
    console.error('Error translating audio:', error);
    throw new Error(`Audio translation failed: ${error.message}`);
  }
}

/**
 * Gets available translation models and their capabilities
 *
 * @returns {Object} - Information about available models
 */
function getAvailableModels() {
  // Use the enhanced Bedrock client to get available models
  return getBedrockModels();
}

/**
 * Adapts medical context based on cultural considerations for the target language
 *
 * @param {string} medicalContext - The original medical context
 * @param {string} targetLanguage - The target language code
 * @returns {string} - The adapted medical context
 */
function adaptContextForCulture(medicalContext, targetLanguage) {
  // Cultural adaptations for specific language regions
  const culturalAdaptations = {
    // East Asian languages
    'zh': { // Chinese
      'general': 'general_tcm', // Traditional Chinese Medicine context
      'cardiology': 'cardiology_tcm',
      'gastroenterology': 'gastroenterology_tcm'
    },
    'ja': { // Japanese
      'general': 'general_kampo', // Kampo medicine context
      'psychiatry': 'psychiatry_eastern'
    },
    'ko': { // Korean
      'general': 'general_eastern',
      'psychiatry': 'psychiatry_eastern'
    },

    // South Asian languages
    'hi': { // Hindi
      'general': 'general_ayurveda', // Ayurvedic context
      'gastroenterology': 'gastroenterology_ayurveda'
    },

    // Middle Eastern languages
    'ar': { // Arabic
      'general': 'general_unani', // Unani medicine context
      'psychiatry': 'psychiatry_cultural'
    },

    // Latin American Spanish
    'es-419': {
      'general': 'general_latinam',
      'psychiatry': 'psychiatry_cultural'
    }
  };

  // Check if we have cultural adaptations for this language
  if (culturalAdaptations[targetLanguage]) {
    // Check if we have a specific adaptation for this medical context
    if (culturalAdaptations[targetLanguage][medicalContext]) {
      return culturalAdaptations[targetLanguage][medicalContext];
    }
  }

  // If no specific adaptation found, return the original context
  return medicalContext;
}

/**
 * Updates the translation audio function to use enhanced features
 *
 * @param {string} audioData - Base64-encoded audio data
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - Optional medical context
 * @param {string} preferredModel - Optional preferred model type
 * @param {boolean} useTerminologyVerification - Whether to use terminology verification
 * @param {boolean} includeConfidenceAnalysis - Whether to include detailed confidence analysis
 * @param {boolean} useCulturalContext - Whether to adapt translation for cultural context
 * @returns {Promise<Object>} - The translation result with audio
 */
async function translateAudioEnhanced(
  audioData,
  sourceLanguage,
  targetLanguage,
  medicalContext = 'general',
  preferredModel = null,
  useTerminologyVerification = true,
  includeConfidenceAnalysis = false,
  useCulturalContext = false
) {
  try {
    // Step 1: Transcribe audio to text
    const transcriptionResult = await transcribeAudio(audioData, sourceLanguage);

    // Log the transcription for debugging
    console.log(`Transcribed text (${sourceLanguage}): ${transcriptionResult.text}`);

    // Step 2: Translate the transcribed text using our enhanced translation
    const translationResult = await translateText(
      sourceLanguage,
      targetLanguage,
      transcriptionResult.text,
      medicalContext,
      preferredModel,
      useTerminologyVerification,
      includeConfidenceAnalysis,
      useCulturalContext
    );

    // Step 3: Synthesize the translated text to audio
    const audioResult = await synthesizeSpeech(
      translationResult.translatedText,
      targetLanguage
    );

    // Return combined result with enhanced information
    return {
      originalText: transcriptionResult.text,
      translatedText: translationResult.translatedText,
      confidence: translationResult.confidence,
      audioResponse: audioResult.audioData,
      audioFormat: audioResult.format,
      sourceLanguage,
      targetLanguage,
      medicalContext: translationResult.medicalContext,
      transcriptionConfidence: transcriptionResult.confidence,
      modelUsed: translationResult.modelUsed,
      modelInfo: translationResult.modelInfo,
      verificationResult: translationResult.verificationResult,
      verifiedTerms: translationResult.verifiedTerms,
      terminologySource: translationResult.terminologySource,
      confidenceAnalysis: translationResult.confidenceAnalysis,
      culturallyAdapted: useCulturalContext,
      processingTime: {
        transcription: transcriptionResult.processingTime,
        translation: translationResult.processingTime,
        synthesis: audioResult.processingTime,
        total: Date.now() - transcriptionResult.startTime
      }
    };
  } catch (error) {
    console.error('Error translating audio:', error);
    throw new Error(`Audio translation failed: ${error.message}`);
  }
}

module.exports = {
  translateText,
  translateAudio,
  translateAudioEnhanced,
  getAvailableModels,
  adaptContextForCulture
};
