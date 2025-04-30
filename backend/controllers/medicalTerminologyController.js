/**
 * Medical Terminology Controller
 * 
 * This controller handles API requests related to medical terminology.
 */

const MedicalTerminology = require('../models/MedicalTerminology');
const logger = require('../utils/logger');

/**
 * Get all medical terms
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllTerms = async (req, res) => {
  try {
    const { query, category, specialty, language } = req.query;
    
    const options = {
      query: query || '',
      category: category || '',
      specialty: specialty || '',
      language: language || ''
    };
    
    const terms = await MedicalTerminology.searchTerms(options);
    
    res.status(200).json({
      success: true,
      count: terms.length,
      data: terms
    });
  } catch (error) {
    logger.error('Error getting all terms:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Get a single medical term by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTerm = async (req, res) => {
  try {
    const term = await MedicalTerminology.getTermById(req.params.id);
    
    if (!term) {
      return res.status(404).json({
        success: false,
        error: 'Term not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: term
    });
  } catch (error) {
    logger.error(`Error getting term ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Create a new medical term
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createTerm = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.englishTerm || !req.body.category || !req.body.specialty) {
      return res.status(400).json({
        success: false,
        error: 'Please provide englishTerm, category, and specialty'
      });
    }
    
    const term = await MedicalTerminology.createTerm(req.body);
    
    res.status(201).json({
      success: true,
      data: term
    });
  } catch (error) {
    logger.error('Error creating term:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Update a medical term
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateTerm = async (req, res) => {
  try {
    const term = await MedicalTerminology.getTermById(req.params.id);
    
    if (!term) {
      return res.status(404).json({
        success: false,
        error: 'Term not found'
      });
    }
    
    const updatedTerm = await MedicalTerminology.updateTerm(req.params.id, req.body);
    
    res.status(200).json({
      success: true,
      data: updatedTerm
    });
  } catch (error) {
    logger.error(`Error updating term ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Delete a medical term
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteTerm = async (req, res) => {
  try {
    const term = await MedicalTerminology.getTermById(req.params.id);
    
    if (!term) {
      return res.status(404).json({
        success: false,
        error: 'Term not found'
      });
    }
    
    await MedicalTerminology.deleteTerm(req.params.id);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Error deleting term ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Add a translation to a term
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addTranslation = async (req, res) => {
  try {
    const { language, translation } = req.body;
    
    if (!language || !translation) {
      return res.status(400).json({
        success: false,
        error: 'Please provide language and translation'
      });
    }
    
    const term = await MedicalTerminology.getTermById(req.params.id);
    
    if (!term) {
      return res.status(404).json({
        success: false,
        error: 'Term not found'
      });
    }
    
    const updatedTerm = await MedicalTerminology.addTranslation(
      req.params.id,
      language,
      translation
    );
    
    res.status(200).json({
      success: true,
      data: updatedTerm
    });
  } catch (error) {
    logger.error(`Error adding translation to term ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Get terms by specialty
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTermsBySpecialty = async (req, res) => {
  try {
    const terms = await MedicalTerminology.getTermsBySpecialty(req.params.specialty);
    
    res.status(200).json({
      success: true,
      count: terms.length,
      data: terms
    });
  } catch (error) {
    logger.error(`Error getting terms for specialty ${req.params.specialty}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Get terms by category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTermsByCategory = async (req, res) => {
  try {
    const terms = await MedicalTerminology.getTermsByCategory(req.params.category);
    
    res.status(200).json({
      success: true,
      count: terms.length,
      data: terms
    });
  } catch (error) {
    logger.error(`Error getting terms for category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};
