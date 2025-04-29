/**
 * Test Data Manager for MedTranslate AI
 * 
 * This utility manages test data for the MedTranslate AI tests.
 * It provides functions for creating, retrieving, and cleaning up test data.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_DATA_DIR = path.join(__dirname, '../test-data');

// Ensure test data directory exists
if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

// Test data
const testProviders = [
  {
    email: 'test-provider@example.com',
    password: 'testpassword123',
    name: 'Test Provider',
    role: 'doctor'
  },
  {
    email: 'test-nurse@example.com',
    password: 'testpassword123',
    name: 'Test Nurse',
    role: 'nurse'
  }
];

const testPatients = [
  {
    language: 'es',
    name: 'Test Patient (Spanish)'
  },
  {
    language: 'fr',
    name: 'Test Patient (French)'
  }
];

// Helper function for API requests
async function apiRequest(url, options = {}) {
  try {
    const response = await axios({
      url,
      ...options
    });
    
    return {
      status: response.status,
      data: response.data
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data
      };
    }
    throw error;
  }
}

/**
 * Create a test provider account
 * 
 * @param {Object} provider - Provider data
 * @returns {Promise<Object>} - Provider data with token
 */
async function createTestProvider(provider = testProviders[0]) {
  // Check if provider already exists
  const loginResponse = await apiRequest(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      email: provider.email,
      password: provider.password
    }
  });
  
  if (loginResponse.status === 200) {
    console.log(`Provider ${provider.email} already exists, using existing account`);
    return {
      ...provider,
      token: loginResponse.data.token
    };
  }
  
  // Create new provider
  const registerResponse = await apiRequest(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: provider
  });
  
  if (registerResponse.status !== 200) {
    throw new Error(`Failed to create test provider: ${JSON.stringify(registerResponse.data)}`);
  }
  
  console.log(`Created test provider: ${provider.email}`);
  
  // Login to get token
  const newLoginResponse = await apiRequest(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      email: provider.email,
      password: provider.password
    }
  });
  
  if (newLoginResponse.status !== 200) {
    throw new Error(`Failed to login as test provider: ${JSON.stringify(newLoginResponse.data)}`);
  }
  
  return {
    ...provider,
    token: newLoginResponse.data.token
  };
}

/**
 * Create a test session
 * 
 * @param {string} providerToken - Provider token
 * @param {string} medicalContext - Medical context
 * @param {string} patientLanguage - Patient language
 * @returns {Promise<Object>} - Session data
 */
async function createTestSession(providerToken, medicalContext = 'general', patientLanguage = 'es') {
  const response = await apiRequest(`${API_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerToken}`
    },
    data: {
      medicalContext,
      patientLanguage
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Failed to create test session: ${JSON.stringify(response.data)}`);
  }
  
  console.log(`Created test session: ${response.data.sessionId}`);
  
  return response.data;
}

/**
 * Generate a patient token for a session
 * 
 * @param {string} sessionId - Session ID
 * @param {string} providerToken - Provider token
 * @param {string} language - Patient language
 * @returns {Promise<Object>} - Patient token data
 */
async function generatePatientToken(sessionId, providerToken, language = 'es') {
  const response = await apiRequest(`${API_URL}/sessions/patient-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerToken}`
    },
    data: {
      sessionId,
      language
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Failed to generate patient token: ${JSON.stringify(response.data)}`);
  }
  
  console.log(`Generated patient token for session: ${sessionId}`);
  
  return response.data;
}

/**
 * Create test audio file
 * 
 * @param {string} filename - Filename
 * @param {number} durationSeconds - Duration in seconds
 * @returns {Promise<string>} - Path to audio file
 */
async function createTestAudioFile(filename = 'test-audio.mp3', durationSeconds = 3) {
  const filePath = path.join(TEST_DATA_DIR, filename);
  
  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`Test audio file already exists: ${filePath}`);
    return filePath;
  }
  
  // Create a simple audio file (this is just a placeholder)
  // In a real implementation, you would generate actual audio data
  const buffer = Buffer.alloc(44100 * 2 * durationSeconds); // 44.1kHz, 16-bit, mono
  fs.writeFileSync(filePath, buffer);
  
  console.log(`Created test audio file: ${filePath}`);
  
  return filePath;
}

