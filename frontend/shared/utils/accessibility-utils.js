/**
 * Accessibility Utilities for MedTranslate AI
 * 
 * This module provides utilities for improving accessibility
 * in the MedTranslate AI application.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  ACCESSIBILITY_SETTINGS: 'medtranslate_accessibility_settings'
};

// Default settings
const DEFAULT_SETTINGS = {
  highContrast: false,
  largeText: false,
  reduceMotion: false,
  screenReader: false,
  hapticFeedback: true
};

// Current settings
let currentSettings = { ...DEFAULT_SETTINGS };

// Listeners
const listeners = [];

/**
 * Initialize accessibility settings
 * 
 * @returns {Promise<Object>} - Current accessibility settings
 */
export const initialize = async () => {
  try {
    // Load settings from storage
    const storedSettings = await AsyncStorage.getItem(STORAGE_KEYS.ACCESSIBILITY_SETTINGS);
    
    if (storedSettings) {
      currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
    }
    
    // Check if screen reader is enabled
    if (Platform.OS === 'ios') {
      // On iOS, we would use AccessibilityInfo.isScreenReaderEnabled()
      // For this example, we'll just use the stored setting
    } else if (Platform.OS === 'android') {
      // On Android, we would use AccessibilityInfo.isScreenReaderEnabled()
      // For this example, we'll just use the stored setting
    }
    
    return currentSettings;
  } catch (error) {
    console.error('Error initializing accessibility settings:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Get current accessibility settings
 * 
 * @returns {Object} - Current accessibility settings
 */
export const getSettings = () => {
  return { ...currentSettings };
};

/**
 * Update accessibility settings
 * 
 * @param {Object} settings - New settings
 * @returns {Promise<Object>} - Updated settings
 */
export const updateSettings = async (settings) => {
  try {
    // Update current settings
    currentSettings = { ...currentSettings, ...settings };
    
    // Save settings to storage
    await AsyncStorage.setItem(
      STORAGE_KEYS.ACCESSIBILITY_SETTINGS,
      JSON.stringify(currentSettings)
    );
    
    // Notify listeners
    notifyListeners();
    
    return currentSettings;
  } catch (error) {
    console.error('Error updating accessibility settings:', error);
    throw error;
  }
};

/**
 * Reset accessibility settings to defaults
 * 
 * @returns {Promise<Object>} - Default settings
 */
export const resetSettings = async () => {
  try {
    // Reset current settings
    currentSettings = { ...DEFAULT_SETTINGS };
    
    // Save settings to storage
    await AsyncStorage.setItem(
      STORAGE_KEYS.ACCESSIBILITY_SETTINGS,
      JSON.stringify(currentSettings)
    );
    
    // Notify listeners
    notifyListeners();
    
    return currentSettings;
  } catch (error) {
    console.error('Error resetting accessibility settings:', error);
    throw error;
  }
};

/**
 * Add settings change listener
 * 
 * @param {Function} listener - Listener function
 * @returns {Function} - Function to remove listener
 */
export const addListener = (listener) => {
  listeners.push(listener);
  
  // Return function to remove listener
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};

/**
 * Notify listeners of settings change
 * 
 * @returns {void}
 */
const notifyListeners = () => {
  listeners.forEach(listener => {
    try {
      listener(currentSettings);
    } catch (error) {
      console.error('Error in accessibility settings listener:', error);
    }
  });
};

/**
 * Get accessibility props for a component
 * 
 * @param {Object} options - Accessibility options
 * @returns {Object} - Accessibility props
 */
export const getAccessibilityProps = (options = {}) => {
  const {
    label,
    hint,
    role,
    state = {},
    testID
  } = options;
  
  // Base props
  const props = {
    accessible: true,
    testID: testID || label
  };
  
  // Add label
  if (label) {
    props.accessibilityLabel = label;
  }
  
  // Add hint
  if (hint) {
    if (Platform.OS === 'ios') {
      props.accessibilityHint = hint;
    } else {
      props.accessibilityHint = hint;
    }
  }
  
  // Add role
  if (role) {
    if (Platform.OS === 'ios') {
      props.accessibilityRole = role;
    } else {
      props.accessibilityRole = role;
    }
  }
  
  // Add states
  if (state.disabled) {
    props.accessibilityState = { ...props.accessibilityState, disabled: true };
  }
  
  if (state.selected) {
    props.accessibilityState = { ...props.accessibilityState, selected: true };
  }
  
  if (state.checked) {
    props.accessibilityState = { ...props.accessibilityState, checked: true };
  }
  
  if (state.busy) {
    props.accessibilityState = { ...props.accessibilityState, busy: true };
  }
  
  if (state.expanded) {
    props.accessibilityState = { ...props.accessibilityState, expanded: true };
  }
  
  return props;
};

/**
 * Get high contrast colors
 * 
 * @param {Object} colors - Original colors
 * @returns {Object} - High contrast colors
 */
export const getHighContrastColors = (colors) => {
  if (!currentSettings.highContrast) {
    return colors;
  }
  
  return {
    primary: '#0077CC',
    secondary: '#FF9800',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#000000',
    textSecondary: '#333333',
    border: '#000000',
    error: '#FF0000',
    success: '#008000',
    warning: '#FF9800',
    info: '#0077CC'
  };
};

/**
 * Get text size multiplier
 * 
 * @returns {number} - Text size multiplier
 */
export const getTextSizeMultiplier = () => {
  if (currentSettings.largeText) {
    return 1.3;
  }
  
  return 1.0;
};

/**
 * Should reduce motion
 * 
 * @returns {boolean} - Whether to reduce motion
 */
export const shouldReduceMotion = () => {
  return currentSettings.reduceMotion;
};

/**
 * Should use haptic feedback
 * 
 * @returns {boolean} - Whether to use haptic feedback
 */
export const shouldUseHapticFeedback = () => {
  return currentSettings.hapticFeedback;
};

/**
 * Is screen reader enabled
 * 
 * @returns {boolean} - Whether screen reader is enabled
 */
export const isScreenReaderEnabled = () => {
  return currentSettings.screenReader;
};
