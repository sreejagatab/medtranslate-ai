/**
 * Advanced Connection Issue Prediction Model for MedTranslate AI
 *
 * This module provides a sophisticated machine learning model for predicting
 * network connection issues based on historical patterns, environmental factors,
 * and real-time network metrics.
 *
 * Enhanced features:
 * - User-specific connection profiles for personalized predictions
 * - Pattern recognition for recurring connection issues
 * - Adaptive learning from connection history
 * - Contextual awareness of network environment
 * - Predictive recovery suggestions
 */

// Feature engineering utilities
const featureEngineering = {
  /**
   * Extract time-based features from a timestamp
   *
   * @param {Date} timestamp - The timestamp to extract features from
   * @returns {Object} - Extracted time features
   */
  extractTimeFeatures(timestamp) {
    const date = new Date(timestamp);
    return {
      hour: date.getHours(),
      dayOfWeek: date.getDay(),
      weekend: date.getDay() === 0 || date.getDay() === 6 ? 1 : 0,
      month: date.getMonth(),
      dayOfMonth: date.getDate(),
      weekOfYear: Math.ceil((((date - new Date(date.getFullYear(), 0, 1)) / 86400000) + 1) / 7)
    };
  },

  /**
   * Extract network quality features
   *
   * @param {Object} networkData - Network quality data
   * @returns {Object} - Extracted network features
   */
  extractNetworkFeatures(networkData) {
    const { latency, packetLoss, quality, bandwidthMbps, signalStrength } = networkData || {};

    return {
      latency: latency || 0,
      packetLoss: packetLoss || 0,
      quality: quality || 0,
      bandwidthMbps: bandwidthMbps || 0,
      signalStrength: signalStrength || 0,
      // Derived features
      latencyCategory: this.categorizeLatency(latency),
      qualityCategory: this.categorizeQuality(quality),
      bandwidthCategory: this.categorizeBandwidth(bandwidthMbps)
    };
  },

  /**
   * Extract location-based features
   *
   * @param {Object} locationData - Location data
   * @returns {Object} - Extracted location features
   */
  extractLocationFeatures(locationData) {
    if (!locationData) return { locationKnown: 0 };

    const { latitude, longitude, locationName, connectionType } = locationData;

    return {
      locationKnown: 1,
      connectionType: connectionType || 'unknown',
      isWifi: connectionType === 'wifi' ? 1 : 0,
      isCellular: connectionType === 'cellular' ? 1 : 0,
      isEthernet: connectionType === 'ethernet' ? 1 : 0,
      locationName: locationName || 'unknown'
    };
  },

  /**
   * Categorize latency into discrete buckets
   *
   * @param {number} latency - Latency in milliseconds
   * @returns {number} - Latency category (0-3)
   */
  categorizeLatency(latency) {
    if (!latency) return 0;
    if (latency < 50) return 0; // Excellent
    if (latency < 100) return 1; // Good
    if (latency < 200) return 2; // Fair
    return 3; // Poor
  },

  /**
   * Categorize quality into discrete buckets
   *
   * @param {number} quality - Network quality (0-1)
   * @returns {number} - Quality category (0-3)
   */
  categorizeQuality(quality) {
    if (!quality && quality !== 0) return 0;
    if (quality > 0.8) return 0; // Excellent
    if (quality > 0.6) return 1; // Good
    if (quality > 0.3) return 2; // Fair
    return 3; // Poor
  },

  /**
   * Categorize bandwidth into discrete buckets
   *
   * @param {number} bandwidth - Bandwidth in Mbps
   * @returns {number} - Bandwidth category (0-3)
   */
  categorizeBandwidth(bandwidth) {
    if (!bandwidth) return 0;
    if (bandwidth > 50) return 0; // Excellent
    if (bandwidth > 20) return 1; // Good
    if (bandwidth > 5) return 2; // Fair
    return 3; // Poor
  }
};

/**
 * Enhanced Connection Prediction Model
 *
 * This model uses a combination of statistical analysis and machine learning
 * techniques to predict network connection issues.
 */
class ConnectionPredictionModel {
  constructor() {
    // Historical data
    this.connectionSamples = [];
    this.connectionIssues = [];
    this.qualityHistory = [];

    // Pattern storage
    this.hourlyPatterns = Array(24).fill(0);
    this.dailyPatterns = Array(7).fill(0);
    this.locationPatterns = {};
    this.transitionPatterns = {};

    // User-specific connection profiles
    this.userProfiles = {};

    // Recurring pattern detection
    this.recurringPatterns = [];
    this.patternDetectionEnabled = true;

    // Model state
    this.isInitialized = false;
    this.lastTrainingTime = 0;
    this.modelConfidence = 0;
    this.adaptiveWeightsEnabled = true;

    // Prediction weights
    this.weights = {
      timePattern: 0.25,
      locationPattern: 0.25,
      recentQuality: 0.15,
      transitionPattern: 0.15,
      userProfile: 0.1,
      recurringPattern: 0.1
    };

    // Thresholds
    this.thresholds = {
      minSamplesForConfidence: 20,
      highRisk: 0.7,
      mediumRisk: 0.4,
      lowRisk: 0.2,
      patternRecognitionThreshold: 0.8,
      minPatternOccurrences: 3
    };

    // Recovery suggestions based on issue types
    this.recoverySuggestions = {
      'poor_signal': 'Move closer to the router or access point',
      'congestion': 'Try connecting during off-peak hours',
      'interference': 'Change Wi-Fi channel or move away from electronic devices',
      'bandwidth_limit': 'Reduce other network usage or upgrade connection',
      'dns_issue': 'Try using alternative DNS servers',
      'intermittent': 'Check for loose connections or router issues',
      'regular_outage': 'Schedule critical sessions outside predicted outage times'
    };
  }

