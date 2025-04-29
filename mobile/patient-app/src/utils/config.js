/**
 * Configuration for the MedTranslate AI Patient Mobile App
 */

// API Configuration
export const API_URL = 'https://api.medtranslate.ai';
export const WS_URL = 'wss://api.medtranslate.ai/ws';

// Storage Keys
export const STORAGE_KEYS = {
  SESSION_TOKEN: 'session_token',
  SESSION_ID: 'session_id',
  USER_LANGUAGE: 'user_language',
  OFFLINE_QUEUE: 'offline_queue',
  TRANSLATION_CACHE: 'translation_cache',
  NOTIFICATION_TOKEN: 'notification_token',
  USER_PREFERENCES: 'user_preferences'
};

// Supported Languages
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' }
];

// Default Settings
export const DEFAULT_SETTINGS = {
  language: 'en',
  textSize: 'medium',
  darkMode: false,
  notifications: true,
  autoTranslate: true,
  saveHistory: true
};
