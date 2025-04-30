/**
 * Dashboard Screen for MedTranslate AI Provider Application
 *
 * This screen displays the provider's dashboard with active sessions,
 * recent patients, and quick actions.
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '../context/AuthContext';
import SessionCard from '../components/SessionCard';
import PatientCard from '../components/PatientCard';
import StatsCard from '../components/StatsCard';
import SessionManagementPanel from '../components/SessionManagementPanel';
import PatientHistoryPanel from '../components/PatientHistoryPanel';
import TranslationMonitorPanel from '../components/TranslationMonitorPanel';

export default function DashboardScreen({ navigation }) {
  const { userToken, providerInfo } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalPatients: 0,
    averageDuration: 0
  });

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setError(null);

      // Fetch active sessions
      const sessionsResponse = await fetch('https://api.medtranslate.ai/sessions/active', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (!sessionsResponse.ok) {
        throw new Error('Failed to load active sessions');
      }

      const sessionsData = await sessionsResponse.json();
      setActiveSessions(sessionsData.sessions || []);

      // Fetch recent patients
      const patientsResponse = await fetch('https://api.medtranslate.ai/patients/recent', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (!patientsResponse.ok) {
        throw new Error('Failed to load recent patients');
      }

      const patientsData = await patientsResponse.json();
      setRecentPatients(patientsData.patients || []);

      // Fetch stats
      const statsResponse = await fetch('https://api.medtranslate.ai/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to load statistics');
      }

      const statsData = await statsResponse.json();
      setStats(statsData);
    } catch (error) {
      console.error('Dashboard data loading error:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [userToken])
  );

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Create new session
  const createNewSession = () => {
    navigation.navigate('NewSession');
  };

  // Join existing session
  const joinSession = (sessionId) => {
    navigation.navigate('Session', { sessionId });
  };

  // View patient details
  const viewPatient = (patientId) => {
    navigation.navigate('PatientDetails', { patientId });
  };

  // Render active session item
  const renderSessionItem = ({ item }) => (
    <SessionCard
      session={item}
      onPress={() => joinSession(item.sessionId)}
    />
  );

  // Render recent patient item
  const renderPatientItem = ({ item }) => (
    <PatientCard
      patient={item}
      onPress={() => viewPatient(item.patientId)}
    />
  );

  // Show loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077CC" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#0077CC']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, {providerInfo?.name || 'Provider'}
            </Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newSessionButton}
            onPress={createNewSession}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.newSessionButtonText}>New Session</Text>
          </TouchableOpacity>
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadDashboardData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatsCard
            title="Total Sessions"
            value={stats.totalSessions}
            icon="calendar"
            color="#4CAF50"
          />
          <StatsCard
            title="Total Patients"
            value={stats.totalPatients}
            icon="people"
            color="#2196F3"
          />
          <StatsCard
            title="Avg. Duration"
            value={`${stats.averageDuration} min`}
            icon="time"
            color="#FF9800"
          />
        </View>

        {/* Active Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Sessions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Sessions')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {activeSessions.length > 0 ? (
            <FlatList
              data={activeSessions}
              renderItem={renderSessionItem}
              keyExtractor={item => item.sessionId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sessionsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#BDBDBD" />
              <Text style={styles.emptyText}>No active sessions</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={createNewSession}
              >
                <Text style={styles.emptyButtonText}>Create New Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Patients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Patients</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Patients')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentPatients.length > 0 ? (
            <FlatList
              data={recentPatients}
              renderItem={renderPatientItem}
              keyExtractor={item => item.patientId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.patientsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#BDBDBD" />
              <Text style={styles.emptyText}>No recent patients</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('NewSession')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="add-circle-outline" size={24} color="#0077CC" />
              </View>
              <Text style={styles.quickActionText}>New Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('ScanQRCode')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="qr-code-outline" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionText}>Scan QR Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('History')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="time-outline" size={24} color="#FF9800" />
              </View>
              <Text style={styles.quickActionText}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="settings-outline" size={24} color="#757575" />
              </View>
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
  },
  newSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0077CC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  newSessionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
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
  retryButton: {
    backgroundColor: '#F44336',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  seeAllText: {
    color: '#0077CC',
    fontSize: 14,
  },
  sessionsList: {
    paddingHorizontal: 16,
  },
  patientsList: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: '#0077CC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
});
