import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Form, Alert, Tabs, Tab } from 'react-bootstrap';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';
import axios from 'axios';

/**
 * RecoveryManagerDashboard component for managing automated recovery mechanisms
 */
const RecoveryManagerDashboard = () => {
  // State for recovery manager data
  const [recoveryData, setRecoveryData] = useState({
    loading: true,
    error: null,
    status: {},
    history: [],
    config: {}
  });
  
  // State for trigger recovery form
  const [triggerForm, setTriggerForm] = useState({
    issueType: 'offline',
    reason: 'Manual recovery test'
  });
  
  // State for config form
  const [configForm, setConfigForm] = useState({
    enabled: true,
    proactiveEnabled: true,
    adaptiveEnabled: true,
    maxAttempts: 5,
    cooldownPeriod: 300000,
    proactiveThreshold: 0.7,
    strategies: {
      dns_issue: true,
      poor_signal: true,
      congestion: true,
      interference: true,
      bandwidth_limit: true,
      intermittent: true,
      regular_outage: true
    }
  });
  
  // State for recovery result
  const [recoveryResult, setRecoveryResult] = useState(null);
  
  // State for config update result
  const [configUpdateResult, setConfigUpdateResult] = useState(null);
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const STATUS_COLORS = {
    success: '#00C49F',
    failure: '#FF4842',
    inProgress: '#FFC107'
  };
  
  // Load recovery manager data
  useEffect(() => {
    fetchRecoveryData();
  }, []);
  
  // Fetch recovery manager data
  const fetchRecoveryData = async () => {
    try {
      setRecoveryData(prev => ({ ...prev, loading: true }));
      
      // Fetch recovery status
      const statusResponse = await axios.get('/recovery/status');
      
      // Fetch recovery history
      const historyResponse = await axios.get('/recovery/history');
      
      // Update config form with current config
      if (statusResponse.data.success) {
        setConfigForm({
          enabled: statusResponse.data.status.enabled,
          proactiveEnabled: statusResponse.data.status.proactiveEnabled,
          adaptiveEnabled: statusResponse.data.status.adaptiveEnabled,
          maxAttempts: statusResponse.data.status.maxAttempts,
          cooldownPeriod: statusResponse.data.status.cooldownPeriod,
          proactiveThreshold: 0.7, // Default value
          strategies: {
            dns_issue: true,
            poor_signal: true,
            congestion: true,
            interference: true,
            bandwidth_limit: true,
            intermittent: true,
            regular_outage: true
          }
        });
      }
      
      // Update state with fetched data
      setRecoveryData({
        loading: false,
        error: null,
        status: statusResponse.data.status,
        history: historyResponse.data.history,
        config: statusResponse.data.status
      });
    } catch (error) {
      console.error('Error fetching recovery manager data:', error);
      setRecoveryData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load recovery manager data'
      }));
      
      // Use mock data for development
      setMockData();
    }
  };
  
  // Set mock data for development
  const setMockData = () => {
    // Mock recovery status
    const mockStatus = {
      initialized: true,
      enabled: true,
      proactiveEnabled: true,
      adaptiveEnabled: true,
      isRecoveryInProgress: false,
      lastRecoveryTime: Date.now() - 3600000,
      recoveryAttempts: 2,
      maxAttempts: 5,
      cooldownPeriod: 300000,
      cooldownRemaining: 0,
      historyEntries: 12,
      availableStrategies: ['dns_issue', 'poor_signal', 'congestion', 'interference', 'bandwidth_limit', 'intermittent', 'regular_outage'],
      recoveryCount: 12,
      successfulRecoveries: 9
    };
    
    // Mock recovery history
    const mockHistory = [
      {
        timestamp: Date.now() - 3600000,
        issueType: 'poor_signal',
        reason: 'Network quality dropped significantly: 85.0% -> 25.0%',
        isProactive: false,
        attempt: 1,
        success: true,
        duration: 2500,
        strategies: [
          {
            id: 'poor_signal',
            name: 'Poor Signal Recovery',
            success: true,
            action: 'Switched to better Wi-Fi network',
            details: {
              newSignalStrength: 0.75
            }
          }
        ]
      },
      {
        timestamp: Date.now() - 7200000,
        issueType: 'dns_issue',
        reason: 'Proactive recovery for predicted dns_issue',
        isProactive: true,
        attempt: 1,
        success: true,
        duration: 1800,
        strategies: [
          {
            id: 'dns_issue',
            name: 'DNS Issue Recovery',
            success: true,
            action: 'Changed DNS server to 8.8.8.8',
            details: {
              success: true,
              time: 120,
              resolvedCount: 3,
              totalDomains: 3
            }
          }
        ]
      },
      {
        timestamp: Date.now() - 86400000,
        issueType: 'offline',
        reason: 'Network went offline: Connection timeout',
        isProactive: false,
        attempt: 1,
        success: false,
        duration: 5000,
        strategies: [
          {
            id: 'dns_issue',
            name: 'DNS Issue Recovery',
            success: false,
            error: 'All alternative DNS servers failed'
          },
          {
            id: 'poor_signal',
            name: 'Poor Signal Recovery',
            success: false,
            error: 'Failed to improve signal strength'
          }
        ]
      }
    ];
    
    // Update state with mock data
    setRecoveryData({
      loading: false,
      error: null,
      status: mockStatus,
      history: mockHistory,
      config: mockStatus
    });
    
    // Update config form with mock data
    setConfigForm({
      enabled: mockStatus.enabled,
      proactiveEnabled: mockStatus.proactiveEnabled,
      adaptiveEnabled: mockStatus.adaptiveEnabled,
      maxAttempts: mockStatus.maxAttempts,
      cooldownPeriod: mockStatus.cooldownPeriod,
      proactiveThreshold: 0.7,
      strategies: {
        dns_issue: true,
        poor_signal: true,
        congestion: true,
        interference: true,
        bandwidth_limit: true,
        intermittent: true,
        regular_outage: true
      }
    });
  };
  
  // Handle trigger form change
  const handleTriggerFormChange = (e) => {
    const { name, value } = e.target;
    setTriggerForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle config form change
  const handleConfigFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name.startsWith('strategy-')) {
        const strategyName = name.replace('strategy-', '');
        setConfigForm(prev => ({
          ...prev,
          strategies: {
            ...prev.strategies,
            [strategyName]: checked
          }
        }));
      } else {
        setConfigForm(prev => ({ ...prev, [name]: checked }));
      }
    } else if (type === 'number') {
      setConfigForm(prev => ({ ...prev, [name]: parseInt(value) }));
    } else {
      setConfigForm(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle trigger recovery
  const handleTriggerRecovery = async (e) => {
    e.preventDefault();
    
    try {
      setRecoveryResult(null);
      
      const response = await axios.post('/recovery/trigger', triggerForm);
      
      setRecoveryResult({
        success: response.data.success,
        message: response.data.success ? 
          'Recovery process completed successfully' : 
          'Recovery process failed',
        details: response.data
      });
      
      // Refresh data after recovery
      fetchRecoveryData();
    } catch (error) {
      console.error('Error triggering recovery:', error);
      setRecoveryResult({
        success: false,
        message: 'Error triggering recovery',
        details: error.response?.data || { error: error.message }
      });
    }
  };
  
  // Handle update config
  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    
    try {
      setConfigUpdateResult(null);
      
      const response = await axios.post('/recovery/config', configForm);
      
      setConfigUpdateResult({
        success: response.data.success,
        message: response.data.success ? 
          'Configuration updated successfully' : 
          'Failed to update configuration',
        details: response.data
      });
      
      // Refresh data after config update
      fetchRecoveryData();
    } catch (error) {
      console.error('Error updating config:', error);
      setConfigUpdateResult({
        success: false,
        message: 'Error updating configuration',
        details: error.response?.data || { error: error.message }
      });
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Format duration
  const formatDuration = (duration) => {
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}s`;
    } else {
      return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
    }
  };
  
  // Get status badge
  const getStatusBadge = (success) => {
    return success ? 
      <Badge bg="success">Success</Badge> : 
      <Badge bg="danger">Failed</Badge>;
  };
  
  // Get proactive badge
  const getProactiveBadge = (isProactive) => {
    return isProactive ? 
      <Badge bg="info">Proactive</Badge> : 
      <Badge bg="warning">Reactive</Badge>;
  };
  
  // Render loading state
  if (recoveryData.loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading recovery manager data...</p>
      </div>
    );
  }
  
  // Render error state
  if (recoveryData.error) {
    return (
      <Alert variant="danger" className="my-3">
        <Alert.Heading>Error Loading Data</Alert.Heading>
        <p>{recoveryData.error}</p>
        <Button variant="outline-danger" onClick={() => setMockData()}>
          Load Sample Data
        </Button>
      </Alert>
    );
  }
  
  // Calculate success rate
  const successRate = recoveryData.status.recoveryCount > 0 ? 
    (recoveryData.status.successfulRecoveries / recoveryData.status.recoveryCount) * 100 : 0;
  
  // Prepare chart data
  const issueTypeData = recoveryData.history.reduce((acc, entry) => {
    const issueType = entry.issueType;
    const existingEntry = acc.find(item => item.name === issueType);
    
    if (existingEntry) {
      existingEntry.value++;
      if (entry.success) {
        existingEntry.successCount++;
      }
    } else {
      acc.push({
        name: issueType,
        value: 1,
        successCount: entry.success ? 1 : 0
      });
    }
    
    return acc;
  }, []);
  
  // Prepare strategy success data
  const strategyData = recoveryData.history.reduce((acc, entry) => {
    entry.strategies.forEach(strategy => {
      const existingEntry = acc.find(item => item.name === strategy.id);
      
      if (existingEntry) {
        existingEntry.total++;
        if (strategy.success) {
          existingEntry.success++;
        }
      } else {
        acc.push({
          name: strategy.id,
          total: 1,
          success: strategy.success ? 1 : 0
        });
      }
    });
    
    return acc;
  }, []);
  
  return (
    <div className="recovery-manager-dashboard">
      <h2 className="mb-4">Automated Recovery Manager</h2>
      
      <Tabs defaultActiveKey="status" className="mb-4">
        <Tab eventKey="status" title="Status & History">
          {/* Summary Stats */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Recovery Status</Card.Title>
                  <h3 className={recoveryData.status.enabled ? 'text-success' : 'text-danger'}>
                    {recoveryData.status.enabled ? 'Enabled' : 'Disabled'}
                  </h3>
                  <p className="text-muted">
                    {recoveryData.status.isRecoveryInProgress ? 
                      'Recovery in progress' : 'Idle'}
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Success Rate</Card.Title>
                  <h3 className="text-primary">{successRate.toFixed(1)}%</h3>
                  <p className="text-muted">
                    {recoveryData.status.successfulRecoveries} / {recoveryData.status.recoveryCount} recoveries
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Proactive Recovery</Card.Title>
                  <h3 className={recoveryData.status.proactiveEnabled ? 'text-success' : 'text-danger'}>
                    {recoveryData.status.proactiveEnabled ? 'Enabled' : 'Disabled'}
                  </h3>
                  <p className="text-muted">
                    Threshold: {(recoveryData.status.proactiveThreshold || 0.7) * 100}%
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Available Strategies</Card.Title>
                  <h3 className="text-info">{recoveryData.status.availableStrategies?.length || 0}</h3>
                  <p className="text-muted">
                    Recovery mechanisms
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Recovery History */}
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Recovery History</Card.Title>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Issue Type</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Strategies</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {recoveryData.history.map((entry, index) => (
                    <tr key={index}>
                      <td>{formatTimestamp(entry.timestamp)}</td>
                      <td>
                        <Badge bg="secondary">{entry.issueType}</Badge>
                      </td>
                      <td>{getProactiveBadge(entry.isProactive)}</td>
                      <td>{getStatusBadge(entry.success)}</td>
                      <td>{formatDuration(entry.duration)}</td>
                      <td>{entry.strategies.length}</td>
                      <td>{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          
          {/* Charts */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Recovery by Issue Type</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={issueTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {issueTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} recoveries`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Strategy Success Rate</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={strategyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'success' ? 'Successful' : 'Total']} />
                      <Legend />
                      <Bar dataKey="total" name="Total Attempts" fill="#8884d8" />
                      <Bar dataKey="success" name="Successful" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="trigger" title="Trigger Recovery">
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Manually Trigger Recovery</Card.Title>
              <Form onSubmit={handleTriggerRecovery}>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Issue Type</Form.Label>
                      <Form.Select 
                        name="issueType" 
                        value={triggerForm.issueType}
                        onChange={handleTriggerFormChange}
                      >
                        <option value="offline">Offline</option>
                        <option value="poor_quality">Poor Quality</option>
                        <option value="dns_issue">DNS Issue</option>
                        <option value="poor_signal">Poor Signal</option>
                        <option value="congestion">Network Congestion</option>
                        <option value="interference">Interference</option>
                        <option value="bandwidth_limit">Bandwidth Limit</option>
                        <option value="intermittent">Intermittent Issues</option>
                        <option value="regular_outage">Regular Outage</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Reason</Form.Label>
                      <Form.Control
                        type="text"
                        name="reason"
                        value={triggerForm.reason}
                        onChange={handleTriggerFormChange}
                        placeholder="Reason for recovery"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Button variant="primary" type="submit">
                  Trigger Recovery
                </Button>
              </Form>
              
              {recoveryResult && (
                <Alert 
                  variant={recoveryResult.success ? 'success' : 'danger'}
                  className="mt-3"
                >
                  <Alert.Heading>{recoveryResult.message}</Alert.Heading>
                  <pre className="mt-2">
                    {JSON.stringify(recoveryResult.details, null, 2)}
                  </pre>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="config" title="Configuration">
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Recovery Manager Configuration</Card.Title>
              <Form onSubmit={handleUpdateConfig}>
                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        id="enabled"
                        name="enabled"
                        label="Enable Recovery Manager"
                        checked={configForm.enabled}
                        onChange={handleConfigFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        id="proactiveEnabled"
                        name="proactiveEnabled"
                        label="Enable Proactive Recovery"
                        checked={configForm.proactiveEnabled}
                        onChange={handleConfigFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        id="adaptiveEnabled"
                        name="adaptiveEnabled"
                        label="Enable Adaptive Recovery"
                        checked={configForm.adaptiveEnabled}
                        onChange={handleConfigFormChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Max Recovery Attempts</Form.Label>
                      <Form.Control
                        type="number"
                        name="maxAttempts"
                        value={configForm.maxAttempts}
                        onChange={handleConfigFormChange}
                        min="1"
                        max="10"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Cooldown Period (ms)</Form.Label>
                      <Form.Control
                        type="number"
                        name="cooldownPeriod"
                        value={configForm.cooldownPeriod}
                        onChange={handleConfigFormChange}
                        min="1000"
                        step="1000"
                      />
                      <Form.Text className="text-muted">
                        {(configForm.cooldownPeriod / 1000).toFixed(0)} seconds
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Proactive Threshold</Form.Label>
                      <Form.Control
                        type="number"
                        name="proactiveThreshold"
                        value={configForm.proactiveThreshold}
                        onChange={handleConfigFormChange}
                        min="0.1"
                        max="1.0"
                        step="0.1"
                      />
                      <Form.Text className="text-muted">
                        {(configForm.proactiveThreshold * 100).toFixed(0)}% risk threshold
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Card className="mb-3">
                  <Card.Header>Recovery Strategies</Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Check 
                            type="checkbox"
                            id="strategy-dns_issue"
                            name="strategy-dns_issue"
                            label="DNS Issue Recovery"
                            checked={configForm.strategies.dns_issue}
                            onChange={handleConfigFormChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Check 
                            type="checkbox"
                            id="strategy-poor_signal"
                            name="strategy-poor_signal"
                            label="Poor Signal Recovery"
                            checked={configForm.strategies.poor_signal}
                            onChange={handleConfigFormChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Check 
                            type="checkbox"
                            id="strategy-congestion"
                            name="strategy-congestion"
                            label="Network Congestion Recovery"
                            checked={configForm.strategies.congestion}
                            onChange={handleConfigFormChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Check 
                            type="checkbox"
                            id="strategy-interference"
                            name="strategy-interference"
                            label="Interference Recovery"
                            checked={configForm.strategies.interference}
                            onChange={handleConfigFormChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Check 
                            type="checkbox"
                            id="strategy-bandwidth_limit"
                            name="strategy-bandwidth_limit"
                            label="Bandwidth Limit Recovery"
                            checked={configForm.strategies.bandwidth_limit}
                            onChange={handleConfigFormChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Check 
                            type="checkbox"
                            id="strategy-intermittent"
                            name="strategy-intermittent"
                            label="Intermittent Issues Recovery"
                            checked={configForm.strategies.intermittent}
                            onChange={handleConfigFormChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Check 
                            type="checkbox"
                            id="strategy-regular_outage"
                            name="strategy-regular_outage"
                            label="Regular Outage Recovery"
                            checked={configForm.strategies.regular_outage}
                            onChange={handleConfigFormChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
                
                <Button variant="primary" type="submit">
                  Update Configuration
                </Button>
              </Form>
              
              {configUpdateResult && (
                <Alert 
                  variant={configUpdateResult.success ? 'success' : 'danger'}
                  className="mt-3"
                >
                  <Alert.Heading>{configUpdateResult.message}</Alert.Heading>
                  <pre className="mt-2">
                    {JSON.stringify(configUpdateResult.details, null, 2)}
                  </pre>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
};

export default RecoveryManagerDashboard;
