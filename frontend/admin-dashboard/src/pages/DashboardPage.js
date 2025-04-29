import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Alert } from 'react-bootstrap';
import ApiStatusBar from '../components/ApiStatusBar';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeUsers: 0,
    translationsToday: 0,
    successRate: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, you would fetch data from the API
        // For now, we'll use mock data
        setTimeout(() => {
          setStats({
            totalSessions: 1245,
            activeUsers: 87,
            translationsToday: 3456,
            successRate: 98.7
          });
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <div>Loading dashboard data...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      <h1 className="mb-4">Dashboard</h1>

      <Row>
        <Col md={3} className="mb-4">
          <Card className="card-dashboard h-100">
            <Card.Body>
              <Card.Title>Total Sessions</Card.Title>
              <h2 className="mt-3 mb-0">{stats.totalSessions}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="card-dashboard h-100">
            <Card.Body>
              <Card.Title>Active Users</Card.Title>
              <h2 className="mt-3 mb-0">{stats.activeUsers}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="card-dashboard h-100">
            <Card.Body>
              <Card.Title>Translations Today</Card.Title>
              <h2 className="mt-3 mb-0">{stats.translationsToday}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="card-dashboard h-100">
            <Card.Body>
              <Card.Title>Success Rate</Card.Title>
              <h2 className="mt-3 mb-0">{stats.successRate}%</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* API Status Bar */}
      <ApiStatusBar />

      <Row>
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Recent Activity</Card.Title>
              <Card.Text>
                This section will display recent activity from the system.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Translation Performance</Card.Title>
              <Card.Text>
                This section will display translation performance metrics.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
