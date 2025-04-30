/**
 * Patient API Routes for MedTranslate AI
 * 
 * This module defines the API routes for patient-related operations.
 */

const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient-controller');
const authMiddleware = require('../middleware/auth-middleware');

/**
 * @route POST /api/patients
 * @desc Create a new patient
 * @access Private
 */
router.post('/', authMiddleware, patientController.createPatient);

/**
 * @route GET /api/patients
 * @desc Get all patients
 * @access Private
 */
router.get('/', authMiddleware, patientController.getPatients);

/**
 * @route GET /api/patients/:id
 * @desc Get patient by ID
 * @access Private
 */
router.get('/:id', authMiddleware, patientController.getPatientById);

/**
 * @route PUT /api/patients/:id
 * @desc Update patient
 * @access Private
 */
router.put('/:id', authMiddleware, patientController.updatePatient);

/**
 * @route DELETE /api/patients/:id
 * @desc Delete patient
 * @access Private
 */
router.delete('/:id', authMiddleware, patientController.deletePatient);

/**
 * @route GET /api/patients/:id/sessions
 * @desc Get patient sessions
 * @access Private
 */
router.get('/:id/sessions', authMiddleware, patientController.getPatientSessions);

/**
 * @route POST /api/patients/:id/notes
 * @desc Add note to patient
 * @access Private
 */
router.post('/:id/notes', authMiddleware, patientController.addPatientNote);

/**
 * @route GET /api/patients/:id/notes
 * @desc Get patient notes
 * @access Private
 */
router.get('/:id/notes', authMiddleware, patientController.getPatientNotes);

/**
 * @route DELETE /api/patients/:id/notes/:noteId
 * @desc Delete patient note
 * @access Private
 */
router.delete('/:id/notes/:noteId', authMiddleware, patientController.deletePatientNote);

/**
 * @route PUT /api/patients/:id/context
 * @desc Update patient medical context
 * @access Private
 */
router.put('/:id/context', authMiddleware, patientController.updatePatientContext);

/**
 * @route GET /api/patients/:id/history
 * @desc Get patient medical history
 * @access Private
 */
router.get('/:id/history', authMiddleware, patientController.getPatientHistory);

module.exports = router;
