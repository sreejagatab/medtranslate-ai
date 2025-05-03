/**
 * Adaptive Confidence Threshold Module for MedTranslate AI
 *
 * This module provides functionality to dynamically adjust confidence thresholds
 * based on medical context, language pair, and other factors.
 *
 * Enhanced with context-specific adaptive thresholds that consider:
 * - Medical context complexity and criticality
 * - Medical terminology density and specificity
 * - Language pair characteristics
 * - Historical accuracy data
 */

const fs = require('fs');
const path = require('path');
const { extractMedicalTermsSimple } = require('./medical-kb');

// Load confidence thresholds configuration
const THRESHOLDS_CONFIG_PATH = process.env.THRESHOLDS_CONFIG_PATH || '../../models/configs/confidence-thresholds.json';
let thresholdsConfig = null;

try {
  const configPath = path.resolve(__dirname, THRESHOLDS_CONFIG_PATH);
  if (fs.existsSync(configPath)) {
    thresholdsConfig = require(configPath);
    console.log('Loaded confidence thresholds configuration from:', configPath);
  }
} catch (error) {
  console.warn('Error loading confidence thresholds configuration:', error.message);
  console.warn('Using default confidence thresholds');
}

// Default thresholds if configuration is not available
const DEFAULT_THRESHOLDS = {
  high: 0.9,
  medium: 0.75,
  low: 0.6
};

// Medical context complexity ratings (higher = more complex/critical)
const CONTEXT_COMPLEXITY = {
  'general': 1.0,
  'cardiology': 1.4,
  'neurology': 1.5,
  'oncology': 1.6,
  'emergency': 1.7,
  'pediatrics': 1.3,
  'psychiatry': 1.2,
  'radiology': 1.1,
  'surgery': 1.5,
  'obstetrics': 1.3,
  'gynecology': 1.2,
  'orthopedics': 1.1,
  'dermatology': 1.0,
  'ophthalmology': 1.2,
  'urology': 1.1,
  'endocrinology': 1.3,
  'gastroenterology': 1.2,
  'pulmonology': 1.3,
  'nephrology': 1.3,
  'hematology': 1.4,
  'immunology': 1.5,
  'infectious_disease': 1.4,
  'rheumatology': 1.2,
  'anesthesiology': 1.4,
  'pathology': 1.3,
  'pharmacy': 1.2
};

/**
 * Get base confidence thresholds for a specific medical context
 *
 * @param {string} medicalContext - The medical context (e.g., 'cardiology', 'neurology')
 * @returns {Object} - Confidence thresholds for the context
 */
function getContextThresholds(medicalContext) {
  if (!thresholdsConfig) {
    return DEFAULT_THRESHOLDS;
  }

  // Check if we have thresholds for this context
  if (thresholdsConfig.contexts && thresholdsConfig.contexts[medicalContext]) {
    return thresholdsConfig.contexts[medicalContext];
  }

  // Fall back to default thresholds
  return thresholdsConfig.default || DEFAULT_THRESHOLDS;
}

/**
 * Get language pair specific adjustments
 *
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Object|null} - Language pair specific thresholds or null
 */
function getLanguagePairAdjustments(sourceLanguage, targetLanguage) {
  if (!thresholdsConfig || !thresholdsConfig.languagePairs) {
    return null;
  }

  const languagePair = `${sourceLanguage}-${targetLanguage}`;
  return thresholdsConfig.languagePairs[languagePair] || null;
}

/**
 * Analyze the complexity of medical terminology in text
 *
 * @param {string} text - The text to analyze
 * @param {string} language - The language code
 * @param {string} medicalContext - The medical context
 * @returns {Object} - Analysis results including density and complexity scores
 */
