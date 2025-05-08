/**
 * Enhanced OfflineStatusIndicator Component for MedTranslate AI
 *
 * This component displays the current connection status, offline queue information,
 * and network quality metrics. It provides visual feedback to users about the
 * system's ability to operate in offline mode.
 *
 * Enhanced features:
 * - Detailed offline readiness information with ML-based predictions
 * - Advanced manual sync controls with detailed sync metrics
 * - Comprehensive predictive caching status with performance analytics
 * - Intelligent storage optimization with priority-based management
 * - Enhanced visual indicators for network quality and connection stability
 * - Real-time monitoring of offline capabilities with detailed event logging
 * - Proactive offline preparation based on ML risk assessment
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
  AlertTitle,
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
import CircleIcon from '@mui/icons-material/Circle';
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
  const [mlPredictions, setMlPredictions] = useState({
    predictionConfidence: 0,
    topPredictions: [],
    lastPredictionTime: null,
    modelPerformance: { accuracy: 0, latency: 0 }
  });

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

        // Update ML predictions if available
        if (readinessInfo.mlPredictions) {
          setMlPredictions({
            predictionConfidence: readinessInfo.mlPredictions.confidence || 0,
            topPredictions: readinessInfo.mlPredictions.topPredictions || [],
            lastPredictionTime: readinessInfo.mlPredictions.timestamp || null,
            modelPerformance: readinessInfo.mlPredictions.modelPerformance || { accuracy: 0, latency: 0 }
          });
        }

        // Show alert if high offline risk is detected
        if (readinessInfo.offlineRisk > 0.7 && !showOfflineAlert) {
          setShowOfflineAlert(true);
        }

        // Add event to the list for significant changes
        if (Math.abs((readinessInfo.offlineRisk || 0) - offlineRisk) > 0.2) {
          setOfflineEvents(prev => [
            {
              id: Date.now(),
              event: 'offlineRiskChange',
              data: {
                previous: offlineRisk,
                current: readinessInfo.offlineRisk,
                change: (readinessInfo.offlineRisk - offlineRisk).toFixed(2),
                confidence: readinessInfo.mlPredictions?.confidence || 0,
                predictionDetails: readinessInfo.mlPredictions?.details || 'No details available'
              },
              timestamp: new Date().toLocaleTimeString()
            },
            ...prev.slice(0, 9)
          ]);
        }
      } catch (error) {
        console.error('Error fetching offline readiness:', error);
        // Add error event to the list
        setOfflineEvents(prev => [
          {
            id: Date.now(),
            event: 'offlineReadinessError',
            data: { error: error.message },
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev.slice(0, 9)
        ]);
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
  }, [showOfflineAlert, offlineRisk]);

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

  // Get offline risk color
  const getOfflineRiskColor = (theme) => {
    if (offlineRisk > 0.7) return theme.palette.error.main;
    if (offlineRisk > 0.3) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  // Get offline readiness text
  const getOfflineReadinessText = () => {
    if (offlineReadiness > 80) return "Well Prepared";
    if (offlineReadiness > 50) return "Partially Prepared";
    return "Not Prepared";
  };

  // Handle manual sync
  const handleManualSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      // Show sync progress in the UI
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'manualSyncStarted',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);

      const result = await offlineService.manualSync();

      // Update queue stats after sync
      await updateQueueStats();

      // Update offline readiness after sync
      try {
        const readinessInfo = await offlineService.getOfflineReadiness();
        setOfflineReadiness(readinessInfo.readinessPercentage || 0);
        setOfflineRisk(readinessInfo.offlineRisk || 0);
      } catch (readinessError) {
        console.warn('Could not update readiness after sync:', readinessError);
      }

      // Add success event to the list with detailed stats
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'manualSyncCompleted',
          data: {
            success: true,
            itemsSynced: result?.itemsSynced || 0,
            bytesSynced: result?.bytesSynced || 0,
            duration: result?.durationMs ? `${(result.durationMs / 1000).toFixed(1)}s` : 'unknown'
          },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    } catch (error) {
      console.error('Error during manual sync:', error);
      // Add detailed error event to the list
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'manualSyncError',
          data: {
            error: error.message,
            code: error.code || 'UNKNOWN',
            retryable: error.retryable === true
          },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  // State for prepare progress
  const [prepareProgress, setPrepareProgress] = useState(0);
  const [prepareStage, setPrepareStage] = useState('');
  const [prepareError, setPrepareError] = useState(null);

  // Handle prepare for offline with progress tracking
  const handlePrepareForOffline = async () => {
    if (isPreparing) return;

    // Reset preparation state
    setPrepareProgress(0);
    setPrepareStage('Initializing');
    setPrepareError(null);
    setIsPreparing(true);

    try {
      // Add event to the list for preparation start
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'prepareForOfflineStarted',
          data: {
            timestamp: new Date().toISOString(),
            offlineRisk,
            offlineReadiness
          },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);

      // Set up progress tracking
      const progressCallback = (progress, stage) => {
        setPrepareProgress(progress);
        setPrepareStage(stage);

        // Log significant progress milestones
        if (progress % 25 === 0 || progress === 100) {
          setOfflineEvents(prev => [
            {
              id: Date.now(),
              event: 'prepareForOfflineProgress',
              data: {
                progress,
                stage
              },
              timestamp: new Date().toLocaleTimeString()
            },
            ...prev.slice(0, 9)
          ]);
        }
      };

      // Call the service with progress callback
      await offlineService.prepareForOffline({
        forcePrepare: true,
        highPriority: offlineRisk > 0.5,
        progressCallback
      });

      // Update offline readiness after preparation
      const readinessInfo = await offlineService.getOfflineReadiness();
      setOfflineReadiness(readinessInfo.readinessPercentage || 0);

      // Update ML predictions if available
      if (readinessInfo.mlPredictions) {
        setMlPredictions({
          predictionConfidence: readinessInfo.mlPredictions.confidence || 0,
          topPredictions: readinessInfo.mlPredictions.topPredictions || [],
          lastPredictionTime: readinessInfo.mlPredictions.timestamp || null,
          modelPerformance: readinessInfo.mlPredictions.modelPerformance || { accuracy: 0, latency: 0 }
        });
      }

      // Add completion event to the list
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'prepareForOfflineCompleted',
          data: {
            success: true,
            previousReadiness: offlineReadiness,
            newReadiness: readinessInfo.readinessPercentage || 0,
            improvement: (readinessInfo.readinessPercentage || 0) - offlineReadiness
          },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);

      // Close the dialog after a short delay to show 100% completion
      setTimeout(() => {
        setShowPrepareDialog(false);
      }, 1000);

    } catch (error) {
      console.error('Error preparing for offline:', error);

      // Set error state
      setPrepareError(error.message);

      // Add error event to the list with detailed information
      setOfflineEvents(prev => [
        {
          id: Date.now(),
          event: 'prepareForOfflineError',
          data: {
            error: error.message,
            code: error.code || 'UNKNOWN',
            stage: prepareStage,
            progress: prepareProgress
          },
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    } finally {
      // Keep isPreparing true for a moment if successful to show 100% completion
      if (prepareProgress >= 100 && !prepareError) {
        setTimeout(() => {
          setIsPreparing(false);
        }, 1000);
      } else {
        setIsPreparing(false);
      }
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

          {/* ML Predictions Section */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>ML Predictions</Typography>
          <Box sx={{ mb: 1 }}>
            {/* Prediction Confidence with visual indicator */}
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Prediction Confidence:</Typography>
                <Typography variant="body2" fontWeight="medium" sx={{
                  color: mlPredictions.predictionConfidence > 0.7 ? 'success.main' :
                         mlPredictions.predictionConfidence > 0.4 ? 'warning.main' : 'error.main'
                }}>
                  {Math.round(mlPredictions.predictionConfidence * 100)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={mlPredictions.predictionConfidence * 100}
                color={
                  mlPredictions.predictionConfidence > 0.7 ? "success" :
                  mlPredictions.predictionConfidence > 0.4 ? "warning" : "error"
                }
                sx={{ mb: 1, height: 6, borderRadius: 3 }}
              />
            </Box>

            {/* Model Performance Metrics */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">Model Accuracy:</Typography>
              <Typography variant="body2" fontWeight="medium" sx={{
                color: mlPredictions.modelPerformance.accuracy > 0.8 ? 'success.main' :
                       mlPredictions.modelPerformance.accuracy > 0.6 ? 'warning.main' : 'error.main'
              }}>
                {Math.round(mlPredictions.modelPerformance.accuracy * 100)}%
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">Model Latency:</Typography>
              <Typography variant="body2">
                {mlPredictions.modelPerformance.latency > 0
                  ? `${mlPredictions.modelPerformance.latency.toFixed(2)} ms`
                  : 'Unknown'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Last Prediction:</Typography>
              <Typography variant="body2">
                {mlPredictions.lastPredictionTime
                  ? new Date(mlPredictions.lastPredictionTime).toLocaleString()
                  : 'Never'}
              </Typography>
            </Box>

            {/* Divider for visual separation */}
            <Divider sx={{ my: 1 }} />

            {/* Offline Risk Visualization */}
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CloudOffIcon fontSize="small" sx={{ mr: 0.5, color: theme => getOfflineRiskColor(theme) }} />
                  <Typography variant="body2" fontWeight="medium">Offline Risk:</Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold" sx={{ color: theme => getOfflineRiskColor(theme) }}>
                  {Math.round(offlineRisk * 100)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={offlineRisk * 100}
                color={
                  offlineRisk > 0.7 ? "error" :
                  offlineRisk > 0.3 ? "warning" : "success"
                }
                sx={{ mb: 1, height: 6, borderRadius: 3 }}
              />
              {predictedOfflineDuration > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Predicted Duration:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {predictedOfflineDuration.toFixed(1)} hours
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Top Predictions with enhanced visualization */}
            {mlPredictions.topPredictions.length > 0 && (
              <>
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <MemoryIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Top Predictions:
                </Typography>
                <Box sx={{
                  mt: 0.5,
                  maxHeight: 150,
                  overflowY: 'auto',
                  border: '1px solid #eee',
                  borderRadius: 1,
                  p: 1,
                  bgcolor: 'background.paper',
                  boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)'
                }}>
                  {mlPredictions.topPredictions.map((prediction, index) => (
                    <Box key={index} sx={{
                      mb: 0.5,
                      p: 0.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderRadius: 1,
                      bgcolor: index === 0 ? 'rgba(0,0,0,0.03)' : 'transparent',
                      border: index === 0 ? '1px solid rgba(0,0,0,0.1)' : 'none'
                    }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: index === 0 ? 'bold' : 'normal' }}>
                          {prediction.description || `Prediction ${index + 1}`}
                        </Typography>
                        {prediction.details && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {prediction.details}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{
                          width: 50,
                          height: 6,
                          mr: 1,
                          borderRadius: 3,
                          bgcolor: 'grey.300',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: `${prediction.score * 100}%`,
                            bgcolor: prediction.score > 0.7 ? 'success.main' :
                                    prediction.score > 0.4 ? 'warning.main' : 'error.main'
                          }} />
                        </Box>
                        <Typography variant="caption" sx={{
                          fontWeight: 'bold',
                          color: prediction.score > 0.7 ? 'success.main' :
                                prediction.score > 0.4 ? 'warning.main' : 'error.main'
                        }}>
                          {Math.round(prediction.score * 100)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>

          {/* Recent Events Section */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Recent Events</Typography>
          <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 1, p: 1 }}>
            {offlineEvents.length > 0 ? (
              offlineEvents.map(event => {
                // Determine event color and icon based on event type
                let eventColor = 'inherit';
                let eventIcon = null;

                if (event.event.includes('Error') || event.data?.error) {
                  eventColor = 'error.main';
                  eventIcon = <WarningIcon fontSize="inherit" color="error" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />;
                } else if (event.event.includes('Sync')) {
                  eventColor = 'primary.main';
                  eventIcon = <SyncIcon fontSize="inherit" color="primary" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />;
                } else if (event.event.includes('offline')) {
                  eventColor = 'warning.main';
                  eventIcon = <CloudOffIcon fontSize="inherit" color="warning" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />;
                }

                // Format event details
                let eventDetails = '';
                if (event.data) {
                  if (event.data.error) {
                    eventDetails = ` - Error: ${event.data.error}`;
                  } else if (event.event === 'manualSyncCompleted') {
                    eventDetails = ` - Synced ${event.data.itemsSynced} items (${event.data.bytesSynced} bytes) in ${event.data.duration}`;
                  } else if (event.event === 'offlineRiskChange') {
                    const changeDirection = parseFloat(event.data.change) > 0 ? 'increased' : 'decreased';
                    eventDetails = ` - Risk ${changeDirection} by ${Math.abs(parseFloat(event.data.change) * 100).toFixed(0)}%`;
                  }
                }

                return (
                  <Box
                    key={event.id}
                    sx={{
                      mb: 0.5,
                      p: 0.5,
                      borderRadius: 0.5,
                      backgroundColor: event.data?.error ? 'rgba(255,0,0,0.05)' : 'transparent',
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' }
                    }}
                  >
                    <Typography variant="caption" display="block" sx={{ color: eventColor }}>
                      <strong>{event.timestamp}</strong>: {eventIcon}{event.event.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      <span>{eventDetails}</span>
                    </Typography>
                  </Box>
                );
              })
            ) : (
              <Typography variant="caption">No recent events</Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Prepare for Offline Dialog */}
      <Dialog
        open={showPrepareDialog}
        onClose={() => !isPreparing && setShowPrepareDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          {isPreparing ? (
            <CloudSyncIcon color="primary" sx={{ mr: 1 }} />
          ) : (
            <CloudOffIcon color="primary" sx={{ mr: 1 }} />
          )}
          Prepare for Offline Mode
        </DialogTitle>
        <DialogContent>
          {!isPreparing ? (
            <DialogContentText>
              This will prepare the system for offline operation by:
              <ul>
                <li>Caching critical medical data</li>
                <li>Optimizing storage for offline use</li>
                <li>Preparing translation models for offline operation</li>
                <li>Synchronizing pending changes</li>
              </ul>

              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Current Status</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Offline Readiness:</Typography>
                  <Typography variant="body2" fontWeight="medium" sx={{
                    color: offlineReadiness > 80 ? 'success.main' :
                           offlineReadiness > 50 ? 'warning.main' : 'error.main'
                  }}>
                    {Math.round(offlineReadiness)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={offlineReadiness}
                  color={
                    offlineReadiness > 80 ? "success" :
                    offlineReadiness > 50 ? "warning" : "error"
                  }
                  sx={{ mb: 1, height: 6, borderRadius: 3 }}
                />
              </Box>

              {offlineRisk > 0.5 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <AlertTitle>High Offline Risk Detected</AlertTitle>
                  The system predicts a <strong>{Math.round(offlineRisk * 100)}%</strong> chance of going offline in the next {predictedOfflineDuration.toFixed(1)} hours.
                  {offlineReadiness < 50 && (
                    <Box sx={{ mt: 1 }}>
                      <strong>Immediate preparation is strongly recommended.</strong>
                    </Box>
                  )}
                </Alert>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Estimated Preparation Time</Typography>
                <Typography variant="body2">
                  {offlineReadiness > 80 ? 'Less than 1 minute' :
                   offlineReadiness > 50 ? '1-3 minutes' : '3-5 minutes'}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Time may vary based on network conditions and data volume.
                </Typography>
              </Box>
            </DialogContentText>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" fontWeight="medium">
                  {prepareStage || 'Preparing for offline operation...'}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {prepareProgress}%
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={prepareProgress}
                sx={{ height: 10, borderRadius: 5, mb: 2 }}
              />

              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Preparation Steps</Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {prepareProgress >= 20 ? (
                    <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                  ) : prepareProgress > 0 ? (
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                  ) : (
                    <CircleIcon color="disabled" fontSize="small" sx={{ mr: 1 }} />
                  )}
                  <Typography
                    variant="body2"
                    color={prepareProgress >= 20 ? 'text.primary' : 'text.secondary'}
                    sx={{ fontWeight: prepareProgress > 0 && prepareProgress < 20 ? 'bold' : 'normal' }}
                  >
                    Initializing and checking requirements
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {prepareProgress >= 40 ? (
                    <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                  ) : prepareProgress >= 20 ? (
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                  ) : (
                    <CircleIcon color="disabled" fontSize="small" sx={{ mr: 1 }} />
                  )}
                  <Typography
                    variant="body2"
                    color={prepareProgress >= 20 ? 'text.primary' : 'text.secondary'}
                    sx={{ fontWeight: prepareProgress >= 20 && prepareProgress < 40 ? 'bold' : 'normal' }}
                  >
                    Caching critical medical data
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {prepareProgress >= 60 ? (
                    <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                  ) : prepareProgress >= 40 ? (
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                  ) : (
                    <CircleIcon color="disabled" fontSize="small" sx={{ mr: 1 }} />
                  )}
                  <Typography
                    variant="body2"
                    color={prepareProgress >= 40 ? 'text.primary' : 'text.secondary'}
                    sx={{ fontWeight: prepareProgress >= 40 && prepareProgress < 60 ? 'bold' : 'normal' }}
                  >
                    Optimizing storage for offline use
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {prepareProgress >= 80 ? (
                    <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                  ) : prepareProgress >= 60 ? (
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                  ) : (
                    <CircleIcon color="disabled" fontSize="small" sx={{ mr: 1 }} />
                  )}
                  <Typography
                    variant="body2"
                    color={prepareProgress >= 60 ? 'text.primary' : 'text.secondary'}
                    sx={{ fontWeight: prepareProgress >= 60 && prepareProgress < 80 ? 'bold' : 'normal' }}
                  >
                    Preparing translation models
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {prepareProgress >= 100 ? (
                    <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                  ) : prepareProgress >= 80 ? (
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                  ) : (
                    <CircleIcon color="disabled" fontSize="small" sx={{ mr: 1 }} />
                  )}
                  <Typography
                    variant="body2"
                    color={prepareProgress >= 80 ? 'text.primary' : 'text.secondary'}
                    sx={{ fontWeight: prepareProgress >= 80 && prepareProgress < 100 ? 'bold' : 'normal' }}
                  >
                    Finalizing and verifying offline readiness
                  </Typography>
                </Box>
              </Box>

              {prepareError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <AlertTitle>Error During Preparation</AlertTitle>
                  {prepareError}
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    You can try again or contact support if the issue persists.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!isPreparing ? (
            <>
              <Button onClick={() => setShowPrepareDialog(false)}>Cancel</Button>
              <Button
                onClick={handlePrepareForOffline}
                variant="contained"
                color="primary"
                startIcon={<CloudSyncIcon />}
              >
                Prepare Now
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setShowPrepareDialog(false)}
              disabled={!prepareError && prepareProgress < 100}
            >
              {prepareProgress >= 100 ? 'Close' : prepareError ? 'Cancel' : 'Please wait...'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Offline Risk Alert */}
      <Dialog
        open={showOfflineAlert}
        onClose={() => setShowOfflineAlert(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'warning.light', color: 'warning.contrastText', display: 'flex', alignItems: 'center' }}>
          <WarningIcon sx={{ mr: 1 }} />
          Offline Risk Alert
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="warning" variant="filled" sx={{ mb: 2 }}>
              <AlertTitle>High Offline Risk Detected</AlertTitle>
              The system predicts a <strong>{Math.round(offlineRisk * 100)}%</strong> chance of going offline in the next <strong>{predictedOfflineDuration.toFixed(1)} hours</strong>.
            </Alert>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mt: 2 }}>
              Current Offline Readiness
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1" fontWeight="medium">
                {getOfflineReadinessText()}
              </Typography>
              <Typography variant="body1" fontWeight="bold" sx={{
                color: offlineReadiness > 80 ? 'success.main' :
                       offlineReadiness > 50 ? 'warning.main' : 'error.main'
              }}>
                {Math.round(offlineReadiness)}%
              </Typography>
            </Box>

            <OfflineReadinessIndicator readiness={offlineReadiness} sx={{ mb: 2 }} />

            {offlineReadiness < 80 && (
              <Alert severity={offlineReadiness < 50 ? "error" : "warning"} sx={{ mt: 1, mb: 2 }}>
                <AlertTitle>{offlineReadiness < 50 ? "Critical" : "Warning"}</AlertTitle>
                {offlineReadiness < 50
                  ? "Your system is not prepared for offline operation. Immediate preparation is strongly recommended."
                  : "Your system is partially prepared for offline operation. Further preparation is recommended."}
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
              ML Prediction Details
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MemoryIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">Prediction Confidence:</Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold" sx={{
                  color: mlPredictions.predictionConfidence > 0.7 ? 'success.main' :
                         mlPredictions.predictionConfidence > 0.4 ? 'warning.main' : 'error.main'
                }}>
                  {Math.round(mlPredictions.predictionConfidence * 100)}%
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="body2">Model Accuracy:</Typography>
                </Box>
                <Typography variant="body2" fontWeight="medium">
                  {Math.round(mlPredictions.modelPerformance.accuracy * 100)}%
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CloudOffIcon fontSize="small" sx={{ mr: 1, color: theme => getOfflineRiskColor(theme) }} />
                  <Typography variant="body2">Predicted Duration:</Typography>
                </Box>
                <Typography variant="body2" fontWeight="medium">
                  {predictedOfflineDuration.toFixed(1)} hours
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SyncIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="body2">Last Updated:</Typography>
                </Box>
                <Typography variant="body2">
                  {mlPredictions.lastPredictionTime
                    ? new Date(mlPredictions.lastPredictionTime).toLocaleString()
                    : 'Unknown'}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
              Recommended Actions
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <CheckCircleIcon fontSize="small" sx={{ mr: 1, mt: 0.5, color: 'success.main' }} />
                <Typography variant="body2">
                  <strong>Prepare for Offline:</strong> Run the offline preparation process to cache essential data and optimize storage.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <CheckCircleIcon fontSize="small" sx={{ mr: 1, mt: 0.5, color: 'success.main' }} />
                <Typography variant="body2">
                  <strong>Complete Current Sessions:</strong> Finish any active translation sessions before going offline.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <CheckCircleIcon fontSize="small" sx={{ mr: 1, mt: 0.5, color: 'success.main' }} />
                <Typography variant="body2">
                  <strong>Sync Pending Changes:</strong> Ensure all pending changes are synchronized with the server.
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.paper' }}>
          <Button
            onClick={() => setShowOfflineAlert(false)}
            variant="outlined"
          >
            Dismiss
          </Button>
          <Button
            onClick={() => {
              setShowOfflineAlert(false);
              setShowPrepareDialog(true);
            }}
            variant="contained"
            color="primary"
            startIcon={<CloudSyncIcon />}
            disabled={offlineReadiness >= 95}
            sx={{ ml: 1 }}
          >
            Prepare for Offline
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfflineStatusIndicator;
