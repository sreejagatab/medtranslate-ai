/**
 * Session Management Panel Component for MedTranslate AI Provider Dashboard
 *
 * This component provides a comprehensive interface for managing translation sessions,
 * including filtering, sorting, and performing actions on sessions.
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
  Alert,
  DatePickerIOS
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

// Session status colors
const STATUS_COLORS = {
  active: '#4CAF50',
  pending: '#FFC107',
  completed: '#2196F3',
  cancelled: '#F44336'
};

export default function SessionManagementPanel({
  sessions = [],
  onJoinSession,
  onEndSession,
  onExportSession,
  onRefresh,
  isLoading = false
}) {
  // State
  const [filteredSessions, setFilteredSessions] = useState(sessions);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'status', 'language'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'pending', 'completed', 'cancelled'
  const [selectedSession, setSelectedSession] = useState(null);
  const [isActionsModalVisible, setIsActionsModalVisible] = useState(false);
  const [isDateFilterModalVisible, setIsDateFilterModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf'); // 'pdf', 'csv', 'txt'
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);

  // Update filtered sessions when sessions change
  useEffect(() => {
    applyFiltersAndSort();
  }, [sessions, searchQuery, sortBy, sortOrder, filterStatus, startDate, endDate, isDateFilterActive]);

  // Apply filters and sorting
  const applyFiltersAndSort = () => {
    let filtered = [...sessions];

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(session => session.status === filterStatus);
    }

    // Apply date filter
    if (isDateFilterActive && startDate && endDate) {
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();

      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.startTime).getTime();
        return sessionDate >= startTimestamp && sessionDate <= endTimestamp;
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session =>
        (session.patientName && session.patientName.toLowerCase().includes(query)) ||
        (session.sessionCode && session.sessionCode.toLowerCase().includes(query)) ||
        (session.medicalContext && session.medicalContext.toLowerCase().includes(query)) ||
        (session.patientLanguage && session.patientLanguage.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.startTime) - new Date(b.startTime);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'language':
          comparison = a.patientLanguage.localeCompare(b.patientLanguage);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredSessions(filtered);
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Set sort by and toggle order if already selected
  const handleSortBy = (value) => {
    if (sortBy === value) {
      toggleSortOrder();
    } else {
      setSortBy(value);
      setSortOrder('desc');
    }
  };

  // Handle session actions
  const handleSessionAction = (action) => {
    if (!selectedSession) return;

    switch (action) {
      case 'join':
        onJoinSession(selectedSession.sessionId);
        setIsActionsModalVisible(false);
        setSelectedSession(null);
        break;
      case 'end':
        Alert.alert(
          'End Session',
          'Are you sure you want to end this session?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'End Session',
              style: 'destructive',
              onPress: () => {
                onEndSession(selectedSession.sessionId);
                setIsActionsModalVisible(false);
                setSelectedSession(null);
              }
            }
          ]
        );
        break;
      case 'export':
        // Show export options modal
        setIsExportModalVisible(true);
        break;
      default:
        setIsActionsModalVisible(false);
        setSelectedSession(null);
        break;
    }
  };

  // Handle export with options
  const handleExportWithOptions = () => {
    if (!selectedSession) return;

    // Call the export function with options
    onExportSession(selectedSession.sessionId, {
      format: exportFormat,
      includeMetadata,
      includeSummary
    });

    // Close modals
    setIsExportModalVisible(false);
    setIsActionsModalVisible(false);
    setSelectedSession(null);

    // Show success message
    Alert.alert(
      'Export Started',
      `Your session transcript is being exported as ${exportFormat.toUpperCase()}. It will be available in your downloads shortly.`
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    return (
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] || '#757575' }]}>
        <Text style={styles.statusText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
      </View>
    );
  };

  // Render session item
  const renderSessionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.sessionItem}
      onPress={() => {
        setSelectedSession(item);
        setIsActionsModalVisible(true);
      }}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Session ${item.sessionCode} with ${item.patientName || 'Anonymous Patient'}, ${item.status} session in ${item.patientLanguage || 'Unknown Language'}`}
      accessibilityHint="Tap to view session actions"
      accessibilityState={{
        selected: selectedSession && selectedSession.sessionId === item.sessionId,
        disabled: false
      }}
    >
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionId}>Session #{item.sessionCode}</Text>
        {getStatusBadge(item.status)}
      </View>

      <View style={styles.sessionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color="#757575" />
          <Text style={styles.detailText}>
            {item.patientName || 'Anonymous Patient'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="globe" size={16} color="#757575" />
          <Text style={styles.detailText}>
            {item.patientLanguage || 'Unknown Language'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="medical" size={16} color="#757575" />
          <Text style={styles.detailText}>
            {item.medicalContext || 'General'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#757575" />
          <Text style={styles.detailText}>
            {formatDate(item.startTime)}
          </Text>
        </View>
      </View>

      <View style={styles.sessionActions}>
        {item.status === 'active' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.joinButton]}
            onPress={() => onJoinSession(item.sessionId)}
          >
            <Ionicons name="enter" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Join</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => {
            setSelectedSession(item);
            setIsActionsModalVisible(true);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#757575" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Session Management</Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Refresh sessions"
          accessibilityHint="Refreshes the list of sessions"
        >
          <Ionicons name="refresh" size={20} color="#0077CC" />
        </TouchableOpacity>
      </View>

      {/* Search and filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#757575" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sessions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessible={true}
            accessibilityLabel="Search sessions"
            accessibilityHint="Enter text to search for sessions by patient name, session code, or language"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#757575" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'all' && styles.activeFilter]}
            onPress={() => setFilterStatus('all')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Show all sessions"
            accessibilityState={{ selected: filterStatus === 'all' }}
          >
            <Text style={[styles.filterText, filterStatus === 'all' && styles.activeFilterText]}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'active' && styles.activeFilter]}
            onPress={() => setFilterStatus('active')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Show active sessions only"
            accessibilityState={{ selected: filterStatus === 'active' }}
          >
            <Text style={[styles.filterText, filterStatus === 'active' && styles.activeFilterText]}>Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'completed' && styles.activeFilter]}
            onPress={() => setFilterStatus('completed')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Show completed sessions only"
            accessibilityState={{ selected: filterStatus === 'completed' }}
          >
            <Text style={[styles.filterText, filterStatus === 'completed' && styles.activeFilterText]}>Completed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, isDateFilterActive && styles.activeFilter]}
            onPress={() => setIsDateFilterModalVisible(true)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Filter by date range"
            accessibilityState={{ selected: isDateFilterActive }}
            accessibilityHint="Opens a dialog to select start and end dates for filtering"
          >
            <Ionicons name="calendar" size={14} color={isDateFilterActive ? "#0077CC" : "#757575"} style={{marginRight: 4}} />
            <Text style={[styles.filterText, isDateFilterActive && styles.activeFilterText]}>Date Range</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sortButtons}>
          <Text style={styles.sortLabel}>Sort by:</Text>

          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'date' && styles.activeSortButton]}
            onPress={() => handleSortBy('date')}
          >
            <Text style={styles.sortButtonText}>Date</Text>
            {sortBy === 'date' && (
              <Ionicons
                name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                size={16}
                color="#0077CC"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'status' && styles.activeSortButton]}
            onPress={() => handleSortBy('status')}
          >
            <Text style={styles.sortButtonText}>Status</Text>
            {sortBy === 'status' && (
              <Ionicons
                name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                size={16}
                color="#0077CC"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'language' && styles.activeSortButton]}
            onPress={() => handleSortBy('language')}
          >
            <Text style={styles.sortButtonText}>Language</Text>
            {sortBy === 'language' && (
              <Ionicons
                name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                size={16}
                color="#0077CC"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Sessions list */}
      <FlatList
        data={filteredSessions}
        renderItem={renderSessionItem}
        keyExtractor={(item) => item.sessionId}
        contentContainerStyle={styles.sessionsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar" size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>
              {searchQuery || filterStatus !== 'all'
                ? 'No sessions match your filters'
                : 'No sessions available'}
            </Text>
            {(searchQuery || filterStatus !== 'all') && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Session actions modal */}
      <Modal
        visible={isActionsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsActionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsActionsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Session Actions</Text>

              {selectedSession && (
                <Text style={styles.modalSubtitle}>
                  Session #{selectedSession.sessionCode}
                </Text>
              )}

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleSessionAction('join')}
              >
                <Ionicons name="enter" size={20} color="#0077CC" />
                <Text style={styles.modalButtonText}>Join Session</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleSessionAction('end')}
              >
                <Ionicons name="close-circle" size={20} color="#F44336" />
                <Text style={[styles.modalButtonText, { color: '#F44336' }]}>End Session</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleSessionAction('export')}
              >
                <Ionicons name="download" size={20} color="#4CAF50" />
                <Text style={[styles.modalButtonText, { color: '#4CAF50' }]}>Export Transcript</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsActionsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date filter modal */}
      <Modal
        visible={isDateFilterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDateFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsDateFilterModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Filter by Date Range</Text>

              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerLabel}>Start Date:</Text>
                <DatePickerIOS
                  date={startDate || new Date()}
                  onDateChange={setStartDate}
                  mode="date"
                  style={styles.datePicker}
                />
              </View>

              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerLabel}>End Date:</Text>
                <DatePickerIOS
                  date={endDate || new Date()}
                  onDateChange={setEndDate}
                  mode="date"
                  minimumDate={startDate}
                  style={styles.datePicker}
                />
              </View>

              <View style={styles.dateFilterActions}>
                <TouchableOpacity
                  style={styles.dateFilterButton}
                  onPress={() => {
                    setIsDateFilterActive(false);
                    setStartDate(null);
                    setEndDate(null);
                    setIsDateFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.dateFilterButtonText}>Clear Filter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateFilterButton, styles.applyFilterButton]}
                  onPress={() => {
                    if (startDate && endDate) {
                      setIsDateFilterActive(true);
                      setIsDateFilterModalVisible(false);
                    } else {
                      Alert.alert('Invalid Date Range', 'Please select both start and end dates.');
                    }
                  }}
                >
                  <Text style={styles.applyFilterButtonText}>Apply Filter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Export options modal */}
      <Modal
        visible={isExportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsExportModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsExportModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Export Options</Text>

              <Text style={styles.exportSectionTitle}>Format</Text>
              <View style={styles.exportFormatOptions}>
                <TouchableOpacity
                  style={[styles.exportFormatOption, exportFormat === 'pdf' && styles.selectedExportFormat]}
                  onPress={() => setExportFormat('pdf')}
                >
                  <Ionicons
                    name={exportFormat === 'pdf' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={exportFormat === 'pdf' ? '#0077CC' : '#757575'}
                  />
                  <Text style={styles.exportFormatText}>PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportFormatOption, exportFormat === 'csv' && styles.selectedExportFormat]}
                  onPress={() => setExportFormat('csv')}
                >
                  <Ionicons
                    name={exportFormat === 'csv' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={exportFormat === 'csv' ? '#0077CC' : '#757575'}
                  />
                  <Text style={styles.exportFormatText}>CSV</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportFormatOption, exportFormat === 'txt' && styles.selectedExportFormat]}
                  onPress={() => setExportFormat('txt')}
                >
                  <Ionicons
                    name={exportFormat === 'txt' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={exportFormat === 'txt' ? '#0077CC' : '#757575'}
                  />
                  <Text style={styles.exportFormatText}>Text</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.exportSectionTitle}>Include</Text>
              <View style={styles.exportOptions}>
                <TouchableOpacity
                  style={styles.exportOption}
                  onPress={() => setIncludeMetadata(!includeMetadata)}
                >
                  <Ionicons
                    name={includeMetadata ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={includeMetadata ? '#0077CC' : '#757575'}
                  />
                  <Text style={styles.exportOptionText}>Session Metadata</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportOption}
                  onPress={() => setIncludeSummary(!includeSummary)}
                >
                  <Ionicons
                    name={includeSummary ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={includeSummary ? '#0077CC' : '#757575'}
                  />
                  <Text style={styles.exportOptionText}>Session Summary</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.exportActions}>
                <TouchableOpacity
                  style={styles.exportCancelButton}
                  onPress={() => setIsExportModalVisible(false)}
                >
                  <Text style={styles.exportCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportConfirmButton}
                  onPress={handleExportWithOptions}
                >
                  <Text style={styles.exportConfirmButtonText}>Export</Text>
                </TouchableOpacity>
              </View>
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
  // Date filter styles
  datePickerContainer: {
    marginBottom: 16
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8
  },
  datePicker: {
    height: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 8
  },
  dateFilterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
  },
  dateFilterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: '#F5F5F5'
  },
  applyFilterButton: {
    backgroundColor: '#0077CC'
  },
  dateFilterButtonText: {
    fontSize: 16,
    color: '#757575',
    fontWeight: '500'
  },
  applyFilterButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  // Export options styles
  exportSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8
  },
  exportFormatOptions: {
    flexDirection: 'row',
    marginBottom: 16
  },
  exportFormatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4
  },
  selectedExportFormat: {
    backgroundColor: '#E3F2FD'
  },
  exportFormatText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 8
  },
  exportOptions: {
    marginBottom: 16
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  exportOptionText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 8
  },
  exportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16
  },
  exportCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8
  },
  exportCancelButtonText: {
    fontSize: 16,
    color: '#757575'
  },
  exportConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 4
  },
  exportConfirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  refreshButton: {
    padding: 8
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8
  },
  filterButtons: {
    flexDirection: 'row',
    marginBottom: 12
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginRight: 8
  },
  activeFilter: {
    backgroundColor: '#E3F2FD'
  },
  filterText: {
    fontSize: 14,
    color: '#757575'
  },
  activeFilterText: {
    color: '#0077CC',
    fontWeight: '500'
  },
  sortButtons: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sortLabel: {
    fontSize: 14,
    color: '#757575',
    marginRight: 8
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginRight: 8
  },
  activeSortButton: {
    backgroundColor: '#E3F2FD'
  },
  sortButtonText: {
    fontSize: 14,
    color: '#757575',
    marginRight: 4
  },
  sessionsList: {
    padding: 16
  },
  sessionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE'
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sessionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333'
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  sessionDetails: {
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  detailText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8
  },
  sessionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8
  },
  joinButton: {
    backgroundColor: '#0077CC'
  },
  actionButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 4
  },
  moreButton: {
    padding: 8,
    marginLeft: 8
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
  clearFiltersButton: {
    marginTop: 12,
    padding: 8
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#0077CC',
    fontWeight: '500'
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
    marginBottom: 4
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  modalButtonText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12
  },
  cancelButton: {
    justifyContent: 'center',
    borderBottomWidth: 0,
    marginTop: 8
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center'
  }
});
