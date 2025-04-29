/**
 * ConnectionStatus Component for MedTranslate AI Provider Application
 * 
 * This component displays the current connection status (online/offline)
 * and the active endpoint (edge/cloud).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * ConnectionStatus component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether the device is connected to the network
 * @param {string} props.activeEndpoint - The active endpoint (edge/cloud)
 * @param {Object} props.style - Custom styles
 * @returns {JSX.Element} ConnectionStatus component
 */
const ConnectionStatus = ({ isConnected, activeEndpoint, style = {} }) => {
  // Determine if using edge device
  const isEdgeDevice = activeEndpoint && activeEndpoint.includes('192.168') || 
                      activeEndpoint && !activeEndpoint.includes('api.medtranslate.ai');
  
  // Get status color
  const getStatusColor = () => {
    if (!isConnected) return '#F44336'; // Red for offline
    return '#4CAF50'; // Green for online
  };
  
  // Get status text
  const getStatusText = () => {
    if (!isConnected) return 'Offline';
    if (isEdgeDevice) return 'Edge';
    return 'Cloud';
  };
  
  // Get status icon
  const getStatusIcon = () => {
    if (!isConnected) return 'cloud-offline';
    if (isEdgeDevice) return 'hardware-chip';
    return 'cloud-done';
  };
  
  return (
    <View style={[styles.container, style.container]}>
      <View style={[
        styles.indicator,
        { backgroundColor: getStatusColor() },
        style.indicator
      ]} />
      <Text style={[styles.text, style.text]}>
        {getStatusText()}
      </Text>
      <Ionicons 
        name={getStatusIcon()} 
        size={16} 
        color={getStatusColor()} 
        style={styles.icon}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  icon: {
    marginLeft: 2,
  },
});

ConnectionStatus.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  activeEndpoint: PropTypes.string,
  style: PropTypes.object,
};

export default ConnectionStatus;
