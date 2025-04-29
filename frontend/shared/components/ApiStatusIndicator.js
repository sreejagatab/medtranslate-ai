/**
 * ApiStatusIndicator Component for MedTranslate AI
 * 
 * This is a lightweight version of ApiStatus that can be used in headers and navigation bars.
 * It shows a simple colored dot to indicate the status of an API endpoint.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Default styles
const defaultStyles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  indicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '6px',
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
 * ApiStatusIndicator component
 * 
 * @param {Object} props - Component props
 * @param {string} props.endpoint - API endpoint to check
 * @param {string} props.label - Label to display (optional)
 * @param {number} props.refreshInterval - Refresh interval in milliseconds
 * @param {Object} props.style - Custom styles
 * @param {Function} props.onStatusChange - Callback when status changes
 * @param {boolean} props.showLabel - Whether to show the label
 * @returns {JSX.Element} ApiStatusIndicator component
 */
const ApiStatusIndicator = ({
  endpoint,
  label,
  refreshInterval = 30000,
  style = {},
  onStatusChange = null,
  showLabel = true,
}) => {
  const [status, setStatus] = useState(STATUS_TYPES.UNKNOWN);
  const [responseTime, setResponseTime] = useState(null);

  // Check API status
  const checkStatus = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      const endTime = Date.now();
      const latency = endTime - startTime;
      setResponseTime(latency);

      if (response.ok) {
        // Determine status based on response time
        let newStatus = STATUS_TYPES.HEALTHY;
        if (latency > 1000) {
          newStatus = STATUS_TYPES.WARNING;
        }
        
        setStatus(newStatus);
        
        // Call onStatusChange callback if provided
        if (onStatusChange) {
          onStatusChange(newStatus, latency);
        }
      } else {
        setStatus(STATUS_TYPES.ERROR);
        
        if (onStatusChange) {
          onStatusChange(STATUS_TYPES.ERROR, latency);
        }
      }
    } catch (err) {
      setStatus(STATUS_TYPES.ERROR);
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
      {showLabel && <div style={textStyle}>{label || 'API'}</div>}
    </div>
  );
};

ApiStatusIndicator.propTypes = {
  endpoint: PropTypes.string.isRequired,
  label: PropTypes.string,
  refreshInterval: PropTypes.number,
  style: PropTypes.object,
  onStatusChange: PropTypes.func,
  showLabel: PropTypes.bool,
};

export default ApiStatusIndicator;
