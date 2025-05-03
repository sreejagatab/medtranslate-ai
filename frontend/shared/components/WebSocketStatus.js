/**
 * WebSocket Status Component for MedTranslate AI
 * 
 * This component displays the current WebSocket connection status
 * and provides a button to manually reconnect.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const WebSocketStatus = ({ 
  websocketService, 
  showReconnectButton = true,
  style = {},
  textStyle = {},
  iconSize = 16,
  showStatusText = true
}) => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnecting, setReconnecting] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  
  // Set up connection state handler
  useEffect(() => {
    const handleConnectionState = (state) => {
      setConnectionState(state);
      setReconnecting(state === 'reconnecting');
      
      // Pulse animation for reconnecting state
      if (state === 'reconnecting') {
        startPulseAnimation();
      } else {
        stopPulseAnimation();
      }
    };
    
    // Register handler
    websocketService.onConnectionState(handleConnectionState);
    
    // Get initial state
    setConnectionState(websocketService.getConnectionState());
    
    // Clean up
    return () => {
      websocketService.offConnectionState(handleConnectionState);
    };
  }, [websocketService]);
  
  // Pulse animation for reconnecting state
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        })
      ])
    ).start();
  };
  
  const stopPulseAnimation = () => {
    fadeAnim.stopAnimation();
    fadeAnim.setValue(1);
  };
  
  // Handle manual reconnect
  const handleReconnect = () => {
    if (websocketService.getConnectionState() !== 'connected') {
      // Get session info from websocketService
      const sessionId = websocketService.sessionId;
      const token = websocketService.token;
      
      if (sessionId && token) {
        websocketService.connect(sessionId, token);
      }
    }
  };
  
  // Get status color and icon
  const getStatusInfo = () => {
    switch (connectionState) {
      case 'connected':
        return {
          color: '#4CAF50', // Green
          icon: 'wifi',
          text: 'Connected'
        };
      case 'connecting':
        return {
          color: '#FFC107', // Amber
          icon: 'wifi-find',
          text: 'Connecting'
        };
      case 'reconnecting':
        return {
          color: '#FF9800', // Orange
          icon: 'wifi-find',
          text: 'Reconnecting'
        };
      case 'waiting_for_network':
        return {
          color: '#FF5722', // Deep Orange
          icon: 'wifi-off',
          text: 'Waiting for network'
        };
      case 'failed':
        return {
          color: '#F44336', // Red
          icon: 'wifi-off',
          text: 'Connection failed'
        };
      case 'error':
        return {
          color: '#F44336', // Red
          icon: 'error',
          text: 'Connection error'
        };
      case 'disconnected':
      default:
        return {
          color: '#9E9E9E', // Grey
          icon: 'wifi-off',
          text: 'Disconnected'
        };
    }
  };
  
  const statusInfo = getStatusInfo();
  
  return (
    <View style={[styles.container, style]}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <MaterialIcons 
          name={statusInfo.icon} 
          size={iconSize} 
          color={statusInfo.color} 
        />
      </Animated.View>
      
      {showStatusText && (
        <Text style={[styles.statusText, { color: statusInfo.color }, textStyle]}>
          {statusInfo.text}
        </Text>
      )}
      
      {showReconnectButton && connectionState !== 'connected' && !reconnecting && (
        <TouchableOpacity 
          style={styles.reconnectButton} 
          onPress={handleReconnect}
          disabled={reconnecting}
        >
          <Text style={styles.reconnectText}>Reconnect</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12
  },
  reconnectButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#2196F3',
    borderRadius: 4
  },
  reconnectText: {
    color: 'white',
    fontSize: 10
  }
});

export default WebSocketStatus;
