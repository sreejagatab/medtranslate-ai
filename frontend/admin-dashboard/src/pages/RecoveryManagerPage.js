import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import RecoveryManagerDashboard from '../components/RecoveryManagerDashboard';

/**
 * RecoveryManagerPage component for displaying the automated recovery manager dashboard
 */
const RecoveryManagerPage = () => {
  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title as="h2">Automated Recovery Manager</Card.Title>
              <Card.Text>
                Advanced recovery mechanisms for network connection issues based on ML-detected patterns.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <RecoveryManagerDashboard />
        </Col>
      </Row>
    </Container>
  );
};

export default RecoveryManagerPage;
