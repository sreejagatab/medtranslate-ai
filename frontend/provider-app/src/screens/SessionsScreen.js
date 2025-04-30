/**
 * Sessions Screen for MedTranslate AI Provider Application
 * 
 * This screen displays all sessions with filtering, sorting, and management options.
 */

import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Text,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '../context/AuthContext';
import SessionManagementPanel from '../components/SessionManagementPanel';
import { API_ENDPOINTS, apiRequest } from '../config/api';

export default function SessionsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  
  // Load sessions data
  const loadSessionsData = async () => {
    try {
      setError(null);
      
      // Fetch all sessions
      const response = await apiRequest(API_ENDPOINTS.SESSIONS.LIST, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      setSessions(response.sessions || []);
    } catch (error) {
      console.error('Sessions data loading error:', error);
      setError(error.message || 'Failed to load sessions data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadSessionsData();
    }, [userToken])
  );
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadSessionsData();
  };
  
  // Join session
  const handleJoinSession = (sessionId) => {
    navigation.navigate('Session', { sessionId });
  };
  
  // End session
  const handleEndSession = async (sessionId) => {
    try {
      await apiRequest(API_ENDPOINTS.SESSIONS.END(sessionId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      // Refresh sessions list
      loadSessionsData();
      
      // Show success message
      Alert.alert('Success', 'Session ended successfully');
    } catch (error) {
      console.error('Error ending session:', error);
      Alert.alert('Error', 'Failed to end session. Please try again.');
    }
  };
  
  // Export session
  const handleExportSession = async (sessionId) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.SESSIONS.EXPORT(sessionId), {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      // Show success message
      Alert.alert(
        'Export Successful', 
        'Session transcript has been exported and is available in your downloads folder.'
      );
    } catch (error) {
      console.error('Error exporting session:', error);
      Alert.alert('Error', 'Failed to export session. Please try again.');
    }
  };
  
  // Create new session
  const handleCreateNewSession = () => {
    navigation.navigate('NewSession');
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
        
        <Text style={styles.title}>All Sessions</Text>
        
        <TouchableOpacity
          style={styles.newButton}
          onPress={handleCreateNewSession}
        >
          <Ionicons name="add" size={24} color="#0077CC" />
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
  newButton: {
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
