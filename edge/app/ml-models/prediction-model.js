/**
 * Advanced Machine Learning Models for Predictive Caching
 *
 * This module provides sophisticated machine learning models for the
 * predictive caching system, including:
 *
 * 1. Time Series Forecasting - Predicts usage patterns based on time
 * 2. Collaborative Filtering - Identifies similar usage patterns across users
 * 3. Content-Based Filtering - Predicts needs based on content characteristics
 * 4. Network Pattern Analysis - Predicts offline periods based on network patterns
 * 5. Hybrid Recommendation System - Combines multiple approaches for better predictions
 */

// Simple implementation of exponential smoothing for time series forecasting
class ExponentialSmoothingModel {
  constructor(alpha = 0.3) {
    this.alpha = alpha; // Smoothing factor
    this.forecast = null;
  }

  /**
   * Train the model on historical data
   *
   * @param {Array<number>} data - Historical time series data
   */
  train(data) {
    if (!data || data.length === 0) {
      this.forecast = 0;
      return;
    }

    // Initialize with first value
    this.forecast = data[0];

    // Apply exponential smoothing
    for (let i = 1; i < data.length; i++) {
      this.forecast = this.alpha * data[i] + (1 - this.alpha) * this.forecast;
    }
  }

  /**
   * Predict the next value in the time series
   *
   * @returns {number} - Predicted value
   */
  predict() {
    return this.forecast;
  }

  /**
   * Predict multiple steps ahead
   *
   * @param {number} steps - Number of steps to predict
   * @returns {Array<number>} - Array of predictions
   */
  predictMultipleSteps(steps) {
    const predictions = [];
    let currentForecast = this.forecast;

    for (let i = 0; i < steps; i++) {
      predictions.push(currentForecast);
    }

    return predictions;
  }
}

// Double exponential smoothing (Holt's method) for time series with trend
class HoltsModel {
  constructor(alpha = 0.3, beta = 0.1) {
    this.alpha = alpha; // Level smoothing factor
    this.beta = beta;   // Trend smoothing factor
    this.level = null;
    this.trend = null;
  }

  /**
   * Train the model on historical data
   *
   * @param {Array<number>} data - Historical time series data
   */
  train(data) {
    if (!data || data.length < 2) {
      this.level = data ? data[0] || 0 : 0;
      this.trend = 0;
      return;
    }

    // Initialize level and trend
    this.level = data[0];
    this.trend = data[1] - data[0];

    // Apply Holt's method
    for (let i = 1; i < data.length; i++) {
      const prevLevel = this.level;
      this.level = this.alpha * data[i] + (1 - this.alpha) * (prevLevel + this.trend);
      this.trend = this.beta * (this.level - prevLevel) + (1 - this.beta) * this.trend;
    }
  }

  /**
   * Predict the next value in the time series
   *
   * @param {number} steps - Number of steps ahead to predict
   * @returns {number} - Predicted value
   */
  predict(steps = 1) {
    return this.level + steps * this.trend;
  }

  /**
   * Predict multiple steps ahead
   *
   * @param {number} steps - Number of steps to predict
   * @returns {Array<number>} - Array of predictions
   */
  predictMultipleSteps(steps) {
    const predictions = [];

    for (let i = 1; i <= steps; i++) {
      predictions.push(this.predict(i));
    }

    return predictions;
  }
}

// Triple exponential smoothing (Holt-Winters method) for seasonal data
class HoltWintersModel {
  constructor(alpha = 0.3, beta = 0.1, gamma = 0.1, seasonalPeriod = 24) {
    this.alpha = alpha; // Level smoothing factor
    this.beta = beta;   // Trend smoothing factor
    this.gamma = gamma; // Seasonal smoothing factor
    this.seasonalPeriod = seasonalPeriod;
    this.level = null;
    this.trend = null;
    this.seasonalComponents = null;
  }

