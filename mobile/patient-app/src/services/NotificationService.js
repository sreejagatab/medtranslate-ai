/**
 * Notification Service for MedTranslate AI Patient App
 *
 * Handles push notifications for session invitations and updates
 * Features:
 * - Push notification registration and permission management
 * - Local notification scheduling
 * - Notification history tracking
 * - Notification settings management
 * - Badge count management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, API_URL } from '../utils/config';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications
 * @returns {Promise<string|null>} Push token or null if not available
 */
export async function registerForPushNotifications() {
  let token;

  if (Device.isDevice) {
    // Check if we have permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If we don't have permission, ask for it
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If we still don't have permission, return null
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the token
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PROJECT_ID,
    })).data;

    // Save the token
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_TOKEN, token);
  } else {
    console.log('Must use physical device for push notifications');
  }

  // Set up notification channels for Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066CC',
    });

    Notifications.setNotificationChannelAsync('sessions', {
      name: 'Translation Sessions',
      description: 'Notifications for translation session invitations and updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066CC',
    });
  }

  return token;
}

/**
 * Send the push token to the server
 * @param {string} token Push token
 * @param {string} sessionId Current session ID (optional)
 * @returns {Promise<boolean>} Success status
 */
export async function sendPushTokenToServer(token, sessionId = null) {
  try {
    const response = await fetch(`${API_URL}/users/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN)}`
      },
      body: JSON.stringify({
        pushToken: token,
        sessionId,
        platform: Platform.OS
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending push token to server:', error);
    return false;
  }
}

/**
 * Set up notification listeners
 * @param {Function} onNotification Function to call when a notification is received
 * @returns {Function} Cleanup function
 */
export function setupNotificationListeners(onNotification) {
  // Handle notifications received while the app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);

    // Store notification in history
    storeNotificationInHistory(notification.request.content);

    // Update badge count
    updateBadgeCount();

    if (onNotification) {
      onNotification(notification);
    }
  });

  // Handle notification interaction when the app is in the background
  const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response received:', response);
    const { notification } = response;

    // Mark notification as read when user interacts with it
    if (notification.request.content.data?.id) {
      markNotificationAsRead(notification.request.content.data.id);
    }

    if (onNotification) {
      onNotification(notification, true); // true indicates user interaction
    }
  });

  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    backgroundSubscription.remove();
  };
}

/**
 * Get notification settings
 * @returns {Promise<Object>} Notification settings
 */
export async function getNotificationSettings() {
  try {
    const settingsString = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    return settingsString ? JSON.parse(settingsString) : {
      enabled: true,
      sound: true,
      vibration: true,
      sessionInvitations: true,
      translationUpdates: true,
      systemUpdates: true,
    };
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return {
      enabled: true,
      sound: true,
      vibration: true,
      sessionInvitations: true,
      translationUpdates: true,
      systemUpdates: true,
    };
  }
}

/**
 * Update notification settings
 * @param {Object} settings New settings
 * @returns {Promise<boolean>} Success status
 */
export async function updateNotificationSettings(settings) {
  try {
    // Get current settings
    const currentSettings = await getNotificationSettings();

    // Update settings
    const updatedSettings = { ...currentSettings, ...settings };

    // Save updated settings
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(updatedSettings));

    // If notifications are disabled, clear badge count
    if (!updatedSettings.enabled) {
      await Notifications.setBadgeCountAsync(0);
    } else {
      // Otherwise, update badge count
      await updateBadgeCount();
    }

    return true;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return false;
  }
}

/**
 * Schedule a local notification
 * @param {Object} options Notification options
 * @returns {Promise<string>} Notification ID
 */
export async function scheduleLocalNotification(options) {
  const {
    title,
    body,
    data = {},
    channelId = 'default',
    sound = true,
    trigger = null, // null means immediate notification
    badge = null
  } = options;

  // Add notification to history
  const notificationId = Date.now().toString();
  await storeNotificationInHistory({
    title,
    body,
    data: { ...data, id: notificationId },
  });

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { ...data, id: notificationId },
      sound,
      badge,
      channelId
    },
    trigger,
  });
}

/**
 * Cancel a scheduled notification
 * @param {string} notificationId Notification ID
 * @returns {Promise<void>}
 */
export async function cancelNotification(notificationId) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Store notification in history
 * @param {Object} content Notification content
 * @returns {Promise<void>}
 */
async function storeNotificationInHistory(content) {
  try {
    // Get existing history
    const historyString = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    const history = historyString ? JSON.parse(historyString) : [];

    // Add new notification
    const newNotification = {
      id: content.data?.id || Date.now().toString(),
      title: content.title,
      body: content.body,
      data: content.data,
      timestamp: Date.now(),
      read: false,
    };

    // Add to history (limit to 50 notifications)
    const updatedHistory = [newNotification, ...history].slice(0, 50);

    // Save updated history
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error storing notification in history:', error);
  }
}

/**
 * Get notification history
 * @returns {Promise<Array>} Notification history
 */
export async function getNotificationHistory() {
  try {
    const historyString = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    return historyString ? JSON.parse(historyString) : [];
  } catch (error) {
    console.error('Error getting notification history:', error);
    return [];
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId Notification ID
 * @returns {Promise<boolean>} Success status
 */
export async function markNotificationAsRead(notificationId) {
  try {
    // Get existing history
    const historyString = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    const history = historyString ? JSON.parse(historyString) : [];

    // Find and update notification
    const updatedHistory = history.map(notification => {
      if (notification.id === notificationId) {
        return { ...notification, read: true };
      }
      return notification;
    });

    // Save updated history
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(updatedHistory));

    // Update badge count
    await updateBadgeCount();

    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Clear notification history
 * @returns {Promise<boolean>} Success status
 */
export async function clearNotificationHistory() {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify([]));
    await updateBadgeCount();
    return true;
  } catch (error) {
    console.error('Error clearing notification history:', error);
    return false;
  }
}

/**
 * Get unread notification count
 * @returns {Promise<number>} Unread notification count
 */
export async function getUnreadNotificationCount() {
  try {
    const historyString = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    const history = historyString ? JSON.parse(historyString) : [];

    return history.filter(notification => !notification.read).length;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

/**
 * Update badge count based on unread notifications
 * @returns {Promise<void>}
 */
export async function updateBadgeCount() {
  try {
    const count = await getUnreadNotificationCount();
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error updating badge count:', error);
  }
}

// Export all functions as a default object
export default {
  registerForPushNotifications,
  sendPushTokenToServer,
  setupNotificationListeners,
  scheduleLocalNotification,
  cancelNotification,
  getNotificationHistory,
  markNotificationAsRead,
  clearNotificationHistory,
  getUnreadNotificationCount,
  updateBadgeCount,
  getNotificationSettings,
  updateNotificationSettings
};
