/**
 * Device Simulator for MedTranslate AI Performance Testing
 * 
 * This module provides functions for simulating different device profiles
 * to test performance across a range of hardware capabilities.
 */

const os = require('os');
const { performance } = require('perf_hooks');

// Device profiles
const DEVICE_PROFILES = {
  'low-end': {
    cpu: { count: 2, speed: 1.2 },
    memory: { total: 2 * 1024 * 1024 * 1024 }, // 2GB
    gpu: { available: false },
    network: { latency: 100, bandwidth: 1 * 1024 * 1024 } // 1 Mbps
  },
  'mid-range': {
    cpu: { count: 4, speed: 2.0 },
    memory: { total: 8 * 1024 * 1024 * 1024 }, // 8GB
    gpu: { available: false },
    network: { latency: 50, bandwidth: 10 * 1024 * 1024 } // 10 Mbps
  },
  'high-end': {
    cpu: { count: 8, speed: 3.0 },
    memory: { total: 16 * 1024 * 1024 * 1024 }, // 16GB
    gpu: { available: true },
    network: { latency: 20, bandwidth: 50 * 1024 * 1024 } // 50 Mbps
  },
  'tablet': {
    cpu: { count: 4, speed: 1.8 },
    memory: { total: 4 * 1024 * 1024 * 1024 }, // 4GB
    gpu: { available: true },
    network: { latency: 70, bandwidth: 5 * 1024 * 1024 } // 5 Mbps
  },
  'smartphone': {
    cpu: { count: 6, speed: 2.2 },
    memory: { total: 6 * 1024 * 1024 * 1024 }, // 6GB
    gpu: { available: true },
    network: { latency: 80, bandwidth: 8 * 1024 * 1024 } // 8 Mbps
  }
};

// Network conditions
const NETWORK_CONDITIONS = {
  'offline': { online: false, latency: 0, bandwidth: 0 },
  '2g': { online: true, latency: 300, bandwidth: 250 * 1024 }, // 250 Kbps
  '3g': { online: true, latency: 100, bandwidth: 1.5 * 1024 * 1024 }, // 1.5 Mbps
  '4g': { online: true, latency: 50, bandwidth: 10 * 1024 * 1024 }, // 10 Mbps
  '5g': { online: true, latency: 10, bandwidth: 100 * 1024 * 1024 }, // 100 Mbps
  'wifi': { online: true, latency: 20, bandwidth: 50 * 1024 * 1024 }, // 50 Mbps
  'ethernet': { online: true, latency: 5, bandwidth: 1000 * 1024 * 1024 } // 1 Gbps
};

// Original system info
let originalSystemInfo = null;

// Current device profile
let currentDeviceProfile = null;

// Current network condition
let currentNetworkCondition = null;

/**
 * Get actual system information
 * 
 * @returns {Object} - System information
 */
function getActualSystemInfo() {
  const cpus = os.cpus();
  
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpuModel: cpus.length > 0 ? cpus[0].model : 'Unknown',
    cpuCount: cpus.length,
    cpuSpeed: cpus.length > 0 ? cpus[0].speed : 0,
    totalMemoryMB: os.totalmem() / (1024 * 1024),
    freeMemoryMB: os.freemem() / (1024 * 1024),
    nodeVersion: process.version,
    hostname: os.hostname()
  };
}

/**
 * Initialize device simulator
 * 
 * @returns {Object} - Original system information
 */
function initialize() {
  if (!originalSystemInfo) {
    originalSystemInfo = getActualSystemInfo();
    console.log('Device simulator initialized with actual system info:', originalSystemInfo);
  }
  
  return originalSystemInfo;
}

/**
 * Simulate a device profile
 * 
 * @param {string} profileName - Name of the device profile
 * @returns {Object} - Simulated device profile
 */
function simulateDevice(profileName) {
  // Initialize if not already initialized
  if (!originalSystemInfo) {
    initialize();
  }
  
  // Get device profile
  const profile = DEVICE_PROFILES[profileName];
  if (!profile) {
    throw new Error(`Unknown device profile: ${profileName}`);
  }
  
  // Set current device profile
  currentDeviceProfile = {
    name: profileName,
    ...profile
  };
  
  console.log(`Simulating device profile: ${profileName}`);
  
  return currentDeviceProfile;
}

/**
 * Simulate network conditions
 * 
 * @param {string} conditionName - Name of the network condition
 * @returns {Object} - Simulated network condition
 */