function analyzeMedicalTerminologyComplexity(text, language, medicalContext) {
  // Extract medical terms
  const medicalTerms = extractMedicalTermsSimple(text, language);

  // Calculate basic density (percentage of words that are medical terms)
  const words = text.split(/\s+/).length;
  const density = words > 0 ? medicalTerms.length / words : 0;

  // Initialize complexity score
  let complexityScore = 1.0;

  // Adjust complexity based on term length (longer terms are often more complex)
  const avgTermLength = medicalTerms.length > 0
    ? medicalTerms.reduce((sum, term) => sum + term.length, 0) / medicalTerms.length
    : 0;

  // Terms longer than 10 characters are often more complex
  if (avgTermLength > 10) {
    complexityScore += 0.2;
  } else if (avgTermLength > 7) {
    complexityScore += 0.1;
  }

  // Check for critical terms if available in thresholds config
  let criticalTermsCount = 0;
  let criticalTermsPresent = false;

  if (thresholdsConfig && thresholdsConfig.contexts &&
      thresholdsConfig.contexts[medicalContext] &&
      thresholdsConfig.contexts[medicalContext].criticalTerms) {

    const criticalTerms = thresholdsConfig.contexts[medicalContext].criticalTerms;
    const lowerText = text.toLowerCase();

    criticalTermsCount = criticalTerms.filter(term =>
      lowerText.includes(term.toLowerCase())
    ).length;

    criticalTermsPresent = criticalTermsCount > 0;

    // Increase complexity score based on critical terms presence
    if (criticalTermsPresent) {
      complexityScore += 0.1 * Math.min(criticalTermsCount, 3); // Cap at 0.3 increase
    }
  }

  return {
    density,
    complexityScore,
    termCount: medicalTerms.length,
    avgTermLength,
    criticalTermsPresent,
    criticalTermsCount
  };
}

/**
 * Get context complexity factor
 *
 * @param {string} medicalContext - The medical context
 * @returns {number} - Complexity factor (1.0 = baseline)
 */
function getContextComplexityFactor(medicalContext) {
  return CONTEXT_COMPLEXITY[medicalContext] || 1.0;
}

/**
 * Calculate adaptive confidence thresholds based on context and other factors
 *
 * @param {string} medicalContext - Medical context
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceText - Source text to translate
 * @param {Object} additionalFactors - Additional factors to consider
 * @returns {Object} - Adaptive confidence thresholds
 */
