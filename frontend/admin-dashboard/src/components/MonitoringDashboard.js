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

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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

  // New state for enhanced monitoring
  const [translationQuality, setTranslationQuality] = useState({
    overall: { score: 0, trend: 'stable' },
    byLanguage: [],
    byContext: [],
    feedback: [],
    issues: []
  });

  const [offlineMetrics, setOfflineMetrics] = useState({
    readiness: { overall: 0, byDevice: [] },
    syncStatus: { lastSync: null, pendingChanges: 0, syncSuccess: 0, syncFailed: 0 },
    cachePerformance: { hitRate: 0, missRate: 0, size: 0, items: 0 },
    predictionAccuracy: { overall: 0, byContext: [] }
  });

  const [mlPerformance, setMlPerformance] = useState({
    models: [],
    predictions: { accuracy: 0, precision: 0, recall: 0 },
    latency: { average: 0, p95: 0, p99: 0 },
    training: { lastTrained: null, dataPoints: 0, accuracy: 0 }
  });

  const [usageAnalytics, setUsageAnalytics] = useState({
    activeUsers: { total: 0, providers: 0, patients: 0 },
    sessions: { total: 0, completed: 0, abandoned: 0 },
    translations: { total: 0, byLanguage: [], byContext: [] },
    devices: { desktop: 0, mobile: 0, tablet: 0 }
  });

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

      // Create an array of promises for all data fetching operations
      const fetchPromises = [
        // Core monitoring data
        fetch(API_ENDPOINTS.MONITORING.HEALTH),
        fetch(API_ENDPOINTS.MONITORING.PERFORMANCE),
        fetch(API_ENDPOINTS.MONITORING.RESOURCES),
        fetch(API_ENDPOINTS.MONITORING.ALERTS),

        // Enhanced monitoring data
        fetch(API_ENDPOINTS.MONITORING.TRANSLATION_QUALITY),
        fetch(API_ENDPOINTS.MONITORING.OFFLINE_METRICS),
        fetch(API_ENDPOINTS.MONITORING.ML_PERFORMANCE),
        fetch(API_ENDPOINTS.MONITORING.USAGE_ANALYTICS)
      ];

      // Wait for all fetch operations to complete
      const responses = await Promise.all(fetchPromises);

      // Process responses and extract JSON data
      const [
        healthResponse,
        performanceResponse,
        resourceResponse,
        alertsResponse,
        translationQualityResponse,
        offlineMetricsResponse,
        mlPerformanceResponse,
        usageAnalyticsResponse
      ] = responses;

      // Extract JSON data from responses
      const responseDataPromises = [
        healthResponse.json(),
        performanceResponse.json(),
        resourceResponse.json(),
        alertsResponse.json(),
        translationQualityResponse.json(),
        offlineMetricsResponse.json(),
        mlPerformanceResponse.json(),
        usageAnalyticsResponse.json()
      ];

      // Wait for all JSON parsing to complete
      const [
        healthData,
        performanceData,
        resourceData,
        alertsData,
        translationQualityData,
        offlineMetricsData,
        mlPerformanceData,
        usageAnalyticsData
      ] = await Promise.all(responseDataPromises);

      // Check for errors in core responses
      if (!healthResponse.ok) {
        throw new Error(healthData.message || 'Failed to load system health data');
      }

      if (!performanceResponse.ok) {
        throw new Error(performanceData.message || 'Failed to load performance metrics');
      }

      if (!resourceResponse.ok) {
        throw new Error(resourceData.message || 'Failed to load resource utilization data');
      }

      if (!alertsResponse.ok) {
        throw new Error(alertsData.message || 'Failed to load alerts data');
      }

      // Update state with core data
      setSystemHealth(healthData);
      setPerformanceMetrics(performanceData);
      setResourceUtilization(resourceData);
      setAlertsData(alertsData);

      // Update state with enhanced monitoring data if available
      // Handle translation quality data
      if (translationQualityResponse.ok) {
        setTranslationQuality(translationQualityData);
      } else {
        console.warn('Failed to load translation quality data:', translationQualityData.message);
      }

      // Handle offline metrics data
      if (offlineMetricsResponse.ok) {
        setOfflineMetrics(offlineMetricsData);
      } else {
        console.warn('Failed to load offline metrics data:', offlineMetricsData.message);
      }

      // Handle ML performance data
      if (mlPerformanceResponse.ok) {
        setMlPerformance(mlPerformanceData);
      } else {
        console.warn('Failed to load ML performance data:', mlPerformanceData.message);
      }

      // Handle usage analytics data
      if (usageAnalyticsResponse.ok) {
        setUsageAnalytics(usageAnalyticsData);
      } else {
        console.warn('Failed to load usage analytics data:', usageAnalyticsData.message);
      }

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
          <div className="d-flex justify-content-end mb-3">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setActiveTab('translation-quality')}
              className="me-2"
            >
              View Translation Quality
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setActiveTab('offline-metrics')}
              className="me-2"
            >
              View Offline Metrics
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setActiveTab('ml-performance')}
            >
              View ML Performance
            </Button>
          </div>
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

        <Tab eventKey="translation-quality" title="Translation Quality">
          <Row>
            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Overall Quality Score</Card.Title>
                  <div className="text-center my-4">
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Score', value: translationQuality.overall.score, fill: '#0088FE' },
                              { name: 'Remaining', value: 100 - translationQuality.overall.score, fill: '#f5f5f5' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <h3 className="mb-0">{translationQuality.overall.score}%</h3>
                        <small className={`text-${
                          translationQuality.overall.trend === 'improving' ? 'success' :
                          translationQuality.overall.trend === 'declining' ? 'danger' : 'secondary'
                        }`}>
                          {translationQuality.overall.trend === 'improving' ? '↑' :
                           translationQuality.overall.trend === 'declining' ? '↓' : '→'} {translationQuality.overall.trend}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h6>Quality Breakdown</h6>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Accuracy</span>
                      <span>{translationQuality.overall.accuracy || 85}%</span>
                    </div>
                    <div className="progress mb-3" style={{ height: '5px' }}>
                      <div
                        className="progress-bar bg-primary"
                        style={{ width: `${translationQuality.overall.accuracy || 85}%` }}
                      ></div>
                    </div>

                    <div className="d-flex justify-content-between mb-1">
                      <span>Fluency</span>
                      <span>{translationQuality.overall.fluency || 82}%</span>
                    </div>
                    <div className="progress mb-3" style={{ height: '5px' }}>
                      <div
                        className="progress-bar bg-success"
                        style={{ width: `${translationQuality.overall.fluency || 82}%` }}
                      ></div>
                    </div>

                    <div className="d-flex justify-content-between mb-1">
                      <span>Medical Terminology</span>
                      <span>{translationQuality.overall.terminology || 90}%</span>
                    </div>
                    <div className="progress mb-3" style={{ height: '5px' }}>
                      <div
                        className="progress-bar bg-info"
                        style={{ width: `${translationQuality.overall.terminology || 90}%` }}
                      ></div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={8} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Quality by Language Pair</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={translationQuality.byLanguage || [
                      { pair: 'EN-ES', score: 92, volume: 1250 },
                      { pair: 'EN-FR', score: 88, volume: 820 },
                      { pair: 'EN-ZH', score: 85, volume: 650 },
                      { pair: 'EN-DE', score: 90, volume: 450 },
                      { pair: 'EN-JA', score: 82, volume: 320 },
                      { pair: 'EN-AR', score: 78, volume: 280 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="pair" />
                      <YAxis yAxisId="left" orientation="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="score" name="Quality Score" fill="#0088FE" />
                      <Bar yAxisId="right" dataKey="volume" name="Translation Volume" fill="#00C49F" />
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
                  <Card.Title>Quality by Medical Context</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      layout="vertical"
                      data={translationQuality.byContext || [
                        { context: 'General', score: 92 },
                        { context: 'Cardiology', score: 88 },
                        { context: 'Oncology', score: 90 },
                        { context: 'Neurology', score: 85 },
                        { context: 'Pediatrics', score: 94 },
                        { context: 'Emergency', score: 89 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="context" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="score" name="Quality Score" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <Card.Title>Recent User Feedback</Card.Title>
                    <Button variant="outline-primary" size="sm">View All</Button>
                  </div>

                  {(translationQuality.feedback || [
                    { id: 1, rating: 5, comment: "Perfect translation for cardiology terms", language: "EN-ES", timestamp: new Date(Date.now() - 3600000).toISOString() },
                    { id: 2, rating: 3, comment: "Some medical terms were not translated correctly", language: "EN-ZH", timestamp: new Date(Date.now() - 7200000).toISOString() },
                    { id: 3, rating: 4, comment: "Good overall but missed some context", language: "EN-FR", timestamp: new Date(Date.now() - 14400000).toISOString() },
                    { id: 4, rating: 5, comment: "Excellent handling of complex terminology", language: "EN-DE", timestamp: new Date(Date.now() - 28800000).toISOString() }
                  ]).map((feedback, index) => (
                    <div key={index} className="border-bottom pb-2 mb-2">
                      <div className="d-flex justify-content-between">
                        <div>
                          {Array(5).fill(0).map((_, i) => (
                            <span key={i} className={i < feedback.rating ? "text-warning" : "text-muted"}>★</span>
                          ))}
                          <Badge bg="secondary" className="ms-2">{feedback.language}</Badge>
                        </div>
                        <small className="text-muted">{formatTimestamp(feedback.timestamp)}</small>
                      </div>
                      <p className="mb-0 mt-1">{feedback.comment}</p>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={12} className="mb-4">
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <Card.Title>Common Translation Issues</Card.Title>
                    <div>
                      <Button variant="outline-secondary" size="sm" className="me-2">Filter</Button>
                      <Button variant="outline-primary" size="sm">Export</Button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Issue Type</th>
                          <th>Frequency</th>
                          <th>Languages</th>
                          <th>Impact</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(translationQuality.issues || [
                          { type: "Medical terminology mismatch", frequency: "High", languages: ["EN-ZH", "EN-AR"], impact: "Critical", status: "In Progress" },
                          { type: "Grammar errors in complex sentences", frequency: "Medium", languages: ["EN-FR", "EN-DE"], impact: "Moderate", status: "Resolved" },
                          { type: "Context misinterpretation", frequency: "Low", languages: ["EN-ES"], impact: "Minor", status: "Monitoring" },
                          { type: "Abbreviation handling", frequency: "Medium", languages: ["EN-JA", "EN-ZH"], impact: "Moderate", status: "In Progress" }
                        ]).map((issue, index) => (
                          <tr key={index}>
                            <td>{issue.type}</td>
                            <td>
                              <Badge bg={
                                issue.frequency === "High" ? "danger" :
                                issue.frequency === "Medium" ? "warning" : "success"
                              }>
                                {issue.frequency}
                              </Badge>
                            </td>
                            <td>
                              {issue.languages.map((lang, i) => (
                                <Badge key={i} bg="secondary" className="me-1">{lang}</Badge>
                              ))}
                            </td>
                            <td>
                              <Badge bg={
                                issue.impact === "Critical" ? "danger" :
                                issue.impact === "Moderate" ? "warning" : "info"
                              }>
                                {issue.impact}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg={
                                issue.status === "Resolved" ? "success" :
                                issue.status === "In Progress" ? "primary" : "secondary"
                              }>
                                {issue.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="offline-metrics" title="Offline Capabilities">
          <Row>
            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Offline Readiness</Card.Title>
                  <div className="text-center my-4">
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Ready', value: offlineMetrics.readiness.overall, fill: '#00C49F' },
                              { name: 'Not Ready', value: 100 - offlineMetrics.readiness.overall, fill: '#f5f5f5' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <h3 className="mb-0">{offlineMetrics.readiness.overall || 78}%</h3>
                        <small className="text-muted">System Readiness</small>
                      </div>
                    </div>
                  </div>

                  <h6>Readiness by Device Type</h6>
                  {(offlineMetrics.readiness.byDevice || [
                    { type: "Provider Tablets", readiness: 85 },
                    { type: "Patient Mobile", readiness: 72 },
                    { type: "Edge Devices", readiness: 90 }
                  ]).map((device, index) => (
                    <div key={index} className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span>{device.type}</span>
                        <span>{device.readiness}%</span>
                      </div>
                      <div className="progress" style={{ height: '5px' }}>
                        <div
                          className={`progress-bar ${
                            device.readiness > 80 ? 'bg-success' :
                            device.readiness > 60 ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{ width: `${device.readiness}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Sync Status</Card.Title>

                  <div className="d-flex justify-content-between align-items-center mt-3 mb-4">
                    <div>
                      <h6 className="mb-0">Last Successful Sync</h6>
                      <p className="text-muted mb-0">{formatTimestamp(offlineMetrics.syncStatus.lastSync)}</p>
                    </div>
                    <Button variant="primary" size="sm">Trigger Sync</Button>
                  </div>

                  <div className="row text-center">
                    <div className="col-4">
                      <h3 className="mb-0">{offlineMetrics.syncStatus.pendingChanges || 12}</h3>
                      <small className="text-muted">Pending</small>
                    </div>
                    <div className="col-4">
                      <h3 className="mb-0 text-success">{offlineMetrics.syncStatus.syncSuccess || 1458}</h3>
                      <small className="text-muted">Successful</small>
                    </div>
                    <div className="col-4">
                      <h3 className="mb-0 text-danger">{offlineMetrics.syncStatus.syncFailed || 23}</h3>
                      <small className="text-muted">Failed</small>
                    </div>
                  </div>

                  <hr />

                  <h6>Sync Performance</h6>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={offlineMetrics.syncPerformance || [
                      { time: '08:00', success: 95, failure: 5 },
                      { time: '10:00', success: 98, failure: 2 },
                      { time: '12:00', success: 92, failure: 8 },
                      { time: '14:00', success: 97, failure: 3 },
                      { time: '16:00', success: 99, failure: 1 }
                    ]}>
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="success" stroke="#00C49F" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="failure" stroke="#FF8042" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Cache Performance</Card.Title>

                  <div className="row text-center mt-3 mb-4">
                    <div className="col-4">
                      <h3 className="mb-0">{offlineMetrics.cachePerformance.hitRate || 87}%</h3>
                      <small className="text-muted">Hit Rate</small>
                    </div>
                    <div className="col-4">
                      <h3 className="mb-0">{offlineMetrics.cachePerformance.missRate || 13}%</h3>
                      <small className="text-muted">Miss Rate</small>
                    </div>
                    <div className="col-4">
                      <h3 className="mb-0">{offlineMetrics.cachePerformance.size || 256}MB</h3>
                      <small className="text-muted">Size</small>
                    </div>
                  </div>

                  <h6>Cache Hit Rate by Content Type</h6>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={offlineMetrics.cacheHitsByType || [
                      { type: 'Medical Terms', hitRate: 92 },
                      { type: 'Common Phrases', hitRate: 88 },
                      { type: 'Specialty Terms', hitRate: 76 },
                      { type: 'User History', hitRate: 95 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="hitRate" fill="#8884d8" />
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
                  <Card.Title>ML Prediction Accuracy</Card.Title>
                  <div className="d-flex align-items-center mt-3 mb-3">
                    <div style={{ width: '100px', height: '100px', position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Accurate', value: offlineMetrics.predictionAccuracy.overall || 82, fill: '#0088FE' },
                              { name: 'Inaccurate', value: 100 - (offlineMetrics.predictionAccuracy.overall || 82), fill: '#f5f5f5' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <h5 className="mb-0">{offlineMetrics.predictionAccuracy.overall || 82}%</h5>
                      </div>
                    </div>
                    <div className="ms-3">
                      <h6>Overall Prediction Accuracy</h6>
                      <p className="text-muted mb-0">Based on {offlineMetrics.predictionAccuracy.sampleSize || 5280} predictions</p>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={offlineMetrics.predictionAccuracyTrend || [
                      { date: '2023-01', accuracy: 75 },
                      { date: '2023-02', accuracy: 78 },
                      { date: '2023-03', accuracy: 76 },
                      { date: '2023-04', accuracy: 80 },
                      { date: '2023-05', accuracy: 82 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[70, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="accuracy" stroke="#0088FE" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Prediction Accuracy by Context</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={offlineMetrics.predictionAccuracy.byContext || [
                      { context: 'General Practice', accuracy: 85, confidence: 92 },
                      { context: 'Emergency', accuracy: 78, confidence: 85 },
                      { context: 'Cardiology', accuracy: 88, confidence: 90 },
                      { context: 'Pediatrics', accuracy: 84, confidence: 88 },
                      { context: 'Oncology', accuracy: 80, confidence: 86 },
                      { context: 'Neurology', accuracy: 76, confidence: 82 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="context" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="accuracy" name="Actual Accuracy" fill="#0088FE" />
                      <Bar dataKey="confidence" name="Model Confidence" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="ml-performance" title="ML Performance">
          <Row>
            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Model Performance Overview</Card.Title>
                  <div className="text-center my-4">
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Accuracy', value: mlPerformance.predictions.accuracy * 100 || 85, fill: '#0088FE' },
                              { name: 'Remaining', value: 100 - (mlPerformance.predictions.accuracy * 100 || 85), fill: '#f5f5f5' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <h3 className="mb-0">{Math.round(mlPerformance.predictions.accuracy * 100) || 85}%</h3>
                        <small className="text-muted">Accuracy</small>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h6>Performance Metrics</h6>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Precision</span>
                      <span>{Math.round(mlPerformance.predictions.precision * 100) || 87}%</span>
                    </div>
                    <div className="progress mb-3" style={{ height: '5px' }}>
                      <div
                        className="progress-bar bg-primary"
                        style={{ width: `${mlPerformance.predictions.precision * 100 || 87}%` }}
                      ></div>
                    </div>

                    <div className="d-flex justify-content-between mb-1">
                      <span>Recall</span>
                      <span>{Math.round(mlPerformance.predictions.recall * 100) || 83}%</span>
                    </div>
                    <div className="progress mb-3" style={{ height: '5px' }}>
                      <div
                        className="progress-bar bg-success"
                        style={{ width: `${mlPerformance.predictions.recall * 100 || 83}%` }}
                      ></div>
                    </div>

                    <div className="d-flex justify-content-between mb-1">
                      <span>F1 Score</span>
                      <span>{Math.round(mlPerformance.predictions.f1Score * 100) || 85}%</span>
                    </div>
                    <div className="progress mb-3" style={{ height: '5px' }}>
                      <div
                        className="progress-bar bg-info"
                        style={{ width: `${mlPerformance.predictions.f1Score * 100 || 85}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h6>Last Training</h6>
                    <div className="d-flex justify-content-between">
                      <span>Date:</span>
                      <span>{formatTimestamp(mlPerformance.training.lastTrained)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Data Points:</span>
                      <span>{mlPerformance.training.dataPoints.toLocaleString() || '125,480'}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Training Accuracy:</span>
                      <span>{Math.round(mlPerformance.training.accuracy * 100) || 88}%</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={8} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Model Latency</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mlPerformance.latencyTrend || [
                      { date: '2023-01', average: 120, p95: 180, p99: 250 },
                      { date: '2023-02', average: 115, p95: 175, p99: 240 },
                      { date: '2023-03', average: 105, p95: 160, p99: 220 },
                      { date: '2023-04', average: 95, p95: 150, p99: 210 },
                      { date: '2023-05', average: 90, p95: 140, p99: 200 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="average" name="Average (ms)" stroke="#0088FE" strokeWidth={2} />
                      <Line type="monotone" dataKey="p95" name="95th Percentile (ms)" stroke="#00C49F" strokeWidth={2} />
                      <Line type="monotone" dataKey="p99" name="99th Percentile (ms)" stroke="#FF8042" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="row text-center mt-3">
                    <div className="col-4">
                      <h4 className="mb-0">{mlPerformance.latency.average || 90}ms</h4>
                      <small className="text-muted">Average</small>
                    </div>
                    <div className="col-4">
                      <h4 className="mb-0">{mlPerformance.latency.p95 || 140}ms</h4>
                      <small className="text-muted">95th Percentile</small>
                    </div>
                    <div className="col-4">
                      <h4 className="mb-0">{mlPerformance.latency.p99 || 200}ms</h4>
                      <small className="text-muted">99th Percentile</small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Model Performance by Type</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mlPerformance.models || [
                      { name: 'Translation Base', accuracy: 0.88, latency: 85, size: 120 },
                      { name: 'Medical Terminology', accuracy: 0.92, latency: 95, size: 150 },
                      { name: 'Offline Prediction', accuracy: 0.82, latency: 45, size: 80 },
                      { name: 'Context Detection', accuracy: 0.85, latency: 60, size: 90 },
                      { name: 'Language Detection', accuracy: 0.95, latency: 30, size: 50 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" domain={[0, 1]} tickFormatter={(value) => `${value * 100}%`} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value, name) => name === 'accuracy' ? `${(value * 100).toFixed(1)}%` : value} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="accuracy" name="Accuracy" fill="#0088FE" />
                      <Bar yAxisId="right" dataKey="latency" name="Latency (ms)" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Model Size Comparison</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart layout="vertical" data={mlPerformance.models || [
                      { name: 'Translation Base', size: 120, compressedSize: 45 },
                      { name: 'Medical Terminology', size: 150, compressedSize: 60 },
                      { name: 'Offline Prediction', size: 80, compressedSize: 35 },
                      { name: 'Context Detection', size: 90, compressedSize: 40 },
                      { name: 'Language Detection', size: 50, compressedSize: 20 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="size" name="Original Size (MB)" fill="#8884d8" />
                      <Bar dataKey="compressedSize" name="Compressed Size (MB)" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={12} className="mb-4">
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <Card.Title>Model Training History</Card.Title>
                    <Button variant="outline-primary" size="sm">View Details</Button>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th>Version</th>
                          <th>Training Date</th>
                          <th>Accuracy</th>
                          <th>Data Points</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(mlPerformance.trainingHistory || [
                          { model: "Translation Base", version: "2.4.0", date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), accuracy: 0.88, dataPoints: 125480, status: "Active" },
                          { model: "Medical Terminology", version: "1.8.2", date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), accuracy: 0.92, dataPoints: 98750, status: "Active" },
                          { model: "Offline Prediction", version: "3.1.0", date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), accuracy: 0.82, dataPoints: 75320, status: "Active" },
                          { model: "Context Detection", version: "2.0.1", date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), accuracy: 0.85, dataPoints: 62480, status: "Active" },
                          { model: "Language Detection", version: "1.5.3", date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), accuracy: 0.95, dataPoints: 45920, status: "Active" }
                        ]).map((training, index) => (
                          <tr key={index}>
                            <td>{training.model}</td>
                            <td>{training.version}</td>
                            <td>{formatTimestamp(training.date)}</td>
                            <td>{(training.accuracy * 100).toFixed(1)}%</td>
                            <td>{training.dataPoints.toLocaleString()}</td>
                            <td>
                              <Badge bg={
                                training.status === "Active" ? "success" :
                                training.status === "Training" ? "primary" :
                                training.status === "Failed" ? "danger" : "secondary"
                              }>
                                {training.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="usage-analytics" title="Usage Analytics">
          <Row>
            <Col lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <Card.Title>Active Users</Card.Title>
                  <h1 className="display-4 mt-3">{usageAnalytics.activeUsers.total || 1250}</h1>
                  <p className="text-muted">Total Active Users</p>

                  <div className="row mt-4">
                    <div className="col-6">
                      <h4>{usageAnalytics.activeUsers.providers || 320}</h4>
                      <small className="text-muted">Providers</small>
                    </div>
                    <div className="col-6">
                      <h4>{usageAnalytics.activeUsers.patients || 930}</h4>
                      <small className="text-muted">Patients</small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <Card.Title>Sessions</Card.Title>
                  <h1 className="display-4 mt-3">{usageAnalytics.sessions.total || 3840}</h1>
                  <p className="text-muted">Total Sessions</p>

                  <div className="row mt-4">
                    <div className="col-6">
                      <h4>{usageAnalytics.sessions.completed || 3650}</h4>
                      <small className="text-muted">Completed</small>
                    </div>
                    <div className="col-6">
                      <h4>{usageAnalytics.sessions.abandoned || 190}</h4>
                      <small className="text-muted">Abandoned</small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <Card.Title>Translations</Card.Title>
                  <h1 className="display-4 mt-3">{usageAnalytics.translations.total || 28750}</h1>
                  <p className="text-muted">Total Translations</p>

                  <div className="row mt-4">
                    <div className="col-6">
                      <h4>{usageAnalytics.translations.online || 25200}</h4>
                      <small className="text-muted">Online</small>
                    </div>
                    <div className="col-6">
                      <h4>{usageAnalytics.translations.offline || 3550}</h4>
                      <small className="text-muted">Offline</small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <Card.Title>Device Usage</Card.Title>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Desktop', value: usageAnalytics.devices.desktop || 45 },
                          { name: 'Mobile', value: usageAnalytics.devices.mobile || 40 },
                          { name: 'Tablet', value: usageAnalytics.devices.tablet || 15 }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {usageAnalytics.devices && Object.keys(usageAnalytics.devices).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Translations by Language</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={usageAnalytics.translations.byLanguage || [
                      { language: 'Spanish', count: 12500 },
                      { language: 'French', count: 5200 },
                      { language: 'Chinese', count: 4800 },
                      { language: 'Arabic', count: 2300 },
                      { language: 'German', count: 1950 },
                      { language: 'Japanese', count: 1200 },
                      { language: 'Russian', count: 800 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="language" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name="Translations" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Translations by Medical Context</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={usageAnalytics.translations.byContext || [
                          { context: 'General', count: 9800 },
                          { context: 'Cardiology', count: 5200 },
                          { context: 'Pediatrics', count: 4300 },
                          { context: 'Oncology', count: 3100 },
                          { context: 'Neurology', count: 2800 },
                          { context: 'Emergency', count: 3550 }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="context"
                        label={({ context, percent }) => `${context}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {(usageAnalytics.translations.byContext || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [value, props.payload.context]} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={12} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Usage Trends</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={usageAnalytics.trends || [
                      { date: '2023-01-01', users: 980, sessions: 3200, translations: 24500 },
                      { date: '2023-02-01', users: 1050, sessions: 3400, translations: 25800 },
                      { date: '2023-03-01', users: 1120, sessions: 3550, translations: 26900 },
                      { date: '2023-04-01', users: 1180, sessions: 3700, translations: 27800 },
                      { date: '2023-05-01', users: 1250, sessions: 3840, translations: 28750 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 5000']} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="users" name="Active Users" stroke="#0088FE" strokeWidth={2} />
                      <Line yAxisId="left" type="monotone" dataKey="sessions" name="Sessions" stroke="#00C49F" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="translations" name="Translations" stroke="#FF8042" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <Card.Title>User Engagement</Card.Title>
                    <Button variant="outline-primary" size="sm">View Details</Button>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>Value</th>
                          <th>Change</th>
                          <th>Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(usageAnalytics.engagement || [
                          { metric: "Avg. Session Duration", value: "12m 30s", change: "+5%", trend: "up" },
                          { metric: "Translations per Session", value: "7.5", change: "+2%", trend: "up" },
                          { metric: "Daily Active Users", value: "850", change: "+8%", trend: "up" },
                          { metric: "Monthly Retention", value: "92%", change: "+3%", trend: "up" },
                          { metric: "Offline Usage", value: "12%", change: "+15%", trend: "up" }
                        ]).map((item, index) => (
                          <tr key={index}>
                            <td>{item.metric}</td>
                            <td><strong>{item.value}</strong></td>
                            <td className={item.trend === "up" ? "text-success" : "text-danger"}>
                              {item.trend === "up" ? "↑" : "↓"} {item.change}
                            </td>
                            <td>
                              <div style={{ width: '50px', height: '20px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={[
                                    { value: 10 }, { value: 15 }, { value: 12 }, { value: 18 }, { value: 16 }, { value: 20 }
                                  ]}>
                                    <Line type="monotone" dataKey="value" stroke={item.trend === "up" ? "#00C49F" : "#FF8042"} strokeWidth={2} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Geographic Distribution</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart layout="vertical" data={usageAnalytics.geographic || [
                      { region: "North America", users: 580 },
                      { region: "Europe", users: 320 },
                      { region: "Asia", users: 180 },
                      { region: "South America", users: 120 },
                      { region: "Africa", users: 40 },
                      { region: "Oceania", users: 10 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="region" type="category" />
                      <Tooltip />
                      <Bar dataKey="users" name="Active Users" fill="#8884d8" />
                    </BarChart>
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
