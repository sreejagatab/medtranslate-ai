/**
 * Unit tests for Mobile App Hooks
 */

import { renderHook, act } from '@testing-library/react-hooks';
import axios from 'axios';

// Import hooks to test
import useSystemStatus from '../../mobile/patient-app/src/hooks/useSystemStatus';
import useEdgeConnection from '../../mobile/patient-app/src/hooks/useEdgeConnection';
import useTranslation from '../../mobile/patient-app/src/hooks/useTranslation';
import useOfflineQueue from '../../mobile/patient-app/src/hooks/useOfflineQueue';

// Mock axios
jest.mock('axios');

// Mock local storage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock navigator.battery
Object.defineProperty(window.navigator, 'getBattery', {
  writable: true,
  value: jest.fn().mockResolvedValue({
    level: 0.85,
    charging: true,
    addEventListener: jest.fn()
  })
});

// Mock navigator.connection
Object.defineProperty(window.navigator, 'connection', {
  writable: true,
  value: {
    type: 'wifi',
    addEventListener: jest.fn()
  }
});

describe('Mobile App Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('useSystemStatus', () => {
    it('should return system status information', async () => {
      // Mock API responses
      axios.get.mockImplementation((url) => {
        if (url.includes('/health')) {
          return Promise.resolve({
            data: {
              status: 'healthy',
              version: '1.0.0',
              uptime: 3600
            }
          });
        }
        if (url.includes('/edge/health')) {
          return Promise.resolve({
            data: {
              status: 'healthy',
              onlineStatus: 'connected',
              sync: {
                lastSyncTime: '2023-01-01T00:00:00Z',
                status: 'success'
              }
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      // Render hook
      const { result, waitForNextUpdate } = renderHook(() => useSystemStatus());
      
      // Wait for initial data to load
      await waitForNextUpdate();
      
      // Check initial state
      expect(result.current.isOnline).toBe(true);
      expect(result.current.backendStatus).toBe('connected');
      expect(result.current.edgeStatus).toBe('connected');
      expect(result.current.batteryLevel).toBe(85);
      expect(result.current.networkType).toBe('wifi');
      
      // Test refresh function
      act(() => {
        result.current.refreshStatus();
      });
      
      // Wait for refresh to complete
      await waitForNextUpdate();
      
      // Verify API calls
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/health'));
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/edge/health'));
    });

    it('should handle offline state', async () => {
      // Set navigator.onLine to false
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      // Render hook
      const { result } = renderHook(() => useSystemStatus());
      
      // Check offline state
      expect(result.current.isOnline).toBe(false);
      expect(result.current.backendStatus).toBe('disconnected');
      
      // Simulate coming back online
      act(() => {
        Object.defineProperty(window.navigator, 'onLine', {
          writable: true,
          value: true
        });
        window.dispatchEvent(new Event('online'));
      });
      
      // Check online state
      expect(result.current.isOnline).toBe(true);
    });

    it('should handle API errors', async () => {
      // Mock API error
      axios.get.mockRejectedValue(new Error('API error'));
      
      // Render hook
      const { result, waitForNextUpdate } = renderHook(() => useSystemStatus());
      
      // Wait for error to be handled
      await waitForNextUpdate();
      
      // Check error state
      expect(result.current.backendStatus).toBe('error');
      expect(result.current.edgeStatus).toBe('error');
    });
  });

  describe('useEdgeConnection', () => {
    it('should handle device discovery and connection', async () => {
      // Mock API responses
      axios.get.mockImplementation((url) => {
        if (url.includes('/edge/discover')) {
          return Promise.resolve({
            data: {
              devices: [
                { id: 'edge-device-123', name: 'Edge Device', status: 'available' },
                { id: 'edge-device-456', name: 'Another Device', status: 'available' }
              ]
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      axios.post.mockImplementation((url) => {
        if (url.includes('/edge/connect')) {
          return Promise.resolve({
            data: {
              success: true,
              deviceId: 'edge-device-123',
              deviceName: 'Edge Device',
              status: 'connected'
            }
          });
        }
        if (url.includes('/edge/disconnect')) {
          return Promise.resolve({
            data: {
              success: true
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      // Render hook
      const { result } = renderHook(() => useEdgeConnection());
      
      // Check initial state
      expect(result.current.isConnected).toBe(false);
      expect(result.current.deviceId).toBeNull();
      
      // Scan for devices
      let devices;
      await act(async () => {
        devices = await result.current.scanForDevices();
      });
      
      // Check devices
      expect(devices).toHaveLength(2);
      expect(devices[0].id).toBe('edge-device-123');
      expect(devices[1].id).toBe('edge-device-456');
      
      // Connect to device
      await act(async () => {
        await result.current.connectToDevice('edge-device-123');
      });
      
      // Check connected state
      expect(result.current.isConnected).toBe(true);
      expect(result.current.deviceId).toBe('edge-device-123');
      expect(result.current.deviceName).toBe('Edge Device');
      expect(result.current.connectionStatus).toBe('connected');
      
      // Disconnect from device
      await act(async () => {
        await result.current.disconnectFromDevice();
      });
      
      // Check disconnected state
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('should handle connection errors', async () => {
      // Mock API error
      axios.post.mockRejectedValue(new Error('Connection error'));
      
      // Render hook
      const { result } = renderHook(() => useEdgeConnection());
      
      // Try to connect
      let error;
      await act(async () => {
        try {
          await result.current.connectToDevice('edge-device-123');
        } catch (e) {
          error = e;
        }
      });
      
      // Check error
      expect(error).toBeDefined();
      expect(error.message).toBe('Connection error');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe('error');
    });
  });

  describe('useTranslation', () => {
    it('should handle text translation', async () => {
      // Mock API response
      axios.post.mockImplementation((url) => {
        if (url.includes('/translate')) {
          return Promise.resolve({
            data: {
              originalText: 'Hello',
              translatedText: 'Hola',
              confidence: 0.95,
              source: 'cloud'
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      // Render hook
      const { result } = renderHook(() => useTranslation());
      
      // Check initial state
      expect(result.current.translationStatus).toBe('idle');
      expect(result.current.isTranslating).toBe(false);
      
      // Translate text
      let translation;
      await act(async () => {
        translation = await result.current.translate('Hello', 'en', 'es');
      });
      
      // Check translation
      expect(translation.originalText).toBe('Hello');
      expect(translation.translatedText).toBe('Hola');
      expect(translation.confidence).toBe(0.95);
      expect(translation.source).toBe('cloud');
      
      // Check hook state
      expect(result.current.translationStatus).toBe('completed');
      expect(result.current.lastTranslation).toEqual({
        originalText: 'Hello',
        translatedText: 'Hola'
      });
      expect(result.current.translationSource).toBe('cloud');
      expect(result.current.confidence).toBe(0.95);
      expect(result.current.isTranslating).toBe(false);
    });

    it('should handle translation errors', async () => {
      // Mock API error
      axios.post.mockRejectedValue(new Error('Translation error'));
      
      // Render hook
      const { result } = renderHook(() => useTranslation());
      
      // Try to translate
      let error;
      await act(async () => {
        try {
          await result.current.translate('Hello', 'en', 'es');
        } catch (e) {
          error = e;
        }
      });
      
      // Check error
      expect(error).toBeDefined();
      expect(error.message).toBe('Translation error');
      expect(result.current.translationStatus).toBe('error');
      expect(result.current.isTranslating).toBe(false);
    });
  });

  describe('useOfflineQueue', () => {
    it('should handle offline queue operations', async () => {
      // Mock API responses
      axios.get.mockImplementation((url) => {
        if (url.includes('/sync/queue')) {
          return Promise.resolve({
            data: {
              queueSize: 5,
              queueStatus: 'pending',
              lastSyncTime: '2023-01-01T00:00:00Z',
              items: [
                { id: 'item-1', type: 'translation', timestamp: '2023-01-01T00:00:00Z' },
                { id: 'item-2', type: 'translation', timestamp: '2023-01-01T00:01:00Z' }
              ]
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      axios.post.mockImplementation((url) => {
        if (url.includes('/sync/force')) {
          return Promise.resolve({
            data: {
              success: true,
              itemsSynced: 5,
              timestamp: '2023-01-01T00:02:00Z'
            }
          });
        }
        if (url.includes('/sync/clear')) {
          return Promise.resolve({
            data: {
              success: true
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });
      
      // Render hook
      const { result, waitForNextUpdate } = renderHook(() => useOfflineQueue());
      
      // Wait for initial data to load
      await waitForNextUpdate();
      
      // Check initial state
      expect(result.current.queueSize).toBe(5);
      expect(result.current.queueStatus).toBe('pending');
      expect(result.current.lastSyncTime).toBe('2023-01-01T00:00:00Z');
      
      // Sync queue
      await act(async () => {
        await result.current.syncQueue();
      });
      
      // Check synced state
      expect(result.current.queueStatus).toBe('synced');
      expect(result.current.lastSyncTime).toBe('2023-01-01T00:02:00Z');
      
      // Clear queue
      await act(async () => {
        await result.current.clearQueue();
      });
      
      // Check cleared state
      expect(result.current.queueSize).toBe(0);
      expect(result.current.queueStatus).toBe('empty');
    });

    it('should handle sync errors', async () => {
      // Mock API error
      axios.post.mockRejectedValue(new Error('Sync error'));
      
      // Render hook
      const { result } = renderHook(() => useOfflineQueue());
      
      // Try to sync
      let error;
      await act(async () => {
        try {
          await result.current.syncQueue();
        } catch (e) {
          error = e;
        }
      });
      
      // Check error
      expect(error).toBeDefined();
      expect(error.message).toBe('Sync error');
      expect(result.current.queueStatus).toBe('error');
    });
  });
});
