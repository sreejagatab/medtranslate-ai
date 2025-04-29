# MedTranslate AI: Medical Knowledge Base and Translation

This document describes the implementation of the medical knowledge base and enhanced translation capabilities for the MedTranslate AI project.

## Overview

The medical knowledge base and enhanced translation system provide accurate, context-aware translation of medical terminology and content across multiple languages and medical specialties. The system combines:

1. **Medical Knowledge Base**: A comprehensive database of medical terminology with cross-language translations
2. **Enhanced Bedrock Integration**: Specialized prompts and model selection for medical contexts
3. **Fallback Mechanisms**: Robust handling of translation failures with multiple fallback options
4. **Terminology Verification**: Validation of medical term translations for accuracy

## Components

### 1. Medical Knowledge Base

The medical knowledge base is implemented in `backend/lambda/translation/medical-kb.js` and provides:

- **Term Extraction**: Identifies potential medical terms in text using language-specific patterns and common medical terminology
- **Term Verification**: Validates extracted terms against the knowledge base
- **Cross-Referencing**: Matches terms across languages with confidence scoring
- **Specialty Support**: Organizes terms by medical specialty (cardiology, neurology, etc.)

The knowledge base is populated with sample data using the `scripts/populate-medical-kb.js` script, which creates entries in DynamoDB.

#### Key Functions

- `extractMedicalTerms(text, language, medicalContext)`: Extracts potential medical terms from text
- `verifyMedicalTerms(text, sourceLanguage, targetLanguage, medicalContext)`: Verifies terms against the knowledge base
- `lookupTermInKB(term, sourceLanguage, targetLanguage, medicalContext)`: Looks up a specific term with cross-referencing
- `addTermToKB(sourceTerm, sourceLanguage, targetTerm, targetLanguage, domain, confidence)`: Adds new terms to the knowledge base

### 2. Enhanced Bedrock Integration

The enhanced Bedrock client is implemented in `backend/lambda/translation/enhanced-bedrock-client.js` and provides:

- **Specialty-Specific Prompts**: Optimized prompts for different medical specialties
- **Model Selection**: Context-aware selection of the best model for each translation task
- **Fallback Chain**: Robust fallback mechanisms when primary models fail
- **Terminology Verification**: Validation of translation quality for medical terms

#### Key Functions

- `translateText(sourceLanguage, targetLanguage, text, medicalContext, preferredModel, medicalTerms, useFallback)`: Translates text with medical context
- `verifyMedicalTerminology(sourceText, translatedText, sourceLanguage, targetLanguage, medicalContext)`: Verifies translation quality
- `selectBestModelForContext(sourceLanguage, targetLanguage, medicalContext)`: Selects the optimal model for a specific context
- `getModelFallbackChain(sourceLanguage, targetLanguage, medicalContext, preferredModel)`: Creates a prioritized list of models to try

### 3. Specialty-Specific Prompts

The system includes specialized prompts for different medical contexts:

- **General Medicine**: Basic medical terminology and general healthcare communication
- **Cardiology**: Cardiovascular terms, procedures, and conditions
- **Neurology**: Neurological terms, procedures, and conditions

These prompts are stored in the `backend/models/prompts/` directory and loaded dynamically by the enhanced Bedrock client.

## Usage

### Translating Medical Text

```javascript
const { translateText } = require('./backend/lambda/translation/enhanced-bedrock-client');
const { verifyMedicalTerms } = require('./backend/lambda/translation/medical-kb');

async function translateMedicalText(text, sourceLanguage, targetLanguage, medicalContext) {
  // Step 1: Verify medical terms against knowledge base
  const verifiedTerms = await verifyMedicalTerms(text, sourceLanguage, targetLanguage, medicalContext);
  
  // Step 2: Translate with verified terms
  const translation = await translateText(
    sourceLanguage,
    targetLanguage,
    text,
    medicalContext,
    null, // Use default model selection
    verifiedTerms
  );
  
  return translation;
}
```

### Populating the Medical Knowledge Base

To populate the medical knowledge base with sample data:

```bash
# Run the population script
node scripts/run-medical-kb-population.js

# With options
node scripts/run-medical-kb-population.js --create-table --verbose
```

### Testing the Translation System

To test the enhanced translation capabilities:

```bash
# Run the test script
node scripts/test-medical-translation.js
```

## Future Enhancements

1. **Expanded Terminology**: Add more comprehensive medical terminology across additional specialties
2. **Improved Extraction**: Enhance term extraction with machine learning-based approaches
3. **User Feedback Loop**: Incorporate user feedback to improve translations over time
4. **Additional Languages**: Expand support to more languages, especially low-resource languages
5. **Specialized Models**: Fine-tune models specifically for medical translation tasks
