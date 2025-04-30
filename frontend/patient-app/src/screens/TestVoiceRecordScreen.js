/**
 * Test Screen for Enhanced Voice Record Button
 * 
 * This screen is used to test the EnhancedVoiceRecordButton component
 * with various configurations and states.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Switch,
  ScrollView,
  Slider
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import EnhancedVoiceRecordButton from '../components/EnhancedVoiceRecordButton';

export default function TestVoiceRecordScreen({ navigation }) {
  // State
  const [recording, setRecording] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [showWaveform, setShowWaveform] = useState(true);
  const [recordingLevel, setRecordingLevel] = useState(0.5);
  const [maxRecordingTime, setMaxRecordingTime] = useState(60);
  
  // Refs
  const recordingLevelInterval = useRef(null);
  const translationTimeout = useRef(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingLevelInterval.current) {
        clearInterval(recordingLevelInterval.current);
      }
      if (translationTimeout.current) {
        clearTimeout(translationTimeout.current);
      }
    };
  }, []);
  
  // Handle press in
  const handlePressIn = () => {
    setRecording(true);
    
    // Simulate recording level changes
    recordingLevelInterval.current = setInterval(() => {
      setRecordingLevel(Math.random() * 0.7 + 0.3); // Between 0.3 and 1.0
    }, 100);
  };
  
  // Handle press out
  const handlePressOut = () => {
    setRecording(false);
    
    // Clear recording level interval
    if (recordingLevelInterval.current) {
      clearInterval(recordingLevelInterval.current);
      recordingLevelInterval.current = null;
    }
    
    // Simulate translation
    setTranslating(true);
    
    // Simulate translation completion after 2 seconds
    translationTimeout.current = setTimeout(() => {
      setTranslating(false);
    }, 2000);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Test Voice Record Button</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => alert('This screen is used to test the EnhancedVoiceRecordButton component with various configurations and states.')}
        >
          <Ionicons name="information-circle" size={24} color="#0077CC" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Test controls */}
        <View style={styles.testControls}>
          <Text style={styles.sectionTitle}>Test Controls</Text>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Disabled:</Text>
            <Switch
              value={disabled}
              onValueChange={setDisabled}
              trackColor={{ false: '#CCCCCC', true: '#F44336' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Show Timer:</Text>
            <Switch
              value={showTimer}
              onValueChange={setShowTimer}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Show Waveform:</Text>
            <Switch
              value={showWaveform}
              onValueChange={setShowWaveform}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Max Recording Time:</Text>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={10}
                maximumValue={120}
                step={10}
                value={maxRecordingTime}
                onValueChange={setMaxRecordingTime}
                minimumTrackTintColor="#0077CC"
                maximumTrackTintColor="#CCCCCC"
                thumbTintColor="#0077CC"
              />
              <Text style={styles.sliderValue}>{maxRecordingTime}s</Text>
            </View>
          </View>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Recording Level:</Text>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                step={0.1}
                value={recordingLevel}
                onValueChange={setRecordingLevel}
                minimumTrackTintColor="#0077CC"
                maximumTrackTintColor="#CCCCCC"
                thumbTintColor="#0077CC"
                disabled={recording}
              />
              <Text style={styles.sliderValue}>{Math.round(recordingLevel * 100)}%</Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Recording:</Text>
              <View style={[
                styles.statusIndicator,
                recording ? styles.activeIndicator : styles.inactiveIndicator
              ]} />
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Translating:</Text>
              <View style={[
                styles.statusIndicator,
                translating ? styles.activeIndicator : styles.inactiveIndicator
              ]} />
            </View>
          </View>
        </View>
        
        {/* Component preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.sectionTitle}>Component Preview</Text>
          
          <View style={styles.previewContent}>
            <EnhancedVoiceRecordButton
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              isRecording={recording}
              isTranslating={translating}
              recordingLevel={recordingLevel}
              disabled={disabled}
              maxRecordingTime={maxRecordingTime}
              showTimer={showTimer}
              showWaveform={showWaveform}
            />
          </View>
        </View>
        
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          
          <Text style={styles.instructionText}>
            • Press and hold the button to simulate recording{'\n'}
            • Release the button to simulate translation{'\n'}
            • Use the controls above to test different configurations{'\n'}
            • The recording level will automatically vary during recording
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  backButton: {
    padding: 8
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333'
  },
  infoButton: {
    padding: 8
  },
  scrollView: {
    flex: 1
  },
  testControls: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  controlLabel: {
    fontSize: 16,
    color: '#333333'
  },
  sliderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16
  },
  slider: {
    flex: 1
  },
  sliderValue: {
    width: 40,
    fontSize: 14,
    color: '#0077CC',
    textAlign: 'right'
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusLabel: {
    fontSize: 14,
    color: '#333333',
    marginRight: 8
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  activeIndicator: {
    backgroundColor: '#4CAF50'
  },
  inactiveIndicator: {
    backgroundColor: '#F44336'
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  previewContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24
  },
  instructionsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  instructionText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22
  }
});
