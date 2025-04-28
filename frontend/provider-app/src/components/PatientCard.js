/**
 * Patient Card Component for MedTranslate AI Provider Application
 * 
 * This component displays information about a patient
 * in a card format for the dashboard and patient list.
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PatientCard({ patient, onPress }) {
  // Format date from ISO string
  const formatDate = (isoString) => {
    if (!isoString) return '';
    
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };
  
  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };
  
  // Get random color based on patient ID
  const getAvatarColor = () => {
    const colors = [
      '#4CAF50', // Green
      '#2196F3', // Blue
      '#9C27B0', // Purple
      '#FF9800', // Orange
      '#F44336', // Red
      '#009688', // Teal
    ];
    
    // Use patient ID to select a consistent color
    const id = patient.patientId || '';
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View 
          style={[
            styles.avatar,
            { backgroundColor: getAvatarColor() }
          ]}
        >
          <Text style={styles.avatarText}>
            {getInitials(patient.name)}
          </Text>
        </View>
        
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>
            {patient.name || 'Anonymous Patient'}
          </Text>
          
          <View style={styles.languageContainer}>
            <Ionicons name="language-outline" size={14} color="#757575" />
            <Text style={styles.languageText}>
              {patient.preferredLanguage || 'Unknown'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Last Session</Text>
          <Text style={styles.detailValue}>
            {formatDate(patient.lastSessionDate)}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Sessions</Text>
          <Text style={styles.detailValue}>
            {patient.sessionCount || 0}
          </Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onPress}
        >
          <Ionicons name="document-text-outline" size={16} color="#0077CC" />
          <Text style={styles.actionText}>View History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onPress(true)}
        >
          <Ionicons name="add-circle-outline" size={16} color="#4CAF50" />
          <Text style={[styles.actionText, { color: '#4CAF50' }]}>New Session</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 16,
    marginRight: 16,
    marginBottom: 8,
    width: 280,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 4,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0077CC',
    marginLeft: 4,
  },
});
