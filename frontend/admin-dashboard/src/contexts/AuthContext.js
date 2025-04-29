import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_URL } from '../config';

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('medtranslate_admin_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch user profile
  const fetchUserProfile = async (authToken) => {
    try {
      setError(null);
      
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
      } else {
        throw new Error(data.error || 'Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(error.message);
      // Clear invalid token
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      if (data.success && data.token) {
        // Store token
        localStorage.setItem('medtranslate_admin_token', data.token);
        setToken(data.token);
        
        // Fetch user profile
        await fetchUserProfile(data.token);
        
        return true;
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('medtranslate_admin_token');
    setToken(null);
    setUser(null);
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!token;
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  // Context value
  const value = {
    token,
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
