/**
 * CacheStatus Component for MedTranslate AI
 * 
 * This component displays the current status of the predictive caching system
 * and provides information about offline readiness.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Default styles for web applications
const defaultStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    margin: '8px 0',
    border: '1px solid #E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
  },
  indicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    marginRight: '8px',
  },
  title: {
    margin: 0,
    fontWeight: '600',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '13px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: '2px 0',
  },
  progressContainer: {
    width: '100%',
    height: '6px',
    backgroundColor: '#E0E0E0',
    borderRadius: '3px',
    marginTop: '8px',
  },
  progressBar: {
    height: '100%',
    borderRadius: '3px',
  },
  offlineReady: {
    backgroundColor: '#4CAF50', // Green
  },
  partiallyReady: {
    backgroundColor: '#FFC107', // Yellow
  },
  notReady: {
    backgroundColor: '#F44336', // Red
  },
  unknown: {
    backgroundColor: '#9E9E9E', // Gray
  },
  expandButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginLeft: 'auto',
    padding: '4px',
    fontSize: '12px',
    color: '#2196F3',
  },
};

// Status types
const STATUS_TYPES = {
  OFFLINE_READY: 'offlineReady',
  PARTIALLY_READY: 'partiallyReady',
  NOT_READY: 'notReady',
  UNKNOWN: 'unknown',
};

/**
 * CacheStatus component
 * 
 * @param {Object} props - Component props
 * @param {string} props.endpoint - API endpoint to check cache status
 * @param {string} props.label - Label to display
 * @param {number} props.refreshInterval - Refresh interval in milliseconds
 * @param {Object} props.style - Custom styles
 * @param {Function} props.onStatusChange - Callback when status changes
 * @param {boolean} props.expanded - Whether to show expanded details by default
 * @returns {JSX.Element} CacheStatus component
 */
