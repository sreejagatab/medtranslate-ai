/**
 * Mock WebSocket Service for MedTranslate AI
 * 
 * This service provides a mock implementation of the WebSocket service
 * for testing and development purposes.
 */

class MockWebSocketService {
  constructor() {
    this.connected = true;
    this.listeners = {
      message: [],
      open: [],
      close: [],
      error: []
    };
    this.requestHandlers = {
      get_cache_stats: this.handleCacheStatsRequest.bind(this)
    };
    
    // Mock data
    this.mockData = {
      cacheStats: {
        enabled: true,
        sizes: {
          translation: 250,
          audio: 50,
          total: 300
        },
        limit: 1000,
        ttl: 86400,
        hits: {
          translation: 150,
          audio: 30,
          total: 180
        },
        misses: {
          translation: 50,
          audio: 10,
          total: 60
        },
        evictions: {
          translation: 20,
          audio: 5,
          total: 25
        },
        hitRate: {
          translation: 0.75,
          audio: 0.75,
          total: 0.75
        },
        totalRequests: {
          translation: 200,
          audio: 40,
          total: 240
        },
        offlinePriorityItems: {
          translation: 30,
          audio: 10,
          total: 40
        },
        offlinePriorityThreshold: 5,
        lastReset: new Date().toISOString()
      },
      offlineReadiness: 75,
      offlineRisk: 0.3
    };
  }
  
  /**
   * Connect to the WebSocket server
   * 
   * @param {string} url - WebSocket URL
   * @returns {Promise<boolean>} - Connection success
   */
  connect(url) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = true;
        this.notifyListeners('open', { type: 'open' });
        resolve(true);
      }, 500);
    });
  }
  
  /**
   * Disconnect from the WebSocket server
   * 
   * @returns {Promise<boolean>} - Disconnection success
   */
  disconnect() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = false;
        this.notifyListeners('close', { type: 'close', code: 1000, reason: 'Normal closure' });
        resolve(true);
      }, 300);
    });
  }
  
  /**
   * Send a request to the WebSocket server
   * 
   * @param {Object} request - Request object
   * @returns {Promise<Object>} - Response object
   */
  sendRequest(request) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected'));
        return;
      }
      
      // Generate a request ID if not provided
      const requestId = request.requestId || `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const requestWithId = { ...request, requestId };
      
      // Handle the request based on its type
      const handler = this.requestHandlers[request.type];
      if (handler) {
        setTimeout(() => {
          try {
            const response = handler(requestWithId);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        }, 300);
      } else {
        reject(new Error(`Unsupported request type: ${request.type}`));
      }
    });
  }
  
  /**
   * Add an event listener
   * 
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  addEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }
  
  /**
   * Remove an event listener
   * 
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
  
  /**
   * Notify all listeners of an event
   * 
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
  
  /**
   * Handle cache stats request
   * 
   * @param {Object} request - Request object
   * @returns {Object} - Response object
   */
  handleCacheStatsRequest(request) {
    return {
      type: 'cache_stats',
      requestId: request.requestId,
      success: true,
      stats: this.mockData.cacheStats,
      offlineReadiness: this.mockData.offlineReadiness,
      offlineRisk: this.mockData.offlineRisk
    };
  }
  
  /**
   * Set mock data
   * 
   * @param {Object} data - Mock data
   */
  setMockData(data) {
    this.mockData = { ...this.mockData, ...data };
  }
  
  /**
   * Get connection status
   * 
   * @returns {boolean} - Connection status
   */
  isConnected() {
    return this.connected;
  }
}

// Create and export singleton instance
const mockWebSocketService = new MockWebSocketService();
export default mockWebSocketService;
