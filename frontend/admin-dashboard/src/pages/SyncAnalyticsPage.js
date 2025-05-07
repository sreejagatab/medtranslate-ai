import React from 'react';
import { Container, Row, Col, Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import SyncAnalyticsDashboard from '../components/SyncAnalyticsDashboard';

/**
 * SyncAnalyticsPage Component
 * 
 * Page for displaying the sync analytics dashboard
 */
const SyncAnalyticsPage = () => {
  return (
    <Container fluid>
      <Row className="mb-3">
        <Col>
          <Breadcrumb>
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>Dashboard</Breadcrumb.Item>
            <Breadcrumb.Item active>Sync Analytics</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <SyncAnalyticsDashboard />
        </Col>
      </Row>
    </Container>
  );
};

export default SyncAnalyticsPage;
