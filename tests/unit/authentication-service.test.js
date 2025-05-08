/**
 * Unit tests for the Authentication Service
 */

const jwt = require('jsonwebtoken');
const authService = require('../../backend/services/authentication');
const userRepository = require('../../backend/repositories/user-repository');
const sessionRepository = require('../../backend/repositories/session-repository');
const { MFAService } = require('../../backend/services/mfa-service');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../backend/repositories/user-repository');
jest.mock('../../backend/repositories/session-repository');
jest.mock('../../backend/services/mfa-service');

describe('Authentication Service', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock process.env
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRY = '1h';
    process.env.REFRESH_TOKEN_EXPIRY = '7d';
  });

  describe('Login functionality', () => {
    it('should authenticate a user with valid credentials', async () => {
      // Mock user repository to return a user
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'provider',
        mfaEnabled: false
      };
      
      userRepository.findByEmail.mockResolvedValue(mockUser);
      userRepository.verifyPassword.mockResolvedValue(true);
      
      // Mock JWT token generation
      jwt.sign.mockImplementation(() => 'mock-token');
      
      // Call the login function
      const result = await authService.login('test@example.com', 'password123');
      
      // Verify user was looked up
      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      
      // Verify password was verified
      expect(userRepository.verifyPassword).toHaveBeenCalledWith(mockUser, 'password123');
      
      // Verify token was generated
      expect(jwt.sign).toHaveBeenCalled();
      
      // Verify result contains token
      expect(result).toHaveProperty('token', 'mock-token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id', 'user123');
      expect(result.user).toHaveProperty('email', 'test@example.com');
      expect(result.user).toHaveProperty('role', 'provider');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should reject login with invalid email', async () => {
      // Mock user repository to return null (user not found)
      userRepository.findByEmail.mockResolvedValue(null);
      
      // Call the login function and expect it to throw
      await expect(authService.login('nonexistent@example.com', 'password123'))
        .rejects.toThrow('Invalid email or password');
      
      // Verify user lookup was attempted
      expect(userRepository.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      
      // Verify password verification was not attempted
      expect(userRepository.verifyPassword).not.toHaveBeenCalled();
      
      // Verify token was not generated
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should reject login with invalid password', async () => {
      // Mock user repository to return a user
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'provider'
      };
      
      userRepository.findByEmail.mockResolvedValue(mockUser);
      userRepository.verifyPassword.mockResolvedValue(false);
      
      // Call the login function and expect it to throw
      await expect(authService.login('test@example.com', 'wrong-password'))
        .rejects.toThrow('Invalid email or password');
      
      // Verify user was looked up
      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      
      // Verify password was verified
      expect(userRepository.verifyPassword).toHaveBeenCalledWith(mockUser, 'wrong-password');
      
      // Verify token was not generated
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should require MFA verification for users with MFA enabled', async () => {
      // Mock user repository to return a user with MFA enabled
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'provider',
        mfaEnabled: true
      };
      
      userRepository.findByEmail.mockResolvedValue(mockUser);
      userRepository.verifyPassword.mockResolvedValue(true);
      
      // Call the login function
      const result = await authService.login('test@example.com', 'password123');
      
      // Verify result indicates MFA is required
      expect(result).toHaveProperty('requireMfa', true);
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id', 'user123');
      expect(result).not.toHaveProperty('token');
    });
  });

  describe('Token generation and verification', () => {
    it('should generate a valid JWT token', () => {
      // Mock user data
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        role: 'provider'
      };
      
      // Mock JWT sign
      jwt.sign.mockReturnValue('mock-token');
      
      // Generate token
      const token = authService.generateToken(userData);
      
      // Verify JWT sign was called with correct parameters
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user123',
          email: 'test@example.com',
          role: 'provider'
        }),
        'test-secret',
        expect.objectContaining({
          expiresIn: '1h'
        })
      );
      
      // Verify token was returned
      expect(token).toBe('mock-token');
    });

    it('should verify a valid token', () => {
      // Mock decoded token data
      const decodedToken = {
        id: 'user123',
        email: 'test@example.com',
        role: 'provider',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      
      // Mock JWT verify
      jwt.verify.mockReturnValue(decodedToken);
      
      // Verify token
      const result = authService.verifyToken('valid-token');
      
      // Verify JWT verify was called with correct parameters
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      
      // Verify decoded token was returned
      expect(result).toEqual(decodedToken);
    });

    it('should reject an invalid token', () => {
      // Mock JWT verify to throw an error
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Verify token and expect it to throw
      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid token');
      
      // Verify JWT verify was called
      expect(jwt.verify).toHaveBeenCalledWith('invalid-token', 'test-secret');
    });

    it('should reject an expired token', () => {
      // Mock JWT verify to throw a TokenExpiredError
      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });
      
      // Verify token and expect it to throw
      expect(() => authService.verifyToken('expired-token')).toThrow('Token expired');
      
      // Verify JWT verify was called
      expect(jwt.verify).toHaveBeenCalledWith('expired-token', 'test-secret');
    });
  });

  describe('Session management', () => {
    it('should create a new session', async () => {
      // Mock session data
      const sessionData = {
        userId: 'user123',
        deviceId: 'device123',
        ipAddress: '127.0.0.1'
      };
      
      // Mock session repository
      const mockSession = {
        id: 'session123',
        ...sessionData,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };
      
      sessionRepository.create.mockResolvedValue(mockSession);
      
      // Create session
      const session = await authService.createSession(sessionData);
      
      // Verify session repository was called
      expect(sessionRepository.create).toHaveBeenCalledWith(sessionData);
      
      // Verify session was returned
      expect(session).toEqual(mockSession);
    });

    it('should retrieve an active session', async () => {
      // Mock session repository
      const mockSession = {
        id: 'session123',
        userId: 'user123',
        deviceId: 'device123',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };
      
      sessionRepository.findById.mockResolvedValue(mockSession);
      
      // Get session
      const session = await authService.getSession('session123');
      
      // Verify session repository was called
      expect(sessionRepository.findById).toHaveBeenCalledWith('session123');
      
      // Verify session was returned
      expect(session).toEqual(mockSession);
    });

    it('should terminate a session', async () => {
      // Mock session repository
      sessionRepository.terminate.mockResolvedValue(true);
      
      // Terminate session
      const result = await authService.terminateSession('session123');
      
      // Verify session repository was called
      expect(sessionRepository.terminate).toHaveBeenCalledWith('session123');
      
      // Verify result
      expect(result).toBe(true);
    });
  });

  describe('MFA implementation', () => {
    it('should generate MFA setup data', async () => {
      // Mock MFA service
      const mockSetupData = {
        secret: 'mfa-secret',
        qrCode: 'data:image/png;base64,qrcode-data',
        otpauth_url: 'otpauth://totp/MedTranslate:test@example.com?secret=mfa-secret&issuer=MedTranslate'
      };
      
      MFAService.generateSetup.mockResolvedValue(mockSetupData);
      
      // Generate MFA setup
      const setupData = await authService.generateMfaSetup('test@example.com');
      
      // Verify MFA service was called
      expect(MFAService.generateSetup).toHaveBeenCalledWith('test@example.com');
      
      // Verify setup data was returned
      expect(setupData).toEqual(mockSetupData);
    });

    it('should verify a valid MFA token', async () => {
      // Mock MFA service
      MFAService.verifyToken.mockResolvedValue(true);
      
      // Verify MFA token
      const result = await authService.verifyMfaToken('user123', '123456');
      
      // Verify MFA service was called
      expect(MFAService.verifyToken).toHaveBeenCalledWith('user123', '123456');
      
      // Verify result
      expect(result).toBe(true);
    });

    it('should reject an invalid MFA token', async () => {
      // Mock MFA service
      MFAService.verifyToken.mockResolvedValue(false);
      
      // Verify MFA token
      const result = await authService.verifyMfaToken('user123', '999999');
      
      // Verify MFA service was called
      expect(MFAService.verifyToken).toHaveBeenCalledWith('user123', '999999');
      
      // Verify result
      expect(result).toBe(false);
    });
  });

  describe('Role-based access control', () => {
    it('should check if a user has a specific role', () => {
      // Mock user data
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        role: 'admin'
      };
      
      // Check role
      const hasRole = authService.hasRole(userData, 'admin');
      
      // Verify result
      expect(hasRole).toBe(true);
    });

    it('should check if a user has one of multiple roles', () => {
      // Mock user data
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        role: 'provider'
      };
      
      // Check roles
      const hasRole = authService.hasAnyRole(userData, ['admin', 'provider']);
      
      // Verify result
      expect(hasRole).toBe(true);
    });

    it('should reject if user does not have required role', () => {
      // Mock user data
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        role: 'patient'
      };
      
      // Check role
      const hasRole = authService.hasRole(userData, 'admin');
      
      // Verify result
      expect(hasRole).toBe(false);
    });
  });
});
