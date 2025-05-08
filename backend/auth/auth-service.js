/**
 * Authentication Service for MedTranslate AI
 *
 * This module provides authentication and authorization functionality
 * for the MedTranslate AI system.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// In a production environment, these would be stored in a secure database
// and the JWT keys would be stored in AWS Secrets Manager or similar
const JWT_PRIVATE_KEY_PATH = process.env.JWT_PRIVATE_KEY_PATH || path.join(__dirname, '../certs/jwt/private.key');
const JWT_PUBLIC_KEY_PATH = process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '../certs/jwt/public.key');

// Load JWT keys
let JWT_PRIVATE_KEY, JWT_PUBLIC_KEY;

try {
  // Check if keys exist
  if (fs.existsSync(JWT_PRIVATE_KEY_PATH) && fs.existsSync(JWT_PUBLIC_KEY_PATH)) {
    JWT_PRIVATE_KEY = fs.readFileSync(JWT_PRIVATE_KEY_PATH, 'utf8');
    JWT_PUBLIC_KEY = fs.readFileSync(JWT_PUBLIC_KEY_PATH, 'utf8');
  } else {
    // Fallback to symmetric algorithm with secret if keys don't exist
    console.warn('JWT RSA keys not found. Falling back to symmetric algorithm.');
    JWT_PRIVATE_KEY = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
      ? (() => { throw new Error('JWT_SECRET must be set in production environment'); })()
      : crypto.randomBytes(64).toString('hex')); // Generate a strong random secret in development
    JWT_PUBLIC_KEY = JWT_PRIVATE_KEY;
  }
} catch (error) {
  console.error('Error loading JWT keys:', error);
  // Fallback to symmetric algorithm with secret
  JWT_PRIVATE_KEY = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET must be set in production environment'); })()
    : crypto.randomBytes(64).toString('hex')); // Generate a strong random secret in development
  JWT_PUBLIC_KEY = JWT_PRIVATE_KEY;
}

// JWT algorithm - use RS256 if we have RSA keys, otherwise fall back to HS256
const JWT_ALGORITHM = JWT_PRIVATE_KEY !== JWT_PUBLIC_KEY ? 'RS256' : 'HS256';

// Set appropriate token expiry times
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '8h'; // Provider session token expiry
const TEMP_TOKEN_EXPIRY = process.env.TEMP_TOKEN_EXPIRY || '4h'; // Patient temporary token expiry

// Mock user database for development
const USERS_FILE = path.join(__dirname, '../../data/users.json');
const SESSIONS_FILE = path.join(__dirname, '../../data/sessions.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  // Create initial users with secure password hashing
  const provider1Password = hashPassword('password123');
  const provider2Password = hashPassword('password123');
  const adminPassword = hashPassword('admin123');

  const initialUsers = {
    'provider-001': {
      id: 'provider-001',
      name: 'Dr. John Smith',
      email: 'john.smith@example.com',
      role: 'provider',
      specialty: 'cardiology',
      passwordHash: provider1Password.hash,
      passwordSalt: provider1Password.salt,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    'provider-002': {
      id: 'provider-002',
      name: 'Dr. Maria Garcia',
      email: 'maria.garcia@example.com',
      role: 'provider',
      specialty: 'neurology',
      passwordHash: provider2Password.hash,
      passwordSalt: provider2Password.salt,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    'admin-001': {
      id: 'admin-001',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      passwordHash: adminPassword.hash,
      passwordSalt: adminPassword.salt,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  // Create users directory if it doesn't exist
  const usersDir = path.dirname(USERS_FILE);
  if (!fs.existsSync(usersDir)) {
    fs.mkdirSync(usersDir, { recursive: true });
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
  console.log('Created initial users file with secure password hashing');
}

// Initialize sessions file if it doesn't exist
if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2));
}

/**
 * Generate a random salt
 *
 * @returns {string} - Random salt
 */
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash a password using PBKDF2 with salt
 *
 * @param {string} password - Plain text password
 * @param {string} salt - Salt for password hashing (optional, will be generated if not provided)
 * @returns {Object} - Object containing hashed password and salt
 */
function hashPassword(password, salt = null) {
  // Generate salt if not provided
  const passwordSalt = salt || generateSalt();

  // Use PBKDF2 with 10000 iterations and SHA-512
  const hashedPassword = crypto.pbkdf2Sync(
    password,
    passwordSalt,
    10000,
    64,
    'sha512'
  ).toString('hex');

  return {
    hash: hashedPassword,
    salt: passwordSalt
  };
}

