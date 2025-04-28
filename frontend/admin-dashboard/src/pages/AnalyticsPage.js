import React from 'react';
import { Container } from 'react-bootstrap';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

const AnalyticsPage = () => {
  return (
    <Container fluid>
      <h1 className="mb-4">Analytics</h1>
      <AnalyticsDashboard />
    </Container>
  );
};

export default AnalyticsPage;
