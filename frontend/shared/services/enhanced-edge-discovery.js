/**
 * Enhanced Edge Device Discovery Service for MedTranslate AI
 *
 * This service provides advanced edge device discovery capabilities:
 * - Network scanning to find edge devices automatically
 * - mDNS/Bonjour service discovery
 * - Device verification with health checks
 * - Persistent storage of discovered devices
 * - Prioritization of multiple edge devices
 * - Connection quality assessment
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as AnalyticsService from './analytics-service';

// Storage keys
const STORAGE_KEYS = {
  DISCOVERED_DEVICES: 'medtranslate_discovered_devices',
  PREFERRED_DEVICE: 'medtranslate_preferred_device',
  LAST_DISCOVERY: 'medtranslate_last_discovery',
  DISCOVERY_STATS: 'medtranslate_discovery_stats'
};

// Default settings
const DEFAULT_SETTINGS = {
  discoveryTimeout: 5000,
  healthCheckTimeout: 2000,
  maxRetries: 3,
  retryDelay: 1000,
  scanSubnet: true,
  useMdns: true,
  preferWired: true,
  minQualityThreshold: 0.5,
  discoveryInterval: 3600000, // 1 hour
  autoDiscovery: true
};

// Service state
let isInitialized = false;
let isDiscovering = false;
let discoveredDevices = [];
let preferredDevice = null;
let settings = { ...DEFAULT_SETTINGS };
let discoveryStats = {
  lastDiscovery: 0,
  totalDiscoveries: 0,
  successfulDiscoveries: 0,
  averageDevicesFound: 0,
  totalDevicesFound: 0,
  commonIpRanges: []
};

/**
 * Initialize the edge device discovery service
 * 
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} - Initialization result
 */
export const initialize = async (options = {}) => {
  try {
    if (isInitialized) {
      return {
        isInitialized,
        discoveredDevices,
        preferredDevice
      };
    }

    console.log('Initializing enhanced edge device discovery service...');

    // Merge options with defaults
    settings = { ...DEFAULT_SETTINGS, ...options };

    // Load discovered devices from storage
    const storedDevices = await AsyncStorage.getItem(STORAGE_KEYS.DISCOVERED_DEVICES);
    if (storedDevices) {
      discoveredDevices = JSON.parse(storedDevices);
      console.log(`Loaded ${discoveredDevices.length} previously discovered devices`);
    }

    // Load preferred device from storage
    const storedPreferredDevice = await AsyncStorage.getItem(STORAGE_KEYS.PREFERRED_DEVICE);
    if (storedPreferredDevice) {
      preferredDevice = JSON.parse(storedPreferredDevice);
      console.log(`Loaded preferred device: ${preferredDevice.name} (${preferredDevice.ipAddress})`);
    }

    // Load discovery stats from storage
    const storedStats = await AsyncStorage.getItem(STORAGE_KEYS.DISCOVERY_STATS);
    if (storedStats) {
      discoveryStats = { ...discoveryStats, ...JSON.parse(storedStats) };
    }

    // Check if we should run auto-discovery
    const lastDiscovery = await AsyncStorage.getItem(STORAGE_KEYS.LAST_DISCOVERY);
    const lastDiscoveryTime = lastDiscovery ? parseInt(lastDiscovery, 10) : 0;
    const timeSinceLastDiscovery = Date.now() - lastDiscoveryTime;

    if (settings.autoDiscovery && timeSinceLastDiscovery > settings.discoveryInterval) {
      // Run discovery in the background
      setTimeout(() => {
        discoverEdgeDevices({ background: true });
      }, 1000);
    }

    isInitialized = true;

    return {
      isInitialized,
      discoveredDevices,
      preferredDevice
    };
  } catch (error) {
    console.error('Error initializing edge device discovery service:', error);
    return {
      isInitialized: false,
      error: error.message
    };
  }
};

/**
 * Discover edge devices on the local network
 * 
 * @param {Object} options - Discovery options
 * @returns {Promise<Array>} - Discovered devices
 */
