/**
 * Performance Monitor for MedTranslate AI
 *
 * This module provides utilities for monitoring and optimizing performance
 * in the MedTranslate AI application.
 */

import { InteractionManager } from 'react-native';
import * as AnalyticsService from '../services/analytics-service';

// Performance metrics
const metrics = {
  renderTimes: {},
  apiCalls: {},
  translations: {},
  frameDrops: 0,
  memoryWarnings: 0,
  interactionTimes: {},
  networkRequests: {},
  memoryUsage: [],
  resourceUsage: {
    cpu: [],
    memory: [],
    battery: []
  }
};

// Performance thresholds
const thresholds = {
  renderTime: 16, // ms (60fps)
  apiCallTime: 1000, // ms
  translationTime: 2000, // ms
  frameDropThreshold: 5, // consecutive frames
  interactionTime: 100, // ms
  networkRequestTime: 3000, // ms
  memoryUsageLimit: 200 // MB
};

/**
 * Initialize performance monitoring
 *
 * @returns {void}
 */
export const initialize = () => {
  // Reset metrics
  resetMetrics();

  // Start monitoring frame drops
  startFrameDropMonitoring();

  console.log('Performance monitoring initialized');
};

/**
 * Reset performance metrics
 *
 * @returns {void}
 */
export const resetMetrics = () => {
  metrics.renderTimes = {};
  metrics.apiCalls = {};
  metrics.translations = {};
  metrics.frameDrops = 0;
  metrics.memoryWarnings = 0;
  metrics.interactionTimes = {};
  metrics.networkRequests = {};
  metrics.memoryUsage = [];
  metrics.resourceUsage = {
    cpu: [],
    memory: [],
    battery: []
  };
};

/**
 * Start monitoring component render time
 *
 * @param {string} componentName - Component name
 * @returns {Function} - Function to call when render is complete
 */
export const startRenderTimer = (componentName) => {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Store render time
    if (!metrics.renderTimes[componentName]) {
      metrics.renderTimes[componentName] = [];
    }

    metrics.renderTimes[componentName].push(renderTime);

    // Check if render time exceeds threshold
    if (renderTime > thresholds.renderTime) {
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);

      // Track slow render
      AnalyticsService.trackPerformance('slow_render', renderTime, {
        componentName,
        threshold: thresholds.renderTime
      });
    }

    return renderTime;
  };
};

/**
 * Start monitoring API call time
 *
 * @param {string} apiName - API name
 * @returns {Function} - Function to call when API call is complete
 */
export const startApiCallTimer = (apiName) => {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const callTime = endTime - startTime;

    // Store API call time
    if (!metrics.apiCalls[apiName]) {
      metrics.apiCalls[apiName] = [];
    }

    metrics.apiCalls[apiName].push(callTime);

    // Check if API call time exceeds threshold
    if (callTime > thresholds.apiCallTime) {
      console.warn(`Slow API call detected for ${apiName}: ${callTime.toFixed(2)}ms`);

      // Track slow API call
      AnalyticsService.trackPerformance('slow_api_call', callTime, {
        apiName,
        threshold: thresholds.apiCallTime
      });
    }

    return callTime;
  };
};

/**
 * Start monitoring translation time
 *
 * @param {string} translationType - Translation type (text, audio)
 * @param {string} sourceLanguage - Source language
 * @param {string} targetLanguage - Target language
 * @returns {Function} - Function to call when translation is complete
 */
export const startTranslationTimer = (translationType, sourceLanguage, targetLanguage) => {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const translationTime = endTime - startTime;

    // Store translation time
    const key = `${translationType}_${sourceLanguage}_${targetLanguage}`;

    if (!metrics.translations[key]) {
      metrics.translations[key] = [];
    }

    metrics.translations[key].push(translationTime);

    // Check if translation time exceeds threshold
    if (translationTime > thresholds.translationTime) {
      console.warn(`Slow translation detected for ${key}: ${translationTime.toFixed(2)}ms`);

      // Track slow translation
      AnalyticsService.trackPerformance('slow_translation', translationTime, {
        translationType,
        sourceLanguage,
        targetLanguage,
        threshold: thresholds.translationTime
      });
    }

    return translationTime;
  };
};

/**
 * Start monitoring frame drops
 *
 * @returns {void}
 */
