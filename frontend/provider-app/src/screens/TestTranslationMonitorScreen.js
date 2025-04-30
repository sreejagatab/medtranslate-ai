/**
 * Test Screen for Translation Monitor Panel
 * 
 * This screen is used to test the TranslationMonitorPanel component
 * with realistic data from the mock API.
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import TranslationMonitorPanel from '../components/TranslationMonitorPanel';
import mockApi from '../../shared/test-data/mock-api';
import generator from '../../shared/test-data/generator';

export default function TestTranslationMonitorScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [translations, setTranslations] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [sessionLanguage, setSessionLanguage] = useState('es');
  const [autoAddTranslations, setAutoAddTranslations] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  
  // Load translations data
  const loadTranslationsData = async () => {
    try {
      setError(null);
      
      // Generate random translations for testing
      const randomTranslations = generator.generateTranslations(10);
      
      setTranslations(randomTranslations);
    } catch (error) {
      console.error('Error loading translations:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Load data on mount
  useEffect(() => {
    loadTranslationsData();
    
    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);
  
  // Handle auto-add translations toggle
  useEffect(() => {
    if (autoAddTranslations) {
      // Add a new translation every 3 seconds
      const id = setInterval(() => {
        const newTranslation = generator.generateTranslation();
        setTranslations(prev => [newTranslation, ...prev].slice(0, 20));
      }, 3000);
      
      setIntervalId(id);
    } else {
      // Clear interval
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoAddTranslations]);
  
  // Handle report error
  const handleReportError = async (translationId, reason) => {
    try {
      const response = await mockApi.reportTranslationError(translationId, reason);
      
      if (response.success) {
        // Show success message
        Alert.alert('Success', 'Error report submitted successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to submit error report');
      }
    } catch (error) {
      console.error('Error reporting translation error:', error);
      Alert.alert('Error', 'Failed to submit error report. Please try again.');
    }
  };
  
  // Handle request alternative
  const handleRequestAlternative = async (translationId) => {
    try {
      const response = await mockApi.getAlternativeTranslation(translationId);
      
      if (response.success) {
        // Add alternative translation to the list
        setTranslations(prev => [response.translation, ...prev].slice(0, 20));
        
        // Show success message
        Alert.alert('Success', 'Alternative translation generated successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to generate alternative translation');
      }
    } catch (error) {
      console.error('Error requesting alternative translation:', error);
      Alert.alert('Error', 'Failed to generate alternative translation. Please try again.');
    }
  };
  
  // Handle toggle auto-correct
  const handleToggleAutoCorrect = (value) => {
    Alert.alert('Auto-Correct', `Auto-correct ${value ? 'enabled' : 'disabled'}`);
  };
  
  // Show loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077CC" />
        <Text style={styles.loadingText}>Loading translations...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Test Translation Monitor</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => Alert.alert('Test Info', 'This screen is used to test the TranslationMonitorPanel component with realistic data from the mock API.')}
        >
          <Ionicons name="information-circle" size={24} color="#0077CC" />
        </TouchableOpacity>
      </View>
      
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadTranslationsData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Test controls */}
      <View style={styles.testControls}>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Session Active:</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Auto-Add Translations:</Text>
          <Switch
            value={autoAddTranslations}
            onValueChange={setAutoAddTranslations}
            trackColor={{ false: '#CCCCCC', true: '#2196F3' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Language:</Text>
          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => {
              const languages = ['es', 'fr', 'de', 'it', 'zh', 'ru'];
              const currentIndex = languages.indexOf(sessionLanguage);
              const nextIndex = (currentIndex + 1) % languages.length;
              setSessionLanguage(languages[nextIndex]);
            }}
          >
            <Text style={styles.languageButtonText}>{sessionLanguage}</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            const newTranslation = generator.generateTranslation();
            setTranslations(prev => [newTranslation, ...prev].slice(0, 20));
          }}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Translation</Text>
        </TouchableOpacity>
      </View>
      
      {/* Translation monitor panel */}
      <TranslationMonitorPanel
        isActive={isActive}
        translations={translations}
        sessionLanguage={sessionLanguage}
        onReportError={handleReportError}
        onRequestAlternative={handleRequestAlternative}
        onToggleAutoCorrect={handleToggleAutoCorrect}
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    margin: 16,
    padding: 12,
    borderRadius: 8
  },
  errorText: {
    color: '#F44336',
    marginLeft: 8,
    flex: 1
  },
  retryButton: {
    backgroundColor: '#F44336',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
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
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  controlLabel: {
    fontSize: 14,
    color: '#333333'
  },
  languageButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4
  },
  languageButtonText: {
    fontSize: 14,
    color: '#0077CC',
    fontWeight: '500'
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0077CC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 8
  },
  addButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 8
  }
});
