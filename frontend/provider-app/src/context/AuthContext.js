/**
 * Authentication Context for MedTranslate AI Provider Application
 *
 * This context provides authentication state and functions
 * to all components in the application.
 */

import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, apiRequest } from '../config/api';

// Create the context
export const AuthContext = createContext({
  isLoading: true,
  isSignout: false,
  userToken: null,
  providerInfo: null,
  signIn: () => {},
  signOut: () => {},
  refreshToken: () => {}
});

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    isLoading: true,
    isSignout: false,
    userToken: null,
    providerInfo: null
  });

  // Load token and provider info from storage on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      let userToken = null;
      let providerInfo = null;

      try {
        // Load token from storage
        userToken = await AsyncStorage.getItem('userToken');

        // Load provider info from storage
        const providerInfoString = await AsyncStorage.getItem('providerInfo');
        if (providerInfoString) {
          providerInfo = JSON.parse(providerInfoString);
        }

        // Verify token validity
        if (userToken) {
          const isValid = await verifyToken(userToken);
          if (!isValid) {
            userToken = null;
            providerInfo = null;
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('providerInfo');
          }
        }
      } catch (e) {
        console.error('Failed to load authentication state:', e);
      }

      // Update state
      setState({
        ...state,
        isLoading: false,
        userToken,
        providerInfo
      });
    };

    bootstrapAsync();
  }, []);

  // Verify token validity
  const verifyToken = async (token) => {
    try {
      const data = await apiRequest(API_ENDPOINTS.AUTH.VERIFY, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return data.valid;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  };

  // Authentication actions
  const authActions = {
    signIn: async (token, providerInfo) => {
      setState({
        ...state,
        isSignout: false,
        userToken: token,
        providerInfo
      });
    },
    signOut: async () => {
      // Clear storage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('providerInfo');

      // Update state
      setState({
        ...state,
        isSignout: true,
        userToken: null,
        providerInfo: null
      });
    },
    refreshToken: async () => {
      try {
        // Call refresh token API
        const data = await apiRequest(API_ENDPOINTS.AUTH.REFRESH, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.userToken}`
          }
        });

        if (data.token) {
          // Update storage
          await AsyncStorage.setItem('userToken', data.token);

          // Update state
          setState({
            ...state,
            userToken: data.token
          });

          return true;
        } else {
          // Token refresh failed, sign out
          await authActions.signOut();
          return false;
        }
      } catch (error) {
        console.error('Token refresh error:', error);
        await authActions.signOut();
        return false;
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        ...authActions
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