  /**
   * Initialize the model
   *
   * @param {Object} options - Initialization options
   * @returns {boolean} - Success status
   */
  initialize(options = {}) {
    try {
      // Apply custom options
      if (options.weights) {
        this.weights = { ...this.weights, ...options.weights };
      }

      if (options.thresholds) {
        this.thresholds = { ...this.thresholds, ...options.thresholds };
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing connection prediction model:', error);
      return false;
    }
  }

  /**
   * Add a network sample to the model
   *
   * @param {boolean} isOnline - Whether the network is online
   * @param {Date} timestamp - Time of the sample
   * @param {Object} additionalData - Additional data about the network
   * @returns {boolean} - Success status
   */
  addSample(isOnline, timestamp = new Date(), additionalData = {}) {
    try {
      // Extract features
      const timeFeatures = featureEngineering.extractTimeFeatures(timestamp);
      const networkFeatures = featureEngineering.extractNetworkFeatures(additionalData);
      const locationFeatures = featureEngineering.extractLocationFeatures(additionalData.location);

      // Extract user information if available
      const userId = additionalData.userId || 'default';

      // Create sample object
      const sample = {
        isOnline,
        timestamp: timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime(),
        ...timeFeatures,
        ...networkFeatures,
        ...locationFeatures,
        userId,
        raw: additionalData
      };

      // Add to samples
      this.connectionSamples.push(sample);

      // Limit sample size to prevent memory issues
      if (this.connectionSamples.length > 1000) {
        this.connectionSamples.shift();
      }

      // Determine issue type with more granularity
      let issueType = 'none';
      let issueSeverity = 0;

      if (!isOnline) {
        issueType = 'offline';
        issueSeverity = 1.0;
      } else if (networkFeatures.quality !== undefined) {
        if (networkFeatures.quality < 0.3) {
          issueType = 'poor_quality';
          issueSeverity = 0.8;
        } else if (networkFeatures.quality < 0.5) {
          issueType = 'fair_quality';
          issueSeverity = 0.5;
        } else if (networkFeatures.quality < 0.7) {
          issueType = 'moderate_quality';
          issueSeverity = 0.3;
        }
      }

      // If there's an issue, add to issues collection
      if (issueType !== 'none' && issueSeverity > 0) {
        // Try to determine more specific issue type
        const specificIssueType = this.determineSpecificIssueType(networkFeatures, additionalData);

        const issueEntry = {
          ...sample,
          issueType,
          specificIssueType,
          severity: issueSeverity,
          suggestedRecovery: this.recoverySuggestions[specificIssueType] || null
        };

        this.connectionIssues.push(issueEntry);

        // Limit issues size
        if (this.connectionIssues.length > 500) {
          this.connectionIssues.shift();
        }
      }

      // Add to quality history if quality is provided
      if (networkFeatures.quality !== undefined) {
        this.qualityHistory.push({
          timestamp: sample.timestamp,
          quality: networkFeatures.quality,
          hour: timeFeatures.hour,
          dayOfWeek: timeFeatures.dayOfWeek,
          userId
        });

        // Limit quality history size
        if (this.qualityHistory.length > 500) {
          this.qualityHistory.shift();
        }
      }

      // Update patterns
      this.updatePatterns(sample);

      // Update user profile
      this.updateUserProfile(userId, sample);

      // Detect recurring patterns if enabled
      if (this.patternDetectionEnabled && this.connectionSamples.length > 50) {
        this.detectRecurringPatterns();
      }

      // Adaptively update weights if enabled
      if (this.adaptiveWeightsEnabled && this.connectionSamples.length % 50 === 0) {
        this.updateAdaptiveWeights();
      }

      return true;
    } catch (error) {
      console.error('Error adding sample to connection prediction model:', error);
      return false;
    }
  }

  /**
   * Determine more specific issue type based on network metrics
   *
   * @param {Object} networkFeatures - Network features
   * @param {Object} additionalData - Additional data
   * @returns {string} - Specific issue type
   */
  determineSpecificIssueType(networkFeatures, additionalData) {
    const { latency, packetLoss, quality, bandwidthMbps, signalStrength } = networkFeatures;

    // Check for signal strength issues
    if (signalStrength !== undefined && signalStrength < 0.3) {
      return 'poor_signal';
    }

    // Check for high latency
    if (latency !== undefined && latency > 200) {
      return 'congestion';
    }

    // Check for packet loss
    if (packetLoss !== undefined && packetLoss > 0.05) {
      return 'interference';
    }

    // Check for bandwidth limitations
    if (bandwidthMbps !== undefined && bandwidthMbps < 5) {
      return 'bandwidth_limit';
    }

    // Check for DNS issues
    if (additionalData.dnsResolutionTime && additionalData.dnsResolutionTime > 1000) {
      return 'dns_issue';
    }

    // Check for intermittent issues
    if (this.connectionIssues.length > 10) {
      const recentIssues = this.connectionIssues.slice(-10);
      const alternatingPattern = recentIssues.some((issue, i) =>
        i > 0 && issue.issueType !== recentIssues[i-1].issueType
      );

      if (alternatingPattern) {
        return 'intermittent';
      }
    }

    // Check for regular outages
    if (this.recurringPatterns.length > 0) {
      return 'regular_outage';
    }

    // Default to generic issue type
    return quality < 0.3 ? 'poor_quality' : 'fair_quality';
  }

  /**
   * Update user-specific connection profile
   *
   * @param {string} userId - User identifier
   * @param {Object} sample - Connection sample
   */
  updateUserProfile(userId, sample) {
    // Initialize user profile if it doesn't exist
    if (!this.userProfiles[userId]) {
      this.userProfiles[userId] = {
        samples: [],
        hourlyPatterns: Array(24).fill(0),
        dailyPatterns: Array(7).fill(0),
        locations: {},
        connectionTypes: {},
        averageQuality: 0,
        issueFrequency: 0,
        lastUpdated: Date.now()
      };
    }

    const profile = this.userProfiles[userId];

    // Add sample to user profile
    profile.samples.push({
      timestamp: sample.timestamp,
      isOnline: sample.isOnline,
      quality: sample.quality,
      hour: sample.hour,
      dayOfWeek: sample.dayOfWeek,
      locationName: sample.locationName,
      connectionType: sample.connectionType
    });

    // Limit sample size
    if (profile.samples.length > 200) {
      profile.samples.shift();
    }

    // Update hourly patterns
    profile.hourlyPatterns[sample.hour] =
      (profile.hourlyPatterns[sample.hour] * 0.9) + (!sample.isOnline ? 0.1 : 0);

    // Update daily patterns
    profile.dailyPatterns[sample.dayOfWeek] =
      (profile.dailyPatterns[sample.dayOfWeek] * 0.9) + (!sample.isOnline ? 0.1 : 0);

    // Update location stats
    if (sample.locationName) {
      if (!profile.locations[sample.locationName]) {
        profile.locations[sample.locationName] = {
          count: 0,
          offlineCount: 0,
          averageQuality: 0
        };
      }

      const location = profile.locations[sample.locationName];
      location.count++;

      if (!sample.isOnline) {
        location.offlineCount++;
      }

      if (sample.quality !== undefined) {
        location.averageQuality =
          (location.averageQuality * (location.count - 1) + sample.quality) / location.count;
      }
    }

    // Update connection type stats
    if (sample.connectionType) {
      if (!profile.connectionTypes[sample.connectionType]) {
        profile.connectionTypes[sample.connectionType] = {
          count: 0,
          offlineCount: 0,
          averageQuality: 0
        };
      }

      const connType = profile.connectionTypes[sample.connectionType];
      connType.count++;

      if (!sample.isOnline) {
        connType.offlineCount++;
      }

      if (sample.quality !== undefined) {
        connType.averageQuality =
          (connType.averageQuality * (connType.count - 1) + sample.quality) / connType.count;
      }
    }

    // Update average quality
    if (sample.quality !== undefined) {
      const totalSamples = profile.samples.length;
      profile.averageQuality =
        (profile.averageQuality * (totalSamples - 1) + sample.quality) / totalSamples;
    }

    // Update issue frequency
    const issueCount = profile.samples.filter(s => !s.isOnline || (s.quality !== undefined && s.quality < 0.5)).length;
    profile.issueFrequency = issueCount / profile.samples.length;

    // Update last updated timestamp
    profile.lastUpdated = Date.now();
  }

  /**
   * Update pattern data based on a new sample
   *
   * @param {Object} sample - Network sample
   */
  updatePatterns(sample) {
    // Update hourly patterns
    this.hourlyPatterns[sample.hour] =
      (this.hourlyPatterns[sample.hour] * 0.9) + (!sample.isOnline ? 0.1 : 0);

    // Update daily patterns
    this.dailyPatterns[sample.dayOfWeek] =
      (this.dailyPatterns[sample.dayOfWeek] * 0.9) + (!sample.isOnline ? 0.1 : 0);

    // Update location patterns if location is known
    if (sample.locationKnown) {
      const locationKey = sample.locationName || 'unknown';

      if (!this.locationPatterns[locationKey]) {
        this.locationPatterns[locationKey] = {
          totalSamples: 0,
          offlineSamples: 0,
          poorQualitySamples: 0,
          averageQuality: 0,
          hourlyPatterns: Array(24).fill(0),
          connectionTypes: {}
        };
      }

      const locationPattern = this.locationPatterns[locationKey];
      locationPattern.totalSamples++;

      if (!sample.isOnline) {
        locationPattern.offlineSamples++;
      } else if (sample.quality < 0.5) {
        locationPattern.poorQualitySamples++;
      }

      // Update average quality
      if (sample.quality !== undefined) {
        locationPattern.averageQuality =
          (locationPattern.averageQuality * (locationPattern.totalSamples - 1) + sample.quality) /
          locationPattern.totalSamples;
      }

      // Update hourly patterns for this location
      locationPattern.hourlyPatterns[sample.hour] =
        (locationPattern.hourlyPatterns[sample.hour] * 0.9) + (!sample.isOnline ? 0.1 : 0);

      // Update connection type stats
      const connectionType = sample.connectionType || 'unknown';
      locationPattern.connectionTypes[connectionType] =
        (locationPattern.connectionTypes[connectionType] || 0) + 1;
    }

    // Update transition patterns (how network state changes over time)
    // This helps identify patterns like "network often goes offline after being poor quality for 10 minutes"
    if (this.connectionSamples.length > 1) {
      const prevSample = this.connectionSamples[this.connectionSamples.length - 2];
      const currentState = !sample.isOnline ? 'offline' :
        (sample.quality < 0.3 ? 'poor' : (sample.quality < 0.7 ? 'fair' : 'good'));
      const prevState = !prevSample.isOnline ? 'offline' :
        (prevSample.quality < 0.3 ? 'poor' : (prevSample.quality < 0.7 ? 'fair' : 'good'));

      const transitionKey = `${prevState}->${currentState}`;
      this.transitionPatterns[transitionKey] = (this.transitionPatterns[transitionKey] || 0) + 1;
    }
  }

  /**
   * Predict connection issues for a specific time
   *
   * @param {Date} timestamp - Time to predict for
   * @param {Object} options - Prediction options
   * @returns {Object} - Prediction result
   */
  predictConnectionIssues(timestamp = new Date(), options = {}) {
    try {
      const {
        location = null,
        connectionType = null,
        lookAheadHours = 24,
        confidenceThreshold = 0.3,
        userId = 'default',
        includeRecoverySuggestions = true,
        currentState = 'good'
      } = options;

      // If we don't have enough samples, return low confidence prediction
      if (this.connectionSamples.length < this.thresholds.minSamplesForConfidence) {
        return {
          risk: 0.2,
          confidence: this.connectionSamples.length / this.thresholds.minSamplesForConfidence,
          predictions: [],
          reason: 'insufficient_data',
          recoverySuggestions: ['Collecting more data to improve prediction accuracy']
        };
      }

      // Extract features for the prediction time
      const timeFeatures = featureEngineering.extractTimeFeatures(timestamp);
      const locationFeatures = featureEngineering.extractLocationFeatures({
        locationName: location,
        connectionType
      });

      // Generate hourly predictions
      const hourlyPredictions = [];

      for (let i = 0; i < lookAheadHours; i++) {
        const predictionTime = new Date(timestamp.getTime() + i * 60 * 60 * 1000);
        const predictionFeatures = featureEngineering.extractTimeFeatures(predictionTime);

        // Calculate risk factors
        const timePatternRisk = this.calculateTimePatternRisk(predictionFeatures);
        const locationPatternRisk = this.calculateLocationPatternRisk(locationFeatures, predictionFeatures);
        const recentQualityRisk = this.calculateRecentQualityRisk();
        const transitionRisk = this.calculateTransitionRisk();

        // Calculate new risk factors from enhanced model
        const userProfileRisk = this.calculateUserProfileRisk(userId, predictionFeatures, locationFeatures);
        const recurringPatternRisk = this.calculateRecurringPatternRisk(predictionFeatures, locationFeatures, currentState);

        // Find matching recurring patterns
        const matchingPatterns = this.recurringPatterns.filter(pattern => {
          if (pattern.type === 'daily' && pattern.prediction.startHour === predictionFeatures.hour) return true;
          if (pattern.type === 'weekly' && pattern.prediction.daysOfWeek.includes(predictionFeatures.dayOfWeek)) return true;
          if (pattern.type === 'location' && pattern.prediction.location === locationFeatures.locationName) return true;
          if (pattern.type === 'transition' && pattern.prediction.transitionTrigger === currentState) return true;
          return false;
        });

        // Determine likely issue type based on patterns and factors
        let likelyIssueType = null;

        if (locationPatternRisk > 0.7 && locationFeatures.connectionType === 'wifi') {
          likelyIssueType = 'poor_signal';
        } else if (transitionRisk > 0.7) {
          likelyIssueType = 'intermittent';
        } else if (recurringPatternRisk > 0.7) {
          likelyIssueType = 'regular_outage';
        } else if (recentQualityRisk > 0.7) {
          likelyIssueType = 'congestion';
        }

        // Combine risk factors using weights
        const combinedRisk =
          timePatternRisk * this.weights.timePattern +
          locationPatternRisk * this.weights.locationPattern +
          recentQualityRisk * this.weights.recentQuality +
          transitionRisk * this.weights.transitionPattern +
          userProfileRisk * this.weights.userProfile +
          recurringPatternRisk * this.weights.recurringPattern;

        // Calculate confidence based on sample size and pattern strength
        const confidence = Math.min(1.0, this.connectionSamples.length / 100) *
          (0.5 + 0.5 * Math.max(timePatternRisk, locationPatternRisk, recurringPatternRisk));

        // Skip low confidence predictions
        if (confidence < confidenceThreshold) continue;

        // Add prediction
        hourlyPredictions.push({
          timestamp: predictionTime.getTime(),
          hour: predictionFeatures.hour,
          dayOfWeek: predictionFeatures.dayOfWeek,
          risk: combinedRisk,
          confidence,
          factors: {
            timePatternRisk,
            locationPatternRisk,
            recentQualityRisk,
            transitionRisk,
            userProfileRisk,
            recurringPatternRisk
          },
          matchingPatterns: matchingPatterns.length > 0 ? matchingPatterns : null,
          likelyIssueType
        });
      }

      // Sort by risk (highest first)
      hourlyPredictions.sort((a, b) => b.risk - a.risk);

      // Calculate overall risk (weighted average of top 3 hours)
      const topHours = hourlyPredictions.slice(0, 3);
      const overallRisk = topHours.length > 0 ?
        topHours.reduce((sum, hour) => sum + hour.risk * hour.confidence, 0) /
        topHours.reduce((sum, hour) => sum + hour.confidence, 0) : 0.1;

      // Calculate overall confidence
      const overallConfidence = topHours.length > 0 ?
        topHours.reduce((sum, hour) => sum + hour.confidence, 0) / topHours.length : 0.1;

      // Determine most likely issue type from top predictions
      const likelyIssueTypes = topHours
        .filter(p => p.likelyIssueType)
        .map(p => p.likelyIssueType);

      const mostLikelyIssueType = likelyIssueTypes.length > 0 ?
        likelyIssueTypes.reduce((acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}) : null;

      // Get the most frequent issue type
      let primaryIssueType = null;
      if (mostLikelyIssueType) {
        primaryIssueType = Object.entries(mostLikelyIssueType)
          .sort((a, b) => b[1] - a[1])
          .map(([type]) => type)[0];
      }

      // Create prediction result
      const predictionResult = {
        risk: overallRisk,
        confidence: overallConfidence,
        predictions: hourlyPredictions,
        highRiskHours: hourlyPredictions.filter(p => p.risk > this.thresholds.highRisk).length,
        mediumRiskHours: hourlyPredictions.filter(p => p.risk > this.thresholds.mediumRisk && p.risk <= this.thresholds.highRisk).length,
        reason: 'ml_prediction',
        likelyIssueType: primaryIssueType,
        userSpecific: userId !== 'default',
        patternCount: this.recurringPatterns.length,
        modelVersion: '2.0'
      };

      // Add recovery suggestions if requested
      if (includeRecoverySuggestions) {
        predictionResult.recoverySuggestions = this.getRecoverySuggestions(predictionResult);
      }

      return predictionResult;
    } catch (error) {
      console.error('Error predicting connection issues:', error);
      return {
        risk: 0.1,
        confidence: 0,
        predictions: [],
        reason: 'error',
        error: error.message
      };
    }
  }

  /**
   * Calculate risk based on time patterns
   *
   * @param {Object} timeFeatures - Time features
   * @returns {number} - Risk factor (0-1)
   */
  calculateTimePatternRisk(timeFeatures) {
    const { hour, dayOfWeek, weekend } = timeFeatures;

    // Get hourly and daily pattern risks
    const hourlyRisk = this.hourlyPatterns[hour];
    const dailyRisk = this.dailyPatterns[dayOfWeek];

    // Calculate combined risk (weighted average)
    return hourlyRisk * 0.7 + dailyRisk * 0.3;
  }

  /**
   * Calculate risk based on location patterns
   *
   * @param {Object} locationFeatures - Location features
   * @param {Object} timeFeatures - Time features
   * @returns {number} - Risk factor (0-1)
   */
  calculateLocationPatternRisk(locationFeatures, timeFeatures) {
    if (!locationFeatures.locationKnown) return 0.5; // Neutral if location unknown

    const locationKey = locationFeatures.locationName || 'unknown';
    const locationPattern = this.locationPatterns[locationKey];

    // If we don't have data for this location, return neutral risk
    if (!locationPattern) return 0.5;

    // Calculate offline probability for this location
    const offlineProb = locationPattern.totalSamples > 0 ?
      locationPattern.offlineSamples / locationPattern.totalSamples : 0;

    // Calculate poor quality probability for this location
    const poorQualityProb = locationPattern.totalSamples > 0 ?
      locationPattern.poorQualitySamples / locationPattern.totalSamples : 0;

    // Get hourly pattern for this location
    const hourlyLocationRisk = locationPattern.hourlyPatterns[timeFeatures.hour];

    // Check if connection type has issues at this location
    let connectionTypeRisk = 0.5;
    if (locationFeatures.connectionType && locationPattern.connectionTypes) {
      const totalConnections = Object.values(locationPattern.connectionTypes).reduce((a, b) => a + b, 0);
      const connectionCount = locationPattern.connectionTypes[locationFeatures.connectionType] || 0;

      // If this connection type is common at this location, adjust risk
      if (connectionCount > 0 && totalConnections > 0) {
        const connectionRatio = connectionCount / totalConnections;
        connectionTypeRisk = connectionRatio > 0.5 ? 0.3 : 0.7; // Lower risk if common connection type
      }
    }

    // Combine factors
    return (offlineProb * 0.4) + (poorQualityProb * 0.2) + (hourlyLocationRisk * 0.3) + (connectionTypeRisk * 0.1);
  }

  /**
   * Calculate risk based on recent quality measurements
   *
   * @returns {number} - Risk factor (0-1)
   */
  calculateRecentQualityRisk() {
    if (this.qualityHistory.length === 0) return 0.5;

    // Get recent quality measurements (last hour)
    const recentCutoff = Date.now() - (60 * 60 * 1000);
    const recentQuality = this.qualityHistory.filter(q => q.timestamp > recentCutoff);

    if (recentQuality.length === 0) return 0.5;

    // Calculate average recent quality
    const avgQuality = recentQuality.reduce((sum, q) => sum + q.quality, 0) / recentQuality.length;

    // Calculate trend (is quality improving or degrading?)
    let trend = 0;
    if (recentQuality.length >= 2) {
      const sortedQuality = [...recentQuality].sort((a, b) => a.timestamp - b.timestamp);
      const firstHalf = sortedQuality.slice(0, Math.floor(sortedQuality.length / 2));
      const secondHalf = sortedQuality.slice(Math.floor(sortedQuality.length / 2));

      const firstAvg = firstHalf.reduce((sum, q) => sum + q.quality, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, q) => sum + q.quality, 0) / secondHalf.length;

      trend = secondAvg - firstAvg; // Positive means improving, negative means degrading
    }

    // Convert quality to risk (lower quality = higher risk)
    let risk = 1 - avgQuality;

    // Adjust risk based on trend
    if (trend < -0.1) {
      // Quality degrading, increase risk
      risk = Math.min(1, risk * 1.5);
    } else if (trend > 0.1) {
      // Quality improving, decrease risk
      risk = Math.max(0, risk * 0.7);
    }

    return risk;
  }

