/**
 * Accessibility Settings Screen for MedTranslate AI
 * 
 * This screen allows users to configure accessibility settings
 * for the MedTranslate AI application.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import * as AccessibilityUtils from '../utils/accessibility-utils';

export default function AccessibilitySettingsScreen() {
  const navigation = useNavigation();
  
  // State
  const [settings, setSettings] = useState(AccessibilityUtils.getSettings());
  
  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Load accessibility settings
  const loadSettings = async () => {
    try {
      const currentSettings = await AccessibilityUtils.initialize();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading accessibility settings:', error);
      Alert.alert('Error', 'Failed to load accessibility settings. Please try again.');
    }
  };
  
  // Update setting
  const updateSetting = async (key, value) => {
    try {
      const updatedSettings = await AccessibilityUtils.updateSettings({
        [key]: value
      });
      
      setSettings(updatedSettings);
    } catch (error) {
      console.error(`Error updating ${key} setting:`, error);
      Alert.alert('Error', `Failed to update ${key} setting. Please try again.`);
    }
  };
  
  // Reset settings
  const handleResetSettings = async () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all accessibility settings to defaults?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const defaultSettings = await AccessibilityUtils.resetSettings();
              setSettings(defaultSettings);
              Alert.alert('Success', 'Accessibility settings have been reset to defaults.');
            } catch (error) {
              console.error('Error resetting accessibility settings:', error);
              Alert.alert('Error', 'Failed to reset accessibility settings. Please try again.');
            }
          }
        }
      ]
    );
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
        
        <Text style={styles.title}>Accessibility Settings</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => Alert.alert(
            'Accessibility Settings',
            'Configure accessibility settings to make the app more accessible for your needs.'
          )}
          {...AccessibilityUtils.getAccessibilityProps({
            label: 'Information',
            role: 'button',
            hint: 'Learn more about accessibility settings'
          })}
        >
          <Ionicons name="information-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>High Contrast</Text>
              <Text style={styles.settingDescription}>
                Increase contrast for better visibility
              </Text>
            </View>
            
            <Switch
              value={settings.highContrast}
              onValueChange={(value) => updateSetting('highContrast', value)}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
              {...AccessibilityUtils.getAccessibilityProps({
                label: 'High Contrast',
                role: 'switch',
                state: { checked: settings.highContrast }
              })}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Large Text</Text>
              <Text style={styles.settingDescription}>
                Increase text size for better readability
              </Text>
            </View>
            
            <Switch
              value={settings.largeText}
              onValueChange={(value) => updateSetting('largeText', value)}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
              {...AccessibilityUtils.getAccessibilityProps({
                label: 'Large Text',
                role: 'switch',
                state: { checked: settings.largeText }
              })}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motion Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reduce Motion</Text>
              <Text style={styles.settingDescription}>
                Minimize animations and motion effects
              </Text>
            </View>
            
            <Switch
              value={settings.reduceMotion}
              onValueChange={(value) => updateSetting('reduceMotion', value)}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
              {...AccessibilityUtils.getAccessibilityProps({
                label: 'Reduce Motion',
                role: 'switch',
                state: { checked: settings.reduceMotion }
              })}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>
                Enable vibration feedback for interactions
              </Text>
            </View>
            
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(value) => updateSetting('hapticFeedback', value)}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
              {...AccessibilityUtils.getAccessibilityProps({
                label: 'Haptic Feedback',
                role: 'switch',
                state: { checked: settings.hapticFeedback }
              })}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screen Reader</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Optimize for Screen Readers</Text>
              <Text style={styles.settingDescription}>
                Improve compatibility with screen readers
              </Text>
            </View>
            
            <Switch
              value={settings.screenReader}
              onValueChange={(value) => updateSetting('screenReader', value)}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
              {...AccessibilityUtils.getAccessibilityProps({
                label: 'Optimize for Screen Readers',
                role: 'switch',
                state: { checked: settings.screenReader }
              })}
            />
          </View>
          
          {settings.screenReader && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#0077CC" />
              <Text style={styles.infoText}>
                Screen reader optimization is enabled. The app will provide enhanced
                descriptions and simplified navigation for screen reader users.
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reset Settings</Text>
          
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetSettings}
            {...AccessibilityUtils.getAccessibilityProps({
              label: 'Reset to Defaults',
              role: 'button',
              hint: 'Reset all accessibility settings to their default values'
            })}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
          
          <Text style={styles.resetDescription}>
            Reset all accessibility settings to their default values.
            This cannot be undone.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility Resources</Text>
          
          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => Alert.alert('Accessibility Guide', 'This would open the accessibility guide in a real app.')}
            {...AccessibilityUtils.getAccessibilityProps({
              label: 'Accessibility Guide',
              role: 'button',
              hint: 'View the accessibility guide'
            })}
          >
            <Ionicons name="book" size={24} color="#0077CC" />
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>Accessibility Guide</Text>
              <Text style={styles.resourceDescription}>
                Learn how to use accessibility features in the app
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => Alert.alert('Contact Support', 'This would open the support contact form in a real app.')}
            {...AccessibilityUtils.getAccessibilityProps({
              label: 'Contact Support',
              role: 'button',
              hint: 'Contact support for accessibility help'
            })}
          >
            <Ionicons name="mail" size={24} color="#0077CC" />
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>Contact Support</Text>
              <Text style={styles.resourceDescription}>
                Get help with accessibility features
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 16
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  settingInfo: {
    flex: 1,
    marginRight: 16
  },
  settingLabel: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4
  },
  settingDescription: {
    fontSize: 14,
    color: '#757575'
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16
  },
  infoText: {
    fontSize: 14,
    color: '#0D47A1',
    marginLeft: 8,
    flex: 1
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8
  },
  resetDescription: {
    fontSize: 14,
    color: '#757575'
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  resourceInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8
  },
  resourceTitle: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4
  },
  resourceDescription: {
    fontSize: 14,
    color: '#757575'
  }
});
