/**
 * Test Data Generator for MedTranslate AI Components
 * 
 * This module provides functions to generate realistic test data
 * for testing UI components with real-world scenarios.
 */

// Medical specialties
const SPECIALTIES = [
  'general', 'cardiology', 'neurology', 'orthopedics', 
  'pediatrics', 'oncology', 'emergency', 'gastroenterology'
];

// Languages
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' }
];

// Session statuses
const SESSION_STATUSES = ['active', 'pending', 'completed', 'cancelled'];

// Translation confidence levels
const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];

// Provider names
const PROVIDER_NAMES = [
  'Dr. Smith', 'Dr. Johnson', 'Dr. Williams', 'Dr. Brown', 
  'Dr. Jones', 'Dr. Garcia', 'Dr. Miller', 'Dr. Davis'
];

// Patient names
const PATIENT_NAMES = [
  'John Doe', 'Jane Smith', 'Robert Johnson', 'Maria Garcia',
  'James Wilson', 'Sarah Lee', 'Michael Brown', 'Emma Davis',
  'Anonymous Patient'
];

// Medical terms
const MEDICAL_TERMS = [
  'hypertension', 'diabetes mellitus', 'asthma', 'arthritis',
  'migraine', 'pneumonia', 'gastritis', 'hypothyroidism',
  'hyperlipidemia', 'depression', 'anxiety', 'insomnia'
];

// Medical symptoms
const MEDICAL_SYMPTOMS = [
  'fever', 'headache', 'cough', 'fatigue', 'nausea',
  'dizziness', 'chest pain', 'shortness of breath',
  'abdominal pain', 'back pain', 'joint pain', 'rash'
];

/**
 * Generate a random date within a range
 * 
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Date} - Random date between start and end
 */
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generate a random integer between min and max (inclusive)
 * 
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random integer
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random item from an array
 * 
 * @param {Array} array - Array to pick from
 * @returns {*} - Random item from the array
 */
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a random session ID
 * 
 * @returns {string} - Random session ID
 */