  /**
   * Calculate risk based on network state transitions
   *
   * @returns {number} - Risk factor (0-1)
   */
  calculateTransitionRisk() {
    if (Object.keys(this.transitionPatterns).length === 0) return 0.5;

    // Get total transitions
    const totalTransitions = Object.values(this.transitionPatterns).reduce((a, b) => a + b, 0);

    if (totalTransitions === 0) return 0.5;

    // Calculate probability of transitions to offline
    const offlineTransitions = Object.entries(this.transitionPatterns)
      .filter(([key]) => key.endsWith('->offline'))
      .reduce((sum, [, count]) => sum + count, 0);

    const offlineProb = offlineTransitions / totalTransitions;

    // Calculate probability of transitions to poor quality
    const poorTransitions = Object.entries(this.transitionPatterns)
      .filter(([key]) => key.endsWith('->poor'))
      .reduce((sum, [, count]) => sum + count, 0);

    const poorProb = poorTransitions / totalTransitions;

    // Calculate probability of recovery from issues
    const recoveryTransitions = Object.entries(this.transitionPatterns)
      .filter(([key]) => (key.startsWith('offline->') || key.startsWith('poor->')) &&
                         (key.endsWith('->good') || key.endsWith('->fair')))
      .reduce((sum, [, count]) => sum + count, 0);

    const recoveryProb = recoveryTransitions / totalTransitions;

    // Combine factors (higher offline/poor probability and lower recovery = higher risk)
    return (offlineProb * 0.5) + (poorProb * 0.3) - (recoveryProb * 0.2);
  }

