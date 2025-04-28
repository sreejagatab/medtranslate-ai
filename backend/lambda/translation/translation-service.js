/**
 * Translation Service for MedTranslate AI
 * 
 * This module provides functions for translating text and audio
 * using AWS Bedrock and other services.
 */

const { translateText: bedrockTranslate, verifyMedicalTerminology } = require('./bedrock-client');
const { transcribeAudio, synthesizeSpeech } = require('./audio-processor');
const { verifyMedicalTerms } = require('./medical-kb');

/**
 * Translates text from one language to another
 * 
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} text - The text to translate
 * @param {string} medicalContext - Optional medical context
 * @returns {Promise<Object>} - The translation result
 */
async function translateText(sourceLanguage, targetLanguage, text, medicalContext = 'general') {
  try {
    // Perform translation using Bedrock
    const translationResult = await bedrockTranslate(sourceLanguage, targetLanguage, text, medicalContext);
    
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
      } else {
        // If no terms found in KB, use Bedrock for verification
        verificationResult = await verifyMedicalTerminology(
          text,
          translationResult.translatedText,
          sourceLanguage,
          targetLanguage,
          medicalContext
        );
        
        translationResult.verificationResult = verificationResult;
      }
    } catch (verificationError) {
      console.warn('Medical terminology verification failed:', verificationError);
      // Continue without verification
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
 * @returns {Promise<Object>} - The translation result with audio
 */
async function translateAudio(audioData, sourceLanguage, targetLanguage, medicalContext = 'general') {
  try {
    // Step 1: Transcribe audio to text
    const transcriptionResult = await transcribeAudio(audioData, sourceLanguage);
    
    // Step 2: Translate the transcribed text
    const translationResult = await translateText(
      sourceLanguage,
      targetLanguage,
      transcriptionResult.text,
      medicalContext
    );
    
    // Step 3: Synthesize the translated text to audio
    const audioResult = await synthesizeSpeech(
      translationResult.translatedText,
      targetLanguage
    );
    
    // Return combined result
    return {
      originalText: transcriptionResult.text,
      translatedText: translationResult.translatedText,
      confidence: translationResult.confidence,
      audioResponse: audioResult.audioData,
      audioFormat: audioResult.format,
      sourceLanguage,
      targetLanguage,
      medicalContext
    };
  } catch (error) {
    console.error('Error translating audio:', error);
    throw new Error(`Audio translation failed: ${error.message}`);
  }
}

module.exports = {
  translateText,
  translateAudio
};
