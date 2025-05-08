/**
 * Notifications Service for MedTranslate AI Mobile App
 *
 * This module provides functions for managing push notifications.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../utils/config';
import { registerPushToken } from './api';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

/**
 * Registers for push notifications
 *
 * @returns {Promise<string|null>} - The push token or null if not available
 */
export const registerForPushNotifications = async () => {
  let token = null;

  if (!Device.isDevice) {
    console.warn('Must use physical device for push notifications');
    return null;
  }

  // Check if we already have permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If we don't have permission, ask for it
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // If we still don't have permission, return null
  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return null;
  }

  // Get the token
  token = (await Notifications.getExpoPushTokenAsync()).data;

  // Store the token
  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_TOKEN, token);

  // Register the token with the server
  await registerPushToken(token);

  // Set up notification channels for Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0077CC'
    });

    Notifications.setNotificationChannelAsync('sessions', {
      name: 'Translation Sessions',
      description: 'Notifications about translation sessions',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0077CC'
    });

    Notifications.setNotificationChannelAsync('system', {
      name: 'System Notifications',
      description: 'Notifications about system updates and events',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0077CC'
    });
  }

  return token;
};

/**
 * Sets up notification listeners
 *
 * @param {Function} onNotificationReceived - Callback for when a notification is received
 * @param {Function} onNotificationResponse - Callback for when a notification is responded to
 * @returns {object} - The notification subscriptions
 */
export const setupNotificationListeners = (onNotificationReceived, onNotificationResponse) => {
  // Set up notification received listener
  const notificationListener = Notifications.addNotificationReceivedListener(
    notification => {
      // Store the notification in history
      storeNotification({
        id: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        read: false,
        timestamp: new Date().toISOString()
      });

      // Call the callback
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    }
  );

  // Set up notification response listener
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    response => {
      // Mark the notification as read
      markNotificationAsRead(response.notification.request.identifier);

      // Call the callback
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    }
  );

  return {
    notificationListener,
    responseListener,
    removeListeners: () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    }
  };
};

/**
 * Stores a notification in history
 *
 * @param {object} notification - The notification to store
 * @returns {Promise<void>}
 */
export const storeNotification = async (notification) => {
  try {
    // Get existing notifications
    const notificationsJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    let notifications = notificationsJson ? JSON.parse(notificationsJson) : [];

    // Add the new notification
    notifications.unshift(notification);

    // Limit to 50 notifications
    if (notifications.length > 50) {
      notifications = notifications.slice(0, 50);
    }

    // Store the updated notifications
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(notifications));

    // Update badge count
    const unreadCount = notifications.filter(n => !n.read).length;
    await Notifications.setBadgeCountAsync(unreadCount);
  } catch (error) {
    console.error('Error storing notification:', error);
  }
};

/**
 * Marks a notification as read
 *
 * @param {string} notificationId - The ID of the notification to mark as read
 * @returns {Promise<void>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    // Get existing notifications
    const notificationsJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    if (!notificationsJson) {
      return;
    }

    // Parse notifications
    const notifications = JSON.parse(notificationsJson);

    // Find and update the notification
    const updatedNotifications = notifications.map(notification => {
      if (notification.id === notificationId) {
        return { ...notification, read: true };
      }
      return notification;
    });

    // Store the updated notifications
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(updatedNotifications));

    // Update badge count
    const unreadCount = updatedNotifications.filter(n => !n.read).length;
    await Notifications.setBadgeCountAsync(unreadCount);
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * Clears all notifications
 *
 * @returns {Promise<void>}
 */
export const clearAllNotifications = async () => {
  try {
    // Clear notifications from the notification center
    await Notifications.dismissAllNotificationsAsync();

    // Clear the badge count
    await Notifications.setBadgeCountAsync(0);

    // Clear the notification history
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify([]));
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
};

/**
 * Schedules a local notification
 *
 * @param {object} notification - The notification to schedule
 * @returns {Promise<string>} - The notification identifier
 */
export const scheduleLocalNotification = async (notification) => {
  try {
    // Schedule the notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: true,
        badge: 1,
        ...(Platform.OS === 'android' && {
          channelId: notification.data?.type === 'session' ? 'sessions' : 'system'
        })
      },
      trigger: notification.trigger || null
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
};

/**
 * Gets the notification settings
 *
 * @returns {Promise<object>} - The notification settings
 */
export const getNotificationSettings = async () => {
  try {
    // Get settings from AsyncStorage
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);

    // If no settings exist, return defaults
    if (!settingsJson) {
      const defaultSettings = {
        enabled: true,
        categories: {
          session: true,
          system: true,
          sync: true,
          edge: true
        },
        sound: true,
        vibration: true,
        badge: true
      };

      // Store default settings
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(defaultSettings));

      return defaultSettings;
    }

    return JSON.parse(settingsJson);
  } catch (error) {
    console.error('Error getting notification settings:', error);
    throw error;
  }
};

/**
 * Updates the notification settings
 *
 * @param {object} settings - The updated settings
 * @returns {Promise<void>}
 */
export const updateNotificationSettings = async (settings) => {
  try {
    // Store the updated settings
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
};
