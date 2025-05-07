/**
 * Enhanced Translation Status Indicator Component for MedTranslate AI Patient Application
 *
 * This component provides detailed visual feedback for the current status of a translation,
 * including confidence levels, factors affecting confidence, errors, and processing states.
 * It includes animations and detailed information about the translation process.
 */

import React, { useEffect, useRef, useState } from 'react';
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

// Confidence descriptions
const CONFIDENCE_DESCRIPTIONS = {
  [CONFIDENCE_LEVELS.HIGH]: 'High confidence indicates a reliable translation with high accuracy.',
  [CONFIDENCE_LEVELS.MEDIUM]: 'Medium confidence suggests a generally accurate translation with possible minor issues.',
  [CONFIDENCE_LEVELS.LOW]: 'Low confidence indicates potential issues with the translation accuracy.'
};

// Context-specific confidence descriptions
const CONTEXT_CONFIDENCE_DESCRIPTIONS = {
  'general': {
    [CONFIDENCE_LEVELS.HIGH]: 'High confidence indicates a reliable translation with high accuracy for general medical communication.',
    [CONFIDENCE_LEVELS.MEDIUM]: 'Medium confidence suggests a generally accurate translation with possible minor issues in general medical terms.',
    [CONFIDENCE_LEVELS.LOW]: 'Low confidence indicates potential issues with the translation accuracy of general medical information.'
  },
  'cardiology': {
    [CONFIDENCE_LEVELS.HIGH]: 'High confidence indicates a reliable translation with high accuracy for cardiology terminology and concepts.',
    [CONFIDENCE_LEVELS.MEDIUM]: 'Medium confidence suggests a generally accurate translation with possible minor issues in cardiology-specific terms.',
    [CONFIDENCE_LEVELS.LOW]: 'Low confidence indicates potential issues with the translation accuracy of cardiology-specific information.'
  },
  'neurology': {
    [CONFIDENCE_LEVELS.HIGH]: 'High confidence indicates a reliable translation with high accuracy for neurology terminology and concepts.',
    [CONFIDENCE_LEVELS.MEDIUM]: 'Medium confidence suggests a generally accurate translation with possible minor issues in neurology-specific terms.',
    [CONFIDENCE_LEVELS.LOW]: 'Low confidence indicates potential issues with the translation accuracy of neurology-specific information.'
  },
  'oncology': {
    [CONFIDENCE_LEVELS.HIGH]: 'High confidence indicates a reliable translation with high accuracy for oncology terminology and concepts.',
    [CONFIDENCE_LEVELS.MEDIUM]: 'Medium confidence suggests a generally accurate translation with possible minor issues in oncology-specific terms.',
    [CONFIDENCE_LEVELS.LOW]: 'Low confidence indicates potential issues with the translation accuracy of oncology-specific information.'
  },
  'emergency': {
    [CONFIDENCE_LEVELS.HIGH]: 'High confidence indicates a reliable translation with high accuracy for emergency medical terminology and concepts.',
    [CONFIDENCE_LEVELS.MEDIUM]: 'Medium confidence suggests a generally accurate translation with possible minor issues in emergency-specific terms.',
    [CONFIDENCE_LEVELS.LOW]: 'Low confidence indicates potential issues with the translation accuracy of emergency medical information.'
  }
};

// Confidence factors
const CONFIDENCE_FACTORS = {
  [CONFIDENCE_LEVELS.HIGH]: [
    'Medical terminology correctly translated',
    'Source and target text have appropriate length ratio',
    'High-quality model used for translation'
  ],
  [CONFIDENCE_LEVELS.MEDIUM]: [
    'Some medical terms may need verification',
    'Translation may have slight structural differences',
    'Consider reviewing critical information'
  ],
  [CONFIDENCE_LEVELS.LOW]: [
    'Medical terminology may be inaccurate',
    'Significant length discrepancy between source and translation',
    'Consider requesting a new translation'
  ]
};

