/**
 * Medical knowledge base integration for MedTranslate AI
 * 
 * This module provides functions to verify medical terminology against
 * a specialized medical knowledge base stored in DynamoDB.
 */

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Verifies medical terms in a text against the knowledge base
 * 
 * @param {string} text - The text containing medical terms
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @returns {Promise<Array>} - Array of verified medical terms
 */
async function verifyMedicalTerms(text, sourceLanguage, targetLanguage) {
  // Extract potential medical terms from the text
  const medicalTerms = extractMedicalTerms(text);
  
  // Check each term against the medical knowledge base
  const verifiedTerms = [];
  for (const term of medicalTerms) {
    const verified = await lookupTermInKB(term, sourceLanguage, targetLanguage);
    if (verified) {
      verifiedTerms.push(verified);
    }
  }
  
  return verifiedTerms;
}

/**
 * Extract potential medical terms using regex patterns
 * 
 * @param {string} text - The text to extract terms from
 * @returns {Array<string>} - Array of potential medical terms
 */
function extractMedicalTerms(text) {
  // This is a simplified example - real implementation would be more sophisticated
  const medicalPatterns = [
    /\b[A-Z][a-z]+ (disease|syndrome|disorder)\b/g,
    /\b[A-Z][a-z]+ (test|scan|procedure)\b/g,
    /\b[A-Z][a-z]+ (medication|drug|therapy)\b/g,
    /\b(acute|chronic) [a-z]+\b/gi,
    /\b[a-z]+ (infection|inflammation)\b/gi,
    /\b(diagnosis|prognosis|treatment) of [a-z]+\b/gi
  ];
  
  let terms = [];
  for (const pattern of medicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms = [...terms, ...matches];
    }
  }
  
  return [...new Set(terms)]; // Remove duplicates
}

/**
 * Look up a term in the medical knowledge base
 * 
 * @param {string} term - The medical term to look up
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @returns {Promise<Object|null>} - The verified term or null if not found
 */
async function lookupTermInKB(term, sourceLanguage, targetLanguage) {
  try {
    const params = {
      TableName: process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology',
      Key: {
        term_source: `${term.toLowerCase()}:${sourceLanguage}`
      }
    };
    
    const result = await dynamoDB.get(params).promise();
    if (result.Item && result.Item.translations) {
      const targetTranslation = result.Item.translations.find(t => 
        t.language === targetLanguage
      );
      
      if (targetTranslation) {
        return {
          sourceTerm: term,
          targetTerm: targetTranslation.term,
          confidence: targetTranslation.confidence || 'high',
          domain: result.Item.domain || 'general',
          verified: true
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error looking up medical term:', error);
    return null;
  }
}

/**
 * Add a new term to the medical knowledge base
 * 
 * @param {string} sourceTerm - The term in the source language
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetTerm - The term in the target language
 * @param {string} targetLanguage - The target language code
 * @param {string} domain - The medical domain (e.g., 'cardiology')
 * @param {string} confidence - The confidence level ('high', 'medium', 'low')
 * @returns {Promise<boolean>} - Success indicator
 */
async function addTermToKB(sourceTerm, sourceLanguage, targetTerm, targetLanguage, domain = 'general', confidence = 'high') {
  try {
    // First, check if the term already exists
    const params = {
      TableName: process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology',
      Key: {
        term_source: `${sourceTerm.toLowerCase()}:${sourceLanguage}`
      }
    };
    
    const result = await dynamoDB.get(params).promise();
    
    if (result.Item) {
      // Term exists, update translations
      const translations = result.Item.translations || [];
      const existingIndex = translations.findIndex(t => t.language === targetLanguage);
      
      if (existingIndex >= 0) {
        // Update existing translation
        translations[existingIndex] = {
          language: targetLanguage,
          term: targetTerm,
          confidence
        };
      } else {
        // Add new translation
        translations.push({
          language: targetLanguage,
          term: targetTerm,
          confidence
        });
      }
      
      const updateParams = {
        TableName: process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology',
        Key: {
          term_source: `${sourceTerm.toLowerCase()}:${sourceLanguage}`
        },
        UpdateExpression: 'SET translations = :translations, domain = :domain, updated_at = :updated_at',
        ExpressionAttributeValues: {
          ':translations': translations,
          ':domain': domain,
          ':updated_at': new Date().toISOString()
        }
      };
      
      await dynamoDB.update(updateParams).promise();
    } else {
      // Term doesn't exist, create new entry
      const putParams = {
        TableName: process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology',
        Item: {
          term_source: `${sourceTerm.toLowerCase()}:${sourceLanguage}`,
          term: sourceTerm,
          language: sourceLanguage,
          domain,
          translations: [
            {
              language: targetLanguage,
              term: targetTerm,
              confidence
            }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
      
      await dynamoDB.put(putParams).promise();
    }
    
    return true;
  } catch (error) {
    console.error('Error adding term to knowledge base:', error);
    return false;
  }
}

module.exports = { 
  verifyMedicalTerms,
  extractMedicalTerms,
  lookupTermInKB,
  addTermToKB
};