/**
 * Verify a password against a stored hash and salt
 *
 * @param {string} password - Plain text password to verify
 * @param {string} storedHash - Stored password hash
 * @param {string} storedSalt - Stored salt
 * @returns {boolean} - Whether the password is valid
 */
function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = hashPassword(password, storedSalt);
  return hash === storedHash;
}

/**
 * Authenticate a user with email and password
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object|null} - User object if authentication successful, null otherwise
 */
function authenticateUser(email, password) {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

  // Find user by email
  const user = Object.values(users).find(u => u.email === email);

  if (!user) {
    return null;
  }

  // Check if user has the new password format (with salt)
  if (user.passwordSalt) {
    // Verify password using the new method
    if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      return null;
    }
  } else {
    // Legacy password check (SHA-256 without salt)
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    if (legacyHash !== user.passwordHash) {
      return null;
    }

    // Upgrade to new password format
    console.log(`Upgrading password hash for user ${user.id}`);
    upgradeUserPassword(user.id, password);
  }

  // Return user without password-related fields
  const { passwordHash, passwordSalt, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Upgrade a user's password to the new hashing method
 *
 * @param {string} userId - User ID
 * @param {string} password - Plain text password
 */
function upgradeUserPassword(userId, password) {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

    if (!users[userId]) {
      console.error(`User ${userId} not found for password upgrade`);
      return;
    }

    // Generate new hash and salt
    const { hash, salt } = hashPassword(password);

    // Update user record
    users[userId].passwordHash = hash;
    users[userId].passwordSalt = salt;
    users[userId].updatedAt = new Date().toISOString();

    // Save updated users
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log(`Password upgraded for user ${userId}`);
  } catch (error) {
    console.error('Error upgrading user password:', error);
  }
}

/**
 * Generate a JWT token for a user
 *
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
function generateToken(user) {
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    type: 'provider'
  };

  return jwt.sign(payload, JWT_PRIVATE_KEY, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: JWT_ALGORITHM, // Use RS256 if available, fallback to HS256
    issuer: 'medtranslate-ai',
    audience: 'medtranslate-api',
    notBefore: 0 // Token is valid immediately
  });
}

/**
 * Generate a temporary patient session token
 *
 * @param {string} sessionId - Session ID
 * @param {string} language - Patient language
 * @returns {Object} - Token and session code
 */
function generatePatientSessionToken(sessionId, language) {
  // Generate a random session code for easy joining
  const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();

  const payload = {
    sub: `patient-${crypto.randomUUID()}`,
    sessionId,
    sessionCode,
    language,
    type: 'patient'
  };

  const token = jwt.sign(payload, JWT_PRIVATE_KEY, {
    expiresIn: TEMP_TOKEN_EXPIRY,
    algorithm: JWT_ALGORITHM, // Use RS256 if available, fallback to HS256
    issuer: 'medtranslate-ai',
    audience: 'medtranslate-api',
    notBefore: 0 // Token is valid immediately
  });

  // Store the session information
  const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  sessions[sessionId] = {
    sessionId,
    sessionCode,
    patientToken: token,
    language,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));

  return { token, sessionCode };
}

/**
 * Verify and decode a JWT token with enhanced security checks
 *
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    // Verify with explicit options for enhanced security
    const decoded = jwt.verify(token, JWT_PUBLIC_KEY, {
      algorithms: [JWT_ALGORITHM], // Accept tokens signed with our algorithm
      issuer: 'medtranslate-ai',
      audience: 'medtranslate-api',
      complete: true // Return the decoded header and payload
    });

    // Additional security checks
    const now = Math.floor(Date.now() / 1000);

    // Check if token is expired
    if (decoded.payload.exp && decoded.payload.exp < now) {
      console.warn('Token expired');
      return null;
    }

    // Check if token is not yet valid
    if (decoded.payload.nbf && decoded.payload.nbf > now) {
      console.warn('Token not yet valid');
      return null;
    }

    // Return only the payload for backward compatibility
    return decoded.payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Join a session with session code
 *
 * @param {string} sessionCode - Session code
 * @returns {Object} - Session join result
 */
function joinSessionWithCode(sessionCode) {
  try {
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));

    // Find session by code
    const session = Object.values(sessions).find(s =>
      s.sessionCode === sessionCode && s.status === 'active'
    );

    if (!session) {
      return { success: false, error: 'Invalid session code or expired session' };
    }

    // Check if the token is still valid by trying to verify it
    const decodedToken = verifyToken(session.patientToken);
    if (!decodedToken) {
      return { success: false, error: 'Session has expired' };
    }

    return {
      success: true,
      token: session.patientToken,
      sessionId: session.sessionId,
      language: session.language
    };
  } catch (error) {
    console.error('Error joining session:', error);
    return { success: false, error: 'Session join failed' };
  }
}

