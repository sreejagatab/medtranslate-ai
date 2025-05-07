/**
 * Tests for Medical Knowledge Base DAO
 */

const AWS = require('aws-sdk');
const medicalKbDao = require('../medical-kb-dao');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockDocumentClient = {
    get: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    scan: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocumentClient)
    }
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Medical Knowledge Base DAO', () => {
  let mockDocumentClient;
  
  beforeEach(() => {
    // Get the mock document client
    mockDocumentClient = new AWS.DynamoDB.DocumentClient();
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('getTerm', () => {
    it('should return a term when it exists', async () => {
      // Mock data
      const mockTerm = {
        term_source: 'heart attack:en',
        term: 'heart attack',
        language: 'en',
        domain: 'cardiology',
        translations: [
          {
            language: 'es',
            term: 'ataque cardíaco',
            confidence: 'high',
            verified: true
          }
        ]
      };
      
      // Setup mock response
      mockDocumentClient.promise.mockResolvedValueOnce({ Item: mockTerm });
      
      // Call the function
      const result = await medicalKbDao.getTerm('heart attack', 'en');
      
      // Assertions
      expect(mockDocumentClient.get).toHaveBeenCalledWith({
        TableName: expect.any(String),
        Key: { term_source: 'heart attack:en' }
      });
      expect(result).toEqual(mockTerm);
    });
    
    it('should return null when term does not exist', async () => {
      // Setup mock response
      mockDocumentClient.promise.mockResolvedValueOnce({ Item: null });
      
      // Call the function
      const result = await medicalKbDao.getTerm('nonexistent', 'en');
      
      // Assertions
      expect(mockDocumentClient.get).toHaveBeenCalledWith({
        TableName: expect.any(String),
        Key: { term_source: 'nonexistent:en' }
      });
      expect(result).toBeNull();
    });
    
    it('should handle invalid parameters', async () => {
      // Call the function with invalid parameters
      const result = await medicalKbDao.getTerm(null, 'en');
      
      // Assertions
      expect(mockDocumentClient.get).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
  
  describe('getExactTerm', () => {
    it('should return a term when it matches exactly', async () => {
      // Mock data
      const mockTerm = {
        term_source: 'heart attack:en',
        term: 'heart attack',
        language: 'en',
        domain: 'cardiology'
      };
      
      // Setup mock response
      mockDocumentClient.promise.mockResolvedValueOnce({ Item: mockTerm });
      
      // Call the function
      const result = await medicalKbDao.getExactTerm('heart attack', 'en');
      
      // Assertions
      expect(mockDocumentClient.get).toHaveBeenCalledWith({
        TableName: expect.any(String),
        Key: { term_source: 'heart attack:en' }
      });
      expect(result).toEqual(mockTerm);
    });
    
    it('should return null when term does not match exactly', async () => {
      // Mock data with different case
      const mockTerm = {
        term_source: 'heart attack:en',
        term: 'Heart Attack', // Different case
        language: 'en',
        domain: 'cardiology'
      };
      
      // Setup mock response
      mockDocumentClient.promise.mockResolvedValueOnce({ Item: mockTerm });
      
      // Call the function
      const result = await medicalKbDao.getExactTerm('heart attack', 'en');
      
      // Assertions
      expect(mockDocumentClient.get).toHaveBeenCalledWith({
        TableName: expect.any(String),
        Key: { term_source: 'heart attack:en' }
      });
      expect(result).toBeNull();
    });
  });
  
  describe('getTermTranslation', () => {
    it('should return a translation when it exists', async () => {
      // Mock data
      const mockTerm = {
        term_source: 'heart attack:en',
        term: 'heart attack',
        language: 'en',
        domain: 'cardiology',
        translations: [
          {
            language: 'es',
            term: 'ataque cardíaco',
            confidence: 'high',
            verified: true
          }
        ]
      };
      
      // Setup mock response
      mockDocumentClient.promise.mockResolvedValueOnce({ Item: mockTerm });
      
      // Call the function
      const result = await medicalKbDao.getTermTranslation('heart attack', 'en', 'es');
      
      // Assertions
      expect(result).toEqual(mockTerm.translations[0]);
    });
    
    it('should return null when translation does not exist', async () => {
      // Mock data
      const mockTerm = {
        term_source: 'heart attack:en',
        term: 'heart attack',
        language: 'en',
        domain: 'cardiology',
        translations: [
          {
            language: 'es',
            term: 'ataque cardíaco',
            confidence: 'high',
            verified: true
          }
        ]
      };
      
      // Setup mock response
      mockDocumentClient.promise.mockResolvedValueOnce({ Item: mockTerm });
      
      // Call the function
      const result = await medicalKbDao.getTermTranslation('heart attack', 'en', 'fr');
      
      // Assertions
      expect(result).toBeNull();
    });
  });
  
  describe('saveTerm', () => {
    it('should update an existing term', async () => {
      // Mock existing term
      const mockExistingTerm = {
        term_source: 'heart attack:en',
        term: 'heart attack',
        language: 'en',
        domain: 'cardiology',
        translations: [
          {
            language: 'es',
            term: 'ataque cardíaco',
            confidence: 'high',
            verified: true
          }
        ]
      };
      
      // Mock update result
      const mockUpdateResult = {
        Attributes: {
          ...mockExistingTerm,
          translations: [
            ...mockExistingTerm.translations,
            {
              language: 'fr',
              term: 'crise cardiaque',
              confidence: 'high',
              verified: true,
              last_verified: expect.any(String)
            }
          ],
          updated_at: expect.any(String)
        }
      };
      
      // Setup mock responses
      mockDocumentClient.promise
        .mockResolvedValueOnce({ Item: mockExistingTerm }) // For getTerm
        .mockResolvedValueOnce(mockUpdateResult); // For update
      
      // Call the function
      const result = await medicalKbDao.saveTerm(
        'heart attack',
        'en',
        'cardiology',
        [
          {
            language: 'fr',
            term: 'crise cardiaque',
            confidence: 'high',
            verified: true
          }
        ]
      );
      
      // Assertions
      expect(mockDocumentClient.update).toHaveBeenCalled();
      expect(result).toEqual(mockUpdateResult.Attributes);
    });
    
    it('should create a new term', async () => {
      // Setup mock responses
      mockDocumentClient.promise
        .mockResolvedValueOnce({ Item: null }) // For getTerm
        .mockResolvedValueOnce({}); // For put
      
      // New term data
      const newTerm = {
        term: 'myocardial infarction',
        language: 'en',
        domain: 'cardiology',
        translations: [
          {
            language: 'es',
            term: 'infarto de miocardio',
            confidence: 'high',
            verified: true
          }
        ]
      };
      
      // Call the function
      const result = await medicalKbDao.saveTerm(
        newTerm.term,
        newTerm.language,
        newTerm.domain,
        newTerm.translations
      );
      
      // Assertions
      expect(mockDocumentClient.put).toHaveBeenCalled();
      expect(result).toMatchObject({
        term_source: 'myocardial infarction:en',
        term: newTerm.term,
        language: newTerm.language,
        domain: newTerm.domain,
        translations: expect.arrayContaining([
          expect.objectContaining({
            language: 'es',
            term: 'infarto de miocardio',
            confidence: 'high',
            verified: true
          })
        ])
      });
    });
  });
  
  describe('addTranslation', () => {
    it('should add a new translation to an existing term', async () => {
      // Mock existing term
      const mockExistingTerm = {
        term_source: 'heart attack:en',
        term: 'heart attack',
        language: 'en',
        domain: 'cardiology',
        translations: [
          {
            language: 'es',
            term: 'ataque cardíaco',
            confidence: 'high',
            verified: true
          }
        ]
      };
      
      // Mock update result
      const mockUpdateResult = {
        Attributes: {
          ...mockExistingTerm,
          translations: [
            ...mockExistingTerm.translations,
            {
              language: 'fr',
              term: 'crise cardiaque',
              confidence: 'medium',
              verified: false,
              last_verified: expect.any(String)
            }
          ],
          updated_at: expect.any(String)
        }
      };
      
      // Setup mock responses
      mockDocumentClient.promise
        .mockResolvedValueOnce({ Item: mockExistingTerm }) // For getTerm
        .mockResolvedValueOnce(mockUpdateResult); // For update
      
      // Call the function
      const result = await medicalKbDao.addTranslation(
        'heart attack',
        'en',
        'crise cardiaque',
        'fr',
        'medium',
        false
      );
      
      // Assertions
      expect(mockDocumentClient.update).toHaveBeenCalled();
      expect(result).toEqual(mockUpdateResult.Attributes);
    });
    
    it('should throw an error when the source term does not exist', async () => {
      // Setup mock responses
      mockDocumentClient.promise
        .mockResolvedValueOnce({ Item: null }); // For getTerm
      
      // Call the function and expect it to throw
      await expect(
        medicalKbDao.addTranslation('nonexistent', 'en', 'term', 'fr')
      ).rejects.toThrow('Source term "nonexistent" in language "en" not found');
    });
  });
  
  describe('verifyTranslation', () => {
    it('should verify an existing translation', async () => {
      // Mock existing term
      const mockExistingTerm = {
        term_source: 'heart attack:en',
        term: 'heart attack',
        language: 'en',
        domain: 'cardiology',
        translations: [
          {
            language: 'es',
            term: 'ataque cardíaco',
            confidence: 'medium',
            verified: false
          }
        ]
      };
      
      // Mock update result
      const mockUpdateResult = {
        Attributes: {
          ...mockExistingTerm,
          translations: [
            {
              language: 'es',
              term: 'ataque cardíaco',
              confidence: 'high',
              verified: true,
              last_verified: expect.any(String)
            }
          ],
          updated_at: expect.any(String)
        }
      };
      
      // Setup mock responses
      mockDocumentClient.promise
        .mockResolvedValueOnce({ Item: mockExistingTerm }) // For getTerm
        .mockResolvedValueOnce(mockUpdateResult); // For update
      
      // Call the function
      const result = await medicalKbDao.verifyTranslation(
        'heart attack',
        'en',
        'ataque cardíaco',
        'es',
        'high'
      );
      
      // Assertions
      expect(mockDocumentClient.update).toHaveBeenCalled();
      expect(result).toEqual(mockUpdateResult.Attributes);
    });
  });
  
  describe('searchTerms', () => {
    it('should return matching terms', async () => {
      // Mock scan result
      const mockScanResult = {
        Items: [
          {
            term_source: 'heart attack:en',
            term: 'heart attack',
            language: 'en',
            domain: 'cardiology'
          },
          {
            term_source: 'heart disease:en',
            term: 'heart disease',
            language: 'en',
            domain: 'cardiology'
          }
        ]
      };
      
      // Setup mock response
      mockDocumentClient.promise.mockResolvedValueOnce(mockScanResult);
      
      // Call the function
      const result = await medicalKbDao.searchTerms('heart', 'en', 'cardiology');
      
      // Assertions
      expect(mockDocumentClient.scan).toHaveBeenCalled();
      expect(result).toEqual(mockScanResult.Items);
    });
  });
  
  describe('getTermsByDomain', () => {
    it('should return terms for a specific domain', async () => {
      // Mock scan result
      const mockScanResult = {
        Items: [
          {
            term_source: 'heart attack:en',
            term: 'heart attack',
            language: 'en',
            domain: 'cardiology'
          },
          {
            term_source: 'arrhythmia:en',
            term: 'arrhythmia',
            language: 'en',
            domain: 'cardiology'
          }
        ]
      };
      
      // Setup mock response
      mockDocumentClient.promise.mockResolvedValueOnce(mockScanResult);
      
      // Call the function
      const result = await medicalKbDao.getTermsByDomain('cardiology', 'en');
      
      // Assertions
      expect(mockDocumentClient.scan).toHaveBeenCalled();
      expect(result).toEqual(mockScanResult.Items);
    });
  });
  
  describe('getTermsBySource', () => {
    it('should return terms for a specific source', async () => {
      // Mock scan result
      const mockScanResult = {
        Items: [
          {
            term_source: 'heart attack:en',
            term: 'heart attack',
            language: 'en',
            domain: 'cardiology',
            data_source: 'UMLS'
          },
          {
            term_source: 'arrhythmia:en',
            term: 'arrhythmia',
            language: 'en',
            domain: 'cardiology',
            data_source: 'UMLS'
          }
        ]
      };
      
      // Setup mock response
      mockDocumentClient.promise.mockResolvedValueOnce(mockScanResult);
      
      // Call the function
      const result = await medicalKbDao.getTermsBySource('UMLS', 'en');
      
      // Assertions
      expect(mockDocumentClient.scan).toHaveBeenCalled();
      expect(result).toEqual(mockScanResult.Items);
    });
  });
  
  describe('deleteTerm', () => {
    it('should delete an existing term', async () => {
      // Mock existing term
      const mockExistingTerm = {
        term_source: 'heart attack:en',
        term: 'heart attack',
        language: 'en',
        domain: 'cardiology'
      };
      
      // Setup mock responses
      mockDocumentClient.promise
        .mockResolvedValueOnce({ Item: mockExistingTerm }) // For getTerm
        .mockResolvedValueOnce({}); // For delete
      
      // Call the function
      const result = await medicalKbDao.deleteTerm('heart attack', 'en');
      
      // Assertions
      expect(mockDocumentClient.delete).toHaveBeenCalledWith({
        TableName: expect.any(String),
        Key: { term_source: 'heart attack:en' }
      });
      expect(result).toBe(true);
    });
    
    it('should return false when term does not exist', async () => {
      // Setup mock responses
      mockDocumentClient.promise
        .mockResolvedValueOnce({ Item: null }); // For getTerm
      
      // Call the function
      const result = await medicalKbDao.deleteTerm('nonexistent', 'en');
      
      // Assertions
      expect(mockDocumentClient.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
  
  describe('getKnowledgeBaseStats', () => {
    it('should return statistics about the knowledge base', async () => {
      // Mock scan results
      const mockCountResult = {
        Count: 100
      };
      
      const mockScanResult = {
        Items: [
          {
            domain: 'cardiology',
            language: 'en',
            data_source: 'UMLS'
          },
          {
            domain: 'cardiology',
            language: 'es',
            data_source: 'UMLS'
          },
          {
            domain: 'neurology',
            language: 'en',
            data_source: 'SNOMED'
          }
        ]
      };
      
      // Setup mock responses
      mockDocumentClient.promise
        .mockResolvedValueOnce(mockCountResult) // For count scan
        .mockResolvedValueOnce(mockScanResult); // For data scan
      
      // Call the function
      const result = await medicalKbDao.getKnowledgeBaseStats();
      
      // Assertions
      expect(mockDocumentClient.scan).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        totalTerms: 100,
        domains: {
          cardiology: 2,
          neurology: 1
        },
        languages: {
          en: 2,
          es: 1
        },
        sources: {
          UMLS: 2,
          SNOMED: 1
        }
      });
    });
  });
});
