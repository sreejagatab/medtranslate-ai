/**
 * Medical knowledge base integration for MedTranslate AI
 *
 * This module provides functions to verify medical terminology against
 * a specialized medical knowledge base stored in DynamoDB.
 *
 * Features:
 * - Medical term extraction and verification
 * - Cross-referencing with multiple medical databases
 * - Support for multiple languages and medical specialties
 * - Confidence scoring for translations
 * - Continuous learning from verified translations
 */

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  endpoint: process.env.NODE_ENV === 'development' && process.env.DYNAMODB_ENDPOINT
    ? process.env.DYNAMODB_ENDPOINT
    : undefined
});

/**
 * Verifies medical terms in a text against the knowledge base
 *
 * @param {string} text - The text containing medical terms
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - Optional medical context/specialty
 * @returns {Promise<Array>} - Array of verified medical terms
 */
async function verifyMedicalTerms(text, sourceLanguage, targetLanguage, medicalContext = 'general') {
  try {
    // Extract potential medical terms from the text
    const medicalTerms = extractMedicalTerms(text, sourceLanguage, medicalContext);

    if (medicalTerms.length === 0) {
      return [];
    }

    console.log(`Extracted ${medicalTerms.length} potential medical terms from text`);

    // Check each term against the medical knowledge base
    const verifiedTerms = [];
    const verificationPromises = medicalTerms.map(term =>
      lookupTermInKB(term, sourceLanguage, targetLanguage)
    );

    const results = await Promise.all(verificationPromises);

    for (const result of results) {
      if (result) {
        verifiedTerms.push(result);
      }
    }

    console.log(`Verified ${verifiedTerms.length} medical terms`);
    return verifiedTerms;
  } catch (error) {
    console.error('Error verifying medical terms:', error);
    return [];
  }
}

/**
 * Extract potential medical terms using regex patterns and common medical terms
 *
 * @param {string} text - The text to extract terms from
 * @param {string} language - The language of the text
 * @param {string} medicalContext - Optional medical context/specialty
 * @returns {Array<string>} - Array of potential medical terms
 */
