/**
 * Tests for Enhanced Bedrock Client
 */

const {
  translateText,
  verifyMedicalTerminology,
  selectBestModelForContext,
  getModelInfo,
  getAvailableModels,
  mockTranslate
} = require('../enhanced-bedrock-client');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockBedrockInvokeModel = jest.fn();
  const mockTranslateText = jest.fn();
  
  return {
    BedrockRuntime: jest.fn().mockImplementation(() => ({
      invokeModel: mockBedrockInvokeModel
    })),
    Translate: jest.fn().mockImplementation(() => ({
      translateText: mockTranslateText
    })),
    ComprehendMedical: jest.fn().mockImplementation(() => ({}))
  };
});

// Mock environment
process.env.NODE_ENV = 'development';

describe('Enhanced Bedrock Client', () => {
  describe('mockTranslate', () => {
    it('should translate text using mock translations', () => {
      const result = mockTranslate('hello', 'en', 'es', 'general');
      
      expect(result).toEqual({
        translatedText: 'hola',
        confidence: 'high',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        medicalContext: 'general',
        modelUsed: 'mock',
        processingTime: 0
      });
    });
    
    it('should translate medical terms correctly', () => {
      const result = mockTranslate('heart attack', 'en', 'es', 'cardiology');
      
      expect(result).toEqual({
        translatedText: 'ataque cardíaco',
        confidence: 'high',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        medicalContext: 'cardiology',
        modelUsed: 'mock',
        processingTime: 0
      });
    });
    
    it('should translate word by word if no direct translation exists', () => {
      const result = mockTranslate('I have a headache', 'en', 'es', 'general');
      
      expect(result.translatedText).toContain('dolor de cabeza');
      expect(result.confidence).toBe('medium');
    });
  });
  
  describe('translateText', () => {
    it('should use mock translation in development mode', async () => {
      const result = await translateText('hello', 'en', 'es', 'general');
      
      expect(result.translatedText).toBe('hola');
      expect(result.modelUsed).toBe('mock');
    });
  });
  
  describe('selectBestModelForContext', () => {
    it('should select Claude for complex medical contexts', () => {
      const result = selectBestModelForContext('en', 'es', 'cardiology');
      expect(result).toBe('claude');
    });
    
    it('should select Titan for Asian language pairs', () => {
      const result = selectBestModelForContext('zh', 'ja', 'general');
      expect(result).toBe('titan');
    });
    
    it('should select Mistral for Slavic language pairs', () => {
      const result = selectBestModelForContext('ru', 'uk', 'general');
      expect(result).toBe('mistral');
    });
    
    it('should select Llama for European language pairs with simple contexts', () => {
      const result = selectBestModelForContext('es', 'fr', 'general');
      expect(result).toBe('llama');
    });
    
    it('should default to Claude for other cases', () => {
      const result = selectBestModelForContext('en', 'ar', 'general');
      expect(result).toBe('claude');
    });
  });
  
  describe('getModelInfo', () => {
    it('should return info for Claude models', () => {
      const result = getModelInfo('anthropic.claude-3-sonnet-20240229-v1:0');
      
      expect(result.family).toBe('claude');
      expect(result.capabilities).toContain('medical translation');
      expect(result.recommendedFor).toContain('complex medical contexts');
      expect(result.contextWindow).toBe(200000);
    });
    
    it('should return info for Titan models', () => {
      const result = getModelInfo('amazon.titan-text-express-v1');
      
      expect(result.family).toBe('titan');
      expect(result.capabilities).toContain('Asian language support');
      expect(result.contextWindow).toBe(8000);
    });
    
    it('should return info for Llama models', () => {
      const result = getModelInfo('meta.llama2-70b-chat-v1');
      
      expect(result.family).toBe('llama');
      expect(result.capabilities).toContain('European language support');
      expect(result.contextWindow).toBe(4096);
    });
    
    it('should return info for Mistral models', () => {
      const result = getModelInfo('mistral.mixtral-8x7b-instruct-v0:1');
      
      expect(result.family).toBe('mistral');
      expect(result.capabilities).toContain('Slavic language support');
      expect(result.contextWindow).toBe(8192);
    });
    
    it('should return default info for unknown models', () => {
      const result = getModelInfo('unknown-model');
      
      expect(result.family).toBe('unknown');
      expect(result.capabilities).toEqual([]);
      expect(result.contextWindow).toBe(4096);
    });
  });
  
  describe('getAvailableModels', () => {
    it('should return available models and default model', () => {
      const result = getAvailableModels();
      
      expect(result).toHaveProperty('availableModels');
      expect(result).toHaveProperty('defaultModel');
      expect(Object.keys(result.availableModels)).toContain('claude');
    });
  });
});
