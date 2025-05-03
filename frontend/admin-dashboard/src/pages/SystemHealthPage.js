import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Row, Col, Button } from 'react-bootstrap';
import MonitoringDashboard from '../components/MonitoringDashboard';

const SystemHealthPage = () => {
  return (
    <div>
      <h1 className="mb-4">System Health & Monitoring</h1>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Connection Analytics</Card.Title>
              <Card.Text>
                View detailed analytics about network connections and ML-based predictions of connection issues.
              </Card.Text>
              <Button as={Link} to="/connection-analytics" variant="primary">
                View Connection Analytics
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>System Monitoring</Card.Title>
              <Card.Text>
                Monitor system performance, resource usage, and health metrics.
              </Card.Text>
              <Button as={Link} to="/monitoring" variant="primary">
                View Monitoring Dashboard
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Recovery Manager</Card.Title>
              <Card.Text>
                Manage automated recovery mechanisms for network connection issues.
              </Card.Text>
              <Button as={Link} to="/recovery-manager" variant="primary">
                View Recovery Manager
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Edge Device Status</Card.Title>
              <Card.Text>
                Check the status and performance of edge devices in the network.
              </Card.Text>
              <Button variant="primary" disabled>
                Coming Soon
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <MonitoringDashboard />
    </div>
  );
};

export default SystemHealthPage;
