/**
 * Translation Session Screen for MedTranslate AI Patient Application
 *
 * This screen handles the real-time translation session between
 * the patient and healthcare provider.
 */

import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

import { TranslationContext } from '../context/TranslationContext';
import { EdgeConnectionContext } from '../context/EdgeConnectionContext';
import TranslationMessage from '../components/TranslationMessage';
import EnhancedVoiceRecordButton from '../components/EnhancedVoiceRecordButton';
import TranslationStatusIndicator from '../components/TranslationStatusIndicator';
import WebSocketStatus from '../../shared/components/WebSocketStatus';
import websocketService from '../services/websocket-service';
import { API_ENDPOINTS, apiRequest } from '../config/api';

export default function TranslationSessionScreen({ navigation, route }) {
  const { sessionId, sessionToken, providerName, medicalContext } = route.params;
  const insets = useSafeAreaInsets();

  const { selectedLanguage } = useContext(TranslationContext);
  const { edgeConnection, isConnected: isEdgeConnected } = useContext(EdgeConnectionContext);

  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [translating, setTranslating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioPermission, setAudioPermission] = useState(null);
  const [translationStatus, setTranslationStatus] = useState('idle');
  const [translationConfidence, setTranslationConfidence] = useState(null);
  const [translationError, setTranslationError] = useState(null);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [recordingLevel, setRecordingLevel] = useState(0);

  const scrollViewRef = useRef(null);
  const recordingRef = useRef(null);
  const recordingLevelInterval = useRef(null);

  // Request audio permission and connect to WebSocket on component mount
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setAudioPermission(status === 'granted');
    })();

    // Connect to WebSocket
    connectToSession();

    // Try to connect to edge device if available
    if (isEdgeConnected) {
      connectToEdgeDevice();
    }

    return () => {
      // Cleanup when component unmounts
      websocketService.disconnect();
      if (isEdgeConnected) {
        edgeConnection.disconnect();
      }
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Connect to WebSocket session
  const connectToSession = async () => {
    try {
      // Connect to WebSocket
      await websocketService.connect(sessionId, sessionToken);

      // Set up connection state handler
      websocketService.onConnectionState((state, reason) => {
        console.log(`WebSocket connection state: ${state}`, reason);
        setIsConnected(state === 'connected');
      });

      // Set up message handlers
      websocketService.onMessage('connected', (message) => {
        console.log('Connected to session:', message);

        // Add system message
        addMessage({
          id: 'system-1',
          text: `Connected to medical translation session. Speaking ${selectedLanguage.name}.`,
          sender: 'system',
          timestamp: new Date()
        });
      });

      websocketService.onMessage('user_joined', (message) => {
        if (message.userType === 'provider') {
          // Provider joined the session
          addMessage({
            id: `system-${Date.now()}`,
            text: `Provider ${message.userName} joined the session.`,
            sender: 'system',
            timestamp: new Date(message.timestamp)
          });
        }
      });

      websocketService.onMessage('user_left', (message) => {
        if (message.userType === 'provider') {
          // Provider left the session
          addMessage({
            id: `system-${Date.now()}`,
            text: `Provider ${message.userName} left the session.`,
            sender: 'system',
            timestamp: new Date(message.timestamp)
          });
        }
      });

      websocketService.onMessage('translation', (message) => {
        // New translation message
        addMessage({
          id: message.id || `msg-${Date.now()}`,
          text: message.translatedText,
          originalText: message.originalText,
          sender: message.sender.type,
          senderName: message.sender.name,
          timestamp: new Date(message.timestamp),
          confidence: message.confidence,
          adaptiveThresholds: message.adaptiveThresholds
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
              onPress: () => navigation.navigate('SessionSummary', {
                messages,
                sessionId,
                providerName,
                medicalContext,
                duration: calculateSessionDuration()
              })
            }
          ]
        );
      });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setIsConnected(false);

      // Add error message
      addMessage({
        id: 'error-1',
        text: 'Failed to connect to translation service. Please try again.',
        sender: 'system',
        timestamp: new Date(),
        isError: true
      });
    }
  };

  // Connect to edge device
  const connectToEdgeDevice = async () => {
    try {
      await edgeConnection.connect(sessionId);
      console.log('Connected to edge device');
    } catch (error) {
      console.error('Failed to connect to edge device:', error);
    }
  };

  // Add a message to the conversation
  const addMessage = (message) => {
    setMessages(prevMessages => [...prevMessages, message]);
  };

  // Update an existing message
  const updateMessage = (messageId, updates) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      if (!audioPermission) {
        console.error('No audio permission');
        return;
      }

      // Update translation status
      setTranslationStatus('recording');
      setTranslationProgress(0);
      setTranslationError(null);

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

      // Start monitoring recording level
      recordingLevelInterval.current = setInterval(() => {
        if (recordingRef.current) {
          // Simulate recording level for now
          // In a real app, you would get this from the recording API
          const randomLevel = 0.3 + (Math.random() * 0.7); // Between 0.3 and 1.0
          setRecordingLevel(randomLevel);
        }
      }, 100);

      // Visual feedback that recording has started
      addMessage({
        id: `recording-${Date.now()}`,
        text: 'Recording...',
        sender: 'patient',
        timestamp: new Date(),
        isRecording: true
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      setTranslationStatus('error');
      setTranslationError('Failed to start recording. Please try again.');
    }
  };

  // Stop recording and translate
  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setRecording(false);

      // Clear recording level interval
      if (recordingLevelInterval.current) {
        clearInterval(recordingLevelInterval.current);
        recordingLevelInterval.current = null;
      }

      // Update translation status
      setTranslationStatus('processing');
      setTranslationProgress(0.2);

      await recordingRef.current.stopAndUnloadAsync();

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Remove the "Recording..." message
      setMessages(prev => prev.filter(msg => !msg.isRecording));

      // Process the audio for translation
      await processAudioForTranslation(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setTranslationStatus('error');
      setTranslationError('Failed to process recording. Please try again.');
    }
  };

  // Process audio for translation
  const processAudioForTranslation = async (audioUri) => {
    try {
      setTranslating(true);
      setTranslationStatus('translating');
      setTranslationProgress(0.4);

      // Create patient message placeholder
      const patientMessageId = `patient-${Date.now()}`;
      addMessage({
        id: patientMessageId,
        text: 'Processing your message...',
        sender: 'patient',
        timestamp: new Date(),
        isProcessing: true
      });

      // Convert audio to base64
      const audioBase64 = await fileToBase64(audioUri);
      setTranslationProgress(0.6);

      // Try to use edge device if connected
      let translationResult;
      if (isEdgeConnected) {
        try {
          translationResult = await edgeConnection.translateAudio(
            audioBase64,
            selectedLanguage.code,
            'en', // Provider language (English)
            medicalContext
          );
        } catch (error) {
          console.error('Edge translation failed, falling back to cloud:', error);
        }
      }

      // Fall back to cloud if edge translation failed or not available
      if (!translationResult) {
        translationResult = await apiRequest(API_ENDPOINTS.TRANSLATE.AUDIO, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            sessionId,
            audioData: audioBase64,
            sourceLanguage: selectedLanguage.code,
            targetLanguage: 'en', // Provider language (English)
            context: medicalContext || 'general'
          })
        });
      }

      setTranslationProgress(0.9);

      // Update patient message with transcription
      updateMessage(patientMessageId, {
        text: translationResult.originalText,
        isProcessing: false
      });

      // Send message via WebSocket for real-time updates
      websocketService.sendMessage({
        type: 'translation',
        messageId: patientMessageId,
        originalText: translationResult.originalText,
        translatedText: translationResult.translatedText,
        sourceLanguage: selectedLanguage.code,
        targetLanguage: 'en',
        confidence: translationResult.confidence,
        adaptiveThresholds: translationResult.adaptiveThresholds,
        timestamp: new Date().toISOString()
      });

      // Update translation status
      setTranslationStatus('completed');
      setTranslationProgress(1.0);
      setTranslationConfidence(translationResult.confidence || 'medium');

      // Store adaptive thresholds if available
      if (translationResult.adaptiveThresholds) {
        updateMessage(patientMessageId, {
          adaptiveThresholds: translationResult.adaptiveThresholds
        });
      }

      // Play the translation audio if available
      if (translationResult.audioResponse) {
        await playTranslationAudio(translationResult.audioResponse);
      }
    } catch (error) {
      console.error('Translation failed:', error);

      // Update translation status
      setTranslationStatus('error');
      setTranslationError('Translation failed. Please try again.');
      setTranslationProgress(0);

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

      // Reset translation status after a delay
      setTimeout(() => {
        if (translationStatus === 'completed' || translationStatus === 'error') {
          setTranslationStatus('idle');
          setTranslationProgress(0);
        }
      }, 3000);
    }
  };

  // Convert file to base64
  const fileToBase64 = async (uri) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      return base64;
    } catch (error) {
      console.error('Error converting file to base64:', error);
      throw error;
    }
  };

  // Play translation audio
  const playTranslationAudio = async (audioData) => {
    try {
      // Convert base64 to audio file
      const audioUri = await saveBase64Audio(audioData);

      // Play the audio
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play translation audio:', error);
    }
  };

  // Save base64 audio to a temporary file
  const saveBase64Audio = async (base64Audio) => {
    try {
      const filename = `${FileSystem.cacheDirectory}audio-${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(filename, base64Audio, {
        encoding: FileSystem.EncodingType.Base64
      });
      return filename;
    } catch (error) {
      console.error('Error saving base64 audio:', error);
      throw error;
    }
  };

  // End the translation session
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
              // Disconnect from WebSocket
              websocketService.disconnect();

              // Disconnect from edge device if connected
              if (isEdgeConnected) {
                edgeConnection.disconnect();
              }

              // Navigate to summary screen
              navigation.navigate('SessionSummary', {
                messages,
                sessionId,
                providerName,
                medicalContext,
                duration: calculateSessionDuration()
              });
            } catch (error) {
              console.error('Error ending session:', error);
            }
          }
        }
      ]
    );
  };

  // Calculate session duration
  const calculateSessionDuration = () => {
    if (messages.length < 2) return 0;

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    return (lastMessage.timestamp - firstMessage.timestamp) / 1000; // in seconds
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {providerName || 'Medical Provider'}
        </Text>

        <View style={styles.connectionIndicator}>
          <WebSocketStatus
            websocketService={websocketService}
            showReconnectButton={false}
            textStyle={styles.connectionText}
            iconSize={12}
          />
        </View>
      </View>

      {/* Medical Context Banner */}
      <View style={styles.contextBanner}>
        <Text style={styles.contextText}>
          {medicalContext || 'General Medical Consultation'}
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        ref={scrollViewRef}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="#BDBDBD" />
            <Text style={styles.emptyStateText}>
              Tap and hold the microphone button to start speaking in your language.
              Your message will be translated for the healthcare provider.
            </Text>
          </View>
        ) : (
          messages.map(message => (
            <TranslationMessage
              key={message.id}
              message={message}
              patientLanguage={selectedLanguage.code}
            />
          ))
        )}
      </ScrollView>

      {/* Translation Status Indicator */}
      <TranslationStatusIndicator
        status={translationStatus}
        confidence={translationConfidence}
        errorMessage={translationError}
        progress={translationProgress}
        onRetry={translationStatus === 'error' ? () => setTranslationStatus('idle') : null}
        showDetails={translationStatus === 'error' || translationStatus === 'completed'}
        medicalContext={medicalContext || 'general'}
        adaptiveThresholds={translationStatus === 'completed' && messages.length > 0 ?
          messages[messages.length - 1].adaptiveThresholds : null}
      />

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.endButton}
          onPress={endSession}
        >
          <Text style={styles.endButtonText}>End Session</Text>
        </TouchableOpacity>

        <EnhancedVoiceRecordButton
          onPressIn={startRecording}
          onPressOut={stopRecording}
          isRecording={recording}
          isTranslating={translating}
          recordingLevel={recordingLevel}
          disabled={!isConnected || !audioPermission}
          showTimer={true}
          showWaveform={true}
        />

        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={28} color="#757575" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0077CC',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  connectionText: {
    color: '#ffffff',
    fontSize: 12,
  },
  contextBanner: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  contextText: {
    color: '#0D47A1',
    fontSize: 14,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    opacity: 0.7,
  },
  emptyStateText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#757575',
    fontSize: 16,
    paddingHorizontal: 24,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  endButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e53935',
  },
  endButtonText: {
    color: '#e53935',
    fontWeight: '500',
  },
  helpButton: {
    padding: 8,
  },
});
