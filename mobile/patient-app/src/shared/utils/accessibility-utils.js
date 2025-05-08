/**
 * Accessibility Utilities for MedTranslate AI
 * 
 * This module provides utilities for enhancing accessibility in the MedTranslate AI
 * mobile applications, including screen reader support, focus management, and
 * accessibility announcements.
 */

import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Check if screen reader is enabled
 * 
 * @returns {Promise<boolean>} Promise that resolves to true if screen reader is enabled
 */
export const isScreenReaderEnabled = async () => {
  return await AccessibilityInfo.isScreenReaderEnabled();
};

/**
 * Announce a message to screen readers
 * 
 * @param {string} message - Message to announce
 * @returns {void}
 */
export const announceForAccessibility = (message) => {
  if (!message) return;
  
  AccessibilityInfo.announceForAccessibility(message);
};

/**
 * Get accessibility props for a component
 * 
 * @param {Object} options - Options for accessibility props
 * @param {string} options.label - Accessibility label
 * @param {string} options.hint - Accessibility hint
 * @param {boolean} options.isButton - Whether the component is a button
 * @param {boolean} options.isSelected - Whether the component is selected
 * @param {boolean} options.isDisabled - Whether the component is disabled
 * @returns {Object} Accessibility props
 */
export const getAccessibilityProps = ({
  label,
  hint,
  isButton = false,
  isSelected = false,
  isDisabled = false
}) => {
  if (Platform.OS === 'ios') {
    return {
      accessible: true,
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityRole: isButton ? 'button' : undefined,
      accessibilityState: {
        selected: isSelected,
        disabled: isDisabled
      }
    };
  } else {
    return {
      accessible: true,
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityRole: isButton ? 'button' : undefined,
      accessibilityState: {
        selected: isSelected,
        disabled: isDisabled
      }
    };
  }
};

/**
 * Get accessibility props for a heading
 * 
 * @param {string} label - Heading text
 * @param {number} level - Heading level (1-6)
 * @returns {Object} Accessibility props
 */
export const getHeadingAccessibilityProps = (label, level = 1) => {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'header',
    accessibilityTraits: 'header',
    accessibilityLevel: level
  };
};

/**
 * Get accessibility props for an image
 * 
 * @param {string} description - Image description
 * @param {boolean} isDecorative - Whether the image is decorative
 * @returns {Object} Accessibility props
 */
export const getImageAccessibilityProps = (description, isDecorative = false) => {
  if (isDecorative) {
    return {
      accessible: false,
      accessibilityLabel: ''
    };
  }
  
  return {
    accessible: true,
    accessibilityLabel: description,
    accessibilityRole: 'image'
  };
};

/**
 * Get accessibility props for a form field
 * 
 * @param {Object} options - Options for form field accessibility
 * @param {string} options.label - Field label
 * @param {string} options.error - Error message
 * @param {boolean} options.required - Whether the field is required
 * @returns {Object} Accessibility props
 */
export const getFormFieldAccessibilityProps = ({
  label,
  error,
  required = false
}) => {
  let accessibilityLabel = label;
  
  if (required) {
    accessibilityLabel += ', required';
  }
  
  if (error) {
    accessibilityLabel += `, error: ${error}`;
  }
  
  return {
    accessible: true,
    accessibilityLabel,
    accessibilityRole: 'text',
    accessibilityState: {
      invalid: !!error
    }
  };
};

/**
 * Add accessibility focus to an element
 * 
 * @param {Object} ref - React ref to the element
 * @returns {void}
 */
export const setAccessibilityFocus = (ref) => {
  if (!ref || !ref.current) return;
  
  if (Platform.OS === 'ios') {
    AccessibilityInfo.setAccessibilityFocus(
      findNodeHandle(ref.current)
    );
  } else {
    // On Android, we need to wait a bit for the element to be ready
    setTimeout(() => {
      if (ref.current) {
        ref.current.sendAccessibilityEvent(
          AccessibilityInfo.ACCESSIBILITY_EVENT_TYPE_VIEW_FOCUSED
        );
      }
    }, 100);
  }
};

export default {
  isScreenReaderEnabled,
  announceForAccessibility,
  getAccessibilityProps,
  getHeadingAccessibilityProps,
  getImageAccessibilityProps,
  getFormFieldAccessibilityProps,
  setAccessibilityFocus
};
