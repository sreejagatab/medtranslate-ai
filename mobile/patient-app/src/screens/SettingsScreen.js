/**
 * Settings Screen for MedTranslate AI Patient App
 * 
 * This screen allows users to configure app settings, including:
 * - Language preferences
 * - Offline mode settings
 * - Notification preferences
 * - Account settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/config';
import NotificationService from '../services/NotificationService';
import OfflineService from '../services/OfflineService';
import { useConnection } from '../contexts/ConnectionContext';

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    language: 'en',
    offlineMode: false,
    autoSync: true,
    notifications: true,
    darkMode: false,
    saveHistory: true
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    sound: true,
    vibration: true,
    sessionInvitations: true,
    translationUpdates: true,
    systemUpdates: true
  });
  
  const [offlineStats, setOfflineStats] = useState({
    queueSize: 0,
    pendingItems: 0,
    failedItems: 0,
    availableModels: 0,
    totalStorageUsed: 0
  });
  
  const [loading, setLoading] = useState(true);
  const { isConnected } = useConnection();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadNotificationSettings();
    loadOfflineStats();
  }, []);

  // Load app settings
  const loadSettings = async () => {
    try {
      const settingsString = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (settingsString) {
        setSettings(JSON.parse(settingsString));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notification settings
  const loadNotificationSettings = async () => {
    try {
      const settings = await NotificationService.getNotificationSettings();
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  // Load offline stats
  const loadOfflineStats = async () => {
    try {
      const stats = await OfflineService.getOfflineStats();
      setOfflineStats(stats);
    } catch (error) {
      console.error('Error loading offline stats:', error);
    }
  };

  // Update a setting
  const updateSetting = async (key, value) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
      
      // Handle special cases
      if (key === 'offlineMode' && value === true) {
        Alert.alert(
          'Offline Mode',
          'Offline mode will use local models for translation when no internet connection is available. This may reduce translation quality.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  // Update notification setting
  const updateNotificationSetting = async (key, value) => {
    try {
      const updatedSettings = { ...notificationSettings, [key]: value };
      setNotificationSettings(updatedSettings);
      await NotificationService.updateNotificationSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating notification setting:', error);
    }
  };

  // Format bytes to human-readable size
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Clear all app data
  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all app data? This will remove all settings, history, and offline translations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Clear all AsyncStorage data
              await AsyncStorage.clear();
              
              // Reset settings
              setSettings({
                language: 'en',
                offlineMode: false,
                autoSync: true,
                notifications: true,
                darkMode: false,
                saveHistory: true
              });
              
              // Reset notification settings
              setNotificationSettings({
                enabled: true,
                sound: true,
                vibration: true,
                sessionInvitations: true,
                translationUpdates: true,
                systemUpdates: true
              });
              
              // Reset offline stats
              setOfflineStats({
                queueSize: 0,
                pendingItems: 0,
                failedItems: 0,
                availableModels: 0,
                totalStorageUsed: 0
              });
              
              Alert.alert('Success', 'All app data has been cleared.');
            } catch (error) {
              console.error('Error clearing app data:', error);
              Alert.alert('Error', 'Failed to clear app data.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Language</Text>
            <TouchableOpacity style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {settings.language === 'en' ? 'English' : 'Spanish'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => updateSetting('darkMode', value)}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Save Translation History</Text>
            <Switch
              value={settings.saveHistory}
              onValueChange={(value) => updateSetting('saveHistory', value)}
            />
          </View>
        </View>
        
        {/* Offline Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offline Mode</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Enable Offline Mode</Text>
            <Switch
              value={settings.offlineMode}
              onValueChange={(value) => updateSetting('offlineMode', value)}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Auto-Sync When Online</Text>
            <Switch
              value={settings.autoSync}
              onValueChange={(value) => updateSetting('autoSync', value)}
              disabled={!settings.offlineMode}
            />
          </View>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('OfflineQueue')}
          >
            <Text style={styles.buttonText}>Manage Offline Translations</Text>
          </TouchableOpacity>
          
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Offline Statistics</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Pending Translations:</Text>
              <Text style={styles.statsValue}>{offlineStats.pendingItems}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Available Models:</Text>
              <Text style={styles.statsValue}>{offlineStats.availableModels}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Storage Used:</Text>
              <Text style={styles.statsValue}>{formatBytes(offlineStats.totalStorageUsed)}</Text>
            </View>
          </View>
        </View>
        
        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Switch
              value={notificationSettings.enabled}
              onValueChange={(value) => updateNotificationSetting('enabled', value)}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Sound</Text>
            <Switch
              value={notificationSettings.sound}
              onValueChange={(value) => updateNotificationSetting('sound', value)}
              disabled={!notificationSettings.enabled}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Vibration</Text>
            <Switch
              value={notificationSettings.vibration}
              onValueChange={(value) => updateNotificationSetting('vibration', value)}
              disabled={!notificationSettings.enabled}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Session Invitations</Text>
            <Switch
              value={notificationSettings.sessionInvitations}
              onValueChange={(value) => updateNotificationSetting('sessionInvitations', value)}
              disabled={!notificationSettings.enabled}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Translation Updates</Text>
            <Switch
              value={notificationSettings.translationUpdates}
              onValueChange={(value) => updateNotificationSetting('translationUpdates', value)}
              disabled={!notificationSettings.enabled}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>System Updates</Text>
            <Switch
              value={notificationSettings.systemUpdates}
              onValueChange={(value) => updateNotificationSetting('systemUpdates', value)}
              disabled={!notificationSettings.enabled}
            />
          </View>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.buttonText}>View Notification History</Text>
          </TouchableOpacity>
        </View>
        
        {/* About & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About & Support</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>About MedTranslate AI</Text>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>
          
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>
        
        {/* Advanced */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={clearAllData}
          >
            <Text style={styles.dangerButtonText}>Clear All App Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 16,
    color: '#999999',
    marginRight: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#F8F8F8',
    margin: 16,
    borderRadius: 8,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  statsLabel: {
    fontSize: 14,
    color: '#666666',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  versionContainer: {
    alignItems: 'center',
    padding: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#999999',
  },
});

export default SettingsScreen;
