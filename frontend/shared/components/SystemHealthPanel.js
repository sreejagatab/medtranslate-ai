/**
 * SystemHealthPanel Component for MedTranslate AI
 * 
 * This component displays the health status of multiple system components
 * in a panel format. It can be used in dashboards and monitoring pages.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { checkSystemHealth } from '../services/health-service';

// Default styles
const defaultStyles = {
  container: {
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    padding: '16px',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
  },
  refreshButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#0077cc',
    fontSize: '14px',
  },
  componentList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  componentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  componentName: {
    fontWeight: '500',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
  },
  dot: {
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
  statusText: {
    fontSize: '14px',
  },
  responseTime: {
    fontSize: '12px',
    color: '#757575',
    marginLeft: '8px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    fontSize: '12px',
    color: '#757575',
  },
  loading: {
    textAlign: 'center',
    padding: '16px',
    color: '#757575',
  },
  error: {
    color: '#F44336',
    padding: '8px',
    backgroundColor: '#FFEBEE',
    borderRadius: '4px',
    marginBottom: '16px',
  },
};

/**
 * SystemHealthPanel component
 * 
 * @param {Object} props - Component props
 * @param {Array<Object>} props.endpoints - Array of endpoint objects
 * @param {string} props.title - Panel title
 * @param {number} props.refreshInterval - Refresh interval in milliseconds
 * @param {Object} props.style - Custom styles
 * @param {Function} props.onStatusChange - Callback when status changes
 * @returns {JSX.Element} SystemHealthPanel component
 */
const SystemHealthPanel = ({
  endpoints,
  title = 'System Health',
  refreshInterval = 60000,
  style = {},
  onStatusChange = null,
}) => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch health data
  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await checkSystemHealth(endpoints);
      setHealthData(data);
      setLastUpdated(new Date());
      
      if (onStatusChange) {
        onStatusChange(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch health data');
      console.error('Error fetching health data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and set up interval
  useEffect(() => {
    fetchHealthData();
    
    const intervalId = setInterval(fetchHealthData, refreshInterval);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return defaultStyles.healthy;
      case 'warning':
        return defaultStyles.warning;
      case 'error':
        return defaultStyles.error;
      default:
        return defaultStyles.unknown;
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'warning':
        return 'Degraded';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  // Merge custom styles with defaults
  const containerStyle = { ...defaultStyles.container, ...style.container };
  const headerStyle = { ...defaultStyles.header, ...style.header };
  const titleStyle = { ...defaultStyles.title, ...style.title };
  const refreshButtonStyle = { ...defaultStyles.refreshButton, ...style.refreshButton };
  const componentListStyle = { ...defaultStyles.componentList, ...style.componentList };
  const footerStyle = { ...defaultStyles.footer, ...style.footer };
  const loadingStyle = { ...defaultStyles.loading, ...style.loading };
  const errorStyle = { ...defaultStyles.error, ...style.error };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <button 
          style={refreshButtonStyle} 
          onClick={fetchHealthData}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      
      {error && <div style={errorStyle}>{error}</div>}
      
      {loading && !healthData ? (
        <div style={loadingStyle}>Loading health data...</div>
      ) : (
        <>
          <ul style={componentListStyle}>
            {healthData?.components.map((component) => (
              <li 
                key={component.name} 
                style={defaultStyles.componentItem}
              >
                <span style={defaultStyles.componentName}>
                  {component.name}
                </span>
                <div style={defaultStyles.statusIndicator}>
                  <div 
                    style={{
                      ...defaultStyles.dot,
                      ...getStatusColor(component.status),
                    }}
                  />
                  <span style={defaultStyles.statusText}>
                    {getStatusText(component.status)}
                  </span>
                  {component.responseTime && (
                    <span style={defaultStyles.responseTime}>
                      {component.responseTime}ms
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          
          <div style={footerStyle}>
            <span>Last updated: {formatDate(lastUpdated)}</span>
            <span>
              Overall: {healthData ? getStatusText(healthData.status) : 'Unknown'}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

SystemHealthPanel.propTypes = {
  endpoints: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      options: PropTypes.object,
    })
  ).isRequired,
  title: PropTypes.string,
  refreshInterval: PropTypes.number,
  style: PropTypes.object,
  onStatusChange: PropTypes.func,
};

export default SystemHealthPanel;
