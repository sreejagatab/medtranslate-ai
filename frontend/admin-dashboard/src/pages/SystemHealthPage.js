import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Alert } from 'react-bootstrap';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const SystemHealthPage = () => {
  const [systemStatus, setSystemStatus] = useState({
    backend: { status: 'healthy', uptime: '99.98%', lastChecked: '2 minutes ago' },
    database: { status: 'healthy', uptime: '99.99%', lastChecked: '2 minutes ago' },
    websocket: { status: 'healthy', uptime: '99.95%', lastChecked: '2 minutes ago' },
    storage: { status: 'healthy', uptime: '100%', lastChecked: '2 minutes ago' },
    edge: { status: 'warning', uptime: '98.5%', lastChecked: '2 minutes ago' }
  });
  
  const [edgeDevices, setEdgeDevices] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch system health data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, you would fetch data from the API
        // For now, we'll use mock data
        setTimeout(() => {
          // Mock edge devices
          setEdgeDevices([
            { id: 'edge-001', name: 'Hospital A Edge Device', status: 'online', lastSeen: '1 minute ago', version: '1.2.3' },
            { id: 'edge-002', name: 'Hospital B Edge Device', status: 'online', lastSeen: '5 minutes ago', version: '1.2.3' },
            { id: 'edge-003', name: 'Clinic C Edge Device', status: 'offline', lastSeen: '2 hours ago', version: '1.2.2' },
            { id: 'edge-004', name: 'Hospital D Edge Device', status: 'online', lastSeen: '3 minutes ago', version: '1.2.3' },
            { id: 'edge-005', name: 'Clinic E Edge Device', status: 'online', lastSeen: '10 minutes ago', version: '1.2.1' },
            { id: 'edge-006', name: 'Hospital F Edge Device', status: 'maintenance', lastSeen: '1 day ago', version: '1.2.0' }
          ]);
          
          // Mock performance data
          const mockData = [];
          const now = new Date();
          for (let i = 0; i < 24; i++) {
            const time = new Date(now);
            time.setHours(now.getHours() - 23 + i);
            
            mockData.push({
              time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              cpu: Math.floor(Math.random() * 30) + 20,
              memory: Math.floor(Math.random() * 40) + 30,
              requests: Math.floor(Math.random() * 100) + 50
            });
          }
          setPerformanceData(mockData);
          
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching system health data:', error);
        setError('Failed to load system health data');
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Set up polling
    const interval = setInterval(() => {
      fetchData();
    }, 60000); // Poll every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true);
    // In a real app, you would fetch fresh data here
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };
  
  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'success';
      case 'warning':
      case 'maintenance':
        return 'warning';
      case 'error':
      case 'offline':
        return 'danger';
      default:
        return 'secondary';
    }
  };
  
  if (isLoading) {
    return <div>Loading system health data...</div>;
  }
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>System Health</h1>
        <Button variant="outline-primary" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>System Status</Card.Title>
              <Table className="mt-3">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Status</th>
                    <th>Uptime</th>
                    <th>Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(systemStatus).map(([component, data]) => (
                    <tr key={component}>
                      <td>{component.charAt(0).toUpperCase() + component.slice(1)}</td>
                      <td>
                        <Badge bg={getStatusVariant(data.status)}>
                          {data.status}
                        </Badge>
                      </td>
                      <td>{data.uptime}</td>
                      <td>{data.lastChecked}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Performance Metrics</Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cpu" stroke="#8884d8" name="CPU Usage (%)" />
                  <Line type="monotone" dataKey="memory" stroke="#82ca9d" name="Memory Usage (%)" />
                  <Line type="monotone" dataKey="requests" stroke="#ffc658" name="Requests/min" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Edge Devices</Card.Title>
              <Table className="mt-3">
                <thead>
                  <tr>
                    <th>Device ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                    <th>Version</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {edgeDevices.map(device => (
                    <tr key={device.id}>
                      <td>{device.id}</td>
                      <td>{device.name}</td>
                      <td>
                        <Badge bg={getStatusVariant(device.status)}>
                          {device.status}
                        </Badge>
                      </td>
                      <td>{device.lastSeen}</td>
                      <td>{device.version}</td>
                      <td>
                        <Button variant="outline-primary" size="sm" className="me-2">
                          Details
                        </Button>
                        {device.status === 'offline' && (
                          <Button variant="outline-warning" size="sm">
                            Ping
                          </Button>
                        )}
                      </td>
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

export default SystemHealthPage;
