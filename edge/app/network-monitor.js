/**
 * Enhanced Network Connectivity Monitor for MedTranslate AI Edge Application
 *
 * This module provides advanced functions for monitoring network connectivity,
 * detecting offline mode, predicting connectivity issues, and automatically
 * reconnecting to the cloud with intelligent backoff strategies.
 */

const dns = require('dns');
const os = require('os');
const { EventEmitter } = require('events');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CHECK_INTERVAL = parseInt(process.env.NETWORK_CHECK_INTERVAL || '10000'); // 10 seconds
const RECONNECT_INTERVAL = parseInt(process.env.NETWORK_RECONNECT_INTERVAL || '30000'); // 30 seconds
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://api.medtranslate.ai';
const DNS_SERVERS = ['8.8.8.8', '1.1.1.1']; // Google DNS and Cloudflare DNS
const CONNECTIVITY_TIMEOUT = parseInt(process.env.CONNECTIVITY_TIMEOUT || '5000'); // 5 seconds
const QUALITY_CHECK_INTERVAL = parseInt(process.env.QUALITY_CHECK_INTERVAL || '60000'); // 1 minute
const NETWORK_HISTORY_FILE = process.env.NETWORK_HISTORY_FILE || path.join(__dirname, '../../cache/network_history.json');
const NETWORK_HISTORY_MAX_ENTRIES = parseInt(process.env.NETWORK_HISTORY_MAX_ENTRIES || '1000');
const ADAPTIVE_CHECK_INTERVAL = process.env.ADAPTIVE_CHECK_INTERVAL !== 'false'; // Enable adaptive check intervals
const MIN_CHECK_INTERVAL = parseInt(process.env.MIN_CHECK_INTERVAL || '5000'); // 5 seconds
const MAX_CHECK_INTERVAL = parseInt(process.env.MAX_CHECK_INTERVAL || '300000'); // 5 minutes
const QUALITY_THRESHOLD_POOR = parseFloat(process.env.QUALITY_THRESHOLD_POOR || '0.3'); // 30% quality
const QUALITY_THRESHOLD_FAIR = parseFloat(process.env.QUALITY_THRESHOLD_FAIR || '0.6'); // 60% quality
const QUALITY_THRESHOLD_GOOD = parseFloat(process.env.QUALITY_THRESHOLD_GOOD || '0.8'); // 80% quality

// Network status
let isOnline = false;
let networkQuality = 1.0; // 0.0 to 1.0 (0 = worst, 1 = best)
let lastOnlineTime = 0;
let lastOfflineTime = 0;
let checkInterval = null;
let reconnectInterval = null;
let qualityCheckInterval = null;
let networkInterfaces = [];
let dnsServers = [];
let connectionAttempts = 0;
let maxConnectionAttempts = parseInt(process.env.MAX_CONNECTION_ATTEMPTS || '5');
let currentCheckInterval = CHECK_INTERVAL;
let networkHistory = [];
let lastLatencyMeasurements = [];
let lastPacketLossMeasurements = [];
let lastDnsResolutionTimes = [];
let predictedOfflinePeriods = [];

// Create event emitter
const networkEvents = new EventEmitter();

