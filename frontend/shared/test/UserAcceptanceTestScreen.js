/**
 * User Acceptance Testing Screen for MedTranslate AI
 * 
 * This screen provides a framework for conducting user acceptance testing
 * with healthcare providers and patients.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import FeedbackCollector from '../components/FeedbackCollector';
import * as AnalyticsService from '../services/analytics-service';
import * as AccessibilityUtils from '../utils/accessibility-utils';

// Storage keys
const STORAGE_KEYS = {
  UAT_SESSIONS: 'medtranslate_uat_sessions',
  UAT_RESULTS: 'medtranslate_uat_results',
  UAT_USER_INFO: 'medtranslate_uat_user_info'
};

// Test scenarios
const TEST_SCENARIOS = [
  {
    id: 'provider_session_management',
    title: 'Provider: Session Management',
    description: 'Test the provider\'s ability to create, join, and manage translation sessions',
    userType: 'provider',
    tasks: [
      'Create a new translation session',
      'Join an existing session using the session code',
      'End an active session',
      'Export a session transcript'
    ]
  },
  {
    id: 'provider_patient_history',
    title: 'Provider: Patient History',
    description: 'Test the provider\'s ability to view and manage patient history',
    userType: 'provider',
    tasks: [
      'View a patient\'s medical history',
      'Add a note to a patient\'s record',
      'Update a patient\'s medical context',
      'View past session transcripts'
    ]
  },
  {
    id: 'provider_translation_monitoring',
    title: 'Provider: Translation Monitoring',
    description: 'Test the provider\'s ability to monitor and correct translations',
    userType: 'provider',
    tasks: [
      'Monitor real-time translations',
      'Report a translation error',
      'Request an alternative translation',
      'Toggle auto-correction settings'
    ]
  },
  {
    id: 'patient_session_joining',
    title: 'Patient: Session Joining',
    description: 'Test the patient\'s ability to join a translation session',
    userType: 'patient',
    tasks: [
      'Enter a session code to join a session',
      'Select your preferred language',
      'Confirm session details',
      'Leave a session'
    ]
  },
  {
    id: 'patient_voice_recording',
    title: 'Patient: Voice Recording',
    description: 'Test the patient\'s ability to record voice for translation',
    userType: 'patient',
    tasks: [
      'Record a voice message',
      'View the translation status',
      'Listen to the provider\'s response',
      'Re-record a message if needed'
    ]
  },
  {
    id: 'patient_offline_mode',
    title: 'Patient: Offline Mode',
    description: 'Test the patient\'s ability to use the app in offline mode',
    userType: 'patient',
    tasks: [
      'Enable offline mode',
      'Record a message while offline',
      'View cached translations',
      'Sync data when back online'
    ]
  },
  {
    id: 'edge_device_integration',
    title: 'Edge Device Integration',
    description: 'Test the integration with edge devices for offline translation',
    userType: 'both',
    tasks: [
      'Connect to an edge device',
      'Perform translations using the edge device',
      'Monitor edge device performance',
      'Sync edge device data with the cloud'
    ]
  }
];

export default function UserAcceptanceTestScreen() {
  const navigation = useNavigation();
  
  // State
  const [userInfo, setUserInfo] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState('provider');
  
  // Load user info and test results on mount
  useEffect(() => {
    loadUserInfo();
    loadTestResults();
  }, []);
  
  // Load user info from storage
  const loadUserInfo = async () => {
    try {
      const storedUserInfo = await AsyncStorage.getItem(STORAGE_KEYS.UAT_USER_INFO);
      
      if (storedUserInfo) {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        setUserInfo(parsedUserInfo);
        setUserType(parsedUserInfo.userType);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading user info:', error);
      setIsLoading(false);
    }
  };
  
  // Load test results from storage
  const loadTestResults = async () => {
    try {
      const storedResults = await AsyncStorage.getItem(STORAGE_KEYS.UAT_RESULTS);
      
      if (storedResults) {
        setTestResults(JSON.parse(storedResults));
      }
    } catch (error) {
      console.error('Error loading test results:', error);
    }
  };
  
  // Save user info to storage
  const saveUserInfo = async (info) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UAT_USER_INFO, JSON.stringify(info));
      setUserInfo(info);
      setUserType(info.userType);
    } catch (error) {
      console.error('Error saving user info:', error);
    }
  };
  
  // Save test results to storage
  const saveTestResults = async (results) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UAT_RESULTS, JSON.stringify(results));
    } catch (error) {
      console.error('Error saving test results:', error);
    }
  };
  
  // Handle scenario selection
  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
    
    // Track selection
    AnalyticsService.trackEvent(
      AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
      'uat',
      'select_scenario',
      { scenarioId: scenario.id }
    );
  };
  
  // Handle start test
  const handleStartTest = () => {
    if (!selectedScenario) return;
    
    // Create a new UAT session
    const session = {
      id: `uat_${Date.now()}`,
      scenarioId: selectedScenario.id,
      startTime: new Date().toISOString(),
      userType,
      completed: false
    };
    
    // Save session to storage
    saveUATSession(session);
    
    // Navigate to the appropriate test screen
    navigateToTestScreen(selectedScenario);
    
    // Track start
    AnalyticsService.trackEvent(
      AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
      'uat',
      'start_test',
      { 
        scenarioId: selectedScenario.id,
        sessionId: session.id
      }
    );
  };
  
  // Save UAT session to storage
  const saveUATSession = async (session) => {
    try {
      const storedSessions = await AsyncStorage.getItem(STORAGE_KEYS.UAT_SESSIONS);
      const sessions = storedSessions ? JSON.parse(storedSessions) : [];
      
      sessions.push(session);
      
      await AsyncStorage.setItem(STORAGE_KEYS.UAT_SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving UAT session:', error);
    }
  };
  
  // Navigate to the appropriate test screen
  const navigateToTestScreen = (scenario) => {
    switch (scenario.id) {
      case 'provider_session_management':
        navigation.navigate('TestSessionManagement');
        break;
      case 'provider_patient_history':
        navigation.navigate('TestPatientHistory');
        break;
      case 'provider_translation_monitoring':
        navigation.navigate('TestTranslationMonitor');
        break;
      case 'patient_session_joining':
        navigation.navigate('TestSessionJoining');
        break;
      case 'patient_voice_recording':
        navigation.navigate('TestVoiceRecord');
        break;
      case 'patient_offline_mode':
        navigation.navigate('TestOfflineMode');
        break;
      case 'edge_device_integration':
        navigation.navigate('TestEdgeIntegration');
        break;
      default:
        Alert.alert('Error', 'Unknown test scenario');
    }
  };
  
  // Handle task completion
  const handleTaskComplete = (scenarioId, taskIndex) => {
    const newResults = {
      ...testResults,
      [scenarioId]: {
        ...(testResults[scenarioId] || {}),
        [taskIndex]: true
      }
    };
    
    setTestResults(newResults);
    saveTestResults(newResults);
    
    // Check if all tasks are completed
    const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
    const allTasksCompleted = scenario.tasks.every((_, index) => 
      newResults[scenarioId] && newResults[scenarioId][index]
    );
    
    if (allTasksCompleted) {
      // Show feedback form
      setTimeout(() => {
        setFeedbackVisible(true);
      }, 500);
      
      // Track completion
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'uat',
        'complete_scenario',
        { scenarioId }
      );
    }
  };
  
  // Handle feedback submission
  const handleFeedbackSubmit = async (feedback) => {
    try {
      // Add user info to feedback
      const enhancedFeedback = {
        ...feedback,
        userInfo: {
          userType,
          role: userInfo?.role,
          experience: userInfo?.experience
        },
        testType: 'uat',
        scenarioId: selectedScenario?.id
      };
      
      // Submit feedback
      await AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEEDBACK,
        'uat',
        'submit_feedback',
        enhancedFeedback
      );
      
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  };
  
  // Calculate completion percentage
  const getCompletionPercentage = (scenarioId) => {
    const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return 0;
    
    const taskCount = scenario.tasks.length;
    const completedCount = scenario.tasks.reduce((count, _, index) => {
      return count + (testResults[scenarioId] && testResults[scenarioId][index] ? 1 : 0);
    }, 0);
    
    return Math.round((completedCount / taskCount) * 100);
  };
  
  // Render user info form
  const renderUserInfoForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      role: '',
      experience: 'intermediate',
      userType: 'provider'
    });
    
    const handleSubmit = () => {
      if (!formData.name || !formData.role) {
        Alert.alert('Error', 'Please provide your name and role');
        return;
      }
      
      saveUserInfo(formData);
    };
    
    return (
      <View style={styles.userInfoContainer}>
        <Text style={styles.formTitle}>User Information</Text>
        <Text style={styles.formDescription}>
          Please provide some information about yourself to help us analyze the test results.
        </Text>
        
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Name</Text>
          <TextInput
            style={styles.formInput}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Your name"
            placeholderTextColor="#999999"
          />
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Email (Optional)</Text>
          <TextInput
            style={styles.formInput}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Your email"
            placeholderTextColor="#999999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Role</Text>
          <TextInput
            style={styles.formInput}
            value={formData.role}
            onChangeText={(text) => setFormData({ ...formData, role: text })}
            placeholder="e.g., Doctor, Nurse, Patient"
            placeholderTextColor="#999999"
          />
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Experience Level</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                formData.experience === 'beginner' && styles.radioButtonSelected
              ]}
              onPress={() => setFormData({ ...formData, experience: 'beginner' })}
            >
              <Text style={styles.radioButtonText}>Beginner</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.radioButton,
                formData.experience === 'intermediate' && styles.radioButtonSelected
              ]}
              onPress={() => setFormData({ ...formData, experience: 'intermediate' })}
            >
              <Text style={styles.radioButtonText}>Intermediate</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.radioButton,
                formData.experience === 'advanced' && styles.radioButtonSelected
              ]}
              onPress={() => setFormData({ ...formData, experience: 'advanced' })}
            >
              <Text style={styles.radioButtonText}>Advanced</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.formLabel}>User Type</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                formData.userType === 'provider' && styles.radioButtonSelected
              ]}
              onPress={() => setFormData({ ...formData, userType: 'provider' })}
            >
              <Text style={styles.radioButtonText}>Provider</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.radioButton,
                formData.userType === 'patient' && styles.radioButtonSelected
              ]}
              onPress={() => setFormData({ ...formData, userType: 'patient' })}
            >
              <Text style={styles.radioButtonText}>Patient</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Start Testing</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Render scenario item
  const renderScenarioItem = (scenario) => {
    // Skip scenarios that don't match the user type
    if (scenario.userType !== 'both' && scenario.userType !== userType) {
      return null;
    }
    
    const isSelected = selectedScenario && selectedScenario.id === scenario.id;
    const completionPercentage = getCompletionPercentage(scenario.id);
    
    return (
      <TouchableOpacity
        key={scenario.id}
        style={[
          styles.scenarioItem,
          isSelected && styles.selectedScenarioItem
        ]}
        onPress={() => handleSelectScenario(scenario)}
        {...AccessibilityUtils.getAccessibilityProps({
          label: scenario.title,
          role: 'button',
          hint: `${scenario.description}. ${completionPercentage}% completed.`
        })}
      >
        <View style={styles.scenarioHeader}>
          <Text style={styles.scenarioTitle}>{scenario.title}</Text>
          
          <View style={styles.completionBadge}>
            <Text style={styles.completionText}>{completionPercentage}%</Text>
          </View>
        </View>
        
        <Text style={styles.scenarioDescription}>{scenario.description}</Text>
        
        <View style={styles.taskList}>
          {scenario.tasks.map((task, index) => (
            <View key={index} style={styles.taskItem}>
              <TouchableOpacity
                style={[
                  styles.taskCheckbox,
                  testResults[scenario.id] && testResults[scenario.id][index] && styles.taskCheckboxChecked
                ]}
                onPress={() => handleTaskComplete(scenario.id, index)}
                {...AccessibilityUtils.getAccessibilityProps({
                  label: `Task ${index + 1}: ${task}`,
                  role: 'checkbox',
                  state: { 
                    checked: testResults[scenario.id] && testResults[scenario.id][index] 
                  }
                })}
              >
                {testResults[scenario.id] && testResults[scenario.id][index] && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              
              <Text style={styles.taskText}>{task}</Text>
            </View>
          ))}
        </View>
        
        {isSelected && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartTest}
            {...AccessibilityUtils.getAccessibilityProps({
              label: 'Start Test',
              role: 'button',
              hint: `Start testing ${scenario.title}`
            })}
          >
            <Text style={styles.startButtonText}>Start Test</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };
  
  // Show loading indicator
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077CC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
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
        
        <Text style={styles.title}>User Acceptance Testing</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => Alert.alert(
            'User Acceptance Testing',
            'This screen allows you to participate in user acceptance testing for the MedTranslate AI application. Select a test scenario, complete the tasks, and provide feedback on your experience.'
          )}
          {...AccessibilityUtils.getAccessibilityProps({
            label: 'Information',
            role: 'button',
            hint: 'Learn more about user acceptance testing'
          })}
        >
          <Ionicons name="information-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* User info form */}
        {!userInfo && renderUserInfoForm()}
        
        {/* Test scenarios */}
        {userInfo && (
          <>
            <View style={styles.userInfoBar}>
              <Text style={styles.userInfoText}>
                Testing as: <Text style={styles.userInfoHighlight}>{userType === 'provider' ? 'Healthcare Provider' : 'Patient'}</Text>
              </Text>
              
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                  const newUserType = userType === 'provider' ? 'patient' : 'provider';
                  setUserType(newUserType);
                  saveUserInfo({ ...userInfo, userType: newUserType });
                }}
                {...AccessibilityUtils.getAccessibilityProps({
                  label: `Switch to ${userType === 'provider' ? 'Patient' : 'Provider'} mode`,
                  role: 'button'
                })}
              >
                <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
                <Text style={styles.switchButtonText}>
                  Switch to {userType === 'provider' ? 'Patient' : 'Provider'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.sectionTitle}>Test Scenarios</Text>
            <Text style={styles.sectionDescription}>
              Select a scenario below to test specific features. Complete all tasks
              in a scenario to provide feedback on your experience.
            </Text>
            
            {TEST_SCENARIOS.map(renderScenarioItem)}
          </>
        )}
      </ScrollView>
      
      {/* Feedback collector */}
      <FeedbackCollector
        isVisible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        onSubmit={handleFeedbackSubmit}
        componentName={selectedScenario?.title}
        screenName="UserAcceptanceTesting"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center'
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
  userInfoContainer: {
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
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8
  },
  formDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16
  },
  formField: {
    marginBottom: 16
  },
  formLabel: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8
  },
  formInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333'
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  radioButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },
  radioButtonSelected: {
    backgroundColor: '#0077CC'
  },
  radioButtonText: {
    fontSize: 14,
    color: '#333333'
  },
  submitButton: {
    backgroundColor: '#0077CC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  userInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  userInfoText: {
    fontSize: 14,
    color: '#0D47A1'
  },
  userInfoHighlight: {
    fontWeight: 'bold'
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0077CC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4
  },
  switchButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16
  },
  scenarioItem: {
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
  selectedScenarioItem: {
    borderWidth: 2,
    borderColor: '#0077CC'
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
    marginRight: 8
  },
  completionBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12
  },
  completionText: {
    fontSize: 12,
    color: '#0077CC',
    fontWeight: '500'
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16
  },
  taskList: {
    marginBottom: 16
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#0077CC',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  taskCheckboxChecked: {
    backgroundColor: '#0077CC'
  },
  taskText: {
    fontSize: 14,
    color: '#333333',
    flex: 1
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0077CC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginRight: 8
  }
});
