/**
 * MobileSystemStatusDashboard Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MobileSystemStatusDashboard from '../MobileSystemStatusDashboard';
import { useSystemStatus } from '../../hooks/useSystemStatus';

// Mock the useSystemStatus hook
jest.mock('../../hooks/useSystemStatus', () => ({
  useSystemStatus: jest.fn()
}));

// Mock the date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'formatted-date')
}));

describe('MobileSystemStatusDashboard Component', () => {
  // Default mock data
  const mockSystemStatus = {
    cacheStats: {
      cacheSize: 1024 * 1024 * 10, // 10 MB
      itemCount: 100,
      hitRate: 0.85,
      lastUpdated: new Date(),
      compressionRatio: 2.5,
      cacheEfficiency: 0.9,
      averageCacheAge: 300000, // 5 minutes
      prioritizedItems: 20
    },
    offlineReadiness: 0.75,
    offlineRisk: 0.25,
    mlPredictions: {
      predictedOfflineDuration: { hours: 2 },
      confidence: 0.8,
      predictedItemCount: 50,
      predictionAccuracy: 0.85
    },
    mlPerformance: {
      isInitialized: true,
      version: '1.2.0',
      accuracy: 0.9,
      computeTimeMs: 120,
      memoryUsageMB: 256,
      lastTrainingTime: new Date()
    },
    syncStatus: {
      status: 'healthy',
      autoSyncEnabled: true,
      lastSyncTime: new Date(),
      nextScheduledSync: new Date(Date.now() + 3600000), // 1 hour from now
      pendingItems: 5,
      syncIntervalMinutes: 60,
      successRate: 0.95,
      averageSyncDurationMs: 2500,
      totalSyncs: 120,
      failedSyncs: 6,
      networkQuality: 0.85
    },
    devicePerformance: {
      cpuUsage: 0.45,
      cpuCores: 8,
      memoryUsage: 0.6,
      freeMemoryMB: 4096,
      network: {
        connectionType: 'wifi',
        online: true,
        signalStrength: 0.85,
        downloadSpeedMbps: 50,
        uploadSpeedMbps: 20,
        latencyMs: 35,
        connectionStability: 0.9
      },
      battery: {
        level: 0.75,
        charging: true,
        timeRemaining: 180
      }
    },
    loading: false,
    error: null,
    trainModels: jest.fn(),
    configureModels: jest.fn(),
    manualSync: jest.fn(),
    toggleAutoSync: jest.fn(),
    prepareForOffline: jest.fn(),
    optimizeStorage: jest.fn(),
    clearCache: jest.fn(),
    refreshCache: jest.fn(),
    refreshData: jest.fn()
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementation
    useSystemStatus.mockReturnValue(mockSystemStatus);
  });

  test('renders loading state correctly', () => {
    useSystemStatus.mockReturnValue({
      ...mockSystemStatus,
      loading: true
    });

    const { getByTestId } = render(<MobileSystemStatusDashboard />);
    
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  test('renders error state correctly', () => {
    useSystemStatus.mockReturnValue({
      ...mockSystemStatus,
      loading: false,
      error: 'Failed to fetch system status'
    });

    const { getByText } = render(<MobileSystemStatusDashboard />);
    
    expect(getByText('Failed to fetch system status')).toBeTruthy();
  });

  test('renders system overview correctly', () => {
    const { getByText } = render(<MobileSystemStatusDashboard />);
    
    // Check for overview cards
    expect(getByText('Cache Health')).toBeTruthy();
    expect(getByText('ML Models')).toBeTruthy();
    expect(getByText('Sync Status')).toBeTruthy();
    expect(getByText('Offline Risk')).toBeTruthy();
    
    // Check for specific metrics
    expect(getByText('75% Ready')).toBeTruthy();
    expect(getByText('90% Accuracy')).toBeTruthy();
    expect(getByText('25% Risk')).toBeTruthy();
  });

  test('tab navigation works correctly', () => {
    const { getByText, queryByText } = render(<MobileSystemStatusDashboard />);
    
    // Default tab should be Overview
    expect(getByText('Detailed metrics coming soon')).toBeTruthy();
    
    // Click on Cache tab
    fireEvent.press(getByText('Cache'));
    expect(getByText('Cache metrics coming soon')).toBeTruthy();
    
    // Click on Sync tab
    fireEvent.press(getByText('Sync'));
    expect(getByText('Sync metrics coming soon')).toBeTruthy();
    
    // Click on Device tab
    fireEvent.press(getByText('Device'));
    expect(getByText('Device metrics coming soon')).toBeTruthy();
    
    // Click back to Overview tab
    fireEvent.press(getByText('Overview'));
    expect(getByText('Detailed metrics coming soon')).toBeTruthy();
  });

  test('sync button calls manualSync', () => {
    const { getByText } = render(<MobileSystemStatusDashboard />);
    
    // Find and press the sync button
    fireEvent.press(getByText('Sync Now'));
    
    // Check if manualSync was called
    expect(mockSystemStatus.manualSync).toHaveBeenCalledTimes(1);
  });

  test('pull-to-refresh calls refreshData', async () => {
    const { getByTestId } = render(<MobileSystemStatusDashboard />);
    
    // Simulate pull-to-refresh
    const scrollView = getByTestId('scroll-view');
    fireEvent(scrollView, 'refresh');
    
    // Check if refreshData was called
    expect(mockSystemStatus.refreshData).toHaveBeenCalledTimes(1);
    
    // Wait for refreshing state to be reset
    await waitFor(() => {
      expect(scrollView.props.refreshing).toBe(false);
    });
  });
});
