/**
 * Test Screen for Enhanced Language Selector
 * 
 * This screen is used to test the EnhancedLanguageSelector component
 * with various configurations and states.
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Switch,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import EnhancedLanguageSelector from '../components/EnhancedLanguageSelector';
import mockApi from '../../shared/test-data/mock-api';
import generator from '../../shared/test-data/generator';

export default function TestLanguageSelectorScreen({ navigation }) {
  // State
  const [languages, setLanguages] = useState(generator.LANGUAGES);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  
  // Handle language selection
  const handleSelectLanguage = (language) => {
    setSelectedLanguage(language);
    Alert.alert('Language Selected', `Selected language: ${language.name} (${language.code})`);
  };
  
  // Handle language detection
  const handleDetectLanguage = async () => {
    setIsDetecting(true);
    
    try {
      // Simulate language detection
      const response = await mockApi.detectLanguage();
      
      if (response.success) {
        setSelectedLanguage(response.language);
        Alert.alert('Language Detected', `Detected language: ${response.language.name} (${response.language.code})`);
      } else {
        Alert.alert('Error', response.error || 'Failed to detect language');
      }
    } catch (error) {
      console.error('Error detecting language:', error);
      Alert.alert('Error', 'Failed to detect language. Please try again.');
    } finally {
      setIsDetecting(false);
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
        
        <Text style={styles.title}>Test Language Selector</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => alert('This screen is used to test the EnhancedLanguageSelector component with various configurations and states.')}
        >
          <Ionicons name="information-circle" size={24} color="#0077CC" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Component preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.sectionTitle}>Component Preview</Text>
          
          <View style={styles.previewContent}>
            <EnhancedLanguageSelector
              languages={languages}
              selectedLanguage={selectedLanguage}
              onSelectLanguage={handleSelectLanguage}
              onDetectLanguage={handleDetectLanguage}
              isDetecting={isDetecting}
            />
          </View>
        </View>
        
        {/* Test controls */}
        <View style={styles.testControls}>
          <Text style={styles.sectionTitle}>Test Controls</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setSelectedLanguage(null)}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Reset Selection</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // Select a random language
              const randomLanguage = languages[Math.floor(Math.random() * languages.length)];
              setSelectedLanguage(randomLanguage);
            }}
          >
            <Ionicons name="shuffle" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Random Language</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDetectLanguage}
            disabled={isDetecting}
          >
            <Ionicons name="language" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {isDetecting ? 'Detecting...' : 'Simulate Detection'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Selected language */}
        {selectedLanguage && (
          <View style={styles.selectedContainer}>
            <Text style={styles.sectionTitle}>Selected Language</Text>
            
            <View style={styles.selectedContent}>
              <Text style={styles.selectedLabel}>Code:</Text>
              <Text style={styles.selectedValue}>{selectedLanguage.code}</Text>
            </View>
            
            <View style={styles.selectedContent}>
              <Text style={styles.selectedLabel}>Name:</Text>
              <Text style={styles.selectedValue}>{selectedLanguage.name}</Text>
            </View>
            
            <View style={styles.selectedContent}>
              <Text style={styles.selectedLabel}>Native Name:</Text>
              <Text style={styles.selectedValue}>{selectedLanguage.nativeName}</Text>
            </View>
          </View>
        )}
        
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          
          <Text style={styles.instructionText}>
            • Tap on the language selector to open the language selection modal{'\n'}
            • Select a language from the list{'\n'}
            • Use the "Auto" button to simulate language detection{'\n'}
            • Use the test controls to reset or randomize the selection{'\n'}
            • The component will remember recently selected languages
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
    shadowRadius: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0077CC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 8,
    width: '48%'
  },
  actionButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 8
  },
  selectedContainer: {
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
  selectedContent: {
    flexDirection: 'row',
    marginBottom: 8
  },
  selectedLabel: {
    fontSize: 16,
    color: '#757575',
    width: 120
  },
  selectedValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
    flex: 1
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
