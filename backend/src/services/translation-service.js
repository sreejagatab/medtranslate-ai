/**
 * Translation Service for MedTranslate AI
 * 
 * This module implements the service functions for translation-related operations.
 */

const db = require('../database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { getTranslationModel } = require('../models/translation-model');
const { getAudioModel } = require('../models/audio-model');
const { getLanguageDetectionModel } = require('../models/language-detection-model');
const { getMedicalTerminologyDatabase } = require('../models/medical-terminology');

// Supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' }
];

/**
 * Translate text
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @returns {Object} - Translation result
 */
exports.translateText = async (text, sourceLanguage, targetLanguage, context, sessionId, userId) => {
  try {
    logger.info(`Translating text from ${sourceLanguage} to ${targetLanguage}`);
    
    // Get translation model
    const translationModel = getTranslationModel(sourceLanguage, targetLanguage, context);
    
    // Start translation timer
    const startTime = Date.now();
    
    // Translate text
    const translatedText = await translationModel.translate(text);
    
    // Calculate latency
    const latency = Date.now() - startTime;
    
    // Check if auto-correction is needed
    const medicalTerminologyDb = getMedicalTerminologyDatabase();
    const { correctedText, corrected } = await medicalTerminologyDb.correctTranslation(
      translatedText,
      sourceLanguage,
      targetLanguage,
      context
    );
    
    // Determine confidence level
    const confidence = determineConfidenceLevel(text, correctedText || translatedText, context);
    
    // Generate translation ID
    const translationId = uuidv4();
    
    // Store translation in database
    await db.translations.create({
      id: translationId,
      originalText: text,
      translatedText: corrected ? correctedText : translatedText,
      originalTranslation: corrected ? translatedText : null,
      sourceLanguage,
      targetLanguage,
      context,
      confidence,
      latency,
      corrected,
      sessionId,
      userId,
      timestamp: new Date()
    });
    
    // Return translation result
    return {
      translationId,
      originalText: text,
      translatedText: corrected ? correctedText : translatedText,
      originalTranslation: corrected ? translatedText : null,
      sourceLanguage,
      targetLanguage,
      confidence,
      latency,
      corrected,
      model: translationModel.name
    };
  } catch (error) {
    logger.error('Error translating text:', error);
    throw error;
  }
};

/**
 * Translate audio
 * 
 * @param {string} audioData - Base64-encoded audio data
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @returns {Object} - Translation result
 */
exports.translateAudio = async (audioData, sourceLanguage, targetLanguage, context, sessionId, userId) => {
  try {
    logger.info(`Translating audio from ${sourceLanguage} to ${targetLanguage}`);
    
    // Get audio model
    const audioModel = getAudioModel(sourceLanguage);
    
    // Start transcription timer
    const transcriptionStartTime = Date.now();
    
    // Transcribe audio
    const transcribedText = await audioModel.transcribe(audioData);
    
    // Calculate transcription latency
    const transcriptionLatency = Date.now() - transcriptionStartTime;
    
    // Translate transcribed text
    const translationResult = await exports.translateText(
      transcribedText,
      sourceLanguage,
      targetLanguage,
      context,
      sessionId,
      userId
    );
    
    // Generate audio response if needed
    let audioResponse = null;
    if (targetLanguage !== 'en') { // Assuming provider language is English
      const targetAudioModel = getAudioModel(targetLanguage);
      audioResponse = await targetAudioModel.synthesize(translationResult.translatedText);
    }
    
    // Return translation result with audio
    return {
      ...translationResult,
      transcriptionLatency,
      audioResponse
    };
  } catch (error) {
    logger.error('Error translating audio:', error);
    throw error;
  }
};

/**
 * Get supported languages
 * 
 * @returns {Array<Object>} - Supported languages
 */
exports.getSupportedLanguages = async () => {
  return SUPPORTED_LANGUAGES;
};

/**
 * Detect language
 * 
 * @param {string} text - Text to detect language from
 * @param {string} audioData - Base64-encoded audio data
 * @returns {Object} - Detected language
 */
exports.detectLanguage = async (text, audioData) => {
  try {
    logger.info('Detecting language');
    
    // Get language detection model
    const languageDetectionModel = getLanguageDetectionModel();
    
    let detectedLanguageCode;
    
    if (text) {
      // Detect language from text
      detectedLanguageCode = await languageDetectionModel.detectFromText(text);
    } else if (audioData) {
      // Detect language from audio
      detectedLanguageCode = await languageDetectionModel.detectFromAudio(audioData);
    }
    
    // Find language details
    const detectedLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === detectedLanguageCode);
    
    if (!detectedLanguage) {
      throw new Error(`Unsupported language detected: ${detectedLanguageCode}`);
    }
    
    return {
      language: detectedLanguage,
      confidence: 'high' // Simplified for now
    };
  } catch (error) {
    logger.error('Error detecting language:', error);
    throw error;
  }
};

/**
 * Report translation error
 * 
 * @param {string} translationId - Translation ID
 * @param {string} reason - Error reason
 * @param {string} details - Error details
 * @param {string} userId - User ID
 */
