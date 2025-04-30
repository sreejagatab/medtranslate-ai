/**
 * Automated tests for MedTranslate AI enhanced components
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import EnhancedLanguageSelector from '../frontend/patient-app/src/components/EnhancedLanguageSelector';
import EnhancedVoiceRecordButton from '../frontend/patient-app/src/components/EnhancedVoiceRecordButton';
import SessionManagementPanel from '../frontend/provider-app/src/components/SessionManagementPanel';
import TranslationMonitorPanel from '../frontend/provider-app/src/components/TranslationMonitorPanel';

// Mock data
const mockLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
];

const mockSessions = [
  {
    sessionId: '1',
    sessionCode: 'ABC123',
    status: 'active',
    patientName: 'John Doe',
    patientLanguage: 'es',
    medicalContext: 'general',
    startTime: new Date().toISOString()
  },
  {
    sessionId: '2',
    sessionCode: 'DEF456',
    status: 'completed',
    patientName: 'Jane Smith',
    patientLanguage: 'fr',
    medicalContext: 'cardiology',
    startTime: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  }
];

const mockTranslations = [
  {
    id: '1',
    originalText: 'I have a headache',
    translatedText: 'Tengo dolor de cabeza',
    confidence: 'high',
    timestamp: new Date().toISOString(),
    latency: 120
  },
  {
    id: '2',
    originalText: 'How long have you been feeling this way?',
    translatedText: '¿Cuánto tiempo ha estado sintiéndose así?',
    confidence: 'medium',
    timestamp: new Date().toISOString(),
    latency: 150
  }
];

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve())
}));

// Mock Vibration
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    ...ReactNative,
    Vibration: {
      vibrate: jest.fn()
    }
  };
});

// Tests for EnhancedLanguageSelector
describe('EnhancedLanguageSelector', () => {
  it('renders correctly with languages', () => {
    const onSelectLanguage = jest.fn();
    const onDetectLanguage = jest.fn();
    
    const { getByText } = render(
      <EnhancedLanguageSelector
        languages={mockLanguages}
        onSelectLanguage={onSelectLanguage}
        onDetectLanguage={onDetectLanguage}
      />
    );
    
    expect(getByText('Select Language')).toBeTruthy();
  });
  
  it('opens language selection modal when button is pressed', () => {
    const onSelectLanguage = jest.fn();
    const onDetectLanguage = jest.fn();
    
    const { getByText, queryByText } = render(
      <EnhancedLanguageSelector
        languages={mockLanguages}
        onSelectLanguage={onSelectLanguage}
        onDetectLanguage={onDetectLanguage}
      />
    );
    
    fireEvent.press(getByText('Select Language'));
    expect(queryByText('All Languages')).toBeTruthy();
  });
  
  it('calls onDetectLanguage when auto-detect is pressed', () => {
    const onSelectLanguage = jest.fn();
    const onDetectLanguage = jest.fn();
    
    const { getByText } = render(
      <EnhancedLanguageSelector
        languages={mockLanguages}
        onSelectLanguage={onSelectLanguage}
        onDetectLanguage={onDetectLanguage}
      />
    );
    
    fireEvent.press(getByText('Auto-Detect Language'));
    expect(onDetectLanguage).toHaveBeenCalled();
  });
});

// Tests for EnhancedVoiceRecordButton
describe('EnhancedVoiceRecordButton', () => {
  it('renders correctly in idle state', () => {
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    
    const { getByText } = render(
      <EnhancedVoiceRecordButton
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      />
    );
    
    expect(getByText('Hold to speak')).toBeTruthy();
  });
  
  it('shows recording state when isRecording is true', () => {
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    
    const { getByText } = render(
      <EnhancedVoiceRecordButton
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        isRecording={true}
      />
    );
    
    expect(getByText('Recording...')).toBeTruthy();
  });
  
  it('shows translating state when isTranslating is true', () => {
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    
    const { getByText } = render(
      <EnhancedVoiceRecordButton
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        isTranslating={true}
      />
    );
    
    expect(getByText('Translating...')).toBeTruthy();
  });
  
  it('calls onPressIn when button is pressed', () => {
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    
    const { getByText } = render(
      <EnhancedVoiceRecordButton
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      />
    );
    
    fireEvent(getByText('Hold to speak'), 'onPressIn');
    expect(onPressIn).toHaveBeenCalled();
  });
});

// Tests for SessionManagementPanel
describe('SessionManagementPanel', () => {
  it('renders correctly with sessions', () => {
    const onJoinSession = jest.fn();
    const onEndSession = jest.fn();
    const onExportSession = jest.fn();
    const onRefresh = jest.fn();
    
    const { getByText } = render(
      <SessionManagementPanel
        sessions={mockSessions}
        onJoinSession={onJoinSession}
        onEndSession={onEndSession}
        onExportSession={onExportSession}
        onRefresh={onRefresh}
      />
    );
    
    expect(getByText('Session Management')).toBeTruthy();
    expect(getByText('Session #ABC123')).toBeTruthy();
  });
  
  it('filters sessions when search is used', () => {
    const onJoinSession = jest.fn();
    const onEndSession = jest.fn();
    const onExportSession = jest.fn();
    const onRefresh = jest.fn();
    
    const { getByPlaceholderText, queryByText } = render(
      <SessionManagementPanel
        sessions={mockSessions}
        onJoinSession={onJoinSession}
        onEndSession={onEndSession}
        onExportSession={onExportSession}
        onRefresh={onRefresh}
      />
    );
    
    const searchInput = getByPlaceholderText('Search sessions...');
    fireEvent.changeText(searchInput, 'John');
    
    expect(queryByText('Session #ABC123')).toBeTruthy();
    expect(queryByText('Session #DEF456')).toBeNull();
  });
});

// Tests for TranslationMonitorPanel
describe('TranslationMonitorPanel', () => {
  it('renders correctly with translations', () => {
    const onReportError = jest.fn();
    const onRequestAlternative = jest.fn();
    const onToggleAutoCorrect = jest.fn();
    
    const { getByText } = render(
      <TranslationMonitorPanel
        isActive={true}
        translations={mockTranslations}
        sessionLanguage="Spanish"
        onReportError={onReportError}
        onRequestAlternative={onRequestAlternative}
        onToggleAutoCorrect={onToggleAutoCorrect}
      />
    );
    
    expect(getByText('Translation Monitor')).toBeTruthy();
    expect(getByText('Active Session')).toBeTruthy();
    expect(getByText('I have a headache')).toBeTruthy();
  });
  
  it('shows empty state when no translations', () => {
    const onReportError = jest.fn();
    const onRequestAlternative = jest.fn();
    const onToggleAutoCorrect = jest.fn();
    
    const { getByText } = render(
      <TranslationMonitorPanel
        isActive={true}
        translations={[]}
        sessionLanguage="Spanish"
        onReportError={onReportError}
        onRequestAlternative={onRequestAlternative}
        onToggleAutoCorrect={onToggleAutoCorrect}
      />
    );
    
    expect(getByText('No translations yet in this session')).toBeTruthy();
  });
});
