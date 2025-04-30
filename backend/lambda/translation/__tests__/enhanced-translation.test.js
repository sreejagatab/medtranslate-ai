/**
 * Tests for Enhanced Translation Engine
 */

const {
  translateText,
  translateAudioEnhanced,
  getAvailableModels,
  adaptContextForCulture
} = require('../translation-service');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockBedrockInvokeModel = jest.fn().mockImplementation(() => ({
    promise: () => Promise.resolve({
      body: Buffer.from(JSON.stringify({
        content: [{ text: 'Translated text' }]
      }))
    })
  }));
  
  const mockTranslateText = jest.fn().mockImplementation(() => ({
    promise: () => Promise.resolve({
      TranslatedText: 'Translated text'
    })
  }));
  
  return {
    BedrockRuntime: jest.fn().mockImplementation(() => ({
      invokeModel: mockBedrockInvokeModel
    })),
    Translate: jest.fn().mockImplementation(() => ({
      translateText: mockTranslateText
    })),
    ComprehendMedical: jest.fn().mockImplementation(() => ({})),
    DynamoDB: {
      DocumentClient: jest.fn().mockImplementation(() => ({
        get: () => ({
          promise: () => Promise.resolve({ Item: null })
        }),
        put: () => ({
          promise: () => Promise.resolve({})
        })
      }))
    }
  };
});

// Mock audio processor
jest.mock('../audio-processor', () => ({
  transcribeAudio: jest.fn().mockImplementation(() => Promise.resolve({
    text: 'Transcribed text',
    confidence: 'high',
    processingTime: 100,
    startTime: Date.now() - 100
  })),
  synthesizeSpeech: jest.fn().mockImplementation(() => Promise.resolve({
    audioData: 'base64-audio-data',
    format: 'mp3',
    processingTime: 100
  }))
}));

// Mock medical-kb
jest.mock('../medical-kb', () => ({
  verifyMedicalTerms: jest.fn().mockImplementation(() => Promise.resolve([])),
  addTermToKB: jest.fn().mockImplementation(() => Promise.resolve(true))
}));

// Mock environment
process.env.NODE_ENV = 'development';

describe('Enhanced Translation Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('translateText', () => {
    it('should translate text with basic options', async () => {
      const result = await translateText(
        'en',
        'es',
        'The patient has hypertension.',
        'general'
      );
      
      expect(result).toBeDefined();
      expect(result.translatedText).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
    
    it('should translate text with confidence analysis', async () => {
      const result = await translateText(
        'en',
        'es',
        'The patient has hypertension.',
        'general',
        null,
        true,
        true
      );
      
      expect(result).toBeDefined();
      expect(result.translatedText).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
    
    it('should translate text with cultural context adaptation', async () => {
      const result = await translateText(
        'en',
        'zh',
        'The patient has hypertension.',
        'general',
        null,
        true,
        false,
        true
      );
      
      expect(result).toBeDefined();
      expect(result.translatedText).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });
  
  describe('translateAudioEnhanced', () => {
    it('should translate audio with enhanced features', async () => {
      const result = await translateAudioEnhanced(
        'base64-audio-data',
        'en',
        'es',
        'general',
        null,
        true,
        true,
        true
      );
      
      expect(result).toBeDefined();
      expect(result.originalText).toBeDefined();
      expect(result.translatedText).toBeDefined();
      expect(result.audioResponse).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });
  
  describe('adaptContextForCulture', () => {
    it('should adapt context for Chinese language', () => {
      const result = adaptContextForCulture('general', 'zh');
      expect(result).toBe('general_tcm');
    });
    
    it('should adapt context for Hindi language', () => {
      const result = adaptContextForCulture('general', 'hi');
      expect(result).toBe('general_ayurveda');
    });
    
    it('should return original context for unsupported language', () => {
      const result = adaptContextForCulture('general', 'fr');
      expect(result).toBe('general');
    });
  });
  
  describe('getAvailableModels', () => {
    it('should return available models', () => {
      const result = getAvailableModels();
      expect(result).toBeDefined();
      expect(result.availableModels).toBeDefined();
      expect(result.defaultModel).toBeDefined();
    });
  });
});
