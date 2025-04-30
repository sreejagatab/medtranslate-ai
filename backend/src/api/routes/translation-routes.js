/**
 * Translation API Routes for MedTranslate AI
 * 
 * This module defines the API routes for translation-related operations.
 */

const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translation-controller');
const authMiddleware = require('../middleware/auth-middleware');

/**
 * @route POST /api/translate/text
 * @desc Translate text
 * @access Private
 */
router.post('/text', authMiddleware, translationController.translateText);

/**
 * @route POST /api/translate/audio
 * @desc Translate audio
 * @access Private
 */
router.post('/audio', authMiddleware, translationController.translateAudio);

/**
 * @route GET /api/translate/languages
 * @desc Get supported languages
 * @access Public
 */
router.get('/languages', translationController.getSupportedLanguages);

/**
 * @route POST /api/translate/detect
 * @desc Detect language
 * @access Private
 */
router.post('/detect', authMiddleware, translationController.detectLanguage);

/**
 * @route POST /api/translate/:id/report
 * @desc Report translation error
 * @access Private
 */
router.post('/:id/report', authMiddleware, translationController.reportTranslationError);

/**
 * @route GET /api/translate/:id/alternative
 * @desc Get alternative translation
 * @access Private
 */
router.get('/:id/alternative', authMiddleware, translationController.getAlternativeTranslation);

/**
 * @route GET /api/translate/stats
 * @desc Get translation statistics
 * @access Private
 */
router.get('/stats', authMiddleware, translationController.getTranslationStats);

module.exports = router;