export const discoverEdgeDevices = async (options = {}) => {
  try {
    if (isDiscovering) {
      return {
        inProgress: true,
        discoveredDevices
      };
    }

    isDiscovering = true;

    // Track discovery start
    if (!options.background) {
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_discovery',
        'start',
        {
          manual: !options.background,
          previousDevices: discoveredDevices.length
        }
      );
    }

    console.log('Starting edge device discovery...');

    // Check network connectivity
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      console.log('Not connected to network, cannot discover edge devices');
      isDiscovering = false;
      return {
        success: false,
        reason: 'no_network',
        discoveredDevices
      };
    }

    // Only proceed with WiFi for subnet scanning
    if (settings.scanSubnet && networkState.type !== 'wifi') {
      console.log('Not on WiFi, skipping subnet scan');
      
      // We can still try direct connection to known devices
      const verifiedDevices = await verifyKnownDevices();
      
      isDiscovering = false;
      return {
        success: verifiedDevices.length > 0,
        reason: 'not_wifi',
        discoveredDevices: verifiedDevices
      };
    }

    // Start with a clean list if not merging
    if (!options.merge) {
      discoveredDevices = [];
    }

    // Combine discovery methods
    const newDevices = [];

    // 1. Try mDNS discovery if enabled
    if (settings.useMdns) {
      try {
        const mdnsDevices = await discoverViaMulticast();
        newDevices.push(...mdnsDevices);
      } catch (error) {
        console.error('Error during mDNS discovery:', error);
      }
    }

    // 2. Try subnet scanning if enabled
    if (settings.scanSubnet) {
      try {
        const subnetDevices = await scanSubnet(networkState);
        newDevices.push(...subnetDevices);
      } catch (error) {
        console.error('Error during subnet scan:', error);
      }
    }

    // 3. Try known devices
    try {
      const knownDevices = await verifyKnownDevices();
      
      // Only add known devices that weren't already found
      for (const device of knownDevices) {
        if (!newDevices.some(d => d.ipAddress === device.ipAddress)) {
          newDevices.push(device);
        }
      }
    } catch (error) {
      console.error('Error verifying known devices:', error);
    }

    // Remove duplicates
    const uniqueDevices = removeDuplicateDevices(newDevices);

    // Sort by quality
    uniqueDevices.sort((a, b) => b.quality - a.quality);

    // Update discovered devices
    discoveredDevices = uniqueDevices;

    // Update preferred device if needed
    if (discoveredDevices.length > 0 && (!preferredDevice || !discoveredDevices.some(d => d.ipAddress === preferredDevice.ipAddress))) {
      preferredDevice = discoveredDevices[0];
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_DEVICE, JSON.stringify(preferredDevice));
    }

    // Save discovered devices
    await AsyncStorage.setItem(STORAGE_KEYS.DISCOVERED_DEVICES, JSON.stringify(discoveredDevices));
    
    // Update last discovery time
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_DISCOVERY, Date.now().toString());

    // Update discovery stats
    updateDiscoveryStats(discoveredDevices);

    // Track discovery completion
    if (!options.background) {
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_discovery',
        'complete',
        {
          manual: !options.background,
          devicesFound: discoveredDevices.length,
          methods: {
            mdns: settings.useMdns,
            subnet: settings.scanSubnet,
            known: true
          }
        }
      );
    }

    console.log(`Edge device discovery complete. Found ${discoveredDevices.length} devices.`);
    isDiscovering = false;

    return {
      success: discoveredDevices.length > 0,
      discoveredDevices
    };
  } catch (error) {
    console.error('Error discovering edge devices:', error);
    
    // Track discovery error
    if (!options.background) {
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.ERROR,
        'edge_discovery',
        'error',
        {
          error: error.message,
          manual: !options.background
        }
      );
    }
    
    isDiscovering = false;
    
    return {
      success: false,
      error: error.message,
      discoveredDevices
    };
  }
};

/**
 * Discover devices via multicast DNS (mDNS/Bonjour)
 * 
 * @returns {Promise<Array>} - Discovered devices
 */