/**
 * Create test medical text file
 * 
 * @param {string} filename - Filename
 * @returns {Promise<string>} - Path to text file
 */
async function createTestMedicalTextFile(filename = 'long-medical-text.txt') {
  const filePath = path.join(TEST_DATA_DIR, filename);
  
  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`Test medical text file already exists: ${filePath}`);
    return filePath;
  }
  
  // Create a sample medical text file
  const text = `
Medical History:
The patient is a 67-year-old female with a past medical history significant for hypertension, type 2 diabetes mellitus, hyperlipidemia, and coronary artery disease status post myocardial infarction in 2018 with subsequent placement of two drug-eluting stents in the left anterior descending artery. She also has a history of paroxysmal atrial fibrillation diagnosed in 2019, for which she is on anticoagulation therapy. Additional medical history includes osteoarthritis of the bilateral knees, gastroesophageal reflux disease, and a remote history of cholecystectomy in 2005.

Current Medications:
1. Metoprolol succinate 50 mg daily
2. Lisinopril 20 mg daily
3. Atorvastatin 40 mg daily
4. Aspirin 81 mg daily
5. Apixaban 5 mg twice daily
6. Metformin 1000 mg twice daily
7. Glipizide 10 mg daily
8. Pantoprazole 40 mg daily
9. Acetaminophen 500 mg as needed for pain
10. Calcium carbonate 600 mg with vitamin D 400 IU daily

Allergies:
1. Penicillin - hives
2. Sulfa drugs - rash
3. Iodinated contrast - bronchospasm

Social History:
The patient is a retired elementary school teacher. She lives with her husband of 45 years in a single-story home. She has two adult children who live nearby. She quit smoking 20 years ago after a 30 pack-year history. She denies alcohol use. She reports walking for 20 minutes three times per week for exercise.

Family History:
Father died at age 72 from myocardial infarction. Mother died at age 80 from complications of stroke. One sister with breast cancer diagnosed at age 60. One brother with type 2 diabetes.

Review of Systems:
General: Reports fatigue and decreased energy levels over the past month.
Cardiovascular: Denies chest pain, palpitations, or syncope. Reports occasional dyspnea on exertion when climbing stairs.
Respiratory: Denies cough, wheezing, or hemoptysis.
Gastrointestinal: Reports occasional heartburn despite taking pantoprazole. Denies nausea, vomiting, abdominal pain, or changes in bowel habits.
Genitourinary: Denies dysuria, hematuria, or urinary frequency.
Musculoskeletal: Reports chronic bilateral knee pain, worse with prolonged standing or walking.
Neurological: Denies headaches, dizziness, or focal weakness.
Psychiatric: Denies depression or anxiety.

Physical Examination:
Vital Signs: Temperature 98.6°F, Heart Rate 72 bpm, Respiratory Rate 16, Blood Pressure 142/86 mmHg, Oxygen Saturation 97% on room air.
General: Alert and oriented, appears stated age, no acute distress.
HEENT: Normocephalic, atraumatic. Pupils equal, round, and reactive to light. Extraocular movements intact. Oropharynx clear.
Neck: Supple, no lymphadenopathy or thyromegaly.
Cardiovascular: Regular rate and rhythm, normal S1 and S2, no murmurs, rubs, or gallops. No jugular venous distention.
Respiratory: Clear to auscultation bilaterally, no wheezes, rales, or rhonchi.
Abdominal: Soft, non-tender, non-distended. Bowel sounds present. No hepatosplenomegaly.
Extremities: No cyanosis, clubbing, or edema. Bilateral knee crepitus with mild tenderness to palpation.
Neurological: Cranial nerves II-XII intact. Motor strength 5/5 in all extremities. Sensation intact to light touch. Deep tendon reflexes 2+ and symmetric.

Laboratory Results:
Complete Blood Count:
- WBC: 7.2 x 10^3/μL (normal range: 4.5-11.0)
- Hemoglobin: 12.8 g/dL (normal range: 12.0-16.0)
- Hematocrit: 38.4% (normal range: 36.0-46.0)
- Platelets: 245 x 10^3/μL (normal range: 150-450)

Comprehensive Metabolic Panel:
- Sodium: 138 mEq/L (normal range: 135-145)
- Potassium: 4.2 mEq/L (normal range: 3.5-5.0)
- Chloride: 102 mEq/L (normal range: 98-107)
- CO2: 24 mEq/L (normal range: 22-29)
- BUN: 18 mg/dL (normal range: 7-20)
- Creatinine: 1.1 mg/dL (normal range: 0.6-1.2)
- Glucose: 142 mg/dL (normal range: 70-99)
- AST: 22 U/L (normal range: 10-40)
- ALT: 24 U/L (normal range: 7-56)
- Alkaline Phosphatase: 82 U/L (normal range: 40-129)
- Total Bilirubin: 0.8 mg/dL (normal range: 0.1-1.2)
- Albumin: 4.0 g/dL (normal range: 3.4-5.0)
- Total Protein: 7.2 g/dL (normal range: 6.0-8.3)

Lipid Panel:
- Total Cholesterol: 168 mg/dL (normal range: <200)
- Triglycerides: 142 mg/dL (normal range: <150)
- HDL: 48 mg/dL (normal range: >40)
- LDL: 92 mg/dL (normal range: <100)

Hemoglobin A1c: 7.2% (goal <7.0%)

Electrocardiogram:
Normal sinus rhythm, rate 72 bpm. Normal axis. No ST-T wave changes. No evidence of atrial fibrillation.

Assessment and Plan:
1. Hypertension: Suboptimally controlled with current regimen. Will increase lisinopril to 40 mg daily. Continue metoprolol succinate 50 mg daily. Encourage low-sodium diet and regular exercise.

2. Type 2 Diabetes Mellitus: Suboptimally controlled with current regimen. Hemoglobin A1c 7.2%, above goal of <7.0%. Will add empagliflozin 10 mg daily. Continue metformin 1000 mg twice daily and glipizide 10 mg daily. Reinforce importance of diet and exercise.

3. Hyperlipidemia: Well-controlled on atorvastatin 40 mg daily. Continue current regimen.

4. Coronary Artery Disease: Stable. Continue aspirin 81 mg daily and atorvastatin 40 mg daily. Encourage regular exercise within tolerance.

5. Atrial Fibrillation: No evidence of recurrence on today's ECG. Continue apixaban 5 mg twice daily. Will order 30-day event monitor to evaluate for paroxysmal episodes given reports of fatigue.

6. Osteoarthritis: Chronic bilateral knee pain. Recommend physical therapy for strengthening exercises. Continue acetaminophen as needed for pain. Consider referral to orthopedics if symptoms worsen.

7. Gastroesophageal Reflux Disease: Breakthrough symptoms despite pantoprazole. Will increase to 40 mg twice daily. Recommend dietary modifications and elevation of head of bed.

Follow-up:
1. Return to clinic in 4 weeks to reassess blood pressure and review results of event monitor.
2. Repeat comprehensive metabolic panel and hemoglobin A1c in 3 months.
3. Schedule annual echocardiogram to assess cardiac function.
`;
  
  fs.writeFileSync(filePath, text);
  
  console.log(`Created test medical text file: ${filePath}`);
  
  return filePath;
}

