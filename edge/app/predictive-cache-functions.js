/**
 * Enhanced Prediction Functions for MedTranslate AI Edge Application
 *
 * This module provides advanced prediction functions for the predictive cache
 * with enhanced offline capabilities.
 */

/**
 * Get location-based predictions
 *
 * @param {string} locationName - Current location name
 * @param {number} threshold - Probability threshold
 * @param {Object} options - Prediction options
 * @param {Object} predictionModel - The prediction model
 * @returns {Array<Object>} - Location-based predictions
 */
function getLocationBasedPredictions(locationName, threshold, options = {}, predictionModel = {}) {
  try {
    const predictions = [];
    const { offlineRisk, offlineRiskOnly } = options;

    // Skip if we don't have location patterns
    if (!predictionModel.locationPatterns || !predictionModel.locationPatterns.locationConnectivity) {
      return predictions;
    }

    // Get location connectivity data
    const locationData = predictionModel.locationPatterns.locationConnectivity[locationName];
    if (!locationData) {
      return predictions;
    }

    // Calculate offline risk for this location
    const locationOfflineRisk = locationData.offlineCount /
      Math.max(1, locationData.onlineCount + locationData.offlineCount);

    // Skip if we only want offline risk predictions and this location has low risk
    if (offlineRiskOnly && locationOfflineRisk < 0.3) {
      return predictions;
    }

    // Get language pairs used at this location
    if (locationData.languagePairs) {
      const locationPairs = Object.entries(locationData.languagePairs)
        .sort((a, b) => b[1] - a[1]);

      for (const [pair, count] of locationPairs) {
        // Calculate probability
        const probability = count /
          Object.values(locationData.languagePairs).reduce((sum, c) => sum + c, 0);

        // Skip low probability pairs
        if (probability < threshold) {
          continue;
        }

        const [sourceLanguage, targetLanguage] = pair.split('-');

        // Find best context for this pair at this location
        let bestContext = 'general';
        if (locationData.contexts && locationData.contexts[pair]) {
          const contexts = Object.entries(locationData.contexts[pair])
            .sort((a, b) => b[1] - a[1]);

          if (contexts.length > 0) {
            bestContext = contexts[0][0];
          }
        }

        // Add prediction
        predictions.push({
          sourceLanguage,
          targetLanguage,
          context: bestContext,
          probability,
          score: probability * (1 + locationOfflineRisk), // Boost score based on offline risk
          reason: 'location_based',
          offlineRiskScore: locationOfflineRisk,
          location: locationName
        });
      }
    }

    return predictions;
  } catch (error) {
    console.error('Error getting location-based predictions:', error);
    return [];
  }
}

/**
 * Get device state-based predictions
 *
 * @param {number} batteryLevel - Current battery level
 * @param {number} networkSpeed - Current network speed
 * @param {number} threshold - Probability threshold
 * @param {Object} options - Prediction options
 * @param {Object} predictionModel - The prediction model
 * @returns {Array<Object>} - Device-based predictions
 */
function getDeviceBasedPredictions(batteryLevel, networkSpeed, threshold, options = {}, predictionModel = {}) {
  try {
    const predictions = [];
    const { offlineRisk, offlineRiskOnly } = options;

    // Skip if we only want offline risk predictions and offline risk is low
    if (offlineRiskOnly && offlineRisk < 0.3) {
      return predictions;
    }

    // Skip if we don't have language pairs
    if (!predictionModel.languagePairs) {
      return predictions;
    }

    // Get most important language pairs
    const languagePairs = Object.entries(predictionModel.languagePairs)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3); // Top 3 pairs

    // Calculate device-based risk factors
    const batteryRisk = batteryLevel < 30 ? 0.8 : batteryLevel < 50 ? 0.5 : 0.2;
    const networkRisk = networkSpeed < 500000 ? 0.8 : networkSpeed < 1000000 ? 0.5 : 0.2;
    const combinedRisk = (batteryRisk + networkRisk) / 2;

    // Skip if combined risk is low and we only want high-risk predictions
    if (offlineRiskOnly && combinedRisk < 0.5) {
      return predictions;
    }

    // Add predictions for top language pairs
    for (const [pair, data] of languagePairs) {
      const [sourceLanguage, targetLanguage] = pair.split('-');

      // Find most important context for this pair
      let bestContext = 'general';
      let bestContextCount = 0;

      if (data.contexts) {
        for (const [context, count] of Object.entries(data.contexts)) {
          if (count > bestContextCount) {
            bestContextCount = count;
            bestContext = context;
          }
        }
      }

      // Calculate score based on device state
      const baseScore = data.count /
        Object.values(predictionModel.languagePairs).reduce((sum, p) => sum + p.count, 0);
      const deviceScore = baseScore * (1 + combinedRisk);

      // Add prediction
      predictions.push({
        sourceLanguage,
        targetLanguage,
        context: bestContext,
        probability: baseScore,
        score: deviceScore,
        reason: 'device_state',
        offlineRiskScore: combinedRisk,
        batteryLevel,
        networkSpeed
      });
    }

    return predictions;
  } catch (error) {
    console.error('Error getting device-based predictions:', error);
    return [];
  }
}

