/**
 * Enhanced WebSocket Connection Analytics Service for MedTranslate AI
 *
 * This service collects and analyzes WebSocket connection metrics
 * to provide detailed insights into connection quality, performance,
 * and reliability. It includes advanced analytics for network conditions,
 * message delivery, and connection stability.
 */

class ConnectionAnalyticsService {
  constructor() {
    // Initialize metrics storage with time-based segmentation
    this.metrics = {
      connections: [],
      reconnections: [],
      messages: [],
      heartbeats: [],
      errors: [],
      networkQuality: []
    };

    // Initialize aggregated stats
    this.stats = {
      totalConnections: 0,
      totalReconnections: 0,
      totalMessages: 0,
      totalErrors: 0,
      averageLatency: 0,
      connectionSuccessRate: 100,
      messageSuccessRate: 100,
      // Enhanced metrics
      averageReconnectionTime: 0,
      messageDeliveryLatency: 0,
      networkStabilityScore: 100,
      disconnectionFrequency: 0,
      lastHourDisconnections: 0,
      peakMessageRate: 0,
      averageMessageSize: 0
    };

    // Initialize time-based metrics
    this.timeBasedMetrics = {
      lastHour: {
        connections: 0,
        reconnections: 0,
        messages: 0,
        errors: 0
      },
      lastDay: {
        connections: 0,
        reconnections: 0,
        messages: 0,
        errors: 0
      }
    };

    // Initialize connection history for trend analysis
    this.connectionHistory = [];
    this.maxHistoryLength = 100;

    // Set up event listeners
    this._setupEventListeners();

    // Set up periodic analytics updates
    this._setupPeriodicUpdates();
  }

  /**
   * Set up event listeners for WebSocket metrics
   *
   * @private
   */
  _setupEventListeners() {
    if (typeof window !== 'undefined') {
      // Listen for WebSocket metrics
      window.addEventListener('websocket-metric', (event) => {
        this._processMetric(event.detail);
      });

      // Listen for WebSocket logs
      window.addEventListener('websocket-log', (event) => {
        this._processLog(event.detail);
      });

      // Listen for max reconnect attempts reached
      window.addEventListener('websocket-max-reconnect', (event) => {
        this._processMaxReconnect(event.detail);
      });
    }
  }

  /**
   * Set up periodic updates for time-based analytics
   *
   * @private
   */
  _setupPeriodicUpdates() {
    // Update time-based metrics every minute
    setInterval(() => {
      this._updateTimeBasedMetrics();
      this._analyzeConnectionTrends();
    }, 60000);
  }

