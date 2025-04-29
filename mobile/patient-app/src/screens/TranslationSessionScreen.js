/**
 * Translation Session Screen for MedTranslate AI Patient App
 * 
 * Main screen for the translation session
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSession } from '../contexts/SessionContext';
import MessageBubble from '../components/MessageBubble';
import OfflineIndicator from '../components/OfflineIndicator';

const TranslationSessionScreen = ({ navigation }) => {
  const {
    messages,
    isConnected,
    isTranslating,
    isRecording,
    sendTextMessage,
    startRecording,
    stopRecording,
    endSession
  } = useSession();
  
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);
  
  // Handle send button press
  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const success = await sendTextMessage(inputText);
    
    if (success) {
      setInputText('');
    }
  };
  
  // Handle end session
  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this translation session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            const success = await endSession();
            
            if (success) {
              navigation.replace('JoinSession');
            }
          }
        }
      ]
    );
  };
  
  // Render message item
  const renderMessageItem = ({ item }) => (
    <MessageBubble message={item} />
  );
  
  // Render empty list
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="chat" size={64} color="#CCCCCC" />
      <Text style={styles.emptyText}>
        Your conversation will appear here.
      </Text>
      <Text style={styles.emptySubtext}>
        Start by typing a message or recording your voice.
      </Text>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>MedTranslate AI</Text>
          {!isConnected && <OfflineIndicator />}
        </View>
        
        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndSession}
        >
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={renderEmptyList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#999999"
            multiline
            maxLength={500}
          />
          
          {isTranslating ? (
            <ActivityIndicator size="small" color="#0066CC" style={styles.sendButton} />
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.micButton,
                  isRecording && styles.micButtonActive
                ]}
                onPressIn={startRecording}
                onPressOut={stopRecording}
              >
                <MaterialIcons
                  name={isRecording ? "mic" : "mic-none"}
                  size={24}
                  color={isRecording ? "#FFFFFF" : "#0066CC"}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled
                ]}
                onPress={handleSend}
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
    marginRight: 10
  },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0'
  },
  endButtonText: {
    color: '#FF3B30',
    fontWeight: '600'
  },
  messageList: {
    flexGrow: 1,
    padding: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 100
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 40,
    fontSize: 16,
    maxHeight: 120,
    color: '#333333'
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  micButtonActive: {
    backgroundColor: '#FF3B30'
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  sendButtonDisabled: {
    opacity: 0.5
  }
});

export default TranslationSessionScreen;
