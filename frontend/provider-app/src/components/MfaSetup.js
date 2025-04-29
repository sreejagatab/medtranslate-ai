import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CircularProgress, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider, 
  Grid, 
  Step, 
  StepLabel, 
  Stepper, 
  TextField, 
  Typography 
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';

const steps = ['Generate Secret', 'Scan QR Code', 'Verify Code'];

/**
 * MFA Setup Component
 * 
 * This component guides users through the process of setting up
 * multi-factor authentication using an authenticator app.
 */
const MfaSetup = ({ onComplete }) => {
  const { token, user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaSetup, setMfaSetup] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Generate MFA setup on component mount
  useEffect(() => {
    if (activeStep === 0) {
      generateMfaSetup();
    }
  }, []);

  // Generate MFA setup
  const generateMfaSetup = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/auth/mfa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate MFA setup');
      }

      setMfaSetup(data.mfaSetup);
      setActiveStep(1);
    } catch (error) {
      console.error('Error generating MFA setup:', error);
      setError(error.message || 'Failed to generate MFA setup');
    } finally {
      setLoading(false);
    }
  };

  // Enable MFA
  const enableMfa = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate verification code
      if (!verificationCode || verificationCode.length !== 6) {
        setError('Please enter a valid 6-digit verification code');
        return;
      }

      const response = await fetch(`${API_URL}/auth/mfa/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          secret: mfaSetup.secret,
          verificationCode
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to enable MFA');
      }

      setBackupCodes(data.backupCodes || []);
      setActiveStep(2);
    } catch (error) {
      console.error('Error enabling MFA:', error);
      setError(error.message || 'Failed to enable MFA');
    } finally {
      setLoading(false);
    }
  };

  // Handle next step
  const handleNext = () => {
    if (activeStep === 1) {
      enableMfa();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Handle verification code change
  const handleVerificationCodeChange = (e) => {
    // Only allow digits
    const value = e.target.value.replace(/[^0-9]/g, '');
    
    // Limit to 6 digits
    if (value.length <= 6) {
      setVerificationCode(value);
    }
  };

  // Handle completion
  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  // Show backup codes dialog
  const handleShowBackupCodes = () => {
    setShowBackupCodes(true);
  };

  // Hide backup codes dialog
  const handleHideBackupCodes = () => {
    setShowBackupCodes(false);
  };

  return (
    <Card>
      <CardHeader 
        title="Set Up Two-Factor Authentication" 
        subheader="Enhance your account security with an authenticator app"
      />
      <Divider />
      <CardContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box my={2}>
            <Typography color="error">{error}</Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => setError('')} 
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
          </Box>
        ) : (
          <>
            {activeStep === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Preparing Two-Factor Authentication
                </Typography>
                <Typography paragraph>
                  We're generating your secure key. Please wait...
                </Typography>
              </Box>
            )}

            {activeStep === 1 && mfaSetup && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Scan QR Code
                </Typography>
                <Typography paragraph>
                  Scan this QR code with your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).
                </Typography>
                
                <Box display="flex" justifyContent="center" my={3}>
                  <img 
                    src={mfaSetup.qrCodeUrl} 
                    alt="QR Code for MFA Setup" 
                    style={{ maxWidth: '200px' }}
                  />
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Can't scan the QR code?
                </Typography>
                <Typography paragraph>
                  Enter this code manually in your authenticator app:
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  fontFamily="monospace" 
                  fontWeight="bold" 
                  textAlign="center" 
                  my={2}
                >
                  {mfaSetup.secret}
                </Typography>

                <Box mt={4}>
                  <Typography variant="subtitle1" gutterBottom>
                    Verification
                  </Typography>
                  <Typography paragraph>
                    Enter the 6-digit code from your authenticator app to verify setup:
                  </Typography>
                  <TextField
                    fullWidth
                    label="6-digit verification code"
                    variant="outlined"
                    value={verificationCode}
                    onChange={handleVerificationCodeChange}
                    inputProps={{ 
                      maxLength: 6,
                      inputMode: 'numeric',
                      pattern: '[0-9]*'
                    }}
                    sx={{ mb: 2 }}
                  />
                </Box>
              </Box>
            )}

            {activeStep === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Two-Factor Authentication Enabled
                </Typography>
                <Typography paragraph>
                  Your account is now protected with two-factor authentication. You'll need to enter a verification code from your authenticator app when you sign in.
                </Typography>

                <Box 
                  bgcolor="success.light" 
                  color="success.contrastText" 
                  p={2} 
                  borderRadius={1}
                  my={3}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    Important: Save Your Backup Codes
                  </Typography>
                  <Typography>
                    If you lose access to your authenticator app, you can use one of these backup codes to sign in. Each code can only be used once.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="inherit" 
                    onClick={handleShowBackupCodes}
                    sx={{ mt: 1 }}
                  >
                    View Backup Codes
                  </Button>
                </Box>

                <Typography variant="subtitle2" color="text.secondary">
                  We recommend saving these codes in a secure password manager.
                </Typography>
              </Box>
            )}
          </>
        )}

        <Box display="flex" justifyContent="space-between" mt={4}>
          {activeStep > 0 && activeStep < 2 && (
            <Button onClick={handleBack} disabled={loading}>
              Back
            </Button>
          )}
          <Box flexGrow={1} />
          {activeStep < 2 ? (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleNext}
              disabled={loading || (activeStep === 1 && verificationCode.length !== 6)}
            >
              {activeStep === 1 ? 'Verify' : 'Next'}
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleComplete}
            >
              Finish
            </Button>
          )}
        </Box>
      </CardContent>

      {/* Backup Codes Dialog */}
      <Dialog
        open={showBackupCodes}
        onClose={handleHideBackupCodes}
        aria-labelledby="backup-codes-dialog-title"
      >
        <DialogTitle id="backup-codes-dialog-title">
          Your Backup Codes
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Save these backup codes in a secure location. Each code can only be used once.
          </DialogContentText>
          <Box 
            bgcolor="grey.100" 
            p={2} 
            borderRadius={1} 
            mt={2}
            fontFamily="monospace"
          >
            <Grid container spacing={2}>
              {backupCodes.map((code, index) => (
                <Grid item xs={6} key={index}>
                  <Typography variant="body2" fontWeight="bold">
                    {code}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleHideBackupCodes} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default MfaSetup;
