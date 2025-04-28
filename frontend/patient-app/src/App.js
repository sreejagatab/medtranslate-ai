/**
 * MedTranslate AI Patient Application
 * 
 * This is the main application component for the patient-facing mobile app.
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import LanguageSelectionScreen from './screens/LanguageSelectionScreen';
import TranslationSessionScreen from './screens/TranslationSessionScreen';
import SessionSummaryScreen from './screens/SessionSummaryScreen';
import WelcomeScreen from './screens/WelcomeScreen';

// Import context
import { TranslationContext } from './context/TranslationContext';
import { EdgeConnectionProvider } from './context/EdgeConnectionContext';

const Stack = createStackNavigator();

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  // Check if first launch
  useEffect(() => {
    async function checkFirstLaunch() {
      try {
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        if (hasLaunched === null) {
          setIsFirstLaunch(true);
          await AsyncStorage.setItem('hasLaunched', 'true');
        } else {
          setIsFirstLaunch(false);
        }
      } catch (error) {
        console.error('Error checking first launch:', error);
      }
    }
    
    checkFirstLaunch();
    loadSavedLanguage();
  }, []);

  // Load saved language preference
  const loadSavedLanguage = async () => {
    try {
      const language = await AsyncStorage.getItem('selectedLanguage');
      if (language !== null) {
        setSelectedLanguage(JSON.parse(language));
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
    }
  };

  // Save language preference
  const saveLanguagePreference = async (language) => {
    try {
      await AsyncStorage.setItem('selectedLanguage', JSON.stringify(language));
      setSelectedLanguage(language);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  // Add new session to history
  const addSessionToHistory = (session) => {
    setSessionHistory(prevHistory => [...prevHistory, session]);
  };

  return (
    <EdgeConnectionProvider>
      <TranslationContext.Provider 
        value={{ 
          selectedLanguage, 
          setSelectedLanguage: saveLanguagePreference,
          sessionHistory, 
          addSessionToHistory 
        }}
      >
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
              options={{ title: 'Select Your Language' }}
            />
            <Stack.Screen 
              name="TranslationSession" 
              component={TranslationSessionScreen}
              options={{ title: 'Medical Translation', headerShown: false }}
            />
            <Stack.Screen 
              name="SessionSummary" 
              component={SessionSummaryScreen}
              options={{ title: 'Session Summary' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </TranslationContext.Provider>
    </EdgeConnectionProvider>
  );
}
