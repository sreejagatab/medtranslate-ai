import React, { useState, useEffect, useRef } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar
} from 'react-native';
import { Audio } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { MaterialIcons } from '@expo/vector-icons';

// API Configuration
const API_URL = 'https://api.medtranslate.ai';
const WS_URL = 'wss://api.medtranslate.ai/ws';

// Storage Keys
const STORAGE_KEYS = {
  SESSION_TOKEN: 'session_token',
  SESSION_ID: 'session_id',
  USER_LANGUAGE: 'user_language',
  OFFLINE_QUEUE: 'offline_queue',
  TRANSLATION_CACHE: 'translation_cache'
};

// Supported Languages
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' }
];

export default function App() {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [sessionCode, setSessionCode] = useState('');
  const [language, setLanguage] = useState('es');
  const [hasSession, setHasSession] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState([]);
  
  // Refs
  const webSocketRef = useRef(null);
  const recordingRef = useRef(null);
  const flatListRef = useRef(null);
  
  // Check for existing session on startup
  useEffect(() => {
    checkExistingSession();
    setupNetworkListener();
  }, []);
  
  // Process offline queue when connection is restored
  useEffect(() => {
    if (isConnected && offlineQueue.length > 0) {
      processOfflineQueue();
    }
  }, [isConnected, offlineQueue]);
  
  // Setup network connectivity listener
  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      
      if (state.isConnected && webSocketRef.current === null && hasSession) {
        connectWebSocket();
      }
    });
    
    return () => unsubscribe();
  };
  
  // Check for existing session
  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      const sessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.USER_LANGUAGE);
      const savedQueue = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
      
      if (savedQueue) {
        setOfflineQueue(JSON.parse(savedQueue));
      }
      
      if (token && sessionId) {
        setHasSession(true);
        connectWebSocket();
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Join a session with a code
  const joinSession = async () => {
    if (!sessionCode) {
      Alert.alert('Error', 'Please enter a session code');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/sessions/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionCode,
          language
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join session');
      }
      
      // Save session data
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, data.sessionId);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_LANGUAGE, language);
      
      setHasSession(true);
      connectWebSocket();
      
      // Add system message
      addMessage({
        id: Date.now().toString(),
        type: 'system',
        text: `Connected to session with ${data.providerName}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error joining session:', error);
      Alert.alert('Error', error.message || 'Failed to join session');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Connect to WebSocket
  const connectWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      const sessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
      
      if (!token || !sessionId) {
        throw new Error('No session token or ID found');
      }
      
      // Close existing connection if any
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      // Create new WebSocket connection
      const ws = new WebSocket(`${WS_URL}?token=${token}&sessionId=${sessionId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        
        // Process offline queue if any
        if (offlineQueue.length > 0) {
          processOfflineQueue();
        }
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        
        // Try to reconnect if we still have a session
        if (hasSession) {
          setTimeout(() => {
            if (isConnected) {
              connectWebSocket();
            }
          }, 5000);
        }
      };
      
      webSocketRef.current = ws;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
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
  
  // Add a message to the list
  const addMessage = (message) => {
    setMessages(prevMessages => [...prevMessages, message]);
    
    // Scroll to bottom
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };
  
  // Send a text message
  const sendTextMessage = async () => {
    if (!inputText.trim()) return;
    
    const messageText = inputText.trim();
    setInputText('');
    
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
    if (!isConnected || webSocketRef.current?.readyState !== WebSocket.OPEN) {
      addToOfflineQueue({
        type: 'text',
        messageId,
        text: messageText,
        timestamp
      });
      return;
    }
    
    try {
      // Send via WebSocket
      webSocketRef.current.send(JSON.stringify({
        type: 'translation',
        messageId,
        originalText: messageText,
        sourceLanguage: language,
        targetLanguage: 'en', // Provider language is English
        timestamp
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add to offline queue if failed
      addToOfflineQueue({
        type: 'text',
        messageId,
        text: messageText,
        timestamp
      });
    }
  };
  
  // Start recording audio
  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant microphone permissions to record audio');
        return;
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
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording');
    }
  };
  
  // Stop recording and send audio
  const stopRecording = async () => {
    if (!recordingRef.current) return;
    
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
      if (!isConnected || webSocketRef.current?.readyState !== WebSocket.OPEN) {
        addToOfflineQueue({
          type: 'audio',
          messageId,
          audioUri: uri,
          timestamp
        });
        setIsTranslating(false);
        return;
      }
      
      // Read audio file as base64
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Send via WebSocket
      webSocketRef.current.send(JSON.stringify({
        type: 'audio_translation',
        messageId,
        audioData: base64Audio,
        sourceLanguage: language,
        targetLanguage: 'en', // Provider language is English
        timestamp
      }));
      
      setIsTranslating(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsTranslating(false);
      Alert.alert('Recording Error', 'Failed to process audio recording');
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
    if (offlineQueue.length === 0 || !isConnected || 
        webSocketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      const queue = [...offlineQueue];
      setOfflineQueue([]);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
      
      for (const item of queue) {
        if (item.type === 'text') {
          webSocketRef.current.send(JSON.stringify({
            type: 'translation',
            messageId: item.messageId,
            originalText: item.text,
            sourceLanguage: language,
            targetLanguage: 'en',
            timestamp: item.timestamp
          }));
        } else if (item.type === 'audio') {
          // Read audio file as base64
          const base64Audio = await FileSystem.readAsStringAsync(item.audioUri, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          webSocketRef.current.send(JSON.stringify({
            type: 'audio_translation',
            messageId: item.messageId,
            audioData: base64Audio,
            sourceLanguage: language,
            targetLanguage: 'en',
            timestamp: item.timestamp
          }));
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
  
  // End the current session
  const endSession = async () => {
    try {
      // Close WebSocket
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      
      // Clear session data
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      
      setHasSession(false);
      setMessages([]);
      setSessionCode('');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };
  
  // Render message item
  const renderMessageItem = ({ item }) => {
    const isSystem = item.type === 'system';
    const isSent = item.type === 'sent';
    
    return (
      <View style={[
        styles.messageContainer,
        isSystem ? styles.systemMessage : 
        isSent ? styles.sentMessage : styles.receivedMessage
      ]}>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };
  
  // Loading screen
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  // Join session screen
  if (!hasSession) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.joinContainer}>
          <Text style={styles.title}>MedTranslate AI</Text>
          <Text style={styles.subtitle}>Patient Application</Text>
          
          <View style={styles.formContainer}>
            <Text style={styles.label}>Session Code</Text>
            <TextInput
              style={styles.input}
              value={sessionCode}
              onChangeText={setSessionCode}
              placeholder="Enter 6-digit code"
              keyboardType="number-pad"
              maxLength={6}
            />
            
            <Text style={styles.label}>Your Language</Text>
            <View style={styles.languageContainer}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageButton,
                    language === lang.code && styles.selectedLanguage
                  ]}
                  onPress={() => setLanguage(lang.code)}
                >
                  <Text style={[
                    styles.languageText,
                    language === lang.code && styles.selectedLanguageText
                  ]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.joinButton}
              onPress={joinSession}
            >
              <Text style={styles.joinButtonText}>Join Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  // Chat screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MedTranslate AI</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.endButton}
          onPress={() => {
            Alert.alert(
              'End Session',
              'Are you sure you want to leave this session?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: endSession }
              ]
            );
          }}
        >
          <Text style={styles.endButtonText}>Leave</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        style={styles.messageList}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messageListContent}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          multiline
        />
        
        {isTranslating ? (
          <ActivityIndicator size="small" color="#0066CC" style={styles.sendButton} />
        ) : (
          <>
            <TouchableOpacity
              style={styles.micButton}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <MaterialIcons
                name={isRecording ? "mic" : "mic-none"}
                size={24}
                color={isRecording ? "#FF3B30" : "#0066CC"}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendTextMessage}
              disabled={!inputText.trim()}
            >
              <MaterialIcons
                name="send"
                size={24}
                color={inputText.trim() ? "#0066CC" : "#CCCCCC"}
              />
            </TouchableOpacity>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333'
  },
  joinContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0066CC',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20
  },
  languageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 30
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    marginBottom: 8
  },
  selectedLanguage: {
    backgroundColor: '#0066CC'
  },
  languageText: {
    fontSize: 14,
    color: '#333'
  },
  selectedLanguageText: {
    color: 'white'
  },
  joinButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC'
  },
  offlineBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  offlineText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  endButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F0F0'
  },
  endButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600'
  },
  messageList: {
    flex: 1
  },
  messageListContent: {
    padding: 16
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12
  },
  systemMessage: {
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    borderRadius: 8,
    maxWidth: '90%'
  },
  sentMessage: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
    borderTopRightRadius: 4
  },
  receivedMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4
  },
  messageText: {
    fontSize: 16,
    color: '#333'
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 4
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  }
});
