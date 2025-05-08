/**
 * Edge-Frontend Translation Integration Test
 *
 * This test verifies that the frontend can perform translations
 * via the edge device.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3003',
  patientAppUrl: process.env.PATIENT_APP_URL || 'http://localhost:3002',
  providerAppUrl: process.env.PROVIDER_APP_URL || 'http://localhost:3000',
  adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3004',
  testTimeout: 60000 // 60 seconds
};

// Mock edge device data
const mockEdgeDevice = {
  id: `edge-${uuidv4().substring(0, 8)}`,
  name: 'Test Edge Device',
  status: 'connected',
  supportedLanguages: ['en', 'es', 'fr'],
  batteryLevel: 85,
  storageAvailable: 500,
  version: '1.0.0'
};

// Test text translation via edge device
async function testTextTranslation() {
  console.log('\n=== Testing Text Translation via Edge Device ===');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Open patient app
    const page = await browser.newPage();
    await page.goto(config.patientAppUrl, { waitUntil: 'networkidle2', timeout: config.testTimeout });
    
    console.log('Patient app loaded');
    
    // Mock the edge device connection status
    await page.evaluate(() => {
      localStorage.setItem('edgeDeviceConnected', 'true');
      localStorage.setItem('edgeDeviceId', 'edge-12345678');
    });
    
    // Mock the translation API response
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/translate') && request.method() === 'POST') {
        const postData = JSON.parse(request.postData());
        
        let translatedText = '';
        if (postData.sourceLanguage === 'en' && postData.targetLanguage === 'es') {
          if (postData.text === 'Hello') translatedText = 'Hola';
          else if (postData.text === 'How are you?') translatedText = '¿Cómo estás?';
          else if (postData.text === 'I have a headache') translatedText = 'Tengo dolor de cabeza';
          else translatedText = `[Translated to Spanish] ${postData.text}`;
        } else if (postData.sourceLanguage === 'es' && postData.targetLanguage === 'en') {
          if (postData.text === 'Hola') translatedText = 'Hello';
          else if (postData.text === '¿Cómo estás?') translatedText = 'How are you?';
          else if (postData.text === 'Tengo dolor de cabeza') translatedText = 'I have a headache';
          else translatedText = `[Translated to English] ${postData.text}`;
        } else {
          translatedText = `[Translated to ${postData.targetLanguage}] ${postData.text}`;
        }
        
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            originalText: postData.text,
            translatedText: translatedText,
            sourceLanguage: postData.sourceLanguage,
            targetLanguage: postData.targetLanguage,
            confidence: 0.95,
            source: 'edge',
            context: postData.context || 'general'
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Navigate to translation page
    await page.click('a[href="/translate"]');
    await page.waitForSelector('div[data-testid="translation-panel"]', { timeout: config.testTimeout });
    
    console.log('Navigated to translation page');
    
    // Select languages
    await page.select('select[data-testid="source-language"]', 'en');
    await page.select('select[data-testid="target-language"]', 'es');
    
    console.log('Selected languages: English to Spanish');
    
    // Enter text to translate
    await page.type('textarea[data-testid="source-text"]', 'Hello');
    
    // Click translate button
    await page.click('button[data-testid="translate-button"]');
    
    // Wait for translation result
    await page.waitForSelector('div[data-testid="translation-result"]', { timeout: config.testTimeout });
    
    // Verify translation result
    const translatedText = await page.$eval('div[data-testid="translation-result"]', el => el.textContent);
    const translationSource = await page.$eval('div[data-testid="translation-source"]', el => el.textContent);
    
    console.log(`Translated text: ${translatedText}`);
    console.log(`Translation source: ${translationSource}`);
    
    if (!translatedText.includes('Hola')) {
      throw new Error(`Translation mismatch: expected "Hola", got "${translatedText}"`);
    }
    
    if (!translationSource.includes('edge')) {
      throw new Error(`Translation source mismatch: expected "edge", got "${translationSource}"`);
    }
    
    console.log('✅ Text translation via edge device successful');
    
    // Test another translation
    await page.type('textarea[data-testid="source-text"]', 'How are you?');
    
    // Click translate button
    await page.click('button[data-testid="translate-button"]');
    
    // Wait for translation result
    await page.waitForFunction(
      () => document.querySelector('div[data-testid="translation-result"]').textContent.includes('¿Cómo estás?'),
      { timeout: config.testTimeout }
    );
    
    console.log('✅ Second text translation successful');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing text translation:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Test audio translation via edge device
async function testAudioTranslation() {
  console.log('\n=== Testing Audio Translation via Edge Device ===');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Open patient app
    const page = await browser.newPage();
    await page.goto(config.patientAppUrl, { waitUntil: 'networkidle2', timeout: config.testTimeout });
    
    console.log('Patient app loaded');
    
    // Mock the edge device connection status
    await page.evaluate(() => {
      localStorage.setItem('edgeDeviceConnected', 'true');
      localStorage.setItem('edgeDeviceId', 'edge-12345678');
    });
    
    // Mock the audio translation API response
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/translate/audio') && request.method() === 'POST') {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            originalText: 'I have a headache',
            translatedText: 'Tengo dolor de cabeza',
            sourceLanguage: 'en',
            targetLanguage: 'es',
            confidence: 0.92,
            source: 'edge',
            context: 'medical',
            audioUrl: 'data:audio/mp3;base64,MOCK_AUDIO_DATA'
          })
        });
      } else {
        await request.continue();
      }
    });
    
    // Navigate to translation page
    await page.click('a[href="/translate"]');
    await page.waitForSelector('div[data-testid="translation-panel"]', { timeout: config.testTimeout });
    
    console.log('Navigated to translation page');
    
    // Select languages
    await page.select('select[data-testid="source-language"]', 'en');
    await page.select('select[data-testid="target-language"]', 'es');
    
    console.log('Selected languages: English to Spanish');
    
    // Switch to audio mode
    await page.click('button[data-testid="audio-mode-button"]');
    
    console.log('Switched to audio mode');
    
    // Mock the audio recording
    await page.evaluate(() => {
      // Create a mock audio recorder
      window.mockAudioRecorder = {
        start: () => console.log('Recording started'),
        stop: () => {
          console.log('Recording stopped');
          // Dispatch a custom event with mock audio data
          const event = new CustomEvent('audioRecorded', {
            detail: {
              audioBlob: new Blob(['mock audio data'], { type: 'audio/wav' }),
              duration: 3.5
            }
          });
          window.dispatchEvent(event);
        }
      };
      
      // Replace the actual recorder with our mock
      window.audioRecorder = window.mockAudioRecorder;
    });
    
    // Start recording
    await page.click('button[data-testid="start-recording-button"]');
    
    console.log('Started audio recording');
    
    // Wait a moment for "recording"
    await page.waitForTimeout(1000);
    
    // Stop recording
    await page.click('button[data-testid="stop-recording-button"]');
    
    console.log('Stopped audio recording');
    
    // Wait for translation result
    await page.waitForSelector('div[data-testid="audio-translation-result"]', { timeout: config.testTimeout });
    
    // Verify translation result
    const originalText = await page.$eval('div[data-testid="original-text"]', el => el.textContent);
    const translatedText = await page.$eval('div[data-testid="audio-translation-result"]', el => el.textContent);
    const translationSource = await page.$eval('div[data-testid="translation-source"]', el => el.textContent);
    
    console.log(`Original text: ${originalText}`);
    console.log(`Translated text: ${translatedText}`);
    console.log(`Translation source: ${translationSource}`);
    
    if (!originalText.includes('I have a headache')) {
      throw new Error(`Original text mismatch: expected "I have a headache", got "${originalText}"`);
    }
    
    if (!translatedText.includes('Tengo dolor de cabeza')) {
      throw new Error(`Translation mismatch: expected "Tengo dolor de cabeza", got "${translatedText}"`);
    }
    
    if (!translationSource.includes('edge')) {
      throw new Error(`Translation source mismatch: expected "edge", got "${translationSource}"`);
    }
    
    console.log('✅ Audio translation via edge device successful');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing audio translation:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Test fallback to cloud when needed
async function testFallbackToCloud() {
  console.log('\n=== Testing Fallback to Cloud Translation ===');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Open patient app
    const page = await browser.newPage();
    await page.goto(config.patientAppUrl, { waitUntil: 'networkidle2', timeout: config.testTimeout });
    
    console.log('Patient app loaded');
    
    // Mock the edge device connection status
    await page.evaluate(() => {
      localStorage.setItem('edgeDeviceConnected', 'true');
      localStorage.setItem('edgeDeviceId', 'edge-12345678');
    });
    
    // Mock the translation API responses
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/translate') && request.method() === 'POST') {
        const postData = JSON.parse(request.postData());
        
        // If translating to French, simulate edge device not supporting it
        if (postData.targetLanguage === 'fr') {
          if (request.url().includes('/edge/')) {
            // Edge translation fails
            await request.respond({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({
                error: 'Unsupported language pair',
                message: 'The edge device does not support translation from en to fr'
              })
            });
          } else {
            // Cloud translation succeeds
            await request.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                originalText: postData.text,
                translatedText: postData.text === 'Hello' ? 'Bonjour' : `[Translated to French] ${postData.text}`,
                sourceLanguage: postData.sourceLanguage,
                targetLanguage: postData.targetLanguage,
                confidence: 0.90,
                source: 'cloud',
                context: postData.context || 'general'
              })
            });
          }
        } else {
          // Normal edge translation for other languages
          await request.continue();
        }
      } else {
        await request.continue();
      }
    });
    
    // Navigate to translation page
    await page.click('a[href="/translate"]');
    await page.waitForSelector('div[data-testid="translation-panel"]', { timeout: config.testTimeout });
    
    console.log('Navigated to translation page');
    
    // Select languages (English to French - not supported by edge)
    await page.select('select[data-testid="source-language"]', 'en');
    await page.select('select[data-testid="target-language"]', 'fr');
    
    console.log('Selected languages: English to French (not supported by edge)');
    
    // Enter text to translate
    await page.type('textarea[data-testid="source-text"]', 'Hello');
    
    // Click translate button
    await page.click('button[data-testid="translate-button"]');
    
    // Wait for translation result
    await page.waitForSelector('div[data-testid="translation-result"]', { timeout: config.testTimeout });
    
    // Verify translation result
    const translatedText = await page.$eval('div[data-testid="translation-result"]', el => el.textContent);
    const translationSource = await page.$eval('div[data-testid="translation-source"]', el => el.textContent);
    
    console.log(`Translated text: ${translatedText}`);
    console.log(`Translation source: ${translationSource}`);
    
    if (!translatedText.includes('Bonjour')) {
      throw new Error(`Translation mismatch: expected "Bonjour", got "${translatedText}"`);
    }
    
    if (!translationSource.includes('cloud')) {
      throw new Error(`Translation source mismatch: expected "cloud", got "${translationSource}"`);
    }
    
    console.log('✅ Fallback to cloud translation successful');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing fallback to cloud:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Edge-Frontend Translation Integration Test...');
  
  try {
    // Run tests in sequence
    const testResults = {
      textTranslation: await testTextTranslation(),
      audioTranslation: await testAudioTranslation(),
      fallbackToCloud: await testFallbackToCloud()
    };
    
    // Print summary
    console.log('\n=== Test Summary ===');
    for (const [test, result] of Object.entries(testResults)) {
      console.log(`${result ? '✅' : '❌'} ${test}`);
    }
    
    const allPassed = Object.values(testResults).every(result => result);
    console.log(`\nOverall result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return allPassed;
  } catch (error) {
    console.error('Error running tests:', error);
    return false;
  }
}

// Export for Jest
module.exports = {
  testTextTranslation,
  testAudioTranslation,
  testFallbackToCloud,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
