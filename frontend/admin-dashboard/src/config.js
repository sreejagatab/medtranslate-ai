/**
 * Configuration for MedTranslate AI Admin Dashboard
 */

// API URL
export const API_URL = process.env.REACT_APP_API_URL || 'https://api.medtranslate.ai';

// WebSocket URL
export const WS_URL = process.env.REACT_APP_WS_URL || 'wss://api.medtranslate.ai/ws';

// Application version
export const APP_VERSION = '1.0.0';

// Refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  DASHBOARD: 60000, // 1 minute
  MONITORING: 30000, // 30 seconds
  ANALYTICS: 300000, // 5 minutes
  USERS: 300000 // 5 minutes
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm:ss',
  API: 'yyyy-MM-dd'
};

// Chart colors
export const CHART_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884D8', '#82CA9D', '#FF6B6B', '#6B66FF'
];

// Status colors
export const STATUS_COLORS = {
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3'
};

// Supported languages
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
