/**
 * Patient Details Screen for MedTranslate AI Provider Application
 * 
 * This screen displays detailed patient information, history, and allows
 * providers to manage patient records.
 */

import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Text,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '../context/AuthContext';
import PatientHistoryPanel from '../components/PatientHistoryPanel';
import { API_ENDPOINTS, apiRequest } from '../config/api';

export default function PatientDetailsScreen({ navigation, route }) {
  const { patientId } = route.params;
  const { userToken } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [patient, setPatient] = useState(null);
  const [sessions, setSessions] = useState([]);
  
  // Load patient data
  const loadPatientData = async () => {
    try {
      setError(null);
      
      // Fetch patient details
      const patientResponse = await apiRequest(API_ENDPOINTS.PATIENTS.GET(patientId), {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      setPatient(patientResponse.patient || null);
      
      // Fetch patient sessions
      const sessionsResponse = await apiRequest(API_ENDPOINTS.PATIENTS.SESSIONS(patientId), {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      setSessions(sessionsResponse.sessions || []);
    } catch (error) {
      console.error('Patient data loading error:', error);
      setError(error.message || 'Failed to load patient data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadPatientData();
    }, [patientId, userToken])
  );
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadPatientData();
  };
  
  // View session
  const handleViewSession = (sessionId) => {
    navigation.navigate('Session', { sessionId });
  };
  
  // Add note
  const handleAddNote = async (note) => {
    try {
      await apiRequest(API_ENDPOINTS.PATIENTS.ADD_NOTE(patientId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note })
      });
      
      // Refresh patient data
      loadPatientData();
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note. Please try again.');
    }
  };
  
  // Update medical context
  const handleUpdateMedicalContext = async (context) => {
    try {
      await apiRequest(API_ENDPOINTS.PATIENTS.UPDATE(patientId), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ medicalContext: context })
      });
      
      // Refresh patient data
      loadPatientData();
    } catch (error) {
      console.error('Error updating medical context:', error);
      Alert.alert('Error', 'Failed to update medical context. Please try again.');
    }
  };
  
  // Create new session with this patient
  const handleCreateNewSession = () => {
    navigation.navigate('NewSession', { patientId });
  };
  
  // Show loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077CC" />
        <Text style={styles.loadingText}>Loading patient data...</Text>
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
        
        <Text style={styles.title}>Patient Details</Text>
        
        <TouchableOpacity
          style={styles.newSessionButton}
          onPress={handleCreateNewSession}
        >
          <Ionicons name="add-circle-outline" size={24} color="#0077CC" />
        </TouchableOpacity>
      </View>
      
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadPatientData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView style={styles.scrollView}>
        {/* Patient not found */}
        {!patient && !loading && !error && (
          <View style={styles.notFoundContainer}>
            <Ionicons name="person-outline" size={64} color="#CCCCCC" />
            <Text style={styles.notFoundText}>Patient not found</Text>
            <TouchableOpacity
              style={styles.backToListButton}
              onPress={() => navigation.navigate('Patients')}
            >
              <Text style={styles.backToListButtonText}>Back to Patients List</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Patient history panel */}
        {patient && (
          <PatientHistoryPanel
            patient={patient}
            sessions={sessions}
            onViewSession={handleViewSession}
            onAddNote={handleAddNote}
            onUpdateMedicalContext={handleUpdateMedicalContext}
          />
        )}
      </ScrollView>
      
      {/* Floating action button */}
      {patient && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateNewSession}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
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
  newSessionButton: {
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
  },
  scrollView: {
    flex: 1
  },
  notFoundContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8
  },
  notFoundText: {
    fontSize: 18,
    color: '#757575',
    marginTop: 16,
    marginBottom: 24
  },
  backToListButton: {
    backgroundColor: '#0077CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  backToListButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0077CC',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  }
});
