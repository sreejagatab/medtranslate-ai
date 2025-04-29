/**
 * Direct test for medical terminology integration
 * 
 * This script tests the medical terminology integration by directly loading
 * the terminology files and performing translations.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MODELS_DIR = path.join(__dirname, '../edge/models');

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

/**
 * Load medical terminology from JSON file
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Object} - Medical terminology dictionary
 */
function loadMedicalTerminology(sourceLanguage, targetLanguage) {
  const dirPath = path.join(MODELS_DIR, `${sourceLanguage}-${targetLanguage}`);
  const filePath = path.join(dirPath, 'medical_terms.json');
  
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error loading medical terminology: ${error.message}`);
      return {};
    }
  } else {
    console.warn(`Medical terminology file not found: ${filePath}`);
    return {};
  }
}

/**
 * Translate text using medical terminology
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {Object} terminology - Medical terminology dictionary
 * @returns {Object} - Translation result
 */
function translateWithTerminology(text, sourceLanguage, targetLanguage, terminology) {
  // Simple word-by-word translation
  const words = text.split(/\s+/);
  const translatedWords = [];
  const terminologyMatches = [];
  
  for (const word of words) {
    // Clean word (remove punctuation for matching)
    const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    
    // Check if word exists in terminology
    if (terminology[cleanWord]) {
      translatedWords.push(terminology[cleanWord]);
      terminologyMatches.push({
        original: cleanWord,
        translated: terminology[cleanWord]
      });
    } else {
      // Keep original word if no match found
      translatedWords.push(word);
    }
  }
  
  // Now handle multi-word terms
  let translatedText = translatedWords.join(' ');
  
  for (const term in terminology) {
    if (term.split(/\s+/).length > 1) {
      // Create regex to match the term with word boundaries
      const termRegex = new RegExp(`\\b${term}\\b`, 'gi');
      
      // Check if the term exists in the original text
      if (text.match(termRegex)) {
        // Replace the term in the translated text
        translatedText = translatedText.replace(termRegex, terminology[term]);
        
        terminologyMatches.push({
          original: term,
          translated: terminology[term]
        });
      }
    }
  }
  
  return {
    originalText: text,
    translatedText,
    terminologyMatches
  };
}

/**
 * Run tests
 */
function runTests() {
  console.log('Running direct medical terminology tests:');
  console.log('=========================================');
  
  for (const testCase of TEST_CASES) {
    console.log(`\nTest case: ${testCase.sourceLanguage} -> ${testCase.targetLanguage}`);
    console.log(`Text: "${testCase.text}"`);
    console.log(`Context: ${testCase.context}`);
    
    // Load terminology
    const terminology = loadMedicalTerminology(testCase.sourceLanguage, testCase.targetLanguage);
    
    if (Object.keys(terminology).length === 0) {
      console.log('No terminology available for this language pair');
      continue;
    }
    
    console.log(`Loaded ${Object.keys(terminology).length} terms for ${testCase.sourceLanguage}-${testCase.targetLanguage}`);
    
    // Translate
    const result = translateWithTerminology(
      testCase.text,
      testCase.sourceLanguage,
      testCase.targetLanguage,
      terminology
    );
    
    console.log(`\nTranslated text: "${result.translatedText}"`);
    
    if (result.terminologyMatches.length > 0) {
      console.log('\nTerminology matches:');
      for (const match of result.terminologyMatches) {
        console.log(`- "${match.original}" -> "${match.translated}"`);
      }
    } else {
      console.log('\nNo terminology matches found');
    }
    
    console.log('\n-----------------------------------------');
  }
  
  console.log('\nDirect medical terminology testing completed');
}

// Run tests
runTests();
