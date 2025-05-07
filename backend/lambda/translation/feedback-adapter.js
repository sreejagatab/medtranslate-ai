/**
 * Feedback Adapter for Adaptive Confidence Thresholds
 * 
 * This module adapts the confidence thresholds based on user feedback
 * to continuously improve translation quality assessment.
 */

const fs = require('fs');
const path = require('path');
const { updateThresholdsBasedOnFeedback } = require('./adaptive-confidence');
const logger = require('../../src/utils/logger') || console;

// Path to confidence thresholds configuration
const THRESHOLDS_CONFIG_PATH = process.env.THRESHOLDS_CONFIG_PATH || 
  path.resolve(__dirname, '../../models/configs/confidence-thresholds.json');

/**
 * Process translation feedback and update confidence thresholds
 * 
 * @param {Object} translation - Translation object
 * @param {Object} feedback - Feedback object
 * @returns {Promise<boolean>} - Success indicator
 */
async function processTranslationFeedback(translation, feedback) {
  try {
    if (!translation || !feedback) {
      logger.warn('Invalid translation or feedback data');
      return false;
    }
    
    logger.info('Processing translation feedback', {
      translationId: translation.id,
      rating: feedback.rating,
      issues: feedback.issues
    });
    
    // Convert rating to wasAccurate boolean (for backward compatibility)
    const wasAccurate = feedback.rating >= 4;
    
    // Get confidence level from translation
    const confidenceLevel = translation.confidence || 'medium';
    
    // Create feedback data object
    const feedbackData = {
      rating: feedback.rating,
      issues: feedback.issues || [],
      comment: feedback.comment || '',
      wasAccurate
    };
    
    // Update thresholds based on feedback
    const success = await updateThresholdsBasedOnFeedback(
      translation.context || 'general',
      translation.sourceLanguage,
      translation.targetLanguage,
      feedbackData,
      confidenceLevel
    );
    
    if (success) {
      logger.info('Successfully updated confidence thresholds based on feedback');
    } else {
      logger.warn('Failed to update confidence thresholds based on feedback');
    }
    
    return success;
  } catch (error) {
    logger.error('Error processing translation feedback:', error);
    return false;
  }
}

/**
 * Extract critical terms from feedback
 * 
 * @param {Object} translation - Translation object
 * @param {Object} feedback - Feedback object
 * @returns {Array<string>} - Extracted critical terms
 */
function extractCriticalTerms(translation, feedback) {
  try {
    const criticalTerms = [];
    
    // Extract from comment if available
    if (feedback.comment && feedback.comment.length > 0) {
      // Simple extraction of potential medical terms (words with 8+ characters)
      const potentialTerms = feedback.comment.match(/\b\w{8,}\b/g) || [];
      
      potentialTerms.forEach(term => {
        if (!criticalTerms.includes(term.toLowerCase())) {
          criticalTerms.push(term.toLowerCase());
        }
      });
    }
    
    // Extract from original text if rating is low
    if (feedback.rating <= 2 && translation.originalText) {
      // Extract longer words that might be medical terms
      const potentialTerms = translation.originalText.match(/\b\w{8,}\b/g) || [];
      
      potentialTerms.forEach(term => {
        if (!criticalTerms.includes(term.toLowerCase())) {
          criticalTerms.push(term.toLowerCase());
        }
      });
    }
    
    return criticalTerms;
  } catch (error) {
    logger.error('Error extracting critical terms:', error);
    return [];
  }
}

/**
 * Update context complexity based on feedback
 * 
 * @param {string} context - Medical context
 * @param {number} rating - Feedback rating (1-5)
 * @returns {Promise<boolean>} - Success indicator
 */
async function updateContextComplexity(context, rating) {
  try {
    // Load current thresholds
    const configPath = path.resolve(__dirname, THRESHOLDS_CONFIG_PATH);
    const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Get context thresholds
    if (!currentConfig.contexts || !currentConfig.contexts[context]) {
      return false;
    }
    
    const contextThresholds = currentConfig.contexts[context];
    
    // Update complexity rating if available
    if (contextThresholds.complexityRating !== undefined) {
      if (rating <= 2) {
        // Poor ratings may indicate higher complexity
        contextThresholds.complexityRating = Math.min(contextThresholds.complexityRating + 0.05, 2.0);
      } else if (rating >= 4) {
        // Good ratings may indicate lower complexity
        contextThresholds.complexityRating = Math.max(contextThresholds.complexityRating - 0.02, 1.0);
      }
      
      // Save updated configuration
      fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error updating context complexity:', error);
    return false;
  }
}

module.exports = {
  processTranslationFeedback,
  extractCriticalTerms,
  updateContextComplexity
};
