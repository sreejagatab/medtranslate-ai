/**
 * Feedback Routes for MedTranslate AI
 * 
 * This file defines the API routes for collecting and retrieving feedback.
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Mock database for feedback storage
const feedbackDb = [];

/**
 * @route POST /feedback/submit
 * @desc Submit general feedback about the system
 * @access Public
 */
router.post('/submit', (req, res) => {
  try {
    const { userId, userType, category, rating, comment, deviceInfo } = req.body;
    
    if (!category || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Category and rating are required'
      });
    }
    
    const feedback = {
      id: `feedback-${Date.now()}`,
      userId: userId || 'anonymous',
      userType: userType || 'anonymous',
      category,
      rating,
      comment: comment || '',
      deviceInfo: deviceInfo || {},
      timestamp: new Date().toISOString()
    };
    
    // In a real implementation, this would be stored in a database
    feedbackDb.push(feedback);
    
    return res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Error submitting feedback'
    });
  }
});

/**
 * @route POST /feedback/translation
 * @desc Submit feedback about a specific translation
 * @access Private
 */
router.post('/translation', protect, (req, res) => {
  try {
    const { translationId, rating, isAccurate, alternativeText, medicalTerms, sessionId } = req.body;
    
    if (!translationId || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Translation ID and rating are required'
      });
    }
    
    const feedback = {
      id: `translation-feedback-${Date.now()}`,
      userId: req.user.sub,
      userType: req.user.type,
      translationId,
      rating,
      isAccurate: isAccurate !== undefined ? isAccurate : null,
      alternativeText: alternativeText || null,
      medicalTerms: medicalTerms || [],
      sessionId: sessionId || null,
      timestamp: new Date().toISOString()
    };
    
    // In a real implementation, this would be stored in a database
    feedbackDb.push(feedback);
    
    return res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting translation feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Error submitting translation feedback'
    });
  }
});

/**
 * @route GET /feedback/translation/stats
 * @desc Get statistics about translation feedback
 * @access Private (Admin only)
 */
router.get('/translation/stats', protect, authorize('admin'), (req, res) => {
  try {
    // Filter for translation feedback only
    const translationFeedback = feedbackDb.filter(item => item.id.startsWith('translation-feedback-'));
    
    // Calculate statistics
    const totalCount = translationFeedback.length;
    const averageRating = totalCount > 0 
      ? translationFeedback.reduce((sum, item) => sum + item.rating, 0) / totalCount 
      : 0;
    
    const accuracyRate = totalCount > 0
      ? translationFeedback.filter(item => item.isAccurate === true).length / totalCount
      : 0;
    
    // Group by rating
    const ratingDistribution = {};
    translationFeedback.forEach(item => {
      ratingDistribution[item.rating] = (ratingDistribution[item.rating] || 0) + 1;
    });
    
    return res.status(200).json({
      success: true,
      data: {
        totalFeedbackCount: totalCount,
        averageRating,
        accuracyRate,
        ratingDistribution
      }
    });
  } catch (error) {
    console.error('Error getting translation feedback stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting translation feedback statistics'
    });
  }
});

module.exports = router;
