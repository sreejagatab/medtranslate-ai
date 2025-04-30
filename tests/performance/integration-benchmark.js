/**
 * Integration Performance Benchmark for MedTranslate AI
 * 
 * This script benchmarks the performance of the integrated system,
 * including backend, edge, and frontend components working together.
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { runBenchmark, compareBenchmarks } = require('./benchmark-framework');
const { generateScenarios } = require('../integration/test-scenario-generator');
const deviceSimulator = require('./device-simulator');

// Configuration
const CONFIG = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3002',
  wsEndpoint: process.env.WS_URL || 'ws://localhost:3001/ws',
  iterations: parseInt(process.env.BENCHMARK_ITERATIONS || '20'),
  warmupIterations: parseInt(process.env.BENCHMARK_WARMUP_ITERATIONS || '3'),
  testMode: process.argv[2] || 'full-flow', // full-flow, edge-fallback, offline-sync
  providerCredentials: {
    email: 'test.provider@example.com',
    password: 'testpassword123'
  },
  networkConditions: ['4g', '5g', 'wifi'],
  deviceProfiles: ['mid-range', 'high-end']
};

// Test scenarios
const TEST_SCENARIOS = generateScenarios(5);

// Test state
const state = {
  providerToken: null,
  patientToken: null,
  sessionId: null,
  sessionCode: null,
  providerWs: null,
  patientWs: null
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
 * Connect WebSockets
 * 
 * @returns {Promise<void>}
 */
async function connectWebSockets() {
  // Connect provider WebSocket
  return new Promise((resolve, reject) => {
    // Connect provider WebSocket
    const providerWs = new WebSocket(`${CONFIG.wsEndpoint}?token=${state.providerToken}`);
    
    providerWs.on('open', () => {
      console.log('Provider WebSocket connected');
      state.providerWs = providerWs;
      
      // Join session
      providerWs.send(JSON.stringify({
        type: 'join',
        sessionId: state.sessionId,
        role: 'provider'
      }));
      
      // Connect patient WebSocket
      const patientWs = new WebSocket(`${CONFIG.wsEndpoint}?token=${state.patientToken}`);
      
      patientWs.on('open', () => {
        console.log('Patient WebSocket connected');
        state.patientWs = patientWs;
        
        // Join session
        patientWs.send(JSON.stringify({
          type: 'join',
          sessionId: state.sessionId,
          role: 'patient'
        }));
        
        resolve();
      });
      
      patientWs.on('error', (error) => {
        console.error('Patient WebSocket error:', error.message);
        reject(error);
      });
    });
    
    providerWs.on('error', (error) => {
      console.error('Provider WebSocket error:', error.message);
      reject(error);
    });
  });
}

/**
 * Close WebSockets
 */
function closeWebSockets() {
  if (state.providerWs) {
    state.providerWs.close();
    state.providerWs = null;
  }
  
  if (state.patientWs) {
    state.patientWs.close();
    state.patientWs = null;
  }
}

/**
 * Benchmark full translation flow
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkFullFlow(options = {}) {
  const deviceProfile = options.deviceProfile || 'mid-range';
  const networkCondition = options.networkCondition || '4g';
  const scenario = options.scenario || TEST_SCENARIOS[0];
  
  // Initialize device simulator
  deviceSimulator.initialize();
  deviceSimulator.simulateDevice(deviceProfile);
  deviceSimulator.simulateNetwork(networkCondition);
  
  // Initialize test state
  await initializeTestState();
  
  // Connect WebSockets
  await connectWebSockets();
  
  // Create test function
  const testFn = deviceSimulator.withSimulation(async () => {
    return new Promise((resolve, reject) => {
      // Set up message handler for provider
      const messageHandler = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'translation' && message.payload.originalText === scenario.text) {
            // Remove event listener
            state.providerWs.removeEventListener('message', messageHandler);
            
            resolve(message);
          }
        } catch (error) {
          console.error('Error parsing message:', error.message);
        }
      };
      
      // Add event listener
      state.providerWs.addEventListener('message', messageHandler);
      
      // Send message from provider
      state.providerWs.send(JSON.stringify({
        type: 'message',
        sessionId: state.sessionId,
        payload: {
          text: scenario.text,
          sourceLanguage: scenario.sourceLanguage,
          targetLanguage: scenario.targetLanguage
        }
      }));
      
      // Set timeout
      setTimeout(() => {
        state.providerWs.removeEventListener('message', messageHandler);
        reject(new Error('Translation timeout'));
      }, 10000);
    });
  });
  
  // Run benchmark
  const result = await runBenchmark(
    `Full Translation Flow (${deviceProfile}, ${networkCondition}, ${scenario.sourceLanguage}->${scenario.targetLanguage})`,
    testFn,
    {
      iterations: CONFIG.iterations,
      warmupIterations: CONFIG.warmupIterations,
      concurrency: 1 // WebSocket tests can't be concurrent
    }
  );
  
  // Close WebSockets
  closeWebSockets();
  
  // Reset device simulator
  deviceSimulator.resetSimulation();
  
  return result;
}

/**
 * Benchmark edge fallback
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkEdgeFallback(options = {}) {
  const scenario = options.scenario || TEST_SCENARIOS[0];
  
  // Initialize test state
  await initializeTestState();
  
  // First, disable the edge
  try {
    await axios.post(`${CONFIG.edgeUrl}/test/offline-mode`, {
      enabled: true
    });
    console.log('Edge offline mode enabled');
  } catch (error) {
    console.error('Error enabling edge offline mode:', error.message);
  }
  
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
  const result = await runBenchmark(
    `Edge Fallback (${scenario.sourceLanguage}->${scenario.targetLanguage}, ${scenario.context})`,
    testFn,
    {
      iterations: CONFIG.iterations,
      warmupIterations: CONFIG.warmupIterations,
      concurrency: 1
    }
  );
  
  // Re-enable the edge
  try {
    await axios.post(`${CONFIG.edgeUrl}/test/offline-mode`, {
      enabled: false
    });
    console.log('Edge offline mode disabled');
  } catch (error) {
    console.error('Error disabling edge offline mode:', error.message);
  }
  
  return result;
}

/**
 * Benchmark offline synchronization
 * 
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark result
 */
