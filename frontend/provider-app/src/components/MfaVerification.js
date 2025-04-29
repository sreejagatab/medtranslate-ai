import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CircularProgress, 
  Divider, 
  TextField, 
  Typography,
  Link
} from '@mui/material';
import { API_URL } from '../config';

/**
 * MFA Verification Component
 * 
 * This component handles MFA verification during login.
 */
const MfaVerification = ({ onVerify, onCancel, provider }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Handle verification code change
  const handleVerificationCodeChange = (e) => {
    // Only allow digits and hyphens for backup codes
    const value = useBackupCode 
      ? e.target.value.replace(/[^0-9A-Za-z-]/g, '') 
      : e.target.value.replace(/[^0-9]/g, '');
    
    // Limit to 6 digits for regular code or 9 chars for backup code
    if ((!useBackupCode && value.length <= 6) || (useBackupCode && value.length <= 9)) {
      setVerificationCode(value);
    }
  };

  // Handle verification
  const handleVerify = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate verification code
      if (!verificationCode || 
          (!useBackupCode && verificationCode.length !== 6) ||
          (useBackupCode && verificationCode.length < 8)) {
        setError(useBackupCode 
          ? 'Please enter a valid backup code' 
          : 'Please enter a valid 6-digit verification code');
        setLoading(false);
        return;
      }

      // Call the onVerify callback with the verification code
      if (onVerify) {
        await onVerify(verificationCode, useBackupCode);
      }
    } catch (error) {
      console.error('Error during MFA verification:', error);
      setError(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Toggle between regular code and backup code
  const toggleUseBackupCode = () => {
    setVerificationCode('');
    setUseBackupCode(!useBackupCode);
    setError('');
  };

  return (
    <Card>
      <CardHeader 
        title="Two-Factor Authentication Required" 
        subheader={`Please verify your identity, ${provider?.name || 'User'}`}
      />
      <Divider />
      <CardContent>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {!useBackupCode ? (
              <>
                <Typography paragraph>
                  Enter the 6-digit verification code from your authenticator app:
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
                  autoFocus
                  sx={{ mb: 2 }}
                />
              </>
            ) : (
              <>
                <Typography paragraph>
                  Enter one of your backup codes:
                </Typography>
                <TextField
                  fullWidth
                  label="Backup code"
                  variant="outlined"
                  value={verificationCode}
                  onChange={handleVerificationCodeChange}
                  placeholder="XXXX-XXXX"
                  autoFocus
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Box mt={2}>
              <Link 
                component="button"
                variant="body2"
                onClick={toggleUseBackupCode}
                underline="hover"
              >
                {useBackupCode 
                  ? "Use authenticator app instead" 
                  : "Use a backup code instead"}
              </Link>
            </Box>

            <Box display="flex" justifyContent="space-between" mt={4}>
              <Button 
                variant="outlined" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleVerify}
                disabled={loading || 
                  (!useBackupCode && verificationCode.length !== 6) ||
                  (useBackupCode && verificationCode.length < 8)}
              >
                Verify
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MfaVerification;
