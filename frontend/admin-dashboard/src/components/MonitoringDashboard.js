/**
 * Monitoring Dashboard Component for MedTranslate AI Admin Dashboard
 *
 * Displays real-time system health and performance metrics
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Tabs,
  Tab,
  Alert,
  Button,
  Spinner,
  Badge
} from 'react-bootstrap';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { API_ENDPOINTS } from '../config/api';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const MonitoringDashboard = () => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [lastUpdated, setLastUpdated] = useState(null);

  // Dashboard data
  const [systemHealth, setSystemHealth] = useState({
    backend: { status: 'healthy', responseTime: 0 },
    database: { status: 'healthy', responseTime: 0 },
    edge: { status: 'healthy', responseTime: 0 },
    translation: { status: 'healthy', responseTime: 0 }
  });

  const [performanceMetrics, setPerformanceMetrics] = useState({
    cpu: [],
    memory: [],
    responseTime: [],
    errorRate: []
  });

  const [resourceUtilization, setResourceUtilization] = useState({
    lambda: [],
    dynamodb: [],
    s3: []
  });

  const [alertsData, setAlertsData] = useState([]);

  // Load dashboard data on mount and when refresh interval changes
  useEffect(() => {
    loadDashboardData();

    // Set up refresh interval
    const intervalId = setInterval(() => {
      loadDashboardData();
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch system health
      const healthResponse = await fetch(API_ENDPOINTS.MONITORING.HEALTH);
      const healthData = await healthResponse.json();

      if (!healthResponse.ok) {
        throw new Error(healthData.message || 'Failed to load system health data');
      }

      setSystemHealth(healthData);

      // Fetch performance metrics
      const performanceResponse = await fetch(API_ENDPOINTS.MONITORING.PERFORMANCE);
      const performanceData = await performanceResponse.json();

      if (!performanceResponse.ok) {
        throw new Error(performanceData.message || 'Failed to load performance metrics');
      }

      setPerformanceMetrics(performanceData);

      // Fetch resource utilization
      const resourceResponse = await fetch(API_ENDPOINTS.MONITORING.RESOURCES);
      const resourceData = await resourceResponse.json();

      if (!resourceResponse.ok) {
        throw new Error(resourceData.message || 'Failed to load resource utilization data');
      }

      setResourceUtilization(resourceData);

      // Fetch alerts
      const alertsResponse = await fetch(API_ENDPOINTS.MONITORING.ALERTS);
      const alertsData = await alertsResponse.json();

      if (!alertsResponse.ok) {
        throw new Error(alertsData.message || 'Failed to load alerts data');
      }

      setAlertsData(alertsData);

      // Update last updated timestamp
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';

    return new Date(timestamp).toLocaleString();
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'healthy':
        return <Badge bg="success">Healthy</Badge>;
      case 'degraded':
        return <Badge bg="warning">Degraded</Badge>;
      case 'unhealthy':
        return <Badge bg="danger">Unhealthy</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    loadDashboardData();
  };

  // Handle refresh interval change
  const handleRefreshIntervalChange = (seconds) => {
    setRefreshInterval(seconds);
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>System Monitoring</h2>

        <div className="d-flex align-items-center">
          <div className="me-3">
            <small className="text-muted">
              Last updated: {formatTimestamp(lastUpdated)}
            </small>
          </div>

          <div className="me-3">
            <small className="text-muted">Auto-refresh:</small>{' '}
            <div className="btn-group btn-group-sm">
              <Button
                variant={refreshInterval === 10 ? 'primary' : 'outline-secondary'}
                onClick={() => handleRefreshIntervalChange(10)}
              >
                10s
              </Button>
              <Button
                variant={refreshInterval === 30 ? 'primary' : 'outline-secondary'}
                onClick={() => handleRefreshIntervalChange(30)}
              >
                30s
              </Button>
              <Button
                variant={refreshInterval === 60 ? 'primary' : 'outline-secondary'}
                onClick={() => handleRefreshIntervalChange(60)}
              >
                1m
              </Button>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-1"
                />
                Refreshing...
              </>
            ) : (
              'Refresh Now'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <Alert.Heading>Error Loading Dashboard Data</Alert.Heading>
          <p>{error}</p>
        </Alert>
      )}

      <Tabs
        activeKey={activeTab}
        onSelect={k => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="overview" title="System Overview">
          <Row>
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Backend API</Card.Title>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    {getStatusBadge(systemHealth.backend.status)}
                    <span className="text-muted">
                      {systemHealth.backend.responseTime}ms
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Database</Card.Title>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    {getStatusBadge(systemHealth.database.status)}
                    <span className="text-muted">
                      {systemHealth.database.responseTime}ms
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Edge Devices</Card.Title>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    {getStatusBadge(systemHealth.edge.status)}
                    <span className="text-muted">
                      {systemHealth.edge.responseTime}ms
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Translation Service</Card.Title>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    {getStatusBadge(systemHealth.translation.status)}
                    <span className="text-muted">
                      {systemHealth.translation.responseTime}ms
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={8} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>System Response Time</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceMetrics.responseTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="backend"
                        stroke="#0088FE"
                        name="Backend API"
                      />
                      <Line
                        type="monotone"
                        dataKey="database"
                        stroke="#00C49F"
                        name="Database"
                      />
                      <Line
                        type="monotone"
                        dataKey="translation"
                        stroke="#FFBB28"
                        name="Translation"
                      />
                      <Line
                        type="monotone"
                        dataKey="edge"
                        stroke="#FF8042"
                        name="Edge Devices"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Active Alerts</Card.Title>
                  {alertsData.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-success mb-0">No active alerts</p>
                    </div>
                  ) : (
                    <div className="alert-list">
                      {alertsData.slice(0, 5).map((alert, index) => (
                        <div
                          key={index}
                          className={`alert alert-${alert.severity} mb-2`}
                        >
                          <small className="d-block text-muted">
                            {formatTimestamp(alert.timestamp)}
                          </small>
                          <div>{alert.message}</div>
                        </div>
                      ))}

                      {alertsData.length > 5 && (
                        <div className="text-center mt-2">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setActiveTab('alerts')}
                          >
                            View all {alertsData.length} alerts
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="performance" title="Performance Metrics">
          <Row>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>CPU Utilization</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceMetrics.cpu}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="backend"
                        stackId="1"
                        stroke="#0088FE"
                        fill="#0088FE"
                        name="Backend API"
                      />
                      <Area
                        type="monotone"
                        dataKey="database"
                        stackId="1"
                        stroke="#00C49F"
                        fill="#00C49F"
                        name="Database"
                      />
                      <Area
                        type="monotone"
                        dataKey="translation"
                        stackId="1"
                        stroke="#FFBB28"
                        fill="#FFBB28"
                        name="Translation"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Memory Usage</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceMetrics.memory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="backend"
                        stackId="1"
                        stroke="#0088FE"
                        fill="#0088FE"
                        name="Backend API"
                      />
                      <Area
                        type="monotone"
                        dataKey="database"
                        stackId="1"
                        stroke="#00C49F"
                        fill="#00C49F"
                        name="Database"
                      />
                      <Area
                        type="monotone"
                        dataKey="translation"
                        stackId="1"
                        stroke="#FFBB28"
                        fill="#FFBB28"
                        name="Translation"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Error Rate</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceMetrics.errorRate}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="backend"
                        stroke="#0088FE"
                        name="Backend API"
                      />
                      <Line
                        type="monotone"
                        dataKey="database"
                        stroke="#00C49F"
                        name="Database"
                      />
                      <Line
                        type="monotone"
                        dataKey="translation"
                        stroke="#FFBB28"
                        name="Translation"
                      />
                      <Line
                        type="monotone"
                        dataKey="edge"
                        stroke="#FF8042"
                        name="Edge Devices"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Request Volume</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceMetrics.requestVolume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="translations"
                        fill="#0088FE"
                        name="Translations"
                      />
                      <Bar
                        dataKey="sessions"
                        fill="#00C49F"
                        name="Sessions"
                      />
                      <Bar
                        dataKey="users"
                        fill="#FFBB28"
                        name="Users"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="resources" title="Resource Utilization">
          <Row>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Lambda Functions</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={resourceUtilization.lambda}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="invocations"
                        fill="#0088FE"
                        name="Invocations"
                      />
                      <Bar
                        dataKey="errors"
                        fill="#FF8042"
                        name="Errors"
                      />
                      <Bar
                        dataKey="throttles"
                        fill="#FFBB28"
                        name="Throttles"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>DynamoDB Tables</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={resourceUtilization.dynamodb}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="readCapacity"
                        fill="#0088FE"
                        name="Read Capacity"
                      />
                      <Bar
                        dataKey="writeCapacity"
                        fill="#00C49F"
                        name="Write Capacity"
                      />
                      <Bar
                        dataKey="throttles"
                        fill="#FF8042"
                        name="Throttles"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>S3 Storage</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={resourceUtilization.s3}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} GB (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="size"
                      >
                        {resourceUtilization.s3.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>API Gateway</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={resourceUtilization.apiGateway}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="requests"
                        stroke="#0088FE"
                        name="Requests"
                      />
                      <Line
                        type="monotone"
                        dataKey="errors"
                        stroke="#FF8042"
                        name="Errors"
                      />
                      <Line
                        type="monotone"
                        dataKey="latency"
                        stroke="#00C49F"
                        name="Latency (ms)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="alerts" title="Alerts">
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title>System Alerts</Card.Title>

                <div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="me-2"
                  >
                    Filter
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                  >
                    Export
                  </Button>
                </div>
              </div>

              {alertsData.length === 0 ? (
                <Alert variant="success">
                  No alerts found. All systems are operating normally.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Severity</th>
                        <th>Component</th>
                        <th>Message</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertsData.map((alert, index) => (
                        <tr key={index}>
                          <td>{formatTimestamp(alert.timestamp)}</td>
                          <td>
                            <Badge bg={
                              alert.severity === 'critical' ? 'danger' :
                              alert.severity === 'warning' ? 'warning' :
                              alert.severity === 'info' ? 'info' : 'secondary'
                            }>
                              {alert.severity}
                            </Badge>
                          </td>
                          <td>{alert.component}</td>
                          <td>{alert.message}</td>
                          <td>
                            <Badge bg={
                              alert.status === 'resolved' ? 'success' :
                              alert.status === 'acknowledged' ? 'primary' : 'danger'
                            }>
                              {alert.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default MonitoringDashboard;
