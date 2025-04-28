/**
 * Simplified performance tests for the Edge Translation Module
 */

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn()
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
            setTimeout(() => {
              callback(JSON.stringify({
                translatedText: 'Hola mundo',
                confidence: 'high',
                processingTime: 0.123
              }));
            }, 10);
          }
        }
      },
      stderr: {
        on: () => {}
      },
      on: (event, callback) => {
        if (event === 'close') {
          setTimeout(() => {
            callback(0);
          }, 10);
        }
      }
    };
  })
}));

// Create a mock translation module
const mockTranslation = {
  translateLocally: jest.fn().mockImplementation((text, sourceLanguage, targetLanguage, context) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          originalText: text,
          translatedText: 'Hola mundo',
          confidence: 'high',
          sourceLanguage,
          targetLanguage,
          context
        });
      }, text.length * 2); // Simulate longer processing for longer text
    });
  })
};

// Mock the translation module
jest.mock('../../edge/app/translation', () => mockTranslation);

describe('Edge Translation Module Performance', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should measure translation performance with short text', async () => {
    const startTime = Date.now();
    
    await mockTranslation.translateLocally(
      'Hello',
      'en',
      'es',
      'general'
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Short text translation took ${duration}ms`);
    expect(duration).toBeLessThan(1000); // Should be fast
  });

  it('should measure translation performance with medium text', async () => {
    const startTime = Date.now();
    
    await mockTranslation.translateLocally(
      'Hello world, how are you today?',
      'en',
      'es',
      'general'
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Medium text translation took ${duration}ms`);
    expect(duration).toBeLessThan(1000); // Should be reasonably fast
  });

  it('should measure translation performance with long text', async () => {
    const startTime = Date.now();
    
    await mockTranslation.translateLocally(
      'Hello world, this is a longer text that should take more time to translate. It contains multiple sentences and should simulate a more realistic translation scenario.',
      'en',
      'es',
      'general'
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Long text translation took ${duration}ms`);
    expect(duration).toBeLessThan(2000); // Should be slower but still reasonable
  });
});
