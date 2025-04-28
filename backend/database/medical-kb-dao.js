/**
 * Data Access Object for Medical Knowledge Base
 * 
 * This module provides functions to interact with the medical terminology
 * database in DynamoDB.
 */

const AWS = require('aws-sdk');

// Initialize DynamoDB client with endpoint configuration for local development
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  endpoint: process.env.NODE_ENV === 'development' && process.env.DYNAMODB_ENDPOINT
    ? process.env.DYNAMODB_ENDPOINT
    : undefined
});

// Table name from environment variable or default
const MEDICAL_TERMINOLOGY_TABLE = process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology';

/**
 * Get a medical term from the knowledge base
 * 
 * @param {string} term - The medical term to look up
 * @param {string} sourceLanguage - The source language code
 * @returns {Promise<Object|null>} - The term data or null if not found
 */
async function getTerm(term, sourceLanguage) {
  try {
    const params = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      Key: {
        term_source: `${term.toLowerCase()}:${sourceLanguage}`
      }
    };
    
    const result = await dynamoDB.get(params).promise();
    return result.Item || null;
  } catch (error) {
    console.error('Error getting medical term:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get translation for a medical term
 * 
 * @param {string} term - The medical term to look up
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @returns {Promise<Object|null>} - The translation data or null if not found
 */
async function getTermTranslation(term, sourceLanguage, targetLanguage) {
  try {
    const termData = await getTerm(term, sourceLanguage);
    
    if (!termData || !termData.translations) {
      return null;
    }
    
    const translation = termData.translations.find(t => t.language === targetLanguage);
    return translation || null;
  } catch (error) {
    console.error('Error getting term translation:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Add or update a medical term in the knowledge base
 * 
 * @param {string} term - The term in the source language
 * @param {string} sourceLanguage - The source language code
 * @param {string} domain - The medical domain (e.g., 'cardiology')
 * @param {Array} translations - Array of translation objects
 * @returns {Promise<boolean>} - Success indicator
 */
async function saveTerm(term, sourceLanguage, domain = 'general', translations = []) {
  try {
    const now = new Date().toISOString();
    const termSource = `${term.toLowerCase()}:${sourceLanguage}`;
    
    // Check if the term already exists
    const existingTerm = await getTerm(term, sourceLanguage);
    
    if (existingTerm) {
      // Update existing term
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};
      
      // Update domain if provided
      if (domain) {
        updateExpressions.push('#domain = :domain');
        expressionAttributeNames['#domain'] = 'domain';
        expressionAttributeValues[':domain'] = domain;
      }
      
      // Update translations if provided
      if (translations && translations.length > 0) {
        updateExpressions.push('#translations = :translations');
        expressionAttributeNames['#translations'] = 'translations';
        expressionAttributeValues[':translations'] = mergeTranslations(
          existingTerm.translations || [],
          translations
        );
      }
      
      // Update timestamp
      updateExpressions.push('#updated_at = :updated_at');
      expressionAttributeNames['#updated_at'] = 'updated_at';
      expressionAttributeValues[':updated_at'] = now;
      
      // Create update expression
      const updateExpression = `SET ${updateExpressions.join(', ')}`;
      
      // Update the item
      const params = {
        TableName: MEDICAL_TERMINOLOGY_TABLE,
        Key: { term_source: termSource },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'UPDATED_NEW'
      };
      
      await dynamoDB.update(params).promise();
    } else {
      // Create new term
      const params = {
        TableName: MEDICAL_TERMINOLOGY_TABLE,
        Item: {
          term_source: termSource,
          term: term,
          language: sourceLanguage,
          domain: domain,
          translations: translations,
          created_at: now,
          updated_at: now
        }
      };
      
      await dynamoDB.put(params).promise();
    }
    
    return true;
  } catch (error) {
    console.error('Error saving medical term:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Search for medical terms in the knowledge base
 * 
 * @param {string} searchTerm - The search term
 * @param {string} language - The language code to search in
 * @param {string} domain - Optional domain to filter by
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of matching terms
 */
async function searchTerms(searchTerm, language, domain = null, limit = 20) {
  try {
    // For a real implementation, this would use a more sophisticated search
    // such as a GSI with a begins_with operation or ElasticSearch
    
    // For now, we'll use a scan operation with a filter
    const filterExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    // Filter by language
    filterExpressions.push('begins_with(#term_source, :search_prefix)');
    expressionAttributeNames['#term_source'] = 'term_source';
    expressionAttributeValues[':search_prefix'] = `${searchTerm.toLowerCase()}:${language}`;
    
    // Filter by domain if provided
    if (domain) {
      filterExpressions.push('#domain = :domain');
      expressionAttributeNames['#domain'] = 'domain';
      expressionAttributeValues[':domain'] = domain;
    }
    
    // Create filter expression
    const filterExpression = filterExpressions.join(' AND ');
    
    const params = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit
    };
    
    const result = await dynamoDB.scan(params).promise();
    return result.Items || [];
  } catch (error) {
    console.error('Error searching medical terms:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get terms by domain
 * 
 * @param {string} domain - The medical domain
 * @param {string} language - The language code
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of terms in the domain
 */
async function getTermsByDomain(domain, language, limit = 100) {
  try {
    // For a real implementation, this would use a GSI on domain and language
    
    // For now, we'll use a scan operation with a filter
    const params = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      FilterExpression: '#domain = :domain AND contains(#term_source, :language)',
      ExpressionAttributeNames: {
        '#domain': 'domain',
        '#term_source': 'term_source'
      },
      ExpressionAttributeValues: {
        ':domain': domain,
        ':language': `:${language}`
      },
      Limit: limit
    };
    
    const result = await dynamoDB.scan(params).promise();
    return result.Items || [];
  } catch (error) {
    console.error('Error getting terms by domain:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Delete a term from the knowledge base
 * 
 * @param {string} term - The term to delete
 * @param {string} sourceLanguage - The source language code
 * @returns {Promise<boolean>} - Success indicator
 */
async function deleteTerm(term, sourceLanguage) {
  try {
    const params = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      Key: {
        term_source: `${term.toLowerCase()}:${sourceLanguage}`
      }
    };
    
    await dynamoDB.delete(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting medical term:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Helper function to merge translations
 * 
 * @param {Array} existingTranslations - Existing translations array
 * @param {Array} newTranslations - New translations array
 * @returns {Array} - Merged translations array
 */
function mergeTranslations(existingTranslations, newTranslations) {
  const merged = [...existingTranslations];
  
  for (const newTranslation of newTranslations) {
    const existingIndex = merged.findIndex(t => t.language === newTranslation.language);
    
    if (existingIndex >= 0) {
      // Update existing translation
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...newTranslation
      };
    } else {
      // Add new translation
      merged.push(newTranslation);
    }
  }
  
  return merged;
}

module.exports = {
  getTerm,
  getTermTranslation,
  saveTerm,
  searchTerms,
  getTermsByDomain,
  deleteTerm
};
