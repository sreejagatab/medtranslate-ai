import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Alert,
  AlertTitle,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#6B66FF'];

// Status colors
const STATUS_COLORS = {
  healthy: '#4CAF50',
  degraded: '#FF9800',
  unhealthy: '#F44336',
  error: '#F44336'
};

// Severity colors
const SEVERITY_COLORS = {
  info: '#2196F3',
  warning: '#FF9800',
  error: '#F44336',
  critical: '#9C27B0'
};

const MonitoringDashboard = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [resolution, setResolution] = useState('');
  const [resolvingAlert, setResolvingAlert] = useState(false);

  // Fetch system health and alerts
  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Fetch system health
      const healthResponse = await fetch(`${API_URL}/monitoring/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!healthResponse.ok) {
        throw new Error(`API error: ${healthResponse.status}`);
      }

      const healthData = await healthResponse.json();

      if (!healthData.success) {
        throw new Error(healthData.error || 'Failed to fetch system health');
      }

      setSystemHealth(healthData.health);

      // Fetch active alerts
      const alertsResponse = await fetch(`${API_URL}/monitoring/alerts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!alertsResponse.ok) {
        throw new Error(`API error: ${alertsResponse.status}`);
      }

      const alertsData = await alertsResponse.json();

      if (!alertsData.success) {
        throw new Error(alertsData.error || 'Failed to fetch active alerts');
      }

      setActiveAlerts(alertsData.alerts);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      setError(error.message || 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    let intervalId;

    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchData();
      }, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, fetchData]);

  // Format bytes to human-readable size
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon sx={{ color: STATUS_COLORS.healthy }} />;
      case 'degraded':
        return <WarningIcon sx={{ color: STATUS_COLORS.degraded }} />;
      case 'unhealthy':
      case 'error':
        return <ErrorIcon sx={{ color: STATUS_COLORS.unhealthy }} />;
      default:
        return <InfoIcon />;
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'info':
        return <InfoIcon sx={{ color: SEVERITY_COLORS.info }} />;
      case 'warning':
        return <WarningIcon sx={{ color: SEVERITY_COLORS.warning }} />;
      case 'error':
        return <ErrorIcon sx={{ color: SEVERITY_COLORS.error }} />;
      case 'critical':
        return <ErrorIcon sx={{ color: SEVERITY_COLORS.critical }} />;
      default:
        return <InfoIcon />;
    }
  };

  // Handle resolve alert
  const handleResolveAlert = async () => {
    if (!selectedAlert || !resolution.trim()) return;

    try {
      setResolvingAlert(true);

      const response = await fetch(`${API_URL}/monitoring/alerts/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alertId: selectedAlert.alertId,
          resolution: resolution.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to resolve alert');
      }

      // Refresh data
      fetchData();
      
      // Close dialog
      setResolveDialogOpen(false);
      setSelectedAlert(null);
      setResolution('');
    } catch (error) {
      console.error('Error resolving alert:', error);
      setError(error.message || 'Failed to resolve alert');
    } finally {
      setResolvingAlert(false);
    }
  };

  // Open resolve dialog
  const openResolveDialog = (alert) => {
    setSelectedAlert(alert);
    setResolution('');
    setResolveDialogOpen(true);
  };

  // Render loading state
  if (loading && !systemHealth) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box my={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            System Monitoring
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              sx={{ mr: 2 }}
            >
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? "contained" : "outlined"}
              color={autoRefresh ? "primary" : "inherit"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* System Status */}
        {systemHealth && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5">
                System Status
              </Typography>
              <Chip
                icon={getStatusIcon(systemHealth.status)}
                label={systemHealth.status.toUpperCase()}
                color={
                  systemHealth.status === 'healthy' ? 'success' :
                  systemHealth.status === 'degraded' ? 'warning' : 'error'
                }
              />
            </Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Last updated: {format(new Date(systemHealth.timestamp), 'yyyy-MM-dd HH:mm:ss')}
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={3}>
              {Object.entries(systemHealth.components).map(([component, data]) => (
                <Grid item xs={12} sm={6} md={4} key={component}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" component="div">
                          {component.replace(/_/g, ' ')}
                        </Typography>
                        {getStatusIcon(data.status)}
                      </Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Response time: {data.responseTime}ms
                      </Typography>
                      {data.details.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {data.details.error}
                        </Alert>
                      )}
                      {data.details.warnings && data.details.warnings.length > 0 && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          {data.details.warnings.join(', ')}
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Active Alerts */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Active Alerts {activeAlerts.length > 0 && `(${activeAlerts.length})`}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {activeAlerts.length === 0 ? (
            <Alert severity="success">
              <AlertTitle>No Active Alerts</AlertTitle>
              All systems are operating normally.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {activeAlerts.map((alert) => (
                <Grid item xs={12} key={alert.alertId}>
                  <Alert
                    severity={alert.severity}
                    icon={getSeverityIcon(alert.severity)}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => openResolveDialog(alert)}
                      >
                        Resolve
                      </Button>
                    }
                  >
                    <AlertTitle>
                      {alert.component.replace(/_/g, ' ')} - {alert.severity.toUpperCase()}
                    </AlertTitle>
                    <Typography variant="body2" gutterBottom>
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {format(new Date(alert.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </Typography>
                  </Alert>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>

        {/* System Metrics */}
        {systemHealth && systemHealth.metrics && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              System Metrics
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={4}>
              {/* CPU Usage */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader
                    avatar={<MemoryIcon />}
                    title="CPU Usage"
                    subheader={`${(systemHealth.metrics.cpu.usage * 100).toFixed(1)}%`}
                  />
                  <CardContent>
                    <LinearProgress
                      variant="determinate"
                      value={systemHealth.metrics.cpu.usage * 100}
                      color={
                        systemHealth.metrics.cpu.usage > 0.8 ? 'error' :
                        systemHealth.metrics.cpu.usage > 0.6 ? 'warning' : 'primary'
                      }
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {systemHealth.metrics.cpu.cores} CPU Cores
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Memory Usage */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader
                    avatar={<StorageIcon />}
                    title="Memory Usage"
                    subheader={`${(systemHealth.metrics.memory.usage * 100).toFixed(1)}%`}
                  />
                  <CardContent>
                    <LinearProgress
                      variant="determinate"
                      value={systemHealth.metrics.memory.usage * 100}
                      color={
                        systemHealth.metrics.memory.usage > 0.8 ? 'error' :
                        systemHealth.metrics.memory.usage > 0.6 ? 'warning' : 'primary'
                      }
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {formatBytes(systemHealth.metrics.memory.free)} free of {formatBytes(systemHealth.metrics.memory.total)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Disk Usage */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader
                    avatar={<StorageIcon />}
                    title="Disk Usage"
                    subheader={`${(systemHealth.metrics.disk.usage * 100).toFixed(1)}%`}
                  />
                  <CardContent>
                    <LinearProgress
                      variant="determinate"
                      value={systemHealth.metrics.disk.usage * 100}
                      color={
                        systemHealth.metrics.disk.usage > 0.8 ? 'error' :
                        systemHealth.metrics.disk.usage > 0.6 ? 'warning' : 'primary'
                      }
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {formatBytes(systemHealth.metrics.disk.free)} free of {formatBytes(systemHealth.metrics.disk.total)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Process Memory */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader
                    title="Process Memory"
                    subheader={`Uptime: ${Math.floor(systemHealth.metrics.process.uptime / 60)} minutes`}
                  />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Heap Used', value: systemHealth.metrics.process.memory.heapUsed },
                            { name: 'Heap Free', value: systemHealth.metrics.process.memory.heapTotal - systemHealth.metrics.process.memory.heapUsed },
                            { name: 'External', value: systemHealth.metrics.process.memory.external }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[0, 1, 2].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => formatBytes(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <Typography variant="body2" color="textSecondary" align="center">
                      RSS: {formatBytes(systemHealth.metrics.process.memory.rss)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* System Info */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader
                    title="System Information"
                    subheader={`Platform: ${systemHealth.metrics.system.platform} ${systemHealth.metrics.system.release}`}
                  />
                  <CardContent>
                    <Typography variant="body1" gutterBottom>
                      System Uptime: {Math.floor(systemHealth.metrics.system.uptime / 86400)} days, {Math.floor((systemHealth.metrics.system.uptime % 86400) / 3600)} hours
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="textSecondary" paragraph>
                      Last Updated: {format(new Date(systemHealth.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Alerts: {systemHealth.activeAlerts}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>

      {/* Resolve Alert Dialog */}
      <Dialog
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Resolve Alert
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <>
              <Alert severity={selectedAlert.severity} sx={{ mb: 2 }}>
                <AlertTitle>{selectedAlert.component.replace(/_/g, ' ')} - {selectedAlert.severity.toUpperCase()}</AlertTitle>
                {selectedAlert.message}
              </Alert>
              <TextField
                label="Resolution"
                multiline
                rows={4}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                fullWidth
                required
                placeholder="Describe how this alert was resolved..."
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleResolveAlert}
            variant="contained"
            color="primary"
            disabled={!resolution.trim() || resolvingAlert}
          >
            {resolvingAlert ? <CircularProgress size={24} /> : 'Resolve Alert'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MonitoringDashboard;
