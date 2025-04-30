/**
 * Integration Tests for MedTranslate AI
 * 
 * This module provides integration tests for the MedTranslate AI application,
 * testing the interaction between frontend components and backend APIs.
 */

import { API_ENDPOINTS, apiRequest } from '../config/api';

/**
 * Run all integration tests
 * 
 * @returns {Promise<Object>} - Test results
 */
export const runAllTests = async () => {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
  };
  
  // Authentication tests
  await runTest(results, 'Authentication - Login', testLogin);
  await runTest(results, 'Authentication - Token Refresh', testTokenRefresh);
  
  // Session tests
  await runTest(results, 'Sessions - Get All Sessions', testGetSessions);
  await runTest(results, 'Sessions - Create Session', testCreateSession);
  await runTest(results, 'Sessions - End Session', testEndSession);
  
  // Translation tests
  await runTest(results, 'Translation - Text Translation', testTextTranslation);
  await runTest(results, 'Translation - Audio Translation', testAudioTranslation);
  await runTest(results, 'Translation - Language Detection', testLanguageDetection);
  await runTest(results, 'Translation - Report Error', testReportTranslationError);
  
  // Patient tests
  await runTest(results, 'Patients - Get Patient History', testGetPatientHistory);
  await runTest(results, 'Patients - Add Patient Note', testAddPatientNote);
  
  // WebSocket tests
  await runTest(results, 'WebSocket - Connection', testWebSocketConnection);
  await runTest(results, 'WebSocket - Message Exchange', testWebSocketMessageExchange);
  
  // Edge connection tests
  await runTest(results, 'Edge - Connection', testEdgeConnection);
  await runTest(results, 'Edge - Translation', testEdgeTranslation);
  
  return results;
};

/**
 * Run a single test
 * 
 * @param {Object} results - Test results object
 * @param {string} testName - Test name
 * @param {Function} testFn - Test function
 * @returns {Promise<void>}
 */
const runTest = async (results, testName, testFn) => {
  results.total++;
  
  try {
    console.log(`Running test: ${testName}`);
    const startTime = Date.now();
    
    // Run test
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    if (result.skipped) {
      results.skipped++;
      console.log(`Test skipped: ${testName}`);
    } else if (result.success) {
      results.passed++;
      console.log(`Test passed: ${testName} (${duration}ms)`);
    } else {
      results.failed++;
      console.error(`Test failed: ${testName} - ${result.error}`);
    }
    
    // Add test result
    results.tests.push({
      name: testName,
      success: result.success,
      skipped: result.skipped,
      error: result.error,
      duration
    });
  } catch (error) {
    results.failed++;
    console.error(`Test error: ${testName} - ${error.message}`);
    
    // Add test result
    results.tests.push({
      name: testName,
      success: false,
      skipped: false,
      error: error.message,
      duration: 0
    });
  }
};

