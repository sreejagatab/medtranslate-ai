/**
 * ApiStatus Component for MedTranslate AI
 * 
 * This component displays the current status of API connections and system health.
 * It can be used across different applications to provide consistent status monitoring.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Default styles for web applications
const defaultStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    margin: '4px 0',
  },
  indicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginRight: '8px',
  },
  healthy: {
    backgroundColor: '#4CAF50', // Green
  },
  warning: {
    backgroundColor: '#FFC107', // Yellow
  },
  error: {
    backgroundColor: '#F44336', // Red
  },
  unknown: {
    backgroundColor: '#9E9E9E', // Gray
  },
  text: {
    margin: 0,
  },
};

// Status types
const STATUS_TYPES = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  ERROR: 'error',
  UNKNOWN: 'unknown',
};

/**
 * ApiStatus component
 * 
 * @param {Object} props - Component props
 * @param {string} props.endpoint - API endpoint to check
 * @param {string} props.label - Label to display
 * @param {number} props.refreshInterval - Refresh interval in milliseconds
 * @param {Object} props.style - Custom styles
 * @param {Function} props.onStatusChange - Callback when status changes
 * @param {boolean} props.showResponseTime - Whether to show response time
 * @returns {JSX.Element} ApiStatus component
 */
const ApiStatus = ({
  endpoint,
  label,
  refreshInterval = 30000,
  style = {},
  onStatusChange = null,
  showResponseTime = true,
}) => {
  const [status, setStatus] = useState(STATUS_TYPES.UNKNOWN);
  const [responseTime, setResponseTime] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState(null);

  // Check API status
  const checkStatus = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Set a timeout to avoid hanging
        signal: AbortSignal.timeout(5000),
      });

      const endTime = Date.now();
      const latency = endTime - startTime;
      setResponseTime(latency);
      setLastChecked(new Date());

      if (response.ok) {
        // Determine status based on response time
        let newStatus = STATUS_TYPES.HEALTHY;
        if (latency > 1000) {
          newStatus = STATUS_TYPES.WARNING;
        }
        
        setStatus(newStatus);
        setError(null);
        
        // Call onStatusChange callback if provided
        if (onStatusChange) {
          onStatusChange(newStatus, latency);
        }
      } else {
        setStatus(STATUS_TYPES.ERROR);
        setError(`HTTP ${response.status}: ${response.statusText}`);
        
        if (onStatusChange) {
          onStatusChange(STATUS_TYPES.ERROR, latency, error);
        }
      }
    } catch (err) {
      setStatus(STATUS_TYPES.ERROR);
      setError(err.message || 'Unknown error');
      setResponseTime(null);
      
      if (onStatusChange) {
        onStatusChange(STATUS_TYPES.ERROR, null, err);
      }
    }
  };

  // Initial check and set up interval
  useEffect(() => {
    checkStatus();
    
    const intervalId = setInterval(checkStatus, refreshInterval);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [endpoint, refreshInterval]);

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case STATUS_TYPES.HEALTHY:
        return defaultStyles.healthy;
      case STATUS_TYPES.WARNING:
        return defaultStyles.warning;
      case STATUS_TYPES.ERROR:
        return defaultStyles.error;
      default:
        return defaultStyles.unknown;
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (status) {
      case STATUS_TYPES.HEALTHY:
        return 'Healthy';
      case STATUS_TYPES.WARNING:
        return 'Degraded';
      case STATUS_TYPES.ERROR:
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  // Merge custom styles with defaults
  const containerStyle = { ...defaultStyles.container, ...style.container };
  const indicatorStyle = { 
    ...defaultStyles.indicator, 
    ...getStatusColor(), 
    ...style.indicator 
  };
  const textStyle = { ...defaultStyles.text, ...style.text };

  return (
    <div style={containerStyle}>
      <div style={indicatorStyle} />
      <div style={textStyle}>
        {label || 'API'}: {getStatusText()}
        {showResponseTime && responseTime && ` (${responseTime}ms)`}
        {error && <div style={{ color: '#F44336', fontSize: '12px' }}>{error}</div>}
      </div>
    </div>
  );
};

ApiStatus.propTypes = {
  endpoint: PropTypes.string.isRequired,
  label: PropTypes.string,
  refreshInterval: PropTypes.number,
  style: PropTypes.object,
  onStatusChange: PropTypes.func,
  showResponseTime: PropTypes.bool,
};

export default ApiStatus;
