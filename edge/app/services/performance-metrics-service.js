/**
 * Performance Metrics Service for MedTranslate AI
 * 
 * This service collects and provides performance metrics for the ML models,
 * predictive caching system, auto-sync-manager, storage-optimizer, and device.
 * It integrates with various components to gather metrics and provides a unified
 * interface for accessing them.
 */

// Import required modules
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import internal modules if available
let modelAdapter;
let predictiveCache;
let autoSyncManager;
let storageOptimizer;
let networkMonitor;

try {
  modelAdapter = require('../ml-models/model-adapter');
} catch (error) {
  console.warn('ML model adapter not available for performance metrics:', error.message);
}

try {
  predictiveCache = require('../predictive-cache');
} catch (error) {
  console.warn('Predictive cache not available for performance metrics:', error.message);
}

try {
  autoSyncManager = require('../auto-sync-manager');
} catch (error) {
  console.warn('Auto-sync manager not available for performance metrics:', error.message);
}

try {
  storageOptimizer = require('../utils/storage-optimizer');
} catch (error) {
  console.warn('Storage optimizer not available for performance metrics:', error.message);
}

try {
  networkMonitor = require('../utils/network-monitor');
} catch (error) {
  console.warn('Network monitor not available for performance metrics:', error.message);
}

// Constants
const METRICS_DIR = process.env.METRICS_DIR || path.join(__dirname, '../../data/metrics');
const ML_PERFORMANCE_FILE = path.join(METRICS_DIR, 'ml-performance-history.json');
const SYNC_HISTORY_FILE = path.join(METRICS_DIR, 'sync-history.json');
const DEVICE_PERFORMANCE_FILE = path.join(METRICS_DIR, 'device-performance-history.json');
const MAX_HISTORY_ITEMS = 100;

// Ensure metrics directory exists
if (!fs.existsSync(METRICS_DIR)) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
}

// Initialize history data
let mlPerformanceHistory = [];
let syncHistory = [];
let devicePerformanceHistory = [];

// Load history data if available
try {
  if (fs.existsSync(ML_PERFORMANCE_FILE)) {
    mlPerformanceHistory = JSON.parse(fs.readFileSync(ML_PERFORMANCE_FILE, 'utf8'));
  }
  
  if (fs.existsSync(SYNC_HISTORY_FILE)) {
    syncHistory = JSON.parse(fs.readFileSync(SYNC_HISTORY_FILE, 'utf8'));
  }
  
  if (fs.existsSync(DEVICE_PERFORMANCE_FILE)) {
    devicePerformanceHistory = JSON.parse(fs.readFileSync(DEVICE_PERFORMANCE_FILE, 'utf8'));
  }
} catch (error) {
  console.error('Error loading performance history:', error);
}

/**
 * Get ML model performance metrics
 * 
 * @returns {Object} ML model performance metrics
 */
function getMLPerformance() {
  try {
    if (!modelAdapter) {
      return {
        isInitialized: false,
        error: 'ML model adapter not available'
      };
    }
    
    // Get model status
    const modelStatus = modelAdapter.getStatus();
    
    // Get model performance metrics
    const performanceMetrics = {
      isInitialized: modelStatus.isInitialized || false,
      version: modelStatus.version || '1.0',
      accuracy: modelStatus.accuracy || 0,
      computeTimeMs: modelStatus.computeTimeMs || 0,
      memoryUsageMB: modelStatus.memoryUsageMB || 0,
      lastTrainingTime: modelStatus.lastTrainingTime || 0,
      trainingSamples: modelStatus.trainingSamples || 0,
      modelSizeKB: modelStatus.modelSizeKB || 0,
      models: modelStatus.models || []
    };
    
    return performanceMetrics;
  } catch (error) {
    console.error('Error getting ML performance metrics:', error);
    return {
      isInitialized: false,
      error: error.message
    };
  }
}

/**
 * Get sync status and history
 * 
 * @returns {Object} Sync status and history
 */
function getSyncStatus() {
  try {
    if (!autoSyncManager) {
      return {
        enabled: false,
        error: 'Auto-sync manager not available'
      };
    }
    
    // Get sync status
    const syncStatus = autoSyncManager.getStatus();
    
    return syncStatus;
  } catch (error) {
    console.error('Error getting sync status:', error);
    return {
      enabled: false,
      error: error.message
    };
  }
}

/**
 * Get device performance metrics
 * 
 * @returns {Object} Device performance metrics
 */
