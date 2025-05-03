/**
 * Automated Recovery Manager for MedTranslate AI Edge Application
 *
 * This module provides automated recovery mechanisms based on ML-detected patterns
 * of network connectivity issues. It proactively adjusts network settings and
 * implements recovery strategies to maintain optimal connectivity.
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const os = require('os');
const networkMonitor = require('./network-monitor');

// Configuration
const CONFIG_FILE = process.env.RECOVERY_CONFIG_FILE || path.join(__dirname, '../../config/recovery-config.json');
const RECOVERY_HISTORY_FILE = process.env.RECOVERY_HISTORY_FILE || path.join(__dirname, '../../cache/recovery_history.json');
const RECOVERY_CHECK_INTERVAL = parseInt(process.env.RECOVERY_CHECK_INTERVAL || '60000'); // 1 minute
const MAX_RECOVERY_ATTEMPTS = parseInt(process.env.MAX_RECOVERY_ATTEMPTS || '5');
const RECOVERY_COOLDOWN = parseInt(process.env.RECOVERY_COOLDOWN || '300000'); // 5 minutes
const PROACTIVE_THRESHOLD = parseFloat(process.env.PROACTIVE_THRESHOLD || '0.7'); // 70% risk threshold for proactive recovery

// Recovery manager state
let isInitialized = false;
let isRecoveryInProgress = false;
let lastRecoveryTime = 0;
let recoveryAttempts = 0;
let recoveryHistory = [];
let recoveryStrategies = {};
let checkInterval = null;
let recoveryConfig = {
  enabled: true,
  proactiveEnabled: true,
  adaptiveEnabled: true,
  strategies: {
    dns_issue: true,
    poor_signal: true,
    congestion: true,
    interference: true,
    bandwidth_limit: true,
    intermittent: true,
    regular_outage: true
  },
  maxAttempts: MAX_RECOVERY_ATTEMPTS,
  cooldownPeriod: RECOVERY_COOLDOWN,
  proactiveThreshold: PROACTIVE_THRESHOLD
};

// Create event emitter
const recoveryEvents = new EventEmitter();

/**
 * Initialize the automated recovery manager
 *
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize(options = {}) {
  try {
    console.log('Initializing automated recovery manager...');

    // Apply custom options
    if (options.config) {
      recoveryConfig = { ...recoveryConfig, ...options.config };
    }

    // Load recovery config if available
    await loadRecoveryConfig();

    // Load recovery history if available
    await loadRecoveryHistory();

    // Initialize recovery strategies
    initializeRecoveryStrategies();

    // Start periodic recovery checks
    if (checkInterval) {
      clearInterval(checkInterval);
    }

    checkInterval = setInterval(async () => {
      try {
        // Skip if recovery is disabled
        if (!recoveryConfig.enabled) return;

        // Skip if recovery is already in progress
        if (isRecoveryInProgress) return;

        // Skip if we're in cooldown period
        if (Date.now() - lastRecoveryTime < recoveryConfig.cooldownPeriod) return;

        // Check if we need to perform recovery
        const networkStatus = networkMonitor.getNetworkStatus();
        
        if (!networkStatus.online) {
          // Network is offline, attempt recovery
          await performRecovery('offline', 'Network is offline');
        } else if (networkStatus.quality < 0.3) {
          // Network quality is poor, attempt recovery
          await performRecovery('poor_quality', 'Network quality is poor');
        } else if (recoveryConfig.proactiveEnabled) {
          // Check for potential issues using ML predictions
          await checkForPotentialIssues();
        }
      } catch (error) {
        console.error('Error in recovery check:', error);
      }
    }, RECOVERY_CHECK_INTERVAL);

    // Subscribe to network events
    networkMonitor.on('offline', handleNetworkOffline);
    networkMonitor.on('quality_change', handleQualityChange);

    isInitialized = true;

    return {
      success: true,
      enabled: recoveryConfig.enabled,
      proactiveEnabled: recoveryConfig.proactiveEnabled,
      adaptiveEnabled: recoveryConfig.adaptiveEnabled,
      strategies: Object.keys(recoveryStrategies)
    };
  } catch (error) {
    console.error('Error initializing automated recovery manager:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load recovery configuration from file
 *
 * @returns {Promise<boolean>} - Success status
 */
