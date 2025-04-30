# Enhanced Translation Engine for MedTranslate AI

This module provides an enhanced translation engine for MedTranslate AI, leveraging AWS Bedrock models for high-quality medical translations.

## Features

### 1. Multi-Model Support
- Integration with multiple AWS Bedrock models:
  - Claude 3 (Sonnet, Haiku)
  - Amazon Titan
  - Meta Llama 2
  - Mistral
- Automatic model selection based on language pair and medical context
- Fallback mechanisms for reliability

### 2. Medical Terminology Verification
- Verification against a comprehensive medical knowledge base
- Cross-referencing with multiple medical databases
- Support for multiple languages and medical specialties
- Continuous learning from verified translations

### 3. Confidence Scoring
- Detailed confidence analysis for translations
- Factors affecting confidence:
  - Medical terminology presence
  - Length discrepancy
  - Medical context complexity
  - Language pair complexity
- Confidence visualization in the UI

### 4. Cultural Context Adaptation
- Adaptation of medical context based on cultural considerations
- Support for traditional medicine systems:
  - Traditional Chinese Medicine
  - Ayurveda
  - Kampo medicine
  - Unani medicine
- Cultural sensitivity in medical communication

## Usage

### Basic Translation

```javascript
const { translateText } = require('./translation-service');

// Basic translation
const result = await translateText(
  'en',                // Source language
  'es',                // Target language
  'The patient has hypertension and diabetes.',  // Text to translate
  'general'            // Medical context
);

console.log(result.translatedText);
```

### Advanced Translation with Enhanced Features

```javascript
const { translateText } = require('./translation-service');

// Advanced translation with all features
const result = await translateText(
  'en',                // Source language
  'zh',                // Target language
  'The patient has coronary artery disease with angina.',  // Text to translate
  'cardiology',        // Medical context
  'claude',            // Preferred model (optional)
  true,                // Use terminology verification
  true,                // Include confidence analysis
  true                 // Use cultural context adaptation
);

console.log(result.translatedText);
console.log(`Confidence: ${result.confidence}`);
console.log(`Model used: ${result.modelUsed}`);

// Access confidence analysis
if (result.confidenceAnalysis) {
  console.log('Confidence factors:');
  result.confidenceAnalysis.factors.forEach(factor => {
    console.log(`- ${factor.factor}: ${factor.impact} (${factor.description})`);
  });
}
```

### Audio Translation

```javascript
const { translateAudioEnhanced } = require('./translation-service');

// Translate audio with enhanced features
const result = await translateAudioEnhanced(
  audioData,           // Base64-encoded audio data
  'en',                // Source language
  'es',                // Target language
  'general',           // Medical context
  null,                // Preferred model (optional)
  true,                // Use terminology verification
  true,                // Include confidence analysis
  true                 // Use cultural context adaptation
);

console.log(result.originalText);     // Transcribed text
console.log(result.translatedText);   // Translated text
console.log(result.audioResponse);    // Base64-encoded translated audio
```

## Configuration

The translation engine can be configured using the following files:

- `models-config.json`: Configuration for AWS Bedrock models
- Prompt templates in `backend/models/prompts/`:
  - Specialty-specific prompts (e.g., `cardiology-prompt.txt`)
  - Model-specific prompts (e.g., `claude-prompt.txt`)

## Medical Knowledge Base

The medical knowledge base is stored in DynamoDB and can be populated using the `populate-medical-kb.js` script.

```bash
# Populate the medical knowledge base
node backend/scripts/populate-medical-kb.js
```

## Testing

Unit tests for the translation engine are available in the `__tests__` directory.

```bash
# Run tests
npm test -- lambda/translation
```
