/**
 * Monitoring Routes for MedTranslate AI
 *
 * API routes for system monitoring and health checks
 */

const express = require('express');
const router = express.Router();
const monitoringService = require('../monitoring/monitoring-service');
const { authenticateAdmin } = require('../middleware/auth');

/**
 * @route GET /monitoring/health
 * @desc Get system health status
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const healthData = await monitoringService.getSystemHealth();
    res.json(healthData);
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({ message: 'Error getting system health' });
  }
});

/**
 * @route GET /monitoring/performance
 * @desc Get performance metrics
 * @access Public (for development), Admin (for production)
 */
router.get('/performance', async (req, res) => {
  try {
    const { startTime, endTime, period } = req.query;

    const params = {};

    if (startTime) {
      params.startTime = new Date(startTime);
    }

    if (endTime) {
      params.endTime = new Date(endTime);
    }

    if (period) {
      params.period = parseInt(period, 10);
    }

    const performanceData = await monitoringService.getPerformanceMetrics(params);
    res.json(performanceData);
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({ message: 'Error getting performance metrics' });
  }
});

/**
 * @route GET /monitoring/resources
 * @desc Get resource utilization data
 * @access Public (for development), Admin (for production)
 */
router.get('/resources', async (req, res) => {
  try {
    const resourceData = await monitoringService.getResourceUtilization();
    res.json(resourceData);
  } catch (error) {
    console.error('Error getting resource utilization:', error);
    res.status(500).json({ message: 'Error getting resource utilization' });
  }
});

/**
 * @route GET /monitoring/alerts
 * @desc Get system alerts
 * @access Public (for development), Admin (for production)
 */
router.get('/alerts', async (req, res) => {
  try {
    const { startDate, endDate, severity, component, status } = req.query;

    const params = {};

    if (startDate) {
      params.startDate = startDate;
    }

    if (endDate) {
      params.endDate = endDate;
    }

    if (severity) {
      params.severity = severity;
    }

    if (component) {
      params.component = component;
    }

    if (status) {
      params.status = status;
    }

    const alertsData = await monitoringService.getSystemAlerts(params);
    res.json(alertsData);
  } catch (error) {
    console.error('Error getting system alerts:', error);
    res.status(500).json({ message: 'Error getting system alerts' });
  }
});

/**
 * @route POST /monitoring/alerts
 * @desc Create a system alert
 * @access Admin
 */
router.post('/alerts', authenticateAdmin, async (req, res) => {
  try {
    const { severity, component, message, details } = req.body;

    if (!severity || !component || !message) {
      return res.status(400).json({
        message: 'Missing required fields: severity, component, message'
      });
    }

    const alertData = {
      severity,
      component,
      message,
      details
    };

    const alert = await monitoringService.createSystemAlert(alertData);
    res.status(201).json(alert);
  } catch (error) {
    console.error('Error creating system alert:', error);
    res.status(500).json({ message: 'Error creating system alert' });
  }
});

/**
 * @route PUT /monitoring/alerts/:alertId
 * @desc Update a system alert
 * @access Admin
 */
router.put('/alerts/:alertId', authenticateAdmin, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        message: 'Missing required field: status'
      });
    }

    const updateData = {
      status
    };

    if (notes) {
      updateData.notes = notes;
    }

    const alert = await monitoringService.updateSystemAlert(alertId, updateData);
    res.json(alert);
  } catch (error) {
    console.error('Error updating system alert:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'Error updating system alert' });
  }
});

module.exports = router;
