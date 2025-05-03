/**
 * Tests for the Enhanced Connection Analytics Service
 */

import connectionAnalytics from '../connection-analytics';

// Mock Date.now() to return a consistent timestamp
const NOW = 1625097600000; // 2021-07-01T00:00:00.000Z
global.Date.now = jest.fn(() => NOW);

describe('ConnectionAnalyticsService', () => {
  beforeEach(() => {
    // Reset the service before each test
    connectionAnalytics.reset();
    
    // Mock navigator for device info
    global.navigator = {
      userAgent: 'test-user-agent',
      platform: 'test-platform',
      language: 'en-US',
      onLine: true
    };
  });

  // Test basic metrics processing
  test('processes connection metrics correctly', () => {
    // Simulate connection success
    connectionAnalytics._processMetric({
      name: 'connection_success',
      value: 1,
      connectionTime: 150
    });
    
    // Check that the metric was processed
    expect(connectionAnalytics.stats.totalConnections).toBe(1);
    expect(connectionAnalytics.metrics.connections.length).toBe(1);
    expect(connectionAnalytics.connectionHistory.length).toBe(1);
    expect(connectionAnalytics.connectionHistory[0].type).toBe('connect');
  });

  test('processes reconnection metrics correctly', () => {
    // Simulate reconnection attempt
    connectionAnalytics._processMetric({
      name: 'reconnect_attempt',
      value: 1
    });
    
    // Simulate reconnection success
    connectionAnalytics._processMetric({
      name: 'reconnect_success',
      value: 1,
      reconnectTime: 500
    });
    
    // Check that the metrics were processed
    expect(connectionAnalytics.stats.totalReconnections).toBe(1);
    expect(connectionAnalytics.metrics.reconnections.length).toBe(2);
    expect(connectionAnalytics.stats.averageReconnectionTime).toBe(500);
  });

  test('processes message metrics correctly', () => {
    // Simulate message sent
    connectionAnalytics._processMetric({
      name: 'message_sent',
      value: 1,
      size: 100
    });
    
    // Simulate message received
    connectionAnalytics._processMetric({
      name: 'message_received',
      value: 1,
      size: 200
    });
    
    // Check that the metrics were processed
    expect(connectionAnalytics.stats.totalMessages).toBe(2);
    expect(connectionAnalytics.metrics.messages.length).toBe(2);
    expect(connectionAnalytics.stats.averageMessageSize).toBeGreaterThan(0);
  });

  test('processes error metrics correctly', () => {
    // Simulate error
    connectionAnalytics._processMetric({
      name: 'error',
      value: 1,
      errorType: 'connection_error'
    });
    
    // Check that the metric was processed
    expect(connectionAnalytics.stats.totalErrors).toBe(1);
    expect(connectionAnalytics.metrics.errors.length).toBe(1);
  });

  // Test time-based metrics
  test('updates time-based metrics correctly', () => {
    // Simulate metrics from the last hour
    const oneHourAgo = NOW - 30 * 60 * 1000; // 30 minutes ago
    
    connectionAnalytics._processMetric({
      name: 'connection_success',
      value: 1,
      timestamp: oneHourAgo
    });
    
    connectionAnalytics._processMetric({
      name: 'reconnect_attempt',
      value: 1,
      timestamp: oneHourAgo + 5 * 60 * 1000
    });
    
    connectionAnalytics._processMetric({
      name: 'message_sent',
      value: 1,
      timestamp: oneHourAgo + 10 * 60 * 1000
    });
    
    connectionAnalytics._processMetric({
      name: 'error',
      value: 1,
      timestamp: oneHourAgo + 15 * 60 * 1000
    });
    
    // Update time-based metrics
    connectionAnalytics._updateTimeBasedMetrics();
    
    // Check that the time-based metrics were updated
    expect(connectionAnalytics.timeBasedMetrics.lastHour.connections).toBe(1);
    expect(connectionAnalytics.timeBasedMetrics.lastHour.reconnections).toBe(1);
    expect(connectionAnalytics.timeBasedMetrics.lastHour.messages).toBe(1);
    expect(connectionAnalytics.timeBasedMetrics.lastHour.errors).toBe(1);
  });

  // Test connection quality score
  test('calculates connection quality score correctly', () => {
    // Set up metrics for a good connection
    connectionAnalytics.stats.averageLatency = 50; // Excellent latency
    connectionAnalytics.stats.connectionSuccessRate = 100; // Perfect success rate
    connectionAnalytics.stats.totalConnections = 10;
    connectionAnalytics.stats.totalReconnections = 0; // No reconnections
    connectionAnalytics.stats.totalMessages = 100;
    connectionAnalytics.stats.totalErrors = 0; // No errors
    
    // Calculate quality score
    const score = connectionAnalytics.getConnectionQualityScore();
    
    // Check that the score is excellent
    expect(score).toBeGreaterThanOrEqual(90);
    expect(connectionAnalytics.getConnectionQualityStatus()).toBe('excellent');
  });

  test('calculates connection quality score correctly for poor connection', () => {
    // Set up metrics for a poor connection
    connectionAnalytics.stats.averageLatency = 300; // Poor latency
    connectionAnalytics.stats.connectionSuccessRate = 70; // Low success rate
    connectionAnalytics.stats.totalConnections = 10;
    connectionAnalytics.stats.totalReconnections = 20; // Many reconnections
    connectionAnalytics.stats.totalMessages = 100;
    connectionAnalytics.stats.totalErrors = 20; // High error rate
    
    // Calculate quality score
    const score = connectionAnalytics.getConnectionQualityScore();
    
    // Check that the score is poor
    expect(score).toBeLessThan(50);
    expect(connectionAnalytics.getConnectionQualityStatus()).toBe('poor');
  });

  // Test network stability score
  test('calculates network stability score correctly', () => {
    // Set up metrics for a stable network
    connectionAnalytics.stats.disconnectionFrequency = 0; // No disconnections
    connectionAnalytics.stats.totalMessages = 100;
    connectionAnalytics.stats.totalErrors = 0; // No errors
    connectionAnalytics.stats.averageLatency = 50; // Excellent latency
    
    // Update network stability score
    connectionAnalytics._updateNetworkStabilityScore();
    
    // Check that the score is excellent
    expect(connectionAnalytics.stats.networkStabilityScore).toBeGreaterThanOrEqual(90);
    expect(connectionAnalytics._getNetworkStabilityStatus()).toBe('very stable');
  });

  test('calculates network stability score correctly for unstable network', () => {
    // Set up metrics for an unstable network
    connectionAnalytics.stats.disconnectionFrequency = 5; // Frequent disconnections
    connectionAnalytics.stats.totalMessages = 100;
    connectionAnalytics.stats.totalErrors = 10; // High error rate
    connectionAnalytics.stats.averageLatency = 300; // Poor latency
    
    // Update network stability score
    connectionAnalytics._updateNetworkStabilityScore();
    
    // Check that the score is poor
    expect(connectionAnalytics.stats.networkStabilityScore).toBeLessThan(50);
    expect(connectionAnalytics._getNetworkStabilityStatus()).toBe('unstable');
  });

  // Test connection recommendations
  test('provides appropriate recommendations for good connection', () => {
    // Set up metrics for a good connection
    connectionAnalytics.stats.averageLatency = 50; // Excellent latency
    connectionAnalytics.stats.disconnectionFrequency = 0; // No disconnections
    connectionAnalytics.stats.totalMessages = 100;
    connectionAnalytics.stats.totalErrors = 0; // No errors
    connectionAnalytics.stats.connectionSuccessRate = 100; // Perfect success rate
    connectionAnalytics.stats.messageSuccessRate = 100; // Perfect success rate
    
    // Get recommendations
    const recommendations = connectionAnalytics.getConnectionRecommendations();
    
    // Check that there are no issues
    expect(recommendations.length).toBe(1);
    expect(recommendations[0].priority).toBe('info');
    expect(recommendations[0].message).toContain('No issues detected');
  });

  test('provides appropriate recommendations for poor connection', () => {
    // Set up metrics for a poor connection
    connectionAnalytics.stats.averageLatency = 400; // Very poor latency
    connectionAnalytics.stats.disconnectionFrequency = 5; // Frequent disconnections
    connectionAnalytics.stats.totalMessages = 100;
    connectionAnalytics.stats.totalErrors = 15; // High error rate
    connectionAnalytics.stats.connectionSuccessRate = 70; // Low success rate
    connectionAnalytics.stats.messageSuccessRate = 85; // Low success rate
    connectionAnalytics.stats.messageDeliveryLatency = 600; // High latency
    
    // Get recommendations
    const recommendations = connectionAnalytics.getConnectionRecommendations();
    
    // Check that there are multiple high-priority recommendations
    expect(recommendations.length).toBeGreaterThan(3);
    expect(recommendations[0].priority).toBe('high'); // First recommendation should be high priority
  });

  // Test detailed analytics report
  test('generates detailed analytics report correctly', () => {
    // Set up some metrics
    connectionAnalytics.stats.totalConnections = 10;
    connectionAnalytics.stats.totalReconnections = 5;
    connectionAnalytics.stats.totalMessages = 100;
    connectionAnalytics.stats.totalErrors = 2;
    connectionAnalytics.stats.averageLatency = 100;
    connectionAnalytics.stats.messageDeliveryLatency = 150;
    connectionAnalytics.stats.disconnectionFrequency = 1;
    connectionAnalytics.stats.networkStabilityScore = 80;
    
    // Generate report
    const report = connectionAnalytics.getDetailedAnalyticsReport();
    
    // Check that the report contains all expected sections
    expect(report.timestamp).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.metrics).toBeDefined();
    expect(report.metrics.connections).toBeDefined();
    expect(report.metrics.reconnections).toBeDefined();
    expect(report.metrics.messages).toBeDefined();
    expect(report.metrics.errors).toBeDefined();
    expect(report.metrics.performance).toBeDefined();
    expect(report.metrics.stability).toBeDefined();
    expect(report.trends).toBeDefined();
  });
});
