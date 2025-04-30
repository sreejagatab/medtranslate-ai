/**
 * Network Connectivity Monitor for MedTranslate AI Edge Application
 *
 * This module provides functions for monitoring network connectivity,
 * detecting offline mode, and automatically reconnecting to the cloud.
 */

const dns = require('dns');
const os = require('os');
const { EventEmitter } = require('events');
const axios = require('axios');

// Configuration
const CHECK_INTERVAL = parseInt(process.env.NETWORK_CHECK_INTERVAL || '10000'); // 10 seconds
const RECONNECT_INTERVAL = parseInt(process.env.NETWORK_RECONNECT_INTERVAL || '30000'); // 30 seconds
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://api.medtranslate.ai';
const DNS_SERVERS = ['8.8.8.8', '1.1.1.1']; // Google DNS and Cloudflare DNS
const CONNECTIVITY_TIMEOUT = parseInt(process.env.CONNECTIVITY_TIMEOUT || '5000'); // 5 seconds

// Network status
let isOnline = false;
let lastOnlineTime = 0;
let lastOfflineTime = 0;
let checkInterval = null;
let reconnectInterval = null;
let networkInterfaces = [];
let dnsServers = [];
let connectionAttempts = 0;
let maxConnectionAttempts = parseInt(process.env.MAX_CONNECTION_ATTEMPTS || '5');

// Create event emitter
const networkEvents = new EventEmitter();

/**
 * Initialize the network monitor
 *
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize() {
  try {
    console.log('Initializing network connectivity monitor...');

    // Get network interfaces
    networkInterfaces = getNetworkInterfaces();
    console.log(`Found ${networkInterfaces.length} network interfaces`);

    // Get DNS servers
    dnsServers = getDnsServers();
    console.log(`Using DNS servers: ${dnsServers.join(', ')}`);

    // Check initial connectivity
    const initialStatus = await checkConnectivity();
    isOnline = initialStatus.online;

    if (isOnline) {
      lastOnlineTime = Date.now();
      console.log('Initial network status: Online');
      networkEvents.emit('online', { timestamp: lastOnlineTime });
    } else {
      lastOfflineTime = Date.now();
      console.log('Initial network status: Offline');
      networkEvents.emit('offline', { timestamp: lastOfflineTime, reason: initialStatus.reason });
    }

    // Start periodic connectivity checks
    if (checkInterval) {
      clearInterval(checkInterval);
    }

    checkInterval = setInterval(async () => {
      const status = await checkConnectivity();

      // If status changed, emit event
      if (status.online !== isOnline) {
        if (status.online) {
          // Transition from offline to online
          isOnline = true;
          lastOnlineTime = Date.now();
          connectionAttempts = 0;
          console.log('Network status changed: Online');
          networkEvents.emit('online', { timestamp: lastOnlineTime });

          // Clear reconnect interval if it exists
          if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
          }
        } else {
          // Transition from online to offline
          isOnline = false;
          lastOfflineTime = Date.now();
          console.log(`Network status changed: Offline (${status.reason})`);
          networkEvents.emit('offline', { timestamp: lastOfflineTime, reason: status.reason });

          // Start reconnect interval
          startReconnectInterval();
        }
      }
    }, CHECK_INTERVAL);

    return { success: true };
  } catch (error) {
    console.error('Error initializing network monitor:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Start reconnect interval
 */
function startReconnectInterval() {
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
  }

  reconnectInterval = setInterval(async () => {
    if (isOnline) {
      // If we're already online, clear the interval
      clearInterval(reconnectInterval);
      reconnectInterval = null;
      return;
    }

    connectionAttempts++;
    console.log(`Attempting to reconnect (${connectionAttempts}/${maxConnectionAttempts})...`);

    const status = await checkConnectivity();
    if (status.online) {
      isOnline = true;
      lastOnlineTime = Date.now();
      connectionAttempts = 0;
      console.log('Successfully reconnected to network');
      networkEvents.emit('online', { timestamp: lastOnlineTime });

      // Clear reconnect interval
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    } else if (connectionAttempts >= maxConnectionAttempts) {
      // If we've reached max attempts, increase the interval
      console.log('Max reconnection attempts reached, increasing interval');
      clearInterval(reconnectInterval);
      reconnectInterval = setInterval(async () => {
        const status = await checkConnectivity();
        if (status.online) {
          isOnline = true;
          lastOnlineTime = Date.now();
          connectionAttempts = 0;
          console.log('Successfully reconnected to network');
          networkEvents.emit('online', { timestamp: lastOnlineTime });

          // Clear reconnect interval
          clearInterval(reconnectInterval);
          reconnectInterval = null;
        }
      }, RECONNECT_INTERVAL * 2);
    }
  }, RECONNECT_INTERVAL);
}