function generateSessionId() {
  return `session-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Generate a random session code (6 characters)
 * 
 * @returns {string} - Random session code
 */
function generateSessionCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Generate a random patient ID
 * 
 * @returns {string} - Random patient ID
 */
function generatePatientId() {
  return `patient-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Generate a random translation ID
 * 
 * @returns {string} - Random translation ID
 */
function generateTranslationId() {
  return `translation-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Generate a random message ID
 * 
 * @returns {string} - Random message ID
 */
function generateMessageId() {
  return `msg-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Generate a random note ID
 * 
 * @returns {string} - Random note ID
 */
function generateNoteId() {
  return `note-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Generate a random session
 * 
 * @returns {Object} - Random session object
 */
function generateSession() {
  const startTime = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
  const endTime = randomDate(startTime, new Date(startTime.getTime() + 2 * 60 * 60 * 1000));
  const status = randomItem(SESSION_STATUSES);
  const patientLanguage = randomItem(LANGUAGES);
  
  return {
    sessionId: generateSessionId(),
    sessionCode: generateSessionCode(),
    status,
    startTime: startTime.toISOString(),
    endTime: status === 'active' ? null : endTime.toISOString(),
    duration: status === 'active' ? null : Math.floor((endTime - startTime) / 1000),
    patientName: randomItem(PATIENT_NAMES),
    patientLanguage: patientLanguage.code,
    providerName: randomItem(PROVIDER_NAMES),
    medicalContext: randomItem(SPECIALTIES),
    messageCount: randomInt(5, 50)
  };
}

/**
 * Generate multiple random sessions
 * 
 * @param {number} count - Number of sessions to generate
 * @returns {Array<Object>} - Array of random session objects
 */
function generateSessions(count = 10) {
  return Array(count).fill(0).map(() => generateSession());
}

/**
 * Generate a random patient
 * 
 * @returns {Object} - Random patient object
 */
function generatePatient() {
  const language = randomItem(LANGUAGES);
  
  return {
    patientId: generatePatientId(),
    name: randomItem(PATIENT_NAMES),
    age: randomInt(18, 90),
    gender: randomItem(['Male', 'Female', 'Other']),
    language: language.code,
    medicalContext: randomItem(SPECIALTIES),
    notes: generateNotes(randomInt(0, 5)),
    lastVisit: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()).toISOString()
  };
}

/**
 * Generate multiple random patients
 * 
 * @param {number} count - Number of patients to generate
 * @returns {Array<Object>} - Array of random patient objects
 */
function generatePatients(count = 10) {
  return Array(count).fill(0).map(() => generatePatient());
}

/**
 * Generate a random note
 * 
 * @returns {Object} - Random note object
 */
function generateNote() {
  const timestamp = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
  
  return {
    id: generateNoteId(),
    text: `Patient reports ${randomItem(MEDICAL_SYMPTOMS)} and has a history of ${randomItem(MEDICAL_TERMS)}.`,
    timestamp: timestamp.toISOString(),
    provider: randomItem(PROVIDER_NAMES)
  };
}

/**
 * Generate multiple random notes
 * 
 * @param {number} count - Number of notes to generate
 * @returns {Array<Object>} - Array of random note objects
 */
function generateNotes(count = 3) {
  return Array(count).fill(0).map(() => generateNote());
}

/**
 * Generate a random translation
 * 
 * @returns {Object} - Random translation object
 */
function generateTranslation() {
  const timestamp = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
  const confidence = randomItem(CONFIDENCE_LEVELS);
  const sourceLanguage = randomItem(LANGUAGES);
  const targetLanguage = randomItem(LANGUAGES.filter(l => l.code !== sourceLanguage.code));
  const originalText = `Patient reports ${randomItem(MEDICAL_SYMPTOMS)} for the past ${randomInt(1, 10)} days.`;
  const translatedText = `El paciente reporta ${randomItem(MEDICAL_SYMPTOMS)} durante los últimos ${randomInt(1, 10)} días.`;
  const corrected = Math.random() > 0.7;
  
  return {
    id: generateTranslationId(),
    originalText,
    translatedText,
    originalTranslation: corrected ? 'El paciente tiene síntomas por días.' : null,
    sourceLanguage: sourceLanguage.code,
    targetLanguage: targetLanguage.code,
    confidence,
    timestamp: timestamp.toISOString(),
    latency: randomInt(100, 2000),
    model: randomItem(['standard', 'medical', 'enhanced']),
    corrected
  };
}

/**
 * Generate multiple random translations
 * 
 * @param {number} count - Number of translations to generate
 * @returns {Array<Object>} - Array of random translation objects
 */
function generateTranslations(count = 10) {
  return Array(count).fill(0).map(() => generateTranslation());
}

/**
 * Generate a random message
 * 
 * @returns {Object} - Random message object
 */
function generateMessage() {
  const timestamp = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
  const sender = randomItem(['provider', 'patient', 'system']);
  const text = sender === 'patient' 
    ? `${randomItem(MEDICAL_SYMPTOMS)} for ${randomInt(1, 10)} days.`
    : sender === 'provider'
      ? `Have you tried any medication for your ${randomItem(MEDICAL_SYMPTOMS)}?`
      : 'Session started.';
  
  return {
    id: generateMessageId(),
    text,
    sender,
    senderName: sender === 'provider' ? randomItem(PROVIDER_NAMES) : sender === 'patient' ? randomItem(PATIENT_NAMES) : 'System',
    timestamp: timestamp.toISOString(),
    translationId: sender === 'system' ? null : generateTranslationId(),
    confidence: sender === 'system' ? null : randomItem(CONFIDENCE_LEVELS)
  };
}

/**
 * Generate multiple random messages
 * 
 * @param {number} count - Number of messages to generate
 * @returns {Array<Object>} - Array of random message objects
 */
function generateMessages(count = 20) {
  return Array(count).fill(0).map(() => generateMessage());
}

module.exports = {
  LANGUAGES,
  SPECIALTIES,
  SESSION_STATUSES,
  CONFIDENCE_LEVELS,
  generateSession,
  generateSessions,
  generatePatient,
  generatePatients,
  generateNote,
  generateNotes,
  generateTranslation,
  generateTranslations,
  generateMessage,
  generateMessages
};
