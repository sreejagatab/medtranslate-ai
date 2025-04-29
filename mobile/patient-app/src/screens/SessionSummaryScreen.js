/**
 * Session Summary Screen for MedTranslate AI Patient App
 * 
 * Displays a summary of the completed translation session
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/config';
import { ApiClient } from '../services/NetworkService';

const SessionSummaryScreen = ({ navigation, route }) => {
  const { sessionId } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  
  // Load session summary on mount
  useEffect(() => {
    loadSessionSummary();
  }, []);
  
  // Load session summary
  const loadSessionSummary = async () => {
    try {
      setIsLoading(true);
      
      // Get session summary from API
      const data = await ApiClient.request(`/storage/sessions/${sessionId}`);
      
      setSummary({
        providerName: data.providerName,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        duration: calculateDuration(data.startTime, data.endTime),
        messageCount: data.messages.length,
        language: data.patientLanguage
      });
    } catch (error) {
      console.error('Error loading session summary:', error);
      setError('Failed to load session summary');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate session duration
  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };
  
  // Format date
  const formatDate = (date) => {
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Share session summary
  const handleShare = async () => {
    try {
      if (!summary) return;
      
      const message = `
MedTranslate AI Session Summary

Provider: ${summary.providerName}
Date: ${formatDate(summary.startTime)}
Duration: ${summary.duration}
Language: ${summary.language}
Messages: ${summary.messageCount}
      `.trim();
      
      await Share.share({
        message
      });
    } catch (error) {
      console.error('Error sharing session summary:', error);
    }
  };
  
  // Start new session
  const handleNewSession = () => {
    navigation.replace('JoinSession');
  };
  
  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading session summary...</Text>
      </SafeAreaView>
    );
  }
  
  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadSessionSummary}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Session Complete</Text>
          <MaterialIcons name="check-circle" size={64} color="#4CD964" />
        </View>
        
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Provider</Text>
            <Text style={styles.summaryValue}>{summary.providerName}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date & Time</Text>
            <Text style={styles.summaryValue}>{formatDate(summary.startTime)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{summary.duration}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Language</Text>
            <Text style={styles.summaryValue}>{summary.language}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Messages</Text>
            <Text style={styles.summaryValue}>{summary.messageCount}</Text>
          </View>
        </View>
        
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackTitle}>How was your experience?</Text>
          
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map(rating => (
              <TouchableOpacity
                key={rating}
                style={styles.ratingButton}
              >
                <MaterialIcons
                  name="star"
                  size={32}
                  color="#CCCCCC"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
        >
          <MaterialIcons name="share" size={20} color="#0066CC" />
          <Text style={styles.shareButtonText}>Share Summary</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.newSessionButton}
          onPress={handleNewSession}
        >
          <Text style={styles.newSessionButtonText}>New Session</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF'
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0066CC',
    borderRadius: 8
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  header: {
    alignItems: 'center',
    marginBottom: 30
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16
  },
  summaryContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666666'
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333'
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0'
  },
  feedbackContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center'
  },
  ratingButton: {
    padding: 8
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 8,
    marginRight: 12
  },
  shareButtonText: {
    color: '#0066CC',
    fontWeight: '600',
    marginLeft: 8
  },
  newSessionButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  newSessionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600'
  }
});

export default SessionSummaryScreen;
