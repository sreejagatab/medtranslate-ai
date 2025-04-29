/**
 * Tests for SystemHealthPanel Component
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SystemHealthPanel from '../SystemHealthPanel';

// Mock the health service
jest.mock('../../services/health-service', () => ({
  checkSystemHealth: jest.fn()
}));

import { checkSystemHealth } from '../../services/health-service';

describe('SystemHealthPanel Component', () => {
  const mockEndpoints = [
    { url: 'https://api.example.com/health', name: 'Backend API' },
    { url: 'https://api.example.com/health/database', name: 'Database' },
    { url: 'https://api.example.com/health/edge', name: 'Edge Devices' }
  ];

  const mockHealthData = {
    status: 'healthy',
    timestamp: '2023-06-01T12:00:00Z',
    components: [
      { name: 'Backend API', status: 'healthy', responseTime: 50 },
      { name: 'Database', status: 'healthy', responseTime: 30 },
      { name: 'Edge Devices', status: 'warning', responseTime: 150 }
    ]
  };

  beforeEach(() => {
    jest.useFakeTimers();
    checkSystemHealth.mockClear();
    checkSystemHealth.mockResolvedValue(mockHealthData);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render loading state initially', () => {
    render(<SystemHealthPanel endpoints={mockEndpoints} />);
    
    expect(screen.getByText(/Loading health data/i)).toBeInTheDocument();
  });

  it('should render health data when loaded', async () => {
    render(<SystemHealthPanel endpoints={mockEndpoints} />);
    
    // Fast-forward timers to trigger the API call
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading health data/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Backend API')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Edge Devices')).toBeInTheDocument();
    
    // Check status texts
    expect(screen.getAllByText('Healthy').length).toBe(2);
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    
    // Check response times
    expect(screen.getByText('50ms')).toBeInTheDocument();
    expect(screen.getByText('30ms')).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument();
  });

  it('should refresh data when refresh button is clicked', async () => {
    render(<SystemHealthPanel endpoints={mockEndpoints} />);
    
    // Fast-forward timers to trigger the initial API call
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(checkSystemHealth).toHaveBeenCalledTimes(1);
    });
    
    // Click refresh button
    fireEvent.click(screen.getByText('Refresh'));
    
    await waitFor(() => {
      expect(checkSystemHealth).toHaveBeenCalledTimes(2);
    });
  });

  it('should refresh data at the specified interval', async () => {
    render(<SystemHealthPanel endpoints={mockEndpoints} refreshInterval={30000} />);
    
    // Fast-forward timers to trigger the initial API call
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(checkSystemHealth).toHaveBeenCalledTimes(1);
    });
    
    // Fast-forward timers to trigger the second API call
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    
    await waitFor(() => {
      expect(checkSystemHealth).toHaveBeenCalledTimes(2);
    });
  });

  it('should display error message when API call fails', async () => {
    // Mock API error
    checkSystemHealth.mockRejectedValueOnce(new Error('Failed to fetch health data'));
    
    render(<SystemHealthPanel endpoints={mockEndpoints} />);
    
    // Fast-forward timers to trigger the API call
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch health data/i)).toBeInTheDocument();
    });
  });

  it('should call onStatusChange when status changes', async () => {
    const onStatusChange = jest.fn();
    
    render(
      <SystemHealthPanel 
        endpoints={mockEndpoints} 
        onStatusChange={onStatusChange} 
      />
    );
    
    // Fast-forward timers to trigger the API call
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith(mockHealthData);
    });
  });
});
