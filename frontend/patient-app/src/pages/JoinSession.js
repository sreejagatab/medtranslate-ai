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
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { API_URL, LANGUAGES } from '../config';
import OfflineStatusIndicator from '../components/OfflineStatusIndicator';

/**
 * Join session page for patients
 */
const JoinSession = () => {
  const [sessionCode, setSessionCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /**
   * Handle join session form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!sessionCode) {
      setError('Please enter a session code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Call join session API
      const response = await fetch(`${API_URL}/auth/sessions/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionCode })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to join session');
      }

      // Store session information in localStorage
      localStorage.setItem('patientToken', data.token);
      localStorage.setItem('sessionId', data.sessionId);
      localStorage.setItem('language', data.language);

      // Redirect to session page
      navigate(`/session/${data.sessionId}`);
    } catch (err) {
      setError(err.message || 'Failed to join session. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 2, mb: 2 }}>
        <OfflineStatusIndicator />
      </Box>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            MedTranslate AI
          </Typography>

          <Typography variant="h5" component="h2" align="center" gutterBottom>
            Join Translation Session
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Session Code"
              fullWidth
              margin="normal"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              disabled={loading}
              required
              placeholder="Enter the 6-digit code provided by your healthcare provider"
              inputProps={{ maxLength: 6 }}
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
                {loading ? 'Joining...' : 'Join Session'}
              </Button>
            </Box>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Ask your healthcare provider for a session code
              </Typography>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default JoinSession;