const CacheStatus = ({
  endpoint,
  label = 'Predictive Cache',
  refreshInterval = 30000,
  style = {},
  onStatusChange = null,
  expanded = false,
}) => {
  const [status, setStatus] = useState(STATUS_TYPES.UNKNOWN);
  const [cacheData, setCacheData] = useState({
    cacheSize: 0,
    itemCount: 0,
    hitRate: 0,
    offlineReadiness: 0,
    lastUpdated: null,
    predictedOffline: false,
    predictedDuration: 0,
    storageUsage: 0,
    compressionRatio: 0,
  });
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [error, setError] = useState(null);

  // Check cache status
  const checkStatus = async () => {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Set a timeout to avoid hanging
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update cache data
        setCacheData({
          cacheSize: data.cacheSize || 0,
          itemCount: data.itemCount || 0,
          hitRate: data.hitRate || 0,
          offlineReadiness: data.offlineReadiness || 0,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : null,
          predictedOffline: data.predictedOffline || false,
          predictedDuration: data.predictedDuration || 0,
          storageUsage: data.storageUsage || 0,
          compressionRatio: data.compressionRatio || 0,
        });
        
        // Determine status based on offline readiness
        let newStatus = STATUS_TYPES.UNKNOWN;
        if (data.offlineReadiness >= 0.8) {
          newStatus = STATUS_TYPES.OFFLINE_READY;
        } else if (data.offlineReadiness >= 0.4) {
          newStatus = STATUS_TYPES.PARTIALLY_READY;
        } else if (data.offlineReadiness >= 0) {
          newStatus = STATUS_TYPES.NOT_READY;
        }
        
        setStatus(newStatus);
        setError(null);
        
        // Call onStatusChange callback if provided
        if (onStatusChange) {
          onStatusChange(newStatus, data);
        }
      } else {
        setStatus(STATUS_TYPES.UNKNOWN);
        setError(`HTTP ${response.status}: ${response.statusText}`);
        
        if (onStatusChange) {
          onStatusChange(STATUS_TYPES.UNKNOWN, null, error);
        }
      }
    } catch (err) {
      setStatus(STATUS_TYPES.UNKNOWN);
      setError(err.message || 'Unknown error');
      
      if (onStatusChange) {
        onStatusChange(STATUS_TYPES.UNKNOWN, null, err);
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
      case STATUS_TYPES.OFFLINE_READY:
        return defaultStyles.offlineReady;
      case STATUS_TYPES.PARTIALLY_READY:
        return defaultStyles.partiallyReady;
      case STATUS_TYPES.NOT_READY:
        return defaultStyles.notReady;
      default:
        return defaultStyles.unknown;
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (status) {
      case STATUS_TYPES.OFFLINE_READY:
        return 'Offline Ready';
      case STATUS_TYPES.PARTIALLY_READY:
        return 'Partially Ready';
      case STATUS_TYPES.NOT_READY:
        return 'Not Ready';
      default:
        return 'Unknown';
    }
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format date to human-readable format
  const formatDate = (date) => {
    if (!date) return 'Never';
    
    return date.toLocaleString();
  };

  // Format duration to human-readable format
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours} hour${hours !== 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${remainingMinutes} min` : ''}`;
    }
  };

  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Merge custom styles with defaults
  const containerStyle = { ...defaultStyles.container, ...style.container };
  const headerStyle = { ...defaultStyles.header, ...style.header };
  const indicatorStyle = { 
    ...defaultStyles.indicator, 
    ...getStatusColor(), 
    ...style.indicator 
  };
  const titleStyle = { ...defaultStyles.title, ...style.title };
  const detailsStyle = { ...defaultStyles.details, ...style.details };
  const progressContainerStyle = { ...defaultStyles.progressContainer, ...style.progressContainer };
  const progressBarStyle = { 
    ...defaultStyles.progressBar, 
    ...getStatusColor(), 
    width: `${cacheData.offlineReadiness * 100}%`,
    ...style.progressBar 
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={indicatorStyle} />
        <h4 style={titleStyle}>
          {label}: {getStatusText()}
        </h4>
        <button 
          style={defaultStyles.expandButton} 
          onClick={toggleExpanded}
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      <div style={progressContainerStyle}>
        <div style={progressBarStyle} />
      </div>
      
      {isExpanded && (
        <div style={detailsStyle}>
          <div style={defaultStyles.detailRow}>
            <span>Offline Readiness:</span>
            <span>{(cacheData.offlineReadiness * 100).toFixed(0)}%</span>
          </div>
          <div style={defaultStyles.detailRow}>
            <span>Cache Size:</span>
            <span>{formatBytes(cacheData.cacheSize)}</span>
          </div>
          <div style={defaultStyles.detailRow}>
            <span>Items Cached:</span>
            <span>{cacheData.itemCount}</span>
          </div>
          <div style={defaultStyles.detailRow}>
            <span>Hit Rate:</span>
            <span>{(cacheData.hitRate * 100).toFixed(0)}%</span>
          </div>
          <div style={defaultStyles.detailRow}>
            <span>Storage Usage:</span>
            <span>{(cacheData.storageUsage * 100).toFixed(0)}%</span>
          </div>
          {cacheData.compressionRatio > 1 && (
            <div style={defaultStyles.detailRow}>
              <span>Compression Ratio:</span>
              <span>{cacheData.compressionRatio.toFixed(1)}x</span>
            </div>
          )}
          <div style={defaultStyles.detailRow}>
            <span>Last Updated:</span>
            <span>{formatDate(cacheData.lastUpdated)}</span>
          </div>
          {cacheData.predictedOffline && (
            <>
              <div style={{
                ...defaultStyles.detailRow,
                marginTop: '8px',
                fontWeight: 'bold',
                color: '#F44336'
              }}>
                <span>⚠️ Offline Period Predicted</span>
                <span>{formatDuration(cacheData.predictedDuration / 60000)}</span>
              </div>
            </>
          )}
          {error && (
            <div style={{ 
              color: '#F44336', 
              fontSize: '12px',
              marginTop: '8px'
            }}>
              Error: {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

CacheStatus.propTypes = {
  endpoint: PropTypes.string.isRequired,
  label: PropTypes.string,
  refreshInterval: PropTypes.number,
  style: PropTypes.object,
  onStatusChange: PropTypes.func,
  expanded: PropTypes.bool,
};

export default CacheStatus;
