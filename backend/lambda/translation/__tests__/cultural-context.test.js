/**
 * Tests for cultural context adaptation in translation
 */

const { adaptContextForCulture, getCulturalContextInfo } = require('../translation-service');

// Mock fs and path modules
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn()
}));

jest.mock('path', () => ({
  resolve: jest.fn().mockReturnValue('/mock/path'),
  join: jest.fn().mockReturnValue('/mock/path')
}));

// Mock the cultural context configuration
jest.mock('../../../models/configs/cultural-context.json', () => ({
  version: '1.0.0',
  description: 'Cultural context adaptation configuration for MedTranslate AI',
  languageAdaptations: {
    'zh': {
      name: 'Chinese',
      defaultAdaptation: 'tcm',
      contexts: {
        'general': {
          adaptedContext: 'general_tcm',
          description: 'Traditional Chinese Medicine context',
          keyTerms: ['qi', 'yin', 'yang', 'meridian', 'acupuncture'],
          culturalNotes: 'Traditional Chinese Medicine views health as a balance of yin and yang, with qi (vital energy) flowing through meridians.'
        },
        'cardiology': {
          adaptedContext: 'cardiology_tcm',
          description: 'Cardiology with Traditional Chinese Medicine context',
          keyTerms: ['heart qi', 'heart blood', 'heart yin', 'heart yang'],
          culturalNotes: 'TCM views heart conditions in terms of heart qi, blood, yin, and yang balance.'
        }
      }
    },
    'hi': {
      name: 'Hindi',
      defaultAdaptation: 'ayurveda',
      contexts: {
        'general': {
          adaptedContext: 'general_ayurveda',
          description: 'Ayurvedic medicine context',
          keyTerms: ['dosha', 'vata', 'pitta', 'kapha', 'dhatu', 'agni'],
          culturalNotes: 'Ayurveda classifies individuals by dosha (vata, pitta, kapha) and views health as balance between these elements.'
        }
      }
    }
  },
  promptModifications: {
    'tcm': {
      additions: [
        'Consider Traditional Chinese Medicine concepts when translating.',
        'Preserve references to qi, yin, yang, and meridians where appropriate.',
        'Use culturally appropriate terminology for TCM concepts.'
      ]
    },
    'ayurveda': {
      additions: [
        'Consider Ayurvedic medicine concepts when translating.',
        'Preserve references to doshas (vata, pitta, kapha), dhatus, and agni where appropriate.',
        'Use culturally appropriate terminology for Ayurvedic concepts.'
      ]
    }
  }
}), { virtual: true });

describe('Cultural Context Adaptation', () => {
  test('adaptContextForCulture returns correct adapted context for Chinese', () => {
    const result = adaptContextForCulture('cardiology', 'zh');
    expect(result).toBe('cardiology_tcm');
  });

  test('adaptContextForCulture returns correct adapted context for Hindi', () => {
    const result = adaptContextForCulture('general', 'hi');
    expect(result).toBe('general_ayurveda');
  });

  test('adaptContextForCulture returns original context for unsupported language', () => {
    const result = adaptContextForCulture('cardiology', 'fr');
    expect(result).toBe('cardiology');
  });

  test('adaptContextForCulture returns original context for unsupported medical context', () => {
    const result = adaptContextForCulture('dermatology', 'zh');
    expect(result).toBe('dermatology_tcm');
  });

  test('getCulturalContextInfo returns correct information for Chinese cardiology', () => {
    const result = getCulturalContextInfo('cardiology', 'zh');
    expect(result).toEqual({
      language: 'Chinese',
      adaptedContext: 'cardiology_tcm',
      description: 'Cardiology with Traditional Chinese Medicine context',
      keyTerms: ['heart qi', 'heart blood', 'heart yin', 'heart yang'],
      culturalNotes: 'TCM views heart conditions in terms of heart qi, blood, yin, and yang balance.'
    });
  });

  test('getCulturalContextInfo returns default adaptation info when specific context not found', () => {
    const result = getCulturalContextInfo('neurology', 'zh');
    expect(result).toEqual({
      language: 'Chinese',
      adaptedContext: 'neurology_tcm',
      description: 'neurology with Chinese cultural context',
      defaultAdaptation: 'tcm'
    });
  });

  test('getCulturalContextInfo returns null for unsupported language', () => {
    const result = getCulturalContextInfo('cardiology', 'fr');
    expect(result).toBeNull();
  });
});
