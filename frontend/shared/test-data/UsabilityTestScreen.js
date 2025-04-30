/**
 * Usability Test Screen for MedTranslate AI
 * 
 * This screen provides a framework for conducting usability tests
 * with the enhanced UI components.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import FeedbackCollector from '../components/FeedbackCollector';
import * as FeedbackService from '../services/feedback-service';

// Test scenarios
const TEST_SCENARIOS = [
  {
    id: 'session-management',
    title: 'Session Management',
    description: 'Test the session management interface with filtering, sorting, and actions.',
    component: 'SessionManagementPanel',
    screen: 'TestSessionManagement',
    tasks: [
      'Filter sessions by status',
      'Sort sessions by date',
      'Join an active session',
      'End a session',
      'Export a session transcript'
    ]
  },
  {
    id: 'patient-history',
    title: 'Patient History',
    description: 'Test the patient history panel with notes, medical context, and session history.',
    component: 'PatientHistoryPanel',
    screen: 'TestPatientHistory',
    tasks: [
      'View patient details',
      'Add a patient note',
      'Update medical context',
      'View session history',
      'Expand session details'
    ]
  },
  {
    id: 'translation-monitor',
    title: 'Translation Monitoring',
    description: 'Test the translation monitoring panel with quality indicators and error reporting.',
    component: 'TranslationMonitorPanel',
    screen: 'TestTranslationMonitor',
    tasks: [
      'Monitor translation quality',
      'Report a translation error',
      'Request an alternative translation',
      'Toggle auto-correction',
      'View translation details'
    ]
  },
  {
    id: 'voice-recording',
    title: 'Voice Recording',
    description: 'Test the enhanced voice recording button with visual feedback and waveform.',
    component: 'EnhancedVoiceRecordButton',
    screen: 'TestVoiceRecord',
    tasks: [
      'Record audio',
      'Observe waveform visualization',
      'Monitor recording timer',
      'Test maximum recording time',
      'Observe translation state'
    ]
  },
  {
    id: 'translation-status',
    title: 'Translation Status',
    description: 'Test the translation status indicator with various states and animations.',
    component: 'TranslationStatusIndicator',
    screen: 'TestTranslationStatus',
    tasks: [
      'Observe recording state',
      'Observe processing state',
      'Observe translation state',
      'View error state',
      'View completion state with confidence'
    ]
  },
  {
    id: 'language-selection',
    title: 'Language Selection',
    description: 'Test the enhanced language selector with search, detection, and preferences.',
    component: 'EnhancedLanguageSelector',
    screen: 'TestLanguageSelector',
    tasks: [
      'Search for a language',
      'Select a language',
      'Test language detection',
      'View recently used languages',
      'Reset language selection'
    ]
  }
];

export default function UsabilityTestScreen() {
  const navigation = useNavigation();
  
  // State
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [completedTasks, setCompletedTasks] = useState({});
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [currentComponent, setCurrentComponent] = useState(null);
  const [currentScreen, setCurrentScreen] = useState(null);
  
  // Load completed tasks
  useEffect(() => {
    loadCompletedTasks();
  }, []);
  
  // Load completed tasks from storage
  const loadCompletedTasks = async () => {
    try {
      const tasks = await FeedbackService.getFeedbackSettings();
      if (tasks && tasks.completedTasks) {
        setCompletedTasks(tasks.completedTasks);
      }
    } catch (error) {
      console.error('Error loading completed tasks:', error);
    }
  };
  
  // Save completed tasks to storage
  const saveCompletedTasks = async (tasks) => {
    try {
      const settings = await FeedbackService.getFeedbackSettings();
      await FeedbackService.updateFeedbackSettings({
        ...settings,
        completedTasks: tasks
      });
    } catch (error) {
      console.error('Error saving completed tasks:', error);
    }
  };
  
  // Handle scenario selection
  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
  };
  
  // Handle start test
  const handleStartTest = () => {
    if (!selectedScenario) return;
    
    // Navigate to test screen
    navigation.navigate(selectedScenario.screen);
    
    // Set current component and screen
    setCurrentComponent(selectedScenario.component);
    setCurrentScreen(selectedScenario.screen);
  };
  
  // Handle task completion
  const handleTaskComplete = (scenarioId, taskIndex) => {
    const newCompletedTasks = {
      ...completedTasks,
      [scenarioId]: {
        ...(completedTasks[scenarioId] || {}),
        [taskIndex]: true
      }
    };
    
    setCompletedTasks(newCompletedTasks);
    saveCompletedTasks(newCompletedTasks);
    
    // Check if all tasks are completed
    const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
    const allTasksCompleted = scenario.tasks.every((_, index) => 
      newCompletedTasks[scenarioId] && newCompletedTasks[scenarioId][index]
    );
    
    if (allTasksCompleted) {
      // Show feedback form
      setTimeout(() => {
        setFeedbackVisible(true);
      }, 500);
    }
  };
  
  // Handle feedback submission
  const handleFeedbackSubmit = async (feedback) => {
    try {
      await FeedbackService.submitFeedback(feedback);
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  };
  
  // Handle analytics toggle
  const handleAnalyticsToggle = (value) => {
    setAnalyticsEnabled(value);
    
    // Update settings
    FeedbackService.updateFeedbackSettings({
      enabled: value
    });
  };
  
  // Calculate completion percentage
  const getCompletionPercentage = (scenarioId) => {
    const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return 0;
    
    const taskCount = scenario.tasks.length;
    const completedCount = scenario.tasks.reduce((count, _, index) => {
      return count + (completedTasks[scenarioId] && completedTasks[scenarioId][index] ? 1 : 0);
    }, 0);
    
    return Math.round((completedCount / taskCount) * 100);
  };
  
  // Render scenario item
  const renderScenarioItem = (scenario) => {
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
                  completedTasks[scenario.id] && completedTasks[scenario.id][index] && styles.taskCheckboxChecked
                ]}
                onPress={() => handleTaskComplete(scenario.id, index)}
              >
                {completedTasks[scenario.id] && completedTasks[scenario.id][index] && (
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
          >
            <Text style={styles.startButtonText}>Start Test</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MedTranslate AI Usability Testing</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => Alert.alert(
            'Usability Testing',
            'This screen allows you to conduct usability tests for the enhanced UI components. Select a test scenario, complete the tasks, and provide feedback on your experience.'
          )}
        >
          <Ionicons name="information-circle" size={24} color="#0077CC" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.settingsBar}>
        <Text style={styles.settingsLabel}>Analytics Collection:</Text>
        <Switch
          value={analyticsEnabled}
          onValueChange={handleAnalyticsToggle}
          trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
          thumbColor="#FFFFFF"
        />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>Test Scenarios</Text>
        <Text style={styles.sectionDescription}>
          Select a scenario below to test specific components. Complete all tasks
          in a scenario to provide feedback on your experience.
        </Text>
        
        {TEST_SCENARIOS.map(renderScenarioItem)}
        
        <View style={styles.pendingFeedbackContainer}>
          <TouchableOpacity
            style={styles.pendingFeedbackButton}
            onPress={async () => {
              try {
                const result = await FeedbackService.submitPendingFeedback();
                Alert.alert(
                  'Pending Feedback',
                  `Successfully submitted ${result.successCount} feedback items. ${result.remaining} items remaining.`
                );
              } catch (error) {
                Alert.alert('Error', 'Failed to submit pending feedback.');
              }
            }}
          >
            <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
            <Text style={styles.pendingFeedbackButtonText}>Submit Pending Feedback</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Feedback collector */}
      <FeedbackCollector
        isVisible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        onSubmit={handleFeedbackSubmit}
        componentName={currentComponent}
        screenName={currentScreen}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  infoButton: {
    padding: 4
  },
  settingsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: '#E3F2FD'
  },
  settingsLabel: {
    fontSize: 14,
    color: '#333333',
    marginRight: 8
  },
  scrollView: {
    flex: 1,
    padding: 16
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
    color: '#333333'
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
    color: '#333333'
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
  },
  pendingFeedbackContainer: {
    marginTop: 16,
    marginBottom: 32,
    alignItems: 'center'
  },
  pendingFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#757575',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4
  },
  pendingFeedbackButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8
  }
});
