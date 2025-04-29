# MedTranslate AI - Authentication Improvements

This document outlines the authentication improvements implemented for the MedTranslate AI project, focusing on multi-factor authentication (MFA) and role-based access control (RBAC).

## Multi-Factor Authentication (MFA)

### Overview

Multi-factor authentication has been implemented to enhance security for all provider accounts. The implementation uses Time-based One-Time Password (TOTP) authentication, compatible with standard authenticator apps like Google Authenticator, Microsoft Authenticator, and Authy.

### Features

- **TOTP Authentication**: Secure 6-digit codes that change every 30 seconds
- **QR Code Setup**: Easy setup with QR code scanning
- **Backup Codes**: One-time use backup codes for emergency access
- **Graceful Degradation**: Fallback mechanisms when MFA services are unavailable

### Components

1. **Backend Services**:
   - `mfa-service.js`: Core MFA functionality (generating secrets, verifying codes)
   - `mfa-handler.js`: API endpoints for MFA operations
   - Integration with existing authentication flow

2. **Frontend Components**:
   - `MfaSetup.js`: Guided setup process for enabling MFA
   - `MfaVerification.js`: Verification during login
   - Profile page with MFA management

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/mfa/setup` | POST | Generate MFA setup information |
| `/auth/mfa/enable` | POST | Enable MFA for a user |
| `/auth/mfa/disable` | POST | Disable MFA for a user |
| `/auth/mfa/verify` | POST | Verify an MFA token |
| `/auth/mfa/status` | GET | Get MFA status for a user |

### Security Considerations

- MFA secrets are stored securely using encryption
- Backup codes are hashed before storage
- Rate limiting is applied to prevent brute force attacks
- Audit logging for all MFA-related actions

## Role-Based Access Control (RBAC)

### Overview

A comprehensive role-based access control system has been implemented to provide fine-grained access control across the application.

### Roles

The system defines the following roles with increasing levels of access:

- **Guest**: Limited access for unauthenticated users
- **Patient**: Basic access to translation services
- **Translator**: Access to translation services and history
- **Nurse**: Healthcare provider with standard clinical access
- **Doctor**: Healthcare provider with extended clinical access
- **Provider**: General healthcare provider role
- **Admin**: Full system access

### Permissions

Permissions are granular capabilities that can be assigned to roles or individual users:

- **User Management**: `user:create`, `user:read`, `user:update`, `user:delete`, `user:list`
- **Session Management**: `session:create`, `session:read`, `session:update`, `session:delete`, `session:list`
- **Translation**: `translation:perform`, `translation:history`
- **System**: `system:settings`, `system:logs`, `system:metrics`
- **MFA**: `mfa:manage`

Permissions can be scoped with suffixes:
- `:self` - Limited to the user's own resources
- `:own` - Limited to resources owned by the user

### Components

1. **Backend Services**:
   - `permissions-service.js`: Core RBAC functionality
   - `permissions-handler.js`: API endpoints for permission management
   - Integration with existing authentication flow

2. **Middleware**:
   - `rbac.js`: Express middleware for permission-based authorization
   - Various permission check functions

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/permissions/check` | POST | Check if a user has a specific permission |
| `/auth/permissions/user/:userId` | GET | Get all permissions for a user |
| `/auth/permissions/add` | POST | Add a permission to a user |
| `/auth/permissions/remove` | POST | Remove a permission from a user |
| `/auth/roles/change` | POST | Change a user's role |
| `/auth/roles` | GET | Get available roles |
| `/auth/roles/:role/permissions` | GET | Get permissions for a role |

## Implementation Details

### Dependencies

- `speakeasy`: For TOTP generation and verification
- `qrcode`: For generating QR codes for MFA setup
- `jsonwebtoken`: For token-based authentication
- `crypto`: For secure cryptographic operations

### Database Schema Updates

The provider schema has been extended with the following fields:

```javascript
{
  // Existing fields
  providerId: String,
  username: String,
  password: String,
  salt: String,
  name: String,
  role: String,
  
  // New fields
  mfaEnabled: Boolean,
  mfaSecret: String,
  backupCodes: Array<{
    code: String,
    used: Boolean
  }>,
  permissions: Array<String>
}
```

## Usage Examples

### Enabling MFA

```javascript
// Backend
const mfaService = require('./mfa-service');

// Generate MFA setup
const mfaSetup = await mfaService.generateMfaSecret(userId, username);

// Enable MFA
const result = await mfaService.enableMfa(userId, secret, verificationCode);
```

### Checking Permissions

```javascript
// Backend
const permissionsService = require('./permissions-service');

// Check if user has permission
const hasPermission = await permissionsService.hasPermission(userId, 'user:update:self');

// Get all user permissions
const permissions = await permissionsService.getUserPermissions(userId);
```

### Using RBAC Middleware

```javascript
// Express route with permission check
router.post('/users/:userId', 
  authenticate, 
  requirePermission('user:update'),
  (req, res) => {
    // Update user
  }
);

// Express route with role check
router.get('/admin/dashboard', 
  authenticate, 
  requireRole('admin'),
  (req, res) => {
    // Admin dashboard
  }
);
```

## Security Best Practices

1. **Defense in Depth**: Multiple layers of security controls
2. **Principle of Least Privilege**: Users have only the permissions they need
3. **Secure by Default**: Security features enabled by default
4. **Fail Securely**: Errors default to denying access
5. **Audit Logging**: All security-related events are logged

## Next Steps

1. **Advanced Threat Protection**: Implement IP-based rate limiting and suspicious activity detection
2. **Hardware Security Key Support**: Add support for WebAuthn/FIDO2 security keys
3. **Single Sign-On (SSO)**: Integrate with enterprise identity providers
4. **Conditional Access Policies**: Context-aware access controls based on device, location, and risk
5. **Security Compliance Reporting**: Generate reports for compliance requirements
