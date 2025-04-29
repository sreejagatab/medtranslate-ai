/**
 * Notification Service for MedTranslate AI Patient App
 * 
 * Handles push notifications for session invitations and updates
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/config';

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
    if (onNotification) {
      onNotification(notification);
    }
  });
  
  // Handle notification interaction when the app is in the background
  const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response received:', response);
    const { notification } = response;
    
    if (onNotification) {
      onNotification(notification);
    }
  });
  
  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    backgroundSubscription.remove();
  };
}

/**
 * Schedule a local notification
 * @param {Object} options Notification options
 * @returns {Promise<string>} Notification ID
 */
export async function scheduleLocalNotification(options) {
  const { title, body, data = {}, channelId = 'default', sound = true } = options;
  
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound,
    },
    trigger: null, // Immediate notification
  });
}
