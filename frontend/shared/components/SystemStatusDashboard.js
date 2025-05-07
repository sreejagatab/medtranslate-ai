/**
 * SystemStatusDashboard Component for MedTranslate AI
 *
 * This component provides a comprehensive dashboard for monitoring system status
 * and performance, including cache status, ML model performance, sync status,
 * storage optimization, device performance, and network status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
  Typography,
  Alert,
  Button,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Sync as SyncIcon,
  Speed as SpeedIcon,
  Wifi as WifiIcon,
  BatteryChargingFull as BatteryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { ApiStatus } from './index';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

// Chart components
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/**
 * SystemStatusDashboard component
 *
 * @param {Object} props - Component props
 * @returns {JSX.Element} SystemStatusDashboard component
 */
const SystemStatusDashboard = ({ refreshInterval = 30000 }) => {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

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

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refreshData();
    setLastRefreshed(new Date());
  }, [refreshData]);

  // Set up automatic refresh
  useEffect(() => {
    const intervalId = setInterval(handleRefresh, refreshInterval);
    return () => clearInterval(intervalId);
  }, [handleRefresh, refreshInterval]);

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      await manualSync();
    } catch (error) {
      console.error('Error performing manual sync:', error);
    }
  };

  // Handle optimize storage
  const handleOptimizeStorage = async () => {
    try {
      await optimizeStorage();
    } catch (error) {
      console.error('Error optimizing storage:', error);
    }
  };

  // Handle train models
  const handleTrainModels = async () => {
    try {
      await trainModels();
    } catch (error) {
      console.error('Error training models:', error);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    if (typeof status === 'number') {
      if (status >= 0.8) return 'success';
      if (status >= 0.4) return 'warning';
      return 'error';
    }

    switch (status) {
      case 'healthy':
      case 'good':
      case 'online':
        return 'success';
      case 'degraded':
      case 'warning':
      case 'partial':
        return 'warning';
      case 'error':
      case 'offline':
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (getStatusColor(status)) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="disabled" />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">System Status Dashboard</Typography>
        <Box>
          <Tooltip title="Last refreshed: ">
            <Typography variant="caption" color="textSecondary" mr={2}>
              {format(lastRefreshed, 'yyyy-MM-dd HH:mm:ss')}
            </Typography>
          </Tooltip>
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* System Overview */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" component="div">
                  Cache Health
                </Typography>
                {getStatusIcon(offlineReadiness)}
              </Box>
              <LinearProgress
                variant="determinate"
                value={offlineReadiness * 100}
                color={getStatusColor(offlineReadiness)}
                sx={{ height: 10, borderRadius: 5, my: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                {(offlineReadiness * 100).toFixed(0)}% Ready
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" component="div">
                  ML Models
                </Typography>
                {mlPerformance && mlPerformance.isInitialized ?
                  getStatusIcon(mlPerformance.accuracy) :
                  getStatusIcon('error')}
              </Box>
              {mlPerformance && mlPerformance.isInitialized ? (
                <>
                  <LinearProgress
                    variant="determinate"
                    value={mlPerformance.accuracy * 100}
                    color={getStatusColor(mlPerformance.accuracy)}
                    sx={{ height: 10, borderRadius: 5, my: 1 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    {(mlPerformance.accuracy * 100).toFixed(0)}% Accuracy
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="error">
                  Not Initialized
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" component="div">
                  Sync Status
                </Typography>
                {syncStatus && syncStatus.lastSyncTime ?
                  getStatusIcon(Date.now() - syncStatus.lastSyncTime < 3600000 ? 'healthy' :
                               Date.now() - syncStatus.lastSyncTime < 86400000 ? 'warning' : 'error') :
                  getStatusIcon('error')}
              </Box>
              {syncStatus && syncStatus.lastSyncTime ? (
                <Typography variant="body2" color="textSecondary">
                  Last sync: {format(new Date(syncStatus.lastSyncTime), 'yyyy-MM-dd HH:mm:ss')}
                </Typography>
              ) : (
                <Typography variant="body2" color="error">
                  Never synced
                </Typography>
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<SyncIcon />}
                onClick={handleManualSync}
                sx={{ mt: 1 }}
              >
                Sync Now
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" component="div">
                  Offline Risk
                </Typography>
                {getStatusIcon(offlineRisk > 0.7 ? 'error' :
                              offlineRisk > 0.3 ? 'warning' : 'healthy')}
              </Box>
              <LinearProgress
                variant="determinate"
                value={offlineRisk * 100}
                color={offlineRisk > 0.7 ? 'error' :
                      offlineRisk > 0.3 ? 'warning' : 'success'}
                sx={{ height: 10, borderRadius: 5, my: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                {(offlineRisk * 100).toFixed(0)}% Risk
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for detailed information */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="system status tabs">
          <Tab label="Cache" />
          <Tab label="ML Models" />
          <Tab label="Sync" />
          <Tab label="Storage" />
          <Tab label="Device" />
          <Tab label="API Status" />
        </Tabs>
      </Box>

      {/* Cache Tab */}
      {activeTab === 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Cache Status
          </Typography>

          <Grid container spacing={2}>
            {/* Cache Statistics */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Cache Statistics" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">Cache Size</Typography>
                      <Typography variant="body1">
                        {cacheStats.cacheSize ? `${(cacheStats.cacheSize / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">Items Count</Typography>
                      <Typography variant="body1">
                        {cacheStats.itemCount || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">Hit Rate</Typography>
                      <Typography variant="body1">
                        {cacheStats.hitRate ? `${(cacheStats.hitRate * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">Last Updated</Typography>
                      <Typography variant="body1">
                        {cacheStats.lastUpdated ? format(new Date(cacheStats.lastUpdated), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Offline Readiness */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Offline Readiness" />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Readiness Level
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={offlineReadiness * 100}
                      color={getStatusColor(offlineReadiness)}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />
                    <Typography variant="body2">
                      {(offlineReadiness * 100).toFixed(0)}% Ready for Offline Operation
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Offline Risk
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={offlineRisk * 100}
                      color={offlineRisk > 0.7 ? 'error' : offlineRisk > 0.3 ? 'warning' : 'success'}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />
                    <Typography variant="body2">
                      {(offlineRisk * 100).toFixed(0)}% Risk of Going Offline
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Cache Performance */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Cache Performance" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">Compression Ratio</Typography>
                      <Typography variant="body1">
                        {cacheStats.compressionRatio ? `${cacheStats.compressionRatio.toFixed(2)}x` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">Cache Efficiency</Typography>
                      <Typography variant="body1">
                        {cacheStats.cacheEfficiency ? `${(cacheStats.cacheEfficiency * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">Average Age</Typography>
                      <Typography variant="body1">
                        {cacheStats.averageCacheAge ? `${(cacheStats.averageCacheAge / 60000).toFixed(2)} min` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">Prioritized Items</Typography>
                      <Typography variant="body1">
                        {cacheStats.prioritizedItems || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Cache Actions */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Cache Management" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<RefreshIcon />}
                        onClick={refreshCache}
                        fullWidth
                      >
                        Refresh Cache
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<StorageIcon />}
                        onClick={clearCache}
                        fullWidth
                      >
                        Clear Cache
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SyncIcon />}
                        onClick={prepareForOffline}
                        fullWidth
                        sx={{ mt: 1 }}
                      >
                        Prepare for Offline
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ML Models Tab */}
      {activeTab === 1 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            ML Model Performance
          </Typography>

          <Grid container spacing={2}>
            {/* ML Model Status */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Model Status" />
                <CardContent>
                  {mlPerformance && mlPerformance.isInitialized ? (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                        <Box display="flex" alignItems="center">
                          {getStatusIcon(mlPerformance.accuracy)}
                          <Typography variant="body1" sx={{ ml: 1 }}>
                            {mlPerformance.accuracy >= 0.8 ? 'Excellent' :
                             mlPerformance.accuracy >= 0.6 ? 'Good' :
                             mlPerformance.accuracy >= 0.4 ? 'Fair' : 'Poor'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Version</Typography>
                        <Typography variant="body1">
                          {mlPerformance.version || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Accuracy</Typography>
                        <Typography variant="body1">
                          {mlPerformance.accuracy ? `${(mlPerformance.accuracy * 100).toFixed(2)}%` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Compute Time</Typography>
                        <Typography variant="body1">
                          {mlPerformance.computeTimeMs ? `${mlPerformance.computeTimeMs} ms` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Memory Usage</Typography>
                        <Typography variant="body1">
                          {mlPerformance.memoryUsageMB ? `${mlPerformance.memoryUsageMB} MB` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Last Training</Typography>
                        <Typography variant="body1">
                          {mlPerformance.lastTrainingTime ? format(new Date(mlPerformance.lastTrainingTime), 'yyyy-MM-dd HH:mm:ss') : 'Never'}
                        </Typography>
                      </Grid>
                    </Grid>
                  ) : (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={3}>
                      <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
                      <Typography variant="h6" color="error" gutterBottom>
                        Models Not Initialized
                      </Typography>
                      <Typography variant="body2" color="textSecondary" align="center">
                        ML models are not initialized or unavailable.
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<MemoryIcon />}
                        onClick={trainModels}
                        sx={{ mt: 2 }}
                      >
                        Initialize Models
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* ML Predictions */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Predictions" />
                <CardContent>
                  {mlPredictions && Object.keys(mlPredictions).length > 0 ? (
                    <Grid container spacing={2}>
                      {mlPredictions.predictedOfflineDuration && (
                        <Grid item xs={12}>
                          <Alert
                            severity={mlPredictions.predictedOfflineDuration.hours > 4 ? "warning" : "info"}
                            icon={<InfoIcon />}
                            sx={{ mb: 2 }}
                          >
                            Predicted offline duration: {mlPredictions.predictedOfflineDuration.hours} hours
                          </Alert>
                        </Grid>
                      )}
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Confidence</Typography>
                        <Typography variant="body1">
                          {mlPredictions.confidence ? `${(mlPredictions.confidence * 100).toFixed(2)}%` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Predicted Items</Typography>
                        <Typography variant="body1">
                          {mlPredictions.predictedItemCount || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>Prediction Accuracy</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(mlPredictions.predictionAccuracy || 0) * 100}
                          color={
                            (mlPredictions.predictionAccuracy || 0) > 0.8 ? 'success' :
                            (mlPredictions.predictionAccuracy || 0) > 0.5 ? 'warning' : 'error'
                          }
                          sx={{ height: 10, borderRadius: 5, mb: 1 }}
                        />
                        <Typography variant="body2">
                          {((mlPredictions.predictionAccuracy || 0) * 100).toFixed(0)}% Accurate
                        </Typography>
                      </Grid>
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No prediction data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Performance History */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Performance History" />
                <CardContent>
                  {mlPerformanceHistory && mlPerformanceHistory.length > 0 ? (
                    <Box height={300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mlPerformanceHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="accuracy" stroke="#8884d8" name="Accuracy" />
                          <Line type="monotone" dataKey="predictionAccuracy" stroke="#82ca9d" name="Prediction Accuracy" />
                          <Line type="monotone" dataKey="computeTimeMs" stroke="#ffc658" name="Compute Time (ms)" yAxisId={1} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No performance history available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* ML Model Actions */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Model Management" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<MemoryIcon />}
                        onClick={trainModels}
                        fullWidth
                      >
                        Train Models
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<SpeedIcon />}
                        onClick={() => configureModels({ optimizeForSpeed: true })}
                        fullWidth
                      >
                        Optimize for Speed
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<StorageIcon />}
                        onClick={() => configureModels({ optimizeForSize: true })}
                        fullWidth
                      >
                        Optimize for Size
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Sync Tab */}
      {activeTab === 2 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Synchronization Status
          </Typography>

          <Grid container spacing={2}>
            {/* Current Sync Status */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Current Status" />
                <CardContent>
                  {syncStatus ? (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                        <Box display="flex" alignItems="center">
                          {getStatusIcon(syncStatus.status || 'unknown')}
                          <Typography variant="body1" sx={{ ml: 1 }}>
                            {syncStatus.status ? syncStatus.status.charAt(0).toUpperCase() + syncStatus.status.slice(1) : 'Unknown'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Auto-Sync</Typography>
                        <Box display="flex" alignItems="center">
                          {syncStatus.autoSyncEnabled ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <ErrorIcon color="warning" fontSize="small" />
                          )}
                          <Typography variant="body1" sx={{ ml: 1 }}>
                            {syncStatus.autoSyncEnabled ? 'Enabled' : 'Disabled'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Last Sync</Typography>
                        <Typography variant="body1">
                          {syncStatus.lastSyncTime ? format(new Date(syncStatus.lastSyncTime), 'yyyy-MM-dd HH:mm:ss') : 'Never'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Next Sync</Typography>
                        <Typography variant="body1">
                          {syncStatus.nextScheduledSync ? format(new Date(syncStatus.nextScheduledSync), 'yyyy-MM-dd HH:mm:ss') : 'Not scheduled'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Pending Items</Typography>
                        <Typography variant="body1">
                          {syncStatus.pendingItems || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Sync Interval</Typography>
                        <Typography variant="body1">
                          {syncStatus.syncIntervalMinutes ? `${syncStatus.syncIntervalMinutes} min` : 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No sync status information available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Sync Statistics */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Sync Statistics" />
                <CardContent>
                  {syncStatus ? (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Success Rate</Typography>
                        <Typography variant="body1">
                          {syncStatus.successRate ? `${(syncStatus.successRate * 100).toFixed(2)}%` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Average Duration</Typography>
                        <Typography variant="body1">
                          {syncStatus.averageSyncDurationMs ? `${(syncStatus.averageSyncDurationMs / 1000).toFixed(2)} sec` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Total Syncs</Typography>
                        <Typography variant="body1">
                          {syncStatus.totalSyncs || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Failed Syncs</Typography>
                        <Typography variant="body1">
                          {syncStatus.failedSyncs || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>Network Quality</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(syncStatus.networkQuality || 0) * 100}
                          color={
                            (syncStatus.networkQuality || 0) > 0.8 ? 'success' :
                            (syncStatus.networkQuality || 0) > 0.5 ? 'warning' : 'error'
                          }
                          sx={{ height: 10, borderRadius: 5, mb: 1 }}
                        />
                        <Typography variant="body2">
                          {((syncStatus.networkQuality || 0) * 100).toFixed(0)}% Quality
                        </Typography>
                      </Grid>
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No sync statistics available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Sync History */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Sync History" />
                <CardContent>
                  {syncHistory && syncHistory.length > 0 ? (
                    <Box height={300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={syncHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="itemCount" stroke="#8884d8" name="Items Synced" />
                          <Line type="monotone" dataKey="durationMs" stroke="#82ca9d" name="Duration (ms)" yAxisId={1} />
                          <Line type="monotone" dataKey="networkQuality" stroke="#ffc658" name="Network Quality" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No sync history available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Sync Actions */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Sync Management" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SyncIcon />}
                        onClick={handleManualSync}
                        fullWidth
                      >
                        Manual Sync
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant={syncStatus && syncStatus.autoSyncEnabled ? "outlined" : "contained"}
                        color={syncStatus && syncStatus.autoSyncEnabled ? "error" : "success"}
                        startIcon={syncStatus && syncStatus.autoSyncEnabled ? <SyncIcon /> : <SyncIcon />}
                        onClick={() => toggleAutoSync(!syncStatus?.autoSyncEnabled)}
                        fullWidth
                      >
                        {syncStatus && syncStatus.autoSyncEnabled ? "Disable Auto-Sync" : "Enable Auto-Sync"}
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<StorageIcon />}
                        onClick={prepareForOffline}
                        fullWidth
                      >
                        Prepare for Offline
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Storage Tab */}
      {activeTab === 3 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Storage Information
          </Typography>

          <Grid container spacing={2}>
            {/* Storage Usage */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Storage Usage" />
                <CardContent>
                  {storageInfo ? (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Usage ({storageInfo.usagePercentage}%)
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={storageInfo.usagePercentage || 0}
                          color={
                            (storageInfo.usagePercentage || 0) > 90 ? 'error' :
                            (storageInfo.usagePercentage || 0) > 70 ? 'warning' : 'success'
                          }
                          sx={{ height: 10, borderRadius: 5, mb: 1 }}
                        />
                        <Typography variant="body2">
                          {storageInfo.currentUsageMB ? `${storageInfo.currentUsageMB} MB` : '0 MB'} of {storageInfo.quotaMB ? `${storageInfo.quotaMB} MB` : 'Unknown'}
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="textSecondary">Reserved for Offline</Typography>
                          <Typography variant="body1">
                            {storageInfo.reservedForOfflineMB ? `${storageInfo.reservedForOfflineMB} MB` : 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="textSecondary">Compression Savings</Typography>
                          <Typography variant="body1">
                            {storageInfo.compressionSavingsMB ? `${storageInfo.compressionSavingsMB} MB` : 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="textSecondary">Priority Items</Typography>
                          <Typography variant="body1">
                            {storageInfo.priorityItemCount || '0'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="textSecondary">Last Optimization</Typography>
                          <Typography variant="body1">
                            {storageInfo.lastOptimizationTime ? format(new Date(storageInfo.lastOptimizationTime), 'yyyy-MM-dd HH:mm:ss') : 'Never'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No storage information available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Storage Categories */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Storage Categories" />
                <CardContent>
                  {storageInfo && storageInfo.categories && storageInfo.categories.length > 0 ? (
                    <Box height={300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={storageInfo.categories}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="sizeMB"
                            nameKey="name"
                          >
                            {storageInfo.categories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} MB`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No storage category information available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Storage Trends */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Storage Trends" />
                <CardContent>
                  {storageInfo && storageInfo.history && storageInfo.history.length > 0 ? (
                    <Box height={300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={storageInfo.history}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="usageMB" stroke="#8884d8" name="Usage (MB)" />
                          <Line type="monotone" dataKey="compressionSavingsMB" stroke="#82ca9d" name="Compression Savings (MB)" />
                          <Line type="monotone" dataKey="itemCount" stroke="#ffc658" name="Item Count" yAxisId={1} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No storage history available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Storage Actions */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Storage Management" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<StorageIcon />}
                        onClick={optimizeStorage}
                        fullWidth
                      >
                        Optimize Storage
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<RefreshIcon />}
                        onClick={refreshCache}
                        fullWidth
                      >
                        Refresh Cache
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<StorageIcon />}
                        onClick={clearCache}
                        fullWidth
                      >
                        Clear Cache
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Device Tab */}
      {activeTab === 4 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Device Performance
          </Typography>

          <Grid container spacing={2}>
            {/* CPU Usage */}
            <Grid item xs={12} md={6} lg={3}>
              <Card variant="outlined">
                <CardHeader
                  title="CPU Usage"
                  avatar={<MemoryIcon />}
                />
                <CardContent>
                  {devicePerformance ? (
                    <>
                      <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%', justifyContent: 'center', mb: 2 }}>
                        <CircularProgress
                          variant="determinate"
                          value={devicePerformance.cpuUsage * 100}
                          size={100}
                          thickness={5}
                          color={
                            devicePerformance.cpuUsage > 0.8 ? 'error' :
                            devicePerformance.cpuUsage > 0.6 ? 'warning' : 'success'
                          }
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="h6" component="div" color="text.secondary">
                            {(devicePerformance.cpuUsage * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="textSecondary" align="center">
                        {devicePerformance.cpuCores} CPU Cores
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No CPU information available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Memory Usage */}
            <Grid item xs={12} md={6} lg={3}>
              <Card variant="outlined">
                <CardHeader
                  title="Memory Usage"
                  avatar={<StorageIcon />}
                />
                <CardContent>
                  {devicePerformance ? (
                    <>
                      <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%', justifyContent: 'center', mb: 2 }}>
                        <CircularProgress
                          variant="determinate"
                          value={devicePerformance.memoryUsage * 100}
                          size={100}
                          thickness={5}
                          color={
                            devicePerformance.memoryUsage > 0.8 ? 'error' :
                            devicePerformance.memoryUsage > 0.6 ? 'warning' : 'success'
                          }
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="h6" component="div" color="text.secondary">
                            {(devicePerformance.memoryUsage * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="textSecondary" align="center">
                        {devicePerformance.freeMemoryMB ? `${devicePerformance.freeMemoryMB} MB free` : 'N/A'}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No memory information available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Network Status */}
            <Grid item xs={12} md={6} lg={3}>
              <Card variant="outlined">
                <CardHeader
                  title="Network Status"
                  avatar={<WifiIcon />}
                />
                <CardContent>
                  {devicePerformance && devicePerformance.network ? (
                    <>
                      <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%', justifyContent: 'center', mb: 2 }}>
                        <CircularProgress
                          variant="determinate"
                          value={devicePerformance.network.connectionStability * 100}
                          size={100}
                          thickness={5}
                          color={
                            devicePerformance.network.connectionStability > 0.8 ? 'success' :
                            devicePerformance.network.connectionStability > 0.5 ? 'warning' : 'error'
                          }
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="h6" component="div" color="text.secondary">
                            {(devicePerformance.network.connectionStability * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="textSecondary" align="center">
                        {devicePerformance.network.connectionType || 'Unknown'} - {devicePerformance.network.online ? 'Online' : 'Offline'}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No network information available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Battery Status */}
            <Grid item xs={12} md={6} lg={3}>
              <Card variant="outlined">
                <CardHeader
                  title="Battery Status"
                  avatar={<BatteryIcon />}
                />
                <CardContent>
                  {devicePerformance && devicePerformance.battery ? (
                    <>
                      <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%', justifyContent: 'center', mb: 2 }}>
                        <CircularProgress
                          variant="determinate"
                          value={devicePerformance.battery.level * 100}
                          size={100}
                          thickness={5}
                          color={
                            devicePerformance.battery.level > 0.5 ? 'success' :
                            devicePerformance.battery.level > 0.2 ? 'warning' : 'error'
                          }
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="h6" component="div" color="text.secondary">
                            {(devicePerformance.battery.level * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="textSecondary" align="center">
                        {devicePerformance.battery.charging ? 'Charging' : 'Discharging'} - {devicePerformance.battery.timeRemaining ? `${devicePerformance.battery.timeRemaining} min remaining` : 'N/A'}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No battery information available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Network Details */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Network Details" />
                <CardContent>
                  {devicePerformance && devicePerformance.network ? (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Connection Type</Typography>
                        <Typography variant="body1">
                          {devicePerformance.network.connectionType || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Signal Strength</Typography>
                        <Typography variant="body1">
                          {devicePerformance.network.signalStrength ? `${(devicePerformance.network.signalStrength * 100).toFixed(1)}%` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Download Speed</Typography>
                        <Typography variant="body1">
                          {devicePerformance.network.downloadSpeedMbps ? `${devicePerformance.network.downloadSpeedMbps} Mbps` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Upload Speed</Typography>
                        <Typography variant="body1">
                          {devicePerformance.network.uploadSpeedMbps ? `${devicePerformance.network.uploadSpeedMbps} Mbps` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Latency</Typography>
                        <Typography variant="body1">
                          {devicePerformance.network.latencyMs ? `${devicePerformance.network.latencyMs} ms` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Stability</Typography>
                        <Typography variant="body1">
                          {devicePerformance.network.connectionStability ? `${(devicePerformance.network.connectionStability * 100).toFixed(1)}%` : 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No network details available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* System Information */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="System Information" />
                <CardContent>
                  {devicePerformance && devicePerformance.system ? (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Platform</Typography>
                        <Typography variant="body1">
                          {devicePerformance.system.platform || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Version</Typography>
                        <Typography variant="body1">
                          {devicePerformance.system.version || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Architecture</Typography>
                        <Typography variant="body1">
                          {devicePerformance.system.architecture || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Uptime</Typography>
                        <Typography variant="body1">
                          {devicePerformance.system.uptime ? `${Math.floor(devicePerformance.system.uptime / 86400)} days, ${Math.floor((devicePerformance.system.uptime % 86400) / 3600)} hours` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Device Type</Typography>
                        <Typography variant="body1">
                          {devicePerformance.system.deviceType || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">Device Name</Typography>
                        <Typography variant="body1">
                          {devicePerformance.system.deviceName || 'Unknown'}
                        </Typography>
                      </Grid>
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No system information available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Performance History */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Performance History" />
                <CardContent>
                  {devicePerformance && devicePerformance.history && devicePerformance.history.length > 0 ? (
                    <Box height={300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={devicePerformance.history}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="cpuUsage" stroke="#8884d8" name="CPU Usage" />
                          <Line type="monotone" dataKey="memoryUsage" stroke="#82ca9d" name="Memory Usage" />
                          <Line type="monotone" dataKey="connectionStability" stroke="#ffc658" name="Connection Stability" />
                          {devicePerformance.history[0].batteryLevel !== undefined && (
                            <Line type="monotone" dataKey="batteryLevel" stroke="#ff8042" name="Battery Level" />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center">
                      No performance history available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* API Status Tab */}
      {activeTab === 5 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            API Status
          </Typography>

          <Grid container spacing={2}>
            {/* API Status Overview */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="API Status Overview" />
                <CardContent>
                  <ApiStatus />
                </CardContent>
              </Card>
            </Grid>

            {/* API Endpoints */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader
                  title="API Endpoints"
                  action={
                    <IconButton onClick={handleRefresh} size="small">
                      <RefreshIcon />
                    </IconButton>
                  }
                />
                <CardContent>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Endpoint</th>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Status</th>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Response Time</th>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Last Checked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { endpoint: '/api/auth', status: 'healthy', responseTime: 45, lastChecked: new Date() },
                          { endpoint: '/api/translation', status: 'healthy', responseTime: 120, lastChecked: new Date() },
                          { endpoint: '/api/cache/stats', status: 'healthy', responseTime: 35, lastChecked: new Date() },
                          { endpoint: '/api/ml/performance', status: 'healthy', responseTime: 65, lastChecked: new Date() },
                          { endpoint: '/api/storage/info', status: 'healthy', responseTime: 40, lastChecked: new Date() },
                          { endpoint: '/api/sync/status', status: 'healthy', responseTime: 30, lastChecked: new Date() },
                          { endpoint: '/api/device/performance', status: 'healthy', responseTime: 25, lastChecked: new Date() },
                          { endpoint: '/api/websocket', status: 'healthy', responseTime: 15, lastChecked: new Date() },
                          { endpoint: '/api/medical-terms', status: 'healthy', responseTime: 85, lastChecked: new Date() },
                          { endpoint: '/api/sessions', status: 'healthy', responseTime: 55, lastChecked: new Date() }
                        ].map((endpoint, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>{endpoint.endpoint}</td>
                            <td style={{ padding: '8px' }}>
                              <Box display="flex" alignItems="center">
                                {getStatusIcon(endpoint.status)}
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                  {endpoint.status.charAt(0).toUpperCase() + endpoint.status.slice(1)}
                                </Typography>
                              </Box>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <Typography
                                variant="body2"
                                color={
                                  endpoint.responseTime < 50 ? 'success.main' :
                                  endpoint.responseTime < 100 ? 'warning.main' : 'error.main'
                                }
                              >
                                {endpoint.responseTime} ms
                              </Typography>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <Typography variant="body2" color="textSecondary">
                                {format(endpoint.lastChecked, 'HH:mm:ss')}
                              </Typography>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Response Time History */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Response Time History" />
                <CardContent>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { time: '00:00', auth: 45, translation: 120, cache: 35, ml: 65, storage: 40, sync: 30 },
                        { time: '01:00', auth: 42, translation: 115, cache: 38, ml: 70, storage: 42, sync: 28 },
                        { time: '02:00', auth: 48, translation: 125, cache: 32, ml: 60, storage: 45, sync: 32 },
                        { time: '03:00', auth: 50, translation: 130, cache: 30, ml: 55, storage: 48, sync: 35 },
                        { time: '04:00', auth: 47, translation: 122, cache: 36, ml: 62, storage: 43, sync: 31 },
                        { time: '05:00', auth: 43, translation: 118, cache: 34, ml: 68, storage: 41, sync: 29 },
                        { time: '06:00', auth: 45, translation: 120, cache: 35, ml: 65, storage: 40, sync: 30 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="auth" stroke="#8884d8" name="Auth API" />
                        <Line type="monotone" dataKey="translation" stroke="#82ca9d" name="Translation API" />
                        <Line type="monotone" dataKey="cache" stroke="#ffc658" name="Cache API" />
                        <Line type="monotone" dataKey="ml" stroke="#ff8042" name="ML API" />
                        <Line type="monotone" dataKey="storage" stroke="#0088fe" name="Storage API" />
                        <Line type="monotone" dataKey="sync" stroke="#00C49F" name="Sync API" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* API Error Logs */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Recent API Errors" />
                <CardContent>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {[
                      { timestamp: new Date(Date.now() - 3600000), endpoint: '/api/translation', error: 'Timeout error', code: 504 },
                      { timestamp: new Date(Date.now() - 7200000), endpoint: '/api/ml/performance', error: 'Internal server error', code: 500 },
                      { timestamp: new Date(Date.now() - 86400000), endpoint: '/api/auth', error: 'Unauthorized access', code: 401 }
                    ].length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Time</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Endpoint</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Error</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { timestamp: new Date(Date.now() - 3600000), endpoint: '/api/translation', error: 'Timeout error', code: 504 },
                            { timestamp: new Date(Date.now() - 7200000), endpoint: '/api/ml/performance', error: 'Internal server error', code: 500 },
                            { timestamp: new Date(Date.now() - 86400000), endpoint: '/api/auth', error: 'Unauthorized access', code: 401 }
                          ].map((error, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '8px' }}>
                                <Typography variant="body2" color="textSecondary">
                                  {format(error.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                                </Typography>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <Typography variant="body2">
                                  {error.endpoint}
                                </Typography>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <Typography variant="body2" color="error">
                                  {error.error}
                                </Typography>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <Chip
                                  label={error.code}
                                  size="small"
                                  color={
                                    error.code < 400 ? 'success' :
                                    error.code < 500 ? 'warning' : 'error'
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <Typography variant="body2" color="textSecondary" align="center">
                        No API errors in the last 24 hours
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Paper>
  );
};

SystemStatusDashboard.propTypes = {
  refreshInterval: PropTypes.number
};

export default SystemStatusDashboard;
