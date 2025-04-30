/**
 * Test Data Generator for MedTranslate AI
 * 
 * This script generates realistic test data for user testing sessions.
 * It creates sample sessions, translations, and user profiles.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const NUM_SESSIONS = 20;
const NUM_TRANSLATIONS_PER_SESSION = 15;
const OUTPUT_DIR = path.join(__dirname, '../backend/data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Sample data
const patientNames = [
  'John Smith', 'Maria Garcia', 'Wei Chen', 'Fatima Ahmed', 'Carlos Rodriguez',
  'Aisha Patel', 'Hiroshi Tanaka', 'Sofia Kowalski', 'Mohammed Al-Farsi', 'Priya Singh'
];

const languages = [
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' }
];

const medicalContexts = [
  'General Consultation', 'Cardiology', 'Pediatrics', 'Orthopedics',
  'Neurology', 'Dermatology', 'Obstetrics', 'Emergency', 'Oncology', 'Psychiatry'
];

const sessionStatuses = ['active', 'completed', 'pending', 'cancelled'];

const commonPhrases = {
  'es': [
    { original: 'I have a headache', translated: 'Tengo dolor de cabeza' },
    { original: 'How long have you been feeling this way?', translated: '¿Cuánto tiempo ha estado sintiéndose así?' },
    { original: 'I need to take your blood pressure', translated: 'Necesito tomar su presión arterial' },
    { original: 'Do you have any allergies?', translated: '¿Tiene alguna alergia?' },
    { original: 'Take this medication twice a day', translated: 'Tome este medicamento dos veces al día' }
  ],
  'fr': [
    { original: 'I have a headache', translated: 'J\'ai mal à la tête' },
    { original: 'How long have you been feeling this way?', translated: 'Depuis combien de temps vous sentez-vous ainsi?' },
    { original: 'I need to take your blood pressure', translated: 'Je dois prendre votre tension artérielle' },
    { original: 'Do you have any allergies?', translated: 'Avez-vous des allergies?' },
    { original: 'Take this medication twice a day', translated: 'Prenez ce médicament deux fois par jour' }
  ],
  'zh': [
    { original: 'I have a headache', translated: '我头痛' },
    { original: 'How long have you been feeling this way?', translated: '你感觉这样多久了？' },
    { original: 'I need to take your blood pressure', translated: '我需要量一下你的血压' },
    { original: 'Do you have any allergies?', translated: '你有过敏症状吗？' },
    { original: 'Take this medication twice a day', translated: '一天服用两次这种药物' }
  ]
};

// Helper functions
const randomItem = (array) => array[Math.floor(Math.random() * array.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomBoolean = () => Math.random() > 0.5;
const randomConfidence = () => {
  const rand = Math.random();
  if (rand > 0.7) return 'high';
  if (rand > 0.3) return 'medium';
  return 'low';
};

// Generate a random session
const generateSession = (index) => {
  const language = randomItem(languages);
  const startDate = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
  const status = randomItem(sessionStatuses);
  const endDate = status === 'completed' ? new Date(startDate.getTime() + Math.random() * 60 * 60 * 1000) : null;
  
  return {
    sessionId: uuidv4(),
    sessionCode: `SES${String(index + 1).padStart(4, '0')}`,
    providerId: `provider_${Math.floor(Math.random() * 5) + 1}`,
    providerName: `Dr. ${randomItem(['Smith', 'Johnson', 'Williams', 'Jones', 'Brown'])}`,
    patientId: `patient_${Math.floor(Math.random() * 10) + 1}`,
    patientName: randomItem(patientNames),
    patientLanguage: language.code,
    patientLanguageName: language.name,
    medicalContext: randomItem(medicalContexts),
    status,
    startTime: startDate.toISOString(),
    endTime: endDate ? endDate.toISOString() : null,
    translations: generateTranslations(language.code, status === 'completed' ? NUM_TRANSLATIONS_PER_SESSION : Math.floor(Math.random() * 5) + 1)
  };
};

// Generate translations for a session
const generateTranslations = (languageCode, count) => {
  const translations = [];
  const phrases = commonPhrases[languageCode] || commonPhrases.es; // Default to Spanish if language not found
  
  for (let i = 0; i < count; i++) {
    const isCommonPhrase = Math.random() > 0.7;
    let originalText, translatedText;
    
    if (isCommonPhrase && phrases.length > 0) {
      const phrase = randomItem(phrases);
      originalText = phrase.original;
      translatedText = phrase.translated;
    } else {
      originalText = `Sample original text ${i + 1}`;
      translatedText = `Sample translated text ${i + 1} (${languageCode})`;
    }
    
    translations.push({
      id: uuidv4(),
      timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString(),
      originalText,
      translatedText,
      sourceLanguage: 'en',
      targetLanguage: languageCode,
      confidence: randomConfidence(),
      corrected: randomBoolean() && Math.random() > 0.8,
      reported: randomBoolean() && Math.random() > 0.9,
      latency: Math.floor(Math.random() * 300) + 50, // 50-350ms
      alternatives: Math.random() > 0.8 ? [
        { text: `Alternative 1 for "${translatedText}"`, confidence: 0.7 },
        { text: `Alternative 2 for "${translatedText}"`, confidence: 0.5 }
      ] : []
    });
  }
  
  return translations;
};

// Generate provider profiles
const generateProviders = () => {
  return [
    {
      id: 'provider_1',
      name: 'Dr. Sarah Johnson',
      specialty: 'Family Medicine',
      languages: ['en', 'es'],
      avatar: 'avatar_provider_1.jpg'
    },
    {
      id: 'provider_2',
      name: 'Dr. Michael Chen',
      specialty: 'Cardiology',
      languages: ['en', 'zh'],
      avatar: 'avatar_provider_2.jpg'
    },
    {
      id: 'provider_3',
      name: 'Dr. Aisha Patel',
      specialty: 'Pediatrics',
      languages: ['en', 'hi'],
      avatar: 'avatar_provider_3.jpg'
    },
    {
      id: 'provider_4',
      name: 'Dr. Carlos Rodriguez',
      specialty: 'Neurology',
      languages: ['en', 'es', 'pt'],
      avatar: 'avatar_provider_4.jpg'
    },
    {
      id: 'provider_5',
      name: 'Dr. Emily Wilson',
      specialty: 'Emergency Medicine',
      languages: ['en', 'fr'],
      avatar: 'avatar_provider_5.jpg'
    }
  ];
};

// Generate patient profiles
const generatePatients = () => {
  return patientNames.map((name, index) => {
    const language = randomItem(languages);
    return {
      id: `patient_${index + 1}`,
      name,
      preferredLanguage: language.code,
      preferredLanguageName: language.name,
      medicalHistory: Math.random() > 0.7 ? [
        { condition: 'Hypertension', diagnosedDate: '2020-03-15' },
        { condition: 'Type 2 Diabetes', diagnosedDate: '2018-07-22' }
      ] : [],
      allergies: Math.random() > 0.6 ? ['Penicillin', 'Peanuts'] : [],
      dateOfBirth: randomDate(new Date(1950, 0, 1), new Date(2000, 0, 1)).toISOString().split('T')[0]
    };
  });
};

// Generate all data
const generateAllData = () => {
  console.log('Generating test data...');
  
  // Generate sessions
  const sessions = [];
  for (let i = 0; i < NUM_SESSIONS; i++) {
    sessions.push(generateSession(i));
  }
  
  // Generate providers and patients
  const providers = generateProviders();
  const patients = generatePatients();
  
  // Generate languages list
  const languagesList = languages.map(lang => ({
    ...lang,
    popularity: Math.floor(Math.random() * 100)
  }));
  
  // Write data to files
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sessions.json'), JSON.stringify(sessions, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'providers.json'), JSON.stringify(providers, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'patients.json'), JSON.stringify(patients, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'languages.json'), JSON.stringify(languagesList, null, 2));
  
  console.log('Test data generated successfully!');
  console.log(`- ${sessions.length} sessions`);
  console.log(`- ${providers.length} providers`);
  console.log(`- ${patients.length} patients`);
  console.log(`- ${languagesList.length} languages`);
  console.log(`Files saved to: ${OUTPUT_DIR}`);
};

// Execute the generator
generateAllData();
