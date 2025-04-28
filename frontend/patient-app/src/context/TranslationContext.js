/**
 * Translation Context for MedTranslate AI Patient Application
 * 
 * This context provides translation-related state and functions
 * to all components in the application.
 */

import React from 'react';

// Create the context with default values
export const TranslationContext = React.createContext({
  selectedLanguage: null,
  setSelectedLanguage: () => {},
  sessionHistory: [],
  addSessionToHistory: () => {}
});
