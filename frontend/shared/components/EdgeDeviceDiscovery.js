/**
 * Edge Device Discovery Component for MedTranslate AI
 * 
 * This component provides a user interface for discovering and managing edge devices.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as EdgeDiscoveryService from '../services/enhanced-edge-discovery';
import * as AnalyticsService from '../services/analytics-service';
import * as AccessibilityUtils from '../utils/accessibility-utils';

const EdgeDeviceDiscovery = ({ onDeviceSelected, style = {} }) => {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [preferredDevice, setPreferredDevice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualIpAddress, setManualIpAddress] = useState('');
  const [manualPort, setManualPort] = useState('3000');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [discoveryStats, setDiscoveryStats] = useState(null);

  // Initialize on mount
  useEffect(() => {
    initializeDiscovery();
  }, []);

  // Initialize discovery service
  const initializeDiscovery = async () => {
    try {
      const result = await EdgeDiscoveryService.initialize();
      
      setIsInitialized(true);
      setDiscoveredDevices(result.discoveredDevices || []);
      setPreferredDevice(result.preferredDevice || null);
      
      // Get discovery stats
      const status = EdgeDiscoveryService.getDiscoveryStatus();
      setDiscoveryStats(status.stats);
      
      // Track initialization
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_discovery_ui',
        'initialize',
        {
          deviceCount: result.discoveredDevices?.length || 0,
          hasPreferred: !!result.preferredDevice
        }
      );
    } catch (error) {
      console.error('Error initializing discovery:', error);
      setIsInitialized(true);
    }
  };

  // Start discovery
  const startDiscovery = async () => {
    try {
      setIsDiscovering(true);
      
      // Track discovery start
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_discovery_ui',
        'start_discovery',
        {
          previousDevices: discoveredDevices.length
        }
      );
      
      const result = await EdgeDiscoveryService.discoverEdgeDevices();
      
      setDiscoveredDevices(result.discoveredDevices || []);
      setPreferredDevice(EdgeDiscoveryService.getPreferredDevice());
      
      // Get updated discovery stats
      const status = EdgeDiscoveryService.getDiscoveryStatus();
      setDiscoveryStats(status.stats);
      
      // Notify if no devices found
      if (!result.success) {
        Alert.alert(
          'No Edge Devices Found',
          'Could not find any edge devices on your network. Make sure your edge device is powered on and connected to the same network.',
          [
            { text: 'OK' },
            { 
              text: 'Add Manually', 
              onPress: () => setShowManualEntry(true) 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error discovering devices:', error);
      
      Alert.alert(
        'Discovery Error',
        `An error occurred during discovery: ${error.message}`
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  // Add manual device
  const addManualDevice = async () => {
    try {
      // Validate input
      if (!manualIpAddress) {
        Alert.alert('Error', 'Please enter an IP address');
        return;
      }
      
      setIsAddingManual(true);
      
      // Try to add device
      const result = await EdgeDiscoveryService.addManualDevice(
        manualIpAddress,
        parseInt(manualPort, 10) || 3000
      );
      
      if (result.success) {
        // Update state
        setDiscoveredDevices(EdgeDiscoveryService.getDiscoveredDevices());
        setPreferredDevice(EdgeDiscoveryService.getPreferredDevice());
        
        // Hide manual entry
        setShowManualEntry(false);
        setManualIpAddress('');
        setManualPort('3000');
        
        Alert.alert(
          'Device Added',
          `Successfully added edge device at ${result.device.ipAddress}:${result.device.port}`
        );
      } else {
        Alert.alert(
          'Error Adding Device',
          result.reason === 'invalid_device'
            ? 'Could not connect to a valid edge device at the specified address. Please check the IP address and port.'
            : `Error: ${result.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error('Error adding manual device:', error);
      
      Alert.alert(
        'Error',
        `Failed to add device: ${error.message}`
      );
    } finally {
      setIsAddingManual(false);
    }
  };

  // Select device
  const selectDevice = async (device) => {
    try {
      await EdgeDiscoveryService.setPreferredDevice(device);
      setPreferredDevice(device);
      
      // Notify parent
      if (onDeviceSelected) {
        onDeviceSelected(device);
      }
      
      // Close modal
      setModalVisible(false);
      
      // Track selection
      AnalyticsService.trackEvent(
        AnalyticsService.EVENT_TYPES.FEATURE_USAGE,
        'edge_discovery_ui',
        'select_device',
        {
          ipAddress: device.ipAddress,
          quality: device.quality
        }
      );
    } catch (error) {
      console.error('Error selecting device:', error);
      
      Alert.alert(
        'Error',
        `Failed to select device: ${error.message}`
      );
    }
  };

  // Remove device
  const removeDevice = async (device) => {
    try {
      Alert.alert(
        'Remove Device',
        `Are you sure you want to remove the edge device at ${device.ipAddress}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await EdgeDiscoveryService.removeDevice(device.ipAddress);
              setDiscoveredDevices(EdgeDiscoveryService.getDiscoveredDevices());
              setPreferredDevice(EdgeDiscoveryService.getPreferredDevice());
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error removing device:', error);
      
      Alert.alert(
        'Error',
        `Failed to remove device: ${error.message}`
      );
    }
  };

  // Format quality as percentage
  const formatQuality = (quality) => {
    return `${Math.round(quality * 100)}%`;
  };

  // Get quality color
  const getQualityColor = (quality) => {
    if (quality >= 0.8) return '#4CAF50'; // Green
    if (quality >= 0.5) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Render device item
  const renderDeviceItem = ({ item }) => {
    const isPreferred = preferredDevice && preferredDevice.ipAddress === item.ipAddress;
    
    return (
      <View style={styles.deviceItem}>
        <View style={styles.deviceInfo}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceName}>{item.name}</Text>
            {isPreferred && (
              <View style={styles.preferredBadge}>
                <Text style={styles.preferredText}>Preferred</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.deviceAddress}>{item.ipAddress}:{item.port}</Text>
          
          <View style={styles.deviceDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Quality:</Text>
              <Text 
                style={[
                  styles.detailValue, 
                  { color: getQualityColor(item.quality) }
                ]}
              >
                {formatQuality(item.quality)}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Response:</Text>
              <Text style={styles.detailValue}>{item.responseTime}ms</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Version:</Text>
              <Text style={styles.detailValue}>{item.version}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.deviceActions}>
          {!isPreferred && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => selectDevice(item)}
              {...AccessibilityUtils.getAccessibilityProps({
                label: `Select ${item.name} as preferred device`,
                role: 'button'
              })}
            >
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => removeDevice(item)}
            {...AccessibilityUtils.getAccessibilityProps({
              label: `Remove ${item.name}`,
              role: 'button'
            })}
          >
            <Ionicons name="trash" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render discovery button
  const renderDiscoveryButton = () => {
    return (
      <TouchableOpacity
        style={styles.discoveryButton}
        onPress={() => setModalVisible(true)}
        {...AccessibilityUtils.getAccessibilityProps({
          label: 'Discover Edge Devices',
          role: 'button'
        })}
      >
        <Ionicons name="wifi" size={20} color="#FFFFFF" />
        <Text style={styles.discoveryButtonText}>
          {preferredDevice 
            ? `Edge Device: ${preferredDevice.name}` 
            : 'Discover Edge Device'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render discovery modal
  const renderDiscoveryModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edge Device Discovery</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                {...AccessibilityUtils.getAccessibilityProps({
                  label: 'Close',
                  role: 'button'
                })}
              >
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.discoveryActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.primaryButton,
                  isDiscovering && styles.disabledButton
                ]}
                onPress={startDiscovery}
                disabled={isDiscovering}
                {...AccessibilityUtils.getAccessibilityProps({
                  label: 'Start Discovery',
                  role: 'button',
                  state: { disabled: isDiscovering }
                })}
              >
                {isDiscovering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Discover Devices</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => setShowManualEntry(!showManualEntry)}
                {...AccessibilityUtils.getAccessibilityProps({
                  label: showManualEntry ? 'Hide Manual Entry' : 'Add Manually',
                  role: 'button'
                })}
              >
                <Ionicons 
                  name={showManualEntry ? 'chevron-up' : 'add-circle'} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.actionButtonText}>
                  {showManualEntry ? 'Hide Manual Entry' : 'Add Manually'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {showManualEntry && (
              <View style={styles.manualEntryContainer}>
                <Text style={styles.sectionTitle}>Manual Device Entry</Text>
                
                <View style={styles.inputRow}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>IP Address</Text>
                    <TextInput
                      style={styles.textInput}
                      value={manualIpAddress}
                      onChangeText={setManualIpAddress}
                      placeholder="192.168.1.100"
                      keyboardType="numeric"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  
                  <View style={[styles.inputContainer, styles.portInput]}>
                    <Text style={styles.inputLabel}>Port</Text>
                    <TextInput
                      style={styles.textInput}
                      value={manualPort}
                      onChangeText={setManualPort}
                      placeholder="3000"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.primaryButton,
                    isAddingManual && styles.disabledButton
                  ]}
                  onPress={addManualDevice}
                  disabled={isAddingManual || !manualIpAddress}
                  {...AccessibilityUtils.getAccessibilityProps({
                    label: 'Add Device',
                    role: 'button',
                    state: { disabled: isAddingManual || !manualIpAddress }
                  })}
                >
                  {isAddingManual ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Add Device</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.devicesContainer}>
              <Text style={styles.sectionTitle}>
                Discovered Devices ({discoveredDevices.length})
              </Text>
              
              {discoveredDevices.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="wifi-outline" size={48} color="#CCCCCC" />
                  <Text style={styles.emptyStateText}>
                    {isDiscovering 
                      ? 'Searching for edge devices...' 
                      : 'No edge devices found'}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    {isDiscovering 
                      ? 'This may take a few moments'
                      : 'Tap "Discover Devices" to scan your network'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={discoveredDevices}
                  renderItem={renderDeviceItem}
                  keyExtractor={(item) => item.ipAddress}
                  style={styles.devicesList}
                  contentContainerStyle={styles.devicesListContent}
                />
              )}
            </View>
            
            {discoveryStats && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  Last discovery: {discoveryStats.lastDiscovery 
                    ? new Date(discoveryStats.lastDiscovery).toLocaleTimeString() 
                    : 'Never'}
                </Text>
                <Text style={styles.statsText}>
                  Success rate: {discoveryStats.totalDiscoveries > 0 
                    ? `${Math.round((discoveryStats.successfulDiscoveries / discoveryStats.totalDiscoveries) * 100)}%` 
                    : 'N/A'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Main render
  return (
    <View style={[styles.container, style]}>
      {renderDiscoveryButton()}
      {renderDiscoveryModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  discoveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0077CC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4
  },
  discoveryButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '500'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeButton: {
    padding: 4
  },
  discoveryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4
  },
  primaryButton: {
    backgroundColor: '#0077CC',
    flex: 1,
    marginRight: 8
  },
  secondaryButton: {
    backgroundColor: '#757575',
    flex: 1,
    marginLeft: 8
  },
  disabledButton: {
    opacity: 0.5
  },
  actionButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '500'
  },
  manualEntryContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  inputContainer: {
    flex: 1
  },
  portInput: {
    flex: 0.3,
    marginLeft: 8
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 4
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14
  },
  devicesContainer: {
    padding: 16,
    flex: 1
  },
  devicesList: {
    flex: 1
  },
  devicesListContent: {
    paddingBottom: 16
  },
  deviceItem: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8
  },
  deviceInfo: {
    flex: 1
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  preferredBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8
  },
  preferredText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold'
  },
  deviceAddress: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8
  },
  deviceDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  detailItem: {
    flexDirection: 'row',
    marginRight: 12,
    marginBottom: 4
  },
  detailLabel: {
    fontSize: 12,
    color: '#757575',
    marginRight: 4
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500'
  },
  deviceActions: {
    justifyContent: 'center'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center'
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center'
  },
  statsContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE'
  },
  statsText: {
    fontSize: 12,
    color: '#757575'
  }
});

export default EdgeDeviceDiscovery;
