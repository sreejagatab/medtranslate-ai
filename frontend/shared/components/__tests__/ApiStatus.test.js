/**
 * Tests for ApiStatus Component
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApiStatus from '../ApiStatus';

// Mock fetch
global.fetch = jest.fn();

describe('ApiStatus Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetch.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render with unknown status initially', () => {
    render(<ApiStatus endpoint="https://api.example.com/health" label="Test API" />);
    
    expect(screen.getByText(/Test API: Unknown/i)).toBeInTheDocument();
  });

  it('should show healthy status when API responds successfully', async () => {
    // Mock successful response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    render(<ApiStatus endpoint="https://api.example.com/health" label="Test API" />);
    
    // Fast-forward timers to trigger the API call
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Test API: Healthy/i)).toBeInTheDocument();
    });
    
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should show warning status when API response time is slow', async () => {
    // Mock slow but successful response
    jest.spyOn(global.Date, 'now')
      .mockImplementationOnce(() => 1000)
      .mockImplementationOnce(() => 2500); // 1500ms response time
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    render(<ApiStatus endpoint="https://api.example.com/health" label="Test API" />);
    
    // Fast-forward timers to trigger the API call
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Test API: Degraded/i)).toBeInTheDocument();
    });
  });

  it('should show error status when API responds with an error', async () => {
    // Mock error response
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    render(<ApiStatus endpoint="https://api.example.com/health" label="Test API" />);
    
    // Fast-forward timers to trigger the API call
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Test API: Error/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/HTTP 500: Internal Server Error/i)).toBeInTheDocument();
  });

  it('should show error status when fetch throws an error', async () => {
    // Mock fetch throwing an error
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ApiStatus endpoint="https://api.example.com/health" label="Test API" />);
    
    // Fast-forward timers to trigger the API call
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Test API: Error/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Network error/i)).toBeInTheDocument();
  });

  it('should call onStatusChange when status changes', async () => {
    // Mock successful response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    const onStatusChange = jest.fn();
    
    render(
      <ApiStatus 
        endpoint="https://api.example.com/health" 
        label="Test API" 
        onStatusChange={onStatusChange} 
      />
    );
    
    // Fast-forward timers to trigger the API call
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('healthy', expect.any(Number));
    });
  });

  it('should refresh status at the specified interval', async () => {
    // Mock successful responses
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    render(
      <ApiStatus 
        endpoint="https://api.example.com/health" 
        label="Test API" 
        refreshInterval={5000} 
      />
    );
    
    // Fast-forward timers to trigger the first API call
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    
    // Fast-forward timers to trigger the second API call
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
