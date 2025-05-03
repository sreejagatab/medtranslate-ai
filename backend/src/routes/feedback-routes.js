/**
 * Feedback Routes for MedTranslate AI
 * 
 * This file defines API routes for user feedback,
 * including translation quality feedback.
 */

const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback-controller');
const authMiddleware = require('../middleware/auth-middleware');

// Submit general feedback
router.post('/submit', feedbackController.submitFeedback);

// Submit translation feedback
router.post('/translation', authMiddleware.authenticateOptional, feedbackController.submitTranslationFeedback);

// Get translation feedback statistics
router.get('/translation/stats', authMiddleware.authenticate, feedbackController.getTranslationFeedbackStats);

module.exports = router;
