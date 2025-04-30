/**
 * Enhanced Voice Record Button Component for MedTranslate AI Patient Application
 *
 * This component provides an improved button for recording voice input during
 * translation sessions, with visual feedback, waveform visualization, and
 * status indicators.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Easing,
  Vibration,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AnimationUtils from '../../shared/utils/animation-utils';
import { LinearGradient } from 'expo-linear-gradient';

export default function EnhancedVoiceRecordButton({
  onPressIn,
  onPressOut,
  isRecording = false,
  isTranslating = false,
  recordingLevel = 0,
  disabled = false,
  maxRecordingTime = 60, // Maximum recording time in seconds
  showTimer = true,
  showWaveform = true,
  useHapticFeedback = true,
  showRippleEffect = true,
  buttonSize = 'large', // 'small', 'medium', 'large'
  theme = 'blue', // 'blue', 'red', 'green', 'gradient'
  onTextInput, // Function to handle text input as alternative to voice
  showTextInputOption = true // Whether to show text input option
}) {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const waveformAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(1)).current;

  // State
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveformBars, setWaveformBars] = useState([]);
  const [showRipple, setShowRipple] = useState(false);
  const [isTextInputModalVisible, setIsTextInputModalVisible] = useState(false);
  const [textInput, setTextInput] = useState('');
  const timerRef = useRef(null);

  // Get button colors based on theme
  const getButtonColors = () => {
    switch (theme) {
      case 'red':
        return {
          idle: '#F44336',
          active: '#D32F2F',
          pulse: 'rgba(244, 67, 54, 0.2)'
        };
      case 'green':
        return {
          idle: '#4CAF50',
          active: '#388E3C',
          pulse: 'rgba(76, 175, 80, 0.2)'
        };
      case 'gradient':
        return {
          idle: ['#2196F3', '#0D47A1'],
          active: ['#F44336', '#B71C1C'],
          pulse: 'rgba(33, 150, 243, 0.2)'
        };
      case 'blue':
      default:
        return {
          idle: '#0077CC',
          active: '#005299',
          pulse: 'rgba(0, 119, 204, 0.2)'
        };
    }
  };

  // Get button dimensions based on size
  const getButtonDimensions = () => {
    switch (buttonSize) {
      case 'small':
        return {
          container: 60,
          button: 48,
          iconSize: 24
        };
      case 'medium':
        return {
          container: 70,
          button: 56,
          iconSize: 28
        };
      case 'large':
      default:
        return {
          container: 80,
          button: 64,
          iconSize: 32
        };
    }
  };

  const colors = getButtonColors();
  const dimensions = getButtonDimensions();

  // Start pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      // Provide haptic feedback when recording starts
      if (useHapticFeedback) {
        if (Platform.OS === 'ios') {
          // iOS pattern (longer vibration)
          Vibration.vibrate([0, 100]);
        } else {
          // Android pattern
          Vibration.vibrate(100);
        }
      }

      // Use pulse animation from animation utils
      AnimationUtils.pulse(pulseAnim, 1, 1.2, 2000);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxRecordingTime) {
            clearInterval(timerRef.current);
            // Provide haptic feedback when max time is reached
            if (useHapticFeedback) {
              Vibration.vibrate([0, 100, 200, 100]);
            }
            return maxRecordingTime;
          }

          // Provide subtle haptic feedback every 10 seconds
          if (useHapticFeedback && (prev + 1) % 10 === 0 && prev > 0) {
            Vibration.vibrate(50);
          }

          return prev + 1;
        });
      }, 1000);

      // Generate random waveform bars
      const interval = setInterval(() => {
        // Make the waveform more responsive to recording level
        const amplifiedLevel = Math.min(1, recordingLevel * 1.5);
        const newBars = Array(20).fill(0).map(() =>
          Math.max(0.2, Math.random() * amplifiedLevel)
        );
        setWaveformBars(newBars);

        // Animate waveform
        AnimationUtils.fadeIn(waveformAnim, 100);
      }, 100);

      // Initial animation when starting recording
      AnimationUtils.bounce(pulseAnim, 0.5, 1, 500);

      // Show ripple effect
      if (showRippleEffect) {
        setShowRipple(true);

        // Animate ripple
        Animated.loop(
          Animated.parallel([
            Animated.timing(rippleAnim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true
            }),
            Animated.timing(rippleOpacity, {
              toValue: 0,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true
            })
          ])
        ).start();
      }

      return () => {
        clearInterval(interval);
        clearInterval(timerRef.current);
      };
    } else {
      // Reset animations
      pulseAnim.setValue(1);
      rippleAnim.setValue(0);
      rippleOpacity.setValue(1);

      // Hide ripple
      setShowRipple(false);

      // Reset timer
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
  }, [isRecording, recordingLevel, useHapticFeedback, showRippleEffect]);

  // Start rotation animation when translating
  useEffect(() => {
    if (isTranslating) {
      // Create a rotating animation
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();

      // Add a bounce animation when starting translation
      AnimationUtils.bounce(pulseAnim, 1, 1.1, 500);
    } else {
      rotation.setValue(0);
    }
  }, [isTranslating]);

  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle text input submission
  const handleTextInputSubmit = () => {
    if (textInput.trim() && onTextInput) {
      onTextInput(textInput.trim());
      setTextInput('');
      setIsTextInputModalVisible(false);

      // Provide haptic feedback on submission
      if (useHapticFeedback) {
        Vibration.vibrate(50);
      }
    }
  };

  // Calculate remaining time percentage
  const remainingTimePercentage = ((maxRecordingTime - recordingTime) / maxRecordingTime) * 100;

  // Interpolate rotation for animation
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Render waveform bars
  const renderWaveformBars = () => {
    return waveformBars.map((height, index) => (
      <Animated.View
        key={index}
        style={[
          styles.waveformBar,
          {
            height: Math.max(4, height * 30), // Scale height
            opacity: Animated.multiply(waveformAnim, Math.max(0.3, height)), // Animated opacity
            transform: [
              { scaleY: Animated.multiply(waveformAnim, 1 + (height * 0.5)) } // Animated scale
            ]
          }
        ]}
      />
    ));
  };

  return (
    <View style={styles.container}>
      {/* Timer */}
      {showTimer && isRecording && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${remainingTimePercentage}%` },
                remainingTimePercentage < 20 && styles.progressBarWarning
              ]}
            />
          </View>
        </View>
      )}

      {/* Waveform visualization */}
      {showWaveform && isRecording && (
        <View style={styles.waveformContainer}>
          {renderWaveformBars()}
        </View>
      )}

      {/* Main button */}
      <Animated.View
        style={[
          styles.pulseContainer,
          {
            width: dimensions.container,
            height: dimensions.container,
            borderRadius: dimensions.container / 2,
            backgroundColor: isRecording ?
              (typeof colors.pulse === 'string' ? colors.pulse : 'rgba(244, 67, 54, 0.2)') :
              (typeof colors.pulse === 'string' ? colors.pulse : 'rgba(0, 119, 204, 0.2)'),
            transform: [
              { scale: pulseAnim }
            ]
          }
        ]}
      >
        {/* Ripple effect */}
        {showRipple && (
          <Animated.View
            style={[
              styles.rippleEffect,
              {
                transform: [
                  { scale: rippleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2]
                  }) }
                ],
                opacity: rippleOpacity,
                backgroundColor: isRecording ?
                  (typeof colors.pulse === 'string' ? colors.pulse : 'rgba(244, 67, 54, 0.2)') :
                  (typeof colors.pulse === 'string' ? colors.pulse : 'rgba(0, 119, 204, 0.2)')
              }
            ]}
          />
        )}

        {/* Button with gradient or solid color */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              width: dimensions.button,
              height: dimensions.button,
              borderRadius: dimensions.button / 2
            },
            disabled && styles.disabledButton
          ]}
          onPressIn={disabled ? null : onPressIn}
          onPressOut={disabled ? null : onPressOut}
          activeOpacity={0.7}
          disabled={disabled || isTranslating}
          // Add press feedback animation
          onPressIn={(e) => {
            AnimationUtils.scale(pulseAnim, 1, 0.9, 100);
            if (onPressIn && !disabled) onPressIn(e);

            // Provide haptic feedback on press
            if (useHapticFeedback && !disabled) {
              Vibration.vibrate(20);
            }
          }}
          onPressOut={(e) => {
            AnimationUtils.scale(pulseAnim, 0.9, 1, 200);
            if (onPressOut && !disabled) onPressOut(e);
          }}
          // Accessibility properties
          accessible={true}
          accessibilityRole="button"
          accessibilityState={{
            disabled: disabled || isTranslating,
            busy: isTranslating,
            checked: isRecording
          }}
          accessibilityLabel={
            isRecording
              ? "Stop recording"
              : isTranslating
                ? "Currently translating"
                : "Press and hold to record speech"
          }
          accessibilityHint={
            isRecording
              ? "Double tap to stop recording"
              : isTranslating
                ? "Please wait while translation is in progress"
                : "Double tap and hold to start recording your voice"
          }
        >
          {theme === 'gradient' ? (
            <LinearGradient
              colors={isRecording ? colors.active : colors.idle}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isTranslating ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync" size={dimensions.iconSize} color="#FFFFFF" />
                </Animated.View>
              ) : (
                <Animated.View
                  style={{
                    transform: [
                      { scale: isRecording ? 1.2 : 1 } // Slightly larger icon when recording
                    ]
                  }}
                >
                  <Ionicons
                    name={isRecording ? "mic" : "mic-outline"}
                    size={dimensions.iconSize}
                    color="#FFFFFF"
                  />
                </Animated.View>
              )}
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.solidButton,
                {
                  backgroundColor: isRecording ?
                    (typeof colors.active === 'string' ? colors.active : '#F44336') :
                    (typeof colors.idle === 'string' ? colors.idle : '#0077CC')
                }
              ]}
            >
              {isTranslating ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync" size={dimensions.iconSize} color="#FFFFFF" />
                </Animated.View>
              ) : (
                <Animated.View
                  style={{
                    transform: [
                      { scale: isRecording ? 1.2 : 1 } // Slightly larger icon when recording
                    ]
                  }}
                >
                  <Ionicons
                    name={isRecording ? "mic" : "mic-outline"}
                    size={dimensions.iconSize}
                    color="#FFFFFF"
                  />
                </Animated.View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Status text */}
      <Text style={styles.statusText}>
        {isTranslating
          ? 'Translating...'
          : isRecording
            ? 'Recording...'
            : 'Hold to speak'}
      </Text>

      {/* Text input alternative */}
      {showTextInputOption && onTextInput && !isRecording && !isTranslating && (
        <TouchableOpacity
          style={styles.textInputButton}
          onPress={() => setIsTextInputModalVisible(true)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Type instead of speaking"
          accessibilityHint="Opens a text input dialog as an alternative to voice recording"
        >
          <Ionicons name="keyboard-outline" size={16} color="#0077CC" />
          <Text style={styles.textInputButtonText}>Type instead</Text>
        </TouchableOpacity>
      )}

      {/* Text input modal */}
      <Modal
        visible={isTextInputModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsTextInputModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsTextInputModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Type your message</Text>
              <Text style={styles.modalSubtitle}>
                Use this option if you prefer not to use voice recording
              </Text>

              <TextInput
                style={styles.textInput}
                placeholder="Enter your message here..."
                value={textInput}
                onChangeText={setTextInput}
                multiline={true}
                numberOfLines={4}
                autoFocus={true}
                accessible={true}
                accessibilityLabel="Message text input"
                accessibilityHint="Enter the message you want to translate"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsTextInputModalVisible(false)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !textInput.trim() && styles.disabledSubmitButton
                  ]}
                  onPress={handleTextInputSubmit}
                  disabled={!textInput.trim()}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Submit text for translation"
                  accessibilityState={{ disabled: !textInput.trim() }}
                >
                  <Text style={styles.submitButtonText}>Translate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  pulseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  rippleEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  solidButton: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  disabledButton: {
    opacity: 0.5
  },
  statusText: {
    marginTop: 8,
    fontSize: 14,
    color: '#757575'
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
    maxWidth: 200
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 4
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2
  },
  progressBarWarning: {
    backgroundColor: '#F44336'
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: '100%',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 20,
    padding: 8
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#F44336',
    marginHorizontal: 2,
    borderRadius: 1.5,
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1
  },
  // Text input alternative styles
  textInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 16
  },
  textInputButtonText: {
    fontSize: 14,
    color: '#0077CC',
    marginLeft: 8
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  modalContent: {
    padding: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#F9F9F9'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#757575'
  },
  submitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#0077CC',
    borderRadius: 4
  },
  disabledSubmitButton: {
    backgroundColor: '#CCCCCC'
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500'
  }
});