const startFrameDropMonitoring = () => {
  let lastFrameTime = performance.now();
  let consecutiveDrops = 0;

  const checkFrame = () => {
    const currentTime = performance.now();
    const frameDuration = currentTime - lastFrameTime;

    // Check if frame duration exceeds threshold (16.67ms for 60fps)
    if (frameDuration > 16.67 * 2) {
      consecutiveDrops++;

      if (consecutiveDrops >= thresholds.frameDropThreshold) {
        metrics.frameDrops++;

        console.warn(`Frame drop detected: ${frameDuration.toFixed(2)}ms`);

        // Track frame drop
        AnalyticsService.trackPerformance('frame_drop', frameDuration, {
          consecutiveDrops,
          threshold: thresholds.frameDropThreshold
        });

        consecutiveDrops = 0;
      }
    } else {
      consecutiveDrops = 0;
    }

    lastFrameTime = currentTime;

    // Schedule next frame check
    requestAnimationFrame(checkFrame);
  };

  // Start checking frames
  requestAnimationFrame(checkFrame);
};

/**
 * Get performance metrics
 *
 * @returns {Object} - Performance metrics
 */
export const getMetrics = () => {
  // Calculate average render times
  const averageRenderTimes = {};

  Object.keys(metrics.renderTimes).forEach(componentName => {
    const times = metrics.renderTimes[componentName];
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    averageRenderTimes[componentName] = average;
  });

  // Calculate average API call times
  const averageApiCallTimes = {};

  Object.keys(metrics.apiCalls).forEach(apiName => {
    const times = metrics.apiCalls[apiName];
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    averageApiCallTimes[apiName] = average;
  });

  // Calculate average translation times
  const averageTranslationTimes = {};

  Object.keys(metrics.translations).forEach(key => {
    const times = metrics.translations[key];
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    averageTranslationTimes[key] = average;
  });

  // Get network request metrics
  const networkRequestMetrics = {};

  Object.keys(metrics.networkRequests).forEach(key => {
    networkRequestMetrics[key] = {
      average: metrics.networkRequests[key].average,
      min: metrics.networkRequests[key].min,
      max: metrics.networkRequests[key].max,
      successRate: metrics.networkRequests[key].successRate,
      totalRequests: metrics.networkRequests[key].totalRequests
    };
  });

  // Get interaction time metrics
  const interactionTimeMetrics = {};

  Object.keys(metrics.interactionTimes).forEach(key => {
    interactionTimeMetrics[key] = {
      average: metrics.interactionTimes[key].average,
      min: metrics.interactionTimes[key].min,
      max: metrics.interactionTimes[key].max
    };
  });

  // Calculate average memory usage
  let averageMemoryUsage = 0;

  if (metrics.memoryUsage.length > 0) {
    averageMemoryUsage = metrics.memoryUsage.reduce((sum, item) => sum + item.value, 0) / metrics.memoryUsage.length;
  }

  return {
    renderTimes: averageRenderTimes,
    apiCallTimes: averageApiCallTimes,
    translationTimes: averageTranslationTimes,
    networkRequests: networkRequestMetrics,
    interactionTimes: interactionTimeMetrics,
    frameDrops: metrics.frameDrops,
    memoryWarnings: metrics.memoryWarnings,
    memoryUsage: {
      average: averageMemoryUsage,
      current: metrics.memoryUsage.length > 0 ? metrics.memoryUsage[metrics.memoryUsage.length - 1].value : 0,
      samples: metrics.memoryUsage.length
    },
    resourceUsage: {
      cpu: metrics.resourceUsage.cpu.length > 0 ? metrics.resourceUsage.cpu[metrics.resourceUsage.cpu.length - 1] : 0,
      memory: metrics.resourceUsage.memory.length > 0 ? metrics.resourceUsage.memory[metrics.resourceUsage.memory.length - 1] : 0,
      battery: metrics.resourceUsage.battery.length > 0 ? metrics.resourceUsage.battery[metrics.resourceUsage.battery.length - 1] : 0
    }
  };
};

/**
 * Run task after interactions
 *
 * @param {Function} task - Task to run
 * @param {string} taskName - Task name for tracking
 * @returns {Promise<any>} - Task result
 */
