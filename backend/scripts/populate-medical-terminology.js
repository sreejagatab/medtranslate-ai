/**
 * Populate Medical Terminology Database
 * 
 * This script populates the MedicalTerminology DynamoDB table with sample data.
 * It includes common medical terms with translations in multiple languages.
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const MedicalTerminology = require('../models/MedicalTerminology');

// Configure AWS
if (process.env.NODE_ENV !== 'production') {
  AWS.config.update({
    region: config.aws.region,
    endpoint: config.aws.dynamoEndpoint
  });
}

// Medical specialties
const SPECIALTIES = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Gastroenterology',
  'Neurology',
  'Obstetrics',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Rheumatology',
  'Urology'
];

// Term categories
const CATEGORIES = [
  'Anatomy',
  'Condition',
  'Diagnostic',
  'Medication',
  'Procedure',
  'Symptom',
  'Vital Sign'
];

// Languages for translations
const LANGUAGES = [
  'es', // Spanish
  'fr', // French
  'zh', // Chinese
  'ar', // Arabic
  'ru', // Russian
  'hi', // Hindi
  'pt', // Portuguese
  'de', // German
  'ja', // Japanese
  'ko'  // Korean
];

// Sample medical terms with translations
const SAMPLE_TERMS = [
  // Cardiology terms
  {
    englishTerm: 'Myocardial Infarction',
    category: 'Condition',
    specialty: 'Cardiology',
    translations: {
      'es': 'Infarto de miocardio',
      'fr': 'Infarctus du myocarde',
      'zh': '心肌梗塞',
      'ar': 'احتشاء عضلة القلب',
      'ru': 'Инфаркт миокарда'
    },
    contextExamples: [
      'The patient presented with symptoms consistent with myocardial infarction.',
      'ECG showed ST elevation indicative of myocardial infarction.'
    ],
    relatedTerms: ['Heart Attack', 'Coronary Thrombosis', 'Acute Coronary Syndrome'],
    medicalCode: 'ICD-10: I21'
  },
  {
    englishTerm: 'Hypertension',
    category: 'Condition',
    specialty: 'Cardiology',
    translations: {
      'es': 'Hipertensión',
      'fr': 'Hypertension',
      'zh': '高血压',
      'ar': 'ارتفاع ضغط الدم',
      'ru': 'Гипертония'
    },
    contextExamples: [
      'The patient has a history of uncontrolled hypertension.',
      'Medication was prescribed to manage hypertension.'
    ],
    relatedTerms: ['High Blood Pressure', 'HTN', 'Hypertensive Heart Disease'],
    medicalCode: 'ICD-10: I10'
  },
  
  // Gastroenterology terms
  {
    englishTerm: 'Gastroesophageal Reflux Disease',
    category: 'Condition',
    specialty: 'Gastroenterology',
    translations: {
      'es': 'Enfermedad por reflujo gastroesofágico',
      'fr': 'Reflux gastro-œsophagien',
      'zh': '胃食管反流病',
      'ar': 'مرض الارتجاع المعدي المريئي',
      'ru': 'Гастроэзофагеальная рефлюксная болезнь'
    },
    contextExamples: [
      'The patient reports symptoms of gastroesophageal reflux disease, including heartburn and regurgitation.',
      'An endoscopy was performed to evaluate the severity of gastroesophageal reflux disease.'
    ],
    relatedTerms: ['GERD', 'Acid Reflux', 'Heartburn'],
    medicalCode: 'ICD-10: K21'
  },
  
  // Neurology terms
  {
    englishTerm: 'Migraine',
    category: 'Condition',
    specialty: 'Neurology',
    translations: {
      'es': 'Migraña',
      'fr': 'Migraine',
      'zh': '偏头痛',
      'ar': 'الصداع النصفي',
      'ru': 'Мигрень'
    },
    contextExamples: [
      'The patient experiences migraines with aura approximately twice monthly.',
      'Preventive medication was prescribed for chronic migraines.'
    ],
    relatedTerms: ['Headache', 'Migraine with Aura', 'Chronic Migraine'],
    medicalCode: 'ICD-10: G43'
  },
  
  // Orthopedics terms
  {
    englishTerm: 'Osteoarthritis',
    category: 'Condition',
    specialty: 'Orthopedics',
    translations: {
      'es': 'Osteoartritis',
      'fr': 'Arthrose',
      'zh': '骨关节炎',
      'ar': 'التهاب المفاصل العظمي',
      'ru': 'Остеоартрит'
    },
    contextExamples: [
      'X-rays showed joint space narrowing consistent with osteoarthritis of the knee.',
      'The patient reports worsening osteoarthritis pain in cold weather.'
    ],
    relatedTerms: ['Degenerative Joint Disease', 'OA', 'Degenerative Arthritis'],
    medicalCode: 'ICD-10: M15-M19'
  },
  
  // Common symptoms
  {
    englishTerm: 'Dyspnea',
    category: 'Symptom',
    specialty: 'Pulmonology',
    translations: {
      'es': 'Disnea',
      'fr': 'Dyspnée',
      'zh': '呼吸困难',
      'ar': 'ضيق التنفس',
      'ru': 'Одышка'
    },
    contextExamples: [
      'The patient presented with acute dyspnea.',
      'Dyspnea worsens with exertion.'
    ],
    relatedTerms: ['Shortness of Breath', 'Breathlessness', 'Respiratory Distress'],
    medicalCode: 'ICD-10: R06.0'
  },
  
  // Vital signs
  {
    englishTerm: 'Blood Pressure',
    category: 'Vital Sign',
    specialty: 'General',
    translations: {
      'es': 'Presión arterial',
      'fr': 'Tension artérielle',
      'zh': '血压',
      'ar': 'ضغط الدم',
      'ru': 'Кровяное давление'
    },
    contextExamples: [
      'The patient\'s blood pressure was 120/80 mmHg.',
      'Blood pressure should be monitored regularly.'
    ],
    relatedTerms: ['BP', 'Hypertension', 'Hypotension'],
    medicalCode: null
  },
  
  // Procedures
  {
    englishTerm: 'Electrocardiogram',
    category: 'Diagnostic',
    specialty: 'Cardiology',
    translations: {
      'es': 'Electrocardiograma',
      'fr': 'Électrocardiogramme',
      'zh': '心电图',
      'ar': 'تخطيط كهربية القلب',
      'ru': 'Электрокардиограмма'
    },
    contextExamples: [
      'An electrocardiogram was performed to assess cardiac rhythm.',
      'The electrocardiogram showed normal sinus rhythm.'
    ],
    relatedTerms: ['ECG', 'EKG', 'Cardiac Monitoring'],
    medicalCode: 'CPT: 93000'
  },
  
  // Medications
  {
    englishTerm: 'Acetaminophen',
    category: 'Medication',
    specialty: 'General',
    translations: {
      'es': 'Paracetamol',
      'fr': 'Paracétamol',
      'zh': '对乙酰氨基酚',
      'ar': 'باراسيتامول',
      'ru': 'Парацетамол'
    },
    contextExamples: [
      'Acetaminophen was prescribed for pain relief.',
      'The patient takes acetaminophen as needed for headaches.'
    ],
    relatedTerms: ['Paracetamol', 'Tylenol', 'APAP'],
    medicalCode: null
  },
  
  // Anatomy
  {
    englishTerm: 'Liver',
    category: 'Anatomy',
    specialty: 'Gastroenterology',
    translations: {
      'es': 'Hígado',
      'fr': 'Foie',
      'zh': '肝脏',
      'ar': 'الكبد',
      'ru': 'Печень'
    },
    contextExamples: [
      'Liver function tests were within normal limits.',
      'The ultrasound showed a normal-sized liver.'
    ],
    relatedTerms: ['Hepatic', 'Hepatocyte', 'Hepatology'],
    medicalCode: null
  }
];

// Generate additional terms
const generateAdditionalTerms = () => {
  const additionalTerms = [];
  
  // Cardiology terms
  additionalTerms.push(
    {
      englishTerm: 'Atrial Fibrillation',
      category: 'Condition',
      specialty: 'Cardiology',
      translations: {
        'es': 'Fibrilación auricular',
        'fr': 'Fibrillation auriculaire',
        'zh': '心房颤动',
        'ar': 'رجفان أذيني',
        'ru': 'Фибрилляция предсердий'
      },
      contextExamples: [
        'The patient was diagnosed with atrial fibrillation.',
        'Anticoagulation therapy was initiated for atrial fibrillation.'
      ],
      relatedTerms: ['AFib', 'Irregular Heartbeat', 'Arrhythmia'],
      medicalCode: 'ICD-10: I48'
    },
    {
      englishTerm: 'Coronary Artery Disease',
      category: 'Condition',
      specialty: 'Cardiology',
      translations: {
        'es': 'Enfermedad de las arterias coronarias',
        'fr': 'Maladie coronarienne',
        'zh': '冠状动脉疾病',
        'ar': 'مرض الشريان التاجي',
        'ru': 'Ишемическая болезнь сердца'
      },
      contextExamples: [
        'The patient has a history of coronary artery disease.',
        'Coronary angiography confirmed coronary artery disease.'
      ],
      relatedTerms: ['CAD', 'Coronary Heart Disease', 'Ischemic Heart Disease'],
      medicalCode: 'ICD-10: I25.1'
    }
  );
  
  // Neurology terms
  additionalTerms.push(
    {
      englishTerm: 'Epilepsy',
      category: 'Condition',
      specialty: 'Neurology',
      translations: {
        'es': 'Epilepsia',
        'fr': 'Épilepsie',
        'zh': '癫痫',
        'ar': 'الصرع',
        'ru': 'Эпилепсия'
      },
      contextExamples: [
        'The patient has been diagnosed with epilepsy.',
        'Anti-seizure medication was prescribed to manage epilepsy.'
      ],
      relatedTerms: ['Seizure Disorder', 'Convulsions', 'Seizures'],
      medicalCode: 'ICD-10: G40'
    },
    {
      englishTerm: 'Multiple Sclerosis',
      category: 'Condition',
      specialty: 'Neurology',
      translations: {
        'es': 'Esclerosis múltiple',
        'fr': 'Sclérose en plaques',
        'zh': '多发性硬化症',
        'ar': 'التصلب المتعدد',
        'ru': 'Рассеянный склероз'
      },
      contextExamples: [
        'MRI findings were consistent with multiple sclerosis.',
        'The patient experiences periodic exacerbations of multiple sclerosis.'
      ],
      relatedTerms: ['MS', 'Demyelinating Disease', 'CNS Demyelination'],
      medicalCode: 'ICD-10: G35'
    }
  );
  
  // Generate more terms for each specialty
  SPECIALTIES.forEach(specialty => {
    // Add 2-3 terms for each specialty
    const numTerms = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 0; i < numTerms; i++) {
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const englishTerm = `${specialty} Term ${i + 1}`;
      
      // Generate translations
      const translations = {};
      LANGUAGES.forEach(lang => {
        if (Math.random() > 0.3) { // 70% chance to have a translation
          translations[lang] = `${lang.toUpperCase()} translation for ${englishTerm}`;
        }
      });
      
      additionalTerms.push({
        englishTerm,
        category,
        specialty,
        translations,
        contextExamples: [
          `Example context 1 for ${englishTerm}`,
          `Example context 2 for ${englishTerm}`
        ],
        relatedTerms: [
          `Related term 1 for ${englishTerm}`,
          `Related term 2 for ${englishTerm}`
        ],
        medicalCode: Math.random() > 0.5 ? `Sample code for ${englishTerm}` : null
      });
    }
  });
  
  return additionalTerms;
};

// Main function to populate the database
const populateDatabase = async () => {
  try {
    console.log('Starting to populate medical terminology database...');
    
    // Combine sample terms with generated terms
    const allTerms = [
      ...SAMPLE_TERMS,
      ...generateAdditionalTerms()
    ];
    
    // Add unique IDs to each term
    const termsWithIds = allTerms.map(term => ({
      ...term,
      termId: uuidv4()
    }));
    
    // Batch import terms
    console.log(`Importing ${termsWithIds.length} medical terms...`);
    const results = await MedicalTerminology.batchImportTerms(termsWithIds);
    
    console.log('Import completed:');
    console.log(`- Successfully imported: ${results.successful}`);
    console.log(`- Failed imports: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('Errors encountered:');
      results.errors.forEach(error => {
        console.log(`- Batch ${error.batch}: ${error.error}`);
      });
    }
    
    console.log('Medical terminology database population completed.');
  } catch (error) {
    console.error('Error populating medical terminology database:', error);
  }
};

// Execute if this script is run directly
if (require.main === module) {
  populateDatabase()
    .then(() => {
      console.log('Script execution completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { populateDatabase };