/**
 * Test login functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testLogin = async () => {
  try {
    // Test credentials
    const credentials = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    // Call login API
    const response = await apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    // Verify response
    if (!response.success || !response.token) {
      return {
        success: false,
        error: 'Login failed: Invalid response format'
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Login failed: ${error.message}`
    };
  }
};

/**
 * Test token refresh functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testTokenRefresh = async () => {
  try {
    // First login to get token
    const loginResult = await testLogin();
    
    if (!loginResult.success) {
      return {
        skipped: true,
        error: 'Token refresh test skipped: Login failed'
      };
    }
    
    // Call refresh token API
    const response = await apiRequest(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
      method: 'POST'
    });
    
    // Verify response
    if (!response.success || !response.token) {
      return {
        success: false,
        error: 'Token refresh failed: Invalid response format'
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Token refresh failed: ${error.message}`
    };
  }
};

/**
 * Test get sessions functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testGetSessions = async () => {
  try {
    // Call get sessions API
    const response = await apiRequest(API_ENDPOINTS.SESSIONS.GET_ALL, {
      method: 'GET'
    });
    
    // Verify response
    if (!response.success || !Array.isArray(response.sessions)) {
      return {
        success: false,
        error: 'Get sessions failed: Invalid response format'
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Get sessions failed: ${error.message}`
    };
  }
};

/**
 * Test create session functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testCreateSession = async () => {
  try {
    // Session data
    const sessionData = {
      patientName: 'Test Patient',
      patientLanguage: 'es',
      medicalContext: 'general'
    };
    
    // Call create session API
    const response = await apiRequest(API_ENDPOINTS.SESSIONS.CREATE, {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
    
    // Verify response
    if (!response.success || !response.session || !response.session.sessionId) {
      return {
        success: false,
        error: 'Create session failed: Invalid response format'
      };
    }
    
    // Store session ID for other tests
    global.testSessionId = response.session.sessionId;
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Create session failed: ${error.message}`
    };
  }
};

/**
 * Test end session functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testEndSession = async () => {
  try {
    // Check if we have a session ID
    if (!global.testSessionId) {
      return {
        skipped: true,
        error: 'End session test skipped: No session ID available'
      };
    }
    
    // Call end session API
    const response = await apiRequest(API_ENDPOINTS.SESSIONS.END(global.testSessionId), {
      method: 'POST'
    });
    
    // Verify response
    if (!response.success) {
      return {
        success: false,
        error: 'End session failed: Invalid response format'
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `End session failed: ${error.message}`
    };
  }
};

/**
 * Test text translation functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testTextTranslation = async () => {
  try {
    // Translation data
    const translationData = {
      text: 'Hello, how are you feeling today?',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      context: 'general',
      sessionId: global.testSessionId
    };
    
    // Call translate text API
    const response = await apiRequest(API_ENDPOINTS.TRANSLATE.TEXT, {
      method: 'POST',
      body: JSON.stringify(translationData)
    });
    
    // Verify response
    if (!response.success || !response.translatedText) {
      return {
        success: false,
        error: 'Text translation failed: Invalid response format'
      };
    }
    
    // Store translation ID for other tests
    global.testTranslationId = response.translationId;
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Text translation failed: ${error.message}`
    };
  }
};

/**
 * Test audio translation functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testAudioTranslation = async () => {
  try {
    // This test requires audio data, which is difficult to provide in this context
    // In a real test, you would use a test audio file
    
    return {
      skipped: true,
      error: 'Audio translation test skipped: No test audio available'
    };
  } catch (error) {
    return {
      success: false,
      error: `Audio translation failed: ${error.message}`
    };
  }
};

/**
 * Test language detection functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testLanguageDetection = async () => {
  try {
    // Language detection data
    const detectionData = {
      text: 'Hola, ¿cómo te sientes hoy?'
    };
    
    // Call detect language API
    const response = await apiRequest(API_ENDPOINTS.TRANSLATE.DETECT, {
      method: 'POST',
      body: JSON.stringify(detectionData)
    });
    
    // Verify response
    if (!response.success || !response.language || !response.language.code) {
      return {
        success: false,
        error: 'Language detection failed: Invalid response format'
      };
    }
    
    // Verify detected language
    if (response.language.code !== 'es') {
      return {
        success: false,
        error: `Language detection failed: Expected 'es', got '${response.language.code}'`
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Language detection failed: ${error.message}`
    };
  }
};

/**
 * Test report translation error functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testReportTranslationError = async () => {
  try {
    // Check if we have a translation ID
    if (!global.testTranslationId) {
      return {
        skipped: true,
        error: 'Report translation error test skipped: No translation ID available'
      };
    }
    
    // Error report data
    const errorData = {
      reason: 'incorrect_translation',
      details: 'The translation is not accurate'
    };
    
    // Call report error API
    const response = await apiRequest(API_ENDPOINTS.TRANSLATE.REPORT_ERROR(global.testTranslationId), {
      method: 'POST',
      body: JSON.stringify(errorData)
    });
    
    // Verify response
    if (!response.success) {
      return {
        success: false,
        error: 'Report translation error failed: Invalid response format'
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Report translation error failed: ${error.message}`
    };
  }
};

/**
 * Test get patient history functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testGetPatientHistory = async () => {
  try {
    // Call get patients API to get a patient ID
    const patientsResponse = await apiRequest(API_ENDPOINTS.PATIENTS.GET_ALL, {
      method: 'GET'
    });
    
    if (!patientsResponse.success || !Array.isArray(patientsResponse.patients) || patientsResponse.patients.length === 0) {
      return {
        skipped: true,
        error: 'Get patient history test skipped: No patients available'
      };
    }
    
    const patientId = patientsResponse.patients[0].patientId;
    
    // Call get patient history API
    const response = await apiRequest(API_ENDPOINTS.PATIENTS.GET_HISTORY(patientId), {
      method: 'GET'
    });
    
    // Verify response
    if (!response.success) {
      return {
        success: false,
        error: 'Get patient history failed: Invalid response format'
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Get patient history failed: ${error.message}`
    };
  }
};

/**
 * Test add patient note functionality
 * 
 * @returns {Promise<Object>} - Test result
 */
