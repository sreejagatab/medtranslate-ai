/**
 * Sync Analytics Routes for MedTranslate AI Edge Application
 *
 * This module provides API routes for retrieving analytics data from the auto-sync-manager
 * to be displayed in the UI.
 */

const express = require('express');
const router = express.Router();
const autoSyncManager = require('../auto-sync-manager');

/**
 * @route GET /sync/status
 * @desc Get sync status
 * @access Public
 */
router.get('/status', (req, res) => {
  try {
    const status = autoSyncManager.getSyncStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /sync/metrics
 * @desc Get detailed sync metrics
 * @access Public
 */
router.get('/metrics', (req, res) => {
  try {
    const status = autoSyncManager.getSyncStatus();
    res.json({
      ...status,
      detailedMetrics: true
    });
  } catch (error) {
    console.error('Error getting sync metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /sync/quality
 * @desc Get quality metrics
 * @access Public
 */
router.get('/quality', (req, res) => {
  try {
    const qualityMetrics = autoSyncManager.getQualityMetrics();
    res.json(qualityMetrics);
  } catch (error) {
    console.error('Error getting quality metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /sync/trends
 * @desc Get trend analysis
 * @access Public
 */
router.get('/trends', (req, res) => {
  try {
    const trends = autoSyncManager.analyzeTrends();
    res.json(trends);
  } catch (error) {
    console.error('Error getting trend analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /sync/anomalies
 * @desc Get anomaly detection
 * @access Public
 */
router.get('/anomalies', (req, res) => {
  try {
    const anomalies = autoSyncManager.detectAnomalies();
    res.json(anomalies);
  } catch (error) {
    console.error('Error getting anomaly detection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /sync/manual
 * @desc Trigger a manual sync
 * @access Public
 */
router.post('/manual', async (req, res) => {
  try {
    const result = await autoSyncManager.manualSync();
    res.json(result);
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
