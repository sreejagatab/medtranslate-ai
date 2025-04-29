/**
 * Message Bubble Component for MedTranslate AI Patient App
 * 
 * Displays a message in the translation session
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const MessageBubble = ({ message }) => {
  const {
    type,
    text,
    timestamp,
    isAudio,
    audioUri
  } = message;
  
  const isSystem = type === 'system';
  const isSent = type === 'sent';
  
  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Play audio message
  const playAudio = async () => {
    if (!isAudio || !audioUri) return;
    
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      await sound.playAsync();
      
      // Clean up
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };
  
  return (
    <View style={[
      styles.container,
      isSystem ? styles.systemContainer : 
      isSent ? styles.sentContainer : styles.receivedContainer
    ]}>
      {isAudio ? (
        <TouchableOpacity
          style={styles.audioButton}
          onPress={playAudio}
        >
          <MaterialIcons name="play-arrow" size={20} color={isSent ? '#0066CC' : '#333333'} />
          <Text style={[
            styles.audioText,
            isSent ? styles.sentText : styles.receivedText
          ]}>
            Audio Message
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={[
          styles.messageText,
          isSystem ? styles.systemText : 
          isSent ? styles.sentText : styles.receivedText
        ]}>
          {text}
        </Text>
      )}
      
      <Text style={[
        styles.timestamp,
        isSystem ? styles.systemTimestamp : 
        isSent ? styles.sentTimestamp : styles.receivedTimestamp
      ]}>
        {formatTime(timestamp)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12
  },
  systemContainer: {
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    borderRadius: 8,
    maxWidth: '90%'
  },
  sentContainer: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
    borderTopRightRadius: 4
  },
  receivedContainer: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22
  },
  systemText: {
    color: '#666666',
    textAlign: 'center'
  },
  sentText: {
    color: '#333333'
  },
  receivedText: {
    color: '#333333'
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4
  },
  systemTimestamp: {
    color: '#999999',
    textAlign: 'center'
  },
  sentTimestamp: {
    color: '#999999',
    alignSelf: 'flex-end'
  },
  receivedTimestamp: {
    color: '#999999',
    alignSelf: 'flex-start'
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  audioText: {
    fontSize: 16,
    marginLeft: 8
  }
});

export default MessageBubble;
