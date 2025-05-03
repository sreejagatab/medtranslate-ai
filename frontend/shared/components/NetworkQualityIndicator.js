import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import networkQualityService from '../services/network-quality-service';

/**
 * NetworkQualityIndicator component displays the current network quality
 * and provides detailed information when clicked.
 */
const NetworkQualityIndicator = ({ style = {}, webSocketService = null }) => {
  const [networkQuality, setNetworkQuality] = useState('unknown');
  const [networkType, setNetworkType] = useState('unknown');
  const [metrics, setMetrics] = useState({
    latency: 0,
    jitter: 0,
    packetLoss: 0,
    throughput: 0
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [adaptiveInfo, setAdaptiveInfo] = useState(null);

  // Update network quality info
  useEffect(() => {
    // Initial values
    setNetworkQuality(networkQualityService.getNetworkQuality());
    setNetworkType(networkQualityService.getNetworkType());
    setMetrics(networkQualityService.getAverageMetrics());
    
    // Get adaptive info if WebSocket service is provided
    if (webSocketService) {
      setAdaptiveInfo(webSocketService.getNetworkQualityInfo());
    }
    
    // Function to handle network quality changes
    const handleNetworkQualityChange = (event) => {
      if (event.type === 'networkQualityChange') {
        setNetworkQuality(event.newNetworkQuality);
        setMetrics(networkQualityService.getAverageMetrics());
        
        // Update adaptive info if WebSocket service is provided
        if (webSocketService) {
          setAdaptiveInfo(webSocketService.getNetworkQualityInfo());
        }
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

  // Get user-friendly network type
  const getNetworkTypeText = () => {
    switch (networkType) {
      case 'wifi':
        return 'Wi-Fi';
      case 'cellular':
        return 'Cellular';
      case '4g':
        return '4G';
      case '3g':
        return '3G';
      case '2g':
        return '2G';
      case 'slow-2g':
        return 'Slow 2G';
      case 'ethernet':
        return 'Ethernet';
      case 'bluetooth':
        return 'Bluetooth';
      case 'wimax':
        return 'WiMAX';
      case 'none':
        return 'No Connection';
      default:
        return networkType || 'Unknown';
    }
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
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <View style={[styles.container, style.container]}>
      <TouchableOpacity 
        style={[styles.indicator, { borderColor: getQualityColor() }, style.indicator]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons 
          name={getQualityIcon()} 
          size={16} 
          color={getQualityColor()} 
          style={styles.icon} 
        />
        <Text style={[styles.text, { color: getQualityColor() }, style.text]}>
          {networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)}
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
            <Text style={styles.modalTitle}>Network Quality</Text>
            
            <View style={styles.qualitySummary}>
              <Ionicons 
                name={getQualityIcon()} 
                size={40} 
                color={getQualityColor()} 
              />
              <Text style={[styles.qualitySummaryText, { color: getQualityColor() }]}>
                {networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)}
              </Text>
              <Text style={styles.networkTypeText}>
                {getNetworkTypeText()}
              </Text>
            </View>
            
            <Text style={styles.sectionTitle}>Network Metrics</Text>
            <View style={styles.metricsContainer}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Latency:</Text>
                <Text style={styles.metricValue}>{Math.round(metrics.latency)} ms</Text>
              </View>
              
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Jitter:</Text>
                <Text style={styles.metricValue}>{Math.round(metrics.jitter)} ms</Text>
              </View>
              
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Packet Loss:</Text>
                <Text style={styles.metricValue}>{formatPercentage(metrics.packetLoss)}</Text>
              </View>
              
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Throughput:</Text>
                <Text style={styles.metricValue}>{formatThroughput(metrics.throughput)}</Text>
              </View>
            </View>
            
            {adaptiveInfo && (
              <>
                <Text style={styles.sectionTitle}>Adaptive WebSocket Settings</Text>
                <View style={styles.adaptiveContainer}>
                  <View style={styles.adaptiveItem}>
                    <Text style={styles.adaptiveLabel}>Adaptive Reconnection:</Text>
                    <Text style={styles.adaptiveValue}>
                      {adaptiveInfo.adaptiveReconnection ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                  
                  <View style={styles.adaptiveItem}>
                    <Text style={styles.adaptiveLabel}>Adaptive Heartbeat:</Text>
                    <Text style={styles.adaptiveValue}>
                      {adaptiveInfo.adaptiveHeartbeat ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                  
                  <View style={styles.adaptiveItem}>
                    <Text style={styles.adaptiveLabel}>Max Reconnect Attempts:</Text>
                    <Text style={styles.adaptiveValue}>
                      {adaptiveInfo.reconnectionStrategy.maxReconnectAttempts}
                    </Text>
                  </View>
                  
                  <View style={styles.adaptiveItem}>
                    <Text style={styles.adaptiveLabel}>Initial Reconnect Delay:</Text>
                    <Text style={styles.adaptiveValue}>
                      {adaptiveInfo.reconnectionStrategy.initialReconnectDelay} ms
                    </Text>
                  </View>
                  
                  <View style={styles.adaptiveItem}>
                    <Text style={styles.adaptiveLabel}>Max Reconnect Delay:</Text>
                    <Text style={styles.adaptiveValue}>
                      {adaptiveInfo.reconnectionStrategy.maxReconnectDelay} ms
                    </Text>
                  </View>
                  
                  <View style={styles.adaptiveItem}>
                    <Text style={styles.adaptiveLabel}>Heartbeat Interval:</Text>
                    <Text style={styles.adaptiveValue}>
                      {adaptiveInfo.reconnectionStrategy.heartbeatInterval} ms
                    </Text>
                  </View>
                </View>
              </>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.measureButton}
                onPress={handleMeasureNetworkQuality}
                disabled={measuring}
              >
                <Ionicons name="refresh" size={16} color="white" />
                <Text style={styles.buttonText}>
                  {measuring ? 'Measuring...' : 'Measure Now'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
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
  qualitySummary: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qualitySummaryText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  networkTypeText: {
    fontSize: 14,
    marginTop: 5,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 5,
  },
  metricsContainer: {
    width: '100%',
    marginBottom: 15,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  metricLabel: {
    fontWeight: 'bold',
  },
  metricValue: {
    textAlign: 'right',
  },
  adaptiveContainer: {
    width: '100%',
    marginBottom: 15,
  },
  adaptiveItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  adaptiveLabel: {
    fontWeight: 'bold',
  },
  adaptiveValue: {
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  measureButton: {
    backgroundColor: '#2196F3',
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
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

NetworkQualityIndicator.propTypes = {
  style: PropTypes.object,
  webSocketService: PropTypes.object,
};

export default NetworkQualityIndicator;