const testAddPatientNote = async () => {
  try {
    // Call get patients API to get a patient ID
    const patientsResponse = await apiRequest(API_ENDPOINTS.PATIENTS.GET_ALL, {
      method: 'GET'
    });
    
    if (!patientsResponse.success || !Array.isArray(patientsResponse.patients) || patientsResponse.patients.length === 0) {
      return {
        skipped: true,
        error: 'Add patient note test skipped: No patients available'
      };
    }
    
    const patientId = patientsResponse.patients[0].patientId;
    
    // Note data
    const noteData = {
      text: 'Test note for integration testing',
      provider: 'Test Provider'
    };
    
    // Call add patient note API
    const response = await apiRequest(API_ENDPOINTS.PATIENTS.ADD_NOTE(patientId), {
      method: 'POST',
      body: JSON.stringify(noteData)
    });
    
    // Verify response
    if (!response.success || !response.note) {
      return {
        success: false,
        error: 'Add patient note failed: Invalid response format'
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Add patient note failed: ${error.message}`
    };
  }
};

/**
 * Test WebSocket connection
 * 
 * @returns {Promise<Object>} - Test result
 */
const testWebSocketConnection = async () => {
  try {
    // This test requires WebSocket connection, which is difficult to test in this context
    // In a real test, you would use a WebSocket client
    
    return {
      skipped: true,
      error: 'WebSocket connection test skipped: Cannot test WebSocket in this context'
    };
  } catch (error) {
    return {
      success: false,
      error: `WebSocket connection failed: ${error.message}`
    };
  }
};

/**
 * Test WebSocket message exchange
 * 
 * @returns {Promise<Object>} - Test result
 */
const testWebSocketMessageExchange = async () => {
  try {
    // This test requires WebSocket connection, which is difficult to test in this context
    // In a real test, you would use a WebSocket client
    
    return {
      skipped: true,
      error: 'WebSocket message exchange test skipped: Cannot test WebSocket in this context'
    };
  } catch (error) {
    return {
      success: false,
      error: `WebSocket message exchange failed: ${error.message}`
    };
  }
};

/**
 * Test Edge connection
 * 
 * @returns {Promise<Object>} - Test result
 */
const testEdgeConnection = async () => {
  try {
    // This test requires Edge connection, which is difficult to test in this context
    // In a real test, you would use the Edge connection service
    
    return {
      skipped: true,
      error: 'Edge connection test skipped: Cannot test Edge connection in this context'
    };
  } catch (error) {
    return {
      success: false,
      error: `Edge connection failed: ${error.message}`
    };
  }
};

/**
 * Test Edge translation
 * 
 * @returns {Promise<Object>} - Test result
 */
const testEdgeTranslation = async () => {
  try {
    // This test requires Edge connection, which is difficult to test in this context
    // In a real test, you would use the Edge connection service
    
    return {
      skipped: true,
      error: 'Edge translation test skipped: Cannot test Edge translation in this context'
    };
  } catch (error) {
    return {
      success: false,
      error: `Edge translation failed: ${error.message}`
    };
  }
};
