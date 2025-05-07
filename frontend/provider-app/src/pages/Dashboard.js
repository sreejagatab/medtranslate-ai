import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  History as HistoryIcon,
  Translate as TranslateIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, LANGUAGES, MEDICAL_CONTEXTS } from '../config';
import CacheStatusPanel from '../components/CacheStatusPanel';
import OfflineStatusIndicator from '../components/OfflineStatusIndicator';
import { EnhancedNetworkStatusIndicator } from '../../../shared/components';

/**
 * Provider dashboard page
 */
const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openNewSession, setOpenNewSession] = useState(false);
  const [patientLanguage, setPatientLanguage] = useState('es');
  const [medicalContext, setMedicalContext] = useState('general');
  const [creatingSession, setCreatingSession] = useState(false);

  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Fetch active sessions
  useEffect(() => {
    fetchSessions();
  }, [token]);

  /**
   * Fetch active sessions for the provider
   */
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');

      // This would be a real API call in production
      // For now, we'll use mock data
      const mockSessions = [
        {
          id: 'session-001',
          patientLanguage: 'es',
          context: 'general',
          startTime: new Date(Date.now() - 30 * 60000).toISOString(),
          status: 'active',
          sessionCode: '123456'
        },
        {
          id: 'session-002',
          patientLanguage: 'fr',
          context: 'cardiology',
          startTime: new Date(Date.now() - 120 * 60000).toISOString(),
          status: 'active',
          sessionCode: '789012'
        }
      ];

      setSessions(mockSessions);
    } catch (err) {
      setError('Failed to load sessions. Please try again.');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new translation session
   */
  const createNewSession = async () => {
    try {
      setCreatingSession(true);

      // Call API to create a new session
      const response = await fetch(`${API_URL}/auth/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          providerId: user.id,
          patientLanguage,
          context: medicalContext
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create session');
      }

      // Add new session to the list
      setSessions([data.session, ...sessions]);

      // Close dialog
      setOpenNewSession(false);

      // Navigate to the session
      navigate(`/session/${data.session.sessionId}`);
    } catch (err) {
      setError(err.message || 'Failed to create session. Please try again.');
      console.error('Error creating session:', err);
    } finally {
      setCreatingSession(false);
    }
  };

  /**
   * Join an existing session
   */
  const joinSession = (sessionId) => {
    navigate(`/session/${sessionId}`);
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  /**
   * Get language name from code
   */
  const getLanguageName = (code) => {
    const language = LANGUAGES.find(lang => lang.code === code);
    return language ? language.name : code;
  };

  /**
   * Get context name from code
   */
  const getContextName = (code) => {
    const context = MEDICAL_CONTEXTS.find(ctx => ctx.code === code);
    return context ? context.name : code;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Header */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h4" component="h1">
                Provider Dashboard
              </Typography>

              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenNewSession(true)}
              >
                New Session
              </Button>
            </Paper>
          </Grid>

          {/* Provider Info */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Provider Information
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Name"
                    secondary={user?.name || 'Unknown'}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <TranslateIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Default Language"
                    secondary="English"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <HistoryIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Active Sessions"
                    secondary={sessions.length}
                  />
                </ListItem>
              </List>
            </Paper>

            {/* Cache Status Panel */}
            <Box sx={{ mt: 3 }}>
              <CacheStatusPanel />
            </Box>

            {/* Offline Status Indicator */}
            <Box sx={{ mt: 3 }}>
              <OfflineStatusIndicator />
            </Box>

            {/* Enhanced Network Status Indicator */}
            <Box sx={{ mt: 3 }}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Network Status
                  </Typography>
                  <Tooltip title="Real-time network quality monitoring with enhanced analytics">
                    <InfoIcon fontSize="small" color="action" />
                  </Tooltip>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <EnhancedNetworkStatusIndicator
                    style={{
                      container: { margin: 0 },
                      indicator: { width: '100%', justifyContent: 'center' }
                    }}
                    offlineReadiness={75}
                    offlineRisk={0.3}
                  />
                </Box>
              </Paper>
            </Box>

            {/* System Status Link */}
            <Box sx={{ mt: 3 }}>
              <Paper sx={{ p: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<SpeedIcon />}
                  onClick={() => navigate('/system-status')}
                >
                  System Status Dashboard
                </Button>
              </Paper>
            </Box>
          </Grid>

          {/* Active Sessions */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Active Sessions
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Typography color="error" sx={{ p: 2 }}>
                  {error}
                </Typography>
              ) : sessions.length === 0 ? (
                <Typography sx={{ p: 2 }}>
                  No active sessions. Create a new session to get started.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {sessions.map((session) => (
                    <Grid item xs={12} sm={6} key={session.id}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Session Code: {session.sessionCode}
                          </Typography>

                          <Typography variant="body2" color="textSecondary">
                            Patient Language: {getLanguageName(session.patientLanguage)}
                          </Typography>

                          <Typography variant="body2" color="textSecondary">
                            Context: {getContextName(session.context)}
                          </Typography>

                          <Typography variant="body2" color="textSecondary">
                            Started: {formatDate(session.startTime)}
                          </Typography>
                        </CardContent>

                        <CardActions>
                          <Button
                            size="small"
                            color="primary"
                            onClick={() => joinSession(session.id)}
                          >
                            Join Session
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* New Session Dialog */}
      <Dialog open={openNewSession} onClose={() => setOpenNewSession(false)}>
        <DialogTitle>Create New Translation Session</DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Patient Language</InputLabel>
              <Select
                value={patientLanguage}
                onChange={(e) => setPatientLanguage(e.target.value)}
                label="Patient Language"
              >
                {LANGUAGES.filter(lang => lang.code !== 'en').map((language) => (
                  <MenuItem key={language.code} value={language.code}>
                    {language.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Medical Context</InputLabel>
              <Select
                value={medicalContext}
                onChange={(e) => setMedicalContext(e.target.value)}
                label="Medical Context"
              >
                {MEDICAL_CONTEXTS.map((context) => (
                  <MenuItem key={context.code} value={context.code}>
                    {context.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenNewSession(false)}>
            Cancel
          </Button>
          <Button
            onClick={createNewSession}
            color="primary"
            variant="contained"
            disabled={creatingSession}
            startIcon={creatingSession && <CircularProgress size={20} color="inherit" />}
          >
            {creatingSession ? 'Creating...' : 'Create Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;
