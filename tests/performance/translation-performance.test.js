/**
 * Performance Test for MedTranslate AI Translation Service
 * 
 * This test measures the performance of the translation service under load.
 */

const fetch = require('node-fetch');
const { performance } = require('perf_hooks');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_TIMEOUT = 60000; // 60 seconds
const CONCURRENT_REQUESTS = 10;
const REQUESTS_PER_LANGUAGE_PAIR = 5;

// Test data
const testLanguagePairs = [
  { source: 'en', target: 'es' },
  { source: 'es', target: 'en' },
  { source: 'en', target: 'fr' },
  { source: 'fr', target: 'en' }
];

const testTexts = {
  'en': [
    'Hello, how are you feeling today?',
    'Do you have any allergies?',
    'I need to check your blood pressure.',
    'Please describe your symptoms.',
    'Take this medication twice a day with food.'
  ],
  'es': [
    '¿Hola, cómo te sientes hoy?',
    '¿Tienes alguna alergia?',
    'Necesito revisar tu presión arterial.',
    'Por favor, describe tus síntomas.',
    'Toma este medicamento dos veces al día con comida.'
  ],
  'fr': [
    'Bonjour, comment vous sentez-vous aujourd\'hui?',
    'Avez-vous des allergies?',
    'Je dois vérifier votre tension artérielle.',
    'Veuillez décrire vos symptômes.',
    'Prenez ce médicament deux fois par jour avec de la nourriture.'
  ]
};

// Test suite
describe('Translation Service Performance Test', () => {
  // Set timeout for all tests
  jest.setTimeout(TEST_TIMEOUT);

  // Helper function to make a translation request
  const makeTranslationRequest = async (text, sourceLanguage, targetLanguage) => {
    const startTime = performance.now();
    
    const response = await fetch(`${API_URL}/translate/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sourceLanguage,
        targetLanguage,
        context: 'general'
      })
    });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    if (!response.ok) {
      throw new Error(`Translation request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      responseTime,
      translatedText: data.translatedText,
      confidence: data.confidence
    };
  };

  // Test single request performance
  test('Single translation request performance', async () => {
    const { source, target } = testLanguagePairs[0];
    const text = testTexts[source][0];
    
    const result = await makeTranslationRequest(text, source, target);
    
    console.log(`Single request response time: ${result.responseTime.toFixed(2)}ms`);
    console.log(`Translated text: ${result.translatedText}`);
    console.log(`Confidence: ${result.confidence}`);
    
    expect(result.responseTime).toBeDefined();
    expect(result.translatedText).toBeDefined();
    expect(result.confidence).toBeDefined();
  });

  // Test sequential requests performance
  test('Sequential translation requests performance', async () => {
    const results = [];
    
    for (const pair of testLanguagePairs) {
      for (let i = 0; i < REQUESTS_PER_LANGUAGE_PAIR; i++) {
        const text = testTexts[pair.source][i % testTexts[pair.source].length];
        const result = await makeTranslationRequest(text, pair.source, pair.target);
        results.push({
          sourceLanguage: pair.source,
          targetLanguage: pair.target,
          responseTime: result.responseTime
        });
      }
    }
    
    // Calculate statistics
    const totalRequests = results.length;
    const totalTime = results.reduce((sum, r) => sum + r.responseTime, 0);
    const avgTime = totalTime / totalRequests;
    const minTime = Math.min(...results.map(r => r.responseTime));
    const maxTime = Math.max(...results.map(r => r.responseTime));
    
    console.log(`Sequential requests - Total: ${totalRequests}, Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
    
    // Group by language pair
    const pairStats = {};
    for (const result of results) {
      const key = `${result.sourceLanguage}-${result.targetLanguage}`;
      if (!pairStats[key]) {
        pairStats[key] = [];
      }
      pairStats[key].push(result.responseTime);
    }
    
    for (const [pair, times] of Object.entries(pairStats)) {
      const pairAvg = times.reduce((sum, t) => sum + t, 0) / times.length;
      console.log(`Language pair ${pair} - Avg: ${pairAvg.toFixed(2)}ms`);
    }
    
    expect(avgTime).toBeDefined();
  });

  // Test concurrent requests performance
  test('Concurrent translation requests performance', async () => {
    const requests = [];
    
    // Create concurrent requests
    for (const pair of testLanguagePairs) {
      for (let i = 0; i < REQUESTS_PER_LANGUAGE_PAIR; i++) {
        const text = testTexts[pair.source][i % testTexts[pair.source].length];
        requests.push(makeTranslationRequest(text, pair.source, pair.target));
      }
    }
    
    // Execute all requests concurrently
    const startTime = performance.now();
    const results = await Promise.all(requests);
    const endTime = performance.now();
    
    // Calculate statistics
    const totalRequests = results.length;
    const totalTime = endTime - startTime;
    const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests;
    const minTime = Math.min(...results.map(r => r.responseTime));
    const maxTime = Math.max(...results.map(r => r.responseTime));
    const throughput = (totalRequests / totalTime) * 1000; // requests per second
    
    console.log(`Concurrent requests - Total: ${totalRequests}, Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
    console.log(`Throughput: ${throughput.toFixed(2)} requests/second`);
    
    expect(throughput).toBeGreaterThan(0);
  });

  // Test latency under load
  test('Translation latency under load', async () => {
    // Create a batch of concurrent requests
    const createBatch = (batchSize) => {
      const batch = [];
      for (let i = 0; i < batchSize; i++) {
        const pairIndex = i % testLanguagePairs.length;
        const pair = testLanguagePairs[pairIndex];
        const textIndex = i % testTexts[pair.source].length;
        const text = testTexts[pair.source][textIndex];
        batch.push(makeTranslationRequest(text, pair.source, pair.target));
      }
      return batch;
    };
    
    // Execute batches with increasing concurrency
    const concurrencyLevels = [1, 5, 10, 20];
    const results = {};
    
    for (const concurrency of concurrencyLevels) {
      const batch = createBatch(concurrency);
      
      const startTime = performance.now();
      const batchResults = await Promise.all(batch);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTime = batchResults.reduce((sum, r) => sum + r.responseTime, 0) / concurrency;
      
      results[concurrency] = {
        totalTime,
        avgTime,
        throughput: (concurrency / totalTime) * 1000
      };
      
      console.log(`Concurrency ${concurrency} - Total: ${totalTime.toFixed(2)}ms, Avg: ${avgTime.toFixed(2)}ms, Throughput: ${results[concurrency].throughput.toFixed(2)} req/s`);
    }
    
    // Check if performance degrades significantly under load
    const baselineAvg = results[1].avgTime;
    const highLoadAvg = results[concurrencyLevels[concurrencyLevels.length - 1]].avgTime;
    const degradationFactor = highLoadAvg / baselineAvg;
    
    console.log(`Performance degradation factor: ${degradationFactor.toFixed(2)}x`);
    
    // This is a flexible assertion - adjust based on your performance requirements
    expect(degradationFactor).toBeLessThan(10); // Allow up to 10x degradation under high load
  });
});
