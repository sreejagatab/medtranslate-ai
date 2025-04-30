/**
 * Test Navigator for MedTranslate AI
 * 
 * This component provides navigation to all test screens for
 * testing UI components with real data.
 */

import React from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function TestNavigator() {
  const navigation = useNavigation();
  
  // Provider app test screens
  const providerTestScreens = [
    {
      id: 'session-management',
      name: 'Session Management',
      description: 'Test the SessionManagementPanel component',
      screen: 'TestSessionManagement',
      icon: 'calendar'
    },
    {
      id: 'patient-history',
      name: 'Patient History',
      description: 'Test the PatientHistoryPanel component',
      screen: 'TestPatientHistory',
      icon: 'person'
    },
    {
      id: 'translation-monitor',
      name: 'Translation Monitor',
      description: 'Test the TranslationMonitorPanel component',
      screen: 'TestTranslationMonitor',
      icon: 'analytics'
    }
  ];
  
  // Patient app test screens
  const patientTestScreens = [
    {
      id: 'voice-record',
      name: 'Voice Record Button',
      description: 'Test the EnhancedVoiceRecordButton component',
      screen: 'TestVoiceRecord',
      icon: 'mic'
    },
    {
      id: 'translation-status',
      name: 'Translation Status',
      description: 'Test the TranslationStatusIndicator component',
      screen: 'TestTranslationStatus',
      icon: 'pulse'
    },
    {
      id: 'language-selector',
      name: 'Language Selector',
      description: 'Test the EnhancedLanguageSelector component',
      screen: 'TestLanguageSelector',
      icon: 'language'
    }
  ];
  
  // Render test screen item
  const renderTestScreenItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.testItem}
      onPress={() => navigation.navigate(item.screen)}
    >
      <View style={styles.testIconContainer}>
        <Ionicons name={item.icon} size={24} color="#FFFFFF" />
      </View>
      
      <View style={styles.testInfo}>
        <Text style={styles.testName}>{item.name}</Text>
        <Text style={styles.testDescription}>{item.description}</Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MedTranslate AI Test Suite</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provider App Components</Text>
          {providerTestScreens.map(renderTestScreenItem)}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient App Components</Text>
          {patientTestScreens.map(renderTestScreenItem)}
        </View>
        
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={24} color="#0077CC" />
          <Text style={styles.infoText}>
            This test suite allows you to test individual UI components with realistic data.
            Select a component to view its test screen.
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
    padding: 16,
    backgroundColor: '#0077CC'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  scrollView: {
    flex: 1
  },
  section: {
    margin: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12
  },
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  testIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0077CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  testInfo: {
    flex: 1
  },
  testName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4
  },
  testDescription: {
    fontSize: 14,
    color: '#757575'
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    margin: 16
  },
  infoText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 12,
    flex: 1
  }
});