  /**
   * Train the model on historical data
   *
   * @param {Array<number>} data - Historical time series data
   */
  train(data) {
    if (!data || data.length < this.seasonalPeriod * 2) {
      console.warn('Insufficient data for Holt-Winters model. Need at least 2 seasonal periods.');
      this.level = data ? data[0] || 0 : 0;
      this.trend = 0;
      this.seasonalComponents = Array(this.seasonalPeriod).fill(1);
      return;
    }

    // Initialize seasonal components
    this.seasonalComponents = Array(this.seasonalPeriod).fill(0);

    // Calculate initial seasonal components
    for (let i = 0; i < this.seasonalPeriod; i++) {
      let sum = 0;
      let count = 0;

      for (let j = i; j < data.length; j += this.seasonalPeriod) {
        if (j < data.length) {
          sum += data[j];
          count++;
        }
      }

      this.seasonalComponents[i] = count > 0 ? sum / count : 0;
    }

    // Normalize seasonal components
    const seasonalAvg = this.seasonalComponents.reduce((a, b) => a + b, 0) / this.seasonalPeriod;
    this.seasonalComponents = this.seasonalComponents.map(s => s / seasonalAvg);

    // Initialize level and trend
    this.level = data[0];
    this.trend = (data[this.seasonalPeriod] - data[0]) / this.seasonalPeriod;

    // Apply Holt-Winters method
    for (let i = 0; i < data.length; i++) {
      const season = i % this.seasonalPeriod;
      const prevLevel = this.level;

      // Update level, trend, and seasonal components
      this.level = this.alpha * (data[i] / this.seasonalComponents[season]) +
                  (1 - this.alpha) * (prevLevel + this.trend);

      this.trend = this.beta * (this.level - prevLevel) +
                  (1 - this.beta) * this.trend;

      this.seasonalComponents[season] = this.gamma * (data[i] / this.level) +
                                      (1 - this.gamma) * this.seasonalComponents[season];
    }
  }

  /**
   * Predict the next value in the time series
   *
   * @param {number} steps - Number of steps ahead to predict
   * @returns {number} - Predicted value
   */
  predict(steps = 1) {
    const season = (steps - 1) % this.seasonalPeriod;
    return (this.level + steps * this.trend) * this.seasonalComponents[season];
  }

  /**
   * Predict multiple steps ahead
   *
   * @param {number} steps - Number of steps to predict
   * @returns {Array<number>} - Array of predictions
   */
  predictMultipleSteps(steps) {
    const predictions = [];

    for (let i = 1; i <= steps; i++) {
      predictions.push(this.predict(i));
    }

    return predictions;
  }
}

// Content-based filtering model
class ContentBasedFilteringModel {
  constructor() {
    this.contentProfiles = {};
    this.userPreferences = {};
  }

  /**
   * Add a content item to the model
   *
   * @param {string} itemId - Unique identifier for the content
   * @param {Object} features - Feature vector for the content
   */
  addContentItem(itemId, features) {
    this.contentProfiles[itemId] = features;
  }

  /**
   * Update user preferences based on usage
   *
   * @param {string} userId - User identifier
   * @param {string} itemId - Content item identifier
   * @param {number} weight - Weight of the interaction (default: 1)
   */
  updateUserPreferences(userId, itemId, weight = 1) {
    if (!this.contentProfiles[itemId]) {
      return;
    }

    if (!this.userPreferences[userId]) {
      this.userPreferences[userId] = {};
    }

    const features = this.contentProfiles[itemId];
    const userPrefs = this.userPreferences[userId];

    // Update user preferences based on content features
    for (const [feature, value] of Object.entries(features)) {
      userPrefs[feature] = (userPrefs[feature] || 0) + value * weight;
    }
  }