async function benchmarkOfflineSync(options = {}) {
  const scenario = options.scenario || TEST_SCENARIOS[0];
  const queueSize = options.queueSize || 10;
  
  // Initialize test state
  await initializeTestState();
  
  // First, put the edge in offline mode
  try {
    await axios.post(`${CONFIG.edgeUrl}/test/offline-mode`, {
      enabled: true
    });
    console.log('Edge offline mode enabled');
  } catch (error) {
    console.error('Error enabling edge offline mode:', error.message);
  }
  
  // Create offline queue
  const offlineQueue = [];
  for (let i = 0; i < queueSize; i++) {
    offlineQueue.push({
      text: `${scenario.text} (${i + 1})`,
      sourceLanguage: scenario.sourceLanguage,
      targetLanguage: scenario.targetLanguage,
      context: scenario.context,
      timestamp: new Date().toISOString()
    });
  }
  
  // Save offline queue
  try {
    await axios.post(`${CONFIG.edgeUrl}/test/offline-queue`, {
      queue: offlineQueue
    });
    console.log('Offline queue created');
  } catch (error) {
    console.error('Error creating offline queue:', error.message);
  }
  
  // Re-enable the edge
  try {
    await axios.post(`${CONFIG.edgeUrl}/test/offline-mode`, {
      enabled: false
    });
    console.log('Edge offline mode disabled');
  } catch (error) {
    console.error('Error disabling edge offline mode:', error.message);
  }
  
  // Create test function
  const testFn = async () => {
    try {
      const response = await axios.post(
        `${CONFIG.edgeUrl}/sync`,
        {
          force: true
        },
        {
          timeout: 20000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Sync error:', error.message);
      throw error;
    }
  };
  
  // Run benchmark
  return runBenchmark(
    `Offline Synchronization (queue size=${queueSize})`,
    testFn,
    {
      iterations: Math.max(5, Math.floor(CONFIG.iterations / 4)), // Fewer iterations for sync
      warmupIterations: Math.max(1, Math.floor(CONFIG.warmupIterations / 2)),
      concurrency: 1
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
  
  // Run full flow benchmarks
  if (CONFIG.testMode === 'full-flow' || CONFIG.testMode === 'all') {
    for (const deviceProfile of CONFIG.deviceProfiles) {
      for (const networkCondition of CONFIG.networkConditions) {
        const result = await benchmarkFullFlow({
          deviceProfile,
          networkCondition,
          scenario: TEST_SCENARIOS[0]
        });
        results.push(result);
      }
    }
  }
  
  // Run edge fallback benchmark
  if (CONFIG.testMode === 'edge-fallback' || CONFIG.testMode === 'all') {
    const result = await benchmarkEdgeFallback({
      scenario: TEST_SCENARIOS[1]
    });
    results.push(result);
  }
  
  // Run offline sync benchmark
  if (CONFIG.testMode === 'offline-sync' || CONFIG.testMode === 'all') {
    const result = await benchmarkOfflineSync({
      scenario: TEST_SCENARIOS[2],
      queueSize: 10
    });
    results.push(result);
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  console.log('Starting Integration Performance Benchmarks');
  console.log(`Test mode: ${CONFIG.testMode}`);
  console.log(`Iterations: ${CONFIG.iterations}`);
  console.log(`Warmup iterations: ${CONFIG.warmupIterations}`);
  
  try {
    // Run benchmarks
    const results = await runAllBenchmarks();
    
    // Compare results
    if (results.length > 1) {
      const comparison = compareBenchmarks(results, 'Integration Performance Benchmark Comparison');
      console.log(`Comparison saved to: ${comparison.filePath}`);
      console.log(`HTML comparison saved to: ${comparison.htmlPath}`);
    }
    
    console.log('Integration Performance Benchmarks completed successfully');
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
  benchmarkFullFlow,
  benchmarkEdgeFallback,
  benchmarkOfflineSync,
  runAllBenchmarks,
  initializeTestState
};
