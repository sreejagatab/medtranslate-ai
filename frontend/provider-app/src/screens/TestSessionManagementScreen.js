/**
 * Test Screen for Session Management Panel
 * 
 * This screen is used to test the SessionManagementPanel component
 * with realistic data from the mock API.
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import SessionManagementPanel from '../components/SessionManagementPanel';
import mockApi from '../../shared/test-data/mock-api';

export default function TestSessionManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  
  // Load sessions data
  const loadSessionsData = async () => {
    try {
      setError(null);
      
      // Fetch sessions from mock API
      const response = await mockApi.getSessions();
      
      if (response.success) {
        setSessions(response.sessions);
      } else {
        setError(response.error || 'Failed to load sessions');
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Load data on mount
  useEffect(() => {
    loadSessionsData();
  }, []);
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadSessionsData();
  };
  
  // Handle join session
  const handleJoinSession = (sessionId) => {
    Alert.alert('Join Session', `Joining session ${sessionId}`);
    // In a real app, navigate to the session screen
    // navigation.navigate('Session', { sessionId });
  };
  
  // Handle end session
  const handleEndSession = async (sessionId) => {
    try {
      const response = await mockApi.endSession(sessionId);
      
      if (response.success) {
        // Refresh sessions list
        loadSessionsData();
        
        // Show success message
        Alert.alert('Success', 'Session ended successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to end session');
      }
    } catch (error) {
      console.error('Error ending session:', error);
      Alert.alert('Error', 'Failed to end session. Please try again.');
    }
  };
  
  // Handle export session
  const handleExportSession = async (sessionId) => {
    try {
      const response = await mockApi.exportSession(sessionId);
      
      if (response.success) {
        // Show success message
        Alert.alert(
          'Export Successful', 
          `Session transcript has been exported. Download URL: ${response.downloadUrl}`
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to export session');
      }
    } catch (error) {
      console.error('Error exporting session:', error);
      Alert.alert('Error', 'Failed to export session. Please try again.');
    }
  };
  
  // Show loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077CC" />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Test Session Management</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => Alert.alert('Test Info', 'This screen is used to test the SessionManagementPanel component with realistic data from the mock API.')}
        >
          <Ionicons name="information-circle" size={24} color="#0077CC" />
        </TouchableOpacity>
      </View>
      
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadSessionsData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Sessions management panel */}
      <SessionManagementPanel
        sessions={sessions}
        onJoinSession={handleJoinSession}
        onEndSession={handleEndSession}
        onExportSession={handleExportSession}
        onRefresh={handleRefresh}
        isLoading={refreshing}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  backButton: {
    padding: 8
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333'
  },
  infoButton: {
    padding: 8
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    margin: 16,
    padding: 12,
    borderRadius: 8
  },
  errorText: {
    color: '#F44336',
    marginLeft: 8,
    flex: 1
  },
  retryButton: {
    backgroundColor: '#F44336',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  }
});
