/**
 * MedicalTerminology Model
 * 
 * This model represents the medical terminology database stored in DynamoDB.
 * It includes comprehensive medical terms with translations in multiple languages.
 */

const AWS = require('aws-sdk');
const config = require('../config');
const logger = require('../utils/logger');

// Configure AWS
if (process.env.NODE_ENV !== 'production') {
  AWS.config.update({
    region: config.aws.region,
    endpoint: config.aws.dynamoEndpoint
  });
}

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'MedicalTerminology';

/**
 * MedicalTerminology class for interacting with the medical terminology database
 */
class MedicalTerminology {
  /**
   * Create a new medical term entry
   * @param {Object} term - The medical term object
   * @returns {Promise<Object>} - The created term
   */
  static async createTerm(term) {
    try {
      const params = {
        TableName: TABLE_NAME,
        Item: {
          termId: term.termId || `term_${Date.now()}`,
          englishTerm: term.englishTerm,
          category: term.category,
          specialty: term.specialty,
          translations: term.translations || {},
          contextExamples: term.contextExamples || [],
          relatedTerms: term.relatedTerms || [],
          medicalCode: term.medicalCode || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(termId)'
      };

      await dynamoDB.put(params).promise();
      return params.Item;
    } catch (error) {
      logger.error('Error creating medical term:', error);
      throw error;
    }
  }

  /**
   * Get a medical term by ID
   * @param {string} termId - The term ID
   * @returns {Promise<Object>} - The medical term
   */
  static async getTermById(termId) {
    try {
      const params = {
        TableName: TABLE_NAME,
        Key: { termId }
      };

      const result = await dynamoDB.get(params).promise();
      return result.Item;
    } catch (error) {
      logger.error(`Error getting medical term with ID ${termId}:`, error);
      throw error;
    }
  }

  /**
   * Search for medical terms
   * @param {Object} options - Search options
   * @param {string} options.query - Search query
   * @param {string} options.category - Category filter
   * @param {string} options.specialty - Specialty filter
   * @param {string} options.language - Language filter
   * @returns {Promise<Array>} - Array of matching terms
   */
  static async searchTerms(options = {}) {
    try {
      const { query, category, specialty, language } = options;
      
      // Start with scan parameters
      let params = {
        TableName: TABLE_NAME,
        FilterExpression: '',
        ExpressionAttributeValues: {},
        ExpressionAttributeNames: {}
      };
      
      // Build filter expression
      let filterExpressions = [];
      
      if (query) {
        filterExpressions.push('contains(#englishTerm, :query)');
        params.ExpressionAttributeValues[':query'] = query;
        params.ExpressionAttributeNames['#englishTerm'] = 'englishTerm';
      }
      
      if (category) {
        filterExpressions.push('#category = :category');
        params.ExpressionAttributeValues[':category'] = category;
        params.ExpressionAttributeNames['#category'] = 'category';
      }
      
      if (specialty) {
        filterExpressions.push('#specialty = :specialty');
        params.ExpressionAttributeValues[':specialty'] = specialty;
        params.ExpressionAttributeNames['#specialty'] = 'specialty';
      }
      
      if (language) {
        filterExpressions.push('attribute_exists(#translations.#language)');
        params.ExpressionAttributeNames['#translations'] = 'translations';
        params.ExpressionAttributeNames['#language'] = language;
      }
      
      // Combine filter expressions
      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
      } else {
        // If no filters, remove the filter expression
        delete params.FilterExpression;
        delete params.ExpressionAttributeValues;
        delete params.ExpressionAttributeNames;
      }
      
      const result = await dynamoDB.scan(params).promise();
      return result.Items;
    } catch (error) {
      logger.error('Error searching medical terms:', error);
      throw error;
    }
  }

