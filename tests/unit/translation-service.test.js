/**
 * Unit tests for the Translation Service
 */

const AWS = require('aws-sdk');
const translationService = require('../../backend/lambda/translation/translation-service');
const bedrockClient = require('../../backend/lambda/translation/bedrock-client');
const audioProcessor = require('../../backend/lambda/translation/audio-processor');
const medicalKB = require('../../backend/lambda/translation/medical-kb');

// Mock AWS services
jest.mock('aws-sdk', () => {
  const mockBedrock = {
    invokeModel: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };

  return {
    Bedrock: jest.fn(() => mockBedrock),
    BedrockRuntime: jest.fn(() => mockBedrock)
  };
});

// Mock bedrock-client
const mockBedrockClient = {
  translateText: jest.fn(),
  verifyMedicalTerminology: jest.fn(),
  selectBestModelForContext: jest.fn(),
  getModelInfo: jest.fn(),
  SUPPORTED_MODELS: ['amazon.titan-text-express-v1', 'anthropic.claude-v2']
};
jest.mock('../../backend/lambda/translation/bedrock-client', () => mockBedrockClient);

// Mock audio-processor
const mockAudioProcessor = {
  transcribeAudio: jest.fn(),
  synthesizeSpeech: jest.fn()
};
jest.mock('../../backend/lambda/translation/audio-processor', () => mockAudioProcessor);

// Mock medical-kb
const mockMedicalKB = {
  verifyMedicalTerms: jest.fn(),
  addTermToKB: jest.fn()
};
jest.mock('../../backend/lambda/translation/medical-kb', () => mockMedicalKB);

