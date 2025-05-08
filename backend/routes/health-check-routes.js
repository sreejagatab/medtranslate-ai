/**
 * Health Check Routes for MedTranslate AI
 *
 * This file defines the API routes for health check operations,
 * including getting system health status, component health status,
 * and health check history.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const healthCheckController = require('../controllers/health-check-controller');

/**
 * @route GET /api/health
 * @desc Get system health status
 * @access Public
 */
router.get('/', healthCheckController.getSystemHealth);

/**
 * @route GET /api/health/components/:component
 * @desc Check health of a specific component
 * @access Private
 */
router.get('/components/:component', authenticate, healthCheckController.checkComponent);

/**
 * @route GET /api/health/history
 * @desc Get health check history
 * @access Private
 */
router.get('/history', authenticate, healthCheckController.getHealthCheckHistory);

module.exports = router;
