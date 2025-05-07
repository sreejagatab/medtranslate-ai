import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SyncAnalyticsDashboard from '../SyncAnalyticsDashboard';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';

// Mock the auth context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock the WebSocket hook
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('SyncAnalyticsDashboard', () => {
  // Mock data
  const mockSyncStatus = {
    success: true,
    devices: [
      {
        deviceId: 'edge-device-1',
        deviceName: 'Hospital Wing A',
        status: {
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
          },
          queueByPriority: {
            critical: 1,
            high: 2,
            medium: 1,
            low: 1
          }
        },
        online: true,
        lastUpdated: '2023-05-01T12:00:00.000Z'
      }
    ],
    timestamp: '2023-05-01T12:00:00.000Z'
  };

  const mockQualityMetrics = {
    success: true,
    devices: [
      {
        deviceId: 'edge-device-1',
        deviceName: 'Hospital Wing A',
        quality: {
          modelPerformance: {
            'claude-3-sonnet': {
              averageConfidence: 0.92,
              accuracy: 0.95,
              usageCount: 450
            }
          },
          contextPerformance: {
            general: {
              averageConfidence: 0.90,
              accuracy: 0.93,
              usageCount: 380
            }
          }
        },
        online: true,
        lastUpdated: '2023-05-01T12:00:00.000Z'
      }
    ],
    timestamp: '2023-05-01T12:00:00.000Z'
  };

  const mockAnomalies = {
    success: true,
    devices: [
      {
        deviceId: 'edge-device-1',
        deviceName: 'Hospital Wing A',
        anomalies: {
          anomalyHistory: [
            {
              timestamp: 1746135909337,
              type: 'confidence_drop',
              value: 0.75,
              threshold: 0.85,
              severity: 'high',
              context: 'cardiology',
              model: 'claude-3-sonnet'
            }
          ]
        },
        online: true,
        lastUpdated: '2023-05-01T12:00:00.000Z'
      }
    ],
    timestamp: '2023-05-01T12:00:00.000Z'
  };

  // Setup before each test
  beforeEach(() => {
    // Mock auth context
    useAuth.mockReturnValue({
      token: 'mock-token'
    });

    // Mock WebSocket hook
    useWebSocket.mockReturnValue({
      isConnected: true,
      lastMessage: null,
      sendMessage: jest.fn()
    });

    // Mock fetch responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSyncStatus)
        });
      } else if (url.includes('/quality')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockQualityMetrics)
        });
      } else if (url.includes('/anomalies')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAnomalies)
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  // Clean up after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<SyncAnalyticsDashboard />);
    expect(screen.getByText('Loading sync analytics data...')).toBeInTheDocument();
  });

  it('renders device status cards after loading', async () => {
    render(<SyncAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Hospital Wing A')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Queue Size:')).toBeInTheDocument();
      expect(screen.getByText('Trigger Manual Sync')).toBeInTheDocument();
    });
  });

  it('renders sync queue chart after loading', async () => {
    render(<SyncAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Sync Queue by Priority')).toBeInTheDocument();
    });
  });

  it('renders quality metrics chart after loading', async () => {
    render(<SyncAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Translation Quality Metrics')).toBeInTheDocument();
    });
  });

  it('renders anomaly detection table after loading', async () => {
    render(<SyncAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Anomaly Detection')).toBeInTheDocument();
      expect(screen.getByText('Device')).toBeInTheDocument();
      expect(screen.getByText('Anomaly Type')).toBeInTheDocument();
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Severity')).toBeInTheDocument();
    });
  });

  it('handles manual sync button click', async () => {
    // Mock fetch for manual sync
    global.fetch.mockImplementation((url) => {
      if (url.includes('/manual-sync')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: {
              success: true,
              syncedItems: 5,
              conflicts: 0,
              duration: 2500
            }
          })
        });
      } else if (url.includes('/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSyncStatus)
        });
      } else if (url.includes('/quality')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockQualityMetrics)
        });
      } else if (url.includes('/anomalies')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAnomalies)
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    // Mock window.alert
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<SyncAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Trigger Manual Sync')).toBeInTheDocument();
    });

    // Click the manual sync button
    fireEvent.click(screen.getByText('Trigger Manual Sync'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Manual sync triggered successfully');
    });

    // Restore window.alert
    mockAlert.mockRestore();
  });

  it('handles WebSocket messages', async () => {
    // Initial render
    const { rerender } = render(<SyncAnalyticsDashboard />);
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('Hospital Wing A')).toBeInTheDocument();
    });

    // Mock WebSocket message
    const mockWebSocketMessage = {
      data: JSON.stringify({
        type: 'sync_status_update',
        devices: [
          {
            deviceId: 'edge-device-1',
            deviceName: 'Hospital Wing A',
            status: {
              enabled: true,
              inProgress: false,
              lastSyncTime: 1746138009497,
              lastSyncStatus: 'updated_via_websocket',
              queueSize: 10,
              interval: 300000,
              metrics: {
                totalSyncs: 121,
                successfulSyncs: 119,
                itemsSynced: 1460,
                conflicts: 3,
                conflictsResolved: 3
              },
              queueByPriority: {
                critical: 2,
                high: 3,
                medium: 2,
                low: 3
              }
            },
            online: true,
            lastUpdated: '2023-05-01T12:01:00.000Z'
          }
        ],
        timestamp: '2023-05-01T12:01:00.000Z'
      })
    };

    // Update WebSocket hook to return the message
    useWebSocket.mockReturnValue({
      isConnected: true,
      lastMessage: mockWebSocketMessage,
      sendMessage: jest.fn()
    });

    // Rerender with the new WebSocket message
    rerender(<SyncAnalyticsDashboard />);

    // Check that the UI is updated with the new data
    await waitFor(() => {
      expect(screen.getByText('updated_via_websocket')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    // Mock fetch to return an error
    global.fetch.mockImplementation(() => {
      return Promise.reject(new Error('API error'));
    });

    render(<SyncAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading sync analytics data')).toBeInTheDocument();
      expect(screen.getByText('API error')).toBeInTheDocument();
    });
  });
});