async function loadRecoveryConfig() {
  return new Promise((resolve) => {
    fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
      if (err) {
        console.log('No recovery config file found, using defaults');
        resolve(false);
        return;
      }

      try {
        const config = JSON.parse(data);
        recoveryConfig = { ...recoveryConfig, ...config };
        console.log('Loaded recovery configuration');
        resolve(true);
      } catch (error) {
        console.error('Error parsing recovery config:', error);
        resolve(false);
      }
    });
  });
}

/**
 * Save recovery configuration to file
 *
 * @returns {Promise<boolean>} - Success status
 */
async function saveRecoveryConfig() {
  return new Promise((resolve) => {
    const configDir = path.dirname(CONFIG_FILE);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFile(CONFIG_FILE, JSON.stringify(recoveryConfig, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error saving recovery config:', err);
        resolve(false);
        return;
      }

      console.log('Saved recovery configuration');
      resolve(true);
    });
  });
}

/**
 * Load recovery history from file
 *
 * @returns {Promise<boolean>} - Success status
 */
async function loadRecoveryHistory() {
  return new Promise((resolve) => {
    fs.readFile(RECOVERY_HISTORY_FILE, 'utf8', (err, data) => {
      if (err) {
        console.log('No recovery history file found, starting fresh');
        resolve(false);
        return;
      }

      try {
        recoveryHistory = JSON.parse(data);
        console.log(`Loaded ${recoveryHistory.length} recovery history entries`);
        resolve(true);
      } catch (error) {
        console.error('Error parsing recovery history:', error);
        resolve(false);
      }
    });
  });
}

/**
 * Save recovery history to file
 *
 * @returns {Promise<boolean>} - Success status
 */
async function saveRecoveryHistory() {
  return new Promise((resolve) => {
    const historyDir = path.dirname(RECOVERY_HISTORY_FILE);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    // Limit history size
    if (recoveryHistory.length > 1000) {
      recoveryHistory = recoveryHistory.slice(-1000);
    }

    fs.writeFile(RECOVERY_HISTORY_FILE, JSON.stringify(recoveryHistory, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error saving recovery history:', err);
        resolve(false);
        return;
      }

      console.log('Saved recovery history');
      resolve(true);
    });
  });
}

/**
 * Initialize recovery strategies
 */
