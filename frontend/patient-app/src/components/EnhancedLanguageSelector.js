/**
 * Enhanced Language Selector Component for MedTranslate AI Patient Application
 *
 * This component provides an improved interface for selecting languages,
 * with search, recently used languages, and language detection.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Animated,
  SectionList,
  Vibration,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for recent languages
const RECENT_LANGUAGES_KEY = 'medtranslate_recent_languages';

// Maximum number of recent languages to show
const MAX_RECENT_LANGUAGES = 3;

export default function EnhancedLanguageSelector({
  languages = [],
  selectedLanguage = null,
  onSelectLanguage,
  onDetectLanguage,
  isDetecting = false
}) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState(languages);
  const [recentLanguages, setRecentLanguages] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [languageSections, setLanguageSections] = useState([]);
  const [popularLanguages, setPopularLanguages] = useState([]);
  const [detectionFeedback, setDetectionFeedback] = useState('');
  const [showDetectionAnimation, setShowDetectionAnimation] = useState(false);

  // Animation values
  const detectionAnimValue = useRef(new Animated.Value(0)).current;
  const buttonScaleValue = useRef(new Animated.Value(1)).current;

  // Load recent languages on mount
  useEffect(() => {
    loadRecentLanguages();
  }, []);

  // Organize languages into sections and identify popular languages
  useEffect(() => {
    if (languages.length === 0) return;

    // Define popular language codes
    const popularCodes = ['es', 'fr', 'zh', 'ar', 'ru', 'hi', 'pt', 'de', 'ja', 'ko'];

    // Extract popular languages
    const popular = languages.filter(lang => popularCodes.includes(lang.code));
    setPopularLanguages(popular);

    // Group languages by first letter
    const groups = {};

    languages.forEach(language => {
      const firstLetter = language.name.charAt(0).toUpperCase();

      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }

      groups[firstLetter].push(language);
    });

    // Convert to sections format for SectionList
    const sections = Object.keys(groups)
      .sort()
      .map(letter => ({
        title: letter,
        data: groups[letter]
      }));

    setLanguageSections(sections);
  }, [languages]);

  // Filter languages when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLanguages(languages);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = languages.filter(
      language =>
        language.name.toLowerCase().includes(query) ||
        language.nativeName.toLowerCase().includes(query) ||
        language.code.toLowerCase().includes(query)
    );

    setFilteredLanguages(filtered);
  }, [searchQuery, languages]);

  // Load recent languages from storage
  const loadRecentLanguages = async () => {
    try {
      const storedLanguages = await AsyncStorage.getItem(RECENT_LANGUAGES_KEY);

      if (storedLanguages) {
        const parsedLanguages = JSON.parse(storedLanguages);
        setRecentLanguages(parsedLanguages);
      }
    } catch (error) {
      console.error('Error loading recent languages:', error);
    }
  };

  // Save language to recent languages
  const saveToRecentLanguages = async (language) => {
    try {
      // Remove if already exists
      const updated = recentLanguages.filter(lang => lang.code !== language.code);

      // Add to beginning
      const newRecent = [language, ...updated].slice(0, MAX_RECENT_LANGUAGES);

      // Save to state and storage
      setRecentLanguages(newRecent);
      await AsyncStorage.setItem(RECENT_LANGUAGES_KEY, JSON.stringify(newRecent));
    } catch (error) {
      console.error('Error saving recent language:', error);
    }
  };

  // Handle language selection
  const handleSelectLanguage = (language) => {
    onSelectLanguage(language);
    saveToRecentLanguages(language);
    setIsModalVisible(false);
  };

  // Handle language detection
  const handleDetectLanguage = () => {
    // Provide haptic feedback
    Vibration.vibrate(50);

    // Show detection animation
    setShowDetectionAnimation(true);
    setDetectionFeedback('Listening...');

    // Animate detection pulse
    Animated.sequence([
      Animated.timing(detectionAnimValue, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(detectionAnimValue, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(buttonScaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();

    // Update feedback message after a delay
    setTimeout(() => {
      setDetectionFeedback('Analyzing speech pattern...');
    }, 1500);

    // Call the actual detection function
    onDetectLanguage();

    // Hide animation after a timeout (in case detection takes too long)
    setTimeout(() => {
      setShowDetectionAnimation(false);
      setDetectionFeedback('');
    }, 10000);
  };

  // Get selected language name
  const getSelectedLanguageName = () => {
    if (!selectedLanguage) return 'Select Language';

    if (typeof selectedLanguage === 'string') {
      const language = languages.find(lang => lang.code === selectedLanguage);
      return language ? language.name : selectedLanguage;
    }

    return selectedLanguage.name;
  };

  // Render language item
  const renderLanguageItem = ({ item }) => {
    const isSelected = selectedLanguage &&
      (selectedLanguage.code === item.code || selectedLanguage === item.code);

    return (
      <TouchableOpacity
        style={[
          styles.languageItem,
          isSelected && styles.selectedLanguageItem
        ]}
        onPress={() => handleSelectLanguage(item)}
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

  // Render recent language item
  const renderRecentLanguageItem = (language, index) => (
    <TouchableOpacity
      key={language.code}
      style={[
        styles.recentLanguageItem,
        selectedLanguage &&
          (selectedLanguage.code === language.code || selectedLanguage === language.code) &&
          styles.selectedRecentLanguageItem
      ]}
      onPress={() => handleSelectLanguage(language)}
    >
      <Text style={styles.recentLanguageName}>{language.name}</Text>
    </TouchableOpacity>
  );

  // Render section header
  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  // Render popular language item
  const renderPopularLanguageItem = (language) => (
    <TouchableOpacity
      key={language.code}
      style={[
        styles.popularLanguageItem,
        selectedLanguage &&
          (selectedLanguage.code === language.code || selectedLanguage === language.code) &&
          styles.selectedPopularLanguageItem
      ]}
      onPress={() => handleSelectLanguage(language)}
    >
      <Text style={styles.popularLanguageName}>{language.name}</Text>
      <Text style={styles.popularLanguageNative}>{language.nativeName}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Selected language button */}
      <TouchableOpacity
        style={styles.selectedLanguageButton}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.selectedLanguageInfo}>
          <Text style={styles.selectedLanguageLabel}>Language</Text>
          <Text style={styles.selectedLanguageName}>
            {getSelectedLanguageName()}
          </Text>
        </View>

        <Ionicons name="chevron-down" size={20} color="#0077CC" />
      </TouchableOpacity>

      {/* Recent languages and auto-detect */}
      <View style={styles.recentLanguagesContainer}>
        {recentLanguages.length > 0 && (
          <>
            <Text style={styles.recentLanguagesTitle}>Recent</Text>

            <View style={styles.recentLanguagesList}>
              {recentLanguages.map(renderRecentLanguageItem)}
            </View>
          </>
        )}

        <Animated.View
          style={[
            styles.detectLanguageContainer,
            {
              transform: [{ scale: buttonScaleValue }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.detectLanguageButton}
            onPress={handleDetectLanguage}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="language" size={20} color="#FFFFFF" />
                <Text style={styles.detectLanguageText}>Auto-Detect Language</Text>
              </>
            )}
          </TouchableOpacity>

          {showDetectionAnimation && (
            <Animated.View
              style={[
                styles.detectionPulse,
                {
                  opacity: detectionAnimValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 0]
                  }),
                  transform: [
                    {
                      scale: detectionAnimValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.5]
                      })
                    }
                  ]
                }
              ]}
            />
          )}
        </Animated.View>

        {detectionFeedback ? (
          <Text style={styles.detectionFeedback}>{detectionFeedback}</Text>
        ) : null}
      </View>

      {/* Language selection modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#333333" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Select Language</Text>

            <TouchableOpacity
              style={styles.detectButton}
              onPress={() => {
                handleDetectLanguage();
                setIsModalVisible(false);
              }}
              disabled={isDetecting}
            >
              {isDetecting ? (
                <ActivityIndicator size="small" color="#0077CC" />
              ) : (
                <Ionicons name="language" size={24} color="#0077CC" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search languages..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#999999" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Search results */}
          {searchQuery ? (
            <View style={styles.searchResultsContainer}>
              {filteredLanguages.length === 0 ? (
                <View style={styles.emptyResultsContainer}>
                  <Ionicons name="search" size={48} color="#CCCCCC" />
                  <Text style={styles.emptyResultsText}>
                    No languages found matching "{searchQuery}"
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredLanguages}
                  renderItem={renderLanguageItem}
                  keyExtractor={(item) => item.code}
                  contentContainerStyle={styles.languagesList}
                />
              )}
            </View>
          ) : (
            <>
              {/* Recent languages in modal */}
              {recentLanguages.length > 0 && (
                <View style={styles.modalRecentContainer}>
                  <Text style={styles.modalSectionTitle}>Recent Languages</Text>

                  {recentLanguages.map(language => renderLanguageItem({ item: language }))}
                </View>
              )}

              {/* Popular languages */}
              {popularLanguages.length > 0 && (
                <View style={styles.popularLanguagesContainer}>
                  <Text style={styles.modalSectionTitle}>Popular Languages</Text>

                  <View style={styles.popularLanguagesList}>
                    {popularLanguages.map(renderPopularLanguageItem)}
                  </View>
                </View>
              )}

              {/* All languages */}
              <View style={styles.allLanguagesContainer}>
                <Text style={styles.modalSectionTitle}>All Languages</Text>

                <SectionList
                  sections={languageSections}
                  renderItem={renderLanguageItem}
                  renderSectionHeader={renderSectionHeader}
                  keyExtractor={(item) => item.code}
                  contentContainerStyle={styles.languagesList}
                  initialNumToRender={20}
                  stickySectionHeadersEnabled={true}
                />
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  selectedLanguageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  selectedLanguageInfo: {

  },
  selectedLanguageLabel: {
    fontSize: 12,
    color: '#757575'
  },
  selectedLanguageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginTop: 2
  },
  recentLanguagesContainer: {
    marginTop: 16
  },
  recentLanguagesTitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8
  },
  recentLanguagesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  recentLanguageItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8
  },
  selectedRecentLanguageItem: {
    backgroundColor: '#E3F2FD'
  },
  recentLanguageName: {
    fontSize: 14,
    color: '#333333'
  },
  detectLanguageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 8
  },
  detectLanguageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0077CC',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  detectLanguageText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8
  },
  detectionPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0077CC',
    borderRadius: 24
  },
  detectionFeedback: {
    fontSize: 14,
    color: '#0077CC',
    textAlign: 'center',
    marginTop: 8
  },
  popularLanguagesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  popularLanguagesList: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  popularLanguageItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    marginBottom: 8,
    width: '48%'
  },
  selectedPopularLanguageItem: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#0077CC'
  },
  popularLanguageName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333'
  },
  popularLanguageNative: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4
  },
  sectionHeader: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0077CC'
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  closeButton: {
    padding: 8
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  detectButton: {
    padding: 8
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    height: 40
  },
  clearButton: {
    padding: 8
  },
  modalRecentContainer: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12
  },
  allLanguagesContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  languagesList: {
    paddingBottom: 16
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  selectedLanguageItem: {
    backgroundColor: '#F5F5F5'
  },
  languageInfo: {

  },
  languageName: {
    fontSize: 16,
    color: '#333333'
  },
  nativeName: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2
  },
  languageGroup: {
    marginBottom: 16
  },
  groupHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0077CC',
    marginBottom: 8,
    paddingHorizontal: 16
  },
  emptyResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 24
  },
  emptyResultsText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 12,
    textAlign: 'center'
  }
});
