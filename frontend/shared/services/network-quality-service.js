/**
 * Network Quality Service for MedTranslate AI
 * 
 * This service provides advanced network quality detection and monitoring
 * to help optimize WebSocket connection strategies.
 */

class NetworkQualityService {
  constructor() {
    // Initialize state
    this.measurements = {
      latency: [],
      throughput: [],
      packetLoss: [],
      jitter: []
    };
    
    this.networkType = 'unknown';
    this.networkQuality = 'unknown';
    this.lastMeasurement = null;
    this.measurementInProgress = false;
    this.measurementInterval = null;
    this.listeners = new Set();
    
    // Network quality thresholds
    this.thresholds = {
      excellent: {
        latency: 100,      // ms
        jitter: 20,        // ms
        packetLoss: 0.01,  // 1%
        throughput: 1000   // kbps
      },
      good: {
        latency: 200,      // ms
        jitter: 50,        // ms
        packetLoss: 0.03,  // 3%
        throughput: 500    // kbps
      },
      fair: {
        latency: 400,      // ms
        jitter: 100,       // ms
        packetLoss: 0.05,  // 5%
        throughput: 250    // kbps
      },
      poor: {
        latency: 800,      // ms
        jitter: 200,       // ms
        packetLoss: 0.10,  // 10%
        throughput: 100    // kbps
      }
      // Anything worse than poor is considered "bad"
    };
    
    // Reconnection strategy parameters
    this.reconnectionStrategies = {
      excellent: {
        maxReconnectAttempts: 10,
        initialReconnectDelay: 500,
        maxReconnectDelay: 10000,
        reconnectBackoffFactor: 1.3,
        heartbeatInterval: 30000,
        heartbeatTimeout: 5000
      },
      good: {
        maxReconnectAttempts: 15,
        initialReconnectDelay: 1000,
        maxReconnectDelay: 15000,
        reconnectBackoffFactor: 1.5,
        heartbeatInterval: 25000,
        heartbeatTimeout: 7000
      },
      fair: {
        maxReconnectAttempts: 20,
        initialReconnectDelay: 2000,
        maxReconnectDelay: 30000,
        reconnectBackoffFactor: 1.7,
        heartbeatInterval: 20000,
        heartbeatTimeout: 10000
      },
      poor: {
        maxReconnectAttempts: 30,
        initialReconnectDelay: 3000,
        maxReconnectDelay: 60000,
        reconnectBackoffFactor: 2.0,
        heartbeatInterval: 15000,
        heartbeatTimeout: 15000
      },
      bad: {
        maxReconnectAttempts: 50,
        initialReconnectDelay: 5000,
        maxReconnectDelay: 120000,
        reconnectBackoffFactor: 2.5,
        heartbeatInterval: 10000,
        heartbeatTimeout: 20000
      }
    };
    
    // Bind methods
    this._handleNetworkTypeChange = this._handleNetworkTypeChange.bind(this);
    
    // Set up network type detection
    this._setupNetworkTypeDetection();
  }
  
  /**
   * Set up network type detection
   * 
   * @private
   */
  _setupNetworkTypeDetection() {
    // Use navigator.connection if available (modern browsers)
    if (typeof navigator !== 'undefined' && navigator.connection) {
      const connection = navigator.connection;
      
      // Get initial network type
      this.networkType = connection.type || connection.effectiveType || 'unknown';
      
      // Listen for changes
      connection.addEventListener('change', this._handleNetworkTypeChange);
    }
  }
  
  /**
   * Handle network type change
   * 
   * @private
   */
  _handleNetworkTypeChange(event) {
    if (typeof navigator !== 'undefined' && navigator.connection) {
      const connection = navigator.connection;
      const oldNetworkType = this.networkType;
      
      // Update network type
      this.networkType = connection.type || connection.effectiveType || 'unknown';
      
      // Log change
      console.log(`Network type changed from ${oldNetworkType} to ${this.networkType}`);
      
      // Trigger measurement
      this.measureNetworkQuality();
      
      // Notify listeners
      this._notifyListeners({
        type: 'networkTypeChange',
        oldNetworkType,
        newNetworkType: this.networkType
      });
    }
  }
  
  /**
   * Start periodic network quality measurements
   * 
   * @param {number} interval - Measurement interval in ms (default: 60000)
   */
  startPeriodicMeasurements(interval = 60000) {
    // Clear existing interval
    this.stopPeriodicMeasurements();
    
    // Set up new interval
    this.measurementInterval = setInterval(() => {
      this.measureNetworkQuality();
    }, interval);
    
    // Perform initial measurement
    this.measureNetworkQuality();
  }
  
  /**
   * Stop periodic network quality measurements
   */
  stopPeriodicMeasurements() {
    if (this.measurementInterval) {
      clearInterval(this.measurementInterval);
      this.measurementInterval = null;
    }
  }
  
