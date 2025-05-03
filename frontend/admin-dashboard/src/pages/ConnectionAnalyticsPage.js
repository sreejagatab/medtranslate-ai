import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import ConnectionAnalyticsDashboard from '../components/ConnectionAnalyticsDashboard';

/**
 * ConnectionAnalyticsPage component for displaying the connection analytics dashboard
 */
const ConnectionAnalyticsPage = () => {
  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title as="h2">Connection Analytics</Card.Title>
              <Card.Text>
                Advanced analytics for network connections and ML-based prediction of connection issues.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <ConnectionAnalyticsDashboard />
        </Col>
      </Row>
    </Container>
  );
};

export default ConnectionAnalyticsPage;
