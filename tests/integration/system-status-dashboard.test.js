/**
 * Integration Tests for System Status Dashboard with Health Check Endpoints
 * 
 * This file contains integration tests for the System Status Dashboard
 * with the health check API endpoints.
 */

const request = require('supertest');
const app = require('../../backend/server');
const jwt = require('jsonwebtoken');
const config = require('../../backend/config');
const { JSDOM } = require('jsdom');
const { act } = require('react-dom/test-utils');
const React = require('react');
const ReactDOM = require('react-dom');
const SystemStatusDashboard = require('../../frontend/shared/components/SystemStatusDashboard').default;

// Mock JWT token
const mockToken = jwt.sign(
  { id: 'test-user', email: 'test@example.com', role: 'admin' },
  config.jwtSecret || 'test-secret',
  { expiresIn: '1h' }
);

// Mock fetch function
global.fetch = jest.fn();

// Mock response data
const mockSystemHealth = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  components: {
    database: {
      status: 'healthy',
      responseTime: 45,
      details: {
        connections: 5,
        maxConnections: 20
      }
    },
    translation_service: {
      status: 'healthy',
      responseTime: 120,
      details: {
        models: 5,
        activeRequests: 2
      }
    },
    edge_device: {
      status: 'healthy',
      responseTime: 85,
      details: {
        warnings: []
      }
    },
    auth_service: {
      status: 'healthy',
      responseTime: 65,
      details: {
        activeSessions: 10,
        tokenValidations: 50
      }
    },
    storage_service: {
      status: 'healthy',
      responseTime: 75,
      details: {
        warnings: []
      }
    }
  },
  system: {
    uptime: 86400,
    loadAvg: [0.5, 0.7, 0.8],
    memory: {
      total: 8589934592,
      free: 4294967296
    },
    cpus: 8
  }
};

// Mock component health data
const mockComponentHealth = {
  component: 'database',
  status: 'healthy',
  responseTime: 45,
  details: {
    connections: 5,
    maxConnections: 20
  },
  timestamp: new Date().toISOString()
};

// Mock health check history data
const mockHealthCheckHistory = [
  {
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: 'healthy',
    components: {
      database: {
        status: 'healthy',
        responseTime: 45
      },
      translation_service: {
        status: 'healthy',
        responseTime: 120
      }
    }
  },
  {
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    status: 'degraded',
    components: {
      database: {
        status: 'healthy',
        responseTime: 45
      },
      translation_service: {
        status: 'degraded',
        responseTime: 250
      }
    }
  }
];

// Setup JSDOM
let container;

beforeEach(() => {
  // Setup JSDOM
  const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  
  // Setup container
  container = document.getElementById('root');
  
  // Mock fetch responses
  global.fetch.mockImplementation((url) => {
    if (url.includes('/api/health')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSystemHealth)
      });
    } else if (url.includes('/api/health/components/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockComponentHealth)
      });
    } else if (url.includes('/api/health/history')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHealthCheckHistory)
      });
    }
    
    return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
  });
});

afterEach(() => {
  // Cleanup
  ReactDOM.unmountComponentAtNode(container);
  container = null;
  global.fetch.mockClear();
});

describe('System Status Dashboard Integration with Health Check Endpoints', () => {
  it('should fetch system health data and render correctly', async () => {
    // Render the component
    await act(async () => {
      ReactDOM.render(React.createElement(SystemStatusDashboard), container);
    });
    
    // Check if fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledWith('/api/health');
    
    // Check if the component renders the system health data
    expect(container.textContent).toContain('System Status Dashboard');
    expect(container.textContent).toContain('Cache Health');
    expect(container.textContent).toContain('ML Models');
    expect(container.textContent).toContain('Sync Status');
    expect(container.textContent).toContain('Offline Risk');
  });
  
  it('should handle degraded system health status', async () => {
    // Mock degraded system health
    const degradedSystemHealth = {
      ...mockSystemHealth,
      status: 'degraded',
      components: {
        ...mockSystemHealth.components,
        translation_service: {
          status: 'degraded',
          responseTime: 250,
          details: {
            models: 5,
            activeRequests: 2,
            warnings: ['High response time']
          }
        }
      }
    };
    
    // Update fetch mock
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(degradedSystemHealth)
        });
      }
      
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    });
    
    // Render the component
    await act(async () => {
      ReactDOM.render(React.createElement(SystemStatusDashboard), container);
    });
    
    // Check if the component renders the degraded status
    expect(container.textContent).toContain('translation_service');
    expect(container.textContent).toContain('degraded');
  });
  
  it('should handle error system health status', async () => {
    // Mock error system health
    const errorSystemHealth = {
      ...mockSystemHealth,
      status: 'error',
      components: {
        ...mockSystemHealth.components,
        database: {
          status: 'error',
          responseTime: 0,
          details: {
            error: 'Database connection failed'
          }
        }
      }
    };
    
    // Update fetch mock
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(errorSystemHealth)
        });
      }
      
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    });
    
    // Render the component
    await act(async () => {
      ReactDOM.render(React.createElement(SystemStatusDashboard), container);
    });
    
    // Check if the component renders the error status
    expect(container.textContent).toContain('database');
    expect(container.textContent).toContain('error');
  });
  
  it('should handle API errors', async () => {
    // Mock API error
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Internal server error' })
        });
      }
      
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    });
    
    // Render the component
    await act(async () => {
      ReactDOM.render(React.createElement(SystemStatusDashboard), container);
    });
    
    // Check if the component renders the error message
    expect(container.textContent).toContain('Error');
  });
});

describe('API Integration Tests', () => {
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
  });
  
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
  
  it('should return health check history', async () => {
    const response = await request(app)
      .get('/api/health/history')
      .set('Authorization', `Bearer ${mockToken}`)
      .expect('Content-Type', /json/)
      .expect(200);
    
    // Check response structure
    expect(Array.isArray(response.body)).toBe(true);
    
    if (response.body.length > 0) {
      const historyItem = response.body[0];
      expect(historyItem).toHaveProperty('timestamp');
      expect(historyItem).toHaveProperty('status');
      expect(historyItem).toHaveProperty('components');
    }
  });
});