  /**
   * Detect recurring patterns in connection issues
   */
  detectRecurringPatterns() {
    try {
      // Only analyze if we have enough issues
      if (this.connectionIssues.length < 20) return;

      // Clear existing patterns
      this.recurringPatterns = [];

      // Look for daily patterns (same time every day)
      this.detectDailyPatterns();

      // Look for weekly patterns (same day of week)
      this.detectWeeklyPatterns();

      // Look for location-based patterns
      this.detectLocationPatterns();

      // Look for transition-based patterns
      this.detectTransitionPatterns();

      // Sort patterns by confidence
      this.recurringPatterns.sort((a, b) => b.confidence - a.confidence);

      // Limit to top 10 patterns
      if (this.recurringPatterns.length > 10) {
        this.recurringPatterns = this.recurringPatterns.slice(0, 10);
      }

      console.log(`Detected ${this.recurringPatterns.length} recurring connection patterns`);
    } catch (error) {
      console.error('Error detecting recurring patterns:', error);
    }
  }

  /**
   * Detect daily patterns (issues occurring at the same time each day)
   */
  detectDailyPatterns() {
    // Group issues by hour
    const hourlyIssues = Array(24).fill(0).map(() => []);

    this.connectionIssues.forEach(issue => {
      const hour = new Date(issue.timestamp).getHours();
      hourlyIssues[hour].push(issue);
    });

    // Check each hour for consistent issues
    for (let hour = 0; hour < 24; hour++) {
      const issues = hourlyIssues[hour];

      if (issues.length < this.thresholds.minPatternOccurrences) continue;

      // Calculate days with issues at this hour vs total days observed
      const uniqueDays = new Set();
      const uniqueDaysWithIssues = new Set();

      this.connectionSamples.forEach(sample => {
        const date = new Date(sample.timestamp);
        const sampleHour = date.getHours();
        const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

        if (sampleHour === hour) {
          uniqueDays.add(dayKey);

          if (!sample.isOnline || (sample.quality !== undefined && sample.quality < 0.5)) {
            uniqueDaysWithIssues.add(dayKey);
          }
        }
      });

      // Calculate confidence
      const confidence = uniqueDays.size > 0 ?
        uniqueDaysWithIssues.size / uniqueDays.size : 0;

      // Add pattern if confidence is high enough
      if (confidence >= this.thresholds.patternRecognitionThreshold && uniqueDaysWithIssues.size >= 3) {
        this.recurringPatterns.push({
          type: 'daily',
          hour,
          daysObserved: uniqueDays.size,
          daysWithIssues: uniqueDaysWithIssues.size,
          confidence,
          description: `Connection issues frequently occur at ${hour}:00`,
          prediction: {
            startHour: hour,
            endHour: (hour + 1) % 24,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
          }
        });
      }
    }
  }