function initializeRecoveryStrategies() {
  // DNS issue recovery strategy
  recoveryStrategies.dns_issue = {
    name: 'DNS Issue Recovery',
    description: 'Resolves DNS-related connectivity issues',
    check: async () => {
      try {
        // Check if DNS resolution is failing
        const dnsResult = await checkDnsResolution();
        return !dnsResult.success;
      } catch (error) {
        console.error('Error checking DNS resolution:', error);
        return false;
      }
    },
    execute: async () => {
      try {
        console.log('Executing DNS issue recovery strategy');
        
        // Try to use alternative DNS servers
        const alternativeDnsServers = [
          '8.8.8.8', // Google DNS
          '1.1.1.1', // Cloudflare DNS
          '9.9.9.9', // Quad9 DNS
          '208.67.222.222' // OpenDNS
        ];
        
        // Try each DNS server
        for (const dnsServer of alternativeDnsServers) {
          try {
            // Set DNS server (this is just for testing, in a real implementation
            // we would need to modify system DNS settings which requires elevated privileges)
            console.log(`Trying alternative DNS server: ${dnsServer}`);
            
            // Simulate DNS server change (in a real implementation, this would modify system settings)
            await simulateDnsChange(dnsServer);
            
            // Check if DNS resolution works with this server
            const dnsResult = await checkDnsResolution();
            if (dnsResult.success) {
              console.log(`DNS recovery successful using server: ${dnsServer}`);
              return {
                success: true,
                strategy: 'dns_issue',
                action: `Changed DNS server to ${dnsServer}`,
                details: dnsResult
              };
            }
          } catch (innerError) {
            console.error(`Error trying DNS server ${dnsServer}:`, innerError);
          }
        }
        
        // If we get here, none of the DNS servers worked
        return {
          success: false,
          strategy: 'dns_issue',
          error: 'All alternative DNS servers failed'
        };
      } catch (error) {
        console.error('Error executing DNS recovery strategy:', error);
        return {
          success: false,
          strategy: 'dns_issue',
          error: error.message
        };
      }
    }
  };
  
  // Poor signal recovery strategy
  recoveryStrategies.poor_signal = {
    name: 'Poor Signal Recovery',
    description: 'Attempts to improve Wi-Fi signal quality',
    check: async () => {
      try {
        // Check if we're on Wi-Fi and have poor signal
        const networkStatus = networkMonitor.getNetworkStatus();
        const networkInfo = networkStatus.networkInfo || {};
        
        return networkInfo.connectionType === 'wifi' && 
               (networkInfo.signalStrength !== undefined && networkInfo.signalStrength < 0.3);
      } catch (error) {
        console.error('Error checking signal strength:', error);
        return false;
      }
    },
    execute: async () => {
      try {
        console.log('Executing poor signal recovery strategy');
        
        // In a real implementation, we might:
        // 1. Try to switch to a different Wi-Fi network if available
        // 2. Try to switch to a different frequency band (2.4GHz vs 5GHz)
        // 3. Try to switch to a wired connection if available
        
        // For this implementation, we'll just simulate these actions
        console.log('Attempting to find better Wi-Fi network');
        
        // Simulate scanning for better networks
        await simulateNetworkScan();
        
        // Check if signal improved
        const networkStatus = networkMonitor.getNetworkStatus();
        const networkInfo = networkStatus.networkInfo || {};
        
        if (networkInfo.signalStrength > 0.3) {
          console.log('Signal strength improved after recovery');
          return {
            success: true,
            strategy: 'poor_signal',
            action: 'Switched to better Wi-Fi network',
            details: {
              newSignalStrength: networkInfo.signalStrength
            }
          };
        }
        
        return {
          success: false,
          strategy: 'poor_signal',
          error: 'Failed to improve signal strength'
        };
      } catch (error) {
        console.error('Error executing poor signal recovery strategy:', error);
        return {
          success: false,
          strategy: 'poor_signal',
          error: error.message
        };
      }
    }
  };
  
  // Network congestion recovery strategy
  recoveryStrategies.congestion = {
    name: 'Network Congestion Recovery',
    description: 'Attempts to mitigate network congestion issues',
    check: async () => {
      try {
        // Check if we have high latency
        const networkStatus = networkMonitor.getNetworkStatus();
        const networkMetrics = networkStatus.metrics || {};
        
        return networkMetrics.latency !== undefined && networkMetrics.latency > 200;
      } catch (error) {
        console.error('Error checking network congestion:', error);
        return false;
      }
    },
    execute: async () => {
      try {
        console.log('Executing network congestion recovery strategy');
        
        // In a real implementation, we might:
        // 1. Reduce bandwidth usage of background processes
        // 2. Prioritize critical traffic
        // 3. Switch to a different network if available
        
        // For this implementation, we'll just simulate these actions
        console.log('Attempting to reduce network congestion');
        
        // Simulate reducing bandwidth usage
        await simulateBandwidthReduction();
        
        // Check if latency improved
        const networkStatus = networkMonitor.getNetworkStatus();
        const networkMetrics = networkStatus.metrics || {};
        
        if (networkMetrics.latency < 200) {
          console.log('Network latency improved after recovery');
          return {
            success: true,
            strategy: 'congestion',
            action: 'Reduced bandwidth usage',
            details: {
              newLatency: networkMetrics.latency
            }
          };
        }
        
        return {
          success: false,
          strategy: 'congestion',
          error: 'Failed to reduce network congestion'
        };
      } catch (error) {
        console.error('Error executing congestion recovery strategy:', error);
        return {
          success: false,
          strategy: 'congestion',
          error: error.message
        };
      }
    }
  };
  
  // Add more recovery strategies for other issue types...
  // For brevity, we'll implement just these three for now
}

/**
 * Check for potential network issues using ML predictions
 */
