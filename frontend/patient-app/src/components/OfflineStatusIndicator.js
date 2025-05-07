/**
 * OfflineStatusIndicator Component for MedTranslate AI Patient App
 * 
 * This component displays the current connection status, offline queue information,
 * and network quality metrics. It provides visual feedback to patients about the
 * system's ability to operate in offline mode.
 * 
 * It's designed with a simpler interface than the provider version, focusing on
 * clear status indicators rather than detailed technical information.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Badge, Chip, Tooltip, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import websocketService from '../services/websocket-service';

// Styled components
const StatusContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  marginBottom: theme.spacing(1)
}));

const StatusBadge = styled(Badge)(({ theme, status }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: 
      status === 'connected' ? theme.palette.success.main :
      status === 'reconnecting' ? theme.palette.warning.main :
      status === 'waiting_for_network' ? theme.palette.error.main :
      theme.palette.error.dark,
    color: theme.palette.common.white
  }
}));

const NetworkQualityIndicator = styled(Box)(({ theme, quality }) => ({
  width: 50,
  height: 8,
  backgroundColor: theme.palette.grey[300],
  borderRadius: 4,
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: `${quality * 100}%`,
    backgroundColor: 
      quality > 0.7 ? theme.palette.success.main :
      quality > 0.3 ? theme.palette.warning.main :
      theme.palette.error.main
  }
}));

const OfflineStatusIndicator = () => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [networkStatus, setNetworkStatus] = useState({ online: navigator.onLine });
  const [queueStats, setQueueStats] = useState({ totalMessages: 0, sessionMessages: 0 });
  const [networkQuality, setNetworkQuality] = useState({ quality: 0.5 });
  const [showDetails, setShowDetails] = useState(false);

  // Update connection state when it changes
  useEffect(() => {
    const handleConnectionState = (state, data) => {
      setConnectionState(state);
    };

    websocketService.onConnectionState(handleConnectionState);

    return () => {
      websocketService.offConnectionState(handleConnectionState);
    };
  }, []);

  // Handle offline events
  useEffect(() => {
    const handleOfflineEvent = (event, data) => {
      // Update network status if it's a network status change event
      if (event === 'networkStatusChange') {
        setNetworkStatus(data);
      }

      // Update queue stats if it's a queue-related event
      if (['offlineQueueProcessed', 'offlineMessageSent', 'offlineMessageFailed'].includes(event)) {
        updateQueueStats();
      }
    };

    websocketService.onOfflineMessage(handleOfflineEvent);

    return () => {
      websocketService.offOfflineMessage(handleOfflineEvent);
    };
  }, []);

  // Fetch initial data and set up periodic updates
  useEffect(() => {
    const updateNetworkQuality = async () => {
      try {
        const qualityInfo = websocketService.getNetworkQualityInfo();
        setNetworkQuality(qualityInfo);
      } catch (error) {
        console.error('Error fetching network quality:', error);
      }
    };

    const updateQueueStats = async () => {
      try {
        const stats = await websocketService.getOfflineQueueStats();
        setQueueStats(stats);
      } catch (error) {
        console.error('Error fetching queue stats:', error);
      }
    };

    // Initial updates
    updateNetworkQuality();
    updateQueueStats();

    // Set up periodic updates
    const intervalId = setInterval(() => {
      updateNetworkQuality();
      updateQueueStats();
    }, 10000); // Update every 10 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Update queue stats
  const updateQueueStats = async () => {
    try {
      const stats = await websocketService.getOfflineQueueStats();
      setQueueStats(stats);
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  // Get status icon based on connection state
  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <WifiIcon color="success" />;
      case 'reconnecting':
        return <CloudSyncIcon color="warning" />;
      case 'waiting_for_network':
        return <WifiOffIcon color="error" />;
      case 'failed':
        return <CloudOffIcon color="error" />;
      default:
        return <WifiOffIcon color="disabled" />;
    }
  };

  // Get status text based on connection state
  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'waiting_for_network':
        return 'Waiting for network';
      case 'failed':
        return 'Connection failed';
      default:
        return 'Disconnected';
    }
  };

  // Get user-friendly message based on connection state
  const getStatusMessage = () => {
    switch (connectionState) {
      case 'connected':
        return 'Your connection is stable.';
      case 'reconnecting':
        return 'Reconnecting to the server...';
      case 'waiting_for_network':
        return 'Please check your internet connection.';
      case 'failed':
        return 'Unable to connect. Your messages will be sent when connection is restored.';
      default:
        return 'Not connected to the server.';
    }
  };

  return (
    <Box>
      <StatusContainer>
        <StatusBadge
          status={connectionState}
          variant="dot"
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Box sx={{ mr: 1 }}>{getStatusIcon()}</Box>
        </StatusBadge>
        
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            {getStatusText()}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            <Tooltip title={`Connection Quality: ${Math.round(networkQuality.quality * 100)}%`}>
              <NetworkQualityIndicator quality={networkQuality.quality} />
            </Tooltip>
            
            {queueStats.totalMessages > 0 && (
              <Tooltip title={`${queueStats.totalMessages} messages waiting to be sent`}>
                <Chip
                  size="small"
                  label={queueStats.totalMessages}
                  color="primary"
                  variant="outlined"
                  icon={<CloudSyncIcon fontSize="small" />}
                  sx={{ ml: 1, height: 20 }}
                />
              </Tooltip>
            )}
          </Box>
        </Box>
        
        <Button
          size="small"
          onClick={() => setShowDetails(!showDetails)}
          sx={{ minWidth: 'auto', p: 0.5 }}
        >
          {showDetails ? 'Hide' : 'Details'}
        </Button>
      </StatusContainer>
      
      {showDetails && (
        <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="body2" gutterBottom>
            {getStatusMessage()}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {networkStatus.online ? (
              <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
            ) : (
              <WarningIcon fontSize="small" color="error" sx={{ mr: 0.5 }} />
            )}
            <Typography variant="body2">
              {networkStatus.online ? 'Internet connection available' : 'No internet connection'}
            </Typography>
          </Box>
          
          {queueStats.totalMessages > 0 && (
            <Typography variant="body2" gutterBottom>
              {queueStats.totalMessages} message{queueStats.totalMessages !== 1 ? 's' : ''} will be sent automatically when connection is restored.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default OfflineStatusIndicator;
