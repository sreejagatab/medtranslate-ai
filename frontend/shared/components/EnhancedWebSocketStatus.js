import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import connectionAnalytics from '../services/connection-analytics';

/**
 * EnhancedWebSocketStatus component displays the current WebSocket connection status
 * and provides detailed connection analytics when clicked.
 */
const EnhancedWebSocketStatus = ({ style = {}, simplified = false }) => {
  const [status, setStatus] = useState('unknown');
  const [quality, setQuality] = useState('unknown');
  const [stats, setStats] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  // Update status every 5 seconds
  useEffect(() => {
    const updateStatus = () => {
      const currentStats = connectionAnalytics.getStats();
      const qualityStatus = connectionAnalytics.getConnectionQualityStatus();
      const connectionRecommendations = connectionAnalytics.getConnectionRecommendations();
      
      setStats(currentStats);
      setQuality(qualityStatus);
      setRecommendations(connectionRecommendations);
    };
    
    // Function to handle WebSocket state changes
    const handleConnectionState = (event) => {
      if (event && event.detail && event.detail.state) {
        setStatus(event.detail.state);
      }
    };
    
    // Add event listener
    window.addEventListener('websocket-state', handleConnectionState);
    
    // Initial update
    updateStatus();
    
    // Set up interval
    const interval = setInterval(updateStatus, 5000);
    
    return () => {
      // Clean up
      clearInterval(interval);
      window.removeEventListener('websocket-state', handleConnectionState);
    };
  }, []);

  // Get user-friendly status text
  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
        return 'Connection Failed';
      case 'error':
        return 'Connection Error';
      case 'waiting_for_network':
        return 'Waiting for Network';
      default:
        return 'Unknown';
    }
  };

  // Get user-friendly quality text
  const getQualityText = () => {
    switch (quality) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      case 'bad':
        return 'Bad';
      default:
        return 'Unknown';
    }
  };

  // Get color based on quality
  const getQualityColor = () => {
    switch (quality) {
      case 'excellent':
        return '#4CAF50'; // Green
      case 'good':
        return '#8BC34A'; // Light Green
      case 'fair':
        return '#FFC107'; // Amber
      case 'poor':
        return '#FF9800'; // Orange
      case 'bad':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };

  // Get color based on connection status
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#4CAF50'; // Green
      case 'connecting':
        return '#FFC107'; // Amber
      case 'reconnecting':
        return '#FF9800'; // Orange
      case 'disconnected':
      case 'failed':
      case 'error':
        return '#F44336'; // Red
      case 'waiting_for_network':
        return '#2196F3'; // Blue
      default:
        return '#9E9E9E'; // Grey
    }
  };

  // Get icon based on connection status
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return 'checkmark-circle';
      case 'connecting':
        return 'sync';
      case 'reconnecting':
        return 'refresh';
      case 'disconnected':
        return 'close-circle';
      case 'failed':
        return 'alert-circle';
      case 'error':
        return 'warning';
      case 'waiting_for_network':
        return 'wifi';
      default:
        return 'help-circle';
    }
  };

  // Get user-friendly recommendations
  const getUserFriendlyRecommendations = () => {
    if (simplified) {
      const userFriendly = [];
      
      for (const rec of recommendations) {
        if (rec.includes('High latency')) {
          userFriendly.push('Your connection is slow. Try moving closer to your Wi-Fi router.');
        } else if (rec.includes('Frequent reconnections')) {
          userFriendly.push('Your connection is unstable. Try switching to a different network.');
        } else if (rec.includes('High error rate')) {
          userFriendly.push('There are issues with the connection. Try restarting the app.');
        } else if (rec.includes('Low connection success')) {
          userFriendly.push('Having trouble connecting. Please check your internet connection.');
        } else if (rec.includes('Message delivery issues')) {
          userFriendly.push('Messages may not be delivering properly. Try sending shorter messages.');
        } else if (rec.includes('Connection quality is good')) {
          userFriendly.push('Your connection is working well!');
        } else {
          userFriendly.push(rec);
        }
      }
      
      return userFriendly;
    }
    
    return recommendations;
  };

  return (
    <View style={[styles.container, style.container]}>
      <TouchableOpacity 
        style={[styles.statusIndicator, { borderColor: getStatusColor() }, style.statusIndicator]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name={getStatusIcon()} size={16} color={getStatusColor()} style={styles.icon} />
        <Text style={[styles.statusText, { color: getStatusColor() }, style.statusText]}>
          {getStatusText()}
        </Text>
        <View style={[styles.qualityIndicator, { backgroundColor: getQualityColor() }, style.qualityIndicator]} />
      </TouchableOpacity>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {simplified ? 'Connection Status' : 'WebSocket Connection Analytics'}
            </Text>
            
            {simplified ? (
              <View style={styles.statusSummary}>
                <Ionicons name={getStatusIcon()} size={40} color={getStatusColor()} />
                <Text style={[styles.statusSummaryText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
                <Text style={[styles.qualitySummaryText, { color: getQualityColor() }]}>
                  Connection Quality: {getQualityText()}
                </Text>
              </View>
            ) : (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Status:</Text>
                  <Text style={[styles.statValue, { color: getStatusColor() }]}>{getStatusText()}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Quality:</Text>
                  <Text style={[styles.statValue, { color: getQualityColor() }]}>{getQualityText()}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Quality Score:</Text>
                  <Text style={styles.statValue}>{stats.qualityScore || 0}/100</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Latency:</Text>
                  <Text style={styles.statValue}>{Math.round(stats.averageLatency || 0)} ms</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Success Rate:</Text>
                  <Text style={styles.statValue}>{stats.connectionSuccessRate || 0}%</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Connections:</Text>
                  <Text style={styles.statValue}>{stats.totalConnections || 0}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Reconnections:</Text>
                  <Text style={styles.statValue}>{stats.totalReconnections || 0}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Messages:</Text>
                  <Text style={styles.statValue}>{stats.totalMessages || 0}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Errors:</Text>
                  <Text style={styles.statValue}>{stats.totalErrors || 0}</Text>
                </View>
              </View>
            )}
            
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <ScrollView style={styles.recommendationsContainer}>
              {getUserFriendlyRecommendations().map((recommendation, index) => (
                <Text key={index} style={styles.recommendation}>• {recommendation}</Text>
              ))}
            </ScrollView>
            
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
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  icon: {
    marginRight: 2,
  },
  qualityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 5,
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
  statusSummary: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusSummaryText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  qualitySummaryText: {
    fontSize: 14,
    marginTop: 5,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 5,
  },
  recommendationsContainer: {
    width: '100%',
    maxHeight: 150,
  },
  recommendation: {
    marginBottom: 5,
    fontSize: 14,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

EnhancedWebSocketStatus.propTypes = {
  style: PropTypes.object,
  simplified: PropTypes.bool,
};

export default EnhancedWebSocketStatus;
