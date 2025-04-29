/**
 * Notifications Screen for MedTranslate AI Patient App
 * 
 * This screen displays the notification history and allows users to:
 * - View all notifications
 * - Mark notifications as read
 * - Clear notification history
 * - Configure notification settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import NotificationService from '../services/NotificationService';
import { formatDistanceToNow } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load notifications when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      loadSettings();
      
      // Update badge count when screen is focused
      NotificationService.updateBadgeCount();
      
      return () => {
        // No cleanup needed
      };
    }, [])
  );

  // Load notification history
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const history = await NotificationService.getNotificationHistory();
      setNotifications(history);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notification settings
  const loadSettings = async () => {
    try {
      const settings = await NotificationService.getNotificationSettings();
      setSettings(settings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  // Handle notification press
  const handleNotificationPress = async (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await NotificationService.markNotificationAsRead(notification.id);
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(item => 
          item.id === notification.id ? { ...item, read: true } : item
        )
      );
    }
    
    // Handle notification action based on type
    if (notification.data?.type === 'session_invitation') {
      navigation.navigate('JoinSession', { sessionId: notification.data.sessionId });
    } else if (notification.data?.type === 'translation_complete') {
      navigation.navigate('TranslationSession', { sessionId: notification.data.sessionId });
    }
  };

  // Clear all notifications
  const handleClearAll = () => {
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await NotificationService.clearNotificationHistory();
            setNotifications([]);
          }
        }
      ]
    );
  };

  // Toggle notification settings
  const toggleSetting = async (setting, value) => {
    try {
      const updatedSettings = { ...settings, [setting]: value };
      await NotificationService.updateNotificationSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  // Render notification item
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, item.read ? styles.readNotification : styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody}>{item.body}</Text>
        <Text style={styles.notificationTime}>
          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  // Render settings section
  const renderSettings = () => (
    <View style={styles.settingsContainer}>
      <Text style={styles.settingsTitle}>Notification Settings</Text>
      
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Enable Notifications</Text>
        <Switch
          value={settings.enabled}
          onValueChange={(value) => toggleSetting('enabled', value)}
        />
      </View>
      
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Sound</Text>
        <Switch
          value={settings.sound}
          onValueChange={(value) => toggleSetting('sound', value)}
          disabled={!settings.enabled}
        />
      </View>
      
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Vibration</Text>
        <Switch
          value={settings.vibration}
          onValueChange={(value) => toggleSetting('vibration', value)}
          disabled={!settings.enabled}
        />
      </View>
      
      <Text style={styles.settingsSubtitle}>Notification Types</Text>
      
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Session Invitations</Text>
        <Switch
          value={settings.sessionInvitations}
          onValueChange={(value) => toggleSetting('sessionInvitations', value)}
          disabled={!settings.enabled}
        />
      </View>
      
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Translation Updates</Text>
        <Switch
          value={settings.translationUpdates}
          onValueChange={(value) => toggleSetting('translationUpdates', value)}
          disabled={!settings.enabled}
        />
      </View>
      
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>System Updates</Text>
        <Switch
          value={settings.systemUpdates}
          onValueChange={(value) => toggleSetting('systemUpdates', value)}
          disabled={!settings.enabled}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSettings(!showSettings)}
          >
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleClearAll}
            >
              <Ionicons name="trash-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {showSettings ? (
        renderSettings()
      ) : (
        <>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotificationItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              }
            />
          )}
        </>
      )}
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
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999999',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#F0F7FF',
  },
  readNotification: {
    backgroundColor: '#FFFFFF',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    marginLeft: 8,
    alignSelf: 'center',
  },
  settingsContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingsSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  settingLabel: {
    fontSize: 16,
  },
});

export default NotificationsScreen;