function simulateNetwork(conditionName) {
  // Get network condition
  const condition = NETWORK_CONDITIONS[conditionName];
  if (!condition) {
    throw new Error(`Unknown network condition: ${conditionName}`);
  }
  
  // Set current network condition
  currentNetworkCondition = {
    name: conditionName,
    ...condition
  };
  
  console.log(`Simulating network condition: ${conditionName}`);
  
  return currentNetworkCondition;
}

/**
 * Get current device profile
 * 
 * @returns {Object} - Current device profile
 */
function getCurrentDeviceProfile() {
  return currentDeviceProfile || null;
}

/**
 * Get current network condition
 * 
 * @returns {Object} - Current network condition
 */
function getCurrentNetworkCondition() {
  return currentNetworkCondition || null;
}

/**
 * Reset device simulation
 * 
 * @returns {Object} - Original system information
 */
function resetSimulation() {
  currentDeviceProfile = null;
  currentNetworkCondition = null;
  
  console.log('Device simulation reset to actual system');
  
  return originalSystemInfo;
}

/**
 * Simulate network latency
 * 
 * @param {Function} fn - Function to execute with simulated latency
 * @returns {Function} - Function with simulated latency
 */
function withNetworkLatency(fn) {
  return async (...args) => {
    // Get current network condition
    const networkCondition = getCurrentNetworkCondition();
    
    // If no network condition is set, execute function normally
    if (!networkCondition) {
      return fn(...args);
    }
    
    // If offline, throw error
    if (!networkCondition.online) {
      throw new Error('Network is offline');
    }
    
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, networkCondition.latency));
    
    // Execute function
    return fn(...args);
  };
}

/**
 * Simulate CPU throttling
 * 
 * @param {Function} fn - Function to execute with simulated CPU throttling
 * @returns {Function} - Function with simulated CPU throttling
 */
function withCpuThrottling(fn) {
  return async (...args) => {
    // Get current device profile
    const deviceProfile = getCurrentDeviceProfile();
    
    // If no device profile is set, execute function normally
    if (!deviceProfile) {
      return fn(...args);
    }
    
    // Calculate throttling factor based on CPU speed
    const actualCpuSpeed = originalSystemInfo.cpuSpeed;
    const simulatedCpuSpeed = deviceProfile.cpu.speed;
    const throttlingFactor = actualCpuSpeed / simulatedCpuSpeed;
    
    // Execute function
    const startTime = performance.now();
    const result = await fn(...args);
    const endTime = performance.now();
    
    // Calculate execution time
    const executionTime = endTime - startTime;
    
    // Simulate throttling by adding delay
    const throttledTime = executionTime * throttlingFactor;
    const additionalDelay = Math.max(0, throttledTime - executionTime);
    
    if (additionalDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, additionalDelay));
    }
    
    return result;
  };
}

/**
 * Simulate memory constraints
 * 
 * @param {Function} fn - Function to execute with simulated memory constraints
 * @returns {Function} - Function with simulated memory constraints
 */
function withMemoryConstraints(fn) {
  return async (...args) => {
    // Get current device profile
    const deviceProfile = getCurrentDeviceProfile();
    
    // If no device profile is set, execute function normally
    if (!deviceProfile) {
      return fn(...args);
    }
    
    // Calculate memory factor
    const actualMemory = originalSystemInfo.totalMemoryMB;
    const simulatedMemory = deviceProfile.memory.total / (1024 * 1024);
    const memoryFactor = simulatedMemory / actualMemory;
    
    // Check if we're exceeding simulated memory
    const currentMemoryUsage = process.memoryUsage().rss / (1024 * 1024);
    if (currentMemoryUsage > simulatedMemory * 0.9) {
      throw new Error('Simulated memory limit exceeded');
    }
    
    // Execute function
    return fn(...args);
  };
}

/**
 * Apply all simulations to a function
 * 
 * @param {Function} fn - Function to simulate
 * @returns {Function} - Function with all simulations applied
 */
function withSimulation(fn) {
  return withNetworkLatency(withCpuThrottling(withMemoryConstraints(fn)));
}

module.exports = {
  initialize,
  simulateDevice,
  simulateNetwork,
  getCurrentDeviceProfile,
  getCurrentNetworkCondition,
  resetSimulation,
  withNetworkLatency,
  withCpuThrottling,
  withMemoryConstraints,
  withSimulation,
  DEVICE_PROFILES,
  NETWORK_CONDITIONS
};