exports.reportTranslationError = async (translationId, reason, details, userId) => {
  try {
    logger.info(`Reporting translation error for translation ${translationId}`);
    
    // Get translation
    const translation = await db.translations.findOne({
      where: { id: translationId }
    });
    
    if (!translation) {
      throw new Error(`Translation not found: ${translationId}`);
    }
    
    // Store error report
    await db.translationErrors.create({
      id: uuidv4(),
      translationId,
      reason,
      details,
      userId,
      timestamp: new Date()
    });
    
    // Update translation error count
    await translation.update({
      errorCount: (translation.errorCount || 0) + 1
    });
    
    // Log error for model improvement
    logger.info(`Translation error reported: ${reason}`, {
      translationId,
      originalText: translation.originalText,
      translatedText: translation.translatedText,
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      context: translation.context,
      reason,
      details
    });
  } catch (error) {
    logger.error('Error reporting translation error:', error);
    throw error;
  }
};

/**
 * Get alternative translation
 * 
 * @param {string} translationId - Translation ID
 * @param {string} userId - User ID
 * @returns {Object} - Alternative translation
 */
exports.getAlternativeTranslation = async (translationId, userId) => {
  try {
    logger.info(`Getting alternative translation for translation ${translationId}`);
    
    // Get translation
    const translation = await db.translations.findOne({
      where: { id: translationId }
    });
    
    if (!translation) {
      throw new Error(`Translation not found: ${translationId}`);
    }
    
    // Get alternative translation model
    const alternativeModel = getTranslationModel(
      translation.sourceLanguage,
      translation.targetLanguage,
      translation.context,
      true // Use alternative model
    );
    
    // Start translation timer
    const startTime = Date.now();
    
    // Translate text
    const alternativeText = await alternativeModel.translate(translation.originalText);
    
    // Calculate latency
    const latency = Date.now() - startTime;
    
    // Determine confidence level
    const confidence = determineConfidenceLevel(
      translation.originalText,
      alternativeText,
      translation.context
    );
    
    // Generate translation ID
    const alternativeTranslationId = uuidv4();
    
    // Store alternative translation in database
    await db.translations.create({
      id: alternativeTranslationId,
      originalText: translation.originalText,
      translatedText: alternativeText,
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      context: translation.context,
      confidence,
      latency,
      corrected: false,
      sessionId: translation.sessionId,
      userId,
      isAlternative: true,
      originalTranslationId: translationId,
      timestamp: new Date()
    });
    
    // Return alternative translation
    return {
      translation: {
        id: alternativeTranslationId,
        originalText: translation.originalText,
        translatedText: alternativeText,
        sourceLanguage: translation.sourceLanguage,
        targetLanguage: translation.targetLanguage,
        confidence,
        latency,
        model: alternativeModel.name,
        isAlternative: true
      }
    };
  } catch (error) {
    logger.error('Error getting alternative translation:', error);
    throw error;
  }
};

/**
 * Get translation statistics
 * 
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Object} - Translation statistics
 */
exports.getTranslationStats = async (sessionId, userId, startDate, endDate) => {
  try {
    logger.info('Getting translation statistics');
    
    // Build query conditions
    const where = {};
    
    if (sessionId) {
      where.sessionId = sessionId;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (startDate || endDate) {
      where.timestamp = {};
      
      if (startDate) {
        where.timestamp.$gte = new Date(startDate);
      }
      
      if (endDate) {
        where.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Get translations
    const translations = await db.translations.findAll({
      where,
      order: [['timestamp', 'DESC']]
    });
    
    // Calculate statistics
    const stats = {
      total: translations.length,
      byConfidence: {
        high: translations.filter(t => t.confidence === 'high').length,
        medium: translations.filter(t => t.confidence === 'medium').length,
        low: translations.filter(t => t.confidence === 'low').length
      },
      byCorrected: {
        corrected: translations.filter(t => t.corrected).length,
        notCorrected: translations.filter(t => !t.corrected).length
      },
      byLanguage: {},
      byContext: {},
      averageLatency: translations.reduce((sum, t) => sum + t.latency, 0) / translations.length || 0
    };
    
    // Calculate language statistics
    translations.forEach(t => {
      const languagePair = `${t.sourceLanguage}-${t.targetLanguage}`;
      
      if (!stats.byLanguage[languagePair]) {
        stats.byLanguage[languagePair] = 0;
      }
      
      stats.byLanguage[languagePair]++;
    });
    
    // Calculate context statistics
    translations.forEach(t => {
      if (!stats.byContext[t.context]) {
        stats.byContext[t.context] = 0;
      }
      
      stats.byContext[t.context]++;
    });
    
    return stats;
  } catch (error) {
    logger.error('Error getting translation statistics:', error);
    throw error;
  }
};

/**
 * Determine confidence level
 * 
 * @param {string} originalText - Original text
 * @param {string} translatedText - Translated text
 * @param {string} context - Medical context
 * @returns {string} - Confidence level (high, medium, low)
 */
function determineConfidenceLevel(originalText, translatedText, context) {
  // This is a simplified implementation
  // In a real system, you would use more sophisticated confidence scoring
  
  // Check if translation is empty or very short
  if (!translatedText || translatedText.length < 3) {
    return 'low';
  }
  
  // Check if translation is much shorter or longer than original
  const lengthRatio = translatedText.length / originalText.length;
  if (lengthRatio < 0.5 || lengthRatio > 2) {
    return 'medium';
  }
  
  // Check for medical terminology
  const medicalTerminologyDb = getMedicalTerminologyDatabase();
  const medicalTermsScore = medicalTerminologyDb.evaluateTranslation(
    originalText,
    translatedText,
    context
  );
  
  if (medicalTermsScore < 0.7) {
    return 'medium';
  }
  
  if (medicalTermsScore < 0.5) {
    return 'low';
  }
  
  return 'high';
}
