/**
 * E2E Test for Provider-Patient Translation Flow
 * 
 * This test verifies the end-to-end translation flow between a provider and a patient.
 */

const { config, launchBrowser, createPage } = require('../config/setup');
const { loginAsProvider, loginAsPatient } = require('../helpers/auth-helper');
const { 
  navigateToProviderTranslation,
  navigateToPatientTranslation
} = require('../helpers/navigation-helper');
const { 
  generateTranslationData,
  generateProviderData,
  generatePatientData,
  createTestUser,
  cleanupTestData
} = require('../utils/test-data');
const { 
  takeScreenshot,
  takeFailureScreenshot,
  takeSuccessScreenshot
} = require('../utils/screenshot-manager');

// Test configuration
const TEST_NAME = 'provider-patient-translation-flow';
const TEST_TIMEOUT = 120000; // 2 minutes

// Test data
let providerData;
let patientData;
let providerId;
let patientId;
let sessionId;

// Browser and page objects
let browser;
let providerPage;
let patientPage;

// Set test timeout
jest.setTimeout(TEST_TIMEOUT);

describe('Provider-Patient Translation Flow', () => {
  beforeAll(async () => {
    try {
      // Generate test data
      providerData = generateProviderData();
      patientData = generatePatientData();
      
      // Create test users
      const createdProvider = await createTestUser('provider', providerData);
      const createdPatient = await createTestUser('patient', patientData);
      
      providerId = createdProvider.id;
      patientId = createdPatient.id;
      
      // Launch browser
      browser = await launchBrowser();
      
      // Create pages
      providerPage = await createPage(browser);
      patientPage = await createPage(browser);
      
      // Login as provider and patient
      await loginAsProvider(providerPage);
      await loginAsPatient(patientPage);
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    try {
      // Clean up test data
      await cleanupTestData([providerId, patientId]);
      
      // Close browser
      if (browser) {
        await browser.close();
      }
    } catch (error) {
      console.error('Error in test cleanup:', error);
    }
  });
  
  test('Provider can start a translation session and patient can join', async () => {
    try {
      // Navigate to provider translation page
      await navigateToProviderTranslation(providerPage);
      await takeScreenshot(providerPage, TEST_NAME, 'provider-translation-page');
      
      // Start a new session
      await providerPage.click('.new-session-button');
      await providerPage.waitForSelector('.session-setup-form', { timeout: config.timeouts.element });
      
      // Fill in session details
      await providerPage.select('select[name="patientLanguage"]', patientData.preferredLanguage);
      await providerPage.select('select[name="medicalContext"]', 'general');
      await providerPage.click('.create-session-button');
      
      // Wait for session to be created
      await providerPage.waitForSelector('.session-active', { timeout: config.timeouts.navigation });
      await takeScreenshot(providerPage, TEST_NAME, 'provider-session-created');
      
      // Get session ID from URL
      const url = await providerPage.url();
      sessionId = url.split('/').pop();
      
      // Navigate to patient translation page
      await navigateToPatientTranslation(patientPage);
      await takeScreenshot(patientPage, TEST_NAME, 'patient-translation-page');
      
      // Join session
      await patientPage.type('input[name="sessionId"]', sessionId);
      await patientPage.click('.join-session-button');
      
      // Wait for session to be joined
      await patientPage.waitForSelector('.session-active', { timeout: config.timeouts.navigation });
      await takeScreenshot(patientPage, TEST_NAME, 'patient-joined-session');
      
      // Verify both sides show connected status
      await providerPage.waitForSelector('.patient-connected', { timeout: config.timeouts.element });
      await patientPage.waitForSelector('.provider-connected', { timeout: config.timeouts.element });
      
      // Take screenshots of connected state
      await takeScreenshot(providerPage, TEST_NAME, 'provider-patient-connected');
      await takeScreenshot(patientPage, TEST_NAME, 'patient-provider-connected');
      
      expect(await providerPage.$('.patient-connected')).not.toBeNull();
      expect(await patientPage.$('.provider-connected')).not.toBeNull();
    } catch (error) {
      await takeFailureScreenshot(providerPage, TEST_NAME, 'provider-failure');
      await takeFailureScreenshot(patientPage, TEST_NAME, 'patient-failure');
      throw error;
    }
  });
  
  test('Provider can send messages that are translated for the patient', async () => {
    try {
      // Generate translation data
      const translationData = generateTranslationData('en', patientData.preferredLanguage);
      
      // Provider sends a message
      await providerPage.type('.message-input', translationData.sourceText);
      await providerPage.click('.send-message-button');
      
      // Wait for message to appear in provider's chat
      await providerPage.waitForSelector('.message-sent', { timeout: config.timeouts.element });
      await takeScreenshot(providerPage, TEST_NAME, 'provider-message-sent');
      
      // Wait for translated message to appear in patient's chat
      await patientPage.waitForSelector('.message-received', { timeout: config.timeouts.element });
      await takeScreenshot(patientPage, TEST_NAME, 'patient-message-received');
      
      // Verify message was sent and received
      const providerMessages = await providerPage.$$eval('.message-sent', elements => 
        elements.map(el => el.textContent.trim())
      );
      
      const patientMessages = await patientPage.$$eval('.message-received', elements => 
        elements.map(el => el.textContent.trim())
      );
      
      expect(providerMessages.length).toBeGreaterThan(0);
      expect(patientMessages.length).toBeGreaterThan(0);
      expect(providerMessages[providerMessages.length - 1]).toContain(translationData.sourceText);
      
      // Take success screenshots
      await takeSuccessScreenshot(providerPage, TEST_NAME, 'provider-translation-success');
      await takeSuccessScreenshot(patientPage, TEST_NAME, 'patient-translation-success');
    } catch (error) {
      await takeFailureScreenshot(providerPage, TEST_NAME, 'provider-translation-failure');
      await takeFailureScreenshot(patientPage, TEST_NAME, 'patient-translation-failure');
      throw error;
    }
  });
  
  test('Patient can send messages that are translated for the provider', async () => {
    try {
      // Generate translation data (reversed languages)
      const translationData = generateTranslationData(patientData.preferredLanguage, 'en');
      
      // Patient sends a message
      await patientPage.type('.message-input', translationData.sourceText);
      await patientPage.click('.send-message-button');
      
      // Wait for message to appear in patient's chat
      await patientPage.waitForSelector('.message-sent', { timeout: config.timeouts.element });
      await takeScreenshot(patientPage, TEST_NAME, 'patient-message-sent');
      
      // Wait for translated message to appear in provider's chat
      await providerPage.waitForSelector('.message-received', { timeout: config.timeouts.element });
      await takeScreenshot(providerPage, TEST_NAME, 'provider-message-received');
      
      // Verify message was sent and received
      const patientMessages = await patientPage.$$eval('.message-sent', elements => 
        elements.map(el => el.textContent.trim())
      );
      
      const providerMessages = await providerPage.$$eval('.message-received', elements => 
        elements.map(el => el.textContent.trim())
      );
      
      expect(patientMessages.length).toBeGreaterThan(0);
      expect(providerMessages.length).toBeGreaterThan(0);
      expect(patientMessages[patientMessages.length - 1]).toContain(translationData.sourceText);
      
      // Take success screenshots
      await takeSuccessScreenshot(patientPage, TEST_NAME, 'patient-reverse-translation-success');
      await takeSuccessScreenshot(providerPage, TEST_NAME, 'provider-reverse-translation-success');
    } catch (error) {
      await takeFailureScreenshot(patientPage, TEST_NAME, 'patient-reverse-translation-failure');
      await takeFailureScreenshot(providerPage, TEST_NAME, 'provider-reverse-translation-failure');
      throw error;
    }
  });
  
  test('Provider can end the translation session', async () => {
    try {
      // Provider ends the session
      await providerPage.click('.end-session-button');
      
      // Confirm end session
      await providerPage.waitForSelector('.confirm-end-session-dialog', { timeout: config.timeouts.element });
      await providerPage.click('.confirm-end-session-button');
      
      // Wait for session to end on provider side
      await providerPage.waitForSelector('.session-ended', { timeout: config.timeouts.navigation });
      await takeScreenshot(providerPage, TEST_NAME, 'provider-session-ended');
      
      // Wait for session to end on patient side
      await patientPage.waitForSelector('.session-ended', { timeout: config.timeouts.navigation });
      await takeScreenshot(patientPage, TEST_NAME, 'patient-session-ended');
      
      // Verify session ended
      expect(await providerPage.$('.session-ended')).not.toBeNull();
      expect(await patientPage.$('.session-ended')).not.toBeNull();
      
      // Take success screenshots
      await takeSuccessScreenshot(providerPage, TEST_NAME, 'provider-end-session-success');
      await takeSuccessScreenshot(patientPage, TEST_NAME, 'patient-end-session-success');
    } catch (error) {
      await takeFailureScreenshot(providerPage, TEST_NAME, 'provider-end-session-failure');
      await takeFailureScreenshot(patientPage, TEST_NAME, 'patient-end-session-failure');
      throw error;
    }
  });
});
