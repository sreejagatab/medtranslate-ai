/**
 * Test Data Utilities for E2E Tests
 * 
 * This file contains utilities for managing test data in E2E tests.
 */

const axios = require('axios');
const { config } = require('../config/setup');

/**
 * Generate a random string
 * 
 * @param {number} length - Length of the string
 * @returns {string} - Random string
 */
function generateRandomString(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Generate a random email
 * 
 * @returns {string} - Random email
 */
function generateRandomEmail() {
  return `test.${generateRandomString(8)}@example.com`;
}

/**
 * Generate a random password
 * 
 * @returns {string} - Random password
 */
function generateRandomPassword() {
  return `Test${generateRandomString(8)}!`;
}

/**
 * Generate test patient data
 * 
 * @returns {Object} - Test patient data
 */
function generatePatientData() {
  return {
    email: generateRandomEmail(),
    password: generateRandomPassword(),
    firstName: `TestPatient${generateRandomString(4)}`,
    lastName: `TestLastName${generateRandomString(4)}`,
    preferredLanguage: 'es', // Spanish
    dateOfBirth: '1990-01-01'
  };
}

/**
 * Generate test provider data
 * 
 * @returns {Object} - Test provider data
 */
function generateProviderData() {
  return {
    email: generateRandomEmail(),
    password: generateRandomPassword(),
    firstName: `TestProvider${generateRandomString(4)}`,
    lastName: `TestLastName${generateRandomString(4)}`,
    specialty: 'cardiology',
    languages: ['en', 'fr'] // English, French
  };
}

/**
 * Generate test translation data
 * 
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Object} - Test translation data
 */
function generateTranslationData(sourceLanguage = 'en', targetLanguage = 'es') {
  const translationPhrases = {
    en: [
      'How are you feeling today?',
      'Do you have any pain?',
      'Where does it hurt?',
      'On a scale of 1 to 10, how severe is your pain?',
      'Have you taken any medication?',
      'Do you have any allergies?',
      'When did the symptoms start?',
      'Have you had this condition before?',
      'I need to check your blood pressure.',
      'I need to check your temperature.'
    ],
    es: [
      '¿Cómo se siente hoy?',
      '¿Tiene algún dolor?',
      '¿Dónde le duele?',
      'En una escala del 1 al 10, ¿qué tan severo es su dolor?',
      '¿Ha tomado algún medicamento?',
      '¿Tiene alguna alergia?',
      '¿Cuándo comenzaron los síntomas?',
      '¿Ha tenido esta condición antes?',
      'Necesito revisar su presión arterial.',
      'Necesito revisar su temperatura.'
    ],
    fr: [
      'Comment vous sentez-vous aujourd\'hui?',
      'Avez-vous des douleurs?',
      'Où avez-vous mal?',
      'Sur une échelle de 1 à 10, quelle est l\'intensité de votre douleur?',
      'Avez-vous pris des médicaments?',
      'Avez-vous des allergies?',
      'Quand les symptômes ont-ils commencé?',
      'Avez-vous déjà eu cette condition auparavant?',
      'Je dois vérifier votre tension artérielle.',
      'Je dois vérifier votre température.'
    ]
  };
  
  // Get random phrase from source language
  const randomIndex = Math.floor(Math.random() * translationPhrases[sourceLanguage].length);
  const sourceText = translationPhrases[sourceLanguage][randomIndex];
  
  return {
    sourceLanguage,
    targetLanguage,
    sourceText,
    medicalContext: 'general',
    sessionId: `test-session-${generateRandomString(8)}`
  };
}

/**
 * Create a test user via API
 * 
 * @param {string} userType - Type of user (provider, patient, admin)
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user data
 */
async function createTestUser(userType, userData) {
  try {
    const response = await axios.post(
      `${config.urls.backend}/api/test/create-user`,
      {
        userType,
        userData
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Auth-Key': process.env.TEST_AUTH_KEY || 'test-auth-key'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error creating test ${userType}:`, error.message);
    throw error;
  }
}

/**
 * Clean up test data
 * 
 * @param {Array<string>} userIds - Array of user IDs to clean up
 * @returns {Promise<void>}
 */
async function cleanupTestData(userIds = []) {
  try {
    await axios.post(
      `${config.urls.backend}/api/test/cleanup`,
      {
        userIds
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Auth-Key': process.env.TEST_AUTH_KEY || 'test-auth-key'
        }
      }
    );
    
    console.log('Test data cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up test data:', error.message);
    throw error;
  }
}

module.exports = {
  generateRandomString,
  generateRandomEmail,
  generateRandomPassword,
  generatePatientData,
  generateProviderData,
  generateTranslationData,
  createTestUser,
  cleanupTestData
};
