/**
 * Medical Terminology Routes
 * 
 * This file defines the API routes for medical terminology.
 */

const express = require('express');
const router = express.Router();
const { 
  getAllTerms,
  getTerm,
  createTerm,
  updateTerm,
  deleteTerm,
  addTranslation,
  getTermsBySpecialty,
  getTermsByCategory
} = require('../controllers/medicalTerminologyController');
const { protect, authorize } = require('../middleware/auth');

// Routes
router
  .route('/')
  .get(getAllTerms)
  .post(protect, authorize('admin', 'provider'), createTerm);

router
  .route('/:id')
  .get(getTerm)
  .put(protect, authorize('admin', 'provider'), updateTerm)
  .delete(protect, authorize('admin'), deleteTerm);

router
  .route('/:id/translations')
  .post(protect, authorize('admin', 'provider'), addTranslation);

router
  .route('/specialty/:specialty')
  .get(getTermsBySpecialty);

router
  .route('/category/:category')
  .get(getTermsByCategory);

module.exports = router;
