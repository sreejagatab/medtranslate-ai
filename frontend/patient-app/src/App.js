/**
 * MedTranslate AI Patient Application
 *
 * This is the main application component for the patient-facing web app.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Import pages
import JoinSession from './pages/JoinSession';
import Session from './pages/Session';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#0077CC',
    },
    secondary: {
      main: '#FF5722',
    },
  },
});

// App routes
const AppRoutes = () => {
  // Check if user is in a session
  const isInSession = () => {
    return localStorage.getItem('sessionId') && localStorage.getItem('patientToken');
  };

  return (
    <Routes>
      <Route path="/join" element={<JoinSession />} />
      <Route path="/session/:sessionId" element={
        isInSession() ? <Session /> : <Navigate to="/join" />
      } />
      <Route path="/" element={<Navigate to="/join" />} />
    </Routes>
  );
};

// Main app component
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  );
}
