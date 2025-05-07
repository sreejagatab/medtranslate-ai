/**
 * OfflineStatusIndicator Component for MedTranslate AI
 *
 * This component displays the current connection status, offline queue information,
 * and network quality metrics. It provides visual feedback to users about the
 * system's ability to operate in offline mode.
 *
 * Enhanced features:
 * - Detailed offline readiness information
 * - Manual sync controls
 * - Predictive caching status
 * - Storage optimization status
 * - Enhanced visual indicators for network quality
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Badge,
  Chip,
  Tooltip,
  CircularProgress,
  Button,
  IconButton,
  Switch,
  LinearProgress,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { styled } from '@mui/material/styles';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StorageIcon from '@mui/icons-material/Storage';
import SyncIcon from '@mui/icons-material/Sync';
import MemoryIcon from '@mui/icons-material/Memory';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
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

const OfflineReadinessIndicator = styled(Box)(({ theme, readiness }) => ({
  width: '100%',
  height: 8,
  backgroundColor: theme.palette.grey[300],
  borderRadius: 4,
  position: 'relative',
  overflow: 'hidden',
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: `${readiness}%`,
    backgroundColor:
      readiness > 80 ? theme.palette.success.main :
      readiness > 50 ? theme.palette.warning.main :
      theme.palette.error.main
  }
}));

const ActionButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginRight: theme.spacing(1)
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
  const [offlineEvents, setOfflineEvents] = useState([]);

  // Offline readiness state
  const [offlineReadiness, setOfflineReadiness] = useState(0);
  const [offlineRisk, setOfflineRisk] = useState(0);
  const [predictedOfflineDuration, setPredictedOfflineDuration] = useState(0);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Storage state
  const [storageInfo, setStorageInfo] = useState({
    usagePercentage: 0,
    currentUsageMB: 0,
    quotaMB: 0,
    reservedForOfflineMB: 0
  });

  // Action states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Dialog states
  const [showPrepareDialog, setShowPrepareDialog] = useState(false);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

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
      // Add event to the list with timestamp
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event,
          data,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9) // Keep only the last 10 events
      ]);

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
        setPredictedOfflineDuration(readinessInfo.predictedDurationHours || 0);

        // Show alert if high offline risk is detected
        if (readinessInfo.offlineRisk > 0.7 && !showOfflineAlert) {
          setShowOfflineAlert(true);
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
  }, [showOfflineAlert]);

  // Fetch storage information
  useEffect(() => {
    const updateStorageInfo = async () => {
      try {
        const info = await offlineService.getStorageInfo();
        setStorageInfo(info);
      } catch (error) {
        console.error('Error fetching storage info:', error);
      }
    };

    // Initial update
    updateStorageInfo();

    // Set up periodic updates
    const intervalId = setInterval(() => {
      updateStorageInfo();
    }, 60000); // Update every minute

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

  // Handle manual sync
  const handleManualSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      await offlineService.manualSync();
      // Update queue stats after sync
      await updateQueueStats();
      // Add event to the list
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'manualSync',
          data: { success: true },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    } catch (error) {
      console.error('Error during manual sync:', error);
      // Add error event to the list
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'manualSyncError',
          data: { error: error.message },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle prepare for offline
  const handlePrepareForOffline = async () => {
    if (isPreparing) return;

    setIsPreparing(true);
    try {
      await offlineService.prepareForOffline({
        forcePrepare: true,
        highPriority: offlineRisk > 0.5
      });

      // Update offline readiness after preparation
      const readinessInfo = await offlineService.getOfflineReadiness();
      setOfflineReadiness(readinessInfo.readinessPercentage || 0);

      // Add event to the list
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'prepareForOffline',
          data: { success: true },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);

      // Close the dialog
      setShowPrepareDialog(false);
    } catch (error) {
      console.error('Error preparing for offline:', error);
      // Add error event to the list
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'prepareForOfflineError',
          data: { error: error.message },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    } finally {
      setIsPreparing(false);
    }
  };

  // Handle optimize storage
  const handleOptimizeStorage = async () => {
    if (isOptimizing) return;

    setIsOptimizing(true);
    try {
      await offlineService.optimizeStorage({
        force: true
      });

      // Update storage info after optimization
      const info = await offlineService.getStorageInfo();
      setStorageInfo(info);

      // Add event to the list
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'optimizeStorage',
          data: { success: true },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    } catch (error) {
      console.error('Error optimizing storage:', error);
      // Add error event to the list
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'optimizeStorageError',
          data: { error: error.message },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle auto-sync toggle
  const handleAutoSyncToggle = async (event) => {
    const newValue = event.target.checked;
    setAutoSyncEnabled(newValue);

    try {
      await offlineService.setAutoSync(newValue);
      // Add event to the list
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'autoSyncToggle',
          data: { enabled: newValue },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    } catch (error) {
      console.error('Error toggling auto-sync:', error);
      // Revert the toggle if there was an error
      setAutoSyncEnabled(!newValue);
    }
  };

  // Get offline readiness text
  const getOfflineReadinessText = () => {
    if (offlineReadiness >= 80) return 'Ready';
    if (offlineReadiness >= 50) return 'Preparing';
    return 'Not Ready';
  };

  // Get offline risk text
  const getOfflineRiskText = () => {
    if (offlineRisk >= 0.7) return 'High';
    if (offlineRisk >= 0.3) return 'Medium';
    return 'Low';
  };

  // Get offline risk color
  const getOfflineRiskColor = (theme) => {
    if (offlineRisk >= 0.7) return theme.palette.error.main;
    if (offlineRisk >= 0.3) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  return (
    <Box>
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
            <Tooltip title={`Network Quality: ${Math.round(networkQuality.quality * 100)}%`}>
              <NetworkQualityIndicator quality={networkQuality.quality} />
            </Tooltip>

            {queueStats.totalMessages > 0 && (
              <Tooltip title={`${queueStats.totalMessages} messages in offline queue`}>
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

            {/* Offline Risk Indicator */}
            {offlineRisk > 0.3 && (
              <Tooltip title={`Offline Risk: ${Math.round(offlineRisk * 100)}%`}>
                <Chip
                  size="small"
                  label={getOfflineRiskText()}
                  color={offlineRisk > 0.7 ? "error" : "warning"}
                  variant="outlined"
                  icon={<CloudOffIcon fontSize="small" />}
                  sx={{ ml: 1, height: 20 }}
                />
              </Tooltip>
            )}

            {/* Offline Readiness Indicator */}
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
          </Box>
        </Box>

        {/* Manual Sync Button */}
        <Tooltip title="Manual Sync">
          <IconButton
            size="small"
            onClick={handleManualSync}
            disabled={isSyncing || !networkStatus.online}
            sx={{ mr: 1 }}
          >
            {isSyncing ? (
              <CircularProgress size={20} />
            ) : (
              <SyncIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <Button
          size="small"
          onClick={() => setShowDetails(!showDetails)}
          sx={{ minWidth: 'auto', p: 0.5 }}
        >
          {showDetails ? 'Hide' : 'Details'}
        </Button>
      </StatusContainer>

      {/* Detailed Status Panel */}
      {showDetails && (
        <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          {/* Network Status Section */}
          <Typography variant="subtitle2" gutterBottom>Network Status</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {networkStatus.online ? (
              <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
            ) : (
              <WarningIcon fontSize="small" color="error" sx={{ mr: 0.5 }} />
            )}
            <Typography variant="body2">
              {networkStatus.online ? 'Online' : 'Offline'}
            </Typography>

            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 1 }}>Auto-Sync:</Typography>
              <Switch
                size="small"
                checked={autoSyncEnabled}
                onChange={handleAutoSyncToggle}
                disabled={!networkStatus.online}
              />
            </Box>
          </Box>

          {/* Offline Readiness Section */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Offline Readiness</Typography>
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">Readiness Level:</Typography>
              <Typography variant="body2">{Math.round(offlineReadiness)}%</Typography>
            </Box>
            <OfflineReadinessIndicator readiness={offlineReadiness} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2">Offline Risk:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme => getOfflineRiskColor(theme) }}>
                {getOfflineRiskText()} ({Math.round(offlineRisk * 100)}%)
              </Typography>
            </Box>

            {predictedOfflineDuration > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2">Predicted Duration:</Typography>
                <Typography variant="body2">{predictedOfflineDuration.toFixed(1)} hours</Typography>
              </Box>
            )}

            <ActionButton
              variant="contained"
              color="primary"
              size="small"
              startIcon={isPreparing ? <CircularProgress size={20} color="inherit" /> : <CloudOffIcon />}
              onClick={() => setShowPrepareDialog(true)}
              disabled={isPreparing || offlineReadiness >= 95}
              fullWidth
            >
              {isPreparing ? 'Preparing...' : 'Prepare for Offline'}
            </ActionButton>
          </Box>

          {/* Storage Status Section */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Storage Status</Typography>
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">Storage Usage:</Typography>
              <Typography variant="body2">{Math.round(storageInfo.usagePercentage)}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={storageInfo.usagePercentage}
              color={
                storageInfo.usagePercentage > 90 ? "error" :
                storageInfo.usagePercentage > 70 ? "warning" : "success"
              }
              sx={{ mb: 1 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2">Used Space:</Typography>
              <Typography variant="body2">{storageInfo.currentUsageMB.toFixed(1)} MB</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2">Reserved for Offline:</Typography>
              <Typography variant="body2">{storageInfo.reservedForOfflineMB.toFixed(1)} MB</Typography>
            </Box>

            <ActionButton
              variant="contained"
              color="secondary"
              size="small"
              startIcon={isOptimizing ? <CircularProgress size={20} color="inherit" /> : <StorageIcon />}
              onClick={handleOptimizeStorage}
              disabled={isOptimizing || storageInfo.usagePercentage < 50}
              fullWidth
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize Storage'}
            </ActionButton>
          </Box>

          {/* Offline Queue Section */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Offline Queue</Typography>
          <Typography variant="body2" gutterBottom>
            {queueStats.totalMessages} total messages in queue
            {queueStats.sessionMessages > 0 && ` (${queueStats.sessionMessages} for current session)`}
          </Typography>

          {/* Recent Events Section */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Recent Events</Typography>
          <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
            {offlineEvents.length > 0 ? (
              offlineEvents.map(event => (
                <Typography key={event.id} variant="caption" display="block" sx={{ mb: 0.5 }}>
                  <strong>{event.timestamp}</strong>: {event.event}
                  {event.data && event.data.error && (
                    <span style={{ color: 'red' }}> - Error: {event.data.error}</span>
                  )}
                </Typography>
              ))
            ) : (
              <Typography variant="caption">No recent events</Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Prepare for Offline Dialog */}
      <Dialog
        open={showPrepareDialog}
        onClose={() => setShowPrepareDialog(false)}
      >
        <DialogTitle>Prepare for Offline Mode</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will prepare the system for offline operation by:
            <ul>
              <li>Caching critical medical data</li>
              <li>Optimizing storage for offline use</li>
              <li>Preparing translation models for offline operation</li>
            </ul>
            {offlineRisk > 0.5 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>High offline risk detected!</strong> The system predicts a {Math.round(offlineRisk * 100)}% chance of going offline in the next {predictedOfflineDuration.toFixed(1)} hours.
              </Alert>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrepareDialog(false)}>Cancel</Button>
          <Button
            onClick={handlePrepareForOffline}
            variant="contained"
            color="primary"
            disabled={isPreparing}
          >
            {isPreparing ? 'Preparing...' : 'Prepare Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Offline Risk Alert */}
      <Dialog
        open={showOfflineAlert}
        onClose={() => setShowOfflineAlert(false)}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            Offline Risk Alert
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>High offline risk detected!</strong> The system predicts a {Math.round(offlineRisk * 100)}% chance of going offline in the next {predictedOfflineDuration.toFixed(1)} hours.
            <Box sx={{ mt: 2 }}>
              Current offline readiness: <strong>{Math.round(offlineReadiness)}%</strong>
            </Box>
            <OfflineReadinessIndicator readiness={offlineReadiness} sx={{ mt: 1 }} />

            {offlineReadiness < 80 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Your system is not fully prepared for offline operation. It is recommended to prepare for offline mode now.
              </Alert>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOfflineAlert(false)}>Dismiss</Button>
          <Button
            onClick={() => {
              setShowOfflineAlert(false);
              setShowPrepareDialog(true);
            }}
            variant="contained"
            color="primary"
            disabled={offlineReadiness >= 95}
          >
            Prepare for Offline
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfflineStatusIndicator;