/**
 * Create a new session
 *
 * @param {string} providerId - Provider ID
 * @param {string} patientLanguage - Patient language
 * @param {string} context - Medical context
 * @returns {Object} - New session information
 */
function createSession(providerId, patientLanguage, context = 'general') {
  const sessionId = `session-${crypto.randomUUID()}`;
  const { token, sessionCode } = generatePatientSessionToken(sessionId, patientLanguage);

  // Store additional session information
  const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  sessions[sessionId] = {
    ...sessions[sessionId],
    providerId,
    context,
    startTime: new Date().toISOString()
  };
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));

  return {
    sessionId,
    sessionCode,
    patientToken: token,
    patientLanguage,
    context
  };
}

/**
 * End a session
 *
 * @param {string} sessionId - Session ID
 * @returns {Object} - Result of ending the session
 */
function endSession(sessionId) {
  try {
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));

    if (!sessions[sessionId]) {
      return { success: false, error: 'Session not found' };
    }

    sessions[sessionId].status = 'ended';
    sessions[sessionId].endTime = new Date().toISOString();

    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));

    return { success: true };
  } catch (error) {
    console.error('Error ending session:', error);
    return { success: false, error: 'Failed to end session' };
  }
}

/**
 * Register a new user
 *
 * @param {Object} userData - User data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @param {string} userData.role - User's role (default: 'provider')
 * @param {string} userData.specialty - User's specialty (for providers)
 * @returns {Object} - Result of registration
 */
function registerUser(userData) {
  try {
    // Validate required fields
    if (!userData.name || !userData.email || !userData.password) {
      return {
        success: false,
        error: 'Name, email, and password are required'
      };
    }

    // Load existing users
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

    // Check if email already exists
    if (Object.values(users).some(user => user.email === userData.email)) {
      return {
        success: false,
        error: 'Email already in use'
      };
    }

    // Generate user ID
    const userId = `user-${Date.now()}`;

    // Hash password
    const { hash, salt } = hashPassword(userData.password);

    // Create user object
    const newUser = {
      id: userId,
      name: userData.name,
      email: userData.email,
      role: userData.role || 'provider',
      specialty: userData.specialty || 'general',
      passwordHash: hash,
      passwordSalt: salt,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add user to users object
    users[userId] = newUser;

    // Save updated users
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    // Return success with user info (excluding password)
    const { passwordHash, passwordSalt, ...userWithoutPassword } = newUser;
    return {
      success: true,
      user: userWithoutPassword
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      error: 'Registration failed'
    };
  }
}

/**
 * Get all users
 *
 * @param {Object} options - Options for filtering users
 * @param {string} options.role - Filter by role
 * @param {boolean} options.active - Filter by active status
 * @returns {Array} - Array of users (without password hashes)
 */
function getUsers(options = {}) {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

    // Filter users based on options
    let filteredUsers = Object.values(users);

    if (options.role) {
      filteredUsers = filteredUsers.filter(user => user.role === options.role);
    }

    if (options.active !== undefined) {
      filteredUsers = filteredUsers.filter(user => user.active === options.active);
    }

    // Remove password hashes
    return filteredUsers.map(user => {
      const { passwordHash, passwordSalt, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

/**
 * Update a user
 *
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Object} - Result of update
 */
function updateUser(userId, updates) {
  try {
    // Load existing users
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

    // Check if user exists
    if (!users[userId]) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Check if trying to update email to one that already exists
    if (updates.email && updates.email !== users[userId].email) {
      const emailExists = Object.values(users).some(
        user => user.id !== userId && user.email === updates.email
      );

      if (emailExists) {
        return {
          success: false,
          error: 'Email already in use'
        };
      }
    }

    // Update password if provided
    if (updates.password) {
      const { hash, salt } = hashPassword(updates.password);
      updates.passwordHash = hash;
      updates.passwordSalt = salt;
      delete updates.password;
    }

    // Update user
    users[userId] = {
      ...users[userId],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Save updated users
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    // Return success with updated user info (excluding password)
    const { passwordHash, passwordSalt, ...userWithoutPassword } = users[userId];
    return {
      success: true,
      user: userWithoutPassword
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      success: false,
      error: 'Update failed'
    };
  }
}

module.exports = {
  authenticateUser,
  generateToken,
  generatePatientSessionToken,
  verifyToken,
  joinSessionWithCode,
  createSession,
  endSession,
  registerUser,
  getUsers,
  updateUser,
  verifyPassword
};