describe('Translation Service', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('translateText', () => {
    it('should translate text using Bedrock', async () => {
      // Set up mocks
      const mockTranslationResult = {
        originalText: 'Hello',
        translatedText: 'Hola',
        confidence: 0.95,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      };

      bedrockClient.selectBestModelForContext.mockReturnValue('amazon.titan-text-express-v1');
      bedrockClient.translateText.mockResolvedValue(mockTranslationResult);

      // Call the function
      const result = await translationService.translateText(
        'Hello',
        'en',
        'es',
        'general'
      );

      // Verify Bedrock client was called with correct parameters
      expect(bedrockClient.selectBestModelForContext).toHaveBeenCalledWith(
        'en',
        'es',
        'general'
      );

      expect(bedrockClient.translateText).toHaveBeenCalledWith(
        'en',
        'es',
        'Hello',
        'general',
        'amazon.titan-text-express-v1'
      );

      // Verify result
      expect(result).toEqual(mockTranslationResult);
    });

    it('should verify medical terminology when enabled', async () => {
      // Set up mocks
      const mockTranslationResult = {
        originalText: 'Myocardial infarction',
        translatedText: 'Infarto de miocardio',
        confidence: 0.95,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'cardiology'
      };

      const mockVerificationResult = {
        verifiedTranslation: 'Infarto de miocardio',
        confidence: 0.98,
        verifiedTerms: [
          {
            original: 'Myocardial infarction',
            translated: 'Infarto de miocardio',
            confidence: 0.98
          }
        ]
      };

      bedrockClient.selectBestModelForContext.mockReturnValue('anthropic.claude-v2');
      bedrockClient.translateText.mockResolvedValue(mockTranslationResult);
      medicalKB.verifyMedicalTerms.mockResolvedValue(mockVerificationResult);

      // Call the function with terminology verification enabled
      const result = await translationService.translateText(
        'Myocardial infarction',
        'en',
        'es',
        'cardiology',
        null,
        true
      );

      // Verify medical terminology verification was called
      expect(medicalKB.verifyMedicalTerms).toHaveBeenCalledWith(
        'Myocardial infarction',
        'en',
        'es'
      );

      // Verify result includes verification data
      expect(result).toEqual({
        ...mockTranslationResult,
        confidence: 0.98,
        verifiedTerms: mockVerificationResult.verifiedTerms
      });
    });

    it('should handle translation errors gracefully', async () => {
      // Set up mock to throw an error
      bedrockClient.translateText.mockRejectedValue(new Error('Translation failed'));

      // Call the function and expect it to throw
      await expect(translationService.translateText('Hello', 'en', 'invalid-language', 'general'))
        .rejects.toThrow('Translation failed');
    });
  });

  describe('translateAudio', () => {
    it('should transcribe, translate, and synthesize audio', async () => {
      // Set up mocks
      const mockAudioBuffer = Buffer.from('mock audio data');
      const mockTranscription = 'Hello, how are you feeling today?';
      const mockTranslation = {
        originalText: mockTranscription,
        translatedText: '¿Hola, cómo te sientes hoy?',
        confidence: 0.95,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      };
      const mockSynthesizedAudio = Buffer.from('mock synthesized audio');

      audioProcessor.transcribeAudio.mockResolvedValue({
        transcription: mockTranscription,
        confidence: 0.9
      });

      bedrockClient.translateText.mockResolvedValue(mockTranslation);

      audioProcessor.synthesizeSpeech.mockResolvedValue({
        audioContent: mockSynthesizedAudio,
        duration: 2.5
      });

      // Call the function
      const result = await translationService.translateAudio(
        mockAudioBuffer,
        'en',
        'es',
        'general'
      );

      // Verify audio processor was called for transcription
      expect(audioProcessor.transcribeAudio).toHaveBeenCalledWith(
        mockAudioBuffer,
        'en'
      );

      // Verify translation was called with transcription
      expect(bedrockClient.translateText).toHaveBeenCalledWith(
        'en',
        'es',
        mockTranscription,
        'general',
        expect.any(String)
      );

      // Verify speech synthesis was called with translation
      expect(audioProcessor.synthesizeSpeech).toHaveBeenCalledWith(
        mockTranslation.translatedText,
        'es'
      );

      // Verify result
      expect(result).toEqual({
        originalText: mockTranscription,
        translatedText: mockTranslation.translatedText,
        confidence: mockTranslation.confidence,
        audioResponse: mockSynthesizedAudio.toString('base64'),
        processingTime: expect.any(Object)
      });
    });

    it('should handle audio processing errors gracefully', async () => {
      // Set up mock to throw an error
      audioProcessor.transcribeAudio.mockRejectedValue(new Error('Transcription failed'));

      // Call the function and expect it to throw
      await expect(translationService.translateAudio(
        Buffer.from('mock audio data'),
        'en',
        'es',
        'general'
      )).rejects.toThrow('Transcription failed');
    });
  });

  describe('getAvailableLanguages', () => {
    it('should return a list of supported language pairs', async () => {
      // Set up mock
      bedrockClient.getModelInfo.mockReturnValue({
        supportedLanguagePairs: [
          { source: 'en', target: 'es' },
          { source: 'en', target: 'fr' },
          { source: 'es', target: 'en' },
          { source: 'fr', target: 'en' }
        ]
      });

      // Call the function
      const result = await translationService.getAvailableLanguages();

      // Verify result
      expect(result).toEqual({
        languagePairs: [
          { source: 'en', target: 'es' },
          { source: 'en', target: 'fr' },
          { source: 'es', target: 'en' },
          { source: 'fr', target: 'en' }
        ]
      });
    });
  });

  describe('getTranslationMetadata', () => {
    it('should return metadata about the translation service', async () => {
      // Set up mock
      bedrockClient.getModelInfo.mockReturnValue({
        modelId: 'amazon.titan-text-express-v1',
        version: '1.0',
        supportedLanguagePairs: [
          { source: 'en', target: 'es' },
          { source: 'en', target: 'fr' }
        ],
        capabilities: ['text', 'medical-terminology']
      });

      // Call the function
      const result = await translationService.getTranslationMetadata();

      // Verify result
      expect(result).toEqual({
        service: 'MedTranslate AI Translation Service',
        version: expect.any(String),
        models: expect.any(Array),
        supportedLanguages: expect.any(Array),
        capabilities: expect.any(Array)
      });
    });
  });
});
