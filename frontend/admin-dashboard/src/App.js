import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UsersPage from './pages/UsersPage';
import SystemHealthPage from './pages/SystemHealthPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if user is authenticated on component mount
  useEffect(() => {
    const token = localStorage.getItem('medtranslate_admin_token');
    if (token) {
      // In a real app, you would validate the token here
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);
  
  // Handle login
  const handleLogin = (token) => {
    localStorage.setItem('medtranslate_admin_token', token);
    setIsAuthenticated(true);
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('medtranslate_admin_token');
    setIsAuthenticated(false);
  };
  
  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }
    
    return children;
  };
  
  return (
    <div className="App">
      {isAuthenticated && <Navigation onLogout={handleLogout} />}
      
      <Container fluid className="mt-3">
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />
          } />
          
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="/analytics" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/users" element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          } />
          
          <Route path="/system-health" element={
            <ProtectedRoute>
              <SystemHealthPage />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Container>
    </div>
  );
}

export default App;
