/**
 * MedTranslate AI Provider Application
 * 
 * This is the main application component for the provider-facing mobile app.
 */

import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import NewSessionScreen from './screens/NewSessionScreen';
import SessionScreen from './screens/SessionScreen';
import SessionsListScreen from './screens/SessionsListScreen';
import PatientsListScreen from './screens/PatientsListScreen';
import PatientDetailsScreen from './screens/PatientDetailsScreen';
import SettingsScreen from './screens/SettingsScreen';
import ScanQRCodeScreen from './screens/ScanQRCodeScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

// Import context
import { AuthProvider, AuthContext } from './context/AuthContext';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Sessions') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Patients') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0077CC',
        tabBarInactiveTintColor: '#757575',
        headerShown: false
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Sessions" component={SessionsListScreen} />
      <Tab.Screen name="Patients" component={PatientsListScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Authentication navigator
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// Main app navigator
function AppNavigator() {
  const { isLoading, userToken } = useContext(AuthContext);
  
  // Show loading screen
  if (isLoading) {
    return null; // Or a loading screen component
  }
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken == null ? (
          // Auth screens
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          // App screens
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="NewSession" component={NewSessionScreen} />
            <Stack.Screen name="Session" component={SessionScreen} />
            <Stack.Screen name="PatientDetails" component={PatientDetailsScreen} />
            <Stack.Screen name="ScanQRCode" component={ScanQRCodeScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Main app component
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
