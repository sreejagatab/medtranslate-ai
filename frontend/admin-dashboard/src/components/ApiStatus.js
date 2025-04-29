import React, { useState, useEffect } from 'react';
import { Badge, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

/**
 * ApiStatus Component
 * 
 * Displays the current API status with a colored badge
 * Automatically refreshes status at regular intervals
 */
const ApiStatus = ({ refreshInterval = 60000 }) => {
  const [status, setStatus] = useState('unknown');
  const [lastChecked, setLastChecked] = useState(null);
  const [details, setDetails] = useState({});
  const { token } = useAuth();

  // Check API status
  const checkStatus = async () => {
    try {
      // If no token, set status to unknown
      if (!token) {
        setStatus('unknown');
        return;
      }

      const response = await fetch(`${API_URL}/monitoring/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        setStatus('error');
        return;
      }

      const data = await response.json();
      
      if (data.success && data.health) {
        setStatus(data.health.status);
        setDetails(data.health);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error checking API status:', error);
      setStatus('error');
    } finally {
      setLastChecked(new Date());
    }
  };

  // Check status on mount and at regular intervals
  useEffect(() => {
    checkStatus();
    
    const intervalId = setInterval(() => {
      checkStatus();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval, token]);

  // Get badge variant based on status
  const getBadgeVariant = () => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
      case 'error':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Format last checked time
  const formatLastChecked = () => {
    if (!lastChecked) return 'Never';
    
    return lastChecked.toLocaleTimeString();
  };

  // Generate tooltip content
  const tooltipContent = (
    <div>
      <div><strong>Status:</strong> {status.toUpperCase()}</div>
      <div><strong>Last Checked:</strong> {formatLastChecked()}</div>
      {details.components && (
        <div>
          <strong>Components:</strong>
          <ul style={{ paddingLeft: '20px', marginBottom: '0' }}>
            {Object.entries(details.components).map(([name, data]) => (
              <li key={name}>
                {name}: {data.status}
              </li>
            ))}
          </ul>
        </div>
      )}
      {details.activeAlerts > 0 && (
        <div><strong>Active Alerts:</strong> {details.activeAlerts}</div>
      )}
    </div>
  );

  return (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id="api-status-tooltip">{tooltipContent}</Tooltip>}
    >
      <Badge 
        bg={getBadgeVariant()} 
        style={{ cursor: 'pointer' }}
        onClick={checkStatus}
      >
        API: {status.toUpperCase()}
      </Badge>
    </OverlayTrigger>
  );
};

export default ApiStatus;
