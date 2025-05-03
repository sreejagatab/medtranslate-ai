/**
 * MedTranslate AI Patient Mobile App
 *
 * Main application component
 */

import React, { useState, useEffect, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './utils/config';
import { SessionProvider } from './contexts/SessionContext';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { EdgeConnectionProvider } from './contexts/EdgeConnectionContext';
import { OfflineIndicatorProvider, useOfflineIndicator } from './contexts/OfflineIndicatorContext';
import OfflineIndicatorContext from './contexts/OfflineIndicatorContext';
import NotificationService from './services/NotificationService';
import EnhancedOfflineIndicator from './components/EnhancedOfflineIndicator';
import edgeWebSocketService from './services/EdgeWebSocketService';

// Import screens
import WelcomeScreen from './screens/WelcomeScreen';
import LanguageSelectionScreen from './screens/LanguageSelectionScreen';
import JoinSessionScreen from './screens/JoinSessionScreen';
import TranslationSessionScreen from './screens/TranslationSessionScreen';
import SessionSummaryScreen from './screens/SessionSummaryScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import SettingsScreen from './screens/SettingsScreen';
import OfflineQueueScreen from './screens/OfflineQueueScreen';
import EdgeDeviceScreen from './screens/EdgeDeviceScreen';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  // State for unread notification count
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Check if this is the first launch and set up notifications
  useEffect(() => {
    checkFirstLaunch();
    setupNotifications();

    // Check for unread notifications
    checkUnreadNotifications();

    // Set up notification listeners
    const cleanupNotifications = NotificationService.setupNotificationListeners(handleNotification);

    return () => {
      cleanupNotifications();
    };
  }, []);

  // Set up notifications
  const setupNotifications = async () => {
    try {
      // Register for push notifications
      const token = await NotificationService.registerForPushNotifications();

      // Send token to server if available
      if (token) {
        await NotificationService.sendPushTokenToServer(token);
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  // Check for unread notifications
  const checkUnreadNotifications = async () => {
    try {
      const count = await NotificationService.getUnreadNotificationCount();
      setUnreadNotifications(count);
    } catch (error) {
      console.error('Error checking unread notifications:', error);
    }
  };

  // Check if this is the first launch
  const checkFirstLaunch = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);

      if (onboardingCompleted === 'true') {
        setIsFirstLaunch(false);
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle incoming notifications
  const handleNotification = (notification, userInteraction = false) => {
    const data = notification.request.content.data;

    // Update unread count
    checkUnreadNotifications();

    // Handle different notification types
    if (data.type === 'session_invitation') {
      // If user tapped on notification, navigate to join session
      if (userInteraction) {
        // We'll handle navigation in the NotificationsScreen component
      }
    } else if (data.type === 'translation_complete') {
      // If user tapped on notification, navigate to session
      if (userInteraction) {
        // We'll handle navigation in the NotificationsScreen component
      }
    } else if (data.type === 'system_update') {
      // Handle system update notification
    }
  };

  // Loading state
  if (isLoading) {
    return null;
  }

  // Main tab navigator
  const MainTabNavigator = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else if (route.name === 'OfflineQueue') {
            iconName = focused ? 'cloud-offline' : 'cloud-offline-outline';
          } else if (route.name === 'EdgeDevice') {
            iconName = focused ? 'wifi' : 'wifi-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Home"
        component={JoinSessionScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: false,
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : null
        }}
      />
      <Tab.Screen
        name="OfflineQueue"
        component={OfflineQueueScreen}
        options={{ headerShown: false, title: 'Offline' }}
      />
      <Tab.Screen
        name="EdgeDevice"
        component={EdgeDeviceScreen}
        options={{ headerShown: false, title: 'Edge Device' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );

  // Enhanced Offline Indicator component
  const OfflineIndicatorWrapper = () => {
    const { isOffline, offlineReadiness, offlineRisk, cacheStats, prepareForOffline, checkConnection } = useContext(OfflineIndicatorContext);

    return (
      <EnhancedOfflineIndicator
        isOffline={isOffline}
        offlineReadiness={offlineReadiness}
        offlineRisk={offlineRisk}
        cacheStats={cacheStats}
        onPrepareForOffline={prepareForOffline}
        onCheckConnection={checkConnection}
      />
    );
  };

  return (
    <ConnectionProvider>
      <EdgeConnectionProvider>
        <OfflineIndicatorProvider>
          <SessionProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <OfflineIndicatorWrapper />
              <Stack.Navigator>
                {isFirstLaunch ? (
                  <Stack.Screen
                    name="Welcome"
                    component={WelcomeScreen}
                    options={{ headerShown: false }}
                  />
                ) : null}

                <Stack.Screen
                  name="LanguageSelection"
                  component={LanguageSelectionScreen}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="Main"
                  component={MainTabNavigator}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="TranslationSession"
                  component={TranslationSessionScreen}
                  options={{ headerShown: false, gestureEnabled: false }}
                />

                <Stack.Screen
                  name="SessionSummary"
                  component={SessionSummaryScreen}
                  options={{
                    title: 'Session Summary',
                    headerLeft: null,
                    gestureEnabled: false
                  }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </SessionProvider>
        </OfflineIndicatorProvider>
      </EdgeConnectionProvider>
    </ConnectionProvider>
  );
}