function calculateAdaptiveThresholds(medicalContext, sourceLanguage, targetLanguage, sourceText, additionalFactors = {}) {
  // Get base thresholds for the context
  const baseThresholds = getContextThresholds(medicalContext);

  // Start with base thresholds
  const adaptiveThresholds = {
    high: baseThresholds.high,
    medium: baseThresholds.medium,
    low: baseThresholds.low
  };

  // Apply language pair adjustments if available
  const languagePairAdjustments = getLanguagePairAdjustments(sourceLanguage, targetLanguage);
  if (languagePairAdjustments) {
    adaptiveThresholds.high = languagePairAdjustments.high;
    adaptiveThresholds.medium = languagePairAdjustments.medium;
    adaptiveThresholds.low = languagePairAdjustments.low;
  }

  // If no configuration is available, return the base thresholds
  if (!thresholdsConfig || !thresholdsConfig.adaptiveFactors) {
    return adaptiveThresholds;
  }

  // Apply text length adjustment
  const textLength = sourceText.length;
  let lengthCategory = 'medium';
  if (textLength < 100) {
    lengthCategory = 'short';
  } else if (textLength > 500) {
    lengthCategory = 'long';
  }

  const lengthAdjustment = thresholdsConfig.adaptiveFactors.textLength[lengthCategory] || 0;
  adaptiveThresholds.high += lengthAdjustment;
  adaptiveThresholds.medium += lengthAdjustment;
  adaptiveThresholds.low += lengthAdjustment;

  // Analyze medical terminology complexity
  const terminologyAnalysis = analyzeMedicalTerminologyComplexity(sourceText, sourceLanguage, medicalContext);

  // Apply adjustments based on terminology complexity
  if (terminologyAnalysis.complexityScore > 1.2) {
    // For highly complex medical content, increase thresholds
    const complexityAdjustment = 0.03 * (terminologyAnalysis.complexityScore - 1.0);
    adaptiveThresholds.high += complexityAdjustment;
    adaptiveThresholds.medium += complexityAdjustment;
    adaptiveThresholds.low += complexityAdjustment;
  }

  // Apply adjustments based on terminology density
  if (terminologyAnalysis.density > 0.2) {
    // For text with high medical term density, increase thresholds
    const densityAdjustment = 0.05 * Math.min(terminologyAnalysis.density, 0.5);
    adaptiveThresholds.high += densityAdjustment;
    adaptiveThresholds.medium += densityAdjustment;
    adaptiveThresholds.low += densityAdjustment;
  }

  // Check for critical terms
  if (terminologyAnalysis.criticalTermsPresent && thresholdsConfig.adaptiveFactors.criticalTermsPresent) {
    const criticalAdjustment = thresholdsConfig.adaptiveFactors.criticalTermsPresent;
    // Scale adjustment based on number of critical terms
    const scaledAdjustment = criticalAdjustment * Math.min(1.0, terminologyAnalysis.criticalTermsCount / 3);
    adaptiveThresholds.high += scaledAdjustment;
    adaptiveThresholds.medium += scaledAdjustment;
    adaptiveThresholds.low += scaledAdjustment;
  }

  // Apply context complexity factor
  const contextComplexity = getContextComplexityFactor(medicalContext);
  if (contextComplexity > 1.0) {
    // For complex medical contexts, increase thresholds
    const contextAdjustment = 0.02 * (contextComplexity - 1.0);
    adaptiveThresholds.high += contextAdjustment;
    adaptiveThresholds.medium += contextAdjustment;
    adaptiveThresholds.low += contextAdjustment;
  }

  // Check for complex language pair
  const complexLanguagePairs = [
    ['en', 'zh'], ['en', 'ja'], ['en', 'ko'], ['en', 'ar'],
    ['zh', 'en'], ['ja', 'en'], ['ko', 'en'], ['ar', 'en']
  ];

  const isComplexPair = complexLanguagePairs.some(pair =>
    pair[0] === sourceLanguage && pair[1] === targetLanguage
  );

  if (isComplexPair && thresholdsConfig.adaptiveFactors.complexLanguagePair) {
    const complexAdjustment = thresholdsConfig.adaptiveFactors.complexLanguagePair;
    adaptiveThresholds.high += complexAdjustment;
    adaptiveThresholds.medium += complexAdjustment;
    adaptiveThresholds.low += complexAdjustment;
  }

  // Apply previous accuracy adjustment if available
  if (additionalFactors.previousAccuracy && thresholdsConfig.adaptiveFactors.previousAccuracy) {
    const accuracyAdjustment = additionalFactors.previousAccuracy * thresholdsConfig.adaptiveFactors.previousAccuracy;
    adaptiveThresholds.high += accuracyAdjustment;
    adaptiveThresholds.medium += accuracyAdjustment;
    adaptiveThresholds.low += accuracyAdjustment;
  }

  // Ensure thresholds are within valid range (0-1)
  adaptiveThresholds.high = Math.min(Math.max(adaptiveThresholds.high, 0), 1);
  adaptiveThresholds.medium = Math.min(Math.max(adaptiveThresholds.medium, 0), 1);
  adaptiveThresholds.low = Math.min(Math.max(adaptiveThresholds.low, 0), 1);

  // Ensure thresholds are properly ordered (high > medium > low)
  adaptiveThresholds.high = Math.max(adaptiveThresholds.high, adaptiveThresholds.medium + 0.05);
  adaptiveThresholds.medium = Math.max(adaptiveThresholds.medium, adaptiveThresholds.low + 0.05);

  // Add analysis metadata to the thresholds
  adaptiveThresholds.analysis = {
    contextComplexity,
    terminologyComplexity: terminologyAnalysis.complexityScore,
    terminologyDensity: terminologyAnalysis.density,
    criticalTermsCount: terminologyAnalysis.criticalTermsCount,
    textLengthCategory: lengthCategory,
    isComplexLanguagePair: isComplexPair
  };

  return adaptiveThresholds;
}

/**
 * Determine confidence level based on score and adaptive thresholds
 *
 * @param {number} confidenceScore - The confidence score (0-1)
 * @param {Object} thresholds - The thresholds to use
 * @returns {string} - Confidence level ('high', 'medium', 'low', or 'insufficient')
 */
