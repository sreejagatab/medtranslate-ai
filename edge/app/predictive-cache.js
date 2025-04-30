/**
 * Enhanced Predictive Caching Module for MedTranslate AI Edge Application
 *
 * This module provides advanced predictive caching capabilities to enhance offline mode:
 * - Analyzes usage patterns to predict future needs using machine learning techniques
 * - Pre-caches content based on predictions with smart prioritization
 * - Manages cache priorities based on usage statistics and time-of-day patterns
 * - Optimizes storage usage for offline operation with adaptive strategies
 * - Implements predictive algorithms for anticipating user needs
 * - Analyzes usage patterns to improve cache hit rates
 * - Implements advanced pattern recognition for user behavior prediction
 * - Utilizes contextual awareness for smarter caching decisions
 * - Adapts to changing network conditions and device capabilities
 * - Provides intelligent offline mode preparation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cacheManager } = require('./cache');
const networkMonitor = require('./network-monitor');

// Import new utilities
let storageManager;
let compressionUtil;

// Dynamically import utilities to handle potential missing files
try {
  storageManager = require('./utils/storage-manager');
  console.log('Storage manager loaded successfully');
} catch (error) {
  console.warn('Storage manager not available:', error.message);
  storageManager = null;
}

try {
  compressionUtil = require('./utils/compression-util');
  console.log('Compression utility loaded successfully');
} catch (error) {
  console.warn('Compression utility not available:', error.message);
  compressionUtil = null;
}

// Configuration
const USAGE_LOG_FILE = process.env.USAGE_LOG_FILE || path.join(__dirname, '../../cache/usage_log.json');
const PREDICTION_MODEL_FILE = process.env.PREDICTION_MODEL_FILE || path.join(__dirname, '../../cache/prediction_model.json');
const MAX_USAGE_LOG_SIZE = parseInt(process.env.MAX_USAGE_LOG_SIZE || '3000'); // Increased to 3000 for better pattern analysis
const PREDICTION_INTERVAL = parseInt(process.env.PREDICTION_INTERVAL || '1800000'); // 30 minutes for frequent updates
const PRE_CACHE_LIMIT = parseInt(process.env.PRE_CACHE_LIMIT || '300'); // Increased to 300 for better offline coverage
const USAGE_PATTERN_THRESHOLD = parseFloat(process.env.USAGE_PATTERN_THRESHOLD || '0.15'); // Reduced to 0.15 to be more inclusive
const ENABLE_PREDICTIVE_CACHING = process.env.ENABLE_PREDICTIVE_CACHING !== 'false';
const TIME_WEIGHT = parseFloat(process.env.TIME_WEIGHT || '0.3'); // Weight for time-based predictions
const RECENCY_WEIGHT = parseFloat(process.env.RECENCY_WEIGHT || '0.4'); // Weight for recency in predictions
const FREQUENCY_WEIGHT = parseFloat(process.env.FREQUENCY_WEIGHT || '0.3'); // Weight for frequency in predictions
const BATTERY_THRESHOLD = parseInt(process.env.BATTERY_THRESHOLD || '30'); // Battery percentage threshold for aggressive caching
const OFFLINE_PRIORITY_THRESHOLD = parseInt(process.env.OFFLINE_PRIORITY_THRESHOLD || '5'); // Hits required for offline priority

// Enhanced configuration parameters
const STORAGE_QUOTA_MB = parseInt(process.env.STORAGE_QUOTA_MB || '200'); // 200MB default storage quota
const ENABLE_COMPRESSION = process.env.ENABLE_COMPRESSION !== 'false'; // Enable compression by default
const COMPRESSION_THRESHOLD_BYTES = parseInt(process.env.COMPRESSION_THRESHOLD_BYTES || '1024'); // Compress items larger than 1KB
const NETWORK_PREDICTION_WINDOW = parseInt(process.env.NETWORK_PREDICTION_WINDOW || '7'); // Days to analyze for network patterns
const CONTEXT_WEIGHT = parseFloat(process.env.CONTEXT_WEIGHT || '0.25'); // Weight for contextual relevance
const LOCATION_WEIGHT = parseFloat(process.env.LOCATION_WEIGHT || '0.2'); // Weight for location-based predictions
const ADAPTIVE_LEARNING_RATE = parseFloat(process.env.ADAPTIVE_LEARNING_RATE || '0.1'); // Learning rate for adaptive algorithms
const OFFLINE_PREPARATION_THRESHOLD = parseFloat(process.env.OFFLINE_PREPARATION_THRESHOLD || '0.6'); // Threshold for offline preparation
const ENABLE_ADVANCED_ANALYTICS = process.env.ENABLE_ADVANCED_ANALYTICS !== 'false'; // Enable advanced analytics
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || '3600000'); // 1 hour for sync interval

// State
let usageLog = [];
let predictionModel = {
  languagePairs: {},
  contexts: {},
  terms: {},
  sequences: {},
  timePatterns: {
    hourly: Array(24).fill(0),
    daily: Array(7).fill(0),
    hourlyLanguagePairs: {},
    dailyLanguagePairs: {},
    // Enhanced time patterns
    weeklyPatterns: Array(4).fill(0), // Weekly patterns (weeks in a month)
    monthlyPatterns: Array(12).fill(0), // Monthly patterns
    hourlyContexts: {}, // Contexts by hour
    dailyContexts: {} // Contexts by day
  },
  userPatterns: {
    sessionDuration: 0,
    averageSessionItems: 0,
    commonSequences: [],
    contextTransitions: {},
    // Enhanced user patterns
    sessionFrequency: 0, // Average sessions per day
    sessionTimeDistribution: Array(24).fill(0), // When sessions typically occur
    complexSequences: [], // More complex sequence patterns (3+ steps)
    userPreferences: {}, // User preferences for languages, contexts, etc.
    interactionPatterns: {} // How the user interacts with the system
  },
  networkPatterns: {
    offlineFrequency: 0,
    offlineDurations: [],
    averageOfflineDuration: 0,
    offlineTimeOfDay: Array(24).fill(0),
    // Enhanced network patterns
    connectionQualityHistory: [], // History of connection quality
    offlinePredictions: [], // Predicted offline periods
    networkTransitions: {}, // Patterns of network transitions
    locationBasedConnectivity: {}, // Network connectivity by location
    weeklyOfflinePatterns: Array(7).fill(0) // Offline patterns by day of week
  },
  adaptiveThresholds: {
    cacheAggressiveness: 0.5,
    priorityThreshold: OFFLINE_PRIORITY_THRESHOLD,
    timeWeight: TIME_WEIGHT,
    recencyWeight: RECENCY_WEIGHT,
    frequencyWeight: FREQUENCY_WEIGHT,
    // Enhanced adaptive thresholds
    contextWeight: CONTEXT_WEIGHT,
    locationWeight: LOCATION_WEIGHT,
    learningRate: ADAPTIVE_LEARNING_RATE,
    offlinePreparationThreshold: OFFLINE_PREPARATION_THRESHOLD,
    compressionThreshold: COMPRESSION_THRESHOLD_BYTES
  },
  contentPatterns: {
    // New content patterns analysis
    popularTerms: {}, // Most frequently used medical terms
    termCooccurrence: {}, // Terms that appear together
    contentComplexity: {}, // Complexity of content by context
    contentLength: {}, // Average content length by context
    contentImportance: {} // Importance score for different content
  },
  devicePatterns: {
    // New device usage patterns
    batteryUsage: [], // Battery usage patterns
    storageUsage: [], // Storage usage patterns
    performanceMetrics: {}, // Device performance metrics
    deviceCapabilities: {}, // Device capabilities
    energyEfficiency: {} // Energy efficiency metrics
  },
  locationPatterns: {
    // New location-based patterns
    frequentLocations: [], // Frequently visited locations
    locationTransitions: {}, // Transitions between locations
    locationDurations: {}, // Time spent at locations
    locationConnectivity: {} // Connectivity at different locations
  },
  lastUpdated: 0,
  version: '2.0' // Model version for compatibility
};
let isInitialized = false;
let predictionInterval = null;
let syncInterval = null;
let batteryLevel = 100;
let devicePerformance = {
  cpuUsage: 0,
  memoryUsage: 0,
  storageAvailable: 1000000000, // 1GB default
  networkSpeed: 1000000, // 1Mbps default
  // Enhanced metrics
  batteryCharging: false,
  lastChargeTime: 0,
  lastDischargeTime: 0,
  temperatureCelsius: 25, // Default room temperature
  signalStrength: 0, // Network signal strength
  latency: 100, // Network latency in ms
  packetLoss: 0, // Network packet loss percentage
  deviceOrientation: 'portrait', // Device orientation
  screenBrightness: 0.5, // Screen brightness level
  lastActiveTime: Date.now(), // Last time the device was active
  deviceMotion: 'stationary', // Device motion state
  locationAccuracy: 0, // Location accuracy in meters
  storageUsageHistory: [], // History of storage usage
  batteryUsageHistory: [], // History of battery usage
  networkUsageHistory: [] // History of network usage
};

// Location tracking
let currentLocation = {
  latitude: 0,
  longitude: 0,
  accuracy: 0,
  timestamp: 0,
  locationName: 'unknown'
};

// Enhanced state tracking
let sessionState = {
  currentSessionStart: 0,
  currentSessionItems: 0,
  isActive: false,
  lastInteractionTime: 0,
  interactionCount: 0,
  currentContext: 'general',
  currentLanguagePair: 'en-es',
  offlineMode: false,
  offlineModeStartTime: 0,
  offlineModeDuration: 0,
  offlineModeCount: 0,
  syncStatus: 'idle',
  lastSyncTime: 0,
  syncSuccessCount: 0,
  syncFailureCount: 0
};

/**
 * Initialize the predictive cache module with enhanced capabilities
 *
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize() {
  if (isInitialized) {
    return { success: true };
  }

  try {
    console.log('Initializing enhanced predictive cache module with advanced capabilities...');

    // Create cache directory if it doesn't exist
    const cacheDir = path.dirname(USAGE_LOG_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Initialize storage manager if available
    if (storageManager) {
      await storageManager.initialize({
        storageDir: path.join(__dirname, '../../storage'),
        quotaMB: STORAGE_QUOTA_MB
      });
      console.log(`Storage manager initialized with ${STORAGE_QUOTA_MB}MB quota`);

      // Add storage event listener
      storageManager.addStorageListener((event, data) => {
        console.log(`Storage event: ${event}`, data);
        if (event === 'critical' || event === 'low') {
          // Adjust caching strategy based on storage availability
          adjustCachingStrategy();
        }
      });
    }

    // Load usage log if it exists
    if (fs.existsSync(USAGE_LOG_FILE)) {
      try {
        // Try to load from compressed storage first if available
        if (storageManager && compressionUtil) {
          const result = await storageManager.loadData('usage_log');
          if (result.success) {
            usageLog = result.data;
            console.log(`Loaded ${usageLog.length} entries from compressed usage log`);
          } else {
            // Fall back to regular file loading
            usageLog = JSON.parse(fs.readFileSync(USAGE_LOG_FILE, 'utf8'));
            console.log(`Loaded ${usageLog.length} entries from usage log file`);
          }
        } else {
          // Regular file loading
          usageLog = JSON.parse(fs.readFileSync(USAGE_LOG_FILE, 'utf8'));
          console.log(`Loaded ${usageLog.length} entries from usage log file`);
        }
      } catch (error) {
        console.error('Error loading usage log:', error);
        usageLog = [];
      }
    }

    // Load prediction model if it exists
    if (fs.existsSync(PREDICTION_MODEL_FILE)) {
      try {
        // Try to load from compressed storage first if available
        if (storageManager && compressionUtil) {
          const result = await storageManager.loadData('prediction_model');
          if (result.success) {
            predictionModel = result.data;
            console.log('Loaded prediction model from compressed storage');
          } else {
            // Fall back to regular file loading
            predictionModel = JSON.parse(fs.readFileSync(PREDICTION_MODEL_FILE, 'utf8'));
            console.log('Loaded prediction model from file');
          }
        } else {
          // Regular file loading
          predictionModel = JSON.parse(fs.readFileSync(PREDICTION_MODEL_FILE, 'utf8'));
          console.log('Loaded prediction model from file');
        }

        // Check for model version compatibility
        if (!predictionModel.version || predictionModel.version !== '2.0') {
          console.log('Upgrading prediction model to version 2.0');
          predictionModel = upgradeModelToV2(predictionModel);
        }
      } catch (error) {
        console.error('Error loading prediction model:', error);
        // Initialize with default structure (already defined above)
      }
    }

    // Initialize device monitoring with enhanced capabilities
    initializeDeviceMonitoring();

    // Initialize location tracking if available
    initializeLocationTracking();

    // Start prediction interval if enabled
    if (ENABLE_PREDICTIVE_CACHING) {
      startPredictionInterval();
    }

    // Start sync interval for data synchronization
    startSyncInterval();

    // Register network event listeners with enhanced handling
    networkMonitor.on('offline', handleOfflineMode);
    networkMonitor.on('online', handleOnlineMode);
    networkMonitor.on('quality_change', handleNetworkQualityChange);

    // Register session tracking
    startSessionTracking();

    // Perform initial prediction model update with enhanced analytics
    await updatePredictionModel();

    // Initialize offline preparation if needed
    if (predictionModel.networkPatterns.offlineFrequency > 0.5) {
      console.log('High offline frequency detected, preparing for offline mode');
      await prepareForOfflineMode();
    }

    isInitialized = true;
    console.log('Enhanced predictive cache module initialized successfully with advanced capabilities');

    return { success: true };
  } catch (error) {
    console.error('Error initializing predictive cache module:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Upgrade prediction model to version 2.0
 *
 * @param {Object} oldModel - The old prediction model
 * @returns {Object} - The upgraded prediction model
 */
