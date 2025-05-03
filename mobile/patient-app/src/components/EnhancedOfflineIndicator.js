/**
 * Enhanced Offline Indicator Component for MedTranslate AI Patient App
 * 
 * Displays an indicator when the app is offline with enhanced information
 * about offline readiness and predictive caching status
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
  ScrollView
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

class EnhancedOfflineIndicator extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modalVisible: false
    };
    this.pulseAnimation = new Animated.Value(1);
  }
  
  componentDidMount() {
    this.startPulseAnimation();
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
  
  render() {
    const { isOffline, offlineReadiness, offlineRisk, cacheStats, style } = this.props;
    const { modalVisible } = this.state;
    
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
              
              <ScrollView style={styles.modalScrollView}>
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
                  </View>
                  
                  {cacheStats && (
                    <View style={styles.cacheStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Cached Items</Text>
                        <Text style={styles.statValue}>
                          {cacheStats.sizes?.total || 0}
                        </Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Priority Items</Text>
                        <Text style={styles.statValue}>
                          {cacheStats.offlinePriorityItems?.total || 0}
                        </Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Hit Rate</Text>
                        <Text style={styles.statValue}>
                          {this.formatPercentage((cacheStats.hitRate?.total || 0) * 100)}
                        </Text>
                      </View>
                    </View>
                  )}
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
                      style={styles.actionButton}
                      onPress={this.props.onPrepareForOffline}
                    >
                      <Ionicons name="cloud-download" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Prepare for Offline</Text>
                    </TouchableOpacity>
                  )}
                  
                  {isOffline && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.secondaryButton]}
                      onPress={this.props.onCheckConnection}
                    >
                      <Ionicons name="refresh" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Check Connection</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
  statusIndicator: {
    alignItems: 'center',
    marginBottom: 16
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8
  },
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
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8
  }
});

EnhancedOfflineIndicator.propTypes = {
  isOffline: PropTypes.bool.isRequired,
  offlineReadiness: PropTypes.number,
  offlineRisk: PropTypes.number,
  cacheStats: PropTypes.object,
  style: PropTypes.object,
  onPrepareForOffline: PropTypes.func,
  onCheckConnection: PropTypes.func
};

EnhancedOfflineIndicator.defaultProps = {
  offlineReadiness: 0,
  offlineRisk: 0,
  cacheStats: null,
  style: {},
  onPrepareForOffline: () => {},
  onCheckConnection: () => {}
};

export default EnhancedOfflineIndicator;