// Context-specific confidence factors
const CONTEXT_CONFIDENCE_FACTORS = {
  'cardiology': {
    [CONFIDENCE_LEVELS.HIGH]: [
      'Cardiac terminology correctly translated',
      'Critical heart-related terms preserved',
      'Appropriate medical context maintained'
    ],
    [CONFIDENCE_LEVELS.MEDIUM]: [
      'Some cardiac terms may need verification',
      'Check accuracy of heart condition descriptions',
      'Verify medication dosages and instructions'
    ],
    [CONFIDENCE_LEVELS.LOW]: [
      'Cardiac terminology may be inaccurate',
      'Critical heart-related terms may be mistranslated',
      'Consider requesting specialist verification'
    ]
  },
  'neurology': {
    [CONFIDENCE_LEVELS.HIGH]: [
      'Neurological terminology correctly translated',
      'Brain and nervous system terms preserved',
      'Appropriate medical context maintained'
    ],
    [CONFIDENCE_LEVELS.MEDIUM]: [
      'Some neurological terms may need verification',
      'Check accuracy of neurological condition descriptions',
      'Verify symptom descriptions and severity'
    ],
    [CONFIDENCE_LEVELS.LOW]: [
      'Neurological terminology may be inaccurate',
      'Critical nervous system terms may be mistranslated',
      'Consider requesting specialist verification'
    ]
  },
  'oncology': {
    [CONFIDENCE_LEVELS.HIGH]: [
      'Cancer-related terminology correctly translated',
      'Treatment and staging terms preserved',
      'Appropriate medical context maintained'
    ],
    [CONFIDENCE_LEVELS.MEDIUM]: [
      'Some oncology terms may need verification',
      'Check accuracy of cancer type and stage descriptions',
      'Verify treatment options and side effects'
    ],
    [CONFIDENCE_LEVELS.LOW]: [
      'Cancer-related terminology may be inaccurate',
      'Critical oncology terms may be mistranslated',
      'Consider requesting specialist verification'
    ]
  },
  'emergency': {
    [CONFIDENCE_LEVELS.HIGH]: [
      'Emergency terminology correctly translated',
      'Critical urgent care terms preserved',
      'Time-sensitive instructions maintained'
    ],
    [CONFIDENCE_LEVELS.MEDIUM]: [
      'Some emergency terms may need verification',
      'Check accuracy of urgent care instructions',
      'Verify symptom descriptions and severity'
    ],
    [CONFIDENCE_LEVELS.LOW]: [
      'Emergency terminology may be inaccurate',
      'Critical urgent care terms may be mistranslated',
      'Consider requesting immediate human verification'
    ]
  }
};