  /**
   * Measure network quality
   * 
   * @returns {Promise<Object>} - Network quality metrics
   */
  async measureNetworkQuality() {
    // Prevent concurrent measurements
    if (this.measurementInProgress) {
      return this.lastMeasurement;
    }
    
    this.measurementInProgress = true;
    
    try {
      // Measure latency
      const latency = await this._measureLatency();
      
      // Measure packet loss
      const packetLoss = await this._measurePacketLoss();
      
      // Measure jitter
      const jitter = await this._calculateJitter();
      
      // Measure throughput (if possible)
      const throughput = await this._measureThroughput();
      
      // Calculate overall network quality
      const networkQuality = this._calculateNetworkQuality(latency, jitter, packetLoss, throughput);
      
      // Update state
      this.measurements.latency.push(latency);
      this.measurements.jitter.push(jitter);
      this.measurements.packetLoss.push(packetLoss);
      this.measurements.throughput.push(throughput);
      
      // Limit history to last 10 measurements
      this._limitMeasurementHistory();
      
      // Update network quality
      const oldNetworkQuality = this.networkQuality;
      this.networkQuality = networkQuality;
      
      // Create measurement object
      const measurement = {
        timestamp: Date.now(),
        networkType: this.networkType,
        networkQuality,
        metrics: {
          latency,
          jitter,
          packetLoss,
          throughput
        }
      };
      
      // Store last measurement
      this.lastMeasurement = measurement;
      
      // Notify listeners if quality changed
      if (oldNetworkQuality !== networkQuality) {
        this._notifyListeners({
          type: 'networkQualityChange',
          oldNetworkQuality,
          newNetworkQuality: networkQuality,
          measurement
        });
      }
      
      return measurement;
    } catch (error) {
      console.error('Error measuring network quality:', error);
      return null;
    } finally {
      this.measurementInProgress = false;
    }
  }
  