function upgradeModelToV2(oldModel) {
  // Create a new model with the enhanced structure
  const newModel = {
    languagePairs: oldModel.languagePairs || {},
    contexts: oldModel.contexts || {},
    terms: oldModel.terms || {},
    sequences: oldModel.sequences || {},
    timePatterns: {
      hourly: oldModel.timePatterns?.hourly || Array(24).fill(0),
      daily: oldModel.timePatterns?.daily || Array(7).fill(0),
      hourlyLanguagePairs: oldModel.timePatterns?.hourlyLanguagePairs || {},
      dailyLanguagePairs: oldModel.timePatterns?.dailyLanguagePairs || {},
      // Enhanced time patterns
      weeklyPatterns: Array(4).fill(0),
      monthlyPatterns: Array(12).fill(0),
      hourlyContexts: {},
      dailyContexts: {}
    },
    userPatterns: {
      sessionDuration: oldModel.userPatterns?.sessionDuration || 0,
      averageSessionItems: oldModel.userPatterns?.averageSessionItems || 0,
      commonSequences: oldModel.userPatterns?.commonSequences || [],
      contextTransitions: oldModel.userPatterns?.contextTransitions || {},
      // Enhanced user patterns
      sessionFrequency: 0,
      sessionTimeDistribution: Array(24).fill(0),
      complexSequences: [],
      userPreferences: {},
      interactionPatterns: {}
    },
    networkPatterns: {
      offlineFrequency: oldModel.networkPatterns?.offlineFrequency || 0,
      offlineDurations: oldModel.networkPatterns?.offlineDurations || [],
      averageOfflineDuration: oldModel.networkPatterns?.averageOfflineDuration || 0,
      offlineTimeOfDay: oldModel.networkPatterns?.offlineTimeOfDay || Array(24).fill(0),
      // Enhanced network patterns
      connectionQualityHistory: [],
      offlinePredictions: [],
      networkTransitions: {},
      locationBasedConnectivity: {},
      weeklyOfflinePatterns: Array(7).fill(0)
    },
    adaptiveThresholds: {
      cacheAggressiveness: oldModel.adaptiveThresholds?.cacheAggressiveness || 0.5,
      priorityThreshold: oldModel.adaptiveThresholds?.priorityThreshold || OFFLINE_PRIORITY_THRESHOLD,
      timeWeight: oldModel.adaptiveThresholds?.timeWeight || TIME_WEIGHT,
      recencyWeight: oldModel.adaptiveThresholds?.recencyWeight || RECENCY_WEIGHT,
      frequencyWeight: oldModel.adaptiveThresholds?.frequencyWeight || FREQUENCY_WEIGHT,
      // Enhanced adaptive thresholds
      contextWeight: CONTEXT_WEIGHT,
      locationWeight: LOCATION_WEIGHT,
      learningRate: ADAPTIVE_LEARNING_RATE,
      offlinePreparationThreshold: OFFLINE_PREPARATION_THRESHOLD,
      compressionThreshold: COMPRESSION_THRESHOLD_BYTES
    },
    contentPatterns: {
      popularTerms: {},
      termCooccurrence: {},
      contentComplexity: {},
      contentLength: {},
      contentImportance: {}
    },
    devicePatterns: {
      batteryUsage: [],
      storageUsage: [],
      performanceMetrics: {},
      deviceCapabilities: {},
      energyEfficiency: {}
    },
    locationPatterns: {
      frequentLocations: [],
      locationTransitions: {},
      locationDurations: {},
      locationConnectivity: {}
    },
    lastUpdated: oldModel.lastUpdated || Date.now(),
    version: '2.0'
  };

  return newModel;
}

/**
 * Initialize device monitoring with enhanced capabilities
 */
function initializeDeviceMonitoring() {
  try {
    console.log('Initializing enhanced device monitoring...');

    // Monitor battery level if available
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      navigator.getBattery().then(battery => {
        // Get initial battery level and charging state
        batteryLevel = battery.level * 100;
        devicePerformance.batteryCharging = battery.charging;

        if (battery.charging) {
          devicePerformance.lastChargeTime = Date.now();
        } else {
          devicePerformance.lastDischargeTime = Date.now();
        }

        // Listen for battery level changes
        battery.addEventListener('levelchange', () => {
          batteryLevel = battery.level * 100;
          console.log(`Battery level changed: ${batteryLevel}%`);

          // Track battery usage history
          devicePerformance.batteryUsageHistory.push({
            timestamp: Date.now(),
            level: batteryLevel,
            charging: devicePerformance.batteryCharging
          });

          // Keep only the last 100 entries
          if (devicePerformance.batteryUsageHistory.length > 100) {
            devicePerformance.batteryUsageHistory.shift();
          }

          // Update prediction model with battery usage patterns
          updateBatteryUsagePatterns();

          // Adjust caching strategy based on battery level
          adjustCachingStrategy();
        });

        // Listen for charging state changes
        battery.addEventListener('chargingchange', () => {
          devicePerformance.batteryCharging = battery.charging;
          console.log(`Battery charging state changed: ${battery.charging ? 'Charging' : 'Discharging'}`);

          if (battery.charging) {
            devicePerformance.lastChargeTime = Date.now();
          } else {
            devicePerformance.lastDischargeTime = Date.now();
          }

          // Adjust caching strategy based on charging state
          adjustCachingStrategy();
        });

        console.log(`Initial battery level: ${batteryLevel}%, Charging: ${devicePerformance.batteryCharging}`);
      }).catch(error => {
        console.warn('Battery API not available:', error);
      });
    } else {
      console.log('Battery API not available in this environment');
    }

    // Monitor device performance with enhanced metrics
    setInterval(() => {
      // Get memory usage
      if (process.memoryUsage) {
        const memUsage = process.memoryUsage();
        devicePerformance.memoryUsage = memUsage.heapUsed / memUsage.heapTotal;

        // Track memory usage over time
        if (devicePerformance.memoryUsage > 0.8) {
          console.warn(`High memory usage detected: ${(devicePerformance.memoryUsage * 100).toFixed(1)}%`);
        }
      }

      // Get storage information with enhanced tracking
      try {
        if (storageManager) {
          // Use storage manager for accurate storage information
          const storageInfo = storageManager.getStorageInfo();
          devicePerformance.storageAvailable = storageInfo.availableMB * 1024 * 1024; // Convert MB to bytes

          // Track storage usage history
          devicePerformance.storageUsageHistory.push({
            timestamp: Date.now(),
            usageMB: storageInfo.currentUsageMB,
            availableMB: storageInfo.availableMB,
            percentage: storageInfo.usagePercentage
          });

          // Keep only the last 100 entries
          if (devicePerformance.storageUsageHistory.length > 100) {
            devicePerformance.storageUsageHistory.shift();
          }

          // Check for low storage
          if (storageInfo.usagePercentage > 80) {
            console.warn(`Low storage detected: ${storageInfo.usagePercentage.toFixed(1)}% used`);

            // Trigger storage optimization if critically low
            if (storageInfo.usagePercentage > 90) {
              storageManager.optimizeStorage();
            }
          }
        } else {
          // Fallback to basic storage check
          const cacheDir = path.dirname(USAGE_LOG_FILE);
          const stats = fs.statSync(cacheDir);
          if (stats.isDirectory()) {
            // This is a simplified approach - in a real app, you'd use a proper disk space API
            devicePerformance.storageAvailable = 1000000000; // Placeholder
          }
        }
      } catch (error) {
        console.warn('Error checking storage:', error);
      }

      // Get enhanced network metrics
      const networkStatus = networkMonitor.getNetworkStatus();
      if (networkStatus.online) {
        // Update network metrics
        devicePerformance.networkSpeed = networkStatus.speed || 1000000;
        devicePerformance.latency = networkStatus.latency || 100;
        devicePerformance.packetLoss = networkStatus.packetLoss || 0;
        devicePerformance.signalStrength = networkStatus.signalStrength || 0;

        // Track network usage history
        devicePerformance.networkUsageHistory.push({
          timestamp: Date.now(),
          speed: devicePerformance.networkSpeed,
          latency: devicePerformance.latency,
          packetLoss: devicePerformance.packetLoss,
          signalStrength: devicePerformance.signalStrength
        });

        // Keep only the last 100 entries
        if (devicePerformance.networkUsageHistory.length > 100) {
          devicePerformance.networkUsageHistory.shift();
        }
      }

      // Update device activity timestamp
      const now = Date.now();
      if (now - devicePerformance.lastActiveTime > 5 * 60 * 1000) { // 5 minutes of inactivity
        console.log('Device inactive for 5 minutes, adjusting caching strategy');
        // Reduce caching aggressiveness during inactive periods
        predictionModel.adaptiveThresholds.cacheAggressiveness = 0.3;
      }

    }, 60000); // Check every minute

    console.log('Enhanced device monitoring initialized');
  } catch (error) {
    console.error('Error initializing device monitoring:', error);
  }
}

/**
 * Initialize location tracking
 */
function initializeLocationTracking() {
  try {
    console.log('Initializing location tracking...');

    // Check if geolocation is available
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // Get initial location
      navigator.geolocation.getCurrentPosition(
        position => {
          updateLocation(position);
          console.log(`Initial location: ${position.coords.latitude}, ${position.coords.longitude}`);
        },
        error => {
          console.warn('Error getting location:', error.message);
        },
        { enableHighAccuracy: true }
      );

      // Watch for location changes
      const watchId = navigator.geolocation.watchPosition(
        position => {
          updateLocation(position);
        },
        error => {
          console.warn('Error watching location:', error.message);
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );

      console.log('Location tracking initialized');
    } else {
      console.log('Geolocation API not available in this environment');
    }
  } catch (error) {
    console.error('Error initializing location tracking:', error);
  }
}

/**
 * Update current location and analyze location patterns
 *
 * @param {Object} position - Geolocation position object
 */
function updateLocation(position) {
  try {
    const previousLocation = { ...currentLocation };

    // Update current location
    currentLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      locationName: currentLocation.locationName // Preserve location name
    };

    // Check if this is a significant location change
    const distanceChanged = calculateDistance(
      previousLocation.latitude,
      previousLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    );

    if (distanceChanged > 100) { // More than 100 meters
      console.log(`Significant location change detected: ${distanceChanged.toFixed(0)} meters`);

      // Try to reverse geocode the location
      reverseGeocode(currentLocation.latitude, currentLocation.longitude)
        .then(locationName => {
          currentLocation.locationName = locationName;
          console.log(`Location identified as: ${locationName}`);

          // Update location patterns
          updateLocationPatterns(previousLocation);
        })
        .catch(error => {
          console.warn('Error reverse geocoding:', error);

          // Still update patterns even without a name
          updateLocationPatterns(previousLocation);
        });
    }
  } catch (error) {
    console.error('Error updating location:', error);
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 *
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return 0;
  }

  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Reverse geocode coordinates to get location name
 *
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<string>} - Location name
 */
async function reverseGeocode(latitude, longitude) {
  // This is a mock implementation
  // In a real app, you would use a geocoding service
  return new Promise((resolve, reject) => {
    // Simulate API call
    setTimeout(() => {
      // Return a mock location name based on coordinates
      const locationHash = Math.abs(Math.floor((latitude * 1000 + longitude * 1000) % 5));
      const locationNames = [
        'Hospital',
        'Clinic',
        'Office',
        'Home',
        'Unknown Location'
      ];

      resolve(locationNames[locationHash]);
    }, 500);
  });
}

/**
 * Update location patterns based on location changes
 *
 * @param {Object} previousLocation - Previous location
 */
