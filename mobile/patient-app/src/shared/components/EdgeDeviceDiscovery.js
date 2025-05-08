/**
 * EdgeDeviceDiscovery Component for MedTranslate AI
 * 
 * This component provides a UI for discovering and connecting to edge devices
 * on the local network. It includes automatic discovery, manual IP entry,
 * and device health monitoring.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as EdgeDiscoveryService from '../services/enhanced-edge-discovery';

/**
 * EdgeDeviceDiscovery component
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onDeviceSelected - Callback when a device is selected
 * @param {Function} props.onCancel - Callback when discovery is cancelled
 * @param {boolean} props.autoConnect - Whether to automatically connect to the first discovered device
 * @returns {JSX.Element} EdgeDeviceDiscovery component
 */
const EdgeDeviceDiscovery = ({ onDeviceSelected, onCancel, autoConnect = false }) => {
  // State
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [manualIpAddress, setManualIpAddress] = useState('');
  const [manualPort, setManualPort] = useState('3002');
  const [error, setError] = useState(null);

  // Start discovery on mount
  useEffect(() => {
    startDiscovery();
    
    // Cleanup
    return () => {
      // No cleanup needed
    };
  }, []);

  // Start device discovery
  const startDiscovery = async () => {
    setIsDiscovering(true);
    setError(null);
    
    try {
      const devices = await EdgeDiscoveryService.discoverEdgeDevices();
      setDiscoveredDevices(devices);
      
      // Auto-connect if enabled and devices found
      if (autoConnect && devices.length > 0) {
        const onlineDevices = devices.filter(device => device.status === 'online');
        if (onlineDevices.length > 0) {
          handleDeviceSelect(onlineDevices[0]);
        }
      }
    } catch (error) {
      console.error('Error discovering edge devices:', error);
      setError('Failed to discover edge devices. Please try again or enter IP manually.');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Handle device selection
  const handleDeviceSelect = async (device) => {
    try {
      const result = await EdgeDiscoveryService.connectToEdgeDevice(device.id);
      if (result.success) {
        onDeviceSelected(result.device);
      } else {
        Alert.alert('Connection Failed', 'Failed to connect to the selected device.');
      }
    } catch (error) {
      console.error('Error connecting to edge device:', error);
      Alert.alert('Connection Error', error.message || 'An error occurred while connecting to the device.');
    }
  };

  // Handle manual IP connection
  const handleManualConnect = async () => {
    if (!manualIpAddress) {
      Alert.alert('Invalid IP', 'Please enter a valid IP address.');
      return;
    }
    
    try {
      const device = {
        id: `manual-${Date.now()}`,
        name: `Manual Device (${manualIpAddress})`,
        ipAddress: manualIpAddress,
        port: manualPort || '3002',
        status: 'unknown'
      };
      
      const result = await EdgeDiscoveryService.connectToEdgeDevice(device.id, {
        ipAddress: manualIpAddress,
        port: parseInt(manualPort || '3002', 10)
      });
      
      if (result.success) {
        onDeviceSelected(result.device);
      } else {
        Alert.alert('Connection Failed', 'Failed to connect to the specified IP address.');
      }
    } catch (error) {
      console.error('Error connecting to manual IP:', error);
      Alert.alert('Connection Error', error.message || 'An error occurred while connecting to the specified IP.');
    }
  };

  // Render device item
  const renderDeviceItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.deviceItem, item.status === 'online' ? styles.onlineDevice : styles.offlineDevice]}
      onPress={() => handleDeviceSelect(item)}
      disabled={item.status !== 'online'}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceIp}>{item.ipAddress}:{item.port || '3002'}</Text>
        <View style={styles.deviceStatus}>
          <View style={[styles.statusIndicator, { backgroundColor: item.status === 'online' ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>{item.status === 'online' ? 'Online' : 'Offline'}</Text>
        </View>
      </View>
      {item.status === 'online' && (
        <Ionicons name="chevron-forward" size={24} color="#666666" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Edge Devices</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="#666666" />
        </TouchableOpacity>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <View style={styles.discoveryContainer}>
        {isDiscovering ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Discovering devices...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.refreshButton} onPress={startDiscovery}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
            
            {discoveredDevices.length > 0 ? (
              <FlatList
                data={discoveredDevices}
                renderItem={renderDeviceItem}
                keyExtractor={(item) => item.id}
                style={styles.deviceList}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="wifi-outline" size={64} color="#CCCCCC" />
                <Text style={styles.emptyText}>No edge devices found</Text>
              </View>
            )}
          </>
        )}
      </View>
      
      <View style={styles.manualContainer}>
        <Text style={styles.sectionTitle}>Manual Connection</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.ipInput}
            placeholder="IP Address (e.g. 192.168.1.100)"
            value={manualIpAddress}
            onChangeText={setManualIpAddress}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.portInput}
            placeholder="Port"
            value={manualPort}
            onChangeText={setManualPort}
            keyboardType="numeric"
          />
        </View>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleManualConnect}
          disabled={!manualIpAddress}
        >
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 4,
  },
  errorText: {
    color: '#D32F2F',
  },
  discoveryContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666666',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  deviceList: {
    flex: 1,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  onlineDevice: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  offlineDevice: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    opacity: 0.7,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deviceIp: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666666',
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
  manualContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  ipInput: {
    flex: 3,
    height: 40,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  portInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    paddingHorizontal: 12,
  },
  connectButton: {
    backgroundColor: '#0066CC',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default EdgeDeviceDiscovery;
