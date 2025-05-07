/**
 * SystemStatusDashboard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SystemStatusDashboard from '../SystemStatusDashboard';
import { useSystemStatus } from '../../hooks/useSystemStatus';

// Mock the useSystemStatus hook
jest.mock('../../hooks/useSystemStatus', () => ({
  useSystemStatus: jest.fn()
}));

// Mock the ApiStatus component
jest.mock('../ApiStatus', () => ({
  __esModule: true,
  default: () => <div data-testid="api-status">API Status Component</div>
}));

// Mock the recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'formatted-date')
}));

describe('SystemStatusDashboard Component', () => {
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
    mlPerformanceHistory: [
      { label: 'Day 1', accuracy: 0.85, predictionAccuracy: 0.8, computeTimeMs: 150 },
      { label: 'Day 2', accuracy: 0.87, predictionAccuracy: 0.82, computeTimeMs: 140 },
      { label: 'Day 3', accuracy: 0.9, predictionAccuracy: 0.85, computeTimeMs: 120 }
    ],
    storageInfo: {
      usagePercentage: 65,
      currentUsageMB: 650,
      quotaMB: 1000,
      reservedForOfflineMB: 200,
      compressionSavingsMB: 150,
      priorityItemCount: 30,
      lastOptimizationTime: new Date(),
      categories: [
        { name: 'Translations', sizeMB: 300 },
        { name: 'ML Models', sizeMB: 200 },
        { name: 'Medical Terms', sizeMB: 100 },
        { name: 'User Data', sizeMB: 50 }
      ],
      history: [
        { label: 'Day 1', usageMB: 600, compressionSavingsMB: 140, itemCount: 90 },
        { label: 'Day 2', usageMB: 630, compressionSavingsMB: 145, itemCount: 95 },
        { label: 'Day 3', usageMB: 650, compressionSavingsMB: 150, itemCount: 100 }
      ]
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
    syncHistory: [
      { label: 'Day 1', itemCount: 100, durationMs: 2600, networkQuality: 0.8 },
      { label: 'Day 2', itemCount: 110, durationMs: 2550, networkQuality: 0.82 },
      { label: 'Day 3', itemCount: 105, durationMs: 2500, networkQuality: 0.85 }
    ],
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
      },
      system: {
        platform: 'Windows',
        version: '10',
        architecture: 'x64',
        uptime: 86400 * 3, // 3 days
        deviceType: 'desktop',
        deviceName: 'DESKTOP-ABC123'
      },
      history: [
        { label: 'Hour 1', cpuUsage: 0.4, memoryUsage: 0.55, connectionStability: 0.85, batteryLevel: 0.8 },
        { label: 'Hour 2', cpuUsage: 0.45, memoryUsage: 0.6, connectionStability: 0.9, batteryLevel: 0.75 },
        { label: 'Hour 3', cpuUsage: 0.42, memoryUsage: 0.58, connectionStability: 0.88, batteryLevel: 0.7 }
      ]
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

    render(<SystemStatusDashboard />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders error state correctly', () => {
    useSystemStatus.mockReturnValue({
      ...mockSystemStatus,
      loading: false,
      error: 'Failed to fetch system status'
    });

    render(<SystemStatusDashboard />);
    
    expect(screen.getByText('Failed to fetch system status')).toBeInTheDocument();
  });

  test('renders system overview correctly', () => {
    render(<SystemStatusDashboard />);
    
    // Check for overview cards
    expect(screen.getByText('Cache Health')).toBeInTheDocument();
    expect(screen.getByText('ML Models')).toBeInTheDocument();
    expect(screen.getByText('Sync Status')).toBeInTheDocument();
    expect(screen.getByText('Offline Risk')).toBeInTheDocument();
    
    // Check for specific metrics
    expect(screen.getByText('75% Ready')).toBeInTheDocument();
    expect(screen.getByText('90% Accuracy')).toBeInTheDocument();
    expect(screen.getByText('25% Risk')).toBeInTheDocument();
  });

  test('tab navigation works correctly', () => {
    render(<SystemStatusDashboard />);
    
    // Default tab should be Cache
    expect(screen.getByText('Cache Status')).toBeInTheDocument();
    
    // Click on ML Models tab
    fireEvent.click(screen.getByText('ML Models'));
    expect(screen.getByText('ML Model Performance')).toBeInTheDocument();
    
    // Click on Sync tab
    fireEvent.click(screen.getByText('Sync'));
    expect(screen.getByText('Synchronization Status')).toBeInTheDocument();
    
    // Click on Storage tab
    fireEvent.click(screen.getByText('Storage'));
    expect(screen.getByText('Storage Information')).toBeInTheDocument();
    
    // Click on Device tab
    fireEvent.click(screen.getByText('Device'));
    expect(screen.getByText('Device Performance')).toBeInTheDocument();
    
    // Click on API Status tab
    fireEvent.click(screen.getByText('API Status'));
    expect(screen.getByTestId('api-status')).toBeInTheDocument();
  });

  test('refresh button calls refreshData', () => {
    render(<SystemStatusDashboard />);
    
    // Find and click the refresh button
    const refreshButton = screen.getAllByRole('button')[0]; // First button is refresh
    fireEvent.click(refreshButton);
    
    // Check if refreshData was called
    expect(mockSystemStatus.refreshData).toHaveBeenCalledTimes(1);
  });

  test('manual sync button calls manualSync', () => {
    render(<SystemStatusDashboard />);
    
    // Find and click the sync button
    const syncButton = screen.getByText('Sync Now');
    fireEvent.click(syncButton);
    
    // Check if manualSync was called
    expect(mockSystemStatus.manualSync).toHaveBeenCalledTimes(1);
  });
});
