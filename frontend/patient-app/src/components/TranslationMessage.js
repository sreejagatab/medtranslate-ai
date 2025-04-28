/**
 * Translation Message Component for MedTranslate AI Patient Application
 * 
 * This component displays a message in the translation session,
 * with different styles for patient, provider, and system messages.
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TranslationMessage({ message, patientLanguage }) {
  const { 
    sender, 
    text, 
    originalText, 
    timestamp, 
    confidence, 
    isProcessing, 
    isError 
  } = message;
  
  // Format timestamp
  const formatTime = (date) => {
    if (!date) return '';
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  // Get confidence indicator
  const getConfidenceIndicator = () => {
    if (!confidence) return null;
    
    let color = '#4CAF50'; // High confidence (green)
    let icon = 'checkmark-circle';
    
    if (confidence === 'medium') {
      color = '#FFC107'; // Medium confidence (yellow)
      icon = 'alert-circle';
    } else if (confidence === 'low') {
      color = '#F44336'; // Low confidence (red)
      icon = 'warning';
    }
    
    return (
      <View style={styles.confidenceIndicator}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={[styles.confidenceText, { color }]}>
          {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
        </Text>
      </View>
    );
  };
  
  // Render system message
  if (sender === 'system') {
    return (
      <View style={[
        styles.systemContainer,
        isError && styles.errorContainer
      ]}>
        <Ionicons 
          name={isError ? 'alert-circle' : 'information-circle'} 
          size={20} 
          color={isError ? '#F44336' : '#0077CC'} 
        />
        <Text style={[
          styles.systemText,
          isError && styles.errorText
        ]}>
          {text}
        </Text>
      </View>
    );
  }
  
  // Render patient or provider message
  return (
    <View style={[
      styles.messageContainer,
      sender === 'patient' ? styles.patientContainer : styles.providerContainer
    ]}>
      <View style={[
        styles.messageBubble,
        sender === 'patient' ? styles.patientBubble : styles.providerBubble,
        isProcessing && styles.processingBubble
      ]}>
        {isProcessing ? (
          <View style={styles.processingContent}>
            <Text style={styles.processingText}>{text}</Text>
            <View style={styles.processingIndicator}>
              <View style={styles.processingDot} />
              <View style={[styles.processingDot, styles.processingDotMiddle]} />
              <View style={styles.processingDot} />
            </View>
          </View>
        ) : (
          <>
            <Text style={[
              styles.messageText,
              sender === 'patient' ? styles.patientText : styles.providerText
            ]}>
              {text}
            </Text>
            
            {originalText && sender === 'provider' && (
              <TouchableOpacity style={styles.originalTextContainer}>
                <Text style={styles.originalTextLabel}>Original:</Text>
                <Text style={styles.originalText}>{originalText}</Text>
              </TouchableOpacity>
            )}
            
            {getConfidenceIndicator()}
          </>
        )}
      </View>
      
      <Text style={styles.timestamp}>
        {formatTime(timestamp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  patientContainer: {
    alignSelf: 'flex-end',
  },
  providerContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
  },
  patientBubble: {
    backgroundColor: '#E1F5FE',
    borderBottomRightRadius: 4,
  },
  providerBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  processingBubble: {
    backgroundColor: '#F5F5F5',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  patientText: {
    color: '#333333',
  },
  providerText: {
    color: '#333333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
    marginHorizontal: 8,
  },
  confidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 12,
    marginLeft: 4,
  },
  originalTextContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  originalTextLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 4,
  },
  originalText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  systemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
  },
  systemText: {
    fontSize: 14,
    color: '#0077CC',
    marginLeft: 8,
    flex: 1,
  },
  errorText: {
    color: '#F44336',
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  processingText: {
    fontSize: 16,
    color: '#999999',
    flex: 1,
    marginRight: 8,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999999',
    marginHorizontal: 1,
  },
  processingDotMiddle: {
    opacity: 0.6,
  },
});