function updateLocationPatterns(previousLocation) {
  try {
    // Skip if no significant previous location
    if (!previousLocation.latitude || !previousLocation.longitude) {
      return;
    }

    const locationPatterns = predictionModel.locationPatterns;
    const currentLocationKey = currentLocation.locationName || `${currentLocation.latitude.toFixed(4)},${currentLocation.longitude.toFixed(4)}`;
    const previousLocationKey = previousLocation.locationName || `${previousLocation.latitude.toFixed(4)},${previousLocation.longitude.toFixed(4)}`;

    // Update frequent locations
    const existingLocation = locationPatterns.frequentLocations.find(
      loc => loc.key === currentLocationKey
    );

    if (existingLocation) {
      existingLocation.visitCount++;
      existingLocation.lastVisit = Date.now();
    } else {
      locationPatterns.frequentLocations.push({
        key: currentLocationKey,
        name: currentLocation.locationName || 'Unknown',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        visitCount: 1,
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        averageDuration: 0,
        networkConnectivity: networkMonitor.getNetworkStatus().online ? 1 : 0
      });
    }

    // Sort by visit count
    locationPatterns.frequentLocations.sort((a, b) => b.visitCount - a.visitCount);

    // Keep only top 10 locations
    if (locationPatterns.frequentLocations.length > 10) {
      locationPatterns.frequentLocations = locationPatterns.frequentLocations.slice(0, 10);
    }

    // Update location transitions
    if (!locationPatterns.locationTransitions[previousLocationKey]) {
      locationPatterns.locationTransitions[previousLocationKey] = {};
    }

    if (!locationPatterns.locationTransitions[previousLocationKey][currentLocationKey]) {
      locationPatterns.locationTransitions[previousLocationKey][currentLocationKey] = 0;
    }

    locationPatterns.locationTransitions[previousLocationKey][currentLocationKey]++;

    // Update location durations
    if (previousLocation.timestamp) {
      const duration = Date.now() - previousLocation.timestamp;

      if (!locationPatterns.locationDurations[previousLocationKey]) {
        locationPatterns.locationDurations[previousLocationKey] = [];
      }

      locationPatterns.locationDurations[previousLocationKey].push(duration);

      // Keep only last 10 durations
      if (locationPatterns.locationDurations[previousLocationKey].length > 10) {
        locationPatterns.locationDurations[previousLocationKey].shift();
      }

      // Update average duration
      const existingPrevLocation = locationPatterns.frequentLocations.find(
        loc => loc.key === previousLocationKey
      );

      if (existingPrevLocation) {
        const durations = locationPatterns.locationDurations[previousLocationKey];
        existingPrevLocation.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      }
    }

    // Update location connectivity
    const networkStatus = networkMonitor.getNetworkStatus();

    if (!locationPatterns.locationConnectivity[currentLocationKey]) {
      locationPatterns.locationConnectivity[currentLocationKey] = {
        onlineCount: 0,
        offlineCount: 0,
        lastStatus: null,
        networkQuality: []
      };
    }

    const connectivity = locationPatterns.locationConnectivity[currentLocationKey];

    if (networkStatus.online) {
      connectivity.onlineCount++;
      connectivity.networkQuality.push({
        timestamp: Date.now(),
        speed: networkStatus.speed || 0,
        latency: networkStatus.latency || 0,
        signalStrength: networkStatus.signalStrength || 0
      });
    } else {
      connectivity.offlineCount++;
    }

    connectivity.lastStatus = networkStatus.online ? 'online' : 'offline';

    // Keep only last 10 quality measurements
    if (connectivity.networkQuality.length > 10) {
      connectivity.networkQuality.shift();
    }

    // Save prediction model periodically
    savePredictionModel();
  } catch (error) {
    console.error('Error updating location patterns:', error);
  }
}

/**
 * Start session tracking
 */
