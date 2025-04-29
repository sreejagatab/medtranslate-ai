/**
 * Test script for medical terminology integration
 *
 * This script tests the medical terminology integration in the edge application.
 * It populates the medical terminology database, generates edge models,
 * and tests translations with medical terminology.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import model manager
const modelManager = require('../edge/app/model_manager');

// Override model directory path
process.env.MODEL_DIR = path.join(__dirname, '../edge/models');
console.log(`Setting MODEL_DIR to: ${process.env.MODEL_DIR}`);

// Test cases
const TEST_CASES = [
  {
    sourceLanguage: 'en',
    targetLanguage: 'es',
    text: 'The patient has high blood pressure and diabetes.',
    context: 'general'
  },
  {
    sourceLanguage: 'es',
    targetLanguage: 'en',
    text: 'El paciente tiene presión arterial alta y diabetes.',
    context: 'cardiology'
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
  },
  {
    sourceLanguage: 'en',
    targetLanguage: 'zh',
    text: 'The patient is undergoing chemotherapy for cancer treatment.',
    context: 'oncology'
  }
];

/**
 * Run a script and wait for it to complete
 * @param {string} scriptPath - Path to the script
 * @returns {Promise<string>} - Script output
 */
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`Running script: ${scriptPath}`);

    const process = spawn('node', [scriptPath], {
      stdio: 'inherit'
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}

/**
 * Test medical terminology translation
 */
async function testMedicalTerminology() {
  try {
    console.log('Testing medical terminology integration...');

    // Initialize model manager
    console.log('Initializing model manager...');
    const initResult = await modelManager.initialize();
    console.log('Initialization result:', initResult);

    // Run tests
    console.log('\nRunning translation tests with medical terminology:');
    console.log('=================================================');

    for (const testCase of TEST_CASES) {
      try {
        console.log(`\nTest case: ${testCase.sourceLanguage} -> ${testCase.targetLanguage}`);
        console.log(`Text: "${testCase.text}"`);
        console.log(`Context: ${testCase.context}`);

        // Test with medical terminology
        const resultWithTerminology = await modelManager.translateText(
          testCase.text,
          testCase.sourceLanguage,
          testCase.targetLanguage,
          testCase.context,
          true
        );

        console.log('\nResult with medical terminology:');
        console.log(`Translated text: "${resultWithTerminology.translatedText}"`);
        console.log(`Confidence: ${resultWithTerminology.confidence}`);
        console.log(`Processing time: ${resultWithTerminology.processingTime}ms`);

        if (resultWithTerminology.terminologyMatches && resultWithTerminology.terminologyMatches.length > 0) {
          console.log('\nMedical terminology matches:');
          for (const match of resultWithTerminology.terminologyMatches) {
            console.log(`- "${match.original}" -> "${match.translated}" (${match.confidence})`);
          }
        } else {
          console.log('\nNo medical terminology matches found.');
        }

        // Test without medical terminology if not terminology-only
        if (!resultWithTerminology.isTerminologyOnly) {
          const resultWithoutTerminology = await modelManager.translateText(
            testCase.text,
            testCase.sourceLanguage,
            testCase.targetLanguage,
            testCase.context,
            false
          );

          console.log('\nResult without medical terminology:');
          console.log(`Translated text: "${resultWithoutTerminology.translatedText}"`);
          console.log(`Confidence: ${resultWithoutTerminology.confidence}`);
          console.log(`Processing time: ${resultWithoutTerminology.processingTime}ms`);
        }
      } catch (error) {
        console.error(`Error testing ${testCase.sourceLanguage} -> ${testCase.targetLanguage}:`, error.message);
      }

      console.log('\n-------------------------------------------------');
    }

    console.log('\nMedical terminology testing completed.');
  } catch (error) {
    console.error('Error testing medical terminology:', error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting medical terminology test...');

    // Check if models directory exists
    const modelsDir = path.join(__dirname, '../edge/models');
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    // Check if we need to populate medical terminology
    const medicalTermsPath = path.join(modelsDir, 'en-es/medical_terms.json');
    if (!fs.existsSync(medicalTermsPath)) {
      console.log('Medical terminology not found. Running population script...');

      // Run populate script
      await runScript(path.join(__dirname, 'populate-medical-terminology.js'));

      // Run edge model generation script
      await runScript(path.join(__dirname, 'generate-edge-models.js'));
    }

    // Test medical terminology
    await testMedicalTerminology();

    console.log('Medical terminology test completed successfully.');
  } catch (error) {
    console.error('Error in medical terminology test:', error);
    process.exit(1);
  }
}

// Run the main function
main();
