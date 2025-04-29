/**
 * ApiStatusBar Component for MedTranslate AI Admin Dashboard
 * 
 * This component displays the status of all system components in a horizontal bar.
 * It's designed to be used in the header or footer of the admin dashboard.
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { ApiStatus } from '../../../shared';
import { API_ENDPOINTS } from '../config/api';

const ApiStatusBar = () => {
  const [endpoints] = useState([
    { 
      url: API_ENDPOINTS.SYSTEM.HEALTH, 
      name: 'Backend API',
      label: 'Backend'
    },
    { 
      url: `${API_ENDPOINTS.SYSTEM.HEALTH}?component=database`, 
      name: 'Database',
      label: 'Database'
    },
    { 
      url: `${API_ENDPOINTS.SYSTEM.HEALTH}?component=websocket`, 
      name: 'WebSocket',
      label: 'WebSocket'
    },
    { 
      url: `${API_ENDPOINTS.SYSTEM.HEALTH}?component=edge`, 
      name: 'Edge Devices',
      label: 'Edge'
    },
    { 
      url: `${API_ENDPOINTS.SYSTEM.HEALTH}?component=translation`, 
      name: 'Translation Service',
      label: 'Translation'
    }
  ]);

  // Custom styles for Bootstrap integration
  const customStyles = {
    container: {
      padding: '8px 12px',
      margin: '0',
      borderRadius: '4px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
    },
    indicator: {
      width: '10px',
      height: '10px',
    },
    text: {
      fontSize: '14px',
      fontWeight: '500',
    }
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title className="mb-3">System Status</Card.Title>
        <Row>
          {endpoints.map((endpoint) => (
            <Col key={endpoint.name} xs={6} md={4} lg={2} className="mb-2">
              <ApiStatus
                endpoint={endpoint.url}
                label={endpoint.label}
                refreshInterval={30000}
                style={customStyles}
                showResponseTime={true}
              />
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ApiStatusBar;
