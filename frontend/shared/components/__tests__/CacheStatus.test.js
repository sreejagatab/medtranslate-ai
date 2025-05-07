/**
 * Tests for CacheStatus component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CacheStatus from '../CacheStatus';

// Mock fetch
global.fetch = jest.fn();
global.AbortSignal = {
  timeout: jest.fn(() => ({})),
};

describe('CacheStatus Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', async () => {
    // Mock successful response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cacheSize: 1024 * 1024 * 5, // 5MB
        itemCount: 100,
        hitRate: 0.85,
        offlineReadiness: 0.9,
        lastUpdated: new Date().toISOString(),
        predictedOffline: false,
        predictedDuration: 0,
        storageUsage: 0.3,
        compressionRatio: 2.5,
      }),
    });

    render(<CacheStatus endpoint="/api/cache/status" />);

    // Check initial render
    expect(screen.getByText(/Predictive Cache/i)).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Offline Ready/i)).toBeInTheDocument();
    });
    
    // Check that fetch was called with correct endpoint
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/cache/status',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('shows partially ready status', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        offlineReadiness: 0.5,
      }),
    });

    render(<CacheStatus endpoint="/api/cache/status" />);

    await waitFor(() => {
      expect(screen.getByText(/Partially Ready/i)).toBeInTheDocument();
    });
  });

  it('shows not ready status', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        offlineReadiness: 0.2,
      }),
    });

    render(<CacheStatus endpoint="/api/cache/status" />);

    await waitFor(() => {
      expect(screen.getByText(/Not Ready/i)).toBeInTheDocument();
    });
  });

  it('shows error state', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<CacheStatus endpoint="/api/cache/status" expanded={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Unknown/i)).toBeInTheDocument();
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('toggles expanded state when button is clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cacheSize: 1024 * 1024 * 5,
        itemCount: 100,
        hitRate: 0.85,
        offlineReadiness: 0.9,
      }),
    });

    render(<CacheStatus endpoint="/api/cache/status" />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Offline Ready/i)).toBeInTheDocument();
    });

    // Initially details should be hidden
    expect(screen.queryByText(/Offline Readiness:/i)).not.toBeInTheDocument();

    // Click the expand button
    fireEvent.click(screen.getByText(/Show Details/i));

    // Details should now be visible
    expect(screen.getByText(/Offline Readiness:/i)).toBeInTheDocument();
    expect(screen.getByText(/90%/i)).toBeInTheDocument();
    expect(screen.getByText(/Cache Size:/i)).toBeInTheDocument();
    expect(screen.getByText(/5 MB/i)).toBeInTheDocument();

    // Click the collapse button
    fireEvent.click(screen.getByText(/Hide Details/i));

    // Details should be hidden again
    expect(screen.queryByText(/Offline Readiness:/i)).not.toBeInTheDocument();
  });

  it('shows offline prediction warning', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        offlineReadiness: 0.9,
        predictedOffline: true,
        predictedDuration: 60 * 60 * 1000, // 1 hour
      }),
    });

    render(<CacheStatus endpoint="/api/cache/status" expanded={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Offline Period Predicted/i)).toBeInTheDocument();
      expect(screen.getByText(/1 hour/i)).toBeInTheDocument();
    });
  });

  it('calls onStatusChange callback when status changes', async () => {
    const onStatusChange = jest.fn();
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        offlineReadiness: 0.9,
      }),
    });

    render(
      <CacheStatus 
        endpoint="/api/cache/status" 
        onStatusChange={onStatusChange} 
      />
    );

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith(
        'offlineReady',
        expect.objectContaining({
          offlineReadiness: 0.9,
        }),
        null
      );
    });
  });
});
