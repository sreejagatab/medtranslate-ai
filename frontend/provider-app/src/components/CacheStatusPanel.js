/**
 * CacheStatusPanel Component for MedTranslate AI Provider App
 *
 * This component displays the cache status information in the provider dashboard.
 * It uses the enhanced CachingStatusIndicator component to show detailed information
 * about the cache, ML models, auto-sync-manager, and storage-optimizer.
 */

import React, { useState } from 'react';
import { CachingStatusIndicator } from '../../../shared/components';
import { Card, Typography, Button, Box, CircularProgress, Tabs, Tab, Alert } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import { useSystemStatus } from '../../../shared/hooks/useSystemStatus';

/**
 * CacheStatusPanel component
 *
 * @returns {JSX.Element} CacheStatusPanel component
 */
const CacheStatusPanel = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Use the system status hook to get the system status and control functions
  const {
    cacheStats,
    offlineReadiness,
    offlineRisk,
    mlPredictions,
    mlPerformance,
    mlPerformanceHistory,
    storageInfo,
    syncStatus,
    syncHistory,
    devicePerformance,
    loading,
    error,
    trainModels,
    configureModels,
    manualSync,
    toggleAutoSync,
    prepareForOffline,
    optimizeStorage,
    clearCache,
    refreshCache,
    refreshData
  } = useSystemStatus();

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle action states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Handle cache optimization
  const handleOptimizeCache = async () => {
    try {
      setIsOptimizing(true);
      setActionError(null);
      setActionResult(null);

      const result = await optimizeStorage();

      setActionResult({
        type: 'optimize',
        message: `Cache optimized successfully! Freed ${(result.freedSpaceBytes / (1024 * 1024)).toFixed(2)} MB by removing ${result.removedItems} items.`
      });
    } catch (err) {
      setActionError(err.message || 'Failed to optimize cache');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setActionError(null);
      setActionResult(null);

      const result = await manualSync();

      setActionResult({
        type: 'sync',
        message: `Sync completed successfully! Synced ${result.syncedCount} items in ${(result.duration / 1000).toFixed(2)} seconds.`
      });
    } catch (err) {
      setActionError(err.message || 'Failed to sync with cloud');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle train models
  const handleTrainModels = async () => {
    try {
      setIsTraining(true);
      setActionError(null);
      setActionResult(null);

      const result = await trainModels();

      setActionResult({
        type: 'train',
        message: `Models trained successfully! Training completed in ${(result.trainingTimeMs / 1000).toFixed(2)} seconds with ${result.accuracy * 100}% accuracy.`
      });
    } catch (err) {
      setActionError(err.message || 'Failed to train models');
    } finally {
      setIsTraining(false);
    }
  };

  // Convert the system status to the format expected by CachingStatusIndicator
  const cachingStatusProps = {
    cacheStats,
    offlineReadiness,
    offlineRisk,
    mlPredictions,
    mlPerformance,
    mlPerformanceHistory,
    storageInfo,
    syncStatus,
    syncHistory,
    devicePerformance,
    onManualSync: handleManualSync,
    onPrepareOffline: prepareForOffline,
    onClearCache: clearCache,
    onRefreshCache: refreshCache,
    onOptimizeStorage: handleOptimizeCache,
    onTrainModels: handleTrainModels,
    onToggleAutoSync: toggleAutoSync,
    onConfigureModels: configureModels,
    style: {}
  };

  return (
    <Card sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <StorageIcon sx={{ mr: 1 }} />
        <Typography variant="h6" component="h2">
          System Status
        </Typography>

        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={refreshData}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Refresh'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
        </Box>
      </Box>

      {/* Status Indicators */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          borderRadius: 1,
          bgcolor: cacheStats.health > 0.7 ? '#e8f5e9' : cacheStats.health > 0.4 ? '#fff8e1' : '#ffebee'
        }}>
          <StorageIcon sx={{ mr: 1, color: cacheStats.health > 0.7 ? '#4caf50' : cacheStats.health > 0.4 ? '#ff9800' : '#f44336' }} />
          <Typography variant="body2">
            Cache: {cacheStats.health > 0.7 ? 'Healthy' : cacheStats.health > 0.4 ? 'Warning' : 'Critical'}
          </Typography>
        </Box>

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          borderRadius: 1,
          bgcolor: mlPerformance?.accuracy > 0.7 ? '#e8f5e9' : mlPerformance?.accuracy > 0.4 ? '#fff8e1' : '#ffebee'
        }}>
          <MemoryIcon sx={{ mr: 1, color: mlPerformance?.accuracy > 0.7 ? '#4caf50' : mlPerformance?.accuracy > 0.4 ? '#ff9800' : '#f44336' }} />
          <Typography variant="body2">
            ML Models: {mlPerformance?.accuracy > 0.7 ? 'Accurate' : mlPerformance?.accuracy > 0.4 ? 'Moderate' : 'Poor'}
          </Typography>
        </Box>

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          borderRadius: 1,
          bgcolor: syncStatus?.successRate > 0.7 ? '#e8f5e9' : syncStatus?.successRate > 0.4 ? '#fff8e1' : '#ffebee'
        }}>
          <SyncIcon sx={{ mr: 1, color: syncStatus?.successRate > 0.7 ? '#4caf50' : syncStatus?.successRate > 0.4 ? '#ff9800' : '#f44336' }} />
          <Typography variant="body2">
            Sync: {syncStatus?.successRate > 0.7 ? 'Good' : syncStatus?.successRate > 0.4 ? 'Partial' : 'Failed'}
          </Typography>
        </Box>

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          borderRadius: 1,
          bgcolor: devicePerformance?.overallScore > 80 ? '#e8f5e9' : devicePerformance?.overallScore > 50 ? '#fff8e1' : '#ffebee'
        }}>
          <SpeedIcon sx={{ mr: 1, color: devicePerformance?.overallScore > 80 ? '#4caf50' : devicePerformance?.overallScore > 50 ? '#ff9800' : '#f44336' }} />
          <Typography variant="body2">
            Performance: {devicePerformance?.overallScore > 80 ? 'Excellent' : devicePerformance?.overallScore > 50 ? 'Good' : 'Poor'}
          </Typography>
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          disabled={isOptimizing}
          onClick={handleOptimizeCache}
        >
          {isOptimizing ? <CircularProgress size={20} /> : 'Optimize Cache'}
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<SyncIcon />}
          disabled={isSyncing}
          onClick={handleManualSync}
        >
          {isSyncing ? <CircularProgress size={20} /> : 'Manual Sync'}
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<MemoryIcon />}
          disabled={isTraining}
          onClick={handleTrainModels}
        >
          {isTraining ? <CircularProgress size={20} /> : 'Train Models'}
        </Button>
      </Box>

      {/* Action Results */}
      {actionResult && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionResult(null)}>
          {actionResult.message}
        </Alert>
      )}

      {/* Action Errors */}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* System Status Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Detailed Status */}
      {showDetails && (
        <Box sx={{ mt: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab label="Cache" />
            <Tab label="ML Models" />
            <Tab label="Sync" />
            <Tab label="Storage" />
            <Tab label="Performance" />
          </Tabs>

          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && (
              <Box>
                <Typography variant="subtitle1">Cache Health: {(cacheStats.health * 100).toFixed(0)}%</Typography>
                <Typography variant="body2">Hit Rate: {(cacheStats.hitRate * 100).toFixed(0)}%</Typography>
                <Typography variant="body2">Items: {cacheStats.itemCount}</Typography>
                <Typography variant="body2">Size: {(cacheStats.sizeBytes / (1024 * 1024)).toFixed(2)} MB</Typography>
                <Typography variant="body2">Offline Readiness: {(offlineReadiness * 100).toFixed(0)}%</Typography>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="subtitle1">ML Model Status</Typography>
                <Typography variant="body2">Version: {mlPerformance?.version || 'Unknown'}</Typography>
                <Typography variant="body2">Accuracy: {(mlPerformance?.accuracy * 100).toFixed(0)}%</Typography>
                <Typography variant="body2">Compute Time: {mlPerformance?.computeTimeMs || 0} ms</Typography>
                <Typography variant="body2">Memory Usage: {mlPerformance?.memoryUsageMB || 0} MB</Typography>
                <Typography variant="body2">Last Training: {mlPerformance?.lastTrainingTime ? new Date(mlPerformance.lastTrainingTime).toLocaleString() : 'Never'}</Typography>
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Typography variant="subtitle1">Sync Status</Typography>
                <Typography variant="body2">Last Sync: {syncStatus?.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : 'Never'}</Typography>
                <Typography variant="body2">Status: {syncStatus?.lastSyncStatus || 'Unknown'}</Typography>
                <Typography variant="body2">Success Rate: {(syncStatus?.successRate * 100).toFixed(0)}%</Typography>
                <Typography variant="body2">Queue Size: {syncStatus?.queueSize || 0}</Typography>
                <Typography variant="body2">Auto-Sync: {syncStatus?.enabled ? 'Enabled' : 'Disabled'}</Typography>
              </Box>
            )}

            {activeTab === 3 && (
              <Box>
                <Typography variant="subtitle1">Storage Status</Typography>
                <Typography variant="body2">Usage: {(storageInfo?.usagePercentage || 0).toFixed(0)}%</Typography>
                <Typography variant="body2">Used: {(storageInfo?.currentUsageMB || 0).toFixed(2)} MB</Typography>
                <Typography variant="body2">Total: {(storageInfo?.quotaMB || 0).toFixed(2)} MB</Typography>
                <Typography variant="body2">Reserved for Offline: {(storageInfo?.reservedForOfflineMB || 0).toFixed(2)} MB</Typography>
                <Typography variant="body2">Last Optimization: {storageInfo?.lastOptimizationTime ? new Date(storageInfo.lastOptimizationTime).toLocaleString() : 'Never'}</Typography>
              </Box>
            )}

            {activeTab === 4 && (
              <Box>
                <Typography variant="subtitle1">Performance Status</Typography>
                <Typography variant="body2">Overall Score: {devicePerformance?.overallScore || 0}/100</Typography>
                <Typography variant="body2">CPU Usage: {((devicePerformance?.cpuUsage || 0) * 100).toFixed(0)}%</Typography>
                <Typography variant="body2">Memory Usage: {((devicePerformance?.memoryUsage || 0) * 100).toFixed(0)}%</Typography>
                <Typography variant="body2">Connection: {devicePerformance?.connectionType || 'Unknown'}</Typography>
                <Typography variant="body2">Latency: {devicePerformance?.latencyMs || 0} ms</Typography>
                <Typography variant="body2">Battery Level: {((devicePerformance?.batteryLevel || 0) * 100).toFixed(0)}%</Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Enhanced CachingStatusIndicator (hidden by default, can be shown with a toggle) */}
      {false && <CachingStatusIndicator {...cachingStatusProps} />}
    </Card>
  );
};

export default CacheStatusPanel;
