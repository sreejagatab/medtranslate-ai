/**
 * Test Medical Translation Script
 * 
 * This script tests the enhanced medical translation capabilities
 * with the medical knowledge base.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Import the enhanced Bedrock client
const enhancedBedrockClient = require('../backend/lambda/translation/enhanced-bedrock-client');

// Import the medical knowledge base
const medicalKB = require('../backend/lambda/translation/medical-kb');

// Sample medical texts for testing
const sampleTexts = {
  cardiology: {
    en: "The patient has a history of myocardial infarction and atrial fibrillation. Current treatment includes beta-blockers and anticoagulants for stroke prevention.",
    es: "El paciente tiene antecedentes de infarto de miocardio y fibrilación auricular. El tratamiento actual incluye betabloqueantes y anticoagulantes para la prevención de accidentes cerebrovasculares.",
    fr: "Le patient a des antécédents d'infarctus du myocarde et de fibrillation auriculaire. Le traitement actuel comprend des bêta-bloquants et des anticoagulants pour la prévention des AVC."
  },
  neurology: {
    en: "The patient presents with symptoms of multiple sclerosis, including numbness, weakness, and visual disturbances. MRI shows demyelinating lesions in the brain and spinal cord.",
    es: "El paciente presenta síntomas de esclerosis múltiple, incluyendo entumecimiento, debilidad y alteraciones visuales. La resonancia magnética muestra lesiones desmielinizantes en el cerebro y la médula espinal.",
    fr: "Le patient présente des symptômes de sclérose en plaques, notamment des engourdissements, une faiblesse et des troubles visuels. L'IRM montre des lésions démyélinisantes dans le cerveau et la moelle épinière."
  },
  general: {
    en: "The patient has a fever of 101°F, headache, and fatigue. They report a sore throat and cough that started two days ago. No known allergies to medications.",
    es: "El paciente tiene fiebre de 38.3°C, dolor de cabeza y fatiga. Reporta dolor de garganta y tos que comenzaron hace dos días. No tiene alergias conocidas a medicamentos.",
    fr: "Le patient a une fièvre de 38,3°C, des maux de tête et de la fatigue. Il signale un mal de gorge et une toux qui ont commencé il y a deux jours. Pas d'allergies connues aux médicaments."
  }
};

// Language pairs to test
const languagePairs = [
  { source: 'en', target: 'es' },
  { source: 'en', target: 'fr' },
  { source: 'es', target: 'en' },
  { source: 'fr', target: 'en' }
];

// Medical contexts to test
const medicalContexts = ['cardiology', 'neurology', 'general'];

// Test translation with medical knowledge base
async function testTranslation() {
  console.log('Testing Medical Translation with Knowledge Base\n');
  
  for (const context of medicalContexts) {
    console.log(`\n=== Testing ${context} context ===\n`);
    
    for (const pair of languagePairs) {
      const { source, target } = pair;
      
      // Skip if source language text is not available
      if (!sampleTexts[context][source]) {
        console.log(`No sample text available for ${source} in ${context} context`);
        continue;
      }
      
      const sourceText = sampleTexts[context][source];
      console.log(`\nTranslating from ${source} to ${target}:`);
      console.log(`Source: "${sourceText}"`);
      
      try {
        // Step 1: Extract medical terms
        console.log('\nExtracting medical terms...');
        const medicalTerms = await medicalKB.extractMedicalTerms(sourceText, source, context);
        console.log(`Found ${medicalTerms.length} potential medical terms: ${medicalTerms.join(', ')}`);
        
        // Step 2: Verify medical terms against knowledge base
        console.log('\nVerifying medical terms against knowledge base...');
        const verifiedTerms = await medicalKB.verifyMedicalTerms(sourceText, source, target, context);
        console.log(`Verified ${verifiedTerms.length} medical terms`);
        
        if (verifiedTerms.length > 0) {
          console.log('\nVerified medical terms:');
          for (const term of verifiedTerms) {
            console.log(`- "${term.sourceTerm}" → "${term.targetTerm}" (${term.confidence} confidence)`);
          }
        }
        
        // Step 3: Translate text with verified terms
        console.log('\nTranslating text...');
        const translation = await enhancedBedrockClient.translateText(
          source,
          target,
          sourceText,
          context,
          null, // Use default model selection
          verifiedTerms
        );
        
        console.log(`\nTranslation (${translation.modelUsed}):`);
        console.log(`"${translation.translatedText}"`);
        console.log(`Confidence: ${translation.confidence}`);
        console.log(`Processing time: ${translation.processingTime}ms`);
        
        // Step 4: Verify translation quality
        if (translation.modelUsed !== 'aws.translate' && process.env.NODE_ENV !== 'development') {
          console.log('\nVerifying translation quality...');
          const verificationResult = await enhancedBedrockClient.verifyMedicalTerminology(
            sourceText,
            translation.translatedText,
            source,
            target,
            context
          );
          
          if (verificationResult.length > 0) {
            console.log('\nTerminology verification results:');
            for (const result of verificationResult) {
              console.log(`- "${result.sourceTerm}" → "${result.translatedTerm}" (${result.isAccurate ? 'Accurate' : 'Inaccurate'})`);
              if (!result.isAccurate && result.suggestion) {
                console.log(`  Suggestion: "${result.suggestion}"`);
              }
            }
          } else {
            console.log('No terminology issues found.');
          }
        }
      } catch (error) {
        console.error(`Error testing translation from ${source} to ${target}:`, error);
      }
      
      console.log('\n' + '-'.repeat(80));
    }
  }
}

// Run the test
testTranslation()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
