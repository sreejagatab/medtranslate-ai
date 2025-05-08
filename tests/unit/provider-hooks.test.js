/**
 * Unit tests for Provider App Hooks
 */

import { renderHook, act } from '@testing-library/react-hooks';
import axios from 'axios';

// Import hooks to test
import useSession from '../../frontend/provider-app/src/hooks/useSession';
import usePatientHistory from '../../frontend/provider-app/src/hooks/usePatientHistory';
import useTranslationMonitor from '../../frontend/provider-app/src/hooks/useTranslationMonitor';

// Mock axios
jest.mock('axios');

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 50);
  }
  
  send(data) {
    // Simulate message echo
    if (this.onmessage) {
      const parsedData = JSON.parse(data);
      this.onmessage({ data: JSON.stringify({ ...parsedData, received: true }) });
    }
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

global.WebSocket = MockWebSocket;

describe('Provider App Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSession', () => {
    it('should create a new session', async () => {
      // Mock API response
      axios.post.mockImplementation((url) => {
        if (url.includes('/sessions')) {
          return Promise.resolve({
            data: {
              sessionId: 'new-session-123',
              sessionCode: 'XYZ789',
              providerLanguage: 'en',
              patientLanguage: 'es',
              status: 'created',
              createdAt: new Date().toISOString()
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      // Render hook
      const { result } = renderHook(() => useSession());
      
      // Create session
      let session;
      await act(async () => {
        session = await result.current.createSession('en', 'es', 'General Consultation');
      });
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/sessions'),
        expect.objectContaining({
          providerLanguage: 'en',
          patientLanguage: 'es',
          context: 'General Consultation'
        })
      );
      
      // Verify session data
      expect(session).toEqual({
        sessionId: 'new-session-123',
        sessionCode: 'XYZ789',
        providerLanguage: 'en',
        patientLanguage: 'es',
        status: 'created',
        createdAt: expect.any(String)
      });
      
      // Verify hook state
      expect(result.current.sessionId).toBe('new-session-123');
      expect(result.current.sessionCode).toBe('XYZ789');
      expect(result.current.sessionStatus).toBe('created');
    });

    it('should end a session', async () => {
      // Mock API response
      axios.post.mockImplementation((url) => {
        if (url.includes('/sessions/session-123/end')) {
          return Promise.resolve({
            data: {
              success: true,
              sessionId: 'session-123',
              status: 'ended',
              endedAt: new Date().toISOString()
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      // Render hook with initial session
      const { result } = renderHook(() => useSession());
      
      // Set initial session state
      act(() => {
        result.current.setSessionId('session-123');
        result.current.setSessionStatus('active');
      });
      
      // End session
      let response;
      await act(async () => {
        response = await result.current.endSession();
      });
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/end')
      );
      
      // Verify response
      expect(response).toEqual({
        success: true,
        sessionId: 'session-123',
        status: 'ended',
        endedAt: expect.any(String)
      });
      
      // Verify hook state
      expect(result.current.sessionStatus).toBe('ended');
    });

    it('should pause and resume a session', async () => {
      // Mock API responses
      axios.post.mockImplementation((url) => {
        if (url.includes('/sessions/session-123/pause')) {
          return Promise.resolve({
            data: {
              success: true,
              sessionId: 'session-123',
              status: 'paused',
              pausedAt: new Date().toISOString()
            }
          });
        }
        if (url.includes('/sessions/session-123/resume')) {
          return Promise.resolve({
            data: {
              success: true,
              sessionId: 'session-123',
              status: 'active',
              resumedAt: new Date().toISOString()
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      // Render hook with initial session
      const { result } = renderHook(() => useSession());
      
      // Set initial session state
      act(() => {
        result.current.setSessionId('session-123');
        result.current.setSessionStatus('active');
      });
      
      // Pause session
      let pauseResponse;
      await act(async () => {
        pauseResponse = await result.current.pauseSession();
      });
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/pause')
      );
      
      // Verify response
      expect(pauseResponse).toEqual({
        success: true,
        sessionId: 'session-123',
        status: 'paused',
        pausedAt: expect.any(String)
      });
      
      // Verify hook state
      expect(result.current.sessionStatus).toBe('paused');
      
      // Resume session
      let resumeResponse;
      await act(async () => {
        resumeResponse = await result.current.resumeSession();
      });
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/resume')
      );
      
      // Verify response
      expect(resumeResponse).toEqual({
        success: true,
        sessionId: 'session-123',
        status: 'active',
        resumedAt: expect.any(String)
      });
      
      // Verify hook state
      expect(result.current.sessionStatus).toBe('active');
    });

    it('should handle WebSocket connection for patient status updates', async () => {
      // Render hook
      const { result, waitForNextUpdate } = renderHook(() => useSession());
      
      // Set initial session state
      act(() => {
        result.current.setSessionId('session-123');
        result.current.setSessionStatus('active');
      });
      
      // Connect to WebSocket
      act(() => {
        result.current.connectToWebSocket();
      });
      
      // Wait for WebSocket to connect
      await waitForNextUpdate();
      
      // Simulate patient joined message
      act(() => {
        const ws = result.current.websocket;
        ws.onmessage({
          data: JSON.stringify({
            type: 'patient_joined',
            sessionId: 'session-123',
            patientId: 'patient-123',
            patientLanguage: 'es'
          })
        });
      });
      
      // Verify patient connected state
      expect(result.current.patientConnected).toBe(true);
      expect(result.current.patientId).toBe('patient-123');
      expect(result.current.patientLanguage).toBe('es');
      
      // Simulate patient left message
      act(() => {
        const ws = result.current.websocket;
        ws.onmessage({
          data: JSON.stringify({
            type: 'patient_left',
            sessionId: 'session-123',
            patientId: 'patient-123'
          })
        });
      });
      
      // Verify patient disconnected state
      expect(result.current.patientConnected).toBe(false);
    });
  });

  describe('usePatientHistory', () => {
    it('should fetch patient history', async () => {
      // Mock API response
      const mockHistory = [
        {
          sessionId: 'session-123',
          patientId: 'patient-123',
          date: '2023-01-01T00:00:00Z',
          duration: 30,
          language: 'es',
          translations: [
            { original: 'Hello', translated: 'Hola', timestamp: '2023-01-01T00:01:00Z' },
            { original: 'How are you?', translated: '¿Cómo estás?', timestamp: '2023-01-01T00:02:00Z' }
          ]
        },
        {
          sessionId: 'session-456',
          patientId: 'patient-123',
          date: '2023-01-02T00:00:00Z',
          duration: 45,
          language: 'es',
          translations: [
            { original: 'Good morning', translated: 'Buenos días', timestamp: '2023-01-02T00:01:00Z' }
          ]
        }
      ];
      
      axios.get.mockImplementation((url) => {
        if (url.includes('/patients/patient-123/history')) {
          return Promise.resolve({
            data: {
              history: mockHistory
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      // Render hook
      const { result, waitForNextUpdate } = renderHook(() => usePatientHistory());
      
      // Fetch patient history
      act(() => {
        result.current.fetchPatientHistory('patient-123');
      });
      
      // Wait for data to load
      await waitForNextUpdate();
      
      // Verify API call
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/patients/patient-123/history')
      );
      
      // Verify hook state
      expect(result.current.patientHistory).toEqual(mockHistory);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors', async () => {
      // Mock API error
      axios.get.mockRejectedValue(new Error('API error'));
      
      // Render hook
      const { result, waitForNextUpdate } = renderHook(() => usePatientHistory());
      
      // Fetch patient history
      act(() => {
        result.current.fetchPatientHistory('patient-123');
      });
      
      // Wait for error to be handled
      await waitForNextUpdate();
      
      // Verify hook state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch patient history: API error');
    });
  });

  describe('useTranslationMonitor', () => {
    it('should monitor translations via WebSocket', async () => {
      // Render hook
      const { result, waitForNextUpdate } = renderHook(() => useTranslationMonitor());
      
      // Set session ID and connect to WebSocket
      act(() => {
        result.current.setSessionId('session-123');
        result.current.connectToWebSocket();
      });
      
      // Wait for WebSocket to connect
      await waitForNextUpdate();
      
      // Simulate translation message
      act(() => {
        const ws = result.current.websocket;
        ws.onmessage({
          data: JSON.stringify({
            type: 'translation',
            id: 'trans-1',
            sessionId: 'session-123',
            original: 'Hello',
            translated: 'Hola',
            direction: 'provider-to-patient',
            timestamp: new Date().toISOString(),
            confidence: 0.95,
            source: 'cloud'
          })
        });
      });
      
      // Verify translation was added
      expect(result.current.translations).toHaveLength(1);
      expect(result.current.translations[0]).toEqual({
        id: 'trans-1',
        sessionId: 'session-123',
        original: 'Hello',
        translated: 'Hola',
        direction: 'provider-to-patient',
        timestamp: expect.any(String),
        confidence: 0.95,
        source: 'cloud'
      });
      
      // Simulate another translation message
      act(() => {
        const ws = result.current.websocket;
        ws.onmessage({
          data: JSON.stringify({
            type: 'translation',
            id: 'trans-2',
            sessionId: 'session-123',
            original: '¿Cómo estás?',
            translated: 'How are you?',
            direction: 'patient-to-provider',
            timestamp: new Date().toISOString(),
            confidence: 0.92,
            source: 'edge'
          })
        });
      });
      
      // Verify second translation was added
      expect(result.current.translations).toHaveLength(2);
    });

    it('should flag a translation', async () => {
      // Mock API response
      axios.post.mockImplementation((url) => {
        if (url.includes('/translations/trans-1/flag')) {
          return Promise.resolve({
            data: {
              success: true,
              translationId: 'trans-1',
              flagged: true
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      // Render hook
      const { result } = renderHook(() => useTranslationMonitor());
      
      // Flag translation
      let response;
      await act(async () => {
        response = await result.current.flagTranslation('trans-1');
      });
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/translations/trans-1/flag')
      );
      
      // Verify response
      expect(response).toEqual({
        success: true,
        translationId: 'trans-1',
        flagged: true
      });
    });

    it('should correct a translation', async () => {
      // Mock API response
      axios.post.mockImplementation((url) => {
        if (url.includes('/translations/trans-1/correct')) {
          return Promise.resolve({
            data: {
              success: true,
              translationId: 'trans-1',
              correctedText: 'Hola amigo',
              originalText: 'Hola'
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      // Render hook
      const { result } = renderHook(() => useTranslationMonitor());
      
      // Correct translation
      let response;
      await act(async () => {
        response = await result.current.correctTranslation('trans-1', 'Hola amigo');
      });
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/translations/trans-1/correct'),
        expect.objectContaining({
          correctedText: 'Hola amigo'
        })
      );
      
      // Verify response
      expect(response).toEqual({
        success: true,
        translationId: 'trans-1',
        correctedText: 'Hola amigo',
        originalText: 'Hola'
      });
    });

    it('should export translations', async () => {
      // Mock API response
      axios.get.mockImplementation((url) => {
        if (url.includes('/sessions/session-123/export')) {
          return Promise.resolve({
            data: {
              success: true,
              url: 'exports/session-123.pdf',
              format: 'pdf'
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      // Render hook
      const { result } = renderHook(() => useTranslationMonitor());
      
      // Export translations
      let response;
      await act(async () => {
        response = await result.current.exportTranslations('session-123');
      });
      
      // Verify API call
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/export')
      );
      
      // Verify response
      expect(response).toEqual({
        success: true,
        url: 'exports/session-123.pdf',
        format: 'pdf'
      });
    });
  });
});
