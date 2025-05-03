/**
 * Feedback Controller for MedTranslate AI
 * 
 * This controller handles API endpoints for user feedback,
 * including translation quality feedback.
 */

const feedbackService = require('../services/feedback-service');
const logger = require('../utils/logger');

/**
 * Submit general feedback
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { body } = req;
    const userId = req.user ? req.user.id : null;
    
    // Validate feedback
    if (!body.type) {
      return res.status(400).json({ error: 'Feedback type is required' });
    }
    
    // Store feedback
    await feedbackService.submitFeedback(body, userId);
    
    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Error submitting feedback' });
  }
};

/**
 * Submit translation feedback
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.submitTranslationFeedback = async (req, res) => {
  try {
    const { body } = req;
    const userId = req.user ? req.user.id : null;
    
    // Validate feedback
    if (!body.translationId) {
      return res.status(400).json({ error: 'Translation ID is required' });
    }
    
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return res.status(400).json({ error: 'Valid rating (1-5) is required' });
    }
    
    // Submit feedback
    const result = await feedbackService.submitTranslationFeedback(body, userId);
    
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error submitting translation feedback:', error);
    res.status(500).json({ error: 'Error submitting translation feedback' });
  }
};

/**
 * Get translation feedback statistics
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTranslationFeedbackStats = async (req, res) => {
  try {
    const { sessionId, startDate, endDate } = req.query;
    
    // Get statistics
    const stats = await feedbackService.getTranslationFeedbackStats({
      sessionId,
      startDate,
      endDate
    });
    
    res.status(200).json(stats);
  } catch (error) {
    logger.error('Error getting translation feedback statistics:', error);
    res.status(500).json({ error: 'Error getting translation feedback statistics' });
  }
};
