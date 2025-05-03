/**
 * Translation Message Component for MedTranslate AI Provider Application
 *
 * This component displays a message in the translation session,
 * with different styles for provider, patient, and system messages.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TranslationFeedback from '../../shared/components/TranslationFeedback';

export default function TranslationMessage({ message, providerLanguage, patientLanguage, onSubmitFeedback }) {
  const {
    id,
    sender,
    text,
    originalText,
    timestamp,
    confidence,
    isProcessing,
    isError
  } = message;

  const [showOriginal, setShowOriginal] = useState(false);

  // Format timestamp
  const formatTime = (date) => {
    if (!date) return '';

    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Get confidence indicator with enhanced details
  const getConfidenceIndicator = () => {
    if (!confidence) return null;

    // Handle both string and object confidence formats
    const confidenceLevel = typeof confidence === 'object' ? confidence.level : confidence;
    const confidenceScore = typeof confidence === 'object' ? confidence.score : null;
    const confidenceFactors = typeof confidence === 'object' ? confidence.factors : null;

    let color = '#4CAF50'; // High confidence (green)
    let icon = 'checkmark-circle';

    if (confidenceLevel === 'medium') {
      color = '#FFC107'; // Medium confidence (yellow)
      icon = 'alert-circle';
    } else if (confidenceLevel === 'low') {
      color = '#F44336'; // Low confidence (red)
      icon = 'warning';
    }

    const [showDetails, setShowDetails] = useState(false);

    return (
      <View style={styles.confidenceContainer}>
        <TouchableOpacity
          style={styles.confidenceIndicator}
          onPress={() => setShowDetails(!showDetails)}
        >
          <Ionicons name={icon} size={16} color={color} />
          <Text style={[styles.confidenceText, { color }]}>
            {confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)} confidence
            {confidenceScore ? ` (${Math.round(confidenceScore * 100)}%)` : ''}
          </Text>
          {(confidenceFactors || typeof confidence === 'object') && (
            <Ionicons
              name={showDetails ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={color}
              style={styles.confidenceDetailsIcon}
            />
          )}
        </TouchableOpacity>

        {showDetails && confidenceFactors && (
          <View style={styles.confidenceDetails}>
            {confidenceFactors.map((factor, index) => (
              <View key={index} style={styles.confidenceFactor}>
                <Text style={styles.confidenceFactorName}>
                  {factor.factor.replace(/_/g, ' ')}:
                </Text>
                <Text style={[
                  styles.confidenceFactorImpact,
                  factor.impact === 'positive' ? styles.positiveImpact :
                  factor.impact === 'negative' ? styles.negativeImpact :
                  styles.neutralImpact
                ]}>
                  {factor.impact}
                </Text>
              </View>
            ))}

            {confidence.analysis && (
              <View style={styles.confidenceAnalysis}>
                <Text style={styles.confidenceAnalysisTitle}>Analysis:</Text>
                {confidence.analysis.contextComplexity && (
                  <Text style={styles.confidenceAnalysisItem}>
                    Context complexity: {confidence.analysis.contextComplexity.toFixed(1)}
                  </Text>
                )}
                {confidence.analysis.terminologyComplexity && (
                  <Text style={styles.confidenceAnalysisItem}>
                    Terminology complexity: {confidence.analysis.terminologyComplexity.toFixed(1)}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render system message
  if (sender === 'system') {
    return (
      <View style={[
        styles.systemContainer,
        isError && styles.errorContainer
      ]}>
        <Ionicons
          name={isError ? 'alert-circle' : 'information-circle'}
          size={20}
          color={isError ? '#F44336' : '#0077CC'}
        />
        <Text style={[
          styles.systemText,
          isError && styles.errorText
        ]}>
          {text}
        </Text>
      </View>
    );
  }

  // Render provider or patient message
  return (
    <View style={[
      styles.messageContainer,
      sender === 'provider' ? styles.providerContainer : styles.patientContainer
    ]}>
      <View style={[
        styles.messageBubble,
        sender === 'provider' ? styles.providerBubble : styles.patientBubble,
        isProcessing && styles.processingBubble
      ]}>
        {isProcessing ? (
          <View style={styles.processingContent}>
            <Text style={styles.processingText}>{text}</Text>
            <View style={styles.processingIndicator}>
              <View style={styles.processingDot} />
              <View style={[styles.processingDot, styles.processingDotMiddle]} />
              <View style={styles.processingDot} />
            </View>
          </View>
        ) : (
          <>
            <Text style={[
              styles.messageText,
              sender === 'provider' ? styles.providerText : styles.patientText
            ]}>
              {text}
            </Text>

            {originalText && sender === 'patient' && (
              <TouchableOpacity
                style={styles.originalTextContainer}
                onPress={() => setShowOriginal(!showOriginal)}
              >
                <View style={styles.originalTextHeader}>
                  <Text style={styles.originalTextLabel}>
                    Original ({patientLanguage})
                  </Text>
                  <Ionicons
                    name={showOriginal ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#757575"
                  />
                </View>

                {showOriginal && (
                  <Text style={styles.originalText}>{originalText}</Text>
                )}
              </TouchableOpacity>
            )}

            {getConfidenceIndicator()}

            {/* Add feedback component for patient messages (translations) */}
            {sender === 'patient' && onSubmitFeedback && (
              <TranslationFeedback
                translationId={id}
                originalText={originalText}
                translatedText={text}
                confidence={confidence}
                onSubmitFeedback={onSubmitFeedback}
                compact={true}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.messageFooter}>
        <Text style={styles.senderText}>
          {sender === 'provider' ? 'You' : 'Patient'}
        </Text>
        <Text style={styles.timestamp}>
          {formatTime(timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  providerContainer: {
    alignSelf: 'flex-end',
  },
  patientContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
  },
  providerBubble: {
    backgroundColor: '#E1F5FE',
    borderBottomRightRadius: 4,
  },
  patientBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  processingBubble: {
    backgroundColor: '#F5F5F5',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  providerText: {
    color: '#333333',
  },
  patientText: {
    color: '#333333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginHorizontal: 8,
  },
  senderText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  confidenceContainer: {
    marginTop: 8,
  },
  confidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 12,
    marginLeft: 4,
  },
  confidenceDetailsIcon: {
    marginLeft: 4,
  },
  confidenceDetails: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  confidenceFactor: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  confidenceFactorName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555555',
    marginRight: 4,
    textTransform: 'capitalize',
  },
  confidenceFactorImpact: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  positiveImpact: {
    color: '#4CAF50',
  },
  negativeImpact: {
    color: '#F44336',
  },
  neutralImpact: {
    color: '#757575',
  },
  confidenceAnalysis: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  confidenceAnalysisTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555555',
    marginBottom: 4,
  },
  confidenceAnalysisItem: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  originalTextContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  originalTextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  originalTextLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#757575',
  },
  originalText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  systemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
  },
  systemText: {
    fontSize: 14,
    color: '#0077CC',
    marginLeft: 8,
    flex: 1,
  },
  errorText: {
    color: '#F44336',
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  processingText: {
    fontSize: 16,
    color: '#999999',
    flex: 1,
    marginRight: 8,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999999',
    marginHorizontal: 1,
  },
  processingDotMiddle: {
    opacity: 0.6,
  },
});
