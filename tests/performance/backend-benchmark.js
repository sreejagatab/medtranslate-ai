/**
 * Backend Component Benchmarking Tool for MedTranslate AI
 * 
 * This script benchmarks the performance of the backend component
 * under different conditions and configurations.
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { runBenchmark, compareBenchmarks } = require('./benchmark-framework');
const { generateScenarios } = require('../integration/test-scenario-generator');

// Configuration
const CONFIG = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  wsEndpoint: process.env.WS_URL || 'ws://localhost:3001/ws',
  iterations: parseInt(process.env.BENCHMARK_ITERATIONS || '50'),
  warmupIterations: parseInt(process.env.BENCHMARK_WARMUP_ITERATIONS || '5'),
  concurrencyLevels: [1, 5, 10, 20],
  testMode: process.argv[2] || 'all', // all, translation, websocket, auth, storage
  providerCredentials: {
    email: 'test.provider@example.com',
    password: 'testpassword123'
  }
};

// Test scenarios
const TEST_SCENARIOS = generateScenarios(10);

// Test state
const state = {
  providerToken: null,
  patientToken: null,
  sessionId: null,
  sessionCode: null
};

/**
 * Initialize test state
 * 
 * @returns {Promise<void>}
 */
async function initializeTestState() {
  // Login as provider
  try {
    const response = await axios.post(`${CONFIG.backendUrl}/auth/login`, CONFIG.providerCredentials);
    
    if (response.status === 200 && response.data.token) {
      state.providerToken = response.data.token;
      console.log('Provider login successful');
    } else {
      console.error('Provider login failed:', response.data);
      throw new Error('Provider login failed');
    }
  } catch (error) {
    console.error('Error logging in as provider:', error.message);
    throw error;
  }
  
  // Create session
  try {
    const response = await axios.post(
      `${CONFIG.backendUrl}/sessions`,
      {
        medicalContext: 'General Consultation',
        patientLanguage: 'es'
      },
      {
        headers: {
          'Authorization': `Bearer ${state.providerToken}`
        }
      }
    );
    
    if (response.status === 200 && response.data.sessionId) {
      state.sessionId = response.data.sessionId;
      state.sessionCode = response.data.sessionCode;
      console.log('Session creation successful');
    } else {
      console.error('Session creation failed:', response.data);
      throw new Error('Session creation failed');
    }
  } catch (error) {
    console.error('Error creating session:', error.message);
    throw error;
  }
  
  // Generate patient token
  try {
    const response = await axios.post(
      `${CONFIG.backendUrl}/sessions/join`,
      {
        sessionCode: state.sessionCode
      }
    );
    
    if (response.status === 200 && response.data.token) {
      state.patientToken = response.data.token;
      console.log('Patient token generation successful');
    } else {
      console.error('Patient token generation failed:', response.data);
      throw new Error('Patient token generation failed');
    }
  } catch (error) {
    console.error('Error generating patient token:', error.message);
    throw error;
  }
}