  /**
   * Process WebSocket metric
   *
   * @param {Object} metric - Metric data
   * @private
   */
  _processMetric(metric) {
    const timestamp = metric.timestamp || Date.now();
    const enhancedMetric = {
      ...metric,
      timestamp,
      sessionId: metric.sessionId || 'unknown',
      deviceInfo: this._getDeviceInfo()
    };

    // Store metric by category
    if (metric.name.includes('connection') || metric.name.includes('disconnect')) {
      this.metrics.connections.push(enhancedMetric);

      // Update connection stats
      if (metric.name === 'connection_success') {
        this.stats.totalConnections++;

        // Add to connection history for trend analysis
        this.connectionHistory.push({
          type: 'connect',
          timestamp,
          duration: metric.connectionTime || 0,
          networkQuality: metric.networkQuality || 'unknown'
        });

        // Limit history length
        if (this.connectionHistory.length > this.maxHistoryLength) {
          this.connectionHistory = this.connectionHistory.slice(-this.maxHistoryLength);
        }
      } else if (metric.name === 'disconnection') {
        // Add to connection history for trend analysis
        this.connectionHistory.push({
          type: 'disconnect',
          timestamp,
          reason: metric.reason || 'unknown',
          wasClean: metric.wasClean || false
        });

        // Limit history length
        if (this.connectionHistory.length > this.maxHistoryLength) {
          this.connectionHistory = this.connectionHistory.slice(-this.maxHistoryLength);
        }
      }
    } else if (metric.name.includes('reconnect')) {
      this.metrics.reconnections.push(enhancedMetric);

      // Update reconnection stats
      if (metric.name === 'reconnect_attempt') {
        this.stats.totalReconnections++;
      } else if (metric.name === 'reconnect_success' && metric.reconnectTime) {
        // Update average reconnection time
        if (this.stats.averageReconnectionTime === 0) {
          this.stats.averageReconnectionTime = metric.reconnectTime;
        } else {
          this.stats.averageReconnectionTime =
            (this.stats.averageReconnectionTime * 0.7) + (metric.reconnectTime * 0.3);
        }
      }
    } else if (metric.name.includes('message')) {
      this.metrics.messages.push(enhancedMetric);

      // Update message stats
      if (metric.name === 'message_sent' || metric.name === 'message_received') {
        this.stats.totalMessages++;

        // Update message size stats if available
        if (metric.size) {
          if (this.stats.averageMessageSize === 0) {
            this.stats.averageMessageSize = metric.size;
          } else {
            this.stats.averageMessageSize =
              (this.stats.averageMessageSize * 0.9) + (metric.size * 0.1);
          }
        }
      } else if (metric.name === 'message_delivery_latency') {
        // Update message delivery latency
        if (this.stats.messageDeliveryLatency === 0) {
          this.stats.messageDeliveryLatency = metric.value;
        } else {
          this.stats.messageDeliveryLatency =
            (this.stats.messageDeliveryLatency * 0.7) + (metric.value * 0.3);
        }
      }

      // Track peak message rate
      const recentMessages = this.metrics.messages.filter(m =>
        (Date.now() - m.timestamp) < 60000 // Last minute
      ).length;

      if (recentMessages > this.stats.peakMessageRate) {
        this.stats.peakMessageRate = recentMessages;
      }
    } else if (metric.name.includes('heartbeat')) {
      this.metrics.heartbeats.push(enhancedMetric);

      // Update latency stats if this is a heartbeat latency metric
      if (metric.name === 'heartbeat_latency') {
        this._updateLatencyStats(metric.value);
      }
    } else if (metric.name.includes('error')) {
      this.metrics.errors.push(enhancedMetric);

      // Update error stats
      this.stats.totalErrors++;
    } else if (metric.name.includes('network_quality')) {
      this.metrics.networkQuality.push(enhancedMetric);
    }

    // Update time-based metrics
    this._updateMetricInTimeWindow(metric);

    // Limit metrics storage (keep last 1000 of each type)
    this._limitMetricsStorage();

    // Update aggregated stats
    this._updateAggregatedStats();
  }

  /**
   * Update metric in time window buckets
   *
   * @param {Object} metric - Metric data
   * @private
   */
  _updateMetricInTimeWindow(metric) {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const timestamp = metric.timestamp || now;

    // Update last hour metrics
    if (timestamp >= oneHourAgo) {
      if (metric.name.includes('connection_success')) {
        this.timeBasedMetrics.lastHour.connections++;
      } else if (metric.name.includes('reconnect_attempt')) {
        this.timeBasedMetrics.lastHour.reconnections++;
      } else if (metric.name.includes('message_sent') || metric.name.includes('message_received')) {
        this.timeBasedMetrics.lastHour.messages++;
      } else if (metric.name.includes('error')) {
        this.timeBasedMetrics.lastHour.errors++;
      } else if (metric.name === 'disconnection') {
        this.stats.lastHourDisconnections++;
      }
    }

    // Update last day metrics
    if (timestamp >= oneDayAgo) {
      if (metric.name.includes('connection_success')) {
        this.timeBasedMetrics.lastDay.connections++;
      } else if (metric.name.includes('reconnect_attempt')) {
        this.timeBasedMetrics.lastDay.reconnections++;
      } else if (metric.name.includes('message_sent') || metric.name.includes('message_received')) {
        this.timeBasedMetrics.lastDay.messages++;
      } else if (metric.name.includes('error')) {
        this.timeBasedMetrics.lastDay.errors++;
      }
    }
  }

