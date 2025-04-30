/**
 * Mock API Server for MedTranslate AI
 * 
 * This module provides a mock API server for testing UI components
 * with realistic API responses.
 */

const generator = require('./generator');

// In-memory database
const db = {
  sessions: generator.generateSessions(20),
  patients: generator.generatePatients(15),
  translations: generator.generateTranslations(50),
  messages: generator.generateMessages(100)
};

// Add relationships between entities
db.sessions.forEach(session => {
  // Assign a patient to each session
  const patient = db.patients[Math.floor(Math.random() * db.patients.length)];
  session.patientId = patient.patientId;
  session.patientName = patient.name;
  
  // Assign messages to each session
  session.messages = db.messages
    .filter(() => Math.random() > 0.7)
    .map(message => ({ ...message, sessionId: session.sessionId }));
  
  session.messageCount = session.messages.length;
});

// Add session history to patients
db.patients.forEach(patient => {
  patient.sessions = db.sessions
    .filter(session => session.patientId === patient.patientId)
    .map(({ sessionId, startTime, endTime, status, medicalContext, messageCount }) => 
      ({ sessionId, startTime, endTime, status, medicalContext, messageCount })
    );
});

/**
 * Simulate API delay
 * 
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise} - Promise that resolves after the delay
 */
function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock API endpoints
 */
const api = {
  /**
   * Get all sessions
   * 
   * @returns {Promise<Object>} - API response
   */
  async getSessions() {
    await delay();
    return {
      success: true,
      sessions: db.sessions
    };
  },
  
  /**
   * Get session by ID
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - API response
   */
  async getSession(sessionId) {
    await delay();
    const session = db.sessions.find(s => s.sessionId === sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }
    
    return {
      success: true,
      session
    };
  },
  
  /**
   * Get session messages
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - API response
   */
  async getSessionMessages(sessionId) {
    await delay();
    const session = db.sessions.find(s => s.sessionId === sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }
    
    return {
      success: true,
      messages: session.messages || []
    };
  },
  
  /**
   * End session
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - API response
   */
  async endSession(sessionId) {
    await delay();
    const session = db.sessions.find(s => s.sessionId === sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }
    
    session.status = 'completed';
    session.endTime = new Date().toISOString();
    
    return {
      success: true,
      session
    };
  },
  
  /**
   * Export session transcript
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - API response
   */
  async exportSession(sessionId) {
    await delay(1000); // Longer delay for export
    const session = db.sessions.find(s => s.sessionId === sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }
    
    return {
      success: true,
      downloadUrl: `https://example.com/api/sessions/${sessionId}/transcript.pdf`
    };
  },
  
  /**
   * Get all patients
   * 
   * @returns {Promise<Object>} - API response
   */
  async getPatients() {
    await delay();
    return {
      success: true,
      patients: db.patients
    };
  },
  
  /**
   * Get patient by ID
   * 
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} - API response
   */
  async getPatient(patientId) {
    await delay();
    const patient = db.patients.find(p => p.patientId === patientId);
    
    if (!patient) {
      return {
        success: false,
        error: 'Patient not found'
      };
    }
    
    return {
      success: true,
      patient
    };
  },
  
  /**
   * Get patient sessions
   * 
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} - API response
   */
  async getPatientSessions(patientId) {
    await delay();
    const patient = db.patients.find(p => p.patientId === patientId);
    
    if (!patient) {
      return {
        success: false,
        error: 'Patient not found'
      };
    }
    
    const sessions = db.sessions.filter(s => s.patientId === patientId);
    
    return {
      success: true,
      sessions
    };
  },
  
  /**
   * Add patient note
   * 
   * @param {string} patientId - Patient ID
   * @param {Object} note - Note object
   * @returns {Promise<Object>} - API response
   */
  async addPatientNote(patientId, note) {
    await delay();
    const patient = db.patients.find(p => p.patientId === patientId);
    
    if (!patient) {
      return {
        success: false,
        error: 'Patient not found'
      };
    }
    
    const newNote = {
      id: generator.generateNoteId(),
      text: note.text,
      timestamp: new Date().toISOString(),
      provider: note.provider || 'Current Provider'
    };
    
    patient.notes = [newNote, ...(patient.notes || [])];
    
    return {
      success: true,
      note: newNote
    };
  },
  
  /**
   * Update patient medical context
   * 
   * @param {string} patientId - Patient ID
   * @param {string} medicalContext - Medical context
   * @returns {Promise<Object>} - API response
   */
  async updatePatientContext(patientId, medicalContext) {
    await delay();
    const patient = db.patients.find(p => p.patientId === patientId);
    
    if (!patient) {
      return {
        success: false,
        error: 'Patient not found'
      };
    }
    
    patient.medicalContext = medicalContext;
    
    return {
      success: true,
      patient
    };
  },
  
  /**
   * Report translation error
   * 
   * @param {string} translationId - Translation ID
   * @param {string} reason - Error reason
   * @returns {Promise<Object>} - API response
   */
  async reportTranslationError(translationId, reason) {
    await delay();
    const translation = db.translations.find(t => t.id === translationId);
    
    if (!translation) {
      return {
        success: false,
        error: 'Translation not found'
      };
    }
    
    // In a real system, we would store the error report
    
    return {
      success: true,
      message: 'Error report submitted successfully'
    };
  },
  
  /**
   * Get alternative translation
   * 
   * @param {string} translationId - Translation ID
   * @returns {Promise<Object>} - API response
   */
  async getAlternativeTranslation(translationId) {
    await delay(800); // Longer delay for alternative translation
    const translation = db.translations.find(t => t.id === translationId);
    
    if (!translation) {
      return {
        success: false,
        error: 'Translation not found'
      };
    }
    
    // Generate an alternative translation
    const alternativeTranslation = {
      ...translation,
      id: generator.generateTranslationId(),
      translatedText: `${translation.translatedText} (alternative)`,
      isAlternative: true
    };
    
    return {
      success: true,
      translation: alternativeTranslation
    };
  },
  
  /**
   * Detect language
   * 
   * @returns {Promise<Object>} - API response
   */
  async detectLanguage() {
    await delay(1500); // Longer delay for language detection
    const detectedLanguage = generator.LANGUAGES[Math.floor(Math.random() * generator.LANGUAGES.length)];
    
    return {
      success: true,
      language: detectedLanguage
    };
  }
};

module.exports = api;
