/**
 * Test Data Generator for MedTranslate AI
 * 
 * This service generates realistic test data for various testing scenarios.
 */

const fs = require('fs');
const path = require('path');
const faker = require('faker');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  outputDir: path.join(__dirname, '../../test-data'),
  datasetSizes: {
    small: 10,
    medium: 100,
    large: 1000
  },
  supportedLanguages: [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'ru', name: 'Russian' }
  ],
  medicalSpecialties: [
    'cardiology',
    'dermatology',
    'endocrinology',
    'gastroenterology',
    'neurology',
    'obstetrics',
    'oncology',
    'ophthalmology',
    'orthopedics',
    'pediatrics',
    'psychiatry',
    'pulmonology',
    'radiology',
    'urology',
    'general'
  ]
};

// Create output directory if it doesn't exist
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

/**
 * Generate a random user
 * 
 * @param {string} userType - Type of user (provider, patient, admin)
 * @returns {Object} - User data
 */
function generateUser(userType = 'patient') {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const email = faker.internet.email(firstName, lastName, 'example.com').toLowerCase();
  
  const baseUser = {
    id: uuidv4(),
    firstName,
    lastName,
    email,
    password: `Test${faker.internet.password(8, true)}!`,
    createdAt: faker.date.past(1).toISOString(),
    updatedAt: faker.date.recent().toISOString()
  };
  
  switch (userType) {
    case 'provider':
      return {
        ...baseUser,
        specialty: faker.random.arrayElement(config.medicalSpecialties),
        languages: faker.random.arrayElements(
          config.supportedLanguages.map(lang => lang.code),
          faker.random.number({ min: 1, max: 3 })
        ),
        licenseNumber: faker.random.alphaNumeric(10).toUpperCase(),
        hospital: faker.company.companyName() + ' Hospital',
        department: faker.random.arrayElement([
          'Emergency',
          'Outpatient',
          'Inpatient',
          'Surgery',
          'Intensive Care'
        ]),
        role: 'provider'
      };
    
    case 'patient':
      return {
        ...baseUser,
        preferredLanguage: faker.random.arrayElement(config.supportedLanguages.map(lang => lang.code)),
        dateOfBirth: faker.date.past(50, new Date('2000-01-01')).toISOString().split('T')[0],
        medicalHistory: faker.random.arrayElements([
          'hypertension',
          'diabetes',
          'asthma',
          'allergies',
          'heart disease',
          'cancer',
          'stroke',
          'arthritis',
          'depression',
          'anxiety'
        ], faker.random.number({ min: 0, max: 3 })),
        medications: faker.random.arrayElements([
          'aspirin',
          'ibuprofen',
          'acetaminophen',
          'lisinopril',
          'metformin',
          'atorvastatin',
          'levothyroxine',
          'albuterol',
          'fluoxetine',
          'omeprazole'
        ], faker.random.number({ min: 0, max: 4 })),
        role: 'patient'
      };
    
    case 'admin':
      return {
        ...baseUser,
        role: 'admin',
        permissions: [
          'user_management',
          'system_settings',
          'analytics',
          'edge_device_management',
          'translation_management'
        ]
      };
    
    default:
      return baseUser;
  }
}

/**
 * Generate a batch of users
 * 
 * @param {string} userType - Type of user (provider, patient, admin)
 * @param {number} count - Number of users to generate
 * @returns {Array<Object>} - Array of user data
 */
function generateUsers(userType = 'patient', count = 10) {
  return Array.from({ length: count }, () => generateUser(userType));
}

/**
 * Generate a translation session
 * 
 * @param {Object} provider - Provider data
 * @param {Object} patient - Patient data
 * @returns {Object} - Session data
 */
function generateSession(provider, patient) {
  const startTime = faker.date.recent(7);
  const endTime = faker.date.between(startTime, new Date());
  const duration = Math.floor((endTime - startTime) / 1000); // Duration in seconds
  
  return {
    id: uuidv4(),
    providerId: provider.id,
    patientId: patient.id,
    providerName: `${provider.firstName} ${provider.lastName}`,
    patientName: `${patient.firstName} ${patient.lastName}`,
    sourceLanguage: provider.languages[0] || 'en',
    targetLanguage: patient.preferredLanguage,
    medicalContext: provider.specialty || 'general',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration,
    status: faker.random.arrayElement(['completed', 'in-progress', 'cancelled']),
    messageCount: faker.random.number({ min: 5, max: 50 }),
    offlineMode: faker.random.boolean(),
    deviceId: faker.random.boolean() ? uuidv4() : null,
    createdAt: startTime.toISOString(),
    updatedAt: endTime.toISOString()
  };
}