  /**
   * Update time-based metrics by filtering expired entries
   *
   * @private
   */
  _updateTimeBasedMetrics() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Reset hourly metrics
    this.timeBasedMetrics.lastHour = {
      connections: 0,
      reconnections: 0,
      messages: 0,
      errors: 0
    };

    // Reset daily metrics
    this.timeBasedMetrics.lastDay = {
      connections: 0,
      reconnections: 0,
      messages: 0,
      errors: 0
    };

    // Reset last hour disconnections
    this.stats.lastHourDisconnections = 0;

    // Count connections in last hour
    this.timeBasedMetrics.lastHour.connections = this.metrics.connections.filter(m =>
      m.timestamp >= oneHourAgo && m.name === 'connection_success'
    ).length;

    // Count reconnections in last hour
    this.timeBasedMetrics.lastHour.reconnections = this.metrics.reconnections.filter(m =>
      m.timestamp >= oneHourAgo && m.name === 'reconnect_attempt'
    ).length;

    // Count messages in last hour
    this.timeBasedMetrics.lastHour.messages = this.metrics.messages.filter(m =>
      m.timestamp >= oneHourAgo &&
      (m.name === 'message_sent' || m.name === 'message_received')
    ).length;

    // Count errors in last hour
    this.timeBasedMetrics.lastHour.errors = this.metrics.errors.filter(m =>
      m.timestamp >= oneHourAgo
    ).length;

    // Count disconnections in last hour
    this.stats.lastHourDisconnections = this.connectionHistory.filter(c =>
      c.timestamp >= oneHourAgo && c.type === 'disconnect'
    ).length;

    // Count connections in last day
    this.timeBasedMetrics.lastDay.connections = this.metrics.connections.filter(m =>
      m.timestamp >= oneDayAgo && m.name === 'connection_success'
    ).length;

    // Count reconnections in last day
    this.timeBasedMetrics.lastDay.reconnections = this.metrics.reconnections.filter(m =>
      m.timestamp >= oneDayAgo && m.name === 'reconnect_attempt'
    ).length;

    // Count messages in last day
    this.timeBasedMetrics.lastDay.messages = this.metrics.messages.filter(m =>
      m.timestamp >= oneDayAgo &&
      (m.name === 'message_sent' || m.name === 'message_received')
    ).length;

    // Count errors in last day
    this.timeBasedMetrics.lastDay.errors = this.metrics.errors.filter(m =>
      m.timestamp >= oneDayAgo
    ).length;

    // Calculate disconnection frequency (disconnections per hour)
    const totalHours = Math.max(1, this.connectionHistory.length > 0 ?
      (now - this.connectionHistory[0].timestamp) / (60 * 60 * 1000) : 1);

    const disconnections = this.connectionHistory.filter(c => c.type === 'disconnect').length;
    this.stats.disconnectionFrequency = disconnections / totalHours;

