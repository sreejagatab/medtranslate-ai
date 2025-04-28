/**
 * New Session Screen for MedTranslate AI Provider Application
 * 
 * This screen allows providers to create a new translation session
 * and configure its settings.
 */

import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { AuthContext } from '../context/AuthContext';

// Medical context options
const MEDICAL_CONTEXTS = [
  { label: 'General Medical', value: 'general' },
  { label: 'Cardiology', value: 'cardiology' },
  { label: 'Dermatology', value: 'dermatology' },
  { label: 'Gastroenterology', value: 'gastroenterology' },
  { label: 'Neurology', value: 'neurology' },
  { label: 'Obstetrics & Gynecology', value: 'obgyn' },
  { label: 'Oncology', value: 'oncology' },
  { label: 'Orthopedics', value: 'orthopedics' },
  { label: 'Pediatrics', value: 'pediatrics' },
  { label: 'Psychiatry', value: 'psychiatry' },
  { label: 'Pulmonology', value: 'pulmonology' },
  { label: 'Urology', value: 'urology' }
];

export default function NewSessionScreen({ navigation }) {
  const { userToken, providerInfo } = useContext(AuthContext);
  
  const [patientName, setPatientName] = useState('');
  const [medicalContext, setMedicalContext] = useState('general');
  const [notes, setNotes] = useState('');
  const [recordSession, setRecordSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Create new session
  const createSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call API to create session
      const response = await fetch('https://api.medtranslate.ai/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          patientName: patientName.trim() || undefined,
          medicalContext,
          notes: notes.trim() || undefined,
          recordSession
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create session');
      }
      
      // Navigate to session screen
      navigation.replace('Session', { 
        sessionId: data.sessionId,
        sessionCode: data.sessionCode
      });
    } catch (error) {
      console.error('Session creation error:', error);
      setError(error.message || 'Failed to create session. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Confirm session creation
  const confirmCreateSession = () => {
    Alert.alert(
      'Create New Session',
      'Are you ready to start a new translation session?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Create',
          onPress: createSession
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333333" />
          </TouchableOpacity>
          
          <Text style={styles.title}>New Translation Session</Text>
        </View>
        
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.formContainer}>
          {/* Provider Info */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Provider Information</Text>
            
            <View style={styles.infoField}>
              <Text style={styles.infoLabel}>Provider Name</Text>
              <Text style={styles.infoValue}>{providerInfo?.name || 'Provider'}</Text>
            </View>
            
            <View style={styles.infoField}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{providerInfo?.role || 'Healthcare Provider'}</Text>
            </View>
          </View>
          
          {/* Patient Info */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Patient Information</Text>
            
            <Text style={styles.inputLabel}>Patient Name (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#757575" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter patient name"
                value={patientName}
                onChangeText={setPatientName}
                editable={!loading}
              />
            </View>
          </View>
          
          {/* Session Settings */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Session Settings</Text>
            
            <Text style={styles.inputLabel}>Medical Context</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={medicalContext}
                onValueChange={(value) => setMedicalContext(value)}
                enabled={!loading}
                style={styles.picker}
              >
                {MEDICAL_CONTEXTS.map(context => (
                  <Picker.Item 
                    key={context.value} 
                    label={context.label} 
                    value={context.value} 
                  />
                ))}
              </Picker>
            </View>
            
            <Text style={styles.inputLabel}>Session Notes (Optional)</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Enter any notes about this session"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                editable={!loading}
              />
            </View>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Record Session</Text>
              <Switch
                value={recordSession}
                onValueChange={setRecordSession}
                disabled={loading}
                trackColor={{ false: '#BDBDBD', true: '#BBDEFB' }}
                thumbColor={recordSession ? '#0077CC' : '#F5F5F5'}
              />
            </View>
            
            <Text style={styles.switchDescription}>
              Recording the session allows you to review the conversation later and helps improve translation quality.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={confirmCreateSession}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.createButtonText}>Create Session</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    margin: 20,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#F44336',
    marginLeft: 8,
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  infoField: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333333',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  textAreaContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 16,
    padding: 8,
  },
  textArea: {
    height: 100,
    fontSize: 16,
    color: '#333333',
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  switchDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  cancelButton: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 8,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
  },
  createButton: {
    flex: 2,
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0077CC',
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#BBDEFB',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
});
