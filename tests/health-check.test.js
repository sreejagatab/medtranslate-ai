/**
 * Health Check API Tests
 * 
 * This file contains tests for the health check API endpoints.
 */

const request = require('supertest');
const app = require('../backend/server');
const jwt = require('jsonwebtoken');
const config = require('../backend/config');

// Mock JWT token
const mockToken = jwt.sign(
  { id: 'test-user', email: 'test@example.com', role: 'admin' },
  config.jwtSecret || 'test-secret',
  { expiresIn: '1h' }
);

describe('Health Check API', () => {
  // Test GET /api/health
  describe('GET /api/health', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Check response structure
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('components');
      expect(response.body).toHaveProperty('system');
      
      // Check system properties
      expect(response.body.system).toHaveProperty('uptime');
      expect(response.body.system).toHaveProperty('loadAvg');
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpus');
    });
    
    it('should filter components based on query parameters', async () => {
      const response = await request(app)
        .get('/api/health?components=database,auth_service')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Check that only requested components are included
      expect(Object.keys(response.body.components)).toHaveLength(2);
      expect(response.body.components).toHaveProperty('database');
      expect(response.body.components).toHaveProperty('auth_service');
      expect(response.body.components).not.toHaveProperty('translation_service');
    });
  });
  
  // Test GET /api/health/components/:component
  describe('GET /api/health/components/:component', () => {
    it('should return component health status', async () => {
      const response = await request(app)
        .get('/api/health/components/database')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Check response structure
      expect(response.body).toHaveProperty('component', 'database');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('responseTime');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty('timestamp');
    });
    
    it('should return 404 for non-existent component', async () => {
      const response = await request(app)
        .get('/api/health/components/non-existent')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Check error message
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
    
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/health/components/database')
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });
  
  // Test GET /api/health/history
  describe('GET /api/health/history', () => {
    it('should return health check history', async () => {
      const response = await request(app)
        .get('/api/health/history')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Check response structure
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check history item structure
      const historyItem = response.body[0];
      expect(historyItem).toHaveProperty('timestamp');
      expect(historyItem).toHaveProperty('status');
      expect(historyItem).toHaveProperty('components');
      
      // Check component structure
      expect(historyItem.components).toHaveProperty('database');
      expect(historyItem.components.database).toHaveProperty('status');
      expect(historyItem.components.database).toHaveProperty('responseTime');
    });
    
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/health/history')
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });
});

// Test integration with CloudWatch and alerting
describe('Health Check Integration', () => {
  // Mock CloudWatch service
  jest.mock('../backend/services/cloudwatch-service', () => ({
    sendSystemHealthMetrics: jest.fn().mockResolvedValue({}),
    sendLog: jest.fn().mockResolvedValue({}),
    createAlarm: jest.fn().mockResolvedValue({})
  }));
  
  // Mock alerting service
  jest.mock('../backend/services/alerting-service', () => ({
    sendComponentErrorAlert: jest.fn().mockResolvedValue({})
  }));
  
  // Import mocked services
  const cloudWatchService = require('../backend/services/cloudwatch-service');
  const alertingService = require('../backend/services/alerting-service');
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });
  
  it('should send metrics to CloudWatch', async () => {
    await request(app)
      .get('/api/health')
      .expect(200);
    
    // Check if CloudWatch service was called
    expect(cloudWatchService.sendSystemHealthMetrics).toHaveBeenCalled();
  });
  
  it('should send alerts for unhealthy components', async () => {
    // Mock component check to return error status
    jest.mock('../backend/controllers/health-check-controller', () => {
      const originalModule = jest.requireActual('../backend/controllers/health-check-controller');
      
      return {
        ...originalModule,
        componentChecks: {
          ...originalModule.componentChecks,
          database: jest.fn().mockResolvedValue({
            status: 'error',
            responseTime: 100,
            details: {
              error: 'Database connection failed'
            }
          })
        }
      };
    });
    
    await request(app)
      .get('/api/health?components=database')
      .expect(200);
    
    // Check if alerting service was called
    expect(alertingService.sendComponentErrorAlert).toHaveBeenCalledWith(
      'database',
      'error',
      expect.objectContaining({
        error: 'Database connection failed'
      })
    );
  });
});
