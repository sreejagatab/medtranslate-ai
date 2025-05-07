/**
 * Data Access Object for Medical Knowledge Base
 *
 * This module provides functions to interact with the medical terminology
 * database in DynamoDB. It supports comprehensive operations for managing
 * medical terminology across multiple languages and specialties.
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Initialize DynamoDB client with endpoint configuration for local development
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  endpoint: process.env.NODE_ENV === 'development' && process.env.DYNAMODB_ENDPOINT
    ? process.env.DYNAMODB_ENDPOINT
    : undefined,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Table name from environment variable or default
const MEDICAL_TERMINOLOGY_TABLE = process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology';

// Load schema for reference
const { MedicalTerminologySchema } = require('../models/schemas/MedicalTerminologySchema');

/**
 * Get a medical term from the knowledge base
 *
 * @param {string} term - The medical term to look up
 * @param {string} sourceLanguage - The source language code
 * @returns {Promise<Object|null>} - The term data or null if not found
 */
async function getTerm(term, sourceLanguage) {
  try {
    if (!term || !sourceLanguage) {
      logger.warn('Invalid parameters for getTerm:', { term, sourceLanguage });
      return null;
    }

    const params = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      Key: {
        term_source: `${term.toLowerCase()}:${sourceLanguage}`
      }
    };

    const result = await dynamoDB.get(params).promise();

    if (result.Item) {
      logger.debug('Retrieved medical term:', { term, sourceLanguage });
    } else {
      logger.debug('Medical term not found:', { term, sourceLanguage });
    }

    return result.Item || null;
  } catch (error) {
    logger.error('Error getting medical term:', { term, sourceLanguage, error: error.message });
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get a medical term with exact match
 *
 * @param {string} term - The exact medical term to look up
 * @param {string} sourceLanguage - The source language code
 * @returns {Promise<Object|null>} - The term data or null if not found
 */
async function getExactTerm(term, sourceLanguage) {
  try {
    if (!term || !sourceLanguage) {
      logger.warn('Invalid parameters for getExactTerm:', { term, sourceLanguage });
      return null;
    }

    const params = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      Key: {
        term_source: `${term.toLowerCase()}:${sourceLanguage}`
      }
    };

    const result = await dynamoDB.get(params).promise();

    if (result.Item && result.Item.term.toLowerCase() === term.toLowerCase()) {
      logger.debug('Retrieved exact medical term:', { term, sourceLanguage });
      return result.Item;
    }

    logger.debug('Exact medical term not found:', { term, sourceLanguage });
    return null;
  } catch (error) {
    logger.error('Error getting exact medical term:', { term, sourceLanguage, error: error.message });
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
    if (!term || !sourceLanguage || !targetLanguage) {
      logger.warn('Invalid parameters for getTermTranslation:', { term, sourceLanguage, targetLanguage });
      return null;
    }

    const termData = await getTerm(term, sourceLanguage);

    if (!termData || !termData.translations) {
      logger.debug('No term data or translations found:', { term, sourceLanguage });
      return null;
    }

    const translation = termData.translations.find(t => t.language === targetLanguage);

    if (translation) {
      logger.debug('Found translation:', { term, sourceLanguage, targetLanguage });
    } else {
      logger.debug('Translation not found:', { term, sourceLanguage, targetLanguage });
    }

    return translation || null;
  } catch (error) {
    logger.error('Error getting term translation:', { term, sourceLanguage, targetLanguage, error: error.message });
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
 * @param {Object} additionalData - Additional data for the term (definition, synonyms, etc.)
 * @returns {Promise<Object>} - The saved term
 */
async function saveTerm(term, sourceLanguage, domain = 'general', translations = [], additionalData = {}) {
  try {
    if (!term || !sourceLanguage) {
      logger.warn('Invalid parameters for saveTerm:', { term, sourceLanguage });
      throw new Error('Term and source language are required');
    }

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
        // Add last_verified timestamp to new translations
        const enhancedTranslations = translations.map(t => ({
          ...t,
          last_verified: now
        }));

        updateExpressions.push('#translations = :translations');
        expressionAttributeNames['#translations'] = 'translations';
        expressionAttributeValues[':translations'] = mergeTranslations(
          existingTerm.translations || [],
          enhancedTranslations
        );
      }

      // Add additional data fields to update expression
      for (const [key, value] of Object.entries(additionalData)) {
        if (value !== undefined && value !== null) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
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
        ReturnValues: 'ALL_NEW'
      };

      const result = await dynamoDB.update(params).promise();
      logger.info('Updated medical term:', { term, sourceLanguage, domain });

      return result.Attributes;
    } else {
      // Create new term
      const newItem = {
        term_source: termSource,
        term: term,
        language: sourceLanguage,
        domain: domain,
        translations: translations.map(t => ({ ...t, last_verified: now })),
        created_at: now,
        updated_at: now,
        ...additionalData
      };

      const params = {
        TableName: MEDICAL_TERMINOLOGY_TABLE,
        Item: newItem
      };

      await dynamoDB.put(params).promise();
      logger.info('Created new medical term:', { term, sourceLanguage, domain });

      return newItem;
    }
  } catch (error) {
    logger.error('Error saving medical term:', { term, sourceLanguage, error: error.message });
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
    if (!searchTerm || !language) {
      logger.warn('Invalid parameters for searchTerms:', { searchTerm, language });
      return [];
    }

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

    logger.debug('Searching for medical terms:', { searchTerm, language, domain, limit });
    const result = await dynamoDB.scan(params).promise();

    logger.info('Found medical terms:', {
      searchTerm,
      language,
      domain,
      count: result.Items ? result.Items.length : 0
    });

    return result.Items || [];
  } catch (error) {
    logger.error('Error searching medical terms:', { searchTerm, language, domain, error: error.message });
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
    if (!domain || !language) {
      logger.warn('Invalid parameters for getTermsByDomain:', { domain, language });
      return [];
    }

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

    logger.debug('Getting terms by domain:', { domain, language, limit });
    const result = await dynamoDB.scan(params).promise();

    logger.info('Found terms by domain:', {
      domain,
      language,
      count: result.Items ? result.Items.length : 0
    });

    return result.Items || [];
  } catch (error) {
    logger.error('Error getting terms by domain:', { domain, language, error: error.message });
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
    if (!term || !sourceLanguage) {
      logger.warn('Invalid parameters for deleteTerm:', { term, sourceLanguage });
      throw new Error('Term and source language are required');
    }

    const termSource = `${term.toLowerCase()}:${sourceLanguage}`;

    // Check if the term exists first
    const existingTerm = await getTerm(term, sourceLanguage);

    if (!existingTerm) {
      logger.warn('Term not found for deletion:', { term, sourceLanguage });
      return false;
    }

    const params = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      Key: {
        term_source: termSource
      }
    };

    logger.debug('Deleting medical term:', { term, sourceLanguage });
    await dynamoDB.delete(params).promise();

    logger.info('Deleted medical term:', { term, sourceLanguage });
    return true;
  } catch (error) {
    logger.error('Error deleting medical term:', { term, sourceLanguage, error: error.message });
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

/**
 * Add a translation to an existing medical term
 *
 * @param {string} sourceTerm - The source term
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetTerm - The target term
 * @param {string} targetLanguage - The target language code
 * @param {string} confidence - Confidence level (high, medium, low)
 * @param {boolean} verified - Whether the translation is verified
 * @returns {Promise<Object>} - The updated term
 */
async function addTranslation(sourceTerm, sourceLanguage, targetTerm, targetLanguage, confidence = 'medium', verified = false) {
  try {
    if (!sourceTerm || !sourceLanguage || !targetTerm || !targetLanguage) {
      logger.warn('Invalid parameters for addTranslation:', { sourceTerm, sourceLanguage, targetTerm, targetLanguage });
      throw new Error('Source term, source language, target term, and target language are required');
    }

    const now = new Date().toISOString();
    const termSource = `${sourceTerm.toLowerCase()}:${sourceLanguage}`;

    // Check if the term exists
    const existingTerm = await getTerm(sourceTerm, sourceLanguage);

    if (!existingTerm) {
      logger.warn('Source term not found for translation:', { sourceTerm, sourceLanguage });
      throw new Error(`Source term "${sourceTerm}" in language "${sourceLanguage}" not found`);
    }

    // Check if translation already exists
    const existingTranslations = existingTerm.translations || [];
    const existingTranslationIndex = existingTranslations.findIndex(
      t => t.language === targetLanguage && t.term === targetTerm
    );

    if (existingTranslationIndex >= 0) {
      // Update existing translation
      existingTranslations[existingTranslationIndex] = {
        ...existingTranslations[existingTranslationIndex],
        confidence,
        verified,
        last_verified: now
      };
    } else {
      // Add new translation
      existingTranslations.push({
        language: targetLanguage,
        term: targetTerm,
        confidence,
        verified,
        last_verified: now
      });
    }

    // Update the term
    const params = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      Key: {
        term_source: termSource
      },
      UpdateExpression: 'SET translations = :translations, updated_at = :updated_at',
      ExpressionAttributeValues: {
        ':translations': existingTranslations,
        ':updated_at': now
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDB.update(params).promise();
    logger.info('Added translation to medical term:', {
      sourceTerm, sourceLanguage, targetTerm, targetLanguage
    });

    return result.Attributes;
  } catch (error) {
    logger.error('Error adding translation:', {
      sourceTerm, sourceLanguage, targetTerm, targetLanguage, error: error.message
    });
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Verify a translation for a medical term
 *
 * @param {string} sourceTerm - The source term
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetTerm - The target term
 * @param {string} targetLanguage - The target language code
 * @param {string} confidence - Updated confidence level (high, medium, low)
 * @returns {Promise<Object>} - The updated term
 */
async function verifyTranslation(sourceTerm, sourceLanguage, targetTerm, targetLanguage, confidence = 'high') {
  try {
    return await addTranslation(sourceTerm, sourceLanguage, targetTerm, targetLanguage, confidence, true);
  } catch (error) {
    logger.error('Error verifying translation:', {
      sourceTerm, sourceLanguage, targetTerm, targetLanguage, error: error.message
    });
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get terms by source
 *
 * @param {string} source - The data source (e.g., 'UMLS', 'SNOMED')
 * @param {string} language - The language code
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of terms from the source
 */
async function getTermsBySource(source, language, limit = 100) {
  try {
    const params = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      FilterExpression: '#data_source = :source AND contains(#term_source, :language)',
      ExpressionAttributeNames: {
        '#data_source': 'data_source',
        '#term_source': 'term_source'
      },
      ExpressionAttributeValues: {
        ':source': source,
        ':language': `:${language}`
      },
      Limit: limit
    };

    const result = await dynamoDB.scan(params).promise();
    return result.Items || [];
  } catch (error) {
    logger.error('Error getting terms by source:', { source, language, error: error.message });
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get statistics about the medical knowledge base
 *
 * @returns {Promise<Object>} - Statistics about the knowledge base
 */
async function getKnowledgeBaseStats() {
  try {
    // Get total count of terms
    const countParams = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      Select: 'COUNT'
    };

    const countResult = await dynamoDB.scan(countParams).promise();
    const totalTerms = countResult.Count;

    // Get domain distribution
    const domains = {};
    const languages = {};
    const sources = {};

    // This is not efficient for large databases, but works for demo purposes
    // In production, we would use analytics or maintain counters
    const scanParams = {
      TableName: MEDICAL_TERMINOLOGY_TABLE,
      ProjectionExpression: 'domain, language, data_source'
    };

    const scanResult = await dynamoDB.scan(scanParams).promise();

    for (const item of scanResult.Items) {
      // Count domains
      if (item.domain) {
        domains[item.domain] = (domains[item.domain] || 0) + 1;
      }

      // Count languages
      if (item.language) {
        languages[item.language] = (languages[item.language] || 0) + 1;
      }

      // Count sources
      if (item.data_source) {
        sources[item.data_source] = (sources[item.data_source] || 0) + 1;
      }
    }

    return {
      totalTerms,
      domains,
      languages,
      sources,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting knowledge base stats:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

module.exports = {
  getTerm,
  getExactTerm,
  getTermTranslation,
  saveTerm,
  addTranslation,
  verifyTranslation,
  searchTerms,
  getTermsByDomain,
  getTermsBySource,
  deleteTerm,
  getKnowledgeBaseStats
};
