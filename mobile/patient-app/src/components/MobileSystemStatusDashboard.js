/**
 * MobileSystemStatusDashboard Component for MedTranslate AI Patient App
 *
 * This component provides a mobile-friendly dashboard for monitoring system status
 * and performance, including cache status, ML model performance, sync status,
 * storage optimization, device performance, and network status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { ProgressBar } from 'react-native-paper';
import { format } from 'date-fns';
import { useSystemStatus } from '../hooks/useSystemStatus';

/**
 * MobileSystemStatusDashboard component
 *
 * @param {Object} props - Component props
 * @returns {JSX.Element} MobileSystemStatusDashboard component
 */
const MobileSystemStatusDashboard = ({ refreshInterval = 30000 }) => {
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Use the system status hook to get the system status and control functions
  const {
    cacheStats,
    offlineReadiness,
    offlineRisk,
    mlPredictions,
    mlPerformance,
    mlPerformanceHistory,
    storageInfo,
    syncStatus,
    syncHistory,
    devicePerformance,
    loading,
    error,
    trainModels,
    configureModels,
    manualSync,
    toggleAutoSync,
    prepareForOffline,
    optimizeStorage,
    clearCache,
    refreshCache,
    refreshData
  } = useSystemStatus();

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setLastRefreshed(new Date());
    setRefreshing(false);
  }, [refreshData]);

  // Set up automatic refresh
  useEffect(() => {
    const intervalId = setInterval(handleRefresh, refreshInterval);
    return () => clearInterval(intervalId);
  }, [handleRefresh, refreshInterval]);

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      await manualSync();
    } catch (error) {
      console.error('Error performing manual sync:', error);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    if (typeof status === 'number') {
      if (status >= 0.8) return '#4CAF50'; // success
      if (status >= 0.4) return '#FFC107'; // warning
      return '#F44336'; // error
    }

    switch (status) {
      case 'healthy':
      case 'good':
      case 'online':
        return '#4CAF50'; // success
      case 'degraded':
      case 'warning':
      case 'partial':
        return '#FFC107'; // warning
      case 'error':
      case 'offline':
      case 'critical':
        return '#F44336'; // error
      default:
        return '#9E9E9E'; // default
    }
  };

  // Get status icon
  const getStatusIcon = (status, size = 24) => {
    const color = getStatusColor(status);

    switch (typeof status === 'number' ?
           (status >= 0.8 ? 'healthy' :
            status >= 0.4 ? 'warning' : 'error') : status) {
      case 'healthy':
      case 'good':
      case 'online':
        return <Ionicons name="checkmark-circle" size={size} color={color} />;
      case 'degraded':
      case 'warning':
      case 'partial':
        return <Ionicons name="warning" size={size} color={color} />;
      case 'error':
      case 'offline':
      case 'critical':
        return <Ionicons name="close-circle" size={size} color={color} />;
      default:
        return <Ionicons name="information-circle" size={size} color={color} />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" testID="loading-indicator" />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      testID="scroll-view"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#0066CC']}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>System Status</Text>
        <Text style={styles.subtitle}>
          Last updated: {format(lastRefreshed, 'yyyy-MM-dd HH:mm:ss')}
        </Text>
      </View>

      {/* System Overview */}
      <View style={styles.overviewContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Cache Health</Text>
              {getStatusIcon(offlineReadiness)}
            </View>
            <ProgressBar
              progress={offlineReadiness}
              color={getStatusColor(offlineReadiness)}
              style={styles.progressBar}
            />
            <Text style={styles.cardSubtitle}>
              {(offlineReadiness * 100).toFixed(0)}% Ready
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>ML Models</Text>
              {mlPerformance && mlPerformance.isInitialized ?
                getStatusIcon(mlPerformance.accuracy) :
                getStatusIcon('error')}
            </View>
            {mlPerformance && mlPerformance.isInitialized ? (
              <>
                <ProgressBar
                  progress={mlPerformance.accuracy}
                  color={getStatusColor(mlPerformance.accuracy)}
                  style={styles.progressBar}
                />
                <Text style={styles.cardSubtitle}>
                  {(mlPerformance.accuracy * 100).toFixed(0)}% Accuracy
                </Text>
              </>
            ) : (
              <Text style={styles.errorText}>Not Initialized</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Sync Status</Text>
              {syncStatus && syncStatus.lastSyncTime ?
                getStatusIcon(Date.now() - syncStatus.lastSyncTime < 3600000 ? 'healthy' :
                             Date.now() - syncStatus.lastSyncTime < 86400000 ? 'warning' : 'error') :
                getStatusIcon('error')}
            </View>
            {syncStatus && syncStatus.lastSyncTime ? (
              <Text style={styles.cardSubtitle}>
                Last sync: {format(new Date(syncStatus.lastSyncTime), 'yyyy-MM-dd HH:mm:ss')}
              </Text>
            ) : (
              <Text style={styles.errorText}>Never synced</Text>
            )}
            <TouchableOpacity
              style={styles.button}
              onPress={handleManualSync}
            >
              <Ionicons name="sync" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Sync Now</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Offline Risk</Text>
              {getStatusIcon(offlineRisk > 0.7 ? 'error' :
                            offlineRisk > 0.3 ? 'warning' : 'healthy')}
            </View>
            <ProgressBar
              progress={offlineRisk}
              color={offlineRisk > 0.7 ? '#F44336' :
                    offlineRisk > 0.3 ? '#FFC107' : '#4CAF50'}
              style={styles.progressBar}
            />
            <Text style={styles.cardSubtitle}>
              {(offlineRisk * 100).toFixed(0)}% Risk
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cache' && styles.activeTab]}
          onPress={() => setActiveTab('cache')}
        >
          <Text style={[styles.tabText, activeTab === 'cache' && styles.activeTabText]}>Cache</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sync' && styles.activeTab]}
          onPress={() => setActiveTab('sync')}
        >
          <Text style={[styles.tabText, activeTab === 'sync' && styles.activeTabText]}>Sync</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'device' && styles.activeTab]}
          onPress={() => setActiveTab('device')}
        >
          <Text style={[styles.tabText, activeTab === 'device' && styles.activeTabText]}>Device</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'overview' && (
          <Text style={styles.comingSoon}>Detailed metrics coming soon</Text>
        )}

        {activeTab === 'cache' && (
          <Text style={styles.comingSoon}>Cache metrics coming soon</Text>
        )}

        {activeTab === 'sync' && (
          <Text style={styles.comingSoon}>Sync metrics coming soon</Text>
        )}

        {activeTab === 'device' && (
          <Text style={styles.comingSoon}>Device metrics coming soon</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F44336',
    marginTop: 10,
    textAlign: 'center',
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  overviewContainer: {
    padding: 8,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
  tabContent: {
    padding: 16,
    minHeight: 200,
  },
  comingSoon: {
    textAlign: 'center',
    color: '#666666',
    marginTop: 20,
  },
});

MobileSystemStatusDashboard.propTypes = {
  refreshInterval: PropTypes.number
};

export default MobileSystemStatusDashboard;
