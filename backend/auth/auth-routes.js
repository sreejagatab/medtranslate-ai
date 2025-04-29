/**
 * Authentication Routes for MedTranslate AI
 *
 * This module provides API routes for authentication and session management.
 */

const express = require('express');
const authService = require('./auth-service');

const router = express.Router();

/**
 * Provider login endpoint
 * POST /auth/login
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  const user = authService.authenticateUser(email, password);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
  }

  const token = authService.generateToken(user);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * Create a new session
 * POST /sessions
 */
router.post('/sessions', (req, res) => {
  const { providerId, patientLanguage, context } = req.body;

  if (!providerId || !patientLanguage) {
    return res.status(400).json({
      success: false,
      error: 'Provider ID and patient language are required'
    });
  }

  const session = authService.createSession(providerId, patientLanguage, context);

  res.json({
    success: true,
    session
  });
});

/**
 * Join a session with a session code
 * POST /sessions/join
 */
router.post('/sessions/join', (req, res) => {
  const { sessionCode } = req.body;

  if (!sessionCode) {
    return res.status(400).json({
      success: false,
      error: 'Session code is required'
    });
  }

  const result = authService.joinSessionWithCode(sessionCode);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

/**
 * End a session
 * POST /sessions/:sessionId/end
 */
router.post('/sessions/:sessionId/end', (req, res) => {
  const { sessionId } = req.params;

  const result = authService.endSession(sessionId);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

/**
 * Generate a patient token for a session
 * POST /sessions/patient-token
 */
router.post('/sessions/patient-token', (req, res) => {
  const { sessionId, language } = req.body;

  if (!sessionId || !language) {
    return res.status(400).json({
      success: false,
      error: 'Session ID and language are required'
    });
  }

  const result = authService.generatePatientSessionToken(sessionId, language);

  res.json({
    success: true,
    token: result.token,
    sessionCode: result.sessionCode
  });
});

/**
 * Verify a token
 * POST /auth/verify
 */
router.post('/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required'
    });
  }

  const decoded = authService.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  res.json({
    success: true,
    user: decoded
  });
});

/**
 * Register a new user
 * POST /auth/register
 */
router.post('/register', (req, res) => {
  const { name, email, password, role, specialty } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and password are required'
    });
  }

  // Register user
  const result = authService.registerUser({
    name,
    email,
    password,
    role,
    specialty
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  // Generate token for the new user
  const token = authService.generateToken(result.user);

  res.status(201).json({
    success: true,
    token,
    user: result.user
  });
});

/**
 * Get all users (admin only)
 * GET /users
 */
router.get('/users', (req, res) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = authService.verifyToken(token);

  // Check if user is admin
  if (!decoded || decoded.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  // Get users with optional filters
  const { role, active } = req.query;
  const options = {};

  if (role) options.role = role;
  if (active !== undefined) options.active = active === 'true';

  const users = authService.getUsers(options);

  res.json({
    success: true,
    users
  });
});

/**
 * Update a user
 * PUT /users/:userId
 */
router.put('/users/:userId', (req, res) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = authService.verifyToken(token);

  // Check if user is admin or the user being updated
  if (!decoded || (decoded.role !== 'admin' && decoded.id !== req.params.userId)) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to update this user'
    });
  }

  // Update user
  const result = authService.updateUser(req.params.userId, req.body);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

module.exports = router;
