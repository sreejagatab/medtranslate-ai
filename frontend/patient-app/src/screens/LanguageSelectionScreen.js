/**
 * Language Selection Screen for MedTranslate AI Patient Application
 *
 * This screen allows users to select their preferred language for translation.
 */

import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { TranslationContext } from '../context/TranslationContext';
import EnhancedLanguageSelector from '../components/EnhancedLanguageSelector';

// List of supported languages
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' }
];

export default function LanguageSelectionScreen({ navigation, route }) {
  const { selectedLanguage, setSelectedLanguage } = useContext(TranslationContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState(LANGUAGES);
  const [loading, setLoading] = useState(false);

  // Get session parameters if coming from a session join
  const { sessionId, providerName, medicalContext } = route.params || {};

  // Filter languages based on search query
  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = LANGUAGES.filter(
        language =>
          language.name.toLowerCase().includes(query) ||
          language.nativeName.toLowerCase().includes(query)
      );
      setFilteredLanguages(filtered);
    } else {
      setFilteredLanguages(LANGUAGES);
    }
  }, [searchQuery]);

  // Handle language selection
  const handleLanguageSelect = async (language) => {
    setLoading(true);

    try {
      // Save the selected language
      await setSelectedLanguage(language);

      // If coming from a session join, navigate to the session
      if (sessionId) {
        navigation.navigate('TranslationSession', {
          sessionId,
          providerName,
          medicalContext
        });
      } else {
        // Otherwise, show a success message or navigate to home
        setLoading(false);
      }
    } catch (error) {
      console.error('Error selecting language:', error);
      setLoading(false);
    }
  };

  // Render each language item
  const renderLanguageItem = ({ item }) => {
    const isSelected = selectedLanguage && selectedLanguage.code === item.code;

    return (
      <TouchableOpacity
        style={[
          styles.languageItem,
          isSelected && styles.selectedLanguageItem
        ]}
        onPress={() => handleLanguageSelect(item)}
      >
        <View style={styles.languageInfo}>
          <Text style={styles.languageName}>{item.name}</Text>
          <Text style={styles.nativeName}>{item.nativeName}</Text>
        </View>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#0077CC" />
        )}
      </TouchableOpacity>
    );
  };

  // Handle language detection
  const handleDetectLanguage = async () => {
    setLoading(true);

    try {
      // Simulate language detection (in a real app, this would use the device's locale or speech recognition)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // For demo purposes, randomly select a language
      const randomIndex = Math.floor(Math.random() * LANGUAGES.length);
      const detectedLanguage = LANGUAGES[randomIndex];

      // Save the selected language
      await setSelectedLanguage(detectedLanguage);

      // Show success message
      Alert.alert(
        'Language Detected',
        `We detected that you speak ${detectedLanguage.name}. Is this correct?`,
        [
          {
            text: 'No, Choose Another',
            style: 'cancel',
            onPress: () => setLoading(false)
          },
          {
            text: 'Yes, Continue',
            onPress: () => {
              if (sessionId) {
                navigation.navigate('TranslationSession', {
                  sessionId,
                  providerName,
                  medicalContext
                });
              } else {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error detecting language:', error);
      Alert.alert('Error', 'Failed to detect language. Please select manually.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Language</Text>
        <Text style={styles.subtitle}>
          Choose the language you'd like to use for translation
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077CC" />
          <Text style={styles.loadingText}>Setting up your language...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <EnhancedLanguageSelector
            languages={LANGUAGES}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={handleLanguageSelect}
            onDetectLanguage={handleDetectLanguage}
            isDetecting={loading}
          />

          {selectedLanguage && !sessionId && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    marginTop: 'auto',
  },
  continueButton: {
    backgroundColor: '#0077CC',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
});
