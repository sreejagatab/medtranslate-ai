/**
 * Test Scenario Generator for MedTranslate AI Integration Tests
 * 
 * This module provides functions for generating test scenarios
 * for integration testing of the MedTranslate AI system.
 */

// Medical contexts
const MEDICAL_CONTEXTS = [
  'general',
  'cardiology',
  'neurology',
  'orthopedics',
  'pediatrics',
  'oncology',
  'emergency'
];

// Language pairs
const LANGUAGE_PAIRS = [
  { source: 'en', target: 'es' },
  { source: 'en', target: 'fr' },
  { source: 'es', target: 'en' },
  { source: 'fr', target: 'en' }
];

// Sample medical texts by context
const MEDICAL_TEXTS = {
  general: [
    'The patient has a fever of 101°F and complains of headache and fatigue.',
    'The patient reports difficulty sleeping and loss of appetite for the past week.',
    'The patient has a history of allergies to penicillin and seasonal pollen.'
  ],
  cardiology: [
    'The patient has a history of myocardial infarction and is currently on anticoagulant therapy.',
    'The patient reports chest pain that radiates to the left arm, especially during physical exertion.',
    'The ECG shows ST-segment elevation in leads V1 through V4.'
  ],
  neurology: [
    'The patient experiences recurring migraines with visual aura, typically lasting 4-6 hours.',
    'The patient reports numbness and tingling in the right hand and forearm.',
    'MRI shows a small lesion in the left frontal lobe, possibly indicating a previous ischemic event.'
  ],
  orthopedics: [
    'The patient has limited range of motion in the right shoulder following a fall two weeks ago.',
    'X-rays show a hairline fracture of the distal radius with no displacement.',
    'The patient reports chronic lower back pain that worsens with prolonged sitting.'
  ],
  pediatrics: [
    'The child has had a persistent cough and runny nose for the past 5 days.',
    'The patient is a 3-year-old with a history of recurrent ear infections.',
    'Growth charts indicate the child is in the 85th percentile for height and 75th for weight.'
  ],
  oncology: [
    'The patient is undergoing the third cycle of chemotherapy for stage 2 breast cancer.',
    'PET scan shows no evidence of metastatic disease following surgical resection.',
    'The patient reports increased fatigue and nausea following radiation treatments.'
  ],
  emergency: [
    'The patient was involved in a motor vehicle accident and presents with possible internal bleeding.',
    'The patient is experiencing severe abdominal pain in the lower right quadrant.',
    'The patient arrived with symptoms of anaphylaxis after consuming shellfish.'
  ]
};

/**
 * Generate a random test scenario
 * 
 * @param {Object} options - Scenario options
 * @returns {Object} - Test scenario
 */
function generateRandomScenario(options = {}) {
  // Select random medical context
  const context = options.context || MEDICAL_CONTEXTS[Math.floor(Math.random() * MEDICAL_CONTEXTS.length)];
  
  // Select random language pair
  const languagePair = options.languagePair || LANGUAGE_PAIRS[Math.floor(Math.random() * LANGUAGE_PAIRS.length)];
  
  // Select random text for the context
  const texts = MEDICAL_TEXTS[context] || MEDICAL_TEXTS.general;
  const text = options.text || texts[Math.floor(Math.random() * texts.length)];
  
  return {
    text,
    sourceLanguage: languagePair.source,
    targetLanguage: languagePair.target,
    context
  };
}

/**
 * Generate multiple test scenarios
 * 
 * @param {number} count - Number of scenarios to generate
 * @param {Object} options - Scenario options
 * @returns {Array<Object>} - Array of test scenarios
 */
function generateScenarios(count = 5, options = {}) {
  const scenarios = [];
  
  for (let i = 0; i < count; i++) {
    scenarios.push(generateRandomScenario(options));
  }
  
  return scenarios;
}

/**
 * Generate a comprehensive test suite covering all contexts and languages
 * 
 * @returns {Array<Object>} - Array of test scenarios
 */
function generateComprehensiveTestSuite() {
  const scenarios = [];
  
  // Generate scenarios for each context and language pair
  for (const context of MEDICAL_CONTEXTS) {
    for (const languagePair of LANGUAGE_PAIRS) {
      // Use all texts for this context
      for (const text of MEDICAL_TEXTS[context]) {
        scenarios.push({
          text,
          sourceLanguage: languagePair.source,
          targetLanguage: languagePair.target,
          context
        });
      }
    }
  }
  
  return scenarios;
}

/**
 * Generate edge case scenarios
 * 
 * @returns {Array<Object>} - Array of edge case scenarios
 */
function generateEdgeCaseScenarios() {
  return [
    // Very long text
    {
      text: 'The patient presents with a complex medical history including hypertension, type 2 diabetes mellitus, hyperlipidemia, coronary artery disease with previous myocardial infarction, chronic kidney disease stage 3, and osteoarthritis. Current medications include lisinopril 20mg daily, metformin 1000mg twice daily, atorvastatin 40mg at bedtime, aspirin 81mg daily, and as-needed acetaminophen for joint pain. The patient reports increasing shortness of breath with exertion, occasional chest discomfort, and worsening bilateral knee pain that interferes with daily activities. Physical examination reveals blood pressure of 148/92 mmHg, heart rate of 78 bpm, respiratory rate of 18, and oxygen saturation of 94% on room air. Cardiac examination shows regular rate and rhythm with a grade 2/6 systolic ejection murmur at the right upper sternal border. Lungs have faint bibasilar crackles. Lower extremities show 1+ bilateral pitting edema and crepitus in both knees with limited range of motion.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    },
    // Text with medical abbreviations
    {
      text: 'Pt c/o SOB, CP radiating to L arm. PMH significant for HTN, DM2, and MI x2. VS: BP 160/95, HR 88, RR 22, T 98.6F, SpO2 92% RA. EKG shows NSR with Q waves in II, III, aVF. Labs: Troponin 0.04, BNP 450, CBC WNL, BMP shows Cr 1.4.',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      context: 'cardiology'
    },
    // Text with mixed languages
    {
      text: 'The patient reports "dolor intenso en el pecho" that started yesterday. He describes it as "opresivo" and radiating to his left arm.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'emergency'
    },
    // Text with special characters and numbers
    {
      text: 'Lab results: WBC 12.3×10^9/L, Hb 10.2 g/dL, Platelets 450×10^9/L, Na+ 138 mmol/L, K+ 4.2 mmol/L, Cl- 102 mmol/L, HCO3- 24 mmol/L, BUN 18 mg/dL, Cr 0.9 mg/dL, Glucose 142 mg/dL, ALT 45 U/L, AST 42 U/L, Alk Phos 110 U/L, T. Bili 0.8 mg/dL.',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      context: 'general'
    },
    // Empty text
    {
      text: '',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general'
    }
  ];
}

module.exports = {
  generateRandomScenario,
  generateScenarios,
  generateComprehensiveTestSuite,
  generateEdgeCaseScenarios,
  MEDICAL_CONTEXTS,
  LANGUAGE_PAIRS,
  MEDICAL_TEXTS
};