function startSessionTracking() {
  try {
    console.log('Starting session tracking...');

    // Initialize session state
    sessionState.currentSessionStart = Date.now();
    sessionState.isActive = true;
    sessionState.lastInteractionTime = Date.now();

    // Set up session timeout check
    setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - sessionState.lastInteractionTime;

      // If inactive for more than 30 minutes, end session
      if (sessionState.isActive && inactiveTime > 30 * 60 * 1000) {
        endSession();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    console.log('Session tracking started');
  } catch (error) {
    console.error('Error starting session tracking:', error);
  }
}

/**
 * Record user interaction
 *
 * @param {string} interactionType - Type of interaction
 * @param {Object} data - Interaction data
 */
function recordInteraction(interactionType, data = {}) {
  try {
    // Update session state
    sessionState.lastInteractionTime = Date.now();
    sessionState.interactionCount++;

    // If session is not active, start a new one
    if (!sessionState.isActive) {
      startNewSession();
    }

    // Update interaction patterns
    if (!predictionModel.userPatterns.interactionPatterns[interactionType]) {
      predictionModel.userPatterns.interactionPatterns[interactionType] = {
        count: 0,
        lastTime: 0,
        timeDistribution: Array(24).fill(0),
        contextDistribution: {}
      };
    }

    const pattern = predictionModel.userPatterns.interactionPatterns[interactionType];
    pattern.count++;
    pattern.lastTime = Date.now();

    // Update time distribution
    const hour = new Date().getHours();
    pattern.timeDistribution[hour]++;

    // Update context distribution
    const context = data.context || sessionState.currentContext;
    if (!pattern.contextDistribution[context]) {
      pattern.contextDistribution[context] = 0;
    }
    pattern.contextDistribution[context]++;

    // If this is a translation, update session items
    if (interactionType === 'translation') {
      sessionState.currentSessionItems++;

      // Update current context and language pair
      if (data.context) {
        sessionState.currentContext = data.context;
      }

      if (data.sourceLanguage && data.targetLanguage) {
        sessionState.currentLanguagePair = `${data.sourceLanguage}-${data.targetLanguage}`;
      }
    }
  } catch (error) {
    console.error('Error recording interaction:', error);
  }
}

/**
 * Start a new user session
 */
function startNewSession() {
  try {
    // End previous session if active
    if (sessionState.isActive) {
      endSession();
    }

    // Initialize new session
    sessionState.currentSessionStart = Date.now();
    sessionState.currentSessionItems = 0;
    sessionState.isActive = true;
    sessionState.lastInteractionTime = Date.now();

    console.log('New session started');
  } catch (error) {
    console.error('Error starting new session:', error);
  }
}

/**
 * End the current user session
 */
function endSession() {
  try {
    if (!sessionState.isActive) {
      return;
    }

    // Calculate session duration
    const sessionDuration = Date.now() - sessionState.currentSessionStart;

    // Update user patterns
    const userPatterns = predictionModel.userPatterns;

    // Update session duration (weighted average)
    if (userPatterns.sessionDuration === 0) {
      userPatterns.sessionDuration = sessionDuration;
    } else {
      userPatterns.sessionDuration = (userPatterns.sessionDuration * 0.8) + (sessionDuration * 0.2);
    }

    // Update average session items (weighted average)
    if (userPatterns.averageSessionItems === 0) {
      userPatterns.averageSessionItems = sessionState.currentSessionItems;
    } else {
      userPatterns.averageSessionItems = (userPatterns.averageSessionItems * 0.8) + (sessionState.currentSessionItems * 0.2);
    }

    // Update session time distribution
    const hour = new Date(sessionState.currentSessionStart).getHours();
    userPatterns.sessionTimeDistribution[hour]++;

    // Update session frequency
    const daysSinceFirstSession = (Date.now() - predictionModel.lastUpdated) / (24 * 60 * 60 * 1000);
    if (daysSinceFirstSession > 0) {
      // Simple moving average
      const newFrequency = 1 / daysSinceFirstSession; // Sessions per day
      userPatterns.sessionFrequency = (userPatterns.sessionFrequency * 0.8) + (newFrequency * 0.2);
    }

    // Reset session state
    sessionState.isActive = false;

    console.log(`Session ended: ${sessionDuration / 60000} minutes, ${sessionState.currentSessionItems} items`);

    // Save prediction model
    savePredictionModel();
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

/**
 * Handle network quality change event
 *
 * @param {Object} qualityData - Network quality data
 */
function handleNetworkQualityChange(qualityData) {
  try {
    console.log('Network quality changed:', qualityData);

    // Update device performance metrics
    devicePerformance.networkSpeed = qualityData.speed || devicePerformance.networkSpeed;
    devicePerformance.latency = qualityData.latency || devicePerformance.latency;
    devicePerformance.packetLoss = qualityData.packetLoss || devicePerformance.packetLoss;
    devicePerformance.signalStrength = qualityData.signalStrength || devicePerformance.signalStrength;

    // Add to connection quality history
    predictionModel.networkPatterns.connectionQualityHistory.push({
      timestamp: Date.now(),
      quality: qualityData.quality || 'unknown',
      speed: qualityData.speed || 0,
      latency: qualityData.latency || 0,
      packetLoss: qualityData.packetLoss || 0,
      signalStrength: qualityData.signalStrength || 0
    });

    // Keep only the last 100 entries
    if (predictionModel.networkPatterns.connectionQualityHistory.length > 100) {
      predictionModel.networkPatterns.connectionQualityHistory.shift();
    }

    // Update location-based connectivity if we have a current location
    if (currentLocation.locationName) {
      const locationKey = currentLocation.locationName || `${currentLocation.latitude.toFixed(4)},${currentLocation.longitude.toFixed(4)}`;

      if (!predictionModel.locationPatterns.locationConnectivity[locationKey]) {
        predictionModel.locationPatterns.locationConnectivity[locationKey] = {
          onlineCount: 0,
          offlineCount: 0,
          lastStatus: null,
          networkQuality: []
        };
      }

      const connectivity = predictionModel.locationPatterns.locationConnectivity[locationKey];

      connectivity.networkQuality.push({
        timestamp: Date.now(),
        quality: qualityData.quality || 'unknown',
        speed: qualityData.speed || 0,
        latency: qualityData.latency || 0,
        signalStrength: qualityData.signalStrength || 0
      });

      // Keep only last 10 quality measurements
      if (connectivity.networkQuality.length > 10) {
        connectivity.networkQuality.shift();
      }
    }

    // If quality is poor, prepare for potential offline mode
    if (qualityData.quality === 'poor' || qualityData.speed < 500000) { // Less than 500 Kbps
      console.log('Poor network quality detected, preparing for potential offline mode');
      prepareForOfflineMode();
    }

    // Adjust caching strategy based on network quality
    adjustCachingStrategy();
  } catch (error) {
    console.error('Error handling network quality change:', error);
  }
}

/**
 * Update battery usage patterns
 */
function updateBatteryUsagePatterns() {
  try {
    const batteryHistory = devicePerformance.batteryUsageHistory;
    if (batteryHistory.length < 2) {
      return;
    }

    // Calculate discharge rate
    const dischargeSamples = batteryHistory.filter(sample => !sample.charging);
    if (dischargeSamples.length >= 2) {
      const sortedSamples = [...dischargeSamples].sort((a, b) => a.timestamp - b.timestamp);
      const firstSample = sortedSamples[0];
      const lastSample = sortedSamples[sortedSamples.length - 1];

      const levelDrop = firstSample.level - lastSample.level;
      const timeElapsed = (lastSample.timestamp - firstSample.timestamp) / (60 * 60 * 1000); // hours

      if (timeElapsed > 0 && levelDrop > 0) {
        const dischargeRate = levelDrop / timeElapsed; // % per hour

        // Update device patterns
        if (!predictionModel.devicePatterns.batteryUsage.length) {
          predictionModel.devicePatterns.batteryUsage.push({
            timestamp: Date.now(),
            dischargeRate,
            startLevel: firstSample.level,
            endLevel: lastSample.level,
            duration: timeElapsed
          });
        } else {
          // Only add if significant time has passed
          const lastEntry = predictionModel.devicePatterns.batteryUsage[predictionModel.devicePatterns.batteryUsage.length - 1];
          if (Date.now() - lastEntry.timestamp > 30 * 60 * 1000) { // 30 minutes
            predictionModel.devicePatterns.batteryUsage.push({
              timestamp: Date.now(),
              dischargeRate,
              startLevel: firstSample.level,
              endLevel: lastSample.level,
              duration: timeElapsed
            });
          }
        }

        // Keep only last 24 entries (roughly a day's worth)
        if (predictionModel.devicePatterns.batteryUsage.length > 24) {
          predictionModel.devicePatterns.batteryUsage.shift();
        }

        // Calculate average discharge rate
        const avgDischargeRate = predictionModel.devicePatterns.batteryUsage.reduce(
          (sum, entry) => sum + entry.dischargeRate, 0
        ) / predictionModel.devicePatterns.batteryUsage.length;

        // Update energy efficiency metrics
        predictionModel.devicePatterns.energyEfficiency = {
          averageDischargeRate: avgDischargeRate,
          estimatedBatteryLife: batteryLevel / avgDischargeRate, // hours
          lastUpdated: Date.now()
        };

        console.log(`Battery discharge rate: ${dischargeRate.toFixed(2)}% per hour, Estimated battery life: ${(batteryLevel / avgDischargeRate).toFixed(1)} hours`);
      }
    }
  } catch (error) {
    console.error('Error updating battery usage patterns:', error);
  }
}

/**
 * Adjust caching strategy based on device conditions
 */
function adjustCachingStrategy() {
  try {
    // Adjust based on battery level
    if (batteryLevel <= BATTERY_THRESHOLD) {
      // Low battery - reduce caching aggressiveness
      predictionModel.adaptiveThresholds.cacheAggressiveness = 0.3;
      console.log('Adjusted caching strategy: Low battery mode');
    } else if (batteryLevel >= 80) {
      // High battery - increase caching aggressiveness
      predictionModel.adaptiveThresholds.cacheAggressiveness = 0.7;
      console.log('Adjusted caching strategy: High battery mode');
    } else {
      // Normal battery - default caching aggressiveness
      predictionModel.adaptiveThresholds.cacheAggressiveness = 0.5;
      console.log('Adjusted caching strategy: Normal mode');
    }

    // Adjust based on storage availability
    if (devicePerformance.storageAvailable < 100000000) { // Less than 100MB
      // Low storage - reduce caching
      predictionModel.adaptiveThresholds.cacheAggressiveness *= 0.5;
      console.log('Adjusted caching strategy: Low storage mode');
    }

    // Adjust based on network conditions
    const networkStatus = networkMonitor.getNetworkStatus();
    if (networkStatus.online && devicePerformance.networkSpeed > 5000000) { // > 5Mbps
      // Fast network - increase pre-caching
      predictionModel.adaptiveThresholds.cacheAggressiveness *= 1.2;
      console.log('Adjusted caching strategy: Fast network mode');
    }

    // Save updated model
    fs.writeFileSync(PREDICTION_MODEL_FILE, JSON.stringify(predictionModel, null, 2), 'utf8');
  } catch (error) {
    console.error('Error adjusting caching strategy:', error);
  }
}

/**
 * Start the prediction interval
 */
function startPredictionInterval() {
  // Clear any existing interval
  if (predictionInterval) {
    clearInterval(predictionInterval);
  }

  // Set up new interval
  predictionInterval = setInterval(async () => {
    try {
      // Update prediction model
      await updatePredictionModel();

      // Pre-cache predicted content if online
      if (networkMonitor.getNetworkStatus().online) {
        await preCachePredictedContent();
      }
    } catch (error) {
      console.error('Error in prediction interval:', error);
    }
  }, PREDICTION_INTERVAL);

  console.log(`Predictive caching interval started (${PREDICTION_INTERVAL}ms)`);
}

/**
 * Handle transition to offline mode
 */
async function handleOfflineMode() {
  console.log('Predictive cache: Detected offline mode');

  try {
    // Update prediction model immediately before going offline
    await updatePredictionModel();

    // Prioritize predicted content in cache
    await prioritizePredictedContent();

    console.log('Predictive cache: Prepared for offline mode');
  } catch (error) {
    console.error('Error preparing for offline mode:', error);
  }
}

/**
 * Handle transition to online mode
 */
async function handleOnlineMode() {
  console.log('Predictive cache: Detected online mode');

  try {
    // Pre-cache predicted content
    await preCachePredictedContent();

    console.log('Predictive cache: Updated cache for online mode');
  } catch (error) {
    console.error('Error updating cache for online mode:', error);
  }
}

/**
 * Log translation usage
 *
 * @param {string} text - Original text
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @param {Object} result - Translation result
 */
function logTranslationUsage(text, sourceLanguage, targetLanguage, context, result) {
  if (!isInitialized) {
    initialize();
  }

  // Create usage entry
  const entry = {
    timestamp: Date.now(),
    sourceLanguage,
    targetLanguage,
    context,
    textLength: text.length,
    textHash: crypto.createHash('md5').update(text).digest('hex').substring(0, 8),
    terms: extractMedicalTerms(text),
    confidence: result.confidence,
    processingTime: result.processingTime
  };

  // Add to usage log
  usageLog.push(entry);

  // Trim usage log if it exceeds maximum size
  if (usageLog.length > MAX_USAGE_LOG_SIZE) {
    usageLog = usageLog.slice(usageLog.length - MAX_USAGE_LOG_SIZE);
  }

  // Save usage log periodically (every 10 entries)
  if (usageLog.length % 10 === 0) {
    saveUsageLog();
  }
}

/**
 * Extract medical terms from text
 *
 * @param {string} text - Text to analyze
 * @returns {Array<string>} - Extracted medical terms
 */
function extractMedicalTerms(text) {
  // This is a simplified implementation
  // In a real system, you would use NLP or a medical terminology database
  const commonMedicalTerms = [
    'fever', 'headache', 'pain', 'nausea', 'vomiting', 'diarrhea',
    'cough', 'shortness of breath', 'fatigue', 'dizziness',
    'hypertension', 'diabetes', 'asthma', 'cancer', 'heart attack',
    'stroke', 'infection', 'inflammation', 'fracture', 'surgery'
  ];

  const terms = [];
  const lowerText = text.toLowerCase();

  for (const term of commonMedicalTerms) {
    if (lowerText.includes(term)) {
      terms.push(term);
    }
  }

  return terms;
}

/**
 * Save usage log to disk
 */
function saveUsageLog() {
  try {
    fs.writeFileSync(USAGE_LOG_FILE, JSON.stringify(usageLog), 'utf8');
    console.log(`Saved ${usageLog.length} entries to usage log`);
  } catch (error) {
    console.error('Error saving usage log:', error);
  }
}

/**
 * Update the prediction model based on usage patterns
 *
 * @returns {Promise<Object>} - Update result
 */
async function updatePredictionModel() {
  try {
    console.log('Updating enhanced prediction model...');

    if (usageLog.length < 10) {
      console.log('Not enough usage data to update prediction model');
      return { success: false, reason: 'insufficient_data' };
    }

    // Create new model with enhanced structure
    const newModel = {
      languagePairs: {},
      contexts: {},
      terms: {},
      sequences: {},
      timePatterns: {
        hourly: Array(24).fill(0),
        daily: Array(7).fill(0),
        hourlyLanguagePairs: {},
        dailyLanguagePairs: {}
      },
      userPatterns: {
        sessionDuration: 0,
        averageSessionItems: 0,
        commonSequences: [],
        contextTransitions: {}
      },
      networkPatterns: {
        offlineFrequency: 0,
        offlineDurations: [],
        averageOfflineDuration: 0,
        offlineTimeOfDay: Array(24).fill(0)
      },
      adaptiveThresholds: predictionModel.adaptiveThresholds || {
        cacheAggressiveness: 0.5,
        priorityThreshold: OFFLINE_PRIORITY_THRESHOLD,
        timeWeight: TIME_WEIGHT,
        recencyWeight: RECENCY_WEIGHT,
        frequencyWeight: FREQUENCY_WEIGHT
      },
      lastUpdated: Date.now()
    };

    // Track sessions for user pattern analysis
    const sessions = [];
    let currentSession = [];
    let lastEntryTime = 0;

    // Analyze basic frequencies and time patterns
    for (const entry of usageLog) {
      const languagePair = `${entry.sourceLanguage}-${entry.targetLanguage}`;
      const entryDate = new Date(entry.timestamp);
      const hour = entryDate.getHours();
      const day = entryDate.getDay();

      // Track time patterns
      newModel.timePatterns.hourly[hour]++;
      newModel.timePatterns.daily[day]++;

      // Track hourly language pair patterns
      if (!newModel.timePatterns.hourlyLanguagePairs[hour]) {
        newModel.timePatterns.hourlyLanguagePairs[hour] = {};
      }

      if (!newModel.timePatterns.hourlyLanguagePairs[hour][languagePair]) {
        newModel.timePatterns.hourlyLanguagePairs[hour][languagePair] = 0;
      }

      newModel.timePatterns.hourlyLanguagePairs[hour][languagePair]++;

      // Track daily language pair patterns
      if (!newModel.timePatterns.dailyLanguagePairs[day]) {
        newModel.timePatterns.dailyLanguagePairs[day] = {};
      }

      if (!newModel.timePatterns.dailyLanguagePairs[day][languagePair]) {
        newModel.timePatterns.dailyLanguagePairs[day][languagePair] = 0;
      }

      newModel.timePatterns.dailyLanguagePairs[day][languagePair]++;

      // Track language pair frequencies
      if (!newModel.languagePairs[languagePair]) {
        newModel.languagePairs[languagePair] = {
          count: 0,
          lastUsed: 0,
          contexts: {},
          recency: 0, // New field for recency score
          timeScore: 0 // New field for time-based score
        };
      }

      newModel.languagePairs[languagePair].count++;
      newModel.languagePairs[languagePair].lastUsed = Math.max(
        newModel.languagePairs[languagePair].lastUsed,
        entry.timestamp
      );

      // Calculate recency score (higher for more recent entries)
      const ageInDays = (Date.now() - entry.timestamp) / (24 * 60 * 60 * 1000);
      const recencyScore = Math.max(0, 1 - (ageInDays / 30)); // 0-1 score, decaying over 30 days
      newModel.languagePairs[languagePair].recency = Math.max(
        newModel.languagePairs[languagePair].recency,
        recencyScore
      );

      // Track contexts within language pairs
      if (!newModel.languagePairs[languagePair].contexts[entry.context]) {
        newModel.languagePairs[languagePair].contexts[entry.context] = 0;
      }

      newModel.languagePairs[languagePair].contexts[entry.context]++;

      // Track overall contexts
      if (!newModel.contexts[entry.context]) {
        newModel.contexts[entry.context] = {
          count: 0,
          timeDistribution: Array(24).fill(0)
        };
      }

      newModel.contexts[entry.context].count++;
      newModel.contexts[entry.context].timeDistribution[hour]++;

      // Track medical terms with enhanced metadata
      for (const term of entry.terms) {
        if (!newModel.terms[term]) {
          newModel.terms[term] = {
            count: 0,
            languagePairs: {},
            contexts: {},
            timeDistribution: Array(24).fill(0)
          };
        }

        newModel.terms[term].count++;
        newModel.terms[term].timeDistribution[hour]++;

        if (!newModel.terms[term].languagePairs[languagePair]) {
          newModel.terms[term].languagePairs[languagePair] = 0;
        }

        newModel.terms[term].languagePairs[languagePair]++;

        if (!newModel.terms[term].contexts[entry.context]) {
          newModel.terms[term].contexts[entry.context] = 0;
        }

        newModel.terms[term].contexts[entry.context]++;
      }

      // Session tracking
      if (entry.timestamp - lastEntryTime > 30 * 60 * 1000 && currentSession.length > 0) {
        // End current session and start a new one
        sessions.push(currentSession);
        currentSession = [entry];
      } else {
        // Add to current session
        currentSession.push(entry);
      }

      lastEntryTime = entry.timestamp;
    }

    // Add the last session if not empty
    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    // Analyze sequence patterns (what contexts/terms follow others)
    for (let i = 1; i < usageLog.length; i++) {
      const prevEntry = usageLog[i - 1];
      const currEntry = usageLog[i];

      // Check if entries are from the same session (within 30 minutes)
      if (currEntry.timestamp - prevEntry.timestamp <= 30 * 60 * 1000) {
        // Context sequences with enhanced metadata
        const contextSeq = `${prevEntry.context}->${currEntry.context}`;

        if (!newModel.sequences[contextSeq]) {
          newModel.sequences[contextSeq] = {
            count: 0,
            timeDistribution: Array(24).fill(0)
          };
        }

        newModel.sequences[contextSeq].count++;

        const hour = new Date(currEntry.timestamp).getHours();
        newModel.sequences[contextSeq].timeDistribution[hour]++;

        // Track context transitions for user patterns
        if (!newModel.userPatterns.contextTransitions[prevEntry.context]) {
          newModel.userPatterns.contextTransitions[prevEntry.context] = {};
        }

        if (!newModel.userPatterns.contextTransitions[prevEntry.context][currEntry.context]) {
          newModel.userPatterns.contextTransitions[prevEntry.context][currEntry.context] = 0;
        }

        newModel.userPatterns.contextTransitions[prevEntry.context][currEntry.context]++;

        // Language pair sequences
        const prevLangPair = `${prevEntry.sourceLanguage}-${prevEntry.targetLanguage}`;
        const currLangPair = `${currEntry.sourceLanguage}-${currEntry.targetLanguage}`;
        const langPairSeq = `${prevLangPair}->${currLangPair}`;

        if (!newModel.sequences[langPairSeq]) {
          newModel.sequences[langPairSeq] = {
            count: 0,
            timeDistribution: Array(24).fill(0)
          };
        }

        newModel.sequences[langPairSeq].count++;
        newModel.sequences[langPairSeq].timeDistribution[hour]++;
      }
    }

    // Analyze session patterns
    if (sessions.length > 0) {
      // Calculate average session duration
      let totalDuration = 0;
      let totalItems = 0;

      for (const session of sessions) {
        if (session.length > 0) {
          const sessionDuration = session[session.length - 1].timestamp - session[0].timestamp;
          totalDuration += sessionDuration;
          totalItems += session.length;

          // Analyze common sequences within sessions
          if (session.length >= 3) {
            for (let i = 0; i < session.length - 2; i++) {
              const seq = [
                session[i].context,
                session[i + 1].context,
                session[i + 2].context
              ].join('->');

              const existingSeq = newModel.userPatterns.commonSequences.find(s => s.sequence === seq);

              if (existingSeq) {
                existingSeq.count++;
              } else {
                newModel.userPatterns.commonSequences.push({
                  sequence: seq,
                  count: 1
                });
              }
            }
          }
        }
      }

      newModel.userPatterns.sessionDuration = totalDuration / sessions.length;
      newModel.userPatterns.averageSessionItems = totalItems / sessions.length;

      // Sort common sequences by count
      newModel.userPatterns.commonSequences.sort((a, b) => b.count - a.count);

      // Keep only top 10 sequences
      newModel.userPatterns.commonSequences = newModel.userPatterns.commonSequences.slice(0, 10);
    }

    // Analyze network patterns from network monitor history
    const networkStatus = networkMonitor.getNetworkStatus();

    if (networkStatus.lastOfflineTime > 0) {
      // Calculate offline frequency (how often the device goes offline)
      const totalTime = Date.now() - usageLog[0].timestamp;
      const offlineFrequency = networkStatus.connectionAttempts / (totalTime / (24 * 60 * 60 * 1000));

      newModel.networkPatterns.offlineFrequency = offlineFrequency;

      // Record offline time of day
      if (networkStatus.lastOfflineTime > 0) {
        const offlineHour = new Date(networkStatus.lastOfflineTime).getHours();
        newModel.networkPatterns.offlineTimeOfDay[offlineHour]++;
      }

      // Calculate average offline duration if we have both offline and online timestamps
      if (networkStatus.lastOfflineTime > 0 && networkStatus.lastOnlineTime > networkStatus.lastOfflineTime) {
        const offlineDuration = networkStatus.lastOnlineTime - networkStatus.lastOfflineTime;
        newModel.networkPatterns.offlineDurations.push(offlineDuration);

        // Keep only the last 10 offline durations
        if (newModel.networkPatterns.offlineDurations.length > 10) {
          newModel.networkPatterns.offlineDurations.shift();
        }

        // Calculate average
        newModel.networkPatterns.averageOfflineDuration =
          newModel.networkPatterns.offlineDurations.reduce((sum, duration) => sum + duration, 0) /
          newModel.networkPatterns.offlineDurations.length;
      }
    }

    // Calculate probabilities and scores
    const totalEntries = usageLog.length;
    const now = Date.now();

    // Normalize time patterns
    const totalHourlyEntries = newModel.timePatterns.hourly.reduce((sum, count) => sum + count, 0);
    const totalDailyEntries = newModel.timePatterns.daily.reduce((sum, count) => sum + count, 0);

    if (totalHourlyEntries > 0) {
      for (let i = 0; i < 24; i++) {
        newModel.timePatterns.hourly[i] = newModel.timePatterns.hourly[i] / totalHourlyEntries;
      }
    }

    if (totalDailyEntries > 0) {
      for (let i = 0; i < 7; i++) {
        newModel.timePatterns.daily[i] = newModel.timePatterns.daily[i] / totalDailyEntries;
      }
    }

    // Language pair probabilities with enhanced scoring
    for (const pair in newModel.languagePairs) {
      const pairData = newModel.languagePairs[pair];

      // Basic probability
      pairData.probability = pairData.count / totalEntries;

      // Time-based score
      const currentHour = new Date().getHours();
      const currentDay = new Date().getDay();

      let timeScore = 0;

      // Check if this language pair is common at the current hour
      if (newModel.timePatterns.hourlyLanguagePairs[currentHour] &&
          newModel.timePatterns.hourlyLanguagePairs[currentHour][pair]) {
        const hourlyScore = newModel.timePatterns.hourlyLanguagePairs[currentHour][pair] /
                           Object.values(newModel.timePatterns.hourlyLanguagePairs[currentHour])
                             .reduce((sum, count) => sum + count, 0);
        timeScore += hourlyScore;
      }

      // Check if this language pair is common on the current day
      if (newModel.timePatterns.dailyLanguagePairs[currentDay] &&
          newModel.timePatterns.dailyLanguagePairs[currentDay][pair]) {
        const dailyScore = newModel.timePatterns.dailyLanguagePairs[currentDay][pair] /
                          Object.values(newModel.timePatterns.dailyLanguagePairs[currentDay])
                            .reduce((sum, count) => sum + count, 0);
        timeScore += dailyScore;
      }

      pairData.timeScore = timeScore / 2; // Average of hourly and daily scores

      // Calculate combined score using adaptive weights
      pairData.combinedScore =
        (newModel.adaptiveThresholds.frequencyWeight * pairData.probability) +
        (newModel.adaptiveThresholds.recencyWeight * pairData.recency) +
        (newModel.adaptiveThresholds.timeWeight * pairData.timeScore);

      // Context probabilities within language pair
      const pairContexts = pairData.contexts;
      const totalPairContexts = Object.values(pairContexts).reduce((sum, count) => sum + count, 0);

      for (const context in pairContexts) {
        pairContexts[context] = pairContexts[context] / totalPairContexts;
      }
    }

    // Context probabilities
    for (const context in newModel.contexts) {
      const contextData = newModel.contexts[context];
      contextData.probability = contextData.count / totalEntries;

      // Normalize time distribution
      if (contextData.count > 0) {
        for (let i = 0; i < 24; i++) {
          contextData.timeDistribution[i] = contextData.timeDistribution[i] / contextData.count;
        }
      }
    }

    // Term probabilities
    for (const term in newModel.terms) {
      const termData = newModel.terms[term];
      termData.probability = termData.count / totalEntries;

      // Normalize time distribution
      if (termData.count > 0) {
        for (let i = 0; i < 24; i++) {
          termData.timeDistribution[i] = termData.timeDistribution[i] / termData.count;
        }
      }
    }

    // Sequence probabilities
    const totalSequences = Object.values(newModel.sequences)
      .reduce((sum, seq) => sum + seq.count, 0);

    if (totalSequences > 0) {
      for (const seq in newModel.sequences) {
        const seqData = newModel.sequences[seq];
        seqData.probability = seqData.count / totalSequences;

        // Normalize time distribution
        if (seqData.count > 0) {
          for (let i = 0; i < 24; i++) {
            seqData.timeDistribution[i] = seqData.timeDistribution[i] / seqData.count;
          }
        }
      }
    }

    // Context transition probabilities
    for (const sourceContext in newModel.userPatterns.contextTransitions) {
      const transitions = newModel.userPatterns.contextTransitions[sourceContext];
      const totalTransitions = Object.values(transitions).reduce((sum, count) => sum + count, 0);

      if (totalTransitions > 0) {
        for (const targetContext in transitions) {
          transitions[targetContext] = transitions[targetContext] / totalTransitions;
        }
      }
    }

    // Update prediction model
    predictionModel = newModel;

    // Save prediction model
    fs.writeFileSync(PREDICTION_MODEL_FILE, JSON.stringify(predictionModel, null, 2), 'utf8');
    console.log('Enhanced prediction model updated and saved');

    return { success: true };
  } catch (error) {
    console.error('Error updating prediction model:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Pre-cache predicted content with enhanced strategies
 *
 * @param {Object} options - Pre-caching options
 * @returns {Promise<Object>} - Pre-cache result
 */
async function preCachePredictedContent(options = {}) {
  try {
    console.log('Pre-caching predicted content with enhanced strategies...');

    // Check network status
    const networkStatus = networkMonitor.getNetworkStatus();
    if (!networkStatus.online) {
      console.log('Cannot pre-cache content while offline');
      return { success: false, reason: 'offline' };
    }

    // Get current cache stats
    const cacheStats = await cacheManager.getStats();
    const translationCacheSize = cacheStats.types.translation?.size || 0;
    const translationCacheLimit = cacheStats.types.translation?.limit || 1000;

    // Calculate available cache space
    const availableSpace = translationCacheLimit - translationCacheSize;
    const availablePercentage = (availableSpace / translationCacheLimit) * 100;

    console.log(`Cache status: ${translationCacheSize}/${translationCacheLimit} items used (${availablePercentage.toFixed(1)}% available)`);

    // Determine caching aggressiveness based on device conditions
    let aggressiveness = predictionModel.adaptiveThresholds.cacheAggressiveness;

    // Adjust based on battery level
    if (batteryLevel < BATTERY_THRESHOLD) {
      aggressiveness *= 0.7; // Reduce aggressiveness on low battery
      console.log(`Reducing cache aggressiveness due to low battery (${batteryLevel}%)`);
    }

    // Adjust based on available cache space
    if (availablePercentage < 20) {
      aggressiveness *= 0.5; // Reduce aggressiveness when cache is getting full
      console.log('Reducing cache aggressiveness due to limited cache space');
    } else if (availablePercentage > 70) {
      aggressiveness *= 1.3; // Increase aggressiveness when plenty of space
      console.log('Increasing cache aggressiveness due to abundant cache space');
    }

    // Adjust based on network conditions
    if (devicePerformance.networkSpeed > 10000000) { // > 10 Mbps
      aggressiveness *= 1.2; // Increase aggressiveness on fast networks
      console.log('Increasing cache aggressiveness due to fast network');
    } else if (devicePerformance.networkSpeed < 1000000) { // < 1 Mbps
      aggressiveness *= 0.8; // Reduce aggressiveness on slow networks
      console.log('Reducing cache aggressiveness due to slow network');
    }

    // Cap aggressiveness between 0.1 and 1.0
    aggressiveness = Math.max(0.1, Math.min(1.0, aggressiveness));

    // Check if we have room for pre-caching
    if (translationCacheSize >= translationCacheLimit * 0.95) {
      console.log('Cache is nearly full, performing selective pre-caching only');
      // Continue with reduced aggressiveness
      aggressiveness = 0.1;
    }

    // Get predictions with adjusted aggressiveness
    const predictions = getPredictions({ aggressiveness });

    if (predictions.length === 0) {
      console.log('No predictions available for pre-caching');
      return { success: false, reason: 'no_predictions' };
    }

    // Calculate how many predictions to cache based on aggressiveness and available space
    const maxItemsToCache = Math.min(
      Math.floor(PRE_CACHE_LIMIT * aggressiveness),
      Math.floor(availableSpace * 0.8) // Use at most 80% of available space
    );

    // Ensure we cache at least some items
    const itemsToCache = Math.max(5, maxItemsToCache);

    // Limit number of predictions to pre-cache
    const predictionsToCache = predictions.slice(0, itemsToCache);
    console.log(`Pre-caching ${predictionsToCache.length} predicted items (aggressiveness: ${aggressiveness.toFixed(2)})`);

    // Group predictions by priority
    const highPriorityPredictions = predictionsToCache.filter(p =>
      p.reason === 'offline_risk' || p.score > 0.7
    );

    const normalPriorityPredictions = predictionsToCache.filter(p =>
      p.reason !== 'offline_risk' && p.score <= 0.7
    );

    console.log(`Priority breakdown: ${highPriorityPredictions.length} high, ${normalPriorityPredictions.length} normal`);

    // Pre-cache high priority predictions first
    const results = [];

    // Process high priority predictions
    console.log('Processing high priority predictions...');
    for (const prediction of highPriorityPredictions) {
      try {
        // Generate multiple sample texts for high priority predictions
        const sampleTexts = generateMultipleSampleTexts(prediction, 3);

        for (const sampleText of sampleTexts) {
          // Call the translation API with high priority
          const result = await cacheTranslationForPrediction(
            sampleText,
            prediction,
            { priority: 'high' }
          );

          results.push(result);

          // Short delay between requests to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error(`Error pre-caching high priority prediction: ${error.message}`);
        results.push({
          prediction,
          success: false,
          error: error.message
        });
      }
    }

    // Process normal priority predictions
    console.log('Processing normal priority predictions...');
    for (const prediction of normalPriorityPredictions) {
      try {
        // Generate sample text based on the prediction
        const sampleText = generateSampleText(prediction);

        // Call the translation API
        const result = await cacheTranslationForPrediction(
          sampleText,
          prediction,
          { priority: 'normal' }
        );

        results.push(result);

        // Longer delay for normal priority
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error pre-caching normal priority prediction: ${error.message}`);
        results.push({
          prediction,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Pre-cached ${successCount}/${results.length} items`);

    // Update prediction model with success rates
    updatePredictionSuccessRates(predictions, results);

    return {
      success: true,
      totalPredictions: predictions.length,
      cachedCount: successCount,
      failedCount: results.length - successCount,
      aggressiveness
    };
  } catch (error) {
    console.error('Error pre-caching content:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cache translation for a prediction
 *
 * @param {string} text - Text to translate
 * @param {Object} prediction - Prediction object
 * @param {Object} options - Caching options
 * @returns {Promise<Object>} - Cache result
 */
async function cacheTranslationForPrediction(text, prediction, options = {}) {
  try {
    // Determine API endpoint
    const apiUrl = `http://localhost:${process.env.PORT || 3000}/api/translate`;

    // Set priority flag
    const offlinePriority = options.priority === 'high';

    // Call the translation API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        sourceLanguage: prediction.sourceLanguage,
        targetLanguage: prediction.targetLanguage,
        context: prediction.context,
        offlinePriority,
        preCached: true,
        reason: prediction.reason
      })
    });

    if (response.ok) {
      const result = await response.json();
      return {
        prediction,
        success: true,
        translatedText: result.translatedText,
        priority: options.priority
      };
    } else {
      return {
        prediction,
        success: false,
        error: `API error: ${response.status}`,
        priority: options.priority
      };
    }
  } catch (error) {
    return {
      prediction,
      success: false,
      error: error.message,
      priority: options.priority
    };
  }
}

/**
 * Generate multiple sample texts for a prediction
 *
 * @param {Object} prediction - Prediction object
 * @param {number} count - Number of samples to generate
 * @returns {Array<string>} - Array of sample texts
 */
function generateMultipleSampleTexts(prediction, count = 3) {
  const samples = [];

  // Generate unique samples
  for (let i = 0; i < count; i++) {
    const sample = generateSampleText(prediction, { variation: i });

    // Ensure we don't add duplicates
    if (!samples.includes(sample)) {
      samples.push(sample);
    }
  }

  return samples;
}

/**
 * Update prediction success rates based on pre-caching results
 *
 * @param {Array<Object>} predictions - Predictions
 * @param {Array<Object>} results - Pre-caching results
 */
function updatePredictionSuccessRates(predictions, results) {
  // Initialize success tracking if not present
  if (!predictionModel.predictionSuccess) {
    predictionModel.predictionSuccess = {};
  }

  // Group results by prediction reason
  const reasonResults = {};

  for (const result of results) {
    const reason = result.prediction.reason;

    if (!reasonResults[reason]) {
      reasonResults[reason] = {
        total: 0,
        success: 0
      };
    }

    reasonResults[reason].total++;

    if (result.success) {
      reasonResults[reason].success++;
    }
  }

  // Update success rates
  for (const reason in reasonResults) {
    const stats = reasonResults[reason];
    const successRate = stats.success / stats.total;

    predictionModel.predictionSuccess[reason] = {
      successRate,
      lastUpdated: Date.now(),
      sampleSize: stats.total
    };
  }

  // Save updated model
  fs.writeFileSync(PREDICTION_MODEL_FILE, JSON.stringify(predictionModel, null, 2), 'utf8');
}

/**
 * Generate sample text for a prediction with enhanced realism
 *
 * @param {Object} prediction - Prediction object
 * @param {Object} options - Generation options
 * @returns {string} - Sample text
 */
function generateSampleText(prediction, options = {}) {
  // Get variation for multiple samples
  const variation = options.variation || 0;

  // Check if prediction has specific terms to include
  const specificTerms = prediction.terms || [];

  // Templates for different contexts with more realistic medical content
  const templates = {
    general: [
      'The patient reports {symptom} for the past {duration}. Vital signs are stable with BP {bp}, HR {hr}, and temperature {temp}.',
      'Patient has a history of {condition} and is currently taking {medication}. No known drug allergies.',
      'The patient is experiencing {symptom} and {symptom}. Symptoms began {duration} ago and {symptom_progression}.',
      'Patient presents with {symptom} that {symptom_qualifier}. They have tried {home_remedy} without relief.',
      'Review of systems positive for {symptom} and {symptom}. Patient denies {negative_symptom}.'
    ],
    cardiology: [
      'The patient has a history of {cardio_condition} and is currently on {medication}. Recent ECG shows {ecg_finding}.',
      'Cardiac examination reveals {cardiac_exam}. Patient reports {cardio_symptom} that {cardio_qualifier}.',
      'The patient has {cardio_condition} with NYHA Class {nyha_class} symptoms. Current medications include {medication} and {medication}.',
      'Echocardiogram shows {echo_finding} with ejection fraction of {ef_percent}%. Patient reports {cardio_symptom}.',
      'The patient has a history of {cardio_condition} status post {cardio_procedure} in {year}. Current symptoms include {cardio_symptom}.'
    ],
    neurology: [
      'The patient experiences {neuro_symptom}, typically lasting {duration}. Neurological exam shows {neuro_exam_finding}.',
      'MRI of the {brain_region} shows {mri_finding}. Patient reports {neuro_symptom} that {neuro_qualifier}.',
      'The patient has a history of {neuro_condition} and presents with new-onset {neuro_symptom}. Reflexes are {reflex_status}.',
      'Neurological assessment reveals {neuro_exam_finding}. Patient reports {neuro_symptom} that began {duration} ago.',
      'The patient has been experiencing {neuro_symptom} with associated {associated_symptom}. Cranial nerves II-XII are intact.'
    ],
    orthopedics: [
      'The patient has limited range of motion in the {body_part} following {injury_cause}. X-rays show {xray_finding}.',
      'Examination of the {body_part} reveals {ortho_exam_finding}. Pain is rated as {pain_scale}/10 and {pain_qualifier}.',
      'The patient reports {ortho_symptom} in the {body_part} that worsens with {activity}. MRI shows {mri_finding}.',
      'Post-operative evaluation of {procedure} shows {healing_status}. Patient reports {ortho_symptom} with {activity}.',
      'The patient has {ortho_condition} of the {body_part} with {deformity}. Range of motion is limited to {rom_degree} degrees.'
    ],
    pediatrics: [
      'The child has had {peds_symptom} for the past {duration}. Vital signs: T {temp}, HR {hr}, RR {rr}.',
      'The patient is a {age}-year-old with a history of {peds_condition}. Growth charts indicate the child is in the {percentile} percentile.',
      'Developmental milestones are {development_status}. The child has been experiencing {peds_symptom} for {duration}.',
      'The child presents with {peds_symptom} and {peds_symptom}. Immunizations are {immunization_status}.',
      'Physical examination reveals {peds_exam_finding}. The child has been {activity_level} and {appetite_status}.'
    ],
    oncology: [
      'The patient is undergoing cycle {cycle_number} of {treatment} for stage {stage} {cancer_type}. Current side effects include {side_effect}.',
      'PET scan shows {scan_finding} following {procedure}. Tumor markers are {tumor_marker_status}.',
      'The patient reports {symptom} following {treatment}. Performance status is ECOG {ecog_score}.',
      'Pathology report shows {pathology_finding}. The patient is scheduled for {treatment} starting {timeframe}.',
      'The patient has completed {treatment} for {cancer_type} and is now {timeframe} into surveillance. Recent imaging shows {scan_finding}.'
    ],
    emergency: [
      'The patient was involved in {accident_type} and presents with {symptom}. GCS score is {gcs_score}.',
      'The patient is experiencing severe {symptom} in the {body_part}. Vital signs: BP {bp}, HR {hr}, RR {rr}, O2 sat {o2_sat}%.',
      'The patient arrived with symptoms of {condition} after {trigger}. Initial assessment shows {assessment_finding}.',
      'Trauma assessment reveals {trauma_finding}. The patient reports {mechanism_of_injury} approximately {timeframe} ago.',
      'The patient presents with {symptom} of sudden onset. ECG shows {ecg_finding}. Troponin is {troponin_result}.'
    ],
    gastroenterology: [
      'The patient reports {gi_symptom} for the past {duration}. Last bowel movement was {timeframe} with {stool_character}.',
      'Abdominal examination reveals {abdominal_finding}. Patient reports {gi_symptom} that {symptom_qualifier}.',
      'The patient has a history of {gi_condition} and presents with {gi_symptom}. Current medications include {medication}.',
      'Endoscopy shows {endoscopy_finding}. Patient reports {gi_symptom} that {symptom_qualifier}.',
      'The patient has been experiencing {gi_symptom} with associated {associated_symptom}. Diet modifications have {diet_effect}.'
    ]
  };

  // Enhanced placeholder values with more medical terminology
  const placeholders = {
    // General
    symptom: ['fever', 'headache', 'nausea', 'vomiting', 'dizziness', 'fatigue', 'persistent cough', 'pruritic rash', 'dyspnea', 'diaphoresis', 'myalgia', 'arthralgia'],
    duration: ['48 hours', '3 days', '1 week', '2 weeks', 'approximately 1 month', 'several months', 'the past year'],
    condition: ['hypertension', 'type 2 diabetes mellitus', 'hyperlipidemia', 'COPD', 'asthma', 'hypothyroidism', 'rheumatoid arthritis', 'chronic kidney disease'],
    medication: ['lisinopril 20mg daily', 'metformin 1000mg BID', 'atorvastatin 40mg at bedtime', 'levothyroxine 100mcg daily', 'albuterol PRN', 'prednisone 10mg daily'],
    bp: ['120/80', '138/85', '145/92', '110/70', '160/95'],
    hr: ['72', '85', '95', '65', '110'],
    temp: ['98.6°F', '99.2°F', '100.4°F', '97.8°F', '101.3°F'],
    symptom_progression: ['has been worsening', 'has remained constant', 'improves with rest', 'worsens at night', 'fluctuates throughout the day'],
    symptom_qualifier: ['is constant', 'comes and goes', 'worsens with activity', 'improves with medication', 'is exacerbated by stress'],
    home_remedy: ['over-the-counter analgesics', 'ice packs', 'heat therapy', 'rest', 'hydration'],
    negative_symptom: ['chest pain', 'shortness of breath', 'fever', 'weight loss', 'night sweats', 'loss of consciousness'],

    // Cardiology
    cardio_condition: ['myocardial infarction', 'atrial fibrillation', 'heart failure with reduced ejection fraction', 'hypertensive heart disease', 'aortic stenosis', 'mitral valve regurgitation'],
    cardiac_exam: ['regular rate and rhythm', 'S1 and S2 normal', 'grade 2/6 systolic murmur at the right upper sternal border', 'displaced point of maximal impulse', 'bilateral lower extremity edema'],
    cardio_symptom: ['chest pain', 'palpitations', 'dyspnea on exertion', 'orthopnea', 'paroxysmal nocturnal dyspnea', 'syncope', 'claudication'],
    cardio_qualifier: ['radiates to the left arm', 'worsens with exertion', 'improves with rest', 'occurs at night', 'is associated with diaphoresis'],
    ecg_finding: ['ST-segment elevation in leads V1-V4', 'T-wave inversion', 'Q waves in the inferior leads', 'left bundle branch block', 'atrial fibrillation with rapid ventricular response'],
    nyha_class: ['I', 'II', 'III', 'IV'],
    echo_finding: ['left ventricular hypertrophy', 'regional wall motion abnormality', 'preserved systolic function', 'moderate aortic stenosis', 'dilated left atrium'],
    ef_percent: ['35', '45', '55', '60', '25'],
    cardio_procedure: ['CABG', 'PCI with stent placement', 'valve replacement', 'ablation', 'pacemaker implantation'],
    year: ['2018', '2019', '2020', '2021', '2022'],

    // Neurology
    neuro_symptom: ['migraine headaches', 'numbness and tingling', 'tremors', 'seizures', 'memory impairment', 'gait disturbance', 'aphasia', 'diplopia'],
    neuro_exam_finding: ['intact cranial nerves', 'decreased sensation in the right upper extremity', 'hyperreflexia', 'positive Babinski sign', 'normal muscle tone', 'mild dysmetria on finger-to-nose testing'],
    brain_region: ['brain', 'cervical spine', 'lumbar spine', 'cerebellum', 'temporal lobe'],
    mri_finding: ['small lacunar infarct', 'no acute intracranial abnormality', 'mild cortical atrophy', 'white matter hyperintensities', 'disc herniation at L4-L5'],
    neuro_qualifier: ['is worse in the morning', 'improves with medication', 'is triggered by bright lights', 'interferes with daily activities', 'has been progressively worsening'],
    neuro_condition: ['multiple sclerosis', 'Parkinson\'s disease', 'epilepsy', 'migraine with aura', 'peripheral neuropathy', 'essential tremor'],
    reflex_status: ['2+ and symmetric', 'hyperactive in the lower extremities', 'diminished in the upper extremities', 'normal throughout', 'absent at the ankles'],
    associated_symptom: ['photophobia', 'phonophobia', 'nausea', 'vertigo', 'tinnitus', 'visual aura'],

    // Orthopedics
    body_part: ['right shoulder', 'left knee', 'lumbar spine', 'right hip', 'left ankle', 'cervical spine', 'right wrist'],
    ortho_exam_finding: ['tenderness to palpation', 'decreased range of motion', 'joint effusion', 'crepitus', 'positive McMurray test', 'positive impingement sign'],
    pain_scale: ['3', '5', '7', '8', '4'],
    pain_qualifier: ['is worse with weight-bearing', 'improves with NSAIDs', 'is constant', 'worsens at night', 'is exacerbated by movement'],
    ortho_symptom: ['pain', 'stiffness', 'swelling', 'instability', 'decreased range of motion', 'locking sensation'],
    activity: ['walking', 'climbing stairs', 'overhead activities', 'lifting', 'prolonged sitting'],
    injury_cause: ['a fall', 'a motor vehicle accident', 'a sports-related injury', 'repetitive motion', 'a direct blow'],
    xray_finding: ['no acute fracture or dislocation', 'mild degenerative changes', 'joint space narrowing', 'osteophyte formation', 'soft tissue swelling'],
    procedure: ['total knee arthroplasty', 'rotator cuff repair', 'ACL reconstruction', 'lumbar laminectomy', 'open reduction internal fixation'],
    healing_status: ['appropriate healing', 'delayed union', 'hardware in good position', 'no signs of infection', 'mild residual swelling'],
    ortho_condition: ['osteoarthritis', 'rotator cuff tear', 'meniscal tear', 'adhesive capsulitis', 'plantar fasciitis'],
    deformity: ['varus deformity', 'valgus deformity', 'flexion contracture', 'scoliosis', 'kyphosis'],
    rom_degree: ['90', '120', '45', '30', '15'],

    // Pediatrics
    peds_symptom: ['fever', 'cough', 'rhinorrhea', 'ear pain', 'rash', 'vomiting', 'diarrhea', 'decreased appetite'],
    age: ['2', '4', '7', '10', '13', '16'],
    peds_condition: ['recurrent otitis media', 'asthma', 'atopic dermatitis', 'ADHD', 'autism spectrum disorder', 'congenital heart disease'],
    percentile: ['25th', '50th', '75th', '85th', '95th'],
    development_status: ['age-appropriate', 'delayed in speech', 'advanced for age', 'slightly delayed in gross motor skills', 'appropriate except for fine motor skills'],
    immunization_status: ['up to date', 'delayed', 'partially complete', 'exempt for medical reasons', 'in progress with catch-up schedule'],
    peds_exam_finding: ['clear lungs bilaterally', 'erythematous tympanic membranes', 'pharyngeal erythema', 'maculopapular rash on trunk', 'normal heart sounds without murmur'],
    activity_level: ['active', 'lethargic', 'irritable', 'playful', 'withdrawn'],
    appetite_status: ['eating normally', 'decreased appetite', 'refusing solids', 'drinking adequately', 'decreased oral intake'],
    rr: ['18', '22', '26', '30', '24'],

    // Oncology
    cycle_number: ['2', '3', '4', '6', '1'],
    treatment: ['adjuvant chemotherapy', 'neoadjuvant radiation therapy', 'immunotherapy', 'targeted therapy', 'hormone therapy'],
    stage: ['I', 'II', 'III', 'IV', 'IIB'],
    cancer_type: ['breast carcinoma', 'non-small cell lung cancer', 'colorectal adenocarcinoma', 'prostate cancer', 'diffuse large B-cell lymphoma', 'renal cell carcinoma'],
    side_effect: ['fatigue', 'nausea', 'peripheral neuropathy', 'neutropenia', 'mucositis', 'alopecia'],
    scan_finding: ['no evidence of metastatic disease', 'partial response per RECIST criteria', 'stable disease', 'progressive disease', 'complete metabolic response'],
    tumor_marker_status: ['within normal limits', 'elevated', 'trending downward', 'significantly increased', 'pending'],
    ecog_score: ['0', '1', '2', '3'],
    pathology_finding: ['invasive ductal carcinoma', 'adenocarcinoma with moderate differentiation', 'positive for malignant cells', 'negative margins', 'positive lymph node involvement'],
    timeframe: ['next week', '2 weeks', '3 months', '6 months', '1 year'],

    // Emergency
    accident_type: ['a motor vehicle collision', 'a fall from height', 'a workplace injury', 'a pedestrian-vehicle accident', 'a sports injury'],
    gcs_score: ['15', '14', '13', '12', '10'],
    o2_sat: ['98', '95', '92', '90', '88'],
    assessment_finding: ['hemodynamic stability', 'respiratory distress', 'altered mental status', 'multiple traumatic injuries', 'acute abdomen'],
    trauma_finding: ['no evidence of internal bleeding', 'pneumothorax on chest X-ray', 'pelvic fracture', 'head injury with loss of consciousness', 'abdominal tenderness with guarding'],
    mechanism_of_injury: ['direct impact to the abdomen', 'fall from approximately 10 feet', 'motor vehicle collision at high speed', 'crush injury', 'penetrating trauma'],
    condition: ['anaphylaxis', 'acute coronary syndrome', 'stroke', 'diabetic ketoacidosis', 'sepsis'],
    trigger: ['consuming shellfish', 'taking a new medication', 'exposure to allergen', 'uncontrolled diabetes', 'untreated infection'],
    troponin_result: ['elevated at 0.5 ng/mL', 'within normal limits', 'pending', 'trending upward', 'significantly elevated at 2.3 ng/mL'],

    // Gastroenterology
    gi_symptom: ['abdominal pain', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'dysphagia', 'heartburn', 'hematemesis'],
    abdominal_finding: ['tenderness in the right upper quadrant', 'diffuse tenderness without guarding', 'normal bowel sounds', 'hepatomegaly', 'splenomegaly', 'positive Murphy\'s sign'],
    gi_condition: ['GERD', 'peptic ulcer disease', 'irritable bowel syndrome', 'Crohn\'s disease', 'ulcerative colitis', 'celiac disease'],
    endoscopy_finding: ['gastric erythema', 'duodenal ulcer', 'Barrett\'s esophagus', 'normal colonic mucosa', 'internal hemorrhoids', 'colonic polyps'],
    stool_character: ['formed brown stool', 'loose watery stool', 'bloody stool', 'melena', 'clay-colored stool'],
    diet_effect: ['improved symptoms', 'had no effect on symptoms', 'worsened symptoms', 'provided temporary relief']
  };

  // Get context templates
  const contextTemplates = templates[prediction.context] || templates.general;

  // Select a template based on variation
  const templateIndex = (variation + Math.floor(Math.random() * 3)) % contextTemplates.length;
  const template = contextTemplates[templateIndex];

  // Create a template with specific terms if available
  let modifiedTemplate = template;
  if (specificTerms.length > 0) {
    // Try to incorporate specific terms into the template
    const term = specificTerms[variation % specificTerms.length];

    // Find a placeholder to replace with the specific term
    const placeholderMatch = template.match(/{(\w+)}/);
    if (placeholderMatch) {
      const placeholder = placeholderMatch[1];
      // Replace one instance of the placeholder with the specific term
      modifiedTemplate = template.replace(`{${placeholder}}`, term);
    }
  }

  // Replace placeholders
  return modifiedTemplate.replace(/{(\w+)}/g, (match, placeholder) => {
    const options = placeholders[placeholder];
    if (!options) return match;

    // Use variation to get different but deterministic results
    const optionIndex = (variation + placeholder.length + Math.floor(Math.random() * options.length)) % options.length;
    return options[optionIndex];
  });
}

/**
 * Get predictions based on enhanced usage patterns
 *
 * @param {Object} options - Options for prediction generation
 * @returns {Array<Object>} - Predictions
 */
function getPredictions(options = {}) {
  try {
    const predictions = [];
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentDay = currentTime.getDay();
    const aggressiveness = options.aggressiveness || predictionModel.adaptiveThresholds.cacheAggressiveness || 0.5;

    // Adjust threshold based on aggressiveness
    const effectiveThreshold = USAGE_PATTERN_THRESHOLD * (1 - aggressiveness);

    console.log(`Generating predictions with aggressiveness ${aggressiveness} (threshold: ${effectiveThreshold})`);

    // Get current usage context
    const recentEntries = usageLog.slice(-20); // Increased from 10 to 20 for better context
    let currentLanguagePair = null;
    let currentContext = null;
    let recentTerms = new Set();

    if (recentEntries.length > 0) {
      // Get the latest entry
      const latestEntry = recentEntries[recentEntries.length - 1];
      currentLanguagePair = `${latestEntry.sourceLanguage}-${latestEntry.targetLanguage}`;
      currentContext = latestEntry.context;

      // Collect recent terms
      recentEntries.forEach(entry => {
        entry.terms.forEach(term => recentTerms.add(term));
      });
    }

    // 1. Time-based predictions - what's commonly used at this time of day and day of week
    const timeBasedPredictions = getTimeBasedPredictions(currentHour, currentDay, effectiveThreshold);
    predictions.push(...timeBasedPredictions);

    // 2. Context-based predictions - based on current usage context
    if (currentLanguagePair && currentContext) {
      const contextBasedPredictions = getContextBasedPredictions(
        currentLanguagePair,
        currentContext,
        effectiveThreshold
      );
      predictions.push(...contextBasedPredictions);
    }

    // 3. Session-based predictions - based on common sequences in user sessions
    const sessionBasedPredictions = getSessionBasedPredictions(
      currentContext,
      effectiveThreshold
    );
    predictions.push(...sessionBasedPredictions);

    // 4. Term-based predictions - based on medical terms
    const termBasedPredictions = getTermBasedPredictions(
      Array.from(recentTerms),
      effectiveThreshold
    );
    predictions.push(...termBasedPredictions);

    // 5. Network-based predictions - based on offline patterns
    const networkBasedPredictions = getNetworkBasedPredictions(
      currentHour,
      effectiveThreshold
    );
    predictions.push(...networkBasedPredictions);

    // 6. High-score language pairs - based on combined score
    const highScorePredictions = getHighScorePredictions(
      currentLanguagePair,
      effectiveThreshold
    );
    predictions.push(...highScorePredictions);

    // Remove duplicates and sort by score
    const uniquePredictions = [];
    const seen = new Set();

    for (const prediction of predictions) {
      const key = `${prediction.sourceLanguage}-${prediction.targetLanguage}-${prediction.context}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniquePredictions.push(prediction);
      } else {
        // If duplicate, keep the one with the highest score
        const existingIndex = uniquePredictions.findIndex(p =>
          `${p.sourceLanguage}-${p.targetLanguage}-${p.context}` === key
        );

        if (existingIndex >= 0 && prediction.score > uniquePredictions[existingIndex].score) {
          uniquePredictions[existingIndex] = prediction;
        }
      }
    }

    // Sort by score
    uniquePredictions.sort((a, b) => b.score - a.score);

    // Limit number of predictions based on aggressiveness
    const limit = Math.max(10, Math.floor(PRE_CACHE_LIMIT * aggressiveness));
    const limitedPredictions = uniquePredictions.slice(0, limit);

    console.log(`Generated ${limitedPredictions.length} predictions (from ${uniquePredictions.length} unique candidates)`);

    return limitedPredictions;
  } catch (error) {
    console.error('Error getting predictions:', error);
    return [];
  }
}

/**
 * Get time-based predictions
 *
 * @param {number} currentHour - Current hour (0-23)
 * @param {number} currentDay - Current day (0-6)
 * @param {number} threshold - Probability threshold
 * @returns {Array<Object>} - Time-based predictions
 */
function getTimeBasedPredictions(currentHour, currentDay, threshold) {
  const predictions = [];

  // Check if we have time patterns
  if (!predictionModel.timePatterns) {
    return predictions;
  }

  // Get language pairs commonly used at this hour
  if (predictionModel.timePatterns.hourlyLanguagePairs[currentHour]) {
    const hourlyPairs = predictionModel.timePatterns.hourlyLanguagePairs[currentHour];
    const totalHourlyCount = Object.values(hourlyPairs).reduce((sum, count) => sum + count, 0);

    if (totalHourlyCount > 0) {
      for (const pair in hourlyPairs) {
        const probability = hourlyPairs[pair] / totalHourlyCount;

        if (probability > threshold) {
          const [sourceLanguage, targetLanguage] = pair.split('-');

          // Find best context for this pair at this hour
          let bestContext = 'general';

          if (predictionModel.languagePairs[pair] && predictionModel.languagePairs[pair].contexts) {
            const contexts = predictionModel.languagePairs[pair].contexts;
            let maxCount = 0;

            for (const context in contexts) {
              if (contexts[context] > maxCount) {
                maxCount = contexts[context];
                bestContext = context;
              }
            }
          }

          predictions.push({
            sourceLanguage,
            targetLanguage,
            context: bestContext,
            probability,
            score: probability * 0.9, // Slightly lower weight for time-based predictions
            reason: `common_at_hour_${currentHour}`
          });
        }
      }
    }
  }

  // Get language pairs commonly used on this day
  if (predictionModel.timePatterns.dailyLanguagePairs[currentDay]) {
    const dailyPairs = predictionModel.timePatterns.dailyLanguagePairs[currentDay];
    const totalDailyCount = Object.values(dailyPairs).reduce((sum, count) => sum + count, 0);

    if (totalDailyCount > 0) {
      for (const pair in dailyPairs) {
        const probability = dailyPairs[pair] / totalDailyCount;

        if (probability > threshold) {
          const [sourceLanguage, targetLanguage] = pair.split('-');

          // Find best context for this pair
          let bestContext = 'general';

          if (predictionModel.languagePairs[pair] && predictionModel.languagePairs[pair].contexts) {
            const contexts = predictionModel.languagePairs[pair].contexts;
            let maxCount = 0;

            for (const context in contexts) {
              if (contexts[context] > maxCount) {
                maxCount = contexts[context];
                bestContext = context;
              }
            }
          }

          predictions.push({
            sourceLanguage,
            targetLanguage,
            context: bestContext,
            probability,
            score: probability * 0.8, // Lower weight for day-based predictions
            reason: `common_on_${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay]}`
          });
        }
      }
    }
  }

  return predictions;
}

/**
 * Get context-based predictions
 *
 * @param {string} currentLanguagePair - Current language pair
 * @param {string} currentContext - Current context
 * @param {number} threshold - Probability threshold
 * @returns {Array<Object>} - Context-based predictions
 */
function getContextBasedPredictions(currentLanguagePair, currentContext, threshold) {
  const predictions = [];
  const [sourceLanguage, targetLanguage] = currentLanguagePair.split('-');

  // Add current language pair with different contexts
  const languagePairData = predictionModel.languagePairs[currentLanguagePair];

  if (languagePairData && languagePairData.contexts) {
    for (const context in languagePairData.contexts) {
      if (context !== currentContext && languagePairData.contexts[context] > threshold) {
        predictions.push({
          sourceLanguage,
          targetLanguage,
          context,
          probability: languagePairData.contexts[context],
          score: languagePairData.contexts[context] * 1.2, // Higher weight for context switches
          reason: 'context_switch'
        });
      }
    }
  }

  // Add context sequences
  if (predictionModel.sequences) {
    for (const seq in predictionModel.sequences) {
      if (seq.startsWith(`${currentContext}->`) &&
          predictionModel.sequences[seq].probability > threshold) {
        const nextContext = seq.split('->')[1];

        predictions.push({
          sourceLanguage,
          targetLanguage,
          context: nextContext,
          probability: predictionModel.sequences[seq].probability,
          score: predictionModel.sequences[seq].probability * 1.3, // Higher weight for sequences
          reason: 'context_sequence'
        });
      }
    }
  }

  // Add language pair sequences
  if (predictionModel.sequences) {
    for (const seq in predictionModel.sequences) {
      if (seq.startsWith(`${currentLanguagePair}->`) &&
          predictionModel.sequences[seq].probability > threshold) {
        const nextPair = seq.split('->')[1];
        const [nextSource, nextTarget] = nextPair.split('-');

        predictions.push({
          sourceLanguage: nextSource,
          targetLanguage: nextTarget,
          context: currentContext,
          probability: predictionModel.sequences[seq].probability,
          score: predictionModel.sequences[seq].probability * 1.1, // Slightly higher weight
          reason: 'language_sequence'
        });
      }
    }
  }

  // Add context transitions from user patterns
  if (predictionModel.userPatterns &&
      predictionModel.userPatterns.contextTransitions &&
      predictionModel.userPatterns.contextTransitions[currentContext]) {

    const transitions = predictionModel.userPatterns.contextTransitions[currentContext];

    for (const nextContext in transitions) {
      if (transitions[nextContext] > threshold) {
        predictions.push({
          sourceLanguage,
          targetLanguage,
          context: nextContext,
          probability: transitions[nextContext],
          score: transitions[nextContext] * 1.4, // Higher weight for user patterns
          reason: 'user_context_transition'
        });
      }
    }
  }

  return predictions;
}

/**
 * Get session-based predictions
 *
 * @param {string} currentContext - Current context
 * @param {number} threshold - Probability threshold
 * @returns {Array<Object>} - Session-based predictions
 */
function getSessionBasedPredictions(currentContext, threshold) {
  const predictions = [];

  // Check if we have user patterns
  if (!predictionModel.userPatterns || !predictionModel.userPatterns.commonSequences) {
    return predictions;
  }

  // Look for sequences that start with the current context
  for (const seqData of predictionModel.userPatterns.commonSequences) {
    const contexts = seqData.sequence.split('->');

    if (contexts[0] === currentContext && seqData.count > 1) {
      // This sequence starts with the current context
      // Add predictions for the next contexts in the sequence
      for (let i = 1; i < contexts.length; i++) {
        // Find the most common language pair for this context
        let bestPair = null;
        let bestScore = 0;

        for (const pair in predictionModel.languagePairs) {
          const pairData = predictionModel.languagePairs[pair];

          if (pairData.contexts &&
              pairData.contexts[contexts[i]] &&
              pairData.contexts[contexts[i]] > bestScore) {
            bestScore = pairData.contexts[contexts[i]];
            bestPair = pair;
          }
        }

        if (bestPair) {
          const [sourceLanguage, targetLanguage] = bestPair.split('-');
          const probability = seqData.count / 10; // Normalize

          if (probability > threshold) {
            predictions.push({
              sourceLanguage,
              targetLanguage,
              context: contexts[i],
              probability,
              score: probability * 1.5, // High weight for session sequences
              reason: 'session_sequence',
              sequencePosition: i
            });
          }
        }
      }
    }
  }

  return predictions;
}

/**
 * Get term-based predictions
 *
 * @param {Array<string>} recentTerms - Recent medical terms
 * @param {number} threshold - Probability threshold
 * @returns {Array<Object>} - Term-based predictions
 */
function getTermBasedPredictions(recentTerms, threshold) {
  const predictions = [];

  // Check if we have terms data
  if (!predictionModel.terms || recentTerms.length === 0) {
    return predictions;
  }

  // For each recent term, find related language pairs and contexts
  for (const term of recentTerms) {
    const termData = predictionModel.terms[term];

    if (!termData) {
      continue;
    }

    // Find language pairs associated with this term
    for (const pair in termData.languagePairs) {
      const pairCount = termData.languagePairs[pair];
      const probability = pairCount / termData.count;

      if (probability > threshold) {
        const [sourceLanguage, targetLanguage] = pair.split('-');

        // Find best context for this term and language pair
        let bestContext = 'general';
        let bestContextScore = 0;

        if (termData.contexts) {
          for (const context in termData.contexts) {
            if (termData.contexts[context] > bestContextScore) {
              bestContextScore = termData.contexts[context];
              bestContext = context;
            }
          }
        }

        predictions.push({
          sourceLanguage,
          targetLanguage,
          context: bestContext,
          terms: [term],
          probability,
          score: probability * 1.2, // Higher weight for term-based predictions
          reason: 'medical_term'
        });
      }
    }

    // Check if this term has time patterns
    if (termData.timeDistribution) {
      const currentHour = new Date().getHours();
      const hourlyProbability = termData.timeDistribution[currentHour];

      if (hourlyProbability > threshold) {
        // Find best language pair for this term
        let bestPair = null;
        let bestPairCount = 0;

        for (const pair in termData.languagePairs) {
          if (termData.languagePairs[pair] > bestPairCount) {
            bestPairCount = termData.languagePairs[pair];
            bestPair = pair;
          }
        }

        if (bestPair) {
          const [sourceLanguage, targetLanguage] = bestPair.split('-');

          predictions.push({
            sourceLanguage,
            targetLanguage,
            context: 'general',
            terms: [term],
            probability: hourlyProbability,
            score: hourlyProbability * 1.1, // Slightly higher weight
            reason: `term_common_at_hour_${currentHour}`
          });
        }
      }
    }
  }

  return predictions;
}

/**
 * Get network-based predictions
 *
 * @param {number} currentHour - Current hour (0-23)
 * @param {number} threshold - Probability threshold
 * @returns {Array<Object>} - Network-based predictions
 */
function getNetworkBasedPredictions(currentHour, threshold) {
  const predictions = [];

  // Check if we have network patterns
  if (!predictionModel.networkPatterns) {
    return predictions;
  }

  // Check if this hour has high offline probability
  const offlineHourProbability = predictionModel.networkPatterns.offlineTimeOfDay[currentHour] /
    predictionModel.networkPatterns.offlineTimeOfDay.reduce((sum, count) => sum + count, 1);

  if (offlineHourProbability > threshold) {
    // This hour has high probability of going offline
    // Add high-priority predictions for the most common language pairs

    // Sort language pairs by combined score
    const sortedPairs = Object.entries(predictionModel.languagePairs)
      .map(([pair, data]) => ({
        pair,
        score: data.combinedScore || data.probability || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 pairs

    for (const { pair, score } of sortedPairs) {
      const [sourceLanguage, targetLanguage] = pair.split('-');

      // Find best context for this pair
      let bestContext = 'general';
      let bestContextScore = 0;

      if (predictionModel.languagePairs[pair] && predictionModel.languagePairs[pair].contexts) {
        for (const context in predictionModel.languagePairs[pair].contexts) {
          if (predictionModel.languagePairs[pair].contexts[context] > bestContextScore) {
            bestContextScore = predictionModel.languagePairs[pair].contexts[context];
            bestContext = context;
          }
        }
      }

      predictions.push({
        sourceLanguage,
        targetLanguage,
        context: bestContext,
        probability: score,
        score: score * 1.5 * offlineHourProbability, // Higher weight for offline predictions
        reason: 'offline_risk',
        offlineProbability: offlineHourProbability
      });
    }
  }

  return predictions;
}

/**
 * Get high-score language pair predictions
 *
 * @param {string} currentLanguagePair - Current language pair
 * @param {number} threshold - Probability threshold
 * @returns {Array<Object>} - High-score predictions
 */
function getHighScorePredictions(currentLanguagePair, threshold) {
  const predictions = [];

  // Check if we have language pairs
  if (!predictionModel.languagePairs) {
    return predictions;
  }

  // Add high-score language pairs
  for (const pair in predictionModel.languagePairs) {
    const pairData = predictionModel.languagePairs[pair];

    if (pair !== currentLanguagePair &&
        pairData.combinedScore &&
        pairData.combinedScore > threshold) {

      const [sourceLanguage, targetLanguage] = pair.split('-');

      // Find the most common context for this pair
      let bestContext = 'general';
      let bestContextProb = 0;

      for (const context in pairData.contexts) {
        if (pairData.contexts[context] > bestContextProb) {
          bestContextProb = pairData.contexts[context];
          bestContext = context;
        }
      }

      predictions.push({
        sourceLanguage,
        targetLanguage,
        context: bestContext,
        probability: pairData.probability || 0,
        score: pairData.combinedScore,
        reason: 'high_score_pair',
        timeScore: pairData.timeScore || 0,
        recency: pairData.recency || 0
      });
    }
  }

  return predictions;
}

/**
 * Prioritize predicted content in cache
 *
 * @returns {Promise<Object>} - Prioritization result
 */
async function prioritizePredictedContent() {
  try {
    console.log('Prioritizing predicted content in cache...');

    // Get predictions
    const predictions = getPredictions();

    if (predictions.length === 0) {
      console.log('No predictions available for prioritization');
      return { success: false, reason: 'no_predictions' };
    }

    // Get current cache items
    const cacheItems = await cacheManager.getAllItems('translation');
    let prioritizedCount = 0;

    // Prioritize items that match predictions
    for (const item of cacheItems) {
      for (const prediction of predictions) {
        if (
          item.sourceLanguage === prediction.sourceLanguage &&
          item.targetLanguage === prediction.targetLanguage &&
          (item.context === prediction.context || !item.context)
        ) {
          // Set as priority item
          await cacheManager.setPriority(item.key, 'translation', true);
          prioritizedCount++;
          break;
        }
      }
    }

    console.log(`Prioritized ${prioritizedCount} cache items based on predictions`);

    return {
      success: true,
      prioritizedCount,
      totalItems: cacheItems.length
    };
  } catch (error) {
    console.error('Error prioritizing predicted content:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get usage statistics
 *
 * @returns {Object} - Usage statistics
 */
function getUsageStats() {
  try {
    // Calculate basic statistics
    const totalEntries = usageLog.length;
    const languagePairs = {};
    const contexts = {};
    const terms = {};
    const timeDistribution = {
      hour: Array(24).fill(0),
      weekday: Array(7).fill(0)
    };

    for (const entry of usageLog) {
      // Language pairs
      const pair = `${entry.sourceLanguage}-${entry.targetLanguage}`;
      languagePairs[pair] = (languagePairs[pair] || 0) + 1;

      // Contexts
      contexts[entry.context] = (contexts[entry.context] || 0) + 1;

      // Terms
      for (const term of entry.terms) {
        terms[term] = (terms[term] || 0) + 1;
      }

      // Time distribution
      const date = new Date(entry.timestamp);
      timeDistribution.hour[date.getHours()]++;
      timeDistribution.weekday[date.getDay()]++;
    }

    // Calculate percentages
    const languagePairStats = Object.entries(languagePairs).map(([pair, count]) => ({
      pair,
      count,
      percentage: (count / totalEntries) * 100
    })).sort((a, b) => b.count - a.count);

    const contextStats = Object.entries(contexts).map(([context, count]) => ({
      context,
      count,
      percentage: (count / totalEntries) * 100
    })).sort((a, b) => b.count - a.count);

    const termStats = Object.entries(terms).map(([term, count]) => ({
      term,
      count,
      percentage: (count / totalEntries) * 100
    })).sort((a, b) => b.count - a.count);

    // Calculate time distribution percentages
    const hourStats = timeDistribution.hour.map((count, hour) => ({
      hour,
      count,
      percentage: totalEntries > 0 ? (count / totalEntries) * 100 : 0
    }));

    const weekdayStats = timeDistribution.weekday.map((count, day) => ({
      day,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
      count,
      percentage: totalEntries > 0 ? (count / totalEntries) * 100 : 0
    }));

    return {
      totalEntries,
      languagePairs: languagePairStats,
      contexts: contextStats,
      terms: termStats.slice(0, 20), // Top 20 terms
      timeDistribution: {
        hour: hourStats,
        weekday: weekdayStats
      },
      predictionModel: {
        lastUpdated: predictionModel.lastUpdated,
        languagePairCount: Object.keys(predictionModel.languagePairs).length,
        sequenceCount: Object.keys(predictionModel.sequences).length
      }
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return { error: error.message };
  }
}

/**
 * Set the usage log (for testing purposes)
 *
 * @param {Array<Object>} newUsageLog - New usage log data
 */
function setUsageLog(newUsageLog) {
  if (Array.isArray(newUsageLog)) {
    usageLog = newUsageLog;
    console.log(`Usage log set with ${usageLog.length} entries`);

    // Save to file
    fs.writeFileSync(USAGE_LOG_FILE, JSON.stringify(usageLog, null, 2), 'utf8');
  }
}

// Export module
const predictiveCache = {
  initialize,
  logTranslationUsage,
  updatePredictionModel,
  preCachePredictedContent,
  prioritizePredictedContent,
  getUsageStats,
  getPredictions,
  setUsageLog,
  generateSampleText
};

module.exports = predictiveCache;