/**
 * Clean up test data
 * 
 * @param {Object} options - Cleanup options
 * @returns {Promise<void>}
 */
async function cleanupTestData(options = { sessions: true, files: false }) {
  // Clean up test sessions
  if (options.sessions) {
    try {
      // Login as test provider
      const provider = await createTestProvider();
      
      // Get active sessions
      const response = await apiRequest(`${API_URL}/sessions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.token}`
        }
      });
      
      if (response.status === 200 && response.data.sessions) {
        // End each session
        for (const session of response.data.sessions) {
          if (session.status === 'active') {
            await apiRequest(`${API_URL}/sessions/${session.sessionId}/end`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${provider.token}`
              }
            });
            
            console.log(`Ended test session: ${session.sessionId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up test sessions:', error.message);
    }
  }
  
  // Clean up test files
  if (options.files) {
    try {
      const files = fs.readdirSync(TEST_DATA_DIR);
      
      for (const file of files) {
        if (file.startsWith('test-')) {
          fs.unlinkSync(path.join(TEST_DATA_DIR, file));
          console.log(`Deleted test file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up test files:', error.message);
    }
  }
}

// Export functions
module.exports = {
  createTestProvider,
  createTestSession,
  generatePatientToken,
  createTestAudioFile,
  createTestMedicalTextFile,
  cleanupTestData,
  testProviders,
  testPatients
};
