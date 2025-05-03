import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Form, Alert } from 'react-bootstrap';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';
import axios from 'axios';

/**
 * ConnectionAnalyticsDashboard component for visualizing connection analytics
 * and ML-based connection issue predictions
 */
const ConnectionAnalyticsDashboard = () => {
  // State for analytics data
  const [connectionData, setConnectionData] = useState({
    loading: true,
    error: null,
    stats: {},
    predictions: [],
    userProfiles: [],
    recurringPatterns: [],
    qualityTrends: [],
    issueTypes: []
  });
  
  // State for filter options
  const [filters, setFilters] = useState({
    timeRange: '24h',
    userFilter: 'all',
    locationFilter: 'all',
    riskThreshold: 'medium'
  });
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const RISK_COLORS = {
    high: '#FF4842',
    medium: '#FFC107',
    low: '#00C49F',
    none: '#8884d8'
  };
  
  // Load connection analytics data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setConnectionData(prev => ({ ...prev, loading: true }));
        
        // Fetch connection stats
        const statsResponse = await axios.get('/api/analytics/connection/stats');
        
        // Fetch connection predictions
        const predictionsResponse = await axios.get('/api/analytics/connection/predictions', {
          params: { 
            timeRange: filters.timeRange,
            riskThreshold: getRiskThresholdValue(filters.riskThreshold)
          }
        });
        
        // Fetch user profiles
        const profilesResponse = await axios.get('/api/analytics/connection/user-profiles', {
          params: { 
            userFilter: filters.userFilter !== 'all' ? filters.userFilter : undefined
          }
        });
        
        // Fetch recurring patterns
        const patternsResponse = await axios.get('/api/analytics/connection/recurring-patterns', {
          params: { 
            locationFilter: filters.locationFilter !== 'all' ? filters.locationFilter : undefined
          }
        });
        
        // Fetch quality trends
        const trendsResponse = await axios.get('/api/analytics/connection/quality-trends', {
          params: { timeRange: filters.timeRange }
        });
        
        // Fetch issue types
        const issueTypesResponse = await axios.get('/api/analytics/connection/issue-types');
        
        // Update state with fetched data
        setConnectionData({
          loading: false,
          error: null,
          stats: statsResponse.data,
          predictions: predictionsResponse.data,
          userProfiles: profilesResponse.data,
          recurringPatterns: patternsResponse.data,
          qualityTrends: trendsResponse.data,
          issueTypes: issueTypesResponse.data
        });
      } catch (error) {
        console.error('Error fetching connection analytics:', error);
        setConnectionData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load connection analytics data'
        }));
        
        // Use mock data for development
        setMockData();
      }
    };
    
    fetchData();
  }, [filters]);
  
  // Helper function to get risk threshold value
  const getRiskThresholdValue = (threshold) => {
    switch (threshold) {
      case 'high': return 0.7;
      case 'medium': return 0.4;
      case 'low': return 0.2;
      default: return 0.4;
    }
  };
  
  // Set mock data for development
  const setMockData = () => {
    // Mock connection stats
    const mockStats = {
      totalConnections: 1250,
      totalReconnections: 87,
      averageLatency: 125,
      connectionSuccessRate: 98.5,
      messageSuccessRate: 99.2,
      networkStabilityScore: 92,
      disconnectionFrequency: 0.8,
      modelConfidence: 0.85,
      patternCount: 12,
      userProfileCount: 8
    };
    
    // Mock predictions
    const mockPredictions = Array(24).fill(0).map((_, i) => ({
      hour: i,
      risk: Math.random() * (i % 12 === 0 ? 0.9 : i % 6 === 0 ? 0.6 : 0.3),
      confidence: 0.7 + (Math.random() * 0.3),
      likelyIssueType: i % 12 === 0 ? 'regular_outage' : 
                       i % 6 === 0 ? 'congestion' : 
                       i % 3 === 0 ? 'poor_signal' : null
    }));
    
    // Mock user profiles
    const mockUserProfiles = [
      { userId: 'user1', issueFrequency: 0.12, averageQuality: 0.85, locationCount: 3 },
      { userId: 'user2', issueFrequency: 0.05, averageQuality: 0.92, locationCount: 2 },
      { userId: 'user3', issueFrequency: 0.23, averageQuality: 0.76, locationCount: 5 },
      { userId: 'user4', issueFrequency: 0.08, averageQuality: 0.88, locationCount: 1 }
    ];
    
    // Mock recurring patterns
    const mockPatterns = [
      { type: 'daily', hour: 8, confidence: 0.85, description: 'Connection issues frequently occur at 8:00' },
      { type: 'daily', hour: 18, confidence: 0.78, description: 'Connection issues frequently occur at 18:00' },
      { type: 'weekly', dayOfWeek: 1, confidence: 0.82, description: 'Connection issues frequently occur on Monday' },
      { type: 'location', location: 'Hospital Wing B', confidence: 0.91, description: 'Connection issues frequently occur at Hospital Wing B' }
    ];
    
    // Mock quality trends
    const mockQualityTrends = Array(24).fill(0).map((_, i) => ({
      hour: i,
      quality: 0.5 + (Math.sin(i / 3) * 0.3),
      latency: 100 + (Math.cos(i / 2) * 50),
      packetLoss: Math.max(0, Math.sin(i) * 0.05)
    }));
    
    // Mock issue types
    const mockIssueTypes = [
      { type: 'poor_signal', count: 45, percentage: 32 },
      { type: 'congestion', count: 38, percentage: 27 },
      { type: 'regular_outage', count: 22, percentage: 16 },
      { type: 'intermittent', count: 18, percentage: 13 },
      { type: 'bandwidth_limit', count: 12, percentage: 9 },
      { type: 'dns_issue', count: 5, percentage: 3 }
    ];
    
    // Update state with mock data
    setConnectionData({
      loading: false,
      error: null,
      stats: mockStats,
      predictions: mockPredictions,
      userProfiles: mockUserProfiles,
      recurringPatterns: mockPatterns,
      qualityTrends: mockQualityTrends,
      issueTypes: mockIssueTypes
    });
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  // Get risk level label
  const getRiskLevel = (risk) => {
    if (risk >= 0.7) return 'high';
    if (risk >= 0.4) return 'medium';
    if (risk >= 0.2) return 'low';
    return 'none';
  };
  
  // Get risk level badge
  const getRiskBadge = (risk) => {
    const level = getRiskLevel(risk);
    const variant = level === 'high' ? 'danger' : 
                   level === 'medium' ? 'warning' : 
                   level === 'low' ? 'success' : 'info';
    
    return <Badge bg={variant}>{level}</Badge>;
  };
  
  // Render loading state
  if (connectionData.loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading connection analytics data...</p>
      </div>
    );
  }
  
  // Render error state
  if (connectionData.error) {
    return (
      <Alert variant="danger" className="my-3">
        <Alert.Heading>Error Loading Data</Alert.Heading>
        <p>{connectionData.error}</p>
        <Button variant="outline-danger" onClick={() => setMockData()}>
          Load Sample Data
        </Button>
      </Alert>
    );
  }
  
  return (
    <div className="connection-analytics-dashboard">
      <h2 className="mb-4">Connection Analytics Dashboard</h2>
      
      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Time Range</Form.Label>
                <Form.Select 
                  name="timeRange" 
                  value={filters.timeRange}
                  onChange={handleFilterChange}
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>User Filter</Form.Label>
                <Form.Select 
                  name="userFilter" 
                  value={filters.userFilter}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Users</option>
                  {connectionData.userProfiles.map(profile => (
                    <option key={profile.userId} value={profile.userId}>
                      {profile.userId}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Location Filter</Form.Label>
                <Form.Select 
                  name="locationFilter" 
                  value={filters.locationFilter}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Locations</option>
                  {connectionData.recurringPatterns
                    .filter(pattern => pattern.type === 'location')
                    .map(pattern => (
                      <option key={pattern.location} value={pattern.location}>
                        {pattern.location}
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Risk Threshold</Form.Label>
                <Form.Select 
                  name="riskThreshold" 
                  value={filters.riskThreshold}
                  onChange={handleFilterChange}
                >
                  <option value="high">High Risk Only</option>
                  <option value="medium">Medium Risk & Above</option>
                  <option value="low">Low Risk & Above</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Summary Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Connection Success</Card.Title>
              <h3 className="text-primary">{connectionData.stats.connectionSuccessRate}%</h3>
              <p className="text-muted">Total: {connectionData.stats.totalConnections}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Network Stability</Card.Title>
              <h3 className="text-success">{connectionData.stats.networkStabilityScore}/100</h3>
              <p className="text-muted">Disconnections: {connectionData.stats.disconnectionFrequency}/hr</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>ML Model Confidence</Card.Title>
              <h3 className="text-info">{(connectionData.stats.modelConfidence * 100).toFixed(1)}%</h3>
              <p className="text-muted">Patterns: {connectionData.stats.patternCount}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>User Profiles</Card.Title>
              <h3 className="text-warning">{connectionData.stats.userProfileCount}</h3>
              <p className="text-muted">With personalized predictions</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Connection Risk Prediction Chart */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card>
            <Card.Body>
              <Card.Title>Connection Risk Predictions (Next 24 Hours)</Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={connectionData.predictions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Risk Level', angle: -90, position: 'insideLeft' }} domain={[0, 1]} />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${(value * 100).toFixed(1)}%`, 
                      name === 'risk' ? 'Risk Level' : 'Confidence'
                    ]}
                    labelFormatter={(hour) => `Hour: ${hour}:00`}
                  />
                  <Legend />
                  <Bar dataKey="risk" name="Risk Level">
                    {connectionData.predictions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[getRiskLevel(entry.risk)]} />
                    ))}
                  </Bar>
                  <Bar dataKey="confidence" name="Prediction Confidence" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Connection Quality Trends and Issue Types */}
      <Row className="mb-4">
        <Col lg={8}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Connection Quality Trends</Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={connectionData.qualityTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis yAxisId="left" domain={[0, 1]} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 0.1]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="quality" 
                    stroke="#0088FE" 
                    name="Connection Quality" 
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="packetLoss" 
                    stroke="#FF8042" 
                    name="Packet Loss" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Connection Issue Types</Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={connectionData.issueTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="percentage"
                    nameKey="type"
                  >
                    {connectionData.issueTypes.map((entry, index) => (
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
      
      {/* Recurring Patterns and User Profiles */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Recurring Connection Patterns</Card.Title>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Pattern Type</th>
                    <th>Description</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {connectionData.recurringPatterns.map((pattern, index) => (
                    <tr key={index}>
                      <td>
                        <Badge bg={
                          pattern.type === 'daily' ? 'primary' :
                          pattern.type === 'weekly' ? 'success' :
                          pattern.type === 'location' ? 'warning' : 'info'
                        }>
                          {pattern.type}
                        </Badge>
                      </td>
                      <td>{pattern.description}</td>
                      <td>{(pattern.confidence * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>User Connection Profiles</Card.Title>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Issue Frequency</th>
                    <th>Avg. Quality</th>
                    <th>Locations</th>
                  </tr>
                </thead>
                <tbody>
                  {connectionData.userProfiles.map((profile, index) => (
                    <tr key={index}>
                      <td>{profile.userId}</td>
                      <td>
                        {getRiskBadge(profile.issueFrequency)} {(profile.issueFrequency * 100).toFixed(1)}%
                      </td>
                      <td>{(profile.averageQuality * 100).toFixed(1)}%</td>
                      <td>{profile.locationCount}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ConnectionAnalyticsDashboard;
