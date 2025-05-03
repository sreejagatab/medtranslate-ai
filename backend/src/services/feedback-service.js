/**
 * Feedback Service for MedTranslate AI
 * 
 * This service handles the processing of user feedback on translation quality
 * and updates the adaptive confidence thresholds accordingly.
 */

const db = require('../database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Path to confidence thresholds configuration
const THRESHOLDS_CONFIG_PATH = process.env.THRESHOLDS_CONFIG_PATH || 
  path.resolve(__dirname, '../../models/configs/confidence-thresholds.json');

/**
 * Submit translation feedback
 * 
 * @param {Object} feedback - Feedback data
 * @param {string} feedback.translationId - Translation ID
 * @param {number} feedback.rating - Rating (1-5)
 * @param {Array<string>} feedback.issues - Issue types
 * @param {string} feedback.comment - Additional comments
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Feedback submission result
 */
exports.submitTranslationFeedback = async (feedback, userId) => {
  try {
    logger.info('Submitting translation feedback', { 
      translationId: feedback.translationId,
      rating: feedback.rating,
      issues: feedback.issues,
      userId
    });

    // Get translation details
    const translation = await db.translations.findOne({
      where: { id: feedback.translationId }
    });

    if (!translation) {
      throw new Error(`Translation not found: ${feedback.translationId}`);
    }

    // Create feedback record
    const feedbackId = uuidv4();
    await db.translationFeedback.create({
      id: feedbackId,
      translationId: feedback.translationId,
      rating: feedback.rating,
      issues: feedback.issues || [],
      comment: feedback.comment || '',
      userId,
      sessionId: translation.sessionId,
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      context: translation.context,
      timestamp: new Date()
    });

    // Update translation with feedback reference
    await translation.update({
      hasFeedback: true,
      lastFeedbackId: feedbackId
    });

    // Process feedback to update confidence thresholds
    await updateConfidenceThresholds(translation, feedback);

    return {
      success: true,
      feedbackId,
      message: 'Feedback submitted successfully'
    };
  } catch (error) {
    logger.error('Error submitting translation feedback:', error);
    throw error;
  }
};

/**
 * Get translation feedback statistics
 * 
 * @param {Object} options - Query options
 * @param {string} options.sessionId - Optional session ID filter
 * @param {string} options.startDate - Optional start date filter
 * @param {string} options.endDate - Optional end date filter
 * @returns {Promise<Object>} - Feedback statistics
 */
exports.getTranslationFeedbackStats = async (options = {}) => {
  try {
    logger.info('Getting translation feedback statistics', options);

    // Build query conditions
    const where = {};

    if (options.sessionId) {
      where.sessionId = options.sessionId;
    }

    if (options.startDate || options.endDate) {
      where.timestamp = {};

      if (options.startDate) {
        where.timestamp.$gte = new Date(options.startDate);
      }

      if (options.endDate) {
        where.timestamp.$lte = new Date(options.endDate);
      }
    }

    // Get feedback
    const feedback = await db.translationFeedback.findAll({
      where,
      order: [['timestamp', 'DESC']]
    });

    // Calculate statistics
    const stats = {
      total: feedback.length,
      byRating: {
        1: feedback.filter(f => f.rating === 1).length,
        2: feedback.filter(f => f.rating === 2).length,
        3: feedback.filter(f => f.rating === 3).length,
        4: feedback.filter(f => f.rating === 4).length,
        5: feedback.filter(f => f.rating === 5).length
      },
      averageRating: feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length || 0,
      byIssue: {},
      byContext: {},
      byLanguagePair: {}
    };

    // Calculate issue statistics
    feedback.forEach(f => {
      if (f.issues && f.issues.length > 0) {
        f.issues.forEach(issue => {
          if (!stats.byIssue[issue]) {
            stats.byIssue[issue] = 0;
          }
          stats.byIssue[issue]++;
        });
      }
    });

    // Calculate context statistics
    feedback.forEach(f => {
      if (!stats.byContext[f.context]) {
        stats.byContext[f.context] = {
          total: 0,
          averageRating: 0,
          ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      stats.byContext[f.context].total++;
      stats.byContext[f.context].ratings[f.rating]++;
    });

    // Calculate average rating by context
    Object.keys(stats.byContext).forEach(context => {
      const contextFeedback = feedback.filter(f => f.context === context);
      stats.byContext[context].averageRating = 
        contextFeedback.reduce((sum, f) => sum + f.rating, 0) / contextFeedback.length || 0;
    });

    // Calculate language pair statistics
    feedback.forEach(f => {
      const languagePair = `${f.sourceLanguage}-${f.targetLanguage}`;

      if (!stats.byLanguagePair[languagePair]) {
        stats.byLanguagePair[languagePair] = {
          total: 0,
          averageRating: 0,
          ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      stats.byLanguagePair[languagePair].total++;
      stats.byLanguagePair[languagePair].ratings[f.rating]++;
    });

    // Calculate average rating by language pair
    Object.keys(stats.byLanguagePair).forEach(pair => {
      const pairFeedback = feedback.filter(f => `${f.sourceLanguage}-${f.targetLanguage}` === pair);
      stats.byLanguagePair[pair].averageRating = 
        pairFeedback.reduce((sum, f) => sum + f.rating, 0) / pairFeedback.length || 0;
    });

    return stats;
  } catch (error) {
    logger.error('Error getting translation feedback statistics:', error);
    throw error;
  }
};

/**
 * Update confidence thresholds based on feedback
 * 
 * @param {Object} translation - Translation object
 * @param {Object} feedback - Feedback object
 * @returns {Promise<boolean>} - Success indicator
 */
async function updateConfidenceThresholds(translation, feedback) {
  try {
    // Only update thresholds for low ratings (1-3)
    if (feedback.rating > 3) {
      return true;
    }

    logger.info('Updating confidence thresholds based on feedback', {
      translationId: translation.id,
      rating: feedback.rating,
      context: translation.context,
      languagePair: `${translation.sourceLanguage}-${translation.targetLanguage}`
    });

    // Load current thresholds
    let thresholdsConfig = null;
    try {
      const configData = fs.readFileSync(THRESHOLDS_CONFIG_PATH, 'utf8');
      thresholdsConfig = JSON.parse(configData);
    } catch (error) {
      logger.error('Error loading confidence thresholds configuration:', error);
      return false;
    }

    // Get context thresholds
    const context = translation.context || 'general';
    if (!thresholdsConfig.contexts[context]) {
      thresholdsConfig.contexts[context] = {
        high: thresholdsConfig.default.high,
        medium: thresholdsConfig.default.medium,
        low: thresholdsConfig.default.low,
        criticalTerms: []
      };
    }

    // Get language pair thresholds
    const languagePair = `${translation.sourceLanguage}-${translation.targetLanguage}`;
    if (!thresholdsConfig.languagePairs[languagePair]) {
      thresholdsConfig.languagePairs[languagePair] = {
        high: thresholdsConfig.default.high,
        medium: thresholdsConfig.default.medium,
        low: thresholdsConfig.default.low
      };
    }

    // Adjust thresholds based on feedback rating and issues
    const adjustmentFactor = 0.01; // Small adjustment to avoid overreacting to single feedback
    
    // For very low ratings (1-2), increase thresholds more significantly
    const ratingMultiplier = feedback.rating <= 2 ? 2 : 1;
    
    // Adjust context thresholds
    thresholdsConfig.contexts[context].high += adjustmentFactor * ratingMultiplier;
    thresholdsConfig.contexts[context].medium += adjustmentFactor * ratingMultiplier;
    thresholdsConfig.contexts[context].low += adjustmentFactor * ratingMultiplier;
    
    // Adjust language pair thresholds
    thresholdsConfig.languagePairs[languagePair].high += adjustmentFactor * ratingMultiplier;
    thresholdsConfig.languagePairs[languagePair].medium += adjustmentFactor * ratingMultiplier;
    thresholdsConfig.languagePairs[languagePair].low += adjustmentFactor * ratingMultiplier;
    
    // Ensure thresholds are within valid range (0-1)
    thresholdsConfig.contexts[context].high = Math.min(Math.max(thresholdsConfig.contexts[context].high, 0), 1);
    thresholdsConfig.contexts[context].medium = Math.min(Math.max(thresholdsConfig.contexts[context].medium, 0), 1);
    thresholdsConfig.contexts[context].low = Math.min(Math.max(thresholdsConfig.contexts[context].low, 0), 1);
    
    thresholdsConfig.languagePairs[languagePair].high = Math.min(Math.max(thresholdsConfig.languagePairs[languagePair].high, 0), 1);
    thresholdsConfig.languagePairs[languagePair].medium = Math.min(Math.max(thresholdsConfig.languagePairs[languagePair].medium, 0), 1);
    thresholdsConfig.languagePairs[languagePair].low = Math.min(Math.max(thresholdsConfig.languagePairs[languagePair].low, 0), 1);
    
    // Ensure thresholds are properly ordered (high > medium > low)
    thresholdsConfig.contexts[context].high = Math.max(thresholdsConfig.contexts[context].high, thresholdsConfig.contexts[context].medium + 0.05);
    thresholdsConfig.contexts[context].medium = Math.max(thresholdsConfig.contexts[context].medium, thresholdsConfig.contexts[context].low + 0.05);
    
    thresholdsConfig.languagePairs[languagePair].high = Math.max(thresholdsConfig.languagePairs[languagePair].high, thresholdsConfig.languagePairs[languagePair].medium + 0.05);
    thresholdsConfig.languagePairs[languagePair].medium = Math.max(thresholdsConfig.languagePairs[languagePair].medium, thresholdsConfig.languagePairs[languagePair].low + 0.05);
    
    // Save updated thresholds
    try {
      fs.writeFileSync(THRESHOLDS_CONFIG_PATH, JSON.stringify(thresholdsConfig, null, 2), 'utf8');
      logger.info('Updated confidence thresholds configuration', {
        context,
        languagePair,
        contextThresholds: thresholdsConfig.contexts[context],
        languagePairThresholds: thresholdsConfig.languagePairs[languagePair]
      });
      return true;
    } catch (error) {
      logger.error('Error saving updated confidence thresholds configuration:', error);
      return false;
    }
  } catch (error) {
    logger.error('Error updating confidence thresholds:', error);
    return false;
  }
}
