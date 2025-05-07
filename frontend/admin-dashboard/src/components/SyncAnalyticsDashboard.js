import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * SyncAnalyticsDashboard Component
 * 
 * Displays analytics data from the auto-sync-manager
 */
const SyncAnalyticsDashboard = () => {
  const [syncStatus, setSyncStatus] = useState({
    loading: true,
    error: null,
    devices: []
  });
  
  const [qualityMetrics, setQualityMetrics] = useState({
    loading: true,
    error: null,
    devices: []
  });
  
  const [anomalies, setAnomalies] = useState({
    loading: true,
    error: null,
    devices: []
  });
  
  const [activeTab, setActiveTab] = useState('status');
  const { token } = useAuth();
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  // WebSocket connection for real-time updates
  const { lastMessage } = useWebSocket();
  
  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        if (data.type === 'sync_status_update') {
          setSyncStatus({
            loading: false,
            error: null,
            devices: data.devices
          });
        } else if (data.type === 'quality_metrics_update') {
          setQualityMetrics({
            loading: false,
            error: null,
            devices: data.devices
          });
        } else if (data.type === 'anomaly_detection_update') {
          setAnomalies({
            loading: false,
            error: null,
            devices: data.devices
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage]);
  
  // Fetch initial data
  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.SYNC_ANALYTICS.STATUS}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        setSyncStatus({
          loading: false,
          error: null,
          devices: data.devices
        });
      } catch (error) {
        console.error('Error fetching sync status:', error);
        setSyncStatus({
          loading: false,
          error: error.message,
          devices: []
        });
      }
    };
    
    const fetchQualityMetrics = async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.SYNC_ANALYTICS.QUALITY}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        setQualityMetrics({
          loading: false,
          error: null,
          devices: data.devices
        });
      } catch (error) {
        console.error('Error fetching quality metrics:', error);
        setQualityMetrics({
          loading: false,
          error: error.message,
          devices: []
        });
      }
    };
    
    const fetchAnomalies = async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.SYNC_ANALYTICS.ANOMALIES}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        setAnomalies({
          loading: false,
          error: null,
          devices: data.devices
        });
      } catch (error) {
        console.error('Error fetching anomalies:', error);
        setAnomalies({
          loading: false,
          error: error.message,
          devices: []
        });
      }
    };
    
    if (token) {
      fetchSyncStatus();
      fetchQualityMetrics();
      fetchAnomalies();
    }
  }, [token]);
  
  // Trigger manual sync
  const handleManualSync = async (deviceId) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.SYNC_ANALYTICS.MANUAL_SYNC}/${deviceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      // Refresh sync status
      const statusResponse = await fetch(`${API_ENDPOINTS.SYNC_ANALYTICS.STATUS}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!statusResponse.ok) {
        throw new Error(`HTTP error ${statusResponse.status}`);
      }
      
      const data = await statusResponse.json();
      
      setSyncStatus({
        loading: false,
        error: null,
        devices: data.devices
      });
      
      alert('Manual sync triggered successfully');
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      alert(`Error triggering manual sync: ${error.message}`);
    }
  };
  
  // Prepare data for charts
  const prepareSyncQueueData = () => {
    const data = [];
    
    syncStatus.devices.forEach(device => {
      if (device.online && device.status && device.status.queueByPriority) {
        data.push({
          name: device.deviceName,
          critical: device.status.queueByPriority.critical || 0,
          high: device.status.queueByPriority.high || 0,
          medium: device.status.queueByPriority.medium || 0,
          low: device.status.queueByPriority.low || 0
        });
      }
    });
    
    return data;
  };
  
  const prepareQualityData = () => {
    const data = [];
    
    qualityMetrics.devices.forEach(device => {
      if (device.online && device.quality && device.quality.modelPerformance) {
        Object.entries(device.quality.modelPerformance).forEach(([model, performance]) => {
          data.push({
            name: `${device.deviceName} - ${model}`,
            confidence: performance.averageConfidence || 0,
            accuracy: performance.accuracy || 0
          });
        });
      }
    });
    
    return data;
  };
  
  const prepareAnomalyData = () => {
    const data = [];
    
    anomalies.devices.forEach(device => {
      if (device.online && device.anomalies && device.anomalies.anomalyHistory) {
        device.anomalies.anomalyHistory.forEach(anomaly => {
          data.push({
            name: anomaly.type,
            value: 1,
            device: device.deviceName,
            timestamp: new Date(anomaly.timestamp).toLocaleString(),
            severity: anomaly.severity
          });
        });
      }
    });
    
    return data;
  };
  
  // Render loading state
  if (syncStatus.loading || qualityMetrics.loading || anomalies.loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading sync analytics data...</p>
      </div>
    );
  }
  
  // Render error state
  if (syncStatus.error || qualityMetrics.error || anomalies.error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error loading sync analytics data</Alert.Heading>
        <p>{syncStatus.error || qualityMetrics.error || anomalies.error}</p>
      </Alert>
    );
  }
  
  return (
    <div className="sync-analytics-dashboard">
      <h2 className="mb-4">Sync Analytics Dashboard</h2>
      
      {/* Device Status Cards */}
      <Row className="mb-4">
        {syncStatus.devices.map(device => (
          <Col key={device.deviceId} md={6} lg={4} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{device.deviceName}</Card.Title>
                <div className="d-flex align-items-center mb-2">
                  <Badge bg={device.online ? 'success' : 'danger'} className="me-2">
                    {device.online ? 'Online' : 'Offline'}
                  </Badge>
                  <small className="text-muted">
                    Last updated: {new Date(device.lastUpdated).toLocaleTimeString()}
                  </small>
                </div>
                
                {device.online && device.status ? (
                  <>
                    <div className="mb-2">
                      <strong>Queue Size:</strong> {device.status.queueSize || 0} items
                    </div>
                    <div className="mb-2">
                      <strong>Last Sync:</strong> {device.status.lastSyncTime ? new Date(device.status.lastSyncTime).toLocaleString() : 'Never'}
                    </div>
                    <div className="mb-2">
                      <strong>Status:</strong> {device.status.lastSyncStatus || 'Unknown'}
                    </div>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => handleManualSync(device.deviceId)}
                    >
                      Trigger Manual Sync
                    </Button>
                  </>
                ) : (
                  <div className="text-danger">
                    {device.error || 'Device is offline or not responding'}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      
      {/* Sync Queue Chart */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Sync Queue by Priority</Card.Title>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={prepareSyncQueueData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="critical" fill="#dc3545" name="Critical" />
              <Bar dataKey="high" fill="#fd7e14" name="High" />
              <Bar dataKey="medium" fill="#ffc107" name="Medium" />
              <Bar dataKey="low" fill="#20c997" name="Low" />
            </BarChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>
      
      {/* Quality Metrics Chart */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Translation Quality Metrics</Card.Title>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={prepareQualityData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="confidence" fill="#0088FE" name="Confidence" />
              <Bar dataKey="accuracy" fill="#00C49F" name="Accuracy" />
            </BarChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>
      
      {/* Anomaly Detection */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Anomaly Detection</Card.Title>
          {prepareAnomalyData().length > 0 ? (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Anomaly Type</th>
                  <th>Timestamp</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {prepareAnomalyData().map((anomaly, index) => (
                  <tr key={index}>
                    <td>{anomaly.device}</td>
                    <td>{anomaly.name}</td>
                    <td>{anomaly.timestamp}</td>
                    <td>
                      <Badge bg={
                        anomaly.severity === 'high' ? 'danger' :
                        anomaly.severity === 'medium' ? 'warning' : 'info'
                      }>
                        {anomaly.severity}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">No anomalies detected</Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default SyncAnalyticsDashboard;
