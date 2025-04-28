/**
 * Voice Record Button Component for MedTranslate AI Provider Application
 * 
 * This component provides a button for recording voice input during
 * the translation session.
 */

import React, { useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Easing,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function VoiceRecordButton({ 
  onPressIn, 
  onPressOut, 
  isRecording, 
  isTranslating,
  disabled 
}) {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Start animations when recording
  useEffect(() => {
    if (isRecording) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      // Stop animation
      pulseAnim.setValue(1);
      Animated.timing(pulseAnim).stop();
    }
  }, [isRecording, pulseAnim]);
  
  // Rotate animation for translating state
  useEffect(() => {
    if (isTranslating) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
      Animated.timing(rotateAnim).stop();
    }
  }, [isTranslating, rotateAnim]);
  
  // Interpolate rotation for animation
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.pulseContainer,
          isRecording && styles.recording,
          {
            transform: [
              { scale: isRecording ? pulseAnim : 1 }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            isRecording && styles.recordingButton,
            disabled && styles.disabledButton
          ]}
          onPressIn={disabled ? null : onPressIn}
          onPressOut={disabled ? null : onPressOut}
          activeOpacity={0.7}
          disabled={disabled || isTranslating}
        >
          {isTranslating ? (
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </Animated.View>
          ) : (
            <Ionicons
              name={isRecording ? "mic" : "mic-outline"}
              size={32}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>
      </Animated.View>
      
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseContainer: {
    borderRadius: 40,
    padding: 8,
  },
  recording: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0077CC',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 4,
  },
});
