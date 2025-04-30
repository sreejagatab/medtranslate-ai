/**
 * Translation Status Indicator Component for MedTranslate AI Patient Application
 * 
 * This component provides visual feedback for the current status of a translation,
 * including confidence levels, errors, and processing states.
 */

import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Status types
const STATUS_TYPES = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  TRANSLATING: 'translating',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Confidence levels
const CONFIDENCE_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

// Status colors
const STATUS_COLORS = {
  [STATUS_TYPES.IDLE]: '#757575',
  [STATUS_TYPES.RECORDING]: '#F44336',
  [STATUS_TYPES.PROCESSING]: '#FFC107',
  [STATUS_TYPES.TRANSLATING]: '#2196F3',
  [STATUS_TYPES.COMPLETED]: '#4CAF50',
  [STATUS_TYPES.ERROR]: '#F44336'
};

// Confidence colors
const CONFIDENCE_COLORS = {
  [CONFIDENCE_LEVELS.HIGH]: '#4CAF50',
  [CONFIDENCE_LEVELS.MEDIUM]: '#FFC107',
  [CONFIDENCE_LEVELS.LOW]: '#F44336'
};

export default function TranslationStatusIndicator({ 
  status = STATUS_TYPES.IDLE,
  confidence = null,
  errorMessage = null,
  progress = 0,
  onRetry = null,
  showDetails = false
}) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Update progress animation when progress changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false
    }).start();
  }, [progress]);
  
  // Start pulse animation for active states
  useEffect(() => {
    if (status === STATUS_TYPES.RECORDING || status === STATUS_TYPES.PROCESSING || status === STATUS_TYPES.TRANSLATING) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      // Reset pulse animation
      pulseAnim.setValue(1);
    }
    
    // Fade animation for status changes
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  }, [status]);
  
  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case STATUS_TYPES.RECORDING:
        return 'mic';
      case STATUS_TYPES.PROCESSING:
        return 'cog';
      case STATUS_TYPES.TRANSLATING:
        return 'language';
      case STATUS_TYPES.COMPLETED:
        return 'checkmark-circle';
      case STATUS_TYPES.ERROR:
        return 'alert-circle';
      default:
        return 'ellipse';
    }
  };
  
  // Get status text
  const getStatusText = () => {
    switch (status) {
      case STATUS_TYPES.RECORDING:
        return 'Recording...';
      case STATUS_TYPES.PROCESSING:
        return 'Processing...';
      case STATUS_TYPES.TRANSLATING:
        return 'Translating...';
      case STATUS_TYPES.COMPLETED:
        return 'Translation Complete';
      case STATUS_TYPES.ERROR:
        return 'Translation Error';
      default:
        return 'Ready';
    }
  };
  
  // Get confidence badge
  const getConfidenceBadge = () => {
    if (!confidence || status !== STATUS_TYPES.COMPLETED) return null;
    
    const color = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS.MEDIUM;
    
    return (
      <View style={[styles.confidenceBadge, { backgroundColor: color }]}>
        <Text style={styles.confidenceText}>
          {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
        </Text>
      </View>
    );
  };
  
  // Get progress width
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.statusBar}>
        <Animated.View 
          style={[
            styles.progressBar,
            { 
              backgroundColor: STATUS_COLORS[status],
              width: progressWidth
            }
          ]}
        />
      </View>
      
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.iconContainer,
            { 
              backgroundColor: STATUS_COLORS[status],
              transform: [{ scale: pulseAnim }]
            }
          ]}
        >
          <Ionicons name={getStatusIcon()} size={20} color="#FFFFFF" />
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          
          {errorMessage && status === STATUS_TYPES.ERROR && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
        </View>
        
        {getConfidenceBadge()}
        
        {status === STATUS_TYPES.ERROR && onRetry && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={onRetry}
          >
            <Ionicons name="refresh" size={20} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>
      
      {showDetails && (
        <View style={styles.detailsContainer}>
          {status === STATUS_TYPES.COMPLETED && confidence && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Confidence:</Text>
              <View style={[
                styles.confidenceIndicator, 
                { backgroundColor: CONFIDENCE_COLORS[confidence] }
              ]}>
                <Text style={styles.confidenceIndicatorText}>
                  {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
                </Text>
              </View>
            </View>
          )}
          
          {status === STATUS_TYPES.COMPLETED && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Processing Time:</Text>
              <Text style={styles.detailValue}>1.2s</Text>
            </View>
          )}
          
          {status === STATUS_TYPES.ERROR && (
            <View style={styles.errorDetailsContainer}>
              <Text style={styles.errorDetailsTitle}>Error Details:</Text>
              <Text style={styles.errorDetailsText}>{errorMessage || 'Unknown error occurred'}</Text>
              
              {onRetry && (
                <TouchableOpacity 
                  style={styles.retryButtonLarge}
                  onPress={onRetry}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>Retry Translation</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  statusBar: {
    height: 4,
    backgroundColor: '#EEEEEE',
    width: '100%'
  },
  progressBar: {
    height: '100%',
    width: '0%'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  textContainer: {
    flex: 1
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333'
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 2
  },
  confidenceBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 8
  },
  confidenceText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  retryButton: {
    padding: 8
  },
  detailsContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
    width: 120
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500'
  },
  confidenceIndicator: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4
  },
  confidenceIndicatorText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  errorDetailsContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
    padding: 12
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F44336',
    marginBottom: 4
  },
  errorDetailsText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 12
  },
  retryButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 8
  }
});