/**
 * Initialize the network monitor with enhanced capabilities
 *
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize() {
  try {
    console.log('Initializing enhanced network connectivity monitor...');

    // Load network history if available
    await loadNetworkHistory();

    // Get network interfaces
    networkInterfaces = getNetworkInterfaces();
    console.log(`Found ${networkInterfaces.length} network interfaces`);

    // Get DNS servers
    dnsServers = getDnsServers();
    console.log(`Using DNS servers: ${dnsServers.join(', ')}`);

    // Check initial connectivity with quality assessment
    const initialStatus = await checkConnectivity(true);
    isOnline = initialStatus.online;

    if (initialStatus.quality !== undefined) {
      networkQuality = initialStatus.quality;
      console.log(`Initial network quality: ${(networkQuality * 100).toFixed(1)}%`);
    }

    if (isOnline) {
      lastOnlineTime = Date.now();
      console.log('Initial network status: Online');
      networkEvents.emit('online', {
        timestamp: lastOnlineTime,
        quality: networkQuality,
        interfaces: networkInterfaces.length
      });
    } else {
      lastOfflineTime = Date.now();
      console.log(`Initial network status: Offline (${initialStatus.reason})`);
      networkEvents.emit('offline', {
        timestamp: lastOfflineTime,
        reason: initialStatus.reason,
        interfaces: networkInterfaces.length
      });
    }

    // Start periodic connectivity checks with adaptive interval
    if (checkInterval) {
      clearInterval(checkInterval);
    }

    // Use a function for the check instead of an interval to allow adaptive timing
    const scheduleNextCheck = (delay) => {
      return setTimeout(async () => {
        try {
          const status = await checkConnectivity();

          // Record network status in history
          recordNetworkStatus(status);

          // If quality changed significantly, emit event
          if (status.quality !== undefined && Math.abs(status.quality - networkQuality) > 0.2) {
            const previousQuality = networkQuality;
            networkQuality = status.quality;

            console.log(`Network quality changed: ${(previousQuality * 100).toFixed(1)}% -> ${(networkQuality * 100).toFixed(1)}%`);

            networkEvents.emit('quality_change', {
              timestamp: Date.now(),
              previousQuality,
              newQuality: networkQuality,
              online: isOnline
            });
          } else if (status.quality !== undefined) {
            // Update quality even if change is small
            networkQuality = status.quality;
          }

          // If status changed, emit event
          if (status.online !== isOnline) {
            if (status.online) {
              // Transition from offline to online
              isOnline = true;
              lastOnlineTime = Date.now();
              connectionAttempts = 0;

              console.log(`Network status changed: Online (Quality: ${(networkQuality * 100).toFixed(1)}%)`);

              networkEvents.emit('online', {
                timestamp: lastOnlineTime,
                quality: networkQuality,
                offlineDuration: lastOnlineTime - lastOfflineTime,
                interfaces: networkInterfaces.length
              });

              // Clear reconnect interval if it exists
              if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
              }

              // Save network history after coming back online
              await saveNetworkHistory();
            } else {
              // Transition from online to offline
              isOnline = false;
              lastOfflineTime = Date.now();

              console.log(`Network status changed: Offline (${status.reason})`);

              networkEvents.emit('offline', {
                timestamp: lastOfflineTime,
                reason: status.reason,
                onlineDuration: lastOfflineTime - lastOnlineTime,
                interfaces: networkInterfaces.length
              });

              // Start reconnect interval with exponential backoff
              startReconnectInterval();

              // Save network history after going offline
              await saveNetworkHistory();
            }
          }

          // Adjust check interval based on network quality if adaptive intervals are enabled
          if (ADAPTIVE_CHECK_INTERVAL) {
            if (!isOnline) {
              // When offline, check more frequently
              currentCheckInterval = Math.max(MIN_CHECK_INTERVAL, CHECK_INTERVAL / 2);
            } else if (networkQuality < QUALITY_THRESHOLD_POOR) {
              // Poor quality, check more frequently
              currentCheckInterval = Math.max(MIN_CHECK_INTERVAL, CHECK_INTERVAL / 1.5);
            } else if (networkQuality < QUALITY_THRESHOLD_FAIR) {
              // Fair quality, use standard interval
              currentCheckInterval = CHECK_INTERVAL;
            } else if (networkQuality < QUALITY_THRESHOLD_GOOD) {
              // Good quality, check less frequently
              currentCheckInterval = Math.min(MAX_CHECK_INTERVAL, CHECK_INTERVAL * 1.5);
            } else {
              // Excellent quality, check even less frequently
              currentCheckInterval = Math.min(MAX_CHECK_INTERVAL, CHECK_INTERVAL * 2);
            }
          } else {
            // Use fixed interval if adaptive is disabled
            currentCheckInterval = CHECK_INTERVAL;
          }

          // Schedule next check
          checkInterval = scheduleNextCheck(currentCheckInterval);
        } catch (error) {
          console.error('Error in network check:', error);
          // Schedule next check even if there was an error
          checkInterval = scheduleNextCheck(CHECK_INTERVAL);
        }
      }, delay);
    };

    // Start the first check
    checkInterval = scheduleNextCheck(currentCheckInterval);

    // Start periodic quality checks
    if (qualityCheckInterval) {
      clearInterval(qualityCheckInterval);
    }

    qualityCheckInterval = setInterval(async () => {
      if (isOnline) {
        try {
          // Perform detailed quality assessment
          const qualityResult = await assessNetworkQuality();

          if (qualityResult.success) {
            // Update quality metrics
            networkQuality = qualityResult.overallQuality;

            // Add to measurement history
            if (qualityResult.latency !== undefined) {
              lastLatencyMeasurements.push(qualityResult.latency);
              // Keep only the last 10 measurements
              if (lastLatencyMeasurements.length > 10) {
                lastLatencyMeasurements.shift();
              }
            }

            if (qualityResult.packetLoss !== undefined) {
              lastPacketLossMeasurements.push(qualityResult.packetLoss);
              // Keep only the last 10 measurements
              if (lastPacketLossMeasurements.length > 10) {
                lastPacketLossMeasurements.shift();
              }
            }

            if (qualityResult.dnsResolutionTime !== undefined) {
              lastDnsResolutionTimes.push(qualityResult.dnsResolutionTime);
              // Keep only the last 10 measurements
              if (lastDnsResolutionTimes.length > 10) {
                lastDnsResolutionTimes.shift();
              }
            }

            // Emit quality update event
            networkEvents.emit('quality_update', {
              timestamp: Date.now(),
              quality: networkQuality,
              metrics: {
                latency: qualityResult.latency,
                packetLoss: qualityResult.packetLoss,
                dnsResolutionTime: qualityResult.dnsResolutionTime,
                bandwidthMbps: qualityResult.bandwidthMbps
              }
            });

            // Update network history
            recordNetworkQuality(qualityResult);

            // Periodically save network history
            if (networkHistory.length % 10 === 0) {
              await saveNetworkHistory();
            }
          }
        } catch (error) {
          console.error('Error in network quality assessment:', error);
        }
      }
    }, QUALITY_CHECK_INTERVAL);

    // Analyze network history and predict offline periods
    analyzePastNetworkPatterns();

    return {
      success: true,
      online: isOnline,
      quality: networkQuality,
      interfaces: networkInterfaces.length,
      historyEntries: networkHistory.length
    };
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
 * Check network connectivity with enhanced quality assessment
 *
 * @param {boolean} detailed - Whether to perform detailed quality assessment
 * @returns {Promise<Object>} - Connectivity status with quality metrics
 */
