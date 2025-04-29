/**
 * Test script for edge translation with medical terminology
 *
 * This script tests the edge translation functionality with medical terminology.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Configuration
const EDGE_DIR = path.join(__dirname, '../edge');
const MODELS_DIR = path.join(EDGE_DIR, 'models');

// Test cases
const TEST_CASES = [
  {
    sourceLanguage: 'en',
    targetLanguage: 'es',
    text: 'The patient has high blood pressure and diabetes.',
    context: 'general'
  },
  {
    sourceLanguage: 'en',
    targetLanguage: 'fr',
    text: 'The patient experienced a heart attack last year.',
    context: 'cardiology'
  },
  {
    sourceLanguage: 'en',
    targetLanguage: 'de',
    text: 'The patient has a history of stroke and hypertension.',
    context: 'neurology'
  }
];

// Import the model manager
const modelManager = require('../edge/app/model_manager');

// Override model directory path
process.env.MODEL_DIR = MODELS_DIR;

/**
 * Translate text using the model manager
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @returns {Promise<Object>} - Translation result
 */
async function translateText(text, sourceLanguage, targetLanguage, context) {
  // Initialize model manager if needed
  if (!modelManager.isInitialized) {
    await modelManager.initialize();
  }

  // Create terminology-only model if needed
  const terminologyKey = `${sourceLanguage}-${targetLanguage}`;
  const modelDir = path.join(MODELS_DIR, terminologyKey);
  const medicalTermsPath = path.join(modelDir, 'medical_terms.json');

  if (fs.existsSync(medicalTermsPath)) {
    const terms = JSON.parse(fs.readFileSync(medicalTermsPath, 'utf8'));
    modelManager.registerMedicalTerminology(sourceLanguage, targetLanguage, terms);
  }

  // Translate text
  return modelManager.translateWithTerminology(text, sourceLanguage, targetLanguage, context);
}

/**
 * Run tests
 */
async function runTests() {
  console.log('Running edge translation tests with medical terminology:');
  console.log('=====================================================');

  // Initialize model manager
  console.log('Initializing model manager...');
  await modelManager.initialize();

  for (const testCase of TEST_CASES) {
    console.log(`\nTest case: ${testCase.sourceLanguage} -> ${testCase.targetLanguage}`);
    console.log(`Text: "${testCase.text}"`);
    console.log(`Context: ${testCase.context}`);

    try {
      // Ensure directory exists
      const modelDir = path.join(MODELS_DIR, `${testCase.sourceLanguage}-${testCase.targetLanguage}`);
      if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
      }

      // Translate text
      const result = await translateText(
        testCase.text,
        testCase.sourceLanguage,
        testCase.targetLanguage,
        testCase.context
      );

      console.log(`\nTranslated text: "${result.translatedText}"`);
      console.log(`Confidence: ${result.confidence}`);

      if (result.terminologyMatches && result.terminologyMatches.length > 0) {
        console.log('\nTerminology matches:');
        for (const match of result.terminologyMatches) {
          console.log(`- "${match.original}" -> "${match.translated}"`);
        }
      } else {
        console.log('\nNo terminology matches found');
      }

      console.log('\n-----------------------------------------');
    } catch (error) {
      console.error(`Error testing ${testCase.sourceLanguage} -> ${testCase.targetLanguage}:`, error.message);
      console.log('\n-----------------------------------------');
    }
  }

  console.log('\nEdge translation testing completed');
}

// Run tests
runTests();