/**
 * Benchmark text translation performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkTextTranslation(options = {}) {
  const concurrency = options.concurrency || 1;
  const scenario = options.scenario || TEST_SCENARIOS[0];
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.post(
        `${CONFIG.backendUrl}/translate`,
        {
          text: scenario.text,
          sourceLanguage: scenario.sourceLanguage,
          targetLanguage: scenario.targetLanguage,
          context: scenario.context
        },
        {
          headers: {
            'Authorization': `Bearer ${state.providerToken}`
          },
          timeout: 10000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Translation error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Backend Text Translation (${scenario.sourceLanguage}->${scenario.targetLanguage}, ${scenario.context}, concurrency=${concurrency})`,
    testFn,
    {
      iterations: CONFIG.iterations,
      warmupIterations: CONFIG.warmupIterations,
      concurrency
    }
  );
}

/**
 * Benchmark audio translation performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkAudioTranslation(options = {}) {
  const concurrency = options.concurrency || 1;
  const audioSize = options.audioSize || 'small'; // small, medium, large
  
  // Create test audio file if it doesn't exist
  const testAudioPath = path.join(__dirname, `../test-audio-${audioSize}.mp3`);
  if (!fs.existsSync(testAudioPath)) {
    console.log(`Creating test audio file: ${testAudioPath}`);
    // This is just a placeholder - in a real test, you would use actual audio files of different sizes
    const audioData = Buffer.alloc(
      audioSize === 'small' ? 10 * 1024 : // 10KB
      audioSize === 'medium' ? 100 * 1024 : // 100KB
      1024 * 1024 // 1MB
    );
    fs.writeFileSync(testAudioPath, audioData);
  }
  
  // Create form data
  const formData = new FormData();
  formData.append('audio', fs.createReadStream(testAudioPath));
  formData.append('sourceLanguage', 'en');
  formData.append('targetLanguage', 'es');
  formData.append('context', 'general');
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.post(
        `${CONFIG.backendUrl}/translate/audio`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${state.providerToken}`
          },
          timeout: 30000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Audio translation error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Backend Audio Translation (${audioSize}, concurrency=${concurrency})`,
    testFn,
    {
      iterations: Math.max(5, Math.floor(CONFIG.iterations / 5)), // Fewer iterations for audio
      warmupIterations: Math.max(2, Math.floor(CONFIG.warmupIterations / 2)),
      concurrency
    }
  );
}

/**
 * Benchmark WebSocket performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkWebSocketPerformance(options = {}) {
  const messageCount = options.messageCount || 10;
  const scenario = options.scenario || TEST_SCENARIOS[0];
  
  // Create test function
  const testFn = async () => {
    return new Promise((resolve, reject) => {
      // Connect provider WebSocket
      const providerWs = new WebSocket(`${CONFIG.wsEndpoint}?token=${state.providerToken}`);
      
      // Track messages
      const messages = [];
      let messagesSent = 0;
      let messagesReceived = 0;
      
      // Set up event handlers
      providerWs.on('open', () => {
        // Join session
        providerWs.send(JSON.stringify({
          type: 'join',
          sessionId: state.sessionId,
          role: 'provider'
        }));
        
        // Start sending messages
        sendNextMessage();
      });
      
      providerWs.on('message', (data) => {
        const message = JSON.parse(data);
        messages.push(message);
        messagesReceived++;
        
        // Check if we've received all messages
        if (messagesReceived >= messageCount) {
          providerWs.close();
          resolve(messages);
        }
      });
      
      providerWs.on('error', (error) => {
        reject(new Error(`WebSocket error: ${error.message}`));
      });
      
      providerWs.on('close', () => {
        if (messagesReceived < messageCount) {
          reject(new Error('WebSocket closed before receiving all messages'));
        }
      });
      
      // Function to send messages
      function sendNextMessage() {
        if (messagesSent < messageCount) {
          providerWs.send(JSON.stringify({
            type: 'message',
            sessionId: state.sessionId,
            payload: {
              text: `${scenario.text} (${messagesSent + 1})`,
              sourceLanguage: scenario.sourceLanguage,
              targetLanguage: scenario.targetLanguage
            }
          }));
          
          messagesSent++;
          
          // Schedule next message
          setTimeout(sendNextMessage, 100);
        }
      }
      
      // Set timeout
      setTimeout(() => {
        providerWs.close();
        reject(new Error('WebSocket test timed out'));
      }, 30000);
    });
  };
  
  // Run benchmark
  return runBenchmark(
    `Backend WebSocket Performance (${messageCount} messages)`,
    testFn,
    {
      iterations: Math.max(5, Math.floor(CONFIG.iterations / 10)), // Fewer iterations for WebSocket
      warmupIterations: Math.max(1, Math.floor(CONFIG.warmupIterations / 2)),
      concurrency: 1 // WebSocket tests can't be concurrent
    }
  );
}

/**
 * Benchmark authentication performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkAuthPerformance(options = {}) {
  const concurrency = options.concurrency || 1;
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.post(
        `${CONFIG.backendUrl}/auth/login`,
        CONFIG.providerCredentials,
        {
          timeout: 5000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Authentication error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Backend Authentication Performance (concurrency=${concurrency})`,
    testFn,
    {
      iterations: CONFIG.iterations,
      warmupIterations: CONFIG.warmupIterations,
      concurrency
    }
  );
}

/**
 * Benchmark storage performance
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkStoragePerformance(options = {}) {
  const concurrency = options.concurrency || 1;
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.get(
        `${CONFIG.backendUrl}/sessions/${state.sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${state.providerToken}`
          },
          timeout: 5000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Storage error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Backend Storage Performance (concurrency=${concurrency})`,
    testFn,
    {
      iterations: CONFIG.iterations,
      warmupIterations: CONFIG.warmupIterations,
      concurrency
    }
  );
}

/**
 * Run all benchmarks
 * 
 * @returns {Promise<Array<Object>>} - Benchmark results
 */
async function runAllBenchmarks() {
  const results = [];
  
  // Initialize test state
  await initializeTestState();
  
  // Run translation benchmarks with different concurrency levels
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'translation') {
    for (const concurrency of CONFIG.concurrencyLevels) {
      const result = await benchmarkTextTranslation({ concurrency });
      results.push(result);
    }
    
    // Run audio translation benchmark
    const audioResult = await benchmarkAudioTranslation({ concurrency: 1 });
    results.push(audioResult);
  }
  
  // Run WebSocket benchmark
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'websocket') {
    const wsResult = await benchmarkWebSocketPerformance();
    results.push(wsResult);
  }
  
  // Run authentication benchmark
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'auth') {
    for (const concurrency of CONFIG.concurrencyLevels) {
      const result = await benchmarkAuthPerformance({ concurrency });
      results.push(result);
    }
  }
  
  // Run storage benchmark
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'storage') {
    for (const concurrency of CONFIG.concurrencyLevels) {
      const result = await benchmarkStoragePerformance({ concurrency });
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  console.log('Starting Backend Component Benchmarks');
  console.log(`Test mode: ${CONFIG.testMode}`);
  console.log(`Iterations: ${CONFIG.iterations}`);
  console.log(`Warmup iterations: ${CONFIG.warmupIterations}`);
  
  try {
    // Run benchmarks
    const results = await runAllBenchmarks();
    
    // Compare results
    if (results.length > 1) {
      const comparison = compareBenchmarks(results, 'Backend Component Benchmark Comparison');
      console.log(`Comparison saved to: ${comparison.filePath}`);
      console.log(`HTML comparison saved to: ${comparison.htmlPath}`);
    }
    
    console.log('Backend Component Benchmarks completed successfully');
  } catch (error) {
    console.error('Error running benchmarks:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  benchmarkTextTranslation,
  benchmarkAudioTranslation,
  benchmarkWebSocketPerformance,
  benchmarkAuthPerformance,
  benchmarkStoragePerformance,
  runAllBenchmarks,
  initializeTestState
};
