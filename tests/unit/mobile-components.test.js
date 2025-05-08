/**
 * Unit tests for Mobile App Components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components to test
import MobileSystemStatusDashboard from '../../mobile/patient-app/src/components/MobileSystemStatusDashboard';
import OfflineCapabilities from '../../mobile/patient-app/src/components/OfflineCapabilities';
import PushNotifications from '../../mobile/patient-app/src/components/PushNotifications';
import SecurityFeatures from '../../mobile/patient-app/src/components/SecurityFeatures';
import EdgeDeviceDiscovery from '../../mobile/patient-app/src/components/EdgeDeviceDiscovery';
import TranslationStatusIndicator from '../../mobile/patient-app/src/components/TranslationStatusIndicator';

// Mock hooks and services
jest.mock('../../mobile/patient-app/src/hooks/useSystemStatus', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isOnline: true,
    backendStatus: 'connected',
    edgeStatus: 'connected',
    lastSyncTime: new Date().toISOString(),
    syncStatus: 'success',
    batteryLevel: 85,
    networkType: 'wifi',
    refreshStatus: jest.fn()
  }))
}));

jest.mock('../../mobile/patient-app/src/hooks/useEdgeConnection', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isConnected: true,
    deviceId: 'edge-device-123',
    deviceName: 'Edge Device',
    connectionStatus: 'connected',
    connectToDevice: jest.fn(),
    disconnectFromDevice: jest.fn(),
    scanForDevices: jest.fn().mockResolvedValue([
      { id: 'edge-device-123', name: 'Edge Device', status: 'available' },
      { id: 'edge-device-456', name: 'Another Device', status: 'available' }
    ])
  }))
}));

jest.mock('../../mobile/patient-app/src/hooks/useTranslation', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    translationStatus: 'idle',
    lastTranslation: null,
    translationSource: null,
    confidence: null,
    isTranslating: false,
    translate: jest.fn().mockResolvedValue({
      originalText: 'Hello',
      translatedText: 'Hola',
      confidence: 0.95,
      source: 'local'
    })
  }))
}));

jest.mock('../../mobile/patient-app/src/hooks/useOfflineQueue', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    queueSize: 5,
    queueStatus: 'pending',
    lastSyncTime: new Date().toISOString(),
    syncQueue: jest.fn(),
    clearQueue: jest.fn()
  }))
}));

jest.mock('../../mobile/patient-app/src/services/notifications', () => ({
  requestPermission: jest.fn().mockResolvedValue(true),
  registerDevice: jest.fn().mockResolvedValue({ success: true, deviceId: 'device-123' }),
  unregisterDevice: jest.fn().mockResolvedValue({ success: true }),
  getNotificationHistory: jest.fn().mockResolvedValue([
    { id: 'notif-1', title: 'Test Notification', body: 'This is a test', timestamp: new Date().toISOString() }
  ])
}));

describe('Mobile App Components', () => {
  describe('MobileSystemStatusDashboard', () => {
    it('should render system status information', () => {
      render(<MobileSystemStatusDashboard />);
      
      // Check that status information is displayed
      expect(screen.getByText(/System Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
      expect(screen.getByText(/Backend: connected/i)).toBeInTheDocument();
      expect(screen.getByText(/Edge: connected/i)).toBeInTheDocument();
      expect(screen.getByText(/Battery: 85%/i)).toBeInTheDocument();
      expect(screen.getByText(/Network: wifi/i)).toBeInTheDocument();
    });

    it('should call refresh status when refresh button is clicked', () => {
      const { getByRole } = render(<MobileSystemStatusDashboard />);
      
      // Find and click refresh button
      const refreshButton = getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      
      // Verify refresh function was called
      const useSystemStatus = require('../../mobile/patient-app/src/hooks/useSystemStatus').default;
      expect(useSystemStatus().refreshStatus).toHaveBeenCalled();
    });
  });

  describe('OfflineCapabilities', () => {
    it('should render offline queue information', () => {
      render(<OfflineCapabilities />);
      
      // Check that offline queue information is displayed
      expect(screen.getByText(/Offline Queue/i)).toBeInTheDocument();
      expect(screen.getByText(/Queue Size: 5/i)).toBeInTheDocument();
      expect(screen.getByText(/Status: pending/i)).toBeInTheDocument();
    });

    it('should call sync queue when sync button is clicked', () => {
      const { getByRole } = render(<OfflineCapabilities />);
      
      // Find and click sync button
      const syncButton = getByRole('button', { name: /sync/i });
      fireEvent.click(syncButton);
      
      // Verify sync function was called
      const useOfflineQueue = require('../../mobile/patient-app/src/hooks/useOfflineQueue').default;
      expect(useOfflineQueue().syncQueue).toHaveBeenCalled();
    });

    it('should call clear queue when clear button is clicked', () => {
      const { getByRole } = render(<OfflineCapabilities />);
      
      // Find and click clear button
      const clearButton = getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);
      
      // Verify clear function was called
      const useOfflineQueue = require('../../mobile/patient-app/src/hooks/useOfflineQueue').default;
      expect(useOfflineQueue().clearQueue).toHaveBeenCalled();
    });
  });

  describe('PushNotifications', () => {
    it('should render notification settings', () => {
      render(<PushNotifications />);
      
      // Check that notification settings are displayed
      expect(screen.getByText(/Push Notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/Enable notifications/i)).toBeInTheDocument();
    });

    it('should request permission when enable button is clicked', async () => {
      const { getByRole } = render(<PushNotifications />);
      
      // Find and click enable button
      const enableButton = getByRole('button', { name: /enable/i });
      fireEvent.click(enableButton);
      
      // Verify request permission function was called
      const notificationService = require('../../mobile/patient-app/src/services/notifications');
      expect(notificationService.requestPermission).toHaveBeenCalled();
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Notifications enabled/i)).toBeInTheDocument();
      });
    });

    it('should display notification history', async () => {
      render(<PushNotifications showHistory={true} />);
      
      // Check that notification history is displayed
      expect(screen.getByText(/Notification History/i)).toBeInTheDocument();
      
      // Wait for notification history to load
      await waitFor(() => {
        expect(screen.getByText(/Test Notification/i)).toBeInTheDocument();
        expect(screen.getByText(/This is a test/i)).toBeInTheDocument();
      });
    });
  });

  describe('SecurityFeatures', () => {
    it('should render security settings', () => {
      render(<SecurityFeatures />);
      
      // Check that security settings are displayed
      expect(screen.getByText(/Security Features/i)).toBeInTheDocument();
      expect(screen.getByText(/Biometric Authentication/i)).toBeInTheDocument();
      expect(screen.getByText(/Data Encryption/i)).toBeInTheDocument();
    });

    it('should toggle biometric authentication when switch is clicked', () => {
      const { getByRole } = render(<SecurityFeatures />);
      
      // Find and click biometric switch
      const biometricSwitch = getByRole('switch', { name: /biometric/i });
      fireEvent.click(biometricSwitch);
      
      // Verify switch is toggled
      expect(biometricSwitch).toBeChecked();
    });

    it('should toggle data encryption when switch is clicked', () => {
      const { getByRole } = render(<SecurityFeatures />);
      
      // Find and click encryption switch
      const encryptionSwitch = getByRole('switch', { name: /encryption/i });
      fireEvent.click(encryptionSwitch);
      
      // Verify switch is toggled
      expect(encryptionSwitch).toBeChecked();
    });
  });

  describe('EdgeDeviceDiscovery', () => {
    it('should render device discovery interface', () => {
      render(<EdgeDeviceDiscovery />);
      
      // Check that device discovery interface is displayed
      expect(screen.getByText(/Edge Device Discovery/i)).toBeInTheDocument();
      expect(screen.getByText(/Scan for devices/i)).toBeInTheDocument();
    });

    it('should scan for devices when scan button is clicked', async () => {
      const { getByRole } = render(<EdgeDeviceDiscovery />);
      
      // Find and click scan button
      const scanButton = getByRole('button', { name: /scan/i });
      fireEvent.click(scanButton);
      
      // Verify scan function was called
      const useEdgeConnection = require('../../mobile/patient-app/src/hooks/useEdgeConnection').default;
      expect(useEdgeConnection().scanForDevices).toHaveBeenCalled();
      
      // Wait for devices to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Edge Device/i)).toBeInTheDocument();
        expect(screen.getByText(/Another Device/i)).toBeInTheDocument();
      });
    });

    it('should connect to a device when connect button is clicked', () => {
      render(<EdgeDeviceDiscovery />);
      
      // Find and click connect button (after scanning)
      const connectButton = screen.getByRole('button', { name: /connect/i });
      fireEvent.click(connectButton);
      
      // Verify connect function was called
      const useEdgeConnection = require('../../mobile/patient-app/src/hooks/useEdgeConnection').default;
      expect(useEdgeConnection().connectToDevice).toHaveBeenCalled();
    });
  });

  describe('TranslationStatusIndicator', () => {
    it('should render translation status', () => {
      render(<TranslationStatusIndicator />);
      
      // Check that translation status is displayed
      expect(screen.getByText(/Translation Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Status: idle/i)).toBeInTheDocument();
    });

    it('should display translation source when available', () => {
      // Mock translation hook with a source
      const useTranslation = require('../../mobile/patient-app/src/hooks/useTranslation').default;
      useTranslation.mockReturnValue({
        translationStatus: 'completed',
        lastTranslation: {
          originalText: 'Hello',
          translatedText: 'Hola'
        },
        translationSource: 'local',
        confidence: 0.95,
        isTranslating: false,
        translate: jest.fn()
      });
      
      render(<TranslationStatusIndicator />);
      
      // Check that translation source is displayed
      expect(screen.getByText(/Source: local/i)).toBeInTheDocument();
      expect(screen.getByText(/Confidence: 95%/i)).toBeInTheDocument();
    });

    it('should display loading state when translating', () => {
      // Mock translation hook with translating state
      const useTranslation = require('../../mobile/patient-app/src/hooks/useTranslation').default;
      useTranslation.mockReturnValue({
        translationStatus: 'translating',
        lastTranslation: null,
        translationSource: null,
        confidence: null,
        isTranslating: true,
        translate: jest.fn()
      });
      
      render(<TranslationStatusIndicator />);
      
      // Check that loading state is displayed
      expect(screen.getByText(/Status: translating/i)).toBeInTheDocument();
      expect(screen.getByText(/Translating.../i)).toBeInTheDocument();
    });
  });
});
