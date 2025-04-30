/**
 * Optimized API Client for MedTranslate AI
 * 
 * This module provides an optimized API client with performance monitoring,
 * caching, and retry capabilities.
 */

import { API_BASE_URL } from '../config/api';
import * as PerformanceMonitor from './performance-monitor';
import * as CacheManager from './cache-manager';

// Default request options
const DEFAULT_OPTIONS = {
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 30 seconds
  retries: 2,
  useCache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  priority: 'normal' // 'high', 'normal', 'low'
};

// Request queue for prioritization
const requestQueue = {
  high: [],
  normal: [],
  low: []
};

// Active requests counter
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 6;

/**
 * Process the request queue
 * 
 * @returns {void}
 */
const processQueue = () => {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }
  
  // Process high priority requests first
  if (requestQueue.high.length > 0) {
    const request = requestQueue.high.shift();
    executeRequest(request);
    return;
  }
  
  // Then normal priority
  if (requestQueue.normal.length > 0) {
    const request = requestQueue.normal.shift();
    executeRequest(request);
    return;
  }
  
  // Finally low priority
  if (requestQueue.low.length > 0) {
    const request = requestQueue.low.shift();
    executeRequest(request);
  }
};

/**
 * Execute a request
 * 
 * @param {Object} request - Request object
 * @returns {Promise<any>} - Response data
 */
const executeRequest = async (request) => {
  const { url, options, resolve, reject, retryCount } = request;
  
  try {
    activeRequests++;
    
    const startTime = performance.now();
    const response = await fetch(url, options);
    const endTime = performance.now();
    
    // Track network request performance
    PerformanceMonitor.trackNetworkRequest(
      url,
      options.method || 'GET',
      startTime,
      endTime,
      response.ok,
      response.headers.get('content-length')
    );
    
    // Process response
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      // Cache successful response if caching is enabled
      if (options.useCache && options.method === 'GET') {
        CacheManager.set(url, data, options.cacheTTL);
      }
      
      resolve(data);
    } else {
      // Handle error response
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || response.statusText);
      error.status = response.status;
      error.data = errorData;
      
      // Retry if retries are available
      if (retryCount < options.retries) {
        // Add back to queue with incremented retry count
        const retryRequest = {
          ...request,
          retryCount: retryCount + 1
        };
        
        // Exponential backoff
        const backoff = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          requestQueue[options.priority].push(retryRequest);
          processQueue();
        }, backoff);
      } else {
        reject(error);
      }
    }
  } catch (error) {
    // Handle network errors
    if (retryCount < options.retries) {
      // Add back to queue with incremented retry count
      const retryRequest = {
        ...request,
        retryCount: retryCount + 1
      };
      
      // Exponential backoff
      const backoff = Math.pow(2, retryCount) * 1000;
      setTimeout(() => {
        requestQueue[options.priority].push(retryRequest);
        processQueue();
      }, backoff);
    } else {
      reject(error);
    }
  } finally {
    activeRequests--;
    processQueue();
  }
};

/**
 * Make an API request
 * 
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Promise<any>} - Response data
 */
export const request = (url, options = {}) => {
  // Merge default options
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    headers: {
      ...DEFAULT_OPTIONS.headers,
      ...options.headers
    }
  };
  
  // Ensure URL has base URL if it's a relative path
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  // Check cache for GET requests
  if (mergedOptions.useCache && mergedOptions.method === 'GET') {
    const cachedData = CacheManager.get(fullUrl);
    if (cachedData) {
      return Promise.resolve(cachedData);
    }
  }
  
  return new Promise((resolve, reject) => {
    // Add request to queue
    requestQueue[mergedOptions.priority].push({
      url: fullUrl,
      options: mergedOptions,
      resolve,
      reject,
      retryCount: 0
    });
    
    // Process queue
    processQueue();
  });
};

/**
 * Make a GET request
 * 
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Promise<any>} - Response data
 */
export const get = (url, options = {}) => {
  return request(url, {
    method: 'GET',
    ...options
  });
};

/**
 * Make a POST request
 * 
 * @param {string} url - Request URL
 * @param {Object} data - Request data
 * @param {Object} options - Request options
 * @returns {Promise<any>} - Response data
 */
export const post = (url, data, options = {}) => {
  return request(url, {
    method: 'POST',
    body: JSON.stringify(data),
    useCache: false,
    ...options
  });
};

/**
 * Make a PUT request
 * 
 * @param {string} url - Request URL
 * @param {Object} data - Request data
 * @param {Object} options - Request options
 * @returns {Promise<any>} - Response data
 */
export const put = (url, data, options = {}) => {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    useCache: false,
    ...options
  });
};

/**
 * Make a DELETE request
 * 
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Promise<any>} - Response data
 */
export const del = (url, options = {}) => {
  return request(url, {
    method: 'DELETE',
    useCache: false,
    ...options
  });
};

/**
 * Upload a file
 * 
 * @param {string} url - Request URL
 * @param {FormData} formData - Form data with file
 * @param {Object} options - Request options
 * @returns {Promise<any>} - Response data
 */
export const uploadFile = (url, formData, options = {}) => {
  return request(url, {
    method: 'POST',
    body: formData,
    headers: {
      // Don't set Content-Type, let the browser set it with the boundary
    },
    useCache: false,
    ...options
  });
};

/**
 * Clear the request cache
 * 
 * @returns {void}
 */
export const clearCache = () => {
  CacheManager.clear();
};

export default {
  request,
  get,
  post,
  put,
  delete: del,
  uploadFile,
  clearCache
};