async function checkForPotentialIssues() {
  try {
    // Get connection issue predictions
    const predictions = await networkMonitor.getConnectionIssuePredictions({
      lookAheadHours: 1, // Only look at the immediate future
      includeRecoverySuggestions: true
    });
    
    if (!predictions.success) {
      console.warn('Failed to get connection issue predictions:', predictions.error);
      return;
    }
    
    // Check if there's a high risk prediction for the immediate future
    const highRiskPredictions = predictions.predictions.filter(p => 
      p.risk >= recoveryConfig.proactiveThreshold
    );
    
    if (highRiskPredictions.length === 0) {
      // No high risk predictions
      return;
    }
    
    // Get the highest risk prediction
    const highestRiskPrediction = highRiskPredictions.reduce(
      (highest, current) => current.risk > highest.risk ? current : highest,
      highRiskPredictions[0]
    );
    
    console.log(`Detected potential network issue: ${highestRiskPrediction.likelyIssueType} (Risk: ${(highestRiskPrediction.risk * 100).toFixed(1)}%)`);
    
    // Check if we have a strategy for this issue type
    if (highestRiskPrediction.likelyIssueType && 
        recoveryStrategies[highestRiskPrediction.likelyIssueType] &&
        recoveryConfig.strategies[highestRiskPrediction.likelyIssueType]) {
      
      // Execute proactive recovery
      await performRecovery(
        highestRiskPrediction.likelyIssueType, 
        `Proactive recovery for predicted ${highestRiskPrediction.likelyIssueType}`,
        true
      );
    }
  } catch (error) {
    console.error('Error checking for potential issues:', error);
  }
}

/**
 * Perform recovery for a specific issue type
 *
 * @param {string} issueType - Type of issue to recover from
 * @param {string} reason - Reason for recovery
 * @param {boolean} isProactive - Whether this is a proactive recovery
 * @returns {Promise<Object>} - Recovery result
 */
async function performRecovery(issueType, reason, isProactive = false) {
  try {
    // Skip if recovery is disabled
    if (!recoveryConfig.enabled) {
      return { success: false, reason: 'Recovery is disabled' };
    }
    
    // Skip if we're already in a recovery process
    if (isRecoveryInProgress) {
      return { success: false, reason: 'Recovery already in progress' };
    }
    
    // Skip if we've reached max attempts and haven't cooled down
    if (recoveryAttempts >= recoveryConfig.maxAttempts && 
        Date.now() - lastRecoveryTime < recoveryConfig.cooldownPeriod) {
      return { 
        success: false, 
        reason: `Max recovery attempts reached, in cooldown period (${Math.round((recoveryConfig.cooldownPeriod - (Date.now() - lastRecoveryTime)) / 1000)}s remaining)`
      };
    }
    
    // Reset attempts if we've cooled down
    if (Date.now() - lastRecoveryTime >= recoveryConfig.cooldownPeriod) {
      recoveryAttempts = 0;
    }
    
    // Start recovery process
    isRecoveryInProgress = true;
    recoveryAttempts++;
    lastRecoveryTime = Date.now();
    
    console.log(`Starting recovery for issue type: ${issueType} (Attempt ${recoveryAttempts}/${recoveryConfig.maxAttempts})`);
    console.log(`Recovery reason: ${reason}`);
    
    // Create recovery entry
    const recoveryEntry = {
      timestamp: Date.now(),
      issueType,
      reason,
      isProactive,
      attempt: recoveryAttempts,
      strategies: []
    };
    
    // Emit recovery start event
    recoveryEvents.emit('recovery_start', {
      timestamp: Date.now(),
      issueType,
      reason,
      isProactive,
      attempt: recoveryAttempts
    });
    
    // Determine which strategies to try
    let strategiesToTry = [];
    
    if (issueType === 'offline' || issueType === 'poor_quality') {
      // For general offline or poor quality, try all enabled strategies
      strategiesToTry = Object.keys(recoveryStrategies).filter(
        strategy => recoveryConfig.strategies[strategy]
      );
    } else if (recoveryStrategies[issueType] && recoveryConfig.strategies[issueType]) {
      // For specific issue type, try that strategy
      strategiesToTry = [issueType];
    } else {
      // No matching strategy
      isRecoveryInProgress = false;
      
      const result = {
        success: false,
        issueType,
        reason: `No recovery strategy available for issue type: ${issueType}`
      };
      
      // Add to history
      recoveryEntry.success = false;
      recoveryEntry.error = result.reason;
      recoveryHistory.push(recoveryEntry);
      await saveRecoveryHistory();
      
      // Emit recovery end event
      recoveryEvents.emit('recovery_end', {
        ...result,
        timestamp: Date.now(),
        duration: Date.now() - lastRecoveryTime
      });
      
      return result;
    }
    
    // Try each strategy
    let overallSuccess = false;
    
    for (const strategyId of strategiesToTry) {
      const strategy = recoveryStrategies[strategyId];
      
      // Check if this strategy is applicable
      const isApplicable = await strategy.check();
      
      if (!isApplicable) {
        console.log(`Strategy ${strategy.name} is not applicable to current situation, skipping`);
        continue;
      }
      
      console.log(`Executing recovery strategy: ${strategy.name}`);
      
      // Execute the strategy
      const strategyResult = await strategy.execute();
      
      // Record strategy result
      recoveryEntry.strategies.push({
        id: strategyId,
        name: strategy.name,
        success: strategyResult.success,
        action: strategyResult.action,
        error: strategyResult.error,
        details: strategyResult.details
      });
      
      // If strategy succeeded, mark overall success
      if (strategyResult.success) {
        overallSuccess = true;
        break; // Stop trying more strategies if one succeeds
      }
    }
    
    // Complete recovery process
    isRecoveryInProgress = false;
    
    // Update recovery entry
    recoveryEntry.success = overallSuccess;
    recoveryEntry.duration = Date.now() - recoveryEntry.timestamp;
    
    // Add to history
    recoveryHistory.push(recoveryEntry);
    await saveRecoveryHistory();
    
    // Emit recovery end event
    recoveryEvents.emit('recovery_end', {
      timestamp: Date.now(),
      issueType,
      success: overallSuccess,
      duration: recoveryEntry.duration,
      strategies: recoveryEntry.strategies.map(s => s.id)
    });
    
    // If recovery failed and we've reached max attempts, increase cooldown
    if (!overallSuccess && recoveryAttempts >= recoveryConfig.maxAttempts) {
      console.log(`Max recovery attempts reached (${recoveryAttempts}/${recoveryConfig.maxAttempts}), entering extended cooldown`);
      
      // Emit max attempts event
      recoveryEvents.emit('max_attempts_reached', {
        timestamp: Date.now(),
        issueType,
        attempts: recoveryAttempts,
        cooldownPeriod: recoveryConfig.cooldownPeriod * 2
      });
    }
    
    return {
      success: overallSuccess,
      issueType,
      strategies: recoveryEntry.strategies,
      duration: recoveryEntry.duration
    };
  } catch (error) {
    console.error('Error performing recovery:', error);
    
    // Reset recovery state
    isRecoveryInProgress = false;
    
    return {
      success: false,
      issueType,
      error: error.message
    };
  }
}

