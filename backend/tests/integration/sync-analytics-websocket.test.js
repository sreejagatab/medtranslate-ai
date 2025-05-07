/**
 * Integration Tests for Sync Analytics WebSocket
 * 
 * These tests verify that the sync analytics WebSocket events are properly emitted and received.
 */

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const syncAnalyticsEvents = require('../../websocket/sync-analytics-events');

// Mock axios
const mockAxios = new MockAdapter(axios);

describe('Sync Analytics WebSocket', () => {
  let server;
  let wss;
  let port;
  let wsClient;
  let sessions;
  let mockToken;

  beforeAll((done) => {
    // Create a test server
    const app = express();
    server = http.createServer(app);
    wss = new WebSocket.Server({ server });
    sessions = new Map();

    // Start the server on a random port
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      done();
    });

    // Create a mock token
    mockToken = jwt.sign(
      { sub: 'admin-user', type: 'admin', name: 'Admin User' },
      'test-secret',
      { expiresIn: '1h' }
    );

    // Handle WebSocket connections
    wss.on('connection', (ws, req) => {
      // Set client properties
      ws.connectionId = 'test-connection';
      ws.sessionId = 'test-session';
      ws.userId = 'admin-user';
      ws.userType = 'admin';
      ws.userName = 'Admin User';

      // Add to sessions
      if (!sessions.has('test-session')) {
        sessions.set('test-session', new Map());
      }
      sessions.get('test-session').set('admin-user', {
        ws,
        userType: 'admin',
        userName: 'Admin User',
        userId: 'admin-user',
        connectionId: 'test-connection',
        connectedAt: new Date().toISOString()
      });
    });

    // Register sync analytics events
    syncAnalyticsEvents.registerSyncAnalyticsEvents(wss, sessions);
  });

  afterAll((done) => {
    // Close the server
    server.close(() => {
      done();
    });
  });

  beforeEach((done) => {
    // Create a new WebSocket client before each test
    wsClient = new WebSocket(`ws://127.0.0.1:${port}?token=${mockToken}`);
    wsClient.on('open', () => {
      done();
    });
  });

  afterEach(() => {
    // Close the WebSocket client after each test
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }
  });

  describe('Sync Status Updates', () => {
    it('should receive sync status updates', (done) => {
      // Mock axios response for device 1
      mockAxios.onGet('http://localhost:3002/sync/status').reply(200, {
        enabled: true,
        inProgress: false,
        lastSyncTime: 1746138009497,
        lastSyncStatus: 'success',
        queueSize: 5,
        interval: 300000,
        metrics: {
          totalSyncs: 120,
          successfulSyncs: 118,
          itemsSynced: 1450,
          conflicts: 3,
          conflictsResolved: 3
        }
      });

      // Listen for messages
      wsClient.on('message', (data) => {
        const message = JSON.parse(data);

        // Check if this is a sync status update
        if (message.type === 'sync_status_update') {
          expect(message).toEqual(
            expect.objectContaining({
              type: 'sync_status_update',
              devices: expect.arrayContaining([
                expect.objectContaining({
                  deviceId: 'edge-device-1',
                  deviceName: 'Hospital Wing A',
                  status: expect.objectContaining({
                    enabled: true,
                    inProgress: false,
                    lastSyncStatus: 'success',
                    queueSize: 5
                  }),
                  online: true
                })
              ]),
              timestamp: expect.any(String)
            })
          );
          done();
        }
      });

      // Manually trigger the sync status update
      const syncStatusInterval = syncAnalyticsEvents._testExports.syncStatusInterval;
      clearInterval(syncStatusInterval);
      syncAnalyticsEvents._testExports.broadcastSyncStatus();
    });
  });

  describe('Quality Metrics Updates', () => {
    it('should receive quality metrics updates', (done) => {
      // Mock axios response for device 1
      mockAxios.onGet('http://localhost:3002/sync/quality').reply(200, {
        modelPerformance: {
          'claude-3-sonnet': {
            averageConfidence: 0.92,
            accuracy: 0.95,
            usageCount: 450
          },
          'claude-3-haiku': {
            averageConfidence: 0.88,
            accuracy: 0.91,
            usageCount: 320
          }
        },
        contextPerformance: {
          general: {
            averageConfidence: 0.90,
            accuracy: 0.93,
            usageCount: 380
          },
          cardiology: {
            averageConfidence: 0.94,
            accuracy: 0.96,
            usageCount: 210
          }
        }
      });

      // Listen for messages
      wsClient.on('message', (data) => {
        const message = JSON.parse(data);

        // Check if this is a quality metrics update
        if (message.type === 'quality_metrics_update') {
          expect(message).toEqual(
            expect.objectContaining({
              type: 'quality_metrics_update',
              devices: expect.arrayContaining([
                expect.objectContaining({
                  deviceId: 'edge-device-1',
                  deviceName: 'Hospital Wing A',
                  quality: expect.objectContaining({
                    modelPerformance: expect.objectContaining({
                      'claude-3-sonnet': expect.objectContaining({
                        averageConfidence: 0.92,
                        accuracy: 0.95
                      })
                    })
                  }),
                  online: true
                })
              ]),
              timestamp: expect.any(String)
            })
          );
          done();
        }
      });

      // Manually trigger the quality metrics update
      const qualityMetricsInterval = syncAnalyticsEvents._testExports.qualityMetricsInterval;
      clearInterval(qualityMetricsInterval);
      syncAnalyticsEvents._testExports.broadcastQualityMetrics();
    });
  });

  describe('Anomaly Detection Updates', () => {
    it('should receive anomaly detection updates', (done) => {
      // Mock axios response for device 1
      mockAxios.onGet('http://localhost:3002/sync/anomalies').reply(200, {
        anomalyHistory: [
          {
            timestamp: 1746135909337,
            type: 'confidence_drop',
            value: 0.75,
            threshold: 0.85,
            severity: 'high',
            context: 'cardiology',
            model: 'claude-3-sonnet'
          },
          {
            timestamp: 1746136909337,
            type: 'feedback_negative_spike',
            value: 0.25,
            threshold: 0.15,
            severity: 'medium',
            context: 'general',
            model: 'claude-3-haiku'
          }
        ],
        anomalyDetection: {
          confidenceThreshold: 0.2,
          feedbackThreshold: 0.3,
          lastAnalysisTime: 1746138009497,
          baselineConfidence: 0.92,
          baselineFeedback: 0.95
        }
      });

      // Listen for messages
      wsClient.on('message', (data) => {
        const message = JSON.parse(data);

        // Check if this is an anomaly detection update
        if (message.type === 'anomaly_detection_update') {
          expect(message).toEqual(
            expect.objectContaining({
              type: 'anomaly_detection_update',
              devices: expect.arrayContaining([
                expect.objectContaining({
                  deviceId: 'edge-device-1',
                  deviceName: 'Hospital Wing A',
                  anomalies: expect.objectContaining({
                    anomalyHistory: expect.arrayContaining([
                      expect.objectContaining({
                        type: 'confidence_drop',
                        severity: 'high',
                        context: 'cardiology'
                      })
                    ])
                  }),
                  online: true
                })
              ]),
              timestamp: expect.any(String)
            })
          );
          done();
        }
      });

      // Manually trigger the anomaly detection update
      const anomalyDetectionInterval = syncAnalyticsEvents._testExports.anomalyDetectionInterval;
      clearInterval(anomalyDetectionInterval);
      syncAnalyticsEvents._testExports.broadcastAnomalyDetection();
    });
  });
});
