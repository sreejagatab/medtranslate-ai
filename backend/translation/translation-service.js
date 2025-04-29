/**
 * Translation Service for MedTranslate AI
 * 
 * This module provides translation functionality for the MedTranslate AI system.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Configuration
const TRANSLATIONS_DIR = path.join(__dirname, '../../data/translations');
const MOCK_MODE = process.env.MOCK_MODE === 'true' || true;
const EDGE_URL = process.env.EDGE_URL || 'http://localhost:4000';

// Ensure translations directory exists
if (!fs.existsSync(TRANSLATIONS_DIR)) {
  fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true });
}

/**
 * Translate text using the appropriate service
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Promise<Object>} - Translation result
 */
async function translateText(text, sourceLanguage, targetLanguage, context = 'general') {
  try {
    // Check if we should use the edge service
    if (process.env.USE_EDGE === 'true') {
      return await translateWithEdge(text, sourceLanguage, targetLanguage, context);
    }
    
    // Otherwise use the cloud service or mock
    if (MOCK_MODE) {
      return mockTranslate(text, sourceLanguage, targetLanguage, context);
    } else {
      return await translateWithCloud(text, sourceLanguage, targetLanguage, context);
    }
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}

/**
 * Translate text using the edge service
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Promise<Object>} - Translation result
 */
async function translateWithEdge(text, sourceLanguage, targetLanguage, context) {
  try {
    const response = await fetch(`${EDGE_URL}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        sourceLanguage,
        targetLanguage,
        context
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Edge translation failed: ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    // Store translation for future reference
    storeTranslation(text, result.translatedText, sourceLanguage, targetLanguage, context);
    
    return {
      originalText: text,
      translatedText: result.translatedText,
      confidence: result.confidence,
      sourceLanguage,
      targetLanguage,
      context,
      source: 'edge'
    };
  } catch (error) {
    console.error('Edge translation error:', error);
    // Fall back to mock translation if edge fails
    return mockTranslate(text, sourceLanguage, targetLanguage, context);
  }
}

/**
 * Translate text using the cloud service
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Promise<Object>} - Translation result
 */
async function translateWithCloud(text, sourceLanguage, targetLanguage, context) {
  // In a real implementation, this would call AWS Bedrock or another cloud service
  // For now, we'll use the mock implementation
  return mockTranslate(text, sourceLanguage, targetLanguage, context);
}

/**
 * Mock translation for testing
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Object} - Translation result
 */
function mockTranslate(text, sourceLanguage, targetLanguage, context) {
  // Simple dictionary-based translation for common phrases
  const translations = {
    'en-es': {
      'hello': 'hola',
      'good morning': 'buenos días',
      'good afternoon': 'buenas tardes',
      'good evening': 'buenas noches',
      'how are you': 'cómo estás',
      'thank you': 'gracias',
      'you\'re welcome': 'de nada',
      'yes': 'sí',
      'no': 'no',
      'doctor': 'médico',
      'nurse': 'enfermera',
      'hospital': 'hospital',
      'patient': 'paciente',
      'medicine': 'medicina',
      'pain': 'dolor',
      'I need help': 'necesito ayuda',
      'emergency': 'emergencia',
      'prescription': 'receta',
      'pharmacy': 'farmacia',
      'symptoms': 'síntomas',
      'treatment': 'tratamiento',
      'diagnosis': 'diagnóstico',
      'appointment': 'cita',
      'insurance': 'seguro',
      'medical history': 'historial médico',
      'allergies': 'alergias',
      'vaccination': 'vacunación',
      'surgery': 'cirugía',
      'recovery': 'recuperación',
      'follow-up': 'seguimiento'
    },
    'en-fr': {
      'hello': 'bonjour',
      'good morning': 'bonjour',
      'good afternoon': 'bon après-midi',
      'good evening': 'bonsoir',
      'how are you': 'comment allez-vous',
      'thank you': 'merci',
      'you\'re welcome': 'de rien',
      'yes': 'oui',
      'no': 'non',
      'doctor': 'médecin',
      'nurse': 'infirmière',
      'hospital': 'hôpital',
      'patient': 'patient',
      'medicine': 'médicament',
      'pain': 'douleur',
      'I need help': "j'ai besoin d'aide",
      'emergency': 'urgence',
      'prescription': 'ordonnance',
      'pharmacy': 'pharmacie',
      'symptoms': 'symptômes',
      'treatment': 'traitement',
      'diagnosis': 'diagnostic',
      'appointment': 'rendez-vous',
      'insurance': 'assurance',
      'medical history': 'antécédents médicaux',
      'allergies': 'allergies',
      'vaccination': 'vaccination',
      'surgery': 'chirurgie',
      'recovery': 'rétablissement',
      'follow-up': 'suivi'
    },
    'es-en': {
      'hola': 'hello',
      'buenos días': 'good morning',
      'buenas tardes': 'good afternoon',
      'buenas noches': 'good evening',
      'cómo estás': 'how are you',
      'gracias': 'thank you',
      'de nada': 'you\'re welcome',
      'sí': 'yes',
      'no': 'no',
      'médico': 'doctor',
      'enfermera': 'nurse',
      'hospital': 'hospital',
      'paciente': 'patient',
      'medicina': 'medicine',
      'dolor': 'pain',
      'necesito ayuda': 'I need help',
      'emergencia': 'emergency',
      'receta': 'prescription',
      'farmacia': 'pharmacy',
      'síntomas': 'symptoms',
      'tratamiento': 'treatment',
      'diagnóstico': 'diagnosis',
      'cita': 'appointment',
      'seguro': 'insurance',
      'historial médico': 'medical history',
      'alergias': 'allergies',
      'vacunación': 'vaccination',
      'cirugía': 'surgery',
      'recuperación': 'recovery',
      'seguimiento': 'follow-up'
    }
  };
  
  // Medical terminology for specific contexts
  const medicalTerms = {
    'en': {
      'cardiology': {
        'heart attack': {'es': 'ataque cardíaco', 'fr': 'crise cardiaque'},
        'blood pressure': {'es': 'presión arterial', 'fr': 'pression artérielle'},
        'arrhythmia': {'es': 'arritmia', 'fr': 'arythmie'},
        'myocardial infarction': {'es': 'infarto de miocardio', 'fr': 'infarctus du myocarde'},
        'coronary artery disease': {'es': 'enfermedad de las arterias coronarias', 'fr': 'maladie coronarienne'},
        'heart failure': {'es': 'insuficiencia cardíaca', 'fr': 'insuffisance cardiaque'},
        'hypertension': {'es': 'hipertensión', 'fr': 'hypertension'}
      },
      'general': {
        'fever': {'es': 'fiebre', 'fr': 'fièvre'},
        'headache': {'es': 'dolor de cabeza', 'fr': 'mal de tête'},
        'nausea': {'es': 'náusea', 'fr': 'nausée'},
        'pain': {'es': 'dolor', 'fr': 'douleur'},
        'allergy': {'es': 'alergia', 'fr': 'allergie'},
        'infection': {'es': 'infección', 'fr': 'infection'},
        'inflammation': {'es': 'inflamación', 'fr': 'inflammation'}
      }
    }
  };
  
  const languagePair = `${sourceLanguage}-${targetLanguage}`;
  
  // Check if we have a direct translation for the entire text
  if (translations[languagePair] && translations[languagePair][text.toLowerCase()]) {
    const translatedText = translations[languagePair][text.toLowerCase()];
    
    // Store translation for future reference
    storeTranslation(text, translatedText, sourceLanguage, targetLanguage, context);
    
    return {
      originalText: text,
      translatedText,
      confidence: 'high',
      sourceLanguage,
      targetLanguage,
      context,
      source: 'mock'
    };
  }
  
  // Otherwise, translate word by word
  const words = text.split(' ');
  let translatedWords = [];
  
  for (const word of words) {
    const wordLower = word.toLowerCase();
    
    // Check if we have a direct translation for this word
    if (translations[languagePair] && translations[languagePair][wordLower]) {
      translatedWords.push(translations[languagePair][wordLower]);
    } else {
      // Check if it's a medical term
      let isMedicalTerm = false;
      
      if (medicalTerms[sourceLanguage] && medicalTerms[sourceLanguage][context]) {
        for (const [term, translations] of Object.entries(medicalTerms[sourceLanguage][context])) {
          if (text.toLowerCase().includes(term) && translations[targetLanguage]) {
            // Replace the term in the text
            const regex = new RegExp(term, 'gi');
            text = text.replace(regex, translations[targetLanguage]);
            isMedicalTerm = true;
          }
        }
      }
      
      if (!isMedicalTerm) {
        // Keep original word if no translation available
        translatedWords.push(word);
      }
    }
  }
  
  const translatedText = translatedWords.join(' ');
  
  // Store translation for future reference
  storeTranslation(text, translatedText, sourceLanguage, targetLanguage, context);
  
  return {
    originalText: text,
    translatedText,
    confidence: 'medium',
    sourceLanguage,
    targetLanguage,
    context,
    source: 'mock'
  };
}

/**
 * Store a translation for future reference
 * 
 * @param {string} originalText - Original text
 * @param {string} translatedText - Translated text
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 */
function storeTranslation(originalText, translatedText, sourceLanguage, targetLanguage, context) {
  try {
    const translationId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const translationFile = path.join(TRANSLATIONS_DIR, `${translationId}.json`);
    
    const translationData = {
      id: translationId,
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      context,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(translationFile, JSON.stringify(translationData, null, 2));
  } catch (error) {
    console.error('Error storing translation:', error);
  }
}

/**
 * Get translation history
 * 
 * @param {number} limit - Maximum number of translations to return
 * @returns {Array<Object>} - Translation history
 */
function getTranslationHistory(limit = 100) {
  try {
    const files = fs.readdirSync(TRANSLATIONS_DIR)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        // Sort by timestamp (newest first)
        const aTime = fs.statSync(path.join(TRANSLATIONS_DIR, a)).mtime.getTime();
        const bTime = fs.statSync(path.join(TRANSLATIONS_DIR, b)).mtime.getTime();
        return bTime - aTime;
      })
      .slice(0, limit);
    
    const translations = files.map(file => {
      const filePath = path.join(TRANSLATIONS_DIR, file);
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    });
    
    return translations;
  } catch (error) {
    console.error('Error getting translation history:', error);
    return [];
  }
}

module.exports = {
  translateText,
  getTranslationHistory
};
