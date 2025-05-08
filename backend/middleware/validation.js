/**
 * Input Validation Middleware for MedTranslate AI
 * 
 * This module provides validation middleware for API routes.
 */

/**
 * Validate request body against a schema
 * 
 * @param {Object} schema - Validation schema
 * @returns {Function} - Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
}

/**
 * Validate request query parameters against a schema
 * 
 * @param {Object} schema - Validation schema
 * @returns {Function} - Express middleware
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
}

/**
 * Validate request parameters against a schema
 * 
 * @param {Object} schema - Validation schema
 * @returns {Function} - Express middleware
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
}

/**
 * Sanitize request body
 * 
 * @param {Array<string>} fields - Fields to sanitize
 * @returns {Function} - Express middleware
 */
function sanitizeBody(fields) {
  return (req, res, next) => {
    if (!req.body) {
      return next();
    }
    
    fields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        // Basic sanitization - remove HTML tags and trim
        req.body[field] = req.body[field]
          .replace(/<[^>]*>/g, '')
          .trim();
      }
    });
    
    next();
  };
}

/**
 * Sanitize request query parameters
 * 
 * @param {Array<string>} fields - Fields to sanitize
 * @returns {Function} - Express middleware
 */
function sanitizeQuery(fields) {
  return (req, res, next) => {
    if (!req.query) {
      return next();
    }
    
    fields.forEach(field => {
      if (req.query[field] && typeof req.query[field] === 'string') {
        // Basic sanitization - remove HTML tags and trim
        req.query[field] = req.query[field]
          .replace(/<[^>]*>/g, '')
          .trim();
      }
    });
    
    next();
  };
}

/**
 * Validate and sanitize request
 * 
 * @param {Object} options - Validation options
 * @param {Object} options.body - Body validation schema
 * @param {Object} options.query - Query validation schema
 * @param {Object} options.params - Params validation schema
 * @param {Array<string>} options.sanitizeBody - Body fields to sanitize
 * @param {Array<string>} options.sanitizeQuery - Query fields to sanitize
 * @returns {Array<Function>} - Express middleware
 */
function validate(options = {}) {
  const middleware = [];
  
  // Add body validation
  if (options.body) {
    middleware.push(validateBody(options.body));
  }
  
  // Add query validation
  if (options.query) {
    middleware.push(validateQuery(options.query));
  }
  
  // Add params validation
  if (options.params) {
    middleware.push(validateParams(options.params));
  }
  
  // Add body sanitization
  if (options.sanitizeBody) {
    middleware.push(sanitizeBody(options.sanitizeBody));
  }
  
  // Add query sanitization
  if (options.sanitizeQuery) {
    middleware.push(sanitizeQuery(options.sanitizeQuery));
  }
  
  return middleware;
}

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  sanitizeBody,
  sanitizeQuery,
  validate
};
