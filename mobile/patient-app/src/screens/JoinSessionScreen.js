/**
 * Join Session Screen for MedTranslate AI Patient App
 *
 * Allows users to join a translation session using a code
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSession } from '../contexts/SessionContext';
import { LANGUAGES } from '../utils/config';
import { registerForPushNotifications } from '../services/NotificationService';

const JoinSessionScreen = ({ navigation, route }) => {
  const { language: routeLanguage } = route.params || {};
  const { joinSession, isLoading } = useSession();

  const [sessionCode, setSessionCode] = useState('');
  const [language, setLanguage] = useState(routeLanguage || 'en');
  const [pushToken, setPushToken] = useState(null);

  // Register for push notifications on mount
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // Register for push notifications
  const registerForPushNotificationsAsync = async () => {
    try {
      const token = await registerForPushNotifications();
      setPushToken(token);
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  // Handle session code input
  const handleSessionCodeChange = (text) => {
    // Remove non-numeric characters
    const numericText = text.replace(/[^0-9]/g, '');
    setSessionCode(numericText);
  };

  // Handle join session
  const handleJoinSession = async () => {
    if (sessionCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit session code');
      return;
    }

    const success = await joinSession(sessionCode, language);

    if (success) {
      navigation.replace('TranslationSession');
    }
  };

  // Handle language selection
  const handleLanguageSelection = () => {
    navigation.navigate('LanguageSelection');
  };

  // Get language name from code
  const getLanguageName = (code) => {
    const language = LANGUAGES.find(lang => lang.code === code);
    return language ? language.name : 'Unknown';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          {/* Placeholder for logo - will be replaced with actual logo */}
          <View style={[styles.logo, {backgroundColor: '#0066CC', justifyContent: 'center', alignItems: 'center', borderRadius: 50}]}>
            <Text style={{color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'}}>MT</Text>
          </View>

          <Text style={styles.title}>MedTranslate AI</Text>
          <Text style={styles.subtitle}>Patient Application</Text>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Enter Session Code</Text>
            <TextInput
              style={styles.codeInput}
              value={sessionCode}
              onChangeText={handleSessionCodeChange}
              placeholder="6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor="#999999"
            />

            <Text style={styles.label}>Your Language</Text>
            <TouchableOpacity
              style={styles.languageSelector}
              onPress={handleLanguageSelection}
            >
              <Text style={styles.languageText}>{getLanguageName(language)}</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#0066CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinSession}
              disabled={isLoading || sessionCode.length !== 6}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.joinButtonText}>Join Session</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Need help? Ask your healthcare provider for a session code.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  keyboardAvoidingView: {
    flex: 1
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0066CC',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40
  },
  formContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8
  },
  codeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
    color: '#333333'
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    marginBottom: 30
  },
  languageText: {
    fontSize: 16,
    color: '#333333'
  },
  joinButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  helpContainer: {
    marginTop: 30,
    alignItems: 'center'
  },
  helpText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center'
  }
});

export default JoinSessionScreen;
