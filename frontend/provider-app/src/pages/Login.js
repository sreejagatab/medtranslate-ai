import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import MfaVerification from '../components/MfaVerification';

/**
 * Login page for providers
 */
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempProvider, setTempProvider] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * Handle login form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Call login API
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // Check if MFA is required
      if (data.mfaRequired) {
        setMfaRequired(true);
        setTempProvider(data.provider);
        setLoading(false);
        return;
      }

      // Store token and user info
      login(data.token, data.user);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  /**
   * Handle MFA verification
   */
  const handleMfaVerify = async (mfaToken, isBackupCode = false) => {
    try {
      setLoading(true);
      setError('');

      // Call login API with MFA token
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          mfaToken,
          isBackupCode
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'MFA verification failed');
      }

      // Store token and user info
      login(data.token, data.user);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'MFA verification failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel MFA verification
   */
  const handleMfaCancel = () => {
    setMfaRequired(false);
    setTempProvider(null);
    setEmail('');
    setPassword('');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            MedTranslate AI
          </Typography>

          <Typography variant="h5" component="h2" align="center" gutterBottom>
            Provider Login
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {mfaRequired ? (
            <>
              <Divider sx={{ my: 2 }} />
              <MfaVerification
                onVerify={handleMfaVerify}
                onCancel={handleMfaCancel}
                provider={tempProvider}
              />
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />

              <TextField
                label="Password"
                type="password"
                fullWidth
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />

              <Box sx={{ mt: 3 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={loading}
                  startIcon={loading && <CircularProgress size={20} color="inherit" />}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </Box>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  Demo credentials: john.smith@example.com / password123
                </Typography>
              </Box>
            </form>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