async function checkConnectivity(detailed = false) {
  try {
    // Check if we have network interfaces
    if (networkInterfaces.length === 0) {
      return { online: false, reason: 'no_network_interfaces', quality: 0 };
    }

    // Start timing for overall check
    const checkStartTime = Date.now();

    // Check DNS resolution with timing
    const dnsResult = await checkDnsResolution();
    if (!dnsResult.success) {
      return {
        online: false,
        reason: 'dns_resolution_failed',
        quality: 0,
        dnsResolutionTime: dnsResult.time
      };
    }

    // Check cloud API connectivity with timing
    const apiResult = await checkCloudApiConnectivity();
    if (!apiResult.success) {
      // If DNS works but API doesn't, we have partial connectivity
      return {
        online: false,
        reason: 'cloud_api_unreachable',
        quality: 0.1, // Very low quality but not zero
        dnsResolutionTime: dnsResult.time,
        apiResponseTime: apiResult.time
      };
    }

    // Calculate basic quality score based on response times
    let qualityScore = 1.0;

    // Adjust quality based on DNS resolution time (>500ms is poor)
    if (dnsResult.time > 500) {
      qualityScore *= 0.8;
    } else if (dnsResult.time > 200) {
      qualityScore *= 0.9;
    }

    // Adjust quality based on API response time (>1000ms is poor)
    if (apiResult.time > 1000) {
      qualityScore *= 0.7;
    } else if (apiResult.time > 500) {
      qualityScore *= 0.85;
    }

    // If detailed assessment is requested, perform additional checks
    if (detailed) {
      try {
        const detailedQuality = await assessNetworkQuality();
        if (detailedQuality.success) {
          // Use the detailed quality assessment
          qualityScore = detailedQuality.overallQuality;

          return {
            online: true,
            quality: qualityScore,
            dnsResolutionTime: dnsResult.time,
            apiResponseTime: apiResult.time,
            checkTime: Date.now() - checkStartTime,
            latency: detailedQuality.latency,
            packetLoss: detailedQuality.packetLoss,
            bandwidthMbps: detailedQuality.bandwidthMbps,
            detailed: true
          };
        }
      } catch (error) {
        console.warn('Error in detailed quality assessment:', error);
        // Continue with basic assessment if detailed fails
      }
    }

    return {
      online: true,
      quality: qualityScore,
      dnsResolutionTime: dnsResult.time,
      apiResponseTime: apiResult.time,
      checkTime: Date.now() - checkStartTime
    };
  } catch (error) {
    console.error('Error checking connectivity:', error);
    return {
      online: false,
      reason: 'connectivity_check_error',
      quality: 0,
      error: error.message
    };
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

    // Set a timeout in case DNS resolution hangs
    setTimeout(() => {
      if (resolvedCount === 0) {
        resolve({
          success: false,
          time: Date.now() - startTime,
          error: 'DNS resolution timeout',
          timeout: true
        });
      }
    }, CONNECTIVITY_TIMEOUT);
  });
}

/**
 * Check cloud API connectivity with timing and detailed metrics
 *
 * @returns {Promise<Object>} - Cloud API connectivity result with timing
 */
