/**
 * Configuration for the Provider Application
 */

// API URLs
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001';
export const EDGE_URL = process.env.REACT_APP_EDGE_URL || 'http://localhost:4000';
export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:4001/ws';

// Supported languages
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' }
];

// Medical contexts
export const MEDICAL_CONTEXTS = [
  { code: 'general', name: 'General' },
  { code: 'cardiology', name: 'Cardiology' },
  { code: 'neurology', name: 'Neurology' },
  { code: 'gastroenterology', name: 'Gastroenterology' },
  { code: 'pulmonology', name: 'Pulmonology' }
];

// App settings
export const APP_SETTINGS = {
  defaultLanguage: 'en',
  defaultTargetLanguage: 'es',
  defaultContext: 'general',
  autoTranslate: true,
  showConfidence: true,
  maxHistoryItems: 100
};