  /**
   * Update a medical term
   * @param {string} termId - The term ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Object>} - The updated term
   */
  static async updateTerm(termId, updates) {
    try {
      // Build update expression
      let updateExpression = 'SET updatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':updatedAt': new Date().toISOString()
      };
      const expressionAttributeNames = {};
      
      // Add each update to the expression
      Object.keys(updates).forEach(key => {
        if (key !== 'termId') {
          updateExpression += `, #${key} = :${key}`;
          expressionAttributeValues[`:${key}`] = updates[key];
          expressionAttributeNames[`#${key}`] = key;
        }
      });
      
      const params = {
        TableName: TABLE_NAME,
        Key: { termId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW'
      };
      
      const result = await dynamoDB.update(params).promise();
      return result.Attributes;
    } catch (error) {
      logger.error(`Error updating medical term with ID ${termId}:`, error);
      throw error;
    }
  }

  /**
   * Add a translation for a term
   * @param {string} termId - The term ID
   * @param {string} language - The language code
   * @param {string} translation - The translation
   * @returns {Promise<Object>} - The updated term
   */
  static async addTranslation(termId, language, translation) {
    try {
      const params = {
        TableName: TABLE_NAME,
        Key: { termId },
        UpdateExpression: 'SET #translations.#language = :translation, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#translations': 'translations',
          '#language': language
        },
        ExpressionAttributeValues: {
          ':translation': translation,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      };
      
      const result = await dynamoDB.update(params).promise();
      return result.Attributes;
    } catch (error) {
      logger.error(`Error adding translation for term ${termId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a medical term
   * @param {string} termId - The term ID
   * @returns {Promise<void>}
   */
  static async deleteTerm(termId) {
    try {
      const params = {
        TableName: TABLE_NAME,
        Key: { termId }
      };
      
      await dynamoDB.delete(params).promise();
    } catch (error) {
      logger.error(`Error deleting medical term with ID ${termId}:`, error);
      throw error;
    }
  }

  /**
   * Get terms by specialty
   * @param {string} specialty - The medical specialty
   * @returns {Promise<Array>} - Array of terms for the specialty
   */
  static async getTermsBySpecialty(specialty) {
    try {
      const params = {
        TableName: TABLE_NAME,
        FilterExpression: '#specialty = :specialty',
        ExpressionAttributeNames: {
          '#specialty': 'specialty'
        },
        ExpressionAttributeValues: {
          ':specialty': specialty
        }
      };
      
      const result = await dynamoDB.scan(params).promise();
      return result.Items;
    } catch (error) {
      logger.error(`Error getting terms for specialty ${specialty}:`, error);
      throw error;
    }
  }

  /**
   * Get terms by category
   * @param {string} category - The term category
   * @returns {Promise<Array>} - Array of terms for the category
   */
  static async getTermsByCategory(category) {
    try {
      const params = {
        TableName: TABLE_NAME,
        FilterExpression: '#category = :category',
        ExpressionAttributeNames: {
          '#category': 'category'
        },
        ExpressionAttributeValues: {
          ':category': category
        }
      };
      
      const result = await dynamoDB.scan(params).promise();
      return result.Items;
    } catch (error) {
      logger.error(`Error getting terms for category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Batch import medical terms
   * @param {Array<Object>} terms - Array of term objects to import
   * @returns {Promise<Object>} - Import results
   */
  static async batchImportTerms(terms) {
    try {
      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };
      
      // Process in batches of 25 (DynamoDB batch write limit)
      for (let i = 0; i < terms.length; i += 25) {
        const batch = terms.slice(i, i + 25);
        
        const params = {
          RequestItems: {
            [TABLE_NAME]: batch.map(term => ({
              PutRequest: {
                Item: {
                  termId: term.termId || `term_${Date.now()}_${i}`,
                  englishTerm: term.englishTerm,
                  category: term.category,
                  specialty: term.specialty,
                  translations: term.translations || {},
                  contextExamples: term.contextExamples || [],
                  relatedTerms: term.relatedTerms || [],
                  medicalCode: term.medicalCode || null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              }
            }))
          }
        };
        
        try {
          await dynamoDB.batchWrite(params).promise();
          results.successful += batch.length;
        } catch (error) {
          results.failed += batch.length;
          results.errors.push({
            batch: i / 25,
            error: error.message
          });
          logger.error(`Error in batch ${i / 25}:`, error);
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error in batch import:', error);
      throw error;
    }
  }
}

module.exports = MedicalTerminology;
