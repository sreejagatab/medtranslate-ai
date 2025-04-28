import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Form, 
  Spinner,
  Tabs,
  Tab,
  Alert
} from 'react-bootstrap';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'https://api.medtranslate.ai';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsDashboard = () => {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // 7 days ago
  const [endDate, setEndDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [component, setComponent] = useState('all');
  
  // Analytics data
  const [translationData, setTranslationData] = useState([]);
  const [sessionData, setSessionData] = useState([]);
  const [errorData, setErrorData] = useState([]);
  const [performanceData, setPerformanceData] = useState({
    responseTime: [],
    errors: [],
    successRate: []
  });
  
  // Fetch data on component mount and when date range changes
  useEffect(() => {
    fetchData();
  }, [startDate, endDate, component]);
  
  // Fetch analytics data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch translation data
      const translationResponse = await fetch(`${API_URL}/admin/analytics/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          eventType: 'translation',
          groupBy: 'source_language'
        })
      });
      
      if (!translationResponse.ok) {
        throw new Error('Failed to fetch translation data');
      }
      
      const translationResult = await translationResponse.json();
      setTranslationData(translationResult.data);
      
      // Fetch session data
      const sessionResponse = await fetch(`${API_URL}/admin/analytics/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          eventType: 'session_create',
          groupBy: 'medical_context'
        })
      });
      
      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch session data');
      }
      
      const sessionResult = await sessionResponse.json();
      setSessionData(sessionResult.data);
      
      // Fetch error data
      const errorResponse = await fetch(`${API_URL}/admin/analytics/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          eventType: 'error',
          groupBy: 'error_type'
        })
      });
      
      if (!errorResponse.ok) {
        throw new Error('Failed to fetch error data');
      }
      
      const errorResult = await errorResponse.json();
      setErrorData(errorResult.data);
      
      // Fetch performance data
      const performanceResponse = await fetch(`${API_URL}/admin/analytics/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          component: component === 'all' ? null : component
        })
      });
      
      if (!performanceResponse.ok) {
        throw new Error('Failed to fetch performance data');
      }
      
      const performanceResult = await performanceResponse.json();
      setPerformanceData(performanceResult);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process translation data for charts
  const processTranslationData = () => {
    if (!translationData || Object.keys(translationData).length === 0) {
      return [];
    }
    
    return Object.keys(translationData).map(language => ({
      name: language,
      count: translationData[language].length,
      successRate: calculateSuccessRate(translationData[language]),
      avgProcessingTime: calculateAvgProcessingTime(translationData[language])
    }));
  };
  
  // Calculate success rate for translations
  const calculateSuccessRate = (items) => {
    if (!items || items.length === 0) return 0;
    
    const successCount = items.filter(item => item.success).length;
    return (successCount / items.length) * 100;
  };
  
  // Calculate average processing time for translations
  const calculateAvgProcessingTime = (items) => {
    if (!items || items.length === 0) return 0;
    
    const totalTime = items.reduce((sum, item) => sum + (item.processing_time || 0), 0);
    return totalTime / items.length;
  };
  
  // Process session data for charts
  const processSessionData = () => {
    if (!sessionData || Object.keys(sessionData).length === 0) {
      return [];
    }
    
    return Object.keys(sessionData).map(context => ({
      name: context,
      count: sessionData[context].length
    }));
  };
  
  // Process error data for charts
  const processErrorData = () => {
    if (!errorData || Object.keys(errorData).length === 0) {
      return [];
    }
    
    return Object.keys(errorData).map(errorType => ({
      name: errorType,
      count: errorData[errorType].length
    }));
  };
  
  // Process performance data for charts
  const processPerformanceData = () => {
    if (!performanceData || !performanceData.responseTime) {
      return {
        responseTime: [],
        errors: [],
        successRate: []
      };
    }
    
    // Format response time data
    const responseTimeData = performanceData.responseTime.map(point => ({
      time: new Date(point.Timestamp).toLocaleString(),
      avg: point.Average,
      max: point.Maximum,
      min: point.Minimum
    }));
    
    // Format error data
    const errorData = performanceData.errors.map(point => ({
      time: new Date(point.Timestamp).toLocaleString(),
      count: point.Sum
    }));
    
    // Format success rate data
    const successRateData = performanceData.successRate.map(point => ({
      time: new Date(point.Timestamp).toLocaleString(),
      rate: point.Average
    }));
    
    return {
      responseTime: responseTimeData,
      errors: errorData,
      successRate: successRateData
    };
  };
  
  // Render loading spinner
  if (isLoading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading analytics data...</p>
        </div>
      </Container>
    );
  }
  
  // Process data for charts
  const translationChartData = processTranslationData();
  const sessionChartData = processSessionData();
  const errorChartData = processErrorData();
  const performanceChartData = processPerformanceData();
  
  return (
    <Container fluid className="mt-4">
      <h1 className="mb-4">Analytics Dashboard</h1>
      
      {error && (
        <Alert variant="danger">
          Error: {error}
        </Alert>
      )}
      
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Start Date</Form.Label>
                <DatePicker
                  selected={startDate}
                  onChange={date => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  className="form-control"
                  dateFormat="yyyy-MM-dd"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>End Date</Form.Label>
                <DatePicker
                  selected={endDate}
                  onChange={date => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  className="form-control"
                  dateFormat="yyyy-MM-dd"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Component</Form.Label>
                <Form.Select
                  value={component}
                  onChange={e => setComponent(e.target.value)}
                >
                  <option value="all">All Components</option>
                  <option value="backend">Backend</option>
                  <option value="edge">Edge Device</option>
                  <option value="provider-app">Provider App</option>
                  <option value="patient-app">Patient App</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Button variant="primary" onClick={fetchData}>
            Update
          </Button>
        </Card.Body>
      </Card>
      
      <Tabs
        activeKey={activeTab}
        onSelect={k => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="overview" title="Overview">
          <Row>
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Total Translations</Card.Title>
                  <h2 className="mt-3 mb-0">
                    {translationChartData.reduce((sum, item) => sum + item.count, 0)}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Total Sessions</Card.Title>
                  <h2 className="mt-3 mb-0">
                    {sessionChartData.reduce((sum, item) => sum + item.count, 0)}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Success Rate</Card.Title>
                  <h2 className="mt-3 mb-0">
                    {translationChartData.length > 0 
                      ? `${(translationChartData.reduce((sum, item) => sum + item.successRate, 0) / translationChartData.length).toFixed(1)}%` 
                      : 'N/A'}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Total Errors</Card.Title>
                  <h2 className="mt-3 mb-0">
                    {errorChartData.reduce((sum, item) => sum + item.count, 0)}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Translations by Language</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={translationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#0088FE" name="Translations" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Sessions by Medical Context</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sessionChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {sessionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="translations" title="Translations">
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Translation Success Rate by Language</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={translationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="successRate" fill="#00C49F" name="Success Rate (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Average Processing Time by Language</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={translationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgProcessingTime" fill="#FFBB28" name="Avg. Processing Time (ms)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="performance" title="Performance">
          <Row>
            <Col lg={12} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Response Time</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceChartData.responseTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avg" stroke="#0088FE" name="Average (ms)" />
                      <Line type="monotone" dataKey="max" stroke="#FF8042" name="Maximum (ms)" />
                      <Line type="monotone" dataKey="min" stroke="#00C49F" name="Minimum (ms)" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Error Count</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceChartData.errors}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#FF8042" name="Errors" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Success Rate</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceChartData.successRate}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="rate" stroke="#00C49F" name="Success Rate (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="errors" title="Errors">
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Errors by Type</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={errorChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#FF8042" name="Error Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Error Distribution</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={errorChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {errorChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AnalyticsDashboard;
