import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * OfflineQueueStatus component displays the current offline queue status
 * and provides detailed information when clicked.
 */
const OfflineQueueStatus = ({ webSocketService, style = {} }) => {
  const [stats, setStats] = useState({
    initialized: false,
    totalMessages: 0,
    sessionMessages: 0
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Update stats every 10 seconds
  useEffect(() => {
    const updateStats = async () => {
      if (webSocketService) {
        const queueStats = await webSocketService.getOfflineQueueStats();
        setStats(queueStats);
        setRefreshing(false);
      }
    };
    
    // Initial update
    updateStats();
    
    // Set up interval
    const interval = setInterval(updateStats, 10000);
    
    return () => {
      clearInterval(interval);
    };
  }, [webSocketService]);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    if (webSocketService) {
      const queueStats = await webSocketService.getOfflineQueueStats();
      setStats(queueStats);
      setRefreshing(false);
    }
  };

  // Clear queue
  const handleClearQueue = async () => {
    if (webSocketService && webSocketService.sessionId) {
      try {
        await webSocketService.disconnect(1000, 'User requested queue clear', true);
        await handleRefresh();
        setModalVisible(false);
      } catch (error) {
        console.error('Error clearing queue:', error);
      }
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Format file size
  const formatSize = (bytes) => {
    if (bytes === 0 || !bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get color based on queue size
  const getQueueColor = () => {
    const count = stats.sessionMessages || 0;
    
    if (count === 0) {
      return '#4CAF50'; // Green
    } else if (count < 10) {
      return '#FFC107'; // Amber
    } else if (count < 50) {
      return '#FF9800'; // Orange
    } else {
      return '#F44336'; // Red
    }
  };

  return (
    <View style={[styles.container, style.container]}>
      <TouchableOpacity 
        style={[styles.indicator, { borderColor: getQueueColor() }, style.indicator]}
        onPress={() => setModalVisible(true)}
        disabled={!stats.initialized}
      >
        <Ionicons 
          name={stats.sessionMessages > 0 ? 'cloud-upload' : 'cloud-done'} 
          size={16} 
          color={getQueueColor()} 
          style={styles.icon} 
        />
        <Text style={[styles.text, { color: getQueueColor() }, style.text]}>
          {stats.sessionMessages > 0 
            ? `${stats.sessionMessages} queued` 
            : 'No queued messages'}
        </Text>
      </TouchableOpacity>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Offline Message Queue</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Status:</Text>
                <Text style={styles.statValue}>
                  {stats.initialized ? 'Initialized' : 'Not Initialized'}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Current Session:</Text>
                <Text style={styles.statValue}>
                  {stats.currentSessionId || 'None'}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Session Messages:</Text>
                <Text style={[styles.statValue, { color: getQueueColor() }]}>
                  {stats.sessionMessages || 0}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Messages:</Text>
                <Text style={styles.statValue}>
                  {stats.totalMessages || 0}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Size:</Text>
                <Text style={styles.statValue}>
                  {formatSize(stats.totalSize || 0)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Oldest Message:</Text>
                <Text style={styles.statValue}>
                  {formatTimestamp(stats.oldestMessage)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Newest Message:</Text>
                <Text style={styles.statValue}>
                  {formatTimestamp(stats.newestMessage)}
                </Text>
              </View>
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={refreshing}
              >
                <Ionicons name="refresh" size={16} color="white" />
                <Text style={styles.buttonText}>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearQueue}
                disabled={!stats.sessionMessages || stats.sessionMessages === 0}
              >
                <Ionicons name="trash" size={16} color="white" />
                <Text style={styles.buttonText}>Clear Queue</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 8,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
  },
  text: {
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  icon: {
    marginRight: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsContainer: {
    width: '100%',
    marginBottom: 15,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  statLabel: {
    fontWeight: 'bold',
  },
  statValue: {
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  closeButton: {
    backgroundColor: '#9E9E9E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

OfflineQueueStatus.propTypes = {
  webSocketService: PropTypes.object.isRequired,
  style: PropTypes.object,
};

export default OfflineQueueStatus;
