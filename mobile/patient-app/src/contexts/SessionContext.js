/**
 * Session Context for MedTranslate AI Patient App
 * 
 * Manages the translation session state
 */

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { STORAGE_KEYS } from '../utils/config';
import { ApiClient, WebSocketClient } from '../services/NetworkService';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

// Create context
const SessionContext = createContext();

// Session provider component
export const SessionProvider = ({ children }) => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [language, setLanguage] = useState('en');
  const [messages, setMessages] = useState([]);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Refs
  const webSocketClient = useRef(new WebSocketClient());
  const recordingRef = useRef(null);
  
  // Initialize session
  useEffect(() => {
    checkExistingSession();
    setupNetworkListener();
    
    return () => {
      // Clean up
      if (webSocketClient.current) {
        webSocketClient.current.disconnect();
      }
    };
  }, []);
  
  // Process offline queue when connection is restored
  useEffect(() => {
    if (isConnected && offlineQueue.length > 0 && hasSession) {
      processOfflineQueue();
    }
  }, [isConnected, offlineQueue, hasSession]);
  
  // Setup network connectivity listener
  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      
      if (state.isConnected && hasSession && !webSocketClient.current.isConnected()) {
        connectWebSocket();
      }
    });
    
    return unsubscribe;
  };
  
  // Check for existing session
  const checkExistingSession = async () => {
    try {
      const storedSessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.USER_LANGUAGE);
      const savedQueue = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
      
      if (savedQueue) {
        setOfflineQueue(JSON.parse(savedQueue));
      }
      
      if (token && storedSessionId) {
        setSessionId(storedSessionId);
        setHasSession(true);
        connectWebSocket();
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Connect to WebSocket
  const connectWebSocket = async () => {
    if (!sessionId) return;
    
    // Set up message handler
    webSocketClient.current.addMessageHandler('session', handleWebSocketMessage);
    
    // Set up connection handlers
    webSocketClient.current.addConnectionHandler('session', {
      onConnect: () => {
        console.log('WebSocket connected');
        
        // Process offline queue if any
        if (offlineQueue.length > 0) {
          processOfflineQueue();
        }
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      },
      onMaxReconnectAttemptsReached: () => {
        Alert.alert(
          'Connection Lost',
          'Unable to reconnect to the translation service. Please check your internet connection and try again.',
          [
            { text: 'OK' }
          ]
        );
      }
    });
    
    // Connect to WebSocket
    const success = await webSocketClient.current.connect(sessionId);
    
    if (!success) {
      Alert.alert(
        'Connection Error',
        'Failed to connect to the translation service. Please try again later.',
        [
          { text: 'OK' }
        ]
      );
    }
  };
  
  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'translation':
        addMessage({
          id: data.messageId,
          type: 'received',
          text: data.translatedText,
          originalText: data.originalText,
          timestamp: data.timestamp
        });
        break;
        
      case 'session_closed':
        Alert.alert('Session Ended', 'The provider has ended the session');
        endSession();
        break;
        
      case 'error':
        Alert.alert('Error', data.message);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };
  
  // Join a session with a code
  const joinSession = async (sessionCode, selectedLanguage) => {
    if (!sessionCode) {
      Alert.alert('Error', 'Please enter a session code');
      return false;
    }
    
    setIsLoading(true);
    
    try {
      const data = await ApiClient.joinSession(sessionCode, selectedLanguage);
      
      // Save session data
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, data.sessionId);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_LANGUAGE, selectedLanguage);
      
      setSessionId(data.sessionId);
      setLanguage(selectedLanguage);
      setHasSession(true);
      
      // Connect to WebSocket
      await connectWebSocket();
      
      // Add system message
      addMessage({
        id: Date.now().toString(),
        type: 'system',
        text: `Connected to session with ${data.providerName}`,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      Alert.alert('Error', error.message || 'Failed to join session');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // End the current session
  const endSession = async () => {
    try {
      // Disconnect WebSocket
      webSocketClient.current.disconnect();
      
      // Call API to end session
      if (sessionId) {
        try {
          await ApiClient.endSession(sessionId);
        } catch (error) {
          console.error('Error ending session on server:', error);
        }
      }
      
      // Clear session data
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      
      setSessionId(null);
      setHasSession(false);
      setMessages([]);
      
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  };
  
  // Add a message to the list
  const addMessage = (message) => {
    setMessages(prevMessages => [...prevMessages, message]);
  };
  
  // Send a text message
  const sendTextMessage = async (text) => {
    if (!text.trim()) return false;
    
    const messageText = text.trim();
    const messageId = Date.now().toString();
    const timestamp = new Date().toISOString();
    
    // Add message to UI immediately
    addMessage({
      id: messageId,
      type: 'sent',
      text: messageText,
      timestamp
    });
    
    // If offline, add to queue
    if (!isConnected || !webSocketClient.current.isConnected()) {
      addToOfflineQueue({
        type: 'text',
        messageId,
        text: messageText,
        timestamp
      });
      return true;
    }
    
    // Send via WebSocket
    const success = webSocketClient.current.send({
      type: 'translation',
      messageId,
      originalText: messageText,
      sourceLanguage: language,
      targetLanguage: 'en', // Provider language is English
      timestamp
    });
    
    if (!success) {
      // Add to offline queue if failed
      addToOfflineQueue({
        type: 'text',
        messageId,
        text: messageText,
        timestamp
      });
    }
    
    return true;
  };
  
  // Start recording audio
  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant microphone permissions to record audio');
        return false;
      }
      
      // Start recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
      });
      
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      
      recordingRef.current = recording;
      setIsRecording(true);
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording');
      return false;
    }
  };
  
  // Stop recording and send audio
  const stopRecording = async () => {
    if (!recordingRef.current) return false;
    
    try {
      setIsRecording(false);
      setIsTranslating(true);
      
      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      
      const messageId = Date.now().toString();
      const timestamp = new Date().toISOString();
      
      // Add message to UI
      addMessage({
        id: messageId,
        type: 'sent',
        text: '🎤 Audio message',
        isAudio: true,
        audioUri: uri,
        timestamp
      });
      
      // If offline, add to queue
      if (!isConnected || !webSocketClient.current.isConnected()) {
        addToOfflineQueue({
          type: 'audio',
          messageId,
          audioUri: uri,
          timestamp
        });
        setIsTranslating(false);
        return true;
      }
      
      // Read audio file as base64
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Send via WebSocket
      const success = webSocketClient.current.send({
        type: 'audio_translation',
        messageId,
        audioData: base64Audio,
        sourceLanguage: language,
        targetLanguage: 'en', // Provider language is English
        timestamp
      });
      
      if (!success) {
        // Add to offline queue if failed
        addToOfflineQueue({
          type: 'audio',
          messageId,
          audioUri: uri,
          timestamp
        });
      }
      
      setIsTranslating(false);
      return true;
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsTranslating(false);
      Alert.alert('Recording Error', 'Failed to process audio recording');
      return false;
    }
  };
  
  // Add item to offline queue
  const addToOfflineQueue = async (item) => {
    try {
      const newQueue = [...offlineQueue, item];
      setOfflineQueue(newQueue);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(newQueue));
      
      Alert.alert(
        'Offline Mode',
        'Your message has been saved and will be sent when you reconnect.'
      );
    } catch (error) {
      console.error('Error adding to offline queue:', error);
    }
  };
  
  // Process offline queue
  const processOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !isConnected || !webSocketClient.current.isConnected()) {
      return;
    }
    
    try {
      const queue = [...offlineQueue];
      setOfflineQueue([]);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
      
      for (const item of queue) {
        if (item.type === 'text') {
          webSocketClient.current.send({
            type: 'translation',
            messageId: item.messageId,
            originalText: item.text,
            sourceLanguage: language,
            targetLanguage: 'en',
            timestamp: item.timestamp
          });
        } else if (item.type === 'audio') {
          // Read audio file as base64
          const base64Audio = await FileSystem.readAsStringAsync(item.audioUri, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          webSocketClient.current.send({
            type: 'audio_translation',
            messageId: item.messageId,
            audioData: base64Audio,
            sourceLanguage: language,
            targetLanguage: 'en',
            timestamp: item.timestamp
          });
        }
        
        // Add a small delay between messages
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      Alert.alert('Sync Complete', `Successfully sent ${queue.length} offline messages`);
    } catch (error) {
      console.error('Error processing offline queue:', error);
      Alert.alert('Sync Error', 'Failed to send some offline messages');
    }
  };
  
  // Context value
  const value = {
    isLoading,
    isConnected,
    hasSession,
    sessionId,
    language,
    messages,
    offlineQueue,
    isTranslating,
    isRecording,
    joinSession,
    endSession,
    sendTextMessage,
    startRecording,
    stopRecording,
    setLanguage
  };
  
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook to use the session context
export const useSession = () => {
  const context = useContext(SessionContext);
  
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  
  return context;
};
