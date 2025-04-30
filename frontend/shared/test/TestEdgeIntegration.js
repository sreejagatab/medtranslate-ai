/**
 * Edge Device Integration Test Screen for MedTranslate AI
 * 
 * This screen provides a framework for testing edge device integration
 * with the MedTranslate AI application.
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import * as AccessibilityUtils from '../utils/accessibility-utils';
import * as AnalyticsService from '../services/analytics-service';
import { EdgeConnectionContext } from '../context/EdgeConnectionContext';
import FeedbackCollector from '../components/FeedbackCollector';

// Test data
const TEST_TEXT = {
  en: 'I have a headache and fever',
  es: 'Tengo dolor de cabeza y fiebre',
  fr: 'J\'ai mal à la tête et de la fièvre',
  de: 'Ich habe Kopfschmerzen und Fieber'
};

// Storage keys
const STORAGE_KEYS = {
  EDGE_TEST_RESULTS: 'medtranslate_edge_test_results'
};

export default function TestEdgeIntegration() {
  const navigation = useNavigation();
  const edgeConnection = useContext(EdgeConnectionContext);
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isEdgeConnected, setIsEdgeConnected] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [customText, setCustomText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [offlineMode, setOfflineMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  
  // Load test results on mount
  useEffect(() => {
    loadTestResults();
    checkConnectivity();
  }, []);
  
  // Check network connectivity
  const checkConnectivity = async () => {
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected);
  };
  
  // Load test results from storage
  const loadTestResults = async () => {
    try {
      const storedResults = await AsyncStorage.getItem(STORAGE_KEYS.EDGE_TEST_RESULTS);
      
      if (storedResults) {
        setTestResults(JSON.parse(storedResults));
      }
    } catch (error) {
      console.error('Error loading test results:', error);
    }
  };
  
  // Save test results to storage
  const saveTestResults = async (results) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EDGE_TEST_RESULTS, JSON.stringify(results));
    } catch (error) {
      console.error('Error saving test results:', error);
    }
  };
  
  // Handle edge device discovery
  const handleDiscoverEdgeDevice = async () => {
    try {
      setIsDiscovering(true);
      
      // Use the EdgeConnectionContext to discover edge device
      await edgeConnection.rediscoverEdgeDevice();
      
      // Check if edge device is connected
      setIsEdgeConnected(edgeConnection.isEdgeDevice);
      
      // Track event
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_integration',
        'discover_device',
        { success: edgeConnection.isEdgeDevice }
      );
      
      // Update test results
      const newResults = {
        ...testResults,
        discover_device: {
          success: edgeConnection.isEdgeDevice,
          timestamp: new Date().toISOString()
        }
      };
      
      setTestResults(newResults);
      saveTestResults(newResults);
    } catch (error) {
      console.error('Error discovering edge device:', error);
      
      Alert.alert(
        'Discovery Error',
        'Failed to discover edge device: ' + error.message
      );
    } finally {
      setIsDiscovering(false);
    }
  };
  
  // Handle text translation test
  const handleTranslateText = async () => {
    try {
      setIsLoading(true);
      
      // Get text to translate
      const textToTranslate = customText || TEST_TEXT[sourceLanguage];
      
      if (!textToTranslate) {
        Alert.alert('Error', 'Please enter text to translate');
        setIsLoading(false);
        return;
      }
      
      // Use the EdgeConnectionContext to translate text
      const result = await edgeConnection.translateText(
        textToTranslate,
        sourceLanguage,
        targetLanguage,
        'general'
      );
      
      // Track event
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_integration',
        'translate_text',
        { 
          success: !!result?.translatedText,
          source: result?.source || 'unknown'
        }
      );
      
      // Update test results
      const newResults = {
        ...testResults,
        translate_text: {
          success: !!result?.translatedText,
          source: result?.source || 'unknown',
          timestamp: new Date().toISOString()
        }
      };
      
      setTestResults(newResults);
      saveTestResults(newResults);
      
      // Show result
      Alert.alert(
        'Translation Result',
        `Original: ${textToTranslate}\n\nTranslated: ${result?.translatedText || 'Failed'}\n\nSource: ${result?.source || 'unknown'}`
      );
    } catch (error) {
      console.error('Error translating text:', error);
      
      Alert.alert(
        'Translation Error',
        'Failed to translate text: ' + error.message
      );
      
      // Update test results
      const newResults = {
        ...testResults,
        translate_text: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
      
      setTestResults(newResults);
      saveTestResults(newResults);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle audio translation test
  const handleTranslateAudio = async () => {
    try {
      setIsLoading(true);
      
      // This would normally record audio, but for testing we'll use a mock
      const mockAudioData = 'mock_audio_data';
      
      // Use the EdgeConnectionContext to translate audio
      const result = await edgeConnection.translateAudio(
        mockAudioData,
        sourceLanguage,
        targetLanguage,
        'general'
      );
      
      // Track event
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_integration',
        'translate_audio',
        { 
          success: !!result?.translatedText,
          source: result?.source || 'unknown'
        }
      );
      
      // Update test results
      const newResults = {
        ...testResults,
        translate_audio: {
          success: !!result?.translatedText,
          source: result?.source || 'unknown',
          timestamp: new Date().toISOString()
        }
      };
      
      setTestResults(newResults);
      saveTestResults(newResults);
      
      // Show result
      Alert.alert(
        'Audio Translation Result',
        `Translated: ${result?.translatedText || 'Failed'}\n\nSource: ${result?.source || 'unknown'}`
      );
    } catch (error) {
      console.error('Error translating audio:', error);
      
      Alert.alert(
        'Audio Translation Error',
        'Failed to translate audio: ' + error.message
      );
      
      // Update test results
      const newResults = {
        ...testResults,
        translate_audio: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
      
      setTestResults(newResults);
      saveTestResults(newResults);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle sync test
  const handleSyncData = async () => {
    try {
      setIsLoading(true);
      setSyncStatus('Syncing...');
      
      // Use the EdgeConnectionContext to sync data
      const result = await edgeConnection.syncOfflineData();
      
      // Track event
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_integration',
        'sync_data',
        { success: result }
      );
      
      // Update test results
      const newResults = {
        ...testResults,
        sync_data: {
          success: result,
          timestamp: new Date().toISOString()
        }
      };
      
      setTestResults(newResults);
      saveTestResults(newResults);
      
      // Show result
      setSyncStatus(result ? 'Sync completed successfully' : 'Sync failed');
      
      setTimeout(() => {
        setSyncStatus('');
      }, 3000);
    } catch (error) {
      console.error('Error syncing data:', error);
      
      setSyncStatus('Sync failed: ' + error.message);
      
      // Update test results
      const newResults = {
        ...testResults,
        sync_data: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
      
      setTestResults(newResults);
      saveTestResults(newResults);
      
      setTimeout(() => {
        setSyncStatus('');
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle toggle offline mode
  const handleToggleOfflineMode = (value) => {
    setOfflineMode(value);
    
    // Track event
    AnalyticsService.trackEvent(
      AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
      'edge_integration',
      'toggle_offline_mode',
      { enabled: value }
    );
    
    // Update test results
    const newResults = {
      ...testResults,
      toggle_offline_mode: {
        success: true,
        enabled: value,
        timestamp: new Date().toISOString()
      }
    };
    
    setTestResults(newResults);
    saveTestResults(newResults);
  };
  
  // Handle feedback submission
  const handleFeedbackSubmit = async (feedback) => {
    try {
      // Add test results to feedback
      const enhancedFeedback = {
        ...feedback,
        testResults,
        testType: 'edge_integration',
        isEdgeConnected,
        isNetworkConnected: isConnected,
        offlineMode
      };
      
      // Submit feedback
      await AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEEDBACK,
        'edge_integration',
        'submit_feedback',
        enhancedFeedback
      );
      
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  };
  
  // Check if all tests are completed
  const areAllTestsCompleted = () => {
    const requiredTests = ['discover_device', 'translate_text', 'sync_data'];
    return requiredTests.every(test => testResults[test]?.success);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          {...AccessibilityUtils.getAccessibilityProps({
            label: 'Back',
            role: 'button'
          })}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Edge Device Integration Test</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => Alert.alert(
            'Edge Device Integration',
            'This screen allows you to test the integration with edge devices for offline translation. Connect to an edge device, perform translations, and sync data with the cloud.'
          )}
          {...AccessibilityUtils.getAccessibilityProps({
            label: 'Information',
            role: 'button',
            hint: 'Learn more about edge device integration'
          })}
        >
          <Ionicons name="information-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Network status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Network Status:</Text>
            <View style={[
              styles.statusIndicator,
              isConnected ? styles.statusOnline : styles.statusOffline
            ]}>
              <Text style={styles.statusText}>
                {isConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Edge Device:</Text>
            <View style={[
              styles.statusIndicator,
              isEdgeConnected ? styles.statusOnline : styles.statusOffline
            ]}>
              <Text style={styles.statusText}>
                {isEdgeConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDiscoverEdgeDevice}
            disabled={isDiscovering}
            {...AccessibilityUtils.getAccessibilityProps({
              label: 'Discover Edge Device',
              role: 'button',
              state: { disabled: isDiscovering }
            })}
          >
            {isDiscovering ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>Discover Edge Device</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Translation test */}
        <View style={styles.testCard}>
          <Text style={styles.cardTitle}>Translation Test</Text>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Source Language:</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={[styles.languageButton, sourceLanguage === 'en' && styles.selectedLanguage]}
                onPress={() => setSourceLanguage('en')}
              >
                <Text style={styles.languageButtonText}>EN</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.languageButton, sourceLanguage === 'es' && styles.selectedLanguage]}
                onPress={() => setSourceLanguage('es')}
              >
                <Text style={styles.languageButtonText}>ES</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.languageButton, sourceLanguage === 'fr' && styles.selectedLanguage]}
                onPress={() => setSourceLanguage('fr')}
              >
                <Text style={styles.languageButtonText}>FR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.languageButton, sourceLanguage === 'de' && styles.selectedLanguage]}
                onPress={() => setSourceLanguage('de')}
              >
                <Text style={styles.languageButtonText}>DE</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Target Language:</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={[styles.languageButton, targetLanguage === 'en' && styles.selectedLanguage]}
                onPress={() => setTargetLanguage('en')}
              >
                <Text style={styles.languageButtonText}>EN</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.languageButton, targetLanguage === 'es' && styles.selectedLanguage]}
                onPress={() => setTargetLanguage('es')}
              >
                <Text style={styles.languageButtonText}>ES</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.languageButton, targetLanguage === 'fr' && styles.selectedLanguage]}
                onPress={() => setTargetLanguage('fr')}
              >
                <Text style={styles.languageButtonText}>FR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.languageButton, targetLanguage === 'de' && styles.selectedLanguage]}
                onPress={() => setTargetLanguage('de')}
              >
                <Text style={styles.languageButtonText}>DE</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TextInput
            style={styles.textInput}
            placeholder={`Enter text to translate (default: "${TEST_TEXT[sourceLanguage]}")`}
            value={customText}
            onChangeText={setCustomText}
            multiline
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.halfButton]}
              onPress={handleTranslateText}
              disabled={isLoading}
              {...AccessibilityUtils.getAccessibilityProps({
                label: 'Translate Text',
                role: 'button',
                state: { disabled: isLoading }
              })}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Translate Text</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.halfButton]}
              onPress={handleTranslateAudio}
              disabled={isLoading}
              {...AccessibilityUtils.getAccessibilityProps({
                label: 'Translate Audio',
                role: 'button',
                state: { disabled: isLoading }
              })}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Translate Audio</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {testResults.translate_text && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Text Translation:</Text>
              <View style={[
                styles.resultIndicator,
                testResults.translate_text.success ? styles.resultSuccess : styles.resultFailure
              ]}>
                <Text style={styles.resultText}>
                  {testResults.translate_text.success ? 'Success' : 'Failed'}
                </Text>
              </View>
            </View>
          )}
          
          {testResults.translate_audio && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Audio Translation:</Text>
              <View style={[
                styles.resultIndicator,
                testResults.translate_audio.success ? styles.resultSuccess : styles.resultFailure
              ]}>
                <Text style={styles.resultText}>
                  {testResults.translate_audio.success ? 'Success' : 'Failed'}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Offline mode test */}
        <View style={styles.testCard}>
          <Text style={styles.cardTitle}>Offline Mode Test</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Offline Mode:</Text>
            <Switch
              value={offlineMode}
              onValueChange={handleToggleOfflineMode}
              trackColor={{ false: '#CCCCCC', true: '#0077CC' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSyncData}
            disabled={isLoading}
            {...AccessibilityUtils.getAccessibilityProps({
              label: 'Sync Data with Cloud',
              role: 'button',
              state: { disabled: isLoading }
            })}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>Sync Data with Cloud</Text>
            )}
          </TouchableOpacity>
          
          {syncStatus ? (
            <Text style={styles.syncStatus}>{syncStatus}</Text>
          ) : null}
          
          {testResults.sync_data && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Data Sync:</Text>
              <View style={[
                styles.resultIndicator,
                testResults.sync_data.success ? styles.resultSuccess : styles.resultFailure
              ]}>
                <Text style={styles.resultText}>
                  {testResults.sync_data.success ? 'Success' : 'Failed'}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Complete test button */}
        {areAllTestsCompleted() && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => setFeedbackVisible(true)}
            {...AccessibilityUtils.getAccessibilityProps({
              label: 'Complete Test',
              role: 'button'
            })}
          >
            <Text style={styles.completeButtonText}>Complete Test</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Feedback collector */}
      <FeedbackCollector
        isVisible={feedbackVisible}
        onClose={() => {
          setFeedbackVisible(false);
          navigation.goBack();
        }}
        onSubmit={handleFeedbackSubmit}
        componentName="Edge Device Integration"
        screenName="TestEdgeIntegration"
      />
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
    backgroundColor: '#0077CC'
  },
  backButton: {
    padding: 4
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  infoButton: {
    padding: 4
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statusLabel: {
    fontSize: 16,
    color: '#333333'
  },
  statusIndicator: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16
  },
  statusOnline: {
    backgroundColor: '#4CAF50'
  },
  statusOffline: {
    backgroundColor: '#F44336'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF'
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 16,
    color: '#333333',
    flex: 1
  },
  pickerContainer: {
    flexDirection: 'row',
    flex: 2
  },
  languageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 4
  },
  selectedLanguage: {
    backgroundColor: '#0077CC'
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333'
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#333333',
    minHeight: 100,
    textAlignVertical: 'top'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  actionButton: {
    backgroundColor: '#0077CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  halfButton: {
    flex: 1,
    marginHorizontal: 4
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF'
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8
  },
  resultLabel: {
    fontSize: 16,
    color: '#333333'
  },
  resultIndicator: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16
  },
  resultSuccess: {
    backgroundColor: '#4CAF50'
  },
  resultFailure: {
    backgroundColor: '#F44336'
  },
  resultText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF'
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  switchLabel: {
    fontSize: 16,
    color: '#333333'
  },
  syncStatus: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF'
  }
});
