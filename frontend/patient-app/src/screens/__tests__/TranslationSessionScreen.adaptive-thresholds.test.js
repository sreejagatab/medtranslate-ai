/**
 * Tests for the TranslationSessionScreen with Adaptive Confidence Thresholds
 * 
 * This file contains tests for the integration of adaptive confidence thresholds
 * with the TranslationSessionScreen component.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TranslationSessionScreen from '../TranslationSessionScreen';
import { TranslationContext } from '../../context/TranslationContext';
import { EdgeConnectionContext } from '../../context/EdgeConnectionContext';
import websocketService from '../../services/websocket-service';

// Mock dependencies
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    setAudioModeAsync: jest.fn().mockResolvedValue({}),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn().mockResolvedValue({}),
      startAsync: jest.fn().mockResolvedValue({}),
      stopAndUnloadAsync: jest.fn().mockResolvedValue({}),
      getURI: jest.fn().mockReturnValue('file://test.m4a'),
    })),
    Sound: {
      createAsync: jest.fn().mockResolvedValue({ sound: { playAsync: jest.fn() } }),
    },
  },
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  readAsStringAsync: jest.fn().mockResolvedValue('base64data'),
  writeAsStringAsync: jest.fn().mockResolvedValue({}),
  cacheDirectory: 'cache/',
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../services/websocket-service', () => ({
  connect: jest.fn().mockResolvedValue({}),
  disconnect: jest.fn(),
  onConnectionState: jest.fn((callback) => callback('connected')),
  onMessage: jest.fn(),
  sendMessage: jest.fn(),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock route params
const mockRoute = {
  params: {
    sessionId: 'test-session-123',
    sessionToken: 'test-token-123',
    providerName: 'Dr. Smith',
    medicalContext: 'cardiology',
  },
};

// Mock translation context
const mockTranslationContext = {
  selectedLanguage: {
    code: 'es',
    name: 'Spanish',
  },
};

// Mock edge connection context
const mockEdgeConnectionContext = {
  edgeConnection: {
    connect: jest.fn().mockResolvedValue({}),
    disconnect: jest.fn(),
    translateAudio: jest.fn(),
  },
  isConnected: true,
};

// Mock API request
jest.mock('../../config/api', () => ({
  API_ENDPOINTS: {
    TRANSLATE: {
      AUDIO: '/translate/audio',
    },
  },
  apiRequest: jest.fn().mockResolvedValue({
    originalText: 'Tengo dolor en el pecho',
    translatedText: 'I have chest pain',
    confidence: 'high',
    adaptiveThresholds: {
      high: 0.92,
      medium: 0.8,
      low: 0.65,
      analysis: {
        contextComplexity: 1.4,
        terminologyComplexity: 1.2,
        terminologyDensity: 0.3,
        criticalTermsCount: 2,
        textLengthCategory: 'medium',
        isComplexLanguagePair: false
      }
    }
  }),
}));

describe('TranslationSessionScreen with Adaptive Confidence Thresholds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup websocket message handlers
    websocketService.onMessage.mockImplementation((messageType, callback) => {
      if (messageType === 'connected') {
        callback({});
      }
    });
  });
  
  test('displays adaptive thresholds in TranslationStatusIndicator when translation completes', async () => {
    // Mock the API response with adaptive thresholds
    const mockTranslationResult = {
      originalText: 'Tengo dolor en el pecho',
      translatedText: 'I have chest pain',
      confidence: 'high',
      adaptiveThresholds: {
        high: 0.92,
        medium: 0.8,
        low: 0.65,
        analysis: {
          contextComplexity: 1.4,
          terminologyComplexity: 1.2,
          terminologyDensity: 0.3,
          criticalTermsCount: 2
        }
      }
    };
    
    require('../../config/api').apiRequest.mockResolvedValue(mockTranslationResult);
    
    // Render the component
    const { getByText, queryByText } = render(
      <TranslationContext.Provider value={mockTranslationContext}>
        <EdgeConnectionContext.Provider value={mockEdgeConnectionContext}>
          <TranslationSessionScreen navigation={mockNavigation} route={mockRoute} />
        </EdgeConnectionContext.Provider>
      </TranslationContext.Provider>
    );
    
    // Wait for the component to connect
    await waitFor(() => {
      expect(websocketService.connect).toHaveBeenCalled();
    });
    
    // Simulate a completed translation with adaptive thresholds
    const mockTranslationMessage = {
      id: 'msg-123',
      translatedText: 'I have chest pain',
      originalText: 'Tengo dolor en el pecho',
      sender: { type: 'patient', name: 'Patient' },
      timestamp: new Date().toISOString(),
      confidence: 'high',
      adaptiveThresholds: mockTranslationResult.adaptiveThresholds
    };
    
    // Find the onMessage handler for translation messages and call it
    const translationHandler = websocketService.onMessage.mock.calls.find(
      call => call[0] === 'translation'
    )[1];
    
    translationHandler(mockTranslationMessage);
    
    // Simulate translation completion
    require('../../services/websocket-service').onConnectionState.mock.calls[0][0]('connected');
    
    // Check that the adaptive thresholds are displayed
    expect(getByText(/Cardiology/)).toBeTruthy();
  });
  
  test('sends adaptive thresholds in WebSocket message when translation completes', async () => {
    // Mock the API response with adaptive thresholds
    const mockTranslationResult = {
      originalText: 'Tengo dolor en el pecho',
      translatedText: 'I have chest pain',
      confidence: 'high',
      adaptiveThresholds: {
        high: 0.92,
        medium: 0.8,
        low: 0.65
      }
    };
    
    require('../../config/api').apiRequest.mockResolvedValue(mockTranslationResult);
    
    // Render the component
    const { getByText } = render(
      <TranslationContext.Provider value={mockTranslationContext}>
        <EdgeConnectionContext.Provider value={mockEdgeConnectionContext}>
          <TranslationSessionScreen navigation={mockNavigation} route={mockRoute} />
        </EdgeConnectionContext.Provider>
      </TranslationContext.Provider>
    );
    
    // Wait for the component to connect
    await waitFor(() => {
      expect(websocketService.connect).toHaveBeenCalled();
    });
    
    // Simulate a completed translation
    const mockTranslationMessage = {
      id: 'msg-123',
      translatedText: 'I have chest pain',
      originalText: 'Tengo dolor en el pecho',
      sender: { type: 'patient', name: 'Patient' },
      timestamp: new Date().toISOString(),
      confidence: 'high',
      adaptiveThresholds: mockTranslationResult.adaptiveThresholds
    };
    
    // Find the onMessage handler for translation messages and call it
    const translationHandler = websocketService.onMessage.mock.calls.find(
      call => call[0] === 'translation'
    )[1];
    
    translationHandler(mockTranslationMessage);
    
    // Check that the WebSocket message includes adaptive thresholds
    expect(websocketService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        adaptiveThresholds: expect.objectContaining({
          high: 0.92,
          medium: 0.8,
          low: 0.65
        })
      })
    );
  });
});