  /**
   * Calculate similarity between two feature vectors
   *
   * @param {Object} features1 - First feature vector
   * @param {Object} features2 - Second feature vector
   * @returns {number} - Cosine similarity (-1 to 1)
   */
  calculateSimilarity(features1, features2) {
    const allFeatures = new Set([
      ...Object.keys(features1),
      ...Object.keys(features2)
    ]);

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const feature of allFeatures) {
      const value1 = features1[feature] || 0;
      const value2 = features2[feature] || 0;

      dotProduct += value1 * value2;
      magnitude1 += value1 * value1;
      magnitude2 += value2 * value2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Get recommendations for a user
   *
   * @param {string} userId - User identifier
   * @param {number} count - Number of recommendations to return
   * @returns {Array<Object>} - Recommended items with scores
   */
  getRecommendations(userId, count = 10) {
    if (!this.userPreferences[userId]) {
      return [];
    }

    const userPrefs = this.userPreferences[userId];
    const scores = [];

    // Calculate similarity scores for all content items
    for (const [itemId, features] of Object.entries(this.contentProfiles)) {
      const similarity = this.calculateSimilarity(userPrefs, features);
      scores.push({ itemId, score: similarity });
    }

    // Sort by score and return top recommendations
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }
}

// Network pattern analysis model
class NetworkPatternModel {
  constructor() {
    this.hourlyPatterns = Array(24).fill(0);
    this.dailyPatterns = Array(7).fill(0);
    this.offlineEvents = [];
    this.connectionIssueEvents = []; // New: Track connection issue events
    this.qualityDegradationEvents = []; // New: Track quality degradation events
    this.totalSamples = 0;
    this.lastNetworkQuality = 1.0; // New: Track last network quality
    this.networkQualityHistory = []; // New: Track network quality history
    this.locationPatterns = {}; // New: Track location-based patterns
  }

  /**
   * Add a network status sample
   *
   * @param {boolean} isOnline - Whether the network is online
   * @param {Date} timestamp - Time of the sample
   * @param {Object} additionalData - Additional data about the network status
   */
  addSample(isOnline, timestamp = new Date(), additionalData = {}) {
    const hour = timestamp.getHours();
    const day = timestamp.getDay();

    this.totalSamples++;

    // Extract additional data if provided
    const {
      quality = null,
      latency = null,
      packetLoss = null,
      location = null,
      connectionType = null,
      signalStrength = null
    } = additionalData;

    // Record network quality if provided
    if (quality !== null) {
      this.lastNetworkQuality = quality;

      // Add to quality history
      this.networkQualityHistory.push({
        timestamp: timestamp.getTime(),
        quality,
        hour,
        day,
        latency,
        packetLoss
      });

      // Limit history size
      if (this.networkQualityHistory.length > 1000) {
        this.networkQualityHistory.shift();
      }

      // Detect quality degradation (quality dropped by more than 30%)
      if (this.networkQualityHistory.length > 1) {
        const prevQuality = this.networkQualityHistory[this.networkQualityHistory.length - 2].quality;
        if (quality < prevQuality * 0.7) {
          this.qualityDegradationEvents.push({
            timestamp: timestamp.getTime(),
            prevQuality,
            newQuality: quality,
            hour,
            day,
            latency,
            packetLoss
          });
        }
      }
    }

    // Record location-based patterns if location provided
    if (location && typeof location === 'object' && location.latitude !== undefined && location.longitude !== undefined) {
      const locationKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;

      if (!this.locationPatterns[locationKey]) {
        this.locationPatterns[locationKey] = {
          onlineCount: 0,
          offlineCount: 0,
          qualitySum: 0,
          sampleCount: 0,
          connectionTypes: {},
          lastSeen: timestamp.getTime()
        };
      }

      const locationPattern = this.locationPatterns[locationKey];
      locationPattern.lastSeen = timestamp.getTime();
      locationPattern.sampleCount++;

      if (isOnline) {
        locationPattern.onlineCount++;
        if (quality !== null) {
          locationPattern.qualitySum += quality;
        }
      } else {
        locationPattern.offlineCount++;
      }

      if (connectionType) {
        locationPattern.connectionTypes[connectionType] =
          (locationPattern.connectionTypes[connectionType] || 0) + 1;
      }
    }

    if (!isOnline) {
      // Update hourly and daily patterns
      this.hourlyPatterns[hour]++;
      this.dailyPatterns[day]++;

      // Record offline event
      this.offlineEvents.push({
        timestamp: timestamp.getTime(),
        hour,
        day,
        location,
        connectionType,
        signalStrength
      });
    } else if (quality !== null && quality < 0.5) {
      // Record connection issue event for poor quality even when online
      this.connectionIssueEvents.push({
        timestamp: timestamp.getTime(),
        hour,
        day,
        quality,
        latency,
        packetLoss,
        location,
        connectionType,
        signalStrength,
        type: 'poor_quality'
      });
    }
  }

