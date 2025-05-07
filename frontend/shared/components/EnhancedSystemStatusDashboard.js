/**
 * EnhancedSystemStatusDashboard Component for MedTranslate AI
 *
 * This component provides a comprehensive dashboard for monitoring system status,
 * including network quality, cache health, offline readiness, ML model performance,
 * and more. It offers real-time updates and detailed analytics.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSystemStatus } from '../hooks/useSystemStatus';
import EnhancedNetworkStatusIndicator from './EnhancedNetworkStatusIndicator';
import CachingStatusIndicator from './CachingStatusIndicator';

/**
 * EnhancedSystemStatusDashboard component
 *
 * @param {Object} props - Component props
 * @param {Object} props.style - Custom styles
 * @returns {JSX.Element} EnhancedSystemStatusDashboard component
 */
const EnhancedSystemStatusDashboard = ({ style = {} }) => {
  // Get system status from hook
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
    manualSync,
    prepareForOffline,
    optimizeStorage,
    clearCache,
    refreshCache,
    refreshData
  } = useSystemStatus();

  // UI state
  const [activeSection, setActiveSection] = useState('overview'); // 'overview', 'network', 'cache', 'ml', 'storage', 'sync'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${Math.round(value)}%`;
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '0';
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  // Get color based on value (0-100)
  const getColorByValue = (value) => {
    if (value >= 80) return '#4CAF50'; // Green
    if (value >= 50) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Get color based on risk (0-1)
  const getRiskColor = (risk) => {
    if (risk >= 0.7) return '#F44336'; // Red
    if (risk >= 0.3) return '#FFC107'; // Yellow
    return '#4CAF50'; // Green
  };

  return (
    <View style={[styles.container, style.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>System Status Dashboard</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading indicator */}
      {loading && !isRefreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading system status...</Text>
        </View>
      )}

      {/* Status indicators */}
      <View style={styles.indicatorsContainer}>
        <EnhancedNetworkStatusIndicator
          style={styles.indicator}
          cacheStats={cacheStats}
          offlineReadiness={offlineReadiness}
          offlineRisk={offlineRisk}
          onManualSync={manualSync}
          onPrepareOffline={prepareForOffline}
        />
        <CachingStatusIndicator
          style={styles.indicator}
          cacheStats={cacheStats}
          offlineReadiness={offlineReadiness}
          offlineRisk={offlineRisk}
          mlPredictions={mlPredictions}
          mlPerformance={mlPerformance}
          mlPerformanceHistory={mlPerformanceHistory}
          storageInfo={storageInfo}
          syncStatus={syncStatus}
          syncHistory={syncHistory}
          devicePerformance={devicePerformance}
          onManualSync={manualSync}
          onPrepareOffline={prepareForOffline}
          onClearCache={clearCache}
          onRefreshCache={refreshCache}
          onOptimizeStorage={optimizeStorage}
          onTrainModels={trainModels}
        />
      </View>

      {/* Section navigation */}
      <View style={styles.sectionNav}>
        <TouchableOpacity
          style={[styles.sectionTab, activeSection === 'overview' && styles.activeTab]}
          onPress={() => setActiveSection('overview')}
        >
          <Ionicons
            name="stats-chart"
            size={18}
            color={activeSection === 'overview' ? '#2196F3' : '#666666'}
          />
          <Text style={[styles.sectionTabText, activeSection === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sectionTab, activeSection === 'network' && styles.activeTab]}
          onPress={() => setActiveSection('network')}
        >
          <Ionicons
            name="wifi"
            size={18}
            color={activeSection === 'network' ? '#2196F3' : '#666666'}
          />
          <Text style={[styles.sectionTabText, activeSection === 'network' && styles.activeTabText]}>
            Network
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sectionTab, activeSection === 'cache' && styles.activeTab]}
          onPress={() => setActiveSection('cache')}
        >
          <Ionicons
            name="server"
            size={18}
            color={activeSection === 'cache' ? '#2196F3' : '#666666'}
          />
          <Text style={[styles.sectionTabText, activeSection === 'cache' && styles.activeTabText]}>
            Cache
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sectionTab, activeSection === 'ml' && styles.activeTab]}
          onPress={() => setActiveSection('ml')}
        >
          <FontAwesome5
            name="brain"
            size={18}
            color={activeSection === 'ml' ? '#2196F3' : '#666666'}
          />
          <Text style={[styles.sectionTabText, activeSection === 'ml' && styles.activeTabText]}>
            ML Models
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sectionTab, activeSection === 'sync' && styles.activeTab]}
          onPress={() => setActiveSection('sync')}
        >
          <MaterialIcons
            name="sync"
            size={18}
            color={activeSection === 'sync' ? '#2196F3' : '#666666'}
          />
          <Text style={[styles.sectionTabText, activeSection === 'sync' && styles.activeTabText]}>
            Sync
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section content */}
      <ScrollView style={styles.sectionContent}>
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Overview</Text>
            
            {/* System Health Summary */}
            <View style={styles.overviewGrid}>
              {/* Network Status */}
              <View style={[styles.overviewCard, styles.cardShadow]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="wifi" size={24} color="#2196F3" />
                  <Text style={styles.cardTitle}>Network</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[
                    styles.cardValue,
                    { color: getColorByValue(mlPerformance?.networkQuality === 'excellent' ? 100 : 
                                            mlPerformance?.networkQuality === 'good' ? 80 : 
                                            mlPerformance?.networkQuality === 'fair' ? 60 : 
                                            mlPerformance?.networkQuality === 'poor' ? 40 : 20) }
                  ]}>
                    {mlPerformance?.networkQuality || 'Unknown'}
                  </Text>
                  <Text style={styles.cardSubtext}>
                    {mlPerformance?.networkType || 'Unknown'} Connection
                  </Text>
                </View>
              </View>

              {/* Cache Health */}
              <View style={[styles.overviewCard, styles.cardShadow]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="server" size={24} color="#4CAF50" />
                  <Text style={styles.cardTitle}>Cache</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[
                    styles.cardValue,
                    { color: getColorByValue(cacheStats?.hitRate?.total * 100 || 0) }
                  ]}>
                    {formatPercentage((cacheStats?.hitRate?.total || 0) * 100)}
                  </Text>
                  <Text style={styles.cardSubtext}>
                    Hit Rate
                  </Text>
                </View>
              </View>

              {/* Offline Readiness */}
              <View style={[styles.overviewCard, styles.cardShadow]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="cloud-offline" size={24} color="#FF9800" />
                  <Text style={styles.cardTitle}>Offline</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[
                    styles.cardValue,
                    { color: getColorByValue(offlineReadiness) }
                  ]}>
                    {formatPercentage(offlineReadiness)}
                  </Text>
                  <Text style={styles.cardSubtext}>
                    Readiness
                  </Text>
                </View>
              </View>

              {/* ML Performance */}
              <View style={[styles.overviewCard, styles.cardShadow]}>
                <View style={styles.cardHeader}>
                  <FontAwesome5 name="brain" size={24} color="#9C27B0" />
                  <Text style={styles.cardTitle}>ML Models</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[
                    styles.cardValue,
                    { color: getColorByValue((mlPerformance?.accuracy || 0) * 100) }
                  ]}>
                    {formatPercentage((mlPerformance?.accuracy || 0) * 100)}
                  </Text>
                  <Text style={styles.cardSubtext}>
                    Accuracy
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={manualSync}
              >
                <MaterialIcons name="sync" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Sync Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={prepareForOffline}
              >
                <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Prepare Offline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={refreshCache}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Refresh Cache</Text>
              </TouchableOpacity>
            </View>

            {/* System Alerts */}
            {(offlineRisk > 0.7 || (cacheStats?.hitRate?.total || 0) < 0.5) && (
              <View style={styles.alertsContainer}>
                <Text style={styles.alertsTitle}>System Alerts</Text>
                
                {offlineRisk > 0.7 && (
                  <View style={styles.alertItem}>
                    <Ionicons name="warning" size={20} color="#F44336" />
                    <Text style={styles.alertText}>
                      High risk of going offline ({formatPercentage(offlineRisk * 100)})
                    </Text>
                  </View>
                )}
                
                {(cacheStats?.hitRate?.total || 0) < 0.5 && (
                  <View style={styles.alertItem}>
                    <Ionicons name="alert-circle" size={20} color="#FF9800" />
                    <Text style={styles.alertText}>
                      Low cache hit rate ({formatPercentage((cacheStats?.hitRate?.total || 0) * 100)})
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Additional section content will be implemented in the next part */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2196F3',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 5,
    margin: 10,
  },
  errorText: {
    color: '#F44336',
    marginLeft: 5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
  },
  indicatorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  indicator: {
    margin: 5,
  },
  sectionNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  sectionTabText: {
    fontSize: 12,
    marginLeft: 5,
    color: '#666666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  sectionContent: {
    flex: 1,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardSubtext: {
    fontSize: 12,
    color: '#666666',
    marginTop: 5,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 5,
  },
  alertsContainer: {
    backgroundColor: '#FFFDE7',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertText: {
    marginLeft: 8,
    fontSize: 12,
  },
});

export default EnhancedSystemStatusDashboard;
