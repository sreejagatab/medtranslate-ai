/**
 * Edge Device Screen for MedTranslate AI Patient App
 * 
 * This screen allows users to discover and manage edge devices.
 */

import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EdgeConnectionContext } from '../contexts/EdgeConnectionContext';
import { ConnectionContext } from '../contexts/ConnectionContext';
import EdgeDeviceDiscovery from '../../shared/components/EdgeDeviceDiscovery';
import * as AccessibilityUtils from '../../shared/utils/accessibility-utils';

const EdgeDeviceScreen = ({ navigation }) => {
  // Contexts
  const edgeConnection = useContext(EdgeConnectionContext);
  const connection = useContext(ConnectionContext);
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if we're on WiFi
  const isWifi = connection.connectionType === 'wifi';
  
  // Handle device selection
  const handleDeviceSelected = (device) => {
    Alert.alert(
      'Edge Device Selected',
      `Successfully connected to edge device: ${device.name}`,
      [{ text: 'OK' }]
    );
  };
  
  // Render
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Edge Device Connection</Text>
          <Text style={styles.subtitle}>
            Connect to a local edge device for improved performance and offline capabilities
          </Text>
        </View>
        
        {/* Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Connection Status</Text>
            <View style={[
              styles.statusIndicator,
              edgeConnection.isEdgeDevice ? styles.statusConnected : styles.statusDisconnected
            ]}>
              <Text style={styles.statusIndicatorText}>
                {edgeConnection.isEdgeDevice ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusDetails}>
            {edgeConnection.isEdgeDevice ? (
              <>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Device:</Text>
                  <Text style={styles.statusValue}>
                    {edgeConnection.preferredDevice?.name || 'Edge Device'}
                  </Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>IP Address:</Text>
                  <Text style={styles.statusValue}>
                    {edgeConnection.preferredDevice?.ipAddress || 'Unknown'}
                  </Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Last Sync:</Text>
                  <Text style={styles.statusValue}>
                    {edgeConnection.lastSyncTime 
                      ? new Date(edgeConnection.lastSyncTime).toLocaleTimeString() 
                      : 'Never'}
                  </Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Offline Queue:</Text>
                  <Text style={styles.statusValue}>
                    {edgeConnection.offlineQueueSize} items
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.statusMessage}>
                {isWifi 
                  ? 'No edge device connected. Use the discovery tool below to find and connect to an edge device on your network.'
                  : 'You need to be connected to WiFi to discover edge devices.'}
              </Text>
            )}
          </View>
        </View>
        
        {/* Network Status */}
        <View style={styles.networkCard}>
          <View style={styles.networkHeader}>
            <Text style={styles.networkTitle}>Network Status</Text>
            <View style={[
              styles.networkIndicator,
              connection.isConnected ? styles.networkConnected : styles.networkDisconnected
            ]}>
              <Text style={styles.networkIndicatorText}>
                {connection.isConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          
          <View style={styles.networkDetails}>
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>Connection Type:</Text>
              <Text style={styles.networkValue}>
                {connection.connectionType}
              </Text>
            </View>
            
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>Internet Reachable:</Text>
              <Text style={styles.networkValue}>
                {connection.isInternetReachable ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Edge Device Discovery */}
        <View style={styles.discoveryCard}>
          <Text style={styles.discoveryTitle}>Edge Device Discovery</Text>
          
          {!isWifi ? (
            <View style={styles.wifiWarning}>
              <Ionicons name="wifi-outline" size={24} color="#FFC107" />
              <Text style={styles.wifiWarningText}>
                Connect to WiFi to discover edge devices
              </Text>
            </View>
          ) : (
            <EdgeDeviceDiscovery 
              onDeviceSelected={handleDeviceSelected}
              style={styles.discoveryTool}
            />
          )}
        </View>
        
        {/* Offline Models */}
        <View style={styles.modelsCard}>
          <Text style={styles.modelsTitle}>Offline Models</Text>
          
          {Object.keys(edgeConnection.availableModels).length === 0 ? (
            <Text style={styles.modelsMessage}>
              No offline models available. Connect to an edge device to download models.
            </Text>
          ) : (
            <View style={styles.modelsList}>
              {Object.entries(edgeConnection.availableModels).map(([key, model]) => (
                <View key={key} style={styles.modelItem}>
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelName}>{model.name}</Text>
                    <Text style={styles.modelLanguages}>
                      {model.sourceLanguage} → {model.targetLanguage}
                    </Text>
                  </View>
                  <View style={styles.modelSize}>
                    <Text style={styles.modelSizeText}>{model.size} MB</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          <TouchableOpacity
            style={[
              styles.actionButton,
              (!edgeConnection.isEdgeDevice || isLoading) && styles.disabledButton
            ]}
            onPress={() => {
              // This would open a model download screen
              Alert.alert(
                'Download Models',
                'This would navigate to a model download screen',
                [{ text: 'OK' }]
              );
            }}
            disabled={!edgeConnection.isEdgeDevice || isLoading}
            {...AccessibilityUtils.getAccessibilityProps({
              label: 'Download Offline Models',
              role: 'button',
              state: { disabled: !edgeConnection.isEdgeDevice || isLoading }
            })}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-download" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Download Models</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.secondaryButton,
              (!edgeConnection.isEdgeDevice || isLoading) && styles.disabledButton
            ]}
            onPress={async () => {
              try {
                setIsLoading(true);
                const result = await edgeConnection.syncOfflineData();
                
                if (result) {
                  Alert.alert(
                    'Sync Complete',
                    'Successfully synchronized data with edge device',
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Sync Failed',
                    'Failed to synchronize data with edge device',
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                Alert.alert(
                  'Sync Error',
                  `Error synchronizing data: ${error.message}`,
                  [{ text: 'OK' }]
                );
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={!edgeConnection.isEdgeDevice || isLoading}
            {...AccessibilityUtils.getAccessibilityProps({
              label: 'Sync Data',
              role: 'button',
              state: { disabled: !edgeConnection.isEdgeDevice || isLoading }
            })}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sync" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Sync Data</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  scrollContent: {
    padding: 16
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#757575'
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusConnected: {
    backgroundColor: '#4CAF50'
  },
  statusDisconnected: {
    backgroundColor: '#F44336'
  },
  statusIndicatorText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12
  },
  statusDetails: {
    marginBottom: 8
  },
  statusItem: {
    flexDirection: 'row',
    marginBottom: 8
  },
  statusLabel: {
    width: 100,
    fontWeight: 'bold'
  },
  statusValue: {
    flex: 1
  },
  statusMessage: {
    color: '#757575',
    fontSize: 14,
    lineHeight: 20
  },
  networkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  networkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  networkTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  networkIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  networkConnected: {
    backgroundColor: '#4CAF50'
  },
  networkDisconnected: {
    backgroundColor: '#F44336'
  },
  networkIndicatorText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12
  },
  networkDetails: {
    marginBottom: 8
  },
  networkItem: {
    flexDirection: 'row',
    marginBottom: 8
  },
  networkLabel: {
    width: 150,
    fontWeight: 'bold'
  },
  networkValue: {
    flex: 1
  },
  discoveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  discoveryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  discoveryTool: {
    marginTop: 8
  },
  wifiWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 4,
    marginTop: 8
  },
  wifiWarningText: {
    marginLeft: 8,
    color: '#F57C00',
    flex: 1
  },
  modelsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  modelsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  modelsMessage: {
    color: '#757575',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16
  },
  modelsList: {
    marginBottom: 16
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  modelInfo: {
    flex: 1
  },
  modelName: {
    fontWeight: 'bold',
    fontSize: 14
  },
  modelLanguages: {
    color: '#757575',
    fontSize: 12
  },
  modelSize: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  modelSizeText: {
    fontSize: 12
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0077CC',
    paddingVertical: 12,
    borderRadius: 4
  },
  secondaryButton: {
    backgroundColor: '#757575'
  },
  disabledButton: {
    opacity: 0.5
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8
  }
});

export default EdgeDeviceScreen;