/**
 * Get complexity-based predictions
 *
 * @param {string} currentContext - Current context
 * @param {number} threshold - Probability threshold
 * @param {Object} options - Prediction options
 * @param {Object} predictionModel - The prediction model
 * @returns {Array<Object>} - Complexity-based predictions
 */
function getComplexityBasedPredictions(currentContext, threshold, options = {}, predictionModel = {}) {
  try {
    const predictions = [];
    const { offlineRisk, offlineRiskOnly } = options;

    // Skip if we don't have content patterns
    if (!predictionModel.contentPatterns || !predictionModel.contentPatterns.contentComplexity) {
      return predictions;
    }

    // Skip if we only want offline risk predictions and offline risk is low
    if (offlineRiskOnly && offlineRisk < 0.3) {
      return predictions;
    }

    // Get contexts sorted by complexity
    const contexts = Object.entries(predictionModel.contentPatterns.contentComplexity)
      .filter(([context, data]) => data.samples > 5) // Only consider contexts with enough samples
      .sort((a, b) => {
        // Sort by complexity (higher complexity first)
        const aHighComplexity = a[1].complexityDistribution.high + a[1].complexityDistribution.very_high;
        const bHighComplexity = b[1].complexityDistribution.high + b[1].complexityDistribution.very_high;
        return bHighComplexity - aHighComplexity;
      });

    // Get top complex contexts
    const complexContexts = contexts.slice(0, 3); // Top 3 complex contexts

    for (const [context, data] of complexContexts) {
      // Skip current context
      if (context === currentContext) {
        continue;
      }

      // Calculate complexity score
      const totalSamples = Object.values(data.complexityDistribution).reduce((sum, count) => sum + count, 0);
      const highComplexityRatio = (data.complexityDistribution.high + data.complexityDistribution.very_high) / totalSamples;

      // Skip if not complex enough
      if (highComplexityRatio < threshold) {
        continue;
      }

      // Find best language pair for this context
      let bestPair = null;
      let bestPairCount = 0;

      if (predictionModel.contexts && predictionModel.contexts[context] && predictionModel.contexts[context].languagePairs) {
        for (const [pair, count] of Object.entries(predictionModel.contexts[context].languagePairs)) {
          if (count > bestPairCount) {
            bestPairCount = count;
            bestPair = pair;
          }
        }
      }

      if (bestPair) {
        const [sourceLanguage, targetLanguage] = bestPair.split('-');

        // Calculate score
        const score = highComplexityRatio * 0.8; // Slightly lower weight for complexity-based predictions

        // Add prediction
        predictions.push({
          sourceLanguage,
          targetLanguage,
          context,
          probability: highComplexityRatio,
          score,
          reason: 'content_complexity',
          complexityRatio: highComplexityRatio
        });
      }
    }

    return predictions;
  } catch (error) {
    console.error('Error getting complexity-based predictions:', error);
    return [];
  }
}

// Export functions
module.exports = {
  getLocationBasedPredictions,
  getDeviceBasedPredictions,
  getComplexityBasedPredictions
};
