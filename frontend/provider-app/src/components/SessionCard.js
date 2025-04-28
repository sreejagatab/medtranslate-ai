/**
 * Session Card Component for MedTranslate AI Provider Application
 * 
 * This component displays information about a translation session
 * in a card format for the dashboard and sessions list.
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SessionCard({ session, onPress }) {
  // Format time from ISO string
  const formatTime = (isoString) => {
    if (!isoString) return '';
    
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#4CAF50'; // Green
      case 'waiting':
        return '#FFC107'; // Yellow
      case 'ended':
        return '#9E9E9E'; // Gray
      default:
        return '#9E9E9E';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return 'checkmark-circle';
      case 'waiting':
        return 'time';
      case 'ended':
        return 'checkmark-done-circle';
      default:
        return 'help-circle';
    }
  };
  
  // Calculate session duration
  const getDuration = () => {
    if (!session.startTime) return '0m';
    
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);
    
    return `${minutes}m`;
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View 
            style={[
              styles.statusIndicator, 
              { backgroundColor: getStatusColor(session.status) }
            ]} 
          />
          <Text style={styles.statusText}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Text>
        </View>
        
        <Text style={styles.timeText}>
          {formatTime(session.startTime)}
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.sessionId}>
          Session #{session.sessionCode || session.sessionId.substring(0, 6)}
        </Text>
        
        <Text style={styles.patientInfo}>
          {session.patientLanguage ? (
            `Patient Language: ${session.patientLanguage}`
          ) : (
            'Waiting for patient'
          )}
        </Text>
        
        <Text style={styles.contextText}>
          {session.medicalContext || 'General Medical'}
        </Text>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={16} color="#757575" />
          <Text style={styles.durationText}>{getDuration()}</Text>
        </View>
        
        <View style={styles.actionContainer}>
          <Ionicons 
            name={getStatusIcon(session.status)} 
            size={16} 
            color={getStatusColor(session.status)} 
          />
          <Text 
            style={[
              styles.actionText, 
              { color: getStatusColor(session.status) }
            ]}
          >
            {session.status === 'active' ? 'Join' : 
             session.status === 'waiting' ? 'Waiting' : 'View'}
          </Text>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#757575',
  },
  content: {
    marginBottom: 12,
  },
  sessionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  patientInfo: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 12,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
