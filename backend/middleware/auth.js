/**
 * Authentication Middleware for MedTranslate AI
 *
 * Provides middleware functions for authenticating API requests
 */

const jwt = require('jsonwebtoken');

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret';

/**
 * Extract token from request headers
 *
 * @param {Object} req Express request object
 * @returns {string|null} JWT token or null if not found
 */
const getTokenFromHeader = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

/**
 * Authenticate user middleware
 *
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next function
 */
const authenticate = (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Authenticate admin middleware
 *
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next function
 */
const authenticateAdmin = (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        message: 'Admin access required'
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);

    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Authenticate provider middleware
 *
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next function
 */
const authenticateProvider = (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'provider' && decoded.role !== 'admin') {
      return res.status(403).json({
        message: 'Provider access required'
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    console.error('Provider authentication error:', error);

    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Protect routes - middleware to check if user is authenticated
 *
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next function
 */
const protect = (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Authorize roles - middleware to check if user has required role
 *
 * @param {...string} roles Allowed roles
 * @returns {Function} Middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role ${req.user.role} is not authorized to access this resource`
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authenticateAdmin,
  authenticateProvider,
  getTokenFromHeader,
  protect,
  authorize
};
