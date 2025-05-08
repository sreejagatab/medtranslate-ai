/**
 * Unit tests for Mobile App Services
 */

import axios from 'axios';

// Import services to test
import ApiService from '../../mobile/patient-app/src/services/api';
import NotificationsService from '../../mobile/patient-app/src/services/notifications';
import EdgeService from '../../mobile/patient-app/src/services/edge';
import StorageService from '../../mobile/patient-app/src/services/storage';

// Mock axios
jest.mock('axios');

// Mock AsyncStorage
const AsyncStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn()
};

jest.mock('@react-native-async-storage/async-storage', () => AsyncStorageMock);

// Mock push notification permissions
jest.mock('react-native-permissions', () => ({
  request: jest.fn().mockResolvedValue('granted'),
  check: jest.fn().mockResolvedValue('granted'),
  PERMISSIONS: {
    IOS: {
      NOTIFICATIONS: 'ios.permission.NOTIFICATIONS'
    },
    ANDROID: {
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS'
    }
  }
}));

// Mock push notification token
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(config => {
    config.onRegister({ token: 'mock-device-token' });
  }),
  createChannel: jest.fn(),
  getChannels: jest.fn(callback => callback(['default'])),
  onRegister: jest.fn(),
  onNotification: jest.fn(),
  localNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  requestPermissions: jest.fn().mockResolvedValue(true)
}));

// Mock secure storage
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue({
    username: 'username',
    password: 'password'
  }),
  resetGenericPassword: jest.fn().mockResolvedValue(true)
}));