    // Update network stability score based on disconnection frequency
    this._updateNetworkStabilityScore();
  }

  /**
   * Analyze connection trends to detect patterns
   *
   * @private
   */
  _analyzeConnectionTrends() {
    if (this.connectionHistory.length < 5) return;

    // Analyze connection duration trend
    const connectEvents = this.connectionHistory.filter(c => c.type === 'connect');
    const disconnectEvents = this.connectionHistory.filter(c => c.type === 'disconnect');

    // Calculate average time between connections
    if (connectEvents.length >= 2) {
      let totalGap = 0;
      let gapCount = 0;

      for (let i = 1; i < connectEvents.length; i++) {
        const gap = connectEvents[i].timestamp - connectEvents[i-1].timestamp;
        if (gap > 0 && gap < 3600000) { // Only count gaps less than an hour
          totalGap += gap;
          gapCount++;
        }
      }

      if (gapCount > 0) {
        this.stats.averageConnectionGap = totalGap / gapCount;
      }
    }

    // Detect patterns in disconnections
    if (disconnectEvents.length >= 3) {
      // Check if disconnections are happening at regular intervals
      let regularIntervals = true;
      let intervalSum = 0;
      let intervalCount = 0;

      for (let i = 1; i < disconnectEvents.length; i++) {
        const interval = disconnectEvents[i].timestamp - disconnectEvents[i-1].timestamp;
        intervalSum += interval;
        intervalCount++;

        if (i >= 2) {
          const prevInterval = disconnectEvents[i-1].timestamp - disconnectEvents[i-2].timestamp;
          const variation = Math.abs(interval - prevInterval) / prevInterval;

          if (variation > 0.5) { // More than 50% variation
            regularIntervals = false;
          }
        }
      }

      if (regularIntervals && intervalCount > 0) {
        this.stats.regularDisconnectionInterval = intervalSum / intervalCount;
      } else {
        this.stats.regularDisconnectionInterval = null;
      }
    }
  }

  /**
   * Get basic device information for enhanced metrics
   *
   * @returns {Object} - Device information
   * @private
   */
  _getDeviceInfo() {
    if (typeof navigator === 'undefined') return {};

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      onLine: navigator.onLine
    };
  }

  /**
   * Process WebSocket log
   *
   * @param {Object} log - Log data
   * @private
   */
  _processLog(log) {
    // We could store logs here if needed
    // Currently we just use them for real-time monitoring

    // Check for specific error patterns
    if (log.level === 'error') {
      // Could trigger alerts or notifications here
    }
  }

  /**
   * Process max reconnect attempts reached event
   *
   * @param {Object} data - Event data
   * @private
   */
  _processMaxReconnect(data) {
    // Could trigger alerts or notifications here
    console.warn('WebSocket max reconnect attempts reached:', data);

    // Add to errors metrics
    this.metrics.errors.push({
      name: 'max_reconnect_attempts_reached',
      value: 1,
      timestamp: data.timestamp || Date.now(),
      connectionId: data.connectionId,
      sessionId: data.sessionId,
      attempts: data.attempts
    });

    // Update error stats
    this.stats.totalErrors++;

    // Update aggregated stats
    this._updateAggregatedStats();
  }

  /**
   * Update latency statistics
   *
   * @param {number} latency - Latency value in ms
   * @private
   */
  _updateLatencyStats(latency) {
    // Simple moving average
    if (this.stats.averageLatency === 0) {
      this.stats.averageLatency = latency;
    } else {
      // Weight recent values more heavily (70% new, 30% old)
      this.stats.averageLatency = 0.3 * this.stats.averageLatency + 0.7 * latency;
    }
  }

  /**
   * Update aggregated statistics
   *
   * @private
   */
  _updateAggregatedStats() {
    // Calculate connection success rate
    const connectionAttempts = this.metrics.connections.filter(m =>
      m.name === 'connection_success' || m.name === 'connection_error'
    ).length;

    const successfulConnections = this.metrics.connections.filter(m =>
      m.name === 'connection_success'
    ).length;

    if (connectionAttempts > 0) {
      this.stats.connectionSuccessRate = Math.round((successfulConnections / connectionAttempts) * 100);
    }

    // Calculate message success rate
    const messageSendAttempts = this.metrics.messages.filter(m =>
      m.name === 'message_sent' || m.name === 'message_send_error'
    ).length;

    const successfulMessages = this.metrics.messages.filter(m =>
      m.name === 'message_sent'
    ).length;

    if (messageSendAttempts > 0) {
      this.stats.messageSuccessRate = Math.round((successfulMessages / messageSendAttempts) * 100);
    }
  }

  /**
   * Update network stability score based on connection metrics
   *
   * @private
   */
  _updateNetworkStabilityScore() {
    // Calculate network stability score (0-100)
    // Based on disconnection frequency, error rate, and latency

    // Disconnection frequency score (lower is better)
    let disconnectionScore = 100;
    if (this.stats.disconnectionFrequency > 0) {
      // More than 6 disconnections per hour is very poor (score 0)
      // 0 disconnections per hour is excellent (score 100)
      disconnectionScore = Math.max(0, 100 - (this.stats.disconnectionFrequency * 16.67));
    }

    // Error rate score (lower is better)
    let errorScore = 100;
    if (this.stats.totalMessages > 0) {
      const errorRate = this.stats.totalErrors / this.stats.totalMessages;
      // More than 10% error rate is very poor (score 0)
      // 0% error rate is excellent (score 100)
      errorScore = Math.max(0, 100 - (errorRate * 1000));
    }

    // Latency score (lower is better)
    const latencyScore = this._calculateLatencyScore();

    // Weighted average (disconnections 40%, errors 30%, latency 30%)
    this.stats.networkStabilityScore = Math.round(
      0.4 * disconnectionScore +
      0.3 * errorScore +
      0.3 * latencyScore
    );

    // Ensure score is between 0 and 100
    this.stats.networkStabilityScore = Math.max(0, Math.min(100, this.stats.networkStabilityScore));
  }

  /**
   * Limit metrics storage to prevent memory issues
   *
   * @private
   */
  _limitMetricsStorage() {
    const MAX_METRICS = 1000;
    const MAX_NETWORK_QUALITY = 500;

    // Limit each category
    if (this.metrics.connections.length > MAX_METRICS) {
      this.metrics.connections = this.metrics.connections.slice(-MAX_METRICS);
    }

    if (this.metrics.reconnections.length > MAX_METRICS) {
      this.metrics.reconnections = this.metrics.reconnections.slice(-MAX_METRICS);
    }

    if (this.metrics.messages.length > MAX_METRICS) {
      this.metrics.messages = this.metrics.messages.slice(-MAX_METRICS);
    }

    if (this.metrics.heartbeats.length > MAX_METRICS) {
      this.metrics.heartbeats = this.metrics.heartbeats.slice(-MAX_METRICS);
    }

    if (this.metrics.errors.length > MAX_METRICS) {
      this.metrics.errors = this.metrics.errors.slice(-MAX_METRICS);
    }

    if (this.metrics.networkQuality.length > MAX_NETWORK_QUALITY) {
      this.metrics.networkQuality = this.metrics.networkQuality.slice(-MAX_NETWORK_QUALITY);
    }
  }

  /**
   * Get connection quality score (0-100)
   *
   * @returns {number} - Quality score
   */
  getConnectionQualityScore() {
    // Calculate quality score based on multiple factors
    const latencyScore = this._calculateLatencyScore();
    const stabilityScore = this._calculateStabilityScore();
    const errorScore = this._calculateErrorScore();

    // Weighted average (latency 30%, stability 50%, errors 20%)
    const qualityScore = Math.round(
      0.3 * latencyScore +
      0.5 * stabilityScore +
      0.2 * errorScore
    );

    return Math.max(0, Math.min(100, qualityScore));
  }

  /**
   * Calculate latency score (0-100)
   *
   * @returns {number} - Latency score
   * @private
   */
  _calculateLatencyScore() {
    const avgLatency = this.stats.averageLatency;

    // Excellent: < 50ms, Good: < 100ms, Fair: < 200ms, Poor: < 500ms, Bad: >= 500ms
    if (avgLatency < 50) {
      return 100;
    } else if (avgLatency < 100) {
      return 80;
    } else if (avgLatency < 200) {
      return 60;
    } else if (avgLatency < 500) {
      return 40;
    } else {
      return 20;
    }
  }

  /**
   * Calculate stability score (0-100)
   *
   * @returns {number} - Stability score
   * @private
   */
  _calculateStabilityScore() {
    // Use connection success rate and reconnection frequency
    const successRate = this.stats.connectionSuccessRate;

    // Get reconnection frequency (reconnections per connection)
    const reconnectionFrequency = this.stats.totalConnections > 0
      ? this.stats.totalReconnections / this.stats.totalConnections
      : 0;

    // Penalize for frequent reconnections
    let reconnectionPenalty = 0;
    if (reconnectionFrequency > 5) {
      reconnectionPenalty = 50;
    } else if (reconnectionFrequency > 2) {
      reconnectionPenalty = 30;
    } else if (reconnectionFrequency > 1) {
      reconnectionPenalty = 20;
    } else if (reconnectionFrequency > 0.5) {
      reconnectionPenalty = 10;
    }

    return Math.max(0, successRate - reconnectionPenalty);
  }

  /**
   * Calculate error score (0-100)
   *
   * @returns {number} - Error score
   * @private
   */
  _calculateErrorScore() {
    // Calculate error rate (errors per message)
    const errorRate = this.stats.totalMessages > 0
      ? this.stats.totalErrors / this.stats.totalMessages
      : 0;

    // Convert to score (lower error rate = higher score)
    if (errorRate === 0) {
      return 100;
    } else if (errorRate < 0.01) { // Less than 1% errors
      return 90;
    } else if (errorRate < 0.05) { // Less than 5% errors
      return 70;
    } else if (errorRate < 0.1) { // Less than 10% errors
      return 50;
    } else if (errorRate < 0.2) { // Less than 20% errors
      return 30;
    } else {
      return 10;
    }
  }

  /**
   * Get detailed connection statistics
   *
   * @param {boolean} includeTimeBasedMetrics - Whether to include time-based metrics
   * @returns {Object} - Connection statistics
   */
  getStats(includeTimeBasedMetrics = false) {
    const baseStats = {
      ...this.stats,
      qualityScore: this.getConnectionQualityScore(),
      qualityStatus: this.getConnectionQualityStatus(),
      stabilityScore: this.stats.networkStabilityScore,
      stabilityStatus: this._getNetworkStabilityStatus(),
      timestamp: new Date().toISOString()
    };

    if (includeTimeBasedMetrics) {
      return {
        ...baseStats,
        timeBasedMetrics: this.timeBasedMetrics,
        trends: this._getConnectionTrends()
      };
    }

    return baseStats;
  }

  /**
   * Get network stability status based on score
   *
   * @returns {string} - Network stability status
   * @private
   */
  _getNetworkStabilityStatus() {
    const score = this.stats.networkStabilityScore;

    if (score >= 90) {
      return 'very stable';
    } else if (score >= 75) {
      return 'stable';
    } else if (score >= 50) {
      return 'moderately stable';
    } else if (score >= 25) {
      return 'unstable';
    } else {
      return 'very unstable';
    }
  }

  /**
   * Get connection trends analysis
   *
   * @returns {Object} - Connection trends
   * @private
   */
  _getConnectionTrends() {
    const trends = {
      hasRegularDisconnections: !!this.stats.regularDisconnectionInterval,
      disconnectionPattern: null,
      messageRateTrend: 'stable',
      latencyTrend: 'stable'
    };

    // Analyze disconnection pattern
    if (trends.hasRegularDisconnections) {
      const intervalMinutes = this.stats.regularDisconnectionInterval / 60000;
      trends.disconnectionPattern = `Regular disconnections approximately every ${intervalMinutes.toFixed(1)} minutes`;
    }

    // Analyze message rate trend
    const recentMessages = this.metrics.messages.filter(m =>
      (Date.now() - m.timestamp) < 3600000 // Last hour
    );

    if (recentMessages.length >= 10) {
      // Split into two halves and compare
      const midpoint = Math.floor(recentMessages.length / 2);
      const firstHalf = recentMessages.slice(0, midpoint);
      const secondHalf = recentMessages.slice(midpoint);

      const firstHalfCount = firstHalf.length;
      const secondHalfCount = secondHalf.length;

      const changeRatio = secondHalfCount / firstHalfCount;

      if (changeRatio > 1.5) {
        trends.messageRateTrend = 'increasing';
      } else if (changeRatio < 0.67) {
        trends.messageRateTrend = 'decreasing';
      }
    }

    // Analyze latency trend
    const recentHeartbeats = this.metrics.heartbeats.filter(m =>
      (Date.now() - m.timestamp) < 3600000 && // Last hour
      m.name === 'heartbeat_latency'
    );

    if (recentHeartbeats.length >= 10) {
      // Split into two halves and compare
      const midpoint = Math.floor(recentHeartbeats.length / 2);
      const firstHalf = recentHeartbeats.slice(0, midpoint);
      const secondHalf = recentHeartbeats.slice(midpoint);

      const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

      const changeRatio = secondHalfAvg / firstHalfAvg;

      if (changeRatio > 1.3) {
        trends.latencyTrend = 'increasing (worse)';
      } else if (changeRatio < 0.7) {
        trends.latencyTrend = 'decreasing (better)';
      }
    }

    return trends;
  }

  /**
   * Get recent metrics by category
   *
   * @param {string} category - Metric category (connections, reconnections, messages, heartbeats, errors, networkQuality)
   * @param {number} count - Number of metrics to retrieve (default: 50)
   * @returns {Array} - Recent metrics
   */
  getMetrics(category, count = 50) {
    if (!this.metrics[category]) {
      return [];
    }

    // Return most recent metrics
    return this.metrics[category].slice(-count);
  }

  /**
   * Get connection quality status
   *
   * @returns {string} - Connection quality status (excellent, good, fair, poor, bad)
   */
  getConnectionQualityStatus() {
    const score = this.getConnectionQualityScore();

    if (score >= 90) {
      return 'excellent';
    } else if (score >= 70) {
      return 'good';
    } else if (score >= 50) {
      return 'fair';
    } else if (score >= 30) {
      return 'poor';
    } else {
      return 'bad';
    }
  }

  /**
   * Get detailed connection analytics report
   *
   * @returns {Object} - Detailed connection analytics report
   */
  getDetailedAnalyticsReport() {
    const now = new Date();

    return {
      timestamp: now.toISOString(),
      summary: {
        qualityScore: this.getConnectionQualityScore(),
        qualityStatus: this.getConnectionQualityStatus(),
        stabilityScore: this.stats.networkStabilityScore,
        stabilityStatus: this._getNetworkStabilityStatus(),
        recommendations: this.getConnectionRecommendations()
      },
      metrics: {
        connections: {
          total: this.stats.totalConnections,
          lastHour: this.timeBasedMetrics.lastHour.connections,
          lastDay: this.timeBasedMetrics.lastDay.connections,
          successRate: this.stats.connectionSuccessRate
        },
        reconnections: {
          total: this.stats.totalReconnections,
          lastHour: this.timeBasedMetrics.lastHour.reconnections,
          lastDay: this.timeBasedMetrics.lastDay.reconnections,
          averageTime: this.stats.averageReconnectionTime
        },
        messages: {
          total: this.stats.totalMessages,
          lastHour: this.timeBasedMetrics.lastHour.messages,
          lastDay: this.timeBasedMetrics.lastDay.messages,
          successRate: this.stats.messageSuccessRate,
          averageSize: this.stats.averageMessageSize,
          peakRate: this.stats.peakMessageRate
        },
        errors: {
          total: this.stats.totalErrors,
          lastHour: this.timeBasedMetrics.lastHour.errors,
          lastDay: this.timeBasedMetrics.lastDay.errors
        },
        performance: {
          averageLatency: this.stats.averageLatency,
          messageDeliveryLatency: this.stats.messageDeliveryLatency
        },
        stability: {
          disconnectionFrequency: this.stats.disconnectionFrequency,
          lastHourDisconnections: this.stats.lastHourDisconnections,
          hasRegularDisconnections: !!this.stats.regularDisconnectionInterval,
          disconnectionInterval: this.stats.regularDisconnectionInterval
        }
      },
      trends: this._getConnectionTrends()
    };
  }

  /**
   * Get connection recommendations based on quality and stability
   *
   * @param {boolean} detailed - Whether to include detailed recommendations
   * @returns {Array} - Array of recommendation objects with priority and message
   */
  getConnectionRecommendations(detailed = false) {
    const recommendations = [];
    const stats = this.stats;

    // Check latency
    if (stats.averageLatency > 300) {
      recommendations.push({
        priority: 'high',
        message: 'High latency detected. Consider checking network conditions or server load.',
        details: detailed ? `Average latency: ${stats.averageLatency.toFixed(0)}ms` : null
      });
    } else if (stats.averageLatency > 200) {
      recommendations.push({
        priority: 'medium',
        message: 'Elevated latency detected. Monitor network conditions.',
        details: detailed ? `Average latency: ${stats.averageLatency.toFixed(0)}ms` : null
      });
    }

    // Check disconnection frequency
    if (stats.disconnectionFrequency > 4) {
      recommendations.push({
        priority: 'high',
        message: 'Very frequent disconnections detected. Check for serious network stability issues.',
        details: detailed ? `Disconnection frequency: ${stats.disconnectionFrequency.toFixed(1)} per hour` : null
      });
    } else if (stats.disconnectionFrequency > 2) {
      recommendations.push({
        priority: 'medium',
        message: 'Frequent disconnections detected. Check for network stability issues.',
        details: detailed ? `Disconnection frequency: ${stats.disconnectionFrequency.toFixed(1)} per hour` : null
      });
    }

    // Check for regular disconnection patterns
    if (stats.regularDisconnectionInterval) {
      const intervalMinutes = stats.regularDisconnectionInterval / 60000;
      recommendations.push({
        priority: 'medium',
        message: `Regular disconnection pattern detected approximately every ${intervalMinutes.toFixed(1)} minutes. This may indicate a system issue.`,
        details: detailed ? 'Consider checking for scheduled network tasks or server maintenance.' : null
      });
    }

    // Check error rate
    if (stats.totalMessages > 0) {
      const errorRate = stats.totalErrors / stats.totalMessages;

      if (errorRate > 0.1) {
        recommendations.push({
          priority: 'high',
          message: 'High error rate detected. Verify message format and server handling.',
          details: detailed ? `Error rate: ${(errorRate * 100).toFixed(1)}%` : null
        });
      } else if (errorRate > 0.05) {
        recommendations.push({
          priority: 'medium',
          message: 'Elevated error rate detected. Monitor message handling.',
          details: detailed ? `Error rate: ${(errorRate * 100).toFixed(1)}%` : null
        });
      }
    }

    // Check connection success rate
    if (stats.connectionSuccessRate < 80) {
      recommendations.push({
        priority: 'high',
        message: 'Very low connection success rate. Check authentication and server availability.',
        details: detailed ? `Connection success rate: ${stats.connectionSuccessRate}%` : null
      });
    } else if (stats.connectionSuccessRate < 90) {
      recommendations.push({
        priority: 'medium',
        message: 'Low connection success rate. Monitor authentication and server availability.',
        details: detailed ? `Connection success rate: ${stats.connectionSuccessRate}%` : null
      });
    }

    // Check message success rate
    if (stats.messageSuccessRate < 90) {
      recommendations.push({
        priority: 'high',
        message: 'Significant message delivery issues detected. Check message size and rate limits.',
        details: detailed ? `Message success rate: ${stats.messageSuccessRate}%` : null
      });
    } else if (stats.messageSuccessRate < 95) {
      recommendations.push({
        priority: 'medium',
        message: 'Some message delivery issues detected. Monitor message handling.',
        details: detailed ? `Message success rate: ${stats.messageSuccessRate}%` : null
      });
    }

    // Check message delivery latency
    if (stats.messageDeliveryLatency > 500) {
      recommendations.push({
        priority: 'medium',
        message: 'High message delivery latency detected. This may affect real-time communication.',
        details: detailed ? `Message delivery latency: ${stats.messageDeliveryLatency.toFixed(0)}ms` : null
      });
    }

    // If everything looks good
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'info',
        message: 'Connection quality is good. No issues detected.',
        details: null
      });
    }

    // Sort by priority (high, medium, info)
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, info: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Reset metrics and statistics
   */
  reset() {
    // Reset metrics storage
    this.metrics = {
      connections: [],
      reconnections: [],
      messages: [],
      heartbeats: [],
      errors: []
    };

    // Reset aggregated stats
    this.stats = {
      totalConnections: 0,
      totalReconnections: 0,
      totalMessages: 0,
      totalErrors: 0,
      averageLatency: 0,
      connectionSuccessRate: 100,
      messageSuccessRate: 100
    };
  }
}

// Create singleton instance
const connectionAnalytics = new ConnectionAnalyticsService();

export default connectionAnalytics;
