/**
 * Tests for the enhanced confidence analysis in the Bedrock client
 * 
 * This file contains tests for the enhanced confidence analysis functionality
 * that adapts thresholds based on medical context.
 */

const { analyzeTranslationConfidence } = require('../lambda/translation/enhanced-bedrock-client');

// Mock the adaptive-confidence module
jest.mock('../lambda/translation/adaptive-confidence', () => ({
  calculateAdaptiveThresholds: jest.fn(() => ({
    high: 0.92,
    medium: 0.8,
    low: 0.65,
    analysis: {
      contextComplexity: 1.4,
      terminologyComplexity: 1.2,
      terminologyDensity: 0.3,
      criticalTermsCount: 2,
      textLengthCategory: 'medium',
      isComplexLanguagePair: false
    }
  })),
  determineConfidenceLevel: jest.fn((score) => {
    if (score >= 0.92) return 'high';
    if (score >= 0.8) return 'medium';
    if (score >= 0.65) return 'low';
    return 'insufficient';
  }),
  analyzeMedicalTerminologyComplexity: jest.fn((text, language, context) => {
    // Return different results based on the text to simulate different scenarios
    if (text.includes('heart attack')) {
      return {
        density: 0.3,
        complexityScore: 1.2,
        termCount: 2,
        avgTermLength: 8,
        criticalTermsPresent: true,
        criticalTermsCount: 1
      };
    } else if (text.includes('cancer')) {
      return {
        density: 0.4,
        complexityScore: 1.4,
        termCount: 3,
        avgTermLength: 10,
        criticalTermsPresent: true,
        criticalTermsCount: 2
      };
    } else {
      return {
        density: 0.1,
        complexityScore: 1.0,
        termCount: 1,
        avgTermLength: 6,
        criticalTermsPresent: false,
        criticalTermsCount: 0
      };
    }
  }),
  getContextComplexityFactor: jest.fn((context) => {
    const factors = {
      'general': 1.0,
      'cardiology': 1.4,
      'oncology': 1.6,
      'emergency': 1.7
    };
    return factors[context] || 1.0;
  })
}));

// Mock the medical-kb module
jest.mock('../lambda/translation/medical-kb', () => ({
  extractMedicalTermsSimple: jest.fn((text) => {
    // Simple mock implementation that returns some medical terms based on input
    if (text.includes('heart attack')) {
      return ['heart attack'];
    } else if (text.includes('cancer')) {
      return ['cancer', 'metastatic'];
    } else {
      return [];
    }
  })
}));

describe('Enhanced Bedrock Confidence Analysis', () => {
  test('analyzes confidence for cardiology context correctly', async () => {
    const result = await analyzeTranslationConfidence(
      'The patient is having a heart attack',
      'El paciente está teniendo un ataque cardíaco',
      'en',
      'es',
      'cardiology',
      'anthropic.claude-3-sonnet-20240229-v1:0'
    );
    
    expect(result.confidenceLevel).toBeDefined();
    expect(result.confidenceScore).toBeDefined();
    expect(result.factors).toBeInstanceOf(Array);
    expect(result.factors.length).toBeGreaterThan(0);
    
    // Check for context complexity factor
    const contextFactor = result.factors.find(f => f.factor === 'medical_context_complexity');
    expect(contextFactor).toBeDefined();
    
    // Check for terminology complexity factor
    const terminologyFactor = result.factors.find(f => f.factor === 'terminology_complexity');
    expect(terminologyFactor).toBeDefined();
  });
  
  test('analyzes confidence for oncology context correctly', async () => {
    const result = await analyzeTranslationConfidence(
      'The patient has metastatic cancer',
      'El paciente tiene cáncer metastásico',
      'en',
      'es',
      'oncology',
      'anthropic.claude-3-sonnet-20240229-v1:0'
    );
    
    expect(result.confidenceLevel).toBeDefined();
    expect(result.confidenceScore).toBeDefined();
    
    // Check for critical terms preservation
    const criticalTermsFactor = result.factors.find(f => f.factor === 'critical_terms_preservation');
    expect(criticalTermsFactor).toBeDefined();
  });
  
  test('handles complex language pairs correctly', async () => {
    const result = await analyzeTranslationConfidence(
      'The patient has a heart condition',
      '患者有心脏病',
      'en',
      'zh',
      'cardiology',
      'anthropic.claude-3-sonnet-20240229-v1:0'
    );
    
    expect(result.confidenceLevel).toBeDefined();
    expect(result.confidenceScore).toBeDefined();
    
    // Analysis should include detailed information
    expect(result.analysis).toBeDefined();
    expect(result.analysis.contextComplexity).toBeDefined();
    expect(result.analysis.sourceTerminology).toBeDefined();
    expect(result.analysis.targetTerminology).toBeDefined();
  });
  
  test('handles error cases gracefully', async () => {
    // Mock implementation to throw an error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockCalculateAdaptiveThresholds = require('../lambda/translation/adaptive-confidence').calculateAdaptiveThresholds;
    mockCalculateAdaptiveThresholds.mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    
    const result = await analyzeTranslationConfidence(
      'Test text',
      'Texto de prueba',
      'en',
      'es',
      'general',
      'anthropic.claude-3-sonnet-20240229-v1:0'
    );
    
    // Should return default values when error occurs
    expect(result.confidenceLevel).toBe('high');
    expect(result.confidenceScore).toBe(0.9);
    expect(result.factors).toBeInstanceOf(Array);
    expect(result.factors.length).toBe(1);
    expect(result.factors[0].factor).toBe('analysis_error');
    
    console.error.mockRestore();
  });
});