describe('Mobile App Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ApiService', () => {
    it('should make GET requests', async () => {
      // Mock axios response
      axios.get.mockResolvedValue({
        data: { success: true, data: 'test data' },
        status: 200
      });
      
      // Make request
      const response = await ApiService.get('/test');
      
      // Verify axios was called
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
      
      // Verify response
      expect(response).toEqual({ success: true, data: 'test data' });
    });

    it('should make POST requests', async () => {
      // Mock axios response
      axios.post.mockResolvedValue({
        data: { success: true, id: '123' },
        status: 201
      });
      
      // Make request
      const data = { name: 'Test' };
      const response = await ApiService.post('/test', data);
      
      // Verify axios was called
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        data,
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
      
      // Verify response
      expect(response).toEqual({ success: true, id: '123' });
    });

    it('should handle authentication tokens', async () => {
      // Set token
      ApiService.setToken('test-token');
      
      // Mock axios response
      axios.get.mockResolvedValue({
        data: { success: true },
        status: 200
      });
      
      // Make authenticated request
      await ApiService.get('/auth-test');
      
      // Verify token was included in headers
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should handle errors', async () => {
      // Mock axios error
      const error = {
        response: {
          data: { error: 'Not found' },
          status: 404
        }
      };
      axios.get.mockRejectedValue(error);
      
      // Make request and expect it to throw
      await expect(ApiService.get('/not-found')).rejects.toEqual(
        expect.objectContaining({
          status: 404,
          data: { error: 'Not found' }
        })
      );
    });
  });

  describe('NotificationsService', () => {
    it('should request notification permissions', async () => {
      // Request permissions
      const result = await NotificationsService.requestPermission();
      
      // Verify permissions were requested
      const Permissions = require('react-native-permissions');
      expect(Permissions.request).toHaveBeenCalled();
      
      // Verify result
      expect(result).toBe(true);
    });

    it('should register device for push notifications', async () => {
      // Mock API response
      axios.post.mockResolvedValue({
        data: { success: true, deviceId: 'device-123' }
      });
      
      // Register device
      const result = await NotificationsService.registerDevice('user-123');
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/register'),
        expect.objectContaining({
          userId: 'user-123',
          deviceToken: 'mock-device-token',
          platform: expect.any(String)
        })
      );
      
      // Verify result
      expect(result).toEqual({ success: true, deviceId: 'device-123' });
    });

    it('should unregister device from push notifications', async () => {
      // Mock API response
      axios.post.mockResolvedValue({
        data: { success: true }
      });
      
      // Unregister device
      const result = await NotificationsService.unregisterDevice('device-123');
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/unregister'),
        expect.objectContaining({
          deviceId: 'device-123'
        })
      );
      
      // Verify result
      expect(result).toEqual({ success: true });
    });

    it('should get notification history', async () => {
      // Mock API response
      const mockNotifications = [
        { id: 'notif-1', title: 'Test Notification', body: 'This is a test', timestamp: '2023-01-01T00:00:00Z' }
      ];
      axios.get.mockResolvedValue({
        data: { notifications: mockNotifications }
      });
      
      // Get notification history
      const result = await NotificationsService.getNotificationHistory('user-123');
      
      // Verify API call
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/history'),
        expect.objectContaining({
          params: { userId: 'user-123' }
        })
      );
      
      // Verify result
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('EdgeService', () => {
    it('should discover edge devices', async () => {
      // Mock API response
      const mockDevices = [
        { id: 'edge-device-123', name: 'Edge Device', status: 'available' },
        { id: 'edge-device-456', name: 'Another Device', status: 'available' }
      ];
      axios.get.mockResolvedValue({
        data: { devices: mockDevices }
      });
      
      // Discover devices
      const result = await EdgeService.discoverDevices();
      
      // Verify API call
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/edge/discover')
      );
      
      // Verify result
      expect(result).toEqual(mockDevices);
    });

    it('should connect to an edge device', async () => {
      // Mock API response
      axios.post.mockResolvedValue({
        data: {
          success: true,
          deviceId: 'edge-device-123',
          deviceName: 'Edge Device',
          status: 'connected'
        }
      });
      
      // Connect to device
      const result = await EdgeService.connectToDevice('edge-device-123');
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/edge/connect'),
        expect.objectContaining({
          deviceId: 'edge-device-123'
        })
      );
      
      // Verify result
      expect(result).toEqual({
        success: true,
        deviceId: 'edge-device-123',
        deviceName: 'Edge Device',
        status: 'connected'
      });
    });

    it('should disconnect from an edge device', async () => {
      // Mock API response
      axios.post.mockResolvedValue({
        data: { success: true }
      });
      
      // Disconnect from device
      const result = await EdgeService.disconnectFromDevice('edge-device-123');
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/edge/disconnect'),
        expect.objectContaining({
          deviceId: 'edge-device-123'
        })
      );
      
      // Verify result
      expect(result).toEqual({ success: true });
    });

    it('should get edge device status', async () => {
      // Mock API response
      axios.get.mockResolvedValue({
        data: {
          status: 'healthy',
          onlineStatus: 'connected',
          sync: {
            lastSyncTime: '2023-01-01T00:00:00Z',
            status: 'success'
          }
        }
      });
      
      // Get device status
      const result = await EdgeService.getDeviceStatus('edge-device-123');
      
      // Verify API call
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/edge/status'),
        expect.objectContaining({
          params: { deviceId: 'edge-device-123' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        status: 'healthy',
        onlineStatus: 'connected',
        sync: {
          lastSyncTime: '2023-01-01T00:00:00Z',
          status: 'success'
        }
      });
    });
  });

  describe('StorageService', () => {
    it('should store and retrieve data', async () => {
      // Mock AsyncStorage
      AsyncStorageMock.setItem.mockResolvedValue(undefined);
      AsyncStorageMock.getItem.mockResolvedValue(JSON.stringify({ name: 'Test' }));
      
      // Store data
      await StorageService.setItem('test-key', { name: 'Test' });
      
      // Verify AsyncStorage was called
      expect(AsyncStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ name: 'Test' })
      );
      
      // Retrieve data
      const result = await StorageService.getItem('test-key');
      
      // Verify AsyncStorage was called
      expect(AsyncStorageMock.getItem).toHaveBeenCalledWith('test-key');
      
      // Verify result
      expect(result).toEqual({ name: 'Test' });
    });

    it('should remove data', async () => {
      // Mock AsyncStorage
      AsyncStorageMock.removeItem.mockResolvedValue(undefined);
      
      // Remove data
      await StorageService.removeItem('test-key');
      
      // Verify AsyncStorage was called
      expect(AsyncStorageMock.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should clear all data', async () => {
      // Mock AsyncStorage
      AsyncStorageMock.clear.mockResolvedValue(undefined);
      
      // Clear data
      await StorageService.clear();
      
      // Verify AsyncStorage was called
      expect(AsyncStorageMock.clear).toHaveBeenCalled();
    });

    it('should store and retrieve secure data', async () => {
      // Mock Keychain
      const Keychain = require('react-native-keychain');
      
      // Store secure data
      await StorageService.setSecureItem('username', 'password');
      
      // Verify Keychain was called
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith('username', 'password');
      
      // Retrieve secure data
      const result = await StorageService.getSecureItem();
      
      // Verify Keychain was called
      expect(Keychain.getGenericPassword).toHaveBeenCalled();
      
      // Verify result
      expect(result).toEqual({
        username: 'username',
        password: 'password'
      });
    });

    it('should remove secure data', async () => {
      // Mock Keychain
      const Keychain = require('react-native-keychain');
      
      // Remove secure data
      await StorageService.removeSecureItem();
      
      // Verify Keychain was called
      expect(Keychain.resetGenericPassword).toHaveBeenCalled();
    });
  });
});
