/**
 * Performance Monitor Screen for MedTranslate AI
 * 
 * This screen displays performance metrics and allows optimizing
 * performance settings for the application.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import * as PerformanceMonitor from '../utils/performance-monitor';
import * as AnalyticsService from '../services/analytics-service';

export default function PerformanceMonitorScreen() {
  const navigation = useNavigation();
  
  // State
  const [metrics, setMetrics] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [optimizeAnimations, setOptimizeAnimations] = useState(true);
  const [optimizeImages, setOptimizeImages] = useState(true);
  const [reduceBgProcesses, setReduceBgProcesses] = useState(false);
  
  // Start/stop monitoring
  useEffect(() => {
    if (isMonitoring) {
      // Initialize performance monitoring
      PerformanceMonitor.initialize();
      
      // Set refresh interval
      const interval = setInterval(() => {
        setMetrics(PerformanceMonitor.getMetrics());
      }, 1000);
      
      setRefreshInterval(interval);
    } else {
      // Clear refresh interval
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isMonitoring]);
  
  // Handle toggle monitoring
  const handleToggleMonitoring = () => {
    setIsMonitoring(prev => !prev);
  };
  
  // Handle reset metrics
  const handleResetMetrics = () => {
    PerformanceMonitor.resetMetrics();
    setMetrics(PerformanceMonitor.getMetrics());
  };
  
  // Handle toggle optimize animations
  const handleToggleOptimizeAnimations = (value) => {
    setOptimizeAnimations(value);
    
    // Track setting change
    AnalyticsService.trackFeatureUsage('performance', 'toggle_optimize_animations', { value });
  };
  
  // Handle toggle optimize images
  const handleToggleOptimizeImages = (value) => {
    setOptimizeImages(value);
    
    // Track setting change
    AnalyticsService.trackFeatureUsage('performance', 'toggle_optimize_images', { value });
  };
  
  // Handle toggle reduce background processes
  const handleToggleReduceBgProcesses = (value) => {
    setReduceBgProcesses(value);
    
    // Track setting change
    AnalyticsService.trackFeatureUsage('performance', 'toggle_reduce_bg_processes', { value });
  };
  
  // Handle run stress test
  const handleRunStressTest = () => {
    Alert.alert(
      'Run Stress Test',
      'This will run a stress test to measure performance under load. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Run Test',
          onPress: runStressTest
        }
      ]
    );
  };
  
  // Run stress test
  const runStressTest = () => {
    // Reset metrics
    PerformanceMonitor.resetMetrics();
    
    // Start monitoring if not already
    if (!isMonitoring) {
      setIsMonitoring(true);
    }
    
    // Run stress test
    Alert.alert('Stress Test', 'Stress test started. This will take a few seconds...');
    
    // Simulate heavy load
    const startTime = performance.now();
    
    // Create many objects
    const objects = [];
    for (let i = 0; i < 10000; i++) {
      objects.push({ id: i, value: Math.random() });
    }
    
    // Sort objects
    objects.sort((a, b) => a.value - b.value);
    
    // Filter objects
    const filtered = objects.filter(obj => obj.value > 0.5);
    
    // Map objects
    const mapped = filtered.map(obj => ({ ...obj, doubled: obj.value * 2 }));
    
    // Reduce objects
    const sum = mapped.reduce((acc, obj) => acc + obj.doubled, 0);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Track stress test
    AnalyticsService.trackPerformance('stress_test', duration, {
      objectCount: objects.length,
      filteredCount: filtered.length,
      sum
    });
    
    // Show results
    Alert.alert('Stress Test', `Stress test completed in ${duration.toFixed(2)}ms`);
    
    // Update metrics
    setMetrics(PerformanceMonitor.getMetrics());
  };
  
  // Render metric item
  const renderMetricItem = (label, value, unit = 'ms', threshold = null) => {
    let statusColor = '#333333';
    
    if (threshold !== null) {
      statusColor = value > threshold ? '#F44336' : '#4CAF50';
    }
    
    return (
      <View style={styles.metricItem}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color: statusColor }]}>
          {typeof value === 'number' ? value.toFixed(2) : value} {unit}
        </Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Performance Monitor</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => Alert.alert(
            'Performance Monitor',
            'This screen allows you to monitor and optimize performance in the MedTranslate AI application.'
          )}
        >
          <Ionicons name="information-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Monitoring controls */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Monitoring</Text>
            
            <Switch
              value={isMonitoring}
              onValueChange={handleToggleMonitoring}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <Text style={styles.sectionDescription}>
            {isMonitoring
              ? 'Performance monitoring is active. Metrics will update every second.'
              : 'Enable performance monitoring to collect metrics.'}
          </Text>
          
          {isMonitoring && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetMetrics}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.resetButtonText}>Reset Metrics</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Performance metrics */}
        {isMonitoring && metrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            
            <View style={styles.metricsContainer}>
              <Text style={styles.metricsSubtitle}>Render Times</Text>
              
              {Object.keys(metrics.renderTimes).length > 0 ? (
                Object.keys(metrics.renderTimes).map(componentName => (
                  renderMetricItem(
                    componentName,
                    metrics.renderTimes[componentName],
                    'ms',
                    16
                  )
                ))
              ) : (
                <Text style={styles.emptyText}>No render metrics collected yet</Text>
              )}
              
              <Text style={styles.metricsSubtitle}>API Call Times</Text>
              
              {Object.keys(metrics.apiCallTimes).length > 0 ? (
                Object.keys(metrics.apiCallTimes).map(apiName => (
                  renderMetricItem(
                    apiName,
                    metrics.apiCallTimes[apiName],
                    'ms',
                    1000
                  )
                ))
              ) : (
                <Text style={styles.emptyText}>No API call metrics collected yet</Text>
              )}
              
              <Text style={styles.metricsSubtitle}>Translation Times</Text>
              
              {Object.keys(metrics.translationTimes).length > 0 ? (
                Object.keys(metrics.translationTimes).map(key => (
                  renderMetricItem(
                    key,
                    metrics.translationTimes[key],
                    'ms',
                    2000
                  )
                ))
              ) : (
                <Text style={styles.emptyText}>No translation metrics collected yet</Text>
              )}
              
              <Text style={styles.metricsSubtitle}>Other Metrics</Text>
              
              {renderMetricItem('Frame Drops', metrics.frameDrops, '', 5)}
              {renderMetricItem('Memory Warnings', metrics.memoryWarnings, '', 1)}
            </View>
          </View>
        )}
        
        {/* Performance optimization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Optimization</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Optimize Animations</Text>
              <Text style={styles.settingDescription}>
                Simplify animations on low-end devices
              </Text>
            </View>
            
            <Switch
              value={optimizeAnimations}
              onValueChange={handleToggleOptimizeAnimations}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Optimize Images</Text>
              <Text style={styles.settingDescription}>
                Reduce image quality to improve performance
              </Text>
            </View>
            
            <Switch
              value={optimizeImages}
              onValueChange={handleToggleOptimizeImages}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reduce Background Processes</Text>
              <Text style={styles.settingDescription}>
                Limit background tasks to improve foreground performance
              </Text>
            </View>
            
            <Switch
              value={reduceBgProcesses}
              onValueChange={handleToggleReduceBgProcesses}
              trackColor={{ false: '#CCCCCC', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        
        {/* Performance testing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Testing</Text>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleRunStressTest}
          >
            <Ionicons name="flash" size={16} color="#FFFFFF" />
            <Text style={styles.testButtonText}>Run Stress Test</Text>
          </TouchableOpacity>
          
          <Text style={styles.testDescription}>
            Runs a stress test to measure performance under load. This will create
            and process a large number of objects to simulate heavy usage.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#0077CC'
  },
  backButton: {
    padding: 4
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  infoButton: {
    padding: 4
  },
  content: {
    flex: 1,
    padding: 16
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0077CC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4
  },
  resetButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8
  },
  metricsContainer: {
    
  },
  metricsSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 4
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  metricLabel: {
    fontSize: 14,
    color: '#757575'
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '500'
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  settingInfo: {
    flex: 1,
    marginRight: 16
  },
  settingLabel: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4
  },
  settingDescription: {
    fontSize: 14,
    color: '#757575'
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8
  },
  testDescription: {
    fontSize: 14,
    color: '#757575'
  }
});