  /**
   * Measure network latency
   * 
   * @returns {Promise<number>} - Latency in ms
   * @private
   */
  async _measureLatency() {
    try {
      const startTime = Date.now();
      
      // Use a small image or API endpoint for latency measurement
      // The endpoint should be as lightweight as possible
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-store',
        mode: 'no-cors'
      });
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      return latency;
    } catch (error) {
      console.error('Error measuring latency:', error);
      
      // Return a high latency value on error
      return 2000;
    }
  }
  
  /**
   * Measure packet loss
   * 
   * @returns {Promise<number>} - Packet loss rate (0-1)
   * @private
   */
  async _measurePacketLoss() {
    try {
      // Perform multiple latency measurements
      const attempts = 5;
      let successCount = 0;
      
      for (let i = 0; i < attempts; i++) {
        try {
          await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            cache: 'no-store',
            mode: 'no-cors',
            // Short timeout to detect failures
            signal: AbortSignal.timeout(2000)
          });
          
          successCount++;
        } catch (error) {
          // Count as packet loss
        }
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Calculate packet loss rate
      const packetLoss = (attempts - successCount) / attempts;
      
      return packetLoss;
    } catch (error) {
      console.error('Error measuring packet loss:', error);
      
      // Return a high packet loss value on error
      return 0.5;
    }
  }
  
  /**
   * Calculate jitter from latency measurements
   * 
   * @returns {Promise<number>} - Jitter in ms
   * @private
   */
  async _calculateJitter() {
    try {
      // Perform multiple latency measurements
      const attempts = 5;
      const latencies = [];
      
      for (let i = 0; i < attempts; i++) {
        const latency = await this._measureLatency();
        latencies.push(latency);
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Calculate jitter as standard deviation of latencies
      const mean = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
      const squaredDiffs = latencies.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
      const jitter = Math.sqrt(variance);
      
      return jitter;
    } catch (error) {
      console.error('Error calculating jitter:', error);
      
      // Return a high jitter value on error
      return 200;
    }
  }
  
  /**
   * Measure network throughput
   * 
   * @returns {Promise<number>} - Throughput in kbps
   * @private
   */
  async _measureThroughput() {
    try {
      // Use navigator.connection.downlink if available
      if (typeof navigator !== 'undefined' && 
          navigator.connection && 
          navigator.connection.downlink) {
        return navigator.connection.downlink * 1000; // Convert Mbps to kbps
      }
      
      // Fallback: download a small file and measure throughput
      const startTime = Date.now();
      
      // Use a small image (about 50KB)
      const response = await fetch('https://picsum.photos/200', {
        cache: 'no-store'
      });
      
      const blob = await response.blob();
      const endTime = Date.now();
      
      // Calculate throughput in kbps
      const fileSizeInBits = blob.size * 8;
      const durationInSeconds = (endTime - startTime) / 1000;
      const throughput = (fileSizeInBits / durationInSeconds) / 1000;
      
      return throughput;
    } catch (error) {
      console.error('Error measuring throughput:', error);
      
      // Return a low throughput value on error
      return 50;
    }
  }
  
  /**
   * Calculate overall network quality
   * 
   * @param {number} latency - Latency in ms
   * @param {number} jitter - Jitter in ms
   * @param {number} packetLoss - Packet loss rate (0-1)
   * @param {number} throughput - Throughput in kbps
   * @returns {string} - Network quality ('excellent', 'good', 'fair', 'poor', 'bad')
   * @private
   */
  _calculateNetworkQuality(latency, jitter, packetLoss, throughput) {
    // Check if metrics meet excellent thresholds
    if (latency <= this.thresholds.excellent.latency &&
        jitter <= this.thresholds.excellent.jitter &&
        packetLoss <= this.thresholds.excellent.packetLoss &&
        throughput >= this.thresholds.excellent.throughput) {
      return 'excellent';
    }
    
    // Check if metrics meet good thresholds
    if (latency <= this.thresholds.good.latency &&
        jitter <= this.thresholds.good.jitter &&
        packetLoss <= this.thresholds.good.packetLoss &&
        throughput >= this.thresholds.good.throughput) {
      return 'good';
    }
    
    // Check if metrics meet fair thresholds
    if (latency <= this.thresholds.fair.latency &&
        jitter <= this.thresholds.fair.jitter &&
        packetLoss <= this.thresholds.fair.packetLoss &&
        throughput >= this.thresholds.fair.throughput) {
      return 'fair';
    }
    
    // Check if metrics meet poor thresholds
    if (latency <= this.thresholds.poor.latency &&
        jitter <= this.thresholds.poor.jitter &&
        packetLoss <= this.thresholds.poor.packetLoss &&
        throughput >= this.thresholds.poor.throughput) {
      return 'poor';
    }
    
    // Otherwise, network quality is bad
    return 'bad';
  }
  
  /**
   * Limit measurement history
   * 
   * @private
   */
  _limitMeasurementHistory() {
    const MAX_HISTORY = 10;
    
    if (this.measurements.latency.length > MAX_HISTORY) {
      this.measurements.latency = this.measurements.latency.slice(-MAX_HISTORY);
    }
    
    if (this.measurements.jitter.length > MAX_HISTORY) {
      this.measurements.jitter = this.measurements.jitter.slice(-MAX_HISTORY);
    }
    
    if (this.measurements.packetLoss.length > MAX_HISTORY) {
      this.measurements.packetLoss = this.measurements.packetLoss.slice(-MAX_HISTORY);
    }
    
    if (this.measurements.throughput.length > MAX_HISTORY) {
      this.measurements.throughput = this.measurements.throughput.slice(-MAX_HISTORY);
    }
  }
  
  /**
   * Get average metrics
   * 
   * @returns {Object} - Average metrics
   */
  getAverageMetrics() {
    const calculateAverage = (arr) => {
      if (arr.length === 0) return 0;
      return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    };
    
    return {
      latency: calculateAverage(this.measurements.latency),
      jitter: calculateAverage(this.measurements.jitter),
      packetLoss: calculateAverage(this.measurements.packetLoss),
      throughput: calculateAverage(this.measurements.throughput)
    };
  }
  
  /**
   * Get current network quality
   * 
   * @returns {string} - Network quality
   */
  getNetworkQuality() {
    return this.networkQuality;
  }
  
  /**
   * Get current network type
   * 
   * @returns {string} - Network type
   */
  getNetworkType() {
    return this.networkType;
  }
  
  /**
   * Get recommended reconnection strategy based on network quality
   * 
   * @returns {Object} - Reconnection strategy parameters
   */
  getReconnectionStrategy() {
    return this.reconnectionStrategies[this.networkQuality] || this.reconnectionStrategies.fair;
  }
  
  /**
   * Add network quality change listener
   * 
   * @param {Function} listener - Listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }
  
  /**
   * Remove network quality change listener
   * 
   * @param {Function} listener - Listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }
  
  /**
   * Notify listeners of changes
   * 
   * @param {Object} event - Event object
   * @private
   */
  _notifyListeners(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in network quality listener:', error);
      }
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Stop periodic measurements
    this.stopPeriodicMeasurements();
    
    // Remove network type change listener
    if (typeof navigator !== 'undefined' && navigator.connection) {
      navigator.connection.removeEventListener('change', this._handleNetworkTypeChange);
    }
    
    // Clear listeners
    this.listeners.clear();
  }
}

// Create singleton instance
const networkQualityService = new NetworkQualityService();

export default networkQualityService;