export const runAfterInteractions = async (task, taskName = 'unknown') => {
  return new Promise((resolve, reject) => {
    InteractionManager.runAfterInteractions(() => {
      try {
        const endTimer = startRenderTimer(`afterInteractions_${taskName}`);
        const result = task();
        endTimer();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Optimize animations for low-end devices
 *
 * @param {Object} animationConfig - Animation configuration
 * @returns {Object} - Optimized animation configuration
 */
export const optimizeAnimations = (animationConfig) => {
  // Check if we need to optimize for low-end devices
  const isLowEndDevice = metrics.frameDrops > 10;

  if (isLowEndDevice) {
    // Simplify animations for low-end devices
    return {
      ...animationConfig,
      duration: animationConfig.duration * 0.8, // Reduce duration
      useNativeDriver: true, // Force native driver
      isInteraction: false // Don't block interactions
    };
  }

  return animationConfig;
};

/**
 * Report memory warning
 *
 * @returns {void}
 */
export const reportMemoryWarning = () => {
  metrics.memoryWarnings++;

  console.warn('Memory warning detected');

  // Track memory warning
  AnalyticsService.trackPerformance('memory_warning', metrics.memoryWarnings);
};

/**
 * Track network request performance
 *
 * @param {string} url - Request URL
 * @param {string} method - HTTP method
 * @param {number} startTime - Request start time
 * @param {number} endTime - Request end time
 * @param {boolean} success - Whether the request was successful
 * @param {number} size - Response size in bytes (if available)
 * @returns {void}
 */
export const trackNetworkRequest = (url, method, startTime, endTime, success, size = 0) => {
  const duration = endTime - startTime;
  const urlKey = `${method}:${url}`;

  if (!metrics.networkRequests[urlKey]) {
    metrics.networkRequests[urlKey] = {
      samples: [],
      average: 0,
      min: Infinity,
      max: 0,
      successRate: 1,
      totalRequests: 0,
      successfulRequests: 0
    };
  }

  const requestData = metrics.networkRequests[urlKey];

  // Add sample
  requestData.samples.push({
    duration,
    success,
    size,
    timestamp: Date.now()
  });

  // Limit samples array size
  if (requestData.samples.length > 100) {
    requestData.samples.shift();
  }

  // Update stats
  requestData.totalRequests++;
  if (success) {
    requestData.successfulRequests++;
  }
  requestData.successRate = requestData.successfulRequests / requestData.totalRequests;

  const durations = requestData.samples.map(sample => sample.duration);
  requestData.average = durations.reduce((sum, time) => sum + time, 0) / durations.length;
  requestData.min = Math.min(requestData.min, duration);
  requestData.max = Math.max(requestData.max, duration);

  // Check if network request time exceeds threshold
  if (duration > thresholds.networkRequestTime) {
    console.warn(`Slow network request detected for ${method} ${url}: ${duration.toFixed(2)}ms`);

    // Track slow network request
    AnalyticsService.trackPerformance('slow_network_request', duration, {
      url,
      method,
      threshold: thresholds.networkRequestTime
    });
  }
};

/**
 * Track user interaction time
 *
 * @param {string} interactionType - Type of interaction (e.g., 'button-press', 'form-submit')
 * @param {string} componentName - Name of the component
 * @param {number} duration - Duration of the interaction in ms
 * @returns {void}
 */
export const trackInteraction = (interactionType, componentName, duration) => {
  const key = `${interactionType}:${componentName}`;

  if (!metrics.interactionTimes[key]) {
    metrics.interactionTimes[key] = {
      samples: [],
      average: 0,
      min: Infinity,
      max: 0
    };
  }

  const interactionData = metrics.interactionTimes[key];

  // Add sample
  interactionData.samples.push({
    duration,
    timestamp: Date.now()
  });

  // Limit samples array size
  if (interactionData.samples.length > 100) {
    interactionData.samples.shift();
  }

  // Update stats
  const durations = interactionData.samples.map(sample => sample.duration);
  interactionData.average = durations.reduce((sum, time) => sum + time, 0) / durations.length;
  interactionData.min = Math.min(interactionData.min, duration);
  interactionData.max = Math.max(interactionData.max, duration);

  // Check if interaction time exceeds threshold
  if (duration > thresholds.interactionTime) {
    console.warn(`Slow interaction detected for ${interactionType} in ${componentName}: ${duration.toFixed(2)}ms`);

    // Track slow interaction
    AnalyticsService.trackPerformance('slow_interaction', duration, {
      interactionType,
      componentName,
      threshold: thresholds.interactionTime
    });
  }
};

/**
 * Track memory usage
 *
 * @param {number} usedMemory - Used memory in MB
 * @returns {void}
 */
export const trackMemoryUsage = (usedMemory) => {
  metrics.memoryUsage.push({
    value: usedMemory,
    timestamp: Date.now()
  });

  // Limit samples array size
  if (metrics.memoryUsage.length > 100) {
    metrics.memoryUsage.shift();
  }

  // Check if memory usage exceeds threshold
  if (usedMemory > thresholds.memoryUsageLimit) {
    console.warn(`High memory usage detected: ${usedMemory.toFixed(2)} MB`);

    // Track high memory usage
    AnalyticsService.trackPerformance('high_memory_usage', usedMemory, {
      threshold: thresholds.memoryUsageLimit
    });
  }
};

/**
 * Create a performance-optimized version of a function
 *
 * @param {Function} fn - Function to optimize
 * @param {string} fnName - Function name for tracking
 * @returns {Function} - Optimized function
 */
export const optimizeFunction = (fn, fnName) => {
  return (...args) => {
    // For expensive functions, run after interactions
    return runAfterInteractions(() => fn(...args), fnName);
  };
};