/**
 * Generate a batch of sessions
 * 
 * @param {Array<Object>} providers - Array of provider data
 * @param {Array<Object>} patients - Array of patient data
 * @param {number} count - Number of sessions to generate
 * @returns {Array<Object>} - Array of session data
 */
function generateSessions(providers, patients, count = 20) {
  return Array.from({ length: count }, () => {
    const provider = faker.random.arrayElement(providers);
    const patient = faker.random.arrayElement(patients);
    return generateSession(provider, patient);
  });
}

/**
 * Generate a translation message
 * 
 * @param {Object} session - Session data
 * @param {string} direction - Message direction (provider-to-patient, patient-to-provider)
 * @returns {Object} - Message data
 */
function generateMessage(session, direction = 'provider-to-patient') {
  const timestamp = faker.date.between(
    new Date(session.startTime),
    new Date(session.endTime)
  );
  
  const isProviderToPatient = direction === 'provider-to-patient';
  const sourceLanguage = isProviderToPatient ? session.sourceLanguage : session.targetLanguage;
  const targetLanguage = isProviderToPatient ? session.targetLanguage : session.sourceLanguage;
  
  // Generate source text based on medical context and language
  let sourceText = '';
  
  if (sourceLanguage === 'en') {
    if (session.medicalContext === 'cardiology') {
      sourceText = faker.random.arrayElement([
        'Have you experienced chest pain?',
        'Do you have a history of heart disease?',
        'Are you taking any blood thinners?',
        'Have you had any palpitations?',
        'Do you get short of breath with exertion?'
      ]);
    } else if (session.medicalContext === 'neurology') {
      sourceText = faker.random.arrayElement([
        'Have you had any headaches?',
        'Have you experienced any numbness or tingling?',
        'Have you had any seizures?',
        'Do you have a history of stroke?',
        'Have you had any memory problems?'
      ]);
    } else {
      sourceText = faker.random.arrayElement([
        'How are you feeling today?',
        'Where does it hurt?',
        'When did the symptoms start?',
        'Are you taking any medications?',
        'Do you have any allergies?'
      ]);
    }
  } else {
    // For non-English, just use a generic message
    sourceText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  }
  
  return {
    id: uuidv4(),
    sessionId: session.id,
    senderId: isProviderToPatient ? session.providerId : session.patientId,
    senderType: isProviderToPatient ? 'provider' : 'patient',
    sourceLanguage,
    targetLanguage,
    sourceText,
    translatedText: `[Translated] ${sourceText}`,
    timestamp: timestamp.toISOString(),
    status: faker.random.arrayElement(['delivered', 'translated', 'error']),
    offlineTranslation: session.offlineMode && faker.random.boolean(),
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString()
  };
}

/**
 * Generate messages for a session
 * 
 * @param {Object} session - Session data
 * @returns {Array<Object>} - Array of message data
 */
function generateSessionMessages(session) {
  const messageCount = session.messageCount || faker.random.number({ min: 5, max: 20 });
  
  return Array.from({ length: messageCount }, (_, index) => {
    // Alternate between provider and patient messages
    const direction = index % 2 === 0 ? 'provider-to-patient' : 'patient-to-provider';
    return generateMessage(session, direction);
  });
}

/**
 * Generate an edge device
 * 
 * @returns {Object} - Edge device data
 */
function generateEdgeDevice() {
  const deviceTypes = ['tablet', 'laptop', 'desktop', 'mobile'];
  const osTypes = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'];
  const connectionTypes = ['wifi', 'ethernet', 'cellular', 'bluetooth'];
  
  return {
    id: uuidv4(),
    name: `Device-${faker.random.alphaNumeric(6).toUpperCase()}`,
    type: faker.random.arrayElement(deviceTypes),
    os: faker.random.arrayElement(osTypes),
    osVersion: `${faker.random.number({ min: 10, max: 15 })}.${faker.random.number({ min: 0, max: 9 })}`,
    connectionType: faker.random.arrayElement(connectionTypes),
    ipAddress: faker.internet.ip(),
    macAddress: faker.internet.mac(),
    lastSyncTime: faker.date.recent().toISOString(),
    status: faker.random.arrayElement(['online', 'offline', 'syncing']),
    batteryLevel: faker.random.number({ min: 0, max: 100 }),
    storageTotal: faker.random.number({ min: 32, max: 512 }) * 1024 * 1024 * 1024, // in bytes
    storageUsed: faker.random.number({ min: 5, max: 100 }) * 1024 * 1024 * 1024, // in bytes
    cacheSize: faker.random.number({ min: 100, max: 1000 }) * 1024 * 1024, // in bytes
    registeredAt: faker.date.past(1).toISOString(),
    updatedAt: faker.date.recent().toISOString()
  };
}

/**
 * Generate a batch of edge devices
 * 
 * @param {number} count - Number of devices to generate
 * @returns {Array<Object>} - Array of edge device data
 */
