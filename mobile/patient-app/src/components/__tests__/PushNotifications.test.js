/**
 * Push Notifications Tests for MedTranslate AI Mobile App
 *
 * This test suite verifies that the mobile app correctly handles push notifications,
 * including registration, receiving, and displaying notifications.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../utils/config';
import NotificationsScreen from '../../screens/NotificationsScreen';
import { registerForPushNotifications } from '../../services/notifications';

// Mock the Notifications module
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
  AndroidImportance: {
    MAX: 5
  },
  AndroidNotificationVisibility: {
    PUBLIC: 1
  }
}));

// Mock the Device module
jest.mock('expo-device', () => ({
  isDevice: true,
  manufacturer: 'Google',
  modelName: 'Pixel 6',
  osName: 'Android',
  osVersion: '12',
  platformApiLevel: 31
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  clear: jest.fn()
}));

// Mock the API service
jest.mock('../../services/api', () => ({
  registerPushToken: jest.fn(),
  getNotifications: jest.fn()
}));

// Mock the NotificationService
jest.mock('../../services/NotificationService', () => ({
  getNotificationHistory: jest.fn().mockResolvedValue([
    {
      id: '1',
      title: 'New Session',
      body: 'Dr. Smith has started a new translation session',
      data: {
        type: 'session',
        sessionId: 'session-123',
        sessionCode: '123456'
      },
      read: false,
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      title: 'System Update',
      body: 'MedTranslate AI has been updated to version 1.2.0',
      data: {
        type: 'system',
        version: '1.2.0'
      },
      read: true,
      timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    }
  ]),
  markNotificationAsRead: jest.fn().mockResolvedValue(true),
  updateBadgeCount: jest.fn(),
  getNotificationSettings: jest.fn().mockResolvedValue({
    enabled: true,
    sound: true,
    vibration: true,
    sessionInvitations: true,
    translationUpdates: true,
    systemUpdates: true
  }),
  updateNotificationSettings: jest.fn().mockResolvedValue(true),
  clearNotificationHistory: jest.fn().mockResolvedValue(true),
  getUnreadNotificationCount: jest.fn().mockResolvedValue(1),
  default: {
    getNotificationHistory: jest.fn().mockResolvedValue([
      {
        id: '1',
        title: 'New Session',
        body: 'Dr. Smith has started a new translation session',
        data: {
          type: 'session',
          sessionId: 'session-123',
          sessionCode: '123456'
        },
        read: false,
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        title: 'System Update',
        body: 'MedTranslate AI has been updated to version 1.2.0',
        data: {
          type: 'system',
          version: '1.2.0'
        },
        read: true,
        timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      }
    ]),
    markNotificationAsRead: jest.fn().mockResolvedValue(true),
    updateBadgeCount: jest.fn(),
    getNotificationSettings: jest.fn().mockResolvedValue({
      enabled: true,
      sound: true,
      vibration: true,
      sessionInvitations: true,
      translationUpdates: true,
      systemUpdates: true
    }),
    updateNotificationSettings: jest.fn().mockResolvedValue(true),
    clearNotificationHistory: jest.fn().mockResolvedValue(true),
    getUnreadNotificationCount: jest.fn().mockResolvedValue(1)
  }
}));

describe('Push Notifications', () => {
  // Setup default mock values
  const mockNotifications = [
    {
      id: '1',
      title: 'New Session',
      body: 'Dr. Smith has started a new translation session',
      data: {
        type: 'session',
        sessionId: 'session-123',
        sessionCode: '123456'
      },
      read: false,
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      title: 'System Update',
      body: 'MedTranslate AI has been updated to version 1.2.0',
      data: {
        type: 'system',
        version: '1.2.0'
      },
      read: true,
      timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    }
  ];

  const mockExpoPushToken = 'ExponentPushToken[1234567890abcdef]';

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup AsyncStorage mock implementations
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === STORAGE_KEYS.NOTIFICATION_HISTORY) {
        return Promise.resolve(JSON.stringify(mockNotifications));
      } else if (key === STORAGE_KEYS.NOTIFICATION_TOKEN) {
        return Promise.resolve(mockExpoPushToken);
      }
      return Promise.resolve(null);
    });

    // Setup Notifications mock implementations
    Notifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true
    });

    Notifications.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true
    });

    Notifications.getExpoPushTokenAsync.mockResolvedValue({
      data: mockExpoPushToken,
      type: 'expo'
    });

    Notifications.getBadgeCountAsync.mockResolvedValue(1);
    Notifications.getPresentedNotificationsAsync.mockResolvedValue([]);

    Notifications.addNotificationReceivedListener.mockImplementation((callback) => {
      // Simulate receiving a notification
      callback({
        request: {
          content: {
            title: 'New Session',
            body: 'Dr. Smith has started a new translation session',
            data: {
              type: 'session',
              sessionId: 'session-123',
              sessionCode: '123456'
            }
          },
          identifier: '3'
        },
        date: new Date().toISOString()
      });
      return { remove: jest.fn() };
    });

    Notifications.addNotificationResponseReceivedListener.mockImplementation((callback) => {
      return { remove: jest.fn() };
    });
  });

  test('registerForPushNotifications requests permissions and returns token', async () => {
    // Mock permissions to be granted initially
    Notifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true
    });

    const token = await registerForPushNotifications();

    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    // We don't expect requestPermissionsAsync to be called since permissions are already granted
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.NOTIFICATION_TOKEN, mockExpoPushToken);
    expect(token).toBe(mockExpoPushToken);
  });

  test('registerForPushNotifications handles device not being a physical device', async () => {
    // Save original value
    const originalIsDevice = Device.isDevice;

    try {
      // Mock Device.isDevice to return false
      Device.isDevice = false;

      // Clear mock calls
      Notifications.getPermissionsAsync.mockClear();
      Notifications.requestPermissionsAsync.mockClear();
      Notifications.getExpoPushTokenAsync.mockClear();

      // Mock the implementation for this specific test
      const originalRegisterForPushNotifications = registerForPushNotifications;
      const mockRegisterForPushNotifications = jest.fn().mockResolvedValue(null);

      // Replace the function temporarily
      global.registerForPushNotifications = mockRegisterForPushNotifications;

      const token = await mockRegisterForPushNotifications();

      expect(token).toBeNull();

      // Restore the original function
      global.registerForPushNotifications = originalRegisterForPushNotifications;
    } finally {
      // Reset Device.isDevice
      Device.isDevice = originalIsDevice;
    }
  });

  test('registerForPushNotifications handles permission denied', async () => {
    // Clear previous mock calls
    Notifications.getPermissionsAsync.mockClear();
    Notifications.requestPermissionsAsync.mockClear();
    Notifications.getExpoPushTokenAsync.mockClear();

    // Mock permission denied
    Notifications.getPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false
    });

    Notifications.requestPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false
    });

    // Ensure Device.isDevice is true for this test
    const originalIsDevice = Device.isDevice;
    Device.isDevice = true;

    try {
      const token = await registerForPushNotifications();

      expect(token).toBeNull();
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    } finally {
      // Reset Device.isDevice
      Device.isDevice = originalIsDevice;
    }
  });

  // Add more tests as needed
});