  /**
   * Calculate offline probability for a specific hour
   *
   * @param {number} hour - Hour of the day (0-23)
   * @returns {number} - Probability of being offline (0-1)
   */
  getHourlyOfflineProbability(hour) {
    if (this.totalSamples === 0) return 0;

    // Calculate samples for this hour
    let hourSamples = 0;
    for (let i = 0; i < this.totalSamples; i++) {
      if (i % 24 === hour) hourSamples++;
    }

    return hourSamples > 0 ? this.hourlyPatterns[hour] / hourSamples : 0;
  }

  /**
   * Calculate offline probability for a specific day
   *
   * @param {number} day - Day of the week (0-6, where 0 is Sunday)
   * @returns {number} - Probability of being offline (0-1)
   */
  getDailyOfflineProbability(day) {
    if (this.totalSamples === 0) return 0;

    // Calculate samples for this day
    let daySamples = 0;
    for (let i = 0; i < this.totalSamples; i++) {
      if (Math.floor(i / 24) % 7 === day) daySamples++;
    }

    return daySamples > 0 ? this.dailyPatterns[day] / daySamples : 0;
  }

  /**
   * Predict offline risk for a specific time
   *
   * @param {Date} timestamp - Time to predict for
   * @returns {number} - Offline risk (0-1)
   */
  predictOfflineRisk(timestamp = new Date()) {
    const hour = timestamp.getHours();
    const day = timestamp.getDay();

    const hourlyRisk = this.getHourlyOfflineProbability(hour);
    const dailyRisk = this.getDailyOfflineProbability(day);

    // Combine hourly and daily risks (weighted average)
    return hourlyRisk * 0.7 + dailyRisk * 0.3;
  }

  /**
   * Find patterns in offline events
   *
   * @returns {Object} - Patterns found in offline events
   */
  findPatterns() {
    if (this.offlineEvents.length < 10) {
      return { patterns: [], confidence: 0 };
    }

    // Find common time ranges for offline events
    const hourCounts = Array(24).fill(0);
    const dayCounts = Array(7).fill(0);

    for (const event of this.offlineEvents) {
      hourCounts[event.hour]++;
      dayCounts[event.day]++;
    }

    // Identify peak offline hours (top 25%)
    const sortedHours = [...hourCounts]
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);

    const peakHours = sortedHours
      .slice(0, Math.max(1, Math.ceil(sortedHours.length / 4)))
      .map(h => h.hour);

    // Identify peak offline days
    const sortedDays = [...dayCounts]
      .map((count, day) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    const peakDays = sortedDays
      .slice(0, Math.max(1, Math.ceil(sortedDays.length / 3)))
      .map(d => d.day);

    // Calculate confidence based on sample size and concentration
    const totalEvents = this.offlineEvents.length;
    const peakHourEvents = peakHours.reduce((sum, hour) => sum + hourCounts[hour], 0);
    const peakDayEvents = peakDays.reduce((sum, day) => sum + dayCounts[day], 0);

    const hourConcentration = peakHourEvents / totalEvents;
    const dayConcentration = peakDayEvents / totalEvents;

    const confidence = (hourConcentration * 0.7 + dayConcentration * 0.3) *
                      Math.min(1, totalEvents / 100); // Scale by sample size up to 100 samples

    return {
      patterns: {
        peakOfflineHours: peakHours,
        peakOfflineDays: peakDays,
        hourlyDistribution: hourCounts.map(count => count / totalEvents),
        dailyDistribution: dayCounts.map(count => count / totalEvents)
      },
      confidence
    };
  }

