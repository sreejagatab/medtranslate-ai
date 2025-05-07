/**
 * CachingStatusIndicator Component for MedTranslate AI
 *
 * This component displays the current status of the predictive caching system,
 * including cache health, prediction confidence, and offline readiness.
 *
 * Enhanced features:
 * - Detailed ML prediction information with model performance metrics
 * - Advanced ML model status visualization with training information
 * - Auto-sync-manager status and controls with detailed sync metrics
 * - Storage optimization status with detailed storage analytics
 * - Offline preparation controls with predictive insights
 * - Enhanced visual indicators for system health with real-time updates
 * - Performance monitoring for all subsystems
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ProgressBar,
  ActivityIndicator,
  Alert,
  Switch,
  Animated,
  Easing,
  Dimensions
} from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  MaterialCommunityIcons,
  AntDesign
} from '@expo/vector-icons';
import PropTypes from 'prop-types';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

/**
 * CachingStatusIndicator component
 *
 * @param {Object} props - Component props
 * @param {Object} props.cacheStats - Cache statistics
 * @param {number} props.offlineReadiness - Offline readiness percentage (0-100)
 * @param {number} props.offlineRisk - Risk of going offline (0-1)
 * @param {Object} props.mlPredictions - ML predictions information
 * @param {Object} props.mlPerformance - ML model performance metrics
 * @param {Array} props.mlPerformanceHistory - Historical ML performance data for charts
 * @param {Object} props.storageInfo - Storage optimization information
 * @param {Object} props.syncStatus - Auto-sync-manager status information
 * @param {Array} props.syncHistory - Historical sync data for charts
 * @param {Object} props.devicePerformance - Device performance metrics
 * @param {Function} props.onManualSync - Callback for manual sync
 * @param {Function} props.onPrepareOffline - Callback for preparing for offline mode
 * @param {Function} props.onClearCache - Callback for clearing cache
 * @param {Function} props.onRefreshCache - Callback for refreshing cache
 * @param {Function} props.onOptimizeStorage - Callback for optimizing storage
 * @param {Function} props.onTrainModels - Callback for training ML models
 * @param {Function} props.onToggleAutoSync - Callback for toggling auto-sync
 * @param {Function} props.onConfigureModels - Callback for configuring ML models
 * @param {Object} props.style - Custom styles
 * @returns {JSX.Element} CachingStatusIndicator component
 */
