import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Grid, 
  Divider, 
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import MfaSetup from '../components/MfaSetup';

/**
 * User Profile Page
 */
const Profile = () => {
  const { user, token, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mfaStatus, setMfaStatus] = useState({ mfaEnabled: false });
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [password, setPassword] = useState('');
  
  // Fetch MFA status on component mount
  useEffect(() => {
    fetchMfaStatus();
  }, []);
  
  /**
   * Fetch MFA status
   */
  const fetchMfaStatus = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/auth/mfa/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch MFA status');
      }
      
      setMfaStatus(data);
    } catch (error) {
      console.error('Error fetching MFA status:', error);
      setError('Failed to fetch MFA status. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle MFA setup completion
   */
  const handleMfaSetupComplete = () => {
    setShowMfaSetup(false);
    fetchMfaStatus();
    setSuccess('Two-factor authentication has been enabled successfully.');
  };
  
  /**
   * Handle MFA disable
   */
  const handleDisableMfa = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_URL}/auth/mfa/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to disable MFA');
      }
      
      setShowDisableDialog(false);
      setPassword('');
      fetchMfaStatus();
      setSuccess('Two-factor authentication has been disabled successfully.');
    } catch (error) {
      console.error('Error disabling MFA:', error);
      setError(error.message || 'Failed to disable MFA. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle password change
   */
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };
  
  if (!user) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading profile...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Profile
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Profile Information" />
              <Divider />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1">
                    {user.name}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {user.email}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Role
                  </Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {user.role}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Security Settings" />
              <Divider />
              <CardContent>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Two-Factor Authentication
                  </Typography>
                  
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {mfaStatus.mfaEnabled 
                        ? 'Your account is protected with two-factor authentication.' 
                        : 'Add an extra layer of security to your account.'}
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={mfaStatus.mfaEnabled} 
                          onChange={() => {
                            if (mfaStatus.mfaEnabled) {
                              setShowDisableDialog(true);
                            } else {
                              setShowMfaSetup(true);
                            }
                          }}
                          disabled={loading}
                        />
                      }
                      label=""
                    />
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mt: 3 }}>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={logout}
                  >
                    Sign Out
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* MFA Setup Dialog */}
        <Dialog 
          open={showMfaSetup} 
          onClose={() => setShowMfaSetup(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogContent>
            <MfaSetup onComplete={handleMfaSetupComplete} />
          </DialogContent>
        </Dialog>
        
        {/* Disable MFA Dialog */}
        <Dialog
          open={showDisableDialog}
          onClose={() => setShowDisableDialog(false)}
        >
          <DialogTitle>
            Disable Two-Factor Authentication
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to disable two-factor authentication? This will make your account less secure.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="Confirm Password"
              type="password"
              fullWidth
              variant="outlined"
              value={password}
              onChange={handlePasswordChange}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setShowDisableDialog(false)} 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDisableMfa} 
              color="error" 
              disabled={loading || !password}
              variant="contained"
            >
              {loading ? <CircularProgress size={24} /> : 'Disable'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Profile;
