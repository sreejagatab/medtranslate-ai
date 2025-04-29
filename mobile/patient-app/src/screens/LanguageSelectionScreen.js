/**
 * Language Selection Screen for MedTranslate AI Patient App
 * 
 * Allows users to select their preferred language
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { LANGUAGES, STORAGE_KEYS } from '../utils/config';

const LanguageSelectionScreen = ({ navigation }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState(LANGUAGES);
  
  // Load saved language on mount
  useEffect(() => {
    loadSavedLanguage();
  }, []);
  
  // Filter languages when search query changes
  useEffect(() => {
    if (searchQuery) {
      const filtered = LANGUAGES.filter(lang => 
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLanguages(filtered);
    } else {
      setFilteredLanguages(LANGUAGES);
    }
  }, [searchQuery]);
  
  // Load saved language
  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.USER_LANGUAGE);
      if (savedLanguage) {
        setSelectedLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
    }
  };
  
  // Save selected language and continue
  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_LANGUAGE, selectedLanguage);
      navigation.navigate('JoinSession', { language: selectedLanguage });
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };
  
  // Render language item
  const renderLanguageItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        selectedLanguage === item.code && styles.selectedLanguageItem
      ]}
      onPress={() => setSelectedLanguage(item.code)}
    >
      <Text style={[
        styles.languageName,
        selectedLanguage === item.code && styles.selectedLanguageText
      ]}>
        {item.name}
      </Text>
      
      {selectedLanguage === item.code && (
        <MaterialIcons name="check" size={24} color="#FFFFFF" />
      )}
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Language</Text>
        <Text style={styles.subtitle}>
          Choose the language you'd like to use for translation
        </Text>
      </View>
      
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#999999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search languages"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999999"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={24} color="#999999" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      <FlatList
        data={filteredLanguages}
        renderItem={renderLanguageItem}
        keyExtractor={item => item.code}
        contentContainerStyle={styles.languageList}
      />
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666666'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    height: 48
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333333'
  },
  languageList: {
    padding: 16
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 8
  },
  selectedLanguageItem: {
    backgroundColor: '#0066CC'
  },
  languageName: {
    fontSize: 16,
    color: '#333333'
  },
  selectedLanguageText: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  continueButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default LanguageSelectionScreen;
