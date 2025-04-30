/**
 * Translation Controller for MedTranslate AI
 * 
 * This module implements the controller functions for translation-related operations.
 */

const translationService = require('../../services/translation-service');
const errorHandler = require('../../utils/error-handler');
const logger = require('../../utils/logger');

/**
 * Translate text
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.translateText = async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage, context, sessionId } = req.body;
    
    // Validate required fields
    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: text, sourceLanguage, targetLanguage'
      });
    }
    
    // Translate text
    const result = await translationService.translateText(
      text,
      sourceLanguage,
      targetLanguage,
      context || 'general',
      sessionId,
      req.user.id
    );
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error translating text:', error);
    return errorHandler(res, error);
  }
};

/**
 * Translate audio
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.translateAudio = async (req, res) => {
  try {
    const { audioData, sourceLanguage, targetLanguage, context, sessionId } = req.body;
    
    // Validate required fields
    if (!audioData || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: audioData, sourceLanguage, targetLanguage'
      });
    }
    
    // Translate audio
    const result = await translationService.translateAudio(
      audioData,
      sourceLanguage,
      targetLanguage,
      context || 'general',
      sessionId,
      req.user.id
    );
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error translating audio:', error);
    return errorHandler(res, error);
  }
};

/**
 * Get supported languages
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSupportedLanguages = async (req, res) => {
  try {
    const languages = await translationService.getSupportedLanguages();
    
    return res.status(200).json({
      success: true,
      languages
    });
  } catch (error) {
    logger.error('Error getting supported languages:', error);
    return errorHandler(res, error);
  }
};

/**
 * Detect language
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.detectLanguage = async (req, res) => {
  try {
    const { text, audioData } = req.body;
    
    // Validate that either text or audioData is provided
    if (!text && !audioData) {
      return res.status(400).json({
        success: false,
        error: 'Either text or audioData must be provided'
      });
    }
    
    // Detect language
    const result = await translationService.detectLanguage(text, audioData);
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error detecting language:', error);
    return errorHandler(res, error);
  }
};

/**
 * Report translation error
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.reportTranslationError = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, details } = req.body;
    
    // Validate required fields
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: reason'
      });
    }
    
    // Report error
    await translationService.reportTranslationError(
      id,
      reason,
      details,
      req.user.id
    );
    
    return res.status(200).json({
      success: true,
      message: 'Translation error reported successfully'
    });
  } catch (error) {
    logger.error('Error reporting translation error:', error);
    return errorHandler(res, error);
  }
};

/**
 * Get alternative translation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAlternativeTranslation = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get alternative translation
    const result = await translationService.getAlternativeTranslation(
      id,
      req.user.id
    );
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error getting alternative translation:', error);
    return errorHandler(res, error);
  }
};

/**
 * Get translation statistics
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTranslationStats = async (req, res) => {
  try {
    const { sessionId, userId, startDate, endDate } = req.query;
    
    // Get translation statistics
    const stats = await translationService.getTranslationStats(
      sessionId,
      userId || req.user.id,
      startDate,
      endDate
    );
    
    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error getting translation statistics:', error);
    return errorHandler(res, error);
  }
};
