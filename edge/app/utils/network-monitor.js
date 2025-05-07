/**
 * Network Monitor Utility for Edge Application
 * 
 * This file serves as a bridge to the main network-monitor.js file
 * to fix the path resolution issue in the performance-metrics-service.js
 */

// Re-export the main network-monitor module
module.exports = require('../network-monitor');