function determineConfidenceLevel(confidenceScore, thresholds = null) {
  // Use provided thresholds or default
  const useThresholds = thresholds || DEFAULT_THRESHOLDS;

  if (confidenceScore >= useThresholds.high) {
    return 'high';
  } else if (confidenceScore >= useThresholds.medium) {
    return 'medium';
  } else if (confidenceScore >= useThresholds.low) {
    return 'low';
  } else {
    return 'insufficient';
  }
}

/**
 * Update confidence thresholds based on feedback
 *
 * @param {string} medicalContext - Medical context
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {boolean|Object} feedbackData - Feedback data (boolean for backward compatibility or object with detailed feedback)
 * @param {string} confidenceLevel - The confidence level that was assigned
 * @returns {Promise<boolean>} - Whether the update was successful
 */
async function updateThresholdsBasedOnFeedback(medicalContext, sourceLanguage, targetLanguage, feedbackData, confidenceLevel) {
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development' || !thresholdsConfig) {
      console.log(`[DEV] Would update thresholds for ${medicalContext} based on feedback`);
      return true;
    }

    // Handle both boolean and object feedback formats
    const wasAccurate = typeof feedbackData === 'boolean'
      ? feedbackData
      : (feedbackData.rating >= 4); // Ratings 4-5 are considered accurate

    // Extract detailed feedback if available
    const rating = typeof feedbackData === 'object' ? feedbackData.rating : null;
    const issues = typeof feedbackData === 'object' ? feedbackData.issues : null;
    const comment = typeof feedbackData === 'object' ? feedbackData.comment : null;

    // Load the current configuration
    const configPath = path.resolve(__dirname, THRESHOLDS_CONFIG_PATH);
    const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Determine which thresholds to adjust
    let thresholdsToAdjust = null;

    // Check if we have context-specific thresholds
    if (currentConfig.contexts && currentConfig.contexts[medicalContext]) {
      thresholdsToAdjust = currentConfig.contexts[medicalContext];
    } else {
      // Create context-specific thresholds if they don't exist
      if (!currentConfig.contexts) {
        currentConfig.contexts = {};
      }

      currentConfig.contexts[medicalContext] = JSON.parse(JSON.stringify(currentConfig.default));
      thresholdsToAdjust = currentConfig.contexts[medicalContext];
    }

    // Determine adjustment factor based on feedback
    let adjustmentFactor = 0.01; // Default small adjustment

    if (rating !== null) {
      // Scale adjustment factor based on rating (1-5)
      if (rating <= 2) {
        // Poor ratings (1-2) increase thresholds more significantly
        adjustmentFactor = 0.03;
      } else if (rating === 3) {
        // Neutral rating (3) makes a small increase
        adjustmentFactor = 0.01;
      } else {
        // Good ratings (4-5) decrease thresholds
        adjustmentFactor = -0.01 * (rating - 3);
      }
    }

    // Adjust based on specific issues if available
    if (issues && issues.length > 0) {
      // Medical terminology issues are more critical
      if (issues.includes('terminology')) {
        adjustmentFactor *= 1.5;
      }

      // Meaning issues are also critical
      if (issues.includes('meaning')) {
        adjustmentFactor *= 1.3;
      }
    }

    // Apply adjustments based on confidence level and accuracy
    if (wasAccurate) {
      // If translation was accurate but confidence was low, lower the threshold slightly
      if (confidenceLevel === 'low' || confidenceLevel === 'medium') {
        thresholdsToAdjust[confidenceLevel] = Math.max(0, thresholdsToAdjust[confidenceLevel] - Math.abs(adjustmentFactor));
      }
    } else {
      // If translation was inaccurate but confidence was high, raise the threshold
      if (confidenceLevel === 'high' || confidenceLevel === 'medium') {
        thresholdsToAdjust[confidenceLevel] = Math.min(1, thresholdsToAdjust[confidenceLevel] + Math.abs(adjustmentFactor));
      }
    }

    // Update language pair thresholds
    const languagePair = `${sourceLanguage}-${targetLanguage}`;
    if (!currentConfig.languagePairs) {
      currentConfig.languagePairs = {};
    }

    if (!currentConfig.languagePairs[languagePair]) {
      currentConfig.languagePairs[languagePair] = JSON.parse(JSON.stringify(currentConfig.default));
    }

    // Apply similar adjustments to language pair thresholds
    if (wasAccurate) {
      if (confidenceLevel === 'low' || confidenceLevel === 'medium') {
        currentConfig.languagePairs[languagePair][confidenceLevel] = Math.max(
          0,
          currentConfig.languagePairs[languagePair][confidenceLevel] - Math.abs(adjustmentFactor) * 0.5
        );
      }
    } else {
      if (confidenceLevel === 'high' || confidenceLevel === 'medium') {
        currentConfig.languagePairs[languagePair][confidenceLevel] = Math.min(
          1,
          currentConfig.languagePairs[languagePair][confidenceLevel] + Math.abs(adjustmentFactor) * 0.5
        );
      }
    }

    // Update adaptive factors based on feedback patterns
    if (currentConfig.adaptiveFactors) {
      // If we're getting terminology issues, increase the weight of terminology factors
      if (issues && issues.includes('terminology')) {
        if (currentConfig.adaptiveFactors.terminologyDensity) {
          currentConfig.adaptiveFactors.terminologyDensity += 0.005;
        }

        if (currentConfig.adaptiveFactors.terminologyComplexity) {
          currentConfig.adaptiveFactors.terminologyComplexity += 0.005;
        }
      }

      // If we're getting meaning issues, increase the weight of context factors
      if (issues && issues.includes('meaning')) {
        if (currentConfig.adaptiveFactors.contextComplexity) {
          currentConfig.adaptiveFactors.contextComplexity += 0.005;
        }

        if (currentConfig.adaptiveFactors.contextCriticality) {
          currentConfig.adaptiveFactors.contextCriticality += 0.005;
        }
      }

      // Ensure adaptive factors are within reasonable ranges
      Object.keys(currentConfig.adaptiveFactors).forEach(factor => {
        if (typeof currentConfig.adaptiveFactors[factor] === 'number') {
          currentConfig.adaptiveFactors[factor] = Math.min(
            Math.max(currentConfig.adaptiveFactors[factor], 0),
            0.2 // Maximum weight for any factor
          );
        }
      });
    }

    // Update context complexity rating if available
    if (thresholdsToAdjust.complexityRating !== undefined) {
      if (rating !== null) {
        if (rating <= 2) {
          // Poor ratings may indicate higher complexity
          thresholdsToAdjust.complexityRating = Math.min(thresholdsToAdjust.complexityRating + 0.05, 2.0);
        } else if (rating >= 4) {
          // Good ratings may indicate lower complexity
          thresholdsToAdjust.complexityRating = Math.max(thresholdsToAdjust.complexityRating - 0.02, 1.0);
        }
      }
    }

    // Ensure thresholds are properly ordered (high > medium > low)
    thresholdsToAdjust.high = Math.max(thresholdsToAdjust.high, thresholdsToAdjust.medium + 0.05);
    thresholdsToAdjust.medium = Math.max(thresholdsToAdjust.medium, thresholdsToAdjust.low + 0.05);

    currentConfig.languagePairs[languagePair].high = Math.max(
      currentConfig.languagePairs[languagePair].high,
      currentConfig.languagePairs[languagePair].medium + 0.05
    );

    currentConfig.languagePairs[languagePair].medium = Math.max(
      currentConfig.languagePairs[languagePair].medium,
      currentConfig.languagePairs[languagePair].low + 0.05
    );

    // Save updated configuration
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');

    // Reload configuration
    thresholdsConfig = currentConfig;

    console.log('Updated confidence thresholds based on feedback', {
      medicalContext,
      languagePair,
      wasAccurate,
      rating,
      issues,
      adjustmentFactor
    });

    return true;
  } catch (error) {
    console.error('Error updating confidence thresholds:', error);
    return false;
  }
}

module.exports = {
  calculateAdaptiveThresholds,
  determineConfidenceLevel,
  updateThresholdsBasedOnFeedback,
  getContextThresholds,
  analyzeMedicalTerminologyComplexity,
  getContextComplexityFactor
};
