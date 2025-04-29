/**
 * Offline Queue Screen for MedTranslate AI Patient App
 * 
 * This screen displays and manages translations that were performed offline
 * and are waiting to be synchronized with the server.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConnection } from '../contexts/ConnectionContext';
import OfflineService from '../services/OfflineService';
import { formatDistanceToNow } from 'date-fns';

const OfflineQueueScreen = ({ navigation }) => {
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const { isConnected } = useConnection();

  // Load queue items when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadQueueItems();
      return () => {
        // No cleanup needed
      };
    }, [])
  );

  // Load offline queue items
  const loadQueueItems = async () => {
    setLoading(true);
    try {
      const items = await OfflineService.getQueueItems();
      setQueueItems(items);
    } catch (error) {
      console.error('Error loading offline queue items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadQueueItems();
    setRefreshing(false);
  };

  // Sync all items
  const syncAllItems = async () => {
    if (!isConnected) {
      Alert.alert(
        'No Connection',
        'You need an internet connection to sync translations.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (queueItems.length === 0) {
      Alert.alert('No Items', 'There are no items to sync.', [{ text: 'OK' }]);
      return;
    }

    Alert.alert(
      'Sync All Items',
      'Are you sure you want to sync all offline translations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync All',
          onPress: async () => {
            setSyncInProgress(true);
            try {
              await OfflineService.syncAllItems();
              await loadQueueItems();
              Alert.alert('Success', 'All translations have been synchronized.');
            } catch (error) {
              console.error('Error syncing items:', error);
              Alert.alert(
                'Sync Failed',
                'Some translations could not be synchronized. Please try again later.'
              );
            } finally {
              setSyncInProgress(false);
            }
          }
        }
      ]
    );
  };

  // Sync a single item
  const syncItem = async (item) => {
    if (!isConnected) {
      Alert.alert(
        'No Connection',
        'You need an internet connection to sync translations.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSyncInProgress(true);
    try {
      await OfflineService.syncItem(item.id);
      await loadQueueItems();
    } catch (error) {
      console.error('Error syncing item:', error);
      Alert.alert(
        'Sync Failed',
        'The translation could not be synchronized. Please try again later.'
      );
    } finally {
      setSyncInProgress(false);
    }
  };

  // Delete a queue item
  const deleteItem = (item) => {
    Alert.alert(
      'Delete Translation',
      'Are you sure you want to delete this offline translation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await OfflineService.removeQueueItem(item.id);
              await loadQueueItems();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete the translation.');
            }
          }
        }
      ]
    );
  };

  // Clear all queue items
  const clearQueue = () => {
    if (queueItems.length === 0) {
      Alert.alert('No Items', 'There are no items to clear.', [{ text: 'OK' }]);
      return;
    }

    Alert.alert(
      'Clear Queue',
      'Are you sure you want to delete all offline translations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await OfflineService.clearQueue();
              setQueueItems([]);
            } catch (error) {
              console.error('Error clearing queue:', error);
              Alert.alert('Error', 'Failed to clear the queue.');
            }
          }
        }
      ]
    );
  };

  // View a queue item
  const viewItem = (item) => {
    navigation.navigate('TranslationSession', {
      offlineItem: item,
      readOnly: true
    });
  };

  // Render queue item
  const renderQueueItem = ({ item }) => (
    <View style={styles.queueItem}>
      <TouchableOpacity
        style={styles.queueItemContent}
        onPress={() => viewItem(item)}
      >
        <View style={styles.queueItemHeader}>
          <Text style={styles.queueItemTitle}>
            {item.sourceLanguage} → {item.targetLanguage}
          </Text>
          <Text style={styles.queueItemTime}>
            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
          </Text>
        </View>
        <Text style={styles.queueItemText} numberOfLines={2}>
          {item.sourceText}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.queueItemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.syncButton]}
          onPress={() => syncItem(item)}
          disabled={syncInProgress || !isConnected}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={20}
            color={isConnected ? '#007AFF' : '#CCCCCC'}
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteItem(item)}
          disabled={syncInProgress}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offline Translations</Text>
        <View style={styles.headerButtons}>
          {queueItems.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={syncAllItems}
                disabled={syncInProgress || !isConnected}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={24}
                  color={isConnected ? '#007AFF' : '#CCCCCC'}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.headerButton}
                onPress={clearQueue}
                disabled={syncInProgress}
              >
                <Ionicons name="trash-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>
            You're offline. Connect to sync translations.
          </Text>
        </View>
      )}
      
      {syncInProgress && (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.syncBannerText}>
            Syncing translations...
          </Text>
        </View>
      )}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : queueItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-done-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>No offline translations</Text>
          <Text style={styles.emptySubtext}>
            Translations performed offline will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={queueItems}
          renderItem={renderQueueItem}
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  syncBannerText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
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
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  queueItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  queueItemContent: {
    flex: 1,
    padding: 16,
  },
  queueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  queueItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  queueItemTime: {
    fontSize: 12,
    color: '#999999',
  },
  queueItemText: {
    fontSize: 14,
    color: '#666666',
  },
  queueItemActions: {
    borderLeftWidth: 1,
    borderLeftColor: '#EEEEEE',
    justifyContent: 'center',
  },
  actionButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButton: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  deleteButton: {},
});

export default OfflineQueueScreen;
