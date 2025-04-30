/**
 * Translation Monitor Panel Component for MedTranslate AI Provider Dashboard
 *
 * This component provides real-time monitoring of translation quality,
 * statistics, and error reporting during translation sessions.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  TextInput,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

// Confidence level colors
const CONFIDENCE_COLORS = {
  high: '#4CAF50',
  medium: '#FFC107',
  low: '#F44336'
};

export default function TranslationMonitorPanel({
  isActive = false,
  translations = [],
  sessionLanguage = 'Unknown',
  onReportError,
  onRequestAlternative,
  onToggleAutoCorrect
}) {
  // State
  const [stats, setStats] = useState({
    total: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    averageLatency: 0,
    confidenceScore: 0
  });
  const [autoCorrect, setAutoCorrect] = useState(true);
  const [selectedTranslation, setSelectedTranslation] = useState(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [confidenceTrend, setConfidenceTrend] = useState([]);
  const [isQualityTrendVisible, setIsQualityTrendVisible] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  // Animation values
  const confidenceScoreAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width - 40; // Padding

  // Report reasons
  const reportReasons = [
    { id: 'incorrect', label: 'Incorrect Translation' },
    { id: 'inappropriate', label: 'Inappropriate Content' },
    { id: 'missing', label: 'Missing Content' },
    { id: 'context', label: 'Context Error' },
    { id: 'terminology', label: 'Medical Terminology Error' },
    { id: 'other', label: 'Other (Please Specify)' }
  ];

  // Calculate confidence score (0-100)
  const calculateConfidenceScore = (high, medium, low, total) => {
    if (total === 0) return 0;
    return Math.round((high * 100 + medium * 60 + low * 20) / total);
  };

  // Update stats when translations change
  useEffect(() => {
    if (translations.length === 0) return;

    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let totalLatency = 0;

    // Process all translations
    translations.forEach(translation => {
      if (translation.confidence === 'high') highCount++;
      else if (translation.confidence === 'medium') mediumCount++;
      else if (translation.confidence === 'low') lowCount++;

      if (translation.latency) {
        totalLatency += translation.latency;
      }
    });

    // Calculate confidence score
    const total = translations.length;
    const confidenceScore = calculateConfidenceScore(highCount, mediumCount, lowCount, total);

    // Update stats
    setStats({
      total,
      highConfidence: highCount,
      mediumConfidence: mediumCount,
      lowConfidence: lowCount,
      averageLatency: total > 0 ? (totalLatency / total).toFixed(2) : 0,
      confidenceScore
    });

    // Animate confidence score
    Animated.timing(confidenceScoreAnim, {
      toValue: confidenceScore,
      duration: 1000,
      useNativeDriver: false
    }).start();

    // Update confidence trend data
    // We'll use the last 10 translations for the trend
    if (translations.length >= 5) {
      const recentTranslations = translations.slice(-10);
      const trendData = [];

      // Group translations by 2 and calculate average confidence
      for (let i = 0; i < recentTranslations.length; i += 2) {
        const group = recentTranslations.slice(i, i + 2);
        let groupHighCount = 0;
        let groupMediumCount = 0;
        let groupLowCount = 0;

        group.forEach(translation => {
          if (translation.confidence === 'high') groupHighCount++;
          else if (translation.confidence === 'medium') groupMediumCount++;
          else if (translation.confidence === 'low') groupLowCount++;
        });

        const groupScore = calculateConfidenceScore(
          groupHighCount,
          groupMediumCount,
          groupLowCount,
          group.length
        );

        trendData.push(groupScore);
      }

      setConfidenceTrend(trendData);
    }
  }, [translations]);

  // Toggle auto-correct
  const toggleAutoCorrect = () => {
    const newValue = !autoCorrect;
    setAutoCorrect(newValue);
    onToggleAutoCorrect(newValue);
  };

  // Handle report error
  const handleReportError = () => {
    if (!selectedTranslation) return;

    const reason = reportReason === 'other' ? customReason : reportReason;

    onReportError(selectedTranslation.id, reason);
    setIsReportModalVisible(false);
    setReportReason('');
    setCustomReason('');
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Get confidence indicator
  const getConfidenceIndicator = (confidence) => {
    const color = CONFIDENCE_COLORS[confidence] || '#757575';

    return (
      <View style={[styles.confidenceIndicator, { backgroundColor: color }]}>
        <Text style={styles.confidenceText}>
          {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
        </Text>
      </View>
    );
  };

  // Render translation item
  const renderTranslationItem = (translation, index) => (
    <TouchableOpacity
      key={translation.id || index}
      style={styles.translationItem}
      onPress={() => {
        setSelectedTranslation(translation);
        setIsDetailsModalVisible(true);
      }}
    >
      <View style={styles.translationHeader}>
        <Text style={styles.translationTime}>
          {formatTime(translation.timestamp)}
        </Text>
        {getConfidenceIndicator(translation.confidence || 'medium')}
      </View>

      <View style={styles.translationContent}>
        <View style={styles.originalTextContainer}>
          <Text style={styles.textLabel}>Original:</Text>
          <Text style={styles.originalText}>{translation.originalText}</Text>
        </View>

        <View style={styles.translatedTextContainer}>
          <Text style={styles.textLabel}>Translated:</Text>
          <Text style={styles.translatedText}>{translation.translatedText}</Text>
        </View>
      </View>

      {translation.corrected && (
        <View style={styles.correctionBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
          <Text style={styles.correctionText}>Auto-corrected</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Translation Monitor</Text>

        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            isActive ? styles.activeIndicator : styles.inactiveIndicator
          ]} />
          <Text style={styles.statusText}>
            {isActive ? 'Active Session' : 'No Active Session'}
          </Text>
        </View>
      </View>

      {/* Session info */}
      {isActive && (
        <View style={styles.sessionInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Patient Language:</Text>
            <Text style={styles.infoValue}>{sessionLanguage}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Auto-Correct:</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleAutoCorrect}
            >
              <View style={[
                styles.toggleTrack,
                autoCorrect && styles.toggleTrackActive
              ]}>
                <View style={[
                  styles.toggleThumb,
                  autoCorrect && styles.toggleThumbActive
                ]} />
              </View>
              <Text style={[
                styles.toggleText,
                autoCorrect && styles.toggleTextActive
              ]}>
                {autoCorrect ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.statsHeader}
          onPress={() => setShowDetailedStats(!showDetailedStats)}
        >
          <Text style={styles.statsHeaderText}>Translation Statistics</Text>
          <Ionicons
            name={showDetailedStats ? "chevron-up" : "chevron-down"}
            size={20}
            color="#757575"
          />
        </TouchableOpacity>

        {/* Confidence Score Meter */}
        <View style={styles.confidenceMeterContainer}>
          <View style={styles.confidenceMeterHeader}>
            <Text style={styles.confidenceMeterTitle}>Overall Confidence</Text>
            <Animated.Text style={styles.confidenceMeterValue}>
              {confidenceScoreAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%']
              })}
            </Animated.Text>
          </View>

          <View style={styles.confidenceMeterTrack}>
            <Animated.View
              style={[
                styles.confidenceMeterFill,
                {
                  width: confidenceScoreAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  }),
                  backgroundColor: confidenceScoreAnim.interpolate({
                    inputRange: [0, 40, 70, 100],
                    outputRange: [CONFIDENCE_COLORS.low, CONFIDENCE_COLORS.medium, CONFIDENCE_COLORS.medium, CONFIDENCE_COLORS.high]
                  })
                }
              ]}
            />
          </View>

          <View style={styles.confidenceMeterLabels}>
            <Text style={styles.confidenceMeterLabel}>Low</Text>
            <Text style={styles.confidenceMeterLabel}>Medium</Text>
            <Text style={styles.confidenceMeterLabel}>High</Text>
          </View>
        </View>

        {/* Basic Stats */}
        <View style={styles.basicStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: CONFIDENCE_COLORS.high }]}>
              {stats.highConfidence}
            </Text>
            <Text style={styles.statLabel}>High</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: CONFIDENCE_COLORS.medium }]}>
              {stats.mediumConfidence}
            </Text>
            <Text style={styles.statLabel}>Medium</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: CONFIDENCE_COLORS.low }]}>
              {stats.lowConfidence}
            </Text>
            <Text style={styles.statLabel}>Low</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.averageLatency}ms</Text>
            <Text style={styles.statLabel}>Avg. Time</Text>
          </View>
        </View>

        {/* Detailed Stats */}
        {showDetailedStats && (
          <View style={styles.detailedStats}>
            <TouchableOpacity
              style={styles.trendButton}
              onPress={() => setIsQualityTrendVisible(true)}
            >
              <Ionicons name="trending-up" size={16} color="#0077CC" />
              <Text style={styles.trendButtonText}>View Quality Trend</Text>
            </TouchableOpacity>

            <View style={styles.detailedStatsRow}>
              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>High Confidence %:</Text>
                <Text style={styles.detailedStatValue}>
                  {stats.total > 0 ? Math.round((stats.highConfidence / stats.total) * 100) : 0}%
                </Text>
              </View>

              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Auto-corrections:</Text>
                <Text style={styles.detailedStatValue}>
                  {translations.filter(t => t.corrected).length}
                </Text>
              </View>
            </View>

            <View style={styles.detailedStatsRow}>
              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Avg. Characters:</Text>
                <Text style={styles.detailedStatValue}>
                  {stats.total > 0
                    ? Math.round(translations.reduce((sum, t) => sum + (t.originalText?.length || 0), 0) / stats.total)
                    : 0}
                </Text>
              </View>

              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Error Reports:</Text>
                <Text style={styles.detailedStatValue}>
                  {translations.filter(t => t.reported).length}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Quality Trend Modal */}
      <Modal
        visible={isQualityTrendVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsQualityTrendVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsQualityTrendVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Translation Quality Trend</Text>

              {confidenceTrend.length > 0 ? (
                <View style={styles.chartContainer}>
                  <LineChart
                    data={{
                      labels: confidenceTrend.map((_, i) => `${i+1}`),
                      datasets: [
                        {
                          data: confidenceTrend
                        }
                      ]
                    }}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#FFFFFF',
                      backgroundGradientFrom: '#FFFFFF',
                      backgroundGradientTo: '#FFFFFF',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(0, 119, 204, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: {
                        borderRadius: 16
                      },
                      propsForDots: {
                        r: '6',
                        strokeWidth: '2',
                        stroke: '#0077CC'
                      }
                    }}
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: 16
                    }}
                    yAxisSuffix="%"
                    yAxisLabel=""
                    yAxisMin={0}
                    yAxisMax={100}
                  />

                  <Text style={styles.chartLabel}>Recent Translations (Groups of 2)</Text>
                </View>
              ) : (
                <View style={styles.emptyChartContainer}>
                  <Ionicons name="analytics" size={48} color="#CCCCCC" />
                  <Text style={styles.emptyChartText}>
                    Not enough data to display trend.
                    At least 5 translations are needed.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.closeChartButton}
                onPress={() => setIsQualityTrendVisible(false)}
              >
                <Text style={styles.closeChartButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Translations list */}
      <View style={styles.translationsContainer}>
        <Text style={styles.sectionTitle}>Recent Translations</Text>

        {translations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses" size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>
              {isActive
                ? 'No translations yet in this session'
                : 'Start a session to see translations'}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.translationsList}>
            {translations.map(renderTranslationItem)}
          </ScrollView>
        )}
      </View>

      {/* Translation details modal */}
      <Modal
        visible={isDetailsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDetailsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsDetailsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Translation Details</Text>

              {selectedTranslation && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time:</Text>
                    <Text style={styles.detailValue}>
                      {formatTime(selectedTranslation.timestamp)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Confidence:</Text>
                    <View style={styles.detailValue}>
                      {getConfidenceIndicator(selectedTranslation.confidence || 'medium')}
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Latency:</Text>
                    <Text style={styles.detailValue}>
                      {selectedTranslation.latency ? `${selectedTranslation.latency}ms` : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Model:</Text>
                    <Text style={styles.detailValue}>
                      {selectedTranslation.model || 'Standard'}
                    </Text>
                  </View>

                  <View style={styles.textDetailContainer}>
                    <Text style={styles.textDetailLabel}>Original Text:</Text>
                    <View style={styles.textDetailBox}>
                      <Text style={styles.textDetailContent}>
                        {selectedTranslation.originalText}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.textDetailContainer}>
                    <Text style={styles.textDetailLabel}>Translated Text:</Text>
                    <View style={styles.textDetailBox}>
                      <Text style={styles.textDetailContent}>
                        {selectedTranslation.translatedText}
                      </Text>
                    </View>
                  </View>

                  {selectedTranslation.corrected && (
                    <View style={styles.textDetailContainer}>
                      <Text style={styles.textDetailLabel}>Original Translation:</Text>
                      <View style={styles.textDetailBox}>
                        <Text style={styles.textDetailContent}>
                          {selectedTranslation.originalTranslation}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.alternativeButton]}
                      onPress={() => {
                        onRequestAlternative(selectedTranslation.id);
                        setIsDetailsModalVisible(false);
                      }}
                    >
                      <Ionicons name="refresh" size={16} color="#0077CC" />
                      <Text style={styles.alternativeButtonText}>Alternative</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.reportButton]}
                      onPress={() => {
                        setIsDetailsModalVisible(false);
                        setIsReportModalVisible(true);
                      }}
                    >
                      <Ionicons name="flag" size={16} color="#F44336" />
                      <Text style={styles.reportButtonText}>Report Error</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setIsDetailsModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report error modal */}
      <Modal
        visible={isReportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsReportModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Report Translation Error</Text>

              <Text style={styles.reportInstructions}>
                Please select the reason for reporting this translation:
              </Text>

              {reportReasons.map(reason => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonOption,
                    reportReason === reason.id && styles.selectedReasonOption
                  ]}
                  onPress={() => setReportReason(reason.id)}
                >
                  <View style={[
                    styles.radioButton,
                    reportReason === reason.id && styles.radioButtonSelected
                  ]}>
                    {reportReason === reason.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={styles.reasonText}>{reason.label}</Text>
                </TouchableOpacity>
              ))}

              {reportReason === 'other' && (
                <View style={styles.customReasonContainer}>
                  <Text style={styles.customReasonLabel}>Please specify:</Text>
                  <TextInput
                    style={styles.customReasonInput}
                    placeholder="Enter reason..."
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsReportModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.submitButton,
                    (!reportReason || (reportReason === 'other' && !customReason)) && styles.disabledButton
                  ]}
                  onPress={handleReportError}
                  disabled={!reportReason || (reportReason === 'other' && !customReason)}
                >
                  <Text style={[
                    styles.submitButtonText,
                    (!reportReason || (reportReason === 'other' && !customReason)) && styles.disabledButtonText
                  ]}>
                    Submit Report
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6
  },
  activeIndicator: {
    backgroundColor: '#4CAF50'
  },
  inactiveIndicator: {
    backgroundColor: '#F44336'
  },
  statusText: {
    fontSize: 14,
    color: '#757575'
  },
  sessionInfo: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 14,
    color: '#757575'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333'
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  toggleTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CCCCCC',
    padding: 2
  },
  toggleTrackActive: {
    backgroundColor: '#4CAF50'
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF'
  },
  toggleThumbActive: {
    transform: [{ translateX: 16 }]
  },
  toggleText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8
  },
  toggleTextActive: {
    color: '#4CAF50'
  },
  statsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  statsHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333'
  },
  confidenceMeterContainer: {
    marginBottom: 16
  },
  confidenceMeterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  confidenceMeterTitle: {
    fontSize: 14,
    color: '#333333'
  },
  confidenceMeterValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333'
  },
  confidenceMeterTrack: {
    height: 12,
    backgroundColor: '#EEEEEE',
    borderRadius: 6,
    overflow: 'hidden'
  },
  confidenceMeterFill: {
    height: '100%',
    borderRadius: 6
  },
  confidenceMeterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  confidenceMeterLabel: {
    fontSize: 12,
    color: '#757575'
  },
  basicStats: {
    flexDirection: 'row',
    marginBottom: 16
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4
  },
  detailedStats: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12
  },
  trendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    marginBottom: 12
  },
  trendButtonText: {
    fontSize: 12,
    color: '#0077CC',
    marginLeft: 4
  },
  detailedStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailedStatItem: {
    flex: 1
  },
  detailedStatLabel: {
    fontSize: 12,
    color: '#757575'
  },
  detailedStatValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333'
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16
  },
  chartLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center'
  },
  emptyChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyChartText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 12,
    textAlign: 'center'
  },
  closeChartButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 4
  },
  closeChartButtonText: {
    fontSize: 14,
    color: '#757575'
  },
  translationsContainer: {
    flex: 1,
    padding: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12
  },
  translationsList: {
    flex: 1
  },
  translationItem: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE'
  },
  translationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  translationTime: {
    fontSize: 12,
    color: '#757575'
  },
  confidenceIndicator: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4
  },
  confidenceText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  translationContent: {
    marginBottom: 8
  },
  originalTextContainer: {
    marginBottom: 8
  },
  textLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2
  },
  originalText: {
    fontSize: 14,
    color: '#333333'
  },
  translatedTextContainer: {

  },
  translatedText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500'
  },
  correctionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4
  },
  correctionText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 2
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 12,
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden'
  },
  modalContent: {
    padding: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
    width: 100
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    flex: 1
  },
  textDetailContainer: {
    marginBottom: 12
  },
  textDetailLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4
  },
  textDetailBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12
  },
  textDetailContent: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD'
  },
  alternativeButtonText: {
    fontSize: 14,
    color: '#0077CC',
    marginLeft: 4
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE'
  },
  reportButtonText: {
    fontSize: 14,
    color: '#F44336',
    marginLeft: 4
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: 8
  },
  closeButtonText: {
    fontSize: 14,
    color: '#757575'
  },
  reportInstructions: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 16
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  selectedReasonOption: {
    backgroundColor: '#F5F5F5'
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioButtonSelected: {
    borderColor: '#0077CC'
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0077CC'
  },
  reasonText: {
    fontSize: 14,
    color: '#333333'
  },
  customReasonContainer: {
    marginTop: 12,
    marginBottom: 16
  },
  customReasonLabel: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8
  },
  customReasonInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: 'top'
  },
  cancelButton: {
    backgroundColor: '#F5F5F5'
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#757575'
  },
  submitButton: {
    backgroundColor: '#0077CC'
  },
  submitButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  disabledButton: {
    backgroundColor: '#CCCCCC'
  },
  disabledButtonText: {
    color: '#FFFFFF'
  }
});
