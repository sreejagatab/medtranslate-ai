/**
 * Validation Schemas for MedTranslate AI
 * 
 * This module provides validation schemas for API routes.
 */

const Joi = require('joi');

// Authentication schemas
const authSchemas = {
  // Login schema
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    deviceInfo: Joi.object({
      name: Joi.string(),
      type: Joi.string(),
      ipAddress: Joi.string(),
      userAgent: Joi.string()
    })
  }),
  
  // Registration schema
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('provider', 'admin').default('provider'),
    specialty: Joi.string().allow('', null)
  }),
  
  // Token verification schema
  verifyToken: Joi.object({
    token: Joi.string().required()
  }),
  
  // MFA verification schema
  verifyMfa: Joi.object({
    userId: Joi.string().required(),
    token: Joi.string().required()
  }),
  
  // MFA setup schema
  setupMfa: Joi.object({
    userId: Joi.string().required()
  })
};

// Session schemas
const sessionSchemas = {
  // Create session schema
  createSession: Joi.object({
    providerId: Joi.string().required(),
    patientLanguage: Joi.string().required(),
    context: Joi.string().default('general')
  }),
  
  // Join session schema
  joinSession: Joi.object({
    sessionCode: Joi.string().required()
  }),
  
  // Generate patient token schema
  generatePatientToken: Joi.object({
    sessionId: Joi.string().required(),
    language: Joi.string().required()
  }),
  
  // End session schema
  endSession: Joi.object({
    sessionId: Joi.string().required()
  })
};

// Translation schemas
const translationSchemas = {
  // Translate text schema
  translateText: Joi.object({
    text: Joi.string().required(),
    sourceLanguage: Joi.string().required(),
    targetLanguage: Joi.string().required(),
    sessionId: Joi.string().allow('', null),
    context: Joi.string().allow('', null),
    specialty: Joi.string().allow('', null)
  }),
  
  // Translate audio schema
  translateAudio: Joi.object({
    audio: Joi.string().required(), // Base64 encoded audio
    sourceLanguage: Joi.string().required(),
    targetLanguage: Joi.string().required(),
    sessionId: Joi.string().allow('', null),
    context: Joi.string().allow('', null),
    specialty: Joi.string().allow('', null)
  }),
  
  // Process feedback schema
  processFeedback: Joi.object({
    translationId: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required(),
    feedback: Joi.string().allow('', null),
    correctedTranslation: Joi.string().allow('', null)
  })
};

// Storage schemas
const storageSchemas = {
  // Store transcript schema
  storeTranscript: Joi.object({
    sessionId: Joi.string().required(),
    transcript: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        text: Joi.string().required(),
        translation: Joi.string().required(),
        sourceLanguage: Joi.string().required(),
        targetLanguage: Joi.string().required(),
        timestamp: Joi.string().required(),
        speaker: Joi.string().required()
      })
    ).required()
  }),
  
  // Get session data schema
  getSessionData: Joi.object({
    sessionId: Joi.string().required()
  })
};

// Monitoring schemas
const monitoringSchemas = {
  // Start transaction schema
  startTransaction: Joi.object({
    userId: Joi.string().required(),
    sessionId: Joi.string().required(),
    type: Joi.string().required(),
    metadata: Joi.object().allow(null)
  }),
  
  // Update transaction schema
  updateTransaction: Joi.object({
    transactionId: Joi.string().required(),
    status: Joi.string().required(),
    metadata: Joi.object().allow(null)
  }),
  
  // Complete transaction schema
  completeTransaction: Joi.object({
    transactionId: Joi.string().required(),
    result: Joi.object().allow(null),
    metadata: Joi.object().allow(null)
  })
};

// User schemas
const userSchemas = {
  // Get users schema
  getUsers: Joi.object({
    role: Joi.string().allow('', null),
    active: Joi.boolean()
  }),
  
  // Update user schema
  updateUser: Joi.object({
    userId: Joi.string().required(),
    name: Joi.string().min(2).max(100),
    email: Joi.string().email(),
    password: Joi.string().min(8),
    role: Joi.string().valid('provider', 'admin'),
    specialty: Joi.string().allow('', null),
    active: Joi.boolean()
  })
};

// Parameter schemas
const paramSchemas = {
  // User ID parameter schema
  userId: Joi.object({
    userId: Joi.string().required()
  }),
  
  // Session ID parameter schema
  sessionId: Joi.object({
    sessionId: Joi.string().required()
  }),
  
  // Transaction ID parameter schema
  transactionId: Joi.object({
    transactionId: Joi.string().required()
  })
};

module.exports = {
  authSchemas,
  sessionSchemas,
  translationSchemas,
  storageSchemas,
  monitoringSchemas,
  userSchemas,
  paramSchemas
};
