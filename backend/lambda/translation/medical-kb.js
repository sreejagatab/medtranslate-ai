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
 * Extract potential medical terms using regex patterns and common medical terms
 *
 * @param {string} text - The text to extract terms from
 * @returns {Array<string>} - Array of potential medical terms
 */
function extractMedicalTerms(text) {
  // Common medical term patterns
  const medicalPatterns = [
    // Disease patterns
    /\b[A-Z][a-z]+ (disease|syndrome|disorder|condition|deficiency)\b/g,
    /\b(disease|syndrome|disorder) of [a-z]+\b/gi,

    // Diagnostic procedures
    /\b[A-Z]?[a-z]* (test|scan|procedure|screening|imaging|biopsy|assessment)\b/gi,
    /\b(MRI|CT|CAT|PET|EKG|ECG|EEG|ultrasound|x-ray|radiograph)\b/gi,

    // Treatments and medications
    /\b[A-Z][a-z]+ (medication|drug|therapy|treatment|vaccine|antibiotic)\b/g,
    /\b(oral|intravenous|topical|intramuscular) [a-z]+\b/gi,

    // Symptoms and conditions
    /\b(acute|chronic|mild|severe|recurrent) [a-z]+\b/gi,
    /\b[a-z]+ (infection|inflammation|pain|ache|discomfort|distress)\b/gi,

    // Medical processes
    /\b(diagnosis|prognosis|treatment|management|care) of [a-z]+\b/gi,

    // Anatomical terms
    /\b(cardiac|pulmonary|hepatic|renal|neural|cerebral|vascular) [a-z]+\b/gi,

    // Vital signs
    /\b(blood pressure|heart rate|pulse|temperature|respiration|oxygen saturation)\b/gi,

    // Common medical conditions
    /\b(diabetes|hypertension|asthma|arthritis|cancer|depression|anxiety)\b/gi,

    // Specialized medical vocabulary
    /\b(etiology|pathology|idiopathic|iatrogenic|comorbid|palliative)\b/gi
  ];

  // Common medical terms by specialty
  const commonMedicalTerms = {
    cardiology: [
      'heart attack', 'myocardial infarction', 'angina', 'arrhythmia', 'atrial fibrillation',
      'hypertension', 'blood pressure', 'cholesterol', 'stent', 'pacemaker', 'valve',
      'coronary artery disease', 'heart failure', 'cardiomyopathy', 'murmur'
    ],
    neurology: [
      'stroke', 'seizure', 'epilepsy', 'migraine', 'multiple sclerosis', 'parkinson',
      'alzheimer', 'dementia', 'neuropathy', 'concussion', 'meningitis', 'encephalitis',
      'brain', 'spinal cord', 'nerve', 'neuron'
    ],
    gastroenterology: [
      'ulcer', 'gastritis', 'colitis', 'crohn', 'irritable bowel', 'celiac', 'hepatitis',
      'cirrhosis', 'pancreatitis', 'gallstone', 'reflux', 'gerd', 'dysphagia'
    ],
    pulmonology: [
      'asthma', 'copd', 'emphysema', 'bronchitis', 'pneumonia', 'tuberculosis',
      'lung cancer', 'pulmonary embolism', 'sleep apnea', 'sarcoidosis', 'fibrosis'
    ],
    orthopedics: [
      'fracture', 'sprain', 'arthritis', 'osteoporosis', 'scoliosis', 'disc herniation',
      'joint replacement', 'tendonitis', 'carpal tunnel', 'acl', 'meniscus'
    ],
    general: [
      'fever', 'pain', 'inflammation', 'infection', 'virus', 'bacteria', 'antibiotic',
      'vaccine', 'allergy', 'diabetes', 'cancer', 'tumor', 'biopsy', 'surgery'
    ]
  };

  // Extract terms using regex patterns
  let terms = [];
  for (const pattern of medicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms = [...terms, ...matches];
    }
  }

  // Check for common medical terms
  const lowerText = text.toLowerCase();
  for (const specialty in commonMedicalTerms) {
    for (const term of commonMedicalTerms[specialty]) {
      // Use word boundaries to match whole terms
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      if (regex.test(lowerText)) {
        terms.push(term);
      }
    }
  }

  // Check for multi-word medical terms
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    // Check for bigrams (two-word combinations)
    const bigram = `${words[i]} ${words[i + 1]}`.toLowerCase();

    // Check if this bigram appears in our common terms
    for (const specialty in commonMedicalTerms) {
      if (commonMedicalTerms[specialty].includes(bigram)) {
        terms.push(bigram);
      }
    }

    // Check for trigrams (three-word combinations) if possible
    if (i < words.length - 2) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`.toLowerCase();

      // Check if this trigram appears in our common terms
      for (const specialty in commonMedicalTerms) {
        if (commonMedicalTerms[specialty].includes(trigram)) {
          terms.push(trigram);
        }
      }
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