function extractMedicalTerms(text, language = 'en', medicalContext = 'general') {
  // Skip empty text
  if (!text || text.trim() === '') {
    return [];
  }

  // Language-specific patterns
  const languagePatterns = {
    en: [
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
    ],
    es: [
      // Spanish disease patterns
      /\b[A-Z][a-z]+ (enfermedad|síndrome|trastorno|condición|deficiencia)\b/g,
      /\b(enfermedad|síndrome|trastorno) de [a-z]+\b/gi,

      // Spanish diagnostic procedures
      /\b[A-Z]?[a-z]* (prueba|escaneo|procedimiento|evaluación|imagen|biopsia)\b/gi,
      /\b(resonancia|tomografía|ultrasonido|radiografía|electrocardiograma)\b/gi,

      // Spanish treatments
      /\b(oral|intravenoso|tópico|intramuscular) [a-z]+\b/gi,

      // Spanish symptoms
      /\b(agudo|crónico|leve|severo|recurrente) [a-z]+\b/gi,
      /\b[a-z]+ (infección|inflamación|dolor|malestar)\b/gi,

      // Spanish medical conditions
      /\b(diabetes|hipertensión|asma|artritis|cáncer|depresión|ansiedad)\b/gi
    ],
    fr: [
      // French disease patterns
      /\b[A-Z][a-z]+ (maladie|syndrome|trouble|condition|carence)\b/g,
      /\b(maladie|syndrome|trouble) de [a-z]+\b/gi,

      // French diagnostic procedures
      /\b[A-Z]?[a-z]* (test|examen|procédure|dépistage|imagerie|biopsie)\b/gi,
      /\b(IRM|scanner|échographie|radiographie|électrocardiogramme)\b/gi,

      // French treatments
      /\b(oral|intraveineux|topique|intramusculaire) [a-z]+\b/gi,

      // French symptoms
      /\b(aigu|chronique|léger|sévère|récurrent) [a-z]+\b/gi,
      /\b[a-z]+ (infection|inflammation|douleur|gêne)\b/gi,

      // French medical conditions
      /\b(diabète|hypertension|asthme|arthrite|cancer|dépression|anxiété)\b/gi
    ],
    // Add patterns for other languages as needed
  };

  // Use English patterns as fallback for unsupported languages
  const medicalPatterns = languagePatterns[language] || languagePatterns['en'];

  // Common medical terms by specialty and language
  const commonMedicalTermsByLanguage = {
    en: {
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
    },
    es: {
      cardiology: [
        'ataque cardíaco', 'infarto de miocardio', 'angina', 'arritmia', 'fibrilación auricular',
        'hipertensión', 'presión arterial', 'colesterol', 'stent', 'marcapasos', 'válvula',
        'enfermedad coronaria', 'insuficiencia cardíaca', 'cardiomiopatía', 'soplo'
      ],
      neurology: [
        'derrame cerebral', 'convulsión', 'epilepsia', 'migraña', 'esclerosis múltiple', 'parkinson',
        'alzheimer', 'demencia', 'neuropatía', 'conmoción cerebral', 'meningitis', 'encefalitis',
        'cerebro', 'médula espinal', 'nervio', 'neurona'
      ],
      gastroenterology: [
        'úlcera', 'gastritis', 'colitis', 'crohn', 'colon irritable', 'celíaca', 'hepatitis',
        'cirrosis', 'pancreatitis', 'cálculo biliar', 'reflujo', 'erge', 'disfagia'
      ],
      pulmonology: [
        'asma', 'epoc', 'enfisema', 'bronquitis', 'neumonía', 'tuberculosis',
        'cáncer de pulmón', 'embolia pulmonar', 'apnea del sueño', 'sarcoidosis', 'fibrosis'
      ],
      orthopedics: [
        'fractura', 'esguince', 'artritis', 'osteoporosis', 'escoliosis', 'hernia discal',
        'reemplazo articular', 'tendinitis', 'túnel carpiano', 'ligamento cruzado', 'menisco'
      ],
      general: [
        'fiebre', 'dolor', 'inflamación', 'infección', 'virus', 'bacteria', 'antibiótico',
        'vacuna', 'alergia', 'diabetes', 'cáncer', 'tumor', 'biopsia', 'cirugía'
      ]
    },
    fr: {
      cardiology: [
        'crise cardiaque', 'infarctus du myocarde', 'angine', 'arythmie', 'fibrillation auriculaire',
        'hypertension', 'tension artérielle', 'cholestérol', 'stent', 'stimulateur cardiaque', 'valve',
        'maladie coronarienne', 'insuffisance cardiaque', 'cardiomyopathie', 'souffle'
      ],
      neurology: [
        'accident vasculaire cérébral', 'convulsion', 'épilepsie', 'migraine', 'sclérose en plaques', 'parkinson',
        'alzheimer', 'démence', 'neuropathie', 'commotion cérébrale', 'méningite', 'encéphalite',
        'cerveau', 'moelle épinière', 'nerf', 'neurone'
      ],
      gastroenterology: [
        'ulcère', 'gastrite', 'colite', 'maladie de crohn', 'côlon irritable', 'maladie cœliaque', 'hépatite',
        'cirrhose', 'pancréatite', 'calcul biliaire', 'reflux', 'rgo', 'dysphagie'
      ],
      pulmonology: [
        'asthme', 'bpco', 'emphysème', 'bronchite', 'pneumonie', 'tuberculose',
        'cancer du poumon', 'embolie pulmonaire', 'apnée du sommeil', 'sarcoïdose', 'fibrose'
      ],
      orthopedics: [
        'fracture', 'entorse', 'arthrite', 'ostéoporose', 'scoliose', 'hernie discale',
        'remplacement articulaire', 'tendinite', 'syndrome du canal carpien', 'ligament croisé', 'ménisque'
      ],
      general: [
        'fièvre', 'douleur', 'inflammation', 'infection', 'virus', 'bactérie', 'antibiotique',
        'vaccin', 'allergie', 'diabète', 'cancer', 'tumeur', 'biopsie', 'chirurgie'
      ]
    }
    // Add terms for other languages as needed
  };

  // Use English terms as fallback for unsupported languages
  const commonMedicalTerms = commonMedicalTermsByLanguage[language] || commonMedicalTermsByLanguage['en'];

  // If a specific medical context is provided, prioritize terms from that specialty
  const priorityTerms = medicalContext !== 'general' && commonMedicalTerms[medicalContext]
    ? commonMedicalTerms[medicalContext]
    : [];

  // Extract terms using regex patterns
  let terms = [];
  for (const pattern of medicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms = [...terms, ...matches];
    }
  }

  // First check priority terms if a medical context was provided
  if (priorityTerms.length > 0) {
    const lowerText = text.toLowerCase();
    for (const term of priorityTerms) {
      try {
        // Escape special regex characters in the term
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundaries to match whole terms
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
        if (regex.test(lowerText)) {
          terms.push(term);
        }
      } catch (error) {
        console.error(`Error with regex for term "${term}":`, error);
        // Skip this term and continue
      }
    }
  }

  // Check for common medical terms from all specialties
  const lowerText = text.toLowerCase();
  for (const specialty in commonMedicalTerms) {
    // Skip the specialty we already checked if it was a priority
    if (specialty === medicalContext && priorityTerms.length > 0) {
      continue;
    }

    for (const term of commonMedicalTerms[specialty]) {
      try {
        // Escape special regex characters in the term
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundaries to match whole terms
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
        if (regex.test(lowerText)) {
          terms.push(term);
        }
      } catch (error) {
        console.error(`Error with regex for term "${term}":`, error);
        // Skip this term and continue
      }
    }
  }

  // Optimize multi-word term detection
  // Instead of checking all possible n-grams, we'll use a sliding window approach
  const words = text.split(/\s+/);

  // Create a set of all multi-word terms from our dictionary for faster lookup
  const multiWordTerms = new Set();
  for (const specialty in commonMedicalTerms) {
    for (const term of commonMedicalTerms[specialty]) {
      if (term.includes(' ')) {
        multiWordTerms.add(term.toLowerCase());
      }
    }
  }

  // Check for multi-word terms using sliding windows of different sizes
  for (let windowSize = 2; windowSize <= 5; windowSize++) {
    if (words.length < windowSize) continue;

    for (let i = 0; i <= words.length - windowSize; i++) {
      const phrase = words.slice(i, i + windowSize).join(' ').toLowerCase();
      if (multiWordTerms.has(phrase)) {
        terms.push(phrase);
      }
    }
  }

  // Remove duplicates and convert to lowercase for consistency
  return [...new Set(terms.map(term => term.toLowerCase()))];
}