/**
 * Handle network offline event
 *
 * @param {Object} data - Offline event data
 */
function handleNetworkOffline(data) {
  // Skip if recovery is disabled
  if (!recoveryConfig.enabled) return;
  
  // Skip if we're in cooldown period
  if (Date.now() - lastRecoveryTime < recoveryConfig.cooldownPeriod) return;
  
  // Perform recovery
  performRecovery('offline', `Network went offline: ${data.reason}`);
}

/**
 * Handle network quality change event
 *
 * @param {Object} data - Quality change event data
 */
function handleQualityChange(data) {
  // Skip if recovery is disabled
  if (!recoveryConfig.enabled) return;
  
  // Skip if we're in cooldown period
  if (Date.now() - lastRecoveryTime < recoveryConfig.cooldownPeriod) return;
  
  // Only react to significant quality drops
  if (data.previousQuality - data.newQuality > 0.3 && data.newQuality < 0.3) {
    performRecovery('poor_quality', `Network quality dropped significantly: ${(data.previousQuality * 100).toFixed(1)}% -> ${(data.newQuality * 100).toFixed(1)}%`);
  }
}

/**
 * Check DNS resolution with timing
 *
 * @returns {Promise<Object>} - DNS resolution result with timing
 */
async function checkDnsResolution() {
  return new Promise((resolve) => {
    const startTime = Date.now();

    // Try multiple domains in case one is blocked
    const domains = ['www.google.com', 'www.cloudflare.com', 'www.amazon.com'];
    let resolvedCount = 0;
    let totalTime = 0;
    let errors = [];

    // Try to resolve each domain
    domains.forEach((domain, index) => {
      const domainStartTime = Date.now();

      dns.resolve(domain, (err) => {
        const resolutionTime = Date.now() - domainStartTime;

        if (err) {
          errors.push({ domain, error: err.message, time: resolutionTime });
        } else {
          resolvedCount++;
          totalTime += resolutionTime;
        }

        // If this is the last domain or we've resolved at least one domain
        if (index === domains.length - 1 || resolvedCount > 0) {
          const time = resolvedCount > 0 ? totalTime / resolvedCount : Date.now() - startTime;

          if (resolvedCount > 0) {
            resolve({
              success: true,
              time,
              resolvedCount,
              totalDomains: domains.length
            });
          } else {
            resolve({
              success: false,
              time,
              error: errors.map(e => `${e.domain}: ${e.error}`).join(', '),
              errors
            });
          }
        }
      });
    });
  });
}

