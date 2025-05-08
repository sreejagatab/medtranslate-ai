/**
 * Enhanced OfflineStatusIndicator Component for MedTranslate AI Patient App
 *
 * This component displays the current connection status, offline queue information,
 * and network quality metrics. It provides visual feedback to patients about the
 * system's ability to operate in offline mode.
 *
 * It's designed with a simpler interface than the provider version, focusing on
 * clear status indicators rather than detailed technical information.
 *
 * Enhanced features:
 * - Clearer visual indicators for connection status with intuitive color coding
 * - Simplified offline readiness indicator with user-friendly progress visualization
 * - User-friendly error messages and guidance with actionable recommendations
 * - Simple manual sync option with clear feedback on sync status
 * - Animated indicators for critical status changes
 * - Accessibility improvements for better readability
 * - Responsive design for various screen sizes
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Badge,
  Chip,
  Tooltip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
  LinearProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SyncIcon from '@mui/icons-material/Sync';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import websocketService from '../services/websocket-service';
import offlineService from '../services/offline-service';

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

const ReadinessProgressBar = styled(LinearProgress)(({ theme, value }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: theme.palette.grey[300],
  '& .MuiLinearProgress-bar': {
    backgroundColor:
      value >= 80 ? theme.palette.success.main :
      value >= 50 ? theme.palette.warning.main :
      theme.palette.error.main
  }
}));

const ActionButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginRight: theme.spacing(1),
  textTransform: 'none'
}));

const StatusChip = styled(Chip)(({ theme, severity }) => ({
  backgroundColor:
    severity === 'success' ? theme.palette.success.light :
    severity === 'warning' ? theme.palette.warning.light :
    severity === 'error' ? theme.palette.error.light :
    theme.palette.info.light,
  color:
    severity === 'success' ? theme.palette.success.contrastText :
    severity === 'warning' ? theme.palette.warning.contrastText :
    severity === 'error' ? theme.palette.error.contrastText :
    theme.palette.info.contrastText,
  marginRight: theme.spacing(1),
  marginBottom: theme.spacing(1)
}));

const OfflineStatusIndicator = () => {
  // Connection and network state
  const [connectionState, setConnectionState] = useState('disconnected');
  const [networkStatus, setNetworkStatus] = useState({ online: navigator.onLine });
  const [queueStats, setQueueStats] = useState({ totalMessages: 0, sessionMessages: 0 });
  const [networkQuality, setNetworkQuality] = useState({ quality: 0.5 });
  const [showDetails, setShowDetails] = useState(false);

  // Offline readiness state
  const [offlineReadiness, setOfflineReadiness] = useState(0);
  const [offlineRisk, setOfflineRisk] = useState(0);
  const [showAlert, setShowAlert] = useState(false);

  // Action states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState(null);

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

  // Fetch offline readiness information
  useEffect(() => {
    const updateOfflineReadiness = async () => {
      try {
        const readinessInfo = await offlineService.getOfflineReadiness();
        setOfflineReadiness(readinessInfo.readinessPercentage || 0);
        setOfflineRisk(readinessInfo.offlineRisk || 0);

        // Show alert if high offline risk is detected
        if (readinessInfo.offlineRisk > 0.7 && !showAlert) {
          setShowAlert(true);
        }
      } catch (error) {
        console.error('Error fetching offline readiness:', error);
      }
    };

    // Initial update
    updateOfflineReadiness();

    // Set up periodic updates
    const intervalId = setInterval(() => {
      updateOfflineReadiness();
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [showAlert]);

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
        return 'Your connection is stable. All translation features are available.';
      case 'reconnecting':
        return 'Reconnecting to the server... Please wait a moment while we restore your connection.';
      case 'waiting_for_network':
        return 'Please check your internet connection. Make sure Wi-Fi or mobile data is turned on.';
      case 'failed':
        return 'Unable to connect to the server. Your translations will be saved and sent when your connection is restored.';
      default:
        return 'Not connected to the server. Some features may be limited.';
    }
  };

  // Get user-friendly recommendation based on connection state and offline readiness
  const getRecommendation = () => {
    if (!networkStatus.online) {
      return 'You are currently offline. Basic translation features will still work.';
    }

    if (connectionState === 'connected' && offlineReadiness >= 80) {
      return 'Your app is fully prepared for offline use. You can continue using the app even if you lose connection.';
    }

    if (connectionState === 'connected' && offlineReadiness < 50) {
      return 'Your app is not fully prepared for offline use. Stay connected to ensure all features work properly.';
    }

    if (connectionState === 'reconnecting') {
      return 'Please wait while we restore your connection. Your data is being saved.';
    }

    if (offlineRisk > 0.7) {
      return 'There is a high risk of losing connection. The app is preparing for offline mode.';
    }

    return '';
  };

  // Get offline readiness text
  const getOfflineReadinessText = () => {
    if (offlineReadiness >= 80) return 'Ready for offline use';
    if (offlineReadiness >= 50) return 'Preparing for offline use';
    return 'Limited offline capability';
  };

  // Handle manual sync
  const handleManualSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const result = await offlineService.manualSync();

      // Update queue stats after sync
      await updateQueueStats();

      // Set sync result
      setSyncResult({
        itemsSynced: result?.itemsSynced || 0,
        timestamp: new Date().toLocaleTimeString()
      });

      // Clear sync result after 5 seconds
      setTimeout(() => {
        setSyncResult(null);
      }, 5000);
    } catch (error) {
      console.error('Error during manual sync:', error);
      setSyncError(error.message);

      // Clear sync error after 5 seconds
      setTimeout(() => {
        setSyncError(null);
      }, 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Box>
      {/* Alert for high offline risk */}
      <Collapse in={showAlert}>
        <Alert
          severity="warning"
          sx={{ mb: 1 }}
          onClose={() => setShowAlert(false)}
        >
          <Typography variant="body2">
            <strong>Offline risk detected!</strong> The app is preparing for possible offline operation.
          </Typography>
        </Alert>
      </Collapse>

      {/* Main Status Container */}
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

            {/* Offline Readiness Indicator */}
            {offlineReadiness > 0 && (
              <Tooltip title={`Offline Readiness: ${Math.round(offlineReadiness)}%`}>
                <Chip
                  size="small"
                  label={getOfflineReadinessText()}
                  color={
                    offlineReadiness >= 80 ? "success" :
                    offlineReadiness >= 50 ? "info" : "default"
                  }
                  variant="outlined"
                  sx={{ ml: 1, height: 20 }}
                />
              </Tooltip>
            )}
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={() => setShowDetails(!showDetails)}
          sx={{ minWidth: 'auto', p: 0.5 }}
        >
          {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </StatusContainer>

      {/* Sync Result Message */}
      <Collapse in={!!syncResult || !!syncError}>
        <Box sx={{ mb: 1 }}>
          {syncResult && (
            <Alert severity="success" sx={{ mb: 1 }}>
              Successfully synced {syncResult.itemsSynced} items at {syncResult.timestamp}
            </Alert>
          )}

          {syncError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              Sync error: {syncError}
            </Alert>
          )}
        </Box>
      </Collapse>

      {/* Detailed Status Panel */}
      <Collapse in={showDetails}>
        <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="body2" gutterBottom>
            {getStatusMessage()}
          </Typography>

          {getRecommendation() && (
            <Alert
              severity={
                !networkStatus.online || offlineRisk > 0.7 ? "warning" :
                offlineReadiness >= 80 ? "success" : "info"
              }
              sx={{ mt: 1, mb: 1 }}
            >
              {getRecommendation()}
            </Alert>
          )}

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

          {/* Offline Readiness Section */}
          {offlineReadiness > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Offline Readiness</Typography>
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Readiness Level:</Typography>
                  <Typography variant="body2">{Math.round(offlineReadiness)}%</Typography>
                </Box>
                <ReadinessProgressBar
                  variant="determinate"
                  value={offlineReadiness}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {offlineReadiness >= 80 ?
                    'Your app is fully prepared for offline use.' :
                    offlineReadiness >= 50 ?
                    'Your app is preparing for offline use. Some features may be limited if you go offline.' :
                    'Limited offline capability. Many features may not work if you go offline.'
                  }
                </Typography>
              </Box>
            </Box>
          )}

          {/* Manual Sync Button */}
          {networkStatus.online && (
            <ActionButton
              variant="contained"
              color="primary"
              size="small"
              startIcon={isSyncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
              onClick={handleManualSync}
              disabled={isSyncing}
              fullWidth
              sx={{ mt: 2 }}
            >
              {isSyncing ? 'Syncing...' : 'Manual Sync'}
            </ActionButton>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default OfflineStatusIndicator;
