/**
 * Unit tests for Provider App Components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components to test
import SessionManagementPanel from '../../frontend/provider-app/src/components/SessionManagementPanel';
import PatientHistoryPanel from '../../frontend/provider-app/src/components/PatientHistoryPanel';
import TranslationMonitorPanel from '../../frontend/provider-app/src/components/TranslationMonitorPanel';
import SystemStatusDashboard from '../../frontend/provider-app/src/components/SystemStatusDashboard';

// Mock hooks
jest.mock('../../frontend/provider-app/src/hooks/useSession', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    sessionId: 'session-123',
    sessionCode: 'ABC123',
    sessionStatus: 'active',
    patientConnected: true,
    patientLanguage: 'es',
    createSession: jest.fn().mockResolvedValue({
      sessionId: 'new-session-123',
      sessionCode: 'XYZ789'
    }),
    endSession: jest.fn().mockResolvedValue({ success: true }),
    pauseSession: jest.fn().mockResolvedValue({ success: true }),
    resumeSession: jest.fn().mockResolvedValue({ success: true })
  }))
}));

jest.mock('../../frontend/provider-app/src/hooks/usePatientHistory', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    patientHistory: [
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
    ],
    isLoading: false,
    error: null,
    fetchPatientHistory: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('../../frontend/provider-app/src/hooks/useTranslationMonitor', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    translations: [
      {
        id: 'trans-1',
        original: 'Hello',
        translated: 'Hola',
        direction: 'provider-to-patient',
        timestamp: '2023-01-01T00:01:00Z',
        confidence: 0.95,
        source: 'cloud'
      },
      {
        id: 'trans-2',
        original: '¿Cómo estás?',
        translated: 'How are you?',
        direction: 'patient-to-provider',
        timestamp: '2023-01-01T00:02:00Z',
        confidence: 0.92,
        source: 'edge'
      }
    ],
    isTranslating: false,
    currentTranslation: null,
    flagTranslation: jest.fn().mockResolvedValue({ success: true }),
    correctTranslation: jest.fn().mockResolvedValue({ success: true }),
    exportTranslations: jest.fn().mockResolvedValue({ success: true, url: 'exports/session-123.pdf' })
  }))
}));

// Mock system status hook
jest.mock('../../frontend/provider-app/src/hooks/useSystemStatus', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isOnline: true,
    backendStatus: 'connected',
    edgeStatus: 'connected',
    lastSyncTime: new Date().toISOString(),
    syncStatus: 'success',
    refreshStatus: jest.fn()
  }))
}));

describe('Provider App Components', () => {
  describe('SessionManagementPanel', () => {
    it('should render session information', () => {
      render(<SessionManagementPanel />);
      
      // Check that session information is displayed
      expect(screen.getByText(/Session Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Session ID: session-123/i)).toBeInTheDocument();
      expect(screen.getByText(/Session Code: ABC123/i)).toBeInTheDocument();
      expect(screen.getByText(/Status: active/i)).toBeInTheDocument();
      expect(screen.getByText(/Patient Connected: Yes/i)).toBeInTheDocument();
      expect(screen.getByText(/Patient Language: es/i)).toBeInTheDocument();
    });

    it('should create a new session when create button is clicked', async () => {
      const { getByRole } = render(<SessionManagementPanel />);
      
      // Find and click create button
      const createButton = getByRole('button', { name: /create session/i });
      fireEvent.click(createButton);
      
      // Verify create function was called
      const useSession = require('../../frontend/provider-app/src/hooks/useSession').default;
      expect(useSession().createSession).toHaveBeenCalled();
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Session created successfully/i)).toBeInTheDocument();
      });
    });

    it('should end a session when end button is clicked', async () => {
      const { getByRole } = render(<SessionManagementPanel />);
      
      // Find and click end button
      const endButton = getByRole('button', { name: /end session/i });
      fireEvent.click(endButton);
      
      // Verify end function was called
      const useSession = require('../../frontend/provider-app/src/hooks/useSession').default;
      expect(useSession().endSession).toHaveBeenCalled();
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Session ended successfully/i)).toBeInTheDocument();
      });
    });

    it('should pause and resume a session', async () => {
      const { getByRole } = render(<SessionManagementPanel />);
      
      // Find and click pause button
      const pauseButton = getByRole('button', { name: /pause session/i });
      fireEvent.click(pauseButton);
      
      // Verify pause function was called
      const useSession = require('../../frontend/provider-app/src/hooks/useSession').default;
      expect(useSession().pauseSession).toHaveBeenCalled();
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Session paused/i)).toBeInTheDocument();
      });
      
      // Find and click resume button
      const resumeButton = getByRole('button', { name: /resume session/i });
      fireEvent.click(resumeButton);
      
      // Verify resume function was called
      expect(useSession().resumeSession).toHaveBeenCalled();
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Session resumed/i)).toBeInTheDocument();
      });
    });
  });

  describe('PatientHistoryPanel', () => {
    it('should render patient history', () => {
      render(<PatientHistoryPanel patientId="patient-123" />);
      
      // Check that patient history is displayed
      expect(screen.getByText(/Patient History/i)).toBeInTheDocument();
      expect(screen.getByText(/January 1, 2023/i)).toBeInTheDocument();
      expect(screen.getByText(/January 2, 2023/i)).toBeInTheDocument();
      expect(screen.getByText(/Duration: 30 minutes/i)).toBeInTheDocument();
      expect(screen.getByText(/Duration: 45 minutes/i)).toBeInTheDocument();
    });

    it('should fetch patient history when component mounts', () => {
      render(<PatientHistoryPanel patientId="patient-123" />);
      
      // Verify fetch function was called
      const usePatientHistory = require('../../frontend/provider-app/src/hooks/usePatientHistory').default;
      expect(usePatientHistory().fetchPatientHistory).toHaveBeenCalledWith('patient-123');
    });

    it('should display session details when a session is selected', () => {
      render(<PatientHistoryPanel patientId="patient-123" />);
      
      // Find and click a session
      const sessionButton = screen.getByText(/January 1, 2023/i);
      fireEvent.click(sessionButton);
      
      // Check that session details are displayed
      expect(screen.getByText(/Session Details/i)).toBeInTheDocument();
      expect(screen.getByText(/Hello/i)).toBeInTheDocument();
      expect(screen.getByText(/Hola/i)).toBeInTheDocument();
      expect(screen.getByText(/How are you?/i)).toBeInTheDocument();
      expect(screen.getByText(/¿Cómo estás?/i)).toBeInTheDocument();
    });
  });

  describe('TranslationMonitorPanel', () => {
    it('should render translation history', () => {
      render(<TranslationMonitorPanel sessionId="session-123" />);
      
      // Check that translation history is displayed
      expect(screen.getByText(/Translation Monitor/i)).toBeInTheDocument();
      expect(screen.getByText(/Hello/i)).toBeInTheDocument();
      expect(screen.getByText(/Hola/i)).toBeInTheDocument();
      expect(screen.getByText(/¿Cómo estás?/i)).toBeInTheDocument();
      expect(screen.getByText(/How are you?/i)).toBeInTheDocument();
    });

    it('should flag a translation when flag button is clicked', async () => {
      const { getAllByRole } = render(<TranslationMonitorPanel sessionId="session-123" />);
      
      // Find and click flag button
      const flagButtons = getAllByRole('button', { name: /flag/i });
      fireEvent.click(flagButtons[0]);
      
      // Verify flag function was called
      const useTranslationMonitor = require('../../frontend/provider-app/src/hooks/useTranslationMonitor').default;
      expect(useTranslationMonitor().flagTranslation).toHaveBeenCalled();
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Translation flagged/i)).toBeInTheDocument();
      });
    });

    it('should correct a translation when correct button is clicked', async () => {
      const { getAllByRole } = render(<TranslationMonitorPanel sessionId="session-123" />);
      
      // Find and click correct button
      const correctButtons = getAllByRole('button', { name: /correct/i });
      fireEvent.click(correctButtons[0]);
      
      // Enter correction
      const correctionInput = screen.getByRole('textbox');
      fireEvent.change(correctionInput, { target: { value: 'Hola amigo' } });
      
      // Submit correction
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);
      
      // Verify correct function was called
      const useTranslationMonitor = require('../../frontend/provider-app/src/hooks/useTranslationMonitor').default;
      expect(useTranslationMonitor().correctTranslation).toHaveBeenCalledWith(
        expect.any(String),
        'Hola amigo'
      );
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Translation corrected/i)).toBeInTheDocument();
      });
    });

    it('should export translations when export button is clicked', async () => {
      const { getByRole } = render(<TranslationMonitorPanel sessionId="session-123" />);
      
      // Find and click export button
      const exportButton = getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);
      
      // Verify export function was called
      const useTranslationMonitor = require('../../frontend/provider-app/src/hooks/useTranslationMonitor').default;
      expect(useTranslationMonitor().exportTranslations).toHaveBeenCalledWith('session-123');
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Translations exported/i)).toBeInTheDocument();
      });
    });
  });

  describe('SystemStatusDashboard', () => {
    it('should render system status information', () => {
      render(<SystemStatusDashboard />);
      
      // Check that status information is displayed
      expect(screen.getByText(/System Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
      expect(screen.getByText(/Backend: connected/i)).toBeInTheDocument();
      expect(screen.getByText(/Edge: connected/i)).toBeInTheDocument();
      expect(screen.getByText(/Last Sync:/i)).toBeInTheDocument();
      expect(screen.getByText(/Sync Status: success/i)).toBeInTheDocument();
    });

    it('should call refresh status when refresh button is clicked', () => {
      const { getByRole } = render(<SystemStatusDashboard />);
      
      // Find and click refresh button
      const refreshButton = getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      
      // Verify refresh function was called
      const useSystemStatus = require('../../frontend/provider-app/src/hooks/useSystemStatus').default;
      expect(useSystemStatus().refreshStatus).toHaveBeenCalled();
    });
  });
});
