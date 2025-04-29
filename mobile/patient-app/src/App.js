/**
 * MedTranslate AI Patient Mobile App
 * 
 * Main application component
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './utils/config';
import { SessionProvider } from './contexts/SessionContext';
import { setupNotificationListeners } from './services/NotificationService';

// Import screens
import WelcomeScreen from './screens/WelcomeScreen';
import LanguageSelectionScreen from './screens/LanguageSelectionScreen';
import JoinSessionScreen from './screens/JoinSessionScreen';
import TranslationSessionScreen from './screens/TranslationSessionScreen';
import SessionSummaryScreen from './screens/SessionSummaryScreen';

// Create stack navigator
const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  
  // Check if this is the first launch
  useEffect(() => {
    checkFirstLaunch();
    
    // Set up notification listeners
    const cleanupNotifications = setupNotificationListeners(handleNotification);
    
    return () => {
      cleanupNotifications();
    };
  }, []);
  
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
  const handleNotification = (notification) => {
    const data = notification.request.content.data;
    
    // Handle different notification types
    if (data.type === 'session_invitation') {
      // TODO: Handle session invitation
    }
  };
  
  // Loading state
  if (isLoading) {
    return null;
  }
  
  return (
    <SessionProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
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
            name="JoinSession"
            component={JoinSessionScreen}
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
  );
}