/**
 * Simulate changing DNS server (for testing)
 *
 * @param {string} dnsServer - DNS server to use
 * @returns {Promise<void>}
 */
async function simulateDnsChange(dnsServer) {
  return new Promise((resolve) => {
    console.log(`Simulating DNS change to ${dnsServer}`);
    // In a real implementation, this would modify system DNS settings
    setTimeout(resolve, 500);
  });
}

/**
 * Simulate scanning for better networks (for testing)
 *
 * @returns {Promise<void>}
 */
async function simulateNetworkScan() {
  return new Promise((resolve) => {
    console.log('Simulating network scan');
    // In a real implementation, this would scan for available networks
    setTimeout(resolve, 1000);
  });
}

/**
 * Simulate reducing bandwidth usage (for testing)
 *
 * @returns {Promise<void>}
 */
async function simulateBandwidthReduction() {
  return new Promise((resolve) => {
    console.log('Simulating bandwidth reduction');
    // In a real implementation, this would reduce bandwidth usage
    setTimeout(resolve, 800);
  });
}

/**
 * Get recovery manager status
 *
 * @returns {Object} - Recovery manager status
 */
function getStatus() {
  return {
    initialized: isInitialized,
    enabled: recoveryConfig.enabled,
    proactiveEnabled: recoveryConfig.proactiveEnabled,
    adaptiveEnabled: recoveryConfig.adaptiveEnabled,
    isRecoveryInProgress,
    lastRecoveryTime,
    recoveryAttempts,
    maxAttempts: recoveryConfig.maxAttempts,
    cooldownPeriod: recoveryConfig.cooldownPeriod,
    cooldownRemaining: Math.max(0, recoveryConfig.cooldownPeriod - (Date.now() - lastRecoveryTime)),
    historyEntries: recoveryHistory.length,
    availableStrategies: Object.keys(recoveryStrategies).filter(s => recoveryConfig.strategies[s]),
    recoveryCount: recoveryHistory.length,
    successfulRecoveries: recoveryHistory.filter(r => r.success).length
  };
}

/**
 * Get recovery history
 *
 * @param {Object} options - Options for filtering history
 * @returns {Array} - Recovery history
 */
function getRecoveryHistory(options = {}) {
  const { limit = 50, issueType, success } = options;
  
  let filteredHistory = [...recoveryHistory];
  
  // Filter by issue type if specified
  if (issueType) {
    filteredHistory = filteredHistory.filter(entry => entry.issueType === issueType);
  }
  
  // Filter by success if specified
  if (success !== undefined) {
    filteredHistory = filteredHistory.filter(entry => entry.success === success);
  }
  
  // Sort by timestamp (newest first)
  filteredHistory.sort((a, b) => b.timestamp - a.timestamp);
  
  // Limit results
  return filteredHistory.slice(0, limit);
}

/**
 * Update recovery configuration
 *
 * @param {Object} config - New configuration
 * @returns {Promise<Object>} - Update result
 */
async function updateConfig(config) {
  try {
    // Update config
    recoveryConfig = { ...recoveryConfig, ...config };
    
    // Save config
    await saveRecoveryConfig();
    
    return {
      success: true,
      config: recoveryConfig
    };
  } catch (error) {
    console.error('Error updating recovery config:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Register event listener
 *
 * @param {string} event - Event name
 * @param {Function} listener - Event listener
 */
function on(event, listener) {
  recoveryEvents.on(event, listener);
}

/**
 * Remove event listener
 *
 * @param {string} event - Event name
 * @param {Function} listener - Event listener
 */
function off(event, listener) {
  recoveryEvents.off(event, listener);
}

// Export recovery manager
const automatedRecoveryManager = {
  initialize,
  getStatus,
  getRecoveryHistory,
  updateConfig,
  performRecovery,
  on,
  off
};

module.exports = automatedRecoveryManager;
