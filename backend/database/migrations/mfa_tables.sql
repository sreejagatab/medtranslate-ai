-- MFA Tables for MedTranslate AI

-- Add MFA columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_type VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_used_at TIMESTAMP;

-- Create MFA recovery codes table
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  UNIQUE(user_id, code)
);

-- Create trusted devices table
CREATE TABLE IF NOT EXISTS trusted_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  device_name TEXT,
  device_type TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  UNIQUE(user_id, device_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user_id ON mfa_recovery_codes(user_id);
