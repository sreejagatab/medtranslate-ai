/**
 * Test Screen for Translation Status Indicator
 * 
 * This screen is used to test the TranslationStatusIndicator component
 * with various states and configurations.
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Switch,
  Slider
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import TranslationStatusIndicator from '../components/TranslationStatusIndicator';

// Status types
const STATUS_TYPES = [
  'idle',
  'recording',
  'processing',
  'translating',
  'completed',
  'error'
];

// Confidence levels
const CONFIDENCE_LEVELS = [
  'high',
  'medium',
  'low'
];

export default function TestTranslationStatusScreen({ navigation }) {
  // State
  const [status, setStatus] = useState('idle');
  const [confidence, setConfidence] = useState('high');
  const [errorMessage, setErrorMessage] = useState('Translation failed. Please try again.');
  const [progress, setProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [autoProgress, setAutoProgress] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  
  // Auto progress effect
  useEffect(() => {
    let interval;
    
    if (autoProgress && (status === 'recording' || status === 'processing' || status === 'translating')) {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 0.05;
          
          if (newProgress >= 1) {
            clearInterval(interval);
            
            // Move to next state
            if (status === 'recording') {
              setStatus('processing');
              setProgress(0);
            } else if (status === 'processing') {
              setStatus('translating');
              setProgress(0);
            } else if (status === 'translating') {
              setStatus('completed');
              setProgress(1);
            }
            
            return 1;
          }
          
          return newProgress;
        });
      }, 200);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoProgress, status]);
  
  // Demo mode effect
  useEffect(() => {
    let timeout;
    
    if (demoMode) {
      // Start demo sequence
      setStatus('recording');
      setProgress(0);
      setAutoProgress(true);
      
      // Reset after completion
      timeout = setTimeout(() => {
        if (status === 'completed') {
          setStatus('idle');
          setProgress(0);
          
          // Start again after a delay
          setTimeout(() => {
            if (demoMode) {
              setStatus('recording');
            }
          }, 2000);
        }
      }, 10000);
    } else {
      setAutoProgress(false);
    }
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [demoMode, status]);
  
  // Handle retry
  const handleRetry = () => {
    setStatus('idle');
    setProgress(0);
  };
  
  // Handle status change
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    
    if (newStatus === 'recording' || newStatus === 'processing' || newStatus === 'translating') {
      setProgress(0);
    } else if (newStatus === 'completed') {
      setProgress(1);
    } else {
      setProgress(0);
    }
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
        
        <Text style={styles.title}>Test Translation Status</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => alert('This screen is used to test the TranslationStatusIndicator component with various states and configurations.')}
        >
          <Ionicons name="information-circle" size={24} color="#0077CC" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Component preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.sectionTitle}>Component Preview</Text>
          
          <View style={styles.previewContent}>
            <TranslationStatusIndicator
              status={status}
              confidence={status === 'completed' ? confidence : null}
              errorMessage={status === 'error' ? errorMessage : null}
              progress={progress}
              onRetry={status === 'error' ? handleRetry : null}
              showDetails={showDetails}
            />
          </View>
        </View>
        
        {/* Test controls */}
        <View style={styles.testControls}>
          <Text style={styles.sectionTitle}>Test Controls</Text>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Demo Mode:</Text>
            <Switch
              value={demoMode}
              onValueChange={setDemoMode}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Auto Progress:</Text>
            <Switch
              value={autoProgress}
              onValueChange={setAutoProgress}
              trackColor={{ false: '#CCCCCC', true: '#2196F3' }}
              thumbColor="#FFFFFF"
              disabled={demoMode}
            />
          </View>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Show Details:</Text>
            <Switch
              value={showDetails}
              onValueChange={setShowDetails}
              trackColor={{ false: '#CCCCCC', true: '#9C27B0' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Status:</Text>
            <View style={styles.statusButtons}>
              {STATUS_TYPES.map(statusType => (
                <TouchableOpacity
                  key={statusType}
                  style={[
                    styles.statusButton,
                    status === statusType && styles.activeStatusButton
                  ]}
                  onPress={() => handleStatusChange(statusType)}
                  disabled={demoMode}
                >
                  <Text style={[
                    styles.statusButtonText,
                    status === statusType && styles.activeStatusButtonText
                  ]}>
                    {statusType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {status === 'completed' && (
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Confidence:</Text>
              <View style={styles.confidenceButtons}>
                {CONFIDENCE_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.confidenceButton,
                      confidence === level && styles.activeConfidenceButton,
                      level === 'high' && styles.highConfidenceButton,
                      level === 'medium' && styles.mediumConfidenceButton,
                      level === 'low' && styles.lowConfidenceButton
                    ]}
                    onPress={() => setConfidence(level)}
                    disabled={demoMode}
                  >
                    <Text style={[
                      styles.confidenceButtonText,
                      confidence === level && styles.activeConfidenceButtonText
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
          {(status === 'recording' || status === 'processing' || status === 'translating') && !autoProgress && (
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Progress:</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.05}
                  value={progress}
                  onValueChange={setProgress}
                  minimumTrackTintColor="#0077CC"
                  maximumTrackTintColor="#CCCCCC"
                  thumbTintColor="#0077CC"
                  disabled={demoMode || autoProgress}
                />
                <Text style={styles.sliderValue}>{Math.round(progress * 100)}%</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          
          <Text style={styles.instructionText}>
            • Select a status to see how the component appears in that state{'\n'}
            • Use the progress slider to simulate progress for active states{'\n'}
            • Enable "Auto Progress" to automatically advance through states{'\n'}
            • Enable "Demo Mode" to see a complete translation cycle{'\n'}
            • Toggle "Show Details" to see additional information
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16
  },
  previewContent: {
    
  },
  testControls: {
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
  controlRow: {
    marginBottom: 16
  },
  controlLabel: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  statusButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8
  },
  activeStatusButton: {
    backgroundColor: '#0077CC'
  },
  statusButtonText: {
    fontSize: 14,
    color: '#333333'
  },
  activeStatusButtonText: {
    color: '#FFFFFF',
    fontWeight: '500'
  },
  confidenceButtons: {
    flexDirection: 'row'
  },
  confidenceButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 8
  },
  highConfidenceButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)'
  },
  mediumConfidenceButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)'
  },
  lowConfidenceButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)'
  },
  activeConfidenceButton: {
    backgroundColor: '#0077CC'
  },
  confidenceButtonText: {
    fontSize: 14,
    color: '#333333'
  },
  activeConfidenceButtonText: {
    color: '#FFFFFF',
    fontWeight: '500'
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center'
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