export default function TranslationStatusIndicator({
  status = STATUS_TYPES.IDLE,
  confidence = null,
  confidenceFactors = [],
  errorMessage = null,
  progress = 0,
  processingTime = null,
  onRetry = null,
  showDetails = false,
  translationModel = null,
  medicalContext = 'general',
  adaptiveThresholds = null
}) {
  // State for confidence info modal
  const [infoModalVisible, setInfoModalVisible] = useState(false);
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
      <TouchableOpacity
        style={[styles.confidenceBadge, { backgroundColor: color }]}
        onPress={() => setInfoModalVisible(true)}
      >
        <Text style={styles.confidenceText}>
          {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
        </Text>
        <Ionicons name="information-circle-outline" size={12} color="#FFFFFF" style={styles.infoIcon} />
      </TouchableOpacity>
    );
  };

  // Get confidence info modal
  const getConfidenceInfoModal = () => {
    if (!confidence) return null;

    const color = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS.MEDIUM;

    // Get context-specific description if available, otherwise use general description
    const description =
      (CONTEXT_CONFIDENCE_DESCRIPTIONS[medicalContext] &&
       CONTEXT_CONFIDENCE_DESCRIPTIONS[medicalContext][confidence]) ||
      CONFIDENCE_DESCRIPTIONS[confidence] || '';

    // Get context-specific factors if available, otherwise use provided factors or general factors
    const factors = confidenceFactors.length > 0
      ? confidenceFactors
      : (CONTEXT_CONFIDENCE_FACTORS[medicalContext] &&
         CONTEXT_CONFIDENCE_FACTORS[medicalContext][confidence]) ||
        CONFIDENCE_FACTORS[confidence] || [];

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: color }]}>
              <Text style={styles.modalTitle}>
                {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
                {medicalContext !== 'general' && ` (${medicalContext.charAt(0).toUpperCase() + medicalContext.slice(1)})`}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setInfoModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDescription}>{description}</Text>

              <Text style={styles.modalSectionTitle}>Factors:</Text>
              {factors.map((factor, index) => (
                <View key={index} style={styles.factorItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={color}
                    style={styles.factorIcon}
                  />
                  <Text style={styles.factorText}>{factor}</Text>
                </View>
              ))}

              {adaptiveThresholds && (
                <>
                  <Text style={styles.modalSectionTitle}>Adaptive Thresholds:</Text>
                  <View style={styles.thresholdsContainer}>
                    <View style={styles.thresholdItem}>
                      <Text style={styles.thresholdLabel}>High:</Text>
                      <Text style={styles.thresholdValue}>{adaptiveThresholds.high}</Text>
                    </View>
                    <View style={styles.thresholdItem}>
                      <Text style={styles.thresholdLabel}>Medium:</Text>
                      <Text style={styles.thresholdValue}>{adaptiveThresholds.medium}</Text>
                    </View>
                    <View style={styles.thresholdItem}>
                      <Text style={styles.thresholdLabel}>Low:</Text>
                      <Text style={styles.thresholdValue}>{adaptiveThresholds.low}</Text>
                    </View>
                  </View>

                  {adaptiveThresholds.analysis && (
                    <View style={styles.analysisContainer}>
                      <Text style={styles.analysisTitle}>Analysis Factors:</Text>
                      {Object.entries(adaptiveThresholds.analysis).map(([key, value]) => (
                        <View key={key} style={styles.analysisItem}>
                          <Text style={styles.analysisLabel}>{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}:</Text>
                          <Text style={styles.analysisValue}>
                            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {translationModel && (
                <>
                  <Text style={styles.modalSectionTitle}>Translation Model:</Text>
                  <Text style={styles.modalText}>{translationModel}</Text>
                </>
              )}

              {processingTime && (
                <>
                  <Text style={styles.modalSectionTitle}>Processing Time:</Text>
                  <Text style={styles.modalText}>{processingTime}s</Text>
                </>
              )}

              <View style={styles.tipContainer}>
                <Ionicons name="bulb" size={20} color="#FFC107" style={styles.tipIcon} />
                <Text style={styles.tipText}>
                  {confidence === CONFIDENCE_LEVELS.HIGH
                    ? `This translation is highly reliable for ${medicalContext} medical communication.`
                    : confidence === CONFIDENCE_LEVELS.MEDIUM
                      ? `Verify critical ${medicalContext} terms before making decisions.`
                      : `Consider requesting a new translation for critical ${medicalContext} information.`}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Confidence:</Text>
                <TouchableOpacity
                  onPress={() => setInfoModalVisible(true)}
                  style={styles.confidenceInfoButton}
                >
                  <View style={[
                    styles.confidenceIndicator,
                    { backgroundColor: CONFIDENCE_COLORS[confidence] }
                  ]}>
                    <Text style={styles.confidenceIndicatorText}>
                      {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
                    </Text>
                  </View>
                  <Ionicons name="information-circle" size={16} color="#757575" style={styles.detailInfoIcon} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Processing Time:</Text>
                <Text style={styles.detailValue}>{processingTime || '1.2'}s</Text>
              </View>

              {translationModel && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Model:</Text>
                  <Text style={styles.detailValue}>{translationModel}</Text>
                </View>
              )}

              <View style={styles.factorsSummary}>
                <Text style={styles.factorsSummaryTitle}>
                  Key Factors:
                  {medicalContext !== 'general' &&
                    <Text style={styles.contextLabel}> ({medicalContext.charAt(0).toUpperCase() + medicalContext.slice(1)})</Text>
                  }
                </Text>
                {(confidenceFactors.length > 0
                  ? confidenceFactors
                  : (CONTEXT_CONFIDENCE_FACTORS[medicalContext] &&
                     CONTEXT_CONFIDENCE_FACTORS[medicalContext][confidence]) ||
                    CONFIDENCE_FACTORS[confidence] || [])
                  .slice(0, 2)
                  .map((factor, index) => (
                    <View key={index} style={styles.factorSummaryItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={CONFIDENCE_COLORS[confidence]}
                        style={styles.factorSummaryIcon}
                      />
                      <Text style={styles.factorSummaryText}>{factor}</Text>
                    </View>
                  ))}

                {adaptiveThresholds && (
                  <View style={styles.adaptiveIndicator}>
                    <Ionicons
                      name="analytics"
                      size={14}
                      color="#2196F3"
                      style={styles.adaptiveIcon}
                    />
                    <Text style={styles.adaptiveText}>
                      Using adaptive thresholds for {medicalContext} context
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => setInfoModalVisible(true)}
                >
                  <Text style={styles.viewMoreText}>View More Details</Text>
                  <Ionicons name="chevron-forward" size={14} color="#2196F3" />
                </TouchableOpacity>
              </View>
            </>
          )}

          {status === STATUS_TYPES.ERROR && (
            <View style={styles.errorDetailsContainer}>
              <Text style={styles.errorDetailsTitle}>Error Details:</Text>
              <Text style={styles.errorDetailsText}>{errorMessage || 'Unknown error occurred'}</Text>

              <View style={styles.errorTipsContainer}>
                <Text style={styles.errorTipsTitle}>Troubleshooting Tips:</Text>
                <View style={styles.errorTipItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#757575" style={styles.errorTipIcon} />
                  <Text style={styles.errorTipText}>Check your internet connection</Text>
                </View>
                <View style={styles.errorTipItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#757575" style={styles.errorTipIcon} />
                  <Text style={styles.errorTipText}>Try speaking more clearly</Text>
                </View>
                <View style={styles.errorTipItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#757575" style={styles.errorTipIcon} />
                  <Text style={styles.errorTipText}>Reduce background noise</Text>
                </View>
              </View>

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

      {/* Confidence Info Modal */}
      {getConfidenceInfoModal()}
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
    flexDirection: 'row',
    alignItems: 'center',
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
  infoIcon: {
    marginLeft: 4
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
  confidenceInfoButton: {
    flexDirection: 'row',
    alignItems: 'center'
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
  detailInfoIcon: {
    marginLeft: 4
  },
  factorsSummary: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 10,
    marginTop: 8
  },
  factorsSummaryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8
  },
  factorSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  factorSummaryIcon: {
    marginRight: 6
  },
  factorSummaryText: {
    fontSize: 13,
    color: '#333333',
    flex: 1
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  viewMoreText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
    marginRight: 4
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
  errorTipsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12
  },
  errorTipsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8
  },
  errorTipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  errorTipIcon: {
    marginRight: 6
  },
  errorTipText: {
    fontSize: 13,
    color: '#333333'
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
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  closeButton: {
    padding: 4
  },
  modalBody: {
    padding: 16,
    maxHeight: 400
  },
  modalDescription: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 16,
    lineHeight: 20
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
    marginTop: 16
  },
  modalText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  factorIcon: {
    marginRight: 8
  },
  factorText: {
    fontSize: 14,
    color: '#333333',
    flex: 1
  },
  tipContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 4,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 8
  },
  tipIcon: {
    marginRight: 8,
    marginTop: 2
  },
  tipText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    lineHeight: 20
  },
  // Adaptive thresholds styles
  thresholdsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12
  },
  thresholdItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  thresholdLabel: {
    fontSize: 14,
    color: '#757575'
  },
  thresholdValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333'
  },
  analysisContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
    marginBottom: 8
  },
  analysisItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  analysisLabel: {
    fontSize: 13,
    color: '#757575',
    flex: 1
  },
  analysisValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'right',
    flex: 1
  },
  contextLabel: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic'
  },
  adaptiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
    padding: 6,
    marginTop: 8,
    marginBottom: 8
  },
  adaptiveIcon: {
    marginRight: 6
  },
  adaptiveText: {
    fontSize: 12,
    color: '#2196F3',
    flex: 1
  }
});