async function checkCloudApiConnectivity() {
  try {
    const startTime = Date.now();

    // Make the request with timeout
    const response = await axios.get(`${CLOUD_API_URL}/health`, {
      timeout: CONNECTIVITY_TIMEOUT,
      validateStatus: null // Don't throw on non-2xx status codes
    });

    const time = Date.now() - startTime;

    // Check for server response header if available
    const serverTime = response.headers && response.headers['x-response-time']
      ? parseInt(response.headers['x-response-time'])
      : null;

    // Calculate network latency if server time is available
    const networkLatency = serverTime !== null ? time - serverTime : null;

    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        time,
        status: response.status,
        serverTime,
        networkLatency,
        headers: response.headers
      };
    } else {
      return {
        success: false,
        time,
        status: response.status,
        serverTime,
        networkLatency,
        headers: response.headers
      };
    }
  } catch (error) {
    // Calculate time even for errors
    const time = Date.now() - (error.config && error.config.timestamp ? error.config.timestamp : Date.now() - CONNECTIVITY_TIMEOUT);

    return {
      success: false,
      time,
      error: error.message,
      code: error.code,
      isTimeout: error.code === 'ECONNABORTED'
    };
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

/**
 * Assess network quality with detailed metrics
 *
 * @returns {Promise<Object>} - Network quality assessment
 */
async function assessNetworkQuality() {
  try {
    const startTime = Date.now();
    const results = {
      success: false,
      tests: [],
      startTime,
      endTime: 0,
      overallQuality: 0
    };

    // Test 1: Latency test (ping)
    try {
      const pingResult = await measureLatency();
      results.tests.push({
        name: 'latency',
        success: pingResult.success,
        value: pingResult.latency,
        quality: calculateLatencyQuality(pingResult.latency)
      });

      results.latency = pingResult.latency;
    } catch (error) {
      results.tests.push({
        name: 'latency',
        success: false,
        error: error.message,
        quality: 0
      });
    }

    // Test 2: Packet loss test
    try {
      const packetLossResult = await measurePacketLoss();
      results.tests.push({
        name: 'packet_loss',
        success: packetLossResult.success,
        value: packetLossResult.packetLoss,
        quality: calculatePacketLossQuality(packetLossResult.packetLoss)
      });

      results.packetLoss = packetLossResult.packetLoss;
    } catch (error) {
      results.tests.push({
        name: 'packet_loss',
        success: false,
        error: error.message,
        quality: 0
      });
    }

    // Test 3: DNS resolution time
    try {
      const dnsResult = await checkDnsResolution();
      results.tests.push({
        name: 'dns_resolution',
        success: dnsResult.success,
        value: dnsResult.time,
        quality: calculateDnsQuality(dnsResult.time)
      });

      results.dnsResolutionTime = dnsResult.time;
    } catch (error) {
      results.tests.push({
        name: 'dns_resolution',
        success: false,
        error: error.message,
        quality: 0
      });
    }

    // Test 4: Bandwidth test (simplified)
    try {
      const bandwidthResult = await estimateBandwidth();
      results.tests.push({
        name: 'bandwidth',
        success: bandwidthResult.success,
        value: bandwidthResult.bandwidthMbps,
        quality: calculateBandwidthQuality(bandwidthResult.bandwidthMbps)
      });

      results.bandwidthMbps = bandwidthResult.bandwidthMbps;
    } catch (error) {
      results.tests.push({
        name: 'bandwidth',
        success: false,
        error: error.message,
        quality: 0
      });
    }

    // Calculate overall quality (weighted average)
    const weights = {
      latency: 0.35,
      packet_loss: 0.25,
      dns_resolution: 0.2,
      bandwidth: 0.2
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const test of results.tests) {
      if (test.success) {
        weightedSum += test.quality * weights[test.name];
        totalWeight += weights[test.name];
      }
    }

    // If we have at least some successful tests
    if (totalWeight > 0) {
      results.overallQuality = weightedSum / totalWeight;
      results.success = true;
    } else {
      // Default to a low but non-zero quality if all tests failed
      results.overallQuality = 0.1;
      results.success = false;
    }

    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;

    return results;
  } catch (error) {
    console.error('Error assessing network quality:', error);
    return {
      success: false,
      error: error.message,
      overallQuality: 0.1 // Default to low quality
    };
  }
}

/**
 * Measure network latency
 *
 * @returns {Promise<Object>} - Latency measurement
 */
async function measureLatency() {
  try {
    const samples = 3;
    const results = [];

    // Perform multiple measurements to get a more accurate result
    for (let i = 0; i < samples; i++) {
      const startTime = Date.now();

      // Use the cloud API health endpoint for latency measurement
      const response = await axios.get(`${CLOUD_API_URL}/health`, {
        timeout: CONNECTIVITY_TIMEOUT
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      results.push(latency);

      // Small delay between measurements
      if (i < samples - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Calculate median latency (more robust than mean)
    results.sort((a, b) => a - b);
    const medianLatency = results[Math.floor(results.length / 2)];

    return {
      success: true,
      latency: medianLatency,
      samples: results
    };
  } catch (error) {
    console.error('Error measuring latency:', error);
    return {
      success: false,
      error: error.message,
      latency: 1000 // Default high latency
    };
  }
}

/**
 * Measure packet loss
 *
 * @returns {Promise<Object>} - Packet loss measurement
 */
async function measurePacketLoss() {
  try {
    const samples = 5;
    let successCount = 0;

    // Perform multiple requests to estimate packet loss
    for (let i = 0; i < samples; i++) {
      try {
        await axios.get(`${CLOUD_API_URL}/health`, {
          timeout: CONNECTIVITY_TIMEOUT / 2 // Shorter timeout for packet loss test
        });

        successCount++;
      } catch (error) {
        // Count as packet loss
      }

      // Small delay between measurements
      if (i < samples - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const packetLoss = 1 - (successCount / samples);

    return {
      success: true,
      packetLoss,
      successCount,
      totalSamples: samples
    };
  } catch (error) {
    console.error('Error measuring packet loss:', error);
    return {
      success: false,
      error: error.message,
      packetLoss: 0.5 // Default to 50% packet loss
    };
  }
}

/**
 * Estimate bandwidth
 *
 * @returns {Promise<Object>} - Bandwidth estimation
 */
async function estimateBandwidth() {
  try {
    const startTime = Date.now();

    // Download a small file to estimate bandwidth
    // In a real implementation, you would download a larger file
    // or use a proper bandwidth testing service
    const response = await axios.get(`${CLOUD_API_URL}/test-file`, {
      timeout: CONNECTIVITY_TIMEOUT * 2
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // in seconds

    // Get file size from headers or response data length
    const contentLength = response.headers['content-length']
      ? parseInt(response.headers['content-length'])
      : response.data.length;

    // Calculate bandwidth in Mbps
    const fileSizeInBits = contentLength * 8;
    const bandwidthMbps = (fileSizeInBits / 1000000) / duration;

    return {
      success: true,
      bandwidthMbps,
      fileSizeBytes: contentLength,
      durationSeconds: duration
    };
  } catch (error) {
    console.error('Error estimating bandwidth:', error);

    // Try to estimate bandwidth from recent history if available
    if (networkHistory.length > 0) {
      const recentEntries = networkHistory
        .filter(entry => entry.bandwidthMbps)
        .slice(-5);

      if (recentEntries.length > 0) {
        const avgBandwidth = recentEntries.reduce((sum, entry) => sum + entry.bandwidthMbps, 0) / recentEntries.length;

        return {
          success: true,
          bandwidthMbps: avgBandwidth,
          estimated: true,
          source: 'history'
        };
      }
    }

    // Default to a low bandwidth if estimation fails
    return {
      success: false,
      error: error.message,
      bandwidthMbps: 1.0 // Default to 1 Mbps
    };
  }
}

/**
 * Calculate latency quality score
 *
 * @param {number} latency - Latency in milliseconds
 * @returns {number} - Quality score (0-1)
 */
function calculateLatencyQuality(latency) {
  if (latency <= 50) {
    return 1.0; // Excellent
  } else if (latency <= 100) {
    return 0.9; // Very good
  } else if (latency <= 200) {
    return 0.8; // Good
  } else if (latency <= 300) {
    return 0.6; // Fair
  } else if (latency <= 500) {
    return 0.4; // Poor
  } else if (latency <= 1000) {
    return 0.2; // Very poor
  } else {
    return 0.1; // Terrible
  }
}

/**
 * Calculate packet loss quality score
 *
 * @param {number} packetLoss - Packet loss ratio (0-1)
 * @returns {number} - Quality score (0-1)
 */
function calculatePacketLossQuality(packetLoss) {
  if (packetLoss === 0) {
    return 1.0; // Excellent
  } else if (packetLoss <= 0.01) {
    return 0.9; // Very good (1% loss)
  } else if (packetLoss <= 0.03) {
    return 0.8; // Good (3% loss)
  } else if (packetLoss <= 0.05) {
    return 0.6; // Fair (5% loss)
  } else if (packetLoss <= 0.1) {
    return 0.4; // Poor (10% loss)
  } else if (packetLoss <= 0.2) {
    return 0.2; // Very poor (20% loss)
  } else {
    return 0.1; // Terrible (>20% loss)
  }
}

/**
 * Calculate DNS resolution quality score
 *
 * @param {number} dnsTime - DNS resolution time in milliseconds
 * @returns {number} - Quality score (0-1)
 */
function calculateDnsQuality(dnsTime) {
  if (dnsTime <= 20) {
    return 1.0; // Excellent
  } else if (dnsTime <= 50) {
    return 0.9; // Very good
  } else if (dnsTime <= 100) {
    return 0.8; // Good
  } else if (dnsTime <= 200) {
    return 0.6; // Fair
  } else if (dnsTime <= 500) {
    return 0.4; // Poor
  } else if (dnsTime <= 1000) {
    return 0.2; // Very poor
  } else {
    return 0.1; // Terrible
  }
}

/**
 * Calculate bandwidth quality score
 *
 * @param {number} bandwidthMbps - Bandwidth in Mbps
 * @returns {number} - Quality score (0-1)
 */
function calculateBandwidthQuality(bandwidthMbps) {
  if (bandwidthMbps >= 50) {
    return 1.0; // Excellent
  } else if (bandwidthMbps >= 25) {
    return 0.9; // Very good
  } else if (bandwidthMbps >= 10) {
    return 0.8; // Good
  } else if (bandwidthMbps >= 5) {
    return 0.6; // Fair
  } else if (bandwidthMbps >= 2) {
    return 0.4; // Poor
  } else if (bandwidthMbps >= 1) {
    return 0.2; // Very poor
  } else {
    return 0.1; // Terrible
  }
}

/**
 * Record network status in history
 *
 * @param {Object} status - Network status
 */
function recordNetworkStatus(status) {
  // Get location information if available
  let locationName = 'unknown';
  let connectionType = 'unknown';

  try {
    // In a real implementation, we would get this from the device
    // For now, we'll use mock data or environment variables
    locationName = process.env.LOCATION_NAME || 'office';
    connectionType = process.env.CONNECTION_TYPE ||
      (Math.random() > 0.5 ? 'wifi' : 'cellular');
  } catch (error) {
    console.warn('Error getting location information:', error);
  }

  // Create history entry with enhanced information
  const entry = {
    timestamp: Date.now(),
    online: status.online,
    quality: status.quality || null,
    dnsResolutionTime: status.dnsResolutionTime,
    apiResponseTime: status.apiResponseTime,
    reason: status.reason || null,
    locationName,
    connectionType,
    signalStrength: status.signalStrength || null
  };

  // Add to history
  networkHistory.push(entry);

  // Limit history size
  if (networkHistory.length > NETWORK_HISTORY_MAX_ENTRIES) {
    networkHistory.shift();
  }

  // Add to ML model if available
  try {
    if (global.modelAdapter && typeof global.modelAdapter.addNetworkSample === 'function') {
      global.modelAdapter.addNetworkSample(
        status.online,
        new Date(),
        {
          quality: status.quality,
          dnsResolutionTime: status.dnsResolutionTime,
          apiResponseTime: status.apiResponseTime,
          location: {
            locationName,
            connectionType
          },
          signalStrength: status.signalStrength
        }
      );
    }
  } catch (error) {
    console.warn('Error adding network sample to ML model:', error);
  }
}

/**
 * Record network quality in history
 *
 * @param {Object} quality - Network quality
 */
function recordNetworkQuality(quality) {
  // Get location information if available
  let locationName = 'unknown';
  let connectionType = 'unknown';

  try {
    // In a real implementation, we would get this from the device
    // For now, we'll use mock data or environment variables
    locationName = process.env.LOCATION_NAME || 'office';
    connectionType = process.env.CONNECTION_TYPE ||
      (Math.random() > 0.5 ? 'wifi' : 'cellular');
  } catch (error) {
    console.warn('Error getting location information:', error);
  }

  // Create history entry with enhanced information
  const entry = {
    timestamp: Date.now(),
    online: true,
    quality: quality.overallQuality,
    latency: quality.latency,
    packetLoss: quality.packetLoss,
    dnsResolutionTime: quality.dnsResolutionTime,
    bandwidthMbps: quality.bandwidthMbps,
    locationName,
    connectionType,
    signalStrength: quality.signalStrength || null
  };

  // Add to history
  networkHistory.push(entry);

  // Limit history size
  if (networkHistory.length > NETWORK_HISTORY_MAX_ENTRIES) {
    networkHistory.shift();
  }

  // Add to ML model if available
  try {
    if (global.modelAdapter && typeof global.modelAdapter.addNetworkSample === 'function') {
      global.modelAdapter.addNetworkSample(
        true, // online
        new Date(),
        {
          quality: quality.overallQuality,
          latency: quality.latency,
          packetLoss: quality.packetLoss,
          dnsResolutionTime: quality.dnsResolutionTime,
          bandwidthMbps: quality.bandwidthMbps,
          location: {
            locationName,
            connectionType
          },
          signalStrength: quality.signalStrength
        }
      );
    }
  } catch (error) {
    console.warn('Error adding network quality sample to ML model:', error);
  }
}

/**
 * Load network history from file
 *
 * @returns {Promise<boolean>} - Success indicator
 */
async function loadNetworkHistory() {
  try {
    // Check if history file exists
    if (fs.existsSync(NETWORK_HISTORY_FILE)) {
      // Read and parse history file
      const historyData = JSON.parse(fs.readFileSync(NETWORK_HISTORY_FILE, 'utf8'));

      if (Array.isArray(historyData)) {
        networkHistory = historyData;
        console.log(`Loaded network history with ${networkHistory.length} entries`);
        return true;
      }
    }

    console.log('No network history file found, starting with empty history');
    networkHistory = [];
    return false;
  } catch (error) {
    console.error('Error loading network history:', error);
    networkHistory = [];
    return false;
  }
}

/**
 * Save network history to file
 *
 * @returns {Promise<boolean>} - Success indicator
 */
async function saveNetworkHistory() {
  try {
    // Create directory if it doesn't exist
    const historyDir = path.dirname(NETWORK_HISTORY_FILE);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    // Write history to file
    fs.writeFileSync(NETWORK_HISTORY_FILE, JSON.stringify(networkHistory), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving network history:', error);
    return false;
  }
}

/**
 * Analyze past network patterns to predict offline periods
 *
 * @returns {Array} - Predicted offline periods
 */
function analyzePastNetworkPatterns() {
  try {
    // Need at least a day of history for meaningful analysis
    if (networkHistory.length < 100) {
      return [];
    }

    // Group entries by hour of day
    const hourlyPatterns = {};

    for (let i = 0; i < 24; i++) {
      hourlyPatterns[i] = {
        total: 0,
        offline: 0,
        poorQuality: 0
      };
    }

    // Analyze history
    for (const entry of networkHistory) {
      const date = new Date(entry.timestamp);
      const hour = date.getHours();

      hourlyPatterns[hour].total++;

      if (!entry.online) {
        hourlyPatterns[hour].offline++;
      } else if (entry.quality !== null && entry.quality < QUALITY_THRESHOLD_POOR) {
        hourlyPatterns[hour].poorQuality++;
      }
    }

    // Calculate offline probability for each hour
    const predictions = [];

    for (let hour = 0; hour < 24; hour++) {
      const pattern = hourlyPatterns[hour];

      if (pattern.total > 0) {
        const offlineProb = pattern.offline / pattern.total;
        const poorQualityProb = pattern.poorQuality / pattern.total;

        // If probability of offline or poor quality is high, add to predictions
        if (offlineProb > 0.3 || poorQualityProb > 0.5 || (offlineProb + poorQualityProb > 0.6)) {
          predictions.push({
            hour,
            offlineProbability: offlineProb,
            poorQualityProbability: poorQualityProb,
            samples: pattern.total
          });
        }
      }
    }

    // Sort by combined probability
    predictions.sort((a, b) => {
      const aCombined = a.offlineProbability + a.poorQualityProbability;
      const bCombined = b.offlineProbability + b.poorQualityProbability;
      return bCombined - aCombined;
    });

    predictedOfflinePeriods = predictions;

    if (predictions.length > 0) {
      console.log(`Predicted ${predictions.length} potential offline/poor quality periods`);
    }

    // Use ML model for enhanced prediction if available
    try {
      const { ModelAdapter } = require('./ml-models/model-adapter');

      // Initialize model adapter if not already done
      if (!global.modelAdapter) {
        global.modelAdapter = new ModelAdapter();
        global.modelAdapter.initialize();
      }

      // Feed network history data to the ML model
      for (const entry of networkHistory) {
        const isOnline = entry.online;
        const timestamp = new Date(entry.timestamp);

        // Prepare additional data for the model with enhanced information
        const additionalData = {
          quality: entry.quality,
          latency: entry.latency,
          packetLoss: entry.packetLoss,
          dnsResolutionTime: entry.dnsResolutionTime,
          bandwidthMbps: entry.bandwidthMbps,
          signalStrength: entry.signalStrength,
          location: {
            locationName: entry.locationName || 'unknown',
            connectionType: entry.connectionType || 'unknown'
          }
        };

        // Add sample to the model using the new method
        global.modelAdapter.addNetworkSample(isOnline, timestamp, additionalData);
      }

      // Get enhanced predictions for the next 24 hours using the new model
      const enhancedPredictions = [];
      const now = new Date();

      // Get current connection state
      const currentStatus = getNetworkStatus();
      const currentState = !currentStatus.online ? 'offline' :
                           (currentStatus.quality < 0.3 ? 'poor' :
                           (currentStatus.quality < 0.7 ? 'fair' : 'good'));

      for (let i = 0; i < 24; i++) {
        const predictionTime = new Date(now.getTime() + i * 60 * 60 * 1000);

        // Get connection issue prediction for this hour with enhanced options
        const prediction = global.modelAdapter.predictConnectionIssues(predictionTime, {
          lookAheadHours: 1,
          confidenceThreshold: 0.2,
          includeRecoverySuggestions: true,
          currentState
        });

        if (prediction.risk > 0.3) {
          const predictionObj = {
            hour: predictionTime.getHours(),
            timestamp: predictionTime,
            risk: prediction.risk,
            confidence: prediction.confidence,
            reason: prediction.reason,
            highRiskHours: prediction.highRiskHours,
            modelVersion: prediction.modelVersion || '1.0'
          };

          // Add additional information if available from enhanced model
          if (prediction.factors) {
            predictionObj.factors = prediction.factors;
          }

          // Add likely issue type if available
          if (prediction.likelyIssueType) {
            predictionObj.likelyIssueType = prediction.likelyIssueType;
          }

          // Add recovery suggestions if available
          if (prediction.recoverySuggestions && prediction.recoverySuggestions.length > 0) {
            predictionObj.recoverySuggestions = prediction.recoverySuggestions;
          }

          enhancedPredictions.push(predictionObj);
        }
      }

      // If we have enhanced predictions, use them
      if (enhancedPredictions.length > 0) {
        console.log(`ML model predicted ${enhancedPredictions.length} potential connection issue periods`);

        // Combine traditional and ML-based predictions
        const combinedPredictions = [...predictions];

        // Add ML predictions that aren't already covered
        for (const mlPrediction of enhancedPredictions) {
          const existingPrediction = combinedPredictions.find(p => p.hour === mlPrediction.hour);

          if (existingPrediction) {
            // Update existing prediction with ML data
            existingPrediction.mlRisk = mlPrediction.risk;
            existingPrediction.mlConfidence = mlPrediction.confidence;
            existingPrediction.combinedRisk = (existingPrediction.offlineProbability +
              existingPrediction.poorQualityProbability + mlPrediction.risk) / 3;

            // Add enhanced information if available
            if (mlPrediction.factors) {
              existingPrediction.factors = mlPrediction.factors;
            }

            if (mlPrediction.likelyIssueType) {
              existingPrediction.likelyIssueType = mlPrediction.likelyIssueType;
            }

            if (mlPrediction.recoverySuggestions) {
              existingPrediction.recoverySuggestions = mlPrediction.recoverySuggestions;
            }

            existingPrediction.modelVersion = mlPrediction.modelVersion || '1.0';
          } else {
            // Add new ML prediction with enhanced information
            const newPrediction = {
              hour: mlPrediction.hour,
              timestamp: mlPrediction.timestamp,
              mlRisk: mlPrediction.risk,
              mlConfidence: mlPrediction.confidence,
              offlineProbability: mlPrediction.risk * 0.5, // Estimate
              poorQualityProbability: mlPrediction.risk * 0.5, // Estimate
              combinedRisk: mlPrediction.risk,
              fromMlModel: true,
              modelVersion: mlPrediction.modelVersion || '1.0'
            };

            // Add enhanced information if available
            if (mlPrediction.factors) {
              newPrediction.factors = mlPrediction.factors;
            }

            if (mlPrediction.likelyIssueType) {
              newPrediction.likelyIssueType = mlPrediction.likelyIssueType;
            }

            if (mlPrediction.recoverySuggestions) {
              newPrediction.recoverySuggestions = mlPrediction.recoverySuggestions;
            }

            combinedPredictions.push(newPrediction);
          }
        }

        // Sort by combined risk
        combinedPredictions.sort((a, b) => {
          const aRisk = a.combinedRisk || (a.offlineProbability + a.poorQualityProbability);
          const bRisk = b.combinedRisk || (b.offlineProbability + b.poorQualityProbability);
          return bRisk - aRisk;
        });

        // Update predictions
        predictedOfflinePeriods = combinedPredictions;

        console.log(`Combined prediction identified ${combinedPredictions.length} potential connection issue periods`);
        return combinedPredictions;
      }
    } catch (error) {
      console.warn('Error using ML model for enhanced prediction:', error);
      // Fall back to traditional predictions
    }

    return predictions;
  } catch (error) {
    console.error('Error analyzing network patterns:', error);
    return [];
  }
}

/**
 * Get network quality
 *
 * @returns {number} - Network quality (0-1)
 */
function getNetworkQuality() {
  return networkQuality;
}

/**
 * Get predicted offline periods
 *
 * @returns {Array} - Predicted offline periods
 */
function getPredictedOfflinePeriods() {
  return predictedOfflinePeriods;
}

/**
 * Get network history
 *
 * @param {number} limit - Maximum number of entries to return
 * @returns {Array} - Network history
 */
function getNetworkHistory(limit = 100) {
  return networkHistory.slice(-limit);
}

/**
 * Get ML-based connection issue predictions with enhanced features
 *
 * @param {Object} options - Options for prediction
 * @returns {Object} - Connection issue predictions with enhanced information
 */
function getConnectionIssuePredictions(options = {}) {
  try {
    const {
      lookAheadHours = 24,
      location = null,
      connectionType = null,
      userId = 'default',
      includeRecoverySuggestions = true,
      riskThreshold = 0.2
    } = options;

    // Get current connection state
    const currentStatus = getNetworkStatus();
    const currentState = !currentStatus.online ? 'offline' :
                         (currentStatus.quality < 0.3 ? 'poor' :
                         (currentStatus.quality < 0.7 ? 'fair' : 'good'));

    // Use ML model for prediction if available
    try {
      let ModelAdapter;

      // Try to load the model adapter, but don't fail if it's not available
      try {
        ModelAdapter = require('./ml-models/model-adapter').ModelAdapter;
      } catch (loadError) {
        console.warn('ML model adapter not available:', loadError.message);
        // Fall back to traditional predictions
        throw new Error('ML model adapter not available');
      }

      // Initialize model adapter if not already done
      if (!global.modelAdapter) {
        try {
          global.modelAdapter = new ModelAdapter();
          global.modelAdapter.initialize();
        } catch (initError) {
          console.warn('Failed to initialize ML model adapter:', initError.message);
          // Fall back to traditional predictions
          throw new Error('Failed to initialize ML model adapter');
        }
      }

      // Get predictions for the specified period
      const predictions = [];
      const now = new Date();

      for (let i = 0; i < lookAheadHours; i++) {
        const predictionTime = new Date(now.getTime() + i * 60 * 60 * 1000);

        // Get connection issue prediction for this hour with enhanced options
        let prediction;
        try {
          prediction = global.modelAdapter.predictConnectionIssues(predictionTime, {
            location,
            connectionType,
            lookAheadHours: 1, // Just get one hour at a time
            confidenceThreshold: riskThreshold,
            userId,
            includeRecoverySuggestions,
            currentState
          });
        } catch (predictionError) {
          console.warn(`Error predicting connection issues for hour ${i}:`, predictionError.message);
          // Create a default prediction with low risk
          prediction = {
            risk: 0.1,
            confidence: 0.5,
            reason: 'prediction_error',
            modelType: 'fallback',
            modelVersion: '1.0'
          };
        }

        // Create prediction object with enhanced information
        const predictionObj = {
          hour: predictionTime.getHours(),
          timestamp: predictionTime,
          risk: prediction.risk,
          confidence: prediction.confidence,
          reason: prediction.reason,
          modelType: prediction.modelType || 'unknown',
          modelVersion: prediction.modelVersion || '1.0'
        };

        // Add additional information if available from enhanced model
        if (prediction.factors) {
          predictionObj.factors = prediction.factors;
        }

        if (prediction.highRiskHours) {
          predictionObj.highRiskHours = prediction.highRiskHours;
        }

        // Add user-specific information if available
        if (prediction.userSpecific) {
          predictionObj.userSpecific = true;
          predictionObj.userId = userId;
        }

        // Add likely issue type if available
        if (prediction.likelyIssueType) {
          predictionObj.likelyIssueType = prediction.likelyIssueType;
        }

        // Add recovery suggestions if available
        if (prediction.recoverySuggestions && prediction.recoverySuggestions.length > 0) {
          predictionObj.recoverySuggestions = prediction.recoverySuggestions;
        }

        // Add matching patterns if available
        if (prediction.matchingPatterns) {
          predictionObj.matchingPatterns = prediction.matchingPatterns;
        }

        predictions.push(predictionObj);
      }

      // Sort by risk (highest first)
      predictions.sort((a, b) => b.risk - a.risk);

      // Get model status with enhanced information
      let modelStatus = { useEnhancedConnectionPrediction: false };
      let modelTypes = {};
      let issueTypes = {};
      let recurringPatterns = [];

      // Only try to get model status if the adapter is available
      if (global.modelAdapter && typeof global.modelAdapter.getStatus === 'function') {
        try {
          modelStatus = global.modelAdapter.getStatus();

          // Count predictions by model type
          predictions.forEach(p => {
            modelTypes[p.modelType] = (modelTypes[p.modelType] || 0) + 1;
          });

          // Count predictions by issue type
          predictions.forEach(p => {
            if (p.likelyIssueType) {
              issueTypes[p.likelyIssueType] = (issueTypes[p.likelyIssueType] || 0) + 1;
            }
          });

          // Get recurring patterns if available
          if (modelStatus.enhancedModelStatus && modelStatus.enhancedModelStatus.recurringPatternCount > 0) {
            // In a real implementation, we would get the actual patterns from the model
            // For now, we'll just indicate that patterns exist
            recurringPatterns = [{
              type: 'info',
              message: `${modelStatus.enhancedModelStatus.recurringPatternCount} recurring patterns detected`
            }];
          }
        } catch (error) {
          console.warn('Error getting model status:', error);
        }
      }

      return {
        success: true,
        predictions,
        highRiskHours: predictions.filter(p => p.risk > 0.6).length,
        mediumRiskHours: predictions.filter(p => p.risk > 0.4 && p.risk <= 0.6).length,
        lowRiskHours: predictions.filter(p => p.risk > 0.2 && p.risk <= 0.4).length,
        modelConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
        modelTypes,
        issueTypes,
        useEnhancedModel: modelStatus.useEnhancedConnectionPrediction,
        enhancedModelStatus: modelStatus.enhancedModelStatus,
        userSpecific: userId !== 'default',
        userId: userId !== 'default' ? userId : undefined,
        recurringPatterns,
        adaptiveWeights: modelStatus.enhancedModelStatus ? modelStatus.enhancedModelStatus.adaptiveWeights : undefined,
        predictionTime: new Date().toISOString(),
        currentNetworkState: currentState,
        currentNetworkQuality: currentStatus.quality
      };
    } catch (error) {
      console.warn('Error using ML model for connection issue prediction:', error);

      // Fall back to traditional predictions
      const traditionalPredictions = getPredictedOfflinePeriods();

      return {
        success: true,
        predictions: traditionalPredictions.map(p => ({
          hour: p.hour,
          risk: p.offlineProbability + p.poorQualityProbability,
          offlineProbability: p.offlineProbability,
          poorQualityProbability: p.poorQualityProbability,
          samples: p.samples
        })),
        usingTraditionalModel: true,
        reason: 'ml_model_error',
        error: error.message
      };
    }
  } catch (error) {
    console.error('Error getting connection issue predictions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export network monitor
const networkMonitor = {
  initialize,
  checkConnectivity,
  getNetworkStatus,
  on,
  off,
  simulateOffline,
  getNetworkQuality,
  getPredictedOfflinePeriods,
  getNetworkHistory,
  assessNetworkQuality,
  getConnectionIssuePredictions // New ML-based prediction API
};

module.exports = networkMonitor;
