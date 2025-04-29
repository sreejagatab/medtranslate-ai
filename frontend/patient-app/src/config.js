/**
 * Configuration for the Patient Application
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

// App settings
export const APP_SETTINGS = {
  autoTranslate: true,
  showConfidence: true,
  textToSpeech: true,
  speechToText: true
};