const discoverViaMulticast = async () => {
  // This is a placeholder for actual mDNS implementation
  // In a real implementation, we would use a library like react-native-zeroconf
  
  console.log('Discovering edge devices via mDNS...');
  
  // Simulate discovery delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return empty array for now
  return [];
};

/**
 * Scan subnet for edge devices
 * 
 * @param {Object} networkState - Network state from NetInfo
 * @returns {Promise<Array>} - Discovered devices
 */
const scanSubnet = async (networkState) => {
  console.log('Scanning subnet for edge devices...');
  
  // Get IP address and subnet
  const ipAddress = networkState.details?.ipAddress;
  if (!ipAddress) {
    console.log('Could not determine IP address, skipping subnet scan');
    return [];
  }
  
  // Extract subnet from IP (e.g., 192.168.1.x)
  const subnet = ipAddress.split('.').slice(0, 3).join('.');
  console.log(`Scanning subnet: ${subnet}.x`);
  
  // Devices found
  const devices = [];
  
  // Common ports for edge devices
  const ports = [3000, 3001, 3002, 8080];
  
  // Scan common IP ranges first
  const commonIpRanges = [
    ...discoveryStats.commonIpRanges,
    { start: 1, end: 10 },
    { start: 100, end: 110 },
    { start: 254, end: 254 }
  ];
  
  // Scan common ranges first
  for (const range of commonIpRanges) {
    for (let i = range.start; i <= range.end; i++) {
      const targetIp = `${subnet}.${i}`;
      
      // Skip own IP
      if (targetIp === ipAddress) continue;
      
      // Try each port
      for (const port of ports) {
        try {
          const device = await checkEndpoint(targetIp, port);
          if (device) {
            devices.push(device);
            break; // Found a working port, no need to check others
          }
        } catch (error) {
          // Ignore errors, just continue scanning
        }
      }
    }
  }
  
  return devices;
};

/**
 * Verify known devices
 * 
 * @returns {Promise<Array>} - Verified devices
 */
const verifyKnownDevices = async () => {
  console.log('Verifying known edge devices...');
  
  const verifiedDevices = [];
  
  // Check preferred device first
  if (preferredDevice) {
    try {
      const device = await checkEndpoint(
        preferredDevice.ipAddress, 
        preferredDevice.port || 3000
      );
      
      if (device) {
        verifiedDevices.push(device);
      }
    } catch (error) {
      console.log(`Preferred device ${preferredDevice.ipAddress} not available`);
    }
  }
  
  // Check other known devices
  for (const device of discoveredDevices) {
    // Skip if already verified (preferred device)
    if (verifiedDevices.some(d => d.ipAddress === device.ipAddress)) {
      continue;
    }
    
    try {
      const verifiedDevice = await checkEndpoint(
        device.ipAddress, 
        device.port || 3000
      );
      
      if (verifiedDevice) {
        verifiedDevices.push(verifiedDevice);
      }
    } catch (error) {
      // Ignore errors, just continue checking
    }
  }
  
  return verifiedDevices;
};

/**
 * Check if an endpoint is a valid edge device
 * 
 * @param {string} ipAddress - IP address to check
 * @param {number} port - Port to check
 * @returns {Promise<Object|null>} - Device info if valid, null otherwise
 */
const checkEndpoint = async (ipAddress, port) => {
  try {
    const url = `http://${ipAddress}:${port}/health`;
    
    console.log(`Checking endpoint: ${url}`);
    
    // Try to connect with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), settings.healthCheckTimeout);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    const endTime = Date.now();
    
    clearTimeout(timeoutId);
    
    // Calculate response time
    const responseTime = endTime - startTime;
    
    if (response.ok) {
      // Parse response
      const data = await response.json();
      
      // Verify this is a MedTranslate edge device
      if (data && data.status === 'ok' && data.service === 'medtranslate-edge') {
        console.log(`Found edge device at ${ipAddress}:${port}`);
        
        // Calculate quality score (0-1)
        const quality = calculateQualityScore(responseTime, data);
        
        // Create device object
        return {
          ipAddress,
          port,
          name: data.name || `Edge Device (${ipAddress})`,
          version: data.version || 'unknown',
          capabilities: data.capabilities || {},
          responseTime,
          quality,
          lastSeen: Date.now()
        };
      }
    }
    
    return null;
  } catch (error) {
    // Timeout or connection error
    return null;
  }
};