  /**
   * Find patterns in connection issue events (including both offline and poor quality)
   *
   * @returns {Object} - Patterns found in connection issue events
   */
  findConnectionIssuePatterns() {
    // Combine offline events and connection issue events
    const allIssueEvents = [
      ...this.offlineEvents.map(event => ({ ...event, type: 'offline' })),
      ...this.connectionIssueEvents
    ];

    if (allIssueEvents.length < 10) {
      return { patterns: [], confidence: 0 };
    }

    // Find common time ranges for connection issues
    const hourCounts = Array(24).fill(0);
    const dayCounts = Array(7).fill(0);
    const issueTypes = {};
    const locationIssues = {};

    for (const event of allIssueEvents) {
      hourCounts[event.hour]++;
      dayCounts[event.day]++;

      // Track issue types
      const type = event.type || 'offline';
      issueTypes[type] = (issueTypes[type] || 0) + 1;

      // Track location-based issues
      if (event.location && typeof event.location === 'object' && event.location.latitude !== undefined && event.location.longitude !== undefined) {
        const locationKey = `${event.location.latitude.toFixed(4)},${event.location.longitude.toFixed(4)}`;

        if (!locationIssues[locationKey]) {
          locationIssues[locationKey] = {
            count: 0,
            types: {}
          };
        }

        locationIssues[locationKey].count++;
        locationIssues[locationKey].types[type] = (locationIssues[locationKey].types[type] || 0) + 1;
      }
    }

    // Identify peak issue hours (top 25%)
    const sortedHours = [...hourCounts]
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);

    const peakHours = sortedHours
      .slice(0, Math.max(1, Math.ceil(sortedHours.length / 4)))
      .map(h => h.hour);

    // Identify peak issue days
    const sortedDays = [...dayCounts]
      .map((count, day) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    const peakDays = sortedDays
      .slice(0, Math.max(1, Math.ceil(sortedDays.length / 3)))
      .map(d => d.day);

    // Identify problematic locations
    const sortedLocations = Object.entries(locationIssues)
      .map(([location, data]) => ({ location, count: data.count, types: data.types }))
      .sort((a, b) => b.count - a.count);

    const problematicLocations = sortedLocations
      .slice(0, Math.max(1, Math.ceil(sortedLocations.length / 3)));

    // Calculate confidence based on sample size and concentration
    const totalEvents = allIssueEvents.length;
    const peakHourEvents = peakHours.reduce((sum, hour) => sum + hourCounts[hour], 0);
    const peakDayEvents = peakDays.reduce((sum, day) => sum + dayCounts[day], 0);

    const hourConcentration = peakHourEvents / totalEvents;
    const dayConcentration = peakDayEvents / totalEvents;

    const confidence = (hourConcentration * 0.6 + dayConcentration * 0.2 +
                       (problematicLocations.length > 0 ? 0.2 : 0)) *
                       Math.min(1, totalEvents / 100); // Scale by sample size up to 100 samples

    return {
      patterns: {
        peakIssueHours: peakHours,
        peakIssueDays: peakDays,
        hourlyDistribution: hourCounts.map(count => count / totalEvents),
        dailyDistribution: dayCounts.map(count => count / totalEvents),
        issueTypes,
        problematicLocations
      },
      confidence,
      totalIssues: totalEvents
    };
  }

