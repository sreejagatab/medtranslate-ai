/**
 * Internationalization (i18n) for MedTranslate AI
 * 
 * This module provides internationalization support for the MedTranslate AI application.
 */

import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Import translations
import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import de from './translations/de.json';
import zh from './translations/zh.json';
import ar from './translations/ar.json';
import ru from './translations/ru.json';
import pt from './translations/pt.json';
import ja from './translations/ja.json';
import ko from './translations/ko.json';
import hi from './translations/hi.json';
import it from './translations/it.json';

// Storage key for language preference
const LANGUAGE_PREFERENCE_KEY = 'medtranslate_language_preference';

// Create i18n instance
const i18n = new I18n({
  en,
  es,
  fr,
  de,
  zh,
  ar,
  ru,
  pt,
  ja,
  ko,
  hi,
  it
});

// Set default locale
i18n.defaultLocale = 'en';

// Enable fallbacks
i18n.enableFallback = true;

// Set initial locale
i18n.locale = Localization.locale.split('-')[0];

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false }
];

/**
 * Initialize i18n
 * 
 * @returns {Promise<string>} - Current locale
 */
export const initialize = async () => {
  try {
    // Try to load saved language preference
    const savedLocale = await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY);
    
    if (savedLocale) {
      // Set locale from saved preference
      i18n.locale = savedLocale;
    } else {
      // Set locale from device settings
      const deviceLocale = Localization.locale.split('-')[0];
      
      // Check if device locale is supported
      const isSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === deviceLocale);
      
      if (isSupported) {
        i18n.locale = deviceLocale;
      } else {
        // Fall back to English
        i18n.locale = 'en';
      }
    }
    
    return i18n.locale;
  } catch (error) {
    console.error('Error initializing i18n:', error);
    return i18n.locale;
  }
};

/**
 * Get current locale
 * 
 * @returns {string} - Current locale
 */
export const getCurrentLocale = () => {
  return i18n.locale;
};

/**
 * Set locale
 * 
 * @param {string} locale - Locale to set
 * @returns {Promise<void>}
 */
export const setLocale = async (locale) => {
  try {
    // Check if locale is supported
    const isSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === locale);
    
    if (!isSupported) {
      throw new Error(`Locale ${locale} is not supported`);
    }
    
    // Set locale
    i18n.locale = locale;
    
    // Save locale preference
    await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, locale);
  } catch (error) {
    console.error(`Error setting locale to ${locale}:`, error);
    throw error;
  }
};

/**
 * Get language direction
 * 
 * @param {string} locale - Locale to check
 * @returns {string} - Language direction ('ltr' or 'rtl')
 */
export const getLanguageDirection = (locale = i18n.locale) => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === locale);
  return language && language.rtl ? 'rtl' : 'ltr';
};

/**
 * Check if current locale is RTL
 * 
 * @returns {boolean} - Whether current locale is RTL
 */
export const isRTL = () => {
  return getLanguageDirection() === 'rtl';
};

/**
 * Get language name
 * 
 * @param {string} locale - Locale to get name for
 * @param {boolean} native - Whether to get native name
 * @returns {string} - Language name
 */
export const getLanguageName = (locale = i18n.locale, native = false) => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === locale);
  
  if (!language) {
    return locale;
  }
  
  return native ? language.nativeName : language.name;
};

/**
 * Translate text
 * 
 * @param {string} key - Translation key
 * @param {Object} options - Translation options
 * @returns {string} - Translated text
 */
export const t = (key, options = {}) => {
  return i18n.t(key, options);
};

/**
 * Format date
 * 
 * @param {Date} date - Date to format
 * @param {Object} options - Format options
 * @returns {string} - Formatted date
 */
export const formatDate = (date, options = {}) => {
  try {
    const locale = i18n.locale;
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toISOString().split('T')[0];
  }
};

/**
 * Format time
 * 
 * @param {Date} date - Date to format
 * @param {Object} options - Format options
 * @returns {string} - Formatted time
 */
export const formatTime = (date, options = {}) => {
  try {
    const locale = i18n.locale;
    
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: 'numeric',
      second: options.showSeconds ? 'numeric' : undefined,
      hour12: options.hour12 !== false
    }).format(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    return date.toISOString().split('T')[1].substring(0, 8);
  }
};

/**
 * Format number
 * 
 * @param {number} number - Number to format
 * @param {Object} options - Format options
 * @returns {string} - Formatted number
 */
export const formatNumber = (number, options = {}) => {
  try {
    const locale = i18n.locale;
    
    return new Intl.NumberFormat(locale, options).format(number);
  } catch (error) {
    console.error('Error formatting number:', error);
    return number.toString();
  }
};

/**
 * Format currency
 * 
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {Object} options - Format options
 * @returns {string} - Formatted currency
 */
export const formatCurrency = (amount, currency = 'USD', options = {}) => {
  try {
    const locale = i18n.locale;
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...options
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency} ${amount}`;
  }
};

/**
 * Get plural form
 * 
 * @param {string} key - Translation key
 * @param {number} count - Count
 * @param {Object} options - Translation options
 * @returns {string} - Plural form
 */
export const plural = (key, count, options = {}) => {
  return i18n.t(key, { count, ...options });
};

// Export i18n instance
export default i18n;
