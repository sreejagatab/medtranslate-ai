/**
 * Tests for the adaptive confidence threshold system
 * 
 * This file contains tests for the enhanced adaptive confidence threshold system
 * that adjusts thresholds based on medical context complexity.
 */

const {
  calculateAdaptiveThresholds,
  determineConfidenceLevel,
  analyzeMedicalTerminologyComplexity,
  getContextComplexityFactor
} = require('../lambda/translation/adaptive-confidence');

// Mock the medical-kb module
jest.mock('../lambda/translation/medical-kb', () => ({
  extractMedicalTermsSimple: jest.fn((text) => {
    // Simple mock implementation that returns some medical terms based on input
    if (!text) return [];
    
    const mockTerms = {
      'heart attack symptoms': ['heart attack', 'symptoms'],
      'severe headache with nausea': ['severe headache', 'nausea'],
      'patient has metastatic cancer': ['metastatic', 'cancer'],
      'normal blood pressure': ['blood pressure'],
      'no medical terms here': []
    };
    
    // Return mock terms if we have them, otherwise return a default
    return mockTerms[text] || text.split(' ').filter(word => word.length > 6);
  })
}));

describe('Adaptive Confidence Threshold System', () => {
  describe('getContextComplexityFactor', () => {
    test('returns appropriate complexity factor for different contexts', () => {
      expect(getContextComplexityFactor('general')).toBe(1.0);
      expect(getContextComplexityFactor('cardiology')).toBe(1.4);
      expect(getContextComplexityFactor('oncology')).toBe(1.6);
      expect(getContextComplexityFactor('emergency')).toBe(1.7);
      expect(getContextComplexityFactor('unknown_context')).toBe(1.0); // Default for unknown contexts
    });
  });

  describe('analyzeMedicalTerminologyComplexity', () => {
    test('calculates terminology density correctly', () => {
      const result = analyzeMedicalTerminologyComplexity('heart attack symptoms', 'en', 'cardiology');
      expect(result.density).toBeGreaterThan(0);
      expect(result.termCount).toBe(2);
    });

    test('identifies critical terms', () => {
      const result = analyzeMedicalTerminologyComplexity('heart attack symptoms', 'en', 'cardiology');
      expect(result.criticalTermsPresent).toBe(true);
      expect(result.criticalTermsCount).toBeGreaterThan(0);
    });

    test('handles empty text', () => {
      const result = analyzeMedicalTerminologyComplexity('', 'en', 'cardiology');
      expect(result.density).toBe(0);
      expect(result.termCount).toBe(0);
      expect(result.criticalTermsPresent).toBe(false);
    });

    test('calculates complexity score based on term length', () => {
      const result = analyzeMedicalTerminologyComplexity('metastatic cancer', 'en', 'oncology');
      expect(result.complexityScore).toBeGreaterThan(1.0);
    });
  });

  describe('calculateAdaptiveThresholds', () => {
    test('returns higher thresholds for complex medical contexts', () => {
      const generalThresholds = calculateAdaptiveThresholds('general', 'en', 'es', 'normal text');
      const oncologyThresholds = calculateAdaptiveThresholds('oncology', 'en', 'es', 'cancer metastasis');
      
      expect(oncologyThresholds.high).toBeGreaterThan(generalThresholds.high);
      expect(oncologyThresholds.medium).toBeGreaterThan(generalThresholds.medium);
      expect(oncologyThresholds.low).toBeGreaterThan(generalThresholds.low);
    });

    test('adjusts thresholds based on terminology complexity', () => {
      const simpleText = calculateAdaptiveThresholds('cardiology', 'en', 'es', 'normal blood pressure');
      const complexText = calculateAdaptiveThresholds('cardiology', 'en', 'es', 'severe myocardial infarction with ventricular tachycardia');
      
      expect(complexText.high).toBeGreaterThanOrEqual(simpleText.high);
    });

    test('adjusts thresholds for complex language pairs', () => {
      const simpleLanguagePair = calculateAdaptiveThresholds('general', 'en', 'es', 'normal text');
      const complexLanguagePair = calculateAdaptiveThresholds('general', 'en', 'zh', 'normal text');
      
      // Complex language pairs should have higher thresholds due to increased difficulty
      expect(complexLanguagePair.high).not.toBeLessThan(simpleLanguagePair.high);
    });

    test('includes analysis metadata in the result', () => {
      const thresholds = calculateAdaptiveThresholds('cardiology', 'en', 'es', 'heart attack symptoms');
      
      expect(thresholds.analysis).toBeDefined();
      expect(thresholds.analysis.contextComplexity).toBeDefined();
      expect(thresholds.analysis.terminologyComplexity).toBeDefined();
      expect(thresholds.analysis.terminologyDensity).toBeDefined();
    });
  });

  describe('determineConfidenceLevel', () => {
    test('determines correct confidence level based on score and thresholds', () => {
      const thresholds = {
        high: 0.9,
        medium: 0.75,
        low: 0.6
      };
      
      expect(determineConfidenceLevel(0.95, thresholds)).toBe('high');
      expect(determineConfidenceLevel(0.8, thresholds)).toBe('medium');
      expect(determineConfidenceLevel(0.65, thresholds)).toBe('low');
      expect(determineConfidenceLevel(0.5, thresholds)).toBe('insufficient');
    });

    test('uses default thresholds if none provided', () => {
      expect(determineConfidenceLevel(0.95)).toBe('high');
      expect(determineConfidenceLevel(0.8)).toBe('medium');
      expect(determineConfidenceLevel(0.65)).toBe('low');
      expect(determineConfidenceLevel(0.5)).toBe('insufficient');
    });
  });
});