  /**
   * Predict connection issues for a specific time and location
   *
   * @param {Date} timestamp - Time to predict for
   * @param {Object} options - Additional options for prediction
   * @returns {Object} - Connection issue prediction
   */
  predictConnectionIssues(timestamp = new Date(), options = {}) {
    const {
      location = null,
      connectionType = null,
      lookAheadHours = 24,
      confidenceThreshold = 0.3
    } = options;

    // Get current hour and day
    const currentHour = timestamp.getHours();
    const currentDay = timestamp.getDay();

    // Get connection issue patterns
    const issuePatterns = this.findConnectionIssuePatterns();

    // If we don't have enough data or confidence is too low, return low risk
    if (issuePatterns.confidence < confidenceThreshold) {
      return {
        risk: 0.1,
        confidence: issuePatterns.confidence,
        predictions: [],
        reason: 'insufficient_data'
      };
    }

    // Calculate base risk from patterns
    const hourlyRisks = [];

    // Generate hourly predictions for the look-ahead period
    for (let i = 0; i < lookAheadHours; i++) {
      const predictionHour = (currentHour + i) % 24;
      const predictionDay = (currentDay + Math.floor((currentHour + i) / 24)) % 7;

      // Get hourly and daily risk factors
      const hourlyRisk = issuePatterns.patterns.hourlyDistribution[predictionHour];
      const dailyRisk = issuePatterns.patterns.dailyDistribution[predictionDay];

      // Check if this is a peak issue hour or day
      const isPeakHour = issuePatterns.patterns.peakIssueHours.includes(predictionHour);
      const isPeakDay = issuePatterns.patterns.peakIssueDays.includes(predictionDay);

      // Calculate combined risk (weighted average)
      let combinedRisk = hourlyRisk * 0.7 + dailyRisk * 0.3;

      // Boost risk for peak hours and days
      if (isPeakHour) combinedRisk *= 1.5;
      if (isPeakDay) combinedRisk *= 1.2;

      // Cap risk at 1.0
      combinedRisk = Math.min(1.0, combinedRisk);

      // Adjust risk based on location if provided
      if (location && typeof location === 'object' && location.latitude !== undefined && location.longitude !== undefined) {
        const locationKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;

        // Check if this location is in problematic locations
        const locationInfo = issuePatterns.patterns.problematicLocations.find(
          loc => loc.location === locationKey
        );

        if (locationInfo) {
          // Increase risk for problematic locations
          combinedRisk = Math.min(1.0, combinedRisk * 1.5);
        } else if (this.locationPatterns[locationKey]) {
          // Check location patterns
          const locationPattern = this.locationPatterns[locationKey];
          const offlineRatio = locationPattern.offlineCount /
            (locationPattern.onlineCount + locationPattern.offlineCount);

          if (offlineRatio > 0.3) {
            // Location has significant offline history
            combinedRisk = Math.min(1.0, combinedRisk * 1.3);
          }
        }
      }

      // Adjust risk based on connection type if provided
      if (connectionType && issuePatterns.patterns.issueTypes) {
        // Check if we have connection type specific issues
        const connectionTypeIssues = Object.entries(issuePatterns.patterns.issueTypes)
          .filter(([type]) => type.includes(connectionType))
          .reduce((sum, [, count]) => sum + count, 0);

        if (connectionTypeIssues > 0) {
          const connectionTypeRatio = connectionTypeIssues / issuePatterns.totalIssues;
          if (connectionTypeRatio > 0.3) {
            // Connection type has significant issues
            combinedRisk = Math.min(1.0, combinedRisk * 1.2);
          }
        }
      }

      // Add prediction to hourly risks
      hourlyRisks.push({
        hour: predictionHour,
        day: predictionDay,
        timestamp: new Date(timestamp.getTime() + i * 60 * 60 * 1000),
        risk: combinedRisk,
        isPeakHour,
        isPeakDay
      });
    }

    // Sort by risk (highest first)
    hourlyRisks.sort((a, b) => b.risk - a.risk);

    // Calculate overall risk (weighted average of top 3 hours)
    const topHours = hourlyRisks.slice(0, 3);
    const overallRisk = topHours.reduce((sum, hour) => sum + hour.risk, 0) /
      (topHours.length || 1);

    return {
      risk: overallRisk,
      confidence: issuePatterns.confidence,
      predictions: hourlyRisks,
      patterns: issuePatterns.patterns,
      highRiskHours: hourlyRisks.filter(hour => hour.risk > 0.6).length,
      reason: 'pattern_analysis'
    };
  }
}

// Hybrid recommendation system that combines multiple models
class HybridRecommendationSystem {
  constructor() {
    this.timeSeriesModel = new HoltWintersModel();
    this.contentModel = new ContentBasedFilteringModel();
    this.networkModel = new NetworkPatternModel();
    this.modelWeights = {
      timeSeries: 0.4,
      content: 0.4,
      network: 0.2
    };
  }