  /**
   * Detect weekly patterns (issues occurring on the same day of week)
   */
  detectWeeklyPatterns() {
    // Group issues by day of week
    const dailyIssues = Array(7).fill(0).map(() => []);

    this.connectionIssues.forEach(issue => {
      const dayOfWeek = new Date(issue.timestamp).getDay();
      dailyIssues[dayOfWeek].push(issue);
    });

    // Check each day for consistent issues
    for (let day = 0; day < 7; day++) {
      const issues = dailyIssues[day];

      if (issues.length < this.thresholds.minPatternOccurrences) continue;

      // Calculate weeks with issues on this day vs total weeks observed
      const uniqueWeeks = new Set();
      const uniqueWeeksWithIssues = new Set();

      this.connectionSamples.forEach(sample => {
        const date = new Date(sample.timestamp);
        const sampleDay = date.getDay();
        const weekKey = `${date.getFullYear()}-${Math.floor(date.getDate() / 7)}`;

        if (sampleDay === day) {
          uniqueWeeks.add(weekKey);

          if (!sample.isOnline || (sample.quality !== undefined && sample.quality < 0.5)) {
            uniqueWeeksWithIssues.add(weekKey);
          }
        }
      });

      // Calculate confidence
      const confidence = uniqueWeeks.size > 0 ?
        uniqueWeeksWithIssues.size / uniqueWeeks.size : 0;

      // Add pattern if confidence is high enough
      if (confidence >= this.thresholds.patternRecognitionThreshold && uniqueWeeksWithIssues.size >= 3) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        this.recurringPatterns.push({
          type: 'weekly',
          dayOfWeek: day,
          weeksObserved: uniqueWeeks.size,
          weeksWithIssues: uniqueWeeksWithIssues.size,
          confidence,
          description: `Connection issues frequently occur on ${dayNames[day]}`,
          prediction: {
            daysOfWeek: [day]
          }
        });
      }
    }
  }

  /**
   * Detect location-based patterns
   */
  detectLocationPatterns() {
    // Group issues by location
    const locationIssues = {};

    this.connectionIssues.forEach(issue => {
      if (!issue.locationName) return;

      if (!locationIssues[issue.locationName]) {
        locationIssues[issue.locationName] = [];
      }

      locationIssues[issue.locationName].push(issue);
    });

    // Check each location for consistent issues
    for (const location in locationIssues) {
      const issues = locationIssues[location];

      if (issues.length < this.thresholds.minPatternOccurrences) continue;

      // Calculate visits with issues vs total visits
      const totalVisits = this.connectionSamples.filter(s => s.locationName === location).length;
      const visitsWithIssues = issues.length;

      // Calculate confidence
      const confidence = totalVisits > 0 ? visitsWithIssues / totalVisits : 0;

      // Add pattern if confidence is high enough
      if (confidence >= this.thresholds.patternRecognitionThreshold && visitsWithIssues >= 3) {
        this.recurringPatterns.push({
          type: 'location',
          location,
          totalVisits,
          visitsWithIssues,
          confidence,
          description: `Connection issues frequently occur at location: ${location}`,
          prediction: {
            location
          }
        });
      }
    }
  }

  /**
   * Detect transition-based patterns
   */
  detectTransitionPatterns() {
    // Look for patterns in transition data
    const transitions = Object.entries(this.transitionPatterns)
      .filter(([key, count]) => count >= this.thresholds.minPatternOccurrences)
      .map(([key, count]) => {
        const [fromState, toState] = key.split('->');
        return { fromState, toState, count };
      });

    // Calculate total transitions
    const totalTransitions = Object.values(this.transitionPatterns).reduce((a, b) => a + b, 0);

    // Check for significant transitions
    for (const transition of transitions) {
      const { fromState, toState, count } = transition;

      // Skip transitions to good states
      if (toState === 'good' || toState === 'fair') continue;

      // Calculate confidence
      const confidence = totalTransitions > 0 ? count / totalTransitions : 0;

      // Add pattern if confidence is high enough
      if (confidence >= this.thresholds.patternRecognitionThreshold / 2) { // Lower threshold for transitions
        this.recurringPatterns.push({
          type: 'transition',
          fromState,
          toState,
          occurrences: count,
          totalTransitions,
          confidence,
          description: `Connection frequently transitions from ${fromState} to ${toState}`,
          prediction: {
            transitionTrigger: fromState
          }
        });
      }
    }
  }

  /**
   * Update weights adaptively based on prediction accuracy
   */
  updateAdaptiveWeights() {
    try {
      // Skip if we don't have enough samples
      if (this.connectionSamples.length < 100) return;

      // Calculate accuracy of each factor
      const factorAccuracy = {
        timePattern: 0,
        locationPattern: 0,
        recentQuality: 0,
        transitionPattern: 0,
        userProfile: 0,
        recurringPattern: 0
      };

      // Get recent samples for evaluation
      const recentSamples = this.connectionSamples.slice(-50);

      // For each sample, check if our factors correctly predicted its state
      for (let i = 0; i < recentSamples.length; i++) {
        const sample = recentSamples[i];

        // Skip first sample as we need history
        if (i === 0) continue;

        // Get previous sample
        const prevSample = recentSamples[i - 1];

        // Check time pattern accuracy
        const timeRisk = this.calculateTimePatternRisk(sample);
        if ((timeRisk > 0.5 && !sample.isOnline) || (timeRisk <= 0.5 && sample.isOnline)) {
          factorAccuracy.timePattern++;
        }

        // Check location pattern accuracy
        const locationFeatures = {
          locationKnown: sample.locationKnown,
          locationName: sample.locationName,
          connectionType: sample.connectionType
        };
        const locationRisk = this.calculateLocationPatternRisk(locationFeatures, sample);
        if ((locationRisk > 0.5 && !sample.isOnline) || (locationRisk <= 0.5 && sample.isOnline)) {
          factorAccuracy.locationPattern++;
        }

        // Check recent quality accuracy
        const qualityRisk = this.calculateRecentQualityRisk();
        if ((qualityRisk > 0.5 && !sample.isOnline) || (qualityRisk <= 0.5 && sample.isOnline)) {
          factorAccuracy.recentQuality++;
        }

        // Check transition accuracy
        const transitionRisk = this.calculateTransitionRisk();
        if ((transitionRisk > 0.5 && !sample.isOnline) || (transitionRisk <= 0.5 && sample.isOnline)) {
          factorAccuracy.transitionPattern++;
        }

        // Check user profile accuracy
        if (sample.userId && this.userProfiles[sample.userId]) {
          const profile = this.userProfiles[sample.userId];
          const userRisk = profile.issueFrequency;
          if ((userRisk > 0.5 && !sample.isOnline) || (userRisk <= 0.5 && sample.isOnline)) {
            factorAccuracy.userProfile++;
          }
        }

        // Check recurring pattern accuracy
        if (this.recurringPatterns.length > 0) {
          // Find matching patterns
          const matchingPatterns = this.recurringPatterns.filter(pattern => {
            if (pattern.type === 'daily' && pattern.hour === sample.hour) return true;
            if (pattern.type === 'weekly' && pattern.dayOfWeek === sample.dayOfWeek) return true;
            if (pattern.type === 'location' && pattern.location === sample.locationName) return true;
            if (pattern.type === 'transition' && pattern.fromState === prevSample.state) return true;
            return false;
          });

          if (matchingPatterns.length > 0) {
            // Calculate average confidence
            const avgConfidence = matchingPatterns.reduce((sum, p) => sum + p.confidence, 0) / matchingPatterns.length;

            if ((avgConfidence > 0.5 && !sample.isOnline) || (avgConfidence <= 0.5 && sample.isOnline)) {
              factorAccuracy.recurringPattern++;
            }
          }
        }
      }

      // Convert counts to percentages
      const sampleCount = recentSamples.length - 1; // Skip first sample
      for (const factor in factorAccuracy) {
        factorAccuracy[factor] = factorAccuracy[factor] / sampleCount;
      }

      // Normalize weights to sum to 1
      const totalAccuracy = Object.values(factorAccuracy).reduce((a, b) => a + b, 0);

      if (totalAccuracy > 0) {
        for (const factor in factorAccuracy) {
          this.weights[factor] = factorAccuracy[factor] / totalAccuracy;
        }

        console.log('Updated adaptive weights based on prediction accuracy:', this.weights);
      }
    } catch (error) {
      console.error('Error updating adaptive weights:', error);
    }
  }

  /**
   * Calculate risk based on user profile
   *
   * @param {string} userId - User identifier
   * @param {Object} timeFeatures - Time features
   * @param {Object} locationFeatures - Location features
   * @returns {number} - Risk factor (0-1)
   */
  calculateUserProfileRisk(userId, timeFeatures, locationFeatures) {
    // Use default user if specific user not found
    const profile = this.userProfiles[userId] || this.userProfiles['default'];

    // Return neutral risk if no profile exists
    if (!profile) return 0.5;

    // Get hourly and daily pattern risks from user profile
    const hourlyRisk = profile.hourlyPatterns[timeFeatures.hour];
    const dailyRisk = profile.dailyPatterns[timeFeatures.dayOfWeek];

    // Get location risk if available
    let locationRisk = 0.5;
    if (locationFeatures.locationName && profile.locations[locationFeatures.locationName]) {
      const location = profile.locations[locationFeatures.locationName];
      locationRisk = location.count > 0 ? location.offlineCount / location.count : 0.5;
    }

    // Get connection type risk if available
    let connectionTypeRisk = 0.5;
    if (locationFeatures.connectionType && profile.connectionTypes[locationFeatures.connectionType]) {
      const connType = profile.connectionTypes[locationFeatures.connectionType];
      connectionTypeRisk = connType.count > 0 ? connType.offlineCount / connType.count : 0.5;
    }

    // Combine factors
    return (hourlyRisk * 0.3) + (dailyRisk * 0.2) + (locationRisk * 0.3) + (connectionTypeRisk * 0.2);
  }

  /**
   * Calculate risk based on recurring patterns
   *
   * @param {Object} timeFeatures - Time features
   * @param {Object} locationFeatures - Location features
   * @param {string} currentState - Current connection state
   * @returns {number} - Risk factor (0-1)
   */
  calculateRecurringPatternRisk(timeFeatures, locationFeatures, currentState = 'good') {
    // Return neutral risk if no patterns detected
    if (this.recurringPatterns.length === 0) return 0.5;

    // Find matching patterns
    const matchingPatterns = this.recurringPatterns.filter(pattern => {
      if (pattern.type === 'daily' && pattern.prediction.startHour === timeFeatures.hour) return true;
      if (pattern.type === 'weekly' && pattern.prediction.daysOfWeek.includes(timeFeatures.dayOfWeek)) return true;
      if (pattern.type === 'location' && pattern.prediction.location === locationFeatures.locationName) return true;
      if (pattern.type === 'transition' && pattern.prediction.transitionTrigger === currentState) return true;
      return false;
    });

    // Return neutral risk if no matching patterns
    if (matchingPatterns.length === 0) return 0.5;

    // Calculate average confidence of matching patterns
    const avgConfidence = matchingPatterns.reduce((sum, p) => sum + p.confidence, 0) / matchingPatterns.length;

    return avgConfidence;
  }

  /**
   * Get recovery suggestions for predicted issues
   *
   * @param {Object} prediction - Prediction result
   * @returns {Array<string>} - Recovery suggestions
   */
  getRecoverySuggestions(prediction) {
    const suggestions = [];

    // Skip if no prediction or low risk
    if (!prediction || prediction.risk < this.thresholds.mediumRisk) {
      return suggestions;
    }

    // Add general suggestions based on risk level
    if (prediction.risk > this.thresholds.highRisk) {
      suggestions.push('Consider rescheduling critical sessions to avoid predicted outage times');
    }

    // Add specific suggestions based on prediction factors
    if (prediction.factors) {
      if (prediction.factors.timePatternRisk > 0.7) {
        suggestions.push('Historical data shows connection issues at this time of day');
      }

      if (prediction.factors.locationPatternRisk > 0.7) {
        suggestions.push('This location has frequent connection issues');
      }

      if (prediction.factors.recentQualityRisk > 0.7) {
        suggestions.push('Recent connection quality has been degrading');
      }

      if (prediction.factors.transitionRisk > 0.7) {
        suggestions.push('Connection state transitions suggest imminent issues');
      }
    }

    // Add suggestions from recurring patterns
    if (prediction.matchingPatterns && prediction.matchingPatterns.length > 0) {
      for (const pattern of prediction.matchingPatterns) {
        if (pattern.type === 'daily') {
          suggestions.push(`Regular connection issues occur at ${pattern.hour}:00`);
        } else if (pattern.type === 'weekly') {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          suggestions.push(`Regular connection issues occur on ${dayNames[pattern.dayOfWeek]}`);
        } else if (pattern.type === 'location') {
          suggestions.push(`This location (${pattern.location}) has recurring connection issues`);
        }
      }
    }

    // Add specific issue type suggestions
    if (prediction.likelyIssueType && this.recoverySuggestions[prediction.likelyIssueType]) {
      suggestions.push(this.recoverySuggestions[prediction.likelyIssueType]);
    }

    return suggestions;
  }

  /**
   * Get model status information
   *
   * @returns {Object} - Model status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      sampleCount: this.connectionSamples.length,
      issueCount: this.connectionIssues.length,
      qualityHistoryCount: this.qualityHistory.length,
      locationCount: Object.keys(this.locationPatterns).length,
      transitionCount: Object.keys(this.transitionPatterns).length,
      userProfileCount: Object.keys(this.userProfiles).length,
      recurringPatternCount: this.recurringPatterns.length,
      modelConfidence: this.modelConfidence,
      adaptiveWeights: this.weights,
      patternDetectionEnabled: this.patternDetectionEnabled,
      adaptiveWeightsEnabled: this.adaptiveWeightsEnabled
    };
  }
}

module.exports = ConnectionPredictionModel;
