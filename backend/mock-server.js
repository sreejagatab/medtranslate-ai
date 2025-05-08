/**
 * Mock backend server for testing
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create Express app
const app = express();
const PORT = process.env.BACKEND_PORT || 4001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: 'test',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Translation endpoint
app.post('/translate', (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage, context } = req.body;

    // Validate required parameters
    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: text, sourceLanguage, targetLanguage'
      });
    }

    // Mock translations
    const translations = {
      'en_es': {
        'I have a headache': 'Tengo dolor de cabeza',
        'My chest hurts when I breathe': 'Me duele el pecho cuando respiro',
        'I\'m allergic to penicillin': 'Soy alérgico a la penicilina',
        'I need to check my blood sugar': 'Necesito revisar mi nivel de azúcar en la sangre',
        'I\'ve been feeling dizzy': 'Me he estado sintiendo mareado',
        'I have a fever': 'Tengo fiebre',
        'My throat hurts': 'Me duele la garganta',
        'I feel dizzy': 'Me siento mareado'
      },
      'en_fr': {
        'I have a headache': 'J\'ai mal à la tête',
        'My chest hurts when I breathe': 'Ma poitrine me fait mal quand je respire',
        'I\'m allergic to penicillin': 'Je suis allergique à la pénicilline',
        'I need to check my blood sugar': 'Je dois vérifier ma glycémie',
        'I\'ve been feeling dizzy': 'Je me sens étourdi',
        'I have a fever': 'J\'ai de la fièvre',
        'My throat hurts': 'J\'ai mal à la gorge',
        'I feel dizzy': 'Je me sens étourdi'
      }
    };

    // Create language pair key
    const langPair = `${sourceLanguage}_${targetLanguage}`;

    // Get translation or generate a mock one
    let translatedText;
    if (langPair in translations && text in translations[langPair]) {
      translatedText = translations[langPair][text];
    } else {
      // For unknown text, just add a prefix to simulate translation
      const prefixes = {
        'es': 'ES: ',
        'fr': 'FR: ',
        'de': 'DE: ',
        'it': 'IT: ',
        'pt': 'PT: ',
        'zh': 'ZH: ',
        'ja': 'JA: ',
        'ru': 'RU: '
      };
      const prefix = prefixes[targetLanguage] || `${targetLanguage}: `;
      translatedText = `${prefix}${text}`;
    }

    // Respond immediately for the test
    res.json({
      translatedText: translatedText,
      confidence: 'high',
      source: 'cloud'
    });
  } catch (error) {
    console.error('Error in text translation:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock backend server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET /health');
  console.log('- POST /translate');
});