  /**
   * Train all models with available data
   *
   * @param {Object} trainingData - Data for training the models
   */
  train(trainingData) {
    // Train time series model if data available
    if (trainingData.timeSeriesData && trainingData.timeSeriesData.length > 0) {
      this.timeSeriesModel.train(trainingData.timeSeriesData);
    }

    // Train content model if data available
    if (trainingData.contentItems) {
      for (const [itemId, features] of Object.entries(trainingData.contentItems)) {
        this.contentModel.addContentItem(itemId, features);
      }
    }

    // Train user preferences if data available
    if (trainingData.userInteractions) {
      for (const interaction of trainingData.userInteractions) {
        this.contentModel.updateUserPreferences(
          interaction.userId,
          interaction.itemId,
          interaction.weight
        );
      }
    }

    // Train network model if data available
    if (trainingData.networkSamples) {
      for (const sample of trainingData.networkSamples) {
        this.networkModel.addSample(sample.isOnline, new Date(sample.timestamp));
      }
    }
  }

  /**
   * Get recommendations using all models
   *
   * @param {Object} params - Parameters for generating recommendations
   * @returns {Array<Object>} - Recommended items with scores
   */
  getRecommendations(params) {
    const recommendations = [];

    // Get time series predictions if applicable
    if (params.timeSeriesParams) {
      const timeSeriesPredictions = this.timeSeriesModel.predictMultipleSteps(
        params.timeSeriesParams.steps || 1
      );

      // Convert predictions to recommendations
      for (let i = 0; i < timeSeriesPredictions.length; i++) {
        recommendations.push({
          source: 'timeSeries',
          score: timeSeriesPredictions[i] * this.modelWeights.timeSeries,
          step: i + 1,
          prediction: timeSeriesPredictions[i]
        });
      }
    }

    // Get content-based recommendations if applicable
    if (params.userId) {
      const contentRecommendations = this.contentModel.getRecommendations(
        params.userId,
        params.count || 10
      );

      // Add content recommendations
      for (const rec of contentRecommendations) {
        recommendations.push({
          source: 'content',
          itemId: rec.itemId,
          score: rec.score * this.modelWeights.content
        });
      }
    }

    // Get network predictions if applicable
    if (params.predictOfflineRisk) {
      const offlineRisk = this.networkModel.predictOfflineRisk(
        params.timestamp || new Date()
      );

      const networkPatterns = this.networkModel.findPatterns();

      // Add network-based recommendations
      recommendations.push({
        source: 'network',
        offlineRisk,
        score: offlineRisk * this.modelWeights.network,
        patterns: networkPatterns.patterns,
        confidence: networkPatterns.confidence
      });
    }

    // Sort by score and return
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Update model weights based on performance
   *
   * @param {Object} performance - Performance metrics for each model
   */
  updateModelWeights(performance) {
    const totalPerformance =
      performance.timeSeries +
      performance.content +
      performance.network;

    if (totalPerformance > 0) {
      this.modelWeights = {
        timeSeries: performance.timeSeries / totalPerformance,
        content: performance.content / totalPerformance,
        network: performance.network / totalPerformance
      };
    }
  }
}

// Export models
module.exports = {
  ExponentialSmoothingModel,
  HoltsModel,
  HoltWintersModel,
  ContentBasedFilteringModel,
  NetworkPatternModel,
  HybridRecommendationSystem
};
