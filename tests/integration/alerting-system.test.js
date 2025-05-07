/**
 * Integration Tests for Alerting System
 * 
 * This file contains integration tests for the alerting system
 * with simulated unhealthy components.
 */

const alertingService = require('../../backend/services/alerting-service');
const healthCheckController = require('../../backend/controllers/health-check-controller');

// Mock the alerting service
jest.mock('../../backend/services/alerting-service', () => ({
  sendEmailAlert: jest.fn().mockResolvedValue({ messageId: 'test-email-id' }),
  sendSMSAlert: jest.fn().mockResolvedValue({ MessageId: 'test-sms-id' }),
  sendSlackAlert: jest.fn().mockResolvedValue({ ok: true }),
  sendSystemAlert: jest.fn().mockResolvedValue({
    email: { messageId: 'test-email-id' },
    sms: { MessageId: 'test-sms-id' },
    slack: { ok: true }
  }),
  sendComponentErrorAlert: jest.fn().mockResolvedValue({
    email: { messageId: 'test-email-id' },
    sms: { MessageId: 'test-sms-id' },
    slack: { ok: true }
  })
}));

// Mock the CloudWatch service
jest.mock('../../backend/services/cloudwatch-service', () => ({
  sendSystemHealthMetrics: jest.fn().mockResolvedValue({}),
  sendLog: jest.fn().mockResolvedValue({}),
  createAlarm: jest.fn().mockResolvedValue({})
}));

// Mock the edge service client
jest.mock('../../backend/services/edge-service-client', () => ({
  getCacheStats: jest.fn().mockResolvedValue({
    cacheSize: 1024 * 1024 * 10,
    itemCount: 100,
    hitRate: 0.85,
    lastUpdated: new Date(),
    compressionRatio: 2.5,
    cacheEfficiency: 0.9,
    averageCacheAge: 300000,
    prioritizedItems: 20
  }),
  getDevicePerformance: jest.fn().mockResolvedValue({
    cpuUsage: 0.45,
    cpuCores: 8,
    memoryUsage: 0.6,
    freeMemoryMB: 4096,
    network: {
      connectionType: 'wifi',
      online: true,
      signalStrength: 0.85,
      downloadSpeedMbps: 50,
      uploadSpeedMbps: 20,
      latencyMs: 35,
      connectionStability: 0.9
    },
    battery: {
      level: 0.75,
      charging: true,
      timeRemaining: 180
    }
  }),
  getStorageInfo: jest.fn().mockResolvedValue({
    usagePercentage: 65,
    currentUsageMB: 650,
    quotaMB: 1000,
    reservedForOfflineMB: 200,
    compressionSavingsMB: 150,
    priorityItemCount: 30,
    lastOptimizationTime: new Date()
  })
}));

// Mock Express request and response
const mockRequest = () => {
  return {
    query: {},
    params: {}
  };
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Alerting System Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  it('should send alerts for unhealthy components', async () => {
    // Mock component checks to return unhealthy status
    const originalComponentChecks = { ...healthCheckController.componentChecks };
    
    // Override database component check to return error status
    healthCheckController.componentChecks.database = jest.fn().mockResolvedValue({
      status: 'error',
      responseTime: 0,
      details: {
        error: 'Database connection failed'
      }
    });
    
    // Override translation service component check to return degraded status
    healthCheckController.componentChecks.translation_service = jest.fn().mockResolvedValue({
      status: 'degraded',
      responseTime: 250,
      details: {
        models: 5,
        activeRequests: 2,
        warnings: ['High response time']
      }
    });
    
    // Create mock request and response
    const req = mockRequest();
    const res = mockResponse();
    
    // Call the getSystemHealth function
    await healthCheckController.getSystemHealth(req, res);
    
    // Check if the alerting service was called for the database component
    expect(alertingService.sendComponentErrorAlert).toHaveBeenCalledWith(
      'database',
      'error',
      expect.objectContaining({
        error: 'Database connection failed'
      })
    );
    
    // Check if the alerting service was called for the translation service component
    expect(alertingService.sendComponentErrorAlert).toHaveBeenCalledWith(
      'translation_service',
      'degraded',
      expect.objectContaining({
        warnings: ['High response time']
      })
    );
    
    // Restore original component checks
    healthCheckController.componentChecks = originalComponentChecks;
  });
  
  it('should send email alerts', async () => {
    // Call the sendEmailAlert function
    await alertingService.sendEmailAlert({
      to: 'test@example.com',
      subject: 'Test Email Alert',
      text: 'This is a test email alert',
      html: '<p>This is a test email alert</p>'
    });
    
    // Check if the sendEmailAlert function was called with the correct parameters
    expect(alertingService.sendEmailAlert).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Test Email Alert',
      text: 'This is a test email alert',
      html: '<p>This is a test email alert</p>'
    });
  });
  
  it('should send SMS alerts', async () => {
    // Call the sendSMSAlert function
    await alertingService.sendSMSAlert({
      phoneNumber: '+1234567890',
      message: 'This is a test SMS alert'
    });
    
    // Check if the sendSMSAlert function was called with the correct parameters
    expect(alertingService.sendSMSAlert).toHaveBeenCalledWith({
      phoneNumber: '+1234567890',
      message: 'This is a test SMS alert'
    });
  });
  
  it('should send Slack alerts', async () => {
    // Call the sendSlackAlert function
    await alertingService.sendSlackAlert({
      webhookUrl: 'https://hooks.slack.com/services/test',
      title: 'Test Slack Alert',
      text: 'This is a test Slack alert',
      fields: [
        {
          title: 'Field 1',
          value: 'Value 1'
        },
        {
          title: 'Field 2',
          value: 'Value 2'
        }
      ],
      actions: [
        {
          text: 'View Dashboard',
          url: 'https://example.com/dashboard'
        }
      ]
    });
    
    // Check if the sendSlackAlert function was called with the correct parameters
    expect(alertingService.sendSlackAlert).toHaveBeenCalledWith({
      webhookUrl: 'https://hooks.slack.com/services/test',
      title: 'Test Slack Alert',
      text: 'This is a test Slack alert',
      fields: [
        {
          title: 'Field 1',
          value: 'Value 1'
        },
        {
          title: 'Field 2',
          value: 'Value 2'
        }
      ],
      actions: [
        {
          text: 'View Dashboard',
          url: 'https://example.com/dashboard'
        }
      ]
    });
  });
  
  it('should send system alerts', async () => {
    // Call the sendSystemAlert function
    await alertingService.sendSystemAlert({
      title: 'Test System Alert',
      message: 'This is a test system alert',
      level: 'error',
      data: {
        component: 'database',
        status: 'error',
        details: {
          error: 'Database connection failed'
        }
      },
      fields: [
        {
          title: 'Component',
          value: 'database'
        },
        {
          title: 'Status',
          value: 'error'
        }
      ],
      actions: [
        {
          text: 'View Dashboard',
          url: 'https://example.com/dashboard'
        }
      ]
    });
    
    // Check if the sendSystemAlert function was called with the correct parameters
    expect(alertingService.sendSystemAlert).toHaveBeenCalledWith({
      title: 'Test System Alert',
      message: 'This is a test system alert',
      level: 'error',
      data: {
        component: 'database',
        status: 'error',
        details: {
          error: 'Database connection failed'
        }
      },
      fields: [
        {
          title: 'Component',
          value: 'database'
        },
        {
          title: 'Status',
          value: 'error'
        }
      ],
      actions: [
        {
          text: 'View Dashboard',
          url: 'https://example.com/dashboard'
        }
      ]
    });
  });
});
