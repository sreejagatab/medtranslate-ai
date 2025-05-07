/**
 * SystemStatus Page for MedTranslate AI Provider App
 *
 * This page displays the EnhancedSystemStatusDashboard component,
 * providing a comprehensive view of system status and performance with
 * improved visualization and real-time monitoring capabilities.
 */

import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Breadcrumbs, Link, Tabs, Tab } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { SystemStatusDashboard, EnhancedSystemStatusDashboard } from '../../../shared/components';
import { useAuth } from '../contexts/AuthContext';

/**
 * SystemStatus page component
 *
 * @returns {JSX.Element} SystemStatus page component
 */
const SystemStatus = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/dashboard" color="inherit">
            Dashboard
          </Link>
          <Typography color="textPrimary">System Status</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            System Status
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Monitor the health and performance of the MedTranslate AI system with enhanced real-time analytics.
          </Typography>
        </Paper>

        {/* Dashboard Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Enhanced Dashboard" />
            <Tab label="Standard Dashboard" />
          </Tabs>
        </Paper>

        {/* Dashboard Content */}
        {activeTab === 0 ? (
          <EnhancedSystemStatusDashboard />
        ) : (
          <SystemStatusDashboard refreshInterval={60000} />
        )}
      </Box>
    </Container>
  );
};

export default SystemStatus;