/**
 * Look up a term in the medical knowledge base with cross-referencing
 *
 * @param {string} term - The medical term to look up
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} medicalContext - Optional medical context/specialty
 * @returns {Promise<Object|null>} - The verified term or null if not found
 */
async function lookupTermInKB(term, sourceLanguage, targetLanguage, medicalContext = 'general') {
  try {
    // Normalize the term
    const normalizedTerm = term.toLowerCase().trim();

    if (!normalizedTerm) {
      return null;
    }

    // First, try exact match
    const exactMatchResult = await lookupExactTerm(normalizedTerm, sourceLanguage, targetLanguage);
    if (exactMatchResult) {
      return {
        ...exactMatchResult,
        matchType: 'exact'
      };
    }

    // If no exact match and term has multiple words, try partial matches
    if (normalizedTerm.includes(' ')) {
      // Try to match the longest part of the term
      const words = normalizedTerm.split(/\s+/);

      // Try different combinations of words, starting with the longest
      for (let length = words.length - 1; length > 0; length--) {
        for (let start = 0; start <= words.length - length; start++) {
          const partialTerm = words.slice(start, start + length).join(' ');
          const partialResult = await lookupExactTerm(partialTerm, sourceLanguage, targetLanguage);

          if (partialResult) {
            return {
              ...partialResult,
              matchType: 'partial',
              originalTerm: normalizedTerm
            };
          }
        }
      }
    }

    // If still no match, try stemming or fuzzy matching for single words
    if (!normalizedTerm.includes(' ')) {
      // Simple stemming - remove common suffixes
      const stemmedTerm = stemTerm(normalizedTerm);
      if (stemmedTerm !== normalizedTerm) {
        const stemmedResult = await lookupExactTerm(stemmedTerm, sourceLanguage, targetLanguage);
        if (stemmedResult) {
          return {
            ...stemmedResult,
            matchType: 'stemmed',
            originalTerm: normalizedTerm
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error looking up medical term:', error);
    return null;
  }
}

/**
 * Look up a term with exact matching
 *
 * @param {string} term - The term to look up
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @returns {Promise<Object|null>} - The term data or null if not found
 */
async function lookupExactTerm(term, sourceLanguage, targetLanguage) {
  try {
    const params = {
      TableName: process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology',
      Key: {
        term_source: `${term}:${sourceLanguage}`
      }
    };

    const result = await dynamoDB.get(params).promise();
    if (result.Item && result.Item.translations) {
      const targetTranslation = result.Item.translations.find(t =>
        t.language === targetLanguage
      );

      if (targetTranslation) {
        return {
          sourceTerm: result.Item.term,
          targetTerm: targetTranslation.term,
          confidence: targetTranslation.confidence || 'high',
          domain: result.Item.domain || 'general',
          verified: true,
          definition: result.Item.definition || ''
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error in exact term lookup:', error);
    return null;
  }
}

/**
 * Simple stemming function for medical terms
 *
 * @param {string} term - The term to stem
 * @returns {string} - The stemmed term
 */
function stemTerm(term) {
  // Very simple stemming for demonstration
  // In a production system, use a proper stemming library
  const suffixes = ['s', 'es', 'itis', 'osis', 'ia', 'ic', 'al', 'ive', 'ary'];

  let stemmed = term;
  for (const suffix of suffixes) {
    if (term.endsWith(suffix) && term.length > suffix.length + 3) {
      stemmed = term.slice(0, -suffix.length);
      break;
    }
  }

  return stemmed;
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

/**
 * Get all terms for a specific medical domain
 *
 * @param {string} domain - The medical domain
 * @param {string} language - The language code
 * @param {number} limit - Maximum number of terms to return
 * @returns {Promise<Array>} - Array of terms in the domain
 */
async function getTermsByDomain(domain, language, limit = 100) {
  try {
    // For a real implementation, this would use a GSI on domain and language
    // For now, we'll use a scan operation with a filter
    const params = {
      TableName: process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology',
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

    return result.Items.map(item => ({
      term: item.term,
      language: item.language,
      domain: item.domain,
      definition: item.definition || '',
      translations: item.translations || []
    }));
  } catch (error) {
    console.error('Error getting terms by domain:', error);
    return [];
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
    expressionAttributeValues[':search_prefix'] = `${searchTerm.toLowerCase()}`;

    // Filter by domain if provided
    if (domain) {
      filterExpressions.push('#domain = :domain');
      expressionAttributeNames['#domain'] = 'domain';
      expressionAttributeValues[':domain'] = domain;
    }

    // Create filter expression
    const filterExpression = filterExpressions.join(' AND ');

    const params = {
      TableName: process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology',
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit
    };

    const result = await dynamoDB.scan(params).promise();

    return result.Items.map(item => ({
      term: item.term,
      language: item.language,
      domain: item.domain,
      definition: item.definition || '',
      translations: item.translations || []
    }));
  } catch (error) {
    console.error('Error searching terms:', error);
    return [];
  }
}

module.exports = {
  verifyMedicalTerms,
  extractMedicalTerms,
  lookupTermInKB,
  lookupExactTerm,
  addTermToKB,
  getTermsByDomain,
  searchTerms,
  stemTerm
};
