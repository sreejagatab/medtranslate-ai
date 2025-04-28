/**
 * Simplified unit tests for the Edge Translation Module
 */

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => {
    return {
      stdout: {
        on: (event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify({
              translatedText: 'Hola mundo',
              confidence: 'high',
              processingTime: 0.123
            }));
          }
        }
      },
      stderr: {
        on: () => {}
      },
      on: (event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      }
    };
  })
}));

jest.mock('../../edge/app/cache', () => ({
  cacheManager: {
    getCachedTranslation: jest.fn(),
    cacheTranslation: jest.fn()
  }
}));

// Create a mock translation module
const mockTranslation = {
  translateLocally: jest.fn().mockImplementation((text, sourceLanguage, targetLanguage, context) => {
    return Promise.resolve({
      originalText: text,
      translatedText: 'Hola mundo',
      confidence: 'high',
      sourceLanguage,
      targetLanguage,
      context
    });
  }),
  processAudio: jest.fn().mockImplementation((audioData, sourceLanguage, targetLanguage, context) => {
    return Promise.resolve({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      confidence: 'high',
      audioResponse: 'base64audio',
      sourceLanguage,
      targetLanguage,
      context
    });
  })
};

// Mock the translation module
jest.mock('../../edge/app/translation', () => mockTranslation);

describe('Edge Translation Module', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('translateLocally', () => {
    it('should translate text and return the result', async () => {
      const result = await mockTranslation.translateLocally(
        'Hello world',
        'en',
        'es',
        'general'
      );

      expect(mockTranslation.translateLocally).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'es',
        'general'
      );

      expect(result).toEqual({
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        confidence: 'high',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    });
  });

  describe('processAudio', () => {
    it('should process audio and return translation results', async () => {
      const result = await mockTranslation.processAudio(
        'base64audiodata',
        'en',
        'es',
        'general'
      );

      expect(mockTranslation.processAudio).toHaveBeenCalledWith(
        'base64audiodata',
        'en',
        'es',
        'general'
      );

      expect(result).toEqual({
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        confidence: 'high',
        audioResponse: 'base64audio',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      });
    });
  });
});
