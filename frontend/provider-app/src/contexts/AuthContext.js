import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

// Create context
const AuthContext = createContext();

/**
 * Authentication provider component
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Verify token validity
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);
  
  /**
   * Verify token validity
   */
  const verifyToken = async (tokenToVerify) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: tokenToVerify })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        // Token is invalid, log out
        logout();
      }
    } catch (error) {
      console.error('Token verification error:', error);
      // On error, keep the user logged in but log the error
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Log in a user
   */
  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    
    // Store in localStorage
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };
  
  /**
   * Log out the current user
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    
    // Remove from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };
  
  /**
   * Check if user is authenticated
   */
  const isAuthenticated = () => {
    return !!token && !!user;
  };
  
  // Context value
  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use the auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;