function getDevicePerformance() {
  try {
    // Get CPU usage
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    
    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = (totalMemory - freeMemory) / totalMemory;
    
    // Get network status if available
    let networkStatus = {
      online: true,
      connectionType: 'unknown',
      signalStrength: 0.8,
      latencyMs: 50,
      downloadSpeedMbps: 10,
      uploadSpeedMbps: 5,
      connectionStability: 0.9
    };
    
    if (networkMonitor) {
      networkStatus = networkMonitor.getNetworkStatus();
    }
    
    // Calculate overall score (0-100)
    const overallScore = Math.round(
      (1 - cpuUsage) * 25 +
      (1 - memoryUsage) * 25 +
      networkStatus.connectionStability * 25 +
      (networkStatus.online ? 25 : 0)
    );
    
    // Get battery info (mock data for now)
    const batteryInfo = {
      batteryLevel: 0.75,
      batteryCharging: true,
      batteryTemperature: 35,
      appBatteryUsage: 0.05,
      estimatedRuntimeMinutes: 180
    };
    
    // Combine all metrics
    const devicePerformance = {
      overallScore,
      cpuUsage,
      memoryUsage,
      connectionType: networkStatus.connectionType,
      signalStrength: networkStatus.signalStrength,
      latencyMs: networkStatus.latencyMs,
      downloadSpeedMbps: networkStatus.downloadSpeedMbps,
      uploadSpeedMbps: networkStatus.uploadSpeedMbps,
      connectionStability: networkStatus.connectionStability,
      batteryLevel: batteryInfo.batteryLevel,
      batteryCharging: batteryInfo.batteryCharging,
      batteryTemperature: batteryInfo.batteryTemperature,
      appBatteryUsage: batteryInfo.appBatteryUsage,
      estimatedRuntimeMinutes: batteryInfo.estimatedRuntimeMinutes,
      cpuHistory: devicePerformanceHistory.slice(-24).map(item => ({
        label: new Date(item.timestamp).getHours().toString(),
        value: item.cpuUsage
      })),
      memoryHistory: devicePerformanceHistory.slice(-24).map(item => ({
        label: new Date(item.timestamp).getHours().toString(),
        value: item.memoryUsage
      }))
    };
    
    return devicePerformance;
  } catch (error) {
    console.error('Error getting device performance metrics:', error);
    return {
      overallScore: 50,
      error: error.message
    };
  }
}

/**
 * Record current performance metrics
 */
function recordCurrentMetrics() {
  try {
    const timestamp = Date.now();
    
    // Record ML performance
    const mlPerformance = getMLPerformance();
    if (mlPerformance.isInitialized) {
      mlPerformanceHistory.push({
        timestamp,
        accuracy: mlPerformance.accuracy,
        computeTimeMs: mlPerformance.computeTimeMs,
        memoryUsageMB: mlPerformance.memoryUsageMB,
        label: new Date(timestamp).getHours().toString()
      });
      
      // Trim history if needed
      if (mlPerformanceHistory.length > MAX_HISTORY_ITEMS) {
        mlPerformanceHistory = mlPerformanceHistory.slice(-MAX_HISTORY_ITEMS);
      }
      
      // Save to file
      fs.writeFileSync(ML_PERFORMANCE_FILE, JSON.stringify(mlPerformanceHistory), 'utf8');
    }
    
    // Record device performance
    const devicePerformance = getDevicePerformance();
    devicePerformanceHistory.push({
      timestamp,
      cpuUsage: devicePerformance.cpuUsage,
      memoryUsage: devicePerformance.memoryUsage,
      connectionStability: devicePerformance.connectionStability,
      batteryLevel: devicePerformance.batteryLevel,
      label: new Date(timestamp).getHours().toString()
    });
    
    // Trim history if needed
    if (devicePerformanceHistory.length > MAX_HISTORY_ITEMS) {
      devicePerformanceHistory = devicePerformanceHistory.slice(-MAX_HISTORY_ITEMS);
    }
    
    // Save to file
    fs.writeFileSync(DEVICE_PERFORMANCE_FILE, JSON.stringify(devicePerformanceHistory), 'utf8');
  } catch (error) {
    console.error('Error recording performance metrics:', error);
  }
}

/**
 * Record sync event
 * 
 * @param {Object} syncEvent - Sync event data
 */
function recordSyncEvent(syncEvent) {
  try {
    // Add timestamp and label if not present
    if (!syncEvent.timestamp) {
      syncEvent.timestamp = Date.now();
    }
    
    if (!syncEvent.label) {
      syncEvent.label = new Date(syncEvent.timestamp).getHours().toString();
    }
    
    // Add to history
    syncHistory.push(syncEvent);
    
    // Trim history if needed
    if (syncHistory.length > MAX_HISTORY_ITEMS) {
      syncHistory = syncHistory.slice(-MAX_HISTORY_ITEMS);
    }
    
    // Save to file
    fs.writeFileSync(SYNC_HISTORY_FILE, JSON.stringify(syncHistory), 'utf8');
  } catch (error) {
    console.error('Error recording sync event:', error);
  }
}

// Start periodic recording of metrics
let metricsInterval;
function startMetricsRecording(intervalMs = 60000) {
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
  
  metricsInterval = setInterval(recordCurrentMetrics, intervalMs);
  console.log(`Started performance metrics recording with interval ${intervalMs}ms`);
  
  // Record initial metrics
  recordCurrentMetrics();
}

// Stop metrics recording
function stopMetricsRecording() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    console.log('Stopped performance metrics recording');
  }
}

// Export the module
module.exports = {
  getMLPerformance,
  getSyncStatus,
  getDevicePerformance,
  recordSyncEvent,
  startMetricsRecording,
  stopMetricsRecording,
  getMLPerformanceHistory: () => mlPerformanceHistory,
  getSyncHistory: () => syncHistory
};
