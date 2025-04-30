/**
 * Patient History Panel Component for MedTranslate AI Provider Dashboard
 * 
 * This component displays patient history, previous sessions, and allows
 * providers to add notes and context for future sessions.
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PatientHistoryPanel({ 
  patient, 
  sessions = [], 
  onViewSession,
  onAddNote,
  onUpdateMedicalContext
}) {
  // State
  const [notes, setNotes] = useState(patient?.notes || []);
  const [newNote, setNewNote] = useState('');
  const [isAddNoteModalVisible, setIsAddNoteModalVisible] = useState(false);
  const [selectedMedicalContext, setSelectedMedicalContext] = useState(patient?.medicalContext || 'general');
  const [isContextModalVisible, setIsContextModalVisible] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  // Medical contexts
  const medicalContexts = [
    { id: 'general', name: 'General' },
    { id: 'cardiology', name: 'Cardiology' },
    { id: 'neurology', name: 'Neurology' },
    { id: 'orthopedics', name: 'Orthopedics' },
    { id: 'pediatrics', name: 'Pediatrics' },
    { id: 'oncology', name: 'Oncology' },
    { id: 'emergency', name: 'Emergency' },
    { id: 'gastroenterology', name: 'Gastroenterology' },
    { id: 'dermatology', name: 'Dermatology' },
    { id: 'obstetrics', name: 'Obstetrics & Gynecology' }
  ];

  // Update notes when patient changes
  useEffect(() => {
    if (patient?.notes) {
      setNotes(patient.notes);
    }
    
    if (patient?.medicalContext) {
      setSelectedMedicalContext(patient.medicalContext);
    }
  }, [patient]);

  // Handle add note
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note = {
      id: Date.now().toString(),
      text: newNote.trim(),
      timestamp: new Date().toISOString(),
      provider: 'Current Provider' // This would be the actual provider name
    };
    
    const updatedNotes = [note, ...notes];
    setNotes(updatedNotes);
    onAddNote(note);
    setNewNote('');
    setIsAddNoteModalVisible(false);
  };

  // Handle update medical context
  const handleUpdateMedicalContext = (contextId) => {
    setSelectedMedicalContext(contextId);
    onUpdateMedicalContext(contextId);
    setIsContextModalVisible(false);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get context name
  const getContextName = (contextId) => {
    const context = medicalContexts.find(ctx => ctx.id === contextId);
    return context ? context.name : 'General';
  };

  // Render session item
  const renderSessionItem = ({ item }) => {
    const isExpanded = expandedSessionId === item.sessionId;
    
    return (
      <View style={styles.sessionItem}>
        <TouchableOpacity 
          style={styles.sessionHeader}
          onPress={() => setExpandedSessionId(isExpanded ? null : item.sessionId)}
        >
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionDate}>
              {formatDate(item.startTime)}
            </Text>
            <Text style={styles.sessionContext}>
              {getContextName(item.medicalContext)}
            </Text>
          </View>
          
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#757575" 
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.sessionDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>
                {item.duration || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Messages:</Text>
              <Text style={styles.detailValue}>
                {item.messageCount || 0}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Language:</Text>
              <Text style={styles.detailValue}>
                {item.patientLanguage || 'Unknown'}
              </Text>
            </View>
            
            {item.summary && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryLabel}>Summary:</Text>
                <Text style={styles.summaryText}>{item.summary}</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={() => onViewSession(item.sessionId)}
            >
              <Text style={styles.viewButtonText}>View Full Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Render note item
  const renderNoteItem = ({ item }) => (
    <View style={styles.noteItem}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteTimestamp}>
          {formatDate(item.timestamp)}
        </Text>
        <Text style={styles.noteProvider}>
          {item.provider}
        </Text>
      </View>
      
      <Text style={styles.noteText}>{item.text}</Text>
    </View>
  );

  // Render medical context item
  const renderContextItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.contextItem,
        selectedMedicalContext === item.id && styles.selectedContextItem
      ]}
      onPress={() => handleUpdateMedicalContext(item.id)}
    >
      <Text style={[
        styles.contextName,
        selectedMedicalContext === item.id && styles.selectedContextName
      ]}>
        {item.name}
      </Text>
      
      {selectedMedicalContext === item.id && (
        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patient History</Text>
      </View>
      
      {/* Patient info */}
      <View style={styles.patientInfo}>
        <View style={styles.patientHeader}>
          <View style={styles.patientNameContainer}>
            <Ionicons name="person" size={20} color="#0077CC" />
            <Text style={styles.patientName}>
              {patient?.name || 'Anonymous Patient'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.contextButton}
            onPress={() => setIsContextModalVisible(true)}
          >
            <Text style={styles.contextButtonText}>
              {getContextName(selectedMedicalContext)}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#0077CC" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.patientDetails}>
          {patient?.age && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age:</Text>
              <Text style={styles.detailValue}>{patient.age}</Text>
            </View>
          )}
          
          {patient?.gender && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gender:</Text>
              <Text style={styles.detailValue}>{patient.gender}</Text>
            </View>
          )}
          
          {patient?.language && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Language:</Text>
              <Text style={styles.detailValue}>{patient.language}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Sessions:</Text>
            <Text style={styles.detailValue}>{sessions.length}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Session:</Text>
            <Text style={styles.detailValue}>
              {sessions.length > 0 
                ? formatDate(sessions[0].startTime) 
                : 'No sessions yet'}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.tab, styles.activeTab]}
            onPress={() => {}}
          >
            <Text style={[styles.tabText, styles.activeTabText]}>Sessions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => {}}
          >
            <Text style={styles.tabText}>Notes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => {}}
          >
            <Text style={styles.tabText}>Documents</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {/* Sessions list */}
      <View style={styles.sessionsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Previous Sessions</Text>
          
          <Text style={styles.sessionCount}>
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </Text>
        </View>
        
        <FlatList
          data={sessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.sessionId}
          contentContainerStyle={styles.sessionsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No previous sessions</Text>
            </View>
          }
        />
      </View>
      
      {/* Notes section */}
      <View style={styles.notesContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Provider Notes</Text>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setIsAddNoteModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#0077CC" />
            <Text style={styles.addButtonText}>Add Note</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No notes yet</Text>
            </View>
          }
        />
      </View>
      
      {/* Add note modal */}
      <Modal
        visible={isAddNoteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAddNoteModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsAddNoteModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Note</Text>
              
              <TextInput
                style={styles.noteInput}
                placeholder="Enter your note here..."
                value={newNote}
                onChangeText={setNewNote}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsAddNoteModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddNote}
                >
                  <Text style={styles.saveButtonText}>Save Note</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Medical context modal */}
      <Modal
        visible={isContextModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsContextModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsContextModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Medical Context</Text>
              
              <FlatList
                data={medicalContexts}
                renderItem={renderContextItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.contextsList}
              />
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsContextModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  patientInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  patientNameContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 8
  },
  contextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16
  },
  contextButtonText: {
    fontSize: 14,
    color: '#0077CC',
    marginRight: 4
  },
  patientDetails: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
    width: 100
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500'
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTab: {
    borderBottomColor: '#0077CC'
  },
  tabText: {
    fontSize: 14,
    color: '#757575'
  },
  activeTabText: {
    color: '#0077CC',
    fontWeight: '500'
  },
  sessionsContainer: {
    flex: 1
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333'
  },
  sessionCount: {
    fontSize: 14,
    color: '#757575'
  },
  sessionsList: {
    padding: 16
  },
  sessionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden'
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12
  },
  sessionInfo: {
    flex: 1
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333'
  },
  sessionContext: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4
  },
  sessionDetails: {
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE'
  },
  summaryContainer: {
    marginTop: 8,
    marginBottom: 12
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4
  },
  summaryText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20
  },
  viewButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#E3F2FD'
  },
  viewButtonText: {
    fontSize: 14,
    color: '#0077CC'
  },
  notesContainer: {
    flex: 1
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  addButtonText: {
    fontSize: 14,
    color: '#0077CC',
    marginLeft: 4
  },
  notesList: {
    padding: 16
  },
  noteItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE'
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  noteTimestamp: {
    fontSize: 12,
    color: '#757575'
  },
  noteProvider: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0077CC'
  },
  noteText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 12,
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden'
  },
  modalContent: {
    padding: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16
  },
  noteInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    height: 120,
    marginBottom: 16
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8
  },
  cancelButton: {
    backgroundColor: '#F5F5F5'
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#757575'
  },
  saveButton: {
    backgroundColor: '#0077CC'
  },
  saveButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  contextsList: {
    maxHeight: 300
  },
  contextItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  selectedContextItem: {
    backgroundColor: '#0077CC'
  },
  contextName: {
    fontSize: 16,
    color: '#333333'
  },
  selectedContextName: {
    color: '#FFFFFF',
    fontWeight: '500'
  }
});