/**
 * Calculate quality score for an edge device
 * 
 * @param {number} responseTime - Response time in ms
 * @param {Object} data - Device data from health check
 * @returns {number} - Quality score (0-1)
 */
const calculateQualityScore = (responseTime, data) => {
  // Base score from response time (lower is better)
  // 50ms -> 1.0, 500ms -> 0.5, 1000ms+ -> 0.0
  const responseScore = Math.max(0, Math.min(1, 1 - (responseTime - 50) / 950));
  
  // Capability score
  let capabilityScore = 0.5; // Default
  
  if (data.capabilities) {
    // Check for important capabilities
    if (data.capabilities.offlineTranslation) capabilityScore += 0.2;
    if (data.capabilities.audioProcessing) capabilityScore += 0.1;
    if (data.capabilities.highPerformance) capabilityScore += 0.1;
    if (data.capabilities.lowLatency) capabilityScore += 0.1;
  }
  
  // Version score (prefer newer versions)
  let versionScore = 0.5; // Default
  
  if (data.version) {
    try {
      // Extract version number
      const versionMatch = data.version.match(/(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1], 10);
        const minor = parseInt(versionMatch[2], 10);
        
        // Newer versions get higher scores
        versionScore = Math.min(1, (major * 0.1) + (minor * 0.01) + 0.3);
      }
    } catch (error) {
      // Ignore parsing errors
    }
  }
  
  // Combined score (weighted)
  return (responseScore * 0.6) + (capabilityScore * 0.3) + (versionScore * 0.1);
};

/**
 * Remove duplicate devices from the list
 * 
 * @param {Array} devices - List of devices
 * @returns {Array} - List with duplicates removed
 */
const removeDuplicateDevices = (devices) => {
  const uniqueDevices = [];
  const seenIps = new Set();
  
  for (const device of devices) {
    if (!seenIps.has(device.ipAddress)) {
      uniqueDevices.push(device);
      seenIps.add(device.ipAddress);
    }
  }
  
  return uniqueDevices;
};

/**
 * Update discovery statistics
 * 
 * @param {Array} devices - Discovered devices
 */
const updateDiscoveryStats = async (devices) => {
  // Update stats
  discoveryStats.lastDiscovery = Date.now();
  discoveryStats.totalDiscoveries++;
  discoveryStats.successfulDiscoveries += devices.length > 0 ? 1 : 0;
  discoveryStats.totalDevicesFound += devices.length;
  discoveryStats.averageDevicesFound = discoveryStats.totalDevicesFound / discoveryStats.totalDiscoveries;
  
  // Update common IP ranges
  if (devices.length > 0) {
    // Extract last octet from IP addresses
    const lastOctets = devices.map(device => {
      const parts = device.ipAddress.split('.');
      return parseInt(parts[3], 10);
    });
    
    // Group into ranges
    const ranges = [];
    let currentRange = { start: lastOctets[0], end: lastOctets[0] };
    
    for (let i = 1; i < lastOctets.length; i++) {
      const octet = lastOctets[i];
      
      // If consecutive, extend range
      if (octet === currentRange.end + 1) {
        currentRange.end = octet;
      } else {
        // Start new range
        ranges.push(currentRange);
        currentRange = { start: octet, end: octet };
      }
    }
    
    // Add last range
    ranges.push(currentRange);
    
    // Merge with existing common ranges
    const allRanges = [...discoveryStats.commonIpRanges, ...ranges];
    
    // Keep only top 5 ranges by size
    discoveryStats.commonIpRanges = allRanges
      .sort((a, b) => (b.end - b.start) - (a.end - a.start))
      .slice(0, 5);
  }
  
  // Save stats
  await AsyncStorage.setItem(STORAGE_KEYS.DISCOVERY_STATS, JSON.stringify(discoveryStats));
};

/**
 * Get the preferred edge device
 * 
 * @returns {Object|null} - Preferred device or null if none
 */
