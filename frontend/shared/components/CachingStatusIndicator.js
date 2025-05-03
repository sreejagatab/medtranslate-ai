/**
 * CachingStatusIndicator Component for MedTranslate AI
 * 
 * This component displays the current status of the predictive caching system,
 * including cache health, prediction confidence, and offline readiness.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ProgressBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * CachingStatusIndicator component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.cacheStats - Cache statistics
 * @param {number} props.offlineReadiness - Offline readiness percentage (0-100)
 * @param {number} props.offlineRisk - Risk of going offline (0-1)
 * @param {Object} props.style - Custom styles
 * @returns {JSX.Element} CachingStatusIndicator component
 */
const CachingStatusIndicator = ({ 
  cacheStats = {}, 
  offlineReadiness = 0, 
  offlineRisk = 0,
  style = {} 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  
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
  
  return (
    <View style={[styles.container, style.container]}>
      <TouchableOpacity 
        style={[styles.indicator, { borderColor: getCacheHealthColor() }, style.indicator]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons 
          name={getCacheIcon()} 
          size={16} 
          color={getCacheHealthColor()} 
          style={styles.icon} 
        />
        <Text style={[styles.text, { color: getCacheHealthColor() }, style.text]}>
          {getCacheStatusText()}
        </Text>
        
        {offlineRisk > 0.5 && (
          <View style={[styles.offlineRiskIndicator, { backgroundColor: getOfflineRiskColor() }]} />
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
              <Text style={styles.modalTitle}>Cache Status</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
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
                </View>
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
              </View>
              
              {/* Actions Section */}
              <View style={styles.actionsSection}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Refresh Cache</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionButton, styles.warningButton]}>
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Clear Cache</Text>
                </TouchableOpacity>
              </View>
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
  }
});

CachingStatusIndicator.propTypes = {
  cacheStats: PropTypes.object,
  offlineReadiness: PropTypes.number,
  offlineRisk: PropTypes.number,
  style: PropTypes.object
};

export default CachingStatusIndicator;