function generateEdgeDevices(count = 5) {
  return Array.from({ length: count }, generateEdgeDevice);
}

/**
 * Generate a medical term
 * 
 * @param {string} language - Language code
 * @param {string} specialty - Medical specialty
 * @returns {Object} - Medical term data
 */
function generateMedicalTerm(language = 'en', specialty = 'general') {
  // English medical terms by specialty
  const medicalTermsBySpecialty = {
    cardiology: [
      'hypertension', 'myocardial infarction', 'arrhythmia', 'angina', 'heart failure',
      'atrial fibrillation', 'ventricular tachycardia', 'pericarditis', 'endocarditis', 'valve stenosis'
    ],
    neurology: [
      'seizure', 'stroke', 'migraine', 'multiple sclerosis', 'parkinson\'s disease',
      'alzheimer\'s disease', 'epilepsy', 'neuropathy', 'meningitis', 'encephalitis'
    ],
    general: [
      'fever', 'pain', 'nausea', 'vomiting', 'diarrhea',
      'cough', 'headache', 'fatigue', 'dizziness', 'rash'
    ]
  };
  
  // Use general terms if specialty not found
  const terms = medicalTermsBySpecialty[specialty] || medicalTermsBySpecialty.general;
  const term = faker.random.arrayElement(terms);
  
  // For non-English, just append the language code for demonstration
  const termInLanguage = language === 'en' ? term : `${term} (${language})`;
  
  return {
    id: uuidv4(),
    term,
    language,
    specialty,
    translation: termInLanguage,
    definition: faker.lorem.sentence(),
    createdAt: faker.date.past(1).toISOString(),
    updatedAt: faker.date.recent().toISOString()
  };
}

/**
 * Generate a batch of medical terms
 * 
 * @param {string} language - Language code
 * @param {string} specialty - Medical specialty
 * @param {number} count - Number of terms to generate
 * @returns {Array<Object>} - Array of medical term data
 */
function generateMedicalTerms(language = 'en', specialty = 'general', count = 10) {
  return Array.from({ length: count }, () => generateMedicalTerm(language, specialty));
}

/**
 * Generate a complete test dataset
 * 
 * @param {string} size - Dataset size (small, medium, large)
 * @returns {Object} - Complete test dataset
 */
function generateTestDataset(size = 'small') {
  const datasetSize = config.datasetSizes[size] || config.datasetSizes.small;
  
  // Generate users
  const providers = generateUsers('provider', Math.floor(datasetSize / 5));
  const patients = generateUsers('patient', datasetSize);
  const admins = generateUsers('admin', Math.floor(datasetSize / 10));
  
  // Generate sessions
  const sessions = generateSessions(providers, patients, datasetSize * 2);
  
  // Generate messages
  const messages = sessions.flatMap(generateSessionMessages);
  
  // Generate edge devices
  const edgeDevices = generateEdgeDevices(Math.floor(datasetSize / 2));
  
  // Generate medical terms for each supported language and specialty
  const medicalTerms = config.supportedLanguages.flatMap(language => 
    config.medicalSpecialties.flatMap(specialty => 
      generateMedicalTerms(language.code, specialty, Math.floor(datasetSize / 10))
    )
  );
  
  return {
    providers,
    patients,
    admins,
    sessions,
    messages,
    edgeDevices,
    medicalTerms
  };
}

/**
 * Save test dataset to files
 * 
 * @param {Object} dataset - Test dataset
 * @param {string} name - Dataset name
 * @returns {Object} - Paths to saved files
 */
function saveTestDataset(dataset, name = 'default') {
  const datasetDir = path.join(config.outputDir, name);
  
  // Create dataset directory if it doesn't exist
  if (!fs.existsSync(datasetDir)) {
    fs.mkdirSync(datasetDir, { recursive: true });
  }
  
  // Save each data type to a separate file
  const filePaths = {};
  
  for (const [dataType, data] of Object.entries(dataset)) {
    const filePath = path.join(datasetDir, `${dataType}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    filePaths[dataType] = filePath;
  }
  
  // Save metadata
  const metadata = {
    name,
    createdAt: new Date().toISOString(),
    counts: Object.entries(dataset).reduce((acc, [key, value]) => {
      acc[key] = Array.isArray(value) ? value.length : 0;
      return acc;
    }, {})
  };
  
  const metadataPath = path.join(datasetDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  filePaths.metadata = metadataPath;
  
  return filePaths;
}

module.exports = {
  generateUser,
  generateUsers,
  generateSession,
  generateSessions,
  generateMessage,
  generateSessionMessages,
  generateEdgeDevice,
  generateEdgeDevices,
  generateMedicalTerm,
  generateMedicalTerms,
  generateTestDataset,
  saveTestDataset,
  config
};
