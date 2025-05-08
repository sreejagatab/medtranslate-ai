/**
 * Unit tests for Admin Dashboard Components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components to test
import SyncAnalyticsDashboard from '../../frontend/admin-dashboard/src/components/SyncAnalyticsDashboard';
import SystemHealthDashboard from '../../frontend/admin-dashboard/src/components/SystemHealthDashboard';
import UserManagementPanel from '../../frontend/admin-dashboard/src/components/UserManagementPanel';
import ConfigurationPanel from '../../frontend/admin-dashboard/src/components/ConfigurationPanel';

// Mock hooks and services
jest.mock('../../frontend/admin-dashboard/src/hooks/useSyncAnalytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    syncStats: {
      totalSyncs: 1250,
      successfulSyncs: 1200,
      failedSyncs: 50,
      averageSyncTime: 2.3,
      syncsByDevice: [
        { deviceId: 'device-1', syncs: 500, success: 490, failed: 10 },
        { deviceId: 'device-2', syncs: 750, success: 710, failed: 40 }
      ],
      syncsByDay: [
        { date: '2023-01-01', syncs: 100, success: 95, failed: 5 },
        { date: '2023-01-02', syncs: 120, success: 115, failed: 5 },
        { date: '2023-01-03', syncs: 130, success: 125, failed: 5 }
      ]
    },
    isLoading: false,
    error: null,
    fetchSyncStats: jest.fn().mockResolvedValue(true),
    exportSyncStats: jest.fn().mockResolvedValue({ url: 'exports/sync-stats.csv' })
  }))
}));

jest.mock('../../frontend/admin-dashboard/src/hooks/useSystemHealth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    systemHealth: {
      backend: {
        status: 'healthy',
        uptime: 86400,
        version: '1.0.0',
        cpu: 25,
        memory: 40,
        storage: 60
      },
      edge: [
        {
          deviceId: 'device-1',
          status: 'healthy',
          uptime: 43200,
          version: '1.0.0',
          battery: 85,
          storage: 45,
          lastSeen: new Date().toISOString()
        },
        {
          deviceId: 'device-2',
          status: 'warning',
          uptime: 21600,
          version: '1.0.0',
          battery: 20,
          storage: 85,
          lastSeen: new Date().toISOString()
        }
      ],
      alerts: [
        { id: 'alert-1', level: 'warning', message: 'Edge device battery low', timestamp: new Date().toISOString() }
      ]
    },
    isLoading: false,
    error: null,
    fetchSystemHealth: jest.fn().mockResolvedValue(true),
    acknowledgeAlert: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('../../frontend/admin-dashboard/src/hooks/useUserManagement', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    users: [
      { id: 'user-1', email: 'provider@example.com', role: 'provider', status: 'active', lastLogin: new Date().toISOString() },
      { id: 'user-2', email: 'admin@example.com', role: 'admin', status: 'active', lastLogin: new Date().toISOString() }
    ],
    isLoading: false,
    error: null,
    fetchUsers: jest.fn().mockResolvedValue(true),
    createUser: jest.fn().mockResolvedValue({ id: 'new-user', email: 'new@example.com' }),
    updateUser: jest.fn().mockResolvedValue(true),
    deactivateUser: jest.fn().mockResolvedValue(true),
    resetPassword: jest.fn().mockResolvedValue({ temporaryPassword: 'temp123' })
  }))
}));

jest.mock('../../frontend/admin-dashboard/src/hooks/useConfiguration', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    config: {
      general: {
        systemName: 'MedTranslate AI',
        defaultLanguage: 'en'
      },
      security: {
        sessionTimeout: 30,
        mfaRequired: true,
        passwordPolicy: {
          minLength: 8,
          requireSpecialChars: true,
          requireNumbers: true
        }
      },
      translation: {
        defaultModel: 'advanced',
        confidenceThreshold: 0.8,
        fallbackEnabled: true
      },
      edge: {
        syncInterval: 15,
        offlineMode: 'enabled',
        cacheSize: 500
      }
    },
    isLoading: false,
    error: null,
    fetchConfig: jest.fn().mockResolvedValue(true),
    updateConfig: jest.fn().mockResolvedValue(true),
    resetConfig: jest.fn().mockResolvedValue(true)
  }))
}));

describe('Admin Dashboard Components', () => {
  describe('SyncAnalyticsDashboard', () => {
    it('should render sync statistics', () => {
      render(<SyncAnalyticsDashboard />);
      
      // Check that sync statistics are displayed
      expect(screen.getByText(/Sync Analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Syncs: 1,250/i)).toBeInTheDocument();
      expect(screen.getByText(/Successful: 1,200/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed: 50/i)).toBeInTheDocument();
      expect(screen.getByText(/Average Sync Time: 2.3s/i)).toBeInTheDocument();
    });

    it('should display sync statistics by device', () => {
      render(<SyncAnalyticsDashboard />);
      
      // Check that device statistics are displayed
      expect(screen.getByText(/Syncs by Device/i)).toBeInTheDocument();
      expect(screen.getByText(/device-1/i)).toBeInTheDocument();
      expect(screen.getByText(/device-2/i)).toBeInTheDocument();
      expect(screen.getByText(/500/i)).toBeInTheDocument();
      expect(screen.getByText(/750/i)).toBeInTheDocument();
    });

    it('should display sync statistics by day', () => {
      render(<SyncAnalyticsDashboard />);
      
      // Check that daily statistics are displayed
      expect(screen.getByText(/Syncs by Day/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 1, 2023/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 2, 2023/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 3, 2023/i)).toBeInTheDocument();
    });

    it('should export sync statistics when export button is clicked', async () => {
      const { getByRole } = render(<SyncAnalyticsDashboard />);
      
      // Find and click export button
      const exportButton = getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);
      
      // Verify export function was called
      const useSyncAnalytics = require('../../frontend/admin-dashboard/src/hooks/useSyncAnalytics').default;
      expect(useSyncAnalytics().exportSyncStats).toHaveBeenCalled();
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Export successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('SystemHealthDashboard', () => {
    it('should render system health information', () => {
      render(<SystemHealthDashboard />);
      
      // Check that system health information is displayed
      expect(screen.getByText(/System Health/i)).toBeInTheDocument();
      expect(screen.getByText(/Backend Status/i)).toBeInTheDocument();
      expect(screen.getByText(/healthy/i)).toBeInTheDocument();
      expect(screen.getByText(/Uptime: 24h/i)).toBeInTheDocument();
      expect(screen.getByText(/CPU: 25%/i)).toBeInTheDocument();
      expect(screen.getByText(/Memory: 40%/i)).toBeInTheDocument();
      expect(screen.getByText(/Storage: 60%/i)).toBeInTheDocument();
    });

    it('should display edge device health', () => {
      render(<SystemHealthDashboard />);
      
      // Check that edge device health is displayed
      expect(screen.getByText(/Edge Devices/i)).toBeInTheDocument();
      expect(screen.getByText(/device-1/i)).toBeInTheDocument();
      expect(screen.getByText(/device-2/i)).toBeInTheDocument();
      expect(screen.getByText(/Battery: 85%/i)).toBeInTheDocument();
      expect(screen.getByText(/Battery: 20%/i)).toBeInTheDocument();
      expect(screen.getByText(/Storage: 45%/i)).toBeInTheDocument();
      expect(screen.getByText(/Storage: 85%/i)).toBeInTheDocument();
    });

    it('should display system alerts', () => {
      render(<SystemHealthDashboard />);
      
      // Check that alerts are displayed
      expect(screen.getByText(/Alerts/i)).toBeInTheDocument();
      expect(screen.getByText(/Edge device battery low/i)).toBeInTheDocument();
    });

    it('should acknowledge an alert when acknowledge button is clicked', async () => {
      const { getByRole } = render(<SystemHealthDashboard />);
      
      // Find and click acknowledge button
      const acknowledgeButton = getByRole('button', { name: /acknowledge/i });
      fireEvent.click(acknowledgeButton);
      
      // Verify acknowledge function was called
      const useSystemHealth = require('../../frontend/admin-dashboard/src/hooks/useSystemHealth').default;
      expect(useSystemHealth().acknowledgeAlert).toHaveBeenCalledWith('alert-1');
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Alert acknowledged/i)).toBeInTheDocument();
      });
    });
  });

  describe('UserManagementPanel', () => {
    it('should render user list', () => {
      render(<UserManagementPanel />);
      
      // Check that user list is displayed
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
      expect(screen.getByText(/provider@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/admin@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/provider/i)).toBeInTheDocument();
      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it('should create a new user when create button is clicked', async () => {
      const { getByRole, getByLabelText } = render(<UserManagementPanel />);
      
      // Find and click create button
      const createButton = getByRole('button', { name: /create user/i });
      fireEvent.click(createButton);
      
      // Fill out form
      fireEvent.change(getByLabelText(/email/i), { target: { value: 'new@example.com' } });
      fireEvent.change(getByLabelText(/role/i), { target: { value: 'provider' } });
      
      // Submit form
      const submitButton = getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);
      
      // Verify create function was called
      const useUserManagement = require('../../frontend/admin-dashboard/src/hooks/useUserManagement').default;
      expect(useUserManagement().createUser).toHaveBeenCalledWith({
        email: 'new@example.com',
        role: 'provider'
      });
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/User created successfully/i)).toBeInTheDocument();
      });
    });

    it('should deactivate a user when deactivate button is clicked', async () => {
      const { getAllByRole } = render(<UserManagementPanel />);
      
      // Find and click deactivate button
      const deactivateButtons = getAllByRole('button', { name: /deactivate/i });
      fireEvent.click(deactivateButtons[0]);
      
      // Confirm deactivation
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);
      
      // Verify deactivate function was called
      const useUserManagement = require('../../frontend/admin-dashboard/src/hooks/useUserManagement').default;
      expect(useUserManagement().deactivateUser).toHaveBeenCalledWith('user-1');
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/User deactivated/i)).toBeInTheDocument();
      });
    });

    it('should reset a user password when reset button is clicked', async () => {
      const { getAllByRole } = render(<UserManagementPanel />);
      
      // Find and click reset password button
      const resetButtons = getAllByRole('button', { name: /reset password/i });
      fireEvent.click(resetButtons[0]);
      
      // Confirm reset
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);
      
      // Verify reset function was called
      const useUserManagement = require('../../frontend/admin-dashboard/src/hooks/useUserManagement').default;
      expect(useUserManagement().resetPassword).toHaveBeenCalledWith('user-1');
      
      // Wait for success message and temporary password
      await waitFor(() => {
        expect(screen.getByText(/Password reset successful/i)).toBeInTheDocument();
        expect(screen.getByText(/Temporary password: temp123/i)).toBeInTheDocument();
      });
    });
  });

  describe('ConfigurationPanel', () => {
    it('should render configuration settings', () => {
      render(<ConfigurationPanel />);
      
      // Check that configuration settings are displayed
      expect(screen.getByText(/System Configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/General Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Security Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Translation Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Edge Settings/i)).toBeInTheDocument();
    });

    it('should update configuration when save button is clicked', async () => {
      const { getByRole, getByLabelText } = render(<ConfigurationPanel />);
      
      // Change a setting
      fireEvent.change(getByLabelText(/System Name/i), { target: { value: 'New System Name' } });
      
      // Save changes
      const saveButton = getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
      
      // Verify update function was called
      const useConfiguration = require('../../frontend/admin-dashboard/src/hooks/useConfiguration').default;
      expect(useConfiguration().updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          general: expect.objectContaining({
            systemName: 'New System Name'
          })
        })
      );
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Configuration saved/i)).toBeInTheDocument();
      });
    });

    it('should reset configuration when reset button is clicked', async () => {
      const { getByRole } = render(<ConfigurationPanel />);
      
      // Find and click reset button
      const resetButton = getByRole('button', { name: /reset to defaults/i });
      fireEvent.click(resetButton);
      
      // Confirm reset
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);
      
      // Verify reset function was called
      const useConfiguration = require('../../frontend/admin-dashboard/src/hooks/useConfiguration').default;
      expect(useConfiguration().resetConfig).toHaveBeenCalled();
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Configuration reset to defaults/i)).toBeInTheDocument();
      });
    });
  });
});
