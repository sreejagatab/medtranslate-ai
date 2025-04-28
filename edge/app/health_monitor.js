/**
 * Health Monitor for MedTranslate AI Edge Application
 * 
 * This module monitors the health of the edge application and reports
 * issues to the cloud service.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const axios = require('axios');

// Configuration
const LOG_DIR = process.env.LOG_DIR || '/logs';
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://api.medtranslate.ai';
const CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL || '300000'); // 5 minutes
const DEVICE_ID = process.env.DEVICE_ID || 'unknown';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file path
const LOG_FILE = path.join(LOG_DIR, 'health_monitor.log');

/**
 * Log a message to the log file
 * 
 * @param {string} message - The message to log
 * @param {string} level - The log level (info, warn, error)
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} [${level.toUpperCase()}] ${message}\n`;
  
  // Log to console
  console.log(logMessage);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logMessage);
}

/**
 * Check system health
 * 
 * @returns {Promise<Object>} - Health check result
 */
async function checkHealth() {
  try {
    // Get system information
    const cpuUsage = os.loadavg()[0] / os.cpus().length; // Normalized CPU usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = (totalMemory - freeMemory) / totalMemory;
    const uptime = os.uptime();
    
    // Check disk space
    const diskSpace = await checkDiskSpace();
    
    // Check network connectivity
    const networkStatus = await checkNetworkConnectivity();
    
    // Check if server is running
    const serverStatus = await checkServerStatus();
    
    // Check model status
    const modelStatus = await checkModelStatus();
    
    // Determine overall health status
    const isHealthy = 
      cpuUsage < 0.9 && 
      memoryUsage < 0.9 && 
      diskSpace.available > 1024 * 1024 * 100 && // At least 100MB free
      networkStatus.connected &&
      serverStatus.running &&
      modelStatus.available;
    
    const healthStatus = {
      timestamp: new Date().toISOString(),
      deviceId: DEVICE_ID,
      isHealthy,
      system: {
        cpuUsage,
        memoryUsage,
        totalMemory,
        freeMemory,
        uptime,
        diskSpace
      },
      network: networkStatus,
      server: serverStatus,
      models: modelStatus
    };
    
    // Log health status
    log(`Health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    
    return healthStatus;
  } catch (error) {
    log(`Error checking health: ${error.message}`, 'error');
    return {
      timestamp: new Date().toISOString(),
      deviceId: DEVICE_ID,
      isHealthy: false,
      error: error.message
    };
  }
}

/**
 * Check disk space
 * 
 * @returns {Promise<Object>} - Disk space information
 */
function checkDiskSpace() {
  return new Promise((resolve, reject) => {
    exec('df -k / | tail -1', (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      
      try {
        const parts = stdout.trim().split(/\s+/);
        const total = parseInt(parts[1]) * 1024; // Convert to bytes
        const used = parseInt(parts[2]) * 1024;
        const available = parseInt(parts[3]) * 1024;
        const usagePercent = used / total;
        
        resolve({
          total,
          used,
          available,
          usagePercent
        });
      } catch (err) {
        reject(new Error(`Failed to parse disk space: ${err.message}`));
      }
    });
  });
}

/**
 * Check network connectivity
 * 
 * @returns {Promise<Object>} - Network status
 */
async function checkNetworkConnectivity() {
  try {
    // Try to connect to the cloud API
    const response = await axios.get(`${CLOUD_API_URL}/health`, {
      timeout: 5000
    });
    
    return {
      connected: response.status === 200,
      latency: response.headers['x-response-time'] || 'unknown',
      cloudStatus: response.data.status || 'unknown'
    };
  } catch (error) {
    // Try to ping a public DNS server as fallback
    return new Promise((resolve) => {
      exec('ping -c 1 8.8.8.8', (error) => {
        resolve({
          connected: !error,
          latency: 'unknown',
          cloudStatus: 'unreachable'
        });
      });
    });
  }
}

/**
 * Check if the server is running
 * 
 * @returns {Promise<Object>} - Server status
 */
function checkServerStatus() {
  return new Promise((resolve) => {
    exec('curl -s http://localhost:3000/health', (error, stdout) => {
      if (error) {
        resolve({
          running: false,
          status: 'unreachable'
        });
        return;
      }
      
      try {
        const response = JSON.parse(stdout);
        resolve({
          running: true,
          status: response.status || 'unknown',
          version: response.version || 'unknown'
        });
      } catch (err) {
        resolve({
          running: false,
          status: 'invalid response'
        });
      }
    });
  });
}

/**
 * Check model status
 * 
 * @returns {Promise<Object>} - Model status
 */
function checkModelStatus() {
  return new Promise((resolve) => {
    // Check if model directory exists and has files
    const modelDir = process.env.MODEL_DIR || '/models';
    
    if (!fs.existsSync(modelDir)) {
      resolve({
        available: false,
        error: 'Model directory not found'
      });
      return;
    }
    
    try {
      const files = fs.readdirSync(modelDir);
      const modelFiles = files.filter(file => file.endsWith('.bin'));
      
      resolve({
        available: modelFiles.length > 0,
        count: modelFiles.length,
        models: modelFiles
      });
    } catch (error) {
      resolve({
        available: false,
        error: error.message
      });
    }
  });
}

/**
 * Report health status to the cloud
 * 
 * @param {Object} healthStatus - Health status to report
 */
async function reportHealthStatus(healthStatus) {
  try {
    const response = await axios.post(`${CLOUD_API_URL}/device/health`, healthStatus, {
      timeout: 10000
    });
    
    if (response.status === 200) {
      log('Health status reported successfully');
      
      // Check for commands from the cloud
      if (response.data.commands) {
        processCommands(response.data.commands);
      }
    } else {
      log(`Failed to report health status: ${response.status}`, 'warn');
    }
  } catch (error) {
    log(`Error reporting health status: ${error.message}`, 'error');
    
    // Save health status to file for later sync
    const healthFile = path.join(LOG_DIR, `health_${Date.now()}.json`);
    fs.writeFileSync(healthFile, JSON.stringify(healthStatus), 'utf8');
  }
}

/**
 * Process commands from the cloud
 * 
 * @param {Array<Object>} commands - Commands to process
 */
function processCommands(commands) {
  for (const command of commands) {
    log(`Received command: ${command.type}`);
    
    switch (command.type) {
      case 'restart':
        log('Restarting application...');
        process.exit(0); // Process will be restarted by the container
        break;
        
      case 'sync_models':
        log('Syncing models...');
        exec('python3 /app/model_sync.py', (error) => {
          if (error) {
            log(`Error syncing models: ${error.message}`, 'error');
          } else {
            log('Models synced successfully');
          }
        });
        break;
        
      case 'clear_cache':
        log('Clearing cache...');
        exec('node -e "require(\'./cache\').cacheManager.clearCache()"', (error) => {
          if (error) {
            log(`Error clearing cache: ${error.message}`, 'error');
          } else {
            log('Cache cleared successfully');
          }
        });
        break;
        
      default:
        log(`Unknown command: ${command.type}`, 'warn');
    }
  }
}

// Start health monitoring
log('Starting health monitor...');

// Perform initial health check
checkHealth().then(healthStatus => {
  log(`Initial health status: ${healthStatus.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
  reportHealthStatus(healthStatus);
});

// Set up periodic health checks
setInterval(async () => {
  const healthStatus = await checkHealth();
  reportHealthStatus(healthStatus);
}, CHECK_INTERVAL);

// Handle process termination
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down health monitor...', 'warn');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down health monitor...', 'warn');
  process.exit(0);
});

// Export for testing
module.exports = {
  checkHealth,
  reportHealthStatus
};