const CachingStatusIndicator = ({
  cacheStats = {},
  offlineReadiness = 0,
  offlineRisk = 0,
  mlPredictions = {},
  mlPerformance = {},
  mlPerformanceHistory = [],
  storageInfo = {},
  syncStatus = {},
  syncHistory = [],
  devicePerformance = {},
  onManualSync = () => {},
  onPrepareOffline = () => {},
  onClearCache = () => {},
  onRefreshCache = () => {},
  onOptimizeStorage = () => {},
  onTrainModels = () => {},
  onToggleAutoSync = () => {},
  onConfigureModels = () => {},
  style = {}
}) => {
  // UI state
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [activeTab, setActiveTab] = useState('cache'); // 'cache', 'ml', 'storage', 'sync', 'performance'
  const [activeMLSubTab, setActiveMLSubTab] = useState('status'); // 'status', 'models', 'performance', 'predictions'
  const [activeSyncSubTab, setActiveSyncSubTab] = useState('status'); // 'status', 'history', 'conflicts', 'settings'
  const [chartTimeRange, setChartTimeRange] = useState('day'); // 'day', 'week', 'month'

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Screen dimensions for charts
  const screenWidth = Dimensions.get('window').width * 0.85;

  // Action states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(syncStatus?.enabled || true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Confirmation states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetMLConfirm, setShowResetMLConfirm] = useState(false);

  // Calculate cache health (0-100)
  const calculateCacheHealth = () => {
    if (!cacheStats.totalRequests || !cacheStats.totalRequests.total) return 0;

    // Calculate based on hit rate and cache size
    const hitRateScore = (cacheStats.hitRate?.total || 0) * 100;
    const sizeScore = Math.min(100, ((cacheStats.sizes?.total || 0) / (cacheStats.limit || 1)) * 100);

    // Weighted average
    return Math.round((hitRateScore * 0.7) + (sizeScore * 0.3));
  };

  // Get cache health color
  const getCacheHealthColor = () => {
    const health = calculateCacheHealth();
    if (health >= 80) return '#4CAF50'; // Green
    if (health >= 50) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Get offline readiness color
  const getOfflineReadinessColor = () => {
    if (offlineReadiness >= 80) return '#4CAF50'; // Green
    if (offlineReadiness >= 50) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Get offline risk color
  const getOfflineRiskColor = () => {
    if (offlineRisk >= 0.7) return '#F44336'; // Red
    if (offlineRisk >= 0.3) return '#FFC107'; // Yellow
    return '#4CAF50'; // Green
  };

  // Get cache status text
  const getCacheStatusText = () => {
    const health = calculateCacheHealth();
    if (health >= 80) return 'Healthy';
    if (health >= 50) return 'Fair';
    return 'Poor';
  };

  // Get offline readiness text
  const getOfflineReadinessText = () => {
    if (offlineReadiness >= 80) return 'Ready';
    if (offlineReadiness >= 50) return 'Preparing';
    return 'Not Ready';
  };

  // Get cache icon
  const getCacheIcon = () => {
    const health = calculateCacheHealth();
    if (health >= 80) return 'checkmark-circle';
    if (health >= 50) return 'alert-circle';
    return 'warning';
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '0';
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${Math.round(value)}%`;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  // Start pulse animation for indicators
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  };

  // Start rotation animation for sync icon
  const startRotateAnimation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  };

  // Convert rotation value to interpolated string
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Effect to start animations when component mounts
  useEffect(() => {
    startPulseAnimation();
    startRotateAnimation();
  }, []);

  // Effect to refresh stats periodically when modal is open
  useEffect(() => {
    if (modalVisible && !refreshInterval) {
      const interval = setInterval(() => {
        // This would typically fetch updated stats
        // For now, we'll just use the props
      }, 5000);
      setRefreshInterval(interval);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    };
  }, [modalVisible]);

  // Handle auto-sync toggle with callback
  const handleAutoSyncToggle = (value) => {
    setAutoSyncEnabled(value);
    onToggleAutoSync(value);
  };

  return (
    <View style={[styles.container, style.container]}>
      <TouchableOpacity
        style={[styles.indicator, { borderColor: getCacheHealthColor() }, style.indicator]}
        onPress={() => setModalVisible(true)}
      >
        <Animated.View
          style={{
            transform: [{ scale: offlineRisk > 0.7 ? pulseAnim : 1 }]
          }}
        >
          <Ionicons
            name={getCacheIcon()}
            size={16}
            color={getCacheHealthColor()}
            style={styles.icon}
          />
        </Animated.View>
        <Text style={[styles.text, { color: getCacheHealthColor() }, style.text]}>
          {getCacheStatusText()}
        </Text>

        {/* ML Model Status Indicator */}
        {mlPerformance && mlPerformance.isInitialized && (
          <FontAwesome5
            name="brain"
            size={12}
            color={mlPerformance.accuracy > 0.7 ? '#4CAF50' : mlPerformance.accuracy > 0.4 ? '#FFC107' : '#F44336'}
            style={styles.secondaryIcon}
          />
        )}

        {/* Sync Status Indicator */}
        {syncStatus && syncStatus.lastSyncTime && (
          <MaterialIcons
            name="sync"
            size={12}
            color={
              Date.now() - syncStatus.lastSyncTime < 3600000 ? '#4CAF50' :
              Date.now() - syncStatus.lastSyncTime < 86400000 ? '#FFC107' : '#F44336'
            }
            style={styles.secondaryIcon}
          />
        )}

        {offlineRisk > 0.5 && (
          <Animated.View
            style={[
              styles.offlineRiskIndicator,
              {
                backgroundColor: getOfflineRiskColor(),
                transform: [{ scale: pulseAnim }]
              }
            ]}
          />
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>System Status</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'cache' && styles.activeTab]}
                onPress={() => setActiveTab('cache')}
              >
                <Ionicons
                  name="server"
                  size={18}
                  color={activeTab === 'cache' ? '#2196F3' : '#666666'}
                />
                <Text style={[styles.tabText, activeTab === 'cache' && styles.activeTabText]}>
                  Cache
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'ml' && styles.activeTab]}
                onPress={() => setActiveTab('ml')}
              >
                <FontAwesome5
                  name="brain"
                  size={18}
                  color={activeTab === 'ml' ? '#2196F3' : '#666666'}
                />
                <Text style={[styles.tabText, activeTab === 'ml' && styles.activeTabText]}>
                  ML Models
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'storage' && styles.activeTab]}
                onPress={() => setActiveTab('storage')}
              >
                <MaterialIcons
                  name="storage"
                  size={18}
                  color={activeTab === 'storage' ? '#2196F3' : '#666666'}
                />
                <Text style={[styles.tabText, activeTab === 'storage' && styles.activeTabText]}>
                  Storage
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'sync' && styles.activeTab]}
                onPress={() => setActiveTab('sync')}
              >
                <Animated.View style={{ transform: [{ rotate: activeTab === 'sync' ? spin : '0deg' }] }}>
                  <MaterialIcons
                    name="sync"
                    size={18}
                    color={activeTab === 'sync' ? '#2196F3' : '#666666'}
                  />
                </Animated.View>
                <Text style={[styles.tabText, activeTab === 'sync' && styles.activeTabText]}>
                  Sync
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'performance' && styles.activeTab]}
                onPress={() => setActiveTab('performance')}
              >
                <MaterialCommunityIcons
                  name="speedometer"
                  size={18}
                  color={activeTab === 'performance' ? '#2196F3' : '#666666'}
                />
                <Text style={[styles.tabText, activeTab === 'performance' && styles.activeTabText]}>
                  Performance
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Cache Tab Content */}
              {activeTab === 'cache' && (
                <>
                  {/* Cache Health Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cache Health</Text>
                    <View style={styles.healthIndicator}>
                      <Ionicons
                        name={getCacheIcon()}
                        size={40}
                        color={getCacheHealthColor()}
                      />
                      <Text style={[styles.healthText, { color: getCacheHealthColor() }]}>
                        {getCacheStatusText()}
                      </Text>
                      <Text style={styles.healthScore}>
                        Score: {formatPercentage(calculateCacheHealth())}
                      </Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <Text style={styles.progressLabel}>Cache Usage</Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(100, ((cacheStats.sizes?.total || 0) / (cacheStats.limit || 1)) * 100)}%`,
                              backgroundColor: getCacheHealthColor()
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.progressValue}>
                        {formatNumber(cacheStats.sizes?.total || 0)} / {formatNumber(cacheStats.limit || 0)} items
                      </Text>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Hit Rate</Text>
                        <Text style={styles.statValue}>
                          {formatPercentage((cacheStats.hitRate?.total || 0) * 100)}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Cache Hits</Text>
                        <Text style={styles.statValue}>
                          {formatNumber(cacheStats.hits?.total || 0)}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Cache Misses</Text>
                        <Text style={styles.statValue}>
                          {formatNumber(cacheStats.misses?.total || 0)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Offline Readiness Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Offline Readiness</Text>
                    <View style={styles.healthIndicator}>
                      <Ionicons
                        name={offlineReadiness >= 50 ? "cloud-offline" : "cloud-offline-outline"}
                        size={40}
                        color={getOfflineReadinessColor()}
                      />
                      <Text style={[styles.healthText, { color: getOfflineReadinessColor() }]}>
                        {getOfflineReadinessText()}
                      </Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <Text style={styles.progressLabel}>Readiness Level</Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${offlineReadiness}%`,
                              backgroundColor: getOfflineReadinessColor()
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.progressValue}>
                        {formatPercentage(offlineReadiness)}
                      </Text>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Offline Risk</Text>
                        <Text style={[styles.statValue, { color: getOfflineRiskColor() }]}>
                          {formatPercentage(offlineRisk * 100)}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Priority Items</Text>
                        <Text style={styles.statValue}>
                          {formatNumber(cacheStats.offlinePriorityItems?.total || 0)}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Auto-Sync</Text>
                        <Switch
                          value={autoSyncEnabled}
                          onValueChange={setAutoSyncEnabled}
                          trackColor={{ false: "#767577", true: "#81b0ff" }}
                          thumbColor={autoSyncEnabled ? "#2196F3" : "#f4f3f4"}
                        />
                      </View>
                    </View>

                    {/* Manual Sync Button */}
                    <TouchableOpacity
                      style={[styles.syncButton, isSyncing && styles.syncingButton]}
                      onPress={() => {
                        if (isSyncing) return;
                        setIsSyncing(true);
                        onManualSync()
                          .then(() => setIsSyncing(false))
                          .catch(() => setIsSyncing(false));
                      }}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="sync" size={20} color="#FFFFFF" />
                      )}
                      <Text style={styles.syncButtonText}>
                        {isSyncing ? 'Syncing...' : 'Manual Sync'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Cache Details Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cache Details</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Translation Cache</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(cacheStats.sizes?.translation || 0)} items
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Audio Cache</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(cacheStats.sizes?.audio || 0)} items
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Medical Terms</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(cacheStats.sizes?.medicalTerms || 0)} items
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Cache TTL</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(cacheStats.ttl || 0)} seconds
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Last Reset</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(cacheStats.lastReset)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Compression Ratio</Text>
                      <Text style={styles.detailValue}>
                        {formatPercentage((cacheStats.compressionRatio || 0) * 100)}
                      </Text>
                    </View>
                  </View>

                  {/* Cache Actions Section */}
                  <View style={styles.actionsSection}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={onRefreshCache}
                    >
                      <Ionicons name="refresh" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Refresh Cache</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.warningButton]}
                      onPress={() => setShowClearConfirm(true)}
                    >
                      <Ionicons name="trash" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Clear Cache</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Clear Cache Confirmation */}
                  {showClearConfirm && (
                    <View style={styles.confirmationBox}>
                      <Text style={styles.confirmationText}>
                        Are you sure you want to clear the cache? This will remove all cached data.
                      </Text>
                      <View style={styles.confirmationButtons}>
                        <TouchableOpacity
                          style={[styles.confirmButton, styles.cancelButton]}
                          onPress={() => setShowClearConfirm(false)}
                        >
                          <Text style={styles.confirmButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.confirmButton, styles.confirmDeleteButton]}
                          onPress={() => {
                            setShowClearConfirm(false);
                            onClearCache();
                          }}
                        >
                          <Text style={styles.confirmButtonText}>Clear</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* ML Models Tab Content */}
              {activeTab === 'ml' && (
                <>
                  {/* ML Sub-Tab Navigation */}
                  <View style={styles.subTabContainer}>
                    <TouchableOpacity
                      style={[styles.subTab, activeMLSubTab === 'status' && styles.activeSubTab]}
                      onPress={() => setActiveMLSubTab('status')}
                    >
                      <Text style={[styles.subTabText, activeMLSubTab === 'status' && styles.activeSubTabText]}>
                        Status
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subTab, activeMLSubTab === 'models' && styles.activeSubTab]}
                      onPress={() => setActiveMLSubTab('models')}
                    >
                      <Text style={[styles.subTabText, activeMLSubTab === 'models' && styles.activeSubTabText]}>
                        Models
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subTab, activeMLSubTab === 'performance' && styles.activeSubTab]}
                      onPress={() => setActiveMLSubTab('performance')}
                    >
                      <Text style={[styles.subTabText, activeMLSubTab === 'performance' && styles.activeSubTabText]}>
                        Performance
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subTab, activeMLSubTab === 'predictions' && styles.activeSubTab]}
                      onPress={() => setActiveMLSubTab('predictions')}
                    >
                      <Text style={[styles.subTabText, activeMLSubTab === 'predictions' && styles.activeSubTabText]}>
                        Predictions
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* ML Status Sub-Tab Content */}
                  {activeMLSubTab === 'status' && (
                    <>
                      {/* ML Model Status Section */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ML Model Status</Text>
                        <View style={styles.healthIndicator}>
                          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <FontAwesome5
                              name="brain"
                              size={40}
                              color={mlPerformance?.isInitialized ? '#4CAF50' : '#F44336'}
                            />
                          </Animated.View>
                          <Text style={[
                            styles.healthText,
                            { color: mlPerformance?.isInitialized ? '#4CAF50' : '#F44336' }
                          ]}>
                            {mlPerformance?.isInitialized ? 'Active' : 'Inactive'}
                          </Text>
                          <Text style={styles.healthScore}>
                            Version: {mlPerformance?.version || 'Unknown'}
                          </Text>
                        </View>

                        {/* Model Performance */}
                        <View style={styles.statsRow}>
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Accuracy</Text>
                            <Text style={styles.statValue}>
                              {formatPercentage((mlPerformance?.accuracy || 0) * 100)}
                            </Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Compute Time</Text>
                            <Text style={styles.statValue}>
                              {formatNumber(mlPerformance?.computeTimeMs || 0)}ms
                            </Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Memory</Text>
                            <Text style={styles.statValue}>
                              {formatNumber(mlPerformance?.memoryUsageMB || 0)}MB
                            </Text>
                          </View>
                        </View>

                        {/* Training Status */}
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Last Training</Text>
                          <Text style={styles.detailValue}>
                            {formatDate(mlPerformance?.lastTrainingTime)}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Training Samples</Text>
                          <Text style={styles.detailValue}>
                            {formatNumber(mlPerformance?.trainingSamples || 0)}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Model Size</Text>
                          <Text style={styles.detailValue}>
                            {formatNumber(mlPerformance?.modelSizeKB || 0)} KB
                          </Text>
                        </View>

                        {/* Train Models Button */}
                        <TouchableOpacity
                          style={[styles.syncButton, isTraining && styles.syncingButton]}
                          onPress={() => {
                            if (isTraining) return;
                            setIsTraining(true);
                            onTrainModels()
                              .then(() => setIsTraining(false))
                              .catch(() => setIsTraining(false));
                          }}
                          disabled={isTraining}
                        >
                          {isTraining ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <FontAwesome5 name="brain" size={20} color="#FFFFFF" />
                          )}
                          <Text style={styles.syncButtonText}>
                            {isTraining ? 'Training...' : 'Train Models'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* ML Models Sub-Tab Content */}
                  {activeMLSubTab === 'models' && (
                    <>
                      {/* Available Models Section */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Available Models</Text>

                        {(mlPerformance?.models || []).length > 0 ? (
                          (mlPerformance?.models || []).map((model, index) => (
                            <View key={index} style={styles.modelItem}>
                              <View style={styles.modelHeader}>
                                <Text style={styles.modelTitle}>
                                  {model.name || `Model ${index + 1}`}
                                </Text>
                                <View style={[
                                  styles.statusBadge,
                                  {
                                    backgroundColor: model.enabled ? '#4CAF50' : '#F44336'
                                  }
                                ]}>
                                  <Text style={styles.statusText}>
                                    {model.enabled ? 'Enabled' : 'Disabled'}
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.modelType}>
                                Type: {model.type || 'Unknown'}
                              </Text>

                              <View style={styles.modelStatsRow}>
                                <View style={styles.modelStat}>
                                  <Text style={styles.modelStatLabel}>Accuracy</Text>
                                  <Text style={styles.modelStatValue}>
                                    {formatPercentage((model.accuracy || 0) * 100)}
                                  </Text>
                                </View>
                                <View style={styles.modelStat}>
                                  <Text style={styles.modelStatLabel}>Size</Text>
                                  <Text style={styles.modelStatValue}>
                                    {formatNumber(model.sizeKB || 0)} KB
                                  </Text>
                                </View>
                                <View style={styles.modelStat}>
                                  <Text style={styles.modelStatLabel}>Latency</Text>
                                  <Text style={styles.modelStatValue}>
                                    {formatNumber(model.latencyMs || 0)} ms
                                  </Text>
                                </View>
                              </View>

                              <TouchableOpacity
                                style={[styles.modelConfigButton, model.enabled ? styles.disableButton : styles.enableButton]}
                                onPress={() => onConfigureModels({ modelId: model.id, enabled: !model.enabled })}
                              >
                                <Text style={styles.modelConfigButtonText}>
                                  {model.enabled ? 'Disable' : 'Enable'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyText}>No models available</Text>
                        )}
                      </View>
                    </>
                  )}

                  {/* ML Performance Sub-Tab Content */}
                  {activeMLSubTab === 'performance' && (
                    <>
                      {/* Performance Metrics Section */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Performance Metrics</Text>

                        {/* Time Range Selector */}
                        <View style={styles.timeRangeSelector}>
                          <TouchableOpacity
                            style={[styles.timeRangeButton, chartTimeRange === 'day' && styles.activeTimeRange]}
                            onPress={() => setChartTimeRange('day')}
                          >
                            <Text style={[styles.timeRangeText, chartTimeRange === 'day' && styles.activeTimeRangeText]}>
                              Day
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.timeRangeButton, chartTimeRange === 'week' && styles.activeTimeRange]}
                            onPress={() => setChartTimeRange('week')}
                          >
                            <Text style={[styles.timeRangeText, chartTimeRange === 'week' && styles.activeTimeRangeText]}>
                              Week
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.timeRangeButton, chartTimeRange === 'month' && styles.activeTimeRange]}
                            onPress={() => setChartTimeRange('month')}
                          >
                            <Text style={[styles.timeRangeText, chartTimeRange === 'month' && styles.activeTimeRangeText]}>
                              Month
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Accuracy Chart */}
                        <View style={styles.chartContainer}>
                          <Text style={styles.chartTitle}>Prediction Accuracy</Text>
                          {mlPerformanceHistory && mlPerformanceHistory.length > 0 ? (
                            <LineChart
                              data={{
                                labels: mlPerformanceHistory.slice(-6).map(item => item.label || ''),
                                datasets: [{
                                  data: mlPerformanceHistory.slice(-6).map(item => item.accuracy * 100 || 0)
                                }]
                              }}
                              width={screenWidth}
                              height={180}
                              chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                style: {
                                  borderRadius: 16
                                }
                              }}
                              bezier
                              style={styles.chart}
                            />
                          ) : (
                            <Text style={styles.emptyText}>No performance data available</Text>
                          )}
                        </View>

                        {/* Compute Time Chart */}
                        <View style={styles.chartContainer}>
                          <Text style={styles.chartTitle}>Compute Time (ms)</Text>
                          {mlPerformanceHistory && mlPerformanceHistory.length > 0 ? (
                            <LineChart
                              data={{
                                labels: mlPerformanceHistory.slice(-6).map(item => item.label || ''),
                                datasets: [{
                                  data: mlPerformanceHistory.slice(-6).map(item => item.computeTimeMs || 0)
                                }]
                              }}
                              width={screenWidth}
                              height={180}
                              chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                style: {
                                  borderRadius: 16
                                }
                              }}
                              bezier
                              style={styles.chart}
                            />
                          ) : (
                            <Text style={styles.emptyText}>No performance data available</Text>
                          )}
                        </View>
                      </View>
                    </>
                  )}

                  {/* ML Predictions Sub-Tab Content */}
                  {activeMLSubTab === 'predictions' && (
                    <>
                      {/* Offline Predictions Section */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Offline Predictions</Text>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Predicted Offline Risk</Text>
                          <Text style={[
                            styles.detailValue,
                            { color: getOfflineRiskColor() }
                          ]}>
                            {formatPercentage(offlineRisk * 100)}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Predicted Duration</Text>
                          <Text style={styles.detailValue}>
                            {formatNumber(mlPredictions.predictedOfflineDuration?.hours || 0)} hours
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Confidence Level</Text>
                          <Text style={styles.detailValue}>
                            {formatPercentage((mlPredictions.predictionConfidence || 0) * 100)}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Last Prediction</Text>
                          <Text style={styles.detailValue}>
                            {formatDate(mlPredictions.lastPredictionTime)}
                          </Text>
                        </View>

                        {/* Prepare for Offline Button */}
                        <TouchableOpacity
                          style={[styles.syncButton, isPreparing && styles.syncingButton]}
                          onPress={() => {
                            if (isPreparing) return;
                            setIsPreparing(true);
                            onPrepareOffline()
                              .then(() => setIsPreparing(false))
                              .catch(() => setIsPreparing(false));
                          }}
                          disabled={isPreparing}
                        >
                          {isPreparing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
                          )}
                          <Text style={styles.syncButtonText}>
                            {isPreparing ? 'Preparing...' : 'Prepare for Offline'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Top Predictions Section */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Top Predictions</Text>

                        {(mlPredictions.topPredictions || []).length > 0 ? (
                          (mlPredictions.topPredictions || []).map((prediction, index) => (
                            <View key={index} style={styles.predictionItem}>
                              <View style={styles.predictionHeader}>
                                <Text style={styles.predictionTitle}>
                                  {prediction.sourceLanguage} → {prediction.targetLanguage}
                                </Text>
                                <Text style={[
                                  styles.predictionScore,
                                  { color: prediction.score > 0.7 ? '#4CAF50' : prediction.score > 0.4 ? '#FFC107' : '#F44336' }
                                ]}>
                                  {formatPercentage(prediction.score * 100)}
                                </Text>
                              </View>
                              <Text style={styles.predictionContext}>
                                Context: {prediction.context || 'General'}
                              </Text>
                              <Text style={styles.predictionReason}>
                                Reason: {prediction.reason || 'Unknown'}
                              </Text>
                              <View style={[
                                styles.priorityBadge,
                                {
                                  backgroundColor:
                                    prediction.priority === 'high' ? '#4CAF50' :
                                    prediction.priority === 'medium' ? '#FFC107' : '#F44336'
                                }
                              ]}>
                                <Text style={styles.priorityText}>
                                  {prediction.priority || 'low'}
                                </Text>
                              </View>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyText}>No predictions available</Text>
                        )}
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Storage Tab Content */}
              {activeTab === 'storage' && (
                <>
                  {/* Storage Status Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Storage Status</Text>

                    <View style={styles.progressBarContainer}>
                      <Text style={styles.progressLabel}>Storage Usage</Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${storageInfo.usagePercentage || 0}%`,
                              backgroundColor:
                                (storageInfo.usagePercentage || 0) > 90 ? '#F44336' :
                                (storageInfo.usagePercentage || 0) > 70 ? '#FFC107' : '#4CAF50'
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.progressValue}>
                        {formatPercentage(storageInfo.usagePercentage || 0)}
                      </Text>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Used</Text>
                        <Text style={styles.statValue}>
                          {formatNumber(storageInfo.currentUsageMB || 0)} MB
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total</Text>
                        <Text style={styles.statValue}>
                          {formatNumber(storageInfo.quotaMB || 0)} MB
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Free</Text>
                        <Text style={styles.statValue}>
                          {formatNumber((storageInfo.quotaMB || 0) - (storageInfo.currentUsageMB || 0))} MB
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Storage Details Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Storage Details</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reserved for Offline</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(storageInfo.reservedForOfflineMB || 0)} MB
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Compression Savings</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(storageInfo.compressionSavingsMB || 0)} MB
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Priority Items</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(storageInfo.priorityItemCount || 0)} items
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Last Optimization</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(storageInfo.lastOptimizationTime)}
                      </Text>
                    </View>

                    {/* Optimize Storage Button */}
                    <TouchableOpacity
                      style={[styles.syncButton, isOptimizing && styles.syncingButton]}
                      onPress={() => {
                        if (isOptimizing) return;
                        setIsOptimizing(true);
                        onOptimizeStorage()
                          .then(() => setIsOptimizing(false))
                          .catch(() => setIsOptimizing(false));
                      }}
                      disabled={isOptimizing}
                    >
                      {isOptimizing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <MaterialIcons name="storage" size={20} color="#FFFFFF" />
                      )}
                      <Text style={styles.syncButtonText}>
                        {isOptimizing ? 'Optimizing...' : 'Optimize Storage'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Storage Categories Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Storage Categories</Text>

                    {(storageInfo.categories || []).length > 0 ? (
                      (storageInfo.categories || []).map((category, index) => (
                        <View key={index} style={styles.detailRow}>
                          <Text style={styles.detailLabel}>{category.name}</Text>
                          <Text style={styles.detailValue}>
                            {formatNumber(category.sizeMB || 0)} MB
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No category information available</Text>
                    )}
                  </View>
                </>
              )}

              {/* Sync Tab Content */}
              {activeTab === 'sync' && (
                <>
                  {/* Sync Sub-Tab Navigation */}
                  <View style={styles.subTabContainer}>
                    <TouchableOpacity
                      style={[styles.subTab, activeSyncSubTab === 'status' && styles.activeSubTab]}
                      onPress={() => setActiveSyncSubTab('status')}
                    >
                      <Text style={[styles.subTabText, activeSyncSubTab === 'status' && styles.activeSubTabText]}>
                        Status
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subTab, activeSyncSubTab === 'history' && styles.activeSubTab]}
                      onPress={() => setActiveSyncSubTab('history')}
                    >
                      <Text style={[styles.subTabText, activeSyncSubTab === 'history' && styles.activeSubTabText]}>
                        History
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subTab, activeSyncSubTab === 'conflicts' && styles.activeSubTab]}
                      onPress={() => setActiveSyncSubTab('conflicts')}
                    >
                      <Text style={[styles.subTabText, activeSyncSubTab === 'conflicts' && styles.activeSubTabText]}>
                        Conflicts
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subTab, activeSyncSubTab === 'settings' && styles.activeSubTab]}
                      onPress={() => setActiveSyncSubTab('settings')}
                    >
                      <Text style={[styles.subTabText, activeSyncSubTab === 'settings' && styles.activeSubTabText]}>
                        Settings
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sync Status Sub-Tab Content */}
                  {activeSyncSubTab === 'status' && (
                    <>
                      {/* Sync Status Section */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sync Status</Text>
                        <View style={styles.healthIndicator}>
                          <Animated.View style={{ transform: [{ rotate: spin }] }}>
                            <MaterialIcons
                              name="sync"
                              size={40}
                              color={
                                syncStatus?.lastSyncStatus === 'success' ? '#4CAF50' :
                                syncStatus?.lastSyncStatus === 'partial' ? '#FFC107' : '#F44336'
                              }
                            />
                          </Animated.View>
                          <Text style={[
                            styles.healthText,
                            {
                              color:
                                syncStatus?.lastSyncStatus === 'success' ? '#4CAF50' :
                                syncStatus?.lastSyncStatus === 'partial' ? '#FFC107' : '#F44336'
                            }
                          ]}>
                            {syncStatus?.lastSyncStatus === 'success' ? 'Synced' :
                             syncStatus?.lastSyncStatus === 'partial' ? 'Partially Synced' :
                             syncStatus?.lastSyncStatus === 'failed' ? 'Sync Failed' : 'Never Synced'}
                          </Text>
                          <Text style={styles.healthScore}>
                            Last Sync: {formatDate(syncStatus?.lastSyncTime)}
                          </Text>
                        </View>

                        {/* Sync Stats */}
                        <View style={styles.statsRow}>
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Queue Size</Text>
                            <Text style={styles.statValue}>
                              {formatNumber(syncStatus?.queueSize || 0)}
                            </Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Success Rate</Text>
                            <Text style={styles.statValue}>
                              {formatPercentage((syncStatus?.successRate || 0) * 100)}
                            </Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Auto-Sync</Text>
                            <Switch
                              value={autoSyncEnabled}
                              onValueChange={handleAutoSyncToggle}
                              trackColor={{ false: "#767577", true: "#81b0ff" }}
                              thumbColor={autoSyncEnabled ? "#2196F3" : "#f4f3f4"}
                            />
                          </View>
                        </View>

                        {/* Sync Details */}
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Sync Interval</Text>
                          <Text style={styles.detailValue}>
                            {formatNumber(syncStatus?.syncInterval / 60000 || 0)} minutes
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Items Synced</Text>
                          <Text style={styles.detailValue}>
                            {formatNumber(syncStatus?.itemsSynced || 0)}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Conflicts</Text>
                          <Text style={styles.detailValue}>
                            {formatNumber(syncStatus?.conflicts || 0)}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Next Sync</Text>
                          <Text style={styles.detailValue}>
                            {syncStatus?.nextSyncTime ? formatDate(syncStatus.nextSyncTime) : 'Not scheduled'}
                          </Text>
                        </View>

                        {/* Manual Sync Button */}
                        <TouchableOpacity
                          style={[styles.syncButton, isSyncing && styles.syncingButton]}
                          onPress={() => {
                            if (isSyncing) return;
                            setIsSyncing(true);
                            onManualSync()
                              .then(() => setIsSyncing(false))
                              .catch(() => setIsSyncing(false));
                          }}
                          disabled={isSyncing}
                        >
                          {isSyncing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <MaterialIcons name="sync" size={20} color="#FFFFFF" />
                          )}
                          <Text style={styles.syncButtonText}>
                            {isSyncing ? 'Syncing...' : 'Manual Sync'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Sync History Sub-Tab Content */}
                  {activeSyncSubTab === 'history' && (
                    <>
                      {/* Sync History Section */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sync History</Text>

                        {/* Time Range Selector */}
                        <View style={styles.timeRangeSelector}>
                          <TouchableOpacity
                            style={[styles.timeRangeButton, chartTimeRange === 'day' && styles.activeTimeRange]}
                            onPress={() => setChartTimeRange('day')}
                          >
                            <Text style={[styles.timeRangeText, chartTimeRange === 'day' && styles.activeTimeRangeText]}>
                              Day
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.timeRangeButton, chartTimeRange === 'week' && styles.activeTimeRange]}
                            onPress={() => setChartTimeRange('week')}
                          >
                            <Text style={[styles.timeRangeText, chartTimeRange === 'week' && styles.activeTimeRangeText]}>
                              Week
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.timeRangeButton, chartTimeRange === 'month' && styles.activeTimeRange]}
                            onPress={() => setChartTimeRange('month')}
                          >
                            <Text style={[styles.timeRangeText, chartTimeRange === 'month' && styles.activeTimeRangeText]}>
                              Month
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Sync History Chart */}
                        <View style={styles.chartContainer}>
                          <Text style={styles.chartTitle}>Sync Success Rate</Text>
                          {syncHistory && syncHistory.length > 0 ? (
                            <LineChart
                              data={{
                                labels: syncHistory.slice(-6).map(item => item.label || ''),
                                datasets: [{
                                  data: syncHistory.slice(-6).map(item => item.successRate * 100 || 0)
                                }]
                              }}
                              width={screenWidth}
                              height={180}
                              chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                style: {
                                  borderRadius: 16
                                }
                              }}
                              bezier
                              style={styles.chart}
                            />
                          ) : (
                            <Text style={styles.emptyText}>No sync history available</Text>
                          )}
                        </View>

                        {/* Recent Syncs */}
                        <Text style={styles.subsectionTitle}>Recent Syncs</Text>
                        {(syncHistory || []).length > 0 ? (
                          (syncHistory || []).slice(0, 5).map((sync, index) => (
                            <View key={index} style={styles.syncHistoryItem}>
                              <View style={styles.syncHistoryHeader}>
                                <Text style={styles.syncHistoryTime}>
                                  {formatDate(sync.timestamp)}
                                </Text>
                                <View style={[
                                  styles.statusBadge,
                                  {
                                    backgroundColor:
                                      sync.status === 'success' ? '#4CAF50' :
                                      sync.status === 'partial' ? '#FFC107' : '#F44336'
                                  }
                                ]}>
                                  <Text style={styles.statusText}>
                                    {sync.status}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.syncHistoryDetails}>
                                <Text style={styles.syncHistoryDetail}>
                                  Items: {formatNumber(sync.itemCount || 0)}
                                </Text>
                                <Text style={styles.syncHistoryDetail}>
                                  Duration: {formatNumber(sync.durationMs / 1000 || 0)}s
                                </Text>
                                <Text style={styles.syncHistoryDetail}>
                                  Type: {sync.type || 'manual'}
                                </Text>
                              </View>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyText}>No recent syncs</Text>
                        )}
                      </View>
                    </>
                  )}

                  {/* Conflicts Sub-Tab Content */}
                  {activeSyncSubTab === 'conflicts' && (
                    <>
                      {/* Conflicts Section */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sync Conflicts</Text>

                        {(syncStatus?.conflicts || []).length > 0 ? (
                          (syncStatus?.conflicts || []).map((conflict, index) => (
                            <View key={index} style={styles.conflictItem}>
                              <View style={styles.conflictHeader}>
                                <Text style={styles.conflictTitle}>
                                  {conflict.itemType || 'Unknown'} Conflict
                                </Text>
                                <Text style={styles.conflictTime}>
                                  {formatDate(conflict.timestamp)}
                                </Text>
                              </View>
                              <Text style={styles.conflictDescription}>
                                {conflict.description || 'No description available'}
                              </Text>
                              <View style={styles.conflictActions}>
                                <TouchableOpacity
                                  style={[styles.conflictAction, styles.useLocalButton]}
                                  onPress={() => {/* Handle use local */}}
                                >
                                  <Text style={styles.conflictActionText}>Use Local</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.conflictAction, styles.useRemoteButton]}
                                  onPress={() => {/* Handle use remote */}}
                                >
                                  <Text style={styles.conflictActionText}>Use Remote</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.conflictAction, styles.mergeButton]}
                                  onPress={() => {/* Handle merge */}}
                                >
                                  <Text style={styles.conflictActionText}>Merge</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyText}>No conflicts detected</Text>
                        )}
                      </View>
                    </>
                  )}

                  {/* Settings Sub-Tab Content */}
                  {activeSyncSubTab === 'settings' && (
                    <>
                      {/* Sync Settings Section */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sync Settings</Text>

                        <View style={styles.settingRow}>
                          <Text style={styles.settingLabel}>Auto-Sync</Text>
                          <Switch
                            value={autoSyncEnabled}
                            onValueChange={handleAutoSyncToggle}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={autoSyncEnabled ? "#2196F3" : "#f4f3f4"}
                          />
                        </View>

                        <View style={styles.settingRow}>
                          <Text style={styles.settingLabel}>Adaptive Scheduling</Text>
                          <Switch
                            value={syncStatus?.adaptiveScheduling || false}
                            onValueChange={(value) => {/* Handle toggle */}}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={syncStatus?.adaptiveScheduling ? "#2196F3" : "#f4f3f4"}
                          />
                        </View>

                        <View style={styles.settingRow}>
                          <Text style={styles.settingLabel}>Network-Aware Sync</Text>
                          <Switch
                            value={syncStatus?.networkAware || false}
                            onValueChange={(value) => {/* Handle toggle */}}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={syncStatus?.networkAware ? "#2196F3" : "#f4f3f4"}
                          />
                        </View>

                        <View style={styles.settingRow}>
                          <Text style={styles.settingLabel}>Storage Optimization</Text>
                          <Switch
                            value={syncStatus?.storageOptimization || false}
                            onValueChange={(value) => {/* Handle toggle */}}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={syncStatus?.storageOptimization ? "#2196F3" : "#f4f3f4"}
                          />
                        </View>

                        <View style={styles.settingRow}>
                          <Text style={styles.settingLabel}>Conflict Resolution</Text>
                          <Text style={styles.settingValue}>
                            {syncStatus?.conflictResolution?.strategy || 'smart'}
                          </Text>
                        </View>

                        <View style={styles.settingRow}>
                          <Text style={styles.settingLabel}>Sync Interval</Text>
                          <Text style={styles.settingValue}>
                            {formatNumber(syncStatus?.syncInterval / 60000 || 0)} minutes
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Performance Tab Content */}
              {activeTab === 'performance' && (
                <>
                  {/* Performance Overview Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Performance Overview</Text>

                    <View style={styles.healthIndicator}>
                      <MaterialCommunityIcons
                        name="speedometer"
                        size={40}
                        color={
                          devicePerformance?.overallScore > 80 ? '#4CAF50' :
                          devicePerformance?.overallScore > 50 ? '#FFC107' : '#F44336'
                        }
                      />
                      <Text style={[
                        styles.healthText,
                        {
                          color:
                            devicePerformance?.overallScore > 80 ? '#4CAF50' :
                            devicePerformance?.overallScore > 50 ? '#FFC107' : '#F44336'
                        }
                      ]}>
                        {devicePerformance?.overallScore > 80 ? 'Excellent' :
                         devicePerformance?.overallScore > 50 ? 'Good' : 'Poor'}
                      </Text>
                      <Text style={styles.healthScore}>
                        Score: {formatNumber(devicePerformance?.overallScore || 0)}/100
                      </Text>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>CPU</Text>
                        <Text style={styles.statValue}>
                          {formatPercentage(devicePerformance?.cpuUsage || 0)}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Memory</Text>
                        <Text style={styles.statValue}>
                          {formatPercentage(devicePerformance?.memoryUsage || 0)}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Battery</Text>
                        <Text style={styles.statValue}>
                          {formatPercentage(devicePerformance?.batteryLevel || 0)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Resource Usage Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resource Usage</Text>

                    {/* Time Range Selector */}
                    <View style={styles.timeRangeSelector}>
                      <TouchableOpacity
                        style={[styles.timeRangeButton, chartTimeRange === 'day' && styles.activeTimeRange]}
                        onPress={() => setChartTimeRange('day')}
                      >
                        <Text style={[styles.timeRangeText, chartTimeRange === 'day' && styles.activeTimeRangeText]}>
                          Day
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.timeRangeButton, chartTimeRange === 'week' && styles.activeTimeRange]}
                        onPress={() => setChartTimeRange('week')}
                      >
                        <Text style={[styles.timeRangeText, chartTimeRange === 'week' && styles.activeTimeRangeText]}>
                          Week
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.timeRangeButton, chartTimeRange === 'month' && styles.activeTimeRange]}
                        onPress={() => setChartTimeRange('month')}
                      >
                        <Text style={[styles.timeRangeText, chartTimeRange === 'month' && styles.activeTimeRangeText]}>
                          Month
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* CPU Usage Chart */}
                    <View style={styles.chartContainer}>
                      <Text style={styles.chartTitle}>CPU Usage</Text>
                      {devicePerformance?.cpuHistory && devicePerformance.cpuHistory.length > 0 ? (
                        <LineChart
                          data={{
                            labels: devicePerformance.cpuHistory.slice(-6).map(item => item.label || ''),
                            datasets: [{
                              data: devicePerformance.cpuHistory.slice(-6).map(item => item.value * 100 || 0)
                            }]
                          }}
                          width={screenWidth}
                          height={180}
                          chartConfig={{
                            backgroundColor: '#ffffff',
                            backgroundGradientFrom: '#ffffff',
                            backgroundGradientTo: '#ffffff',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            style: {
                              borderRadius: 16
                            }
                          }}
                          bezier
                          style={styles.chart}
                        />
                      ) : (
                        <Text style={styles.emptyText}>No CPU usage data available</Text>
                      )}
                    </View>

                    {/* Memory Usage Chart */}
                    <View style={styles.chartContainer}>
                      <Text style={styles.chartTitle}>Memory Usage</Text>
                      {devicePerformance?.memoryHistory && devicePerformance.memoryHistory.length > 0 ? (
                        <LineChart
                          data={{
                            labels: devicePerformance.memoryHistory.slice(-6).map(item => item.label || ''),
                            datasets: [{
                              data: devicePerformance.memoryHistory.slice(-6).map(item => item.value * 100 || 0)
                            }]
                          }}
                          width={screenWidth}
                          height={180}
                          chartConfig={{
                            backgroundColor: '#ffffff',
                            backgroundGradientFrom: '#ffffff',
                            backgroundGradientTo: '#ffffff',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            style: {
                              borderRadius: 16
                            }
                          }}
                          bezier
                          style={styles.chart}
                        />
                      ) : (
                        <Text style={styles.emptyText}>No memory usage data available</Text>
                      )}
                    </View>
                  </View>

                  {/* Network Performance Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Network Performance</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Connection Type</Text>
                      <Text style={styles.detailValue}>
                        {devicePerformance?.connectionType || 'Unknown'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Signal Strength</Text>
                      <Text style={styles.detailValue}>
                        {formatPercentage(devicePerformance?.signalStrength || 0)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Latency</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(devicePerformance?.latencyMs || 0)} ms
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Download Speed</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(devicePerformance?.downloadSpeedMbps || 0)} Mbps
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Upload Speed</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(devicePerformance?.uploadSpeedMbps || 0)} Mbps
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Connection Stability</Text>
                      <Text style={styles.detailValue}>
                        {formatPercentage(devicePerformance?.connectionStability || 0)}
                      </Text>
                    </View>
                  </View>

                  {/* Battery Performance Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Battery Performance</Text>

                    <View style={styles.progressBarContainer}>
                      <Text style={styles.progressLabel}>Battery Level</Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${devicePerformance?.batteryLevel || 0}%`,
                              backgroundColor:
                                (devicePerformance?.batteryLevel || 0) > 50 ? '#4CAF50' :
                                (devicePerformance?.batteryLevel || 0) > 20 ? '#FFC107' : '#F44336'
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.progressValue}>
                        {formatPercentage(devicePerformance?.batteryLevel || 0)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Battery Status</Text>
                      <Text style={styles.detailValue}>
                        {devicePerformance?.batteryCharging ? 'Charging' : 'Discharging'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Battery Temperature</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(devicePerformance?.batteryTemperature || 0)}°C
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>App Battery Usage</Text>
                      <Text style={styles.detailValue}>
                        {formatPercentage(devicePerformance?.appBatteryUsage || 0)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Estimated Runtime</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(devicePerformance?.estimatedRuntimeMinutes / 60 || 0)} hours
                      </Text>
                    </View>
                  </View>
                </>
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 4
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 28
  },
  icon: {
    marginRight: 4
  },
  secondaryIcon: {
    marginLeft: 4
  },
  text: {
    fontSize: 12,
    fontWeight: '600'
  },
  offlineRiskIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeButton: {
    padding: 4
  },
  modalScrollView: {
    maxHeight: '80%'
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#F9F9F9'
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3'
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    marginLeft: 4
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold'
  },

  // Sub-Tab Navigation
  subTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  activeSubTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3'
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666'
  },
  activeSubTabText: {
    color: '#2196F3',
    fontWeight: 'bold'
  },

  // Sections
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8
  },
  healthIndicator: {
    alignItems: 'center',
    marginBottom: 16
  },
  healthText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8
  },
  healthScore: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4
  },

  // Progress Bars
  progressBarContainer: {
    marginBottom: 16
  },
  progressLabel: {
    fontSize: 14,
    marginBottom: 4
  },
  progressBar: {
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%'
  },
  progressValue: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textAlign: 'right'
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold'
  },

  // Details
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500'
  },

  // Actions
  actionsSection: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center'
  },
  warningButton: {
    backgroundColor: '#F44336'
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8
  },

  // Sync Button
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingVertical: 10,
    marginTop: 16
  },
  syncingButton: {
    backgroundColor: '#64B5F6'
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8
  },

  // Confirmation Dialog
  confirmationBox: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    marginTop: 16,
    borderRadius: 4
  },
  confirmationText: {
    fontSize: 14,
    marginBottom: 16
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8
  },
  cancelButton: {
    backgroundColor: '#9E9E9E'
  },
  confirmDeleteButton: {
    backgroundColor: '#F44336'
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },

  // ML Predictions
  predictionItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
    position: 'relative'
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  predictionTitle: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  predictionScore: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  predictionContext: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4
  },
  predictionReason: {
    fontSize: 12,
    color: '#666666'
  },
  priorityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },

  // ML Models
  modelItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modelTitle: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  modelType: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8
  },
  modelStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  modelStat: {
    flex: 1,
    alignItems: 'center'
  },
  modelStatLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2
  },
  modelStatValue: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  modelConfigButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    paddingVertical: 6
  },
  enableButton: {
    backgroundColor: '#4CAF50'
  },
  disableButton: {
    backgroundColor: '#F44336'
  },
  modelConfigButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12
  },

  // Charts
  chartContainer: {
    marginVertical: 16,
    alignItems: 'center'
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
  },
  chart: {
    borderRadius: 8
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#EEEEEE'
  },
  activeTimeRange: {
    backgroundColor: '#2196F3'
  },
  timeRangeText: {
    fontSize: 12,
    color: '#666666'
  },
  activeTimeRangeText: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },

  // Sync History
  syncHistoryItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8
  },
  syncHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  syncHistoryTime: {
    fontSize: 12,
    color: '#666666'
  },
  syncHistoryDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  syncHistoryDetail: {
    fontSize: 12,
    color: '#333333',
    marginRight: 12
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },

  // Conflict Resolution
  conflictItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  conflictTitle: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  conflictTime: {
    fontSize: 12,
    color: '#666666'
  },
  conflictDescription: {
    fontSize: 12,
    color: '#333333',
    marginBottom: 12
  },
  conflictActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  conflictAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 4
  },
  useLocalButton: {
    backgroundColor: '#2196F3'
  },
  useRemoteButton: {
    backgroundColor: '#FF9800'
  },
  mergeButton: {
    backgroundColor: '#4CAF50'
  },
  conflictActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },

  // Settings
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  settingLabel: {
    fontSize: 14,
    color: '#333333'
  },
  settingValue: {
    fontSize: 14,
    color: '#666666'
  },

  // Empty States
  emptyText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16
  }
});

CachingStatusIndicator.propTypes = {
  cacheStats: PropTypes.object,
  offlineReadiness: PropTypes.number,
  offlineRisk: PropTypes.number,
  mlPredictions: PropTypes.object,
  mlPerformance: PropTypes.object,
  mlPerformanceHistory: PropTypes.array,
  storageInfo: PropTypes.object,
  syncStatus: PropTypes.object,
  syncHistory: PropTypes.array,
  devicePerformance: PropTypes.object,
  onManualSync: PropTypes.func,
  onPrepareOffline: PropTypes.func,
  onClearCache: PropTypes.func,
  onRefreshCache: PropTypes.func,
  onOptimizeStorage: PropTypes.func,
  onTrainModels: PropTypes.func,
  onToggleAutoSync: PropTypes.func,
  onConfigureModels: PropTypes.func,
  style: PropTypes.object
};

export default CachingStatusIndicator;
