/**
 * Session Screen for MedTranslate AI Provider Application
 *
 * This screen handles the real-time translation session between
 * the provider and patient.
 */

import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import QRCode from 'react-native-qrcode-svg';

import { AuthContext } from '../context/AuthContext';
import TranslationMessage from '../components/TranslationMessage';
import VoiceRecordButton from '../components/VoiceRecordButton';
import ConnectionStatus from '../components/ConnectionStatus';
import TranslationMonitorPanel from '../components/TranslationMonitorPanel';
import websocketService from '../services/websocket-service';
import { API_ENDPOINTS, apiRequest } from '../config/api';

export default function SessionScreen({ navigation, route }) {
  const { sessionId, sessionCode } = route.params;
  const { userToken } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [recording, setRecording] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [audioPermission, setAudioPermission] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [translations, setTranslations] = useState([]);
  const [autoCorrect, setAutoCorrect] = useState(true);

  const scrollViewRef = useRef(null);
  const recordingRef = useRef(null);
  const webSocketRef = useRef(null);

  // Load session data and connect to WebSocket
  useEffect(() => {
    loadSessionData();
    connectWebSocket();
    loadAvailableLanguages();

    // Request audio permission
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setAudioPermission(status === 'granted');
    })();

    // Clean up on unmount
    return () => {
      websocketService.disconnect();
    };
  }, [sessionId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Load session data
  const loadSessionData = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(API_ENDPOINTS.SESSIONS.GET(sessionId), {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      setSession(data.session);

      // Add system message
      addMessage({
        id: 'system-1',
        text: `Session started. Medical context: ${data.session.medicalContext || 'General Medical'}`,
        sender: 'system',
        timestamp: new Date()
      });

      // Add patient join message if patient has joined
      if (data.session.patientJoined) {
        addMessage({
          id: 'system-2',
          text: `Patient joined the session. Speaking ${data.session.patientLanguage || 'Unknown language'}.`,
          sender: 'system',
          timestamp: new Date()
        });

        setSelectedLanguage(data.session.patientLanguage);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading session data:', error);
      setLoading(false);

      // Show error message
      Alert.alert(
        'Error',
        'Failed to load session data. Please try again.',
        [
          {
            text: 'Retry',
            onPress: loadSessionData
          },
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
            style: 'cancel'
          }
        ]
      );
    }
  };

  // Connect to WebSocket for real-time updates
  const connectWebSocket = async () => {
    try {
      // Connect to WebSocket
      await websocketService.connect(sessionId, userToken);

      // Set up connection state handler
      websocketService.onConnectionState((state, reason) => {
        console.log(`WebSocket connection state: ${state}`, reason);
        setIsConnected(state === 'connected');
      });

      // Set up message handlers
      websocketService.onMessage('connected', (message) => {
        console.log('Connected to session:', message);
      });

      websocketService.onMessage('user_joined', (message) => {
        if (message.userType === 'patient') {
          // Patient joined the session
          addMessage({
            id: `system-${Date.now()}`,
            text: `Patient joined the session. Speaking ${message.language || 'Unknown language'}.`,
            sender: 'system',
            timestamp: new Date(message.timestamp)
          });

          if (message.language) {
            setSelectedLanguage(message.language);
          }
        }
      });

      websocketService.onMessage('user_left', (message) => {
        if (message.userType === 'patient') {
          // Patient left the session
          addMessage({
            id: `system-${Date.now()}`,
            text: 'Patient left the session.',
            sender: 'system',
            timestamp: new Date(message.timestamp)
          });
        }
      });

      websocketService.onMessage('translation', (message) => {
        // New translation message
        const messageId = message.id || `msg-${Date.now()}`;

        // Add to messages list
        addMessage({
          id: messageId,
          text: message.translatedText,
          originalText: message.originalText,
          sender: message.sender.type,
          senderName: message.sender.name,
          timestamp: new Date(message.timestamp),
          confidence: message.confidence,
          translationId: message.translationId
        });

        // Add to translations monitoring
        addTranslation({
          id: message.translationId || messageId,
          originalText: message.originalText,
          translatedText: message.translatedText,
          confidence: message.confidence || 'medium',
          timestamp: message.timestamp,
          latency: message.latency,
          model: message.model,
          corrected: message.corrected,
          originalTranslation: message.originalTranslation
        });
      });

      websocketService.onMessage('session_closed', (message) => {
        // Session closed
        Alert.alert(
          'Session Ended',
          `The session has been closed: ${message.reason}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      });
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setIsConnected(false);

      // Try to reconnect after a delay
      setTimeout(() => {
        if (navigation.isFocused()) {
          connectWebSocket();
        }
      }, 5000);
    }
  };

  // Load available languages
  const loadAvailableLanguages = async () => {
    try {
      // For development, use a hardcoded list of languages
      if (process.env.NODE_ENV === 'development') {
        setAvailableLanguages([
          { code: 'en', name: 'English', nativeName: 'English' },
          { code: 'es', name: 'Spanish', nativeName: 'Español' },
          { code: 'fr', name: 'French', nativeName: 'Français' },
          { code: 'de', name: 'German', nativeName: 'Deutsch' },
          { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文' },
          { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
          { code: 'ru', name: 'Russian', nativeName: 'Русский' }
        ]);
        return;
      }

      // For production, fetch from API
      const data = await apiRequest(`${API_BASE_URL}/languages`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      setAvailableLanguages(data.languages || []);
    } catch (error) {
      console.error('Error loading languages:', error);

      // Fallback to basic languages
      setAvailableLanguages([
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'fr', name: 'French', nativeName: 'Français' }
      ]);
    }
  };

  // Add a message to the conversation
  const addMessage = (message) => {
    setMessages(prevMessages => [...prevMessages, message]);
  };

  // Add translation to the monitoring list
  const addTranslation = (translation) => {
    setTranslations(prev => {
      // Keep only the last 20 translations
      const updated = [translation, ...prev];
      return updated.slice(0, 20);
    });
  };

  // Handle report error
  const handleReportError = async (translationId, reason) => {
    try {
      await apiRequest(API_ENDPOINTS.TRANSLATIONS.REPORT_ERROR(translationId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      Alert.alert('Thank You', 'Your error report has been submitted and will help improve our translations.');
    } catch (error) {
      console.error('Error reporting translation error:', error);
      Alert.alert('Error', 'Failed to submit error report. Please try again.');
    }
  };

  // Handle request alternative translation
  const handleRequestAlternative = async (translationId) => {
    try {
      setTranslating(true);

      const response = await apiRequest(API_ENDPOINTS.TRANSLATIONS.ALTERNATIVE(translationId), {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      // Update messages with alternative translation
      if (response.translation) {
        // Find the original message
        const originalMessage = messages.find(msg => msg.translationId === translationId);

        if (originalMessage) {
          // Add system message about alternative
          addMessage({
            id: `system-alt-${Date.now()}`,
            text: `Alternative translation provided for: "${originalMessage.text}"`,
            sender: 'system',
            timestamp: new Date()
          });

          // Add alternative translation
          addMessage({
            id: `alt-${Date.now()}`,
            text: response.translation.translatedText,
            sender: 'provider',
            isAlternative: true,
            timestamp: new Date()
          });

          // Add to translations monitoring
          addTranslation({
            id: response.translation.id,
            originalText: originalMessage.text,
            translatedText: response.translation.translatedText,
            confidence: response.translation.confidence,
            timestamp: new Date().toISOString(),
            isAlternative: true
          });
        }
      }
    } catch (error) {
      console.error('Error requesting alternative translation:', error);
      Alert.alert('Error', 'Failed to get alternative translation. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  // Toggle auto-correct
  const handleToggleAutoCorrect = (value) => {
    setAutoCorrect(value);

    // Send preference to server
    websocketService.sendMessage({
      type: 'preference',
      preference: 'autoCorrect',
      value: value
    });
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      if (!audioPermission) {
        console.error('No audio permission');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setRecording(true);

      // Visual feedback that recording has started
      addMessage({
        id: `recording-${Date.now()}`,
        text: 'Recording...',
        sender: 'provider',
        timestamp: new Date(),
        isRecording: true
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  // Stop recording and translate
  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setRecording(false);
      await recordingRef.current.stopAndUnloadAsync();

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Remove the "Recording..." message
      setMessages(prev => prev.filter(msg => !msg.isRecording));

      // Process the audio for translation
      await processAudioForTranslation(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  // Process audio for translation
  const processAudioForTranslation = async (audioUri) => {
    try {
      setTranslating(true);

      // Create provider message placeholder
      const providerMessageId = `provider-${Date.now()}`;
      addMessage({
        id: providerMessageId,
        text: 'Processing your message...',
        sender: 'provider',
        timestamp: new Date(),
        isProcessing: true
      });

      // Convert audio to base64
      const audioBase64 = await fileToBase64(audioUri);

      // Send audio to server for processing
      const result = await apiRequest(API_ENDPOINTS.TRANSLATE.AUDIO, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          sessionId,
          audioData: audioBase64,
          sourceLanguage: 'en', // Provider language (English)
          targetLanguage: selectedLanguage || 'es', // Default to Spanish if not set
          context: session?.medicalContext || 'general'
        })
      });

      // Send message via WebSocket for real-time updates
      websocketService.sendMessage({
        type: 'translation',
        messageId: providerMessageId,
        originalText: result.originalText,
        translatedText: result.translatedText,
        sourceLanguage: 'en',
        targetLanguage: selectedLanguage || 'es',
        confidence: result.confidence,
        timestamp: new Date().toISOString()
      });

      // Update messages (WebSocket should handle this, but as a fallback)
      setMessages(prev => prev.map(msg =>
        msg.id === providerMessageId ? {
          ...msg,
          text: result.originalText,
          isProcessing: false
        } : msg
      ));
    } catch (error) {
      console.error('Translation failed:', error);

      // Update the processing message to show error
      setMessages(prev => prev.map(msg =>
        msg.isProcessing ? {
          ...msg,
          text: 'Translation failed. Please try again.',
          isProcessing: false,
          isError: true
        } : msg
      ));
    } finally {
      setTranslating(false);
    }
  };

  // Convert file to base64
  const fileToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting file to base64:', error);
      throw error;
    }
  };

  // Share session code
  const shareSessionCode = async () => {
    try {
      await Share.share({
        message: `Join my MedTranslate AI session with code: ${sessionCode}. Download the app: https://medtranslate.ai/app`
      });
    } catch (error) {
      console.error('Error sharing session code:', error);
    }
  };

  // End session
  const endSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this translation session?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call API to end session
              await apiRequest(API_ENDPOINTS.SESSIONS.END(sessionId), {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${userToken}`
                }
              });

              // Disconnect WebSocket
              websocketService.disconnect();

              // Navigate back
              navigation.goBack();
            } catch (error) {
              console.error('Error ending session:', error);
              Alert.alert('Error', 'Failed to end session. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Select patient language
  const selectLanguage = async (language) => {
    try {
      setShowLanguageSelector(false);

      if (!language || language === selectedLanguage) return;

      // Call API to update patient language
      await apiRequest(`${API_BASE_URL}/sessions/${sessionId}/language`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          language
        })
      });

      setSelectedLanguage(language);

      // Add system message
      addMessage({
        id: `system-${Date.now()}`,
        text: `Patient language set to ${language}.`,
        sender: 'system',
        timestamp: new Date()
      });

      // Broadcast language change via WebSocket
      websocketService.sendMessage({
        type: 'language_change',
        language,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating language:', error);
      Alert.alert('Error', 'Failed to update patient language. Please try again.');
    }
  };

  // Show loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077CC" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            Session #{sessionCode || sessionId.substring(0, 6)}
          </Text>
          <Text style={styles.headerSubtitle}>
            {session?.medicalContext || 'General Medical'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowQRCode(true)}
          >
            <Ionicons name="qr-code" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowLanguageSelector(true)}
          >
            <Ionicons name="language" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection status */}
      <View style={styles.connectionStatusContainer}>
        <ConnectionStatus
          isConnected={isConnected}
          activeEndpoint={API_ENDPOINTS.TRANSLATE.AUDIO}
          style={{
            container: styles.connectionStatus
          }}
        />
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.messagesContainer}
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="#BDBDBD" />
            <Text style={styles.emptyText}>
              No messages yet. Start the conversation or wait for the patient to join.
            </Text>

            <View style={styles.sessionInfoContainer}>
              <Text style={styles.sessionInfoTitle}>Session Information</Text>
              <Text style={styles.sessionInfoText}>
                Session Code: {sessionCode || 'N/A'}
              </Text>
              <Text style={styles.sessionInfoText}>
                Medical Context: {session?.medicalContext || 'General Medical'}
              </Text>
              <Text style={styles.sessionInfoText}>
                Patient Language: {selectedLanguage || 'Not set'}
              </Text>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={shareSessionCode}
              >
                <Ionicons name="share-social" size={16} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share Session Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          messages.map(message => (
            <TranslationMessage
              key={message.id}
              message={message}
              providerLanguage="en"
              patientLanguage={selectedLanguage || 'unknown'}
            />
          ))
        )}
      </ScrollView>

      {/* Translation Monitor Panel */}
      <TranslationMonitorPanel
        isActive={isConnected && session?.status === 'active'}
        translations={translations}
        sessionLanguage={selectedLanguage || 'Unknown'}
        onReportError={handleReportError}
        onRequestAlternative={handleRequestAlternative}
        onToggleAutoCorrect={handleToggleAutoCorrect}
      />

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.endButton}
          onPress={endSession}
        >
          <Text style={styles.endButtonText}>End Session</Text>
        </TouchableOpacity>

        <VoiceRecordButton
          onPressIn={startRecording}
          onPressOut={stopRecording}
          isRecording={recording}
          isTranslating={translating}
          disabled={!isConnected || !audioPermission}
        />

        <TouchableOpacity
          style={styles.shareCodeButton}
          onPress={shareSessionCode}
        >
          <Ionicons name="share-outline" size={24} color="#0077CC" />
        </TouchableOpacity>
      </View>

      {/* QR Code Modal */}
      <Modal
        visible={showQRCode}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRCode(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Session QR Code</Text>
            <Text style={styles.modalSubtitle}>
              Scan this code with the patient app to join the session
            </Text>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={`medtranslate://session/${sessionId}?code=${sessionCode}`}
                size={200}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>

            <Text style={styles.sessionCodeText}>
              Session Code: {sessionCode}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={shareSessionCode}
              >
                <Ionicons name="share-social" size={20} color="#0077CC" />
                <Text style={styles.modalButtonText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowQRCode(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal */}
      <Modal
        visible={showLanguageSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Patient Language</Text>

            <ScrollView style={styles.languageList}>
              {availableLanguages.map(language => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageItem,
                    selectedLanguage === language.code && styles.selectedLanguageItem
                  ]}
                  onPress={() => selectLanguage(language.code)}
                >
                  <Text style={styles.languageName}>{language.name}</Text>
                  <Text style={styles.languageNativeName}>{language.nativeName}</Text>

                  {selectedLanguage === language.code && (
                    <Ionicons name="checkmark-circle" size={20} color="#0077CC" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={() => setShowLanguageSelector(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0077CC',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#E1F5FE',
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  connectionText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
    color: '#757575',
    fontSize: 16,
  },
  sessionInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  sessionInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  sessionInfoText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0077CC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  endButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  endButtonText: {
    color: '#F44336',
    fontWeight: '500',
  },
  shareCodeButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 16,
  },
  sessionCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0077CC',
    flex: 1,
    marginHorizontal: 8,
  },
  modalButtonText: {
    color: '#0077CC',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  closeButton: {
    backgroundColor: '#0077CC',
    borderColor: '#0077CC',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  languageList: {
    width: '100%',
    maxHeight: 300,
    marginBottom: 24,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  selectedLanguageItem: {
    backgroundColor: '#E1F5FE',
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  languageNativeName: {
    fontSize: 14,
    color: '#757575',
    marginRight: 8,
  },
  connectionStatusContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
  },
  connectionStatus: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
