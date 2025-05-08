/**
 * useEdgeConnection Hook for MedTranslate AI Mobile App
 * 
 * This hook provides functions for connecting to and interacting with edge devices.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/config';
import * as EdgeService from '../services/edge';

const useEdgeConnection = () => {
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Load connected device on mount
  useEffect(() => {
    const loadConnectedDevice = async () => {
      try {
        const deviceJson = await AsyncStorage.getItem(STORAGE_KEYS.CONNECTED_EDGE_DEVICE);
        if (deviceJson) {
          const device = JSON.parse(deviceJson);
          setConnectedDevice(device);
          
          // Get device status
          const status = await EdgeService.getEdgeDeviceStatus(device);
          if (status.success) {
            setDeviceStatus(status.status);
          }
        }
      } catch (error) {
        console.error('Error loading connected device:', error);
      }
    };
    
    loadConnectedDevice();
  }, []);

  // Connect to a device
  const connectToDevice = useCallback(async (device) => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      const result = await EdgeService.connectToEdgeDevice(device);
      
      if (result.success) {
        setConnectedDevice(result.device);
        
        // Get device status
        const status = await EdgeService.getEdgeDeviceStatus(result.device);
        if (status.success) {
          setDeviceStatus(status.status);
        }
        
        return result.device;
      } else {
        throw new Error(result.error || 'Failed to connect to device');
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
      setConnectionError(error.message);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect from a device
  const disconnectFromDevice = useCallback(async (device) => {
    try {
      const result = await EdgeService.disconnectFromEdgeDevice(device);
      
      if (result.success) {
        setConnectedDevice(null);
        setDeviceStatus(null);
        return true;
      } else {
        throw new Error(result.error || 'Failed to disconnect from device');
      }
    } catch (error) {
      console.error('Error disconnecting from device:', error);
      throw error;
    }
  }, []);

  // Translate text using the connected device
  const translateWithDevice = useCallback(async (text, sourceLanguage, targetLanguage) => {
    try {
      if (!connectedDevice) {
        throw new Error('No device connected');
      }
      
      setIsTranslating(true);
      
      const result = await EdgeService.translateWithEdgeDevice(
        text,
        sourceLanguage,
        targetLanguage,
        connectedDevice
      );
      
      return result;
    } catch (error) {
      console.error('Error translating with device:', error);
      throw error;
    } finally {
      setIsTranslating(false);
    }
  }, [connectedDevice]);

  // Refresh device status
  const refreshDeviceStatus = useCallback(async () => {
    try {
      if (!connectedDevice) {
        return null;
      }
      
      const status = await EdgeService.getEdgeDeviceStatus(connectedDevice);
      
      if (status.success) {
        setDeviceStatus(status.status);
        return status.status;
      } else {
        throw new Error(status.error || 'Failed to get device status');
      }
    } catch (error) {
      console.error('Error refreshing device status:', error);
      throw error;
    }
  }, [connectedDevice]);

  // Sync models with the connected device
  const syncModels = useCallback(async () => {
    try {
      if (!connectedDevice) {
        throw new Error('No device connected');
      }
      
      const result = await EdgeService.syncModelsWithEdgeDevice(connectedDevice);
      
      if (result.success) {
        // Refresh device status after sync
        await refreshDeviceStatus();
        return result.syncedModels;
      } else {
        throw new Error(result.error || 'Failed to sync models');
      }
    } catch (error) {
      console.error('Error syncing models:', error);
      throw error;
    }
  }, [connectedDevice, refreshDeviceStatus]);

  // Update the connected device
  const updateDevice = useCallback(async () => {
    try {
      if (!connectedDevice) {
        throw new Error('No device connected');
      }
      
      const result = await EdgeService.updateEdgeDevice(connectedDevice);
      
      if (result.success) {
        // Refresh device status after update
        await refreshDeviceStatus();
        return result;
      } else {
        throw new Error(result.error || 'Failed to update device');
      }
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  }, [connectedDevice, refreshDeviceStatus]);

  return {
    connectedDevice,
    isConnecting,
    connectionError,
    deviceStatus,
    isTranslating,
    connectToDevice,
    disconnectFromDevice,
    translateWithDevice,
    refreshDeviceStatus,
    syncModels,
    updateDevice
  };
};

export default useEdgeConnection;