export const getPreferredDevice = () => {
  return preferredDevice;
};

/**
 * Set the preferred edge device
 * 
 * @param {Object} device - Device to set as preferred
 * @returns {Promise<boolean>} - Success
 */
export const setPreferredDevice = async (device) => {
  try {
    preferredDevice = device;
    await AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_DEVICE, JSON.stringify(device));
    
    // Track event
    AnalyticsService.trackEvent(
      AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
      'edge_discovery',
      'set_preferred',
      {
        ipAddress: device.ipAddress,
        quality: device.quality
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error setting preferred device:', error);
    return false;
  }
};

/**
 * Get all discovered edge devices
 * 
 * @returns {Array} - Discovered devices
 */
export const getDiscoveredDevices = () => {
  return discoveredDevices;
};

/**
 * Add a manual edge device
 * 
 * @param {string} ipAddress - IP address
 * @param {number} port - Port
 * @returns {Promise<Object>} - Result
 */
export const addManualDevice = async (ipAddress, port = 3000) => {
  try {
    console.log(`Adding manual edge device: ${ipAddress}:${port}`);
    
    // Check if device is valid
    const device = await checkEndpoint(ipAddress, port);
    
    if (!device) {
      return {
        success: false,
        reason: 'invalid_device'
      };
    }
    
    // Add to discovered devices if not already present
    if (!discoveredDevices.some(d => d.ipAddress === device.ipAddress)) {
      discoveredDevices.push(device);
      await AsyncStorage.setItem(STORAGE_KEYS.DISCOVERED_DEVICES, JSON.stringify(discoveredDevices));
    }
    
    // Set as preferred if requested or if no preferred device
    if (!preferredDevice) {
      preferredDevice = device;
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_DEVICE, JSON.stringify(device));
    }
    
    // Track event
    AnalyticsService.trackEvent(
      AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
      'edge_discovery',
      'add_manual',
      {
        ipAddress: device.ipAddress,
        port: device.port,
        quality: device.quality
      }
    );
    
    return {
      success: true,
      device
    };
  } catch (error) {
    console.error('Error adding manual device:', error);
    
    // Track error
    AnalyticsService.trackEvent(
      AnalyticsService.EVENT_TYPES.ERROR,
      'edge_discovery',
      'add_manual_error',
      {
        ipAddress,
        port,
        error: error.message
      }
    );
    
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Remove a discovered edge device
 * 
 * @param {string} ipAddress - IP address of device to remove
 * @returns {Promise<boolean>} - Success
 */
export const removeDevice = async (ipAddress) => {
  try {
    // Remove from discovered devices
    discoveredDevices = discoveredDevices.filter(d => d.ipAddress !== ipAddress);
    await AsyncStorage.setItem(STORAGE_KEYS.DISCOVERED_DEVICES, JSON.stringify(discoveredDevices));
    
    // If this was the preferred device, clear it
    if (preferredDevice && preferredDevice.ipAddress === ipAddress) {
      preferredDevice = discoveredDevices.length > 0 ? discoveredDevices[0] : null;
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_DEVICE, JSON.stringify(preferredDevice));
    }
    
    // Track event
    AnalyticsService.trackEvent(
      AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
      'edge_discovery',
      'remove_device',
      {
        ipAddress
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error removing device:', error);
    return false;
  }
};

/**
 * Get discovery status
 * 
 * @returns {Object} - Discovery status
 */
export const getDiscoveryStatus = () => {
  return {
    isInitialized,
    isDiscovering,
    discoveredDevices: discoveredDevices.length,
    hasPreferredDevice: !!preferredDevice,
    lastDiscovery: discoveryStats.lastDiscovery,
    stats: discoveryStats
  };
};

/**
 * Update discovery settings
 * 
 * @param {Object} newSettings - New settings
 * @returns {Object} - Updated settings
 */
export const updateSettings = async (newSettings) => {
  try {
    settings = { ...settings, ...newSettings };
    return settings;
  } catch (error) {
    console.error('Error updating settings:', error);
    return settings;
  }
};
