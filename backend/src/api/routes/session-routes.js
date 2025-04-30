/**
 * Session API Routes for MedTranslate AI
 * 
 * This module defines the API routes for session-related operations.
 */

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session-controller');
const authMiddleware = require('../middleware/auth-middleware');

/**
 * @route POST /api/sessions
 * @desc Create a new session
 * @access Private
 */
router.post('/', authMiddleware, sessionController.createSession);

/**
 * @route GET /api/sessions
 * @desc Get all sessions
 * @access Private
 */
router.get('/', authMiddleware, sessionController.getSessions);

/**
 * @route GET /api/sessions/:id
 * @desc Get session by ID
 * @access Private
 */
router.get('/:id', authMiddleware, sessionController.getSessionById);

/**
 * @route PUT /api/sessions/:id
 * @desc Update session
 * @access Private
 */
router.put('/:id', authMiddleware, sessionController.updateSession);

/**
 * @route DELETE /api/sessions/:id
 * @desc Delete session
 * @access Private
 */
router.delete('/:id', authMiddleware, sessionController.deleteSession);

/**
 * @route POST /api/sessions/:id/end
 * @desc End session
 * @access Private
 */
router.post('/:id/end', authMiddleware, sessionController.endSession);

/**
 * @route GET /api/sessions/:id/messages
 * @desc Get session messages
 * @access Private
 */
router.get('/:id/messages', authMiddleware, sessionController.getSessionMessages);

/**
 * @route POST /api/sessions/:id/messages
 * @desc Add message to session
 * @access Private
 */
router.post('/:id/messages', authMiddleware, sessionController.addSessionMessage);

/**
 * @route POST /api/sessions/:id/join
 * @desc Join session
 * @access Private
 */
router.post('/:id/join', authMiddleware, sessionController.joinSession);

/**
 * @route POST /api/sessions/:id/language
 * @desc Update session language
 * @access Private
 */
router.post('/:id/language', authMiddleware, sessionController.updateSessionLanguage);

/**
 * @route GET /api/sessions/:id/summary
 * @desc Get session summary
 * @access Private
 */
router.get('/:id/summary', authMiddleware, sessionController.getSessionSummary);

/**
 * @route GET /api/sessions/:id/export
 * @desc Export session transcript
 * @access Private
 */
router.get('/:id/export', authMiddleware, sessionController.exportSessionTranscript);

/**
 * @route GET /api/sessions/code/:code
 * @desc Get session by code
 * @access Public
 */
router.get('/code/:code', sessionController.getSessionByCode);

module.exports = router;
