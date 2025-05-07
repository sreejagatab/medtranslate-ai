/**
 * EnhancedNetworkStatusIndicator Component for MedTranslate AI
 *
 * This component provides a comprehensive view of network status, combining
 * network quality metrics with caching status and offline readiness information.
 * It offers real-time monitoring and detailed analytics for system health.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import networkQualityService from '../services/network-quality-service';

/**
 * EnhancedNetworkStatusIndicator component
 *
 * @param {Object} props - Component props
 * @param {Object} props.style - Custom styles
 * @param {Object} props.webSocketService - WebSocket service for network monitoring
 * @param {Object} props.cacheStats - Cache statistics
 * @param {number} props.offlineReadiness - Offline readiness percentage (0-100)
 * @param {number} props.offlineRisk - Risk of going offline (0-1)
 * @param {Function} props.onManualSync - Callback for manual sync
 * @param {Function} props.onPrepareOffline - Callback for preparing for offline mode
 * @returns {JSX.Element} EnhancedNetworkStatusIndicator component
 */
const EnhancedNetworkStatusIndicator = ({
  style = {},
  webSocketService = null,
  cacheStats = {},
  offlineReadiness = 0,
  offlineRisk = 0,
  onManualSync = () => {},
  onPrepareOffline = () => {}
}) => {
  // Network state
  const [networkQuality, setNetworkQuality] = useState('unknown');
  const [networkType, setNetworkType] = useState('unknown');
  const [metrics, setMetrics] = useState({
    latency: 0,
    jitter: 0,
    packetLoss: 0,
    throughput: 0
  });
  
  // UI state
  const [modalVisible, setModalVisible] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [activeTab, setActiveTab] = useState('network'); // 'network', 'cache', 'offline'
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Update network quality info
  useEffect(() => {
    // Initial values
    setNetworkQuality(networkQualityService.getNetworkQuality());
    setNetworkType(networkQualityService.getNetworkType());
    setMetrics(networkQualityService.getAverageMetrics());
    
    // Function to handle network quality changes
    const handleNetworkQualityChange = (event) => {
      if (event.type === 'networkQualityChange') {
        setNetworkQuality(event.newNetworkQuality);
        setMetrics(networkQualityService.getAverageMetrics());
      } else if (event.type === 'networkTypeChange') {
        setNetworkType(event.newNetworkType);
      }
    };
    
    // Add listener
    networkQualityService.addListener(handleNetworkQualityChange);
    
    // Trigger initial measurement
    handleMeasureNetworkQuality();
    
    return () => {
      // Remove listener
      networkQualityService.removeListener(handleNetworkQualityChange);
    };
  }, [webSocketService]);

  // Start animations when component mounts
  useEffect(() => {
    startPulseAnimation();
    startRotateAnimation();
  }, []);

  // Handle manual network quality measurement
  const handleMeasureNetworkQuality = async () => {
    setMeasuring(true);
    
    try {
      // Use WebSocket service's measurement if available
      if (webSocketService && webSocketService.measureNetworkQuality) {
        const measurement = await webSocketService.measureNetworkQuality();
        if (measurement) {
          setNetworkQuality(measurement.networkQuality);
          setMetrics(measurement.metrics);
        }
      } else {
        // Use network quality service directly
        const measurement = await networkQualityService.measureNetworkQuality();
        if (measurement) {
          setNetworkQuality(measurement.networkQuality);
          setMetrics(measurement.metrics);
        }
      }
    } catch (error) {
      console.error('Error measuring network quality:', error);
    } finally {
      setMeasuring(false);
    }
  };

  // Start pulse animation for indicators
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  };

  // Start rotation animation for sync icon
  const startRotateAnimation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  };

  // Convert rotation value to interpolated string
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Get color based on network quality
  const getQualityColor = () => {
    switch (networkQuality) {
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

  // Get icon based on network quality
  const getQualityIcon = () => {
    switch (networkQuality) {
      case 'excellent':
        return 'wifi';
      case 'good':
        return 'wifi';
      case 'fair':
        return 'wifi-outline';
      case 'poor':
        return 'wifi-outline';
      case 'bad':
        return 'warning';
      default:
        return 'help-circle';
    }
  };

  // Get offline readiness color
  const getOfflineReadinessColor = () => {
    if (offlineReadiness >= 80) return '#4CAF50'; // Green
    if (offlineReadiness >= 50) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Get offline risk color
  const getOfflineRiskColor = () => {
    if (offlineRisk >= 0.7) return '#F44336'; // Red
    if (offlineRisk >= 0.3) return '#FFC107'; // Yellow
    return '#4CAF50'; // Green
  };

  // Format throughput
  const formatThroughput = (kbps) => {
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${Math.round(kbps)} kbps`;
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${Math.round(value)}%`;
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '0';
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <View style={[styles.container, style.container]}>
      <TouchableOpacity
        style={[styles.indicator, { borderColor: getQualityColor() }, style.indicator]}
        onPress={() => setModalVisible(true)}
      >
        <Animated.View
          style={{
            transform: [{ scale: networkQuality === 'bad' ? pulseAnim : 1 }]
          }}
        >
          <Ionicons
            name={getQualityIcon()}
            size={16}
            color={getQualityColor()}
            style={styles.icon}
          />
        </Animated.View>
        <Text style={[styles.text, { color: getQualityColor() }, style.text]}>
          {networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)}
        </Text>

        {/* Offline Risk Indicator */}
        {offlineRisk > 0.5 && (
          <Animated.View
            style={[
              styles.offlineRiskIndicator,
              {
                backgroundColor: getOfflineRiskColor(),
                transform: [{ scale: pulseAnim }]
              }
            ]}
          />
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        {/* Modal content will be implemented in the next part */}
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Network Status</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'network' && styles.activeTab]}
                onPress={() => setActiveTab('network')}
              >
                <Ionicons
                  name="wifi"
                  size={18}
                  color={activeTab === 'network' ? '#2196F3' : '#666666'}
                />
                <Text style={[styles.tabText, activeTab === 'network' && styles.activeTabText]}>
                  Network
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'cache' && styles.activeTab]}
                onPress={() => setActiveTab('cache')}
              >
                <Ionicons
                  name="server"
                  size={18}
                  color={activeTab === 'cache' ? '#2196F3' : '#666666'}
                />
                <Text style={[styles.tabText, activeTab === 'cache' && styles.activeTabText]}>
                  Cache
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'offline' && styles.activeTab]}
                onPress={() => setActiveTab('offline')}
              >
                <Ionicons
                  name="cloud-offline"
                  size={18}
                  color={activeTab === 'offline' ? '#2196F3' : '#666666'}
                />
                <Text style={[styles.tabText, activeTab === 'offline' && styles.activeTabText]}>
                  Offline
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab content will be implemented in the next part */}
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
  offlineRiskIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    width: '100%',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    marginLeft: 5,
    color: '#666666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
});

EnhancedNetworkStatusIndicator.propTypes = {
  style: PropTypes.object,
  webSocketService: PropTypes.object,
  cacheStats: PropTypes.object,
  offlineReadiness: PropTypes.number,
  offlineRisk: PropTypes.number,
  onManualSync: PropTypes.func,
  onPrepareOffline: PropTypes.func,
};

export default EnhancedNetworkStatusIndicator;
