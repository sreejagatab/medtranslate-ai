/**
 * Translation Routes for MedTranslate AI
 * 
 * This module provides API routes for translation functionality.
 */

const express = require('express');
const translationService = require('./translation-service');

const router = express.Router();

/**
 * Translate text
 * POST /translate/text
 */
router.post('/text', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage, context } = req.body;
    
    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Text, source language, and target language are required'
      });
    }
    
    const result = await translationService.translateText(
      text, sourceLanguage, targetLanguage, context || 'general'
    );
    
    res.json({
      success: true,
      translation: result
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get translation history
 * GET /translate/history
 */
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const translations = translationService.getTranslationHistory(limit);
    
    res.json({
      success: true,
      translations
    });
  } catch (error) {
    console.error('Error getting translation history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