/**
 * Check network connectivity
 *
 * @returns {Promise<Object>} - Connectivity status
 */
async function checkConnectivity() {
  try {
    // Check if we have network interfaces
    if (networkInterfaces.length === 0) {
      return { online: false, reason: 'no_network_interfaces' };
    }

    // Check DNS resolution
    const dnsResult = await checkDnsResolution();
    if (!dnsResult.success) {
      return { online: false, reason: 'dns_resolution_failed' };
    }

    // Check cloud API connectivity
    const apiResult = await checkCloudApiConnectivity();
    if (!apiResult.success) {
      return { online: false, reason: 'cloud_api_unreachable' };
    }

    return { online: true };
  } catch (error) {
    console.error('Error checking connectivity:', error);
    return { online: false, reason: 'connectivity_check_error' };
  }
}

/**
 * Check DNS resolution
 *
 * @returns {Promise<Object>} - DNS resolution result
 */
async function checkDnsResolution() {
  return new Promise((resolve) => {
    dns.resolve('www.google.com', (err) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
}

/**
 * Check cloud API connectivity
 *
 * @returns {Promise<Object>} - Cloud API connectivity result
 */
async function checkCloudApiConnectivity() {
  try {
    const response = await axios.get(`${CLOUD_API_URL}/health`, {
      timeout: CONNECTIVITY_TIMEOUT
    });

    if (response.status === 200) {
      return { success: true };
    } else {
      return { success: false, status: response.status };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get network interfaces
 *
 * @returns {Array} - Network interfaces
 */
function getNetworkInterfaces() {
  const interfaces = [];
  const networkInterfaces = os.networkInterfaces();

  for (const [name, netInterface] of Object.entries(networkInterfaces)) {
    for (const iface of netInterface) {
      // Skip internal interfaces
      if (!iface.internal) {
        interfaces.push({
          name,
          address: iface.address,
          family: iface.family,
          mac: iface.mac
        });
      }
    }
  }

  return interfaces;
}

/**
 * Get DNS servers
 *
 * @returns {Array} - DNS servers
 */
function getDnsServers() {
  // Try to get system DNS servers
  try {
    const servers = dns.getServers();
    if (servers && servers.length > 0) {
      return servers;
    }
  } catch (error) {
    console.warn('Error getting DNS servers:', error);
  }

  // Fall back to default DNS servers
  return DNS_SERVERS;
}

/**
 * Get network status
 *
 * @returns {Object} - Network status
 */
function getNetworkStatus() {
  return {
    online: isOnline,
    lastOnlineTime,
    lastOfflineTime,
    connectionAttempts,
    networkInterfaces: networkInterfaces.length,
    reconnecting: reconnectInterval !== null
  };
}

/**
 * Register event listener
 *
 * @param {string} event - Event name ('online' or 'offline')
 * @param {Function} listener - Event listener
 */
function on(event, listener) {
  networkEvents.on(event, listener);
}

/**
 * Remove event listener
 *
 * @param {string} event - Event name ('online' or 'offline')
 * @param {Function} listener - Event listener
 */
function off(event, listener) {
  networkEvents.off(event, listener);
}

/**
 * Simulate offline/online status (for testing purposes)
 *
 * @param {boolean} offline - Whether to simulate offline status
 * @returns {Object} - Current network status
 */
function simulateOffline(offline) {
  if (offline) {
    if (isOnline) {
      isOnline = false;
      lastOfflineTime = Date.now();
      connectionAttempts++;

      // Emit offline event
      networkEvents.emit('offline', { timestamp: lastOfflineTime, reason: 'simulated' });

      console.log('Network monitor: Simulated offline mode');
    }
  } else {
    if (!isOnline) {
      isOnline = true;
      lastOnlineTime = Date.now();

      // Emit online event
      networkEvents.emit('online', { timestamp: lastOnlineTime });

      console.log('Network monitor: Simulated online mode');
    }
  }

  return getNetworkStatus();
}

// Export network monitor
const networkMonitor = {
  initialize,
  checkConnectivity,
  getNetworkStatus,
  on,
  off,
  simulateOffline
};

module.exports = networkMonitor;
