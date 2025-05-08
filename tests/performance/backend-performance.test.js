/**
 * Backend Performance Test
 *
 * This test measures the performance of the backend services under various loads,
 * including response time, concurrent sessions, WebSocket scalability, and database queries.
 */

const axios = require('axios');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  wsUrl: process.env.WS_URL || 'ws://localhost:3001/ws',
  testTimeout: 60000, // 60 seconds
  concurrentUsers: process.env.CONCURRENT_USERS ? parseInt(process.env.CONCURRENT_USERS) : 10,
  requestsPerUser: process.env.REQUESTS_PER_USER ? parseInt(process.env.REQUESTS_PER_USER) : 5,
  wsConnectionsCount: process.env.WS_CONNECTIONS ? parseInt(process.env.WS_CONNECTIONS) : 5,
  wsMessagesPerConnection: process.env.WS_MESSAGES ? parseInt(process.env.WS_MESSAGES) : 10
};

// Mock user data
const mockUsers = Array.from({ length: config.concurrentUsers }, (_, i) => ({
  id: `user-${i}`,
  email: `user${i}@example.com`,
  password: 'Password123!',
  role: i % 5 === 0 ? 'admin' : 'provider'
}));

// Mock translation data
const mockTranslations = [
  { text: 'Hello', sourceLanguage: 'en', targetLanguage: 'es' },
  { text: 'How are you?', sourceLanguage: 'en', targetLanguage: 'es' },
  { text: 'I have a headache', sourceLanguage: 'en', targetLanguage: 'es' },
  { text: 'I feel dizzy', sourceLanguage: 'en', targetLanguage: 'es' },
  { text: 'My throat hurts', sourceLanguage: 'en', targetLanguage: 'es' }
];

