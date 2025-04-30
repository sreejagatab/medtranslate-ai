/**
 * Test Screen for Patient History Panel
 * 
 * This screen is used to test the PatientHistoryPanel component
 * with realistic data from the mock API.
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import PatientHistoryPanel from '../components/PatientHistoryPanel';
import mockApi from '../../shared/test-data/mock-api';

export default function TestPatientHistoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [patient, setPatient] = useState(null);
  const [sessions, setSessions] = useState([]);
  
  // Load patient data
  const loadPatientData = async () => {
    try {
      setError(null);
      
      // Fetch patients from mock API
      const patientsResponse = await mockApi.getPatients();
      
      if (patientsResponse.success && patientsResponse.patients.length > 0) {
        // Get the first patient for testing
        const patientId = patientsResponse.patients[0].patientId;
        
        // Fetch patient details
        const patientResponse = await mockApi.getPatient(patientId);
        
        if (patientResponse.success) {
          setPatient(patientResponse.patient);
          
          // Fetch patient sessions
          const sessionsResponse = await mockApi.getPatientSessions(patientId);
          
          if (sessionsResponse.success) {
            setSessions(sessionsResponse.sessions);
          } else {
            setError(sessionsResponse.error || 'Failed to load patient sessions');
          }
        } else {
          setError(patientResponse.error || 'Failed to load patient details');
        }
      } else {
        setError(patientsResponse.error || 'No patients found');
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Load data on mount
  useEffect(() => {
    loadPatientData();
  }, []);
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadPatientData();
  };
  
  // Handle view session
  const handleViewSession = (sessionId) => {
    Alert.alert('View Session', `Viewing session ${sessionId}`);
    // In a real app, navigate to the session screen
    // navigation.navigate('Session', { sessionId });
  };
  
  // Handle add note
  const handleAddNote = async (note) => {
    try {
      if (!patient) return;
      
      const response = await mockApi.addPatientNote(patient.patientId, note);
      
      if (response.success) {
        // Refresh patient data
        loadPatientData();
        
        // Show success message
        Alert.alert('Success', 'Note added successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to add note');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note. Please try again.');
    }
  };
  
  // Handle update medical context
  const handleUpdateMedicalContext = async (context) => {
    try {
      if (!patient) return;
      
      const response = await mockApi.updatePatientContext(patient.patientId, context);
      
      if (response.success) {
        // Refresh patient data
        loadPatientData();
        
        // Show success message
        Alert.alert('Success', 'Medical context updated successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to update medical context');
      }
    } catch (error) {
      console.error('Error updating medical context:', error);
      Alert.alert('Error', 'Failed to update medical context. Please try again.');
    }
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
        
        <Text style={styles.title}>Test Patient History</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => Alert.alert('Test Info', 'This screen is used to test the PatientHistoryPanel component with realistic data from the mock API.')}
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
              style={styles.refreshButton}
              onPress={loadPatientData}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
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
      
      {/* Refresh button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleRefresh}
        disabled={refreshing}
      >
        {refreshing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        )}
      </TouchableOpacity>
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
  refreshButton: {
    backgroundColor: '#0077CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  refreshButtonText: {
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
