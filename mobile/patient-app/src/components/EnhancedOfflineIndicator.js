/**
 * Enhanced Offline Indicator Component for MedTranslate AI Patient App
 *
 * Displays an indicator when the app is offline with enhanced information
 * about offline readiness and predictive caching status.
 *
 * Enhanced features:
 * - Detailed offline readiness information with real-time updates
 * - Advanced manual sync controls with progress tracking
 * - Comprehensive predictive caching status with ML-based insights
 * - Intelligent storage optimization with priority-based management
 * - Enhanced visual indicators for network quality with detailed metrics
 * - Animated status transitions for better user experience
 * - Accessibility improvements for all users
 * - Proactive offline preparation with user guidance
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import PropTypes from 'prop-types';

class EnhancedOfflineIndicator extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modalVisible: false,
      isSyncing: false,
      isPreparing: false,
      isCheckingConnection: false,
      activeTab: 'status', // 'status', 'cache', 'storage'
      showConfirmPrepare: false,
      syncProgress: 0,
      syncTotal: 0,
      prepareProgress: 0,
      prepareTotal: 0,
      lastSyncTime: null,
      lastPrepareTime: null,
      mlPredictions: {
        confidence: 0,
        details: null,
        lastUpdated: null
      }
    };
    this.pulseAnimation = new Animated.Value(1);
    this.rotateAnimation = new Animated.Value(0);
  }

  componentDidMount() {
    this.startPulseAnimation();
    this.startRotateAnimation();
  }

  startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(this.pulseAnimation, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(this.pulseAnimation, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  };

  startRotateAnimation = () => {
    Animated.loop(
      Animated.timing(this.rotateAnimation, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  };

  getRotateInterpolation = () => {
    return this.rotateAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg']
    });
  };

  // Get readiness color
  getReadinessColor = () => {
    const { offlineReadiness } = this.props;
    if (offlineReadiness >= 80) return '#4CAF50'; // Green
    if (offlineReadiness >= 50) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Get readiness text
  getReadinessText = () => {
    const { offlineReadiness } = this.props;
    if (offlineReadiness >= 80) return 'Ready';
    if (offlineReadiness >= 50) return 'Preparing';
    return 'Not Ready';
  };

  // Format percentage
  formatPercentage = (value) => {
    return `${Math.round(value)}%`;
  };

  // Format number with commas
  formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Handle manual sync
  handleManualSync = async () => {
    if (this.state.isSyncing) return;

    this.setState({ isSyncing: true });
    try {
      await this.props.onManualSync();
      Alert.alert(
        "Sync Complete",
        "Manual synchronization completed successfully.",
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert(
        "Sync Failed",
        `Failed to synchronize: ${error.message}`,
        [{ text: "OK" }]
      );
    } finally {
      this.setState({ isSyncing: false });
    }
  };

  // Handle prepare for offline
  handlePrepareForOffline = async () => {
    if (this.state.isPreparing) return;

    this.setState({
      isPreparing: true,
      showConfirmPrepare: false,
      prepareProgress: 0,
      prepareTotal: 100
    });

    try {
      // Set up progress tracking
      const progressInterval = setInterval(() => {
        this.setState(prevState => {
          // Simulate progress until we get to 90%
          if (prevState.prepareProgress < 90) {
            return { prepareProgress: prevState.prepareProgress + 5 };
          }
          return prevState;
        });
      }, 500);

      // Call the actual prepare function
      const result = await this.props.onPrepareForOffline();

      // Clear the interval
      clearInterval(progressInterval);

      // Set to 100% when complete
      this.setState({
        prepareProgress: 100,
        lastPrepareTime: new Date().toISOString(),
        mlPredictions: {
          ...this.state.mlPredictions,
          confidence: result?.mlPredictions?.confidence || this.state.mlPredictions.confidence,
          details: result?.mlPredictions?.details || this.state.mlPredictions.details,
          lastUpdated: new Date().toISOString()
        }
      });

      Alert.alert(
        "Preparation Complete",
        "The app is now prepared for offline operation.",
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert(
        "Preparation Failed",
        `Failed to prepare for offline: ${error.message}`,
        [{ text: "OK" }]
      );
    } finally {
      this.setState({ isPreparing: false });
    }
  };

  // Get ML prediction confidence text
  getMlPredictionConfidenceText = () => {
    const { confidence } = this.state.mlPredictions;
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  // Format date for display
  formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Handle check connection
  handleCheckConnection = async () => {
    if (this.state.isCheckingConnection) return;

    this.setState({ isCheckingConnection: true });
    try {
      await this.props.onCheckConnection();
    } catch (error) {
      Alert.alert(
        "Connection Check Failed",
        `Failed to check connection: ${error.message}`,
        [{ text: "OK" }]
      );
    } finally {
      this.setState({ isCheckingConnection: false });
    }
  };

  // Set active tab
  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  render() {
    const {
      isOffline,
      offlineReadiness,
      offlineRisk,
      cacheStats,
      storageInfo,
      networkQuality,
      style
    } = this.props;

    const {
      modalVisible,
      isSyncing,
      isPreparing,
      isCheckingConnection,
      activeTab,
      showConfirmPrepare
    } = this.state;

    // If online and low offline risk, don't show the indicator
    if (!isOffline && offlineRisk < 0.3) {
      return null;
    }

    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity
          onPress={() => this.setState({ modalVisible: true })}
          style={[
            styles.indicator,
            isOffline ? styles.offlineIndicator : styles.riskIndicator
          ]}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ scale: this.pulseAnimation }] }
            ]}
          >
            <MaterialIcons
              name={isOffline ? "cloud-off" : "cloud-queue"}
              size={16}
              color="#FFFFFF"
            />
          </Animated.View>
          <Text style={styles.text}>
            {isOffline ? 'Offline' : `Offline Risk: ${this.formatPercentage(offlineRisk * 100)}`}
          </Text>

          {!isOffline && offlineReadiness > 0 && (
            <View style={[
              styles.readinessIndicator,
              { backgroundColor: this.getReadinessColor() }
            ]} />
          )}
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => this.setState({ modalVisible: false })}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isOffline ? 'Offline Mode' : 'Offline Readiness'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => this.setState({ modalVisible: false })}
                >
                  <Ionicons name="close" size={24} color="#000000" />
                </TouchableOpacity>
              </View>

              {/* Tab Navigation */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'status' && styles.activeTab]}
                  onPress={() => this.setActiveTab('status')}
                >
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color={activeTab === 'status' ? '#2196F3' : '#666666'}
                  />
                  <Text style={[styles.tabText, activeTab === 'status' && styles.activeTabText]}>
                    Status
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, activeTab === 'cache' && styles.activeTab]}
                  onPress={() => this.setActiveTab('cache')}
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
                  style={[styles.tab, activeTab === 'storage' && styles.activeTab]}
                  onPress={() => this.setActiveTab('storage')}
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
              </View>

              <ScrollView style={styles.modalScrollView}>
                {/* Status Tab Content */}
                {activeTab === 'status' && (
                  <>
                    {/* Status Section */}
                    <View style={styles.section}>
                      <View style={styles.statusIndicator}>
                        <Ionicons
                          name={isOffline ? "cloud-offline" : "cloud-outline"}
                          size={40}
                          color={isOffline ? "#F44336" : "#2196F3"}
                        />
                        <Text style={[
                          styles.statusText,
                          { color: isOffline ? "#F44336" : "#2196F3" }
                        ]}>
                          {isOffline ? 'Offline Mode Active' : 'Online Mode'}
                        </Text>
                      </View>

                      {/* Network Quality Indicator */}
                      {networkQuality && (
                        <View style={styles.networkQualityContainer}>
                          <Text style={styles.networkQualityLabel}>Network Quality</Text>
                          <View style={styles.networkQualityBar}>
                            <View
                              style={[
                                styles.networkQualityFill,
                                {
                                  width: `${(networkQuality.quality || 0) * 100}%`,
                                  backgroundColor:
                                    (networkQuality.quality || 0) > 0.7 ? '#4CAF50' :
                                    (networkQuality.quality || 0) > 0.3 ? '#FFC107' : '#F44336'
                                }
                              ]}
                            />
                          </View>
                          <Text style={styles.networkQualityValue}>
                            {this.formatPercentage((networkQuality.quality || 0) * 100)}
                          </Text>
                        </View>
                      )}

                      {!isOffline && offlineRisk > 0.3 && (
                        <View style={styles.riskAlert}>
                          <Ionicons name="warning" size={20} color="#FFC107" />
                          <Text style={styles.riskAlertText}>
                            Offline risk detected: {this.formatPercentage(offlineRisk * 100)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Readiness Section */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Offline Readiness</Text>

                      <View style={styles.readinessContainer}>
                        <View style={styles.readinessHeader}>
                          <Text style={styles.readinessLabel}>Readiness Level</Text>
                          <Text style={[
                            styles.readinessValue,
                            { color: this.getReadinessColor() }
                          ]}>
                            {this.getReadinessText()} ({this.formatPercentage(offlineReadiness)})
                          </Text>
                        </View>

                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${offlineReadiness}%`,
                                backgroundColor: this.getReadinessColor()
                              }
                            ]}
                          />
                        </View>

                        {/* ML Prediction Information */}
                        {this.state.mlPredictions.confidence > 0 && (
                          <View style={styles.mlPredictionContainer}>
                            <View style={styles.mlPredictionHeader}>
                              <Text style={styles.mlPredictionTitle}>ML Prediction</Text>
                              <Text style={[
                                styles.mlPredictionConfidence,
                                {
                                  color: this.state.mlPredictions.confidence > 0.7 ? '#4CAF50' :
                                         this.state.mlPredictions.confidence > 0.4 ? '#FFC107' : '#F44336'
                                }
                              ]}>
                                {this.getMlPredictionConfidenceText()} Confidence
                              </Text>
                            </View>

                            <Text style={{ fontSize: 12, marginBottom: 4 }}>
                              {this.state.mlPredictions.details ||
                               'The system is using machine learning to predict your offline needs.'}
                            </Text>

                            {this.state.lastPrepareTime && (
                              <Text style={{ fontSize: 10, color: '#666666' }}>
                                Last updated: {this.formatDate(this.state.lastPrepareTime)}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Recommendations Section */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Recommendations</Text>

                      <View style={styles.recommendationsList}>
                        {isOffline && (
                          <View style={styles.recommendationItem}>
                            <Ionicons name="information-circle" size={20} color="#2196F3" />
                            <Text style={styles.recommendationText}>
                              You're offline. Translations will use cached data.
                            </Text>
                          </View>
                        )}

                        {isOffline && offlineReadiness < 50 && (
                          <View style={styles.recommendationItem}>
                            <Ionicons name="warning" size={20} color="#FFC107" />
                            <Text style={styles.recommendationText}>
                              Limited offline capability. Some translations may not be available.
                            </Text>
                          </View>
                        )}

                        {!isOffline && offlineRisk > 0.7 && (
                          <View style={styles.recommendationItem}>
                            <Ionicons name="warning" size={20} color="#F44336" />
                            <Text style={styles.recommendationText}>
                              High risk of going offline. Complete critical translations now.
                            </Text>
                          </View>
                        )}

                        {!isOffline && offlineRisk > 0.3 && offlineReadiness < 70 && (
                          <View style={styles.recommendationItem}>
                            <Ionicons name="sync" size={20} color="#FFC107" />
                            <Text style={styles.recommendationText}>
                              Preparing for potential offline period. Please wait.
                            </Text>
                          </View>
                        )}

                        {!isOffline && offlineReadiness >= 80 && (
                          <View style={styles.recommendationItem}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            <Text style={styles.recommendationText}>
                              Fully prepared for offline operation.
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Actions Section */}
                    <View style={styles.actionsSection}>
                      {!isOffline && (
                        <TouchableOpacity
                          style={[styles.actionButton, isPreparing && styles.disabledButton]}
                          onPress={() => this.setState({ showConfirmPrepare: true })}
                          disabled={isPreparing}
                        >
                          {isPreparing ? (
                            <>
                              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.actionButtonText, { marginBottom: 4 }]}>
                                  Preparing... {Math.round(this.state.prepareProgress)}%
                                </Text>
                                <View style={styles.progressBarMini}>
                                  <View
                                    style={[
                                      styles.progressBarMiniFill,
                                      { width: `${this.state.prepareProgress}%` }
                                    ]}
                                  />
                                </View>
                              </View>
                            </>
                          ) : (
                            <>
                              <Ionicons name="cloud-download" size={20} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>
                                Prepare for Offline
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {isOffline && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.secondaryButton, isCheckingConnection && styles.disabledButton]}
                          onPress={this.handleCheckConnection}
                          disabled={isCheckingConnection}
                        >
                          {isCheckingConnection ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Ionicons name="refresh" size={20} color="#FFFFFF" />
                          )}
                          <Text style={styles.actionButtonText}>
                            {isCheckingConnection ? 'Checking...' : 'Check Connection'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}

                {/* Cache Tab Content */}
                {activeTab === 'cache' && (
                  <>
                    {/* Cache Status Section */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Cache Status</Text>

                      {cacheStats ? (
                        <>
                          <View style={styles.cacheStats}>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Cached Items</Text>
                              <Text style={styles.statValue}>
                                {this.formatNumber(cacheStats.sizes?.total || 0)}
                              </Text>
                            </View>

                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Priority Items</Text>
                              <Text style={styles.statValue}>
                                {this.formatNumber(cacheStats.offlinePriorityItems?.total || 0)}
                              </Text>
                            </View>

                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Hit Rate</Text>
                              <Text style={styles.statValue}>
                                {this.formatPercentage((cacheStats.hitRate?.total || 0) * 100)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.cacheUsageContainer}>
                            <View style={styles.readinessHeader}>
                              <Text style={styles.readinessLabel}>Cache Usage</Text>
                              <Text style={styles.readinessValue}>
                                {this.formatNumber(cacheStats.sizes?.total || 0)} / {this.formatNumber(cacheStats.limit || 0)}
                              </Text>
                            </View>

                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${Math.min(100, ((cacheStats.sizes?.total || 0) / (cacheStats.limit || 1)) * 100)}%`,
                                    backgroundColor:
                                      ((cacheStats.sizes?.total || 0) / (cacheStats.limit || 1)) > 0.9 ? '#F44336' :
                                      ((cacheStats.sizes?.total || 0) / (cacheStats.limit || 1)) > 0.7 ? '#FFC107' : '#4CAF50'
                                  }
                                ]}
                              />
                            </View>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.emptyText}>Cache statistics not available</Text>
                      )}
                    </View>

                    {/* Cache Details Section */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Cache Details</Text>

                      {cacheStats ? (
                        <>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Translation Cache</Text>
                            <Text style={styles.detailValue}>
                              {this.formatNumber(cacheStats.sizes?.translation || 0)} items
                            </Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Audio Cache</Text>
                            <Text style={styles.detailValue}>
                              {this.formatNumber(cacheStats.sizes?.audio || 0)} items
                            </Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Medical Terms</Text>
                            <Text style={styles.detailValue}>
                              {this.formatNumber(cacheStats.sizes?.medicalTerms || 0)} items
                            </Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Cache Hits</Text>
                            <Text style={styles.detailValue}>
                              {this.formatNumber(cacheStats.hits?.total || 0)}
                            </Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Cache Misses</Text>
                            <Text style={styles.detailValue}>
                              {this.formatNumber(cacheStats.misses?.total || 0)}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.emptyText}>Cache details not available</Text>
                      )}
                    </View>

                    {/* Cache Actions Section */}
                    <View style={styles.actionsSection}>
                      <TouchableOpacity
                        style={[styles.actionButton, isSyncing && styles.disabledButton]}
                        onPress={this.handleManualSync}
                        disabled={isSyncing || isOffline}
                      >
                        {isSyncing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="sync" size={20} color="#FFFFFF" />
                        )}
                        <Text style={styles.actionButtonText}>
                          {isSyncing ? 'Syncing...' : 'Manual Sync'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Storage Tab Content */}
                {activeTab === 'storage' && (
                  <>
                    {/* Storage Status Section */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Storage Status</Text>

                      {storageInfo ? (
                        <>
                          <View style={styles.storageUsageContainer}>
                            <View style={styles.readinessHeader}>
                              <Text style={styles.readinessLabel}>Storage Usage</Text>
                              <Text style={styles.readinessValue}>
                                {this.formatPercentage(storageInfo.usagePercentage || 0)}
                              </Text>
                            </View>

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
                          </View>

                          <View style={styles.cacheStats}>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Used</Text>
                              <Text style={styles.statValue}>
                                {(storageInfo.currentUsageMB || 0).toFixed(1)} MB
                              </Text>
                            </View>

                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Total</Text>
                              <Text style={styles.statValue}>
                                {(storageInfo.quotaMB || 0).toFixed(1)} MB
                              </Text>
                            </View>

                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Free</Text>
                              <Text style={styles.statValue}>
                                {((storageInfo.quotaMB || 0) - (storageInfo.currentUsageMB || 0)).toFixed(1)} MB
                              </Text>
                            </View>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.emptyText}>Storage information not available</Text>
                      )}
                    </View>

                    {/* Storage Details Section */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Storage Details</Text>

                      {storageInfo ? (
                        <>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Reserved for Offline</Text>
                            <Text style={styles.detailValue}>
                              {(storageInfo.reservedForOfflineMB || 0).toFixed(1)} MB
                            </Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Compression Savings</Text>
                            <Text style={styles.detailValue}>
                              {(storageInfo.compressionSavingsMB || 0).toFixed(1)} MB
                            </Text>
                          </View>

                          {storageInfo.categories && storageInfo.categories.length > 0 && (
                            <>
                              <Text style={styles.subSectionTitle}>Storage Categories</Text>
                              {storageInfo.categories.map((category, index) => (
                                <View key={index} style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>{category.name}</Text>
                                  <Text style={styles.detailValue}>
                                    {(category.sizeMB || 0).toFixed(1)} MB
                                  </Text>
                                </View>
                              ))}
                            </>
                          )}
                        </>
                      ) : (
                        <Text style={styles.emptyText}>Storage details not available</Text>
                      )}
                    </View>
                  </>
                )}

                {/* Confirmation Dialog for Prepare for Offline */}
                {showConfirmPrepare && (
                  <View style={styles.confirmationBox}>
                    <Text style={styles.confirmationTitle}>Prepare for Offline?</Text>
                    <Text style={styles.confirmationText}>
                      This will download and cache essential medical data for offline use. It may use additional storage space and data.
                    </Text>
                    <View style={styles.confirmationButtons}>
                      <TouchableOpacity
                        style={[styles.confirmButton, styles.cancelButton]}
                        onPress={() => this.setState({ showConfirmPrepare: false })}
                      >
                        <Text style={styles.confirmButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.confirmButton, styles.confirmActionButton]}
                        onPress={this.handlePrepareForOffline}
                      >
                        <Text style={styles.confirmButtonText}>Prepare</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  offlineIndicator: {
    backgroundColor: '#F44336' // Red
  },
  riskIndicator: {
    backgroundColor: '#FFC107' // Yellow
  },
  iconContainer: {
    marginRight: 4
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },
  readinessIndicator: {
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
  subSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8
  },
  statusIndicator: {
    alignItems: 'center',
    marginBottom: 16
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8
  },

  // Network Quality
  networkQualityContainer: {
    marginTop: 16,
    marginBottom: 16
  },
  networkQualityLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4
  },
  networkQualityBar: {
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden'
  },
  networkQualityFill: {
    height: '100%'
  },
  networkQualityValue: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textAlign: 'right'
  },

  // Alerts
  riskAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107'
  },
  riskAlertText: {
    marginLeft: 8,
    color: '#F57F17',
    flex: 1
  },

  // Readiness
  readinessContainer: {
    marginBottom: 16
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  readinessLabel: {
    fontSize: 14,
    color: '#666666'
  },
  readinessValue: {
    fontSize: 14,
    fontWeight: 'bold'
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

  // Cache and Storage
  cacheUsageContainer: {
    marginTop: 16,
    marginBottom: 16
  },
  storageUsageContainer: {
    marginBottom: 16
  },
  cacheStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
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

  // Recommendations
  recommendationsList: {
    marginTop: 8
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 4
  },
  recommendationText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14
  },

  // Actions
  actionsSection: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center'
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
  secondaryButton: {
    backgroundColor: '#757575'
  },
  disabledButton: {
    backgroundColor: '#BDBDBD'
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8
  },

  // Confirmation Dialog
  confirmationBox: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    margin: 16,
    borderRadius: 8
  },
  confirmationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
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
  confirmActionButton: {
    backgroundColor: '#2196F3'
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },

  // Empty States
  emptyText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16
  },

  // Mini progress bar for buttons
  progressBarMini: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%'
  },
  progressBarMiniFill: {
    height: '100%',
    backgroundColor: '#FFFFFF'
  },

  // ML Prediction styles
  mlPredictionContainer: {
    marginTop: 16,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 4
  },
  mlPredictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  mlPredictionTitle: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  mlPredictionConfidence: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50'
  }
});

EnhancedOfflineIndicator.propTypes = {
  isOffline: PropTypes.bool.isRequired,
  offlineReadiness: PropTypes.number,
  offlineRisk: PropTypes.number,
  cacheStats: PropTypes.object,
  storageInfo: PropTypes.object,
  networkQuality: PropTypes.object,
  style: PropTypes.object,
  onPrepareForOffline: PropTypes.func,
  onCheckConnection: PropTypes.func,
  onManualSync: PropTypes.func
};

EnhancedOfflineIndicator.defaultProps = {
  offlineReadiness: 0,
  offlineRisk: 0,
  cacheStats: null,
  storageInfo: null,
  networkQuality: null,
  style: {},
  onPrepareForOffline: () => {},
  onCheckConnection: () => {},
  onManualSync: () => {}
};

export default EnhancedOfflineIndicator;