// Helper function to measure response time
async function measureResponseTime(apiCall) {
  const start = performance.now();
  try {
    const response = await apiCall();
    const end = performance.now();
    return {
      success: true,
      responseTime: end - start,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    const end = performance.now();
    return {
      success: false,
      responseTime: end - start,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Test API response time
async function testApiResponseTime() {
  console.log('\n=== Testing API Response Time ===');
  
  const endpoints = [
    { name: 'Health Check', url: `${config.backendUrl}/health`, method: 'get' },
    { name: 'Authentication', url: `${config.backendUrl}/api/auth/login`, method: 'post', data: { email: 'admin@example.com', password: 'Admin123!' } },
    { name: 'Translation', url: `${config.backendUrl}/api/translate`, method: 'post', data: { text: 'Hello', sourceLanguage: 'en', targetLanguage: 'es' } },
    { name: 'Edge Devices', url: `${config.backendUrl}/api/edge/discover`, method: 'get' },
    { name: 'User Management', url: `${config.backendUrl}/api/users`, method: 'get' }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    console.log(`Testing endpoint: ${endpoint.name}`);
    
    const measurements = [];
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const result = await measureResponseTime(() => {
        return axios({
          method: endpoint.method,
          url: endpoint.url,
          data: endpoint.data,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      });
      
      measurements.push(result.responseTime);
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calculate statistics
    const avg = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    
    results[endpoint.name] = {
      average: avg,
      min,
      max,
      measurements
    };
    
    console.log(`  Average response time: ${avg.toFixed(2)} ms`);
    console.log(`  Min response time: ${min.toFixed(2)} ms`);
    console.log(`  Max response time: ${max.toFixed(2)} ms`);
  }
  
  return results;
}

// Test concurrent sessions
async function testConcurrentSessions() {
  console.log('\n=== Testing Concurrent Sessions ===');
  
  const userSessions = [];
  const results = {
    successfulLogins: 0,
    failedLogins: 0,
    averageLoginTime: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageRequestTime: 0
  };
  
  // Login all users concurrently
  console.log(`Logging in ${config.concurrentUsers} users concurrently...`);
  
  const loginPromises = mockUsers.map(async (user) => {
    const result = await measureResponseTime(() => {
      return axios.post(`${config.backendUrl}/api/auth/login`, {
        email: user.email,
        password: user.password
      });
    });
    
    if (result.success) {
      userSessions.push({
        user,
        token: result.data.token
      });
      results.successfulLogins++;
      return result.responseTime;
    } else {
      results.failedLogins++;
      return null;
    }
  });
  
  const loginTimes = (await Promise.all(loginPromises)).filter(time => time !== null);
  results.averageLoginTime = loginTimes.reduce((sum, time) => sum + time, 0) / loginTimes.length;
  
  console.log(`  Successful logins: ${results.successfulLogins}`);
  console.log(`  Failed logins: ${results.failedLogins}`);
  console.log(`  Average login time: ${results.averageLoginTime.toFixed(2)} ms`);
  
  // Make concurrent requests with logged-in users
  console.log(`Making ${config.requestsPerUser} requests per user (${results.successfulLogins * config.requestsPerUser} total)...`);
  
  const requestPromises = [];
  
  for (const session of userSessions) {
    for (let i = 0; i < config.requestsPerUser; i++) {
      // Pick a random translation
      const translation = mockTranslations[Math.floor(Math.random() * mockTranslations.length)];
      
      requestPromises.push(
        measureResponseTime(() => {
          return axios.post(`${config.backendUrl}/api/translate`, translation, {
            headers: {
              'Authorization': `Bearer ${session.token}`
            }
          });
        })
      );
    }
  }
  
  const requestResults = await Promise.all(requestPromises);
  
  const successfulRequests = requestResults.filter(r => r.success);
  results.successfulRequests = successfulRequests.length;
  results.failedRequests = requestResults.length - successfulRequests.length;
  results.averageRequestTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
  
  console.log(`  Successful requests: ${results.successfulRequests}`);
  console.log(`  Failed requests: ${results.failedRequests}`);
  console.log(`  Average request time: ${results.averageRequestTime.toFixed(2)} ms`);
  
  return results;
}

// Test WebSocket scalability
async function testWebSocketScalability() {
  console.log('\n=== Testing WebSocket Scalability ===');
  
  const connections = [];
  const results = {
    successfulConnections: 0,
    failedConnections: 0,
    averageConnectionTime: 0,
    messagesSent: 0,
    messagesReceived: 0,
    averageMessageTime: 0
  };
  
  // Create WebSocket connections
  console.log(`Creating ${config.wsConnectionsCount} WebSocket connections...`);
  
  for (let i = 0; i < config.wsConnectionsCount; i++) {
    const start = performance.now();
    
    try {
      const ws = new WebSocket(config.wsUrl);
      
      // Wait for connection to open
      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          const end = performance.now();
          results.successfulConnections++;
          results.averageConnectionTime += (end - start);
          resolve();
        };
        
        ws.onerror = (error) => {
          results.failedConnections++;
          reject(error);
        };
        
        // Set timeout
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      // Add message handler
      ws.onmessage = (event) => {
        results.messagesReceived++;
      };
      
      connections.push(ws);
    } catch (error) {
      console.error(`  Connection ${i} failed:`, error.message);
    }
  }
  
  if (results.successfulConnections > 0) {
    results.averageConnectionTime /= results.successfulConnections;
  }
  
  console.log(`  Successful connections: ${results.successfulConnections}`);
  console.log(`  Failed connections: ${results.failedConnections}`);
  console.log(`  Average connection time: ${results.averageConnectionTime.toFixed(2)} ms`);
  
  // Send messages through WebSocket connections
  if (connections.length > 0) {
    console.log(`Sending ${config.wsMessagesPerConnection} messages per connection (${connections.length * config.wsMessagesPerConnection} total)...`);
    
    const messageTimes = [];
    
    for (let i = 0; i < config.wsMessagesPerConnection; i++) {
      for (const ws of connections) {
        const start = performance.now();
        
        const message = {
          type: 'ping',
          id: uuidv4(),
          timestamp: new Date().toISOString()
        };
        
        ws.send(JSON.stringify(message));
        results.messagesSent++;
        
        const end = performance.now();
        messageTimes.push(end - start);
      }
      
      // Wait a bit between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.averageMessageTime = messageTimes.reduce((sum, time) => sum + time, 0) / messageTimes.length;
    
    console.log(`  Messages sent: ${results.messagesSent}`);
    console.log(`  Messages received: ${results.messagesReceived}`);
    console.log(`  Average message send time: ${results.averageMessageTime.toFixed(2)} ms`);
    
    // Close connections
    for (const ws of connections) {
      ws.close();
    }
  }
  
  return results;
}

// Test database query performance
async function testDatabaseQueryPerformance() {
  console.log('\n=== Testing Database Query Performance ===');
  
  const queries = [
    { name: 'Get All Users', url: `${config.backendUrl}/api/users` },
    { name: 'Get All Translations', url: `${config.backendUrl}/api/translations` },
    { name: 'Get All Edge Devices', url: `${config.backendUrl}/api/edge/devices` },
    { name: 'Get All Sessions', url: `${config.backendUrl}/api/sessions` }
  ];
  
  const results = {};
  
  // Login as admin to get token
  const loginResponse = await axios.post(`${config.backendUrl}/api/auth/login`, {
    email: 'admin@example.com',
    password: 'Admin123!'
  });
  
  const token = loginResponse.data.token;
  
  for (const query of queries) {
    console.log(`Testing query: ${query.name}`);
    
    const measurements = [];
    const iterations = 5;
    
    for (let i = 0; i < iterations; i++) {
      const result = await measureResponseTime(() => {
        return axios.get(query.url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      });
      
      measurements.push(result.responseTime);
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Calculate statistics
    const avg = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    
    results[query.name] = {
      average: avg,
      min,
      max,
      measurements
    };
    
    console.log(`  Average query time: ${avg.toFixed(2)} ms`);
    console.log(`  Min query time: ${min.toFixed(2)} ms`);
    console.log(`  Max query time: ${max.toFixed(2)} ms`);
  }
  
  return results;
}

// Run all tests
async function runTests() {
  console.log('Starting Backend Performance Test...');
  
  try {
    // Run tests in sequence
    const apiResponseTimeResults = await testApiResponseTime();
    const concurrentSessionsResults = await testConcurrentSessions();
    const webSocketScalabilityResults = await testWebSocketScalability();
    const databaseQueryResults = await testDatabaseQueryPerformance();
    
    // Compile all results
    const allResults = {
      apiResponseTime: apiResponseTimeResults,
      concurrentSessions: concurrentSessionsResults,
      webSocketScalability: webSocketScalabilityResults,
      databaseQuery: databaseQueryResults
    };
    
    // Print summary
    console.log('\n=== Performance Test Summary ===');
    
    console.log('\nAPI Response Time:');
    for (const [endpoint, stats] of Object.entries(apiResponseTimeResults)) {
      console.log(`  ${endpoint}: ${stats.average.toFixed(2)} ms avg (${stats.min.toFixed(2)} min, ${stats.max.toFixed(2)} max)`);
    }
    
    console.log('\nConcurrent Sessions:');
    console.log(`  Logins: ${concurrentSessionsResults.successfulLogins} successful, ${concurrentSessionsResults.failedLogins} failed, ${concurrentSessionsResults.averageLoginTime.toFixed(2)} ms avg`);
    console.log(`  Requests: ${concurrentSessionsResults.successfulRequests} successful, ${concurrentSessionsResults.failedRequests} failed, ${concurrentSessionsResults.averageRequestTime.toFixed(2)} ms avg`);
    
    console.log('\nWebSocket Scalability:');
    console.log(`  Connections: ${webSocketScalabilityResults.successfulConnections} successful, ${webSocketScalabilityResults.failedConnections} failed, ${webSocketScalabilityResults.averageConnectionTime.toFixed(2)} ms avg`);
    console.log(`  Messages: ${webSocketScalabilityResults.messagesSent} sent, ${webSocketScalabilityResults.messagesReceived} received, ${webSocketScalabilityResults.averageMessageTime.toFixed(2)} ms avg send time`);
    
    console.log('\nDatabase Query Performance:');
    for (const [query, stats] of Object.entries(databaseQueryResults)) {
      console.log(`  ${query}: ${stats.average.toFixed(2)} ms avg (${stats.min.toFixed(2)} min, ${stats.max.toFixed(2)} max)`);
    }
    
    return allResults;
  } catch (error) {
    console.error('Error running tests:', error.message);
    return { error: error.message };
  }
}

// Export for Jest
module.exports = {
  testApiResponseTime,
  testConcurrentSessions,
  testWebSocketScalability,
  testDatabaseQueryPerformance,
  runTests
};

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
